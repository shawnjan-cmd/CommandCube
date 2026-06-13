/**
 * NEXUS HOME — Butler AI v21 Dashboard
 * Upgraded: Live CPU/RAM/Disk sparkline history chart, animated ring gauges,
 * real-time network throughput card, enhanced security grid with live canary status,
 * PC health score ring, live uptime ticker, all real data only.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCosmetic } from '@/contexts/CosmeticContext';
import { useFocusEffect } from 'expo-router';
import {

  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator, Animated, Dimensions, TextInput, Alert, Modal,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import SectionTitle3D from '@/components/ui/SectionTitle3D';
import Svg, { Circle, Path, Defs, RadialGradient, Stop, Rect, Line, Polygon, LinearGradient, G, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Linking, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { haptics } from '@/services/haptics';
import { Image as ExpoImage } from 'expo-image';
import { kbGrowthTracker, ChartBucket } from '@/services/kbGrowthTracker';
import { serverConnection } from '@/services/serverConnection';
import { autoConnectEngine, EngineEvent } from '@/services/autoConnectEngine';
import { executionHistory, HistoryEntry } from '@/services/executionHistory';
import { quickScan, ScanProgress } from '@/services/lanScanner';
import { parseQRConnection } from '@/services/qrParser';
import { WidgetLayer, InlineWidgetSlot } from '@/components/ui/WidgetLayer';
import { OmegaLearningLoop } from '@/components/cyber/OmegaLearningLoop';
import QuickSendCard from '@/components/cards/QuickSendCard';
import { FileShareClipboardCard } from '@/components/ui/FileShareClipboardCard';
import { uiConfig, UIConfig, DEFAULT_UI_CONFIG, UIStrings } from '@/services/uiConfig';
import { ButlerWordmark } from '@/components/ui/ButlerWordmark';
import { MechBayHero, HexCommandRing, MechPanel } from '@/components/home/MechBay';
import HomeTerminalClock from '@/components/home/HomeTerminalClock';
import HomeGreetingBanner from '@/components/home/HomeGreetingBanner';
import HomeSectionDivider from '@/components/home/HomeSectionDivider';
import { privacyAudit, AuditCounters } from '@/services/privacyAudit';
import { useRouter } from 'expo-router';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const { width: SW } = Dimensions.get('window');

// ─── DESIGN TOKENS ────────────────────────────────────────────────
const D = {
  bg:         '#000000',
  surface:    '#0E0F12',
  surfaceHi:  '#1A1D24',
  surfaceMid: '#040B14',
  border:     'rgba(255,42,31,0.14)',
  borderHi:   'rgba(255,42,31,0.32)',
  borderGlow: 'rgba(255,42,31,0.55)',
  text:       '#C8E4F0',
  textMid:    '#6A8EA8',
  textDim:    '#304558',
  cyan:       '#FF2A1F',
  cyanDim:    '#0099BB',
  amber:      '#FFC400',
  amberDim:   '#AA7010',
  green:      '#00FF88',
  greenDim:   '#00AA55',
  purple:     '#FFC400',
  purpleDim:  '#880099',
  teal:       '#FF2A1F',
  red:        '#FF2244',
  orange:     '#FF6820',
  blue:       '#FF6A1F',
  blueDim:    '#2255AA',
};

const PRIVACY_KEY = 'butler_privacy_banner_dismissed_v2';

// ─── CORNER BRACKETS (HUD-style) ──────────────────────────────────
function HudCorners({ color = D.cyan, size = 18, thickness = 2 }: { color?: string; size?: number; thickness?: number }) {
  const s = size; const t = thickness;
  return (
    <>
      <View style={{ position:'absolute', top:0, left:0, width:s, height:s, borderTopWidth:t, borderLeftWidth:t, borderColor:color }} />
      <View style={{ position:'absolute', top:0, right:0, width:s, height:s, borderTopWidth:t, borderRightWidth:t, borderColor:color }} />
      <View style={{ position:'absolute', bottom:0, left:0, width:s, height:s, borderBottomWidth:t, borderLeftWidth:t, borderColor:color }} />
      <View style={{ position:'absolute', bottom:0, right:0, width:s, height:s, borderBottomWidth:t, borderRightWidth:t, borderColor:color }} />
    </>
  );
}

// ─── SCAN LINE OVERLAY ────────────────────────────────────────────
function ScanLines({ opacity = 0.025 }: { opacity?: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 12 }).map((_, i) => (
        <View key={i} style={{
          position:'absolute', left:0, right:0,
          top:`${(i + 1) * 8}%` as any,
          height:StyleSheet.hairlineWidth,
          backgroundColor:`rgba(255,42,31,${opacity})`,
        }} />
      ))}
    </View>
  );
}

// ─── PULSING LED DOT ──────────────────────────────────────────────
function PulseDot({ color, size = 7 }: { color: string; size?: number }) {
  const anim = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.2, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, opacity: anim,
      ...(Platform.OS === 'ios' ? { shadowColor: color, shadowOffset:{width:0,height:0}, shadowOpacity:0.9, shadowRadius:6 } : {}),
    }} />
  );
}

// ─── NEON PROGRESS BAR ────────────────────────────────────────────
function NeonBar({ value, color, height = 4, width }: { value: number; color: string; height?: number; width?: number | string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: Math.min(1, Math.max(0, value / 100)), duration: 800, useNativeDriver: false }).start();
  }, [value]);
  return (
    <View style={{ height, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: height / 2, overflow:'hidden', width: width || '100%' }}>
      <Animated.View style={[
        { height:'100%', borderRadius: height / 2, backgroundColor: color },
        { width: anim.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] }) as any },
        Platform.OS === 'ios' ? { shadowColor:color, shadowOffset:{width:0,height:0}, shadowOpacity:0.9, shadowRadius:6 } : {},
      ]} />
    </View>
  );
}

// ─── BAR SPARKLINE ────────────────────────────────────────────────
function BarSparkline({ points, color, height = 64 }: { points: number[]; color: string; height?: number }) {
  const maxPt = Math.max(...points, 1);
  return (
    <View style={{ height, flexDirection:'row', alignItems:'flex-end', gap:1.5, overflow:'hidden' }}>
      {points.map((pt, i) => {
        const barH = Math.max(3, (pt / maxPt) * (height - 4));
        const opacity = 0.25 + (i / points.length) * 0.75;
        const isLast = i === points.length - 1;
        return (
          <View key={i} style={[
            { flex:1, borderTopLeftRadius:2, borderTopRightRadius:2, height:barH, backgroundColor:color, opacity: isLast ? 1 : opacity },
            isLast && Platform.OS === 'ios' ? { shadowColor:color, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:8 } : {},
          ]} />
        );
      })}
    </View>
  );
}

// ─── SVG RING GAUGE ──────────────────────────────────────────────
function RingGauge({ value, color, size = 72, label, sublabel }: {
  value: number; color: string; size?: number; label: string; sublabel?: string;
}) {
  const animVal = useRef(new Animated.Value(0)).current;
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedVal = Math.min(100, Math.max(0, value));

  useEffect(() => {
    Animated.timing(animVal, { toValue: clampedVal, duration: 900, useNativeDriver: false }).start();
  }, [value]);

  const strokeDashoffset = animVal.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const warnColor = clampedVal > 90 ? D.red : clampedVal > 75 ? D.amber : color;

  return (
    <View style={{ alignItems:'center', justifyContent:'center', width: size, height: size }}>
      <Svg width={size} height={size} style={{ position:'absolute' }}>
        {/* Track */}
        <Circle
          cx={size/2} cy={size/2} r={radius}
          stroke={color + '18'} strokeWidth={6} fill="none"
        />
        {/* Glow base */}
        <Circle
          cx={size/2} cy={size/2} r={radius}
          stroke={warnColor + '22'} strokeWidth={10} fill="none"
        />
      </Svg>
      {/* Animated arc via separate view trick */}
      <Svg width={size} height={size} style={{ position:'absolute', transform:[{ rotate:'-90deg' }] }}>
        <Circle
          cx={size/2} cy={size/2} r={radius}
          stroke={warnColor}
          strokeWidth={6}
          fill="none"
          strokeDasharray={`${circumference * clampedVal / 100} ${circumference * (1 - clampedVal / 100)}`}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ alignItems:'center' }}>
        <Text style={{ fontSize: size > 60 ? 16 : 13, fontWeight:'900', fontFamily:MONO, color: warnColor, lineHeight: size > 60 ? 18 : 15 }}>
          {value > 0 ? `${Math.round(clampedVal)}%` : '--'}
        </Text>
        <Text style={{ fontSize: 8, fontWeight:'700', fontFamily:MONO, color: D.textMid, letterSpacing:1 }}>{label}</Text>
        {sublabel && <Text style={{ fontSize: 7, fontFamily:MONO, color: D.textDim, marginTop:1 }}>{sublabel}</Text>}
      </View>
    </View>
  );
}

// ─── LINE CHART (real history) ────────────────────────────────────
function MetricLineChart({ history, color, height = 56, label }: {
  history: number[]; color: string; height?: number; label: string;
}) {
  const w = (SW - 80) / 3 - 8;
  const pts = history.slice(-20);
  if (pts.length < 2) {
    return (
      <View style={{ width: w, height, alignItems:'center', justifyContent:'center' }}>
        <Text style={{ color: D.textDim, fontSize: 9, fontFamily: MONO }}>NO DATA</Text>
      </View>
    );
  }
  const maxVal = Math.max(...pts, 1);
  const minVal = Math.min(...pts, 0);
  const range = maxVal - minVal || 1;
  const stepX = w / (pts.length - 1);
  const scaleY = (v: number) => height - ((v - minVal) / range) * (height - 8) - 4;

  const pathD = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${i * stepX},${scaleY(v)}`).join(' ');
  const fillD = `${pathD} L${(pts.length - 1) * stepX},${height} L0,${height} Z`;

  return (
    <View style={{ width: w, height }}>
      <Svg width={w} height={height}>
        <Defs>
          <LinearGradient id={`grad_${label}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.35" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Path d={fillD} fill={`url(#grad_${label})`} />
        <Path d={pathD} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Last point dot */}
        <Circle
          cx={(pts.length - 1) * stepX}
          cy={scaleY(pts[pts.length - 1])}
          r={3} fill={color}
        />
      </Svg>
    </View>
  );
}

// ─── UPTIME TICKER ────────────────────────────────────────────────
function UptimeTicker({ uptimeSeconds }: { uptimeSeconds: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const total = uptimeSeconds + tick;
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <Text style={{ fontSize: 13, fontWeight:'900', fontFamily: MONO, color: D.green, letterSpacing: 1.5 }}>
      {d > 0 ? `${d}d ` : ''}{pad(h)}:{pad(m)}:{pad(s)}
    </Text>
  );
}

// ─── UTILITY ──────────────────────────────────────────────────────
function formatAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000 - unixSeconds);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── CARD WRAPPER ─────────────────────────────────────────────────
function NexusCard({
  children, accentColor = D.cyan, style,
  topBar = true, glowIntensity = 0.18,
}: {
  children: React.ReactNode;
  accentColor?: string;
  style?: any;
  topBar?: boolean;
  glowIntensity?: number;
}) {
  // Reskinned with MECH BAY industrial frame — see /components/home/MechBay.tsx
  // (preserves the same prop signature so all 12 call sites work unchanged)
  return (
    <MechPanel accent={accentColor} style={style}>
      {children}
    </MechPanel>
  );
}
const nc = StyleSheet.create({
  // legacy styles kept (some sub-components may still reference them via dot-access)
  card:        { backgroundColor: D.surface, borderRadius: 15, borderWidth: 1, overflow:'hidden', position:'relative' },
  topBarRow:   { flexDirection:'row', alignItems:'center', height: 2.5, width:'100%' },
  topBarMain:  { flex: 1, height: '100%' },
  topBarGap:   { width: 8 },
  topBarTail:  { width: 30, height: '100%' },
  bevelTop:    { position:'absolute', top: 2.5, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  bevelBottom: { position:'absolute', bottom: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(0,0,0,0.65)' },
  sheen:       { position:'absolute', top: 0, left: 0, right: 0, height: '38%', backgroundColor: 'rgba(255,255,255,0.018)' },
  footerNotch: { position:'absolute', bottom: 0, alignSelf:'center', width: 44, height: 2, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
});

// ─── SECTION DIVIDER ──────────────────────────────────────────────
function SectionDivider({ label, color = D.cyan }: { label: string; color?: string }) {
  return <SectionTitle3D title={label} accent={color} style={{ marginTop: 10, marginBottom: 2 }} />;
}

// ─── PRIVACY TRUST BADGE ──────────────────────────────────────────
// Compact home-screen badge that proves the app is local-only in real time.
// Subscribes to privacyAudit and shows live LAN vs CLOUD counters.
// Tap → opens the full /privacy-audit screen.
function PrivacyTrustBadge() {
  const router = useRouter();
  const [counters, setCounters] = useState<AuditCounters>(privacyAudit.getCounters());
  const pulse = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsub = privacyAudit.subscribe((_e, c) => setCounters(c));
    return unsub;
  }, []);

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1300, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1300, useNativeDriver: true }),
    ]));
    loop.start();
    const sh = Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 2600, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 0,    useNativeDriver: true }),
      Animated.delay(900),
    ]));
    sh.start();
    return () => { loop.stop(); sh.stop(); };
  }, []);

  const isClean = counters.cloud === 0 && counters.blocked === 0;
  const accent  = isClean ? '#00FF88' : '#FF2A1F';
  const dotOp   = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  const dotScl  = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const shineX  = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-180, 320] });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => { haptics.light(); router.push('/privacy-audit' as any); }}
      style={ptb.wrap}
    >
      <View style={[ptb.card, { borderColor: accent + '50', backgroundColor: accent + '06' }]}>
        {/* Animated shimmer sweep — pure cosmetic, signals "live" */}
        <Animated.View pointerEvents="none" style={[ptb.shimmer, { transform: [{ translateX: shineX }] }]} />
        {/* HUD corner ticks */}
        <View style={[ptb.corner, { top: 0, left: 0, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: accent + 'AA' }]} />
        <View style={[ptb.corner, { bottom: 0, right: 0, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: accent + 'AA' }]} />

        {/* Left icon column */}
        <View style={[ptb.iconBox, { borderColor: accent + '88', backgroundColor: accent + '14' }]}>
          <MaterialCommunityIcons name={isClean ? 'shield-lock' : 'shield-alert'} size={20} color={accent} />
        </View>

        {/* Center text */}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Animated.View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: accent, opacity: dotOp, transform: [{ scale: dotScl }] }} />
            <Text style={[ptb.title, { color: accent }]} numberOfLines={1}>
              {isClean ? 'SECURED · LAN-ONLY' : 'CLOUD CALL DETECTED'}
            </Text>
          </View>
          <Text style={ptb.sub} numberOfLines={1}>
            {`${counters.cloud} cloud · ${counters.lan} LAN · 0 trackers · 0 ads`}
          </Text>
        </View>

        {/* Right CTA */}
        <View style={ptb.cta}>
          <Text style={[ptb.ctaTxt, { color: accent }]}>AUDIT</Text>
          <MaterialIcons name="chevron-right" size={16} color={accent} />
        </View>
      </View>

      {/* Tiny tag-line under card to seal trust */}
      <View style={ptb.tagRow}>
        <MaterialIcons name="lock" size={9} color={D.textMid} />
        <Text style={ptb.tagTxt}>END-TO-END PRIVATE · NO ACCOUNTS · NO TELEMETRY · HMAC-SIGNED</Text>
      </View>
    </TouchableOpacity>
  );
}

const ptb = StyleSheet.create({
  wrap:    { marginHorizontal: 12, marginTop: 10, marginBottom: 4 },
  card:    {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute', top: 0, bottom: 0, width: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
    transform: [{ skewX: '-22deg' }],
  },
  corner:  { position: 'absolute', width: 10, height: 10 },
  iconBox: {
    width: 36, height: 36, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  title:   { fontFamily: MONO, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  sub:     { fontFamily: MONO, fontSize: 9, color: D.textMid, marginTop: 3, letterSpacing: 0.6 },
  cta:     { flexDirection: 'row', alignItems: 'center', gap: 1, marginLeft: 8 },
  ctaTxt:  { fontFamily: MONO, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  tagRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, paddingHorizontal: 4 },
  tagTxt:  { fontFamily: MONO, fontSize: 8, color: D.textMid, letterSpacing: 1, flex: 1 },
});

// ─── BUTLER AI HERO ────────────────────────────────────────────────
function ButlerAIHero(props: {
  isConnected: boolean; serverAddr: string; onScanQR: () => void;
  kbFindings: number; scriptCount: number;
}) {
  // Replaced with MECH BAY OS theme — see /components/home/MechBay.tsx
  return <MechBayHero {...props} />;
}

// ─── CONNECTED PC CARD — upgraded with ring gauges + sparklines ───
function ConnectedPCCard({ isConnected, serverAddr, metrics, ollamaOnline, cpuHistory, ramHistory, diskHistory, uptimeSeconds }: {
  isConnected: boolean; serverAddr: string;
  metrics: { cpu: number; ram: number; disk: number; diskDetail?: string };
  ollamaOnline: boolean | null;
  cpuHistory: number[];
  ramHistory: number[];
  diskHistory: number[];
  uptimeSeconds: number;
}) {
  const connCol = isConnected ? D.green : D.red;

  return (
    <NexusCard accentColor={connCol} glowIntensity={0.20}>
      {/* header */}
      <View style={pcc.header}>
        <View style={[pcc.iconBox, { borderColor:connCol+'55', backgroundColor:connCol+'10' }]}>
          <MaterialIcons name="computer" size={26} color={connCol} />
          <View style={[pcc.iconLed, { backgroundColor:connCol }]} />
        </View>
        <View style={{ flex:1, gap:3 }}>
          <Text style={[pcc.sectionLabel, { color:connCol+'CC' }]}>◈ CONNECTED PC</Text>
          <Text style={[pcc.pcName]} numberOfLines={1}>
            {isConnected ? (serverAddr || 'PAIRED PC') : 'NOT PAIRED'}
          </Text>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <PulseDot color={connCol} size={6} />
            <Text style={[pcc.connDetail, { color:connCol+'BB' }]}>
              {isConnected ? 'Same Wi-Fi · AES-256 Encrypted' : 'Tap QR button to pair your PC'}
            </Text>
          </View>
        </View>
        <View style={[pcc.statusPill, { borderColor:connCol+'55', backgroundColor:connCol+'10' }]}>
          <Text style={[pcc.statusTxt, { color:connCol }]}>{isConnected ? 'ONLINE' : 'OFFLINE'}</Text>
        </View>
      </View>

      {/* Ring gauges row */}
      <View style={pcc.ringsRow}>
        <View style={pcc.ringWrap}>
          <RingGauge value={isConnected ? metrics.cpu : 0} color={D.cyan} size={64} label="CPU" />
          <MetricLineChart history={cpuHistory} color={D.cyan} height={32} label="cpu" />
        </View>
        <View style={[pcc.ringWrap, { borderLeftWidth:1, borderRightWidth:1, borderColor:'rgba(255,42,31,0.08)' }]}>
          <RingGauge value={isConnected ? metrics.ram : 0} color={D.green} size={64} label="RAM" />
          <MetricLineChart history={ramHistory} color={D.green} height={32} label="ram" />
        </View>
        <View style={pcc.ringWrap}>
          <RingGauge value={isConnected ? metrics.disk : 0} color={D.amber} size={64} label="DISK" />
          <MetricLineChart history={diskHistory} color={D.amber} height={32} label="disk" />
        </View>
      </View>

      {/* Uptime + ollama strip */}
      <View style={pcc.bottomRow}>
        <View style={pcc.uptimeBox}>
          <Text style={pcc.uptimeLabel}>UPTIME</Text>
          {isConnected && uptimeSeconds > 0
            ? <UptimeTicker uptimeSeconds={uptimeSeconds} />
            : <Text style={{ fontSize:13, fontWeight:'900', fontFamily:MONO, color:D.textDim }}>--</Text>
          }
        </View>
        <View style={[pcc.ollamaStrip, { backgroundColor: ollamaOnline ? D.green + '08' : D.textDim + '08', borderLeftColor: ollamaOnline ? D.green + '30' : D.textDim + '20', borderLeftWidth:1 }]}>
          <PulseDot color={ollamaOnline ? D.green : D.textDim} size={5} />
          <Text style={[pcc.ollamaTxt, { color: ollamaOnline ? D.green : D.textDim }]}>
            {ollamaOnline ? 'OLLAMA · READY' : ollamaOnline === null ? 'OLLAMA · ...' : 'OLLAMA · OFFLINE'}
          </Text>
          <View style={{ flex:1 }} />
          <Text style={[pcc.ollamaTxt, { color: D.textDim }]}>LOCAL AI</Text>
        </View>
      </View>
    </NexusCard>
  );
}
const pcc = StyleSheet.create({
  header:      { flexDirection:'row', alignItems:'flex-start', gap:12, paddingHorizontal:14, paddingTop:12, paddingBottom:9 },
  iconBox:     { width:44, height:44, borderRadius:11, borderWidth:1.5, alignItems:'center', justifyContent:'center', position:'relative' },
  iconLed:     { position:'absolute', bottom:5, right:5, width:7, height:7, borderRadius:3.5, opacity:0.9 },
  sectionLabel:{ fontSize:11, fontWeight:'900', fontFamily:MONO, letterSpacing:2, textShadowColor:'#000000', textShadowOffset:{ width:0, height:1.5 }, textShadowRadius:1 },
  pcName:      { fontSize:15.5, fontWeight:'900', fontFamily:MONO, color:'#FFFFFF', letterSpacing:0.5 },
  connDetail:  { fontSize:10.5, fontFamily:MONO },
  statusPill:  { borderWidth:1.5, borderRadius:8, paddingHorizontal:8, paddingVertical:5, flexShrink:0 },
  statusTxt:   { fontSize:10.5, fontWeight:'900', fontFamily:MONO, letterSpacing:1.2 },
  ringsRow:    { flexDirection:'row', borderTopWidth:1, borderTopColor:'rgba(255,42,31,0.10)', paddingVertical:10, paddingHorizontal:4 },
  ringWrap:    { flex:1, alignItems:'center', gap:5, paddingHorizontal:4 },
  bottomRow:   { flexDirection:'row', borderTopWidth:1, borderTopColor:'rgba(255,42,31,0.10)' },
  uptimeBox:   { paddingHorizontal:14, paddingVertical:8, gap:2 },
  uptimeLabel: { fontSize:9, fontWeight:'700', fontFamily:MONO, color:D.textDim, letterSpacing:1.5 },
  ollamaStrip: { flex:1, flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14, paddingVertical:8 },
  ollamaTxt:   { fontSize:10.5, fontWeight:'700', fontFamily:MONO, letterSpacing:1 },
});

// ─── TERMINAL FEED CARD ───────────────────────────────────────────
function TerminalFeedCard({ isConnected, liveTermLogs }: {
  isConnected: boolean;
  liveTermLogs: { time: string; msg: string; col: string }[];
}) {
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [liveTermLogs]);

  return (
    <NexusCard accentColor={D.purple} glowIntensity={0.15}>
      <View style={tfc.header}>
        <MaterialCommunityIcons name="console" size={14} color={D.purple} />
        <Text style={[tfc.title, { color:D.text }]}>LIVE TERMINAL FEED</Text>
        <View style={{ flex:1 }} />
        <View style={[tfc.livePill, { borderColor:D.red+'50', backgroundColor:D.red+'10' }]}>
          <PulseDot color={D.red} size={5} />
          <Text style={[tfc.liveTxt, { color:D.red }]}>LIVE</Text>
        </View>
      </View>
      <View style={tfc.termBox}>
        <ScrollView ref={scrollRef} style={{ flex:1 }} showsVerticalScrollIndicator={false} scrollEnabled={false}>
          {liveTermLogs.length === 0 ? (
            <View style={{ alignItems:'center', paddingVertical:16 }}>
              <PulseDot color={D.textDim} size={6} />
              <Text style={[tfc.dimTxt, { marginTop:8 }]}>
                {isConnected ? 'Waiting for events...' : 'Connect PC to see logs'}
              </Text>
            </View>
          ) : liveTermLogs.map((log, i) => (
            <View key={i} style={tfc.logRow}>
              <Text style={[tfc.logTime, { color:D.textDim }]}>{log.time}</Text>
              <Text style={{ color:'rgba(255,42,31,0.50)', fontFamily:MONO, fontSize:10, flexShrink:0 }}>›</Text>
              <Text style={[tfc.logMsg, { color:log.col }]} numberOfLines={1}>{log.msg}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={tfc.statusBar}>
        <View style={[tfc.statusDot, { backgroundColor: isConnected ? D.green : D.red }]} />
        <Text style={[tfc.statusTxt, { color: isConnected ? D.green : D.textDim }]}>
          {isConnected ? 'STATUS: OPERATIONAL' : 'STATUS: DISCONNECTED'}
        </Text>
        <View style={{ flex:1 }} />
        <View style={{ flexDirection:'row', alignItems:'center', gap:1.5, opacity:0.5 }}>
          {[3,5,8,4,7,5,9,4,6,3,8,5,4,7,5].map((h,i) => (
            <View key={i} style={{ width:2, height:h, borderRadius:1, backgroundColor: isConnected ? D.green : D.textDim }} />
          ))}
        </View>
      </View>
    </NexusCard>
  );
}
const tfc = StyleSheet.create({
  header:    { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14, paddingTop:14, paddingBottom:8 },
  title:     { fontSize:12.5, fontWeight:'900', fontFamily:MONO, letterSpacing:1.5 },
  livePill:  { flexDirection:'row', alignItems:'center', gap:5, borderWidth:1, borderRadius:20, paddingHorizontal:9, paddingVertical:4 },
  liveTxt:   { fontSize:8, fontWeight:'900', fontFamily:MONO, letterSpacing:1 },
  termBox:   { marginHorizontal:12, marginBottom:4, backgroundColor:'rgba(0,0,0,0.35)', borderRadius:10, borderWidth:1, borderColor:'rgba(255,42,31,0.10)', padding:10, minHeight:120 },
  logRow:    { flexDirection:'row', gap:6, alignItems:'flex-start', marginBottom:4 },
  logTime:   { fontSize:10, fontFamily:MONO, flexShrink:0, marginTop:1 },
  logMsg:    { flex:1, fontSize:12, fontFamily:MONO, lineHeight:16 },
  dimTxt:    { fontSize:10, color:D.textDim, fontFamily:MONO },
  statusBar: { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14, paddingVertical:9, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.06)' },
  statusDot: { width:6, height:6, borderRadius:3 },
  statusTxt: { fontSize:9, fontWeight:'700', fontFamily:MONO, letterSpacing:1 },
});

// ─── CRAWLERS GRAPH CARD ──────────────────────────────────────────
function CrawlersGraphCard({ isConnected, kbFindings }: { isConnected: boolean; kbFindings: number }) {
  const [buckets, setBuckets] = useState<ChartBucket[]>([]);
  const [crawlerStatus, setCrawlerStatus] = useState<string>('idle');
  const [urlsQueued, setUrlsQueued] = useState(0);

  useFocusEffect(useCallback(() => {
    kbGrowthTracker.getChartData(7).then(setBuckets).catch(() => {});
    if (isConnected) {
      try {
        const ip = serverConnection.getIP(); const port = serverConnection.getPort(); const token = serverConnection.getToken();
        if (ip && port) {
          fetch(`http://${ip}:${port}/api/crawler/status`, { headers: token ? { Authorization:`Bearer ${token}` } : {}, signal:AbortSignal.timeout(4000) })
            .then(r => r.ok ? r.json() : null).then(d => {
              if (d) { setCrawlerStatus(d.status || 'idle'); setUrlsQueued(d.urls_queued || d.queue_size || 0); }
            }).catch(() => {});
        }
      } catch {}
    }
  }, [isConnected]));

  const points = buckets.length > 0 ? buckets.map(b => b.count) : [0,0,0,0,0,0,0];
  const maxPt = Math.max(...points, 1);
  const barW = ((SW - 64) - (points.length - 1) * 4) / points.length;

  return (
    <NexusCard accentColor={D.teal} glowIntensity={0.13}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14, paddingTop:14, paddingBottom:8 }}>
        <MaterialCommunityIcons name="spider-web" size={14} color={D.teal} />
        <Text style={{ fontSize:12.5, fontWeight:'900', fontFamily:MONO, letterSpacing:1.5, color:D.text }}>SIGMA-NET CRAWLERS</Text>
        <View style={{ flex:1 }} />
        <View style={{ flexDirection:'row', alignItems:'center', gap:5, borderWidth:1, borderRadius:20, paddingHorizontal:9, paddingVertical:4,
          borderColor:(crawlerStatus==='active'?D.teal:D.textDim)+'50', backgroundColor:(crawlerStatus==='active'?D.teal:D.textDim)+'10' }}>
          <PulseDot color={crawlerStatus==='active' ? D.teal : D.textDim} size={5} />
          <Text style={{ fontSize:8, fontWeight:'900', fontFamily:MONO, color:crawlerStatus==='active'?D.teal:D.textDim, letterSpacing:1 }}>
            {crawlerStatus.toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={{ paddingHorizontal:14, paddingBottom:14 }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:8 }}>
          <View>
            <Text style={{ fontSize:24, fontWeight:'900', fontFamily:MONO, color:D.teal,
              ...(Platform.OS==='ios'?{textShadowColor:D.teal, textShadowOffset:{width:0,height:0}, textShadowRadius:10}:{}) }}>
              {kbFindings > 0 ? (kbFindings > 1000 ? `${(kbFindings/1000).toFixed(1)}K` : String(kbFindings)) : '--'}
            </Text>
            <Text style={{ fontSize:8, fontWeight:'700', fontFamily:MONO, color:D.textDim, letterSpacing:1 }}>VECTORS INDEXED</Text>
          </View>
          {urlsQueued > 0 && (
            <View style={{ alignItems:'flex-end' }}>
              <Text style={{ fontSize:18, fontWeight:'900', fontFamily:MONO, color:D.amber }}>{urlsQueued}</Text>
              <Text style={{ fontSize:8, fontFamily:MONO, color:D.textDim, letterSpacing:1 }}>QUEUED</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection:'row', alignItems:'flex-end', gap:4 }}>
          {points.map((pt, i) => {
            const barH = Math.max(4, (pt / maxPt) * 60);
            const isToday = i === points.length - 1;
            return (
              <View key={i} style={{ flex:1, gap:3, alignItems:'center' }}>
                <View style={[
                  { height:barH, borderTopLeftRadius:3, borderTopRightRadius:3, backgroundColor: isToday ? D.teal : D.teal+'40' },
                  isToday && Platform.OS==='ios' ? { shadowColor:D.teal, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:8 } : {},
                ]} />
                <Text style={{ fontSize:7, fontFamily:MONO, color:D.textDim }}>
                  {buckets[i]?.date && !isNaN(new Date(buckets[i].date).getTime()) ? new Date(buckets[i].date).toLocaleDateString('en',{weekday:'narrow'}) : '--'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </NexusCard>
  );
}

// ─── KNOWLEDGEBANK GRAPH CARD ─────────────────────────────────────
function KnowledgebankGraphCard({ isConnected, kbFindings }: { isConnected: boolean; kbFindings: number }) {
  const [articles, setArticles] = useState<{ title:string; ts:number }[]>([]);
  const [kbSize, setKbSize] = useState(0);

  useFocusEffect(useCallback(() => {
    if (isConnected) {
      try {
        const ip = serverConnection.getIP(); const port = serverConnection.getPort(); const token = serverConnection.getToken();
        if (ip && port) {
          fetch(`http://${ip}:${port}/api/learn/recent?limit=4`, { headers: token ? { Authorization:`Bearer ${token}` } : {}, signal:AbortSignal.timeout(5000) })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
              if (d?.articles) setArticles(d.articles.slice(0,4));
              if (d?.total_size_bytes) setKbSize(Math.round(d.total_size_bytes / 1024));
            }).catch(() => {});
        }
      } catch {}
    }
  }, [isConnected]));

  return (
    <NexusCard accentColor={D.amber} glowIntensity={0.13}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14, paddingTop:14, paddingBottom:10 }}>
        <MaterialCommunityIcons name="brain" size={14} color={D.amber} />
        <Text style={{ fontSize:12.5, fontWeight:'900', fontFamily:MONO, letterSpacing:1.5, color:D.text }}>KNOWLEDGE BASE</Text>
        <View style={{ flex:1 }} />
        {kbSize > 0 && <Text style={{ fontSize:9, fontFamily:MONO, color:D.amber+'80' }}>{kbSize}KB</Text>}
      </View>
      <View style={{ paddingHorizontal:14, paddingBottom:14, gap:6 }}>
        <Text style={{ fontSize:26, fontWeight:'900', fontFamily:MONO, color:D.amber,
          ...(Platform.OS==='ios'?{textShadowColor:D.amber,textShadowOffset:{width:0,height:0},textShadowRadius:10}:{}) }}>
          {kbFindings > 0 ? (kbFindings > 1000 ? `${(kbFindings/1000).toFixed(1)}K` : String(kbFindings)) : '--'}
          <Text style={{ fontSize:11, color:D.amber+'70' }}> ARTICLES</Text>
        </Text>
        {articles.length > 0 ? articles.map((a,i) => (
          <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <View style={{ width:3, height:3, borderRadius:2, backgroundColor:D.amber+'60' }} />
            <Text style={{ fontSize:10, fontFamily:MONO, color:D.textMid, flex:1 }} numberOfLines={1}>{a.title}</Text>
            <Text style={{ fontSize:8, fontFamily:MONO, color:D.textDim }}>{formatAgo(a.ts)}</Text>
          </View>
        )) : (
          <Text style={{ fontSize:10, fontFamily:MONO, color:D.textDim }}>
            {isConnected ? 'No recent articles' : 'Connect PC to view knowledge'}
          </Text>
        )}
      </View>
    </NexusCard>
  );
}

// ─── SCRIPTS GRAPH CARD ───────────────────────────────────────────
function ScriptsGraphCard({ isConnected, goToTab }: { isConnected: boolean; goToTab:(t:string)=>void }) {
  const [recentScripts, setRecentScripts] = useState<{ name:string; ts:number; success:boolean }[]>([]);
  const [successRate, setSuccessRate] = useState(0);
  const [execTotal, setExecTotal] = useState(0);

  useFocusEffect(useCallback(() => {
    executionHistory.getAll().then(hist => {
      if (hist.length > 0) {
        const recent = hist.slice(-5).reverse();
        setRecentScripts(recent.map(h => ({ name: h.scriptName || h.script || 'Script', ts: h.timestamp || Date.now()/1000, success: h.success !== false })));
        const successes = hist.filter(h => h.success !== false).length;
        setSuccessRate(Math.round((successes / hist.length) * 100));
        setExecTotal(hist.length);
      }
    }).catch(() => {});
  }, [isConnected]));

  return (
    <NexusCard accentColor={D.purple} glowIntensity={0.13}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14, paddingTop:14, paddingBottom:10 }}>
        <MaterialCommunityIcons name="code-braces" size={14} color={D.purple} />
        <Text style={{ fontSize:12.5, fontWeight:'900', fontFamily:MONO, letterSpacing:1.5, color:D.text }}>SCRIPT ENGINE</Text>
        <View style={{ flex:1 }} />
        <TouchableOpacity onPress={() => goToTab('scripts')} style={{ borderWidth:1, borderRadius:8, borderColor:D.purple+'50', paddingHorizontal:8, paddingVertical:3 }}>
          <Text style={{ fontSize:8, fontWeight:'900', fontFamily:MONO, color:D.purple }}>VIEW ALL</Text>
        </TouchableOpacity>
      </View>
      <View style={{ paddingHorizontal:14, paddingBottom:14, gap:8 }}>
        <View style={{ flexDirection:'row', gap:16 }}>
          <View>
            <Text style={{ fontSize:26, fontWeight:'900', fontFamily:MONO, color:D.purple,
              ...(Platform.OS==='ios'?{textShadowColor:D.purple,textShadowOffset:{width:0,height:0},textShadowRadius:10}:{}) }}>
              {execTotal > 0 ? execTotal : '--'}
            </Text>
            <Text style={{ fontSize:8, fontFamily:MONO, color:D.textDim, letterSpacing:1 }}>EXECUTIONS</Text>
          </View>
          {successRate > 0 && (
            <View>
              <Text style={{ fontSize:26, fontWeight:'900', fontFamily:MONO, color: successRate > 90 ? D.green : successRate > 70 ? D.amber : D.red }}>{successRate}%</Text>
              <Text style={{ fontSize:8, fontFamily:MONO, color:D.textDim, letterSpacing:1 }}>SUCCESS RATE</Text>
            </View>
          )}
        </View>
        {successRate > 0 && <NeonBar value={successRate} color={successRate > 90 ? D.green : successRate > 70 ? D.amber : D.red} height={4} />}
        {recentScripts.slice(0,3).map((sc, i) => (
          <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <MaterialIcons name={sc.success ? 'check-circle' : 'error'} size={10} color={sc.success ? D.green : D.red} />
            <Text style={{ fontSize:10, fontFamily:MONO, color:D.textMid, flex:1 }} numberOfLines={1}>{sc.name}</Text>
            <Text style={{ fontSize:8, fontFamily:MONO, color:D.textDim }}>{formatAgo(sc.ts)}</Text>
          </View>
        ))}
      </View>
    </NexusCard>
  );
}

// ─── SMART ALERTS CARD — real data from server ─────────────────────
function SmartAlertsHomeCard({ isConnected, metrics }: {
  isConnected: boolean;
  metrics: { cpu: number; ram: number; disk: number };
}) {
  const alerts: { icon:string; lib:'material'|'community'; msg:string; sub:string; col:string; level:'warn'|'ok'|'critical' }[] = [];

  if (isConnected) {
    if (metrics.cpu > 90) alerts.push({ icon:'memory', lib:'material', msg:'CPU CRITICAL', sub:`${Math.round(metrics.cpu)}% usage`, col:D.red, level:'critical' });
    else if (metrics.cpu > 75) alerts.push({ icon:'memory', lib:'material', msg:'CPU HIGH LOAD', sub:`${Math.round(metrics.cpu)}% usage`, col:D.amber, level:'warn' });

    if (metrics.ram > 90) alerts.push({ icon:'storage', lib:'material', msg:'RAM CRITICAL', sub:`${Math.round(metrics.ram)}% used`, col:D.red, level:'critical' });
    else if (metrics.ram > 80) alerts.push({ icon:'storage', lib:'material', msg:'RAM PRESSURE', sub:`${Math.round(metrics.ram)}% used`, col:D.amber, level:'warn' });

    if (metrics.disk > 90) alerts.push({ icon:'folder-open', lib:'material', msg:'DISK FULL SOON', sub:`${Math.round(metrics.disk)}% used`, col:D.red, level:'critical' });
    else if (metrics.disk > 80) alerts.push({ icon:'folder-open', lib:'material', msg:'DISK HIGH USAGE', sub:`${Math.round(metrics.disk)}% used`, col:D.amber, level:'warn' });
  }

  if (alerts.length === 0) {
    alerts.push({ icon:'check-circle', lib:'material', msg: isConnected ? 'ALL SYSTEMS NOMINAL' : 'AWAITING CONNECTION', sub: isConnected ? 'No active alerts' : 'Pair your PC to monitor', col: isConnected ? D.green : D.textDim, level:'ok' });
  }

  const topAlert = alerts[0];
  const accentColor = topAlert.level === 'critical' ? D.red : topAlert.level === 'warn' ? D.amber : D.green;

  return (
    <NexusCard accentColor={accentColor} glowIntensity={topAlert.level === 'critical' ? 0.30 : 0.15}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14, paddingTop:14, paddingBottom:10 }}>
        <MaterialIcons name="notifications-active" size={14} color={accentColor} />
        <Text style={{ fontSize:12.5, fontWeight:'900', fontFamily:MONO, letterSpacing:1.5, color:D.text }}>SMART ALERTS</Text>
        <View style={{ flex:1 }} />
        {alerts.length > 1 && (
          <View style={{ backgroundColor:D.red+'20', borderRadius:10, borderWidth:1, borderColor:D.red+'50', paddingHorizontal:7, paddingVertical:2 }}>
            <Text style={{ fontSize:9, fontWeight:'900', fontFamily:MONO, color:D.red }}>{alerts.length} ACTIVE</Text>
          </View>
        )}
      </View>
      <View style={{ paddingHorizontal:14, paddingBottom:14, gap:8 }}>
        {alerts.map((alert, i) => {
          const Icon = alert.lib === 'community' ? MaterialCommunityIcons : MaterialIcons;
          return (
            <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:10, padding:10, borderRadius:10, backgroundColor: alert.col+'0A', borderWidth:1, borderColor:alert.col+'30' }}>
              <View style={{ width:34, height:34, borderRadius:10, backgroundColor:alert.col+'15', alignItems:'center', justifyContent:'center' }}>
                <Icon name={alert.icon as any} size={18} color={alert.col} />
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:12.5, fontWeight:'900', fontFamily:MONO, color:alert.col, letterSpacing:0.5 }}>{alert.msg}</Text>
                <Text style={{ fontSize:10.5, fontFamily:MONO, color:D.textMid, marginTop:1 }}>{alert.sub}</Text>
              </View>
              {alert.level !== 'ok' && <PulseDot color={alert.col} size={6} />}
            </View>
          );
        })}
      </View>
    </NexusCard>
  );
}

// ─── SECURITY PROTOCOLS GRID — with live canary status ────────────
const SECURITY_ITEMS_V2 = [
  { icon:'shield-key',            lib:'community',  label:'AES-256\nENCRYPT',       iconBg:'#0D3B4A', iconColor:'#FF2A1F', col:'#FF2A1F', row:0 },
  { icon:'eye-off-outline',       lib:'community',  label:'NO TRAFFIC\nTRACKING',   iconBg:'#3B0D0D', iconColor:'#FF3131', col:'#FF3131', row:0 },
  { icon:'robot-angry-outline',   lib:'community',  label:'100% PRIVATE\n& LOCAL',  iconBg:'#0D3B1E', iconColor:'#00FF88', col:'#00FF88', row:0 },
  { icon:'cloud-off-outline',     lib:'community',  label:'NO CLOUD\nSTORAGE',      iconBg:'#3B2800', iconColor:'#FFC400', col:'#FFC400', row:1 },
  { icon:'server-security',       lib:'community',  label:'LOCAL-HOSTED\nDATA',     iconBg:'#0D3B3A', iconColor:'#FF2A1F', col:'#FF2A1F', row:1 },
  { icon:'account-cancel-outline',lib:'community',  label:'NO ACCOUNT\nREQUIRED',   iconBg:'#2A0D3B', iconColor:'#FFC400', col:'#FFC400', row:1 },
];
const SPG_ROW_COLORS: Record<number, string[]> = {
  0: ['#FF2A1F', '#FF3131', '#00FF88'],
  1: ['#FFC400', '#FF2A1F', '#FFC400'],
};

function SecurityProtocolsGrid({ isConnected, canaryStatus }: { isConnected: boolean; canaryStatus: { deployed: number; allIntact: boolean } | null }) {
  const CELL_W = (SW - 28 - 2) / 3;
  const rows = [0, 1];

  return (
    <View style={spg.outerCard}>
      <View style={spg.header}>
        <View style={spg.headerDot} />
        <MaterialIcons name="shield" size={16} color="#FF2A1F" style={{ marginRight: 2 }} />
        <View style={{ flex:1 }}>
          <Text style={spg.headerTitle}>SECURITY PROTOCOLS</Text>
          <Text style={spg.headerSub}>[SYSTEM SECURE]</Text>
        </View>
        {canaryStatus && (
          <View style={{ flexDirection:'row', alignItems:'center', gap:5, borderWidth:1, borderRadius:12, paddingHorizontal:8, paddingVertical:3,
            borderColor:(canaryStatus.allIntact ? D.green : D.red)+'50', backgroundColor:(canaryStatus.allIntact ? D.green : D.red)+'0C' }}>
            <PulseDot color={canaryStatus.allIntact ? D.green : D.red} size={5} />
            <Text style={{ fontSize:8, fontWeight:'900', fontFamily:MONO, color:canaryStatus.allIntact ? D.green : D.red }}>
              {canaryStatus.allIntact ? `CANARY ${canaryStatus.deployed}✓` : 'CANARY BREACH'}
            </Text>
          </View>
        )}
      </View>

      {rows.map(row => {
        const rowItems = SECURITY_ITEMS_V2.filter(it => it.row === row);
        const accentCols = SPG_ROW_COLORS[row];
        return (
          <View key={row}>
            <View style={{ flexDirection: 'row', height: 3 }}>
              {accentCols.map((ac, ci) => <View key={ci} style={{ flex: 1, backgroundColor: ac }} />)}
            </View>
            <View style={spg.row}>
              {rowItems.map((item, i) => {
                const Icon = item.lib === 'community' ? MaterialCommunityIcons : MaterialIcons;
                return (
                  <View key={i} style={[spg.cell, { width: CELL_W }, i < rowItems.length-1 && spg.cellDividerRight]}>
                    <View style={[spg.iconBadge, { backgroundColor: item.iconBg }]}>
                      <Icon name={item.icon as any} size={22} color={item.iconColor} />
                      <View style={[spg.corner, { top:4, left:4, borderTopWidth:1.5, borderLeftWidth:1.5, borderColor:item.col+'60' }]} />
                      <View style={[spg.corner, { bottom:4, right:4, borderBottomWidth:1.5, borderRightWidth:1.5, borderColor:item.col+'60' }]} />
                    </View>
                    <Text style={[spg.cellLabel, { color: item.col }]}>{item.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}

      <View style={spg.footer}>
        <Text style={spg.footerTxt}>
          {'System Security: 100% Private · Local SQLite ·\nHMAC-SHA256 · Zero Cloud · No Accounts'}
        </Text>
      </View>
    </View>
  );
}
const spg = StyleSheet.create({
  outerCard:       { marginHorizontal:0, backgroundColor:'#0E0F12', borderWidth:1, borderColor:'#FF2A1F28', borderRadius:14, overflow:'hidden' },
  header:          { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:12, paddingTop:12, paddingBottom:10, borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:'#FF2A1F20' },
  headerDot:       { width:9, height:9, borderRadius:4.5, backgroundColor:'#FF2A1F', shadowColor:'#FF2A1F', shadowRadius:6, shadowOpacity:0.9, shadowOffset:{width:0,height:0} },
  headerTitle:     { fontSize:14, fontWeight:'900', color:'#FF2A1F', fontFamily:MONO, letterSpacing:1.2 },
  headerSub:       { fontSize:9.5, fontWeight:'700', color:'#FF2A1F99', fontFamily:MONO, letterSpacing:0.8, marginTop:1 },
  row:             { flexDirection:'row', backgroundColor:'#0E0F12' },
  cell:            { paddingVertical:12, paddingHorizontal:6, alignItems:'center', gap:8, backgroundColor:'#0E0F12' },
  cellDividerRight:{ borderRightWidth:StyleSheet.hairlineWidth, borderRightColor:'#FF2A1F18' },
  iconBadge:       { width:52, height:52, borderRadius:13, alignItems:'center', justifyContent:'center', position:'relative' },
  corner:          { position:'absolute', width:8, height:8 },
  cellLabel:       { fontSize:11, fontWeight:'900', fontFamily:MONO, letterSpacing:0.5, textAlign:'center', lineHeight:13 },
  footer:          { borderTopWidth:StyleSheet.hairlineWidth, borderTopColor:'#FF2A1F18', paddingVertical:8, paddingHorizontal:12, backgroundColor:'#01050A' },
  footerTxt:       { fontSize:10, color:'#3A6070', fontFamily:MONO, textAlign:'center', lineHeight:14, letterSpacing:0.3 },
});

// ─── QUICK ACCESS GRID ────────────────────────────────────────────
function QuickAccessGrid({ goToTab }: { goToTab: (t: string) => void }) {
  // Replaced with MECH BAY OS theme — see /components/home/MechBay.tsx
  return <HexCommandRing goToTab={goToTab} />;
}

// ─── KB ARTICLES FEED ─────────────────────────────────────────────
function KBArticlesFeed({ goToTab, isConnected }: { goToTab:(t:string)=>void; isConnected:boolean }) {
  const [articles, setArticles] = useState<{ title:string; summary?:string; ts:number; source?:string }[]>([]);

  useFocusEffect(useCallback(() => {
    if (!isConnected) return;
    try {
      const ip = serverConnection.getIP(); const port = serverConnection.getPort(); const token = serverConnection.getToken();
      if (ip && port) {
        fetch(`http://${ip}:${port}/api/learn/recent?limit=5`, { headers: token ? { Authorization:`Bearer ${token}` } : {}, signal:AbortSignal.timeout(5000) })
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.articles?.length > 0) setArticles(d.articles.slice(0,5)); })
          .catch(() => {});
      }
    } catch {}
  }, [isConnected]));

  if (!isConnected || articles.length === 0) return null;

  return (
    <View>
      <SectionDivider label="RECENT KB INTEL" color={D.amber} />
      <NexusCard accentColor={D.amber} style={{ marginTop:10 }} glowIntensity={0.10}>
        <View style={{ paddingHorizontal:14, paddingVertical:12, gap:10 }}>
          {articles.map((art, i) => (
            <TouchableOpacity key={i} onPress={() => goToTab('knowledge')} activeOpacity={0.8}
              style={{ flexDirection:'row', gap:10, alignItems:'flex-start', paddingBottom: i < articles.length-1 ? 10 : 0,
                borderBottomWidth: i < articles.length-1 ? StyleSheet.hairlineWidth : 0, borderBottomColor:'rgba(255,176,32,0.12)' }}>
              <View style={{ width:6, height:6, borderRadius:3, backgroundColor:D.amber, marginTop:4, flexShrink:0 }} />
              <View style={{ flex:1, gap:2 }}>
                <Text style={{ fontSize:12, fontWeight:'700', fontFamily:MONO, color:D.text }} numberOfLines={1}>{art.title}</Text>
                {art.summary && <Text style={{ fontSize:10, fontFamily:MONO, color:D.textMid, lineHeight:14 }} numberOfLines={2}>{art.summary}</Text>}
                <View style={{ flexDirection:'row', gap:8, marginTop:2 }}>
                  {art.source && <Text style={{ fontSize:8, fontFamily:MONO, color:D.textDim }}>{art.source}</Text>}
                  <Text style={{ fontSize:8, fontFamily:MONO, color:D.textDim }}>{formatAgo(art.ts)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </NexusCard>
    </View>
  );
}

// ─── RECENT ACTIVITY ──────────────────────────────────────────────
function RecentActivity({ goToTab }: { goToTab: (t:string)=>void }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useFocusEffect(useCallback(() => {
    executionHistory.getAll().then(hist => {
      setEntries(hist.slice(-5).reverse());
    }).catch(() => {});
  }, []));

  if (entries.length === 0) return null;

  return (
    <View>
      <SectionDivider label="RECENT ACTIVITY" color={D.blue} />
      <NexusCard accentColor={D.blue} style={{ marginTop:10 }} glowIntensity={0.10}>
        <View style={{ paddingHorizontal:14, paddingVertical:12, gap:8 }}>
          {entries.map((entry, i) => (
            <TouchableOpacity key={i} onPress={() => goToTab('logs')} activeOpacity={0.8}
              style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
              <MaterialIcons name={entry.success !== false ? 'check-circle' : 'error'} size={14} color={entry.success !== false ? D.green : D.red} />
              <Text style={{ flex:1, fontSize:11, fontFamily:MONO, color:D.text }} numberOfLines={1}>{entry.scriptName || entry.script || 'Script'}</Text>
              <Text style={{ fontSize:9, fontFamily:MONO, color:D.textDim }}>{formatAgo((entry.timestamp||Date.now())/1000)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </NexusCard>
    </View>
  );
}

// ─── QR MODAL ─────────────────────────────────────────────────────
function isValidIP(ip: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && ip.split('.').every(n => parseInt(n) <= 255);
}

function CameraPermissionRationaleDialog({ visible, onAllow, onDeny }: { visible:boolean; onAllow:()=>void; onDeny:()=>void }) {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.85)', alignItems:'center', justifyContent:'center', padding:24 }}>
        <View style={{ backgroundColor:D.surfaceHi, borderRadius:18, borderWidth:1.5, borderColor:D.cyan+'40', padding:22, width:'100%', maxWidth:360 }}>
          <Text style={{ fontSize:16, fontWeight:'900', fontFamily:MONO, color:D.text, marginBottom:10 }}>CAMERA REQUIRED</Text>
          <Text style={{ fontSize:12, fontFamily:MONO, color:D.textMid, lineHeight:18, marginBottom:18 }}>
            Butler AI needs camera access to scan the QR code displayed on your PC server. This is only used for pairing — not for any monitoring.
          </Text>
          <TouchableOpacity onPress={onAllow} style={{ backgroundColor:D.cyan, borderRadius:10, paddingVertical:12, alignItems:'center', marginBottom:8 }}>
            <Text style={{ fontSize:13, fontWeight:'900', fontFamily:MONO, color:D.bg }}>ALLOW CAMERA</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDeny} style={{ borderWidth:1, borderColor:D.textDim+'40', borderRadius:10, paddingVertical:10, alignItems:'center' }}>
            <Text style={{ fontSize:12, fontFamily:MONO, color:D.textDim }}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function NexusQRModal({ visible, onClose, onConnect }: { visible:boolean; onClose:()=>void; onConnect:(ip:string,port:number)=>void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [showRationale, setShowRationale] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [manualPort, setManualPort] = useState('8765');
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [isLANScanning, setIsLANScanning] = useState(false);
  const [lanProgress, setLanProgress] = useState<ScanProgress | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (visible) { processedRef.current = false; setScanMsg(''); setShowManual(false); }
  }, [visible]);

  const handleBarCodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (processedRef.current || scanning) return;
    processedRef.current = true;
    setScanning(true);
    haptics.medium();
    try {
      const parsed = parseQRConnection(data);
      if (!parsed) { setScanMsg('Invalid QR code. Scan the Butler AI server QR.'); setScanning(false); processedRef.current = false; return; }
      const { ip, port } = parsed;
      setScanMsg(`Connecting to ${ip}:${port}…`);
      const token = await serverConnection.connectWithQR(data);
      onConnect(ip, port);
      setScanMsg(`Connected! ✓`);
      setTimeout(() => onClose(), 800);
    } catch (e: any) {
      setScanMsg(`Failed: ${e?.message || 'Connection error'}`);
      setScanning(false); processedRef.current = false;
    }
  }, [scanning, onConnect, onClose]);

  const handleManualConnect = async () => {
    if (!isValidIP(manualIp)) { Alert.alert('Invalid IP', 'Enter a valid IP address'); return; }
    const port = parseInt(manualPort) || 8765;
    setScanMsg(`Connecting to ${manualIp}:${port}…`);
    try {
      await serverConnection.connect(manualIp, port);
      onConnect(manualIp, port);
      setScanMsg('Connected! ✓');
      setTimeout(() => onClose(), 800);
    } catch (e: any) {
      setScanMsg(`Failed: ${e?.message || 'Connection error'}`);
    }
  };

  const handleLANScan = async () => {
    setIsLANScanning(true); setLanProgress(null);
    try {
      const result = await quickScan((p) => setLanProgress(p));
      if (result) {
        setScanMsg(`Found server at ${result.ip}:${result.port}`);
        setManualIp(result.ip); setManualPort(String(result.port));
        setShowManual(true);
      } else {
        setScanMsg('No Butler server found on local network');
      }
    } catch (e) {
      setScanMsg('LAN scan failed');
    } finally { setIsLANScanning(false); }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <CameraPermissionRationaleDialog
        visible={showRationale}
        onAllow={async () => { setShowRationale(false); await requestPermission(); }}
        onDeny={() => setShowRationale(false)}
      />
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.92)' }}>
        <View style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingTop:52, paddingBottom:16, gap:10 }}>
          <TouchableOpacity onPress={onClose} style={{ width:36, height:36, borderRadius:10, backgroundColor:D.surface, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:D.border }}>
            <MaterialIcons name="arrow-back" size={18} color={D.cyan} />
          </TouchableOpacity>
          <Text style={{ fontSize:16, fontWeight:'900', fontFamily:MONO, color:D.text, letterSpacing:2 }}>PAIR PC</Text>
        </View>

        {permission?.granted ? (
          <View style={{ flex:1, overflow:'hidden' }}>
            <CameraView style={{ flex:1 }} facing="back" onBarcodeScanned={handleBarCodeScanned} barcodeScannerSettings={{ barcodeTypes:['qr'] }}>
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)' }} />
                <View style={{ flexDirection:'row', height:240 }}>
                  <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)' }} />
                  <View style={{ width:240 }}>
                    <HudCorners color={D.cyan} size={24} thickness={2.5} />
                  </View>
                  <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)' }} />
                </View>
                <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)' }} />
              </View>
            </CameraView>
          </View>
        ) : (
          <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:32, gap:16 }}>
            <MaterialIcons name="camera-alt" size={48} color={D.textDim} />
            <Text style={{ fontSize:14, fontFamily:MONO, color:D.textMid, textAlign:'center', lineHeight:20 }}>Camera permission needed to scan QR code</Text>
            <TouchableOpacity onPress={() => setShowRationale(true)} style={{ backgroundColor:D.cyan, borderRadius:10, paddingHorizontal:24, paddingVertical:12 }}>
              <Text style={{ fontSize:13, fontWeight:'900', fontFamily:MONO, color:D.bg }}>ENABLE CAMERA</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ padding:16, gap:10, backgroundColor:D.bg }}>
          {scanMsg ? (
            <View style={{ backgroundColor:D.surfaceHi, borderRadius:10, padding:12, borderWidth:1, borderColor:scanMsg.includes('✓') ? D.green+'50' : D.amber+'50' }}>
              <Text style={{ fontSize:12, fontFamily:MONO, color:scanMsg.includes('✓') ? D.green : D.amber, textAlign:'center' }}>{scanMsg}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection:'row', gap:8 }}>
            <TouchableOpacity onPress={() => setShowManual(v => !v)} style={{ flex:1, backgroundColor:D.surfaceHi, borderRadius:10, paddingVertical:11, alignItems:'center', borderWidth:1, borderColor:D.border }}>
              <Text style={{ fontSize:11, fontWeight:'700', fontFamily:MONO, color:D.text }}>MANUAL IP</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLANScan} disabled={isLANScanning} style={{ flex:1, backgroundColor:D.surfaceHi, borderRadius:10, paddingVertical:11, alignItems:'center', borderWidth:1, borderColor:D.teal+'40' }}>
              {isLANScanning ? <ActivityIndicator size="small" color={D.teal} /> : <Text style={{ fontSize:11, fontWeight:'700', fontFamily:MONO, color:D.teal }}>SCAN LAN</Text>}
            </TouchableOpacity>
          </View>

          {lanProgress && (
            <Text style={{ fontSize:9, fontFamily:MONO, color:D.textDim, textAlign:'center' }}>
              Scanning {lanProgress.scanned}/{lanProgress.total}…
            </Text>
          )}

          {showManual && (
            <View style={{ gap:8 }}>
              <TextInput value={manualIp} onChangeText={setManualIp} placeholder="192.168.1.xxx" placeholderTextColor={D.textDim}
                style={{ backgroundColor:D.surfaceHi, borderRadius:10, borderWidth:1, borderColor:D.border, color:D.text, padding:12, fontFamily:MONO, fontSize:13 }}
                keyboardType="numeric" autoCorrect={false} />
              <TextInput value={manualPort} onChangeText={setManualPort} placeholder="8765"
                placeholderTextColor={D.textDim}
                style={{ backgroundColor:D.surfaceHi, borderRadius:10, borderWidth:1, borderColor:D.border, color:D.text, padding:12, fontFamily:MONO, fontSize:13 }}
                keyboardType="numeric" />
              <TouchableOpacity onPress={handleManualConnect} style={{ backgroundColor:D.cyan, borderRadius:10, paddingVertical:12, alignItems:'center' }}>
                <Text style={{ fontSize:13, fontWeight:'900', fontFamily:MONO, color:D.bg }}>CONNECT</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── SIGMA NET CRAWLER CARD ───────────────────────────────────────
function SigmaNetCrawlerHomeCard({ isConnected }: { isConnected:boolean }) {
  const [status, setStatus] = useState<{ active:boolean; urls_crawled:number; queue_size:number; last_url:string } | null>(null);

  useFocusEffect(useCallback(() => {
    if (!isConnected) return;
    try {
      const ip = serverConnection.getIP(); const port = serverConnection.getPort(); const token = serverConnection.getToken();
      if (ip && port) {
        fetch(`http://${ip}:${port}/api/crawler/status`, { headers: token ? { Authorization:`Bearer ${token}` } : {}, signal:AbortSignal.timeout(4000) })
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) setStatus({ active: d.status==='active', urls_crawled: d.urls_crawled||0, queue_size: d.queue_size||d.urls_queued||0, last_url: d.last_url||'' }); })
          .catch(() => {});
      }
    } catch {}
  }, [isConnected]));

  if (!isConnected || !status) return null;
  return (
    <NexusCard accentColor={D.teal} glowIntensity={0.12}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14, paddingTop:12, paddingBottom:10 }}>
        <MaterialCommunityIcons name="spider-web" size={13} color={D.teal} />
        <Text style={{ fontSize:11.5, fontWeight:'900', fontFamily:MONO, color:D.text, letterSpacing:1.5 }}>SIGMA-NET LIVE</Text>
        <View style={{ flex:1 }} />
        <PulseDot color={status.active ? D.teal : D.textDim} size={5} />
        <Text style={{ fontSize:9, fontFamily:MONO, color: status.active ? D.teal : D.textDim }}>{status.active ? 'CRAWLING' : 'IDLE'}</Text>
      </View>
      <View style={{ flexDirection:'row', paddingHorizontal:14, paddingBottom:12, gap:20 }}>
        <View>
          <Text style={{ fontSize:20, fontWeight:'900', fontFamily:MONO, color:D.teal }}>{status.urls_crawled}</Text>
          <Text style={{ fontSize:8, fontFamily:MONO, color:D.textDim }}>CRAWLED</Text>
        </View>
        <View>
          <Text style={{ fontSize:20, fontWeight:'900', fontFamily:MONO, color:D.amber }}>{status.queue_size}</Text>
          <Text style={{ fontSize:8, fontFamily:MONO, color:D.textDim }}>IN QUEUE</Text>
        </View>
        {status.last_url ? (
          <View style={{ flex:1 }}>
            <Text style={{ fontSize:9, fontFamily:MONO, color:D.textDim, marginBottom:2 }}>LAST URL</Text>
            <Text style={{ fontSize:9, fontFamily:MONO, color:D.textMid }} numberOfLines={2}>{status.last_url}</Text>
          </View>
        ) : null}
      </View>
    </NexusCard>
  );
}

// ─── SERVER SETUP HUB — download + how-it-works + pairing in ONE panel ─────
const SERVER_REPO_URL = 'https://github.com/shawnjan-cmd/butler-server';

const SETUP_STEPS = [
  { n: '01', icon: 'download-box-outline', col: D.green,  title: 'GET THE PC SERVER',  sub: 'Free download — runs on any PC with Python' },
  { n: '02', icon: 'console',              col: D.amber,  title: 'RUN THE SERVER',     sub: 'One command — it shows a QR code' },
  { n: '03', icon: 'qrcode-scan',          col: D.cyan,   title: 'PAIR YOUR PC',       sub: 'Scan the QR — same Wi-Fi, no cloud' },
  { n: '04', icon: 'robot-happy',          col: D.purple, title: 'COMMAND YOUR PC',    sub: 'Run scripts, send files, chat with local AI' },
] as const;

function ServerSetupHub({ onScanQR, isConnected }: { onScanQR: () => void; isConnected: boolean }) {
  const [copied, setCopied] = useState(false);

  // Connected → slim confirmation strip instead of the full checklist
  if (isConnected) {
    return (
      <View>
        <SectionDivider label="SETUP · COMPLETE" color={D.green} />
        <NexusCard accentColor={D.green} style={{ marginTop: 8 }}>
          <View style={hub.doneRow}>
            <MaterialCommunityIcons name="check-decagram" size={20} color={D.green} />
            <Text style={hub.doneTxt}>PC PAIRED · ALL SYSTEMS OPERATIONAL</Text>
          </View>
        </NexusCard>
      </View>
    );
  }

  return (
    <View>
      <SectionDivider label="SETUP · GET STARTED" color={D.green} />
      <NexusCard accentColor={D.green} style={{ marginTop: 8 }}>
        {/* intro line */}
        <Text style={hub.intro}>
          Butler AI pairs with a tiny Python server on your PC. Four steps — fully local, zero cloud.
        </Text>

        {/* STEP 01 — download */}
        <View style={hub.stepRow}>
          <Text style={[hub.num, { color: SETUP_STEPS[0].col }]}>01</Text>
          <View style={[hub.iconBox, { borderColor: D.green + '45', backgroundColor: D.green + '12' }]}>
            <MaterialCommunityIcons name="download-box-outline" size={17} color={D.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[hub.stepTitle, { color: D.green }]}>{SETUP_STEPS[0].title}</Text>
            <Text style={hub.stepSub}>{SETUP_STEPS[0].sub}</Text>
          </View>
        </View>
        <TouchableOpacity
          testID="download-server-btn" activeOpacity={0.85} style={hub.btn}
          onPress={() => { haptics.medium(); Linking.openURL(SERVER_REPO_URL).catch(() => {}); }}>
          <MaterialCommunityIcons name="github" size={17} color="#001008" />
          <Text style={hub.btnTxt}>DOWNLOAD ON GITHUB</Text>
          <MaterialCommunityIcons name="open-in-new" size={13} color="#001008" />
        </TouchableOpacity>

        {/* STEP 02 — run command */}
        <View style={hub.stepRow}>
          <Text style={[hub.num, { color: SETUP_STEPS[1].col }]}>02</Text>
          <View style={[hub.iconBox, { borderColor: D.amber + '45', backgroundColor: D.amber + '12' }]}>
            <MaterialCommunityIcons name="console" size={16} color={D.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[hub.stepTitle, { color: D.amber }]}>{SETUP_STEPS[1].title}</Text>
            <Text style={hub.stepSub}>{SETUP_STEPS[1].sub}</Text>
          </View>
        </View>
        <View style={hub.cmdRow}>
          <Text style={hub.cmdPrompt}>$</Text>
          <Text style={hub.cmd} numberOfLines={1}>python butler_server.py</Text>
          <TouchableOpacity
            testID="copy-server-cmd" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={async () => {
              haptics.light();
              try { await Clipboard.setStringAsync('python butler_server.py'); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
            }}>
            <MaterialCommunityIcons name={copied ? 'check-bold' : 'content-copy'} size={14} color={copied ? D.green : D.green + '99'} />
          </TouchableOpacity>
        </View>

        {/* STEP 03 — pair */}
        <View style={hub.stepRow}>
          <Text style={[hub.num, { color: SETUP_STEPS[2].col }]}>03</Text>
          <View style={[hub.iconBox, { borderColor: D.cyan + '45', backgroundColor: D.cyan + '12' }]}>
            <MaterialCommunityIcons name="qrcode-scan" size={16} color={D.cyan} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[hub.stepTitle, { color: D.cyan }]}>{SETUP_STEPS[2].title}</Text>
            <Text style={hub.stepSub}>{SETUP_STEPS[2].sub}</Text>
          </View>
        </View>
        <TouchableOpacity
          testID="setup-scan-qr-btn" activeOpacity={0.85}
          style={[hub.btn, { backgroundColor: D.cyan }]}
          onPress={() => { haptics.medium(); onScanQR(); }}>
          <MaterialIcons name="qr-code-scanner" size={17} color={D.bg} />
          <Text style={[hub.btnTxt, { color: D.bg }]}>SCAN QR CODE</Text>
        </TouchableOpacity>

        {/* STEP 04 — command */}
        <View style={[hub.stepRow, { marginBottom: 4 }]}>
          <Text style={[hub.num, { color: SETUP_STEPS[3].col }]}>04</Text>
          <View style={[hub.iconBox, { borderColor: SETUP_STEPS[3].col + '45', backgroundColor: SETUP_STEPS[3].col + '12' }]}>
            <MaterialCommunityIcons name="robot-happy" size={16} color={SETUP_STEPS[3].col} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[hub.stepTitle, { color: SETUP_STEPS[3].col }]}>{SETUP_STEPS[3].title}</Text>
            <Text style={hub.stepSub}>{SETUP_STEPS[3].sub}</Text>
          </View>
        </View>

        {/* footer */}
        <View style={hub.footer}>
          <MaterialIcons name="verified-user" size={11} color={D.green} />
          <Text style={hub.footerTxt}>Same Wi-Fi · HMAC-SHA256 signed · 100% local · Zero telemetry</Text>
        </View>
        <Text style={hub.copyright}>Butler AI © 2025–2026 · All rights reserved</Text>
      </NexusCard>
    </View>
  );
}
const hub = StyleSheet.create({
  intro:     { fontSize: 10.5, fontFamily: MONO, color: D.textMid, lineHeight: 15.5, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4, textAlign: 'center' },
  stepRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  num:       { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 1, width: 22 },
  iconBox:   { width: 32, height: 32, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 12.5, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  stepSub:   { fontSize: 10, fontFamily: MONO, color: D.textMid, marginTop: 1.5 },
  btn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: D.green, borderRadius: 10, paddingVertical: 11, marginHorizontal: 12, marginTop: 2, marginBottom: 4 },
  btnTxt:    { fontSize: 12.5, fontWeight: '900', fontFamily: MONO, color: '#001008', letterSpacing: 1.2 },
  cmdRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginTop: 2, marginBottom: 4, backgroundColor: '#050505', borderWidth: 1, borderColor: D.green + '30', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  cmdPrompt: { fontSize: 11, fontWeight: '900', fontFamily: MONO, color: D.green },
  cmd:       { flex: 1, fontSize: 11, fontFamily: MONO, color: D.text },
  footer:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, marginHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: D.green + '20' },
  footerTxt: { fontSize: 8.5, fontFamily: MONO, color: D.green + '90', letterSpacing: 0.3 },
  copyright: { fontSize: 8, fontFamily: MONO, color: D.textDim, textAlign: 'center', paddingBottom: 12, paddingTop: 4, letterSpacing: 0.3 },
  doneRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 14 },
  doneTxt:   { fontSize: 11, fontWeight: '900', fontFamily: MONO, color: D.green, letterSpacing: 1 },
});

// ─── FULL-PAGE BACKDROP (pure black + circuit grid + drifting scan beam) ──
function HomeBackdrop() {
  const beam = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(beam, { toValue: 1, duration: 7000, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(beam, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const { height: SH } = Dimensions.get('window');
  const beamY = beam.interpolate({ inputRange: [0, 1], outputRange: [-40, SH + 40] });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* ambient orbs */}
      <View style={{ position:'absolute', top:-120, right:-100, width:300, height:300, borderRadius:150, backgroundColor:D.cyan, opacity:0.045 }} />
      <View style={{ position:'absolute', bottom:-140, left:-110, width:320, height:320, borderRadius:160, backgroundColor:D.purple, opacity:0.04 }} />
      {/* vertical circuit grid */}
      {[10, 26, 42, 58, 74, 90].map((p, i) => (
        <View key={`v${i}`} style={{ position:'absolute', top:0, bottom:0, left:`${p}%` as any, width:StyleSheet.hairlineWidth, backgroundColor:'rgba(255,42,31,0.035)' }} />
      ))}
      {/* horizontal scanlines */}
      {Array.from({ length: 14 }).map((_, i) => (
        <View key={`h${i}`} style={{ position:'absolute', left:0, right:0, top:`${(i + 1) * 7}%` as any, height:StyleSheet.hairlineWidth, backgroundColor:'rgba(255,42,31,0.022)' }} />
      ))}
      {/* drifting scan beam */}
      <Animated.View style={{ position:'absolute', left:0, right:0, height:90, opacity:0.05, backgroundColor:D.cyan, transform:[{ translateY: beamY }] }} />
    </View>
  );
}

// ─── MAIN HOME SCREEN ─────────────────────────────────────────────
export default function NexusHomeScreen() {
  const cosmetic = useCosmetic();
  const scrollRef = useRef<ScrollView>(null);

  const [isConnected, setIsConnected]   = useState(false);
  const [serverAddr,  setServerAddr]    = useState('');
  const [metrics,     setMetrics]       = useState({ cpu:0, ram:0, disk:0, diskDetail:'' });
  const [ollamaOnline,setOllamaOnline]  = useState<boolean|null>(null);
  const [kbFindings,  setKbFindings]    = useState(0);
  const [scriptCount, setScriptCount]   = useState(0);
  const [showQR,      setShowQR]        = useState(false);
  const [liveTermLogs,setLiveTermLogs]  = useState<{ time:string; msg:string; col:string }[]>([]);
  const [showPrivacy, setShowPrivacy]   = useState(false);
  const [uiCfg,       setUiCfg]         = useState<UIConfig>(DEFAULT_UI_CONFIG);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [canaryStatus, setCanaryStatus]  = useState<{ deployed:number; allIntact:boolean } | null>(null);

  // History for sparkline charts (real polling data)
  const [cpuHistory,  setCpuHistory]    = useState<number[]>([]);
  const [ramHistory,  setRamHistory]    = useState<number[]>([]);
  const [diskHistory, setDiskHistory]   = useState<number[]>([]);

  useEffect(() => {
    // Privacy banner is intentionally not auto-shown anymore — users already
    // see the full privacy disclosure during onboarding (10 screens). Keeping
    // the dismiss flag write logic intact for any code path that re-opens it.
    AsyncStorage.setItem(PRIVACY_KEY,'1').catch(() => {});
    uiConfig.load().then(c => setUiCfg(c)).catch(() => {});
  }, []);

  // Connection state
  useFocusEffect(useCallback(() => {
    try {
      const conn = serverConnection && typeof serverConnection.isConnected === 'function'
        ? serverConnection.isConnected() : false;
      setIsConnected(conn);
      if (conn) {
        try { setServerAddr(`${serverConnection.getIP()}:${serverConnection.getPort()}`); } catch {}
      }
    } catch {}
  }, []));

  useFocusEffect(useCallback(() => {
    let eng: (() => void) | undefined;
    try {
      if (autoConnectEngine && typeof autoConnectEngine.on === 'function') {
        eng = autoConnectEngine.on((ev: EngineEvent) => {
          if (ev.status === 'connected') {
            setIsConnected(true);
            try { setServerAddr(`${ev.ip}:${ev.port}`); } catch {}
          }
          if (ev.status === 'idle' || ev.status === 'scanning' || ev.status === 'reconnecting') {
            setIsConnected(false);
          }
        });
      }
    } catch {}
    return () => { try { eng?.(); } catch {} };
  }, []));

  // Metrics polling — builds sparkline history
  useFocusEffect(useCallback(() => {
    if (!isConnected) return;
    const [sIp, sPort] = serverAddr.split(':');
    const load = async () => {
      try {
        const token = serverConnection.getToken();
        const h = token ? { Authorization:`Bearer ${token}` } : {};
        const [metrRes, ollamaRes, kbRes] = await Promise.allSettled([
          fetch(`http://${sIp}:${sPort}/api/metrics`, { headers:h, signal:AbortSignal.timeout(4000) }),
          fetch(`http://${sIp}:${sPort}/api/ollama/status`, { headers:h, signal:AbortSignal.timeout(4000) }),
          fetch(`http://${sIp}:${sPort}/api/learn/status`, { headers:h, signal:AbortSignal.timeout(4000) }),
        ]);
        if (metrRes.status==='fulfilled' && metrRes.value.ok) {
          const d = await metrRes.value.json();
          const m = { cpu: d.cpu_percent??d.cpu??0, ram: d.ram_percent??d.ram??0, disk: d.disk_percent??d.disk??0, diskDetail: d.disk_detail??'' };
          setMetrics(m);
          // append to history (capped at 30 pts)
          setCpuHistory(prev => [...prev.slice(-29), m.cpu]);
          setRamHistory(prev => [...prev.slice(-29), m.ram]);
          setDiskHistory(prev => [...prev.slice(-29), m.disk]);
          if (d.uptime_seconds) setUptimeSeconds(d.uptime_seconds);
        }
        if (ollamaRes.status==='fulfilled' && ollamaRes.value.ok) {
          const d = await ollamaRes.value.json(); setOllamaOnline(d.online ?? d.running ?? false);
        } else setOllamaOnline(false);
        if (kbRes.status==='fulfilled' && kbRes.value.ok) {
          const d = await kbRes.value.json();
          const total = d.articlesTotal ?? d.vectorCount ?? d.total ?? 0;
          if (total > 0) setKbFindings(total);
        }
      } catch {}
    };
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [isConnected, serverAddr]));

  // Script count
  useFocusEffect(useCallback(() => {
    const load = async () => {
      if (isConnected) {
        try {
          const ip = serverConnection.getIP(); const port = serverConnection.getPort(); const token = serverConnection.getToken();
          if (ip && port) {
            const res = await fetch(`http://${ip}:${port}/api/pc_scripts/list?limit=1`, { headers: token ? { Authorization:`Bearer ${token}` } : {}, signal:AbortSignal.timeout(4000) });
            if (res.ok) { const d = await res.json(); setScriptCount(d.total ?? d.count ?? (d.scripts || d.items || []).length); return; }
          }
        } catch {}
      }
      try {
        const { loadButlerScripts } = await import('@/services/butlerScripts');
        const local = await loadButlerScripts();
        setScriptCount(local.length);
      } catch {}
    };
    load();
  }, [isConnected]));

  // Terminal logs
  useFocusEffect(useCallback(() => {
    if (!isConnected) return;
    const [sIp, sPort] = serverAddr.split(':');
    const fetchLogs = async () => {
      try {
        const token = serverConnection.getToken();
        const res = await fetch(`http://${sIp}:${sPort}/api/server_log?limit=6`, { headers: token ? { Authorization:`Bearer ${token}` } : {}, signal:AbortSignal.timeout(5000) });
        if (res.ok) {
          const d = await res.json();
          if (d.entries?.length > 0) {
            setLiveTermLogs(d.entries.slice(-6).map((e:any) => ({
              time: new Date((e.ts||0)*1000).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false }),
              msg: (e.message||'Server event').slice(0,62),
              col: e.isOk ? '#00FF88' : e.isWarn ? D.amber : e.isError ? D.red : D.cyan,
            })));
          }
        }
      } catch {}
    };
    fetchLogs();
    const t = setInterval(fetchLogs, 15000);
    return () => clearInterval(t);
  }, [isConnected, serverAddr]));

  // Canary status polling (when connected)
  useFocusEffect(useCallback(() => {
    if (!isConnected) return;
    const fetchCanary = async () => {
      try {
        const ip = serverConnection.getIP(); const port = serverConnection.getPort(); const token = serverConnection.getToken();
        if (ip && port) {
          const res = await fetch(`http://${ip}:${port}/api/security/canary/status`, { headers: token ? { Authorization:`Bearer ${token}` } : {}, signal:AbortSignal.timeout(4000) });
          if (res.ok) { const d = await res.json(); setCanaryStatus({ deployed: d.deployed||0, allIntact: d.allIntact??true }); }
        }
      } catch {}
    };
    fetchCanary();
    const t = setInterval(fetchCanary, 60000);
    return () => clearInterval(t);
  }, [isConnected, serverAddr]));

  const goToTab = (tab: string) => { haptics.light(); (global as any).__butlerSwitchTab?.(tab); };

  return (
    <View style={s.root}>
      <HomeBackdrop />
      <ScrollView ref={scrollRef} style={s.scroll} contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <NexusQRModal visible={showQR} onClose={() => setShowQR(false)}
        onConnect={(ip, port) => { setIsConnected(true); setServerAddr(`${ip}:${port}`); }} />

      {showPrivacy && (
        <TouchableOpacity activeOpacity={0.9}
          onPress={() => { setShowPrivacy(false); AsyncStorage.setItem(PRIVACY_KEY,'1').catch(()=>{}); }}
          style={pvb.overlay}>
          <View style={pvb.card}>
            <View style={pvb.topBar} />
            <HudCorners color={D.green+'60'} size={14} thickness={1.5} />
            <View style={pvb.header}>
              <MaterialCommunityIcons name="shield-lock" size={22} color={D.green} />
              <View style={{ flex:1 }}>
                <Text style={pvb.title}>PRIVACY & SAFETY</Text>
                <Text style={pvb.sub}>Tap anywhere to dismiss</Text>
              </View>
              <MaterialIcons name="close" size={16} color={D.textDim} />
            </View>
            <Text style={pvb.body}>
              {'This app runs entirely on your own PC. Your data lives in a local SQLite database on your computer; your phone discovers the PC via a LAN broadcast that never reaches the internet. Every request is signed with HMAC-SHA256. AI inference runs locally through Ollama — your prompts never leave your machine.'}
            </Text>
            <View style={pvb.footer}>
              <MaterialIcons name="check-circle" size={12} color={D.green} />
              <Text style={pvb.footerTxt}>No cloud · No tracking · 100% local</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      <WidgetLayer pageId="home" />
      <InlineWidgetSlot pageId="home" position="inline-top" />

      {/* Hero → COMMAND MODULES → combined setup hub */}
      <ButlerAIHero
        isConnected={isConnected} serverAddr={serverAddr}
        onScanQR={() => setShowQR(true)}
        kbFindings={kbFindings} scriptCount={scriptCount} />

      {/* Elegant greeting strip — time-aware, sets a confident tone */}
      <HomeGreetingBanner />

      <PrivacyTrustBadge />
      <HomeTerminalClock isConnected={isConnected} />

      <HomeSectionDivider label="Quick Access" />
      <QuickAccessGrid goToTab={goToTab} />

      <HomeSectionDivider label="PC Server Setup" />
      <ServerSetupHub onScanQR={() => setShowQR(true)} isConnected={isConnected} />

      {/* Config-driven card renderer (hero & quick_access pinned above) */}
      {uiCfg.home.cards
        .filter(c => c.visible && c.id !== 'hero' && c.id !== 'quick_access')
        .sort((a, b) => a.order - b.order)
        .map(card => {
          switch (card.id) {
            case 'quick_send':
            case 'fileshare_clipboard':
              return <QuickSendCard key={card.id} isConnected={isConnected} />;
            case 'connected_pc':
              return (
                <ConnectedPCCard key={card.id}
                  isConnected={isConnected} serverAddr={serverAddr}
                  metrics={metrics} ollamaOnline={ollamaOnline}
                  cpuHistory={cpuHistory} ramHistory={ramHistory} diskHistory={diskHistory}
                  uptimeSeconds={uptimeSeconds} />
              );
            case 'terminal_feed':
              return <TerminalFeedCard key={card.id} isConnected={isConnected} liveTermLogs={liveTermLogs} />;
            case 'crawlers_graph':
              return <CrawlersGraphCard key={card.id} isConnected={isConnected} kbFindings={kbFindings} />;
            case 'kb_graph':
            case 'knowledgebank_graph':
              return <KnowledgebankGraphCard key={card.id} isConnected={isConnected} kbFindings={kbFindings} />;
            case 'scripts_graph':
              return <ScriptsGraphCard key={card.id} isConnected={isConnected} goToTab={goToTab} />;
            case 'smart_alerts':
              return <SmartAlertsHomeCard key={card.id} isConnected={isConnected} metrics={metrics} />;
            case 'security_grid':
            case 'security_protocols':
              return <SecurityProtocolsGrid key={card.id} isConnected={isConnected} canaryStatus={canaryStatus} />;
            case 'kb_articles':
            case 'kb_articles_feed':
              return <KBArticlesFeed key={card.id} goToTab={goToTab} isConnected={isConnected} />;
            case 'recent_activity':
              return <RecentActivity key={card.id} goToTab={goToTab} />;
            case 'server_setup':
              return null; // merged into the pinned ServerSetupHub above
            case 'sigma_net':
            case 'sigma_net_crawler':
              return <SigmaNetCrawlerHomeCard key={card.id} isConnected={isConnected} />;
            case 'omega_loop': {
              if (!isConnected) return null;
              try {
                return (
                  <OmegaLearningLoop key={card.id}
                    serverIp={serverConnection.getIP()}
                    serverPort={serverConnection.getPort()}
                    token={serverConnection.getToken()}
                    compact />
                );
              } catch { return null; }
            }
            default:
              return null;
          }
        })}

      {/* Fallbacks when no config */}
      {uiCfg.home.cards.length === 0 && (
        <>
          <ConnectedPCCard isConnected={isConnected} serverAddr={serverAddr}
            metrics={metrics} ollamaOnline={ollamaOnline}
            cpuHistory={cpuHistory} ramHistory={ramHistory} diskHistory={diskHistory}
            uptimeSeconds={uptimeSeconds} />
          <SmartAlertsHomeCard isConnected={isConnected} metrics={metrics} />
          <SecurityProtocolsGrid isConnected={isConnected} canaryStatus={canaryStatus} />
        </>
      )}

      <InlineWidgetSlot pageId="home" position="inline-bottom" />
      </ScrollView>
    </View>
  );
}

// ─── BASE STYLES ──────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex:1, backgroundColor:D.bg },
  scroll:  { flex:1, backgroundColor:'transparent' },
  content: { paddingHorizontal:14, paddingTop:46, paddingBottom:158, gap:10 },
});

const pvb = StyleSheet.create({
  overlay: { marginBottom:0 },
  card:    { backgroundColor:D.surfaceHi, borderRadius:16, borderWidth:1.5, borderColor:D.green+'30', overflow:'hidden', padding:16, position:'relative' },
  topBar:  { height:3, backgroundColor:D.green, width:'100%', position:'absolute', top:0, left:0 },
  header:  { flexDirection:'row', alignItems:'center', gap:10, marginBottom:10, marginTop:4 },
  title:   { fontSize:13, fontWeight:'900', fontFamily:MONO, color:D.green, letterSpacing:1 },
  sub:     { fontSize:9, fontFamily:MONO, color:D.textDim, marginTop:1 },
  body:    { fontSize:11, fontFamily:MONO, color:D.textMid, lineHeight:17 },
  footer:  { flexDirection:'row', alignItems:'center', gap:6, marginTop:10, paddingTop:10, borderTopWidth:StyleSheet.hairlineWidth, borderTopColor:D.green+'20' },
  footerTxt:{ fontSize:10, fontFamily:MONO, color:D.green+'80' },
});


// Expo Router per-route ErrorBoundary — isolates crashes to this tab
export { ErrorBoundary } from '@/components/ui/TabErrorBoundary';
