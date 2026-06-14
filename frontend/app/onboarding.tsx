/**
 * /onboarding — Dedicated route for the 10-screen onboarding flow.
 *
 * Has its own gate: if the user has already completed onboarding,
 * redirect to /(tabs)/nexushome immediately. This prevents returning
 * users who deep-link or refresh on this URL from re-seeing onboarding.
 *
 * On completion, navigates to /(tabs)/nexushome with router.replace
 * so the user cannot swipe-back into onboarding.
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import OnboardingOverlay from '@/components/OnboardingOverlay';

export default function OnboardingRoute() {
  const router = useRouter();
  const [shouldRedirect, setShouldRedirect] = useState<boolean | null>(null);

  // Self-gate: if user has already onboarded, bounce to home.
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem('@butler_onboarding_done_v2');
        setShouldRedirect(v === 'true' || v === '1');
      } catch {
        setShouldRedirect(false);
      }
    })();
  }, []);

  const handleComplete = async () => {
    // OnboardingOverlay's Screen 10 already persists 7 keys. Belt-and-suspenders
    // double-write the canonical gate key before navigating.
    try {
      await AsyncStorage.multiSet([
        ['@butler_onboarding_done_v2',  'true'],
        ['@butler_welcome_complete_v1', 'true'],
      ]);
    } catch {}
    // router.replace so the user cannot swipe-back into onboarding
    router.replace('/(tabs)/nexushome' as any);
  };

  // While gate check is pending: dark screen, prevents flash
  if (shouldRedirect === null) {
    return <View style={s.root} />;
  }
  // Already onboarded: redirect to home
  if (shouldRedirect) {
    return <Redirect href="/(tabs)/nexushome" />;
  }
  // Fresh user: show onboarding
  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <OnboardingOverlay onComplete={handleComplete} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },
});
