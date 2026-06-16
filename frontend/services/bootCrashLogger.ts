/**
 * Boot-Crash Logger — On-Device Error Capture
 * ──────────────────────────────────────────────────────────────────
 *
 * THE PROBLEM
 * When the app cold-start-crashes on Android (black screen), there
 * is NO WAY for a non-rooted user to obtain the crash log.
 * Logcat-reader apps on Android 11+ can only see their OWN process,
 * not other apps. adb requires a PC. Bug Report from developer
 * options is a 100MB zip that's hard to parse.
 *
 * THE FIX (this file)
 * Hook React Native's lowest-level error handler (`ErrorUtils`) at
 * the absolute earliest moment in the JS bundle. Any uncaught error
 * (including module-eval crashes that happen BEFORE React mounts)
 * is captured and written to AsyncStorage synchronously-as-possible.
 *
 * On the NEXT cold start, `GlobalErrorBoundary` reads this stored
 * crash and displays it right on the user's screen — no PC, no
 * logcat, no developer-mode bug report needed.
 *
 * IMPORT FROM `_layout.tsx` AT THE VERY TOP (after safeDimensionsShim).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const LAST_CRASH_KEY  = '@butler_last_boot_crash_v1';
export const LAST_BOOT_KEY   = '@butler_last_boot_at_v1';
export const HAS_REACHED_HOME_KEY = '@butler_has_reached_home_v1';

interface StoredCrash {
  at:       number;   // unix ms
  message:  string;
  stack?:   string;
  source:   'globalHandler' | 'manual';
  buildId?: string;
}

let _installed = false;

/**
 * Best-effort sync-ish persistence. AsyncStorage is async, but we
 * still call it and rely on the OS to flush before the process dies.
 * In practice, on Android, writes < 1KB usually survive even a crash.
 */
function persistCrash(c: StoredCrash) {
  try {
    AsyncStorage.setItem(LAST_CRASH_KEY, JSON.stringify(c)).catch(() => {});
  } catch { /* never throw from a crash handler */ }
}

export function installBootCrashLogger(buildId?: string): void {
  if (_installed) return;
  _installed = true;

  // Mark "we started booting" — used to detect "app died before reaching home"
  try { AsyncStorage.setItem(LAST_BOOT_KEY, String(Date.now())).catch(() => {}); } catch {}

  try {
    // `ErrorUtils` is a React Native–injected global. It's the lowest
    // level error hook — fires before React's error boundary, before
    // any user code. Even module-eval errors from later imports flow
    // through here.
    const EU: any = (globalThis as any).ErrorUtils;
    if (!EU || typeof EU.setGlobalHandler !== 'function') return;

    const original = typeof EU.getGlobalHandler === 'function'
      ? EU.getGlobalHandler()
      : null;

    EU.setGlobalHandler((err: Error, isFatal?: boolean) => {
      try {
        persistCrash({
          at:       Date.now(),
          message:  String(err?.message ?? err ?? 'Unknown error'),
          stack:    typeof err?.stack === 'string' ? err.stack.slice(0, 4000) : undefined,
          source:   'globalHandler',
          buildId,
        });
      } catch { /* swallow */ }
      // Re-delegate so React Native still shows its red box in dev
      // and crashes gracefully in release.
      try { original?.(err, isFatal); } catch {}
    });
  } catch {
    // If hooking ErrorUtils fails for any reason, we just leave the
    // original behavior intact — better than crashing the handler.
  }
}

/** Manually persist a crash (called by GlobalErrorBoundary.componentDidCatch). */
export function recordBoundaryCrash(err: Error): void {
  try {
    persistCrash({
      at:       Date.now(),
      message:  String(err?.message ?? err ?? 'Unknown error'),
      stack:    typeof err?.stack === 'string' ? err.stack.slice(0, 4000) : undefined,
      source:   'manual',
    });
  } catch {}
}

/** Read the last stored crash, then clear it so we only ever show it once. */
export async function readAndClearLastCrash(): Promise<StoredCrash | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_CRASH_KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(LAST_CRASH_KEY);
    try { return JSON.parse(raw) as StoredCrash; } catch { return null; }
  } catch { return null; }
}

/** Mark that we successfully reached the home tab. Clears any stale crash. */
export async function markHomeReached(): Promise<void> {
  try {
    await AsyncStorage.setItem(HAS_REACHED_HOME_KEY, String(Date.now()));
    await AsyncStorage.removeItem(LAST_CRASH_KEY);
  } catch {}
}
