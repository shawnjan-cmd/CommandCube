/**
 * ONBOARDING HERO STEP — Premium Welcome v2.0
 * Path: components/ui/OnboardingHeroStep.tsx
 *
 * A polished animated hero panel to drop in as Step 1 of welcome.tsx
 * (or as a brand-new pre-step zero). Features:
 *   • Parallax starfield (60fps, useNativeDriver)
 *   • Animated radial sweep + scanline
 *   • Typewriter tagline that cycles through 4 promises
 *   • Live "boot sequence" log lines (themed terminal feel)
 *   • Glowing primary CTA with breathing halo
 *   • Quick stats strip (scripts, models, languages)
 *
 * Wire-up in app/welcome.tsx (replace existing welcome step content):
 *   import { OnboardingHeroStep } from '@/components/ui/OnboardingHeroStep';
 *   // inside Step 0 / Welcome render:
 *   <OnboardingHeroStep onBegin={() => goNext()} />
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Easing,
  Dimensions, Platform,
} from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop, Path } from 'react-native-svg';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { haptics } from '@/services/haptics';

const AnimSvgCircle = Animated.createAnimatedComponent(Circle);

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const { width: _W, height: _H } = Dimensions.get('window');
const SW = _W > 0 ? _W : 375;
const SH = _H > 0 ? _H : 720;

const C = {
  bg: '#020407', card: '#0C1420', cyan: '#00FFFF', green: '#00FF88',
  amber: '#F5A623', purple: '#BF00FF', text: '#D8E8F4', textDim: '#7A9AB8',
  border: 'rgba(0,255,255,0.18)',
};

const TAGLINES = [
  'Your local-AI butler.',
  'Run Python on your PC from anywhere.',
  'Zero cloud. Zero telemetry. Zero limits.',
  'Self-healing scripts. Real intelligence.',
];

const BOOT_LINES = [
  { txt: '> initializing neural core…',      color: '#7A9AB8' },
  { txt: '> loading 300+ python recipes…',   color: '#7A9AB8' },
  { txt: '> bootstrapping ollama bridge…',   color: '#00FFFF' },
  { txt: '> handshake: encrypted ✓',         color: '#00FF88' },
  { txt: '> READY.',                          color: '#00FF88' },
];

export function OnboardingHeroStep({ onBegin }: { onBegin: () => void }) {
  // Tagline typewriter
  const [tagIdx, setTagIdx] = useState(0);
  const [typed, setTyped]   = useState('');
  useEffect(() => {
    let i = 0; let deleting = false;
    const tick = () => {
      const full = TAGLINES[tagIdx];
      if (!deleting) {
        setTyped(full.slice(0, i + 1));
        i++;
        if (i >= full.length) { deleting = true; setTimeout(tick, 1600); return; }
      } else {
        setTyped(full.slice(0, i - 1));
        i--;
        if (i <= 0) { deleting = false; setTagIdx(p => (p + 1) % TAGLINES.length); setTimeout(tick, 200); return; }
      }
      setTimeout(tick, deleting ? 28 : 55);
    };
    const t = setTimeout(tick, 400);
    return () => clearTimeout(t);
  }, [tagIdx]);

  // Boot log reveal
  const [bootShown, setBootShown] = useState(0);
  useEffect(() => {
    const ts = BOOT_LINES.map((_, i) => setTimeout(() => setBootShown(i + 1), 400 + i * 380));
    return () => ts.forEach(clearTimeout);
  }, []);

  // CTA breathing halo
  const halo = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(halo, { toValue: 1,   duration: 1400, useNativeDriver: true }),
      Animated.timing(halo, { toValue: 0.3, duration: 1400, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, []);

  // Sweep ring
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 6000, useNativeDriver: true, easing: Easing.linear })).start();
  }, []);

  // Scan line
  const scan = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(scan, { toValue: 1, duration: 2800, useNativeDriver: true, easing: Easing.linear }),
      Animated.delay(800),
      Animated.timing(scan, { toValue: 0, duration: 0,    useNativeDriver: true }),
    ])).start();
  }, []);

  const stars = useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    id: i,
    x: Math.random() * SW,
    y: Math.random() * 280,
    r: Math.random() * 1.4 + 0.6,
    delay: Math.random() * 2200,
    dur: 1400 + Math.random() * 1800,
  })), []);

  const press = () => { try { haptics.success(); } catch {} onBegin(); };

  return (
    <View style={s.wrap}>
      {/* ── HERO VISUAL ── */}
      <View style={s.hero}>
        <Starfield stars={stars} />
        <SweepRing sweep={sweep} />
        <Animated.View style={[s.scanLine, {
          transform: [{ translateY: scan.interpolate({ inputRange: [0,1], outputRange: [0, 280] }) }],
        }]} />

        {/* Core badge */}
        <View style={s.core}>
          <Animated.View style={[s.coreHalo, { opacity: halo, transform: [{ scale: halo.interpolate({ inputRange: [0.3,1], outputRange: [1, 1.3] }) }] }]} />
          <View style={s.coreInner}>
            <MaterialCommunityIcons name="robot-happy" size={36} color={C.cyan} />
          </View>
        </View>

        {/* Brand */}
        <Text style={s.brand}>BUTLER<Text style={{ color: C.green }}> AI</Text></Text>
        <View style={s.brandUnderline} />
        <Text style={s.kicker} numberOfLines={1}>{typed}<Text style={{ color: C.cyan }}>▌</Text></Text>
      </View>

      {/* ── BOOT TERMINAL ── */}
      <View style={s.term}>
        <View style={s.termHead}>
          <View style={[s.termDot, { backgroundColor: '#FF5F56' }]} />
          <View style={[s.termDot, { backgroundColor: '#FFBD2E' }]} />
          <View style={[s.termDot, { backgroundColor: '#27C93F' }]} />
          <Text style={s.termTitle}>nexus@butler ~ boot</Text>
        </View>
        <View style={s.termBody}>
          {BOOT_LINES.slice(0, bootShown).map((l, i) => (
            <Text key={i} style={[s.termLine, { color: l.color }]}>{l.txt}</Text>
          ))}
          {bootShown < BOOT_LINES.length && <Text style={s.termCursor}>▌</Text>}
        </View>
      </View>

      {/* ── STATS STRIP ── */}
      <View style={s.stats}>
        <Stat n="300+" lbl="SCRIPTS"    color={C.cyan} />
        <View style={s.statDiv} />
        <Stat n="100%"  lbl="LOCAL"     color={C.green} />
        <View style={s.statDiv} />
        <Stat n="0"     lbl="TELEMETRY" color={C.amber} />
      </View>

      {/* ── CTA ── */}
      <TouchableOpacity activeOpacity={0.85} onPress={press} style={s.ctaWrap}>
        <Animated.View style={[s.ctaHalo, { opacity: halo }]} />
        <View style={s.cta}>
          <MaterialIcons name="bolt" size={18} color="#000" />
          <Text style={s.ctaTxt}>BEGIN INITIALIZATION</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#000" />
        </View>
      </TouchableOpacity>

      <Text style={s.foot}>10-step setup · ~ 90 seconds · cancel anytime</Text>
    </View>
  );
}

/* ── Pieces ── */
function Stat({ n, lbl, color }: { n: string; lbl: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[s.statN, { color }]}>{n}</Text>
      <Text style={s.statL}>{lbl}</Text>
    </View>
  );
}

function Starfield({ stars }: { stars: any[] }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map(st => <Star key={st.id} {...st} />)}
    </View>
  );
}

function Star({ x, y, r, delay, dur }: any) {
  const op = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(op, { toValue: 1,   duration: dur / 2, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0.2, duration: dur / 2, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute', left: x, top: y, width: r * 2, height: r * 2,
      borderRadius: r, backgroundColor: '#FFFFFF', opacity: op,
    }} />
  );
}

function SweepRing({ sweep }: { sweep: Animated.Value }) {
  const rot = sweep.interpolate({ inputRange: [0,1], outputRange: ['0deg','360deg'] });
  return (
    <Animated.View style={[s.sweepWrap, { transform: [{ rotate: rot }] }]} pointerEvents="none">
      <Svg width={220} height={220} viewBox="0 0 220 220">
        <Defs>
          <RadialGradient id="g" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"  stopColor="#00FFFF" stopOpacity="0.45" />
            <Stop offset="60%" stopColor="#00FFFF" stopOpacity="0" />
            <Stop offset="100%" stopColor="#00FFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Path d="M110 10 A100 100 0 0 1 210 110 L110 110 Z" fill="url(#g)" />
        <Circle cx="110" cy="110" r="100" stroke="rgba(0,255,255,0.25)" strokeWidth="1" fill="none" />
        <Circle cx="110" cy="110" r="70"  stroke="rgba(0,255,255,0.15)" strokeWidth="1" fill="none" />
        <Circle cx="110" cy="110" r="40"  stroke="rgba(0,255,255,0.10)" strokeWidth="1" fill="none" />
      </Svg>
    </Animated.View>
  );
}

/* ── Styles ── */
const s = StyleSheet.create({
  wrap: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24, gap: 18 },

  hero: { height: 300, alignItems: 'center', justifyContent: 'center',
          borderRadius: 18, borderWidth: 1, borderColor: C.border,
          backgroundColor: 'rgba(0,255,255,0.02)', overflow: 'hidden', position: 'relative' },
  sweepWrap: { position: 'absolute' },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(0,255,255,0.35)', shadowColor: C.cyan, shadowOpacity: 1, shadowRadius: 8 },
  core: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginTop: 30 },
  coreHalo: { position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: C.cyan, shadowColor: C.cyan, shadowOpacity: 1, shadowRadius: 16 },
  coreInner: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#020407', borderWidth: 1.5, borderColor: C.cyan + '70', alignItems: 'center', justifyContent: 'center' },

  brand: { marginTop: 18, fontSize: 30, fontWeight: '900', color: C.text, letterSpacing: 6, fontFamily: MONO },
  brandUnderline: { width: 80, height: 2, backgroundColor: C.cyan, marginTop: 6, shadowColor: C.cyan, shadowOpacity: 1, shadowRadius: 6 },
  kicker: { marginTop: 10, fontSize: 12, color: C.textDim, fontFamily: MONO, letterSpacing: 0.5, paddingHorizontal: 14, textAlign: 'center' },

  term: { borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: '#010204', overflow: 'hidden' },
  termHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: 'rgba(0,255,255,0.04)' },
  termDot: { width: 8, height: 8, borderRadius: 4 },
  termTitle: { marginLeft: 6, color: C.textDim, fontSize: 10, fontFamily: MONO, fontWeight: '700' },
  termBody: { padding: 12, minHeight: 110 },
  termLine: { fontSize: 11, fontFamily: MONO, lineHeight: 18 },
  termCursor: { color: C.green, fontFamily: MONO, fontSize: 12 },

  stats: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingVertical: 12 },
  statDiv: { width: StyleSheet.hairlineWidth, backgroundColor: C.border },
  statN: { fontSize: 18, fontWeight: '900', fontFamily: MONO },
  statL: { fontSize: 9, color: C.textDim, fontFamily: MONO, fontWeight: '900', letterSpacing: 1.5, marginTop: 3 },

  ctaWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ctaHalo: { position: 'absolute', width: '100%', height: 60, borderRadius: 30, backgroundColor: C.cyan, opacity: 0.25 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 30, borderRadius: 30, backgroundColor: C.cyan, width: '100%' },
  ctaTxt: { color: '#000', fontWeight: '900', fontSize: 14, fontFamily: MONO, letterSpacing: 2 },

  foot: { textAlign: 'center', color: C.textDim, fontSize: 10, fontFamily: MONO },
});
