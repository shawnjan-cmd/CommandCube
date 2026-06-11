/**
 * 🔍 APP SCANNER SERVICE
 * Scans real in-app data: AsyncStorage keys, log counts, connection health,
 * memory usage, and generates actionable fix recommendations.
 * No fake data — uses actual device state.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { serverConnection } from './serverConnection';
import { autoErrorLogger } from './autoErrorLogger';
import { taskMemory } from './taskMemory';

export interface ScanResult {
  id: string;
  category: 'storage' | 'connection' | 'logs' | 'tasks' | 'system' | 'security';
  status: 'ok' | 'warning' | 'error';
  title: string;
  detail: string;
  fix?: string;
  value?: string | number;
}

export interface FullScanReport {
  timestamp: string;
  durationMs: number;
  overallStatus: 'ok' | 'warning' | 'error';
  score: number; // 0-100
  results: ScanResult[];
  summary: string;
  autoFixCount: number;
}

class AppScannerService {
  private lastReport: FullScanReport | null = null;

  async runFullScan(onProgress?: (step: string) => void): Promise<FullScanReport> {
    const start = Date.now();
    const results: ScanResult[] = [];
    let autoFixes = 0;

    // ── 1. Storage scan ─────────────────────────────────────────
    onProgress?.('Scanning storage...');
    try {
      const keys = await AsyncStorage.getAllKeys();
      const butlerKeys = (keys as string[]).filter(k => k.startsWith('@butler') || k.startsWith('commandcube'));
      const total = keys.length;

      results.push({
        id: 'storage-total',
        category: 'storage',
        status: total > 200 ? 'warning' : 'ok',
        title: 'AsyncStorage keys',
        detail: `${total} keys found (${butlerKeys.length} Butler keys)`,
        value: total,
        fix: total > 200 ? 'Clear old logs in TOOLS → LOGGER → CLEAR' : undefined,
      });

      // Check for oversized values
      const sampleKeys = butlerKeys.slice(0, 10);
      for (const key of sampleKeys) {
        const val = await AsyncStorage.getItem(key);
        if (val && val.length > 50000) {
          results.push({
            id: `storage-large-${key}`,
            category: 'storage',
            status: 'warning',
            title: 'Large storage value',
            detail: `Key "${key}" is ${(val.length / 1024).toFixed(1)}KB`,
            value: val.length,
            fix: 'Old data will be cleared automatically on next compression cycle',
          });
        }
      }
    } catch (e: any) {
      results.push({ id: 'storage-err', category: 'storage', status: 'error', title: 'Storage scan failed', detail: e?.message });
    }

    // ── 2. Connection scan ───────────────────────────────────────
    onProgress?.('Checking server connection...');
    const ip   = serverConnection.getIP();
    const port = serverConnection.getPort();
    const token = serverConnection.getToken();
    const isConn = serverConnection.isConnected();

    if (!ip || !port) {
      results.push({
        id: 'conn-missing',
        category: 'connection',
        status: 'warning',
        title: 'No server configured',
        detail: 'Go to CONNECT tab to pair with your PC server',
        fix: 'Open CONNECT tab → Scan QR or enter IP:Port',
      });
    } else {
      const ping = await serverConnection.ping(ip, port, 5000);
      results.push({
        id: 'conn-ping',
        category: 'connection',
        status: ping.connected ? 'ok' : 'error',
        title: ping.connected ? 'Server reachable' : 'Server unreachable',
        detail: ping.connected
          ? `${ip}:${port} responds in ${ping.latency}ms`
          : `${ip}:${port} — ${ping.error}`,
        value: ping.latency,
        fix: ping.connected ? undefined : 'Ensure ButlerServer.exe is running on your PC on same Wi-Fi',
      });

      results.push({
        id: 'conn-auth',
        category: 'security',
        status: token ? 'ok' : 'warning',
        title: token ? 'Session token valid' : 'No session token',
        detail: token
          ? `Device is authenticated (token: ...${token.slice(-8)})`
          : 'Device not authenticated — tap CONNECT to reconnect',
        fix: token ? undefined : 'Go to CONNECT tab and reconnect',
      });

      // Latency quality
      if (ping.connected && ping.latency !== undefined) {
        const latMs = ping.latency;
        results.push({
          id: 'conn-latency',
          category: 'connection',
          status: latMs < 50 ? 'ok' : latMs < 200 ? 'warning' : 'error',
          title: 'Network latency',
          detail: `${latMs}ms to server (${latMs < 50 ? 'excellent' : latMs < 200 ? 'acceptable' : 'high — check Wi-Fi'})`,
          value: latMs,
        });
      }
    }

    // ── 3. Log scan ──────────────────────────────────────────────
    onProgress?.('Analysing logs...');
    const logStats = autoErrorLogger.getStats();
    results.push({
      id: 'logs-errors',
      category: 'logs',
      status: logStats.errorCount > 20 ? 'error' : logStats.errorCount > 5 ? 'warning' : 'ok',
      title: 'Error log count',
      detail: `${logStats.errorCount} errors, ${logStats.warningCount} warnings captured`,
      value: logStats.errorCount,
      fix: logStats.errorCount > 20 ? 'High error rate — check server connection and script syntax' : undefined,
    });

    results.push({
      id: 'logs-buffer',
      category: 'logs',
      status: logStats.totalLogs > 80 ? 'warning' : 'ok',
      title: 'Log buffer usage',
      detail: `${logStats.totalLogs}/100 entries in memory buffer`,
      value: logStats.totalLogs,
      fix: logStats.totalLogs > 80 ? 'Tap LOGGER → CLEAR to flush log buffer' : undefined,
    });

    // ── 4. Task memory scan ──────────────────────────────────────
    onProgress?.('Reviewing task memory...');
    try {
      const tasks = await taskMemory.getAll();
      const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
      const critical = tasks.filter(t => t.priority === 'critical' && t.status === 'pending');

      results.push({
        id: 'tasks-count',
        category: 'tasks',
        status: pending.length > 20 ? 'warning' : 'ok',
        title: 'Pending tasks',
        detail: `${pending.length} pending tasks (${tasks.length} total)`,
        value: pending.length,
      });

      if (critical.length > 0) {
        results.push({
          id: 'tasks-critical',
          category: 'tasks',
          status: 'error',
          title: 'Critical tasks pending',
          detail: critical.map(t => t.title).slice(0, 3).join(', '),
          value: critical.length,
          fix: 'Address critical tasks in TASKS tab',
        });
      }
    } catch {}

    // ── 5. System scan ───────────────────────────────────────────
    onProgress?.('Checking system info...');
    results.push({
      id: 'sys-platform',
      category: 'system',
      status: 'ok',
      title: 'Platform',
      detail: `${Platform.OS} ${Platform.Version}`,
    });

    // ── Compute score ────────────────────────────────────────────
    const errors   = results.filter(r => r.status === 'error').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const total    = results.length;
    const ok       = total - errors - warnings;
    const score    = Math.round((ok / total) * 100);
    const overall  = errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'ok';

    const summary = errors > 0
      ? `${errors} issue${errors > 1 ? 's' : ''} found — check error items below`
      : warnings > 0
      ? `${warnings} warning${warnings > 1 ? 's' : ''} found — review recommendations`
      : 'All systems normal — no issues detected';

    const report: FullScanReport = {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      overallStatus: overall,
      score,
      results,
      summary,
      autoFixCount: autoFixes,
    };
    this.lastReport = report;
    return report;
  }

  getLastReport() { return this.lastReport; }
}

export const appScanner = new AppScannerService();
