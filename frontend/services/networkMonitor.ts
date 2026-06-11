/**
 * 🌐 NETWORK MONITOR v1.0 — Deep Connection Logging
 * ════════════════════════════════════════════════════════════════════
 * Persistent network event logger that captures every connection
 * event, failure, and recovery so problems are immediately diagnosable.
 *
 * Features:
 *  • Circular log buffer (last 200 events) — never grows unbounded
 *  • Structured log entries: timestamp, type, ip, port, ms, error
 *  • Connection state timeline (connect/disconnect/scan/fail streaks)
 *  • Port history: tracks which ports have worked vs failed
 *  • Daily summary stats (attempts, successes, avg latency)
 *  • AsyncStorage persistence — survives app restarts
 *  • Zero impact on UI thread — all writes are async/fire-and-forget
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_KEY      = '@netmon_log_v1';
const STATS_KEY    = '@netmon_stats_v1';
const MAX_LOG_SIZE = 200;

export type NetEventType =
  | 'CONNECT_OK'
  | 'CONNECT_FAIL'
  | 'PING_OK'
  | 'PING_FAIL'
  | 'SCAN_START'
  | 'SCAN_FOUND'
  | 'SCAN_EMPTY'
  | 'RECONNECT_OK'
  | 'RECONNECT_FAIL'
  | 'DISCONNECT'
  | 'PAIR_OK'
  | 'PAIR_FAIL'
  | 'TOKEN_OK'
  | 'TOKEN_FAIL'
  | 'PORT_DISCOVERED'
  | 'IP_CHANGED'
  | 'FIREWALL_BLOCK'
  | 'TIMEOUT'
  | 'ENGINE_START'
  | 'ENGINE_STOP'
  | 'APP_RESUME'
  | 'APP_BACKGROUND';

export interface NetLogEntry {
  id:        number;
  ts:        number;           // Unix ms
  type:      NetEventType;
  ip?:       string;
  port?:     string;
  ms?:       number;           // latency
  error?:    string;
  extra?:    string;           // any extra context
  success:   boolean;
}

export interface NetStats {
  totalAttempts:   number;
  totalSuccesses:  number;
  totalFailures:   number;
  avgLatencyMs:    number;
  longestDowntimeMs: number;
  lastSuccessTs:   number;
  lastFailureTs:   number;
  portHistory:     Record<string, { ok: number; fail: number }>;
  ipHistory:       Record<string, { ok: number; fail: number; lastSeen: number }>;
  dailyAttempts:   number;
  dailySuccesses:  number;
  sessionStart:    number;
  failStreak:      number;
  successStreak:   number;
}

const DEFAULT_STATS: NetStats = {
  totalAttempts:    0,
  totalSuccesses:   0,
  totalFailures:    0,
  avgLatencyMs:     0,
  longestDowntimeMs: 0,
  lastSuccessTs:    0,
  lastFailureTs:    0,
  portHistory:      {},
  ipHistory:        {},
  dailyAttempts:    0,
  dailySuccesses:   0,
  sessionStart:     Date.now(),
  failStreak:       0,
  successStreak:    0,
};

class NetworkMonitorService {
  private _log:       NetLogEntry[] = [];
  private _stats:     NetStats      = { ...DEFAULT_STATS };
  private _nextId     = 0;
  private _loaded     = false;
  private _saving     = false;
  private _saveTimer: ReturnType<typeof setTimeout> | null = null;
  private _lastDisconnectTs = 0;

  // ── Load from storage ────────────────────────────────────────
  async load(): Promise<void> {
    if (this._loaded) return;
    try {
      const [logRaw, statsRaw] = await AsyncStorage.multiGet([LOG_KEY, STATS_KEY])
        .then(pairs => pairs.map(([, v]) => v));
      if (logRaw) {
        const parsed = JSON.parse(logRaw) as NetLogEntry[];
        this._log    = parsed.slice(-MAX_LOG_SIZE);
        this._nextId = (this._log[this._log.length - 1]?.id ?? 0) + 1;
      }
      if (statsRaw) {
        this._stats = { ...DEFAULT_STATS, ...JSON.parse(statsRaw) };
        // Reset daily counters if new day
        const sessionDay = new Date(this._stats.sessionStart).toDateString();
        const today      = new Date().toDateString();
        if (sessionDay !== today) {
          this._stats.dailyAttempts  = 0;
          this._stats.dailySuccesses = 0;
          this._stats.sessionStart   = Date.now();
        }
      }
    } catch {}
    this._loaded = true;
  }

  // ── Debounced save ───────────────────────────────────────────
  private _scheduleSave(): void {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(async () => {
      this._saveTimer = null;
      if (this._saving) return;
      this._saving = true;
      try {
        await AsyncStorage.multiSet([
          [LOG_KEY,   JSON.stringify(this._log.slice(-MAX_LOG_SIZE))],
          [STATS_KEY, JSON.stringify(this._stats)],
        ]);
      } catch {}
      this._saving = false;
    }, 1500);
  }

  // ── Core log function ────────────────────────────────────────
  log(
    type:    NetEventType,
    success: boolean,
    opts:    { ip?: string; port?: string; ms?: number; error?: string; extra?: string } = {}
  ): void {
    if (!this._loaded) {
      this.load().then(() => this.log(type, success, opts)).catch(() => {});
      return;
    }

    const entry: NetLogEntry = {
      id:      this._nextId++,
      ts:      Date.now(),
      type,
      success,
      ...opts,
    };

    // Circular buffer
    this._log.push(entry);
    if (this._log.length > MAX_LOG_SIZE) {
      this._log = this._log.slice(-MAX_LOG_SIZE);
    }

    // Update stats
    this._updateStats(entry);
    this._scheduleSave();
  }

  private _updateStats(e: NetLogEntry): void {
    const s = this._stats;
    const isNetworkEvent = [
      'CONNECT_OK','CONNECT_FAIL','PING_OK','PING_FAIL',
      'RECONNECT_OK','RECONNECT_FAIL',
    ].includes(e.type);

    if (isNetworkEvent) {
      s.totalAttempts++;
      s.dailyAttempts++;
    }

    if (e.success) {
      if (isNetworkEvent) { s.totalSuccesses++; s.dailySuccesses++; }
      s.lastSuccessTs  = e.ts;
      s.failStreak     = 0;
      s.successStreak++;

      // Update downtime
      if (this._lastDisconnectTs > 0) {
        const downMs = e.ts - this._lastDisconnectTs;
        if (downMs > s.longestDowntimeMs) s.longestDowntimeMs = downMs;
        this._lastDisconnectTs = 0;
      }

      // Rolling average latency
      if (e.ms) {
        const prevAvg = s.avgLatencyMs;
        const count   = s.totalSuccesses;
        s.avgLatencyMs = count <= 1 ? e.ms : Math.round((prevAvg * (count - 1) + e.ms) / count);
      }

      // Port history
      if (e.port) {
        s.portHistory[e.port] = s.portHistory[e.port] || { ok: 0, fail: 0 };
        s.portHistory[e.port].ok++;
      }
      // IP history
      if (e.ip) {
        s.ipHistory[e.ip] = s.ipHistory[e.ip] || { ok: 0, fail: 0, lastSeen: 0 };
        s.ipHistory[e.ip].ok++;
        s.ipHistory[e.ip].lastSeen = e.ts;
      }
    } else {
      if (isNetworkEvent) { s.totalFailures++; }
      s.lastFailureTs = e.ts;
      s.failStreak++;
      s.successStreak = 0;
      if ([
        'CONNECT_FAIL','PING_FAIL','RECONNECT_FAIL','DISCONNECT',
        'TIMEOUT','FIREWALL_BLOCK',
      ].includes(e.type)) {
        if (!this._lastDisconnectTs) this._lastDisconnectTs = e.ts;
      }
      if (e.port) {
        s.portHistory[e.port] = s.portHistory[e.port] || { ok: 0, fail: 0 };
        s.portHistory[e.port].fail++;
      }
      if (e.ip) {
        s.ipHistory[e.ip] = s.ipHistory[e.ip] || { ok: 0, fail: 0, lastSeen: 0 };
        s.ipHistory[e.ip].fail++;
        s.ipHistory[e.ip].lastSeen = e.ts;
      }
    }
  }

  // ── Convenience helpers ──────────────────────────────────────
  connectOk  (ip: string, port: string, ms: number) { this.log('CONNECT_OK',   true,  { ip, port, ms }); }
  connectFail(ip: string, port: string, error: string) { this.log('CONNECT_FAIL', false, { ip, port, error }); }
  pingOk     (ip: string, port: string, ms: number) { this.log('PING_OK',     true,  { ip, port, ms }); }
  pingFail   (ip: string, port: string, error?: string) { this.log('PING_FAIL',   false, { ip, port, error }); }
  scanStart  ()                                    { this.log('SCAN_START',   true,  {}); }
  scanFound  (ip: string, port: string, ms: number) { this.log('SCAN_FOUND',   true,  { ip, port, ms }); }
  scanEmpty  ()                                    { this.log('SCAN_EMPTY',   false, {}); }
  reconnectOk(ip: string, port: string, ms: number) { this.log('RECONNECT_OK', true,  { ip, port, ms }); }
  reconnectFail(ip: string, port: string, error: string) { this.log('RECONNECT_FAIL', false, { ip, port, error }); }
  disconnect (ip: string, port: string)             { this.log('DISCONNECT',   false, { ip, port }); this._lastDisconnectTs = Date.now(); }
  pairOk     (ip: string, port: string)             { this.log('PAIR_OK',      true,  { ip, port }); }
  pairFail   (ip: string, port: string, error: string) { this.log('PAIR_FAIL',   false, { ip, port, error }); }
  tokenOk    (ip: string)                          { this.log('TOKEN_OK',     true,  { ip }); }
  tokenFail  (ip: string, error: string)            { this.log('TOKEN_FAIL',   false, { ip, error }); }
  portDiscovered(ip: string, port: string, ms: number) { this.log('PORT_DISCOVERED', true, { ip, port, ms }); }
  timeout    (ip: string, port: string)             { this.log('TIMEOUT',      false, { ip, port, error: 'Timeout' }); }
  firewallBlock(ip: string, port: string)           { this.log('FIREWALL_BLOCK', false, { ip, port, error: 'Firewall likely blocking port' }); }
  engineStart()                                    { this.log('ENGINE_START',  true,  {}); }
  engineStop ()                                    { this.log('ENGINE_STOP',   true,  {}); }
  appResume  ()                                    { this.log('APP_RESUME',    true,  {}); }
  appBackground()                                  { this.log('APP_BACKGROUND', true, {}); }

  // ── Read API ─────────────────────────────────────────────────
  getLog(limit = 50): NetLogEntry[] {
    return this._log.slice(-limit).reverse();
  }

  getStats(): NetStats {
    return { ...this._stats };
  }

  getRecentFailures(limit = 10): NetLogEntry[] {
    return this._log
      .filter(e => !e.success)
      .slice(-limit)
      .reverse();
  }

  getConnectionTimeline(limit = 30): NetLogEntry[] {
    const TIMELINE_TYPES: NetEventType[] = [
      'CONNECT_OK','CONNECT_FAIL','RECONNECT_OK','RECONNECT_FAIL',
      'DISCONNECT','SCAN_FOUND','SCAN_EMPTY','PAIR_OK','PAIR_FAIL',
      'ENGINE_START','APP_RESUME',
    ];
    return this._log
      .filter(e => TIMELINE_TYPES.includes(e.type))
      .slice(-limit)
      .reverse();
  }

  // ── Diagnostic analysis ───────────────────────────────────────
  getDiagnosticReport(): {
    healthScore:        number;      // 0-100
    issues:             string[];
    recommendations:    string[];
    bestPort:           string | null;
    bestIP:             string | null;
    failRate:           number;      // 0-1
    avgLatencyMs:       number;
    totalDowntimeMs:    number;
    recentFailStreak:   number;
  } {
    const s = this._stats;
    const issues: string[] = [];
    const recs:   string[] = [];

    const failRate = s.totalAttempts > 0
      ? s.totalFailures / s.totalAttempts
      : 0;

    // Score (100 = perfect)
    let score = 100;
    score -= Math.round(failRate * 60);
    score -= Math.min(30, s.failStreak * 5);
    if (s.avgLatencyMs > 500) score -= 10;
    if (s.avgLatencyMs > 200) score -= 5;
    score = Math.max(0, Math.min(100, score));

    // Issues
    if (failRate > 0.5)       issues.push(`High failure rate: ${Math.round(failRate * 100)}% of connections fail`);
    if (s.failStreak >= 3)    issues.push(`${s.failStreak} consecutive connection failures — server may be offline`);
    if (s.avgLatencyMs > 300) issues.push(`High latency: ${s.avgLatencyMs}ms average — check WiFi signal`);
    if (s.longestDowntimeMs > 60_000) issues.push(`Longest outage: ${Math.round(s.longestDowntimeMs / 60000)}min — connection is unstable`);

    // Port-specific issues
    const failPorts = Object.entries(s.portHistory)
      .filter(([, v]) => v.fail > 0 && v.ok === 0)
      .map(([p]) => p);
    if (failPorts.length > 0) {
      issues.push(`Ports that never worked: ${failPorts.slice(0, 3).join(', ')} — likely wrong port range`);
    }

    // Recommendations
    if (issues.length === 0) {
      recs.push('Connection is stable — no action needed');
    } else {
      if (failRate > 0.5) {
        recs.push('Ensure phone and PC are on the same WiFi network');
        recs.push('Check Windows Firewall — allow TCP on the server port');
      }
      if (s.failStreak >= 3) {
        recs.push('Restart butler_server.py on your PC');
        recs.push('Use LAN Auto-Discover to find the server again');
      }
      if (s.avgLatencyMs > 300) {
        recs.push('Move phone closer to WiFi router');
        recs.push('Use 2.4GHz band for better range, 5GHz for speed');
      }
    }

    // Best port (most successful)
    const bestPort = Object.entries(s.portHistory)
      .sort(([, a], [, b]) => b.ok - a.ok)
      .find(([, v]) => v.ok > 0)?.[0] ?? null;

    // Best IP (most recent success)
    const bestIP = Object.entries(s.ipHistory)
      .filter(([, v]) => v.ok > 0)
      .sort(([, a], [, b]) => b.lastSeen - a.lastSeen)
      .find(() => true)?.[0] ?? null;

    return {
      healthScore:     score,
      issues,
      recommendations: recs,
      bestPort,
      bestIP,
      failRate,
      avgLatencyMs:    s.avgLatencyMs,
      totalDowntimeMs: s.longestDowntimeMs,
      recentFailStreak: s.failStreak,
    };
  }

  // ── Format helpers for UI ────────────────────────────────────
  formatEntry(e: NetLogEntry): string {
    const time = new Date(e.ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const icon = e.success ? '✓' : '✗';
    const ip   = e.ip && e.port ? `${e.ip}:${e.port}` : e.ip || '';
    const ms   = e.ms ? ` ${e.ms}ms` : '';
    const err  = e.error ? ` — ${e.error.slice(0, 60)}` : '';
    return `${time} ${icon} ${e.type}${ip ? ' ' + ip : ''}${ms}${err}`;
  }

  async clear(): Promise<void> {
    this._log   = [];
    this._stats = { ...DEFAULT_STATS, sessionStart: Date.now() };
    this._nextId = 0;
    await AsyncStorage.multiRemove([LOG_KEY, STATS_KEY]).catch(() => {});
  }
}

export const networkMonitor = new NetworkMonitorService();
