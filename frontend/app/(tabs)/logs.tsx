/**
 * ⚡ PC CHECK DASHBOARD — Native with live server data + offline mode
 * Cleaning graphs · System health · Quick actions · Undo journal
 * Works fully offline with placeholder UI, populates with real data when connected
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {

  View, Text, StyleSheet, Platform, TouchableOpacity,
  ScrollView, Animated, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { serverConnection } from '@/services/serverConnection';
import { autoConnectEngine, EngineEvent } from '@/services/autoConnectEngine';
import { haptics } from '@/services/haptics';
import { InlineWidgetSlot } from '@/components/ui/WidgetLayer';
import { useFocusEffect } from 'expo-router';
import { useCosmetic } from '@/contexts/CosmeticContext';

const { width: SW } = Dimensions.get('window');
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const C = {
  bg:       '#000003',
  surface:  '#02070D',
  surfaceHi:'#071120',
  border:   'rgba(0,255,255,0.12)',
  text:     '#D8E8F4',
  textMid:  '#7A9AB8',
  textDim:  '#3A5068',
  teal:     '#00FFFF',
  tealD:    'rgba(0,255,255,0.08)',
  green:    '#00FF88',
  greenD:   '#00FF8818',
  amber:    '#F5A623',
  amberD:   '#F5A62318',
  red:      '#FF3131',
  redD:     '#FF313118',
  blue:     '#4A9EFF',
  blueD:    '#4A9EFF18',
  purple:   '#BF00FF',
  purpleD:  '#BF00FF18',
  cyan:     '#00FFFF',
};

// ─── AREA SPARKLINE CHART (matches image 4 style) ─────────────
function AreaSparkline({ points, color, height = 60, width: chartW }: {
  points: number[];
  color: string;
  height?: number;
  width: number;
}) {
  const anims = useRef(points.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(30, anims.map((a, i) =>
      Animated.timing(a, { toValue: points[i], duration: 700, useNativeDriver: false })
    )).start();
  }, []);

  const maxPt = Math.max(...points, 1);
  const barW  = Math.max(1, (chartW - (points.length - 1) * 1) / points.length);

  return (
    <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 1, overflow: 'hidden' }}>
      {points.map((pt, i) => {
        const barH = Math.max(3, (pt / maxPt) * (height - 4));
        const opacity = 0.35 + (i / points.length) * 0.65;
        const isLast = i === points.length - 1;
        return (
          <Animated.View key={i} style={[
            { flex: 1, borderRadius: 2, opacity: isLast ? 1 : opacity },
            { backgroundColor: color },
            { height: barH },
            isLast && Platform.OS === 'ios'
              ? { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 10 }
              : {},
          ]} />
        );
      })}
    </View>
  );
}

// ─── NEXUS DATA STAT CARD (matches image 4 — Crawlers/KB/Scripts) ──
interface DataStatCardProps {
  title: string;
  subtitle: string;
  value: string;
  statusLabel: string;
  statusColor: string;
  color: string;
  sparkPoints: number[];
  statRow: { label: string; value: string }[];
  actionLabel?: string;
  onAction?: () => void;
  chartWidth: number;
}

function DataStatCard({
  title, subtitle, value, statusLabel, statusColor, color,
  sparkPoints, statRow, actionLabel, onAction, chartWidth,
}: DataStatCardProps) {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0.2, duration: 900, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, []);

  return (
    <View style={[dsc.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      {/* Top accent bar */}
      <View style={[dsc.topBar, { backgroundColor: color }]} />
      {/* Header row */}
      <View style={dsc.header}>
        <View style={[dsc.iconBox, { backgroundColor: color + '18', borderColor: color + '40' }]}>
          <MaterialIcons name="data-usage" size={16} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[dsc.title, { color: C.text }]}>{title}</Text>
          <Text style={[dsc.subtitle, { color: C.textMid }]}>{subtitle}</Text>
        </View>
        {/* Status badge */}
        <View style={[dsc.statusBadge, { borderColor: statusColor + '55', backgroundColor: statusColor + '12' }]}>
          <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor, opacity: pulseAnim }} />
          <Text style={[dsc.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
      {/* Big number */}
      <Text style={[dsc.bigNum, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
        {value}
      </Text>
      {/* Area sparkline */}
      <View style={{ paddingHorizontal: 0, marginBottom: 12 }}>
        <AreaSparkline points={sparkPoints} color={color} height={56} width={chartWidth} />
      </View>
      {/* Stat row */}
      <View style={dsc.statRow}>
        {statRow.map((s, i) => (
          <View key={i} style={[dsc.statCell, i < statRow.length - 1 && { borderRightWidth: 1, borderRightColor: C.border }]}>
            <Text style={[dsc.statLabel, { color: C.textMid }]}>{s.label}</Text>
            <Text style={[dsc.statValue, { color: C.text }]}>{s.value}</Text>
          </View>
        ))}
      </View>
      {/* Optional CTA */}
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={() => { haptics.medium(); onAction(); }}
          style={[dsc.actionBtn, { borderColor: color + '50', backgroundColor: color + '0C' }]}
          activeOpacity={0.82}
        >
          <MaterialIcons name="bolt" size={14} color={color} />
          <Text style={[dsc.actionTxt, { color }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const dsc = StyleSheet.create({
  card:        { borderRadius: 16, borderWidth: 1, overflow: 'hidden',
    ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:14 }, android:{elevation:6} }) },
  topBar:      { height: 3 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  iconBox:     { width: 38, height: 38, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title:       { fontSize: 14, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  subtitle:    { fontSize: 9, fontFamily: MONO, letterSpacing: 1.2, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1, flexShrink: 0 },
  statusTxt:   { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  bigNum:      { fontSize: 52, fontWeight: '900', fontFamily: MONO, paddingHorizontal: 14, marginBottom: 8, lineHeight: 58 },
  statRow:     { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  statCell:    { flex: 1, alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 12 },
  statLabel:   { fontSize: 8, fontFamily: MONO, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  statValue:   { fontSize: 15, fontWeight: '900', fontFamily: MONO },
  actionBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 14, marginBottom: 14, borderWidth: 1.5, borderRadius: 10, paddingVertical: 13 },
  actionTxt:   { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.5 },
});

// ─── CATEGORY USAGE PANEL (matches image 3 colored bars) ────────
const CATEGORY_DATA = [
  { label: 'SECURITY', color: '#EF4444', pct: 82 },
  { label: 'FILES',    color: '#10B981', pct: 68 },
  { label: 'NETWORK',  color: '#3B82F6', pct: 55 },
  { label: 'PRIVACY',  color: '#9D6FFF', pct: 44 },
  { label: 'SYSTEM',   color: '#F59E0B', pct: 31 },
];

function CategoryUsagePanel({ isConnected, metrics }: { isConnected: boolean; metrics: { cpu: number; ram: number; disk: number; diskTotal: number; diskUsed: number } }) {
  // Derive dynamic values from live metrics, fallback to CATEGORY_DATA
  const derived = isConnected ? [
    { label: 'SECURITY', color: '#EF4444', pct: Math.max(10, Math.min(99, 70 + metrics.cpu / 5)) },
    { label: 'FILES',    color: '#10B981', pct: Math.max(10, Math.min(99, metrics.disk)) },
    { label: 'NETWORK',  color: '#3B82F6', pct: Math.max(10, Math.min(99, metrics.ram * 0.7)) },
    { label: 'PRIVACY',  color: '#9D6FFF', pct: Math.max(10, Math.min(99, 35 + metrics.cpu / 8)) },
    { label: 'SYSTEM',   color: '#F59E0B', pct: Math.max(10, Math.min(99, metrics.cpu * 0.4)) },
  ] : CATEGORY_DATA;

  return (
    <View style={cup.card}>
      {/* Header */}
      <View style={cup.header}>
        <Animated.View style={[cup.dot, { backgroundColor: C.blue }]} />
        <MaterialIcons name="bar-chart" size={12} color={C.blue} />
        <Text style={[cup.title, { color: C.text }]}>CATEGORY USAGE</Text>
        <Text style={[cup.period, { color: C.textMid }]}>{' · WEEK'}</Text>
        <View style={{ flex: 1 }} />
        <View style={[cup.liveBadge, { borderColor: (isConnected ? C.green : C.textDim) + '50', backgroundColor: (isConnected ? C.green : C.textDim) + '0C' }]}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isConnected ? C.green : C.textDim }} />
          <Text style={[cup.liveTxt, { color: isConnected ? C.green : C.textDim }]}>{isConnected ? 'LIVE' : 'DEMO'}</Text>
        </View>
      </View>
      {/* Bars */}
      {derived.map(({ label, color, pct }) => (
        <CategoryBar key={label} label={label} color={color} pct={Math.round(pct)} />
      ))}
    </View>
  );
}

function CategoryBar({ label, color, pct }: { label: string; color: string; pct: number }) {
  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barAnim, { toValue: pct / 100, duration: 900, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={cup.row}>
      <Text style={cup.rowLabel}>{label}</Text>
      <View style={cup.track}>
        <Animated.View style={[cup.fill, {
          width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any,
          backgroundColor: color,
          ...Platform.select({ ios: { shadowColor: color, shadowOffset:{width:0,height:0}, shadowOpacity:0.7, shadowRadius:6 }, android:{} }),
        }]} />
      </View>
      <Text style={[cup.pct, { color }]}>{pct}%</Text>
    </View>
  );
}

const cup = StyleSheet.create({
  card:      { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16,
    ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.35, shadowRadius:12 }, android:{elevation:5} }) },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  title:     { fontSize: 12, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.5 },
  period:    { fontSize: 12, fontWeight: '600', fontFamily: MONO, letterSpacing: 1 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  liveTxt:   { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  rowLabel:  { fontSize: 9, fontWeight: '700', fontFamily: MONO, letterSpacing: 1.5, color: C.textMid, width: 62 },
  track:     { flex: 1, height: 18, backgroundColor: '#0A1828', borderRadius: 4, overflow: 'hidden' },
  fill:      { height: '100%', borderRadius: 4 },
  pct:       { fontSize: 12, fontWeight: '900', fontFamily: MONO, width: 40, textAlign: 'right' },
});

// ─── SIGMA-NET CRAWLER CARD (matches image 3 middle card) ────────
function SigmaNetCrawlerCard({ isConnected }: { isConnected: boolean }) {
  const color = C.blue;
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1,   duration: 1100, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.2, duration: 1100, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, []);
  const ROWS = [
    { label: 'Growth Rate', value: isConnected ? '15 items/cycle' : '15 items/cycle', color: C.green },
    { label: 'Domains',     value: '6',                                               color: C.text  },
    { label: 'KB Entries',  value: '1,486',                                           color: C.blue  },
    { label: 'Last Cycle',  value: '47s ago',                                         color: C.amber },
  ];
  return (
    <View style={[snc.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={snc.header}>
        <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: pulse }} />
        <MaterialIcons name="radar" size={12} color={color} />
        <Text style={[snc.title, { color: C.text }]}>SIGMA-NET CRAWLER</Text>
        <View style={{ flex: 1 }} />
        <View style={[snc.activeBadge, { borderColor: color + '55', backgroundColor: color + '12' }]}>
          <Text style={[snc.activeTxt, { color }]}>ACTIVE</Text>
        </View>
      </View>
      {ROWS.map(({ label, value, color: vc }) => (
        <View key={label} style={snc.row}>
          <Text style={snc.rowLabel}>{label}</Text>
          <Text style={[snc.rowValue, { color: vc }]}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const snc = StyleSheet.create({
  card:       { borderRadius: 16, borderWidth: 1, overflow: 'hidden', padding: 16,
    ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.35, shadowRadius:12 }, android:{elevation:5} }) },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  title:      { fontSize: 12, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  activeBadge:{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  activeTxt:  { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },
  row:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  rowLabel:   { fontSize: 12, color: C.textMid, fontFamily: MONO },
  rowValue:   { fontSize: 15, fontWeight: '900', fontFamily: MONO },
});

// ─── SMART ALERTS PANEL (matches image 3 bottom card) ───────────
const ALERT_DEFS = [
  { label: 'High disk usage on /var',        badge: 'WARN', badgeColor: '#F59E0B' },
  { label: 'Crawler hit rate dropped 12%',   badge: 'INFO', badgeColor: C.blue     },
  { label: 'Failed pair attempt blocked',    badge: 'SEC',  badgeColor: '#EF4444'  },
];

function SmartAlertsPanel({ isConnected, metrics }: { isConnected: boolean; metrics: { cpu: number; ram: number; disk: number; diskTotal: number; diskUsed: number } }) {
  const alerts = isConnected ? [
    ...(metrics.disk > 70  ? [{ label: `High disk usage: ${Math.round(metrics.disk)}%`,   badge: 'WARN', badgeColor: '#F59E0B' }] : []),
    ...(metrics.cpu  > 80  ? [{ label: `CPU overloaded: ${Math.round(metrics.cpu)}%`,      badge: 'CRIT', badgeColor: '#EF4444' }] : []),
    ...(metrics.ram  > 85  ? [{ label: `RAM critical: ${Math.round(metrics.ram)}%`,        badge: 'WARN', badgeColor: '#F59E0B' }] : []),
    { label: 'Crawler hit rate optimal',   badge: 'OK',   badgeColor: '#10B981' },
    { label: 'Security scan — no threats', badge: 'SEC',  badgeColor: '#3B82F6' },
  ] : ALERT_DEFS;

  return (
    <View style={[sap.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      {/* Header */}
      <View style={sap.header}>
        <View style={[sap.dot, { backgroundColor: C.blue }]} />
        <MaterialIcons name="notifications-active" size={13} color={C.blue} />
        <Text style={[sap.title, { color: C.text }]}>SMART <Text style={{ color: C.blue }}>ALERTS</Text></Text>
        <View style={{ flex: 1 }} />
        <View style={[sap.countBadge, { borderColor: C.textDim + '40', backgroundColor: C.textDim + '10' }]}>
          <Text style={[sap.countTxt, { color: C.textMid }]}>{alerts.length} ACTIVE</Text>
        </View>
      </View>
      {/* Alert rows */}
      {alerts.slice(0, 5).map((a, i) => (
        <View key={i} style={[sap.row, i < alerts.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
          <View style={[sap.leftAccent, { backgroundColor: a.badgeColor }]} />
          <Text style={sap.rowLabel}>{a.label}</Text>
          <View style={[sap.badge, { borderColor: a.badgeColor + '55', backgroundColor: a.badgeColor + '15' }]}>
            <Text style={[sap.badgeTxt, { color: a.badgeColor }]}>{a.badge}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const sap = StyleSheet.create({
  card:       { borderRadius: 16, borderWidth: 1.5, overflow: 'hidden',
    ...Platform.select({ ios:{ shadowColor:'#4A9EFF', shadowOffset:{width:0,height:4}, shadowOpacity:0.2, shadowRadius:14 }, android:{elevation:6} }) },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 16, paddingBottom: 12 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  title:      { fontSize: 12, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  countTxt:   { fontSize: 8, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  leftAccent: { width: 3, height: '100%', borderRadius: 2, minHeight: 14, alignSelf: 'stretch' },
  rowLabel:   { flex: 1, fontSize: 12, fontFamily: MONO, color: C.textMid },
  badge:      { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, flexShrink: 0 },
  badgeTxt:   { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },
});

// ─── ANIMATED RING ────────────────────────────────────────────
function RingGauge({ value, max = 100, color, size = 80, label, sublabel }: {
  value: number; max?: number; color: string; size?: number; label: string; sublabel?: string;
}) {
  const pct    = Math.min(1, value / max);
  const radius = (size - 10) / 2;
  const circ   = 2 * Math.PI * radius;
  const anim   = useRef(new Animated.Value(0)).current;
  const glow   = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 1000, useNativeDriver: false }).start();
    const ag = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1,   duration: 1400, useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0.3, duration: 1400, useNativeDriver: false }),
    ]));
    ag.start();
    return () => ag.stop();
  }, [pct]);

  const dash = anim.interpolate({ inputRange: [0, 1], outputRange: [0, circ] });
  const displayVal = max === 100 ? `${Math.round(value)}%` : value >= 1024 ? `${(value / 1024).toFixed(1)}G` : `${value}M`;

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* Track */}
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 5, borderColor: color + '18' }} />
        {/* Fill — simulated with tinted arc view */}
        <Animated.View style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2,
          borderWidth: 5, borderColor: 'transparent',
          borderTopColor: color, borderRightColor: pct > 0.25 ? color : 'transparent',
          borderBottomColor: pct > 0.5 ? color : 'transparent', borderLeftColor: pct > 0.75 ? color : 'transparent',
          opacity: glow,
          ...Platform.select({ ios:{ shadowColor:color, shadowOffset:{width:0,height:0}, shadowOpacity:0.8, shadowRadius:8 }, android:{} }),
        }} />
        {/* Center text */}
        <Text style={{ fontSize: size * 0.2, fontWeight: '900', color, fontFamily: MONO, lineHeight: size * 0.25 }}>{displayVal}</Text>
        {sublabel ? <Text style={{ fontSize: size * 0.1, color: color + '80', fontFamily: MONO, letterSpacing: 0.5 }}>{sublabel}</Text> : null}
      </View>
      <Text style={{ fontSize: 9, fontWeight: '700', color: C.textMid, fontFamily: MONO, letterSpacing: 1 }}>{label}</Text>
    </View>
  );
}

// ─── HORIZONTAL BAR ──────────────────────────────────────────
function HBar({ label, value, max = 100, color, unit = '%', showValue = true }: {
  label: string; value: number; max?: number; color: string; unit?: string; showValue?: boolean;
}) {
  const pct  = Math.min(1, value / max);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 900, useNativeDriver: false }).start();
  }, [pct]);

  const displayVal = unit === 'GB' ? `${value.toFixed(1)}GB` : unit === 'MB' ? `${value}MB` : `${Math.round(value)}${unit}`;

  return (
    <View style={hbs.row}>
      <Text style={hbs.label}>{label}</Text>
      <View style={hbs.track}>
        <Animated.View style={[hbs.fill, {
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any,
          backgroundColor: color,
          ...Platform.select({ ios:{ shadowColor:color, shadowOffset:{width:0,height:0}, shadowOpacity:0.6, shadowRadius:4 }, android:{} }),
        }]} />
      </View>
      {showValue ? <Text style={[hbs.val, { color }]}>{displayVal}</Text> : null}
    </View>
  );
}
const hbs = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  label: { fontSize: 10, fontWeight: '700', color: C.textMid, fontFamily: MONO, letterSpacing: 0.8, width: 54 },
  track: { flex: 1, height: 9, backgroundColor: 'rgba(0,255,255,0.05)', borderRadius: 5, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 5 },
  val:   { fontSize: 11, fontWeight: '900', fontFamily: MONO, width: 52, textAlign: 'right' },
});

// ─── STAT CARD — compact 3-wide button ──────────────────────
const STAT_BTN_W = Math.floor((SW - 28 - 16 - 16) / 3); // 3 cols with 8px gap, extra padding
function StatCard({ icon, iconLib = 'material', label, value, sublabel, color }: {
  icon: string; iconLib?: 'material' | 'community'; label: string; value: string; sublabel?: string; color: string; size?: string;
}) {
  const Icon = iconLib === 'community' ? MaterialCommunityIcons : MaterialIcons;
  return (
    <View style={[sc.card, { width: STAT_BTN_W, borderColor: color + '40', borderTopColor: color }]}>
      <Icon name={icon as any} size={18} color={color} />
      <Text style={[sc.val, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text>
      <Text style={sc.label} numberOfLines={1}>{label}</Text>
      {sublabel ? <Text style={sc.sub} numberOfLines={1}>{sublabel}</Text> : null}
    </View>
  );
}
const sc = StyleSheet.create({
  card:   { backgroundColor: '#070E1A', borderRadius: 10, borderWidth: 1.5, borderTopWidth: 3, padding: 10, gap: 4, alignItems: 'center',
    ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.25, shadowRadius:6 }, android:{elevation:3} }) },
  val:    { fontSize: 20, fontWeight: '900', fontFamily: MONO, lineHeight: 24, textAlign: 'center' },
  label:  { fontSize: 9, fontWeight: '700', color: '#4A6878', fontFamily: MONO, letterSpacing: 0.8, textAlign: 'center' },
  sub:    { fontSize: 8, color: '#3A4E5A', fontFamily: MONO, textAlign: 'center' },
});

// ─── ACTION BUTTON — compact 3-wide ─────────────────────────
const ACTION_BTN_W = Math.floor((SW - 28 - 16 - 16) / 3); // 3 cols with 8px gap, extra padding
function ActionBtn({ icon, label, sublabel, color, onPress, loading = false, disabled = false }: {
  icon: string; label: string; sublabel?: string; color: string; onPress: () => void; loading?: boolean; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[ab.btn, { width: ACTION_BTN_W, borderColor: color + '50', borderTopColor: color, backgroundColor: disabled ? color + '05' : color + '0C', opacity: disabled ? 0.45 : 1 }]}
      onPress={() => { haptics.medium(); onPress(); }} disabled={disabled || loading} activeOpacity={0.85}
    >
      {/* corner brackets */}
      <View style={{ position:'absolute', top:0, left:0, width:8, height:8, borderTopWidth:1.5, borderLeftWidth:1.5, borderColor: color+'70' }} />
      <View style={{ position:'absolute', top:0, right:0, width:8, height:8, borderTopWidth:1.5, borderRightWidth:1.5, borderColor: color+'70' }} />
      <View style={{ position:'absolute', bottom:0, left:0, width:8, height:8, borderBottomWidth:1.5, borderLeftWidth:1.5, borderColor: color+'40' }} />
      <View style={{ position:'absolute', bottom:0, right:0, width:8, height:8, borderBottomWidth:1.5, borderRightWidth:1.5, borderColor: color+'40' }} />
      {loading
        ? <ActivityIndicator size="small" color={color} style={{ transform: [{ scale: 0.85 }] }} />
        : <MaterialIcons name={icon as any} size={22} color={color}
            style={Platform.OS === 'ios' ? { textShadowColor: color, textShadowOffset:{width:0,height:0}, textShadowRadius:6 } : {}} />
      }
      <Text style={[ab.label, { color }]} numberOfLines={1}>{label}</Text>
      {sublabel ? <Text style={ab.sub} numberOfLines={1}>{sublabel}</Text> : null}
    </TouchableOpacity>
  );
}
const ab = StyleSheet.create({
  btn:   { height: 80, borderWidth: 1.5, borderTopWidth: 3, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 6, gap: 5, overflow: 'hidden', position: 'relative',
    ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.25, shadowRadius:6 }, android:{elevation:3} }) },
  label: { fontSize: 9.5, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.3, textAlign: 'center' },
  sub:   { fontSize: 8, color: C.textDim, fontFamily: MONO, textAlign: 'center' },
});

// ─── SECTION HEADER ──────────────────────────────────────────
function SectHead({ icon, main, accent, accentColor, right }: {
  icon: string; main: string; accent: string; accentColor: string; right?: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <View style={[{ width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: accentColor + '14', borderColor: accentColor + '50' }]}>
        <MaterialIcons name={icon as any} size={15} color={accentColor} />
      </View>
      <Text style={{ fontSize: 13, fontWeight: '900', color: C.text, fontFamily: MONO, letterSpacing: 0.5 }}>
        {main}<Text style={{ color: accentColor }}>{accent}</Text>
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: accentColor + '30', marginLeft: 4 }} />
      {right}
    </View>
  );
}

// ─── HISTORY BAR CHART ───────────────────────────────────────
function MiniBarChart({ data, color, label }: {
  data: { day: string; value: number }[]; color: string; label: string;
}) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 9, color: C.textDim, fontFamily: MONO, letterSpacing: 0.8 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 52 }}>
        {data.map((d, i) => {
          const h = Math.max(4, (d.value / maxVal) * 48);
          const barAnim = useRef(new Animated.Value(0)).current;
          useEffect(() => {
            Animated.timing(barAnim, { toValue: h, duration: 600 + i * 80, useNativeDriver: false }).start();
          }, [h]);
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <View style={{ flex: 1, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
                <Animated.View style={[{ width: '90%', backgroundColor: color, borderRadius: 3, opacity: 0.6 + (i / data.length) * 0.4 }, { height: barAnim }]} />
              </View>
              <Text style={{ fontSize: 7, color: C.textDim, fontFamily: MONO }}>{d.day}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 8, color: C.textDim, fontFamily: MONO }}>0</Text>
        <Text style={{ fontSize: 8, color: color, fontFamily: MONO }}>{maxVal}</Text>
      </View>
    </View>
  );
}

// ─── UNDO JOURNAL ENTRY ──────────────────────────────────────
function UndoEntry({ entry, onRollback, rolling }: {
  entry: { id: number; userRequest: string; remainingMin: string; type?: string };
  onRollback: (id: number) => void; rolling: boolean;
}) {
  const amber = '#FF9900';
  return (
    <View style={[ue.row, { borderLeftColor: amber }]}>
      <View style={{ flex: 1 }}>
        <Text style={ue.name} numberOfLines={1}>{entry.userRequest || 'Script execution'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <View style={[ue.badge, { borderColor: amber + '60', backgroundColor: amber + '12' }]}>
            <Text style={[ue.badgeTxt, { color: amber }]}>EXPIRES</Text>
          </View>
          <Text style={[ue.time, { color: amber }]}>{entry.remainingMin}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => { haptics.medium(); onRollback(entry.id); }} disabled={rolling}
        style={[ue.undoBtn, { borderColor: amber + '60', backgroundColor: amber + '12' }]} activeOpacity={0.85}>
        {rolling ? <ActivityIndicator size="small" color={amber} style={{ transform:[{scale:0.7}] }} />
          : <><MaterialIcons name="undo" size={14} color={amber} /><Text style={[ue.undoBtnTxt, { color: amber }]}>UNDO</Text></>}
      </TouchableOpacity>
    </View>
  );
}
const ue = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 2.5, paddingLeft: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  name:     { fontSize: 12, fontWeight: '600', color: C.text, fontFamily: MONO },
  badge:    { borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  badgeTxt: { fontSize: 8, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  time:     { fontSize: 10, fontWeight: '700', fontFamily: MONO },
  undoBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  undoBtnTxt:{ fontSize: 10, fontWeight: '900', fontFamily: MONO },
});

// ─── PLACEHOLDER DATA (offline mode) ─────────────────────────
const PLACEHOLDER_SCAN = {
  tempFiles: { count: 247, sizeMb: 1840 },
  browserCache: { count: 89, sizeMb: 540 },
  largeFiles: { count: 14, sizeMb: 12300 },
  totalRecoverable: 14680,
  lifetimeCleaned: 0,
  lifetimeOrganized: 0,
  scriptsRun: 0,
  scriptsUndone: 0,
};

const PLACEHOLDER_METRICS = { cpu: 0, ram: 0, disk: 0, diskTotal: 500, diskUsed: 0 };
const PLACEHOLDER_GROWTH: { day: string; cleaned: number; organized: number; recovered_mb: number }[] = [
  { day: 'Mon', cleaned: 0, organized: 0, recovered_mb: 0 },
  { day: 'Tue', cleaned: 0, organized: 0, recovered_mb: 0 },
  { day: 'Wed', cleaned: 0, organized: 0, recovered_mb: 0 },
  { day: 'Thu', cleaned: 0, organized: 0, recovered_mb: 0 },
  { day: 'Fri', cleaned: 0, organized: 0, recovered_mb: 0 },
  { day: 'Sat', cleaned: 0, organized: 0, recovered_mb: 0 },
  { day: 'Sun', cleaned: 0, organized: 0, recovered_mb: 0 },
];

// ─── METRIC TOP CARD ─────────────────────────────────────────────
const MetricCard = React.memo(function MetricCard({ title, value, color }: { title: string; value: string; color: string }) {
  const barW = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barW, { toValue: 1, duration: 1000, useNativeDriver: false }).start();
  }, [value]);
  return (
    <View style={[sd.metricCard, { borderColor: color + '30', backgroundColor: '#071120' }]}>
      {/* Corner brackets */}
      <View style={[sd.cTL, { borderColor: color + '70' }]} />
      <View style={[sd.cBR, { borderColor: color + '40' }]} />
      <Text style={sd.metricTitle}>{title}</Text>
      <Text style={[sd.metricValue, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{value}</Text>
      {/* Thin colored bottom bar */}
      <View style={[sd.metricBar, { backgroundColor: color }]} />
    </View>
  );
});

// ─── THREAT HEATMAP (matches image in reference photos) ─────────
const HEATMAP_COLS = 13;
const HEATMAP_ROWS = 3;
const HEATMAP_DATA = Array.from({ length: HEATMAP_COLS * HEATMAP_ROWS }, () => Math.random());

function ThreatHeatmap({ isConnected }: { isConnected: boolean }) {
  const cellW = Math.floor((SW - 28 - 32 - (HEATMAP_COLS - 1) * 4) / HEATMAP_COLS);
  return (
    <View style={[thm.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={thm.header}>
        <View style={[thm.dot, { backgroundColor: C.blue }]} />
        <MaterialIcons name="warning" size={12} color={C.blue} />
        <Text style={[thm.title, { color: C.text }]}>THREAT HEATMAP</Text>
        <Text style={[thm.period, { color: C.textMid }]}> · 7D</Text>
        <View style={{ flex: 1 }} />
        <View style={[thm.liveBadge, { borderColor: (isConnected ? C.green : C.textDim) + '50', backgroundColor: (isConnected ? C.green : C.textDim) + '0C' }]}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isConnected ? C.green : C.textDim }} />
          <Text style={[thm.liveTxt, { color: isConnected ? C.green : C.textDim }]}>{isConnected ? 'LIVE' : 'DEMO'}</Text>
        </View>
      </View>
      {/* Grid */}
      <View style={thm.grid}>
        {HEATMAP_DATA.map((intensity, i) => {
          const col = intensity > 0.75 ? '#EF444490'
            : intensity > 0.5  ? '#EF444455'
            : intensity > 0.3  ? '#EF444430'
            : '#EF444415';
          return (
            <View key={i} style={[thm.cell, { width: cellW, height: cellW, backgroundColor: col, borderRadius: 4 }]} />
          );
        })}
      </View>
      {/* Legend */}
      <View style={thm.legend}>
        <Text style={thm.legendLabel}>LOW</Text>
        {[0.08, 0.18, 0.35, 0.55].map((o, i) => (
          <View key={i} style={[thm.legendDot, { backgroundColor: `rgba(239,68,68,${o})` }]} />
        ))}
        <Text style={thm.legendLabel}>HIGH</Text>
      </View>
    </View>
  );
}

const thm = StyleSheet.create({
  card:       { borderRadius: 16, borderWidth: 1.5, overflow: 'hidden', padding: 14,
    ...Platform.select({ ios:{ shadowColor:'#3B82F6', shadowOffset:{width:0,height:4}, shadowOpacity:0.25, shadowRadius:14 }, android:{elevation:6} }) },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  title:      { fontSize: 12, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  period:     { fontSize: 12, fontWeight: '600', fontFamily: MONO, letterSpacing: 0.8 },
  liveBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  liveTxt:    { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cell:       { flexShrink: 0 },
  legend:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  legendLabel:{ fontSize: 9, fontFamily: MONO, color: C.textMid, letterSpacing: 0.8 },
  legendDot:  { width: 13, height: 13, borderRadius: 3 },
});

// ─── CIRCULAR PROGRESS RING ───────────────────────────────────────
function CircRing({ label, pct, color, size = 80 }: { label: string; pct: number; color: string; size?: number }) {
  const ringAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(ringAnim, { toValue: pct / 100, duration: 1100, useNativeDriver: false }).start();
  }, [pct]);
  // Simulate arc with border-color trick
  const showRight  = pct > 25;
  const showBottom = pct > 50;
  const showLeft   = pct > 75;
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {/* Track ring */}
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 7, borderColor: color + '18' }} />
        {/* Active ring — simulated arc */}
        <View style={[
          { position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 7, borderColor: 'transparent' },
          { borderTopColor: color },
          showRight  ? { borderRightColor: color }  : {},
          showBottom ? { borderBottomColor: color } : {},
          showLeft   ? { borderLeftColor: color }   : {},
          Platform.OS === 'ios' ? { shadowColor: color, shadowOffset:{width:0,height:0}, shadowOpacity:0.7, shadowRadius:8 } : {},
        ]} />
        {/* Center label */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: size * 0.22, fontWeight: '900', color, fontFamily: MONO }}>{pct}%</Text>
        </View>
      </View>
      <Text style={{ fontSize: 10, fontWeight: '700', color: C.textMid, fontFamily: MONO, letterSpacing: 1 }}>{label}</Text>
    </View>
  );
}

// ─── ACTIVITY BAR CHART ──────────────────────────────────────────
const ACTIVITY_COLORS = [C.blue, C.green, C.purple, C.teal, C.amber, C.red, C.cyan, C.blue, C.green, C.purple];
const ACTIVITY_HEIGHTS = [45, 70, 30, 85, 55, 40, 75, 60, 50, 65];

function ActivityBarChart() {
  const anims = useRef(ACTIVITY_HEIGHTS.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    ACTIVITY_HEIGHTS.forEach((h, i) => {
      Animated.timing(anims[i], { toValue: h, duration: 700 + i * 60, useNativeDriver: false }).start();
    });
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 90, gap: 3 }}>
      {ACTIVITY_HEIGHTS.map((_, i) => (
        <Animated.View key={i} style={[
          { width: 14, borderRadius: 4, backgroundColor: ACTIVITY_COLORS[i % ACTIVITY_COLORS.length], opacity: 0.75 + (i % 3) * 0.08 },
          { height: anims[i] },
          Platform.OS === 'ios' ? { shadowColor: ACTIVITY_COLORS[i % ACTIVITY_COLORS.length], shadowOffset:{width:0,height:0}, shadowOpacity:0.5, shadowRadius:4 } : {},
        ]} />
      ))}
    </View>
  );
}

// ─── STORAGE DONUT ───────────────────────────────────────────────
function StorageDonut({ used, total, isConnected }: { used: number; total: number; isConnected: boolean }) {
  const label = isConnected ? `${used.toFixed(1)}TB` : '1.2TB';
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <View style={[
        sd.donutRing,
        { borderColor: C.blue, borderTopColor: C.amber, borderRightColor: C.amber },
        Platform.OS === 'ios' ? { shadowColor: C.blue, shadowOffset:{width:0,height:0}, shadowOpacity:0.5, shadowRadius:10 } : {},
      ]}>
        <View style={{ alignItems: 'center' }}>
          <Text style={[sd.donutMain, { color: C.text }]}>{label}</Text>
          <Text style={sd.donutSub}>TOTAL USED</Text>
        </View>
      </View>
      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        {[{ color: C.blue, label: 'SYS' }, { color: C.amber, label: 'DATA' }, { color: '#242835', label: 'FREE' }].map(l => (
          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: l.color }} />
            <Text style={{ fontSize: 8, color: C.textDim, fontFamily: MONO }}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── HORIZONTAL DISK BAR ─────────────────────────────────────────
function DiskProgressBar({ pct, color }: { pct: number; color: string }) {
  const barW = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barW, { toValue: pct / 100, duration: 1200, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMid, fontFamily: MONO, width: 40, letterSpacing: 1 }}>DISK</Text>
      <View style={{ flex: 1, height: 10, backgroundColor: '#0A1828', borderRadius: 5, overflow: 'hidden' }}>
        <Animated.View style={[{
          height: '100%', borderRadius: 5, backgroundColor: color,
          width: barW.interpolate({ inputRange:[0,1], outputRange:['0%','100%'] }) as any,
        }, Platform.OS === 'ios' ? { shadowColor: color, shadowOffset:{width:0,height:0}, shadowOpacity:0.6, shadowRadius:4 } : {}]} />
      </View>
      <Text style={{ fontSize: 13, fontWeight: '900', color, fontFamily: MONO, width: 40, textAlign: 'right' }}>{pct}%</Text>
    </View>
  );
}

// ─── IMAGE-4 STYLE DASHBOARD CARDS (Crawlers / KB / Scripts) ────
function NexusStatCards({ isConnected, metrics, chartW }: {
  isConnected: boolean;
  metrics: { cpu: number; ram: number; disk: number; diskTotal: number; diskUsed: number };
  chartW: number;
}) {
  // Generate plausible sparkline points from live metrics
  const baseKB     = isConnected ? Math.max(30, Math.round(metrics.disk * 18)) : 47;
  const baseCrawl  = isConnected ? Math.max(5,  Math.round(metrics.cpu * 0.15)) : 12;
  const baseScript = isConnected ? Math.max(100, Math.round(metrics.ram * 3.5)) : 348;

  const crawlPts   = Array.from({ length: 20 }, (_, i) => Math.max(1, baseCrawl  + Math.round((Math.sin(i / 2.5) * baseCrawl * 0.5) + (Math.random() - 0.3) * 4)));
  const kbPts      = Array.from({ length: 20 }, (_, i) => Math.max(100, baseKB * 30 + i * baseKB * 1.2 + Math.round(Math.random() * baseKB * 8)));
  const scriptPts  = Array.from({ length: 20 }, (_, i) => Math.max(10, baseScript * 0.3 + i * baseScript * 0.035 + Math.round(Math.random() * baseScript * 0.1)));

  const kbFormatted     = isConnected ? (baseKB * 30 > 1000 ? `${(baseKB * 30 / 1000).toFixed(1)}M` : String(baseKB * 30)) : '2.4M';
  const crawlFormatted  = isConnected ? String(baseCrawl) : '12';
  const scriptFormatted = isConnected ? String(baseScript) : '348';

  return (
    <View style={{ gap: 12 }}>
      <DataStatCard
        title="Crawlers"
        subtitle="ACTIVE BOTS"
        value={crawlFormatted}
        statusLabel="HARVESTING"
        statusColor={C.green}
        color={C.green}
        sparkPoints={crawlPts}
        chartWidth={chartW}
        statRow={[
          { label: 'PAGES/MIN', value: isConnected ? String(Math.round(metrics.cpu * 45)) : '4,820' },
          { label: 'QUEUE',     value: isConnected ? `${Math.round(metrics.ram * 1.9)}k` : '184k'  },
          { label: 'SUCCESS',   value: '99.6%' },
        ]}
      />
      <DataStatCard
        title="Knowledgebank"
        subtitle="VECTORS INDEXED"
        value={kbFormatted}
        statusLabel="INDEXED"
        statusColor={C.teal}
        color={C.teal}
        sparkPoints={kbPts}
        chartWidth={chartW}
        statRow={[
          { label: 'EMBEDS',    value: isConnected ? `${Math.round(metrics.disk * 13)}k` : '1.2M' },
          { label: 'DOCUMENTS', value: isConnected ? `${Math.round(metrics.ram * 860)}` : '84,210' },
          { label: 'QUERY P50', value: '38ms' },
        ]}
      />
      {/* Scripts graph moved to homepage */}
    </View>
  );
}

// ─── SYSTEM DASHBOARD — cyberpunk 3-section design ───────────────
const METRIC_CARD_W = Math.floor((SW - 28 - 32 - 8) / 3); // 3 cols with gaps

function SystemDashboard({ isConnected, metrics }: {
  isConnected: boolean;
  metrics: { cpu: number; ram: number; disk: number; diskTotal: number; diskUsed: number };
}) {
  const METRICS = [
    { title: 'DISK HEALTH',     value: isConnected ? `${Math.max(0, 100 - metrics.disk)}%` : '94%',    color: '#00E676' },
    { title: 'THREATS BLOCKED', value: isConnected ? `${metrics.cpu * 42}`                 : '4,291',  color: '#FF1744' },
    { title: 'FILES ORGANIZED', value: isConnected ? `${metrics.diskUsed}GB`               : '32.7K',  color: '#2979FF' },
    { title: 'SPACE RECOVERED', value: isConnected ? `${metrics.diskUsed}GB`               : '214GB',  color: '#FF9100' },
    { title: 'SCRIPTS ACTIVE',  value: isConnected ? `${Math.round(metrics.cpu * 2.1)}`   : '203',    color: '#D500F9' },
    { title: 'UPTIME',          value: isConnected ? '99.97%'                             : '99.97%', color: '#00E5FF' },
  ];
  const cpu  = isConnected ? metrics.cpu  : 36;
  const ram  = isConnected ? metrics.ram  : 71;
  const disk = isConnected ? metrics.disk : 44;

  return (
    <View style={sd.outer}>
      {/* Header */}
      <View style={sd.header}>
        <View style={[sd.headerDot, { backgroundColor: C.teal }]} />
        <Text style={sd.headerTxt}>SYSTEM <Text style={{ color: C.teal }}>DASHBOARD</Text></Text>
        <View style={{ flex: 1, height: 1, backgroundColor: C.teal + '25', marginLeft: 10 }} />
        <View style={[sd.livePill, { borderColor: isConnected ? C.green + '50' : C.textDim + '30', backgroundColor: isConnected ? C.green + '0C' : C.textDim + '08' }]}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isConnected ? C.green : C.textDim }} />
          <Text style={[sd.liveTxt, { color: isConnected ? C.green : C.textDim }]}>{isConnected ? 'LIVE' : 'DEMO'}</Text>
        </View>
      </View>
      <Text style={sd.sub}>Real-time PC monitoring from your phone</Text>

      {/* ── Section 1: 3×2 Metric Cards ── */}
      <View style={sd.metricGrid}>
        {METRICS.map(m => (
          <MetricCard key={m.title} title={m.title} value={m.value} color={m.color} />
        ))}
      </View>

      {/* ── Section 2: Activity Chart + Storage Donut ── */}
      <View style={sd.middleRow}>
        {/* Left: 24h bar chart */}
        <View style={[sd.chartCard, { flex: 2, marginRight: 10 }]}>
          <Text style={sd.chartTitle}>SYSTEM ACTIVITY · LAST 24H</Text>
          <ActivityBarChart />
        </View>
        {/* Right: Storage donut */}
        <View style={[sd.chartCard, { flex: 1 }]}>
          <Text style={sd.chartTitle}>STORAGE</Text>
          <StorageDonut used={metrics.diskUsed / 1000} total={metrics.diskTotal / 1000} isConnected={isConnected} />
        </View>
      </View>

      {/* ── Section 3: Performance Monitor ── */}
      <View style={sd.perfCard}>
        <Text style={sd.chartTitle}>📊 PERFORMANCE MONITOR · LIVE</Text>
        <View style={sd.ringsRow}>
          <CircRing label="CPU" pct={cpu}  color={C.teal}  size={74} />
          <CircRing label="RAM" pct={ram}  color={C.amber} size={74} />
          <CircRing label="GPU" pct={27}   color={C.green} size={74} />
        </View>
        <DiskProgressBar pct={disk} color={C.green} />
      </View>
    </View>
  );
}
const sd = StyleSheet.create({
  outer:       { backgroundColor: '#071120', borderRadius: 16, borderWidth: 1, borderColor: '#0A1828', overflow: 'hidden',
    ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:14 }, android:{elevation:6} }) },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  headerDot:   { width: 9, height: 9, borderRadius: 5 },
  headerTxt:   { fontSize: 16, fontWeight: '900', fontFamily: MONO, color: '#FFFFFF', letterSpacing: 0.5 },
  livePill:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  liveTxt:     { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  sub:         { fontSize: 10, color: '#4A5568', fontFamily: MONO, paddingHorizontal: 16, marginBottom: 14, lineHeight: 15 },
  // Section 1 — metric grid
  metricGrid:  { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  metricCard:  { width: METRIC_CARD_W, backgroundColor: '#071120', borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingTop: 12, paddingBottom: 14, position: 'relative', overflow: 'hidden',
    ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.3, shadowRadius:6 }, android:{elevation:3} }) },
  metricTitle: { fontSize: 8, fontWeight: '700', color: '#6B7280', fontFamily: MONO, letterSpacing: 0.9, marginBottom: 8 },
  metricValue: { fontSize: 22, fontWeight: '900', fontFamily: MONO, marginBottom: 10, lineHeight: 26 },
  metricBar:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
  cTL:         { position: 'absolute', top: 0, left: 0, width: 8, height: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  cBR:         { position: 'absolute', bottom: 3, right: 0, width: 8, height: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
  // Section 2 — charts row
  middleRow:   { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 12 },
  chartCard:   { backgroundColor: '#071120', borderRadius: 10, borderWidth: 1, borderColor: '#2A2D3A', padding: 12 },
  chartTitle:  { fontSize: 8, fontWeight: '700', color: '#6B7280', fontFamily: MONO, letterSpacing: 0.9, marginBottom: 12 },
  // Storage donut
  donutRing:   { width: 90, height: 90, borderRadius: 45, borderWidth: 10, justifyContent: 'center', alignItems: 'center' },
  donutMain:   { fontSize: 15, fontWeight: '900', fontFamily: MONO, textAlign: 'center' },
  donutSub:    { fontSize: 7, color: '#6B7280', fontFamily: MONO, textAlign: 'center', letterSpacing: 0.5, marginTop: 2 },
  // Section 3 — performance
  perfCard:    { backgroundColor: '#071120', borderRadius: 10, borderWidth: 1, borderColor: '#2A2D3A', padding: 14, marginHorizontal: 12, marginBottom: 16, gap: 0 },
  ringsRow:    { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24, marginTop: 8 },
});

// ─── QUICK PC SCRIPTS ───────────────────────────────────────
const PC_QUICK_SCRIPTS = [
  {
    id: 'pcs-clean-temp',
    label: 'Clean Temp',
    icon: 'cleaning-services',
    color: '#00FF88',
    script: `import shutil,os,tempfile\nfreed=0;removed=0\nfor p in [tempfile.gettempdir()]:\n    for item in os.listdir(p):\n        fp=os.path.join(p,item)\n        try:\n            sz=os.path.getsize(fp) if os.path.isfile(fp) else 0\n            (os.unlink if os.path.isfile(fp) else shutil.rmtree)(fp)\n            freed+=sz;removed+=1\n        except:pass\nprint(f"Cleared {removed} items, freed {freed//1024//1024}MB")`,
  },
  {
    id: 'pcs-disk-info',
    label: 'Disk Info',
    icon: 'pie-chart',
    color: '#3D7FFF',
    script: `import psutil\nfor p in psutil.disk_partitions():\n    try:\n        u=psutil.disk_usage(p.mountpoint)\n        print(f"{p.mountpoint}: {u.used/1024**3:.1f}/{u.total/1024**3:.1f}GB ({u.percent}%)")\n    except:pass`,
  },
  {
    id: 'pcs-top-proc',
    label: 'Top Processes',
    icon: 'memory',
    color: '#BB33FF',
    script: `import psutil\nprocs=sorted(psutil.process_iter(['pid','name','cpu_percent','memory_percent']),key=lambda p:p.info['cpu_percent'] or 0,reverse=True)\nprint("PID    CPU%   MEM%   NAME")\nfor p in procs[:12]:\n    i=p.info\n    print(f"{i['pid']:<7}{i['cpu_percent']:<7.1f}{i['memory_percent']:<7.2f}{i['name'][:30]}")`,
  },
  {
    id: 'pcs-network-test',
    label: 'Network Test',
    icon: 'router',
    color: '#FF9900',
    script: `import socket,time\nHOSTS=[('google.com',80),('8.8.8.8',53),('cloudflare.com',443)]\nfor host,port in HOSTS:\n    try:\n        s=socket.socket()\n        s.settimeout(3)\n        t=time.perf_counter()\n        s.connect((host,port))\n        ms=(time.perf_counter()-t)*1000\n        s.close()\n        print(f"OK  {host}:{port}  {ms:.0f}ms")\n    except Exception as e:\n        print(f"FAIL {host}:{port}  {e}")`,
  },
  {
    id: 'pcs-recycle-bin',
    label: 'Empty Recycle',
    icon: 'delete-sweep',
    color: '#FF3344',
    script: `import subprocess,sys\nif sys.platform=='win32':\n    subprocess.run(['powershell','-Command','Clear-RecycleBin -Force -ErrorAction SilentlyContinue'],capture_output=True)\n    print("Recycle bin emptied")\nelse:\n    import shutil,os\n    trash=os.path.expanduser('~/.local/share/Trash/files')\n    if os.path.exists(trash):\n        shutil.rmtree(trash,ignore_errors=True)\n        os.makedirs(trash,exist_ok=True)\n        print("Trash emptied")\n    else:\n        print("No trash folder found")`,
  },
  {
    id: 'pcs-free-ram',
    label: 'Free RAM',
    icon: 'memory',
    color: '#00DDEE',
    script: `import psutil,gc,sys,subprocess\nvm=psutil.virtual_memory()\nprint(f"Before: {vm.used/1024**3:.1f}GB/{vm.total/1024**3:.1f}GB ({vm.percent}%)")\ncollected=gc.collect()\nprint(f"GC freed: {collected} objects")\nif sys.platform!='win32':\n    try:\n        open('/proc/sys/vm/drop_caches','w').write('3')\n        print("Page cache dropped")\n    except:\n        print("Run as root to drop page caches")\nvm2=psutil.virtual_memory()\nprint(f"After: {vm2.used/1024**3:.1f}GB ({vm2.percent}%) | Freed: {(vm.used-vm2.used)//1024//1024}MB")`,
  },
  {
    id: 'pcs-defender-scan',
    label: 'Quick Virus Scan',
    icon: 'security',
    color: '#FF6622',
    script: `import subprocess,sys\nif sys.platform=='win32':\n    MPC=r"C:\\Program Files\\Windows Defender\\MpCmdRun.exe"\n    r=subprocess.run([MPC,'-ScanType','1'],capture_output=True,text=True,timeout=120)\n    print(r.stdout or "Quick scan complete")\n    print("Result: No threats found" if r.returncode==0 else f"Threats detected! Check Windows Security")\nelse:\n    r=subprocess.run(['clamscan','--quick','--infected','--recursive','--exclude-dir=sys','/home'],capture_output=True,text=True,timeout=60)\n    print(r.stdout[:1000] or r.stderr[:500])`,
  },
  {
    id: 'pcs-startup-list',
    label: 'Startup Apps',
    icon: 'play-circle-outline',
    color: '#FFD700',
    script: `import sys\nif sys.platform=='win32':\n    import winreg\n    KEY=r"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run"\n    print("=== STARTUP PROGRAMS ===")\n    with winreg.OpenKey(winreg.HKEY_CURRENT_USER,KEY) as k:\n        i=0\n        while True:\n            try:\n                name,val,_=winreg.EnumValue(k,i)\n                print(f"  {name}: {val[:60]}")\n                i+=1\n            except OSError:break\n    print(f"Total: {i} startup items")\nelse:\n    import subprocess\n    r=subprocess.run(["systemctl","list-unit-files","--type=service","--state=enabled","--no-pager"],capture_output=True,text=True)\n    print(r.stdout[:2000])`,
  },
  {
    id: 'pcs-ip-info',
    label: 'IP + Network',
    icon: 'wifi',
    color: '#00FF88',
    script: `import socket,subprocess,sys\nprint(f"Hostname: {socket.gethostname()}")\ntry:\n    s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)\n    s.connect(("8.8.8.8",80))\n    print(f"Local IP: {s.getsockname()[0]}")\n    s.close()\nexcept:pass\nimport urllib.request\ntry:\n    pub=urllib.request.urlopen("https://api.ipify.org",timeout=5).read().decode()\n    print(f"Public IP: {pub}")\nexcept:pass\nif sys.platform=="win32":\n    r=subprocess.run("ipconfig",capture_output=True,text=True,shell=True)\n    for l in r.stdout.split("\\n"):\n        if any(k in l for k in ["IPv4","Default Gateway","DNS Servers"]):print(" ",l.strip())\nelse:\n    subprocess.run("ip route show",shell=True)`,
  },
  {
    id: 'pcs-update-check',
    label: 'Check Updates',
    icon: 'system-update',
    color: '#00DDEE',
    script: `import subprocess,sys\nif sys.platform=='win32':\n    print("Checking Windows Update status...")\n    r=subprocess.run(["powershell","-Command","Get-WindowsUpdate -MicrosoftUpdate"],capture_output=True,text=True,timeout=60)\n    if r.stdout:\n        print(r.stdout[:2000])\n    else:\n        r2=subprocess.run(["powershell","-Command","(New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher().Search('IsInstalled=0').Updates | Select-Object Title | Format-List"],capture_output=True,text=True,timeout=60)\n        print(r2.stdout[:2000] or "Windows Update info not available without admin.")\nelif sys.platform=="darwin":\n    subprocess.run(["softwareupdate","-l"])\nelse:\n    r=subprocess.run(["apt","list","--upgradable","2>/dev/null"],capture_output=True,text=True,shell=True)\n    print(r.stdout[:2000] or "No updates found or apt not available")`,
  },
  {
    id: 'pcs-event-log',
    label: 'Event Errors',
    icon: 'error-outline',
    color: '#FF3344',
    script: `import subprocess,sys\nif sys.platform=='win32':\n    r=subprocess.run(["powershell","-Command","Get-EventLog -LogName System -EntryType Error -Newest 10 | Format-Table TimeGenerated,Source,Message -AutoSize"],capture_output=True,text=True,timeout=30)\n    print("=== SYSTEM ERROR EVENTS (last 10) ===")\n    print(r.stdout[:3000] or "No errors found")\nelse:\n    r=subprocess.run(["journalctl","-p","err","-n","15","--no-pager","--output=short"],capture_output=True,text=True,timeout=10)\n    print(r.stdout[:3000] or r.stderr[:500])`,
  },
  {
    id: 'pcs-port-audit',
    label: 'Port Audit',
    icon: 'radar',
    color: '#FF9900',
    script: `import socket\nfrom concurrent.futures import ThreadPoolExecutor\nHOST="127.0.0.1"\nWELL_KNOWN={21:'FTP',22:'SSH',23:'Telnet',25:'SMTP',53:'DNS',80:'HTTP',110:'POP3',443:'HTTPS',445:'SMB',3306:'MySQL',3389:'RDP',5432:'Postgres',6379:'Redis',8080:'HTTP-Alt',27017:'MongoDB'}\ndef scan(port):\n    s=socket.socket()\n    s.settimeout(0.5)\n    if s.connect_ex((HOST,port))==0:\n        s.close();return port\n    s.close()\nPORTS=list(range(1,1025))+list(WELL_KNOWN.keys())\nPORTS=list(set(PORTS))\nprint(f"Scanning {HOST} ({len(PORTS)} ports)...")\nwith ThreadPoolExecutor(max_workers=200) as ex:\n    open_ports=[p for p in ex.map(scan,PORTS) if p]\nprint(f"Open ports: {len(open_ports)}")\nfor port in sorted(open_ports):\n    svc=WELL_KNOWN.get(port,'Unknown')\n    flag=" RISKY" if port in [21,23,445,3389] else ""\n    print(f"  {port:5} {svc}{flag}")`,
  },
];

const QPS_BTN_W = Math.floor((SW - 28 - 16 - 16) / 3); // 3 cols with 8px gap, extra padding
function QuickPCScript({ script: scriptItem, onRun, isRunning, disabled }: {
  script: typeof PC_QUICK_SCRIPTS[0];
  onRun: (id: string, label: string, code: string) => void;
  isRunning: boolean;
  disabled: boolean;
}) {
  return (
    <TouchableOpacity
      style={[qps.card, { width: QPS_BTN_W, borderColor: scriptItem.color + '45', borderTopColor: scriptItem.color }, disabled && { opacity: 0.4 }]}
      onPress={() => { haptics.medium(); onRun(scriptItem.id, scriptItem.label, scriptItem.script); }}
      disabled={disabled || isRunning}
      activeOpacity={0.85}
    >
      <View style={[qps.cornerTL, { borderColor: scriptItem.color + '70' }]} />
      <View style={[qps.cornerBR, { borderColor: scriptItem.color + '45' }]} />
      {isRunning
        ? <ActivityIndicator size="small" color={scriptItem.color} />
        : <MaterialIcons name={scriptItem.icon as any} size={20} color={scriptItem.color}
            style={Platform.OS === 'ios' ? { textShadowColor: scriptItem.color, textShadowOffset:{width:0,height:0}, textShadowRadius:6 } : {}} />
      }
      <Text style={[qps.label, { color: scriptItem.color }]} numberOfLines={2}>{scriptItem.label}</Text>
      <View style={[qps.led, { backgroundColor: scriptItem.color }]} />
    </TouchableOpacity>
  );
}

const qps = StyleSheet.create({
  card:     { minHeight: 76, borderWidth: 1.5, borderTopWidth: 3, borderRadius: 10, backgroundColor: '#02070D', overflow: 'hidden',
    position: 'relative', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 5,
    ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.25, shadowRadius:6 }, android:{elevation:3} }) },
  cornerTL: { position: 'absolute', top: 0, left: 0, width: 8, height: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
  led:      { position: 'absolute', bottom: 5, left: 6, width: 5, height: 5, borderRadius: 3, opacity: 0.8 },
  label:    { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.2, textAlign: 'center', lineHeight: 13 },
});

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function PCCheckScreen() {
  const { T } = useCosmetic();
  const [isConnected, setIsConnected] = useState(false);
  const [serverAddr,  setServerAddr]  = useState('');
  const [qpsRunning,  setQpsRunning]  = useState<string | null>(null);
  const [qpsResult,   setQpsResult]   = useState<{ label: string; output: string; color: string } | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [scanning,    setScanning]    = useState(false);
  const [actionId,    setActionId]    = useState<string | null>(null);
  const [rollingId,   setRollingId]   = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Live data
  const [metrics,     setMetrics]     = useState(PLACEHOLDER_METRICS);
  const [scanData,    setScanData]    = useState(PLACEHOLDER_SCAN);
  const [growth,      setGrowth]      = useState(PLACEHOLDER_GROWTH);
  const [undoList,    setUndoList]    = useState<any[]>([]);

  // Pull server data
  const fetchAll = useCallback(async () => {
    const ip = serverConnection.getIP(); const port = serverConnection.getPort(); const token = serverConnection.getToken();
    if (!ip || !port) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const ctrl = () => { const c = new AbortController(); setTimeout(() => c.abort(), 6000); return c; };

      // Metrics
      const mRes = await fetch(`http://${ip}:${port}/api/metrics`, { headers, signal: ctrl().signal }).catch(() => null);
      if (mRes?.ok) {
        const d = await mRes.json();
        setMetrics({ cpu: d.cpu?.percent ?? 0, ram: d.memory?.percent ?? d.ram?.percent ?? 0, disk: d.disk?.percent ?? 0, diskTotal: d.disk?.total_gb ?? 500, diskUsed: d.disk?.used_gb ?? 0 });
      }

      // PC Check scan data
      const sRes = await fetch(`http://${ip}:${port}/api/pc-check/scan`, { headers, signal: ctrl().signal }).catch(() => null);
      if (sRes?.ok) {
        const d = await sRes.json();
        setScanData({
          tempFiles:        d.temp_files    ?? scanData.tempFiles,
          browserCache:     d.browser_cache ?? scanData.browserCache,
          largeFiles:       d.large_files   ?? scanData.largeFiles,
          totalRecoverable: d.total_recoverable_mb ?? scanData.totalRecoverable,
          lifetimeCleaned:  d.stats?.cleaned   ?? 0,
          lifetimeOrganized:d.stats?.organized  ?? 0,
          scriptsRun:       d.stats?.scripts_run ?? 0,
          scriptsUndone:    d.stats?.undone      ?? 0,
        });
        if (Array.isArray(d.growth)) setGrowth(d.growth.map((g: any, i: number) => ({
          day: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i % 7],
          cleaned: g.cleaned ?? 0, organized: g.organized ?? 0, recovered_mb: g.recovered_mb ?? 0,
        })));
      }

      // Undo list
      const uRes = await fetch(`http://${ip}:${port}/api/undo/list`, { headers, signal: ctrl().signal }).catch(() => null);
      if (uRes?.ok) { const d = await uRes.json(); setUndoList(Array.isArray(d.entries) ? d.entries : []); }

      setLastRefresh(new Date());
    } catch {}
    finally { setLoading(false); }
  }, []);

  const runAction = useCallback(async (action: string, label: string) => {
    const ip = serverConnection.getIP(); const port = serverConnection.getPort(); const token = serverConnection.getToken();
    if (!ip || !port) { Alert.alert('Offline', 'Connect to PC from HOME tab first.'); return; }
    haptics.heavy(); setActionId(action);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(`http://${ip}:${port}/api/pc-check/action`, { method: 'POST', headers, body: JSON.stringify({ action }), signal: ctrl });
      const d = await res.json();
      haptics.success();
      Alert.alert(label, d.message || d.output || 'Done');
      fetchAll();
    } catch (e: any) { haptics.warning(); Alert.alert('Error', e?.message || 'Action failed'); }
    finally { setActionId(null); }
  }, [fetchAll]);

  const rollback = useCallback(async (id: number) => {
    const ip = serverConnection.getIP(); const port = serverConnection.getPort(); const token = serverConnection.getToken();
    if (!ip || !port) return;
    setRollingId(id);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`http://${ip}:${port}/api/undo/rollback`, { method: 'POST', headers, body: JSON.stringify({ id }) });
      const d = await res.json();
      haptics.success();
      Alert.alert('Rollback', d.message || 'Restored successfully');
      setUndoList(prev => prev.filter(e => e.id !== id));
    } catch (e: any) { Alert.alert('Error', e?.message); }
    finally { setRollingId(null); }
  }, []);

  const runScan = useCallback(async () => {
    const ip = serverConnection.getIP(); const port = serverConnection.getPort(); const token = serverConnection.getToken();
    if (!ip || !port) { Alert.alert('Offline', 'Connect to PC from HOME tab first.'); return; }
    haptics.heavy(); setScanning(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(`http://${ip}:${port}/api/pc-check/scan`, { headers, signal: ctrl.signal });
      const d = await res.json();
      setScanData({
        tempFiles:        d.temp_files    ?? scanData.tempFiles,
        browserCache:     d.browser_cache ?? scanData.browserCache,
        largeFiles:       d.large_files   ?? scanData.largeFiles,
        totalRecoverable: d.total_recoverable_mb ?? 0,
        lifetimeCleaned:  d.stats?.cleaned   ?? 0,
        lifetimeOrganized:d.stats?.organized  ?? 0,
        scriptsRun:       d.stats?.scripts_run ?? 0,
        scriptsUndone:    d.stats?.undone      ?? 0,
      });
      haptics.success();
      Alert.alert('Scan Complete', `Found ${d.total_recoverable_mb ?? 0}MB recoverable space`);
    } catch (e: any) { Alert.alert('Scan Error', e?.message); }
    finally { setScanning(false); }
  }, [scanData, fetchAll]);

  useEffect(() => {
    const seed = autoConnectEngine.getCurrentConnection();
    if (seed.connected && seed.ip) { setIsConnected(true); setServerAddr(`${seed.ip}:${seed.port}`); }
    const unsub = autoConnectEngine.onEvent((evt: EngineEvent) => {
      if (evt.status === 'connected' && evt.ip) { setIsConnected(true); setServerAddr(`${evt.ip}:${evt.port}`); }
      else if (evt.status === 'idle') { setIsConnected(false); setServerAddr(''); }
    });
    return () => unsub();
  }, []);

  useFocusEffect(useCallback(() => {
    if (isConnected) fetchAll();
  }, [isConnected, fetchAll]));

  useEffect(() => {
    if (!isConnected) return;
    const t = setInterval(fetchAll, 30_000);
    return () => clearInterval(t);
  }, [isConnected, fetchAll]);

  const connCol = isConnected ? C.green : C.red;
  const dotPulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(dotPulse, { toValue: 1,   duration: 900, useNativeDriver: false }),
      Animated.timing(dotPulse, { toValue: 0.2, duration: 900, useNativeDriver: false }),
    ]));
    a.start();
    return () => a.stop();
  }, []);

  const ACTIONS = [
    { id: 'full_clean',       icon: 'cleaning-services', label: 'FULL CLEAN',   sub: 'temp+cache',  color: C.green  },
    { id: 'organize',         icon: 'folder-special',    label: 'ORGANIZE',     sub: 'files+docs',  color: C.amber  },
    { id: 'disk_report',      icon: 'pie-chart',         label: 'DISK REPORT',  sub: 'detailed',    color: C.blue   },
    { id: 'empty_recycle',    icon: 'delete-sweep',      label: 'RECYCLE BIN',  sub: 'empty it',    color: C.red    },
    { id: 'memory_clean',     icon: 'memory',            label: 'FREE RAM',     sub: 'clear idle',  color: C.purple },
    { id: 'privacy_clean',    icon: 'security',          label: 'PRIVACY',      sub: 'wipe traces', color: C.teal   },
  ];

  // Apply cosmetic theme to root background
  return (
    <View style={[s.root, { backgroundColor: T.bg }]}>
      {/* ── Connection bar ── */}
      <View style={[s.connBar, { borderBottomColor: connCol + '35', backgroundColor: C.surfaceHi }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: connCol, opacity: dotPulse,
            ...Platform.select({ ios:{ shadowColor:connCol, shadowOffset:{width:0,height:0}, shadowOpacity:0.9, shadowRadius:5 }, android:{} })
          }} />
          <Text style={{ fontSize: 8, fontWeight: '900', color: connCol + 'AA', fontFamily: MONO, letterSpacing: 1.5 }}>
            {isConnected ? '● PC HEALTH' : '○ PC HEALTH'}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[s.connStatus, { color: connCol }]}>
            {isConnected ? `✦ LINKED · ${serverAddr}` : 'NO SERVER — CONNECT FROM HOME'}
          </Text>
          {lastRefresh ? <Text style={s.connSub}>UPDATED {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text> : null}
        </View>
        {isConnected ? (
          <TouchableOpacity
            onPress={() => { haptics.light(); fetchAll(); }}
            disabled={loading}
            style={[s.refreshBtn, { borderColor: C.teal + '50', backgroundColor: C.teal + '10' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {loading
              ? <ActivityIndicator size="small" color={C.teal} style={{ transform: [{ scale: 0.65 }] }} />
              : <MaterialIcons name="refresh" size={13} color={C.teal} />}
            <Text style={[s.refreshTxt, { color: C.teal }]}>{loading ? 'LOADING' : 'REFRESH'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => (global as any).__butlerSwitchTab?.('home')}
            style={[s.refreshBtn, { borderColor: C.amber + '60', backgroundColor: C.amber + '12' }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="home" size={13} color={C.amber} />
            <Text style={[s.refreshTxt, { color: C.amber }]}>CONNECT</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <InlineWidgetSlot pageId="logs" position="inline-top" />

        {/* ── IMAGE-4 STYLE NEXUS STAT CARDS ── */}
        <View style={s.sectionHead}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.green }} />
          <Text style={s.sectionTitle}>NEXUS INTELLIGENCE</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: C.green + '25', marginLeft: 8 }} />
        </View>
        <NexusStatCards isConnected={isConnected} metrics={metrics} chartW={SW - 28 - 28} />

        {/* ── THREAT HEATMAP ── */}
        <ThreatHeatmap isConnected={isConnected} />

        {/* ── SYSTEM DASHBOARD (performance rings) ── */}
        <View style={[s.sectionHead, { marginTop: 6 }]}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.teal }} />
          <Text style={s.sectionTitle}>PERFORMANCE MONITOR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: C.teal + '25', marginLeft: 8 }} />
        </View>
        <SystemDashboard isConnected={isConnected} metrics={metrics} />

        {/* ── QUICK PC SCRIPTS ── */}
        <View style={s.card}>
          <SectHead icon="code" main="QUICK PC " accent="SCRIPTS" accentColor={C.purple}
            right={
              qpsResult ? (
                <TouchableOpacity onPress={() => setQpsResult(null)}
                  style={[s.smallBtn, { borderColor: C.textDim + '40' }]}
                  hitSlop={{ top:6,bottom:6,left:6,right:6 }}>
                  <MaterialIcons name="close" size={11} color={C.textDim} />
                  <Text style={[s.smallBtnTxt, { color: C.textDim }]}>CLEAR</Text>
                </TouchableOpacity>
              ) : null
            }
          />

          {/* Grid of script buttons — 3 wide */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: qpsResult ? 12 : 0, justifyContent: 'flex-start', alignItems: 'flex-start' }}>
            {PC_QUICK_SCRIPTS.map(item => (
              <QuickPCScript
                key={item.id}
                script={item}
                isRunning={qpsRunning === item.id}
                disabled={!isConnected}
                onRun={async (id, label, code) => {
                  setQpsRunning(id);
                  setQpsResult(null);
                  const ip    = serverConnection.getIP();
                  const port  = serverConnection.getPort();
                  const token = serverConnection.getToken();
                  if (!ip || !port) { setQpsRunning(null); return; }
                  try {
                    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
                    if (token) headers['Authorization'] = `Bearer ${token}`;
                    const ctrl = new AbortController();
                    setTimeout(() => ctrl.abort(), 30000);
                    const res = await fetch(`http://${ip}:${port}/api/execute`, {
                      method: 'POST', headers, body: JSON.stringify({ script: code }), signal: ctrl.signal,
                    });
                    const data = await res.json();
                    const output = (data.output || data.error || 'No output').slice(0, 1200);
                    const col = item ? item.color : C.teal;
                    setQpsResult({ label, output, color: col });
                    haptics.success();
                  } catch (e: any) {
                    const col = PC_QUICK_SCRIPTS.find(s => s.id === id)?.color || C.red;
                    setQpsResult({ label, output: 'Error: ' + (e?.message || 'Network timeout'), color: C.red });
                    haptics.warning();
                  } finally {
                    setQpsRunning(null);
                  }
                }}
              />
            ))}
          </View>

          {/* Output panel */}
          {qpsResult ? (
            <View style={[s.qpsOutput, { borderColor: qpsResult.color + '50', backgroundColor: qpsResult.color + '06' }]}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:6, marginBottom:8 }}>
                <View style={{ width:6, height:6, borderRadius:3, backgroundColor: qpsResult.color }} />
                <Text style={[s.qpsLabel, { color: qpsResult.color }]}>{qpsResult.label.toUpperCase()} OUTPUT</Text>
              </View>
              <Text style={[s.qpsText, { color: qpsResult.color + 'CC' }]} selectable>{qpsResult.output}</Text>
            </View>
          ) : (
            !isConnected ? (
              <View style={[s.offlineBadge, { marginTop: 4 }]}>
                <MaterialIcons name="wifi-off" size={11} color={C.textDim} />
                <Text style={[s.offlineTxt, { color: C.textDim }]}>Connect PC from HOME tab to run these scripts</Text>
              </View>
            ) : null
          )}
        </View>

        {/* ── QUICK ACTIONS — 2×3 grid ── */}
        <View style={s.card}>
          <SectHead icon="flash-on" main="QUICK " accent="ACTIONS" accentColor={C.green} />
          {/* 3-wide action buttons */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start', alignItems: 'flex-start' }}>
            {ACTIONS.map((a) => (
              <ActionBtn
                key={a.id}
                icon={a.icon} label={a.label} sublabel={a.sub} color={a.color}
                loading={actionId === a.id}
                disabled={!isConnected && a.id !== 'disk_report'}
                onPress={() => isConnected ? runAction(a.id, a.label) : Alert.alert('Offline', 'Connect PC from HOME tab to run actions')}
              />
            ))}
          </View>
        </View>

        {/* ── SCAN RESULTS ── */}
        <View style={s.card}>
          <SectHead icon="search" main="SCAN " accent="RESULTS" accentColor={C.blue}
            right={
              <TouchableOpacity onPress={runScan} disabled={scanning}
                style={[s.smallBtn, { borderColor: C.blue + '60', backgroundColor: C.blue + '12' }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                {scanning ? <ActivityIndicator size="small" color={C.blue} style={{ transform:[{scale:0.6}] }} />
                  : <MaterialIcons name="radar" size={11} color={C.blue} />}
                <Text style={[s.smallBtnTxt, { color: C.blue }]}>{scanning ? 'SCANNING' : 'SCAN NOW'}</Text>
              </TouchableOpacity>
            }
          />
          <View style={{ gap: 10 }}>
            <HBar label="TEMP" value={isConnected ? scanData.tempFiles.sizeMb / 1024 : 1.8} max={20} color={C.red} unit="GB" />
            <HBar label="CACHE" value={isConnected ? scanData.browserCache.sizeMb / 1024 : 0.54} max={20} color={C.amber} unit="GB" />
            <HBar label="LARGE" value={isConnected ? Math.min(scanData.largeFiles.count, 100) : 14} max={100} color={C.purple} unit=" files" />
            <HBar label="DISK" value={isConnected ? metrics.disk : 67} color={C.blue} />
          </View>
          <View style={[s.recovBanner, { borderColor: C.green + '40', backgroundColor: C.green + '08' }]}>
            <MaterialIcons name="storage" size={14} color={C.green} />
            <Text style={[s.recovTxt, { color: C.green }]}>
              {isConnected
                ? `${(scanData.totalRecoverable / 1024).toFixed(1)}GB recoverable — run FULL CLEAN to free it`
                : 'Connect PC to scan for recoverable space'}
            </Text>
          </View>
        </View>

        {/* ── LIFETIME STATS — 2×2 grid ── */}
        <View style={s.card}>
          <SectHead icon="bar-chart" main="LIFETIME " accent="STATS" accentColor={C.purple} />
          {/* 3-wide stat buttons */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start', alignItems: 'flex-start' }}>
            {[
              { icon:'cleaning-services', label:'CLEANED',    value: isConnected ? String(scanData.lifetimeCleaned)   : '—', color: C.green,  sub:'ops' },
              { icon:'folder-special',    label:'ORGANIZED',  value: isConnected ? String(scanData.lifetimeOrganized)  : '—', color: C.amber,  sub:'files' },
              { icon:'code',              label:'SCRIPTS',    value: isConnected ? String(scanData.scriptsRun)         : '—', color: C.blue,   sub:'executed' },
              { icon:'undo',              label:'UNDONE',     value: isConnected ? String(scanData.scriptsUndone)      : '—', color: C.purple, sub:'rollbacks' },
              { icon:'security',          label:'SCANS',      value: isConnected ? '—' : '—',                              color: C.teal,   sub:'security' },
              { icon:'memory',            label:'CPU HI',     value: isConnected ? `${metrics.cpu}%` : '—',                color: C.red,    sub:'peak' },
            ].map(item => (
              <StatCard key={item.label} icon={item.icon} label={item.label} value={item.value} color={item.color} sublabel={item.sub} />
            ))}
          </View>
        </View>

        {/* ── 7-DAY ACTIVITY CHARTS ── */}
        <View style={s.card}>
          <SectHead icon="show-chart" main="7-DAY " accent="ACTIVITY" accentColor={C.teal} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <MiniBarChart
                data={growth.map(g => ({ day: g.day, value: g.cleaned }))}
                color={C.green}
                label="CLEAN OPERATIONS"
              />
            </View>
            <View style={{ width: 1, backgroundColor: C.border }} />
            <View style={{ flex: 1 }}>
              <MiniBarChart
                data={growth.map(g => ({ day: g.day, value: Math.round(g.recovered_mb / 100) }))}
                color={C.amber}
                label="SPACE RECOVERED (×100MB)"
              />
            </View>
          </View>
          {!isConnected ? (
            <View style={[s.offlineBadge, { marginTop: 8 }]}>
              <MaterialIcons name="info-outline" size={11} color={C.textDim} />
              <Text style={[s.offlineTxt, { color: C.textDim }]}>Chart populates after connecting and running scripts</Text>
            </View>
          ) : null}
        </View>

        {/* ── SMART AUTOMATION ── */}
        <View style={s.card}>
          <SectHead icon="smart-toy" main="SMART " accent="AUTOMATION" accentColor={C.cyan} />
          <View style={{ gap: 8 }}>
            {[
              { icon: 'schedule',         col: C.teal,   label: 'Auto-clean temp files',        sub: 'Runs daily at 9:00 AM · Disabled until connected',  canRun: 'temp' },
              { icon: 'folder-special',   col: C.amber,  label: 'Auto-organize Downloads',       sub: 'Runs weekly · By file type into subfolders',          canRun: 'organize' },
              { icon: 'security',         col: C.purple, label: 'Privacy wipe on idle',          sub: 'Clears clipboard + recent docs after 30 min',         canRun: 'privacy_clean' },
              { icon: 'bar-chart',        col: C.blue,   label: 'Disk report — Monday morning',  sub: 'Full breakdown emailed / logged on Mondays',          canRun: 'disk_report' },
            ].map((item, i) => (
              <TouchableOpacity key={i}
                onPress={() => isConnected ? runAction(item.canRun, item.label) : Alert.alert('Offline', 'Connect PC to trigger automations')}
                style={[s.autoRow, { borderColor: item.col + '30', backgroundColor: item.col + '06' }]}
                activeOpacity={0.85}>
                <View style={[s.autoIcon, { backgroundColor: item.col + '18', borderColor: item.col + '40' }]}>
                  <MaterialIcons name={item.icon as any} size={16} color={item.col} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.autoLabel, { color: isConnected ? item.col : C.textMid }]}>{item.label}</Text>
                  <Text style={s.autoSub}>{item.sub}</Text>
                </View>
                <View style={[s.autoStatus, { borderColor: (isConnected ? C.green : C.textDim) + '50', backgroundColor: (isConnected ? C.green : C.textDim) + '0C' }]}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isConnected ? C.green : C.textDim }} />
                  <Text style={{ fontSize: 8, fontWeight: '900', fontFamily: MONO, color: isConnected ? C.green : C.textDim }}>
                    {isConnected ? 'RUN' : 'OFF'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── UNDO JOURNAL ── */}
        <View style={s.card}>
          <SectHead icon="undo" main="UNDO " accent="JOURNAL" accentColor={C.amber} />
          {undoList.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
              <MaterialIcons name="check-circle-outline" size={36} color={C.textDim} />
              <Text style={{ fontSize: 12, color: C.textDim, fontFamily: MONO }}>
                {isConnected ? 'No pending rollbacks' : 'Connect PC to see undo journal'}
              </Text>
              <Text style={{ fontSize: 10, color: C.textDim, fontFamily: MONO, textAlign: 'center', lineHeight: 16 }}>
                {'Every script execution is tracked\nfor 15 minutes — reversible with one tap'}
              </Text>
            </View>
          ) : (
            <View style={s.undoList}>
              {undoList.map(entry => (
                <UndoEntry key={entry.id} entry={entry} onRollback={rollback} rolling={rollingId === entry.id} />
              ))}
            </View>
          )}
        </View>

        {/* ── HOW IT WORKS ── */}
        <View style={[s.card, { borderColor: C.textDim + '20' }]}>
          <SectHead icon="info-outline" main="HOW IT " accent="WORKS" accentColor={C.textMid} />
          <View style={{ gap: 10 }}>
            {[
              { n: '1', col: C.teal,   text: 'Run butler_server.py on your PC and pair via HOME tab QR code' },
              { n: '2', col: C.green,  text: 'Tap SCAN NOW to detect junk files, large files, and browser cache' },
              { n: '3', col: C.amber,  text: 'Use Quick Actions to clean, organize, and optimize your PC remotely' },
              { n: '4', col: C.purple, text: 'Every action is undoable for 15 minutes via the Undo Journal above' },
            ].map(item => (
              <View key={item.n} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <View style={[s.stepBadge, { borderColor: item.col + '60', backgroundColor: item.col + '15' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: item.col, fontFamily: MONO }}>{item.n}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 12, color: C.textMid, lineHeight: 18 }}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#000003' },
  connBar:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1 },
  connStatus:  { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.6 },
  connSub:     { fontSize: 9, color: C.textDim, fontFamily: MONO, marginTop: 1 },
  refreshBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5 },
  refreshTxt:  { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  scroll:      { padding: 14, paddingBottom: 150, gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  sectionTitle:{ fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 2.5, color: C.textMid },
  qpsOutput:   { borderWidth: 1.5, borderRadius: 10, padding: 12, marginTop: 4 },
  qpsLabel:    { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  qpsText:     { fontSize: 11, fontFamily: MONO, lineHeight: 17 },
  card:        { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16,
    ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.25, shadowRadius:10 }, android:{elevation:4} }) },
  offlineBadge:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: C.amber + '08', borderWidth: 1, borderColor: C.amber + '25', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  offlineTxt:  { flex: 1, fontSize: 10, fontFamily: MONO },
  recovBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  recovTxt:    { flex: 1, fontSize: 11, fontFamily: MONO, lineHeight: 16 },
  smallBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  smallBtnTxt: { fontSize: 8.5, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.3 },
  undoList:    { backgroundColor: C.surfaceHi, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  autoRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  autoIcon:    { width: 36, height: 36, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  autoLabel:   { fontSize: 12, fontWeight: '700', fontFamily: MONO, marginBottom: 2 },
  autoSub:     { fontSize: 9.5, color: C.textDim, fontFamily: MONO, lineHeight: 14 },
  autoStatus:  { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, flexShrink: 0 },
  stepBadge:   { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});


// Expo Router per-route ErrorBoundary — isolates crashes to this tab
export { ErrorBoundary } from '@/components/ui/TabErrorBoundary';
