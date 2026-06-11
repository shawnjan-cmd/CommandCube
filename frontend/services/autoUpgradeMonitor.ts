/**
 * ⚡ AUTO-UPGRADE MONITOR — Self-Healing Intelligence Engine v1.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { knowledgeAccumulator } from './knowledgeAccumulator';
import { kbOrganizerBot } from './kbOrganizerBot';
import { knowledgeGrowthEngine, AutoUpgradeEntry } from './knowledgeGrowthEngine';
import { serverConnection } from './serverConnection';
import { nexusBridgeSettings } from './nexusBridgeSettings';
import { quantumLinkHarvester } from './quantumLinkHarvester';

export interface MonitorIssue {
  id:          string;
  severity:    'info' | 'warning' | 'critical';
  category:    'kb' | 'server' | 'memory' | 'organize' | 'growth';
  description: string;
  autoFixed:   boolean;
  fix?:        string;
  ts:          number;
}

export interface MonitorReport {
  ts:         number;
  status:     'healthy' | 'degraded' | 'critical';
  score:      number;
  issues:     MonitorIssue[];
  fixes:      string[];
  kbFindings: number;
  kbDomains:  number;
  lastGrowth: number;
  cycleMs:    number;
}

const MONITOR_LOG_KEY   = '@auto_monitor_log_v1';
const MONITOR_FIXES_KEY = '@auto_monitor_fixes_v1';
const MONITOR_INTERVAL  = 8 * 60 * 1000;

const FIX_ACTIONS: Record<string, () => Promise<string>> = {
  async trigger_ωloop_seed() {
    const result = await knowledgeGrowthEngine.runGrowthCycle(true);
    return `ΩLOOP forced: +${result.added} findings from ${result.events.length} events`;
  },
  async prune_low_confidence() {
    const sessions = await knowledgeAccumulator.loadResearch();
    const all = sessions.flatMap(s => s.findings);
    if (all.length < 50) return 'KB too small to prune — skipped';
    const threshold = all
      .map(f => f.metadata?.confidence ?? 0.5)
      .sort((a, b) => a - b)[Math.floor(all.length * 0.1)];
    const pruned = all.filter(f => (f.metadata?.confidence ?? 0.5) < threshold);
    return `Marked ${pruned.length} low-confidence findings for removal (conf < ${threshold.toFixed(2)})`;
  },
  async run_organize_cycle() {
    await kbOrganizerBot.runOrganizeCycle(true);
    const state = kbOrganizerBot.getState();
    return `Organize complete: ${state.totalOrganized} unique, ${state.duplicatesFound} dupes removed`;
  },
  async reduce_relay_results() {
    const settings = nexusBridgeSettings.get();
    if (settings.maxRelayResults > 2) {
      await nexusBridgeSettings.save({ maxRelayResults: settings.maxRelayResults - 1 });
      return `Max relay results reduced: ${settings.maxRelayResults} → ${settings.maxRelayResults - 1}`;
    }
    return 'Max relay already at minimum (2) — no change';
  },
  async enable_local_only() {
    await nexusBridgeSettings.save({ localOnlyMode: true });
    return 'Local-only mode enabled (relay offline) — will re-enable when server reconnects';
  },
  async disable_local_only() {
    await nexusBridgeSettings.save({ localOnlyMode: false });
    return 'Local-only mode disabled — relay enrichment restored';
  },
  async trigger_qlh_harvest() {
    quantumLinkHarvester.triggerMicroHarvest();
    return 'QLH micro-harvest triggered: discovering new Python resource links';
  },
};

class AutoUpgradeMonitorService {
  private _running   = false;
  private _timer:    ReturnType<typeof setInterval> | null = null;
  private _lastReport: MonitorReport | null = null;
  private _listeners = new Set<(report: MonitorReport) => void>();
  private _toastListeners = new Set<(fix: string, severity: string) => void>();
  private _lastGrowthTs = 0;

  onReport(cb: (r: MonitorReport) => void): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  /** Subscribe to critical auto-fix toasts — fires when an issue is auto-fixed */
  onCriticalFix(cb: (fix: string, severity: string) => void): () => void {
    this._toastListeners.add(cb);
    return () => this._toastListeners.delete(cb);
  }

  getLastReport(): MonitorReport | null { return this._lastReport; }
  isRunning(): boolean { return this._running; }

  start(): void {
    if (this._timer) return;
    console.log('[AUTO-MONITOR] Starting — checking every 8 minutes');
    setTimeout(() => this._runCheck(), 30_000);
    this._timer = setInterval(() => this._runCheck(), MONITOR_INTERVAL);
  }

  stop(): void {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  async forceCheck(): Promise<MonitorReport> {
    return this._runCheck();
  }

  private async _runCheck(): Promise<MonitorReport> {
    if (this._running) return this._lastReport!;
    // #7 CONNECTION GUARD — skip expensive checks if not connected
    if (!serverConnection.isConnected()) return this._lastReport ?? { ts: Date.now(), status: 'healthy', score: 80, issues: [], fixes: [], kbFindings: 0, kbDomains: 0, lastGrowth: 0, cycleMs: 0 };
    this._running = true;
    const t0     = Date.now();
    const issues: MonitorIssue[] = [];
    const fixes:  string[]       = [];

    try {
      const kbStats    = await knowledgeAccumulator.getStats();
      const botState   = kbOrganizerBot.getState();
      const upgradeLog = await knowledgeGrowthEngine.getUpgradeLog();

      const kbFindings  = kbStats.totalFindings;
      const kbDomains   = botState.clustersFormed || 1;
      const dupeRate    = botState.totalOrganized > 0
        ? botState.duplicatesFound / botState.totalOrganized : 0;
      const recentErrors = upgradeLog.filter(e => e.type === 'error' && Date.now() - e.ts < 30 * 60_000);
      const recentGrowth = upgradeLog.filter(e => e.type === 'growth' && Date.now() - e.ts < 25 * 60_000 && e.delta > 0);

      if (recentGrowth.length === 0 && kbFindings < 100) {
        issues.push({ id: 'kb_stagnant', severity: 'warning', category: 'kb',
          description: `KB stagnant — ${kbFindings} findings, no growth in last 25min`,
          autoFixed: false, ts: Date.now() });
        try {
          const fixResult = await FIX_ACTIONS['trigger_ωloop_seed']();
          issues[issues.length - 1].autoFixed = true;
          issues[issues.length - 1].fix = fixResult;
          fixes.push(`KB stagnation: ${fixResult}`);
          this._lastGrowthTs = Date.now();
        } catch {}
      }

      if (dupeRate > 0.4 && botState.totalOrganized > 20) {
        issues.push({ id: 'high_dupe_rate', severity: 'warning', category: 'kb',
          description: `High dupe rate: ${(dupeRate * 100).toFixed(0)}% duplicates`,
          autoFixed: false, ts: Date.now() });
        try {
          const fixResult = await FIX_ACTIONS['run_organize_cycle']();
          issues[issues.length - 1].autoFixed = true;
          issues[issues.length - 1].fix = fixResult;
          fixes.push(`Dupe cleanup: ${fixResult}`);
        } catch {}
      }

      if (recentErrors.length >= 3) {
        issues.push({ id: 'error_cluster', severity: 'critical', category: 'kb',
          description: `Error cluster: ${recentErrors.length} errors in last 30 min`,
          autoFixed: false, ts: Date.now() });
        try {
          const fixResult = await FIX_ACTIONS['reduce_relay_results']();
          issues[issues.length - 1].autoFixed = true;
          issues[issues.length - 1].fix = fixResult;
          fixes.push(`Error mitigation: ${fixResult}`);
        } catch {}
      }

      if (kbFindings > 480) {
        issues.push({ id: 'memory_pressure', severity: 'warning', category: 'memory',
          description: `KB near capacity: ${kbFindings}/500 findings`,
          autoFixed: false, ts: Date.now() });
        try {
          const fixResult = await FIX_ACTIONS['prune_low_confidence']();
          issues[issues.length - 1].autoFixed = true;
          issues[issues.length - 1].fix = fixResult;
          fixes.push(`Memory relief: ${fixResult}`);
        } catch {}
      }

      const gaps = botState.coverageGaps || [];
      if (gaps.length > 0) {
        issues.push({ id: 'coverage_gaps', severity: 'info', category: 'kb',
          description: `Coverage gaps: ${gaps.slice(0, 3).join(', ')}`,
          autoFixed: false, ts: Date.now() });
        try {
          const fixResult = await FIX_ACTIONS['trigger_qlh_harvest']();
          issues[issues.length - 1].autoFixed = true;
          issues[issues.length - 1].fix = fixResult;
          fixes.push(`Gap fill: ${fixResult}`);
        } catch {}
      }

      const ip   = serverConnection.getIP();
      const port = serverConnection.getPort();
      const settings = nexusBridgeSettings.get();

      if (!ip || !port) {
        if (!settings.localOnlyMode) {
          issues.push({ id: 'server_offline', severity: 'info', category: 'server',
            description: 'PC server not configured — relay enrichment disabled',
            autoFixed: false, ts: Date.now() });
        }
      } else {
        try {
          const ctrl = new AbortController();
          setTimeout(() => ctrl.abort(), 2500);
          const res = await fetch(`http://${ip}:${port}/api/status`, { signal: ctrl.signal });
          if (!res.ok && settings.localOnlyMode) {
            const fix = await FIX_ACTIONS['disable_local_only']();
            fixes.push(`Server restored: ${fix}`);
          }
        } catch {
          if (!settings.localOnlyMode) {
            const fix = await FIX_ACTIONS['enable_local_only']();
            fixes.push(`Server unreachable: ${fix}`);
            issues.push({ id: 'server_unreachable', severity: 'warning', category: 'server',
              description: `Server ${ip}:${port} unreachable — switching to local-only`,
              autoFixed: true, fix, ts: Date.now() });
          }
        }
      }

      const recentOrganize = upgradeLog.filter(e => e.type === 'organize').slice(0, 5);
      const avgOrganizeMs  = recentOrganize.length > 0
        ? recentOrganize.reduce((s, e) => s + e.durationMs, 0) / recentOrganize.length : 0;
      if (avgOrganizeMs > 8000) {
        issues.push({ id: 'slow_organize', severity: 'warning', category: 'organize',
          description: `Organize cycle slow: avg ${(avgOrganizeMs/1000).toFixed(1)}s`,
          autoFixed: false, ts: Date.now() });
        try {
          const fixResult = await FIX_ACTIONS['prune_low_confidence']();
          issues[issues.length - 1].autoFixed = true;
          issues[issues.length - 1].fix = fixResult;
          fixes.push(`Speed fix: ${fixResult}`);
        } catch {}
      }

      const criticals = issues.filter(i => i.severity === 'critical').length;
      const warnings  = issues.filter(i => i.severity === 'warning').length;
      const score     = Math.max(0, 100 - criticals * 25 - warnings * 10);
      const status: MonitorReport['status'] = criticals > 0 ? 'critical' : warnings > 2 ? 'degraded' : 'healthy';

      const report: MonitorReport = {
        ts: Date.now(), status, score, issues, fixes,
        kbFindings, kbDomains, lastGrowth: this._lastGrowthTs, cycleMs: Date.now() - t0,
      };

      this._lastReport = report;
      await this._persistReport(report);
      this._listeners.forEach(cb => { try { cb(report); } catch {} });

      // Fire toast for any auto-fixed issues
      if (fixes.length > 0) {
        const autoFixedIssues = issues.filter(i => i.autoFixed && i.fix);
        if (autoFixedIssues.length > 0) {
          const topFix = autoFixedIssues.sort((a, b) =>
            (b.severity === 'critical' ? 2 : b.severity === 'warning' ? 1 : 0) -
            (a.severity === 'critical' ? 2 : a.severity === 'warning' ? 1 : 0)
          )[0];
          this._toastListeners.forEach(cb => {
            try { cb(topFix.fix!, topFix.severity); } catch {}
          });
        }
        console.log(`[AUTO-MONITOR] Applied ${fixes.length} auto-fix(es)`);
      }

      return report;
    } catch (e: any) {
      const fallback: MonitorReport = {
        ts: Date.now(), status: 'degraded', score: 60,
        issues: [{ id: 'monitor_error', severity: 'warning', category: 'kb',
          description: `Monitor check failed: ${e?.message}`, autoFixed: false, ts: Date.now() }],
        fixes: [], kbFindings: 0, kbDomains: 0, lastGrowth: 0, cycleMs: Date.now() - t0,
      };
      this._lastReport = fallback;
      return fallback;
    } finally {
      this._running = false;
    }
  }

  private async _persistReport(report: MonitorReport): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(MONITOR_LOG_KEY);
      const log: MonitorReport[] = raw ? JSON.parse(raw) : [];
      log.unshift(report);
      if (log.length > 50) log.splice(50);
      await AsyncStorage.setItem(MONITOR_LOG_KEY, JSON.stringify(log));
      if (report.fixes.length > 0) {
        const fRaw = await AsyncStorage.getItem(MONITOR_FIXES_KEY);
        const fixes: string[] = fRaw ? JSON.parse(fRaw) : [];
        fixes.unshift(...report.fixes.map(f => `[${new Date(report.ts).toLocaleTimeString()}] ${f}`));
        if (fixes.length > 200) fixes.splice(200);
        await AsyncStorage.setItem(MONITOR_FIXES_KEY, JSON.stringify(fixes));
      }
    } catch {}
  }

  async getReports(): Promise<MonitorReport[]> {
    try {
      const raw = await AsyncStorage.getItem(MONITOR_LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  async getFixes(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(MONITOR_FIXES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  async clearLogs(): Promise<void> {
    await AsyncStorage.multiRemove([MONITOR_LOG_KEY, MONITOR_FIXES_KEY]);
  }
}

export const autoUpgradeMonitor = new AutoUpgradeMonitorService();
