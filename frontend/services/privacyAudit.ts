/**
 * 🛡️ PRIVACY AUDIT — services/privacyAudit.ts
 *
 * Wraps global.fetch and XMLHttpRequest to log every outbound network
 * request. Each request is classified as:
 *   • LAN       — RFC1918 private IP / .local / localhost
 *   • CLOUD     — any other host (these are the ones users care about)
 *   • BLOCKED   — explicitly denied destinations (none by default)
 *
 * This service is the source of truth for the Privacy Audit screen. It
 * lets the user verify with their own eyes that the app made ZERO cloud
 * calls, instead of just taking a marketing claim on faith.
 *
 * Install once at app boot from app/_layout.tsx (before any service starts).
 * Zero external dependencies. ~3 KB runtime footprint.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuditClass = 'LAN' | 'CLOUD' | 'BLOCKED' | 'UNKNOWN';

export interface AuditEvent {
  id: number;
  ts: number;          // unix ms
  url: string;         // full URL (truncated to 220 chars)
  host: string;        // hostname / IP only
  method: string;      // GET / POST / …
  klass: AuditClass;
  status?: number;     // HTTP status (if completed)
  bytes?: number;      // response bytes (if known)
  durationMs?: number; // wall-clock duration
  error?: string;      // error message (if failed)
}

export interface AuditCounters {
  lan: number;
  cloud: number;
  blocked: number;
  unknown: number;
  lastResetTs: number;
}

const MAX_EVENTS  = 100;
const EVENTS_KEY  = '@privacy_audit_events_v1';
const COUNTERS_KEY = '@privacy_audit_counters_v1';

const _events: AuditEvent[] = [];
let _counters: AuditCounters = {
  lan: 0, cloud: 0, blocked: 0, unknown: 0,
  lastResetTs: Date.now(),
};
let _id = 0;
let _installed = false;
const _listeners: Array<(events: AuditEvent[], counters: AuditCounters) => void> = [];

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Parses the host out of a URL string. Handles bare hosts, IPs with
 * ports, and relative URLs. Never throws.
 */
function _hostOf(url: string): string {
  try {
    if (!url) return '';
    // Already a hostname/IP?
    if (!url.includes('://') && !url.startsWith('//')) {
      // Bare host with optional :port or path
      const m = url.match(/^([^/?#:]+)/);
      return m ? m[1].toLowerCase() : '';
    }
    const u = new URL(url);
    return (u.hostname || '').toLowerCase();
  } catch {
    const m = url.match(/^[a-z]+:\/\/([^/?#:]+)/i);
    return m ? m[1].toLowerCase() : '';
  }
}

/**
 * Classifies a host as LAN, CLOUD, or UNKNOWN. The user's privacy claim
 * ("no data leaves your LAN") means anything classified as CLOUD is a
 * red flag worth showing in the audit UI.
 */
function _classify(host: string): AuditClass {
  if (!host) return 'UNKNOWN';
  // Loopback
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return 'LAN';
  // .local mDNS / Bonjour
  if (host.endsWith('.local')) return 'LAN';
  // RFC1918 private IPv4 ranges
  if (/^10\./.test(host)) return 'LAN';
  if (/^192\.168\./.test(host)) return 'LAN';
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return 'LAN';
  // Link-local
  if (/^169\.254\./.test(host)) return 'LAN';
  if (/^fe80:/i.test(host)) return 'LAN';
  // IPv6 unique-local
  if (/^f[cd][0-9a-f]{2}:/i.test(host)) return 'LAN';
  // Anything else with a dot or letters is cloud
  if (/[a-z]/i.test(host) || host.includes('.')) return 'CLOUD';
  return 'UNKNOWN';
}

function _truncate(s: string, n: number): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function _notify() {
  const snap = [..._events];
  const c = { ..._counters };
  _listeners.forEach(fn => { try { fn(snap, c); } catch {} });
}

const _persistThrottled = (() => {
  let pending: any = null;
  return () => {
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      AsyncStorage.multiSet([
        [EVENTS_KEY,   JSON.stringify(_events.slice(0, 50))],
        [COUNTERS_KEY, JSON.stringify(_counters)],
      ]).catch(() => {});
    }, 750);
  };
})();

function _record(
  url: string,
  method: string,
  startedAt: number,
  result: { status?: number; bytes?: number; error?: string },
): void {
  const host = _hostOf(url);
  const klass = _classify(host);
  const ev: AuditEvent = {
    id: ++_id,
    ts: Date.now(),
    url: _truncate(url, 220),
    host,
    method: (method || 'GET').toUpperCase(),
    klass,
    status: result.status,
    bytes: result.bytes,
    durationMs: Math.max(0, Date.now() - startedAt),
    error: result.error,
  };
  _events.unshift(ev);
  if (_events.length > MAX_EVENTS) _events.length = MAX_EVENTS;
  switch (klass) {
    case 'LAN':     _counters.lan++; break;
    case 'CLOUD':   _counters.cloud++; break;
    case 'BLOCKED': _counters.blocked++; break;
    default:        _counters.unknown++; break;
  }
  _persistThrottled();
  _notify();
}

// ─── Public API ──────────────────────────────────────────────────────

export const privacyAudit = {
  /**
   * Install fetch + XHR interceptors. Idempotent — safe to call multiple
   * times (Strict Mode, hot reload, etc.).
   */
  install(): void {
    if (_installed) return;
    _installed = true;

    // Restore previous state
    AsyncStorage.multiGet([EVENTS_KEY, COUNTERS_KEY]).then(([e, c]) => {
      try {
        if (e?.[1]) {
          const arr = JSON.parse(e[1]);
          if (Array.isArray(arr)) {
            _events.splice(0, _events.length, ...arr);
            _id = Math.max(0, ...arr.map((x: any) => x?.id || 0));
          }
        }
        if (c?.[1]) {
          const obj = JSON.parse(c[1]);
          if (obj && typeof obj === 'object') _counters = { ..._counters, ...obj };
        }
      } catch {}
      _notify();
    }).catch(() => {});

    // ── fetch ──────────────────────────────────────────────────────
    try {
      const _origFetch = global.fetch;
      if (typeof _origFetch === 'function' && !(_origFetch as any).__butlerWrapped) {
        const wrapped: any = async function butlerFetch(
          input: RequestInfo | URL,
          init?: RequestInit,
        ) {
          const url    = typeof input === 'string' ? input
                       : (input as any)?.url || String(input);
          const method = (init?.method as string) || (input as any)?.method || 'GET';
          const started = Date.now();
          try {
            const res = await _origFetch.call(this, input as any, init);
            // We don't read the body to avoid consuming the stream; size is unknown.
            _record(url, method, started, { status: res.status });
            return res;
          } catch (e: any) {
            _record(url, method, started, { error: String(e?.message || e) });
            throw e;
          }
        };
        wrapped.__butlerWrapped = true;
        // Preserve any properties on the original fetch
        try { Object.assign(wrapped, _origFetch); } catch {}
        (global as any).fetch = wrapped;
      }
    } catch {}

    // ── XMLHttpRequest ─────────────────────────────────────────────
    try {
      const XHR: any = (global as any).XMLHttpRequest;
      if (XHR && XHR.prototype && !XHR.prototype.__butlerWrapped) {
        const origOpen = XHR.prototype.open;
        const origSend = XHR.prototype.send;
        XHR.prototype.open = function (method: string, url: string, ...rest: any[]) {
          this.__butler_method = method;
          this.__butler_url    = url;
          return origOpen.call(this, method, url, ...rest);
        };
        XHR.prototype.send = function (body?: any) {
          const url    = this.__butler_url    || '';
          const method = this.__butler_method || 'GET';
          const started = Date.now();
          const onDone = () => {
            try {
              _record(url, method, started, {
                status: this.status,
                bytes: typeof this.responseText === 'string' ? this.responseText.length : undefined,
              });
            } catch {}
          };
          const onError = () => {
            try { _record(url, method, started, { error: 'XHR error' }); } catch {}
          };
          try {
            this.addEventListener('load',    onDone);
            this.addEventListener('error',   onError);
            this.addEventListener('abort',   onError);
            this.addEventListener('timeout', onError);
          } catch {}
          return origSend.call(this, body);
        };
        XHR.prototype.__butlerWrapped = true;
      }
    } catch {}
  },

  /** Returns a snapshot of the most recent events (newest first). */
  getEvents(): AuditEvent[] {
    return [..._events];
  },

  /** Returns aggregate counters. */
  getCounters(): AuditCounters {
    return { ..._counters };
  },

  /** Subscribe to live updates. Returns an unsubscribe function. */
  subscribe(fn: (events: AuditEvent[], counters: AuditCounters) => void): () => void {
    _listeners.push(fn);
    // Emit current state immediately
    try { fn([..._events], { ..._counters }); } catch {}
    return () => {
      const i = _listeners.indexOf(fn);
      if (i >= 0) _listeners.splice(i, 1);
    };
  },

  /** Clear all events and reset counters. */
  reset(): void {
    _events.length = 0;
    _counters = { lan: 0, cloud: 0, blocked: 0, unknown: 0, lastResetTs: Date.now() };
    AsyncStorage.multiRemove([EVENTS_KEY, COUNTERS_KEY]).catch(() => {});
    _notify();
  },

  /** Internal helper for tests / verify-now flows. */
  _classifyHost: _classify,
  _hostOf: _hostOf,
};
