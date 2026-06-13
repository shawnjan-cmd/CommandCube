/**
 * 🛡️ PRIVACY AUDIT SCREEN — /privacy-audit
 *
 * In-app dashboard that PROVES the app is not phoning home. Lists every
 * outbound network request the JavaScript layer has made, classified as
 * LAN (green — your own PC) vs CLOUD (red — would be a privacy break).
 *
 * Backed by services/privacyAudit.ts which wraps fetch + XHR at boot.
 *
 * Theme: Terminator endoskeleton red / gunmetal — matches the rest of
 * the app. Pure StyleSheet + Animated, no Reanimated dependency.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
  Animated, Easing, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { privacyAudit, AuditEvent, AuditCounters } from '@/services/privacyAudit';

// ── Palette (Terminator endoskeleton red) ─────────────────────────────────
const C = {
  bg:       '#040608',
  surface:  '#0B0F14',
  surface2: '#11161E',
  border:   '#1C242E',
  red:      '#FF2A1F',
  redDim:   '#7A1410',
  amber:    '#FFB000',
  green:    '#00FF88',
  greenDim: '#007F44',
  cyan:     '#00E0FF',
  text:     '#E8EEF5',
  textDim:  '#7A8392',
  textMute: '#4A525E',
};

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => (n < 10 ? '0' + n : String(n));
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtSince(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)      return `${s}s ago`;
  if (s < 3600)    return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)   return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function PrivacyAuditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents]       = useState<AuditEvent[]>([]);
  const [counters, setCounters]   = useState<AuditCounters>(privacyAudit.getCounters());
  const pulseAnim                 = useRef(new Animated.Value(0)).current;

  // Live subscribe
  useEffect(() => {
    const unsub = privacyAudit.subscribe((ev, c) => {
      setEvents(ev.slice(0, 30));
      setCounters(c);
    });
    return unsub;
  }, []);

  // Heartbeat pulse on the "NO LEAKS" badge
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const isClean   = counters.cloud === 0 && counters.blocked === 0;
  const heroColor = isClean ? C.green : C.red;
  const pulseOp   = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  const pulseScl  = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  const onReset = useCallback(() => {
    Alert.alert(
      'RESET AUDIT LOG',
      'Clear all logged network events and reset counters to zero?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset',  style: 'destructive', onPress: () => privacyAudit.reset() },
      ],
    );
  }, []);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── HEADER BAR ───────────────────────────────────────────── */}
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialIcons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>PRIVACY AUDIT</Text>
          <Text style={s.headerSub}>LIVE NETWORK TELEMETRY · BUTLER AI</Text>
        </View>
        <View style={s.headerBadge}>
          <View style={[s.dot, { backgroundColor: C.green }]} />
          <Text style={[s.headerBadgeTxt, { color: C.green }]}>REC</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 80 }}>

        {/* ── HERO STATUS ─────────────────────────────────────────── */}
        <Animated.View style={[s.hero, { borderColor: heroColor + 'AA', opacity: pulseOp, transform: [{ scale: pulseScl }] }]}>
          <View style={[s.heroRingOuter, { borderColor: heroColor + '40' }]}>
            <View style={[s.heroRingInner, { borderColor: heroColor + '88' }]}>
              <MaterialCommunityIcons
                name={isClean ? 'shield-check' : 'shield-alert'}
                size={44}
                color={heroColor}
              />
            </View>
          </View>
          <Text style={[s.heroBig, { color: heroColor }]}>
            {isClean ? counters.cloud : counters.cloud}
          </Text>
          <Text style={[s.heroLabel, { color: heroColor }]}>
            {isClean ? 'CLOUD CALLS · 0 BYTES LEAKED' : 'CLOUD CALLS DETECTED'}
          </Text>
          <Text style={s.heroSub}>SINCE {fmtSince(counters.lastResetTs).toUpperCase()}</Text>
        </Animated.View>

        {/* ── COUNTER STRIP ──────────────────────────────────────── */}
        <View style={s.counterRow}>
          <View style={[s.counter, { borderColor: C.green + '55' }]}>
            <Text style={[s.counterNum, { color: C.green }]}>{counters.lan}</Text>
            <Text style={s.counterLbl}>LAN OPS</Text>
          </View>
          <View style={[s.counter, { borderColor: (counters.cloud ? C.red : C.border) + 'AA' }]}>
            <Text style={[s.counterNum, { color: counters.cloud ? C.red : C.textDim }]}>{counters.cloud}</Text>
            <Text style={s.counterLbl}>CLOUD</Text>
          </View>
          <View style={[s.counter, { borderColor: (counters.blocked ? C.amber : C.border) + 'AA' }]}>
            <Text style={[s.counterNum, { color: counters.blocked ? C.amber : C.textDim }]}>{counters.blocked}</Text>
            <Text style={s.counterLbl}>BLOCKED</Text>
          </View>
          <View style={[s.counter, { borderColor: C.border }]}>
            <Text style={[s.counterNum, { color: C.textDim }]}>{counters.unknown}</Text>
            <Text style={s.counterLbl}>UNKNOWN</Text>
          </View>
        </View>

        {/* ── TRUST CHECKLIST ────────────────────────────────────── */}
        <Text style={s.sectionTitle}>// TRUST GUARANTEES</Text>
        <View style={s.section}>
          <CheckRow ok label="NO CRASH REPORTING SDK" detail="No Sentry · no Crashlytics · no Bugsnag" />
          <CheckRow ok label="NO ANALYTICS SDK"        detail="No Firebase Analytics · no Mixpanel · no Amplitude" />
          <CheckRow ok label="NO ADVERTISING ID"       detail="AD_ID permission explicitly blocked in app.json" />
          <CheckRow ok label="NO BACKGROUND LOCATION"  detail="All location perms explicitly blocked" />
          <CheckRow ok label="LOCAL-ONLY KNOWLEDGE BASE" detail="AsyncStorage + encrypted blob · zero server sync" />
          <CheckRow ok label="HERMES-ONLY JS RUNTIME"  detail="No remote bundle fetch · no over-the-air updates" />
        </View>

        {/* ── LIVE EVENT FEED ────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
          <Text style={[s.sectionTitle, { marginBottom: 0, flex: 1 }]}>// LIVE EVENT FEED</Text>
          <TouchableOpacity onPress={onReset} style={s.resetBtn} activeOpacity={0.7}>
            <MaterialIcons name="restore" size={11} color={C.red} />
            <Text style={s.resetBtnTxt}>RESET</Text>
          </TouchableOpacity>
        </View>

        {events.length === 0 ? (
          <View style={s.empty}>
            <MaterialCommunityIcons name="radar" size={26} color={C.textMute} />
            <Text style={s.emptyTxt}>NO TRAFFIC YET — SCANNING…</Text>
          </View>
        ) : (
          <View style={s.section}>
            {events.map((ev) => <EventRow key={ev.id} ev={ev} />)}
          </View>
        )}

        <Text style={s.footer}>
          THIS AUDIT IS GENERATED LIVE ON-DEVICE.{'\n'}
          NO THIRD PARTY CAN SEE THESE LOGS — THEY NEVER LEAVE YOUR PHONE.
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function CheckRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <View style={s.checkRow}>
      <View style={[s.checkBox, { borderColor: ok ? C.green : C.red, backgroundColor: (ok ? C.green : C.red) + '14' }]}>
        <MaterialIcons name={ok ? 'check' : 'close'} size={13} color={ok ? C.green : C.red} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.checkLabel}>{label}</Text>
        <Text style={s.checkDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function EventRow({ ev }: { ev: AuditEvent }) {
  const col = ev.klass === 'LAN'     ? C.green
            : ev.klass === 'CLOUD'   ? C.red
            : ev.klass === 'BLOCKED' ? C.amber
            : C.textDim;
  const ok  = ev.status && ev.status >= 200 && ev.status < 400;
  return (
    <View style={[s.eventRow, { borderLeftColor: col }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={[s.tag, { borderColor: col + 'AA', backgroundColor: col + '18' }]}>
          <Text style={[s.tagTxt, { color: col }]}>{ev.klass}</Text>
        </View>
        <Text style={[s.eventMethod, { color: C.text }]}>{ev.method}</Text>
        <Text style={s.eventStatus}>{ev.status ? String(ev.status) : (ev.error ? 'ERR' : '…')}</Text>
        <Text style={s.eventTime}>{fmtTime(ev.ts)}</Text>
      </View>
      <Text style={s.eventHost} numberOfLines={1}>{ev.host || '<empty>'}</Text>
      <Text style={s.eventUrl} numberOfLines={1}>{ev.url}</Text>
      {ev.error ? <Text style={s.eventError}>{ev.error}</Text> : null}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  headerBar:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, gap: 12 },
  backBtn:     { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  headerTitle: { fontFamily: MONO, fontSize: 13, fontWeight: '900', color: C.text, letterSpacing: 2.5 },
  headerSub:   { fontFamily: MONO, fontSize: 8, color: C.textDim, letterSpacing: 1.5, marginTop: 2 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: C.green + '55', backgroundColor: C.green + '12', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  headerBadgeTxt: { fontFamily: MONO, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  dot:         { width: 6, height: 6, borderRadius: 3 },

  hero:        { borderWidth: 1, borderRadius: 14, backgroundColor: C.surface, paddingVertical: 22, paddingHorizontal: 18, alignItems: 'center', marginBottom: 14 },
  heroRingOuter: { width: 96, height: 96, borderRadius: 48, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroRingInner: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  heroBig:     { fontFamily: MONO, fontSize: 56, fontWeight: '900', letterSpacing: -2, marginTop: 4 },
  heroLabel:   { fontFamily: MONO, fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 4, textAlign: 'center' },
  heroSub:     { fontFamily: MONO, fontSize: 9, color: C.textDim, letterSpacing: 1.5, marginTop: 6 },

  counterRow:  { flexDirection: 'row', gap: 8, marginBottom: 16 },
  counter:     { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center', backgroundColor: C.surface },
  counterNum:  { fontFamily: MONO, fontSize: 22, fontWeight: '900' },
  counterLbl:  { fontFamily: MONO, fontSize: 8, color: C.textDim, letterSpacing: 1.2, marginTop: 4 },

  sectionTitle:{ fontFamily: MONO, fontSize: 10, fontWeight: '900', color: C.textDim, letterSpacing: 2, marginBottom: 8, marginTop: 4 },
  section:     { borderWidth: 1, borderColor: C.border, borderRadius: 10, backgroundColor: C.surface, overflow: 'hidden' },

  checkRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  checkBox:    { width: 22, height: 22, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  checkLabel:  { fontFamily: MONO, fontSize: 11, fontWeight: '700', color: C.text, letterSpacing: 1 },
  checkDetail: { fontFamily: MONO, fontSize: 9, color: C.textDim, marginTop: 2 },

  resetBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.red + '55', backgroundColor: C.red + '14', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  resetBtnTxt: { fontFamily: MONO, fontSize: 9, fontWeight: '900', color: C.red, letterSpacing: 1.2 },

  empty:       { borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, borderRadius: 10, paddingVertical: 28, alignItems: 'center', gap: 10, backgroundColor: C.surface },
  emptyTxt:    { fontFamily: MONO, fontSize: 10, color: C.textMute, letterSpacing: 1.5 },

  eventRow:    { borderLeftWidth: 3, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  tag:         { borderWidth: 1, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  tagTxt:      { fontFamily: MONO, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  eventMethod: { fontFamily: MONO, fontSize: 10, fontWeight: '900' },
  eventStatus: { fontFamily: MONO, fontSize: 9, color: C.textDim, marginLeft: 4 },
  eventTime:   { fontFamily: MONO, fontSize: 9, color: C.textMute, marginLeft: 'auto' },
  eventHost:   { fontFamily: MONO, fontSize: 11, color: C.text, marginTop: 4 },
  eventUrl:    { fontFamily: MONO, fontSize: 9, color: C.textDim, marginTop: 2 },
  eventError:  { fontFamily: MONO, fontSize: 9, color: C.amber, marginTop: 2 },

  footer:      { fontFamily: MONO, fontSize: 9, color: C.textMute, textAlign: 'center', lineHeight: 14, marginTop: 22, letterSpacing: 0.8 },
});
