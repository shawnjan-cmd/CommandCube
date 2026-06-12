/**
 * ⚡ PAGE BACKGROUNDS — Unique animated circuit/particle backgrounds per page
 * Each page gets a distinct visual identity while matching the teal cyberpunk theme
 */

import React, { useRef, useEffect, memo } from 'react';
import { View, StyleSheet, Platform, Animated, Dimensions } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');
const TEAL = '#FF2A1F';
const TEAL_DIM = '#002233';

// ─── SCRIPTS PAGE — Matrix rain columns ────────────────────────────
export const ScriptsBackground = memo(function ScriptsBackground() {
  const cols = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      x: (i / 8) * SW + Math.random() * (SW / 8),
      anim: new Animated.Value(0),
      speed: 2400 + Math.random() * 2000,
      delay: i * 280,
      opacity: 0.04 + Math.random() * 0.05,
    }))
  ).current;

  useEffect(() => {
    cols.forEach(col => {
      const loop = () => {
        col.anim.setValue(0);
        Animated.sequence([
          Animated.delay(col.delay),
          Animated.timing(col.anim, { toValue: 1, duration: col.speed, useNativeDriver: false }),
        ]).start(() => loop());
      };
      loop();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Dark base */}
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#050505' }} />
      {/* Horizontal grid lines */}
      {Array.from({ length: 18 }).map((_, i) => (
        <View key={`h${i}`} style={{
          position: 'absolute', left: 0, right: 0, top: i * 50, height: 1,
          backgroundColor: i % 4 === 0 ? `rgba(255,42,31,0.06)` : `rgba(216,36,26,0.02)`,
        }} />
      ))}
      {/* Vertical scan columns */}
      {cols.map((col, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: col.x, top: 0, width: 1.5, height: '100%',
          backgroundColor: TEAL,
          opacity: col.opacity,
        }} />
      ))}
      {/* Bottom right circuit decoration */}
      <View style={{ position: 'absolute', bottom: 200, right: 0, width: 48, opacity: 0.06 }}>
        {[0, 20, 40, 60, 80, 100].map((y, i) => (
          <View key={i} style={{ position: 'absolute', top: y, right: 0, width: i % 2 === 0 ? 40 : 28, height: 1.5, backgroundColor: TEAL }} />
        ))}
      </View>
    </View>
  );
});

// ─── SETTINGS PAGE — Hexagonal grid background ─────────────────────
export const SettingsBackground2 = memo(function SettingsBackground2() {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.8, duration: 3000, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.3, duration: 3000, useNativeDriver: false }),
    ])).start();
  }, []);

  const hexPositions = [
    { x: 20, y: 80 }, { x: 60, y: 160 }, { x: SW - 60, y: 120 }, { x: SW - 30, y: 280 },
    { x: 40, y: 320 }, { x: SW / 2, y: 200 }, { x: 80, y: 500 }, { x: SW - 80, y: 450 },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#0E0F12' }} />
      {/* Hex grid shapes */}
      {hexPositions.map((pos, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: pos.x - 14, top: pos.y - 14,
          width: 28, height: 28,
          borderWidth: 1, borderColor: TEAL,
          borderRadius: 4,
          transform: [{ rotate: '45deg' }],
          opacity: pulse.interpolate({ inputRange: [0.3, 0.8], outputRange: [0.04 + (i % 3) * 0.02, 0.10 + (i % 3) * 0.03] }),
        }} />
      ))}
      {/* Cross-hatch lines */}
      {Array.from({ length: 10 }).map((_, i) => (
        <View key={`d${i}`} style={{
          position: 'absolute', left: 0, right: 0, top: 80 + i * 80, height: 1,
          backgroundColor: `rgba(255,42,31,0.04)`,
        }} />
      ))}
      {/* Right edge circuit */}
      <View style={{ position: 'absolute', right: 0, top: 100, width: 3, height: 200, backgroundColor: TEAL, opacity: 0.08 }} />
      <View style={{ position: 'absolute', right: 0, top: 400, width: 3, height: 150, backgroundColor: TEAL, opacity: 0.06 }} />
    </View>
  );
});

// ─── BUTLER AI PAGE — Neural network node background ──────────────
export const ButlerBackground = memo(function ButlerBackground() {
  const nodes = useRef(
    Array.from({ length: 10 }, (_, i) => ({
      x: Math.random() * SW,
      y: Math.random() * SH * 0.6 + 150,
      pulse: new Animated.Value(0.2 + Math.random() * 0.3),
      size: 4 + Math.random() * 6,
    }))
  ).current;

  useEffect(() => {
    nodes.forEach((n, i) => {
      Animated.loop(Animated.sequence([
        Animated.delay(i * 300),
        Animated.timing(n.pulse, { toValue: 0.9, duration: 1800, useNativeDriver: false }),
        Animated.timing(n.pulse, { toValue: 0.15, duration: 1800, useNativeDriver: false }),
      ])).start();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#050505' }} />
      {/* Diagonal scan lines */}
      {Array.from({ length: 20 }).map((_, i) => (
        <View key={i} style={{
          position: 'absolute', left: 0, right: 0,
          top: i * 45, height: 1,
          backgroundColor: `rgba(255,42,31,${i % 5 === 0 ? 0.06 : 0.02})`,
        }} />
      ))}
      {/* Neural nodes */}
      {nodes.map((n, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: n.x - n.size / 2, top: n.y - n.size / 2,
          width: n.size, height: n.size, borderRadius: n.size / 2,
          backgroundColor: i % 3 === 0 ? '#FF2A1F' : i % 3 === 1 ? '#44FF88' : '#FF6A1F',
          opacity: n.pulse,
        }} />
      ))}
    </View>
  );
});

// ─── KNOWLEDGE PAGE — Brain wave / data flow background ───────────
export const KnowledgeBackground = memo(function KnowledgeBackground() {
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(wave, { toValue: 1, duration: 4000, useNativeDriver: false })).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#050505' }} />
      {/* Amber horizontal data streams */}
      {[80, 200, 380, 560, 740].map((y, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: wave.interpolate({
            inputRange: [0, 1],
            outputRange: [i % 2 === 0 ? -SW : 0, i % 2 === 0 ? 0 : -SW],
          }),
          top: y, height: 1.5, width: SW * 1.5,
          backgroundColor: `rgba(255,140,0,${0.04 + (i % 3) * 0.02})`,
        }} />
      ))}
      {/* Amber node dots scatter */}
      {[
        { x: 30, y: 300 }, { x: SW - 30, y: 200 }, { x: SW / 2, y: 400 },
        { x: 60, y: 550 }, { x: SW - 50, y: 600 },
      ].map((pos, i) => (
        <View key={`n${i}`} style={{
          position: 'absolute', left: pos.x - 4, top: pos.y - 4,
          width: 8, height: 8, borderRadius: 4,
          borderWidth: 1.5, borderColor: `rgba(255,140,0,0.12)`,
        }} />
      ))}
    </View>
  );
});

// ─── FILE SHARE PAGE — Upload arrow stream background ─────────────
export const FileShareBackground = memo(function FileShareBackground() {
  const flows = useRef(
    Array.from({ length: 5 }, (_, i) => ({
      anim: new Animated.Value(0),
      x: (SW / 5) * i + SW / 10,
      delay: i * 400,
    }))
  ).current;

  useEffect(() => {
    flows.forEach(f => {
      const loop = () => {
        f.anim.setValue(0);
        Animated.sequence([
          Animated.delay(f.delay),
          Animated.timing(f.anim, { toValue: 1, duration: 2800, useNativeDriver: false }),
        ]).start(() => loop());
      };
      loop();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#050505' }} />
      {/* Teal-green grid */}
      {Array.from({ length: 12 }).map((_, i) => (
        <View key={i} style={{
          position: 'absolute', left: 0, right: 0,
          top: i * 70, height: 1,
          backgroundColor: `rgba(0,200,120,0.04)`,
        }} />
      ))}
      {/* Moving upload arrows */}
      {flows.map((f, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: f.x - 6, width: 12, height: 12,
          bottom: f.anim.interpolate({ inputRange: [0, 1], outputRange: [100, SH] }),
          opacity: f.anim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.15, 0.15, 0] }),
          alignItems: 'center',
        }}>
          <View style={{ width: 1.5, height: 8, backgroundColor: '#FF2A1F' }} />
          <View style={{ width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 5, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#FF2A1F', marginTop: -1 }} />
        </Animated.View>
      ))}
    </View>
  );
});

// ─── TOOLS PAGE — Gear mechanism background ───────────────────────
export const ToolsBackground = memo(function ToolsBackground() {
  const gear1 = useRef(new Animated.Value(0)).current;
  const gear2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(gear1, { toValue: 1, duration: 8000, useNativeDriver: false })).start();
    Animated.loop(Animated.timing(gear2, { toValue: -1, duration: 6000, useNativeDriver: false })).start();
  }, []);

  const rot1 = gear1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rot2 = gear2.interpolate({ inputRange: [-1, 0], outputRange: ['-360deg', '0deg'] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#050505' }} />
      {/* Large gear watermark top-right */}
      <Animated.View style={{
        position: 'absolute', top: 60, right: -40, width: 100, height: 100,
        borderRadius: 50, borderWidth: 4, borderColor: `rgba(255,42,31,0.05)`,
        alignItems: 'center', justifyContent: 'center',
        transform: [{ rotate: rot1 }],
      }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={{
            position: 'absolute', width: 12, height: 16, backgroundColor: `rgba(255,42,31,0.05)`,
            borderRadius: 2, transform: [{ rotate: `${i * 45}deg` }, { translateY: -52 }],
          }} />
        ))}
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `rgba(255,42,31,0.04)` }} />
      </Animated.View>
      {/* Small gear bottom-left */}
      <Animated.View style={{
        position: 'absolute', bottom: 300, left: -20, width: 60, height: 60,
        borderRadius: 30, borderWidth: 3, borderColor: `rgba(255,42,31,0.04)`,
        alignItems: 'center', justifyContent: 'center',
        transform: [{ rotate: rot2 }],
      }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={{
            position: 'absolute', width: 8, height: 10, backgroundColor: `rgba(255,42,31,0.04)`,
            borderRadius: 1, transform: [{ rotate: `${i * 60}deg` }, { translateY: -32 }],
          }} />
        ))}
      </Animated.View>
      {/* Grid lines */}
      {Array.from({ length: 10 }).map((_, i) => (
        <View key={`g${i}`} style={{
          position: 'absolute', left: 0, right: 0, top: i * 80, height: 1,
          backgroundColor: `rgba(216,36,26,0.03)`,
        }} />
      ))}
    </View>
  );
});

// ─── COSMETICS PAGE — Prismatic color wave background ─────────────
export const CosmeticsBackground = memo(function CosmeticsBackground() {
  const wave = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(wave, { toValue: 1, duration: 6000, useNativeDriver: false })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 2000, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.3, duration: 2000, useNativeDriver: false }),
    ])).start();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#050505' }} />
      {/* Color accent strips */}
      {[
        { color: '#FF2A1F', y: 100 },
        { color: '#FFC400', y: 250 },
        { color: '#FFC400', y: 400 },
        { color: '#00FF88', y: 600 },
      ].map((s, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: 0, right: 0, top: s.y, height: 1,
          backgroundColor: s.color,
          opacity: pulse.interpolate({ inputRange: [0.3, 1], outputRange: [0.03, 0.08] }),
        }} />
      ))}
      {/* Diamond shapes */}
      {[
        { x: 20, y: 180 }, { x: SW - 30, y: 350 }, { x: SW / 2 - 10, y: 500 },
      ].map((pos, i) => (
        <Animated.View key={`d${i}`} style={{
          position: 'absolute', left: pos.x, top: pos.y,
          width: 14, height: 14, transform: [{ rotate: '45deg' }],
          borderWidth: 1.5, borderColor: '#FF2A1F',
          opacity: pulse,
        }} />
      ))}
    </View>
  );
});

// ─── HOME PAGE EXTRA — Floating particle background ────────────────
export const HomeParticleLayer = memo(function HomeParticleLayer() {
  const particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      x: Math.random() * SW,
      anim: new Animated.Value(0),
      opacity: new Animated.Value(0),
      size: 2 + Math.random() * 4,
      speed: 3000 + Math.random() * 2000,
      delay: i * 350,
    }))
  ).current;

  useEffect(() => {
    particles.forEach(p => {
      const loop = () => {
        p.anim.setValue(0);
        p.opacity.setValue(0);
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.parallel([
            Animated.timing(p.anim, { toValue: 1, duration: p.speed, useNativeDriver: false }),
            Animated.sequence([
              Animated.timing(p.opacity, { toValue: 0.7, duration: p.speed * 0.2, useNativeDriver: false }),
              Animated.timing(p.opacity, { toValue: 0, duration: p.speed * 0.8, useNativeDriver: false }),
            ]),
          ]),
        ]).start(() => loop());
      };
      loop();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute',
          left: p.x,
          bottom: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, 300] }),
          width: p.size, height: p.size, borderRadius: p.size / 2,
          backgroundColor: i % 3 === 0 ? '#FF2A1F' : i % 3 === 1 ? '#44FF88' : '#FFC400',
          opacity: p.opacity,
          ...Platform.select({
            ios: { shadowColor: '#FF2A1F', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
            android: {},
          }),
        }} />
      ))}
    </View>
  );
});
