/**
 * Butler AI — User Session Service · CLEAN REWRITE v1
 * ──────────────────────────────────────────────────────────────────
 *
 * SINGLE SOURCE OF TRUTH for:
 *   • Is this a NEW user or a RETURNING user?
 *   • What route should `/` redirect to on cold start?
 *   • How do we atomically mark the user as fully onboarded?
 *   • How do we wipe the session on "Delete All My Data"?
 *
 * Used by:
 *   • app/index.tsx              — cold-start redirect
 *   • app/_layout.tsx            — boot bootstrap chain
 *   • app/(tabs)/onboarding.tsx  — FINISH and SKIP handlers
 *   • app/(tabs)/settings.tsx    — Delete All Data feature
 *
 * Performance:
 *   • In-memory cache so callers after the first one are synchronous
 *   • AsyncStorage hard-capped at 1.8 s — boot never blocks
 *
 * Backwards-compatibility:
 *   • Honours legacy `WELCOME_COMPLETE_KEY` (v1) as onboarded
 *   • Honours new `ONBOARDING_DONE_KEY` (v2) as onboarded
 *   • Either flag set to `'true'` / `'1'` qualifies the user as returning
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ONBOARDING_DONE_KEY,
  WELCOME_COMPLETE_KEY,
  ALL_ONBOARDING_WRITE_KEYS,
} from '@/constants/onboardingKeys';

// ── ROUTES ───────────────────────────────────────────────────────
export const HOME_ROUTE       = '/(tabs)/nexushome'  as const;
export const ONBOARDING_ROUTE = '/(tabs)/onboarding' as const;

export type UserSessionKind = 'new' | 'returning' | 'unknown';
export type BootTarget = typeof HOME_ROUTE | typeof ONBOARDING_ROUTE;

// ── IN-MEMORY CACHE ──────────────────────────────────────────────
let _cachedKind: UserSessionKind = 'unknown';
let _hydrated  = false;
let _hydratePromise: Promise<UserSessionKind> | null = null;

// ── PRIVATE: read with hard timeout ──────────────────────────────
async function readKindFromStorage(timeoutMs: number): Promise<UserSessionKind> {
  try {
    const read = Promise.all([
      AsyncStorage.getItem(ONBOARDING_DONE_KEY).catch(() => null),
      AsyncStorage.getItem(WELCOME_COMPLETE_KEY).catch(() => null),
    ]);
    const cap = new Promise<[null, null]>(res =>
      setTimeout(() => res([null, null]), timeoutMs),
    );

    const [v2, v1] = (await Promise.race([read, cap])) as [any, any];
    const returning =
      v2 === 'true' || v2 === '1' ||
      v1 === 'true' || v1 === '1';
    return returning ? 'returning' : 'new';
  } catch {
    // On any unexpected failure assume returning so we don't subject a
    // real returning user to the tutorial again.
    return 'returning';
  }
}

// ── PUBLIC API ───────────────────────────────────────────────────

/**
 * Hydrate the in-memory cache. Safe to call multiple times — only the
 * first invocation actually hits storage. Hard-capped at 1.8 s.
 */
export function hydrateUserSession(timeoutMs = 1800): Promise<UserSessionKind> {
  if (_hydrated) return Promise.resolve(_cachedKind);
  if (_hydratePromise) return _hydratePromise;

  _hydratePromise = readKindFromStorage(timeoutMs).then(kind => {
    _cachedKind = kind;
    _hydrated   = true;
    _hydratePromise = null;
    return kind;
  });
  return _hydratePromise;
}

/** Synchronous read of the cache. Returns 'unknown' before hydration. */
export function getUserSessionKindSync(): UserSessionKind {
  return _cachedKind;
}

/** True only if we've hydrated AND the user is returning. */
export function isReturningUserSync(): boolean {
  return _hydrated && _cachedKind === 'returning';
}

/**
 * Resolve which route `/` should redirect to.
 * Hydrates the cache as a side effect.
 */
export async function getBootTarget(timeoutMs = 1800): Promise<BootTarget> {
  const kind = await hydrateUserSession(timeoutMs);
  return kind === 'returning' ? HOME_ROUTE : ONBOARDING_ROUTE;
}

/**
 * Atomically mark the user as fully onboarded. Writes ALL consent
 * keys in one `multiSet`. Hard-capped at 1.5 s — never blocks the
 * caller from proceeding to home.
 */
export async function markUserOnboarded(): Promise<void> {
  try {
    const write = AsyncStorage.multiSet(ALL_ONBOARDING_WRITE_KEYS);
    const cap = new Promise<void>(res => setTimeout(res, 1500));
    await Promise.race([write, cap]);
  } catch {}
  // Update the in-memory cache so subsequent reads (e.g. a later
  // root re-mount) immediately know we're a returning user without
  // touching storage again.
  _cachedKind = 'returning';
  _hydrated   = true;
}

/**
 * Wipe every onboarding/consent flag. Used by Settings → Delete All
 * My Data. After this, the next cold-start will route to the tutorial.
 */
export async function resetUserSession(): Promise<void> {
  try {
    const keys = ALL_ONBOARDING_WRITE_KEYS.map(([k]) => k);
    await AsyncStorage.multiRemove(keys);
  } catch {}
  _cachedKind = 'new';
  _hydrated   = true;
}

/** For debugging / diagnostics only. */
export function _debugSnapshot() {
  return { kind: _cachedKind, hydrated: _hydrated };
}
