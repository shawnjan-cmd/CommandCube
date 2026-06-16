/**
 * BootCurtain — NEXUS Command Center initialization veil.
 *
 * Visual language ported directly from the user's nexus-v9 HTML mockup:
 *   • Pure-black background with subtle dotted grid overlay
 *   • Hexagonal NEXUS-style logo with rotating outline + pulsing core
 *   • IBM Plex Mono inspired typography (monospace fallback for safety)
 *   • Two-tone title: white "BUTLER" + accent-red "AI"
 *   • Sub-tagline with corner brackets [ ULTIMATE COMMAND CENTER ]
 *   • Animated status row: pulsing dot + "INITIALIZING COMMAND CORE"
 *   • Decorative circuit traces on left & right edges
 *   • Bottom progress bar that fills during the hold period
 *
 * Lifecycle: mounts immediately, fades out after `holdMs` (default 700),
 * then unmounts itself. Pure React Native primitives only — no SVG
 * filters, no external fonts, cannot fail.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Platform } from 'react-native';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const NEXUS_RED   = '#FF2A1F';  // matches home accent
const NEXUS_AMBER = '#F59E0B';
const NEXUS_GREEN = '#10B981';
const NEXUS_DIM   = '#8C95A6';
const NEXUS_MID   = '#C8E4F0';

export default function BootCurtain({ holdMs = 700 }: { holdMs?: number }) {
  const [visible, setVisible] = useState(true);
  const fade  = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const spin  = useRef(new Animated.Value(0)).current;
  const fill  = useRef(new Animated.Value(0)).current;

  // ── Auto-dismiss ────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, holdMs);
    return () => clearTimeout(t);
  }, [fade, holdMs]);

  // ── Pulsing dot ─────────────────────────────────────────────
  useEffect(() => {
    const l = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 600, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
      ]),
    );
    l.start();
    return () => l.stop();
  }, [pulse]);

  // ── Rotating hex outline ────────────────────────────────────
  useEffect(() => {
    const l = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true }),
    );
    l.start();
    return () => l.stop();
  }, [spin]);

  // ── Progress bar fill ───────────────────────────────────────
  useEffect(() => {
    Animated.timing(fill, {
      toValue: 1,
      duration: holdMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [fill, holdMs]);

  if (!visible) return null;

  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const spinRot    = spin.interpolate({  inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const fillW      = fill.interpolate({  inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View pointerEvents="none" style={[styles.root, { opacity: fade }]}>
      {/* faint dotted grid background — pure CSS-like effect via repeated tiny dots */}
      <View style={styles.gridBg} pointerEvents="none">
        {Array.from({ length: 60 }).map((_, i) => (
          <View key={`g-${i}`} style={[styles.gridLine, { top: 8 + i * 14 }]} />
        ))}
      </View>

      {/* Decorative circuit traces — left & right */}
      <View style={[styles.circuit, styles.circuitLeft]}>
        <View style={[styles.cTrace, { top: 20, width: 80 }]} />
        <View style={[styles.cTrace, { top: 60, width: 50, backgroundColor: NEXUS_RED + '55' }]} />
        <View style={[styles.cTrace, { top: 100, width: 65 }]} />
        <View style={[styles.cDot, { top: 18, left: 80 }]} />
        <View style={[styles.cDot, { top: 98, left: 65, backgroundColor: NEXUS_AMBER }]} />
      </View>
      <View style={[styles.circuit, styles.circuitRight]}>
        <View style={[styles.cTrace, { top: 20, width: 80, right: 0 }]} />
        <View style={[styles.cTrace, { top: 60, width: 50, right: 0, backgroundColor: NEXUS_RED + '55' }]} />
        <View style={[styles.cTrace, { top: 100, width: 65, right: 0 }]} />
        <View style={[styles.cDot, { top: 18, right: 80 }]} />
        <View style={[styles.cDot, { top: 98, right: 65, backgroundColor: NEXUS_AMBER }]} />
      </View>

      {/* ── Hexagonal logo (CSS pseudo-polygon via rotated squares) ── */}
      <View style={styles.hexWrap}>
        {/* outer rotating ring */}
        <Animated.View
          style={[
            styles.hexOuter,
            { transform: [{ rotate: spinRot }] },
          ]}
        />
        {/* mid ring */}
        <View style={styles.hexMid} />
        {/* pulsing core */}
        <Animated.View style={[styles.hexCore, { opacity: dotOpacity }]} />
      </View>

      {/* ── Brand: BUTLER AI ───────────────────────────────────── */}
      <View style={styles.brandRow}>
        <Text style={styles.brandWhite}>BUTLER</Text>
        <Text style={styles.brandRed}>AI</Text>
      </View>

      {/* ── Sub-tagline ───────────────────────────────────────── */}
      <View style={styles.subRow}>
        <Text style={styles.subBracket}>[</Text>
        <Text style={styles.subText}>ULTIMATE COMMAND CENTER  ·  v2.1.15</Text>
        <Text style={styles.subBracket}>]</Text>
      </View>

      {/* ── Status: pulsing dot + INITIALIZING line ───────────── */}
      <View style={styles.statusRow}>
        <Animated.View style={[styles.statusDot, { opacity: dotOpacity }]} />
        <Text style={styles.statusText}>INITIALIZING  COMMAND  CORE</Text>
        <Animated.View style={[styles.statusDot, { opacity: dotOpacity }]} />
      </View>

      {/* ── Progress bar ──────────────────────────────────────── */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: fillW }]} />
      </View>
      <Text style={styles.progressLabel}>SECURE BOOT · ZERO TELEMETRY · LAN-ONLY</Text>
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

  // ── faint horizontal scanlines (HUD vibe) ──
  gridBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0, right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: NEXUS_RED + '0A',
  },

  // ── circuit traces ──
  circuit: { position: 'absolute', top: '32%', width: 100, height: 140 },
  circuitLeft:  { left: 0 },
  circuitRight: { right: 0 },
  cTrace: {
    position: 'absolute',
    height: 1.2,
    backgroundColor: NEXUS_RED + '88',
    left: 0,
  },
  cDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: NEXUS_RED,
  },

  // ── Hex stack ──
  hexWrap: {
    width: 80, height: 80,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 22,
  },
  hexOuter: {
    position: 'absolute',
    width: 78, height: 78,
    borderWidth: 1.4,
    borderColor: NEXUS_RED + 'CC',
    borderRadius: 6,
    transform: [{ rotate: '45deg' }],
  },
  hexMid: {
    position: 'absolute',
    width: 50, height: 50,
    borderWidth: 1,
    borderColor: NEXUS_RED + '99',
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
  },
  hexCore: {
    width: 18, height: 18,
    borderRadius: 4,
    backgroundColor: NEXUS_RED,
    transform: [{ rotate: '45deg' }],
    shadowColor: NEXUS_RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },

  // ── Brand text ──
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 14,
  },
  brandWhite: {
    fontFamily: MONO,
    fontSize: 38,
    fontWeight: '900',
    color: '#E8EAEC',
    letterSpacing: 6,
  },
  brandRed: {
    fontFamily: MONO,
    fontSize: 38,
    fontWeight: '900',
    color: NEXUS_RED,
    letterSpacing: 10,
    textShadowColor: NEXUS_RED,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },

  // ── Sub-tagline ──
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  subBracket: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: NEXUS_RED + 'AA',
    letterSpacing: 1,
  },
  subText: {
    fontFamily: MONO,
    fontSize: 9.5,
    fontWeight: '800',
    color: NEXUS_MID,
    letterSpacing: 2.4,
  },

  // ── Status row ──
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
  },
  statusDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: NEXUS_RED,
    shadowColor: NEXUS_RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  statusText: {
    fontFamily: MONO,
    fontSize: 9,
    fontWeight: '900',
    color: NEXUS_RED,
    letterSpacing: 3,
  },

  // ── Progress bar ──
  progressTrack: {
    marginTop: 26,
    width: 220,
    height: 2.4,
    backgroundColor: '#1A0507',
    borderRadius: 1.2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: NEXUS_RED,
    shadowColor: NEXUS_RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  progressLabel: {
    marginTop: 14,
    fontFamily: MONO,
    fontSize: 7.5,
    fontWeight: '700',
    color: NEXUS_DIM,
    letterSpacing: 2.5,
  },
});
