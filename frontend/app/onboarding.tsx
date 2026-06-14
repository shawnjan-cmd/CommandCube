/**
 * /onboarding — Dedicated route for the 10-screen onboarding flow.
 *
 * BULLETPROOF NAVIGATION (v3):
 *   On completion, fires THREE redundant navigation channels in sequence
 *   with delays so any one of them succeeding is enough:
 *     1. router.replace('/(tabs)/nexushome')
 *     2. After 200ms, router.replace('/(tabs)')
 *     3. After 500ms, sets a fallback flag that triggers an in-component
 *        <Redirect /> render — works even if the router itself is frozen.
 *
 *   AsyncStorage keys are written BEFORE navigation (synchronously awaited)
 *   so the gate at /index.tsx will route returning users straight to home
 *   if any navigation attempt somehow fails and the user retries via the
 *   bootstrap path.
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import OnboardingOverlay from '@/components/OnboardingOverlay';

const HOME_ROUTE     = '/(tabs)/nexushome';
const HOME_FALLBACK  = '/(tabs)';

export default function OnboardingRoute() {
  const router = useRouter();
  // null = checking storage; true = already done, redirect; false = show onboarding
  const [shouldRedirect, setShouldRedirect] = useState<boolean | null>(null);
  // Fallback: if completion fires but router.replace doesn't actually navigate,
  // flip this and let the <Redirect> component fire instead.
  const [forceHomeRedirect, setForceHomeRedirect] = useState(false);

  // Gate: returning user → bounce to home.
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
    // STEP 1: Write completion keys FIRST so even if all navigations fail
    // and the user kills/reopens the app, they go straight to home.
    try {
      await AsyncStorage.multiSet([
        ['@butler_onboarding_done_v2',        'true'],
        ['@butler_welcome_complete_v1',       'true'],
        ['@butler_terms_accepted_v1',         'true'],
        ['@butler_consent_v2',                '1.0.0'],
        ['@butler_age_confirmed_v1',          'true'],
        ['@butler_show_post_onboarding_chat', 'true'],
        ['@butler_stable_state',              'onboarded'],
      ]);
    } catch {}

    // STEP 2: Multi-channel navigation. Three independent attempts.
    // CHANNEL A (primary): explicit path to nexushome
    try { router.replace(HOME_ROUTE as any); } catch (e) { console.warn('[onboarding] replace A failed:', e); }

    // CHANNEL B (200ms later): tabs group root — expo-router routes /(tabs)
    // through (tabs)/index.tsx which re-exports nexushome
    setTimeout(() => {
      try { router.replace(HOME_FALLBACK as any); } catch (e) { console.warn('[onboarding] replace B failed:', e); }
    }, 200);

    // CHANNEL C (500ms later): in-component <Redirect /> — works even if
    // router.replace is broken because <Redirect /> uses a different code path
    // and React will unmount this component to render the new route.
    setTimeout(() => {
      setForceHomeRedirect(true);
    }, 500);
  };

  // While gate check is pending: dark screen, prevents flash
  if (shouldRedirect === null) {
    return <View style={s.root} />;
  }
  // Already onboarded: redirect to home
  if (shouldRedirect || forceHomeRedirect) {
    return <Redirect href={HOME_ROUTE as any} />;
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
