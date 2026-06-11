/**
 * 🛡️ GLOBAL ERROR INTERCEPTOR — services/errorInterceptor.ts
 *
 * Patches console.error / console.warn and catches unhandled JS exceptions.
 * Stores last 50 entries in memory. Zero dependencies.
 * Installed once at app boot (call install() in app/_layout.tsx useEffect).
 */

export interface ErrorEntry {
  id: number;
  ts: number;               // unix ms
  level: 'error' | 'warn' | 'info';
  msg: string;
  stack?: string;
}

const MAX_ENTRIES = 50;
let   _id = 0;

const _log: ErrorEntry[] = [];
const _listeners: Array<(log: ErrorEntry[]) => void> = [];

function _notify() {
  _listeners.forEach(fn => fn([..._log]));
}

function _push(level: ErrorEntry['level'], msg: string, stack?: string) {
  _log.unshift({ id: ++_id, ts: Date.now(), level, msg, stack });
  if (_log.length > MAX_ENTRIES) _log.length = MAX_ENTRIES;
  _notify();
}

// ─── Public API ────────────────────────────────────────────────────

export const errorInterceptor = {
  /** Install patches — call once in app/_layout.tsx */
  install() {
    // Patch console.error
    const origError = console.error.bind(console);
    console.error = (...args: any[]) => {
      origError(...args);
      const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      _push('error', msg);
    };

    // Patch console.warn
    const origWarn = console.warn.bind(console);
    console.warn = (...args: any[]) => {
      origWarn(...args);
      const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      _push('warn', msg);
    };

    // Global unhandled JS error
    const prevHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
    (global as any).ErrorUtils?.setGlobalHandler?.((error: Error, isFatal: boolean) => {
      _push('error', `[${isFatal ? 'FATAL' : 'UNHANDLED'}] ${error?.message ?? String(error)}`, error?.stack);
      prevHandler?.(error, isFatal);
    });

    // Unhandled promise rejections (React Native 0.73+)
    const origRejection = (global as any).HermesInternal
      ? undefined
      : (global as any).__onUnhandledRejection;
    if (origRejection === undefined) {
      (global as any).__onUnhandledRejection = (id: number, reason: any) => {
        const msg = reason instanceof Error
          ? `[PROMISE] ${reason.message}`
          : `[PROMISE REJECTION] ${JSON.stringify(reason)}`;
        _push('error', msg, reason instanceof Error ? reason.stack : undefined);
      };
    }
  },

  /** Returns a snapshot of the current log (newest first) */
  getLog(): ErrorEntry[] {
    return [..._log];
  },

  /** Get last N errors only */
  getErrors(limit = 10): ErrorEntry[] {
    return _log.filter(e => e.level === 'error').slice(0, limit);
  },

  /** Clear log */
  clear() {
    _log.length = 0;
    _notify();
  },

  /** Subscribe to log changes */
  subscribe(fn: (log: ErrorEntry[]) => void): () => void {
    _listeners.push(fn);
    return () => {
      const i = _listeners.indexOf(fn);
      if (i >= 0) _listeners.splice(i, 1);
    };
  },

  /** Add a manual entry (useful for caught exceptions you want surfaced) */
  capture(msg: string, stack?: string, level: ErrorEntry['level'] = 'error') {
    _push(level, msg, stack);
  },
};
