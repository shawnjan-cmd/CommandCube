/**
 * /(tabs)/onboarding — Onboarding as a regular TAB.
 *
 * Lives in the bottom tab bar like any other tab. Renders the 10-screen
 * onboarding flow. On completion of Screen 10, navigates to /(tabs)/nexushome
 * via router.replace so the user lands on the home tab.
 *
 * No gates, no redirects, no overlays. Just a normal route file that
 * renders OnboardingOverlay and hands off via router.replace when done.
 */
import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingOverlay from '@/components/OnboardingOverlay';

export default function OnboardingTab() {
  const router = useRouter();

  const handleComplete = () => {
    // Persist completion keys in background — never awaited. Even if
    // every navigation path below fails, the next app launch will skip
    // onboarding via the `app/index.tsx` gate (because the canonical
    // `@butler_onboarding_done_v2` key is now 'true').
    AsyncStorage.multiSet([
      ['@butler_onboarding_done_v2',        'true'],
      ['@butler_welcome_complete_v1',       'true'],
      ['@butler_terms_accepted_v1',         'true'],
      ['@butler_consent_v2',                '1.0.0'],
      ['@butler_age_confirmed_v1',          'true'],
      ['@butler_show_post_onboarding_chat', 'true'],
      ['@butler_stable_state',              'onboarded'],
      ['@butler_onboarding_exit_at',        String(Date.now())],
    ]).catch(() => {});

    // Multi-path navigation. We try every expo-router API in turn and
    // surface a user-visible Alert ONLY if all three fail — because the
    // onboarding flag is already persisted, the worst-case recovery is
    // simply "close and reopen the app", not "you lost your progress".
    const target = '/(tabs)/nexushome' as const;
    let navigated = false;

    try {
      console.log('[onboarding] LAUNCH → router.replace(' + target + ')');
      router.replace(target as any);
      navigated = true;
    } catch (e) {
      console.warn('[onboarding] replace failed, trying push:', e);
    }

    if (!navigated) {
      try { router.push(target as any); navigated = true; }
      catch (e) { console.warn('[onboarding] push failed, trying navigate:', e); }
    }

    if (!navigated) {
      try { (router as any).navigate?.(target); navigated = true; }
      catch (e) { console.error('[onboarding] ALL navigation paths failed:', e); }
    }

    if (!navigated) {
      // Final fallback — user-facing Alert. The onboarding flag is already
      // saved so closing+reopening will land on home directly.
      try {
        Alert.alert(
          'Setup complete',
          "You're all set! Please close and reopen Butler AI — you'll land right on the home screen.",
        );
      } catch {}
    }
  };

  return (
    <View style={s.root}>
      <OnboardingOverlay onComplete={handleComplete} />
    </View>
  );
}

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: '#050505' } });
