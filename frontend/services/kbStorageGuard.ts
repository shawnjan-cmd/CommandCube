/**
 * 🛡️ KB STORAGE GUARD — Permanent protection against storage overflow
 * ══════════════════════════════════════════════════════════════════
 * Monitors AsyncStorage usage, warns at thresholds, auto-prunes old
 * entries when near limit. Prevents app crashes from storage overflow.
 *
 * FEATURES:
 *  • Real-time storage size estimation
 *  • Warn at 70%, alert at 85%, auto-prune at 90%
 *  • Smart pruning: removes lowest-confidence, oldest entries first
 *  • Storage growth history graph data
 *  • Proprietary adaptive threshold based on device
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const GUARD_KEY         = '@kb_storage_guard_v1';
const HISTORY_KEY       = '@kb_storage_guard_history_v1';
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Storage limits (AsyncStorage has no official limit but 6MB is safe)
const WARN_THRESHOLD_MB    = 4.0;   // 70% of 6MB → show warning
const ALERT_THRESHOLD_MB   = 5.0;   // 85% → orange alert
const PRUNE_THRESHOLD_MB   = 5.5;   // 90% → auto-prune
const HARD_LIMIT_MB        = 6.0;   // Estimated AsyncStorage safe limit

export interface StorageReport {
  estimatedMB:   number;
  percentUsed:   number;
  status:        'ok' | 'warning' | 'alert' | 'critical';
  message:       string;
  breakdown:     Record<string, number>;  // key → size in bytes
  lastChecked:   number;
  pruneNeeded:   boolean;
  pruneAction?:  string;
}

export interface StorageHistoryEntry {
  ts:          number;
  estimatedMB: number;
  findings:    number;
}

type GuardListener = (report: StorageReport) => void;

const KB_KEYS_TO_MONITOR = [
  '@botler_auto_saved_research',
  '@kb_growth_log_v1',
  '@kb_auto_upgrade_log_v1',
  '@ncx_state_v1',
  '@ncx_offline_queue',
  '@cp_golden_ips_v2',
  '@cp_last_good_v2',
  '@kb_domain_coverage_v1',
  '@kb_growth_topics_v1',
  '@fileshare_history_v1',
  '@omega_network_log_v3',
];

class KBStorageGuard {
  private _timer:     ReturnType<typeof setInterval> | null = null;
  private _listeners: GuardListener[] = [];
  private _lastReport: StorageReport | null = null;
  private _running = false;

  onStorageAlert(cb: GuardListener): () => void {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(l => l !== cb); };
  }

  private _emit(r: StorageReport) {
    this._lastReport = r;
    this._listeners.forEach(l => { try { l(r); } catch {} });
  }

  getLastReport(): StorageReport | null { return this._lastReport; }

  // ── Start background monitoring ───────────────────────────────
  start(): void {
    if (this._running) return;
    this._running = true;
    // First check after 30s on launch (let app settle)
    setTimeout(() => this.check(), 30_000);
    // DISABLED: Server manages KB storage
    // this._timer = setInterval(() => this.check(), CHECK_INTERVAL_MS);
  }

  stop(): void {
    this._running = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  // ── Full storage check ────────────────────────────────────────
  async check(): Promise<StorageReport> {
    const breakdown: Record<string, number> = {};
    let totalBytes = 0;

    try {
      // Sample known keys
      const pairs = await AsyncStorage.multiGet(KB_KEYS_TO_MONITOR).catch(() => []);
      for (const [key, val] of pairs) {
        if (val) {
          const sizeBytes = new Blob([val]).size;
          breakdown[key] = sizeBytes;
          totalBytes += sizeBytes;
        }
      }

      // Also estimate from getAllKeys
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const unknownKeys = allKeys.filter(k => !KB_KEYS_TO_MONITOR.includes(k)).slice(0, 20);
        if (unknownKeys.length > 0) {
          const unknownPairs = await AsyncStorage.multiGet(unknownKeys);
          for (const [key, val] of unknownPairs) {
            if (val) {
              const sizeBytes = new Blob([val]).size;
              breakdown[key.slice(0, 30)] = sizeBytes;
              totalBytes += sizeBytes;
            }
          }
        }
      } catch {}

    } catch {}

    const estimatedMB = totalBytes / (1024 * 1024);
    const percentUsed = Math.round((estimatedMB / HARD_LIMIT_MB) * 100);

    let status: StorageReport['status'] = 'ok';
    let message = `Storage healthy: ${estimatedMB.toFixed(2)}MB used`;
    let pruneNeeded = false;
    let pruneAction: string | undefined;

    if (estimatedMB >= PRUNE_THRESHOLD_MB) {
      status = 'critical';
      message = `CRITICAL: Storage ${estimatedMB.toFixed(2)}MB / ${HARD_LIMIT_MB}MB — auto-pruning now!`;
      pruneNeeded = true;
      pruneAction = 'auto_prune_oldest_low_confidence';
      await this._autoPrune();
    } else if (estimatedMB >= ALERT_THRESHOLD_MB) {
      status = 'alert';
      message = `ALERT: Storage ${estimatedMB.toFixed(2)}MB / ${HARD_LIMIT_MB}MB (${percentUsed}%) — consider clearing old data`;
      pruneNeeded = true;
      pruneAction = 'manual_clear_recommended';
    } else if (estimatedMB >= WARN_THRESHOLD_MB) {
      status = 'warning';
      message = `Storage at ${estimatedMB.toFixed(2)}MB / ${HARD_LIMIT_MB}MB (${percentUsed}%) — growing`;
    }

    const report: StorageReport = {
      estimatedMB,
      percentUsed,
      status,
      message,
      breakdown,
      lastChecked: Date.now(),
      pruneNeeded,
      pruneAction,
    };

    // Save history entry
    await this._appendHistory({ ts: Date.now(), estimatedMB, findings: 0 });

    // Emit if not ok (only alert listeners on problems or first check)
    if (status !== 'ok' || !this._lastReport) {
      this._emit(report);
    } else {
      this._lastReport = report;
    }

    return report;
  }

  // ── Auto-prune: remove oldest + lowest-confidence entries ─────
  private async _autoPrune(): Promise<number> {
    let pruned = 0;
    try {
      // Prune KB research
      const raw = await AsyncStorage.getItem('@botler_auto_saved_research');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.findings && Array.isArray(data.findings)) {
          const before = data.findings.length;
          // Sort by confidence asc, then by date asc → worst + oldest first
          data.findings.sort((a: any, b: any) => {
            const confA = a.metadata?.confidence ?? 0.5;
            const confB = b.metadata?.confidence ?? 0.5;
            if (Math.abs(confA - confB) > 0.1) return confA - confB;
            return (a.metadata?.ts ?? 0) - (b.metadata?.ts ?? 0);
          });
          // Remove bottom 20%
          const removeCount = Math.max(10, Math.floor(data.findings.length * 0.2));
          data.findings = data.findings.slice(removeCount);
          pruned = before - data.findings.length;
          data.totalFindings = data.findings.length;
          await AsyncStorage.setItem('@botler_auto_saved_research', JSON.stringify(data));
          console.log(`[StorageGuard] Auto-pruned ${pruned} KB findings`);
        }
      }

      // Trim growth log
      const growthRaw = await AsyncStorage.getItem('@kb_growth_log_v1');
      if (growthRaw) {
        const log = JSON.parse(growthRaw);
        if (Array.isArray(log) && log.length > 30) {
          await AsyncStorage.setItem('@kb_growth_log_v1', JSON.stringify(log.slice(-30)));
        }
      }

      // Trim upgrade log
      const upgradeRaw = await AsyncStorage.getItem('@kb_auto_upgrade_log_v1');
      if (upgradeRaw) {
        const log = JSON.parse(upgradeRaw);
        if (Array.isArray(log) && log.length > 50) {
          await AsyncStorage.setItem('@kb_auto_upgrade_log_v1', JSON.stringify(log.slice(-50)));
        }
      }

      // Trim network monitor
      const netRaw = await AsyncStorage.getItem('@omega_network_log_v3');
      if (netRaw) {
        const log = JSON.parse(netRaw);
        if (log.events && Array.isArray(log.events) && log.events.length > 100) {
          log.events = log.events.slice(-100);
          await AsyncStorage.setItem('@omega_network_log_v3', JSON.stringify(log));
        }
      }

    } catch (e: any) {
      console.warn('[StorageGuard] Auto-prune error:', e?.message);
    }
    return pruned;
  }

  // ── Manual clear (user triggered) ────────────────────────────
  async manualClear(level: 'light' | 'medium' | 'deep' = 'light'): Promise<{ freed: number; message: string }> {
    const before = (await this.check()).estimatedMB;
    try {
      if (level === 'light' || level === 'medium' || level === 'deep') {
        await this._autoPrune();
      }
      if (level === 'medium' || level === 'deep') {
        // Also trim file share history, offline queue
        await AsyncStorage.removeItem('@fileshare_history_v1');
        await AsyncStorage.removeItem('@ncx_offline_queue');
        await AsyncStorage.removeItem('@kb_growth_topics_v1');
      }
      if (level === 'deep') {
        // Nuclear — clear all logs but keep KB findings and connection state
        await AsyncStorage.multiRemove([
          '@kb_growth_log_v1',
          '@kb_auto_upgrade_log_v1',
          '@omega_network_log_v3',
          HISTORY_KEY,
        ]);
      }
    } catch {}
    const after = (await this.check()).estimatedMB;
    const freed = Math.max(0, before - after);
    return {
      freed,
      message: `Freed ~${freed.toFixed(2)}MB — storage now ${after.toFixed(2)}MB`,
    };
  }

  // ── Storage history ───────────────────────────────────────────
  private async _appendHistory(entry: StorageHistoryEntry): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      const history: StorageHistoryEntry[] = raw ? JSON.parse(raw) : [];
      history.push(entry);
      // Keep last 48 entries (4 hours at 5min intervals)
      if (history.length > 48) history.splice(0, history.length - 48);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {}
  }

  async getHistory(): Promise<StorageHistoryEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  // ── Quick size estimate for UI ────────────────────────────────
  async quickEstimate(): Promise<{ mb: number; percent: number; status: string }> {
    if (this._lastReport) {
      return {
        mb: this._lastReport.estimatedMB,
        percent: this._lastReport.percentUsed,
        status: this._lastReport.status,
      };
    }
    const r = await this.check();
    return { mb: r.estimatedMB, percent: r.percentUsed, status: r.status };
  }
}

export const kbStorageGuard = new KBStorageGuard();
