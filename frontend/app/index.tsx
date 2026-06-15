/**
 * Bootstrap route — `/`
 *
 * Reads the canonical onboarding-completion flag from AsyncStorage and
 * redirects to either the onboarding tab (first run) or the home tab
 * (returning user). All routing happens BEFORE `(tabs)` mounts, so the
 * tab navigator mounts ONCE with the correct focused route.
 *
 * The render-while-deciding holder is just a #050A12 View — the native
 * splash (also #050A12) is still up on top of it via the canonical
 * `preventAutoHideAsync` + `onLayout` → `hideAsync` pattern in
 * app/_layout.tsx, so the user never sees this bare View.
 *
 * Auto-migration: if the canonical key is unset but a legacy completion
 * key is truthy, mirror it forward and skip onboarding.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_DONE_KEY, WELCOME_COMPLETE_KEY } from '@/constants/onboardingKeys';
import { withTimeout } from '@/utils/withTimeout';

const LEGACY_DONE_KEYS = [
  WELCOME_COMPLETE_KEY,        // '@butler_welcome_complete_v1'
  '@nexus_first_launch_v1',    // pre-Butler era
];

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);
  const decidedRef = useRef(false);

  useEffect(() => {
    // Emergency hard fallback — if for ANY reason we never decide a target
    // within 3 seconds, force-redirect to onboarding so the user is never
    // stuck on the boot screen indefinitely.
    const emergency = setTimeout(() => {
      if (decidedRef.current) return;
      decidedRef.current = true;
      console.warn('[Index] gate timed out after 3s — emergency redirect to onboarding');
      setTarget('/(tabs)/onboarding');
    }, 3000);

    (async () => {
      try {
        // 1. Read canonical key (with timeout — cannot hang)
        let v = await withTimeout(
          AsyncStorage.getItem(ONBOARDING_DONE_KEY),
          1500,
          'AsyncStorage onboarding flag'
        );

        // 1a. Self-heal corrupted values
        const VALID_VALUES: any[] = ['true', 'false', '1', '0', '', null, undefined];
        if (!VALID_VALUES.includes(v as any)) {
          console.warn('[Index] corrupted onboarding flag detected, clearing:', JSON.stringify(v));
          AsyncStorage.removeItem(ONBOARDING_DONE_KEY).catch(() => {});
          v = null;
        }
        let done = v === 'true' || v === '1';

        // 2. Migrate legacy flags if canonical is unset
        if (!done) {
          for (const lk of LEGACY_DONE_KEYS) {
            const lv = await withTimeout(
              AsyncStorage.getItem(lk),
              1000,
              `AsyncStorage legacy ${lk}`
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
        setTarget(done ? '/(tabs)/nexushome' : '/(tabs)/onboarding');
      } catch (e) {
        console.warn('[Index] gate read failed:', e);
        if (decidedRef.current) return;
        decidedRef.current = true;
        clearTimeout(emergency);
        setTarget('/(tabs)/onboarding');
      }
    })();

    return () => clearTimeout(emergency);
  }, []);

  if (target === null) {
    // Bare holder. The native splash (preventAutoHideAsync'd until the root
    // View's onLayout fires) is still showing on top of this — the user
    // never sees this color.
    return <View style={{ flex: 1, backgroundColor: '#050A12' }} />;
  }

  return <Redirect href={target as any} />;
}
