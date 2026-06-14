/**
 * useScreenTransition.ts
 * ──────────────────────────────────────────────────────────────────
 * Lightweight entrance animation hook. Call at the top of any screen
 * component and apply the returned `style` to the root View. The
 * screen will fade up from translateY:24 over 360ms.
 *
 * Usage:
 *   const t = useScreenTransition();
 *   return <Animated.View style={[styles.root, t.style]}>…</Animated.View>;
 *
 * Pass an optional delay to stagger animations across child sections.
 */
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export function useScreenTransition(delay = 0) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 360, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 360, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return {
    opacity,
    translateY,
    style: { opacity, transform: [{ translateY }] } as any,
  };
}
