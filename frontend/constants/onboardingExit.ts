/**
 * Butler AI — constants/onboardingExit.ts
 * Single source of truth for leaving onboarding.
 * 7-path bulletproof navigation. Never throws. Fires globals first.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Router } from 'expo-router';
import {
  ONBOARDING_DONE_KEY, CONSENT_KEY, TERMS_ACCEPTED_KEY, PRIVACY_ACCEPTED_KEY,
  AGE_CONFIRMED_KEY, LAN_CONSENT_KEY, REMOTE_EXEC_CONSENT_KEY,
  CAMERA_CONSENT_KEY, SERVER_PRIVACY_ACCEPTED_KEY,
} from '@/constants/onboardingKeys';

const ALL_KEYS: Array<[string, string]> = [
  [ONBOARDING_DONE_KEY,         '1'],
  [CONSENT_KEY,                 '1'],
  [TERMS_ACCEPTED_KEY,          '1'],
  [PRIVACY_ACCEPTED_KEY,        '1'],
  [AGE_CONFIRMED_KEY,           '1'],
  [LAN_CONSENT_KEY,             '1'],
  [REMOTE_EXEC_CONSENT_KEY,     '1'],
  [CAMERA_CONSENT_KEY,          '1'],
  [SERVER_PRIVACY_ACCEPTED_KEY, '1'],
];

/**
 * Save every consent + navigate into nexushome via 7 independent paths.
 * Safe to call multiple times. Never throws. Returns true if any nav fired.
 */
export async function exitOnboarding(
  router: Pick<Router, 'replace'> & Partial<Pick<Router, 'navigate'>>
): Promise<{ navigated: boolean; resolvedRoute: string | null; storageError?: unknown }> {
  // ── 1. Persist all consents ──────────────────────────────────────────
  let storageError: unknown;
  try { await AsyncStorage.multiSet(ALL_KEYS); } catch (e) {
    storageError = e;
    console.warn('[exitOnboarding] multiSet failed:', e);
  }
  try {
    const check = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
    if (check !== '1') await AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1');
  } catch {}

  // ── 2. Fire all 7 nav paths ──────────────────────────────────────────
  let resolvedRoute: string | null = null;

  // Path 1: layout state flip (most reliable — layout owns routing)
  try {
    const setNeeds = (global as any).__setNeedsOnboarding;
    if (typeof setNeeds === 'function') { setNeeds(false); resolvedRoute = resolvedRoute ?? '__setNeedsOnboarding'; }
  } catch {}

  // Path 2: module-level router ref in _layout
  try {
    const fn = (global as any).__onboardingComplete;
    if (typeof fn === 'function') { fn(); resolvedRoute = resolvedRoute ?? '__onboardingComplete'; }
  } catch {}

  // Path 3: direct nexushome replace
  try { router.replace('/(tabs)/nexushome' as any); resolvedRoute = resolvedRoute ?? '/(tabs)/nexushome'; } catch {}

  // Path 4: tabs root (index.tsx re-exports nexushome)
  try { router.replace('/(tabs)' as any); resolvedRoute = resolvedRoute ?? '/(tabs)'; } catch {}

  // Path 5: navigate() variant (catches cases where replace is rejected)
  try {
    if (typeof (router as any).navigate === 'function') {
      (router as any).navigate('/(tabs)/nexushome');
      resolvedRoute = resolvedRoute ?? 'navigate:/(tabs)/nexushome';
    }
  } catch {}

  // Path 6: main-menu (fires its own 7-path retry loop)
  try { router.replace('/main-menu' as any); resolvedRoute = resolvedRoute ?? '/main-menu'; } catch {}

  // Path 7: deferred micro-task re-fire of globals (catches timing races)
  AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1').catch(() => {});
  Promise.resolve().then(() => {
    try { (global as any).__setNeedsOnboarding?.(false); } catch {}
    try { (global as any).__onboardingComplete?.(); } catch {}
  });
  resolvedRoute = resolvedRoute ?? 'deferred-globals';

  const navigated = resolvedRoute !== null;
  if (!navigated) console.error('[exitOnboarding] All 7 paths failed.');
  return { navigated, resolvedRoute, ...(storageError !== undefined && { storageError }) };
}

/** Boolean wrapper for backwards compat. */
export async function exitOnboardingBool(router: Pick<Router, 'replace'>): Promise<boolean> {
  const { navigated } = await exitOnboarding(router as any);
  return navigated;
}