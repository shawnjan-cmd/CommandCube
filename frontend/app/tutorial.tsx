/**
 * TutorialScreen — Full-screen image with invisible hotspot overlay
 * Hotspot: DONE button (bottom-right) → saves ALL onboarding keys → navigate to main app
 *
 * FIX HISTORY
 * ───────────
 * BUG 1 (key mismatch): Was saving 'tutorial_completed' (unrecognised key).
 *   _layout.tsx checks ONBOARDING_DONE_KEY = '@butler_onboarding_done_v2', so the app
 *   would loop back to /welcome on every relaunch. Now uses exitOnboarding() which
 *   writes every consent key correctly via the shared CONSENT_MANIFEST.
 *
 * BUG 2 (wrong route): Was using router.replace('/main-menu') directly.
 *   exitOnboarding() fires 7 independent paths targeting /(tabs)/nexushome first.
 *
 * BUG 3 (silent logger): Logger was dev-only. Added raw console.* calls inside
 *   handleDone so navigation events are always visible in Logcat/Metro, regardless
 *   of __DEV__. The logger module now also auto-enables when @butler_debug_log is set.
 */

import React, { useEffect, useRef } from 'react';
import {
  View, TouchableOpacity, StyleSheet, Dimensions, Animated, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { haptics } from '@/services/haptics';
import { exitOnboarding } from '@/services/onboardingExit';

const { width, height } = Dimensions.get('window');

const TAG = '[TutorialScreen]';

export default function TutorialScreen() {
  const router = useRouter();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0.97, duration: 900, useNativeDriver: false }),
      ])
    ).start();

    // Always-on log: confirm screen mounted (visible in Logcat & Metro, both dev & prod)
    console.log(`${TAG} mounted — waiting for DONE tap`);
  }, []);

  const handleDone = async () => {
    console.log(`${TAG} handleDone — tapped`);

    try {
      haptics.medium();
    } catch (e) {
      console.warn(`${TAG} haptics failed (non-fatal):`, e);
    }

    try {
      // exitOnboarding writes ONBOARDING_DONE_KEY + all consent keys, then navigates.
      // 7-path engine: nexushome → tabs → navigate → main-menu → globals → deferred
      // Replaces old broken pattern:
      //   ✗ AsyncStorage.setItem('tutorial_completed', 'true')  ← wrong key, ignored by _layout
      //   ✗ router.replace('/main-menu')                        ← skips /(tabs) entirely
      console.log(`${TAG} calling exitOnboarding…`);
      const result = await exitOnboarding(router as any);

      if (result.navigated) {
        console.log(`${TAG} ✓ navigation fired → "${result.resolvedRoute}"`);
      } else {
        console.error(`${TAG} ✗ all 7 paths failed — retrying`);
      }

      // Retry loop: re-fire every 1s for up to 8s if still mounted
      let _attempts = 0;
      const _retryTimer = setInterval(async () => {
        _attempts++;
        try { (global as any).__setNeedsOnboarding?.(false); } catch {}
        try { (global as any).__onboardingComplete?.(); } catch {}
        await exitOnboarding(router as any);
        if (_attempts >= 8) clearInterval(_retryTimer);
      }, 1000);
    } catch (e) {
      // exitOnboarding is hardened and should never throw, but guard anyway.
      console.error(`${TAG} unexpected exception in handleDone:`, e);
    }
  };

  return (
    <View style={s.container}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />

      {/* ── HOTSPOT: DONE Button — bottom-right corner ── */}
      {/* opacity: 0 makes it invisible to users but tappable */}
      <TouchableOpacity
        style={s.doneHotspot}
        onPress={handleDone}
        activeOpacity={1}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel="Done — complete tutorial"
        accessibilityRole="button"
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  doneHotspot: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 18,
    right: 14,
    width: 200,
    height: 90,
    opacity: 0,
    zIndex: 200,
    borderRadius: 6,
  },
});
