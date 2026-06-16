/**
 * Isometric KB Shard Map — Onyx & Neon design
 * Renders indexed KB entries as glowing cubic shards in 3D isometric perspective
 */
import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Animated, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';

const _DIM_IKB = Dimensions.get('window'); /* cold-start safe */
const SW = _DIM_IKB.width > 0 ? _DIM_IKB.width : 414;
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const CYAN    = '#FF2A1F';
const SURFACE = '#0E0F12';
const BORDER  = 'rgba(255,42,31,0.12)';
const TEXTDIM = '#6A7384';

interface Props {
  totalFindings: number;
  sessions: number;
}

export function IsometricKBShardMap({ totalFindings, sessions }: Props) {
  const COLS = 8; const ROWS = 5;
  const CELL_W = 28; const CELL_H = 16; const CELL_D = 7;
  const CANVAS_W = SW - 56;

  const pulseAnims = useRef(
    Array.from({ length: COLS * ROWS }, () => new Animated.Value(Math.random() * 0.6 + 0.2))
  ).current;
  const scanAnim  = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.4)).current;

  const filledCount = Math.min(
    COLS * ROWS,
    Math.max(0, Math.round((totalFindings / Math.max(1, totalFindings + 12)) * COLS * ROWS))
  );

  useFocusEffect(useCallback(() => {
    const anims = pulseAnims.map((anim, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 55),
        Animated.timing(anim, { toValue: 1,   duration: 1600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.15, duration: 1600, useNativeDriver: true }),
      ]))
    );
    const scanLoop = Animated.loop(
      Animated.timing(scanAnim, { toValue: 1, duration: 3000, useNativeDriver: false })
    );
    const glowLoop = Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 1,   duration: 1000, useNativeDriver: false }),
      Animated.timing(glowPulse, { toValue: 0.3, duration: 1000, useNativeDriver: false }),
    ]));
    anims.forEach(a => a.start()); scanLoop.start(); glowLoop.start();
    return () => { anims.forEach(a => a.stop()); scanLoop.stop(); glowLoop.stop(); };
  }, [totalFindings]));

  // Isometric origin — centred
  const ORIGIN_X = CANVAS_W / 2;
  const ORIGIN_Y = ROWS * (CELL_H / 2) + 10;
  const CANVAS_H = (COLS + ROWS) * (CELL_H / 2) + CELL_D + 24;

  const isoX = (c: number, r: number) => ORIGIN_X + (c - r) * (CELL_W / 2);
  const isoY = (c: number, r: number) => ORIGIN_Y + (c + r) * (CELL_H / 2);

  // Build shard descriptors back-to-front for z-order
  const shards: {
    idx: number; filled: boolean; anim: Animated.Value;
    sx: number; sy: number; hw: number; hh: number;
  }[] = [];
  let ci = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      shards.push({
        idx, filled: ci < filledCount,
        anim: pulseAnims[idx],
        sx: isoX(c, r), sy: isoY(c, r),
        hw: CELL_W / 2, hh: CELL_H / 2,
      });
      ci++;
    }
  }

  const scanLeft = scanAnim.interpolate({
    inputRange: [0, 1], outputRange: [-CANVAS_W * 0.3, CANVAS_W * 1.3],
  });

  return (
    <View style={s.wrap}>
      {/* Header */}
      <View style={s.header}>
        <Animated.View style={[s.headerDot, { opacity: glowPulse }]} />
        <Text style={s.title}>ISOMETRIC KB SHARD MAP</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: CYAN + '25' }} />
        <View style={s.badge}>
          <Text style={s.badgeTxt}>{filledCount}/{COLS * ROWS} INDEXED</Text>
        </View>
      </View>

      {/* Canvas */}
      <View style={[s.canvas, { height: CANVAS_H, width: CANVAS_W }]}>
        {/* Scan sweep */}
        <Animated.View pointerEvents="none" style={[s.scanSweep, { left: scanLeft }]} />

        {/* Corner brackets */}
        <View style={[s.corner, { top: 3, left: 3, borderTopWidth: 1.5, borderLeftWidth: 1.5  }]} />
        <View style={[s.corner, { top: 3, right: 3, borderTopWidth: 1.5, borderRightWidth: 1.5 }]} />
        <View style={[s.corner, { bottom: 3, left: 3, borderBottomWidth: 1.5, borderLeftWidth: 1.5  }]} />
        <View style={[s.corner, { bottom: 3, right: 3, borderBottomWidth: 1.5, borderRightWidth: 1.5 }]} />

        {/* Shards */}
        {shards.map(({ idx, filled, anim, sx, sy, hw, hh }) => {
          const topBg   = filled ? '#FF2A1F' : '#15171C';
          const leftBg  = filled ? '#006677' : '#0E1820';
          const rightBg = filled ? '#008899' : '#111E2A';
          return (
            <Animated.View key={idx} style={{ opacity: filled ? anim : 0.3 }}>
              {/* Top face */}
              <View style={{
                position: 'absolute', left: sx - hw, top: sy,
                width: CELL_W, height: CELL_H,
                backgroundColor: topBg,
                borderWidth: filled ? 0.5 : 0, borderColor: CYAN + '55',
              }} />
              {/* Left face */}
              <View style={{
                position: 'absolute', left: sx - hw, top: sy + hh,
                width: hw, height: hh + CELL_D,
                backgroundColor: leftBg,
              }} />
              {/* Right face */}
              <View style={{
                position: 'absolute', left: sx, top: sy + hh,
                width: hw, height: hh + CELL_D,
                backgroundColor: rightBg,
              }} />
              {/* Glow node for filled shards */}
              {filled ? (
                <Animated.View style={[s.glowNode, {
                  left: sx - 3, top: sy + hh - 3, opacity: anim,
                }]} />
              ) : null}
            </Animated.View>
          );
        })}
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: 'INDEXED',  val: filledCount,             col: CYAN },
          { label: 'PENDING',  val: COLS * ROWS - filledCount, col: '#1E3448' },
          { label: 'SESSIONS', val: sessions,                 col: '#FFC400' },
          { label: 'FINDINGS', val: totalFindings,            col: '#00FF88' },
        ].map(({ label, val, col }) => (
          <View key={label} style={[s.stat, { borderColor: col + '35', backgroundColor: col + '08' }]}>
            <Text style={[s.statVal, { color: col }]}>{val}</Text>
            <Text style={s.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:     { backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 12 },
  header:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  headerDot:{ width: 8, height: 8, borderRadius: 4, backgroundColor: CYAN, flexShrink: 0,
    ...Platform.select({ ios: { shadowColor: CYAN, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:6 }, android:{} }) },
  title:    { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.2, color: CYAN },
  badge:    { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderColor: CYAN + '60', backgroundColor: CYAN + '10' },
  badgeTxt: { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5, color: CYAN },
  canvas:   { overflow: 'hidden', backgroundColor: '#030A14', borderRadius: 10, borderWidth: 1, borderColor: CYAN + '25', position: 'relative' },
  scanSweep:{ position: 'absolute', top: 0, bottom: 0, width: '25%',
    backgroundColor: 'rgba(255,42,31,0.06)', transform: [{ skewX: '-12deg' }] },
  corner:   { position: 'absolute', width: 10, height: 10, borderColor: CYAN + '55' },
  glowNode: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: CYAN,
    ...Platform.select({ ios: { shadowColor: CYAN, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:8 }, android:{} }) },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  stat:     { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: 8 },
  statVal:  { fontSize: 16, fontWeight: '900', fontFamily: MONO },
  statLabel:{ fontSize: 7, fontFamily: MONO, letterSpacing: 0.5, textAlign: 'center', marginTop: 2, color: TEXTDIM },
});
