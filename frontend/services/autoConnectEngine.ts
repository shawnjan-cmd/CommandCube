/**
 * 🔌 AUTO-CONNECT ENGINE v1.0 — Single Source of Truth
 * ══════════════════════════════════════════════════════
 * ONE system that handles ALL connection automation.
 * Replaces: connectionPersistence timers, reconnectInterval, pingInterval, autoConnect().
 *
 * State machine:
 *  idle → connecting → connected
 *       → idle → scanning (first launch or all known fail)
 *       → connected → monitoring (6s ping)
 *       → monitoring → reconnecting → ...
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { serverConnection } from './serverConnection';
import { connectionPersistence } from './connectionPersistence';
import { quickScan, fastProbeLastKnown } from './lanScanner';
import { AppState, AppStateStatus } from 'react-native';
import { networkMonitor } from './networkMonitor';

const KEYS = {
  IP:   'commandcube_server_ip',
  PORT: 'commandcube_server_port',
};

export type EngineStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'scanning'
  | 'reconnecting';

export interface EngineEvent {
  status:       EngineStatus;
  ip?:          string;
  port?:        string;
  latencyMs?:   number;
  isFirstTime?: boolean;   // true = no saved IP, found via LAN scan
  message?:     string;
}

type Listener = (event: EngineEvent) => void;

class AutoConnectEngine {
  private _status:       EngineStatus = 'idle';
  private _listeners:    Listener[]   = [];
  private _pingTimer:    ReturnType<typeof setInterval> | null = null;
  private _reconnTimer:  ReturnType<typeof setTimeout>  | null = null;
  private _appStateSub:  any = null;
  private _started           = false;
  private _failStreak        = 0;
  private _scanAbort         = { aborted: false };
  private _scanning          = false;
  private _lastIp            = '';
  private _lastPort          = '';
  private _persistRetryTimer: ReturnType<typeof setInterval> | null = null;

  /** Backoff: 2s → 5s → 10s → 20s → 40s → 60s — fast initial retry, slower sustained */
  private _backoff(): number {
    const steps = [2_000, 5_000, 10_000, 20_000, 40_000, 60_000];
    return steps[Math.min(this._failStreak, steps.length - 1)];
  }

  onEvent(cb: Listener): () => void {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(l => l !== cb); };
  }

  /** Convenience alias for onEvent() — nexushome.tsx calls autoConnectEngine.on() */
  on(cb: Listener): () => void { return this.onEvent(cb); }

  private _emit(event: EngineEvent) {
    this._status = event.status;
    this._listeners.forEach(l => { try { l(event); } catch {} });
  }

  // ── Public API ────────────────────────────────────────────────
  getStatus(): EngineStatus { return this._status; }
  isConnected(): boolean    { return this._status === 'connected'; }

  /** Returns the current connection info synchronously — for page mount seeding */
  getCurrentConnection(): { ip: string; port: string; connected: boolean } {
    return {
      ip:        this._lastIp,
      port:      this._lastPort,
      connected: this._status === 'connected',
    };
  }

  /** Called once from _layout.tsx on app launch */
  async start(): Promise<void> {
    if (this._started) return;
    this._started = true;

    // Expose a global reconnect bridge so OmegaScannerDaemon can request
    // reconnects without calling connectManual() directly (which would race).
    (global as any).__autoConnectEngineReconnect = (ip: string, port: string) => {
      if (this._status !== 'connected') {
        this._doReconnect(ip, port).catch(() => {});
      }
    };

    // Load golden list + network monitor
    await connectionPersistence.load().catch(() => {});
    await networkMonitor.load().catch(() => {});
    networkMonitor.engineStart();

    // Watch app state — resume = try reconnect immediately.
    // CRITICAL: defer by one tick so the native bridge is fully alive
    // before attaching the AppState listener. On New Architecture +
    // Hermes cold start, attaching native listeners synchronously can
    // race with bridge init and crash the app.
    setTimeout(() => {
      try { this._appStateSub = AppState.addEventListener('change', this._onAppState); }
      catch (e) { console.warn('[autoConnectEngine] AppState listener attach failed:', e); }
    }, 0);

    // Try to connect (or scan if first time)
    await this._initialConnect();

    // Start continuous ping monitor
    this._startPingMonitor();
  }

  stop(): void {
    this._started = false;
    if (this._pingTimer)   { clearInterval(this._pingTimer); this._pingTimer = null; }
    if (this._reconnTimer) { clearTimeout(this._reconnTimer); this._reconnTimer = null; }
    if (this._persistRetryTimer) { clearInterval(this._persistRetryTimer); this._persistRetryTimer = null; }
    if (this._appStateSub) { this._appStateSub.remove?.(); this._appStateSub = null; }
    this._scanAbort.aborted = true;
    networkMonitor.engineStop();
    delete (global as any).__autoConnectEngineReconnect;
    this._emit({ status: 'idle' });
  }

  private _lastNotifyTs = 0;
  private _lastNotifyIp = '';

  /** Called by manual connect / QR success — tell engine we are connected */
  notifyConnected(ip: string, port: string, latencyMs = 0): void {
    const now = Date.now();
    if (
      now - this._lastNotifyTs < 2000 &&
      this._status === 'connected' &&
      this._lastNotifyIp === ip
    ) return;
    this._lastNotifyTs = now;
    this._lastNotifyIp = ip;
    this._lastIp        = ip;
    this._lastPort      = port;
    this._failStreak    = 0;
    this._pingFailCount = 0;
    // Persist immediately so any page that mounts after this reads the right IP
    AsyncStorage.multiSet([[KEYS.IP, ip], [KEYS.PORT, port]]).catch(() => {});
    connectionPersistence.recordSuccess(ip, port, latencyMs).catch(() => {});
    networkMonitor.connectOk(ip, port, latencyMs);
    if (this._persistRetryTimer) { clearInterval(this._persistRetryTimer); this._persistRetryTimer = null; }
    this._emit({ status: 'connected', ip, port, latencyMs });
    // Flush any KB growth tasks that queued while offline
    setTimeout(() => { try { (global as any).__kgeOnReconnect?.(); } catch {} }, 2000);
  }

  /** Called by disconnect button */
  notifyDisconnected(): void {
    const ip = this._lastIp; const port = this._lastPort;
    this._lastIp   = '';
    this._lastPort = '';
    if (ip && port) { networkMonitor.disconnect(ip, port); }
    this._emit({ status: 'idle', message: 'Disconnected by user' });
  }

  // ── Initial connect / first-launch scan ───────────────────────
  private async _initialConnect(): Promise<void> {
    const savedIp   = await AsyncStorage.getItem(KEYS.IP).catch(() => null);
    const savedPort = await AsyncStorage.getItem(KEYS.PORT).catch(() => null);

    if (savedIp && savedPort) {
      // Known server — try it first
      this._emit({ status: 'connecting', ip: savedIp, port: savedPort, message: `Connecting ${savedIp}:${savedPort}...` });
      const r = await serverConnection.connectManual(savedIp, savedPort).catch(() => null);
      if (r?.connected) {
        this._lastIp   = savedIp;
        this._lastPort = r ? (serverConnection.getPort() || savedPort) : savedPort;
        this._failStreak = 0;
        await connectionPersistence.recordSuccess(this._lastIp, this._lastPort, r.latency ?? 0).catch(() => {});
        networkMonitor.connectOk(this._lastIp, this._lastPort, r.latency ?? 0);
        this._emit({ status: 'connected', ip: this._lastIp, port: this._lastPort, latencyMs: r.latency });
        return;
      } else {
        networkMonitor.connectFail(savedIp, savedPort, r?.error || 'Connection failed');
      }

      // Saved IP failed — try golden list in parallel
      const fastest = await connectionPersistence.findFastestGolden().catch(() => null);
      if (fastest) {
        const r2 = await serverConnection.connectManual(fastest.ip, fastest.port).catch(() => null);
        if (r2?.connected) {
          this._lastIp   = fastest.ip;
          this._lastPort = fastest.port;
          this._failStreak = 0;
          await AsyncStorage.multiSet([[KEYS.IP, fastest.ip],[KEYS.PORT, fastest.port]]).catch(() => {});
          await connectionPersistence.recordSuccess(fastest.ip, fastest.port, fastest.latencyMs).catch(() => {});
          this._emit({ status: 'connected', ip: fastest.ip, port: fastest.port, latencyMs: fastest.latencyMs });
          return;
        }
      }

      // All known failed — fall through to scan
    }

    // Try fast probe first (<1.5s) — handles the common case where
    // server is on same subnet but IP drifted slightly from DHCP
    const isFirstTimeFast = !savedIp;
    const fastFound = await fastProbeLastKnown((srv) => {
      this._connectToDiscovered(srv.ip, String(srv.port), isFirstTimeFast);
    });
    if (fastFound) return; // Done — found via fast probe

    if (!savedIp) {
      this._emit({ status: 'idle', message: 'No server paired — scan QR code to connect' });
      return;
    }
    // Saved IP existed but failed — run background LAN scan to find it on new IP
    this._runBackgroundScan(false);
  }

  // ── Background LAN scan ───────────────────────────────────────
  private async _runBackgroundScan(isFirstTime: boolean): Promise<void> {
    if (this._scanning) return;
    this._scanning = true;
    this._scanAbort = { aborted: false };
    networkMonitor.scanStart();
    this._emit({ status: 'scanning', message: isFirstTime ? 'First launch — scanning for server...' : 'Scanning network for server...' });

    try {
      let found = false;
      await quickScan((progress) => {
        if (this._scanAbort.aborted || found) return;
        if (progress.found.length > 0) {
          found = true;
          this._scanAbort.aborted = true;
          const srv = progress.found[0];
          // Auto-connect to first found server
          this._connectToDiscovered(srv.ip, String(srv.port), isFirstTime);
        }
      }, this._scanAbort);

      if (!found) {
        this._scanning = false;
        networkMonitor.scanEmpty();
        this._emit({ status: 'idle', message: 'No server found on network' });
        // Start persistent retry + schedule backoff reconnect
        const savedIp   = await AsyncStorage.getItem(KEYS.IP).catch(() => null);
        const savedPort = await AsyncStorage.getItem(KEYS.PORT).catch(() => null);
        if (savedIp && savedPort) this._startPersistentRetry(savedIp, savedPort);
        this._scheduleReconnect();
      }
    } catch {
      this._scanning = false;
      networkMonitor.scanEmpty();
      this._emit({ status: 'idle', message: 'Scan error' });
      this._scheduleReconnect();
    }
  }

  private async _connectToDiscovered(ip: string, port: string, isFirstTime: boolean): Promise<void> {
    this._scanning = false;
    this._emit({ status: 'connecting', ip, port, message: `Found ${ip}:${port} — connecting...` });
    try {
      const r = await serverConnection.connectManual(ip, port);
      if (r.connected) {
        const resolvedPort = serverConnection.getPort() || port;
        await AsyncStorage.multiSet([[KEYS.IP, ip],[KEYS.PORT, resolvedPort]]).catch(() => {});
        await connectionPersistence.recordSuccess(ip, resolvedPort, r.latency ?? 0).catch(() => {});
        networkMonitor.scanFound(ip, resolvedPort, r.latency ?? 0);
        networkMonitor.connectOk(ip, resolvedPort, r.latency ?? 0);
        this._lastIp    = ip;
        this._lastPort  = resolvedPort;
        this._failStreak = 0;
        this._emit({ status: 'connected', ip, port: resolvedPort, latencyMs: r.latency, isFirstTime,
          message: isFirstTime ? `Server found! Connected to ${ip}:${resolvedPort}` : `Reconnected to ${ip}:${resolvedPort}` });
      } else {
        networkMonitor.connectFail(ip, port, r?.error || 'Auto-connect failed');
        this._emit({ status: 'idle', message: 'Auto-connect failed' });
        this._scheduleReconnect();
      }
    } catch (e: any) {
      networkMonitor.connectFail(ip, port, e?.message || 'Error');
      this._emit({ status: 'idle' });
      this._scheduleReconnect();
    }
  }

  // ── Ping monitor (runs while connected) ───────────────────────
  private _pingFailCount = 0;

  private _startPingMonitor(): void {
    if (this._pingTimer) clearInterval(this._pingTimer);
    this._pingTimer = setInterval(async () => {
      const ip   = this._lastIp   || await AsyncStorage.getItem(KEYS.IP).catch(() => null);
      const port = this._lastPort || await AsyncStorage.getItem(KEYS.PORT).catch(() => null);

      if (!ip || !port) {
        // No saved server — do NOT auto-scan. Wait for user to QR pair.
        return;
      }

      const ms = await serverConnection.quickPing(ip, port).catch(() => null);
      if (ms !== null) {
        this._pingFailCount = 0;
        networkMonitor.pingOk(ip, port, ms);
        // Only emit connected if we were NOT already connected — prevents flicker
        if (this._status !== 'connected') {
          this._lastIp   = ip;
          this._lastPort = port;
          this._failStreak = 0;
          this._emit({ status: 'connected', ip, port, latencyMs: ms });
        }
        // Silently update status data without emitting if already connected
      } else {
        this._pingFailCount++;
        networkMonitor.pingFail(ip, port, `Ping attempt ${this._pingFailCount}/4 failed`);
        // Require 4 consecutive failures (120s at 30s interval) before declaring offline.
        // This prevents WiFi hiccups from causing false disconnects.
        if (this._pingFailCount >= 4 && this._status === 'connected') {
          // Try one extra silent ping with a longer timeout before giving up
          networkMonitor.disconnect(ip, port);
          const silentR = await serverConnection.quickPing(ip, port).catch(() => null);
          if (silentR !== null) {
            this._pingFailCount = 0;
            networkMonitor.pingOk(ip, port, silentR);
            return;
          }
          this._emit({ status: 'reconnecting', ip, port, message: `Lost connection to ${ip}:${port}` });
          this._doReconnect(ip, port);
        } else if (this._pingFailCount >= 4 && this._status !== 'connected' && this._status !== 'reconnecting') {
          // BACKUP 3: Silent 60s auto-retry when disconnected — server may have come back online
          if (!this._reconnTimer) {
            this._reconnTimer = setTimeout(async () => {
              this._reconnTimer = null;
              if (this._status !== 'connected') { this._doReconnect(ip, port); }
            }, 60_000) as any;
          }
        }
      }
    }, 30_000); // 30s interval when connected — reduces battery drain; 4 failures = 120s before offline
  }

  // ── Reconnect attempt ─────────────────────────────────────────
  private async _doReconnect(ip: string, port: string): Promise<void> {
    this._pingFailCount = 0;

    // 0. Fast subnet probe — catches DHCP drift in <1.5s without full scan
    const fastFound = await fastProbeLastKnown(() => {}).catch(() => null);
    if (fastFound) {
      const rf = await serverConnection.connectManual(fastFound.ip, String(fastFound.port)).catch(() => null);
      if (rf?.connected) {
        this._failStreak = 0;
        const resolvedPortF = serverConnection.getPort() || String(fastFound.port);
        this._lastIp   = fastFound.ip;
        this._lastPort = resolvedPortF;
        await AsyncStorage.multiSet([[KEYS.IP, fastFound.ip], [KEYS.PORT, resolvedPortF]]).catch(() => {});
        await connectionPersistence.recordSuccess(fastFound.ip, resolvedPortF, fastFound.latencyMs).catch(() => {});
        networkMonitor.reconnectOk(fastFound.ip, resolvedPortF, fastFound.latencyMs);
        this._emit({ status: 'connected', ip: fastFound.ip, port: resolvedPortF, latencyMs: fastFound.latencyMs });
        return;
      }
    }

    // 1. Try saved server
    const r = await serverConnection.connectManual(ip, port).catch(() => null);
    if (r?.connected) {
      this._failStreak = 0;
      const resolvedPort = serverConnection.getPort() || port;
      this._lastIp   = ip;
      this._lastPort = resolvedPort;
      await connectionPersistence.recordSuccess(ip, resolvedPort, r.latency ?? 0).catch(() => {});
      networkMonitor.reconnectOk(ip, resolvedPort, r.latency ?? 0);
      this._emit({ status: 'connected', ip, port: resolvedPort, latencyMs: r.latency });
      return;
    } else {
      networkMonitor.reconnectFail(ip, port, r?.error || 'Reconnect failed');
    }

    // 2. Try golden list
    const fastest = await connectionPersistence.findFastestGolden().catch(() => null);
    if (fastest) {
      const r2 = await serverConnection.connectManual(fastest.ip, fastest.port).catch(() => null);
      if (r2?.connected) {
        this._failStreak = 0;
        await AsyncStorage.multiSet([[KEYS.IP, fastest.ip],[KEYS.PORT, fastest.port]]).catch(() => {});
        await connectionPersistence.recordSuccess(fastest.ip, fastest.port, fastest.latencyMs).catch(() => {});
        networkMonitor.reconnectOk(fastest.ip, fastest.port, fastest.latencyMs);
        this._lastIp   = fastest.ip;
        this._lastPort = fastest.port;
        this._emit({ status: 'connected', ip: fastest.ip, port: fastest.port, latencyMs: fastest.latencyMs });
        return;
      } else {
        networkMonitor.reconnectFail(fastest.ip, fastest.port, r2?.error || 'Golden list reconnect failed');
      }
    }

    // 3. Fall back to scan
    this._failStreak++;
    this._emit({ status: 'idle', message: 'Reconnect failed — scanning...' });
    this._startPersistentRetry(ip, port);
    this._runBackgroundScan(false);
  }

  // ── Persistent silent retry — every 90s forever until connected ───
  private _startPersistentRetry(ip: string, port: string): void {
    if (this._persistRetryTimer) return; // already running
    this._persistRetryTimer = setInterval(async () => {
      if (this._status === 'connected') {
        clearInterval(this._persistRetryTimer!);
        this._persistRetryTimer = null;
        return;
      }
      const ms = await serverConnection.quickPing(ip, port).catch(() => null);
      if (ms !== null) {
        clearInterval(this._persistRetryTimer!);
        this._persistRetryTimer = null;
        this._pingFailCount = 0;
        this._lastIp   = ip;
        this._lastPort = port;
        await AsyncStorage.multiSet([[KEYS.IP, ip],[KEYS.PORT, port]]).catch(() => {});
        await connectionPersistence.recordSuccess(ip, port, ms).catch(() => {});
        this._emit({ status: 'connected', ip, port, latencyMs: ms });
      }
    }, 90_000);
  }

  // ── Schedule deferred reconnect ───────────────────────────────
  private _scheduleReconnect(): void {
    if (this._reconnTimer) clearTimeout(this._reconnTimer);
    const delay = this._backoff();
    this._reconnTimer = setTimeout(async () => {
      this._reconnTimer = null;
      if (this._status === 'connected') return;
      const ip   = this._lastIp   || await AsyncStorage.getItem(KEYS.IP).catch(() => null);
      const port = this._lastPort || await AsyncStorage.getItem(KEYS.PORT).catch(() => null);
      if (ip && port) {
        await this._doReconnect(ip, port);
      } else {
        this._runBackgroundScan(true);
      }
    }, delay) as any;
  }

  // ── App state change ──────────────────────────────────────────
  private _onAppState = (nextState: AppStateStatus) => {
    if (nextState === 'active') {
      networkMonitor.appResume();
    } else if (nextState === 'background') {
      networkMonitor.appBackground();
    }
    if (nextState === 'active') {
      // Resume from background — immediate connectivity check regardless of current status
      if (this._reconnTimer) { clearTimeout(this._reconnTimer); this._reconnTimer = null; }
      const tryReconnect = async () => {
        // BACKUP 2: Always read from AsyncStorage when _lastIp is empty (app cold-start from bg)
        if (!this._lastIp) {
          const storedIp   = await AsyncStorage.getItem(KEYS.IP).catch(() => null);
          const storedPort = await AsyncStorage.getItem(KEYS.PORT).catch(() => null);
          if (storedIp && storedPort) { this._lastIp = storedIp; this._lastPort = storedPort; }
        }
        const ip   = this._lastIp   || await AsyncStorage.getItem(KEYS.IP).catch(() => null);
        const port = this._lastPort || await AsyncStorage.getItem(KEYS.PORT).catch(() => null);
        if (ip && port) {
          if (this._status === 'connected') {
            // Already connected — do a quick ping to confirm link is still live
            const ms = await serverConnection.quickPing(ip, port).catch(() => null);
            if (ms !== null) {
              // Still alive — reset fail streak and emit fresh connected event
              this._pingFailCount = 0;
              networkMonitor.pingOk(ip, port, ms);
            } else {
              // Link dropped during background — reconnect immediately
              this._pingFailCount = 0;
              networkMonitor.disconnect(ip, port);
              this._emit({ status: 'reconnecting', ip, port, message: 'Link lost during background — reconnecting...' });
              await this._doReconnect(ip, port);
            }
          } else {
            await this._doReconnect(ip, port);
          }
        } else if (!this._scanning) {
          // Only scan on resume if a server was previously known
          const savedIp = await AsyncStorage.getItem(KEYS.IP).catch(() => null);
          if (savedIp) this._runBackgroundScan(false);
        }
      };
      tryReconnect().catch(() => {});
    }
  };
}

export const autoConnectEngine = new AutoConnectEngine();

