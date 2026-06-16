/**
 * HomeSectionDivider.tsx — NEXUS v5 section header
 * ──────────────────────────────────────────────────────────────────
 * Anatomy (matches `nexus-ultimate-v5` mockup):
 *
 *   ●  LABEL TEXT  ─────────────────────────────  [ BADGE ]
 *
 * Left: small pulsing dot.
 * Center: uppercase IBM Plex Mono label, 3px letter spacing.
 * Right: gradient hairline → tiny optional badge pill (count/status).
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const MONO: any = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const C = {
  accent:    '#3b82f6',
  surface2:  '#141823',
  border:    '#1e2538',
  border2:   '#252d42',
  textDim:   '#4a5270',
  textFaint: '#2a3050',
};

interface Props {
  /** Section label — rendered uppercase. */
  label: string;
  /** Override the dot/divider accent color. */
  accentColor?: string;
  /** Optional short badge at the far right (e.g. "6/6", "LIVE", "12 NEW"). */
  badge?: string;
  /** Set to false to skip the breathing animation on the dot. */
  pulse?: boolean;
}

export default function HomeSectionDivider({
  label, accentColor = C.accent, badge, pulse = true,
}: Props) {
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 1400, useNativeDriver: true }),
      Animated.timing(breath, { toValue: 0, duration: 1400, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const dotOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const dotScale   = breath.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.05] });

  return (
    <View style={s.wrap}>
      {/* Left: pulsing dot */}
      <Animated.View style={[
        s.dot,
        { backgroundColor: accentColor, opacity: dotOpacity, transform: [{ scale: dotScale }] },
        Platform.OS === 'ios' ? { shadowColor: accentColor, shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } } : null,
      ]} />

      {/* Label */}
      <Text style={s.label} numberOfLines={1}>{label.toUpperCase()}</Text>

      {/* Gradient hairline */}
      <LinearGradient
        colors={[C.border2, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={s.line}
      />

      {/* Optional right badge */}
      {badge ? (
        <View style={[s.badge, { borderColor: C.border }]}>
          <Text style={s.badgeTxt} numberOfLines={1}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 6,
    marginTop: 16,
    marginBottom: 10,
    height: 18,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
  },
  label: {
    fontSize: 9.5,
    fontWeight: '700',
    fontFamily: MONO,
    letterSpacing: 2.6,
    color: C.textDim,
    flexShrink: 0,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth + 0.5,
    marginHorizontal: 4,
  },
  badge: {
    backgroundColor: C.surface2,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeTxt: {
    fontSize: 8.5,
    fontWeight: '700',
    fontFamily: MONO,
    letterSpacing: 1.2,
    color: C.textDim,
  },
});
