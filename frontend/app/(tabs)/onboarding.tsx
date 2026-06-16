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
  // CRITICAL ROUTER-READY GUARD: we wrap the navigation in setTimeout(0)
  // so the redirect runs on the NEXT tick — after the Root Layout has
  // finished mounting. Otherwise expo-router throws "Attempted to navigate
  // before mounting the Root Layout component" and the user is stranded.
  useEffect(() => {
    mountedRef.current = true;
    if (_skipChecked) return;
    _skipChecked = true;

    let cancelled = false;
    (async () => {
      try {
        // Dual-key check — handles users updated from older builds that
        // wrote v1 but not v2, and vice versa. Either flag = onboarded.
        const [v2, v1] = await Promise.all([
          AsyncStorage.getItem(ONBOARDING_DONE_KEY),
          AsyncStorage.getItem('@butler_welcome_complete_v1'),
        ]);
        if (cancelled || !mountedRef.current) return;
        const isDone = v2 === 'true' || v2 === '1' || v1 === 'true' || v1 === '1';
        if (!isDone) return;

        // Defer navigation by one tick so the router is fully mounted.
        setTimeout(() => {
          if (cancelled || !mountedRef.current) return;
          try { router.replace(HOME_ROUTE as any); return; } catch {}
          try { router.push(HOME_ROUTE as any);    return; } catch {}
          try { (router as any).navigate?.(HOME_ROUTE); }    catch {}
        }, 0);
      } catch { /* storage error — safe default = show onboarding */ }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [router]);

  // ── 2. Completion handler (passed to OnboardingOverlay & ErrorBoundary) ─
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
