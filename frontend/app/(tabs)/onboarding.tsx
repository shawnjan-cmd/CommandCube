/**
 * Onboarding Tab — `/(tabs)/onboarding`   (label: INTRO)
 * ────────────────────────────────────────────────────────────────
 * v3 — PURE TAB, NO AUTO-REDIRECT
 *
 * Previous versions auto-redirected returning users back to HOME on
 * mount. That made it impossible to revisit the tutorial — tapping
 * the INTRO tab would instantly "back out" to home.
 *
 * Now: `app/index.tsx` already lands users on HOME by default, so
 * there's nothing to auto-skip from. INTRO is a pure on-demand tab.
 * Tap it any time → see the tutorial. Period.
 *
 * COMPLETION HANDOFF (`handleComplete`)
 *   • Screen 10 already awaits the storage write before invoking this.
 *   • We still defensively re-persist (cheap belt + suspenders).
 *   • Triple-fallback navigation: replace → push → navigate.
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

  // ── Completion handler (passed to OnboardingOverlay & ErrorBoundary) ─
  const handleComplete = React.useCallback(() => {
    // Defensive persistence (Screen10 already awaited this, but cheap).
    // Writes BOTH keys (v2 AND v1) so users updating from older builds
    // are correctly recognised as onboarded on next launch.
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
    ]).catch(() => { /* never blocks navigation */ });

    // 100 ms deferral before navigation — gives the router enough time to
    // be fully ready (per the v2.1.2 critical-fixes spec). Without this,
    // some Android builds hit "Attempted to navigate before mounting the
    // Root Layout component" and the user gets stuck on Screen 10.
    setTimeout(() => {
      try { router.replace(HOME_ROUTE as any); return; }
      catch (e1) { console.warn('[OnboardingTab] router.replace failed:', e1); }
      try { router.push(HOME_ROUTE as any);    return; }
      catch (e2) { console.warn('[OnboardingTab] router.push failed:', e2); }
      try { (router as any).navigate?.(HOME_ROUTE); }
      catch (e3) { console.warn('[OnboardingTab] router.navigate failed:', e3); }
    }, 100);
  }, [router]);

  // ── 3. Render — always renders OnboardingOverlay (no placeholder). ─────
  return (
    <View style={styles.holder}>
      <OnboardingErrorBoundary onSkipToHome={handleComplete}>
        <OnboardingOverlay onComplete={handleComplete} />
      </OnboardingErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  holder: { flex: 1, backgroundColor: '#000000' },
});
