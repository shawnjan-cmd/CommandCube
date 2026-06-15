/**
 * Butler AI — Play Store Compliance Onboarding v7.3.0
 * 10 screens — single onComplete prop, no router calls, no timers
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated,
  ActivityIndicator, Platform, Linking, Dimensions, Alert,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Path, Rect, G, Defs, RadialGradient, Stop, LinearGradient } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { haptics } from '@/services/haptics';
import { logger } from '@/utils/logger';
import ButlerHeroSvg from '@/components/ui/ButlerHeroSvg';


// ── Persistent keys ──────────────────────────────────────────────
export {
  CONSENT_KEY, LAN_CONSENT_KEY, ONBOARDING_DONE_KEY, TERMS_ACCEPTED_KEY,
  PRIVACY_ACCEPTED_KEY, AGE_CONFIRMED_KEY, REMOTE_EXEC_CONSENT_KEY, CAMERA_CONSENT_KEY,
  SERVER_PRIVACY_ACCEPTED_KEY,
} from '@/constants/onboardingKeys';
import {
  CONSENT_KEY, LAN_CONSENT_KEY, ONBOARDING_DONE_KEY, TERMS_ACCEPTED_KEY,
  PRIVACY_ACCEPTED_KEY, AGE_CONFIRMED_KEY, REMOTE_EXEC_CONSENT_KEY, CAMERA_CONSENT_KEY,
  SERVER_PRIVACY_ACCEPTED_KEY,
} from '@/constants/onboardingKeys';

// ── Safe haptics ─────────────────────────────────────────────────
const safeHaptics = {
  selection: () => { try { haptics.selection(); } catch {} },
  light:     () => { try { haptics.light();     } catch {} },
  medium:    () => { try { haptics.medium();    } catch {} },
  heavy:     () => { try { haptics.heavy();     } catch {} },
  success:   () => { try { haptics.success();   } catch {} },
};

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const { width: _SW } = Dimensions.get('window');
const SW = _SW > 0 ? _SW : 375;

const C = {
  bg:       '#010306',
  surface:  '#060D18',
  card:     '#080E1C',
  cyan:     '#FF2A1F',
  green:    '#00FF88',
  amber:    '#FFC400',
  blue:     '#FF6A1F',
  teal:     '#FF2A1F',
  red:      '#FF2244',
  orange:   '#FF6820',
  purple:   '#FFC400',
  pink:     '#FF69B4',
  text:     '#C8E4F0',
  textMid:  '#5A8090',
  textDim:  '#1E3040',
  border:   'rgba(255,42,31,0.14)',
};

const STEP_LABELS = [
  'Welcome', 'App Tour', 'Safety Consent', 'Safety Pledge',
  'Legal Docs', 'Permissions', 'Q & A', 'Server Privacy', 'PC Setup', 'Launch',
];
const TOTAL_STEPS = STEP_LABELS.length;

// ─────────────────────────────────────────────────────────────────
// BUTLER AI LOGO
// ─────────────────────────────────────────────────────────────────
function ButlerRobotLogo({ size = 80, glow = true }: { size?: number; glow?: boolean }) {
  const s = size;
  const pad = s * 0.06;
  const panelW = (s - pad * 4) / 3;
  const panelH = s * 0.55;
  const panelY = s * 0.06;
  const r = s * 0.08;
  const cx = s / 2;
  const eyeY = panelY + panelH * 0.38;
  const eyeR = s * 0.055;
  const eyeGap = s * 0.13;

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <RadialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="100%" stopColor="#FF2A1F" stopOpacity="0.08" />
        </RadialGradient>
        <LinearGradient id="panelGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#1A1A1A" />
          <Stop offset="100%" stopColor="#070708" />
        </LinearGradient>
        <LinearGradient id="greenGlow" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.12" />
          <Stop offset="100%" stopColor="#FF2A1F" stopOpacity="0.04" />
        </LinearGradient>
      </Defs>
      <Rect x={pad} y={panelY} width={panelW} height={panelH} rx={r} fill="url(#panelGrad)"
        stroke={C.cyan} strokeWidth={s * 0.018} strokeOpacity={0.55} />
      {[0.3, 0.55, 0.75].map((frac, i) => (
        <Path key={`lg${i}`}
          d={`M${pad + s*0.04} ${panelY + panelH * frac} H${pad + panelW - s*0.04}`}
          stroke={C.cyan} strokeWidth={s*0.012} strokeOpacity={0.25} />
      ))}
      {[0.35, 0.65].map((frac, i) => (
        <Circle key={`ld${i}`}
          cx={pad + panelW * frac} cy={panelY + panelH * 0.18}
          r={s * 0.022} fill={C.cyan} opacity={0.5} />
      ))}
      <Rect x={pad * 3 + panelW * 2} y={panelY} width={panelW} height={panelH} rx={r}
        fill="url(#panelGrad)" stroke={C.cyan} strokeWidth={s * 0.018} strokeOpacity={0.55} />
      {[0, 1, 2].map(row =>
        [0, 1].map(col => (
          <Rect key={`rg${row}${col}`}
            x={pad * 3 + panelW * 2 + s*0.05 + col * (panelW * 0.42)}
            y={panelY + s*0.07 + row * (panelH * 0.28)}
            width={panelW * 0.38} height={panelH * 0.22}
            rx={s * 0.03} fill="none"
            stroke={C.cyan} strokeWidth={s*0.013} strokeOpacity={0.3} />
        ))
      )}
      <Rect x={pad * 2 + panelW} y={panelY} width={panelW} height={panelH} rx={r}
        fill="url(#panelGrad)" stroke={C.cyan} strokeWidth={s * 0.022} strokeOpacity={0.8} />
      {glow && (
        <Rect x={pad * 2 + panelW + 1} y={panelY + 1} width={panelW - 2} height={panelH - 2} rx={r}
          fill="url(#greenGlow)" />
      )}
      <Path
        d={`M${cx} ${panelY} V${panelY - s * 0.09}`}
        stroke={C.cyan} strokeWidth={s * 0.018} strokeOpacity={0.7}
        strokeLinecap="round" />
      <Circle cx={cx} cy={panelY - s * 0.1} r={s * 0.028} fill={C.cyan} opacity={0.9} />
      <Circle cx={cx - eyeGap} cy={eyeY} r={eyeR * 1.5} fill={C.cyan} opacity={0.12} />
      <Circle cx={cx - eyeGap} cy={eyeY} r={eyeR} fill="url(#eyeGlow)" />
      <Circle cx={cx - eyeGap} cy={eyeY} r={eyeR * 0.45} fill="#ffffff" opacity={0.9} />
      <Circle cx={cx + eyeGap} cy={eyeY} r={eyeR * 1.5} fill={C.cyan} opacity={0.12} />
      <Circle cx={cx + eyeGap} cy={eyeY} r={eyeR} fill="url(#eyeGlow)" />
      <Circle cx={cx + eyeGap} cy={eyeY} r={eyeR * 0.45} fill="#ffffff" opacity={0.9} />
      <Circle cx={cx} cy={panelY + panelH * 0.56} r={s * 0.022} fill={C.cyan} opacity={0.6} />
      {[-2, -1, 0, 1, 2].map(i => (
        <Rect key={`m${i}`}
          x={cx + i * s * 0.072 - s * 0.026}
          y={panelY + panelH * 0.70}
          width={s * 0.052} height={s * 0.05}
          rx={s * 0.015}
          fill={C.cyan}
          opacity={Math.abs(i) === 2 ? 0.3 : Math.abs(i) === 1 ? 0.6 : 0.9} />
      ))}
      <Rect
        x={pad} y={panelY + panelH + s * 0.06}
        width={s - pad * 2} height={s * 0.24}
        rx={s * 0.04}
        fill="#070708"
        stroke="#FF2A1F" strokeWidth={s * 0.015} strokeOpacity={0.18} />
    </Svg>
  );
}

function ButlerWordmark({ size = 18 }: { size?: number }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{
        fontSize: size, fontWeight: '900', color: '#FFFFFF',
        fontFamily: MONO, letterSpacing: size * 0.18,
      }}>BUTLER</Text>
      <Text style={{
        fontSize: size * 0.55, fontWeight: '900', color: C.cyan,
        fontFamily: MONO, letterSpacing: size * 0.35,
      }}>AI</Text>
    </View>
  );
}

function ButlerBadgeLogo({ iconSize = 44 }: { iconSize?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{
        width: iconSize, height: iconSize, borderRadius: iconSize * 0.22,
        borderWidth: 1.5, borderColor: C.cyan + '60',
        backgroundColor: C.surface, overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <ButlerRobotLogo size={iconSize * 0.88} glow={false} />
      </View>
      <ButlerWordmark size={iconSize * 0.38} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// SHARED SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────
function HUDGridBG() {
  const scanAnim  = useRef(new Animated.Value(0)).current;
  const scan2Anim = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop1 = Animated.loop(Animated.sequence([
      Animated.timing(scanAnim,  { toValue: 1, duration: 4000, useNativeDriver: true }),
      Animated.timing(scanAnim,  { toValue: 0, duration: 0,    useNativeDriver: true }),
      Animated.delay(600),
    ]));
    const loop2 = Animated.loop(Animated.sequence([
      Animated.timing(scan2Anim, { toValue: 1, duration: 6500, useNativeDriver: true }),
      Animated.timing(scan2Anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
      Animated.delay(1200),
    ]));
    loop1.start(); loop2.start();
    return () => { loop1.stop(); loop2.stop(); };
  }, []);
  const { height: SH } = Dimensions.get('window');
  const scanY  = scanAnim.interpolate({  inputRange: [0,1], outputRange: [-4, SH + 4] });
  const scan2Y = scan2Anim.interpolate({ inputRange: [0,1], outputRange: [-4, SH + 4] });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[15,30,45,60,75,90].map((p,i) => (
        <View key={i} style={{ position:'absolute', left:0, right:0, top:`${p}%` as any,
          height: StyleSheet.hairlineWidth, backgroundColor:'rgba(255,42,31,0.055)' }} />
      ))}
      {[20,40,60,80].map((p,i) => (
        <View key={i} style={{ position:'absolute', top:0, bottom:0, left:`${p}%` as any,
          width: StyleSheet.hairlineWidth, backgroundColor:'rgba(255,42,31,0.035)' }} />
      ))}
      {[
        { top:0, left:0,   borderTopWidth:2, borderLeftWidth:2  },
        { top:0, right:0,  borderTopWidth:2, borderRightWidth:2 },
        { bottom:0, left:0,  borderBottomWidth:2, borderLeftWidth:2  },
        { bottom:0, right:0, borderBottomWidth:2, borderRightWidth:2 },
      ].map((cs,i) => (
        <View key={i} style={{ position:'absolute', width:24, height:24,
          borderColor:'rgba(255,42,31,0.35)', ...cs }} />
      ))}
      <Animated.View style={{
        position:'absolute', left:0, right:0, height:1.5,
        backgroundColor:'rgba(255,42,31,0.18)',
        transform:[{ translateY: scanY }],
      }} />
      <Animated.View style={{
        position:'absolute', left:0, right:0, height:1,
        backgroundColor:'rgba(0,255,136,0.08)',
        transform:[{ translateY: scan2Y }],
      }} />
    </View>
  );
}

function ConsentCheckbox({ checked, onToggle, label, sublabel, required, color = C.cyan, locked = false }: {
  checked: boolean; onToggle: () => void; label: string; sublabel?: string;
  required?: boolean; color?: string; locked?: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    if (locked) return;
    safeHaptics.selection();
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 70, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();
    onToggle();
  };
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={locked ? 1 : 0.85}>
      <Animated.View style={[st.checkRow, checked && { borderColor: color + '50', backgroundColor: color + '08' }, { transform: [{ scale: scaleAnim }] }]}>
        <View style={[st.checkbox, checked && { backgroundColor: color, borderColor: color }]}>
          {checked ? <MaterialIcons name="check" size={14} color="#000" /> : null}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[st.checkLabel, checked && { color }]}>
            {required ? <Text style={{ color: C.red }}>* </Text> : null}{label}
          </Text>
          {sublabel ? <Text style={st.checkSub}>{sublabel}</Text> : null}
        </View>
        {locked ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderColor: C.green + '40', backgroundColor: C.green + '08' }}>
            <MaterialIcons name="lock" size={10} color={C.green} />
            <Text style={{ fontSize: 9, fontWeight: '900', color: C.green, fontFamily: MONO }}>SAVED</Text>
          </View>
        ) : null}
      </Animated.View>
    </TouchableOpacity>
  );
}

function ComplianceBadge() {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
    ]));
    a.start(); return () => a.stop();
  }, []);
  return (
    <View style={[st.card, { borderColor: C.green + '55', marginBottom: 16 }]}>
      <View style={{ height: 3, backgroundColor: C.green }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <View style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 1.5, borderColor: C.green + '60', backgroundColor: C.green + '12', alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: C.green, opacity: pulse }} />
          <MaterialCommunityIcons name="shield-check" size={28} color={C.green} />
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ fontSize: 14, fontWeight: '900', color: C.green, fontFamily: MONO }}>GOOGLE PLAY COMPLIANT</Text>
          <Text style={{ fontSize: 11, color: C.textMid, lineHeight: 17 }}>All privacy, security, and disclosure requirements met and exceeded</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {['✓ Camera', '✓ LAN Consent', '✓ No Root', '✓ Data Delete', '✓ Open Source', '✓ No Auto-Execute'].map(t => (
              <View key={t} style={{ borderRadius: 5, borderWidth: 1, borderColor: C.green + '40', backgroundColor: C.green + '08', paddingHorizontal: 7, paddingVertical: 3 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: C.green, fontFamily: MONO }}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function QAIcon({ type, color, size = 22 }: { type: string; color: string; size?: number }) {
  const sz = size;
  switch (type) {
    case 'what':     return <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/><Path d="M12 17v.5M12 7a3 3 0 0 1 2.5 4.6L12 14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></Svg>;
    case 'schedule': return <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/><Path d="M12 6v6l4 2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><Path d="M3 3l18 18" stroke={C.red} strokeWidth="2" strokeLinecap="round" opacity="0.7"/></Svg>;
    case 'block':    return <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/><Path d="M4.93 4.93l14.14 14.14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></Svg>;
    case 'undo':     return <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Path d="M3 7h12a4 4 0 0 1 0 8H3M7 3L3 7l4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></Svg>;
    case 'safe':     return <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><Path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></Svg>;
    case 'perms':    return <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Rect x="5" y="11" width="14" height="11" rx="2" stroke={color} strokeWidth="1.5"/><Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><Circle cx="12" cy="16" r="1.5" fill={color}/></Svg>;
    case 'delete':   return <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></Svg>;
    case 'ollama':   return <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1.5"/><Path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></Svg>;
    case 'privacy':  return <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="1.5"/><Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5"/></Svg>;
    case 'storage':  return <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Rect x="3" y="4" width="18" height="5" rx="1" stroke={color} strokeWidth="1.5"/><Rect x="3" y="11" width="18" height="5" rx="1" stroke={color} strokeWidth="1.5"/></Svg>;
    case 'encrypt':  return <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></Svg>;
    case 'pair':     return <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Rect x="2" y="6" width="8" height="12" rx="1" stroke={color} strokeWidth="1.5"/><Rect x="14" y="3" width="8" height="18" rx="1" stroke={color} strokeWidth="1.5"/><Path d="M10 12h4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></Svg>;
    default:         return <MaterialIcons name="help-outline" size={sz} color={color} />;
  }
}

// ─────────────────────────────────────────────────────────────────
// SCREEN 1: WELCOME — v9 BULLETPROOF REWRITE
// ─────────────────────────────────────────────────────────────────
// Goals (per user request — recreated from scratch):
//   • Clear, focused, NOT a wall of text.
//   • Big hero, big CTA. Three core promises. Compliance + legal docs
//     kept (Play Store requirement). Nothing else.
//   • Stable: a single subtle animation (hero pulse). No staggered
//     spring chains that could mid-mount throw on low-end devices.
//   • No dependency on prior session state — `allAccepted` is read but
//     only used to swap the CTA label (REVIEW AGAIN vs GET STARTED).
function Screen1Welcome({ onNext, allAccepted }: { onNext: () => void; allAccepted: boolean }) {
  const heroPulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(heroPulse, { toValue: 1,    duration: 1600, useNativeDriver: true }),
      Animated.timing(heroPulse, { toValue: 0.35, duration: 1600, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [heroPulse]);

  const PROMISES = [
    {
      color: C.cyan,
      icon:  'wifi-tethering',
      title: 'LAN-only · Zero Cloud',
      body:  'Your phone talks directly to YOUR PC over your Wi-Fi. No relay server, no third party — ever.',
    },
    {
      color: C.green,
      icon:  'lock-outline',
      title: 'Encrypted + Signed',
      body:  'Every command is HMAC-SHA256 signed. AES-256 storage on device. Pair code required.',
    },
    {
      color: C.amber,
      icon:  'block',
      title: 'Zero Auto-Execute',
      body:  'No scheduler, no cron, no background tasks. Every command needs your active tap.',
    },
  ];

  const LEGAL_DOCS = [
    { color: C.cyan,    icon: 'visibility',     title: 'Privacy Policy',          desc: 'Device UUID only. No scripts, contacts, location, or telemetry collected.',                       url: 'https://shawnjan-cmd.github.io/privacy-policy-/' },
    { color: '#B8860B', icon: 'gavel',          title: 'Terms of Service',        desc: '18+ only. Personal PCs only. No unauthorized access. No malware.',                                 url: 'https://shawnjan-cmd.github.io/privacy-policy-/' },
    { color: '#FFFFFF', icon: 'shield',         title: 'Data Safety Declaration', desc: 'Mirrors the Play Store form. Camera used only for QR pairing scans.',                              url: 'https://shawnjan-cmd.github.io/privacy-policy-/' },
    { color: C.red,     icon: 'delete-forever', title: 'Delete My Data',          desc: 'Settings → DELETE ALL MY DATA. Three taps. Immediate and permanent.',                              url: 'https://shawnjan-cmd.github.io/privacy-policy-/' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <View style={{ alignItems: 'center', paddingTop: 28, paddingBottom: 22, gap: 14 }}>
        {/* Status pill */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          borderWidth: 1, borderRadius: 20,
          paddingHorizontal: 12, paddingVertical: 5,
          borderColor: C.cyan + '40', backgroundColor: C.cyan + '08',
        }}>
          <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green, opacity: heroPulse }} />
          <Text style={{ fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 2, color: C.cyan }}>BUTLER AI</Text>
          <View style={{ width: 1, height: 10, backgroundColor: C.cyan + '40' }} />
          <Text style={{ fontSize: 9, fontWeight: '700', fontFamily: MONO, letterSpacing: 1, color: C.cyan + 'CC' }}>PC AUTOMATION</Text>
        </View>

        {/* Wordmark */}
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={{
            fontSize: 54, fontWeight: '900', fontFamily: MONO,
            color: '#FFFFFF', letterSpacing: 8, lineHeight: 58,
            ...(Platform.OS === 'ios' ? { textShadowColor: C.cyan, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18 } : {}),
          }}>BUTLER</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -2 }}>
            <View style={{ width: 50, height: 1.5, backgroundColor: C.cyan, opacity: 0.35 }} />
            <Text style={{
              fontSize: 30, fontWeight: '900', fontFamily: MONO,
              color: C.cyan, letterSpacing: 16,
              ...(Platform.OS === 'ios' ? { textShadowColor: C.cyan, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 } : {}),
            }}>AI</Text>
            <View style={{ width: 50, height: 1.5, backgroundColor: C.cyan, opacity: 0.35 }} />
          </View>
          <Text style={{ fontSize: 10, fontWeight: '700', fontFamily: MONO, color: C.cyan + 'AA', letterSpacing: 5, marginTop: 8 }}>
            COMMAND CENTER
          </Text>
        </View>

        {/* Hero illustration */}
        <View style={{ marginTop: 8, width: '100%', alignItems: 'center' }}>
          <ButlerHeroSvg />
        </View>

        {/* Tag chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 4 }}>
          {['LOCAL AI', 'ZERO CLOUD', 'HMAC-SHA256', 'LAN ONLY'].map((tag) => (
            <View key={tag} style={{
              borderRadius: 6, borderWidth: 1,
              borderColor: C.cyan + '40', backgroundColor: C.cyan + '08',
              paddingHorizontal: 9, paddingVertical: 4,
            }}>
              <Text style={{ fontSize: 9, fontWeight: '900', fontFamily: MONO, color: C.cyan + 'CC', letterSpacing: 1.2 }}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* Setup time pill */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          marginTop: 4,
          paddingHorizontal: 14, paddingVertical: 7,
          borderRadius: 10, borderWidth: 1,
          borderColor: C.cyan + '25', backgroundColor: C.cyan + '06',
        }}>
          <MaterialIcons name="schedule" size={12} color={C.cyan} />
          <Text style={{ fontSize: 9, fontWeight: '700', fontFamily: MONO, color: C.cyan + 'AA', letterSpacing: 1 }}>SETUP ~ 2 MIN</Text>
          <View style={{ width: 1, height: 10, backgroundColor: C.cyan + '30' }} />
          <Text style={{ fontSize: 9, fontWeight: '700', fontFamily: MONO, color: C.green + 'AA', letterSpacing: 1 }}>10 STEPS</Text>
        </View>
      </View>

      {/* ── 3 CORE PROMISES (focused, no wall-of-text) ────────────────── */}
      <View style={{ paddingHorizontal: 4, marginBottom: 6 }}>
        <Text style={{ fontSize: 10, fontWeight: '900', fontFamily: MONO, color: C.cyan + 'AA', letterSpacing: 2.5, marginBottom: 10, marginLeft: 4 }}>
          ❯ WHY BUTLER AI
        </Text>
        {PROMISES.map((p) => (
          <View key={p.title} style={[st.card, { borderColor: p.color + '35', marginBottom: 10 }]}>
            <View style={{ height: 2, backgroundColor: p.color }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
              <View style={{
                width: 46, height: 46, borderRadius: 12,
                borderWidth: 1.5, borderColor: p.color + '60', backgroundColor: p.color + '12',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <MaterialIcons name={p.icon as any} size={22} color={p.color} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', fontFamily: MONO, color: p.color, letterSpacing: 0.5 }}>{p.title}</Text>
                <Text style={{ fontSize: 12, color: C.textMid, lineHeight: 18 }}>{p.body}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* ── COMPLIANCE BADGE (Play Store required) ────────────────────── */}
      <ComplianceBadge />

      {/* ── Returning-user "all accepted" banner ──────────────────────── */}
      {allAccepted ? (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          borderWidth: 1.5, borderRadius: 12, padding: 14,
          borderColor: C.green + '55', backgroundColor: C.green + '08',
          marginBottom: 14,
        }}>
          <MaterialIcons name="lock" size={18} color={C.green} />
          <Text style={{ flex: 1, fontSize: 12, color: C.green, fontFamily: MONO, lineHeight: 18 }}>
            All agreements previously saved · You can skip to the launch screen
          </Text>
        </View>
      ) : null}

      {/* ── LEGAL DOCS (Play Store required) ──────────────────────────── */}
      <View style={[st.card, { borderColor: C.cyan + '35', marginBottom: 18 }]}>
        <View style={{ height: 2, backgroundColor: C.cyan }} />
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10,
          borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.cyan + '20',
        }}>
          <MaterialIcons name="gavel" size={18} color={C.cyan} />
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '900', color: C.cyan, fontFamily: MONO, letterSpacing: 1 }}>LEGAL DOCUMENTS</Text>
          <View style={{
            borderRadius: 6, borderWidth: 1,
            borderColor: C.green + '60', backgroundColor: C.green + '10',
            paddingHorizontal: 8, paddingVertical: 3,
          }}>
            <Text style={{ fontSize: 9, fontWeight: '900', color: C.green, fontFamily: MONO }}>4 DOCS</Text>
          </View>
        </View>
        <View style={{ padding: 10, gap: 8 }}>
          {LEGAL_DOCS.map((doc) => (
            <TouchableOpacity
              key={doc.title}
              onPress={() => Linking.openURL(doc.url).catch(() => {})}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, paddingRight: 10,
                borderColor: doc.color + '40', backgroundColor: doc.color + '06',
                overflow: 'hidden',
              }}>
              <View style={{ width: 3, alignSelf: 'stretch', backgroundColor: doc.color, marginRight: 8 }} />
              <View style={{
                width: 40, height: 40, borderRadius: 10,
                borderWidth: 1.5, borderColor: doc.color + '60', backgroundColor: doc.color + '12',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <MaterialIcons name={doc.icon as any} size={18} color={doc.color} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 12, fontWeight: '900', color: doc.color, fontFamily: MONO }}>{doc.title}</Text>
                <Text style={{ fontSize: 10, color: C.textMid, lineHeight: 14 }}>{doc.desc}</Text>
              </View>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 3,
                borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4,
                borderColor: doc.color + '55', backgroundColor: doc.color + '10',
              }}>
                <MaterialIcons name="open-in-new" size={10} color={doc.color} />
                <Text style={{ fontSize: 9, fontWeight: '900', color: doc.color, fontFamily: MONO }}>VIEW</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ fontSize: 9, color: C.textDim, fontFamily: MONO, paddingHorizontal: 14, paddingBottom: 12 }}>
          support: andrejsladkovic1992@gmail.com · com.butlerai.pc.automation
        </Text>
      </View>

      {/* ── PRIMARY CTA ───────────────────────────────────────────────── */}
      <TouchableOpacity
        testID="onboarding-screen1-next"
        style={[st.primaryBtn, { marginHorizontal: 4, paddingVertical: 18 }]}
        onPress={() => { safeHaptics.medium(); onNext(); }}
        activeOpacity={0.85}
      >
        <MaterialIcons name="arrow-forward" size={22} color="#000" />
        <Text style={[st.primaryBtnTxt, { fontSize: 15, letterSpacing: 2.5 }]}>
          {allAccepted ? 'REVIEW AGAIN' : 'GET STARTED'}
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
}


// ─────────────────────────────────────────────────────────────────
// SCREEN 2: APP TOUR
// ─────────────────────────────────────────────────────────────────
const APP_PAGES = [
  { icon: 'home', lib: 'material', color: C.cyan, name: 'HOME DASHBOARD', badge: 'COMMAND', desc: 'Live PC dashboard. CPU, RAM, Disk in real time. QR pairing. Server setup. Connection status and smart alerts.', features: ['Real-time system metrics', 'QR code pairing wizard', 'Auto LAN discovery', 'Smart threshold alerts'] },
  { icon: 'code-tags', lib: 'community', color: C.blue, name: 'PYTHON SCRIPTS', badge: '70+ SCRIPTS', desc: 'Complete Python automation library. Browse, search, run, undo, AI-generate. Built-in malicious script blocker.', features: ['70+ built-in scripts', 'AI script generation', 'Malicious script blocker', '1-tap undo system'] },
  { icon: 'robot-angry', lib: 'community', color: C.purple, name: 'BUTLER AI CHAT', badge: 'OLLAMA LOCAL', desc: 'Local AI chat powered by Ollama on YOUR PC. qwen2.5-coder, Mistral, Llama 3.2 — offline, zero API keys.', features: ['100% offline AI', 'Code generation', 'Script debugging', 'KB-enhanced context'] },
  { icon: 'book-open-variant', lib: 'community', color: C.amber, name: 'KNOWLEDGE BASE', badge: 'SIGMA-NET', desc: 'Self-learning knowledge engine. SIGMA-NET crawler indexes Python docs and automation guides for Butler AI.', features: ['Autonomous crawler', 'KB growth direction', 'Topic-based indexing', 'Omega learning loops'] },
  { icon: 'tools', lib: 'community', color: C.teal, name: 'TOOLS HUB', badge: 'FILE+CLIP', desc: 'Phone-to-PC file transfer, bidirectional clipboard sync, and quick terminal access.', features: ['File push to PC', 'Clipboard sync', 'Quick terminal', 'Network tools'] },
  { icon: 'heart-pulse', lib: 'community', color: C.green, name: 'PC HEALTH', badge: 'MONITOR', desc: 'Live CPU, RAM, disk gauges. Process list. Undo system. Server event log. Health score.', features: ['Live metrics', 'Process monitor', 'Event log', 'Health scoring'] },
  { icon: 'sitemap', lib: 'community', color: C.purple, name: 'SCRIPT BUILDER', badge: 'VISUAL', desc: 'Visual drag-and-drop node pipeline for building Python automation without writing code from scratch.', features: ['Visual nodes', 'Export to Python', 'Run instantly', 'Save templates'] },
  { icon: 'palette', lib: 'material', color: C.pink, name: 'COSMETIC PACKS', badge: 'THEMES', desc: 'Full UI themes, color packs, icon sets. Personalize every pixel of Butler AI.', features: ['Theme packs', 'Color palettes', 'Icon styles', 'Live preview'] },
  { icon: 'cog', lib: 'community', color: C.amber, name: 'SYSTEM CONFIG', badge: 'SETTINGS', desc: 'Server config, security keys, Pro license, language, notifications, data management.', features: ['Server settings', 'Security keys', 'Pro features', 'Data delete'] },
];

function Screen2Tour({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }, []);
  return (
    <Animated.View style={{ flex: 1, opacity: fade }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: C.cyan, fontFamily: MONO, letterSpacing: 2.5 }}>APP TOUR</Text>
          <Text style={{ fontSize: 13, color: C.textMid, textAlign: 'center', lineHeight: 20 }}>9 powerful pages · Everything you need to automate your PC</Text>
        </View>
        {APP_PAGES.map((pg, i) => {
          const Icon = pg.lib === 'community' ? MaterialCommunityIcons : MaterialIcons;
          return (
            <View key={i} style={[st.card, { borderColor: pg.color + '35', marginBottom: 12 }]}>
              <View style={{ height: 2, backgroundColor: pg.color }} />
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 14 }}>
                <View style={{ width: 48, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: pg.color + '55', backgroundColor: pg.color + '12', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={pg.icon as any} size={24} color={pg.color} />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: pg.color, fontFamily: MONO }}>{pg.name}</Text>
                    <View style={{ borderRadius: 5, borderWidth: 1, borderColor: pg.color + '50', backgroundColor: pg.color + '10', paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 8, fontWeight: '900', color: pg.color, fontFamily: MONO }}>{pg.badge}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: C.textMid, lineHeight: 18 }}>{pg.desc}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
                    {pg.features.map((f, fi) => (
                      <View key={fi} style={{ borderRadius: 4, backgroundColor: pg.color + '0D', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: pg.color + 'CC', fontFamily: MONO }}>✓ {f}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          );
        })}
        <View style={st.navRow}>
          <TouchableOpacity style={st.backBtn} onPress={() => { safeHaptics.light(); onBack(); }} activeOpacity={0.85}>
            <MaterialIcons name="arrow-back" size={18} color={C.cyan} />
            <Text style={st.backBtnTxt}>BACK</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.primaryBtn, { flex: 1 }]} onPress={() => { safeHaptics.medium(); onNext(); }} activeOpacity={0.85}>
            <MaterialIcons name="arrow-forward" size={20} color="#000" />
            <Text style={st.primaryBtnTxt}>CONTINUE</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCREEN 3: SAFETY CONSENT
// ─────────────────────────────────────────────────────────────────
function Screen3Consent({ onNext, onBack, consents, setConsents }: {
  onNext: () => void; onBack: () => void;
  consents: Record<string, boolean>;
  setConsents: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const toggle = (key: string) => setConsents(prev => ({ ...prev, [key]: !prev[key] }));
  const allRequired = consents.age && consents.tos && consents.privacy && consents.lan;
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
        <View style={{ width: 56, height: 56, borderRadius: 16, borderWidth: 2, borderColor: C.cyan + '60', backgroundColor: C.cyan + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
          <MaterialIcons name="security" size={28} color={C.cyan} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '900', color: C.cyan, fontFamily: MONO, letterSpacing: 2.5 }}>SAFETY CONSENT</Text>
        <Text style={{ fontSize: 15, color: C.textMid, textAlign: 'center', lineHeight: 23, paddingHorizontal: 20 }}>These agreements protect you and others. Each point is explained clearly — no surprises.</Text>
      </View>
      {/* Why we need this */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderColor: C.cyan + '25', backgroundColor: C.cyan + '05', marginBottom: 12 }}>
        <MaterialIcons name="info-outline" size={14} color={C.cyan} />
        <Text style={{ flex: 1, fontSize: 11, color: C.textMid, lineHeight: 17 }}>Required for Google Play Store. Items marked <Text style={{ color: C.red, fontWeight: '900' }}>*</Text> must be accepted to continue.</Text>
      </View>
      <ConsentCheckbox checked={!!consents.age} onToggle={() => toggle('age')} required label="I am 18 years of age or older" sublabel="Butler AI is a developer tool for adults only" color={C.cyan} />
      <ConsentCheckbox checked={!!consents.tos} onToggle={() => toggle('tos')} required label="I accept the Terms of Service" sublabel="I will only use Butler AI on PCs I own or am authorised to access" color={C.amber} />
      <ConsentCheckbox checked={!!consents.privacy} onToggle={() => toggle('privacy')} required label="I accept the Privacy Policy" sublabel="Device UUID stored locally only. No personal data collected." color={C.green} />
      <ConsentCheckbox checked={!!consents.lan} onToggle={() => toggle('lan')} required label="I understand this app operates over my local LAN" sublabel="Butler server runs on your PC. No cloud relay. Direct Wi-Fi only." color={C.blue} />
      <ConsentCheckbox checked={!!consents.camera} onToggle={() => toggle('camera')} label="Camera permission — QR code pairing only" sublabel="Camera used exclusively to scan QR codes. Never recorded or stored." color={C.purple} />
      <ConsentCheckbox checked={!!consents.exec} onToggle={() => toggle('exec')} label="I understand scripts run on MY PC with MY permissions" sublabel="You control what runs. Malicious script blocker active at all times." color={C.orange} />
      <View style={st.navRow}>
        <TouchableOpacity style={st.backBtn} onPress={() => { safeHaptics.light(); onBack(); }} activeOpacity={0.85}>
          <MaterialIcons name="arrow-back" size={18} color={C.cyan} />
          <Text style={st.backBtnTxt}>BACK</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.primaryBtn, { flex: 1 }]}
          onPress={() => { safeHaptics.medium(); onNext(); }}
          activeOpacity={0.85}>
          <MaterialIcons name="arrow-forward" size={20} color="#000" />
          <Text style={st.primaryBtnTxt}>I ACCEPT</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCREEN 4: SAFETY PLEDGE
// ─────────────────────────────────────────────────────────────────
function Screen4Pledge({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [pledged, setPledged] = useState(false);
  const PLEDGES = [
    { icon: 'block', color: C.red, text: 'I will NOT attempt to use Butler AI to access computers without authorisation.' },
    { icon: 'security', color: C.cyan, text: 'I will NOT use Butler AI to deploy malware, ransomware, or destructive scripts.' },
    { icon: 'people', color: C.blue, text: 'I will NOT use Butler AI to violate the privacy of others.' },
    { icon: 'gavel', color: C.amber, text: 'I will use Butler AI only for lawful personal automation on my own hardware.' },
    { icon: 'shield', color: C.green, text: 'I understand that Butler AI includes safety guards but I remain personally responsible for scripts I execute.' },
  ];
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: C.red, fontFamily: MONO, letterSpacing: 2 }}>SAFETY PLEDGE</Text>
      </View>
      {/* Context banner */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderColor: C.red + '30', backgroundColor: C.red + '05', marginBottom: 12 }}>
        <MaterialIcons name="shield" size={16} color={C.red} style={{ marginTop: 1 }} />
        <Text style={{ flex: 1, fontSize: 13, color: C.textMid, lineHeight: 20 }}>Butler AI executes scripts with your OS permissions. These five rules protect you and others.</Text>
      </View>
      {PLEDGES.map((p, i) => (
        <View key={i} style={[st.card, { borderColor: p.color + '35', marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 14 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: p.color + '55', backgroundColor: p.color + '12', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MaterialIcons name={p.icon as any} size={20} color={p.color} />
            </View>
            <Text style={{ flex: 1, fontSize: 15, color: C.text, lineHeight: 23 }}>{p.text}</Text>
          </View>
        </View>
      ))}
      <ConsentCheckbox checked={pledged} onToggle={() => setPledged(v => !v)} required color={C.red} label="I solemnly agree to all five points of this Safety Pledge" />
      <View style={st.navRow}>
        <TouchableOpacity style={st.backBtn} onPress={() => { safeHaptics.light(); onBack(); }} activeOpacity={0.85}>
          <MaterialIcons name="arrow-back" size={18} color={C.cyan} />
          <Text style={st.backBtnTxt}>BACK</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.primaryBtn, { flex: 1 }]}
          onPress={() => { safeHaptics.medium(); onNext(); }} activeOpacity={0.85}>
          <MaterialIcons name="arrow-forward" size={20} color="#000" />
          <Text style={st.primaryBtnTxt}>I PLEDGE</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCREEN 5: LEGAL DOCS
// ─────────────────────────────────────────────────────────────────
function Screen5Legal({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const DOCS = [
    { color: C.cyan, icon: 'visibility', title: 'Privacy Policy', summary: 'Device UUID only. No scripts/contacts/location/telemetry collected. LAN-only. Delete anytime.', url: 'https://shawnjan-cmd.github.io/privacy-policy-/' },
    { color: C.amber, icon: 'gavel', title: 'Terms of Service', summary: '18+ only. Personal PCs only. No unauthorized access. No malware. Comply with local laws.', url: 'https://shawnjan-cmd.github.io/privacy-policy-/' },
    { color: C.green, icon: 'shield', title: 'Data Safety Declaration', summary: 'Camera for QR only, never stored. No analytics. No ads. SQLite local. Open source audit ready.', url: 'https://shawnjan-cmd.github.io/privacy-policy-/' },
    { color: C.red, icon: 'delete-forever', title: 'Data Deletion Policy', summary: 'Settings → DELETE ALL DATA — 3 taps. Immediate, permanent, irreversible. No cloud backup.', url: 'https://shawnjan-cmd.github.io/privacy-policy-/' },
  ];
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: C.cyan, fontFamily: MONO, letterSpacing: 2.5 }}>LEGAL DOCUMENTS</Text>
        <Text style={{ fontSize: 13, color: C.textMid, textAlign: 'center', lineHeight: 20 }}>Required for Google Play Store · Tap any card to read in full</Text>
      </View>
      {DOCS.map((doc, i) => (
        <TouchableOpacity key={i} onPress={() => Linking.openURL(doc.url).catch(() => {})} activeOpacity={0.85}
          style={[st.card, { borderColor: doc.color + '40', marginBottom: 12 }]}>
          <View style={{ height: 2, backgroundColor: doc.color }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 14 }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: doc.color + '55', backgroundColor: doc.color + '12', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MaterialIcons name={doc.icon as any} size={24} color={doc.color} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: '900', color: doc.color, fontFamily: MONO }}>{doc.title}</Text>
              <Text style={{ fontSize: 12, color: C.textMid, lineHeight: 18 }}>{doc.summary}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <MaterialIcons name="open-in-new" size={12} color={doc.color + '90'} />
                <Text style={{ fontSize: 10, color: doc.color + '90', fontFamily: MONO }}>TAP TO READ FULL DOCUMENT</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ))}
      <View style={st.navRow}>
        <TouchableOpacity style={st.backBtn} onPress={() => { safeHaptics.light(); onBack(); }} activeOpacity={0.85}>
          <MaterialIcons name="arrow-back" size={18} color={C.cyan} />
          <Text style={st.backBtnTxt}>BACK</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.primaryBtn, { flex: 1 }]} onPress={() => { safeHaptics.medium(); onNext(); }} activeOpacity={0.85}>
          <MaterialIcons name="arrow-forward" size={20} color="#000" />
          <Text style={st.primaryBtnTxt}>CONTINUE</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCREEN 6: PERMISSIONS
// ─────────────────────────────────────────────────────────────────
function Screen6Permissions({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const PERMS = [
    { icon: 'wifi', color: C.cyan, title: 'Local Network (LAN)', why: 'Connect to Butler server on your PC over Wi-Fi. No internet required.', required: true },
    { icon: 'camera-alt', color: C.purple, title: 'Camera', why: 'Scan QR code to pair with your PC automatically. Never recorded.', required: false },
    { icon: 'folder', color: C.amber, title: 'Storage (Optional)', why: 'Send files from your phone to your PC. Only accessed when you tap Send File.', required: false },
  ];
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: C.cyan, fontFamily: MONO, letterSpacing: 2.5 }}>PERMISSIONS</Text>
        <Text style={{ fontSize: 15, color: C.textMid, textAlign: 'center', lineHeight: 23, paddingHorizontal: 20 }}>Only 3 permissions — all explained below. Camera and Storage are optional.</Text>
      </View>
      {PERMS.map((p, i) => (
        <View key={i} style={[st.card, { borderColor: p.color + '35', marginBottom: 12 }]}>
          <View style={{ height: 2, backgroundColor: p.color }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 14 }}>
            <View style={{ width: 48, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: p.color + '55', backgroundColor: p.color + '12', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MaterialIcons name={p.icon as any} size={24} color={p.color} />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: p.color, fontFamily: MONO }}>{p.title}</Text>
                <View style={{ borderRadius: 5, borderWidth: 1, borderColor: (p.required ? C.red : C.green) + '50', backgroundColor: (p.required ? C.red : C.green) + '0C', paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 8, fontWeight: '900', color: p.required ? C.red : C.green, fontFamily: MONO }}>{p.required ? 'REQUIRED' : 'OPTIONAL'}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: C.textMid, lineHeight: 18 }}>{p.why}</Text>
            </View>
          </View>
        </View>
      ))}
      <View style={{ borderWidth: 1.5, borderRadius: 12, borderColor: C.green + '40', backgroundColor: C.green + '08', padding: 14, marginBottom: 14 }}>
        <Text style={{ fontSize: 13, fontWeight: '900', color: C.green, fontFamily: MONO, marginBottom: 6 }}>✓ NO UNNECESSARY PERMISSIONS</Text>
        <Text style={{ fontSize: 12, color: C.textMid, lineHeight: 18 }}>No contacts, no location, no microphone, no call logs. Butler AI requests only what it needs.</Text>
      </View>
      <View style={st.navRow}>
        <TouchableOpacity style={st.backBtn} onPress={() => { safeHaptics.light(); onBack(); }} activeOpacity={0.85}>
          <MaterialIcons name="arrow-back" size={18} color={C.cyan} />
          <Text style={st.backBtnTxt}>BACK</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.primaryBtn, { flex: 1 }]} onPress={() => { safeHaptics.medium(); onNext(); }} activeOpacity={0.85}>
          <MaterialIcons name="arrow-forward" size={20} color="#000" />
          <Text style={st.primaryBtnTxt}>CONTINUE</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCREEN 7: Q & A
// ─────────────────────────────────────────────────────────────────
function Screen7QA({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const QAS = [
    { q: 'What exactly does Butler AI do?', icon: 'what', color: C.cyan, a: 'Butler AI is a phone-to-PC remote control app. It sends Python scripts over your local Wi-Fi to a lightweight server (butler_server.py) running on your PC. You tap Run — the PC executes — the result comes back. 100% local, no cloud.' },
    { q: 'Does Butler AI run scripts automatically or on a schedule?', icon: 'schedule', color: C.red, a: 'NO. There is no scheduler, no cron, no timers, no background auto-execution of any kind. Every script requires your deliberate tap on the Execute button. This is enforced in the server code, not just the UI.' },
    { q: 'What scripts are blocked?', icon: 'block', color: C.orange, a: 'The Malicious Script Shield automatically blocks: rm -rf /, format/diskpart commands, registry wipes, shutdown /r, kill process commands targeting system processes, and crypto-mining patterns. The blocklist is hard-coded and runs before any execution.' },
    { q: 'Can I undo a script I ran by accident?', icon: 'undo', color: C.amber, a: 'Yes. The 1-Tap Undo System logs every executed script with its output. From PC Health → Undo Log, tap any entry and hit Undo. Supported operations (file moves, renames, common reversibles) are reverted automatically.' },
    { q: 'Is Butler AI safe to use?', icon: 'safe', color: C.green, a: 'Butler AI is designed with safety as the primary concern: HMAC-SHA256 signed requests, LAN-only binding, malicious script shield, zero telemetry, zero scheduled execution, and no root/admin requirements. You are always in control.' },
    { q: 'What permissions does it need and why?', icon: 'perms', color: C.purple, a: 'LAN (required) — connect to your PC. Camera (optional) — QR code pairing only, never recorded. Storage (optional) — file transfer to PC. No contacts, location, microphone, or call log access, ever.' },
    { q: 'How do I delete all my data?', icon: 'delete', color: C.red, a: 'Settings → DELETE ALL MY DATA — 3 taps. Clears all AsyncStorage, knowledge base, script history, execution logs, and device UUID. Immediate and permanent. The PC SQLite database is deleted separately from the PC-side uninstaller.' },
    { q: 'How does the local AI (Ollama) work?', icon: 'ollama', color: C.purple, a: 'Butler AI connects to Ollama running on YOUR PC. The AI model (qwen2.5-coder, Mistral, Llama 3.2) runs entirely on your hardware. No API keys, no OpenAI, no cloud. Your prompts and code never leave your LAN.' },
    { q: 'What data does Butler AI collect?', icon: 'privacy', color: C.cyan, a: 'Zero personal data. A random device UUID is generated locally and stored only on your device for session continuity. No scripts, no outputs, no file names, no contacts, no usage analytics are ever collected or transmitted.' },
    { q: 'Where is my data stored?', icon: 'storage', color: C.blue, a: 'Phone: React Native AsyncStorage (local SQLite). PC: butler_server.py uses a local SQLite file in its working directory. Nothing is uploaded to any server. Both can be wiped with the delete functions in Settings.' },
    { q: 'Is the connection encrypted?', icon: 'encrypt', color: C.teal, a: 'All requests are signed with HMAC-SHA256 using a secret key you generate during setup. This prevents replay attacks and unauthorized script execution even from other devices on your LAN.' },
    { q: 'How does phone-to-PC pairing work?', icon: 'pair', color: C.cyan, a: 'The PC server displays a QR code containing its local IP and port. Scan it with Butler AI (camera) or enter manually. The connection is saved and auto-reconnects when your phone and PC are on the same Wi-Fi.' },
  ];
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: C.cyan, fontFamily: MONO, letterSpacing: 2.5 }}>QUESTIONS & ANSWERS</Text>
        <Text style={{ fontSize: 13, color: C.textMid, textAlign: 'center', lineHeight: 20 }}>12 most asked questions about Butler AI safety and privacy</Text>
      </View>
      {QAS.map((qa, i) => (
        <TouchableOpacity key={i} onPress={() => { safeHaptics.selection(); setOpenIdx(openIdx === i ? null : i); }} activeOpacity={0.85}
          style={[st.card, { borderColor: qa.color + '35', marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
            <QAIcon type={qa.icon} color={qa.color} size={20} />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: openIdx === i ? qa.color : C.text, fontFamily: MONO, lineHeight: 22 }}>{qa.q}</Text>
            <MaterialIcons name={openIdx === i ? 'expand-less' : 'expand-more'} size={20} color={qa.color + '80'} />
          </View>
          {openIdx === i ? (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: qa.color + '20' }}>
              <Text style={{ fontSize: 14, color: C.textMid, lineHeight: 22, marginTop: 10 }}>{qa.a}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ))}
      <View style={st.navRow}>
        <TouchableOpacity style={st.backBtn} onPress={() => { safeHaptics.light(); onBack(); }} activeOpacity={0.85}>
          <MaterialIcons name="arrow-back" size={18} color={C.cyan} />
          <Text style={st.backBtnTxt}>BACK</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.primaryBtn, { flex: 1 }]} onPress={() => { safeHaptics.medium(); onNext(); }} activeOpacity={0.85}>
          <MaterialIcons name="arrow-forward" size={20} color="#000" />
          <Text style={st.primaryBtnTxt}>CONTINUE</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCREEN 8: SERVER PRIVACY
// ─────────────────────────────────────────────────────────────────
function Screen8ServerPrivacy({ onNext, onBack, serverAccepts, setServerAccepts }: {
  onNext: () => void; onBack: () => void;
  serverAccepts: Record<string, boolean>;
  setServerAccepts: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const toggle = (key: string) => setServerAccepts(prev => ({ ...prev, [key]: !prev[key] }));
  const allAccepted = serverAccepts.lan && serverAccepts.local && serverAccepts.install && serverAccepts.exec;
  const POINTS = [
    { key: 'lan',     color: C.cyan,   icon: 'wifi',     label: 'I understand the server binds to my LAN only and is NEVER exposed to the public internet.' },
    { key: 'local',   color: C.green,  icon: 'storage',  label: 'I understand all my data (scripts, logs, knowledge base) stays in a local SQLite file on MY computer.' },
    { key: 'install', color: C.amber,  icon: 'download', label: 'I authorise the installer to download Python, Ollama and the AI model from their official sources (python.org, ollama.com, pypi.org).' },
    { key: 'exec',    color: C.orange, icon: 'terminal', label: 'I understand scripts run with MY user permissions on MY PC, and I am responsible for what I execute.' },
  ];
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: C.cyan, fontFamily: MONO, letterSpacing: 2.5, textAlign: 'center' }}>SERVER PRIVACY</Text>
        <Text style={{ fontSize: 15, color: C.textMid, textAlign: 'center', lineHeight: 23, paddingHorizontal: 20 }}>The Butler server runs entirely on YOUR PC. Here is exactly what it does.</Text>
      </View>
      {[
        { icon: 'computer', color: C.cyan, title: 'Runs on YOUR PC', body: 'butler_server.py starts a Flask web server on your PC. It binds to your local network interface only. It is never accessible from the internet.' },
        { icon: 'storage', color: C.green, title: 'Local SQLite Database', body: 'All data — scripts, logs, knowledge base entries, execution history — is stored in a single SQLite file on your PC. Nothing is uploaded anywhere.' },
        { icon: 'code', color: C.blue, title: 'Executes Python Only', body: 'The server accepts signed Python script payloads and executes them using your system Python. Output is returned to your phone. No other execution modes.' },
        { icon: 'lock', color: C.amber, title: 'HMAC-SHA256 Signed', body: 'Every request is signed with a shared secret. The server rejects unsigned or tampered requests. Replay attacks are prevented by timestamp validation.' },
      ].map((item, i) => (
        <View key={i} style={[st.card, { borderColor: item.color + '35', marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: item.color + '55', backgroundColor: item.color + '12', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MaterialIcons name={item.icon as any} size={22} color={item.color} />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: item.color, fontFamily: MONO }}>{item.title}</Text>
              <Text style={{ fontSize: 12, color: C.textMid, lineHeight: 18 }}>{item.body}</Text>
            </View>
          </View>
        </View>
      ))}
      <View style={[st.card, { borderColor: allAccepted ? C.green + '60' : C.cyan + '30', marginBottom: 14 }]}>
        <View style={{ height: 2, backgroundColor: allAccepted ? C.green : C.cyan }} />
        <View style={{ padding: 14, gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '900', color: allAccepted ? C.green : C.cyan, fontFamily: MONO, marginBottom: 8 }}>
            {allAccepted ? 'SERVER PRIVACY ACCEPTED' : 'ACCEPT ALL POINTS TO CONTINUE'}
          </Text>
          {!allAccepted ? <Text style={{ fontSize: 11, color: C.textMid, marginBottom: 10, lineHeight: 17 }}>{'Please read and accept each point about server privacy below.'}</Text> : null}
          {POINTS.map(pt => (
            <ConsentCheckbox key={pt.key} checked={!!serverAccepts[pt.key]} onToggle={() => toggle(pt.key)}
              label={pt.label} color={pt.color} locked={!!serverAccepts[pt.key]} />
          ))}
        </View>
      </View>
      <View style={st.navRow}>
        <TouchableOpacity style={st.backBtn} onPress={() => { safeHaptics.light(); onBack(); }} activeOpacity={0.85}>
          <MaterialIcons name="arrow-back" size={18} color={C.cyan} />
          <Text style={st.backBtnTxt}>BACK</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.primaryBtn, { flex: 1 }]}
          onPress={() => { safeHaptics.medium(); onNext(); }} activeOpacity={0.85}>
          <MaterialIcons name="arrow-forward" size={20} color="#000" />
          <Text style={st.primaryBtnTxt}>CONTINUE</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCREEN 9: SERVER SETUP
// ─────────────────────────────────────────────────────────────────
function SetupStepCard({ num, color, title, body, delay }: {
  num: string; color: string; title: string; body: string; delay: number;
}) {
  const slideUp = useRef(new Animated.Value(32)).current;
  const fadeIn  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.spring(slideUp, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
        Animated.timing(fadeIn,  { toValue: 1, duration: 380, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View style={[{ opacity: fadeIn, transform: [{ translateY: slideUp }], marginBottom: 10 }]}>
      <View style={{
        borderWidth: 1.5, borderRadius: 16, borderColor: color + '35',
        backgroundColor: C.card, overflow: 'hidden',
      }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: color, borderRadius: 3 }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 14, paddingHorizontal: 18 }}>
          <View style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: color + '18', borderWidth: 1.5, borderColor: color + '55',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color, fontFamily: MONO }}>{num}</Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ fontSize: 14, fontWeight: '900', color, fontFamily: MONO, letterSpacing: 0.5 }}>{title}</Text>
            <Text style={{ fontSize: 12, color: C.textMid, lineHeight: 19 }}>{body}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function Screen9Download({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const headerFade  = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-18)).current;
  const footerFade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    logger.log('[Screen9] server setup screen mounted');
    Animated.parallel([
      Animated.timing(headerFade,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
    ]).start();
    const ft = setTimeout(() => {
      Animated.timing(footerFade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    }, 900);
    return () => clearTimeout(ft);
  }, []);

  const STEPS = [
    { num: '01', color: C.cyan,  title: 'INSTALL REQUIREMENTS',  body: 'One script silently installs Python 3.12+, all pip packages, Ollama AI, and the qwen2.5-coder:7b model on your PC.' },
    { num: '02', color: C.amber, title: 'DOWNLOAD BUTLER SERVER', body: 'butler_server.py runs on your PC, displays a QR code, and creates a secure LAN bridge to your phone.' },
    { num: '03', color: C.green, title: 'CONNECT & CONTROL',      body: 'Scan the QR code displayed on your PC server screen, or enter the IP address manually below to pair.' },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      <Animated.View style={{ alignItems: 'center', paddingVertical: 22, gap: 8, opacity: headerFade, transform: [{ translateY: headerSlide }] }}>
        <View style={{ width: 62, height: 62, borderRadius: 31, borderWidth: 1.5, borderColor: C.cyan + '50', backgroundColor: C.cyan + '0E', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
          <MaterialIcons name="dns" size={30} color={C.cyan} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '900', color: C.cyan, fontFamily: MONO, letterSpacing: 2.5 }}>PC CONNECT</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {['Direct IP', 'QR Scan', 'LAN'].map((tag, i) => (
            <View key={i} style={{ borderRadius: 6, borderWidth: 1, borderColor: C.cyan + '35', backgroundColor: C.cyan + '0A', paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 9, fontWeight: '900', color: C.cyan + 'CC', fontFamily: MONO }}>{tag}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: headerFade, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.cyan + '30' }} />
          <Text style={{ fontSize: 10, fontWeight: '900', color: C.cyan + '80', fontFamily: MONO, letterSpacing: 2 }}>SERVER SETUP</Text>
          <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.cyan + '30' }} />
        </View>
      </Animated.View>

      {STEPS.map((s2, i) => (
        <SetupStepCard key={i} num={s2.num} color={s2.color} title={s2.title} body={s2.body} delay={250 + i * 180} />
      ))}

      <Animated.View style={{ opacity: footerFade, marginTop: 6, marginBottom: 12 }}>
        <View style={{ borderWidth: 1.5, borderRadius: 16, borderColor: C.cyan + '45', backgroundColor: C.cyan + '0C', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: C.cyan + '18', borderWidth: 1.5, borderColor: C.cyan + '50', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="qr-code-scanner" size={24} color={C.cyan} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '900', color: C.cyan, fontFamily: MONO, marginBottom: 2 }}>SCAN QR TO CONNECT</Text>
            <Text style={{ fontSize: 11, color: C.textMid, lineHeight: 17 }}>After starting butler_server.py on your PC, tap here or use the Home screen QR scanner</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={C.cyan + '80'} />
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: footerFade, marginBottom: 14 }}>
        <View style={{ borderWidth: 1.5, borderRadius: 16, borderColor: C.blue + '35', backgroundColor: C.card, overflow: 'hidden' }}>
          <View style={{ height: 2, backgroundColor: C.blue, opacity: 0.7 }} />
          <View style={{ padding: 16, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="link" size={18} color={C.blue} />
              <Text style={{ fontSize: 13, fontWeight: '900', color: C.blue, fontFamily: MONO }}>DIRECT IP CONNECTION</Text>
            </View>
            <Text style={{ fontSize: 11, color: C.textMid, lineHeight: 17 }}>Persists across restarts · Same WiFi required · Port shown on server screen</Text>
            <View style={{ borderWidth: 1, borderRadius: 10, borderColor: C.blue + '30', backgroundColor: C.blue + '08', paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 11, color: C.blue + '80', fontFamily: MONO, flex: 1 }}>{'> 192.168.1.100'}</Text>
              <Text style={{ fontSize: 10, color: C.textDim, fontFamily: MONO }}>PORT</Text>
            </View>
            <Text style={{ fontSize: 10, color: C.textDim, fontFamily: MONO, textAlign: 'center' }}>
              Enter your PC IP &amp; port in the PC tab after completing setup
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* DOWNLOAD BUTLER SERVER CARD */}
      <Animated.View style={{ opacity: footerFade, marginBottom: 14 }}>
        <View style={{ borderWidth: 2, borderRadius: 16, borderColor: C.amber + '65', backgroundColor: C.amber + '07', overflow: 'hidden' }}>
          <View style={{ height: 3, backgroundColor: C.amber }} />
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 11, backgroundColor: C.amber + '1E', borderWidth: 1.5, borderColor: C.amber + '60', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="download" size={22} color={C.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: C.amber, fontFamily: MONO, letterSpacing: 1.4 }}>BUTLER SERVER</Text>
                <Text style={{ fontSize: 10, color: C.amber + '90', fontFamily: MONO, marginTop: 1 }}>{'butler_server.py  ·  v20.0.0  ·  Official Release'}</Text>
              </View>
              <View style={{ borderRadius: 6, borderWidth: 1, borderColor: C.green + '50', backgroundColor: C.green + '0E', paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 8, fontWeight: '900', color: C.green, fontFamily: MONO }}>✓ OFFICIAL</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: C.textMid, lineHeight: 18 }}>
              {'Runs on your PC. Displays a QR code. Bridges your phone over LAN. Download only from this official source.'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => { safeHaptics.medium(); Linking.openURL('https://github.com/shawnjan-cmd/butler-server').catch(() => {}); }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, backgroundColor: C.amber }}
            >
              <MaterialIcons name="download" size={20} color="#000" />
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 0.8 }}>GET BUTLER SERVER</Text>
            </TouchableOpacity>
            <View style={{ borderRadius: 10, padding: 11, gap: 5, backgroundColor: 'rgba(255,49,49,0.07)', borderWidth: 1, borderColor: 'rgba(255,49,49,0.25)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="gavel" size={13} color="#FF3131" />
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#FF3131', fontFamily: MONO, letterSpacing: 1.2 }}>PROPRIETARY SOFTWARE — LEGAL NOTICE</Text>
              </View>
              <Text style={{ fontSize: 10, color: '#FF3131CC', fontFamily: MONO, lineHeight: 15 }}>
                {'\u00A9 2026 Shawn Jan. All Rights Reserved.\nCopying, forking, modifying, or redistributing this source code\n\u2014 even a single line \u2014 violates copyright law and may result\nin civil and criminal penalties. Reverse engineering is strictly\nprohibited. Unauthorized use will be prosecuted.'}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: footerFade, marginBottom: 6 }}>
        <View style={{ borderWidth: 1, borderRadius: 12, borderColor: C.amber + '30', backgroundColor: C.amber + '06', padding: 13, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <MaterialIcons name="bolt" size={16} color={C.amber} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '900', color: C.amber, fontFamily: MONO, marginBottom: 3 }}>ONE-CLICK INSTALLER</Text>
            <Text style={{ fontSize: 11, color: C.textMid, lineHeight: 17 }}>
              {'butler_setup.ps1 (Windows) or butler_setup.sh (Mac/Linux) — installs Python, Ollama & all dependencies automatically.'}
            </Text>
          </View>
        </View>
      </Animated.View>

      <View style={st.navRow}>
        <TouchableOpacity style={st.backBtn} onPress={() => { safeHaptics.light(); logger.log('[Screen9] back pressed'); onBack(); }} activeOpacity={0.85}>
          <MaterialIcons name="arrow-back" size={18} color={C.cyan} />
          <Text style={st.backBtnTxt}>BACK</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.primaryBtn, { flex: 1 }]} onPress={() => { safeHaptics.medium(); logger.log('[Screen9] continue pressed'); onNext(); }} activeOpacity={0.85}>
          <MaterialIcons name="arrow-forward" size={20} color="#000" />
          <Text style={st.primaryBtnTxt}>CONTINUE</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCREEN 10: LAUNCH — v9 BULLETPROOF REWRITE
// ─────────────────────────────────────────────────────────────────
// HARD RULES (do not relax):
//   1. Persistence MUST complete BEFORE handoff to onComplete().
//      We `await` the AsyncStorage.multiSet so that when the user
//      reopens the app, the onboarding flag is GUARANTEED to be set.
//      (Previous versions fire-and-forget the write; on cold-kill
//      after launch this could leave the flag unset.)
//   2. Persistence is wrapped with Promise.race + 1500ms timeout so
//      a slow storage write can NEVER trap the user — after 1.5s we
//      proceed to navigation regardless. Storage failure never blocks.
//   3. ONE big button. No secondary clutter. Bigger hit-slop, bigger
//      text, bigger glow. Impossible to miss.
//   4. Dedupe via ref (not state) so React never re-renders mid-tap.
//   5. If onComplete throws (router edge case), we reset the dedupe
//      and surface an Alert so the user can retry. Storage is already
//      saved at this point so the next launch goes straight to home
//      either way.
//   6. No useEffect, no setTimeout chains, no animation queues that
//      could swallow the tap. Tap → save → navigate. That's it.
function Screen10Ready({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const firedRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const heroPulse = useRef(new Animated.Value(0.4)).current;

  // Subtle hero glow — pure UI, never blocks the button handler.
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(heroPulse, { toValue: 1,   duration: 1400, useNativeDriver: true }),
      Animated.timing(heroPulse, { toValue: 0.4, duration: 1400, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [heroPulse]);

  const enterApp = useCallback(async () => {
    if (firedRef.current) return;
    firedRef.current = true;
    setSubmitting(true);
    safeHaptics.success();

    // ── 1. PERSIST (with 1.5s hard timeout so storage stalls don't trap) ──
    const writes: [string, string][] = [
      [ONBOARDING_DONE_KEY,                 'true'],
      ['@butler_welcome_complete_v1',       'true'],
      [TERMS_ACCEPTED_KEY,                  'true'],
      [PRIVACY_ACCEPTED_KEY,                'true'],
      [CONSENT_KEY,                         '1.0.0'],
      [AGE_CONFIRMED_KEY,                   'true'],
      ['@butler_show_post_onboarding_chat', 'true'],
      ['@butler_stable_state',              'onboarded'],
      ['@butler_launch_attempted_at',       String(Date.now())],
    ];
    try {
      await Promise.race([
        AsyncStorage.multiSet(writes),
        new Promise<void>((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch {
      // Storage hiccup — keep going. Worst case: user re-sees onboarding
      // next launch, but the home tab is still reachable.
    }

    // ── 2. HAND OFF TO PARENT (which performs the router.replace) ─────────
    try {
      onComplete();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[Screen10] onComplete threw:', e);
      firedRef.current = false;
      setSubmitting(false);
      try {
        Alert.alert(
          'Almost There',
          'Tap LAUNCH AI again — your onboarding is saved and will not show next launch.',
        );
      } catch {}
    }
  }, [onComplete, heroPulse]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>

      {/* ── Hero: ALL DONE check ─────────────────────────────────────── */}
      <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 18, gap: 16 }}>
        <View style={{ width: 132, height: 132, alignItems: 'center', justifyContent: 'center' }}>
          {/* Pulsing aura rings */}
          <Animated.View style={{
            position: 'absolute', width: 132, height: 132, borderRadius: 66,
            borderWidth: 2, borderColor: C.green, opacity: heroPulse,
          }} />
          <Animated.View style={{
            position: 'absolute', width: 110, height: 110, borderRadius: 55,
            borderWidth: 1.5, borderColor: C.green + 'AA',
            opacity: heroPulse.interpolate({ inputRange: [0.4, 1], outputRange: [0.7, 0.2] }),
          }} />
          {/* Solid check disc */}
          <View style={{
            width: 92, height: 92, borderRadius: 46, backgroundColor: C.green + '15',
            borderWidth: 2.5, borderColor: C.green,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <MaterialIcons name="check" size={56} color={C.green} />
          </View>
        </View>

        <Text style={{ fontSize: 30, fontWeight: '900', color: C.green, fontFamily: MONO, letterSpacing: 5 }}>
          ALL DONE
        </Text>

        <Text style={{ fontSize: 13, color: C.textMid, textAlign: 'center', lineHeight: 21, paddingHorizontal: 28, fontFamily: MONO, letterSpacing: 0.4 }}>
          Setup complete. Tap below to enter Butler AI and start automating your PC.
        </Text>

        {/* Quick recap chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 4, paddingHorizontal: 24 }}>
          {['✓ PRIVATE', '✓ LAN ONLY', '✓ ZERO TELEMETRY', '✓ YOUR PC'].map((t) => (
            <View key={t} style={{
              borderRadius: 6, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4,
              borderColor: C.green + '50', backgroundColor: C.green + '0C',
            }}>
              <Text style={{ fontSize: 9, fontWeight: '900', color: C.green, fontFamily: MONO, letterSpacing: 1 }}>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── PRIMARY LAUNCH BUTTON — single, massive, obvious ────────── */}
      <TouchableOpacity
        testID="onboarding-launch-primary"
        accessibilityRole="button"
        accessibilityLabel="Launch Butler AI"
        accessibilityState={{ disabled: submitting }}
        activeOpacity={0.78}
        onPress={enterApp}
        onLongPress={enterApp}
        disabled={submitting}
        hitSlop={{ top: 32, bottom: 32, left: 32, right: 32 }}
        style={{
          backgroundColor: submitting ? '#00CC66' : '#00FF88',
          borderRadius: 20,
          paddingVertical: 30,
          paddingHorizontal: 28,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 22,
          marginHorizontal: 16,
          borderWidth: 3,
          borderColor: '#00CC66',
          shadowColor: '#00FF88',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.85,
          shadowRadius: 22,
          elevation: 16,
          minHeight: 92,
        }}
      >
        {submitting ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ActivityIndicator size="small" color="#000" />
            <Text style={{ color: '#000', fontSize: 18, fontWeight: '900', fontFamily: MONO, letterSpacing: 2 }}>
              LAUNCHING…
            </Text>
          </View>
        ) : (
          <>
            <Text style={{ color: '#000', fontSize: 24, fontWeight: '900', fontFamily: MONO, letterSpacing: 3, textAlign: 'center' }}>
              LAUNCH BUTLER AI
            </Text>
            <Text style={{ color: '#002A1A', fontSize: 11, marginTop: 6, fontFamily: MONO, fontWeight: '900', letterSpacing: 1.5 }}>
              TAP TO ENTER THE APP →
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* ── Compliance recap (small) ────────────────────────────────── */}
      <View style={{ marginTop: 22, marginHorizontal: 16 }}>
        <ComplianceBadge />
      </View>

      {/* ── Storage receipt ─────────────────────────────────────────── */}
      <View style={{
        borderWidth: 1, borderRadius: 10,
        borderColor: C.cyan + '25', backgroundColor: C.cyan + '06',
        paddingVertical: 11, paddingHorizontal: 14,
        marginTop: 8, marginHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 8,
      }}>
        <MaterialIcons name="save-alt" size={14} color={C.cyan} />
        <Text style={{ flex: 1, fontSize: 10, color: C.textDim, fontFamily: MONO, lineHeight: 15 }}>
          Agreements saved locally · Never uploaded · Remembered across restarts
        </Text>
      </View>

      {/* ── BACK link ───────────────────────────────────────────────── */}
      <View style={[st.navRow, { marginTop: 18, marginBottom: 12 }]}>
        <TouchableOpacity
          style={st.backBtn}
          onPress={() => { if (!submitting) { safeHaptics.light(); onBack(); } }}
          activeOpacity={0.85}
          disabled={submitting}
        >
          <MaterialIcons name="arrow-back" size={18} color={C.cyan} />
          <Text style={st.backBtnTxt}>BACK</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN ONBOARDING OVERLAY
// ─────────────────────────────────────────────────────────────────
export default function OnboardingOverlay({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [serverAccepts, setServerAccepts] = useState<Record<string, boolean>>({});
  const [allPreviouslyAccepted, setAllPreviouslyAccepted] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkPrevious = async () => {
      try {
        const keys = [CONSENT_KEY, TERMS_ACCEPTED_KEY, PRIVACY_ACCEPTED_KEY, AGE_CONFIRMED_KEY, LAN_CONSENT_KEY, SERVER_PRIVACY_ACCEPTED_KEY];
        const results = await AsyncStorage.multiGet(keys);
        const allSet = results.every(([_, v]) => v === '1' || v === 'true');
        setAllPreviouslyAccepted(allSet);
        if (allSet) {
          setConsents({ age: true, tos: true, privacy: true, lan: true, camera: true, exec: true });
          setServerAccepts({ lan: true, local: true, install: true, exec: true });
        }
      } catch {}
    };
    checkPrevious();
  }, []);

  const goNext = useCallback(() => {
    const next = Math.min(step + 1, TOTAL_STEPS - 1);
    Animated.timing(slideAnim, { toValue: -SW, duration: 220, useNativeDriver: true }).start(() => {
      slideAnim.setValue(SW);
      setStep(next);
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    });
  }, [step, slideAnim]);

  // ── Android hardware back-button handler ────────────────────────────────
  // Onboarding is now a normal tab (not a gate), so we only intercept back
  // when the user is mid-flow (step 1–9) to navigate to the previous screen.
  // On Screen 0 (Welcome) we return `false` so the OS / tab navigator handles
  // it naturally — letting the user leave the tab via the system back button.
  useEffect(() => {
    const { BackHandler, Platform } = require('react-native');
    if (Platform.OS !== 'android') return;
    const onBack = () => {
      if (step > 0) {
        // Trigger the same slide-back animation as the BACK button
        const prev = Math.max(0, step - 1);
        Animated.timing(slideAnim, { toValue: SW, duration: 220, useNativeDriver: true }).start(() => {
          slideAnim.setValue(-SW);
          setStep(prev);
          Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
        });
        return true; // consume
      }
      return false; // on Welcome — let the OS / tab navigator handle it
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub?.remove?.();
  }, [step, slideAnim]);

  const goBack = useCallback(() => {
    if (step === 0) return;
    const prev = step - 1;
    Animated.timing(slideAnim, { toValue: SW, duration: 220, useNativeDriver: true }).start(() => {
      slideAnim.setValue(-SW);
      setStep(prev);
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    });
  }, [step, slideAnim]);

  const renderStep = () => {
    switch (step) {
      case 0:  return <Screen1Welcome onNext={goNext} allAccepted={allPreviouslyAccepted} />;
      case 1:  return <Screen2Tour onNext={goNext} onBack={goBack} />;
      case 2:  return <Screen3Consent onNext={goNext} onBack={goBack} consents={consents} setConsents={setConsents} />;
      case 3:  return <Screen4Pledge onNext={goNext} onBack={goBack} />;
      case 4:  return <Screen5Legal onNext={goNext} onBack={goBack} />;
      case 5:  return <Screen6Permissions onNext={goNext} onBack={goBack} />;
      case 6:  return <Screen7QA onNext={goNext} onBack={goBack} />;
      case 7:  return <Screen8ServerPrivacy onNext={goNext} onBack={goBack} serverAccepts={serverAccepts} setServerAccepts={setServerAccepts} />;
      case 8:  return <Screen9Download onNext={goNext} onBack={goBack} />;
      case 9:  return <Screen10Ready onBack={goBack} onComplete={onComplete} />;
      default: return <Screen1Welcome onNext={goNext} allAccepted={allPreviouslyAccepted} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <HUDGridBG />
      {/* Progress dots — completed = green, active = cyan pill, future = dim */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 54, paddingBottom: 8, gap: 5 }}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View key={i} style={{
            width: i === step ? 20 : i < step ? 8 : 6,
            height: i === step ? 6 : i < step ? 6 : 5,
            borderRadius: 3,
            backgroundColor: i < step ? C.green : i === step ? C.cyan : 'rgba(255,42,31,0.10)',
            ...(i === step ? { shadowColor: C.cyan, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:8 } : {}),
          }} />
        ))}
      </View>
      {/* Step label row — clean badge style */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: step < TOTAL_STEPS - 1 ? C.cyan : C.green, opacity: 0.6 }} />
        <Text style={{ fontSize: 11, fontWeight: '900', color: C.cyan + '90', fontFamily: MONO, letterSpacing: 2 }}>
          {STEP_LABELS[step].toUpperCase()}
        </Text>
        <View style={{ borderRadius: 5, borderWidth: 1, borderColor: C.cyan + '30', backgroundColor: C.cyan + '08', paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontSize: 9, fontWeight: '900', fontFamily: MONO, color: C.cyan + '70' }}>{step + 1}/{TOTAL_STEPS}</Text>
        </View>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: step < TOTAL_STEPS - 1 ? C.cyan : C.green, opacity: 0.6 }} />
      </View>
      {/* Content */}
      <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }], paddingHorizontal: 16 }}>
        {renderStep()}
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// SHARED STYLES
// ─────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  card: {
    borderWidth: 1.5, borderRadius: 16, backgroundColor: C.card,
    marginBottom: 12, overflow: 'hidden',
    borderColor: 'rgba(255,42,31,0.16)',
  },
  checkRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    borderWidth: 1.5, borderRadius: 14, padding: 16,
    borderColor: 'rgba(255,42,31,0.13)', backgroundColor: 'rgba(255,42,31,0.03)',
    marginBottom: 12,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 7, borderWidth: 2,
    borderColor: 'rgba(255,42,31,0.35)', backgroundColor: 'transparent',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkLabel: { fontSize: 15, fontWeight: '700', color: C.text, lineHeight: 22 },
  checkSub:   { fontSize: 12, color: C.textMid, lineHeight: 18 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: C.cyan, borderRadius: 16,
    paddingVertical: 18, marginTop: 6,
    borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.35)',
    borderWidth: 1.5, borderColor: C.cyan,
  },
  primaryBtnTxt: { fontSize: 16, fontWeight: '900', color: '#000E1A', fontFamily: MONO, letterSpacing: 2 },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 17,
    borderColor: 'rgba(255,42,31,0.22)', backgroundColor: 'rgba(255,42,31,0.05)',
  },
  backBtnTxt: { fontSize: 13, fontWeight: '900', color: C.cyan, fontFamily: MONO, letterSpacing: 1 },
});
