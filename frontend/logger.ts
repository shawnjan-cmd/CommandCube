/**
 * utils/logger.ts — Butler AI Smart Logger v2
 *
 * Features
 * ────────
 * • Dev-always / prod-gated logging (persisted via AsyncStorage)
 * • In-memory ring buffer (last 100 entries) — queryable at runtime
 * • logger.guard()     — wraps ANY function with try/catch + prescriptive fix hint
 * • logger.safeJSON()  — JSON.parse with fallback value + logged error
 * • logger.safeNav()   — router.replace/navigate with fallback chain + logging
 * • logger.measure()   — async performance timing
 * • logger.suggest()   — given an error message, prints the best fix pattern
 * • logger.dump()      — print full ring buffer (call from Settings debug panel)
 *
 * Usage
 * ─────
 *   import { logger } from '@/utils/logger';
 *
 *   // Basic
 *   logger.log('[MyScreen] mounted');
 *   logger.warn('[MyScreen] slow load:', ms, 'ms');
 *   logger.error('[MyScreen] fetch failed:', err);
 *
 *   // Guard any function — catches, logs, and prints the fix pattern
 *   const result = await logger.guard(
 *     () => JSON.parse(raw),
 *     { tag: '[MyScreen]', fallback: [], fixHint: 'SAFE_JSON' }
 *   );
 *
 *   // Safe JSON parse
 *   const data = logger.safeJSON(raw, [], '[MyScreen]');
 *
 *   // Safe navigation
 *   logger.safeNav(router, '/(tabs)', '[MyScreen]');
 *
 *   // Performance
 *   const result = await logger.measure('[MyScreen] loadData', () => fetchData());
 *
 * Fix Hint Patterns (pass to logger.guard fixHint)
 * ────────────────────────────────────────────────
 *   'SAFE_JSON'      → try/catch JSON.parse with fallback
 *   'MOUNTED_GUARD'  → mountedRef pattern for setState after unmount
 *   'ROUTER_GUARD'   → try/catch router.replace with fallback chain
 *   'ANIM_CLEANUP'   → store loop refs, stop in useEffect cleanup
 *   'FETCH_TIMEOUT'  → AbortController + setTimeout pattern
 *   'STORAGE_GUARD'  → AsyncStorage with null-check and fallback
 */

declare const __DEV__: boolean;

// ─── Constants ────────────────────────────────────────────────────
export const DEBUG_LOG_KEY = '@butler_debug_log';
const RING_MAX = 100;

// ─── Types ────────────────────────────────────────────────────────
type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';
type LogFn    = (...args: unknown[]) => void;

export interface LogEntry {
  ts:    number;
  level: LogLevel;
  msg:   string;
}

export type FixHint =
  | 'SAFE_JSON'
  | 'MOUNTED_GUARD'
  | 'ROUTER_GUARD'
  | 'ANIM_CLEANUP'
  | 'FETCH_TIMEOUT'
  | 'STORAGE_GUARD'
  | 'CUSTOM';

// ─── Fix hint templates ───────────────────────────────────────────
const FIX_PATTERNS: Record<FixHint, string> = {
  SAFE_JSON: `
  ┌─ FIX: SAFE_JSON ────────────────────────────────────────┐
  │  let parsed = fallback;                                  │
  │  try { parsed = JSON.parse(raw); }                       │
  │  catch (e) { logger.warn('[Tag] bad JSON:', e); }        │
  └──────────────────────────────────────────────────────────┘`,

  MOUNTED_GUARD: `
  ┌─ FIX: MOUNTED_GUARD ────────────────────────────────────┐
  │  const mountedRef = useRef(true);                        │
  │  useEffect(() => {                                       │
  │    mountedRef.current = true;                            │
  │    return () => { mountedRef.current = false; };         │
  │  }, []);                                                 │
  │  // In async: if (!mountedRef.current) return;           │
  └──────────────────────────────────────────────────────────┘`,

  ROUTER_GUARD: `
  ┌─ FIX: ROUTER_GUARD ─────────────────────────────────────┐
  │  const safeNav = (route: string) => {                    │
  │    try { router.replace(route as any); }                 │
  │    catch (e) {                                           │
  │      logger.error('[Tag] nav failed:', e);               │
  │      try { router.replace('/main-menu' as any); }        │
  │      catch { /* last resort — user must tap back */ }    │
  │    }                                                     │
  │  };                                                      │
  └──────────────────────────────────────────────────────────┘`,

  ANIM_CLEANUP: `
  ┌─ FIX: ANIM_CLEANUP ─────────────────────────────────────┐
  │  useEffect(() => {                                       │
  │    const loop = Animated.loop(Animated.timing(anim,{…}));│
  │    loop.start();                                         │
  │    return () => loop.stop(); // ← always clean up        │
  │  }, []);                                                 │
  └──────────────────────────────────────────────────────────┘`,

  FETCH_TIMEOUT: `
  ┌─ FIX: FETCH_TIMEOUT ────────────────────────────────────┐
  │  const ctrl = new AbortController();                     │
  │  const tid = setTimeout(() => ctrl.abort(), 8_000);      │
  │  try {                                                   │
  │    const res = await fetch(url, { signal: ctrl.signal }); │
  │    clearTimeout(tid);                                    │
  │  } catch (e) {                                           │
  │    if (e.name === 'AbortError') logger.warn('timeout');  │
  │    else logger.error('fetch failed:', e);                │
  │  }                                                       │
  └──────────────────────────────────────────────────────────┘`,

  STORAGE_GUARD: `
  ┌─ FIX: STORAGE_GUARD ────────────────────────────────────┐
  │  let value = fallback;                                   │
  │  try {                                                   │
  │    const raw = await AsyncStorage.getItem(key);          │
  │    if (raw !== null) value = raw;                        │
  │  } catch (e) {                                           │
  │    logger.warn('[Tag] storage read failed:', e);          │
  │  }                                                       │
  └──────────────────────────────────────────────────────────┘`,

  CUSTOM: `
  ┌─ FIX: CUSTOM ───────────────────────────────────────────┐
  │  Add a try/catch around the failing operation.           │
  │  Log the error with context, provide a fallback value.   │
  └──────────────────────────────────────────────────────────┘`,
};

// ─── Ring buffer ─────────────────────────────────────────────────
const _ring: LogEntry[] = [];
function _push(level: LogLevel, args: unknown[]): void {
  const msg = args.map(a =>
    a instanceof Error ? `${a.name}: ${a.message}` :
    typeof a === 'object' ? JSON.stringify(a) : String(a)
  ).join(' ');
  _ring.push({ ts: Date.now(), level, msg });
  if (_ring.length > RING_MAX) _ring.shift();
}

// ─── Boot state ───────────────────────────────────────────────────
const IS_DEV: boolean =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const noop: LogFn = () => {};

// Mutable inner functions swapped by applyDebugMode
let _log:   LogFn = IS_DEV ? (...a) => { _push('log',   a); console.log('[Butler]',   ...a); } : noop;
let _info:  LogFn = IS_DEV ? (...a) => { _push('info',  a); console.info('[Butler]',  ...a); } : noop;
let _warn:  LogFn = IS_DEV ? (...a) => { _push('warn',  a); console.warn('[Butler]',  ...a); } : noop;
let _error: LogFn = IS_DEV ? (...a) => { _push('error', a); console.error('[Butler]', ...a); } : noop;
let _debug: LogFn = IS_DEV ? (...a) => { _push('debug', a); console.debug('[Butler]', ...a); } : noop;

// ─── Stable exports ───────────────────────────────────────────────
export const log:   LogFn = (...a) => _log(...a);
export const info:  LogFn = (...a) => _info(...a);
export const warn:  LogFn = (...a) => _warn(...a);
export const error: LogFn = (...a) => _error(...a);
export const debug: LogFn = (...a) => _debug(...a);

// ─── applyDebugMode ───────────────────────────────────────────────
function applyDebugMode(enabled: boolean): void {
  if (enabled) {
    _log   = (...a) => { _push('log',   a); console.log('[Butler]',   ...a); };
    _info  = (...a) => { _push('info',  a); console.info('[Butler]',  ...a); };
    _warn  = (...a) => { _push('warn',  a); console.warn('[Butler]',  ...a); };
    _error = (...a) => { _push('error', a); console.error('[Butler]', ...a); };
    _debug = (...a) => { _push('debug', a); console.debug('[Butler]', ...a); };
  } else if (!IS_DEV) {
    // In prod without debug flag: ring buffer only, no console
    _log = _info = _debug = (...a) => _push('log', a);
    _warn  = (...a) => _push('warn',  a);
    _error = (...a) => _push('error', a);
  }
}

// ─── Persistence ──────────────────────────────────────────────────
export async function reloadLogLevel(): Promise<void> {
  try {
    const AS = (await import('@react-native-async-storage/async-storage')).default;
    const val = await AS.getItem(DEBUG_LOG_KEY);
    applyDebugMode(val === '1');
  } catch {}
}

export async function enableDebugLogging(): Promise<void> {
  applyDebugMode(true);
  try {
    const AS = (await import('@react-native-async-storage/async-storage')).default;
    await AS.setItem(DEBUG_LOG_KEY, '1');
  } catch {}
}

export async function disableDebugLogging(): Promise<void> {
  applyDebugMode(false);
  try {
    const AS = (await import('@react-native-async-storage/async-storage')).default;
    await AS.setItem(DEBUG_LOG_KEY, '0');
  } catch {}
}

if (!IS_DEV) { reloadLogLevel().catch(() => {}); }

// ─── Smart utilities ──────────────────────────────────────────────

/**
 * guard — wraps any sync or async function with automatic try/catch,
 * logs the error with context, prints the fix pattern, and returns fallback.
 *
 * @example
 *   const data = await logger.guard(
 *     () => JSON.parse(raw),
 *     { tag: '[MyScreen]', fallback: [], fixHint: 'SAFE_JSON' }
 *   );
 */
async function guard<T>(
  fn: () => T | Promise<T>,
  opts: { tag: string; fallback: T; fixHint?: FixHint; context?: string }
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const hint = opts.fixHint ?? 'CUSTOM';
    _error(
      `${opts.tag} ✗ guarded call failed${opts.context ? ` (${opts.context})` : ''}:`,
      e,
      FIX_PATTERNS[hint]
    );
    return opts.fallback;
  }
}

/**
 * safeJSON — JSON.parse with a fallback and automatic error logging.
 * Prints the SAFE_JSON fix pattern on failure.
 *
 * @example
 *   const messages = logger.safeJSON(raw, [], '[Butler]');
 */
function safeJSON<T>(raw: string | null | undefined, fallback: T, tag = '[App]'): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    _warn(`${tag} safeJSON failed — returning fallback. Raw (first 80): "${String(raw).slice(0, 80)}"`, FIX_PATTERNS.SAFE_JSON);
    return fallback;
  }
}

/**
 * safeNav — calls router.replace() with a fallback chain and full logging.
 * Tries primary route, then each fallback in order.
 *
 * @example
 *   logger.safeNav(router, '/(tabs)', '[Screen10]', ['/main-menu', '/']);
 */
function safeNav(
  router: { replace: (href: any) => void; navigate?: (href: any) => void },
  primary: string,
  tag = '[App]',
  fallbacks: string[] = ['/(tabs)/nexushome', '/(tabs)', '/main-menu']
): boolean {
  // Always ensure nexushome is in the chain
  const targets = Array.from(new Set([primary, ...fallbacks, '/(tabs)/nexushome', '/(tabs)']));
  // Fire globals first
  try { (global as any).__setNeedsOnboarding?.(false); } catch {}
  try { (global as any).__onboardingComplete?.(); } catch {}
  for (const target of targets) {
    try {
      _log(`${tag} safeNav → ${target}`);
      router.replace(target as any);
      return true;
    } catch (e) {
      _warn(`${tag} safeNav replace failed for "${target}":`, e, FIX_PATTERNS.ROUTER_GUARD);
    }
    try { if (typeof router.navigate === 'function') { router.navigate(target as any); return true; } } catch {}
  }
  _error(`${tag} safeNav exhausted all routes:`, targets);
  return false;
}

/**
 * measure — times an async operation and logs the result.
 *
 * @example
 *   const data = await logger.measure('[KnowledgeBase] load', () => kb.fetch());
 */
async function measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  try {
    const result = await fn();
    _log(`${label} ✓ ${Date.now() - t0}ms`);
    return result;
  } catch (e) {
    _error(`${label} ✗ failed after ${Date.now() - t0}ms:`, e);
    throw e;
  }
}

/**
 * suggest — given an error or error message string, prints the most relevant fix.
 * Call from catch blocks when you're not sure what went wrong.
 *
 * @example
 *   catch (e) { logger.suggest(e, '[MyScreen]'); }
 */
function suggest(err: unknown, tag = '[App]'): void {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  let hint: FixHint = 'CUSTOM';
  if (lower.includes('json') || lower.includes('parse') || lower.includes('unexpected token'))
    hint = 'SAFE_JSON';
  else if (lower.includes('unmounted') || lower.includes('setState') || lower.includes('update on unmounted'))
    hint = 'MOUNTED_GUARD';
  else if (lower.includes('navigate') || lower.includes('router') || lower.includes('route'))
    hint = 'ROUTER_GUARD';
  else if (lower.includes('animation') || lower.includes('animated'))
    hint = 'ANIM_CLEANUP';
  else if (lower.includes('fetch') || lower.includes('network') || lower.includes('timeout') || lower.includes('abort'))
    hint = 'FETCH_TIMEOUT';
  else if (lower.includes('asyncstorage') || lower.includes('storage'))
    hint = 'STORAGE_GUARD';

  _warn(`${tag} suggest — caught: "${msg}"`, FIX_PATTERNS[hint]);
}

/**
 * dump — prints the full in-memory ring buffer.
 * Wire to Settings → Developer → "Dump Logs" button.
 */
function dump(): LogEntry[] {
  const entries = [..._ring];
  if (IS_DEV || _warn !== noop) {
    console.group?.('[Butler] Log dump — last', entries.length, 'entries');
    entries.forEach(e => {
      const ts = new Date(e.ts).toISOString().slice(11, 23);
      const fn = e.level === 'error' ? console.error :
                 e.level === 'warn'  ? console.warn  : console.log;
      fn(`[${ts}] [${e.level.toUpperCase()}] ${e.msg}`);
    });
    console.groupEnd?.();
  }
  return entries;
}

/**
 * getEntries — return ring buffer without printing. Useful for UI display.
 */
function getEntries(): LogEntry[] { return [..._ring]; }

// ─── Named export ─────────────────────────────────────────────────
export const logger = {
  // Basic levels
  log, info, warn, error, debug,
  // Smart utilities
  guard,
  safeJSON,
  safeNav,
  measure,
  suggest,
  dump,
  getEntries,
  // Control
  reload:  reloadLogLevel,
  enable:  enableDebugLogging,
  disable: disableDebugLogging,
  DEBUG_LOG_KEY,
  // Fix pattern reference
  FIX_PATTERNS,
};

export default logger;
