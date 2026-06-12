/**
 * MECH BAY OS — Butler AI Homepage Theme
 * ═══════════════════════════════════════════════════════════════════════════
 * A futuristic industrial robot/mecha-inspired interface for the Butler AI
 * home tab. Three-color palette (arc-reactor cyan + plasma orange + hazard
 * yellow) on brushed gunmetal. Inspired by Pacific Rim Jaeger bays, Iron Man
 * Mark VII HUD, and Evangelion launch deck dashboards.
 *
 * Components exported:
 *   • MechBayHero       — replaces ButlerAIHero  (top of home tab)
 *   • HexCommandRing    — replaces QuickAccessGrid (action tiles)
 *
 * No new dependencies — pure react-native + react-native-svg + Animated.
 */
import React, { useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Dimensions,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, {
  Circle, Path, Polygon, Line, Rect, Defs, RadialGradient, LinearGradient as SvgLinearGradient, Stop, G,
} from 'react-native-svg';
import { haptics } from '@/services/haptics';

const { width: SW } = Dimensions.get('window');
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ─── MECH BAY PALETTE ────────────────────────────────────────────────────────
export const MECH = {
  // metals
  steel:        '#0F1115',  // deeper gunmetal base (endoskeleton chassis)
  steelHi:      '#1A1D24',  // raised metal
  steelLo:      '#06070A',  // recessed shadow
  brushed:      '#262A33',  // brushed titanium highlight
  chrome:       '#7A8392',  // chrome edge (brighter for endo skeleton sheen)
  chromeHi:     '#B8C2D0',  // mirror chrome highlight
  rivet:        '#3C424D',  // bolt head
  rivetHi:      '#697283',  // bolt highlight
  // signal colors — TERMINATOR / ENDOSKELETON
  arc:          '#FF2A1F',  // endo red (primary — the glowing-eyes color)
  arcDim:       '#7A0F08',
  plasma:       '#FF6A1F',  // plasma orange (secondary / standby)
  plasmaDim:    '#A03A05',
  hazard:       '#FFC400',  // hazard amber-yellow (caution stripes)
  hazardDim:    '#7A5E00',
  emerald:      '#00FF88',  // status OK green (rarely used)
  bloodRed:     '#FF0040',  // critical red
  // text
  text:         '#D8DFE8',  // panel readout text
  textMid:      '#8089A0',
  textDim:      '#4A5366',
  textOnArc:    '#1F0500',
  textOnHazard: '#1A1400',
};

const ANCH = MECH.arc + '60';

// ─── PRIMITIVES ──────────────────────────────────────────────────────────────

/** Single bolt head — concentric circles + radial gradient */
function Bolt({ size = 9 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={`bolt-${size}`} cx="35%" cy="35%" r="65%">
          <Stop offset="0%"  stopColor={MECH.rivetHi} />
          <Stop offset="55%" stopColor={MECH.rivet} />
          <Stop offset="100%" stopColor={MECH.steelLo} />
        </RadialGradient>
      </Defs>
      <Circle cx={size/2} cy={size/2} r={size/2}      fill={`url(#bolt-${size})`} />
      <Circle cx={size/2} cy={size/2} r={size/2-1.2} fill="none" stroke={MECH.steelLo} strokeWidth={0.6} />
      <Path
        d={`M ${size/2 - size/4} ${size/2} L ${size/2 + size/4} ${size/2}`}
        stroke={MECH.steelLo} strokeWidth={0.8} strokeLinecap="round"
      />
    </Svg>
  );
}

/** Hazard chevron stripe — animated diagonal lines */
function HazardStripe({ height = 14, animated = true }: { height?: number; animated?: boolean }) {
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animated) return;
    Animated.loop(Animated.timing(slide, { toValue: 1, duration: 1800, useNativeDriver: true })).start();
  }, [animated]);
  const tx = slide.interpolate({ inputRange: [0, 1], outputRange: [0, -28] });
  return (
    <View style={[mech.hazard, { height }]}>
      <Animated.View style={[mech.hazardInner, { transform: [{ translateX: tx }] }]}>
        {Array.from({ length: 30 }).map((_, i) => (
          <View
            key={i}
            style={[
              mech.hazardChevron,
              { backgroundColor: i % 2 ? MECH.hazard : '#0A0A0A', height },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

/** Brushed-metal panel background — uses fine horizontal lines + gradient */
function BrushedPanel({ width, height, color = MECH.steel }: { width: number; height: number; color?: string }) {
  const lines = useMemo(() => Array.from({ length: Math.floor(height / 2) }).map((_, i) => i * 2), [height]);
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgLinearGradient id="brushed-grad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor={MECH.steelHi} />
          <Stop offset="50%"  stopColor={color} />
          <Stop offset="100%" stopColor={MECH.steelLo} />
        </SvgLinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#brushed-grad)" />
      {lines.map((y, i) => (
        <Line
          key={i} x1={0} y1={y} x2={width} y2={y}
          stroke={i % 3 === 0 ? '#000' : MECH.steelHi}
          strokeWidth={0.4}
          opacity={i % 3 === 0 ? 0.35 : 0.15}
        />
      ))}
    </Svg>
  );
}

/** Hexagon outline + fill — used for tile shapes */
function HexShape({
  size, fill = MECH.steel, stroke = MECH.arc, strokeWidth = 1.5,
}: { size: number; fill?: string; stroke?: string; strokeWidth?: number }) {
  // flat-top hexagon
  const w = size, h = size * 0.866;
  const pts = `${w*0.25},0 ${w*0.75},0 ${w},${h/2} ${w*0.75},${h} ${w*0.25},${h} 0,${h/2}`;
  return (
    <Svg width={w} height={h}>
      <Polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="miter" />
    </Svg>
  );
}

// ─── MECH PANEL — reusable frame for ANY section ─────────────────────────────
// Brushed metal background, chrome border, 4 corner bolts, chamfered corners,
// top accent bar, optional section label header.

export function MechPanel({
  children, accent = MECH.arc, label, sublabel, style, footerHazard = false, dense = false,
}: {
  children: React.ReactNode;
  accent?: string;
  label?: string;
  sublabel?: string;
  style?: any;
  footerHazard?: boolean;
  dense?: boolean;
}) {
  return (
    <View style={[mech.panel, { borderColor: accent + '55' }, style]}>
      {/* brushed metal background */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, backgroundColor: MECH.steel }} />
      </View>

      {/* top accent bar (2.5px) with notch */}
      <View pointerEvents="none" style={[mech.panelTopBar, { backgroundColor: accent }]} />
      <View pointerEvents="none" style={[mech.panelTopNotch, { backgroundColor: accent + 'AA' }]} />

      {/* chrome inner bevel */}
      <View pointerEvents="none" style={mech.panelBevelTop} />
      <View pointerEvents="none" style={mech.panelBevelBottom} />

      {/* chamfered corner cuts */}
      <View pointerEvents="none" style={[mech.panelCornerTL, { borderColor: MECH.chrome }]} />
      <View pointerEvents="none" style={[mech.panelCornerTR, { borderColor: MECH.chrome }]} />
      <View pointerEvents="none" style={[mech.panelCornerBL, { borderColor: accent + '60' }]} />
      <View pointerEvents="none" style={[mech.panelCornerBR, { borderColor: accent + '60' }]} />

      {/* corner bolts */}
      <View style={[mech.boltAt, { top: 8,    left: 8  }]} pointerEvents="none"><Bolt /></View>
      <View style={[mech.boltAt, { top: 8,    right: 8 }]} pointerEvents="none"><Bolt /></View>
      <View style={[mech.boltAt, { bottom: 8, left: 8  }]} pointerEvents="none"><Bolt /></View>
      <View style={[mech.boltAt, { bottom: 8, right: 8 }]} pointerEvents="none"><Bolt /></View>

      {/* optional section label header — centered 3D */}
      {!!label && (
        <View style={mech.panelHeader}>
          <View style={mech.panelHeaderTail} />
          <View style={[mech.panelHeaderDot, { backgroundColor: accent }]} />
          <View style={mech.panelHeaderStack}>
            <Text style={[mech.panelHeaderLabel, mech.panelHeaderLabelShadow]} numberOfLines={1}>{label}</Text>
            <Text
              style={[mech.panelHeaderLabel, {
                color: '#F2F4F8',
                textShadowColor: accent,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 9,
              }]}
              numberOfLines={1}
            >
              {label}
            </Text>
            {!!sublabel && <Text style={mech.panelHeaderSub}>{sublabel}</Text>}
            <View style={[mech.panelHeaderUnderline, { backgroundColor: accent }]} />
          </View>
          <View style={[mech.panelHeaderDot, { backgroundColor: accent }]} />
          <View style={mech.panelHeaderTail} />
        </View>
      )}

      {/* content area */}
      <View style={[mech.panelInner, dense && { padding: 8 }]}>
        {children}
      </View>

      {/* optional hazard footer */}
      {footerHazard && <HazardStripe height={8} />}
    </View>
  );
}

/** Arc Reactor Core — animated concentric rings + central hex + sweep */
function ArcReactor({ size = 152, accent = MECH.arc, active = true }: { size?: number; accent?: string; active?: boolean }) {
  const spin1 = useRef(new Animated.Value(0)).current;
  const spin2 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(spin1, { toValue: 1, duration: 9000,  useNativeDriver: true })).start();
    Animated.loop(Animated.timing(spin2, { toValue: 1, duration: 14000, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ])).start();
  }, []);

  const rot1 = spin1.interpolate({ inputRange: [0,1], outputRange: ['0deg', '360deg'] });
  const rot2 = spin2.interpolate({ inputRange: [0,1], outputRange: ['360deg', '0deg'] });
  const halo = pulse.interpolate({ inputRange: [0,1], outputRange: [0.35, 0.85] });

  const c   = size / 2;
  const r1  = c - 4;      // outer ring
  const r2  = c - 16;     // mid ring
  const r3  = c - 30;     // inner ring  
  const r4  = c - 44;     // core hex circumscribed
  // hex points for the central hex (flat-top)
  const hexR = r4;
  const hexPts = Array.from({ length: 6 }).map((_, i) => {
    const a = (Math.PI / 3) * i;
    return `${c + hexR * Math.cos(a)},${c + hexR * Math.sin(a)}`;
  }).join(' ');

  // outer ring "fuel-rod" tick marks
  const ticks = Array.from({ length: 24 }).map((_, i) => {
    const a = (Math.PI * 2 / 24) * i;
    const x1 = c + (r1 - 1) * Math.cos(a);
    const y1 = c + (r1 - 1) * Math.sin(a);
    const x2 = c + (r1 - 9) * Math.cos(a);
    const y2 = c + (r1 - 9) * Math.sin(a);
    return { x1, y1, x2, y2, on: i % 3 === 0 };
  });

  // mid ring "energy notches" — short arcs
  const arcCount = 8;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* halo */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute', width: size * 1.4, height: size * 1.4,
            borderRadius: (size * 1.4) / 2, backgroundColor: accent + '22',
          },
          Platform.OS === 'ios'
            ? { shadowColor: accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 24 }
            : null,
          { opacity: halo },
        ]}
      />
      {/* outer ring (counter-rotates) */}
      <Animated.View style={{ position: 'absolute', transform: [{ rotate: rot2 }] }}>
        <Svg width={size} height={size}>
          <Circle cx={c} cy={c} r={r1} fill="none" stroke={MECH.chrome} strokeWidth={2} />
          <Circle cx={c} cy={c} r={r1 - 2} fill="none" stroke={MECH.steelLo} strokeWidth={1} />
          {ticks.map((t, i) => (
            <Line
              key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={t.on ? accent : MECH.textDim}
              strokeWidth={t.on ? 1.5 : 1}
              opacity={t.on ? 0.95 : 0.5}
            />
          ))}
          {/* 4 bolt screws at cardinal points */}
          {[0, 90, 180, 270].map(deg => {
            const a = (deg * Math.PI) / 180;
            return (
              <Circle
                key={deg}
                cx={c + (r1 - 5) * Math.cos(a)} cy={c + (r1 - 5) * Math.sin(a)} r={2.6}
                fill={MECH.rivet} stroke={MECH.steelLo} strokeWidth={0.6}
              />
            );
          })}
        </Svg>
      </Animated.View>

      {/* mid ring (rotates clockwise) */}
      <Animated.View style={{ position: 'absolute', transform: [{ rotate: rot1 }] }}>
        <Svg width={size} height={size}>
          <Circle cx={c} cy={c} r={r2} fill="none" stroke={accent + '60'} strokeWidth={1.2} strokeDasharray="2 5" />
          {/* energy notches every 45° */}
          {Array.from({ length: arcCount }).map((_, i) => {
            const a = (Math.PI * 2 / arcCount) * i;
            const x1 = c + (r2 + 2) * Math.cos(a);
            const y1 = c + (r2 + 2) * Math.sin(a);
            const x2 = c + (r2 + 7) * Math.cos(a);
            const y2 = c + (r2 + 7) * Math.sin(a);
            return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={accent} strokeWidth={2} strokeLinecap="round" />;
          })}
        </Svg>
      </Animated.View>

      {/* inner static ring + central hex */}
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id="core-grad" cx="50%" cy="50%" r="60%">
            <Stop offset="0%"  stopColor={accent}     stopOpacity={active ? 1 : 0.3} />
            <Stop offset="60%" stopColor={accent}     stopOpacity={active ? 0.5 : 0.15} />
            <Stop offset="100%" stopColor="#000"      stopOpacity={1} />
          </RadialGradient>
        </Defs>
        {/* inner ring */}
        <Circle cx={c} cy={c} r={r3} fill="none" stroke={MECH.chrome} strokeWidth={1} opacity={0.6} />
        {/* central HEX */}
        <Polygon points={hexPts} fill="url(#core-grad)" stroke={accent} strokeWidth={1.6} strokeLinejoin="miter" />
        {/* hex inner outline */}
        <Polygon
          points={Array.from({ length: 6 }).map((_, i) => {
            const a = (Math.PI / 3) * i;
            return `${c + (hexR - 5) * Math.cos(a)},${c + (hexR - 5) * Math.sin(a)}`;
          }).join(' ')}
          fill="none" stroke={accent + '60'} strokeWidth={0.8}
        />
        {/* core dot */}
        <Circle cx={c} cy={c} r={4} fill="#fff" opacity={active ? 0.95 : 0.3} />
      </Svg>
    </View>
  );
}

/** Top "VISOR" — a thin chamfered bar with a scanning eye + LEDs + serial readout */
function VisorBar({ isConnected, serverAddr }: { isConnected: boolean; serverAddr: string }) {
  const scan = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(scan, { toValue: 1, duration: 2200, useNativeDriver: true }),
      Animated.timing(scan, { toValue: 0, duration: 2200, useNativeDriver: true }),
    ])).start();
  }, []);
  const tx = scan.interpolate({ inputRange: [0, 1], outputRange: [4, 130] });
  const eyeColor = isConnected ? MECH.emerald : MECH.plasma;

  return (
    <View style={mech.visorWrap}>
      <View style={mech.visorBar}>
        {/* left LED cluster */}
        <View style={mech.visorLeft}>
          <View style={[mech.led, { backgroundColor: MECH.emerald, shadowColor: MECH.emerald }]} />
          <View style={[mech.led, { backgroundColor: MECH.hazard, shadowColor: MECH.hazard }]} />
          <View style={[mech.led, { backgroundColor: eyeColor, shadowColor: eyeColor }]} />
        </View>

        {/* scanning eye chamber */}
        <View style={mech.eyeChamber}>
          <View style={mech.eyeChamberInner}>
            <Animated.View style={[mech.eyePupil, { transform: [{ translateX: tx }], backgroundColor: eyeColor, shadowColor: eyeColor }]} />
            {/* serial number readout overlay */}
          </View>
        </View>

        {/* right serial */}
        <View style={mech.visorRight}>
          <Text style={mech.visorSerial}>BLR-01·{(isConnected ? serverAddr.split('.').slice(-2).join('.') : 'STBY').toUpperCase()}</Text>
        </View>

        {/* chamfered corner cuts */}
        <View style={[mech.visorCornerL, { borderTopColor: MECH.chrome, borderRightColor: MECH.chrome }]} />
        <View style={[mech.visorCornerR, { borderTopColor: MECH.chrome, borderLeftColor: MECH.chrome }]} />

        {/* bolts */}
        <View style={[mech.boltAt, { top: 4, left: 4 }]}><Bolt size={7} /></View>
        <View style={[mech.boltAt, { top: 4, right: 4 }]}><Bolt size={7} /></View>
        <View style={[mech.boltAt, { bottom: 4, left: 4 }]}><Bolt size={7} /></View>
        <View style={[mech.boltAt, { bottom: 4, right: 4 }]}><Bolt size={7} /></View>
      </View>
    </View>
  );
}

// ─── MAIN HERO COMPONENT ─────────────────────────────────────────────────────

export function MechBayHero({
  isConnected, serverAddr, onScanQR, kbFindings, scriptCount,
}: {
  isConnected: boolean;
  serverAddr: string;
  onScanQR: () => void;
  kbFindings: number;
  scriptCount: number;
}) {
  const WRAP_W = SW - 16;          // outer wrap width approximation
  const sweepX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(sweepX, { toValue: 1, duration: 5500, useNativeDriver: true })).start();
  }, []);
  const sweepTx = sweepX.interpolate({ inputRange: [0, 1], outputRange: [-180, WRAP_W + 30] });

  const kbDisplay     = kbFindings > 0
    ? (kbFindings > 1_000_000 ? `${(kbFindings/1_000_000).toFixed(1)}M`
       : kbFindings > 1000 ? `${(kbFindings/1000).toFixed(1)}K`
       : String(kbFindings))
    : '—';
  const scriptDisplay = scriptCount > 0 ? String(scriptCount) : '—';

  const accent = isConnected ? MECH.arc : MECH.plasma;
  const statusTxt = isConnected ? 'CORE ONLINE'  : 'STANDBY';
  const statusCol = isConnected ? MECH.emerald   : MECH.hazard;

  const telemetry = [
    { lbl: 'VECTORS', val: kbDisplay,     col: MECH.arc },
    { lbl: 'SCRIPTS', val: scriptDisplay, col: MECH.plasma },
    { lbl: 'STATE',   val: isConnected ? 'LIVE' : 'IDLE', col: statusCol },
    { lbl: 'LANE',    val: 'LOCAL',       col: MECH.hazard },
  ];

  return (
    <View style={mech.hero}>
      {/* full background brushed metal */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <BrushedPanel width={WRAP_W} height={520} color={MECH.steel} />
        {/* hex grid overlay */}
        <Svg width={WRAP_W} height={520} style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: 8 }).map((_, r) =>
            Array.from({ length: 6 }).map((__, c) => {
              const hx = c * 56 + (r % 2 ? 28 : 0) - 20;
              const hy = r * 48 - 10;
              const pts = `${hx+8},${hy} ${hx+24},${hy} ${hx+32},${hy+14} ${hx+24},${hy+28} ${hx+8},${hy+28} ${hx},${hy+14}`;
              return (
                <Polygon
                  key={`${r}-${c}`} points={pts} fill="none"
                  stroke={MECH.chrome} strokeWidth={0.4} opacity={0.13}
                />
              );
            })
          )}
        </Svg>
        {/* diagonal sweep flare */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', top: 0, bottom: 0, width: 160,
            backgroundColor: accent, opacity: 0.05,
            transform: [{ translateX: sweepTx }, { skewX: '-22deg' }],
          }}
        />
      </View>

      {/* ── TOP VISOR ────────────────────────────────────────── */}
      <VisorBar isConnected={isConnected} serverAddr={serverAddr || ''} />

      {/* ── REACTOR CORE BLOCK ───────────────────────────────── */}
      <View style={mech.coreBlock}>
        {/* L-bracket frame */}
        <View pointerEvents="none" style={[mech.lBracket, { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderColor: accent + 'AA' }]} />
        <View pointerEvents="none" style={[mech.lBracket, { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderColor: MECH.plasma + 'AA' }]} />
        <View pointerEvents="none" style={[mech.lBracket, { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: MECH.hazard + 'AA' }]} />
        <View pointerEvents="none" style={[mech.lBracket, { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderColor: accent + 'AA' }]} />

        {/* status pill */}
        <View style={[mech.statusPill, { borderColor: statusCol + '80', backgroundColor: statusCol + '14' }]}>
          <View style={[mech.dot, { backgroundColor: statusCol, shadowColor: statusCol }]} />
          <Text style={[mech.statusTxt, { color: statusCol }]}>{statusTxt}</Text>
        </View>

        <ArcReactor size={172} accent={accent} active={isConnected} />

        {/* labels under core */}
        <Text style={[mech.title, { color: MECH.text }]}>
          BUTLER<Text style={{ color: accent }}> AI</Text>
        </Text>
        <Text style={[mech.sub, { color: accent + 'B8' }]}>MECH BAY · COMMAND DECK</Text>

        {/* serial code */}
        <View style={mech.serialBox}>
          <View style={[mech.dot, { backgroundColor: MECH.chrome, width: 4, height: 4, borderRadius: 2 }]} />
          <Text style={mech.serialTxt}>UNIT 01 · REV-A · {serverAddr || 'NO·LINK'}</Text>
          <View style={[mech.dot, { backgroundColor: MECH.chrome, width: 4, height: 4, borderRadius: 2 }]} />
        </View>
      </View>

      {/* ── HAZARD CHEVRON DIVIDER ───────────────────────────── */}
      <HazardStripe height={12} />

      {/* ── TELEMETRY STRIP ──────────────────────────────────── */}
      <View style={mech.telemetryRow}>
        {telemetry.map((t, i) => (
          <View key={i} style={[mech.telCell, i < telemetry.length - 1 && { borderRightWidth: 1, borderRightColor: MECH.steelLo }]}>
            {/* tiny LED above value */}
            <View style={[mech.telLed, { backgroundColor: t.col }]} />
            <Text style={[mech.telVal, { color: t.col, textShadowColor: t.col }]}>{t.val}</Text>
            <Text style={mech.telLbl}>{t.lbl}</Text>
          </View>
        ))}
      </View>

      {/* ── PRIMARY CTA — INDUSTRIAL BUTTON ───────────────────── */}
      <TouchableOpacity
        testID="hero-scan-qr"
        onPress={() => { haptics.medium(); onScanQR(); }}
        activeOpacity={0.85}
        style={[mech.ctaBtn, { backgroundColor: accent }]}
      >
        {/* hazard accent strip on the left */}
        <View style={mech.ctaHazardL} pointerEvents="none">
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={[mech.ctaHazardChev, { backgroundColor: i % 2 ? '#0A0A0A' : MECH.hazard }]} />
          ))}
        </View>
        {/* main label */}
        <View style={mech.ctaCenter}>
          <MaterialIcons name="qr-code-scanner" size={22} color={MECH.textOnArc} />
          <Text style={mech.ctaTxt}>
            {isConnected ? 'RE-PAIR PC' : 'INITIATE PAIRING'}
          </Text>
          <MaterialCommunityIcons name="chevron-triple-right" size={22} color={MECH.textOnArc} />
        </View>
        {/* corner bolts */}
        <View style={[mech.boltAt, { top: 6, left: 22 }]}><Bolt size={7} /></View>
        <View style={[mech.boltAt, { top: 6, right: 8 }]}><Bolt size={7} /></View>
        <View style={[mech.boltAt, { bottom: 6, left: 22 }]}><Bolt size={7} /></View>
        <View style={[mech.boltAt, { bottom: 6, right: 8 }]}><Bolt size={7} /></View>
      </TouchableOpacity>
    </View>
  );
}

// ─── HEX COMMAND RING ────────────────────────────────────────────────────────

const COMMAND_TILES = [
  { icon: 'code-braces-box',  lib: 'community' as const, label: 'SCRIPTS',   desc: 'Python automation', accent: MECH.arc,    tab: 'scripts'   },
  { icon: 'robot-excited',    lib: 'community' as const, label: 'BUTLER',    desc: 'Local AI chat',     accent: MECH.plasma, tab: 'butler'    },
  { icon: 'head-cog-outline', lib: 'community' as const, label: 'KB',        desc: 'Knowledge core',    accent: MECH.hazard, tab: 'knowledge' },
  { icon: 'toolbox-outline',  lib: 'community' as const, label: 'TOOLS',     desc: 'File · share · sys',accent: MECH.emerald,tab: 'fileshare' },
];

export function HexCommandRing({ goToTab }: { goToTab: (t: string) => void }) {
  // Compact 2x2 grid using flex: 1 + flexBasis so it adapts to any container
  const TILE_H = 124;

  return (
    <View style={mech.cmdWrap}>
      {/* heading bar — centered 3D */}
      <View style={mech.cmdHead}>
        <View style={mech.cmdHeadRail} />
        <View style={[mech.cmdHeadBar, { backgroundColor: MECH.arc }]} />
        <View style={{ position: 'relative', alignItems: 'center', paddingBottom: 7, maxWidth: '68%' }}>
          <Text
            style={[mech.cmdHeadTxt, { position: 'absolute', top: 2.5, left: 0, right: 0, color: '#000000', textAlign: 'center' }]}
            numberOfLines={1}
          >
            COMMAND MODULES
          </Text>
          <Text
            style={[mech.cmdHeadTxt, {
              color: '#F2F4F8', textAlign: 'center',
              textShadowColor: MECH.arc, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 9,
            }]}
            numberOfLines={1}
          >
            COMMAND MODULES
          </Text>
          <View style={{ position: 'absolute', bottom: 0, width: 34, height: 2.5, borderRadius: 1, backgroundColor: MECH.arc, opacity: 0.9 }} />
        </View>
        <View style={[mech.cmdHeadBar, { backgroundColor: MECH.plasma }]} />
        <View style={mech.cmdHeadRail} />
        <Text style={mech.cmdHeadCountTag}>04 / ONLINE</Text>
      </View>

      <View style={mech.cmdGrid}>
        {COMMAND_TILES.map((t, i) => {
          const Icon = t.lib === 'community' ? MaterialCommunityIcons : MaterialIcons;
          return (
            <TouchableOpacity
              key={i}
              testID={`quick-access-${t.tab}`}
              onPress={() => { haptics.light(); goToTab(t.tab); }}
              activeOpacity={0.82}
              style={[mech.cmdTile, { height: TILE_H }]}
            >
              {/* solid metal background */}
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: MECH.steelHi }]} />

              {/* accent top-bar */}
              <View style={[mech.cmdTopBar, { backgroundColor: t.accent }]} />

              {/* corner bolts (smaller for compact tile) */}
              <View style={[mech.boltAt, { top: 5, left: 5  }]}><Bolt size={7} /></View>
              <View style={[mech.boltAt, { top: 5, right: 5 }]}><Bolt size={7} /></View>
              <View style={[mech.boltAt, { bottom: 5, left: 5  }]}><Bolt size={7} /></View>
              <View style={[mech.boltAt, { bottom: 5, right: 5 }]}><Bolt size={7} /></View>

              {/* chamfered cuts */}
              <View style={mech.chamferTL} />
              <View style={mech.chamferBR} />

              {/* hex icon + label inline (compact horizontal layout) */}
              <View style={mech.cmdInner}>
                <View style={mech.cmdHexWrap}>
                  <View style={{ position: 'absolute' }}>
                    <HexShape size={42} fill={MECH.steelLo} stroke={t.accent} strokeWidth={1.4} />
                  </View>
                  <Icon name={t.icon as any} size={20} color={t.accent} />
                </View>
                <View style={mech.cmdTextCol}>
                  <Text style={[mech.cmdLabel, { color: MECH.text }]}>{t.label}</Text>
                  <Text style={mech.cmdDesc} numberOfLines={1}>{t.desc}</Text>
                  {/* compact gauge */}
                  <View style={mech.cmdGauge}>
                    <View style={[mech.cmdGaugeFill, { backgroundColor: t.accent, width: '68%' }]} />
                    <View style={[mech.cmdGaugeTick, { left: '50%' }]} />
                  </View>
                </View>
              </View>

              {/* serial badge bottom-right */}
              <Text style={[mech.cmdSerial, { color: t.accent + 'AA' }]}>M-{(i + 1).toString().padStart(2, '0')}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const mech = StyleSheet.create({
  // ── HERO ──────────────────────────────────────────────────
  hero: {
    backgroundColor: MECH.steel,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: MECH.chrome,
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 18 }
      : { elevation: 12 }),
  },

  // visor
  visorWrap: { paddingHorizontal: 8, paddingTop: 10 },
  visorBar: {
    height: 38,
    backgroundColor: '#050608',
    borderWidth: 1.2,
    borderColor: MECH.chrome,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  visorLeft:  { flexDirection: 'row', gap: 6, marginRight: 12 },
  visorRight: { marginLeft: 'auto' },
  led: {
    width: 6, height: 6, borderRadius: 3,
    ...(Platform.OS === 'ios' ? { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.95, shadowRadius: 4 } : { elevation: 3 }),
  },
  eyeChamber: {
    flex: 1, height: 18, backgroundColor: '#000', borderRadius: 9,
    borderWidth: 0.7, borderColor: MECH.chrome,
    overflow: 'hidden', justifyContent: 'center',
  },
  eyeChamberInner: { height: '100%', position: 'relative', justifyContent: 'center' },
  eyePupil: {
    position: 'absolute', width: 14, height: 14, borderRadius: 7, top: 2,
    ...(Platform.OS === 'ios' ? { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 7 } : { elevation: 5 }),
  },
  visorSerial: {
    fontSize: 10, fontWeight: '900', color: MECH.arc, fontFamily: MONO, letterSpacing: 1.4,
  },
  visorCornerL: {
    position: 'absolute', top: -1, left: -1, width: 14, height: 14, borderTopWidth: 2, borderRightWidth: 2,
    transform: [{ rotate: '-45deg' }, { translateX: -3 }, { translateY: 5 }],
  },
  visorCornerR: {
    position: 'absolute', top: -1, right: -1, width: 14, height: 14, borderTopWidth: 2, borderLeftWidth: 2,
    transform: [{ rotate: '45deg' }, { translateX: 3 }, { translateY: 5 }],
  },

  // core block
  coreBlock: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 12,
    position: 'relative',
  },
  lBracket: { position: 'absolute', width: 22, height: 22 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    ...(Platform.OS === 'ios' ? { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 5 } : { elevation: 3 }),
  },
  statusTxt: { fontSize: 10.5, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.6 },

  title: {
    marginTop: 12,
    fontSize: 28, fontWeight: '900', fontFamily: MONO, letterSpacing: 4,
    ...(Platform.OS === 'ios'
      ? { textShadowColor: MECH.arc, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 }
      : {}),
  },
  sub: {
    marginTop: 1, fontSize: 11, fontWeight: '800', fontFamily: MONO, letterSpacing: 4,
  },
  serialBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#0A0C10',
    borderWidth: 0.7, borderColor: MECH.steelHi,
  },
  serialTxt: {
    fontSize: 9, fontWeight: '800', fontFamily: MONO, color: MECH.chrome, letterSpacing: 1.4,
  },

  // hazard
  hazard: { width: '100%', overflow: 'hidden', backgroundColor: '#0A0A0A' },
  hazardInner: { flexDirection: 'row' },
  hazardChevron: { width: 14, transform: [{ skewX: '-25deg' }] },

  // telemetry
  telemetryRow: { flexDirection: 'row', backgroundColor: MECH.steelLo, paddingVertical: 8 },
  telCell: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  telLed: {
    width: 5, height: 5, borderRadius: 2.5, marginBottom: 1,
  },
  telVal: {
    fontSize: 20, fontWeight: '900', fontFamily: MONO, lineHeight: 22,
    ...(Platform.OS === 'ios' ? { textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 7 } : {}),
  },
  telLbl: { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.6, color: MECH.textMid },

  // CTA
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14,
    borderTopWidth: 2, borderTopColor: '#0A0A0A',
    position: 'relative',
  },
  ctaHazardL: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 14,
    overflow: 'hidden',
  },
  ctaHazardChev: { flex: 1, transform: [{ skewY: '-15deg' }] },
  ctaCenter: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14 },
  ctaTxt: {
    fontSize: 15, fontWeight: '900', fontFamily: MONO,
    color: MECH.textOnArc, letterSpacing: 2.5,
  },

  // bolt absolute positioning helper
  boltAt: { position: 'absolute' },

  // ── MECH PANEL (reusable section wrapper) ────────────────
  panel: {
    backgroundColor: MECH.steel,
    borderRadius: 8,
    borderWidth: 1.2,
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.55, shadowRadius: 10 }
      : { elevation: 7 }),
  },
  panelTopBar: { position: 'absolute', top: 0, left: 0, right: 60, height: 2.5 },
  panelTopNotch: { position: 'absolute', top: 0, right: 16, width: 30, height: 2.5 },
  panelBevelTop: {
    position: 'absolute', top: 2.5, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  panelBevelBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 1.5,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  panelCornerTL: {
    position: 'absolute', top: -1, left: -1, width: 14, height: 14,
    borderTopWidth: 2, borderLeftWidth: 2,
  },
  panelCornerTR: {
    position: 'absolute', top: -1, right: -1, width: 14, height: 14,
    borderTopWidth: 2, borderRightWidth: 2,
  },
  panelCornerBL: {
    position: 'absolute', bottom: -1, left: -1, width: 14, height: 14,
    borderBottomWidth: 2, borderLeftWidth: 2,
  },
  panelCornerBR: {
    position: 'absolute', bottom: -1, right: -1, width: 14, height: 14,
    borderBottomWidth: 2, borderRightWidth: 2,
  },
  panelHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 22, paddingTop: 12, paddingBottom: 4,
    justifyContent: 'center',
  },
  panelHeaderStack: { position: 'relative', alignItems: 'center', paddingBottom: 7, maxWidth: '74%' },
  panelHeaderLabel: {
    fontSize: 15, fontWeight: '900', fontFamily: MONO, letterSpacing: 2, textAlign: 'center',
  },
  panelHeaderLabelShadow: { position: 'absolute', top: 2.5, left: 0, right: 0, color: '#000000' },
  panelHeaderUnderline: { position: 'absolute', bottom: 0, width: 34, height: 2.5, borderRadius: 1, opacity: 0.9 },
  panelHeaderSub: {
    fontSize: 9.5, fontWeight: '800', fontFamily: MONO, letterSpacing: 1.4,
    color: MECH.textMid, marginTop: 3, textAlign: 'center',
  },
  panelHeaderTail: { flex: 1, height: 1.5, backgroundColor: MECH.steelLo, borderRadius: 1 },
  panelHeaderDot: { width: 5, height: 5, transform: [{ rotate: '45deg' }] },
  panelInner: { padding: 14, paddingTop: 10 },

  // ── COMMAND RING ─────────────────────────────────────────
  cmdWrap: { marginTop: 8 },
  cmdHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingHorizontal: 4, marginBottom: 10, position: 'relative',
  },
  cmdHeadRail: { flex: 1, height: 1.5, backgroundColor: MECH.steelLo, borderRadius: 1 },
  cmdHeadBar: { width: 5, height: 5, transform: [{ rotate: '45deg' }] },
  cmdHeadTxt: { fontSize: 15, fontWeight: '900', fontFamily: MONO, color: MECH.arc + 'CC', letterSpacing: 2 },
  cmdHeadCountTag: {
    position: 'absolute', right: 4, top: -7,
    fontSize: 7.5, fontWeight: '900', fontFamily: MONO, letterSpacing: 1,
    color: MECH.plasma + 'CC',
  },
  cmdGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4,
    justifyContent: 'space-between',
  },
  cmdTile: {
    width: '48.5%',
    backgroundColor: MECH.steelHi,
    borderRadius: 8,
    borderWidth: 1.2, borderColor: MECH.chrome,
    overflow: 'hidden',
    paddingTop: 14,
    paddingHorizontal: 8,
    paddingBottom: 10,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8 }
      : { elevation: 6 }),
  },
  cmdTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
  },
  chamferTL: {
    position: 'absolute', top: -1, left: -1, width: 14, height: 14,
    borderTopWidth: 2, borderLeftWidth: 2, borderColor: MECH.chrome,
  },
  chamferBR: {
    position: 'absolute', bottom: -1, right: -1, width: 14, height: 14,
    borderBottomWidth: 2, borderRightWidth: 2, borderColor: MECH.chrome,
  },
  cmdHexWrap: {
    alignSelf: 'center',
    width: 60, height: 52,
    alignItems: 'center', justifyContent: 'center',
    marginVertical: 8,
  },
  cmdLabel: {
    fontSize: 14, fontWeight: '900', fontFamily: MONO,
    textAlign: 'center', letterSpacing: 2,
  },
  cmdDesc: {
    fontSize: 10, fontFamily: MONO, color: MECH.textMid,
    textAlign: 'center', marginTop: 1, letterSpacing: 0.5,
  },
  cmdGauge: {
    marginTop: 8, height: 5, backgroundColor: '#000',
    borderRadius: 2, borderWidth: 0.7, borderColor: MECH.steelLo,
    position: 'relative', overflow: 'hidden',
  },
  cmdGaugeFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  cmdGaugeTick: {
    position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#000',
  },
  cmdLedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 6, justifyContent: 'center',
  },
  cmdLed: {
    width: 5, height: 5, borderRadius: 2.5,
    ...(Platform.OS === 'ios' ? { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4 } : { elevation: 2 }),
  },
  cmdSerial: { fontSize: 8, fontWeight: '900', fontFamily: MONO, marginLeft: 4, letterSpacing: 1 },
});

export default MechBayHero;
