/**
 * NexusBackground — Shared full-screen animated cyberpunk background
 * Features: animated hex grid, floating particles, radial glows, scan line sweep
 * Zero Math.random() calls after mount — all deterministic for performance.
 * Use: <NexusBackground /> as first child of any screen root View.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, Platform } from 'react-native';
import Svg, { Polygon, Circle, Line, Defs, RadialGradient, Stop } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// Deterministic particle positions (no Math.random on render)
const PARTICLES = [
  { x: 0.12, y: 0.08, r: 1.5, col: '#00E5FF', dur: 2800 },
  { x: 0.88, y: 0.15, r: 2.0, col: '#CC00FF', dur: 3400 },
  { x: 0.45, y: 0.22, r: 1.2, col: '#00FF88', dur: 2200 },
  { x: 0.72, y: 0.38, r: 1.8, col: '#FFB020', dur: 3100 },
  { x: 0.18, y: 0.55, r: 1.4, col: '#00E5FF', dur: 2600 },
  { x: 0.91, y: 0.62, r: 1.0, col: '#CC00FF', dur: 3700 },
  { x: 0.33, y: 0.75, r: 1.6, col: '#00FF88', dur: 2900 },
  { x: 0.60, y: 0.88, r: 1.3, col: '#4499FF', dur: 2400 },
  { x: 0.05, y: 0.91, r: 1.7, col: '#FFB020', dur: 3300 },
  { x: 0.78, y: 0.94, r: 1.1, col: '#00E5FF', dur: 2700 },
  { x: 0.55, y: 0.48, r: 1.9, col: '#CC00FF', dur: 3600 },
  { x: 0.25, y: 0.33, r: 1.3, col: '#00FF88', dur: 2500 },
];

function AnimatedParticle({ x, y, r, col, dur }: typeof PARTICLES[0]) {
  const opacity = useRef(new Animated.Value(0.15)).current;
  const scale   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.9,  duration: dur,       useNativeDriver: true }),
          Animated.timing(scale,   { toValue: 1.8,  duration: dur,       useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.15, duration: dur * 0.8, useNativeDriver: true }),
          Animated.timing(scale,   { toValue: 1.0,  duration: dur * 0.8, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      left: x * W - r,
      top:  y * H - r,
      width: r * 2,
      height: r * 2,
      borderRadius: r,
      backgroundColor: col,
      opacity,
      transform: [{ scale }],
      ...(Platform.OS === 'ios'
        ? { shadowColor: col, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: r * 4 }
        : {}),
    }} />
  );
}

// Animated horizontal scan line sweep
function ScanSweep({ color = 'rgba(0,229,255,0.06)' }: { color?: string }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 6000, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 0,    useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0, right: 0,
        height: 2,
        backgroundColor: color,
        transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, H] }) }],
        ...(Platform.OS === 'ios'
          ? { shadowColor: '#00E5FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8 }
          : {}),
      }}
    />
  );
}

// Static hex grid via SVG (cheap — rendered once)
function HexGrid({ opacity = 0.025 }: { opacity?: number }) {
  const hexW = 48;
  const hexH = hexW * Math.sqrt(3) / 2;
  const cols = Math.ceil(W / hexW) + 1;
  const rows = Math.ceil(H / hexH) + 1;

  const hexPath = (cx: number, cy: number) => {
    const r = hexW / 2 - 1;
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 180) * (60 * i - 30);
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    });
    return pts.join(' ');
  };

  const hexes: { pts: string; key: string }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offset = row % 2 === 0 ? 0 : hexW / 2;
      const cx = col * hexW + offset;
      const cy = row * hexH * 0.85;
      hexes.push({ pts: hexPath(cx, cy), key: `${row}-${col}` });
    }
  }

  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
      {hexes.map(h => (
        <Polygon key={h.key} points={h.pts} fill="none" stroke="#00E5FF" strokeWidth={0.5} opacity={opacity} />
      ))}
    </Svg>
  );
}

// Corner HUD brackets
function HUDCorners({ color = 'rgba(0,229,255,0.25)', size = 28, thickness = 1.5 }: {
  color?: string; size?: number; thickness?: number;
}) {
  return (
    <>
      <View style={{ position:'absolute', top:0,    left:0,  width:size, height:size, borderTopWidth:thickness,    borderLeftWidth:thickness,  borderColor:color }} />
      <View style={{ position:'absolute', top:0,    right:0, width:size, height:size, borderTopWidth:thickness,    borderRightWidth:thickness, borderColor:color }} />
      <View style={{ position:'absolute', bottom:0, left:0,  width:size, height:size, borderBottomWidth:thickness, borderLeftWidth:thickness,  borderColor:color }} />
      <View style={{ position:'absolute', bottom:0, right:0, width:size, height:size, borderBottomWidth:thickness, borderRightWidth:thickness, borderColor:color }} />
    </>
  );
}

interface NexusBackgroundProps {
  /** Dominant glow color — default cyan */
  glowColor?: string;
  /** Secondary glow color — default purple */
  glowColor2?: string;
  /** Hex grid opacity — default 0.022 */
  hexOpacity?: number;
  /** Show floating particles — default true */
  particles?: boolean;
  /** Show scan sweep — default true */
  sweep?: boolean;
  /** Show HUD corner brackets — default false */
  corners?: boolean;
  /** Extra radial glow in top-right — optional */
  accentGlow?: string;
}

export default function NexusBackground({
  glowColor  = '#00E5FF',
  glowColor2 = '#CC00FF',
  hexOpacity = 0.022,
  particles  = true,
  sweep      = true,
  corners    = false,
  accentGlow,
}: NexusBackgroundProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Base background */}
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#000003' }} />

      {/* Radial glows */}
      <View style={{
        position: 'absolute', top: -120, left: -80,
        width: 320, height: 320, borderRadius: 160,
        backgroundColor: glowColor2, opacity: 0.10,
      }} />
      <View style={{
        position: 'absolute', top: -80, right: -100,
        width: 280, height: 280, borderRadius: 140,
        backgroundColor: glowColor, opacity: 0.08,
      }} />
      <View style={{
        position: 'absolute', bottom: H * 0.25, left: -60,
        width: 240, height: 240, borderRadius: 120,
        backgroundColor: '#FFB020', opacity: 0.05,
      }} />
      <View style={{
        position: 'absolute', bottom: 0, right: -60,
        width: 300, height: 300, borderRadius: 150,
        backgroundColor: glowColor, opacity: 0.06,
      }} />
      {accentGlow && (
        <View style={{
          position: 'absolute', top: H * 0.4, right: -40,
          width: 200, height: 200, borderRadius: 100,
          backgroundColor: accentGlow, opacity: 0.08,
        }} />
      )}

      {/* Hex grid */}
      <HexGrid opacity={hexOpacity} />

      {/* Fine scan lines */}
      {Array.from({ length: 18 }).map((_, i) => (
        <View key={i} style={{
          position: 'absolute', left: 0, right: 0,
          top: `${(i + 1) * 5.5}%` as any,
          height: StyleSheet.hairlineWidth,
          backgroundColor: `rgba(0,229,255,${hexOpacity * 1.2})`,
        }} />
      ))}

      {/* Vertical faint lines */}
      {[15, 30, 50, 70, 85].map((p, i) => (
        <View key={`v${i}`} style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${p}%` as any,
          width: StyleSheet.hairlineWidth,
          backgroundColor: `rgba(0,229,255,${hexOpacity * 0.8})`,
        }} />
      ))}

      {/* Sweep */}
      {sweep && <ScanSweep color={`rgba(0,229,255,0.07)`} />}

      {/* Particles */}
      {particles && PARTICLES.map((p, i) => <AnimatedParticle key={i} {...p} />)}

      {/* HUD corners */}
      {corners && <HUDCorners />}
    </View>
  );
}
