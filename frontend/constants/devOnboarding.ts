/**
 * Butler AI — per-user onboarding controls.
 * Call from a hidden long-press, a debug menu, or React Native dev REPL.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ONBOARDING_DONE_KEY, CONSENT_KEY, TERMS_ACCEPTED_KEY, PRIVACY_ACCEPTED_KEY,
  AGE_CONFIRMED_KEY, LAN_CONSENT_KEY, REMOTE_EXEC_CONSENT_KEY,
  CAMERA_CONSENT_KEY, SERVER_PRIVACY_ACCEPTED_KEY,
} from '@/constants/onboardingKeys';

const KEYS = [
  ONBOARDING_DONE_KEY, CONSENT_KEY, TERMS_ACCEPTED_KEY, PRIVACY_ACCEPTED_KEY,
  AGE_CONFIRMED_KEY, LAN_CONSENT_KEY, REMOTE_EXEC_CONSENT_KEY,
  CAMERA_CONSENT_KEY, SERVER_PRIVACY_ACCEPTED_KEY,
];

/** Wipes all onboarding state for the current user. Restart the app to see welcome again. */
export async function devResetOnboarding() {
  await AsyncStorage.multiRemove(KEYS);
  console.log('[dev] onboarding reset — restart app to view welcome flow');
}

/** Marks onboarding done without showing it. */
export async function devCompleteOnboarding() {
  await AsyncStorage.multiSet(KEYS.map(k => [k, '1']));
  console.log('[dev] onboarding marked complete');
}

/** Returns current per-key state for inspection. */
export async function devOnboardingStatus() {
  const entries = await AsyncStorage.multiGet(KEYS);
  return Object.fromEntries(entries);
}