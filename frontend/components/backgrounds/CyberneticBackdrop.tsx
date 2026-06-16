/**
 * CyberneticBackdrop — Terminator HUD-style animated backdrop.
 *
 * Uses plain react-native Animated (no Reanimated worklets) so it's
 * bulletproof on web preview, all Android/iOS versions, and Hermes.
 *
 * Visual layers (back → front):
 *   1. Static red CRT grid (faint lattice)
 *   2. Slow sweeping horizontal scan line (top → bottom, ~6s loop)
 *   3. Four corner reticles (target-lock brackets, breathing opacity)
 *   4. Idle status text in bottom-left
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, Animated, Easing } from 'react-native';

const _DIM_W = Dimensions.get('window'); /* native cold-start safe — falls back to standard phone size if 0 */
const SCREEN_W = _DIM_W.width  > 0 ? _DIM_W.width  : 414;
const SCREEN_H = _DIM_W.height > 0 ? _DIM_W.height : 896;

const C = {
  red:     '#FF2A1F',
  redLine: 'rgba(255,42,31,0.18)',
  amber:   '#FFB020',
  text:    '#FF2A1F',
};

const MONO = Platform.OS === 'ios' ? 'Courier' : 'monospace';

interface Props {
  /** Visual intensity 0–1. Default 1. */
  intensity?: number;
  /** Hide the corner reticles. Default false. */
  hideReticles?: boolean;
  /** Hide bottom-left status text. Default false. */
  hideStatus?: boolean;
}

export default function CyberneticBackdrop({ intensity = 1, hideReticles, hideStatus }: Props) {
  const scanY     = useRef(new Animated.Value(-50)).current;
  const reticleOp = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Continuous scan-line sweep (top → bottom, ~6s loop)
    const scan = Animated.loop(
      Animated.timing(scanY, {
        toValue: SCREEN_H + 50,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    scan.start();

    // Reticle breathing (0.3 ↔ 0.7)
    const reticle = Animated.loop(
      Animated.sequence([
        Animated.timing(reticleOp, { toValue: 0.7, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(reticleOp, { toValue: 0.3, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    reticle.start();

    return () => { scan.stop(); reticle.stop(); };
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* 1. Static red CRT grid */}
      <View style={[StyleSheet.absoluteFill, { opacity: 0.55 * intensity }]}>
        {Array.from({ length: 14 }).map((_, i) => (
          <View
            key={`h${i}`}
            style={{
              position: 'absolute',
              left: 0, right: 0,
              top: (SCREEN_H / 14) * i,
              height: 1,
              backgroundColor: C.redLine,
            }}
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={`v${i}`}
            style={{
              position: 'absolute',
              top: 0, bottom: 0,
              left: (SCREEN_W / 8) * i,
              width: 1,
              backgroundColor: C.redLine,
            }}
          />
        ))}
      </View>

      {/* 2. Sweeping scan line */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: C.red,
          opacity: 0.55 * intensity,
          shadowColor: C.red,
          shadowOpacity: 0.9,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          elevation: 14,
          transform: [{ translateY: scanY }],
        }}
      />

      {/* 3. Four corner reticles */}
      {!hideReticles && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: Animated.multiply(reticleOp, intensity) }]}>
          <View style={[s.bracket, { top: 56,    left: 16,  borderTopWidth: 2, borderLeftWidth: 2 }]} />
          <View style={[s.bracket, { top: 56,    right: 16, borderTopWidth: 2, borderRightWidth: 2 }]} />
          <View style={[s.bracket, { bottom: 110, left: 16,  borderBottomWidth: 2, borderLeftWidth: 2 }]} />
          <View style={[s.bracket, { bottom: 110, right: 16, borderBottomWidth: 2, borderRightWidth: 2 }]} />
        </Animated.View>
      )}

      {/* 4. Bottom-left HUD status text */}
      {!hideStatus && (
        <View style={s.statusBox} pointerEvents="none">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={s.dot} />
            <Text style={s.statusText}>BUTLER-CORE · VISION SYS v2.1</Text>
          </View>
          <Text style={[s.statusText, { fontSize: 8, opacity: 0.6, marginTop: 2 }]}>
            SCAN: ACTIVE · SENTRY: ARMED · UPLINK: LAN-ONLY
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bracket:    { position: 'absolute', width: 22, height: 22, borderColor: C.red },
  statusBox:  { position: 'absolute', left: 14, bottom: 64 },
  dot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: C.red, shadowColor: C.red, shadowOpacity: 1, shadowRadius: 4, elevation: 4 },
  statusText: { color: C.text, fontSize: 9, fontFamily: MONO, fontWeight: '900', letterSpacing: 1.2, opacity: 0.85 },
});
