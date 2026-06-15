/**
 * Onboarding Tab — `/onboarding`
 *
 * Renders the OnboardingOverlay as a regular tab so users can revisit
 * the 10-step intro any time from the toolbar. No gating, no AsyncStorage
 * check on mount — they tap the tab, they see it.
 *
 * `onComplete` simply routes back to the home tab.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import OnboardingOverlay from '@/components/OnboardingOverlay';
import OnboardingErrorBoundary from '@/components/OnboardingErrorBoundary';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OnboardingTab() {
  const router = useRouter();

  const handleComplete = () => {
    // Mark the canonical flag for any other consumer that still reads it.
    // Fire-and-forget so storage hiccups never block navigation.
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

    // Hop back to the home tab. Multiple fallbacks for robustness.
    const target = '/(tabs)/nexushome' as const;
    try { router.replace(target as any); } catch {
      try { router.push(target as any); } catch {
        try { (router as any).navigate?.(target); } catch {}
      }
    }
  };

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
