/**
 * BootCurtain — React-side loading veil shown immediately after the
 * native splash screen hides.
 *
 * Purpose: eliminate ANY possibility of a black/blue gap between
 * native splash dismissal and the first tab render. Even though our
 * splash hand-off is correctly synchronized, a slow device or a
 * deferred route resolution could theoretically show a single black
 * frame. This component covers that frame with branded content.
 *
 * Lifecycle:
 *   • Mounts immediately when RootLayout renders.
 *   • Stays visible for 450 ms (configurable).
 *   • Fades out and unmounts.
 *
 * It renders ONLY native-safe React Native primitives (no SVG, no
 * external fonts, no async assets) so it cannot fail on cold start.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Platform } from 'react-native';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

export default function BootCurtain({ holdMs = 450 }: { holdMs?: number }) {
  const [visible, setVisible] = useState(true);
  const fade = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  // Auto-dismiss after holdMs.
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, holdMs);
    return () => clearTimeout(t);
  }, [fade, holdMs]);

  // Pulsing dot animation.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 600, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  if (!visible) return null;

  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  return (
    <Animated.View pointerEvents="none" style={[styles.root, { opacity: fade }]}>
      {/* BUTLER */}
      <Text style={styles.brandTop}>BUTLER</Text>
      {/* AI */}
      <Text style={styles.brandBottom}>AI</Text>
      {/* Tagline */}
      <View style={styles.line} />
      <View style={styles.tagRow}>
        <Animated.View style={[styles.dot, { opacity: dotOpacity }]} />
        <Text style={styles.tag}>INITIALIZING COMMAND CORE</Text>
        <Animated.View style={[styles.dot, { opacity: dotOpacity }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  brandTop: {
    fontFamily: MONO,
    fontSize: 44,
    fontWeight: '900',
    color: '#E8EAEC',
    letterSpacing: 8,
    textShadowColor: '#FF2A1F',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  brandBottom: {
    fontFamily: MONO,
    fontSize: 44,
    fontWeight: '900',
    color: '#FF2A1F',
    letterSpacing: 12,
    marginTop: -6,
    textShadowColor: '#FF2A1F',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  line: {
    width: 140,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#FF2A1F88',
    marginTop: 14,
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FF2A1F',
  },
  tag: {
    fontFamily: MONO,
    fontSize: 9.5,
    fontWeight: '900',
    color: '#C8E4F0',
    letterSpacing: 2.4,
  },
});
