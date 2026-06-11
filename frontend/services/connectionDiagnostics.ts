/**
 * 🔍 CONNECTION DIAGNOSTICS — Persistent log of every connection event
 * Records connect/disconnect/ping/fail events for export and debugging
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@nexus_conn_diagnostics_v1';
const MAX = 200;

export interface DiagEvent {
  id:        string;
  ts:        number;
  type:      'connect' | 'disconnect' | 'ping_ok' | 'ping_fail' | 'reconnect' | 'scan' | 'error' | 'app_state';
  ip?:       string;
  port?:     string;
  latencyMs?: number;
  failCount?: number;
  detail:    string;
}

class ConnectionDiagnosticsService {
  private _events: DiagEvent[] = [];
  private _loaded  = false;

  private _makeId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }

  async load(): Promise<void> {
    if (this._loaded) return;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) this._events = JSON.parse(raw);
    } catch {}
    this._loaded = true;
  }

  private async _persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(this._events.slice(-MAX)));
    } catch {}
  }

  private async _add(event: Omit<DiagEvent, 'id' | 'ts'>): Promise<void> {
    await this.load();
    const entry: DiagEvent = { ...event, id: this._makeId(), ts: Date.now() };
    this._events = [...this._events, entry].slice(-MAX);
    await this._persist();
  }

  logConnect(ip: string, port: string, latencyMs: number): void {
    this._add({ type: 'connect', ip, port, latencyMs, detail: `Connected to ${ip}:${port} in ${latencyMs}ms` }).catch(() => {});
  }

  logDisconnect(ip: string, port: string, reason?: string): void {
    this._add({ type: 'disconnect', ip, port, detail: reason ? `Disconnected: ${reason}` : `Disconnected from ${ip}:${port}` }).catch(() => {});
  }

  logPingOk(ip: string, port: string, latencyMs: number): void {
    this._add({ type: 'ping_ok', ip, port, latencyMs, detail: `Ping OK ${latencyMs}ms` }).catch(() => {});
  }

  logPingFail(ip: string, port: string, failCount: number): void {
    this._add({ type: 'ping_fail', ip, port, failCount, detail: `Ping failed (${failCount}/4)` }).catch(() => {});
  }

  logReconnect(ip: string, port: string, success: boolean): void {
    this._add({ type: 'reconnect', ip, port, detail: success ? `Reconnected to ${ip}:${port}` : `Reconnect failed for ${ip}:${port}` }).catch(() => {});
  }

  logError(detail: string, ip?: string, port?: string): void {
    this._add({ type: 'error', ip, port, detail }).catch(() => {});
  }

  logAppState(state: string): void {
    this._add({ type: 'app_state', detail: `App became ${state}` }).catch(() => {});
  }

  async getEvents(): Promise<DiagEvent[]> {
    await this.load();
    return [...this._events];
  }

  async exportText(): Promise<string> {
    await this.load();

    // ── PROBLEM ANALYSIS ────────────────────────────────────
    const problems: string[] = [];
    const fixes:    string[] = [];

    const recentFails    = this._events.filter(e => e.type === 'ping_fail'   && Date.now() - e.ts < 3_600_000);
    const recentErrors   = this._events.filter(e => e.type === 'error'       && Date.now() - e.ts < 3_600_000);
    const recentConnects = this._events.filter(e => e.type === 'connect'     && Date.now() - e.ts < 3_600_000);
    const lastConnect    = [...this._events].reverse().find(e => e.type === 'connect');
    const lastDisconnect = [...this._events].reverse().find(e => e.type === 'disconnect');
    const lastFail       = [...this._events].reverse().find(e => e.type === 'ping_fail');

    if (recentFails.length >= 3 && recentConnects.length === 0) {
      problems.push(`PROBLEM: Server unreachable — ${recentFails.length} ping failures in the last hour with no successful connection.`);
      fixes.push(`FIX 1: Make sure butler_server.py is running on your PC (check the terminal window).`);
      fixes.push(`FIX 2: Both phone AND PC must be on the SAME WiFi network.`);
      fixes.push(`FIX 3: If you changed networks (e.g. mobile data), reconnect to WiFi and tap Reconnect on the Home tab.`);
      fixes.push(`FIX 4: Check Windows Firewall — allow Python through firewall (butler_server.py auto-configures this, but run as Administrator if needed).`);
    }

    if (lastDisconnect && (!lastConnect || lastDisconnect.ts > lastConnect.ts)) {
      const minAgo = Math.round((Date.now() - lastDisconnect.ts) / 60000);
      problems.push(`PROBLEM: Server went offline ${minAgo} minute(s) ago. Last IP: ${lastDisconnect.ip || 'unknown'}:${lastDisconnect.port || '?'}.`);
      fixes.push(`FIX: Go to Home tab → tap RECONNECT. If that fails, restart butler_server.py on your PC and scan QR again.`);
    }

    const highLatencyEvents = this._events.filter(e => e.type === 'ping_ok' && (e.latencyMs || 0) > 500);
    if (highLatencyEvents.length > 2) {
      problems.push(`PROBLEM: High latency detected (${Math.max(...highLatencyEvents.map(e => e.latencyMs || 0))}ms peak). AI responses may be slow or timeout.`);
      fixes.push(`FIX: Move phone closer to WiFi router. Avoid using 2.4GHz band — switch to 5GHz on both devices if available.`);
    }

    const authErrors = recentErrors.filter(e => e.detail.toLowerCase().includes('401') || e.detail.toLowerCase().includes('auth') || e.detail.toLowerCase().includes('token'));
    if (authErrors.length > 0) {
      problems.push(`PROBLEM: Auth token errors (${authErrors.length}x). The server rejected the session token.`);
      fixes.push(`FIX: Go to Home tab → tap RECONNECT or scan QR code again to get a fresh token. This happens when butler_server.py restarts.`);
    }

    const timeoutErrors = recentErrors.filter(e => e.detail.toLowerCase().includes('timeout') || e.detail.toLowerCase().includes('abort'));
    if (timeoutErrors.length > 0) {
      problems.push(`PROBLEM: Connection timeouts (${timeoutErrors.length}x). Server is not responding within the time limit.`);
      fixes.push(`FIX: Ollama AI model may still be loading — wait 30 seconds and try again. If persistent, restart butler_server.py.`);
    }

    if (problems.length === 0) {
      if (lastConnect) {
        const minAgo = Math.round((Date.now() - lastConnect.ts) / 60000);
        problems.push(`STATUS: No problems detected. Last successful connection was ${minAgo} minute(s) ago to ${lastConnect.ip}:${lastConnect.port} (${lastConnect.latencyMs}ms).`);
      } else {
        problems.push(`STATUS: No connection events recorded yet. Connect to a server first via Home tab → Scan QR or Manual IP.`);
        fixes.push(`FIX: Download butler_server.py from Home tab → Run it on your PC → Scan QR code.`);
      }
    }

    // ── FORMAT OUTPUT ────────────────────────────────────────
    const lines: string[] = [
      `BUTLER AI — CONNECTION DIAGNOSTICS + PROBLEM REPORT`,
      `Generated: ${new Date().toISOString()}`,
      `Platform: ${require('react-native').Platform.OS.toUpperCase()} | Events logged: ${this._events.length}`,
      '═'.repeat(60),
      '',
      '▶ PROBLEM ANALYSIS',
      '─'.repeat(40),
      ...problems.map(p => `  ${p}`),
      '',
      '▶ RECOMMENDED FIXES',
      '─'.repeat(40),
      ...(fixes.length > 0 ? fixes.map(f => `  ${f}`) : ['  No action needed.']),
      '',
      '▶ QUICK STATS (last hour)',
      '─'.repeat(40),
      `  Successful connections : ${recentConnects.length}`,
      `  Ping failures          : ${recentFails.length}`,
      `  Auth/token errors      : ${authErrors.length}`,
      `  Timeout errors         : ${timeoutErrors.length}`,
      `  Last connected IP      : ${lastConnect ? `${lastConnect.ip}:${lastConnect.port}` : 'never'}`,
      `  Last disconnect        : ${lastDisconnect ? new Date(lastDisconnect.ts).toLocaleString() : 'none'}`,
      '',
      '▶ FULL EVENT LOG (newest first)',
      '─'.repeat(40),
    ];

    for (const e of [...this._events].reverse()) {
      const time = new Date(e.ts).toLocaleString();
      const lat  = e.latencyMs !== undefined ? ` [${e.latencyMs}ms]` : '';
      const fc   = e.failCount  !== undefined ? ` [fail ${e.failCount}/4]` : '';
      const addr = e.ip ? ` ${e.ip}:${e.port}` : '';
      lines.push(`  [${time}] [${e.type.toUpperCase().padEnd(12)}]${addr}${lat}${fc} ${e.detail}`);
    }

    lines.push('');
    lines.push('─'.repeat(60));
    lines.push('Butler AI · butler_server.py · github.com/shawnjan-cmd/butler-ai');

    return lines.join('\n');
  }

  async clearAll(): Promise<void> {
    this._events = [];
    await AsyncStorage.removeItem(KEY);
  }
}

export const connDiagnostics = new ConnectionDiagnosticsService();
