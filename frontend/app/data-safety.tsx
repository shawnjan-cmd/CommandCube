/**
 * 🛡️ DATA SAFETY DECLARATION — Google Play Store Compliance
 * Teal HUD theme — matches Terms of Service and home page aesthetic
 * Covers: data collected, not collected, permissions, security, rights, third-party
 * v2.0 — Updated for app.json v6.0 permissions (CAMERA, INTERNET, ACCESS_NETWORK_STATE,
 *         ACCESS_WIFI_STATE, READ_MEDIA_IMAGES)
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Animated, Linking,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { haptics } from '@/services/haptics';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ─── Teal HUD Palette ─────────────────────────────────────────────
const C = {
  bg:       '#0A0B0D',
  panel:    '#131418',
  card:     '#060F18',
  cardDeep: '#040A12',
  teal:     '#FF2A1F',
  tealBrt:  '#FF2A1F',
  tealDim:  '#55201A',
  tealMid:  '#8A2A20',
  cyan:     '#FF2A1F',
  green:    '#44FF88',
  greenDim: '#003322',
  amber:    '#FF6A1F',
  red:      '#FF6A1F',
  purple:   '#FFC400',
  blue:     '#3A8FFF',
  text:     '#5A626E',
  textBrt:  '#9AA3B2',
  textHi:   '#E6E9EF',
  border:   '#1A1D24',
  borderHi: '#1A3344',
};

// ─── Circuit trace background ──────────────────────────────────────
function CircuitBg() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[50, 110, 180, 260, 350, 450, 560, 680, 800, 930, 1060].map((top, i) => (
        <View key={`h${i}`} style={{ position: 'absolute', top, left: 0, right: 0, height: 1, backgroundColor: C.teal + '0C' }} />
      ))}
      {[28, 88, 150, 220, 300, 380].map((left, i) => (
        <View key={`v${i}`} style={{ position: 'absolute', left, top: 0, bottom: 0, width: 1, backgroundColor: C.teal + '08' }} />
      ))}
    </View>
  );
}

// ─── HUD corner brackets ───────────────────────────────────────────
function HUDCorners({ sz = 10, col = C.teal, w = 2 }: { sz?: number; col?: string; w?: number }) {
  return (
    <>
      <View style={{ position: 'absolute', top: 0, left: 0, width: sz, height: sz, borderTopWidth: w, borderLeftWidth: w, borderColor: col }} />
      <View style={{ position: 'absolute', top: 0, right: 0, width: sz, height: sz, borderTopWidth: w, borderRightWidth: w, borderColor: col }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, width: sz, height: sz, borderBottomWidth: w, borderLeftWidth: w, borderColor: col }} />
      <View style={{ position: 'absolute', bottom: 0, right: 0, width: sz, height: sz, borderBottomWidth: w, borderRightWidth: w, borderColor: col }} />
    </>
  );
}

// ─── Section header with left accent bar ──────────────────────────
function SectionHeader({ label, icon, color = C.teal }: { label: string; icon: string; color?: string }) {
  return (
    <View style={[sec.wrap, { borderLeftColor: color }]}>
      <MaterialIcons name={icon as any} size={13} color={color} />
      <Text style={[sec.txt, { color }]}>{label}</Text>
      <View style={[sec.line, { backgroundColor: color + '30' }]} />
    </View>
  );
}
const sec = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderLeftWidth: 3, paddingLeft: 10, marginTop: 22, marginBottom: 10 },
  txt:  { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.8 },
  line: { flex: 1, height: 1 },
});

// ─── Collapsible card ──────────────────────────────────────────────
function CollapseCard({ title, icon, color = C.teal, children, defaultOpen = false, badge }: {
  title: string; icon: string; color?: string;
  children: React.ReactNode; defaultOpen?: boolean; badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const rotAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    haptics.light();
    Animated.spring(rotAnim, { toValue: open ? 0 : 1, tension: 180, friction: 10, useNativeDriver: false }).start();
    setOpen(v => !v);
  };

  return (
    <View style={[cc.wrap, { borderColor: open ? color + '55' : C.border }]}>
      <HUDCorners sz={8} col={open ? color : C.tealDim} w={1.5} />
      <TouchableOpacity style={cc.hdr} onPress={toggle} activeOpacity={0.8}>
        <View style={[cc.iconBox, { borderColor: color + '55', backgroundColor: color + '12' }]}>
          <MaterialIcons name={icon as any} size={14} color={color} />
        </View>
        <Text style={[cc.title, { color: open ? color : C.textBrt }]} numberOfLines={1}>{title}</Text>
        {badge ? (
          <View style={[cc.badge, { borderColor: color + '55', backgroundColor: color + '15' }]}>
            <Text style={[cc.badgeTxt, { color }]}>{badge}</Text>
          </View>
        ) : null}
        <Animated.View style={{ transform: [{ rotate: rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
          <MaterialIcons name="keyboard-arrow-down" size={18} color={open ? color : C.text} />
        </Animated.View>
      </TouchableOpacity>
      {open ? (
        <View style={[cc.body, { borderTopColor: color + '20' }]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}
const cc = StyleSheet.create({
  wrap:     { borderWidth: 1.5, borderRadius: 8, backgroundColor: C.card, marginBottom: 8, overflow: 'hidden', position: 'relative' },
  hdr:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  iconBox:  { width: 32, height: 32, borderWidth: 1.5, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  title:    { flex: 1, fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  badge:    { borderWidth: 1, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  badgeTxt: { fontSize: 7, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  body:     { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, borderTopWidth: 1 },
});

// ─── Data table row ────────────────────────────────────────────────
function TableRow({ label, collected, shared, encrypted, deletable }: {
  label: string; collected: boolean; shared: boolean; encrypted: boolean; deletable: boolean;
}) {
  const Cell = ({ val, positiveColor = C.green }: { val: boolean; positiveColor?: string }) => (
    <View style={{ width: 54, alignItems: 'center' }}>
      <MaterialIcons
        name={val ? 'check-circle' : 'cancel'}
        size={14}
        color={val ? positiveColor : C.text + '88'}
      />
    </View>
  );
  return (
    <View style={tr.row}>
      <Text style={tr.label} numberOfLines={1}>{label}</Text>
      <Cell val={collected} positiveColor={C.amber} />
      <Cell val={shared} positiveColor={C.red} />
      <Cell val={encrypted} />
      <Cell val={deletable} />
    </View>
  );
}
const tr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border },
  label: { flex: 1, fontSize: 10, color: C.textBrt, fontFamily: MONO },
});

// ─── Bullet item ───────────────────────────────────────────────────
function Bullet({ text, ok = true, color }: { text: string; ok?: boolean; color?: string }) {
  const col = color || (ok ? C.green : C.red);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 7 }}>
      <MaterialIcons name={ok ? 'check-circle' : 'cancel'} size={13} color={col} style={{ marginTop: 2 }} />
      <Text style={{ flex: 1, fontSize: 11, color: C.textBrt, fontFamily: MONO, lineHeight: 17 }}>{text}</Text>
    </View>
  );
}

// ─── Info row ──────────────────────────────────────────────────────
function InfoRow({ icon, label, value, color = C.teal }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <MaterialIcons name={icon as any} size={15} color={color} style={{ marginTop: 1, flexShrink: 0 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: color, fontFamily: MONO, marginBottom: 3 }}>{label}</Text>
        <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15 }}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Permission row ────────────────────────────────────────────────
function PermRow({ perm, icon, purpose, needed, color = C.teal }: {
  perm: string; icon: string; purpose: string; needed: string; color?: string;
}) {
  return (
    <View style={{ paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 30, height: 30, borderRadius: 6, borderWidth: 1.5, borderColor: color + '55', backgroundColor: color + '12', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MaterialIcons name={icon as any} size={14} color={color} />
        </View>
        <Text style={{ flex: 1, fontSize: 11, fontWeight: '900', color: color, fontFamily: MONO, letterSpacing: 0.4 }}>{perm}</Text>
        <View style={{ borderWidth: 1, borderColor: C.green + '55', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: C.green + '10' }}>
          <Text style={{ fontSize: 7, fontWeight: '900', color: C.green, fontFamily: MONO, letterSpacing: 0.5 }}>REQUIRED</Text>
        </View>
      </View>
      <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15, paddingLeft: 38 }}>{purpose}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingLeft: 38 }}>
        <MaterialIcons name="info-outline" size={11} color={C.tealMid} style={{ marginTop: 2 }} />
        <Text style={{ flex: 1, fontSize: 9, color: C.text, fontFamily: MONO, lineHeight: 14 }}>{needed}</Text>
      </View>
    </View>
  );
}

// ─── Google Play data safety format row ───────────────────────────
function GPSafetyRow({ question, answer, ok }: { question: string; answer: string; ok: boolean }) {
  return (
    <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <MaterialIcons name={ok ? 'check-circle' : 'cancel'} size={14} color={ok ? C.green : C.red} style={{ marginTop: 2, flexShrink: 0 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: C.textBrt, fontFamily: MONO, marginBottom: 3 }}>{question}</Text>
        <Text style={{ fontSize: 9, color: ok ? C.green : C.red, fontFamily: MONO, lineHeight: 14 }}>{answer}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────
export default function DataSafetyScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0.3, duration: 1400, useNativeDriver: false }),
    ])).start();
  }, []);

  return (
    <View style={[t.root, { paddingTop: insets.top }]}>
      <CircuitBg />

      {/* ── HEADER ── */}
      <View style={t.header}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: C.teal }} pointerEvents="none" />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: C.teal + '40' }} pointerEvents="none" />

        <TouchableOpacity style={t.backBtn} onPress={() => { haptics.light(); router.back(); }} activeOpacity={0.8} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialIcons name="arrow-back" size={18} color={C.teal} />
        </TouchableOpacity>

        <View style={t.titleBlock}>
          <Animated.View style={[t.shieldBox, { borderColor: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [C.tealDim, C.teal + 'AA'] }) }]}>
            <MaterialCommunityIcons name="shield-check" size={20} color={C.teal} />
          </Animated.View>
          <View>
            <Text style={t.headerTitle}>DATA SAFETY</Text>
            <Text style={t.headerSub}>Google Play Declaration · Butler AI v7.0</Text>
          </View>
        </View>

        <Animated.View style={[t.activeBadge, { borderColor: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: ['#003322', '#22FF4488'] }) }]}>
          <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green, opacity: glowAnim }} />
          <Text style={t.activeTxt}>COMPLIANT</Text>
        </Animated.View>
      </View>

      {/* ── QUICK NAV ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={t.navBar} contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingVertical: 8 }}>
        {[
          { label: 'Summary',     anchor: 0,    icon: 'dashboard' },
          { label: 'Collected',   anchor: 420,  icon: 'storage' },
          { label: 'Not Collected', anchor: 850, icon: 'block' },
          { label: 'Permissions', anchor: 1280, icon: 'admin-panel-settings' },
          { label: 'Security',    anchor: 1700, icon: 'lock' },
          { label: 'Rights',      anchor: 2100, icon: 'gavel' },
          { label: 'Third Party', anchor: 2500, icon: 'hub' },
          { label: 'Play Store',  anchor: 2900, icon: 'android' },
        ].map(({ label, anchor, icon }) => (
          <TouchableOpacity
            key={label}
            style={t.navChip}
            onPress={() => { haptics.light(); scrollRef.current?.scrollTo({ y: anchor, animated: true }); }}
            activeOpacity={0.75}
          >
            <MaterialIcons name={icon as any} size={10} color={C.teal} />
            <Text style={t.navChipTxt}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── CONTENT ── */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: Math.max(insets.bottom + 50, 60) }} showsVerticalScrollIndicator={false}>

        {/* Hero summary card */}
        <View style={t.heroCard}>
          <HUDCorners sz={14} col={C.tealBrt} w={2} />
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: C.greenDim, borderWidth: 2, borderColor: C.green + '70', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="shield-check" size={28} color={C.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={t.heroTitle}>ZERO DATA COLLECTION</Text>
              <Text style={t.heroBody}>Everything runs locally on your PC and phone. No cloud, no accounts, no tracking — ever.</Text>
            </View>
          </View>

          {/* Summary badge grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[
              { l: 'NO ANALYTICS',    c: C.green,  i: 'analytics' },
              { l: 'NO CLOUD',        c: C.teal,   i: 'cloud-off' },
              { l: 'NO ACCOUNTS',     c: C.green,  i: 'person-off' },
              { l: 'LAN ONLY',        c: C.amber,  i: 'wifi-lock' },
              { l: 'SELF-HOSTED',     c: C.teal,   i: 'home' },
              { l: 'OPEN SOURCE',     c: C.purple, i: 'code' },
            ].map(({ l, c, i }) => (
              <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: c + '55', borderRadius: 5, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: c + '10' }}>
                <MaterialIcons name={i as any} size={10} color={c} />
                <Text style={{ fontSize: 8, fontWeight: '900', color: c, fontFamily: MONO, letterSpacing: 0.5 }}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════ */}
        {/* 1. DATA COLLECTED TABLE                          */}
        {/* ══════════════════════════════════════════════════ */}
        <SectionHeader label="1. DATA STORED ON DEVICE" icon="storage" color={C.teal} />

        <CollapseCard title="What Butler AI Stores Locally" icon="phone-android" color={C.teal} defaultOpen badge="LOCAL ONLY">
          <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15, marginBottom: 12 }}>
            The following data lives in your phone's private AsyncStorage. It is never uploaded, shared, or transmitted to any cloud or third party.
          </Text>

          {/* Table header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: C.teal + '40', marginBottom: 4 }}>
            <Text style={{ flex: 1, fontSize: 7.5, fontWeight: '900', color: C.text, fontFamily: MONO, letterSpacing: 1 }}>DATA TYPE</Text>
            {[
              { l: 'STORED', c: C.amber },
              { l: 'SHARED', c: C.red },
              { l: 'SAFE', c: C.green },
              { l: 'DELETABLE', c: C.teal },
            ].map(({ l, c }) => (
              <View key={l} style={{ width: 54, alignItems: 'center' }}>
                <Text style={{ fontSize: 6, fontWeight: '900', color: c, fontFamily: MONO, letterSpacing: 0.5 }}>{l}</Text>
              </View>
            ))}
          </View>

          <TableRow label="PC Server IP / Port"    collected shared={false} encrypted deletable />
          <TableRow label="Session Pairing Token"  collected shared={false} encrypted deletable />
          <TableRow label="App Settings / Prefs"   collected shared={false} encrypted deletable />
          <TableRow label="Script Library"         collected shared={false} encrypted deletable />
          <TableRow label="Execution History"      collected shared={false} encrypted deletable />
          <TableRow label="Knowledge Base (KB)"    collected shared={false} encrypted deletable />
          <TableRow label="Chat History (Local)"   collected shared={false} encrypted deletable />
          <TableRow label="Task Notes (Optional)"  collected shared={false} encrypted deletable />
          <TableRow label="Quick Access Slots"     collected shared={false} encrypted deletable />
          <TableRow label="Mascot Image URI"       collected shared={false} encrypted deletable />

          <Text style={{ fontSize: 8, color: C.text, fontFamily: MONO, lineHeight: 13, marginTop: 10 }}>
            {'\u2713'} Stored = stored on device | Shared = sent to external servers | Safe = app-private storage | Deletable = can be cleared by user
          </Text>
        </CollapseCard>

        {/* ══════════════════════════════════════════════════ */}
        {/* 2. DATA NOT COLLECTED                            */}
        {/* ══════════════════════════════════════════════════ */}
        <SectionHeader label="2. DATA WE NEVER COLLECT" icon="block" color={C.red} />

        <CollapseCard title="Explicitly Not Collected" icon="cancel" color={C.red} defaultOpen badge="NEVER">
          <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15, marginBottom: 12 }}>
            The following data types are explicitly not accessed, collected, stored, or shared under any circumstance:
          </Text>
          {[
            { t: 'Name, email, phone, or any personal identity', ok: false },
            { t: 'GPS or network-based location data', ok: false },
            { t: 'Device contacts, calendar, or call logs', ok: false },
            { t: 'Camera photos or video — camera only reads QR codes, no images saved', ok: false },
            { t: 'Photo library contents — only the URI of a user-chosen mascot image is stored locally', ok: false },
            { t: 'Microphone audio or voice recordings', ok: false },
            { t: 'SMS messages or notification content', ok: false },
            { t: 'Advertising IDs (GAID) or device fingerprints', ok: false },
            { t: 'Browser history, cookies, or web tracking', ok: false },
            { t: 'Health, financial, or biometric data', ok: false },
            { t: 'Crash reports or diagnostic telemetry', ok: false },
            { t: 'Usage analytics, heatmaps, or session recordings', ok: false },
            { t: 'Third-party account credentials', ok: false },
          ].map(({ t, ok }) => <Bullet key={t} text={t} ok={ok} />)}
        </CollapseCard>

        <CollapseCard title="No Analytics or Tracking SDKs" icon="analytics" color={C.red}>
          <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15, marginBottom: 10 }}>
            Butler AI contains ZERO third-party analytics or tracking SDKs:
          </Text>
          {[
            'No Google Analytics / Firebase Analytics',
            'No Google Crashlytics or Firebase Crashlytics',
            'No Facebook / Meta SDK',
            'No Amplitude, Mixpanel, or Segment',
            'No Sentry crash reporting',
            'No AppsFlyer or Adjust attribution',
            'No HotJar, FullStory, or session recording',
            'No in-app advertising network',
          ].map(item => (
            <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 }}>
              <MaterialIcons name="do-not-disturb" size={12} color={C.red} />
              <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO }}>{item}</Text>
            </View>
          ))}
        </CollapseCard>

        {/* ══════════════════════════════════════════════════ */}
        {/* 3. PERMISSIONS                                   */}
        {/* ══════════════════════════════════════════════════ */}
        <SectionHeader label="3. ANDROID PERMISSIONS" icon="admin-panel-settings" color={C.amber} />

        <CollapseCard title="Permissions Declared in app.json" icon="security" color={C.amber} defaultOpen badge="5 DECLARED">
          <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15, marginBottom: 14 }}>
            Butler AI declares the minimum permissions necessary. The table below matches exactly what is declared in the Android manifest (app.json) and submitted to the Google Play Data Safety form.
          </Text>

          {/* ── Quick-reference table ── */}
          <View style={{ borderWidth: 1.5, borderColor: C.amber + '50', borderRadius: 8, overflow: 'hidden', marginBottom: 18 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', backgroundColor: C.amber + '18', paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1.5, borderBottomColor: C.amber + '40' }}>
              <Text style={{ flex: 2, fontSize: 7.5, fontWeight: '900', color: C.amber, fontFamily: MONO, letterSpacing: 1 }}>PERMISSION</Text>
              <Text style={{ flex: 3, fontSize: 7.5, fontWeight: '900', color: C.amber, fontFamily: MONO, letterSpacing: 1 }}>WHY NEEDED</Text>
              <Text style={{ width: 66, fontSize: 7.5, fontWeight: '900', color: C.amber, fontFamily: MONO, letterSpacing: 0.4, textAlign: 'center' }}>DATA LEAVES DEVICE?</Text>
            </View>

            {/* INTERNET */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ flex: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <MaterialIcons name="wifi" size={12} color={C.teal} />
                  <Text style={{ fontSize: 9, fontWeight: '900', color: C.teal, fontFamily: MONO }}>INTERNET</Text>
                </View>
                <Text style={{ fontSize: 7.5, color: C.text, fontFamily: MONO }}>android.permission</Text>
              </View>
              <Text style={{ flex: 3, fontSize: 9, color: C.textBrt, fontFamily: MONO, lineHeight: 13 }}>{'LAN connection to butler_server.py on your PC. No external internet requests.'}</Text>
              <View style={{ width: 66, alignItems: 'center', paddingTop: 2 }}>
                <MaterialIcons name="cancel" size={15} color={C.green} />
                <Text style={{ fontSize: 7, color: C.green, fontFamily: MONO, marginTop: 2, textAlign: 'center' }}>LAN ONLY</Text>
              </View>
            </View>

            {/* CAMERA */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ flex: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <MaterialIcons name="qr-code-scanner" size={12} color={C.amber} />
                  <Text style={{ fontSize: 9, fontWeight: '900', color: C.amber, fontFamily: MONO }}>CAMERA</Text>
                </View>
                <Text style={{ fontSize: 7.5, color: C.text, fontFamily: MONO }}>android.permission</Text>
              </View>
              <Text style={{ flex: 3, fontSize: 9, color: C.textBrt, fontFamily: MONO, lineHeight: 13 }}>{'QR code scanning for PC pairing only. No photos taken, stored, or transmitted.'}</Text>
              <View style={{ width: 66, alignItems: 'center', paddingTop: 2 }}>
                <MaterialIcons name="cancel" size={15} color={C.green} />
                <Text style={{ fontSize: 7, color: C.green, fontFamily: MONO, marginTop: 2, textAlign: 'center' }}>NEVER</Text>
              </View>
            </View>

            {/* ACCESS_NETWORK_STATE */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ flex: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <MaterialIcons name="network-check" size={12} color={C.cyan} />
                  <Text style={{ fontSize: 9, fontWeight: '900', color: C.cyan, fontFamily: MONO }}>ACCESS_NETWORK{'\n'}STATE</Text>
                </View>
                <Text style={{ fontSize: 7.5, color: C.text, fontFamily: MONO }}>android.permission</Text>
              </View>
              <Text style={{ flex: 3, fontSize: 9, color: C.textBrt, fontFamily: MONO, lineHeight: 13 }}>{'Check Wi-Fi before connecting. Prevents wasted attempts over cellular.'}</Text>
              <View style={{ width: 66, alignItems: 'center', paddingTop: 2 }}>
                <MaterialIcons name="cancel" size={15} color={C.green} />
                <Text style={{ fontSize: 7, color: C.green, fontFamily: MONO, marginTop: 2, textAlign: 'center' }}>NEVER</Text>
              </View>
            </View>

            {/* ACCESS_WIFI_STATE */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ flex: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <MaterialIcons name="wifi-find" size={12} color={C.teal} />
                  <Text style={{ fontSize: 9, fontWeight: '900', color: C.teal, fontFamily: MONO }}>ACCESS_WIFI{'\n'}STATE</Text>
                </View>
                <Text style={{ fontSize: 7.5, color: C.text, fontFamily: MONO }}>android.permission</Text>
              </View>
              <Text style={{ flex: 3, fontSize: 9, color: C.textBrt, fontFamily: MONO, lineHeight: 13 }}>{'Wi-Fi subnet detection for LAN auto-discovery. No SSID, password, or MAC collected.'}</Text>
              <View style={{ width: 66, alignItems: 'center', paddingTop: 2 }}>
                <MaterialIcons name="cancel" size={15} color={C.green} />
                <Text style={{ fontSize: 7, color: C.green, fontFamily: MONO, marginTop: 2, textAlign: 'center' }}>NEVER</Text>
              </View>
            </View>

            {/* READ_MEDIA_IMAGES */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 10 }}>
              <View style={{ flex: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <MaterialIcons name="add-photo-alternate" size={12} color={C.purple} />
                  <Text style={{ fontSize: 9, fontWeight: '900', color: C.purple, fontFamily: MONO }}>READ_MEDIA{'\n'}IMAGES</Text>
                </View>
                <Text style={{ fontSize: 7.5, color: C.text, fontFamily: MONO }}>android.permission</Text>
              </View>
              <Text style={{ flex: 3, fontSize: 9, color: C.textBrt, fontFamily: MONO, lineHeight: 13 }}>{'Custom mascot image upload — stored on-device only in app-private storage. Never uploaded.'}</Text>
              <View style={{ width: 66, alignItems: 'center', paddingTop: 2 }}>
                <MaterialIcons name="cancel" size={15} color={C.green} />
                <Text style={{ fontSize: 7, color: C.green, fontFamily: MONO, marginTop: 2, textAlign: 'center' }}>NEVER</Text>
              </View>
            </View>
          </View>

          {/* ── Detailed rows ── */}
          <PermRow
            perm="android.permission.INTERNET"
            icon="wifi"
            color={C.teal}
            purpose="Required to communicate with butler_server.py running on your PC over your local Wi-Fi network. This is the core function of the app. All traffic stays within your home or office LAN (192.168.x.x / 10.x.x.x). No external internet requests are made by the app — every fetch targets a local IP address."
            needed="Without this, the app cannot connect to your PC at all."
          />
          <PermRow
            perm="android.permission.CAMERA"
            icon="qr-code-scanner"
            color={C.amber}
            purpose="Used exclusively when you actively tap the QR SCAN button to scan the QR code displayed by butler_server.py on your PC screen. The camera activates only on demand — never in the background. No image is captured, stored, or transmitted; only the decoded QR text (IP + pairing code) is used."
            needed="Without this, QR pairing is unavailable. You can still connect via manual IP entry."
          />
          <PermRow
            perm="android.permission.ACCESS_NETWORK_STATE"
            icon="network-check"
            color={C.cyan}
            purpose="Reads whether the device has an active Wi-Fi connection before attempting to reach your PC server. This prevents unnecessary connection attempts over cellular data and allows the auto-connect engine to pause until Wi-Fi is available."
            needed="Without this, the app cannot detect network state changes and may drain battery on cellular."
          />
          <PermRow
            perm="android.permission.ACCESS_WIFI_STATE"
            icon="wifi-find"
            color={C.teal}
            purpose="Reads the current Wi-Fi connection state to help the LAN Auto-Discover system identify the active subnet and probe the correct IP range for your PC server. No SSID name, password, BSSID, or MAC address is read, stored, or transmitted."
            needed="Without this, LAN auto-discovery cannot determine which subnet to scan for your server."
          />
          <PermRow
            perm="android.permission.READ_MEDIA_IMAGES"
            icon="add-photo-alternate"
            color={C.purple}
            purpose="Allows you to choose a custom mascot image from your photo library for display on the Butler AI home screen. The selected image URI is stored only in app-private AsyncStorage on this device. No image data, pixel content, or file is uploaded to any server, cloud, or third party under any circumstance."
            needed="Without this, the custom mascot upload feature is unavailable on Android 13+."
          />

          {/* Blocked permissions box */}
          <View style={{ marginTop: 14, backgroundColor: C.greenDim, borderWidth: 1, borderColor: C.green + '40', borderRadius: 6, padding: 12 }}>
            <Text style={{ fontSize: 9, fontWeight: '900', color: C.green, fontFamily: MONO, letterSpacing: 0.8, marginBottom: 6 }}>
              PERMISSIONS EXPLICITLY BLOCKED IN MANIFEST (blockedPermissions)
            </Text>
            <Text style={{ fontSize: 9, color: C.green + 'BB', fontFamily: MONO, lineHeight: 15 }}>
              {'READ_EXTERNAL_STORAGE  \u00b7  WRITE_EXTERNAL_STORAGE  \u00b7  READ_MEDIA_VIDEO  \u00b7  READ_MEDIA_AUDIO  \u00b7  RECORD_AUDIO  \u00b7  com.google.android.gms.permission.AD_ID  \u00b7  ACTIVITY_RECOGNITION  \u00b7  BODY_SENSORS  \u00b7  BODY_SENSORS_BACKGROUND'}
            </Text>
            <Text style={{ fontSize: 8, color: C.green + '88', fontFamily: MONO, lineHeight: 14, marginTop: 8 }}>
              These are in the blockedPermissions list in app.json, ensuring they are stripped from the final APK even if added by a dependency.
            </Text>
          </View>

          {/* Also not requested */}
          <View style={{ marginTop: 10, backgroundColor: C.tealDim + '60', borderWidth: 1, borderColor: C.teal + '30', borderRadius: 6, padding: 10 }}>
            <Text style={{ fontSize: 9, fontWeight: '900', color: C.tealBrt, fontFamily: MONO, letterSpacing: 0.8, marginBottom: 4 }}>ALSO NOT REQUESTED</Text>
            <Text style={{ fontSize: 9, color: C.textBrt, fontFamily: MONO, lineHeight: 14 }}>
              {'READ_CONTACTS \u00b7 WRITE_CONTACTS \u00b7 ACCESS_FINE_LOCATION \u00b7 ACCESS_COARSE_LOCATION \u00b7 READ_SMS \u00b7 SEND_SMS \u00b7 READ_CALL_LOG \u00b7 GET_ACCOUNTS \u00b7 READ_PHONE_STATE \u00b7 NEARBY_WIFI_DEVICES'}
            </Text>
          </View>
        </CollapseCard>

        {/* ══════════════════════════════════════════════════ */}
        {/* 4. DATA SECURITY                                 */}
        {/* ══════════════════════════════════════════════════ */}
        <SectionHeader label="4. DATA SECURITY PRACTICES" icon="lock" color={C.teal} />

        <CollapseCard title="Security Architecture" icon="verified-user" color={C.teal} defaultOpen>
          <InfoRow
            icon="key"
            color={C.tealBrt}
            label="HMAC-SHA256 Token Authentication"
            value="Device pairing uses cryptographic HMAC signatures with a 64-character secret. Constant-time comparison prevents timing attacks. No plain-text passwords."
          />
          <InfoRow
            icon="wifi-lock"
            color={C.cyan}
            label="LAN-Only Communication"
            value="All traffic between your phone and PC stays within your local network (192.168.x.x / 10.x.x.x). No internet tunnel. No relay server. No VPN required."
          />
          <InfoRow
            icon="timer-off"
            color={C.amber}
            label="Session Token Expiry"
            value="Pairing tokens expire automatically after 30 days. After expiry, you must re-scan the QR code to re-authenticate. This limits the window for token misuse."
          />
          <InfoRow
            icon="devices-other"
            color={C.teal}
            label="Single-Device Lock"
            value="Your PC server can only be paired to ONE phone at a time. A new pairing automatically revokes the previous one. Prevents unauthorized access."
          />
          <InfoRow
            icon="timer"
            color={C.amber}
            label="Script Execution Timeout"
            value="All Python scripts have a 30-second timeout. Scripts are sandboxed in subprocess with no elevated privileges. Output is capped at 64KB."
          />
          <InfoRow
            icon="shield"
            color={C.green}
            label="Safety Guard Scanner"
            value="All scripts are scanned for dangerous patterns (os.system, eval, exec, subprocess with shell=True, etc.) before execution. Dangerous scripts are flagged."
          />
          <InfoRow
            icon="storage"
            color={C.tealMid}
            label="App-Private Storage"
            value="AsyncStorage uses Android's app-private storage sandbox. Other apps on your device cannot read Butler AI's data. Data is wiped on uninstall."
          />
          <InfoRow
            icon="add-photo-alternate"
            color={C.purple}
            label="Photo Library Access (mascot only)"
            value="READ_MEDIA_IMAGES is used only when you tap 'Upload Mascot' on the home screen. The image URI is saved to app-private AsyncStorage. No pixel data or file is read, stored externally, or transmitted."
          />
          <InfoRow
            icon="no-encryption-gmailerrorred"
            color={C.textBrt}
            label="Cleartext Traffic (LAN)"
            value="Traffic to your PC server uses HTTP (not HTTPS) because local network SSL is complex. This is safe on private home/office networks. Public Wi-Fi is not recommended."
          />
        </CollapseCard>

        <CollapseCard title="Script Safety Guard" icon="bug-report" color={C.amber}>
          <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15, marginBottom: 10 }}>
            Butler AI includes a built-in static analysis scanner that checks every script before execution:
          </Text>
          {[
            { level: 'CRITICAL',  color: '#FF6A1F', examples: 'os.system(), subprocess with shell=True, shutil.rmtree("/"), rm -rf commands' },
            { level: 'HIGH',      color: '#FF6600', examples: 'eval(), exec(), compile(), pickle.loads() with untrusted data' },
            { level: 'MEDIUM',    color: '#FF6A1F', examples: 'Network socket connections, file deletion, registry modification' },
            { level: 'LOW / INFO',color: C.teal,    examples: 'External imports, web requests, subprocess without shell' },
          ].map(({ level, color, examples }) => (
            <View key={level} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <View style={{ borderWidth: 1, borderColor: color + '60', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: color + '12' }}>
                  <Text style={{ fontSize: 8, fontWeight: '900', color, fontFamily: MONO }}>{level}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 9, color: C.text, fontFamily: MONO, lineHeight: 13 }}>Examples: {examples}</Text>
            </View>
          ))}
          <Text style={{ fontSize: 9, color: C.text, fontFamily: MONO, lineHeight: 14, marginTop: 10 }}>
            Critical-level scripts are blocked from saving and require explicit user override. This is a convenience safety feature — always review scripts before running them.
          </Text>
        </CollapseCard>

        {/* ══════════════════════════════════════════════════ */}
        {/* 5. YOUR RIGHTS                                   */}
        {/* ══════════════════════════════════════════════════ */}
        <SectionHeader label="5. YOUR DATA RIGHTS" icon="gavel" color={C.green} />

        <CollapseCard title="User Rights & Data Control" icon="manage-accounts" color={C.green} defaultOpen>
          <InfoRow
            icon="search"
            color={C.green}
            label="Right to Access"
            value="All data is on YOUR device. You can view stored knowledge via the Knowledge Base tab, execution history in the Scripts tab, and settings in the Settings tab."
          />
          <InfoRow
            icon="delete-forever"
            color={C.green}
            label="Right to Deletion"
            value="Use Settings > Data & Storage > Clear App Cache to erase connection data, history, and cache. Use Settings > Knowledge Base > Clear Knowledge Base to erase KB. Or simply uninstall the app."
          />
          <InfoRow
            icon="file-download"
            color={C.teal}
            label="Right to Portability"
            value="Export your Knowledge Base at any time via Settings > Butler AI Knowledge Base > Export Knowledge Base. Data is saved as a JSON file you can read and share."
          />
          <InfoRow
            icon="edit-off"
            color={C.amber}
            label="Right to Correction"
            value="All data is user-generated. Edit scripts directly in the Scripts tab, clear and re-add knowledge entries, or modify settings at any time."
          />
          <InfoRow
            icon="phone-disabled"
            color={C.teal}
            label="Right to Object (AI Relay)"
            value="The optional cloud AI relay (Ollama AI / local server) can be completely disabled in Settings > Phi-NEXUS Bridge > Local-Only Mode = ON. This ensures 100% offline operation."
          />
          <InfoRow
            icon="person-remove"
            color={C.green}
            label="No Account Required"
            value="Butler AI requires no signup, no email, no Google account, no Apple ID. The app works entirely without an account. There is no account to delete."
          />
        </CollapseCard>

        {/* ══════════════════════════════════════════════════ */}
        {/* 6. THIRD-PARTY SERVICES                          */}
        {/* ══════════════════════════════════════════════════ */}
        <SectionHeader label="6. THIRD-PARTY SERVICES" icon="hub" color={C.purple} />

        <CollapseCard title="Optional AI Services (User-Configured)" icon="psychology" color={C.purple} badge="OPTIONAL">
          <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15, marginBottom: 12 }}>
            These services are optional and only activate if YOU explicitly configure them. The core app works 100% without them.
          </Text>

          {/* Ollama */}
          <View style={{ borderWidth: 1, borderColor: C.green + '50', borderRadius: 8, backgroundColor: C.greenDim, padding: 12, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <MaterialIcons name="computer" size={16} color={C.green} />
              <Text style={{ flex: 1, fontSize: 11, fontWeight: '900', color: C.green, fontFamily: MONO }}>Ollama Local AI</Text>
              <View style={{ borderWidth: 1, borderColor: C.green + '60', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: C.green + '18' }}>
                <Text style={{ fontSize: 7, fontWeight: '900', color: C.green, fontFamily: MONO }}>100% LOCAL</Text>
              </View>
            </View>
            <Text style={{ fontSize: 10, color: C.green + 'BB', fontFamily: MONO, lineHeight: 15 }}>
              {'Runs entirely on your own PC. No API key required. No data sent externally. Your conversations never leave your local network. Fully private AI.'}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://ollama.com/privacy')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
              <MaterialIcons name="open-in-new" size={11} color={C.green + '88'} />
              <Text style={{ fontSize: 9, color: C.green + '88', fontFamily: MONO, textDecorationLine: 'underline' }}>Ollama Privacy Policy</Text>
            </TouchableOpacity>
          </View>

          {/* local server / Ollama AI */}
          <View style={{ borderWidth: 1, borderColor: C.purple + '50', borderRadius: 8, backgroundColor: C.purple + '0A', padding: 12, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <MaterialIcons name="cloud" size={16} color={C.purple} />
              <Text style={{ flex: 1, fontSize: 11, fontWeight: '900', color: C.purple, fontFamily: MONO }}>local server / Ollama AI AI (Optional)</Text>
              <View style={{ borderWidth: 1, borderColor: C.amber + '60', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: C.amber + '10' }}>
                <Text style={{ fontSize: 7, fontWeight: '900', color: C.amber, fontFamily: MONO }}>OPT-IN ONLY</Text>
              </View>
            </View>
            <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15, marginBottom: 8 }}>
              If the {'\u03A6'}-NEXUS relay is enabled (default: off), Butler AI queries are relayed through local server Edge Functions to Google Ollama AI for enrichment.
            </Text>
            <Text style={{ fontSize: 9, color: C.text, fontFamily: MONO, lineHeight: 14 }}>
              {'What is sent: Your typed question text and relevant KB context snippets.\nWhat is NOT sent: Personal identity, location, contacts, scripts, IP address, or photos.\n\nDisable: Settings > \u03A6-NEXUS Bridge > Local-Only Mode = ON'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity onPress={() => Linking.openURL('https://shawnjan-cmd.github.io/privacy-policy-/privacy-policy.html')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialIcons name="open-in-new" size={11} color={C.purple + '88'} />
                <Text style={{ fontSize: 9, color: C.purple + '88', fontFamily: MONO, textDecorationLine: 'underline' }}>local server Privacy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL('https://policies.google.com/privacy')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialIcons name="open-in-new" size={11} color={C.purple + '88'} />
                <Text style={{ fontSize: 9, color: C.purple + '88', fontFamily: MONO, textDecorationLine: 'underline' }}>Google Privacy</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={{ fontSize: 9, color: C.text, fontFamily: MONO, lineHeight: 14, marginTop: 4 }}>
            All third-party integrations are opt-in. None are enabled by default. The app works fully offline without any of them.
          </Text>
        </CollapseCard>

        <CollapseCard title="Open Source Components" icon="code" color={C.tealMid}>
          <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15, marginBottom: 10 }}>
            Butler AI is built on open source software. All components are MIT-licensed unless noted:
          </Text>
          {[
            { name: 'React Native', lic: 'MIT', url: 'https://reactnative.dev' },
            { name: 'Expo SDK',     lic: 'MIT', url: 'https://expo.dev' },
            { name: 'Ollama',       lic: 'MIT', url: 'https://ollama.com' },
            { name: '@expo/vector-icons', lic: 'MIT', url: 'https://github.com/expo/vector-icons' },
            { name: 'react-native-paper', lic: 'MIT', url: 'https://reactnativepaper.com' },
            { name: 'AsyncStorage', lic: 'MIT', url: 'https://github.com/react-native-async-storage/async-storage' },
          ].map(({ name, lic, url }) => (
            <TouchableOpacity key={name} onPress={() => { haptics.light(); Linking.openURL(url); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border }} activeOpacity={0.75}>
              <Text style={{ flex: 1, fontSize: 10, color: C.textBrt, fontFamily: MONO }}>{name}</Text>
              <View style={{ borderWidth: 1, borderColor: C.green + '50', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: C.green + '10' }}>
                <Text style={{ fontSize: 7, fontWeight: '900', color: C.green, fontFamily: MONO }}>{lic}</Text>
              </View>
              <MaterialIcons name="open-in-new" size={12} color={C.text} />
            </TouchableOpacity>
          ))}
        </CollapseCard>

        {/* ══════════════════════════════════════════════════ */}
        {/* 7. GOOGLE PLAY DATA SAFETY FORMAT                 */}
        {/* ══════════════════════════════════════════════════ */}
        <SectionHeader label="7. GOOGLE PLAY DATA SAFETY ANSWERS" icon="android" color={C.green} />

        <CollapseCard title="Official Play Store Declaration" icon="verified" color={C.green} defaultOpen badge="PLAY STORE">
          <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15, marginBottom: 12 }}>
            These are the answers as submitted to the Google Play Console Data Safety section (Butler AI v7.0.0 · versionCode 70):
          </Text>

          {/* ── Permissions summary table for Play Store form ── */}
          <View style={{ borderWidth: 1.5, borderColor: C.teal + '40', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
            <View style={{ backgroundColor: C.teal + '15', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1.5, borderBottomColor: C.teal + '40' }}>
              <Text style={{ fontSize: 8, fontWeight: '900', color: C.tealBrt, fontFamily: MONO, letterSpacing: 1 }}>DECLARED PERMISSIONS — PLAY STORE DATA SAFETY</Text>
            </View>
            {[
              { perm: 'INTERNET',             icon: 'wifi',                color: C.teal,   use: 'LAN communication with PC server only',                    dataLeaks: false },
              { perm: 'CAMERA',               icon: 'qr-code-scanner',     color: C.amber,  use: 'QR code pairing (on-demand, no photos saved)',            dataLeaks: false },
              { perm: 'ACCESS_NETWORK_STATE', icon: 'network-check',       color: C.cyan,   use: 'Check Wi-Fi before connecting to PC',                     dataLeaks: false },
              { perm: 'ACCESS_WIFI_STATE',    icon: 'wifi-find',           color: C.teal,   use: 'LAN subnet detection for auto-discovery',                  dataLeaks: false },
              { perm: 'READ_MEDIA_IMAGES',    icon: 'add-photo-alternate', color: C.purple, use: 'Custom mascot upload — on-device only, never uploaded',   dataLeaks: false },
            ].map(({ perm, icon, color, use, dataLeaks }) => (
              <View key={perm} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 }}>
                <MaterialIcons name={icon as any} size={13} color={color} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color, fontFamily: MONO }}>{perm}</Text>
                  <Text style={{ fontSize: 8, color: C.textBrt, fontFamily: MONO, marginTop: 2, lineHeight: 12 }}>{use}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialIcons name={dataLeaks ? 'warning' : 'lock'} size={12} color={dataLeaks ? C.red : C.green} />
                  <Text style={{ fontSize: 7.5, fontWeight: '900', color: dataLeaks ? C.red : C.green, fontFamily: MONO }}>{dataLeaks ? 'TRANSMITS' : 'ON-DEVICE'}</Text>
                </View>
              </View>
            ))}
          </View>

          <GPSafetyRow
            question="Does your app collect or share user data with third parties?"
            answer="No personal data is collected. Optional AI relay (opt-in only) sends anonymized query text to local server/Ollama AI. No PII included."
            ok
          />
          <GPSafetyRow
            question="Is all user data collected encrypted in transit?"
            answer="HTTPS used for optional cloud AI relay. LAN traffic uses HTTP (same private network — no encryption needed for local loopback)."
            ok
          />
          <GPSafetyRow
            question="Can users request deletion of their data?"
            answer="Yes — Settings > Clear App Cache or simply uninstall. Knowledge Base, scripts, and history can each be cleared individually."
            ok
          />
          <GPSafetyRow
            question="Does the app share user data with third parties for advertising?"
            answer="Never. No advertising SDK or ad network is included. No data is shared for ad targeting."
            ok
          />
          <GPSafetyRow
            question="Does the app use device or other IDs?"
            answer="A random UUID is generated locally for PC pairing. It is stored only on your device and the paired PC server. Never uploaded to cloud."
            ok
          />
          <GPSafetyRow
            question="Is app data collected for analytics or product improvement?"
            answer="No. Zero analytics. Zero crash reporting. Zero usage data. No Firebase, Crashlytics, or any analytics SDK is included."
            ok
          />
          <GPSafetyRow
            question="Camera permission — what is it used for?"
            answer="QR code scanning for PC pairing only. No photos are captured, stored, or transmitted. Camera is activated on-demand by user tap, never in background."
            ok
          />
          <GPSafetyRow
            question="Photo library permission (READ_MEDIA_IMAGES) — what is it used for?"
            answer="User picks a custom mascot image stored locally in app-private storage only. No image data is uploaded to any server, cloud, or third party."
            ok
          />
          <GPSafetyRow
            question="Does the app transmit any data over the internet (not LAN)?"
            answer="No. INTERNET permission is used exclusively for LAN (192.168.x.x / 10.x.x.x) connections. No external internet requests. No cloud sync."
            ok
          />
          <GPSafetyRow
            question="Is there sensitive content (violence, adult content, dangerous activities)?"
            answer="No. The app executes user-provided Python scripts. No predefined dangerous content. Safety Guard blocks dangerous script patterns."
            ok
          />

          <View style={{ marginTop: 12, backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.teal + '50', borderRadius: 8, padding: 12 }}>
            <Text style={{ fontSize: 9, fontWeight: '900', color: C.tealBrt, fontFamily: MONO, letterSpacing: 0.8, marginBottom: 4 }}>CONTENT RATING</Text>
            <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15 }}>
              {'Rated Everyone (EVERYONE). No violence, no adult content, no in-app purchases, no gambling, no user-generated public content. Suitable for developers and power users of all ages.'}
            </Text>
          </View>
        </CollapseCard>

        {/* Contact card */}
        <View style={t.contactCard}>
          <HUDCorners sz={12} col={C.cyan} w={2} />
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: C.tealDim, borderWidth: 1.5, borderColor: C.cyan + '60', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="support-agent" size={24} color={C.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: C.cyan, fontFamily: MONO, letterSpacing: 0.6 }}>Questions About Data Safety?</Text>
              <Text style={{ fontSize: 9, color: C.text, fontFamily: MONO, marginTop: 3 }}>Privacy requests, data questions, or compliance concerns</Text>
            </View>
          </View>
          <TouchableOpacity
            style={t.emailBtn}
            onPress={() => { haptics.medium(); Linking.openURL('mailto:andrejsladkovic1992@gmail.com?subject=Data Safety - Butler AI'); }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="email" size={16} color="#000" />
            <Text style={t.emailBtnTxt}>andrejsladkovic1992@gmail.com</Text>
            <MaterialIcons name="arrow-forward" size={14} color="#000" />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TouchableOpacity style={[t.linkBtn, { flex: 1, borderColor: C.green + '60', backgroundColor: C.green + '10' }]} onPress={() => { haptics.light(); try { router.push('/privacy-policy' as any); } catch { Linking.openURL('https://shawnjan-cmd.github.io/privacy-policy-/'); } }} activeOpacity={0.85}>
              <MaterialIcons name="privacy-tip" size={12} color={C.green} />
              <Text style={[t.linkTxt, { color: C.green }]}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[t.linkBtn, { flex: 1, borderColor: C.amber + '60', backgroundColor: C.amber + '10' }]} onPress={() => { haptics.light(); try { router.push('/terms' as any); } catch { Linking.openURL('https://shawnjan-cmd.github.io/privacy-policy-/'); } }} activeOpacity={0.85}>
              <MaterialIcons name="gavel" size={12} color={C.amber} />
              <Text style={[t.linkTxt, { color: C.amber }]}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={t.footer}>
          <View style={t.footerLine} />
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={t.footerTxt}>DATA SAFETY DECLARATION v3.0 · BUTLER AI v7.0</Text>
            <Text style={t.footerTxt}>Effective May 14, 2026 · Google Play Compliant</Text>
          </View>
          <View style={t.footerLine} />
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const t = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#0E0F12', borderBottomWidth: 2, borderBottomColor: C.teal + '60',
    position: 'relative', overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: C.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 }, android: { elevation: 8 } }),
  },
  backBtn: {
    width: 38, height: 38, backgroundColor: C.tealDim, borderWidth: 1.5, borderColor: C.teal + '70',
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ ios: { shadowColor: C.teal, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8 }, android: { elevation: 4 } }),
  },
  titleBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  shieldBox:  { width: 40, height: 40, borderWidth: 1.5, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.tealDim + '80' },
  headerTitle:{ fontSize: 12, fontWeight: '900', color: C.tealBrt, fontFamily: MONO, letterSpacing: 1.2,
    ...Platform.select({ ios: { textShadowColor: C.teal, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }, android: {} }) },
  headerSub:  { fontSize: 7.5, color: C.text, fontFamily: MONO, marginTop: 2 },
  activeBadge:{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: C.green + '10' },
  activeTxt:  { fontSize: 7.5, fontWeight: '900', color: C.green, fontFamily: MONO, letterSpacing: 1 },

  navBar:     { maxHeight: 44, backgroundColor: '#0E0F12', borderBottomWidth: 1, borderBottomColor: C.border },
  navChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: C.teal + '50', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.teal + '10' },
  navChipTxt: { fontSize: 9, fontWeight: '700', color: C.teal, fontFamily: MONO, letterSpacing: 0.4 },

  heroCard: {
    borderWidth: 1.5, borderColor: C.teal + '60', borderRadius: 10, backgroundColor: C.panel,
    padding: 14, marginBottom: 6, position: 'relative', overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: C.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }, android: { elevation: 6 } }),
  },
  heroTitle:  { fontSize: 15, fontWeight: '900', color: C.green, fontFamily: MONO, letterSpacing: 0.8 },
  heroBody:   { fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15, marginTop: 4 },

  contactCard: {
    borderWidth: 1.5, borderColor: C.cyan + '60', borderRadius: 10, backgroundColor: C.panel,
    padding: 14, position: 'relative', overflow: 'hidden', marginTop: 8,
    ...Platform.select({ ios: { shadowColor: C.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }, android: { elevation: 6 } }),
  },
  emailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.cyan, borderRadius: 8, paddingVertical: 14,
    ...Platform.select({ ios: { shadowColor: C.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 10 }, android: { elevation: 6 } }),
  },
  emailBtnTxt: { fontSize: 13, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 0.6 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: 7, paddingVertical: 10 },
  linkTxt: { fontSize: 10, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.4 },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 8 },
  footerLine: { flex: 1, height: 1, backgroundColor: C.border },
  footerTxt:  { fontSize: 7.5, color: C.text, fontFamily: MONO, letterSpacing: 0.8 },
});
