/**
 * Onboarding Tab — `/(tabs)/onboarding`
 * ────────────────────────────────────────────────────────────────
 * On first launch, `app/index.tsx` redirects here. On subsequent
 * launches it redirects to `/(tabs)/nexushome`. The user can also
 * revisit this tab any time from the bottom toolbar (labeled INTRO).
 *
 * `handleComplete` is intentionally bulletproof:
 *   1. Writes are ALREADY persisted by Screen10's enterApp() before
 *      this handler is invoked (it `await`s the multiSet). So by the
 *      time we get here, AsyncStorage is in the "onboarded" state.
 *   2. We still re-write the canonical flag here defensively — costs
 *      nothing and protects against the unlikely event that Screen10
 *      called onComplete before the storage write resolved.
 *   3. router.replace → router.push → router.navigate fallback chain.
 *      Even if one navigation method is unavailable on a particular
 *      build, the next one will succeed.
 *   4. We do NOT await storage before navigating — the user's tap MUST
 *      result in instant motion to the home tab.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingOverlay from '@/components/OnboardingOverlay';
import OnboardingErrorBoundary from '@/components/OnboardingErrorBoundary';
import {
  ONBOARDING_DONE_KEY,
  TERMS_ACCEPTED_KEY,
  PRIVACY_ACCEPTED_KEY,
  AGE_CONFIRMED_KEY,
  CONSENT_KEY,
} from '@/constants/onboardingKeys';

const HOME_ROUTE = '/(tabs)/nexushome' as const;

export default function OnboardingTab() {
  const router = useRouter();

  const handleComplete = React.useCallback(() => {
    // ── 1. Defensive re-persist (Screen10 already did this; cheap belt
    //       + suspenders). Fire-and-forget — never blocks navigation.
    AsyncStorage.multiSet([
      [ONBOARDING_DONE_KEY,                 'true'],
      ['@butler_welcome_complete_v1',       'true'],
      [TERMS_ACCEPTED_KEY,                  'true'],
      [PRIVACY_ACCEPTED_KEY,                'true'],
      [CONSENT_KEY,                         '1.0.0'],
      [AGE_CONFIRMED_KEY,                   'true'],
      ['@butler_show_post_onboarding_chat', 'true'],
      ['@butler_stable_state',              'onboarded'],
      ['@butler_onboarding_exit_at',        String(Date.now())],
    ]).catch(() => { /* never blocks user */ });

    // ── 2. Navigate to home tab. Triple-fallback for robustness.
    //       Same tab navigator → atomic switch, no overlay handoff.
    try {
      router.replace(HOME_ROUTE as any);
      return;
    } catch (e1) {
      // eslint-disable-next-line no-console
      console.warn('[OnboardingTab] router.replace failed:', e1);
    }
    try {
      router.push(HOME_ROUTE as any);
      return;
    } catch (e2) {
      // eslint-disable-next-line no-console
      console.warn('[OnboardingTab] router.push failed:', e2);
    }
    try {
      (router as any).navigate?.(HOME_ROUTE);
    } catch (e3) {
      // eslint-disable-next-line no-console
      console.warn('[OnboardingTab] router.navigate failed:', e3);
    }
  }, [router]);

  return (
    <View style={styles.holder}>
      <OnboardingErrorBoundary onSkipToHome={handleComplete}>
        <OnboardingOverlay onComplete={handleComplete} />
      </OnboardingErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  holder: { flex: 1, backgroundColor: '#050A12' },
});
