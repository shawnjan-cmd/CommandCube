/**
 * Bootstrap route — `/`
 *
 * NEW STRATEGY: For FIRST LAUNCH we render OnboardingOverlay INLINE here,
 * bypassing the redirect → (tabs)/onboarding chain entirely. EAS production
 * builds have shown the (tabs) group failing to mount the child onboarding
 * route on cold start, so we sidestep the routing layer altogether.
 *
 * For RETURNING users (canonical flag = true) we redirect to nexushome —
 * which has been proven to work since tabs mount fine after onboarding has
 * completed at least once.
 *
 * Auto-migration: if the canonical key is unset but a legacy completion
 * key is truthy, mirror it forward and skip onboarding.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_DONE_KEY, WELCOME_COMPLETE_KEY } from '@/constants/onboardingKeys';
import { withTimeout } from '@/utils/withTimeout';
import OnboardingOverlay from '@/components/OnboardingOverlay';
import OnboardingErrorBoundary from '@/components/OnboardingErrorBoundary';

type Decision = 'undecided' | 'show_onboarding' | 'go_home';

const LEGACY_DONE_KEYS = [
  WELCOME_COMPLETE_KEY,
  '@nexus_first_launch_v1',
];

export default function Index() {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision>('undecided');
  const decidedRef = useRef(false);

  useEffect(() => {
    // 3s emergency fallback — if storage hangs, default to onboarding
    const emergency = setTimeout(() => {
      if (decidedRef.current) return;
      decidedRef.current = true;
      console.warn('[Index] gate timed out after 3s — defaulting to onboarding');
      setDecision('show_onboarding');
    }, 3000);

    (async () => {
      try {
        let v = await withTimeout(
          AsyncStorage.getItem(ONBOARDING_DONE_KEY),
          1500,
          'AsyncStorage onboarding flag',
        );

        const VALID: any[] = ['true', 'false', '1', '0', '', null, undefined];
        if (!VALID.includes(v as any)) {
          AsyncStorage.removeItem(ONBOARDING_DONE_KEY).catch(() => {});
          v = null;
        }
        let done = v === 'true' || v === '1';

        if (!done) {
          for (const lk of LEGACY_DONE_KEYS) {
            const lv = await withTimeout(
              AsyncStorage.getItem(lk),
              1000,
              `legacy ${lk}`,
            );
            if (lv === 'true' || lv === '1') {
              done = true;
              AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true').catch(() => {});
              break;
            }
          }
        }

        if (decidedRef.current) return;
        decidedRef.current = true;
        clearTimeout(emergency);
        setDecision(done ? 'go_home' : 'show_onboarding');
      } catch (e) {
        console.warn('[Index] gate read failed:', e);
        if (decidedRef.current) return;
        decidedRef.current = true;
        clearTimeout(emergency);
        setDecision('show_onboarding');
      }
    })();

    return () => clearTimeout(emergency);
  }, []);

  // ── Onboarding completion handler ────────────────────────────────────────
  // Persists every flag and THEN navigates to /(tabs)/nexushome. By this
  // point onboarding has rendered fully so the (tabs) group will mount
  // correctly when we redirect into it.
  const handleComplete = () => {
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

    const target = '/(tabs)/nexushome' as const;
    try { router.replace(target as any); return; } catch {}
    try { router.push(target as any); return; } catch {}
    try { (router as any).navigate?.(target); } catch {}
  };

  // ── Render based on decision ─────────────────────────────────────────────
  if (decision === 'undecided') {
    return <View style={styles.holder} />;
  }

  if (decision === 'go_home') {
    return <Redirect href={'/(tabs)/nexushome' as any} />;
  }

  // First-launch path: render onboarding INLINE (no redirect, no tabs group)
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
