/**
 * Onboarding Tab — `/(tabs)/onboarding`   (label: INTRO)
 * ────────────────────────────────────────────────────────────────
 * BULLETPROOF v2 — survives every edge case we've hit across 20+ EAS
 * builds.
 *
 * ROUTING ARCHITECTURE
 *   • app/index.tsx → ALWAYS redirects here. No async. No placeholder.
 *   • This tab handles the "already-onboarded? skip to home" decision
 *     INSIDE the tab navigator (post-mount), where everything is
 *     guaranteed registered and routable.
 *   • Users can still revisit INTRO from the bottom toolbar anytime;
 *     the auto-skip only fires on the FIRST mount during a cold start
 *     (tracked via a module-scoped `_skipChecked` flag).
 *
 * RENDER STRATEGY
 *   • We render OnboardingOverlay IMMEDIATELY — never a blank/colored
 *     placeholder. If the user is a "returning user", the post-mount
 *     useEffect will call router.replace within milliseconds, before
 *     they perceive any flash.
 *   • If AsyncStorage stalls completely (e.g. cold-start bridge
 *     warm-up), the user simply sees the intro — which is exactly
 *     what was requested. Worst case is a no-op, never a blue screen.
 *
 * COMPLETION HANDOFF (`handleComplete`)
 *   • Screen 10 already awaits the storage write before invoking this.
 *   • We still defensively re-persist (cheap belt + suspenders).
 *   • Triple-fallback navigation: replace → push → navigate.
 */
import React, { useEffect, useRef } from 'react';
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

// Module-scoped guard: ensures we only auto-skip on the FIRST mount per
// process lifetime (i.e. cold start). After this fires once, the user
// can tap the INTRO tab freely without being yanked away.
let _skipChecked = false;

export default function OnboardingTab() {
  const router = useRouter();
  const mountedRef = useRef(true);

  // ── 1. Cold-start "already onboarded?" skip ────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    if (_skipChecked) return;
    _skipChecked = true;

    let cancelled = false;
    AsyncStorage.getItem(ONBOARDING_DONE_KEY)
      .then((v) => {
        if (cancelled || !mountedRef.current) return;
        if (v === 'true' || v === '1') {
          // Returning user — atomic same-tab-navigator switch to home.
          try { router.replace(HOME_ROUTE as any); return; } catch {}
          try { router.push(HOME_ROUTE as any);    return; } catch {}
          try { (router as any).navigate?.(HOME_ROUTE); }    catch {}
        }
      })
      .catch(() => { /* storage error — show onboarding (safe default) */ });

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [router]);

  // ── 2. Completion handler (passed to OnboardingOverlay & ErrorBoundary) ─
  const handleComplete = React.useCallback(() => {
    // Defensive persistence (Screen10 already awaited this, but cheap).
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

    // Navigate to home tab. Triple-fallback for robustness.
    try { router.replace(HOME_ROUTE as any); return; }
    catch (e1) { console.warn('[OnboardingTab] router.replace failed:', e1); }
    try { router.push(HOME_ROUTE as any);    return; }
    catch (e2) { console.warn('[OnboardingTab] router.push failed:', e2); }
    try { (router as any).navigate?.(HOME_ROUTE); }
    catch (e3) { console.warn('[OnboardingTab] router.navigate failed:', e3); }
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
  holder: { flex: 1, backgroundColor: '#050A12' },
});
