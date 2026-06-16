/**
 * ButlerAITitle3D
 * ──────────────────────────────────────────────────────────────────
 * Large, professional, 3D "BUTLER AI" wordmark for the home dashboard.
 *
 * Design language: Terminator chrome + matrix red glow.
 *   • Stacked depth layers (7) for true extruded 3D effect
 *   • Chrome → steel → red linear gradient front face
 *   • Red rim back-glow & subtle dark engraved outline
 *   • Industrial corner brackets [ ... ]
 *   • Background scanlines for a HUD feel
 *   • Pulsing underline + framed subtitle (LOCAL AI · PC AUTOMATION · COMMAND CORE)
 *
 * Pure react-native-svg — no external assets, fully responsive.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Animated, Easing, Text } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
  Rect,
  Line,
  G,
  Circle,
} from 'react-native-svg';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

type Props = {
  width?: number;
  accent?: string;
  subtitle?: string;
  status?: string; // small status chip text on right side (optional)
};

const VBW = 660;
const VBH = 200;

export default function ButlerAITitle3D({
  width = 320,
  accent = '#FF2A1F',
  subtitle = 'LOCAL AI · PC AUTOMATION · COMMAND CORE',
  status,
}: Props) {
  const height = (VBH / VBW) * width;

  // ── animated subtle scan-shimmer across the wordmark ─────────────
  const shimmer = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 4200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse, shimmer]);

  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-width, width] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });

  // depth shadow stack (back → front)
  const layers = Array.from({ length: 7 }).map((_, i) => {
    const k = 7 - i;
    return {
      dx: k * 1.4,
      dy: k * 1.6,
      opacity: 0.08 + i * 0.045,
      color: i < 3 ? '#1A0306' : '#5A0E14',
    };
  });

  const text = 'BUTLER AI';

  return (
    <View style={[styles.wrap, { width }]}>
      {/* main 3D wordmark */}
      <View style={{ width, height, overflow: 'hidden' }}>
        <Svg width={width} height={height} viewBox={`0 0 ${VBW} ${VBH}`}>
          <Defs>
            {/* Chrome → steel → red metallic fill */}
            <LinearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="0.14" stopColor="#FFE3DF" stopOpacity="1" />
              <Stop offset="0.34" stopColor="#D9EAF2" stopOpacity="1" />
              <Stop offset="0.55" stopColor="#7C9CB4" stopOpacity="1" />
              <Stop offset="0.78" stopColor="#3C2226" stopOpacity="1" />
              <Stop offset="0.93" stopColor="#FF4A2F" stopOpacity="1" />
              <Stop offset="1" stopColor="#8A0805" stopOpacity="1" />
            </LinearGradient>

            {/* Red rim back glow stroke */}
            <LinearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={accent} stopOpacity="0.85" />
              <Stop offset="0.5" stopColor={accent} stopOpacity="0.55" />
              <Stop offset="1" stopColor={accent} stopOpacity="0.95" />
            </LinearGradient>

            {/* Top thin highlight shine */}
            <LinearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
              <Stop offset="0.18" stopColor="#FFFFFF" stopOpacity="0.0" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.0" />
            </LinearGradient>

            {/* Bracket gradient */}
            <LinearGradient id="bracket" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={accent} stopOpacity="1" />
              <Stop offset="1" stopColor={accent} stopOpacity="0.35" />
            </LinearGradient>

            {/* Underline pulse */}
            <LinearGradient id="under" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={accent} stopOpacity="0" />
              <Stop offset="0.5" stopColor={accent} stopOpacity="1" />
              <Stop offset="1" stopColor={accent} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* faint HUD scanlines */}
          {Array.from({ length: 12 }).map((_, i) => (
            <Line
              key={i}
              x1="46"
              y1={24 + i * 12}
              x2={VBW - 46}
              y2={24 + i * 12}
              stroke={accent}
              strokeOpacity="0.045"
              strokeWidth="1"
            />
          ))}

          {/* Industrial brackets [ ] */}
          <G stroke="url(#bracket)" strokeWidth="3" strokeLinecap="square" fill="none">
            <Line x1="26" y1="38" x2="26" y2="150" />
            <Line x1="26" y1="38" x2="50" y2="38" />
            <Line x1="26" y1="150" x2="50" y2="150" />
            <Line x1={VBW - 26} y1="38" x2={VBW - 26} y2="150" />
            <Line x1={VBW - 26} y1="38" x2={VBW - 50} y2="38" />
            <Line x1={VBW - 26} y1="150" x2={VBW - 50} y2="150" />
          </G>

          {/* bracket dots */}
          <Circle cx="26" cy="94" r="2.4" fill={accent} fillOpacity="0.9" />
          <Circle cx={VBW - 26} cy="94" r="2.4" fill={accent} fillOpacity="0.9" />

          {/* === DEPTH STACK (back → front) ============================ */}
          {layers.map((l, i) => (
            <SvgText
              key={`d${i}`}
              x={VBW / 2 + l.dx}
              y={120 + l.dy}
              fontSize="96"
              fontWeight="900"
              fontFamily={MONO}
              textAnchor="middle"
              fill={l.color}
              fillOpacity={l.opacity}
              letterSpacing="6"
            >
              {text}
            </SvgText>
          ))}

          {/* Soft red back glow stroke */}
          <SvgText
            x={VBW / 2}
            y={120}
            fontSize="96"
            fontWeight="900"
            fontFamily={MONO}
            textAnchor="middle"
            fill="none"
            stroke="url(#rim)"
            strokeWidth="4.5"
            strokeOpacity="0.55"
            letterSpacing="6"
          >
            {text}
          </SvgText>

          {/* Front metallic face */}
          <SvgText
            x={VBW / 2}
            y={120}
            fontSize="96"
            fontWeight="900"
            fontFamily={MONO}
            textAnchor="middle"
            fill="url(#chrome)"
            letterSpacing="6"
          >
            {text}
          </SvgText>

          {/* Engraved dark outline */}
          <SvgText
            x={VBW / 2}
            y={120}
            fontSize="96"
            fontWeight="900"
            fontFamily={MONO}
            textAnchor="middle"
            fill="none"
            stroke="#0A0204"
            strokeOpacity="0.85"
            strokeWidth="0.7"
            letterSpacing="6"
          >
            {text}
          </SvgText>

          {/* Top white shine */}
          <SvgText
            x={VBW / 2}
            y={120}
            fontSize="96"
            fontWeight="900"
            fontFamily={MONO}
            textAnchor="middle"
            fill="url(#shine)"
            letterSpacing="6"
          >
            {text}
          </SvgText>

          {/* Pulsing underline */}
          <Rect x="70" y="162" width={VBW - 140} height="2.4" fill="url(#under)" />
          <Rect x="70" y="167" width={VBW - 140} height="0.8" fill={accent} fillOpacity="0.28" />

          {/* tiny tick marks on underline (industrial gauge feel) */}
          {Array.from({ length: 11 }).map((_, i) => {
            const x = 70 + i * ((VBW - 140) / 10);
            return (
              <Line
                key={`tk${i}`}
                x1={x}
                y1="172"
                x2={x}
                y2={i % 5 === 0 ? 180 : 176}
                stroke={accent}
                strokeOpacity={i % 5 === 0 ? 0.85 : 0.35}
                strokeWidth="1"
              />
            );
          })}
        </Svg>

        {/* animated shimmer overlay (cheap horizontal sheen) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmer,
            { width: width * 0.22, transform: [{ translateX: shimmerX }] },
          ]}
        />
      </View>

      {/* ── SUBTITLE BLOCK (matches title) ───────────────────────── */}
      <View style={styles.subRow}>
        <View style={[styles.subLine, { backgroundColor: accent + '55' }]} />
        <Animated.View
          style={[
            styles.subDot,
            { backgroundColor: accent, shadowColor: accent, opacity: dotOpacity },
          ]}
        />
        <Text style={[styles.subTxt, { color: '#C8E4F0' }]} numberOfLines={1}>
          {subtitle}
        </Text>
        <Animated.View
          style={[
            styles.subDot,
            { backgroundColor: accent, shadowColor: accent, opacity: dotOpacity },
          ]}
        />
        <View style={[styles.subLine, { backgroundColor: accent + '55' }]} />
      </View>

      {status ? (
        <Text style={[styles.statusTxt, { color: accent + 'CC' }]} numberOfLines={1}>
          {status}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },

  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: [{ skewX: '-18deg' }],
  },

  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    paddingHorizontal: 10,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  subLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    maxWidth: 60,
  },
  subDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  subTxt: {
    fontFamily: MONO,
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 2.2,
  },
  statusTxt: {
    marginTop: 4,
    fontFamily: MONO,
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
});
