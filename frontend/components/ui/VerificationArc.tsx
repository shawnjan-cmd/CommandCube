/**
 * ⚡ VERIFICATION ARC — Crimson & Cerulean data filaments
 * Non-physical arc that twists and rotates above running script cards
 * Butler AI verification arc — data filament animation
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Platform, StyleSheet } from 'react-native';

interface VerificationArcProps {
  /** Width of the card it wraps */
  width?: number;
  /** Visibility */
  visible: boolean;
  /** Height above card top */
  height?: number;
}

// Single rotating filament
function Filament({
  color, radius, speed, thickness, phase, dir = 1,
}: {
  color: string; radius: number; speed: number; thickness: number; phase: number; dir?: 1 | -1;
}) {
  const rot = useRef(new Animated.Value(0)).current;
  const op  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(rot, { toValue: dir, duration: speed, useNativeDriver: false })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(op, { toValue: 1, duration: speed * 0.28, useNativeDriver: false }),
      Animated.timing(op, { toValue: 0.25, duration: speed * 0.44, useNativeDriver: false }),
      Animated.timing(op, { toValue: 0.9, duration: speed * 0.28, useNativeDriver: false }),
    ])).start();
  }, []);

  const D = radius * 2;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: D, height: D,
        borderRadius: D / 2,
        borderWidth: thickness,
        borderColor: color,
        borderStyle: 'dashed',
        opacity: op,
        top: -(radius),
        left: '50%',
        marginLeft: -radius,
        transform: [{
          rotate: rot.interpolate({
            inputRange: [0, dir],
            outputRange: ['0deg', `${dir * 360}deg`],
          }),
        }],
        ...Platform.select({
          ios: {
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.85,
            shadowRadius: 6,
          },
          android: {},
        }),
      }}
    />
  );
}

// Flowing dot on arc
function ArcDot({ color, radius, speed, delay, dir = 1 }: {
  color: string; radius: number; speed: number; delay: number; dir?: 1 | -1;
}) {
  const angle = useRef(new Animated.Value(0)).current;
  const op    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(angle, { toValue: dir, duration: speed, useNativeDriver: false }),
        Animated.sequence([
          Animated.timing(op, { toValue: 1, duration: 150, useNativeDriver: false }),
          Animated.timing(op, { toValue: 0.7, duration: speed - 300, useNativeDriver: false }),
          Animated.timing(op, { toValue: 0, duration: 150, useNativeDriver: false }),
        ]),
      ]),
    ])).start();
  }, []);

  const cx = angle.interpolate({
    inputRange: [0, dir],
    outputRange: [0, dir * 360],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: 5, height: 5, borderRadius: 3,
        backgroundColor: color,
        opacity: op,
        top: -(radius + 2.5),
        left: '50%',
        marginLeft: -2.5,
        transform: [
          { rotate: cx.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) },
          { translateY: -radius },
        ],
        ...Platform.select({
          ios: {
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 5,
          },
          android: {},
        }),
      }}
    />
  );
}

// Arc flash on start
function ArcFlash({ trigger }: { trigger: boolean }) {
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (trigger) {
      op.setValue(0);
      Animated.sequence([
        Animated.timing(op, { toValue: 0.55, duration: 60, useNativeDriver: false }),
        Animated.timing(op, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]).start();
    }
  }, [trigger]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -50, left: -20, right: -20, height: 50,
        backgroundColor: '#00A8FF',
        opacity: op,
        borderRadius: 30,
      }}
    />
  );
}

export default function VerificationArc({ visible, width = 300, height = 56 }: VerificationArcProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 300 : 500,
      useNativeDriver: false,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { opacity: fadeAnim, overflow: 'visible' },
      ]}
    >
      {/* Crimson outer arc */}
      <Filament color="#FF2200" radius={width * 0.46} speed={3200} thickness={1.5} phase={0} dir={1} />
      {/* Cerulean mid arc */}
      <Filament color="#00A8FF" radius={width * 0.38} speed={2400} thickness={1} phase={0.3} dir={-1} />
      {/* Crimson inner arc */}
      <Filament color="#FF5500" radius={width * 0.28} speed={1800} thickness={2} phase={0.6} dir={1} />
      {/* Cerulean thin outer */}
      <Filament color="#0066CC" radius={width * 0.52} speed={4400} thickness={1} phase={0.9} dir={-1} />

      {/* Crimson flowing dots */}
      <ArcDot color="#FF2200" radius={width * 0.46} speed={2800} delay={0} dir={1} />
      <ArcDot color="#FF5500" radius={width * 0.46} speed={2800} delay={900} dir={1} />
      {/* Cerulean flowing dots */}
      <ArcDot color="#00D4FF" radius={width * 0.38} speed={2100} delay={300} dir={-1} />
      <ArcDot color="#0099CC" radius={width * 0.38} speed={2100} delay={1050} dir={-1} />
      {/* Inner fast crimson */}
      <ArcDot color="#FF3300" radius={width * 0.28} speed={1600} delay={150} dir={1} />

      {/* Bottom glow line — where arc meets card surface */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 0, left: 10, right: 10,
          height: 2,
          backgroundColor: '#00A8FF',
          borderRadius: 2,
          opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }),
          ...Platform.select({
            ios: { shadowColor: '#00A8FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8 },
            android: {},
          }),
        }}
      />

      <ArcFlash trigger={visible} />
    </Animated.View>
  );
}
