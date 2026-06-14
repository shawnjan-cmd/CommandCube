/**
 * FirstBootCinematic — Plays ONCE the first time the user enters the app
 * after completing onboarding. Stores a flag in AsyncStorage so it never
 * plays again.
 *
 * Uses plain react-native Animated (no Reanimated worklets) for max
 * compatibility.
 *
 * Sequence (~3.5s total):
 *   t=0     | Black screen
 *   t=200   | Scan line drops top-to-bottom
 *   t=600+  | Boot lines scroll in (1 every 200ms)
 *   t=2400  | "USER ACQUIRED" header flashes
 *   t=3000  | White flash + fade to home
 *   t=3550  | onDone fires, component unmounts
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W, height: H } = Dimensions.get('window');
const FLAG = '@butler_first_boot_cinematic_played_v1';
const MONO = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const C = {
  red:      '#FF2A1F',
  amber:    '#FFB020',
  gunmetal: '#050505',
  white:    '#F5F5F5',
};

const BOOT_LINES = [
  '> POWER CYCLE: COMPLETE',
  '> CORE TEMP: 36.4°C / NOMINAL',
  '> NEURAL NET: ONLINE',
  '> SENSORY ARRAY: CALIBRATED',
  '> LAN PROTOCOL: SECURED',
  '> AGENT MODULE: LOADED',
  '> THREAT ASSESSMENT: PASSIVE',
  '> USER PROFILE: SYNCED',
  '> BUTLER-CORE: ARMED',
];

interface Props { onDone: () => void; }

export default function FirstBootCinematic({ onDone }: Props) {
  const fade        = useRef(new Animated.Value(0)).current;
  const scanY       = useRef(new Animated.Value(-20)).current;
  const headerOp    = useRef(new Animated.Value(0)).current;
  const flashOp     = useRef(new Animated.Value(0)).current;
  const containerOp = useRef(new Animated.Value(1)).current;
  const [visibleLines, setVisibleLines] = useState(0);
  const timers = useRef<any[]>([]);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    timers.current.push(setTimeout(() => {
      Animated.timing(scanY, {
        toValue: H + 20,
        duration: 1800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 200));

    BOOT_LINES.forEach((_, i) => {
      timers.current.push(setTimeout(() => setVisibleLines(i + 1), 600 + i * 200));
    });

    timers.current.push(setTimeout(() => {
      Animated.sequence([
        Animated.timing(headerOp, { toValue: 1,    duration: 120, useNativeDriver: true }),
        Animated.timing(headerOp, { toValue: 0.25, duration: 120, useNativeDriver: true }),
        Animated.timing(headerOp, { toValue: 1,    duration: 120, useNativeDriver: true }),
      ]).start();
    }, 2400));

    timers.current.push(setTimeout(() => {
      Animated.sequence([
        Animated.timing(flashOp, { toValue: 0.9, duration: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(flashOp, { toValue: 0,   duration: 300, useNativeDriver: true }),
      ]).start();
    }, 3000));

    timers.current.push(setTimeout(() => {
      Animated.timing(containerOp, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 3300));

    timers.current.push(setTimeout(() => {
      AsyncStorage.setItem(FLAG, '1').catch(() => {});
      onDone();
    }, 3600));

    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.gunmetal, zIndex: 20000, opacity: containerOp }]} pointerEvents="auto">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>

        {/* CRT grid */}
        {Array.from({ length: 18 }).map((_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: 0, right: 0,
              top: (H / 18) * i,
              height: 1,
              backgroundColor: 'rgba(255,42,31,0.10)',
            }}
          />
        ))}

        {/* Corner brackets */}
        <View style={[s.bracket, { top: 60,   left: 20,  borderTopWidth: 2,    borderLeftWidth: 2 }]} />
        <View style={[s.bracket, { top: 60,   right: 20, borderTopWidth: 2,    borderRightWidth: 2 }]} />
        <View style={[s.bracket, { bottom: 60, left: 20,  borderBottomWidth: 2, borderLeftWidth: 2 }]} />
        <View style={[s.bracket, { bottom: 60, right: 20, borderBottomWidth: 2, borderRightWidth: 2 }]} />

        {/* Header */}
        <View style={s.headerWrap}>
          <Text style={s.headerTitle}>BUTLER-CORE</Text>
          <Text style={s.headerSubtitle}>{'<<  BOOT SEQUENCE INITIATED  >>'}</Text>
        </View>

        {/* Boot log */}
        <View style={s.logWrap}>
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <Text key={i} style={s.logLine}>{line}</Text>
          ))}
          {visibleLines < BOOT_LINES.length && (
            <Text style={[s.logLine, { opacity: 0.5 }]}>{'> ░'}</Text>
          )}
        </View>

        {/* USER ACQUIRED flash */}
        <Animated.View style={[s.userBlock, { opacity: headerOp }]} pointerEvents="none">
          <View style={s.userBox}>
            <Text style={s.userBoxText}>{'>>  USER ACQUIRED  <<'}</Text>
          </View>
          <Text style={s.userSubText}>WELCOME · BUTLER-CORE READY FOR INPUT</Text>
        </Animated.View>

        {/* Sweeping scan line */}
        <Animated.View
          style={{
            position: 'absolute',
            left: 0, right: 0,
            height: 4,
            backgroundColor: C.red,
            shadowColor: C.red,
            shadowOpacity: 1,
            shadowRadius: 14,
            elevation: 16,
            transform: [{ translateY: scanY }],
          }}
        />

      </Animated.View>

      {/* White flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: C.white, opacity: flashOp }]}
      />
    </Animated.View>
  );
}

export async function hasFirstBootPlayed(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(FLAG)) === '1'; } catch { return false; }
}

const s = StyleSheet.create({
  bracket: { position: 'absolute', width: 26, height: 26, borderColor: C.red },
  headerWrap: { position: 'absolute', top: 100, left: 0, right: 0, alignItems: 'center', gap: 6 },
  headerTitle: { color: C.red, fontSize: 28, fontWeight: '900', fontFamily: MONO, letterSpacing: 6, textShadowColor: C.red, textShadowRadius: 14 },
  headerSubtitle: { color: C.amber, fontSize: 11, fontFamily: MONO, letterSpacing: 2.5, opacity: 0.85 },
  logWrap: { position: 'absolute', top: H * 0.32, left: 32, right: 32, gap: 4 },
  logLine: { color: C.red, fontSize: 13, fontFamily: MONO, letterSpacing: 1.2, fontWeight: '700' },
  userBlock: { position: 'absolute', bottom: H * 0.22, left: 0, right: 0, alignItems: 'center', gap: 8 },
  userBox: { borderWidth: 2.5, borderColor: C.red, paddingHorizontal: 22, paddingVertical: 12, backgroundColor: 'rgba(255,42,31,0.08)' },
  userBoxText: { color: C.red, fontSize: 18, fontFamily: MONO, fontWeight: '900', letterSpacing: 3 },
  userSubText: { color: C.amber, fontSize: 10, fontFamily: MONO, letterSpacing: 2, opacity: 0.85 },
});
