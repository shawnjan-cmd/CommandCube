/**
 * Bootstrap route — `/`
 *
 * Reads the canonical onboarding-completion flag from AsyncStorage and
 * redirects to either the onboarding tab (first run) or the home tab
 * (returning user). All routing happens BEFORE `(tabs)` mounts, so the
 * tab navigator mounts ONCE with the correct focused route — no
 * post-mount redirects, no stale screen on the back stack.
 *
 * Idea-1/Idea-2 hardening (from external diagnostic):
 *   • Uses the single canonical key `ONBOARDING_DONE_KEY` (no string literals)
 *   • Migrates legacy flags (`@butler_welcome_complete_v1`, `@nexus_first_launch_v1`)
 *     so users who completed onboarding on previous builds don't see it again
 *   • All redirect paths use the explicit `/(tabs)/...` group prefix
 *   • Bulletproof try/catch — a corrupted AsyncStorage cannot black-screen us
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_DONE_KEY, WELCOME_COMPLETE_KEY } from '@/constants/onboardingKeys';

// Legacy keys that older builds used to flag completion. Treated as truthy
// proxies for the canonical key during one-time migration.
const LEGACY_DONE_KEYS = [
  WELCOME_COMPLETE_KEY,        // '@butler_welcome_complete_v1'
  '@nexus_first_launch_v1',    // pre-Butler era
];

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 1. Read canonical key
        let v = await AsyncStorage.getItem(ONBOARDING_DONE_KEY).catch(() => null);
        let done = v === 'true' || v === '1';

        // 2. If canonical missing, check legacy keys and migrate forward.
        //    This prevents the "stuck on onboarding after update" foot-gun
        //    flagged by the diagnostic — users who already finished onboarding
        //    on v1.0.0 must not be sent through it again on v1.0.2.
        if (!done) {
          for (const lk of LEGACY_DONE_KEYS) {
            try {
              const lv = await AsyncStorage.getItem(lk).catch(() => null);
              if (lv === 'true' || lv === '1') {
                done = true;
                // Mirror to canonical so subsequent boots are instant.
                AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true').catch(() => {});
                break;
              }
            } catch {}
          }
        }

        setTarget(done ? '/(tabs)/nexushome' : '/(tabs)/onboarding');
      } catch (e) {
        // If AsyncStorage itself blew up (extremely rare — typically only on
        // first-ever boot before native module is ready), default to
        // onboarding so the user can complete it and we capture state fresh.
        console.warn('[Index] gate read failed:', e);
        setTarget('/(tabs)/onboarding');
      }
    })();
  }, []);

  if (target === null) {
    // Minimal black holder while AsyncStorage resolves. The native splash
    // is still up over this anyway — user sees the splash, not black.
    return <View style={{ flex: 1, backgroundColor: '#050505' }} />;
  }
  return <Redirect href={target as any} />;
}
