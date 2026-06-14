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
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingOverlay from '@/components/OnboardingOverlay';

export default function OnboardingTab() {
  const router = useRouter();

  const handleComplete = () => {
    // Persist completion keys in background — never awaited so the user
    // never has to wait on storage.
    AsyncStorage.multiSet([
      ['@butler_onboarding_done_v2',        'true'],
      ['@butler_welcome_complete_v1',       'true'],
      ['@butler_terms_accepted_v1',         'true'],
      ['@butler_consent_v2',                '1.0.0'],
      ['@butler_age_confirmed_v1',          'true'],
      ['@butler_show_post_onboarding_chat', 'true'],
      ['@butler_stable_state',              'onboarded'],
    ]).catch(() => {});
    // Hand off to home tab. router.replace so back button doesn't return here.
    router.replace('/(tabs)/nexushome' as any);
  };

  return (
    <View style={s.root}>
      <OnboardingOverlay onComplete={handleComplete} />
    </View>
  );
}

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: '#050505' } });
