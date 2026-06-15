/**
 * Bootstrap route — `/`
 *
 * Reads the canonical onboarding-completion flag from AsyncStorage and
 * redirects to either the onboarding tab (first run) or the home tab
 * (returning user). All routing happens BEFORE `(tabs)` mounts, so the
 * tab navigator mounts ONCE with the correct focused route.
 *
 * ── BLACK-SCREEN PREVENTION (critical) ─────────────────────────────────────
 * Earlier builds rendered an invisible black holder while waiting for
 * AsyncStorage to resolve. If AsyncStorage stalled (cold-start race, hung
 * native bridge), the user saw a true-black screen forever.
 *
 * This version:
 *   • Renders a clearly visible "BUTLER AI / INITIALIZING…" boot panel
 *     with brand color + pulsing dot so the user knows the app IS alive
 *     even if the gate hasn't decided yet.
 *   • Wraps `AsyncStorage.getItem` in `withTimeout(1500ms)` so storage
 *     can never hang us.
 *   • A hard emergency fallback at 3000ms force-sets `target = onboarding`
 *     even if every other safeguard fails.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_DONE_KEY, WELCOME_COMPLETE_KEY } from '@/constants/onboardingKeys';
import { withTimeout } from '@/utils/withTimeout';

const LEGACY_DONE_KEYS = [
  WELCOME_COMPLETE_KEY,        // '@butler_welcome_complete_v1'
  '@nexus_first_launch_v1',    // pre-Butler era
];

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);
  const decidedRef = useRef(false);
  const pulse = useRef(new Animated.Value(0)).current;

  // Pulsing dot so the user can SEE the app is alive even while waiting.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

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
    // VISIBLE boot panel — proves the React tree is alive
    return (
      <View style={styles.root}>
        <View style={styles.panel}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
          <Text style={styles.brand}>BUTLER AI</Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Animated.View style={[styles.dot, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]} />
            <Text style={styles.status}>INITIALIZING…</Text>
          </View>
          <Text style={styles.hint}>v1.0.3 · LOCAL · ZERO CLOUD</Text>
        </View>
      </View>
    );
  }

  return <Redirect href={target as any} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050A12',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#00FFC650',
    backgroundColor: '#0A1A24CC',
    borderRadius: 10,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  cornerTL: { position: 'absolute', top: -2, left: -2, width: 14, height: 14, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#00FFC6' },
  cornerTR: { position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#00FFC6' },
  cornerBL: { position: 'absolute', bottom: -2, left: -2, width: 14, height: 14, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#00FFC6' },
  cornerBR: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#00FFC6' },
  brand: { fontSize: 22, fontWeight: '900', color: '#00FFC6', letterSpacing: 5, fontFamily: MONO },
  divider: { width: 80, height: 2, backgroundColor: '#00FFC6', opacity: 0.5, marginVertical: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#00FFC6' },
  status: { fontSize: 12, color: '#E6FFFA', letterSpacing: 2, fontWeight: '700', fontFamily: MONO },
  hint: { fontSize: 9, color: '#7FE5D6', letterSpacing: 1.4, marginTop: 16, fontFamily: MONO },
});
