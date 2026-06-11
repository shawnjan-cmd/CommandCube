/**
 * 🔗 CONNECTION PERSISTENCE SERVICE v2.0 — Adaptive Global
 * ═══════════════════════════════════════════════════════════════
 * Fully adaptive — no hardcoded ports. Works anywhere.
 *
 *  • Golden list: stores every previously-working IP+port pair (up to 10)
 *  • On reconnect: tries golden list in parallel — picks fastest responder
 *  • Port-agnostic: also tries all common ports for each golden IP
 *  • Exponential backoff — max 60s between attempts
 *  • Emits global event when connection state changes
 *  • 2-second quick-ping for instant UI feedback
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { serverConnection, ConnResult } from './serverConnection';

const CP_GOLDEN_KEY    = '@cp_golden_ips_v2';
const CP_LAST_GOOD_KEY = '@cp_last_good_v2';

const MAX_GOLDEN = 10;

// Common server ports — adaptive, no hardcoded "correct" port
const COMMON_PORTS = [
  '5000', '8000', '8080', '8008',
  '8765', '8766', '8767', '8768', '8769', '8770',
  '3000', '3001', '4000',
  '8888', '8081', '8090', '9000', '9090',
  '1337', '7000', '7777', '8500', '8800', '8900',
];

export interface GoldenEntry {
  ip:           string;
  port:         string;
  lastSuccess:  string;
  successCount: number;
  latencyMs:    number;
}

export interface LastGood {
  ip:       string;
  port:     string;
  token:    string;
  deviceId: string;
  pairedAt: string;
}

type CPListener = (connected: boolean, ip: string, port: string) => void;

class ConnectionPersistenceService {
  private _golden:      GoldenEntry[]   = [];
  private _lastGood:    LastGood | null = null;
  private _listeners:   CPListener[]    = [];
  private _reconnTimer: ReturnType<typeof setTimeout> | null = null;
  private _backoffMs    = 6_000;
  private _failStreak   = 0;
  private _loaded       = false;
  private _connecting   = false;

  onConnectionChange(cb: CPListener): () => void {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(l => l !== cb); };
  }
  private _emit(connected: boolean, ip: string, port: string) {
    this._listeners.forEach(l => { try { l(connected, ip, port); } catch {} });
  }

  async load(): Promise<void> {
    if (this._loaded) return;
    try {
      const [goldenRaw, lastGoodRaw] = await AsyncStorage.multiGet([CP_GOLDEN_KEY, CP_LAST_GOOD_KEY])
        .then(pairs => pairs.map(([, v]) => v));
      if (goldenRaw)   this._golden   = JSON.parse(goldenRaw);
      if (lastGoodRaw) this._lastGood = JSON.parse(lastGoodRaw);
    } catch {}
    this._loaded = true;
  }

  private async _persist(): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [CP_GOLDEN_KEY,    JSON.stringify(this._golden)],
        [CP_LAST_GOOD_KEY, JSON.stringify(this._lastGood)],
      ]);
    } catch {}
  }

  async recordSuccess(ip: string, port: string, latencyMs: number): Promise<void> {
    await this.load();
    const existing = this._golden.find(g => g.ip === ip && g.port === port);
    if (existing) {
      existing.lastSuccess  = new Date().toISOString();
      existing.successCount++;
      existing.latencyMs    = Math.round(existing.latencyMs * 0.7 + latencyMs * 0.3);
    } else {
      this._golden.unshift({ ip, port, lastSuccess: new Date().toISOString(), successCount: 1, latencyMs });
      if (this._golden.length > MAX_GOLDEN) this._golden.pop();
    }
    // Sort by success count so most-used is tried first
    this._golden.sort((a, b) => b.successCount - a.successCount);
    this._lastGood = {
      ip, port,
      token:    serverConnection.getToken(),
      deviceId: serverConnection.getDeviceId(),
      pairedAt: new Date().toISOString(),
    };
    await this._persist();
  }

  // ── Quick 2s ping ────────────────────────────────────────────
  private async _quickPing(ip: string, port: string): Promise<number | null> {
    const t0 = Date.now();
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 2000);
      const res  = await fetch(`http://${ip}:${port}/api/status`, { signal: ctrl.signal });
      clearTimeout(tid);
      if (res.status < 500) return Date.now() - t0;
    } catch {}
    return null;
  }

  // ── Build port list for a given IP ──────────────────────────
  // Includes known-good port + all common ports (adaptive)
  private async _portsForIP(ip: string): Promise<string[]> {
    const seen    = new Set<string>();
    const result: string[] = [];

    const add = (p: string | null | undefined) => {
      if (!p) return;
      const n = parseInt(p, 10);
      if (!isNaN(n) && n > 0 && n < 65536 && !seen.has(p)) {
        seen.add(p); result.push(p);
      }
    };

    // Saved port first
    const saved = await AsyncStorage.getItem('commandcube_server_port').catch(() => null);
    add(saved);

    // Golden port for this IP
    const goldenEntry = this._golden.find(g => g.ip === ip);
    if (goldenEntry) add(goldenEntry.port);

    // All common ports
    COMMON_PORTS.forEach(p => add(p));
    return result;
  }

  // ── Find fastest responding server from golden list ──────────
  async findFastestGolden(): Promise<{ ip: string; port: string; latencyMs: number } | null> {
    await this.load();
    if (this._golden.length === 0) return null;

    const results = await Promise.allSettled(
      this._golden.map(async entry => {
        const ports = await this._portsForIP(entry.ip);
        for (const port of ports.slice(0, 8)) { // try top 8 ports per IP
          const ms = await this._quickPing(entry.ip, port);
          if (ms !== null) return { ip: entry.ip, port, latencyMs: ms };
        }
        throw new Error('unreachable');
      })
    );

    let best: { ip: string; port: string; latencyMs: number } | null = null;
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        if (!best || r.value.latencyMs < best.latencyMs) best = r.value;
      }
    }
    return best;
  }

  // ── Ensure connected — tries all known methods ───────────────
  async ensureConnected(): Promise<ConnResult> {
    if (serverConnection.isConnected()) return { success: true, connected: true };
    if (this._connecting) return { success: false, connected: false, error: 'Already connecting' };
    this._connecting = true;

    try {
      await this.load();

      // 1. Saved IP/port (fastest path — worked before)
      const savedIp   = await AsyncStorage.getItem('commandcube_server_ip').catch(() => null);
      const savedPort = await AsyncStorage.getItem('commandcube_server_port').catch(() => null);
      if (savedIp) {
        const r = await serverConnection.connectManual(savedIp, savedPort || '');
        if (r.connected) {
          await this.recordSuccess(savedIp, serverConnection.getPort(), r.latency ?? 0);
          this._failStreak = 0; this._backoffMs = 6_000;
          this._emit(true, savedIp, serverConnection.getPort());
          return r;
        }
      }

      // 2. Golden list — parallel multi-IP scan
      const fastest = await this.findFastestGolden();
      if (fastest) {
        const r = await serverConnection.connectManual(fastest.ip, fastest.port);
        if (r.connected) {
          await AsyncStorage.multiSet([
            ['commandcube_server_ip',   fastest.ip],
            ['commandcube_server_port', fastest.port],
          ]).catch(() => {});
          await this.recordSuccess(fastest.ip, fastest.port, fastest.latencyMs);
          this._failStreak = 0; this._backoffMs = 6_000;
          this._emit(true, fastest.ip, fastest.port);
          return r;
        }
      }

      // All paths failed
      this._failStreak++;
      this._backoffMs = Math.min(60_000, 6_000 * Math.pow(1.5, Math.min(this._failStreak - 1, 6)));
      this._emit(false, '', '');
      return { success: false, connected: false, error: 'All known servers unreachable' };
    } finally {
      this._connecting = false;
    }
  }

  // ── Background auto-reconnect with exponential backoff ───────
  // ── Background auto-reconnect with exponential backoff ─────────
  // ⚠️  DO NOT CALL startAutoReconnect() while autoConnectEngine is running.
  // autoConnectEngine is the single source of truth for all reconnection.
  // This method is kept only for legacy compatibility but immediately no-ops
  // if the engine bridge is registered (engine is active).
  startAutoReconnect(): void {
    // Guard: autoConnectEngine handles all reconnection — do not start a second timer
    if (typeof (global as any).__butlerSwitchTab === 'function') {
      // Engine is running (bridge registered in _layout.tsx) — no-op
      return;
    }
    if (this._reconnTimer) return;
    const tick = async () => {
      if (!serverConnection.isConnected()) {
        await this.ensureConnected().catch(() => {});
      }
      this._reconnTimer = setTimeout(tick, this._backoffMs) as any;
    };
    this._reconnTimer = setTimeout(tick, 4_000) as any;
  }

  stopAutoReconnect(): void {
    if (this._reconnTimer) { clearTimeout(this._reconnTimer as any); this._reconnTimer = null; }
  }

  async getGoldenList(): Promise<GoldenEntry[]> { await this.load(); return [...this._golden]; }
  async getLastGood(): Promise<LastGood | null>  { await this.load(); return this._lastGood; }
  getFailStreak(): number { return this._failStreak; }
  getBackoffMs():  number { return this._backoffMs; }

  /**
   * restore() — loads last known-good IP+port into serverConnection so
   * the home tab sees an IP before the first ping resolves.
   * Called from app/_layout.tsx before routing to tabs.
   */
  async restore(): Promise<void> {
    try {
      await this.load();
      const savedIp   = await AsyncStorage.getItem('commandcube_server_ip').catch(() => null);
      const savedPort = await AsyncStorage.getItem('commandcube_server_port').catch(() => null);
      if (savedIp && savedPort) {
        // Pre-seed serverConnection so getIP()/getPort() return values immediately
        await serverConnection.saveManual(savedIp, savedPort).catch(() => {});
      }
    } catch {}
  }
}

export const connectionPersistence = new ConnectionPersistenceService();
