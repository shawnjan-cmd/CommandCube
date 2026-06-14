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
    // never has to wait on storage. We also stamp a diagnostic key with the
    // timestamp so a returning agent / debug screen can verify the LAUNCH
    // button was actually tapped (independent of routing success).
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

    // Multi-path navigation to be bulletproof against any single-method
    // failure. router.replace is preferred (no back-button history) but
    // we fall through to router.push, then router.navigate, in case the
    // expo-router version on the user's device has a quirk.
    const target = '/(tabs)/nexushome' as const;
    try {
      console.log('[onboarding] LAUNCH → router.replace(' + target + ')');
      router.replace(target as any);
      return;
    } catch (e) {
      console.warn('[onboarding] replace failed, trying push:', e);
    }
    try { router.push(target as any); return; } catch (e) {
      console.warn('[onboarding] push failed, trying navigate:', e);
    }
    try { (router as any).navigate?.(target); } catch (e) {
      console.error('[onboarding] ALL navigation paths failed:', e);
    }
  };

  return (
    <View style={s.root}>
      <OnboardingOverlay onComplete={handleComplete} />
    </View>
  );
}

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: '#050505' } });
