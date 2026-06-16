/**
 * NexusHUD — Shared NEXUS-style HUD primitives.
 * Ported visually from user's nexus-v9 / nexus-v5 HTML mockups.
 *
 * Components:
 *   • <HudHeader title badge />        — sec-h pattern (title + line + optional badge)
 *   • <StatCard label value color bar />— st pattern (label, big value, color bar)
 *   • <AgentCard avatar name sub color status /> — agent-card pattern (avatar + name + pulse)
 *   • <EmptyState icon title sub />    — "AWAITING PC LINK" placeholder
 *
 * These primitives are wired ONLY to real props — no internal fake data.
 * If a caller has no data, they pass empty/zero values, and these components
 * render the appropriate empty/connect prompt visually.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Platform } from 'react-native';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ── NEXUS color palette (from nexus-v9 HTML) ────────────────────
export const NEXUS = {
  red:      '#FF2A1F',
  amber:    '#F59E0B',
  green:    '#10B981',
  netgreen: '#00E5A0',
  cyan:     '#06B6D4',
  blue:     '#3B82F6',
  purple:   '#A855F7',
  textHi:   '#E8EAEC',
  textMid:  '#C8E4F0',
  textDim:  '#8C95A6',
  surface2: '#0A0A0A',
  surface3: '#141416',
  border:   'rgba(255,255,255,0.08)',
};

// ════════════════════════════════════════════════════════════════════
// HudHeader  ─  <div class="sec-h"><span class="sec-t">…<span class="sec-badge">
// ════════════════════════════════════════════════════════════════════
export function HudHeader({
  title,
  badge,
  badgeColor,
  accent = NEXUS.red,
}: {
  title: string;
  badge?: string;
  badgeColor?: string;
  accent?: string;
}) {
  return (
    <View style={hh.row}>
      <Text style={[hh.title, { color: accent }]} numberOfLines={1}>{title}</Text>
      <View style={[hh.line, { backgroundColor: accent + '33' }]} />
      {badge ? (
        <View style={[hh.badge, { borderColor: (badgeColor || accent) + '66', backgroundColor: (badgeColor || accent) + '14' }]}>
          <Text style={[hh.badgeTxt, { color: badgeColor || accent }]} numberOfLines={1}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const hh = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12, paddingHorizontal: 2 },
  title:  { fontFamily: MONO, fontSize: 10.5, fontWeight: '900', letterSpacing: 2.4 },
  line:   { flex: 1, height: StyleSheet.hairlineWidth },
  badge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  badgeTxt:{ fontFamily: MONO, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.6 },
});

// ════════════════════════════════════════════════════════════════════
// StatCard  ─  <div class="st"><div class="st-l"><div class="st-v"><div class="st-bar">
// ════════════════════════════════════════════════════════════════════
export function StatCard({
  label,
  value,
  color = NEXUS.red,
  barPct,
  empty = false,
}: {
  label: string;
  value: string | number;
  color?: string;
  barPct?: number; // 0..100
  empty?: boolean;
}) {
  const displayValue = empty ? '—' : String(value);
  const finalColor   = empty ? NEXUS.textDim : color;
  const finalBar     = empty ? 0 : Math.max(0, Math.min(100, barPct ?? 0));

  return (
    <View style={[sc.box, { borderColor: finalColor + '38', backgroundColor: finalColor + '08' }]}>
      <Text style={[sc.label, { color: NEXUS.textDim }]} numberOfLines={1}>{label}</Text>
      <Text style={[sc.value, { color: finalColor }]} numberOfLines={1}>{displayValue}</Text>
      <View style={[sc.barTrack, { backgroundColor: NEXUS.surface3 }]}>
        <View style={[sc.barFill, { width: `${finalBar}%`, backgroundColor: finalColor }]} />
      </View>
    </View>
  );
}

const sc = StyleSheet.create({
  box:      { flex: 1, minWidth: 0, padding: 10, borderRadius: 6, borderWidth: 1 },
  label:    { fontFamily: MONO, fontSize: 8, fontWeight: '700', letterSpacing: 1.4, marginBottom: 4 },
  value:    { fontFamily: MONO, fontSize: 18, fontWeight: '900', marginBottom: 8 },
  barTrack: { height: 3, borderRadius: 1.5, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 1.5 },
});

// ════════════════════════════════════════════════════════════════════
// AgentCard  ─  <div class="agent-card">
// ════════════════════════════════════════════════════════════════════
export function AgentCard({
  emoji,
  name,
  sub,
  color = NEXUS.green,
  online = false,
}: {
  emoji?: string;
  name: string;
  sub: string;
  color?: string;
  online?: boolean;
}) {
  // Pulse animation for the right-side dot.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!online) return;
    const l = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
      ]),
    );
    l.start();
    return () => l.stop();
  }, [pulse, online]);
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  return (
    <View style={[ac.row, { borderColor: color + '33', backgroundColor: color + '08' }]}>
      <View style={[ac.avatar, { borderColor: color + '66', backgroundColor: color + '15' }]}>
        <Text style={[ac.avatarTxt, { color }]}>{emoji ?? '◆'}</Text>
      </View>
      <View style={ac.info}>
        <Text style={[ac.name, { color }]} numberOfLines={1}>{name}</Text>
        <Text style={[ac.sub, { color: NEXUS.textDim }]} numberOfLines={1}>{sub}</Text>
      </View>
      {online ? (
        <Animated.View
          style={[
            ac.dot,
            {
              backgroundColor: color,
              opacity: dotOpacity,
              shadowColor: color,
            },
          ]}
        />
      ) : (
        <View style={[ac.dot, { backgroundColor: NEXUS.textDim + '55' }]} />
      )}
    </View>
  );
}

const ac = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  avatar:    { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 16 },
  info:      { flex: 1 },
  name:      { fontFamily: MONO, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 2 },
  sub:       { fontFamily: MONO, fontSize: 9, letterSpacing: 0.8 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
});

// ════════════════════════════════════════════════════════════════════
// EmptyState — used when there's no real data yet (no PC pair, no fetch)
// ════════════════════════════════════════════════════════════════════
export function EmptyState({
  icon = '◯',
  title,
  sub,
  accent = NEXUS.red,
  compact = false,
}: {
  icon?: string;
  title: string;
  sub?: string;
  accent?: string;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        es.box,
        compact && es.boxCompact,
        { borderColor: accent + '22', backgroundColor: accent + '06' },
      ]}
    >
      <Text style={[es.icon, { color: accent + 'AA' }]}>{icon}</Text>
      <Text style={[es.title, { color: accent }]} numberOfLines={1}>{title}</Text>
      {sub ? <Text style={[es.sub, { color: NEXUS.textDim }]} numberOfLines={2}>{sub}</Text> : null}
    </View>
  );
}

const es = StyleSheet.create({
  box:        { borderWidth: 1, borderRadius: 10, padding: 22, alignItems: 'center', justifyContent: 'center', gap: 8 },
  boxCompact: { padding: 14 },
  icon:       { fontSize: 28 },
  title:      { fontFamily: MONO, fontSize: 11, fontWeight: '900', letterSpacing: 2.2, marginTop: 4 },
  sub:        { fontFamily: MONO, fontSize: 9.5, letterSpacing: 0.8, lineHeight: 15, textAlign: 'center', marginTop: 2 },
});
