/**
 * /(tabs)/onboarding — Onboarding as a regular TAB.
 *
 * Lives in the bottom tab bar like any other tab. Renders the 10-screen
 * onboarding flow wrapped in an OnboardingErrorBoundary so any screen-level
 * crash gives the user a RETRY / SKIP-TO-HOME recovery instead of bouncing
 * to the global SYSTEM FAULT boundary.
 *
 * On completion of Screen 10, navigates to /(tabs)/nexushome via
 * router.replace so the user lands on the home tab.
 */
import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingOverlay from '@/components/OnboardingOverlay';
import OnboardingErrorBoundary from '@/components/OnboardingErrorBoundary';

export default function OnboardingTab() {
  const router = useRouter();

  const persistAndNavigate = (origin: string) => {
    // Persist completion keys in background — never awaited. Even if every
    // navigation path below fails, the next app launch will skip onboarding
    // via the `app/index.tsx` gate.
    AsyncStorage.multiSet([
      ['@butler_onboarding_done_v2',        'true'],
      ['@butler_welcome_complete_v1',       'true'],
      ['@butler_terms_accepted_v1',         'true'],
      ['@butler_consent_v2',                '1.0.0'],
      ['@butler_age_confirmed_v1',          'true'],
      ['@butler_show_post_onboarding_chat', 'true'],
      ['@butler_stable_state',              'onboarded'],
      ['@butler_onboarding_exit_at',        String(Date.now())],
      ['@butler_onboarding_exit_origin',    origin],
    ]).catch(() => {});

    // Multi-path navigation — onboarding flag is already persisted so the
    // worst-case recovery is "close+reopen the app", never "you lost your
    // progress".
    const target = '/(tabs)/nexushome' as const;
    let navigated = false;
    try { router.replace(target as any); navigated = true; }
    catch (e) { console.warn(`[onboarding:${origin}] replace failed:`, e); }

    if (!navigated) {
      try { router.push(target as any); navigated = true; }
      catch (e) { console.warn(`[onboarding:${origin}] push failed:`, e); }
    }
    if (!navigated) {
      try { (router as any).navigate?.(target); navigated = true; }
      catch (e) { console.error(`[onboarding:${origin}] ALL nav paths failed:`, e); }
    }
    if (!navigated) {
      try {
        Alert.alert(
          'Setup complete',
          "You're all set! Please close and reopen Butler AI — you'll land right on the home screen.",
        );
      } catch {}
    }
  };

  const handleComplete = () => persistAndNavigate('launch');
  const handleSkipToHome = () => persistAndNavigate('skip_after_error');

  return (
    <View style={s.root}>
      <OnboardingErrorBoundary onSkipToHome={handleSkipToHome}>
        <OnboardingOverlay onComplete={handleComplete} />
      </OnboardingErrorBoundary>
    </View>
  );
}

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: '#050A12' } });
