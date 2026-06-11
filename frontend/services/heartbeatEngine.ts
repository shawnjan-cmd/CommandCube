/**
 * 💓 HEARTBEAT ENGINE - Connection Metrics Monitor
 *
 * Responsibilities (metrics only — autoConnectEngine owns ALL reconnection):
 * ✅ Ping/pong timing every 10 seconds
 * ✅ Missed ping tracking (max 5 before logging)
 * ✅ Latency metrics logging
 * ✅ Connection quality scoring
 *
 * IMPORTANT: This engine NEVER calls stop() or reconnect on connection loss.
 * autoConnectEngine is the single source of truth for connection lifecycle.
 */

// Lightweight event emitter — no external deps
const _listeners: Record<string, ((...args: any[]) => void)[]> = {};
const _emit = (event: string, data?: any) => (_listeners[event] || []).forEach(fn => { try { fn(data); } catch {} });

interface HeartbeatMetrics {
  latency: number;
  timestamp: number;
  missed: boolean;
}

interface ConnectionQuality {
  score: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  avgLatency: number;
  jitter: number; // latency variance
  packetLoss: number; // percentage
}

class HeartbeatEngine {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private missedPings: number = 0;
  private readonly MAX_MISSED = 5;  // Raised from 3 — crawl workers can briefly delay HTTP
  private readonly PING_INTERVAL = 10000; // 10 seconds

  private metrics: HeartbeatMetrics[] = [];
  private readonly MAX_METRICS = 100; // Keep last 100 pings

  private lastPingTimestamp: number = 0;
  private isWaitingForPong: boolean = false;

  // ── Public API ──────────────────────────────────────────────────────

  start() {
    if (this.intervalId) {
      console.warn('[Heartbeat] Already running');
      return;
    }
    console.log('[Heartbeat] 💓 Starting heartbeat metrics engine');
    this.missedPings = 0;
    this.intervalId = setInterval(() => { this.sendPing(); }, this.PING_INTERVAL);
    this.sendPing(); // immediate first ping
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Heartbeat] 🛑 Stopped');
    }
  }

  // ── Internal ───────────────────────────────────────────────────────

  private async sendPing() {
    if (this.isWaitingForPong) {
      this.missedPings++;
      this.recordMetric({ latency: -1, timestamp: Date.now(), missed: true });
      console.warn(`[Heartbeat] ⚠️ Missed pong #${this.missedPings}/${this.MAX_MISSED}`);

      if (this.missedPings >= this.MAX_MISSED) {
        console.warn('[Heartbeat] Consecutive ping failures — autoConnectEngine will handle reconnect');
        _emit('connection-degraded', this.missedPings);
        this.isWaitingForPong = false;
        this.missedPings = 0;
      }
      return;
    }

    // FIX 1C — real HTTP ping to measure actual latency
    this.lastPingTimestamp = Date.now();
    this.isWaitingForPong = true;

    try {
      const { serverConnection } = await import('./serverConnection');
      const { ip, port } = serverConnection.state;
      if (!ip || !port) {
        // No server configured yet — resolve quietly
        this.isWaitingForPong = false;
        return;
      }
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 4000);
      // v6.1.0+ server has /api/ping — lightweight, no body, no auth required
      const t0Ping = Date.now();
      await fetch(`http://${ip}:${port}/api/ping`, { signal: controller.signal });
      clearTimeout(tid);
      const latency = Date.now() - t0Ping;
      this.onPongReceived();
      this.recordMetric({ latency, timestamp: Date.now(), missed: false });
      _emit('latency', latency);
      this.isWaitingForPong = false;
      this.missedPings = 0;
      return;
      // onPongReceived already called above if ping succeeded
    } catch {
      // Network error or timeout — count as missed
      this.isWaitingForPong = false;
      this.missedPings++;
      this.recordMetric({ latency: -1, timestamp: Date.now(), missed: true });
      if (this.missedPings >= this.MAX_MISSED) {
        _emit('connection-degraded', this.missedPings);
        this.missedPings = 0;
      }
    }
  }

  onPongReceived(_serverTimestamp?: number) {
    if (!this.isWaitingForPong) return; // ignore unexpected pongs

    const latency = Date.now() - this.lastPingTimestamp;
    this.isWaitingForPong = false;
    this.missedPings = 0;

    this.recordMetric({ latency, timestamp: Date.now(), missed: false });
    _emit('latency', latency);
  }

  private recordMetric(metric: HeartbeatMetrics) {
    this.metrics.push(metric);
    if (this.metrics.length > this.MAX_METRICS) this.metrics.shift();
  }

  getConnectionQuality(): ConnectionQuality {
    if (this.metrics.length === 0) {
      return { score: 0, status: 'critical', avgLatency: 0, jitter: 0, packetLoss: 100 };
    }

    const validMetrics = this.metrics.filter(m => !m.missed && m.latency >= 0);
    const totalMetrics = this.metrics.length;
    const validCount   = validMetrics.length;
    const packetLoss   = ((totalMetrics - validCount) / totalMetrics) * 100;
    const avgLatency   = validCount > 0
      ? validMetrics.reduce((sum, m) => sum + m.latency, 0) / validCount : 0;
    const jitter = this._calcJitter(validMetrics.map(m => m.latency));

    let score = 100;
    score -= packetLoss * 2;
    if (avgLatency > 200)      score -= 30;
    else if (avgLatency > 100) score -= 20;
    else if (avgLatency > 50)  score -= 10;
    if (jitter > 100)      score -= 20;
    else if (jitter > 50)  score -= 10;
    score = Math.max(0, Math.min(100, score));

    const status: ConnectionQuality['status'] =
      score >= 90 ? 'excellent' :
      score >= 70 ? 'good' :
      score >= 50 ? 'fair' :
      score >= 30 ? 'poor' : 'critical';

    return {
      score: Math.round(score),
      status,
      avgLatency: Math.round(avgLatency),
      jitter: Math.round(jitter),
      packetLoss: Math.round(packetLoss * 10) / 10,
    };
  }

  private _calcJitter(latencies: number[]): number {
    if (latencies.length === 0) return 0;
    const avg = latencies.reduce((s, l) => s + l, 0) / latencies.length;
    const variance = latencies.reduce((s, l) => s + Math.pow(l - avg, 2), 0) / latencies.length;
    return Math.sqrt(variance);
  }

  getLatencyHistory(count = 20): number[] {
    return this.metrics
      .filter(m => !m.missed && m.latency >= 0)
      .slice(-count)
      .map(m => m.latency);
  }

  getStats() {
    return {
      missedPings: this.missedPings,
      maxMissed: this.MAX_MISSED,
      isWaitingForPong: this.isWaitingForPong,
      metricsCount: this.metrics.length,
      quality: this.getConnectionQuality(),
    };
  }

  reset() {
    this.metrics = [];
    this.missedPings = 0;
    this.isWaitingForPong = false;
    console.log('[Heartbeat] 🔄 Reset');
  }
}

export const heartbeatEngine = new HeartbeatEngine();
