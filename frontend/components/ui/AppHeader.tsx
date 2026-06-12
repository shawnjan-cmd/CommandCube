/**
 * ⚡ BUTLER AI — TEAL HUD HEADER
 * Matches homepage teal/cyan color scheme
 * Modular, clean, professional
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  Animated, Modal, ScrollView, Easing, Dimensions,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '@/services/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW } = Dimensions.get('window');

// ── Teal Design Tokens ──────────────────────────────────────────
const C = {
  bg:        '#050505',
  panel:     '#071218',
  panelBrt:  '#0A1A22',
  teal:      '#FF2A1F',
  tealBrt:   '#FF2A1F',
  tealDim:   '#451A15',
  tealGlow:  '#FF2A1F30',
  tealMid:   '#008899',
  cyan:      '#FF2A1F',
  blue:      '#0088CC',
  green:     '#44FF88',
  amber:     '#FF6A1F',
  red:       '#FF6A1F',
  text:      '#99CCDD',
  textBrt:   '#CCEEEE',
  textHi:    '#E8F8FF',
  textDim:   '#5A626E',
  border:    '#0A2233',
  borderHi:  '#1A4455',
  chrome:    '#8899AA',
};
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ── HUD Corner Brackets ──────────────────────────────────────────
function HUDCorners({ size = 10, color = C.teal, thickness = 1.5 }: {
  size?: number; color?: string; thickness?: number;
}) {
  const corners = [
    { top: 0, left: 0,   borderTopWidth: thickness,    borderLeftWidth: thickness },
    { top: 0, right: 0,  borderTopWidth: thickness,    borderRightWidth: thickness },
    { bottom: 0, left: 0,  borderBottomWidth: thickness, borderLeftWidth: thickness },
    { bottom: 0, right: 0, borderBottomWidth: thickness, borderRightWidth: thickness },
  ];
  return (
    <>
      {corners.map((pos, i) => (
        <View key={i} style={[{ position: 'absolute', width: size, height: size, borderColor: color }, pos]} />
      ))}
    </>
  );
}

// ── Circuit Trace Background ─────────────────────────────────────
function CircuitBg() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundColor:'#050505' }} />
      {[16, 32, 48, 64, 80, 96, 112].map((y, i) => (
        <View key={`h${i}`} style={{ position:'absolute', left:0, right:0, top:y, height: i%3===0 ? 1.5 : 0.8,
          backgroundColor: i%3===0 ? 'rgba(255,42,31,0.09)' : 'rgba(160,30,22,0.04)' }} />
      ))}
      {[0, 1, 2, 3, 4, 5].map((_, i) => (
        <View key={`v${i}`} style={{ position:'absolute', top:0, bottom:0, left: i*(SW/5),
          width: i%2===0 ? 1.5 : 0.8,
          backgroundColor: i%2===0 ? 'rgba(255,42,31,0.07)' : 'rgba(160,30,22,0.03)' }} />
      ))}
      {/* SMD pads */}
      {[[0.08,0.3],[0.55,0.15],[0.85,0.6],[0.25,0.75]].map(([rx,ry],i) => (
        <View key={`p${i}`} style={{ position:'absolute', left:rx*SW-4, top:ry*120-4,
          width:8, height:8, borderRadius:4,
          backgroundColor: 'rgba(0,210,230,0.18)',
          borderWidth:1, borderColor:'rgba(255,42,31,0.28)' }} />
      ))}
      <View style={{ position:'absolute', left:0, top:0, bottom:0, width:2.5, backgroundColor:'rgba(255,42,31,0.3)' }} />
      <View style={{ position:'absolute', right:0, top:0, bottom:0, width:2.5, backgroundColor:'rgba(255,42,31,0.3)' }} />
    </View>
  );
}

// ── Status Badge ─────────────────────────────────────────────────
function StatusBadge({ isOnline }: { isOnline: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isOnline) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 0.2, duration: 600, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: false }),
      ])).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  }, [isOnline]);

  const col = isOnline ? C.green : C.teal;
  const label = isOnline ? 'ONLINE' : 'OFFLINE';

  return (
    <View style={[sb.outer, { borderColor: col + '70' }]}>
      <HUDCorners size={6} color={col} thickness={1.5} />
      <View style={sb.inner}>
        <Animated.View style={[sb.dot, { backgroundColor: col, opacity: pulse,
          ...Platform.select({ ios:{ shadowColor:col, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:6 }, android:{} }) }]} />
        <Text style={[sb.label, { color: col }]}>{label}</Text>
      </View>
    </View>
  );
}
const sb = StyleSheet.create({
  outer: { borderWidth: 1.5, borderRadius: 4, backgroundColor: '#0E0F12', overflow:'hidden', position:'relative', width: 82 },
  inner: { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:8, paddingVertical:6 },
  dot:   { width:7, height:7, borderRadius:4 },
  label: { fontSize:11, fontWeight:'900', fontFamily:MONO, letterSpacing:1.5 },
});

// ── Token Pill ───────────────────────────────────────────────────
function TokenPill({ count, icon, color, label, scale }: {
  count: number; icon: string; color: string; label?: string;
  scale: Animated.Value;
}) {
  const glow = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1400, useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0.35, duration: 1400, useNativeDriver: false }),
    ])).start();
  }, []);

  const displayStr = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
  return (
    <Animated.View style={[tp.outer, {
      borderColor: color + '70', backgroundColor: color + '12', transform: [{ scale }],
      ...Platform.select({ ios:{ shadowColor:color, shadowOffset:{width:0,height:0}, shadowOpacity:(glow as any), shadowRadius:8 }, android:{} }),
    }]}>
      <HUDCorners size={5} color={color} thickness={1} />
      <View style={tp.inner}>
        <MaterialIcons name={icon as any} size={11} color={color} />
        <Animated.Text style={[tp.count, { color, opacity: glow }]}>{displayStr}</Animated.Text>
        {label ? <Text style={[tp.label, { color: color + 'AA' }]}>{label}</Text> : null}
      </View>
    </Animated.View>
  );
}
const tp = StyleSheet.create({
  outer: { borderWidth: 1.5, borderRadius: 16, position:'relative', overflow:'hidden' },
  inner: { flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:9, paddingVertical:5 },
  count: { fontSize:13, fontWeight:'900', fontFamily:MONO, letterSpacing:0.5 },
  label: { fontSize:7, fontWeight:'700', fontFamily:MONO, letterSpacing:1, textTransform:'uppercase' },
});

// ── Center Title Block ────────────────────────────────────────────
function TitleBlock({ title, subtitle, showBack, onBack }: {
  title: string; subtitle?: string; showBack: boolean; onBack?: () => void;
}) {
  return (
    <View style={tb.wrap}>
      {showBack ? (
        <TouchableOpacity style={tb.backBtn} onPress={() => { haptics.light(); onBack?.(); }}
          hitSlop={{ top:8, bottom:8, left:6, right:6 }} activeOpacity={0.7}>
          <View style={tb.backBtnInner}>
            <MaterialIcons name="chevron-left" size={14} color={C.teal} />
          </View>
        </TouchableOpacity>
      ) : null}

      {/* HUD label */}
      <Text style={tb.hudLabel}>{'< SYSTEM CORE // ACCESS PANEL >'}</Text>

      {/* Big title */}
      <View style={tb.titleRow}>
        <Text style={tb.bracket}>[</Text>
        <Text style={tb.titleMain} numberOfLines={1}>{title}</Text>
        <Text style={tb.bracket}>]</Text>
      </View>

      {/* Divider */}
      <View style={tb.divRow}>
        <View style={tb.divLine} />
        <View style={tb.divDiamond} />
        <View style={tb.divLine} />
      </View>

      {/* Subtitle / data ticker */}
      <Text style={tb.subtitle} numberOfLines={1}>
        {subtitle || 'BUTLER AI // REMOTE PC AUTOMATION'}
      </Text>

      {/* Micro data row */}
      <View style={tb.dataRow}>
        <Text style={tb.dataTxt} numberOfLines={1}>
          {'SYS:ONLINE · AI-CORE · NEXUS-v5 · KB-ACTIVE ▸'}
        </Text>
      </View>
    </View>
  );
}
const tb = StyleSheet.create({
  wrap:       { flex:1, justifyContent:'center', paddingHorizontal:8, overflow:'hidden' },
  backBtn:    { marginBottom:3, alignSelf:'flex-start' },
  backBtnInner:{ borderWidth:1, borderColor:C.teal+'60', backgroundColor:C.tealDim+'40', paddingHorizontal:4, paddingVertical:1, borderRadius:2 },
  hudLabel:   { fontSize:6.5, color:'rgba(216,36,26,0.5)', fontFamily:MONO, letterSpacing:0.8, marginBottom:2 },
  titleRow:   { flexDirection:'row', alignItems:'center', gap:3 },
  bracket:    { fontSize:26, fontWeight:'900', color:C.teal, fontFamily:MONO,
    ...Platform.select({ ios:{ textShadowColor:C.teal, textShadowOffset:{width:0,height:0}, textShadowRadius:14 }, android:{} }) },
  titleMain:  { fontSize:24, fontWeight:'900', color:C.tealBrt, fontFamily:MONO, letterSpacing:2, flex:1,
    ...Platform.select({ ios:{ textShadowColor:C.teal, textShadowOffset:{width:0,height:0}, textShadowRadius:18 }, android:{} }) },
  divRow:     { flexDirection:'row', alignItems:'center', gap:6, marginVertical:3 },
  divLine:    { flex:1, height:1.5, backgroundColor:C.teal, opacity:0.4 },
  divDiamond: { width:6, height:6, backgroundColor:C.teal, transform:[{rotate:'45deg'}], opacity:0.7 },
  subtitle:   { fontSize:7.5, fontWeight:'700', color:C.tealMid, fontFamily:MONO, letterSpacing:1 },
  dataRow:    { marginTop:3, backgroundColor:C.tealDim+'40', borderWidth:0.5, borderColor:C.teal+'30',
    paddingHorizontal:5, paddingVertical:1.5 },
  dataTxt:    { fontSize:5.5, color:C.tealMid+'80', fontFamily:MONO, letterSpacing:0.5 },
});

// ── KB Live Data Graph (replaces logo banner) ───────────────────
function KBLiveGraph({ isOnline }: { isOnline: boolean }) {
  const [kbFindings, setKbFindings]   = useState(0);
  const [kbGrowth, setKbGrowth]       = useState<number[]>([]);
  const [execCount, setExecCount]     = useState(0);
  const [kbDomains, setKbDomains]     = useState(0);
  const barGlow   = useRef(new Animated.Value(0.5)).current;
  const scanLine  = useRef(new Animated.Value(0)).current;

  // Load real KB data
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem('@botler_auto_saved_research');
        if (raw) {
          const parsed = JSON.parse(raw);
          const total = (parsed.totalFindings as number) ?? 0;
          setKbFindings(total);
          // Build last-7 growth sparkline from findings by domain
          const domainMap: Record<string, number> = parsed.findings ?? parsed.byDomain ?? {};
          const vals = Object.values(domainMap) as number[];
          setKbDomains(vals.length);
          // Normalize to 7 bars
          const max7 = vals.slice(-7).map(Number);
          while (max7.length < 7) max7.unshift(0);
          setKbGrowth(max7);
        }
        const execRaw = await AsyncStorage.getItem('boter_exec_counts_v1');
        if (execRaw) {
          const execMap = JSON.parse(execRaw) as Record<string, number>;
          setExecCount(Object.values(execMap).reduce((a, b) => a + b, 0));
        }
      } catch {}
    };
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  // Bar glow pulse
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(barGlow, { toValue: 1,   duration: 1200, useNativeDriver: false }),
      Animated.timing(barGlow, { toValue: 0.4, duration: 1200, useNativeDriver: false }),
    ])).start();
    Animated.loop(Animated.timing(scanLine, { toValue: 1, duration: 2500, useNativeDriver: false })).start();
  }, []);

  const maxVal = Math.max(...kbGrowth, 1);
  const connCol = isOnline ? '#44FF88' : '#FF2A1F';
  const displayFindings = kbFindings >= 1000 ? `${(kbFindings / 1000).toFixed(1)}k` : String(kbFindings);
  const scanTop = scanLine.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={rp.wrap}>
      {/* Dark navy bg */}
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#0E0F12' }} />
      {/* Circuit trace lines */}
      {[0.2, 0.45, 0.7, 0.9].map((p, i) => (
        <View key={i} style={{ position:'absolute', left:0, right:0, top:`${p*100}%` as any, height:1, backgroundColor:'#FF2A1F0A' }} pointerEvents="none" />
      ))}
      {/* Animated scan line */}
      <Animated.View style={{ position:'absolute', left:0, right:0, height:1.5,
        top: scanTop, backgroundColor: '#FF2A1F', opacity: 0.12, zIndex:4 }} pointerEvents="none" />

      {/* HUD corners */}
      <View style={[rp.corner, { top:0, left:0, borderTopWidth:1.5, borderLeftWidth:1.5 }]} />
      <View style={[rp.corner, { top:0, right:0, borderTopWidth:1.5, borderRightWidth:1.5 }]} />
      <View style={[rp.corner, { bottom:0, left:0, borderBottomWidth:1.5, borderLeftWidth:1.5 }]} />
      <View style={[rp.corner, { bottom:0, right:0, borderBottomWidth:1.5, borderRightWidth:1.5 }]} />

      {/* Header row */}
      <View style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:8, paddingTop:6, paddingBottom:4, gap:6 }}>
        <View style={{ width:7, height:7, borderRadius:4, backgroundColor: connCol,
          ...Platform.select({ ios:{ shadowColor:connCol, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:5 }, android:{} }) }} />
        <Text style={{ fontSize:8, fontWeight:'900', color:'#FF2A1F', fontFamily:MONO, letterSpacing:1.2, flex:1 }}>KNOWLEDGE BASE</Text>
        <Text style={{ fontSize:7, color: connCol, fontFamily:MONO, fontWeight:'900' }}>{isOnline ? 'LIVE' : 'LOCAL'}</Text>
      </View>

      {/* Stats row */}
      <View style={{ flexDirection:'row', paddingHorizontal:8, gap:6, marginBottom:4 }}>
        {[
          { label:'FINDINGS', val: displayFindings, col:'#FF2A1F' },
          { label:'DOMAINS',  val: String(kbDomains), col:'#00AACC' },
          { label:'EXECS',    val: String(execCount), col:'#FF6A1F' },
        ].map(({ label, val, col }) => (
          <View key={label} style={{ flex:1, backgroundColor: col+'15', borderWidth:1, borderColor: col+'40', borderRadius:4, alignItems:'center', paddingVertical:4 }}>
            <Animated.Text style={{ fontSize:13, fontWeight:'900', color:col, fontFamily:MONO,
              ...Platform.select({ ios:{ textShadowColor:col, textShadowOffset:{width:0,height:0}, textShadowRadius:6 }, android:{} }),
            }}>{val}</Animated.Text>
            <Text style={{ fontSize:6, color: col+'99', fontFamily:MONO, letterSpacing:0.5 }}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Sparkline bar graph */}
      <View style={{ flexDirection:'row', alignItems:'flex-end', paddingHorizontal:8, paddingBottom:6, gap:2, height:28 }}>
        {kbGrowth.map((val, i) => {
          const pct = Math.max(val / maxVal, 0.08);
          const barH = Math.round(pct * 22);
          const isLast = i === kbGrowth.length - 1;
          const col = isLast ? '#FF2A1F' : '#FF2A1F';
          return (
            <Animated.View key={i} style={[
              { flex:1, borderRadius:2, backgroundColor: col, height: barH,
                opacity: isLast ? barGlow : (0.3 + pct * 0.5),
                ...Platform.select({ ios:{ shadowColor:col, shadowOffset:{width:0,height:0}, shadowOpacity: isLast ? 1 : 0.3, shadowRadius:4 }, android:{} }),
              }
            ]} />
          );
        })}
        {/* Y-axis guide */}
        <View style={{ position:'absolute', left:6, right:6, bottom:6, height:1, backgroundColor:'#FF2A1F25' }} />
      </View>

      {/* Bottom label */}
      <View style={{ paddingHorizontal:8, paddingBottom:5, flexDirection:'row', alignItems:'center', gap:4 }}>
        <View style={{ flex:1, height:1, backgroundColor:'#FF2A1F20' }} />
        <Text style={{ fontSize:6, color:'#FF2A1F60', fontFamily:MONO, letterSpacing:0.5 }}>7-DOMAIN GROWTH</Text>
        <View style={{ flex:1, height:1, backgroundColor:'#FF2A1F20' }} />
      </View>
    </View>
  );
}
const rp = StyleSheet.create({
  wrap:   { flex:1, overflow:'hidden', position:'relative', minHeight:86,
    ...Platform.select({ ios:{ shadowColor:'#FF2A1F', shadowOffset:{width:0,height:0}, shadowOpacity:0.3, shadowRadius:6 }, android:{elevation:4} }) },
  corner: { position:'absolute', width:8, height:8, borderColor:'#FF2A1F', zIndex:5 },
});

// ── Menu Dots Button ─────────────────────────────────────────────
function MenuDots({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={md.btn} onPress={onPress} activeOpacity={0.7}
      hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
      <HUDCorners size={5} color={C.teal} thickness={1} />
      <View style={md.inner}>
        {[0,1,2].map(i => <View key={i} style={md.dot} />)}
      </View>
    </TouchableOpacity>
  );
}
const md = StyleSheet.create({
  btn: { width:36, height:36, backgroundColor:'#0E0F12', borderWidth:1.5, borderColor:C.tealDim, borderRadius:4,
    overflow:'hidden', alignItems:'center', justifyContent:'center', position:'relative',
    ...Platform.select({ ios:{ shadowColor:C.teal, shadowOffset:{width:0,height:0}, shadowOpacity:0.3, shadowRadius:5 }, android:{ elevation:3 } }) },
  inner: { gap:3, alignItems:'center' },
  dot:   { width:3.5, height:3.5, borderRadius:2, backgroundColor:C.tealMid },
});

// ── Types ────────────────────────────────────────────────────────
export interface HeaderMenuItem {
  label: string; icon: string; color?: string; onPress: () => void;
}
export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  isSecure?: boolean;
  tokenCount?: number;
  tokenIcon?: string;
  tokenColor?: string;
  tokenLabel?: string;
  menuItems?: HeaderMenuItem[];
  rightExtra?: React.ReactNode;
}

// ── Main AppHeader ────────────────────────────────────────────────
export default function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  isSecure,
  tokenCount,
  tokenIcon = 'bolt',
  tokenColor,
  tokenLabel,
  menuItems,
  rightExtra,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);

  const pillScale = useRef(new Animated.Value(1)).current;
  const prevCount = useRef<number | undefined>(tokenCount);
  const [displayCount, setDisplayCount] = useState<number>(tokenCount ?? 0);

  const scanAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(scanAnim, { toValue: 1, duration: 3000, useNativeDriver: false })
    ).start();
  }, []);

  // Count-up animation
  useEffect(() => {
    if (tokenCount === undefined) return;
    const from = prevCount.current ?? tokenCount;
    const to   = tokenCount;
    prevCount.current = tokenCount;
    if (from === to) return;
    Animated.sequence([
      Animated.timing(pillScale, { toValue: 1.2, duration: 130, useNativeDriver: true, easing: Easing.out(Easing.back(2)) }),
      Animated.spring(pillScale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
    const steps = Math.min(Math.abs(to - from), 30);
    const stepMs = Math.max(16, Math.round(500 / (steps || 1)));
    let current = from;
    const delta = to > from ? 1 : -1;
    const inc = Math.ceil(Math.abs(to - from) / steps);
    const timer = setInterval(() => {
      current += delta * inc;
      if ((delta > 0 && current >= to) || (delta < 0 && current <= to)) { current = to; clearInterval(timer); }
      setDisplayCount(current);
    }, stepMs);
    return () => clearInterval(timer);
  }, [tokenCount]);

  useEffect(() => { if (tokenCount !== undefined) setDisplayCount(tokenCount); }, []);

  const pillColor = tokenColor || C.amber;
  const isOnline  = isSecure === true;

  // Header height for scan beam
  const HEADER_H = 130;
  const scanBeamY = scanAnim.interpolate({ inputRange:[0,1], outputRange:[0, HEADER_H] });

  return (
    <>
      <View style={[hdr.container, { paddingTop: Math.max(insets.top, 4) }]}>
        {/* Circuit background */}
        <CircuitBg />

        {/* Animated scan beam */}
        <Animated.View pointerEvents="none" style={[hdr.scanBeam, { top: scanBeamY }]} />

        {/* HUD corner brackets on outer container */}
        <View style={[hdr.outerCorner, { top: insets.top+2, left:6, borderTopWidth:2, borderLeftWidth:2 }]} />
        <View style={[hdr.outerCorner, { top: insets.top+2, right:6, borderTopWidth:2, borderRightWidth:2 }]} />
        <View style={[hdr.outerCorner, { bottom:0, left:6, borderBottomWidth:2, borderLeftWidth:2 }]} />
        <View style={[hdr.outerCorner, { bottom:0, right:6, borderBottomWidth:2, borderRightWidth:2 }]} />

        {/* Top ticker */}
        <View style={hdr.tickerBar}>
          <View style={[hdr.tickerDot, { backgroundColor: isOnline ? C.green : C.teal }]} />
          <Text style={hdr.tickerTxt} numberOfLines={1}>
            {isOnline ? 'BUTLER ONLINE  ·  ALL SYSTEMS OPERATIONAL  ·  NEXUS v5.0' : 'AWAITING UPLINK  ·  NO SERVER PAIRED  ·  STANDBY MODE'}
          </Text>
          <View style={[hdr.tickerDot, { backgroundColor: C.amber, opacity: 0.7 }]} />
        </View>

        {/* ── MAIN CONTENT ROW ── */}
        <View style={hdr.mainRow}>
          {/* LEFT: Status + Token + Menu */}
          <View style={hdr.leftCol}>
            {isSecure !== undefined ? <StatusBadge isOnline={isOnline} /> : null}
            {tokenCount !== undefined ? (
              <TokenPill count={displayCount} icon={tokenIcon} color={pillColor} label={tokenLabel} scale={pillScale} />
            ) : null}
            {rightExtra}
            {menuItems && menuItems.length > 0 ? (
              <MenuDots onPress={() => { haptics.light(); setMenuVisible(true); }} />
            ) : null}
          </View>

          {/* CENTER + RIGHT: Live KB data graph */}
          <KBLiveGraph isOnline={isOnline} />
        </View>

        {/* Bottom status strip */}
        <View style={[hdr.bottomStrip, { borderTopColor: (isOnline ? C.green : C.teal) + '40' }]}>
          <View style={[hdr.stripDot, { backgroundColor: isOnline ? C.green : C.teal }]} />
          <Text style={[hdr.stripTxt, { color: isOnline ? C.green : C.tealMid }]} numberOfLines={1}>
            {isOnline ? '● UPLINK ESTABLISHED' : '○ AWAITING UPLINK  ·  SCAN QR TO CONNECT'}
          </Text>
          <View style={hdr.stripDiamond} />
        </View>

        {/* Bottom glow line */}
        <View style={[hdr.glowLine, {
          backgroundColor: isOnline ? C.green : C.teal,
          ...Platform.select({ ios:{ shadowColor: isOnline ? C.green : C.teal, shadowOffset:{width:0,height:0}, shadowOpacity:0.8, shadowRadius:10 }, android:{} }),
        }]} />
      </View>

      {/* Dropdown menu modal */}
      {menuItems && menuItems.length > 0 ? (
        <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
          <TouchableOpacity style={men.backdrop} activeOpacity={1} onPress={() => setMenuVisible(false)}>
            <View style={[men.sheet, { marginTop: Math.max(insets.top + 62, 80) }]}>
              <HUDCorners size={10} color={C.teal} thickness={2} />
              <View style={men.menuHeader}>
                <MaterialIcons name="smart-toy" size={13} color={C.teal} />
                <Text style={men.menuHeaderTxt}>NEXUS NAVIGATION</Text>
              </View>
              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                {menuItems.map((item, i) => (
                  <TouchableOpacity key={i} style={[men.item, i > 0 && men.itemBorder]}
                    onPress={() => { haptics.light(); setMenuVisible(false); setTimeout(item.onPress, 120); }}
                    activeOpacity={0.75}>
                    <View style={[men.itemIconBox, { borderColor: (item.color || C.teal) + '60' }]}>
                      <MaterialIcons name={item.icon as any} size={14} color={item.color || C.teal} />
                    </View>
                    <Text style={[men.itemTxt, { color: item.color || C.textHi }]}>{item.label}</Text>
                    <MaterialIcons name="chevron-right" size={12} color={C.textDim} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={[men.bottomLine, { backgroundColor: C.teal }]} />
            </View>
          </TouchableOpacity>
        </Modal>
      ) : null}
    </>
  );
}

const hdr = StyleSheet.create({
  container: {
    backgroundColor: '#050505', zIndex:50, overflow:'hidden', position:'relative',
    ...Platform.select({ ios:{ shadowColor:C.teal, shadowOffset:{width:0,height:6}, shadowOpacity:0.4, shadowRadius:14 }, android:{elevation:12} }),
  },
  scanBeam: { position:'absolute', left:0, right:0, height:2.5, backgroundColor:C.tealBrt, opacity:0.2, zIndex:8 },
  outerCorner: { position:'absolute', width:20, height:20, borderColor:C.teal, zIndex:20 },

  // Ticker
  tickerBar:  { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14, paddingVertical:5,
    borderBottomWidth:1, borderBottomColor:'rgba(255,42,31,0.12)', backgroundColor:'rgba(0,0,0,0.3)' },
  tickerDot:  { width:5, height:5, borderRadius:3, flexShrink:0 },
  tickerTxt:  { flex:1, fontSize:7, fontWeight:'900', color:'rgba(216,36,26,0.6)', fontFamily:MONO, letterSpacing:1 },

  // Main row
  mainRow:    { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:10, gap:10, zIndex:2, minHeight:86 },
  leftCol:    { alignItems:'flex-start', gap:5, flexShrink:0, width:86, maxWidth:86 },

  // Bottom
  bottomStrip:{ flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14, paddingVertical:5, borderTopWidth:1 },
  stripDot:   { width:6, height:6, borderRadius:3, flexShrink:0,
    ...Platform.select({ ios:{ shadowColor:C.teal, shadowOffset:{width:0,height:0}, shadowOpacity:0.9, shadowRadius:5 }, android:{} }) },
  stripTxt:   { flex:1, fontSize:7.5, fontWeight:'900', fontFamily:MONO, letterSpacing:0.8 },
  stripDiamond:{ width:7, height:7, backgroundColor:C.chrome, transform:[{rotate:'45deg'}], opacity:0.6, flexShrink:0 },
  glowLine:   { height:2.5, opacity:0.7 },
});

const men = StyleSheet.create({
  backdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.88)', alignItems:'flex-end' },
  sheet: {
    marginRight:10, backgroundColor:'#071218',
    borderWidth:1.5, borderColor:C.teal+'90', borderRadius:6, minWidth:195, overflow:'hidden', position:'relative',
    ...Platform.select({ ios:{ shadowColor:C.teal, shadowOffset:{width:0,height:4}, shadowOpacity:0.5, shadowRadius:14 }, android:{elevation:14} }),
  },
  menuHeader:   { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:14, paddingVertical:10,
    backgroundColor:C.tealDim+'60', borderBottomWidth:1.5, borderBottomColor:C.teal+'50' },
  menuHeaderTxt:{ fontSize:8.5, fontWeight:'900', color:C.teal, fontFamily:MONO, letterSpacing:2 },
  item:         { flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:14, paddingVertical:13 },
  itemBorder:   { borderTopWidth:1, borderTopColor:C.border },
  itemIconBox:  { width:28, height:28, borderWidth:1, borderRadius:6, alignItems:'center', justifyContent:'center', backgroundColor:'#0E0F12' },
  itemTxt:      { flex:1, fontSize:12, fontWeight:'700', fontFamily:MONO, letterSpacing:0.5 },
  bottomLine:   { height:2.5, opacity:0.7 },
});
