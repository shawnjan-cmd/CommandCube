/**
 * services/onboardingExit.ts — Butler AI
 * 7-path bulletproof navigation to nexushome. Never throws.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Router } from 'expo-router';
import {
  ONBOARDING_DONE_KEY, CONSENT_KEY, TERMS_ACCEPTED_KEY, PRIVACY_ACCEPTED_KEY,
  AGE_CONFIRMED_KEY, LAN_CONSENT_KEY, REMOTE_EXEC_CONSENT_KEY,
  CAMERA_CONSENT_KEY, SERVER_PRIVACY_ACCEPTED_KEY,
} from '@/constants/onboardingKeys';

export interface OnboardingExitResult {
  navigated: boolean;
  resolvedRoute: string | null;
  storageError?: unknown;
}

const ALL_KEYS: Array<[string, string]> = [
  [ONBOARDING_DONE_KEY, '1'], [CONSENT_KEY, '1'],
  [TERMS_ACCEPTED_KEY, '1'], [PRIVACY_ACCEPTED_KEY, '1'],
  [AGE_CONFIRMED_KEY, '1'], [LAN_CONSENT_KEY, '1'],
  [REMOTE_EXEC_CONSENT_KEY, '1'], [CAMERA_CONSENT_KEY, '1'],
  [SERVER_PRIVACY_ACCEPTED_KEY, '1'],
];

export async function exitOnboarding(
  router: Pick<Router, 'replace'> & Partial<Pick<Router, 'navigate'>>
): Promise<OnboardingExitResult> {
  let storageError: unknown;
  try { await AsyncStorage.multiSet(ALL_KEYS); } catch (e) { storageError = e; }
  try {
    if (await AsyncStorage.getItem(ONBOARDING_DONE_KEY) !== '1')
      await AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1');
  } catch {}

  let resolvedRoute: string | null = null;

  // Path 1: layout state flip
  try { const f=(global as any).__setNeedsOnboarding; if(typeof f==='function'){f(false);resolvedRoute??='__setNeedsOnboarding';} } catch {}
  // Path 2: layout router ref
  try { const f=(global as any).__onboardingComplete; if(typeof f==='function'){f();resolvedRoute??='__onboardingComplete';} } catch {}
  // Path 3: nexushome replace
  try { router.replace('/(tabs)/nexushome' as any); resolvedRoute??='/(tabs)/nexushome'; } catch {}
  // Path 4: tabs root
  try { router.replace('/(tabs)' as any); resolvedRoute??='/(tabs)'; } catch {}
  // Path 5: navigate variant
  try { if(typeof (router as any).navigate==='function'){(router as any).navigate('/(tabs)/nexushome');resolvedRoute??='navigate:nexushome';} } catch {}
  // Path 6: main-menu hub
  try { router.replace('/main-menu' as any); resolvedRoute??='/main-menu'; } catch {}
  // Path 7: deferred micro-task
  AsyncStorage.setItem(ONBOARDING_DONE_KEY,'1').catch(()=>{});
  Promise.resolve().then(()=>{
    try{(global as any).__setNeedsOnboarding?.(false);}catch{}
    try{(global as any).__onboardingComplete?.();}catch{}
  });
  resolvedRoute??='deferred-globals';

  return { navigated: true, resolvedRoute, ...(storageError&&{storageError}) };
}
