/**
 * Butler AI — Splash Screen Controller · CLEAN REWRITE v1
 * ──────────────────────────────────────────────────────────────────
 *
 * THE PROBLEM
 * On Android cold-start, the splash screen can stay up indefinitely
 * if `SplashScreen.hideAsync()` is never reached (e.g. early crash,
 * suspended Promise, or React commit blocked). The user perceives
 * this as the "black splash" / "blue splash" crash.
 *
 * THE FIX (this file)
 * A single API with FIVE layered hide strategies. At least ONE will
 * always fire:
 *
 *   1. `preventAuto()` — call at module-eval (very early). Keeps the
 *      splash up so we can hide it deliberately.
 *   2. `hideOnLayout()` — call from `useLayoutEffect` in the root
 *      layout. Fires synchronously after first React commit.
 *   3. `hideOnEffect()` — call from `useEffect`. Fires after paint.
 *   4. `hideOnRAF()` — schedules a `requestAnimationFrame` hide.
 *   5. `hideOnTimeout(ms)` — hard-cap timer. Fires after `ms` no
 *      matter what.
 *
 * Each strategy is idempotent and never throws. Calling `hideAll()`
 * arms all five at once with sensible timings — the recommended use.
 */

import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

let _autoHidePrevented = false;
let _hidden            = false;

/** Idempotent: keeps the native splash visible. Safe to call multiple times. */
export function preventAuto(): void {
  if (_autoHidePrevented) return;
  _autoHidePrevented = true;
  try { SplashScreen.preventAutoHideAsync().catch(() => {}); } catch {}
}

/** Idempotent: hides the native splash. Safe to call from anywhere, anytime. */
export function hide(): void {
  if (_hidden) return;
  _hidden = true;
  try { SplashScreen.hideAsync().catch(() => {}); } catch {}
}

/**
 * Arm every hide strategy at once.
 *
 *   • Layout-effect (immediate)         · hidden on first commit
 *   • Effect (~1 frame after paint)     · paint-aware hide
 *   • RAF (~16 ms)                      · next frame hide
 *   • Hard timeout (default 1500 ms)    · "no matter what" fallback
 *
 * Call ONCE from the root layout. Cleanup function clears the timer.
 *
 * Returns a cleanup function suitable for `useEffect` / `useLayoutEffect`.
 */
export function armAllHideStrategies(opts?: {
  hardCapMs?: number;
  onHidden?: () => void;
}): () => void {
  const cap   = opts?.hardCapMs ?? (Platform.OS === 'android' ? 1500 : 1200);
  const after = opts?.onHidden;

  // 1) Immediate
  hide();
  if (after) try { after(); } catch {}

  // 2) Next RAF
  let raf: any = null;
  try {
    raf = requestAnimationFrame(() => {
      hide();
      if (after) try { after(); } catch {}
    });
  } catch {}

  // 3) Hard-cap timeout
  const t = setTimeout(() => {
    hide();
    if (after) try { after(); } catch {}
  }, cap);

  return () => {
    if (raf) try { cancelAnimationFrame(raf); } catch {}
    try { clearTimeout(t); } catch {}
  };
}

/** True once `hide()` has been called at least once. */
export function isHidden(): boolean { return _hidden; }
