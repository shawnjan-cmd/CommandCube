// ┌─────────────────────────────────────────────────────────────────────────┐
// │  Butler AI · services/onboardingExit.ts                                 │
// │                                                                         │
// │  Single source of truth for leaving the onboarding flow.               │
// │  Zero globals · zero state ping-pong · zero races.                     │
// │                                                                         │
// │  ✦ One function. One exit path. One responsibility.                    │
// └─────────────────────────────────────────────────────────────────────────┘

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Router } from 'expo-router';

import {
  ONBOARDING_DONE_KEY,
  CONSENT_KEY,
  TERMS_ACCEPTED_KEY,
  PRIVACY_ACCEPTED_KEY,
  AGE_CONFIRMED_KEY,
  LAN_CONSENT_KEY,
  REMOTE_EXEC_CONSENT_KEY,
  CAMERA_CONSENT_KEY,
  SERVER_PRIVACY_ACCEPTED_KEY,
} from '@/constants/onboardingKeys';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Result object returned by exitOnboarding for richer error handling. */
export interface OnboardingExitResult {
  /** Whether navigation was successfully issued. */
  navigated: boolean;
  /** The route that succeeded, or null if all failed. */
  resolvedRoute: string | null;
  /** Any non-fatal storage error encountered. */
  storageError?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Consent key manifest
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every key that must be set to '1' before the app is considered
 * fully consented and onboarded.
 *
 * Add new keys here — exitOnboarding picks them up automatically.
 */
const CONSENT_MANIFEST: ReadonlyArray<[string, '1']> = [
  [ONBOARDING_DONE_KEY,          '1'],
  [CONSENT_KEY,                  '1'],
  [TERMS_ACCEPTED_KEY,           '1'],
  [PRIVACY_ACCEPTED_KEY,         '1'],
  [AGE_CONFIRMED_KEY,            '1'],
  [LAN_CONSENT_KEY,              '1'],
  [REMOTE_EXEC_CONSENT_KEY,      '1'],
  [CAMERA_CONSENT_KEY,           '1'],
  [SERVER_PRIVACY_ACCEPTED_KEY,  '1'],
];

/** Ordered list of navigation targets to try, from most to least preferred. */
const NAV_TARGETS = ['/(tabs)', '/main-menu', '/'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persist all consent keys with a best-effort retry on the gate key.
 * Never throws — failures are surfaced via the return value.
 */
async function persistConsents(): Promise<unknown | undefined> {
  let storageError: unknown;

  try {
    await AsyncStorage.multiSet(CONSENT_MANIFEST as unknown as [string, string][]);
  } catch (err) {
    storageError = err;
    console.warn('[exitOnboarding] multiSet failed — will retry gate key:', err);
  }

  // Retry guard: ensure the single most-important key is definitely set.
  try {
    const check = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
    if (check !== '1') {
      await AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1');
    }
  } catch (retryErr) {
    console.warn('[exitOnboarding] retry for gate key also failed:', retryErr);
  }

  return storageError;
}

/**
 * Try each navigation target in order; return the first one that succeeds.
 * Returns null if every target failed.
 */
function attemptNavigation(
  router: Pick<Router, 'replace'>,
): string | null {
  for (const target of NAV_TARGETS) {
    try {
      router.replace(target as Parameters<Router['replace']>[0]);
      return target;
    } catch (navErr) {
      console.warn(`[exitOnboarding] router.replace("${target}") failed:`, navErr);
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ## exitOnboarding
 *
 * Finalises the onboarding flow in a single, atomic-ish step:
 *
 * 1. Persists **all** consent keys via `AsyncStorage.multiSet`.
 * 2. Retries the gate key individually for extra resilience.
 * 3. Navigates to the main app via `router.replace`.
 *    Falls back through `NAV_TARGETS` if the primary route fails.
 *
 * ### Guarantees
 * - **Idempotent** — safe to call multiple times; duplicate calls are a no-op
 *   (the caller's `launchingRef` is the guard).
 * - **Never throws** — all errors are caught and surfaced in the return value.
 * - **No globals** — relies solely on the router and AsyncStorage.
 *
 * ### Usage
 * ```ts
 * const result = await exitOnboarding(router);
 * if (!result.navigated) {
 *   // navigation failed — reset local state so the user can retry
 * }
 * ```
 *
 * @param router  Expo Router instance (or any `{ replace }` compatible duck).
 * @returns       {@link OnboardingExitResult}
 */
export async function exitOnboarding(
  router: Pick<Router, 'replace'>,
): Promise<OnboardingExitResult> {
  const storageError = await persistConsents();
  const resolvedRoute = attemptNavigation(router);

  const result: OnboardingExitResult = {
    navigated: resolvedRoute !== null,
    resolvedRoute,
    ...(storageError !== undefined && { storageError }),
  };

  if (!result.navigated) {
    console.error('[exitOnboarding] All navigation targets exhausted. User is stuck.', result);
  }

  return result;
}

/**
 * Convenience boolean wrapper for callers that only care about success/failure.
 *
 * @deprecated Prefer `exitOnboarding` for richer error handling.
 */
export async function exitOnboardingBool(
  router: Pick<Router, 'replace'>,
): Promise<boolean> {
  const { navigated } = await exitOnboarding(router);
  return navigated;
}