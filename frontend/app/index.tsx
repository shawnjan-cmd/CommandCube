/**
 * Butler AI — Root Boot Route  (`/`)
 * ──────────────────────────────────────────────────────────────────
 * Single source of truth for first-launch routing.
 *
 *   • Reads `@butler_onboarding_done_v2` from AsyncStorage.
 *   • If unset / false  → <Redirect href="/(tabs)/onboarding" />  (FIRST LAUNCH)
 *   • If true           → <Redirect href="/(tabs)/nexushome"  />  (RETURNING)
 *
 * Why this is BULLETPROOF (after 20 failed APK builds):
 *   ✓ No inline OnboardingOverlay — eliminates the overlay→tab handoff
 *     race that was crashing the cold-start path. Both destinations are
 *     siblings under the SAME tab navigator → pure tab-to-tab switch.
 *   ✓ AsyncStorage read is wrapped in Promise.race() with a 1500ms
 *     timeout. If storage stalls (rare on cold start), we default to
 *     onboarding rather than letting the user stare at a blank screen.
 *   ✓ While deciding, we render a dark-navy `<View>` matching the
 *     splash + app background — no white flash, no "blue screen".
 *   ✓ All paths are SYNC after the first render; no setTimeout chains,
 *     no nested setState. Once `target` is set, <Redirect> handles
 *     the navigation atomically.
 *   ✓ `cancelled` guard prevents setState after unmount in the unlikely
 *     event the component is torn down during the 1.5s window.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_DONE_KEY } from '@/constants/onboardingKeys';

// Constants — avoid magic numbers / strings scattered through the file.
const READ_TIMEOUT_MS = 1500;
const BG = '#050A12'; // matches app background + splash background

type Target = '/(tabs)/onboarding' | '/(tabs)/nexushome';

export default function Index() {
  const [target, setTarget] = useState<Target | null>(null);

  useEffect(() => {
    let cancelled = false;

    const decide = async () => {
      let isDone = false;
      try {
        const v = await Promise.race<string | null>([
          AsyncStorage.getItem(ONBOARDING_DONE_KEY),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), READ_TIMEOUT_MS)),
        ]);
        isDone = v === 'true' || v === '1';
      } catch {
        // Storage error → safest default = show onboarding.
        isDone = false;
      }

      if (cancelled) return;
      setTarget(isDone ? '/(tabs)/nexushome' : '/(tabs)/onboarding');
    };

    decide();
    return () => {
      cancelled = true;
    };
  }, []);

  // While deciding — solid background, no flicker. Matches splash + app bg.
  if (!target) {
    return <View style={{ flex: 1, backgroundColor: BG }} />;
  }

  return <Redirect href={target as any} />;
}
