/**
 * 📊 SERVER METRICS SERVICE
 * Fetches real system metrics from the paired Python butler server.
 * Uses /api/metrics endpoint — no rate limiting, cached locally.
 * Pattern: psutil-based approach from github.com/sentrychris/psmonitor
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { serverConnection } from './serverConnection';
import { autoErrorLogger } from './autoErrorLogger';

export interface ServerMetrics {
  cpu: {
    percent: number;
    cores: number;
    freq_mhz: number;
  };
  memory: {
    total_gb: number;
    used_gb: number;
    percent: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    percent: number;
  };
  network: {
    bytes_sent_mb: number;
    bytes_recv_mb: number;
    interfaces: string[];
  };
  processes: {
    total: number;
    top: { name: string; cpu: number; mem: number }[];
  };
  system: {
    os: string;
    hostname: string;
    uptime_hrs: number;
    python_version: string;
  };
  timestamp: string;
}

export interface MetricSnapshot {
  metrics: ServerMetrics;
  fetchedAt: number;
  latency: number;
}

const CACHE_KEY = '@butler_server_metrics';
const HISTORY_KEY = '@butler_metrics_history';
const CACHE_TTL = 30_000; // 30s

class ServerMetricsService {
  private cache: MetricSnapshot | null = null;
  private history: { ts: number; cpu: number; mem: number; latency: number }[] = [];
  private fetching = false;

  // ── Fetch real metrics from server ──────────────────────────
  async fetch(forceRefresh = false): Promise<MetricSnapshot | null> {
    // Return cache if fresh enough
    if (!forceRefresh && this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL) {
      return this.cache;
    }

    const ip   = serverConnection.getIP();
    const port = serverConnection.getPort();
    const token = serverConnection.getToken();
    if (!ip || !port || this.fetching) return this.cache;

    this.fetching = true;
    const start = Date.now();
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 8000);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://${ip}:${port}/api/metrics`, {
        headers,
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      const latency = Date.now() - start;

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Server returns 'ram' key — normalize to 'memory' so TypeScript interface matches
      const normalized = {
        ...data,
        memory: data.memory ?? data.ram ?? { percent: 0, total_gb: 0, used_gb: 0 },
      };

      const snap: MetricSnapshot = {
        metrics: normalized as ServerMetrics,
        fetchedAt: Date.now(),
        latency,
      };
      this.cache = snap;

      // Add to sparkline history (max 20 pts)
      this.history.push({
        ts: Date.now(),
        cpu: data.cpu?.percent ?? 0,
        mem: (data.memory ?? data.ram)?.percent ?? 0,
        latency,
      });
      if (this.history.length > 20) this.history.shift();

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(snap));
      return snap;
    } catch (e: any) {
      autoErrorLogger.logWarning('ServerMetrics', `fetch failed: ${e?.message}`);
      // Try loading cached snapshot from disk
      if (!this.cache) {
        try {
          const raw = await AsyncStorage.getItem(CACHE_KEY);
          if (raw) this.cache = JSON.parse(raw);
        } catch {}
      }
      return this.cache;
    } finally {
      this.fetching = false;
    }
  }

  getHistory() { return this.history; }
  getCache()   { return this.cache; }

  /**
   * Backward-compat shim for legacy chat code in butler.tsx.
   * Returns a short human-readable summary of the latest metrics,
   * or empty string if no metrics have been fetched yet.
   */
  getContextString(): string {
    const m: any = this.cache;
    if (!m) return '';
    const parts: string[] = [];
    if (m.cpu !== undefined)    parts.push(`CPU ${m.cpu}%`);
    if (m.memory !== undefined) parts.push(`MEM ${m.memory}%`);
    if (m.disk !== undefined)   parts.push(`DISK ${m.disk}%`);
    return parts.length ? `PC: ${parts.join(' · ')}` : '';
  }
}

export const serverMetrics = new ServerMetricsService();
