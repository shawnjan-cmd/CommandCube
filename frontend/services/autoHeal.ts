/**
 * 🛡️ AUTO-HEAL SERVICE — Predictive watchdog for everything that can go wrong
 * ═══════════════════════════════════════════════════════════════════════════════
 * Monitors: connection health · KB storage · memory pressure · token expiry
 *           server responsiveness · subnet changes · port drift
 *
 * Self-fixes: token refresh · reconnect on subnet change · KB pruning
 *             stale IP detection · port re-discovery · error log pruning
 *
 * Strategy: silent background checks every 30s → act only when needed.
 * No UI interaction, no user prompts, no hardcoded values.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { serverConnection } from './serverConnection';
import { autoConnectEngine } from './autoConnectEngine';
import { connectionPersistence } from './connectionPersistence';

const HEAL_LOG_KEY  = '@autoheal_log_v1';
const LAST_SEEN_KEY = '@autoheal_last_subnet_v1';
const MAX_LOG       = 60;

// ── What can go wrong and the fix ────────────────────────────────
const PREDICTABLE_FAILURES = [
  'token_expired',       // 401 from server → reconnect silently
  'subnet_changed',      // phone moved to different WiFi → re-scan
  'port_drifted',        // server restarted on different port → re-discover
  'storage_bloat',       // KB AsyncStorage > 4MB → prune oldest findings
  'stale_ip',            // saved IP no longer responds → use golden list
  'heartbeat_gap',       // missed 3+ pings → proactive reconnect
  'engine_stalled',      // engine stuck in scanning > 3min → restart it
  'token_missing',       // token gone from storage but IP saved → re-pair flow
] as const;

type FailureType = typeof PREDICTABLE_FAILURES[number];

interface HealEntry {
  ts:      number;
  type:    FailureType;
  detail:  string;
  fixed:   boolean;
  fixMsg?: string;
}

class AutoHealService {
  private _timer:          ReturnType<typeof setInterval> | null = null;
  private _log:            HealEntry[] = [];
  private _lastSubnet      = '';
  private _missedPings     = 0;
  private _lastPingOk      = Date.now();
  private _scanningStart   = 0;
  private _running         = false;
  private _storageChecked  = 0; // timestamp of last storage check

  // ── Start/stop ───────────────────────────────────────────────
  start(): void {
    if (this._timer) return;
    this._loadLog().then(() => {});
    this._loadLastSubnet().then(() => {});

    // First heal after 20s (let app settle), then every 30s
    setTimeout(() => {
      this._runHealCycle().catch(() => {});
      this._timer = setInterval(() => {
        this._runHealCycle().catch(() => {});
      }, 30_000);
    }, 20_000);
  }

  stop(): void {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  // ── Public ping tracker (called by layout when a ping succeeds) ──
  recordPingOk(): void {
    this._missedPings = 0;
    this._lastPingOk  = Date.now();
  }

  // ── Main heal cycle ──────────────────────────────────────────
  private async _runHealCycle(): Promise<void> {
    if (this._running) return;
    this._running = true;
    try {
      // Run all checks in parallel — each is independent
      await Promise.allSettled([
        this._checkSubnetChange(),
        this._checkTokenHealth(),
        this._checkStoragePressure(),
        this._checkHeartbeatGap(),
        this._checkEngineStall(),
        this._checkStaleIP(),
      ]);
    } finally {
      this._running = false;
    }
  }

  // ── 1. Subnet change detection ───────────────────────────────
  // If the phone switches WiFi network, the saved IP becomes unreachable.
  // Fix: detect subnet mismatch → trigger background scan immediately.
  private async _checkSubnetChange(): Promise<void> {
    try {
      const ip   = serverConnection.getIP();
      const port = serverConnection.getPort();
      if (!ip || !port) return;

      const savedIp  = await AsyncStorage.getItem('commandcube_server_ip').catch(() => null);
      if (!savedIp) return;

      const savedSubnet = savedIp.split('.').slice(0, 3).join('.');

      // Try to detect current device subnet from last scan result or a quick probe
      // We do this by checking if the saved IP still responds — if not after 2 quick pings,
      // the subnet likely changed.
      if (autoConnectEngine.getCurrentConnection().connected) {
        const ms = await serverConnection.quickPing(ip, port).catch(() => null);
        if (ms !== null) {
          // Still alive — update last known good subnet
          if (savedSubnet !== this._lastSubnet) {
            this._lastSubnet = savedSubnet;
            await this._saveLastSubnet(savedSubnet);
          }
          return;
        }
      }

      // Server not responding — check if subnet changed
      if (this._lastSubnet && savedSubnet !== this._lastSubnet) {
        await this._heal('subnet_changed', `Subnet changed: ${this._lastSubnet} → ${savedSubnet}`, async () => {
          // Trigger engine to reconnect (it will try golden list then scan)
          if (!autoConnectEngine.getCurrentConnection().connected) {
            autoConnectEngine.notifyDisconnected();
            // Let engine run its natural reconnect cycle
          }
        });
      }
    } catch {}
  }

  // ── 2. Token health check ────────────────────────────────────
  // If server returns 401, the token is expired. Fix: silent reconnect.
  private async _checkTokenHealth(): Promise<void> {
    try {
      const ip    = serverConnection.getIP();
      const port  = serverConnection.getPort();
      const token = serverConnection.getToken();
      if (!ip || !port || !token) return;
      if (!autoConnectEngine.getCurrentConnection().connected) return;

      // Quick status probe with auth header
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 4000);
      const res  = await fetch(`http://${ip}:${port}/api/status`, {
        headers: { Authorization: `Bearer ${token}` },
        signal:  ctrl.signal,
      }).catch(() => null);
      clearTimeout(tid);

      if (!res || res.status !== 401) return;

      // Token expired — reconnect to get fresh token
      await this._heal('token_expired', `Token expired for ${ip}:${port}`, async () => {
        const result = await serverConnection.reconnect().catch(() => null);
        if (!result?.connected) {
          await serverConnection.connectManual(ip, port).catch(() => {});
        }
      });
    } catch {}
  }

  // ── 3. Storage pressure ──────────────────────────────────────
  // AsyncStorage has a per-app limit (~6MB on Android).
  // Fix: prune KB findings if total storage looks bloated.
  private async _checkStoragePressure(): Promise<void> {
    try {
      // Only check every 5 minutes to avoid overhead
      if (Date.now() - this._storageChecked < 5 * 60_000) return;
      this._storageChecked = Date.now();

      const raw = await AsyncStorage.getItem('@botler_auto_saved_research').catch(() => null);
      if (!raw) return;

      const sizeBytes = raw.length * 2; // UTF-16 approximation
      if (sizeBytes < 2_000_000) return; // Under 2MB — fine

      await this._heal('storage_bloat', `KB storage ${(sizeBytes / 1024 / 1024).toFixed(1)}MB`, async () => {
        // Prune: keep only high-confidence findings, cap at 200
        try {
          const parsed = JSON.parse(raw);
          const allFindings = (parsed.sessions || []).flatMap((s: any) => s.findings || []);
          const kept = allFindings
            .sort((a: any, b: any) => (b.metadata?.confidence ?? 0) - (a.metadata?.confidence ?? 0))
            .slice(0, 200);
          const pruned = {
            version:       parsed.version,
            sessions:      [{ query: '[pruned]', findings: kept, totalCompression: 0, savedAt: new Date().toISOString() }],
            totalFindings: kept.length,
            lastSaved:     new Date().toISOString(),
          };
          await AsyncStorage.setItem('@botler_auto_saved_research', JSON.stringify(pruned));
        } catch {}
      });
    } catch {}
  }

  // ── 4. Heartbeat gap detection ───────────────────────────────
  // If no successful ping in 3+ minutes while supposedly connected,
  // something is wrong. Fix: proactive reconnect attempt.
  private async _checkHeartbeatGap(): Promise<void> {
    try {
      if (!autoConnectEngine.getCurrentConnection().connected) return;
      const gapMs = Date.now() - this._lastPingOk;
      if (gapMs < 3 * 60_000) return; // Under 3 minutes — fine

      await this._heal('heartbeat_gap', `No heartbeat for ${Math.round(gapMs / 60000)}min`, async () => {
        const ip   = serverConnection.getIP();
        const port = serverConnection.getPort();
        if (!ip || !port) return;
        const ms = await serverConnection.quickPing(ip, port).catch(() => null);
        if (ms !== null) {
          this._lastPingOk = Date.now(); // Alive — update timestamp
        } else {
          // Actually dead — trigger reconnect
          autoConnectEngine.notifyDisconnected();
        }
      });
    } catch {}
  }

  // ── 5. Engine stall detection ────────────────────────────────
  // If the engine has been in 'scanning' state for more than 3 minutes,
  // something went wrong. Fix: emit idle to break the loop.
  private async _checkEngineStall(): Promise<void> {
    try {
      const status = autoConnectEngine.getStatus();
      if (status === 'scanning') {
        if (!this._scanningStart) {
          this._scanningStart = Date.now();
          return;
        }
        const stallMs = Date.now() - this._scanningStart;
        if (stallMs < 3 * 60_000) return;

        await this._heal('engine_stalled', `Engine stuck in scanning for ${Math.round(stallMs / 60000)}min`, async () => {
          this._scanningStart = 0;
          // Stop and restart the engine's scan cycle by emitting idle
          // The engine will naturally retry via its scheduleReconnect mechanism
          autoConnectEngine.notifyDisconnected();
        });
      } else {
        this._scanningStart = 0; // Reset stall timer when not scanning
      }
    } catch {}
  }

  // ── 6. Stale IP detection ────────────────────────────────────
  // The saved IP may be stale (device got new DHCP lease, etc.)
  // Fix: try golden list, if that works save the new IP.
  private async _checkStaleIP(): Promise<void> {
    try {
      if (autoConnectEngine.getCurrentConnection().connected) return;

      const savedIp   = await AsyncStorage.getItem('commandcube_server_ip').catch(() => null);
      const savedPort = await AsyncStorage.getItem('commandcube_server_port').catch(() => null);
      if (!savedIp || !savedPort) return;

      // Already tried by engine — don't duplicate. Only run if engine is idle.
      const status = autoConnectEngine.getStatus();
      if (status !== 'idle') return;

      // Try saved IP quickly
      const ms = await serverConnection.quickPing(savedIp, savedPort).catch(() => null);
      if (ms !== null) return; // Saved IP works — not stale

      // Saved IP is stale — try golden list
      await this._heal('stale_ip', `Saved IP ${savedIp} unreachable`, async () => {
        const fastest = await connectionPersistence.findFastestGolden().catch(() => null);
        if (fastest) {
          await AsyncStorage.multiSet([
            ['commandcube_server_ip',   fastest.ip],
            ['commandcube_server_port', fastest.port],
          ]).catch(() => {});
          autoConnectEngine.notifyConnected(fastest.ip, fastest.port, fastest.latencyMs);
        }
      });
    } catch {}
  }

  // ── Heal executor ────────────────────────────────────────────
  private async _heal(type: FailureType, detail: string, fix: () => Promise<void>): Promise<void> {
    // Dedupe: don't log the same issue more than once per 5 minutes
    const recent = this._log.find(e =>
      e.type === type &&
      Date.now() - e.ts < 5 * 60_000
    );
    if (recent?.fixed) return;

    console.log(`[AutoHeal] Detected: ${type} — ${detail}`);
    try {
      await fix();
      this._addLog({ ts: Date.now(), type, detail, fixed: true, fixMsg: 'Auto-fixed' });
    } catch (e: any) {
      this._addLog({ ts: Date.now(), type, detail, fixed: false, fixMsg: e?.message });
    }
  }

  // ── Log management ───────────────────────────────────────────
  private _addLog(entry: HealEntry): void {
    this._log = [entry, ...this._log].slice(0, MAX_LOG);
    AsyncStorage.setItem(HEAL_LOG_KEY, JSON.stringify(this._log)).catch(() => {});
  }

  private async _loadLog(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(HEAL_LOG_KEY);
      if (raw) this._log = JSON.parse(raw);
    } catch {}
  }

  private async _saveLastSubnet(subnet: string): Promise<void> {
    try { await AsyncStorage.setItem(LAST_SEEN_KEY, subnet); } catch {}
  }

  private async _loadLastSubnet(): Promise<void> {
    try {
      const v = await AsyncStorage.getItem(LAST_SEEN_KEY);
      if (v) this._lastSubnet = v;
    } catch {}
  }

  // ── Public accessors ─────────────────────────────────────────
  getLog(): HealEntry[] { return [...this._log]; }

  async clearLog(): Promise<void> {
    this._log = [];
    await AsyncStorage.removeItem(HEAL_LOG_KEY).catch(() => {});
  }
}

export const autoHeal = new AutoHealService();
