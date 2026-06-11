/**
 * 🧠 KB GROWTH TRACKER — Real-time findings timeline
 *
 * Stores finding timestamps in FileSystem (not AsyncStorage) to avoid
 * the 6MB Android limit. Supports up to 10,000 timestamped events.
 *
 * Proprietary collection methods registered here as named event types.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const getTimelineFile = (): string | null => {
  const dir = FileSystem.documentDirectory;
  if (!dir) {
    console.warn('[kbGrowthTracker] documentDirectory unavailable');
    return null;
  }
  return `${dir}kb_growth_timeline_v2.json`;
};
const MAX_EVENTS    = 10000;
const CHUNK_MINS    = 15; // Group events into 15-min buckets for chart rendering

export interface GrowthEvent {
  ts: number;       // Unix timestamp ms
  count: number;    // Findings added in this event
  method: string;   // 'seed' | 'sigma' | 'omega' | 'rss' | 'context_delta' | 'manual' | 'lambda' | 'fingerprint_harvest'
  domain?: string;
}

export interface ChartBucket {
  ts: number;       // bucket start timestamp
  total: number;    // cumulative findings count at this point
  delta: number;    // new findings in this bucket
  label: string;    // formatted time label
}

class KBGrowthTracker {
  private _events: GrowthEvent[] = [];
  private _loaded = false;
  private _totalFindings = 0;

  /** Record a growth event — call this whenever new findings are added */
  async record(count: number, method: string, domain?: string): Promise<void> {
    if (count <= 0) return;
    await this._ensureLoaded();
    this._events.push({ ts: Date.now(), count, method, domain });
    this._totalFindings += count;
    // Trim oldest events to keep file bounded
    if (this._events.length > MAX_EVENTS) {
      this._events = this._events.slice(-MAX_EVENTS);
    }
    // Fire-and-forget — don't await to avoid blocking callers
    this._persist().catch(() => {});
  }

  /** Get chart buckets for the last N hours (default 24) */
  async getChartData(hours = 24, bucketMinutes = CHUNK_MINS): Promise<ChartBucket[]> {
    await this._ensureLoaded();
    const now = Date.now();
    const start = now - hours * 60 * 60 * 1000;
    const bucketMs = bucketMinutes * 60 * 1000;
    const numBuckets = Math.ceil((hours * 60) / bucketMinutes);

    // Build empty buckets
    const buckets: ChartBucket[] = Array.from({ length: numBuckets }, (_, i) => {
      const bucketStart = start + i * bucketMs;
      return {
        ts: bucketStart,
        total: 0,
        delta: 0,
        label: this._formatLabel(bucketStart, hours),
      };
    });

    // Compute baseline from events before start
    let baseline = 0;
    for (const ev of this._events) {
      if (ev.ts < start) baseline += ev.count;
    }

    // Distribute events into buckets
    let runningTotal = baseline;
    for (const ev of this._events) {
      if (ev.ts < start || ev.ts > now) continue;
      const bucketIdx = Math.min(
        numBuckets - 1,
        Math.floor((ev.ts - start) / bucketMs)
      );
      buckets[bucketIdx].delta += ev.count;
    }

    // Forward-fill running total
    for (const b of buckets) {
      runningTotal += b.delta;
      b.total = runningTotal;
    }

    return buckets;
  }

  /** Get total tracked findings count */
  async getTotalCount(): Promise<number> {
    await this._ensureLoaded();
    return this._totalFindings;
  }

  /** Get most recent N events */
  async getRecentEvents(n = 20): Promise<GrowthEvent[]> {
    await this._ensureLoaded();
    return this._events.slice(-n).reverse();
  }

  /** Get method breakdown counts */
  async getMethodBreakdown(): Promise<Record<string, number>> {
    await this._ensureLoaded();
    const out: Record<string, number> = {};
    for (const ev of this._events) {
      out[ev.method] = (out[ev.method] || 0) + ev.count;
    }
    return out;
  }

  /** Clear all growth data */
  async clear(): Promise<void> {
    this._events = [];
    this._totalFindings = 0;
    this._loaded = true;
    const path = getTimelineFile();
    if (!path) return;
    await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
  }

  /** Export as JSON string for sharing */
  async export(): Promise<string> {
    await this._ensureLoaded();
    return JSON.stringify({ events: this._events, totalFindings: this._totalFindings, exportedAt: new Date().toISOString() }, null, 2);
  }

  private _formatLabel(ts: number, hours: number): string {
    const d = new Date(ts);
    if (hours <= 6) {
      // Show hours:minutes
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
    if (hours <= 24) {
      return `${d.getHours().toString().padStart(2, '0')}h`;
    }
    // Days
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }

  private async _ensureLoaded(): Promise<void> {
    if (this._loaded) return;
    try {
      const path = getTimelineFile();
      if (!path) { this._loaded = true; return; }
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        const raw = await FileSystem.readAsStringAsync(path);
        const parsed = JSON.parse(raw);
        this._events = Array.isArray(parsed.events) ? parsed.events : [];
        this._totalFindings = parsed.totalFindings ?? this._events.reduce((s, e) => s + e.count, 0);
      } else {
        // Try migrating from AsyncStorage legacy key
        const legacy = await AsyncStorage.getItem('@botler_auto_saved_research').catch(() => null);
        if (legacy) {
          const data = JSON.parse(legacy);
          const total = (data.totalFindings as number) ?? 0;
          if (total > 0) {
            // Seed a single event at app install time
            this._events = [{ ts: Date.now() - 86400000, count: total, method: 'legacy_seed' }];
            this._totalFindings = total;
          }
        }
      }
    } catch {
      this._events = [];
      this._totalFindings = 0;
    }
    this._loaded = true;
  }

  private async _persist(): Promise<void> {
    try {
      const path = getTimelineFile();
      if (!path) return;
      const payload = JSON.stringify({ events: this._events, totalFindings: this._totalFindings });
      await FileSystem.writeAsStringAsync(path, payload);
    } catch {}
  }
}

export const kbGrowthTracker = new KBGrowthTracker();
