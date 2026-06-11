// ┌─────────────────────────────────────────────────────────────────────────┐
// │  Butler AI · services/devOnboarding.ts                                  │
// │                                                                         │
// │  Developer & QA utilities for the onboarding flow.                     │
// │                                                                         │
// │  ⚠  NEVER import this module in production app code.                   │
// │     Wire calls behind a __DEV__ guard or a hidden debug menu.          │
// └─────────────────────────────────────────────────────────────────────────┘

import AsyncStorage from '@react-native-async-storage/async-storage';

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

/** A snapshot of every onboarding key and its current AsyncStorage value. */
export type OnboardingStatusSnapshot = Record<string, string | null>;

/** Result of devResetOnboarding / devCompleteOnboarding */
export interface DevActionResult {
  success: boolean;
  /** Keys that were affected by the action. */
  keys: string[];
  /** Any error that was caught (action still proceeds best-effort). */
  error?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Key manifest
// ─────────────────────────────────────────────────────────────────────────────

/** The canonical list of all onboarding-related AsyncStorage keys. */
export const ONBOARDING_KEYS: ReadonlyArray<string> = [
  ONBOARDING_DONE_KEY,
  CONSENT_KEY,
  TERMS_ACCEPTED_KEY,
  PRIVACY_ACCEPTED_KEY,
  AGE_CONFIRMED_KEY,
  LAN_CONSENT_KEY,
  REMOTE_EXEC_CONSENT_KEY,
  CAMERA_CONSENT_KEY,
  SERVER_PRIVACY_ACCEPTED_KEY,
];

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

const TAG = '[Butler · devOnboarding]';

function devLog(msg: string, ...args: unknown[]): void {
  if (__DEV__) console.log(`${TAG} ${msg}`, ...args);
}

function devWarn(msg: string, ...args: unknown[]): void {
  if (__DEV__) console.warn(`${TAG} ${msg}`, ...args);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ## devResetOnboarding
 *
 * Wipes **all** onboarding keys for the current user.
 * Restart the app (or call `router.replace('/welcome')`) to re-enter the flow.
 *
 * ### Typical uses
 * - Hidden long-press on the settings avatar
 * - React Native dev REPL: `await devResetOnboarding()`
 * - E2E test `beforeEach` hook
 *
 * @returns A {@link DevActionResult} describing what was cleared.
 */
export async function devResetOnboarding(): Promise<DevActionResult> {
  const keys = [...ONBOARDING_KEYS];
  try {
    await AsyncStorage.multiRemove(keys);
    devLog('Onboarding reset ✓ — restart app to view welcome flow');
    return { success: true, keys };
  } catch (error) {
    devWarn('multiRemove failed — attempting individual removes:', error);
    // Best-effort fallback: remove keys one by one.
    for (const key of keys) {
      try { await AsyncStorage.removeItem(key); } catch {}
    }
    return { success: false, keys, error };
  }
}

/**
 * ## devCompleteOnboarding
 *
 * Marks every onboarding key as done (`'1'`) without showing the flow.
 * The app will boot directly into `/(tabs)` on next launch.
 *
 * @returns A {@link DevActionResult} describing what was set.
 */
export async function devCompleteOnboarding(): Promise<DevActionResult> {
  const keys = [...ONBOARDING_KEYS];
  const pairs: [string, string][] = keys.map((k) => [k, '1']);
  try {
    await AsyncStorage.multiSet(pairs);
    devLog('Onboarding marked complete ✓');
    return { success: true, keys };
  } catch (error) {
    devWarn('multiSet failed — attempting individual sets:', error);
    for (const [k, v] of pairs) {
      try { await AsyncStorage.setItem(k, v); } catch {}
    }
    return { success: false, keys, error };
  }
}

/**
 * ## devOnboardingStatus
 *
 * Returns a snapshot of every onboarding key and its current value.
 * Useful for debugging or asserting state in tests.
 *
 * ```ts
 * const status = await devOnboardingStatus();
 * console.table(status);
 * // { '@butler_onboarding_done': '1', '@butler_consent': null, … }
 * ```
 */
export async function devOnboardingStatus(): Promise<OnboardingStatusSnapshot> {
  const keys = [...ONBOARDING_KEYS];
  try {
    const entries = await AsyncStorage.multiGet(keys);
    return Object.fromEntries(entries);
  } catch (error) {
    devWarn('multiGet failed:', error);
    return {};
  }
}

/**
 * ## devPrintOnboardingStatus
 *
 * Pretty-prints the current onboarding key snapshot to the console.
 * Each key is shown with a ✅ (set) or ❌ (missing) indicator.
 *
 * Intended for quick manual inspection — not for automated checks.
 */
export async function devPrintOnboardingStatus(): Promise<void> {
  if (!__DEV__) return;
  const status = await devOnboardingStatus();
  console.group(`${TAG} Status snapshot`);
  for (const [key, value] of Object.entries(status)) {
    const icon = value === '1' ? '✅' : '❌';
    console.log(`  ${icon}  ${key.padEnd(40)} → ${value ?? 'null'}`);
  }
  console.groupEnd();
}

/**
 * ## devSetOnboardingKey
 *
 * Granular override: set or clear a single onboarding key by name.
 * Useful when you need to test a specific mid-flow screen.
 *
 * @param key    The AsyncStorage key (use the constants from onboardingKeys.ts).
 * @param value  `'1'` to mark done, `null` to clear.
 */
export async function devSetOnboardingKey(
  key: string,
  value: '1' | null,
): Promise<void> {
  try {
    if (value === null) {
      await AsyncStorage.removeItem(key);
      devLog(`Cleared key: ${key}`);
    } else {
      await AsyncStorage.setItem(key, value);
      devLog(`Set key: ${key} → '${value}'`);
    }
  } catch (error) {
    devWarn(`Failed to update key "${key}":`, error);
  }
}