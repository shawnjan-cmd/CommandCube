/**
 * PERFORMANCE MONITOR WIDGET — Standalone component
 * Real-time circular ring gauges for CPU, RAM, GPU/AI, Disk
 * Same color scheme as the app (teal #00FF88, amber, red, purple)
 * Can be placed on any page as a self-contained card.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Platform, Animated, TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { serverConnection } from '@/services/serverConnection';
import { haptics } from '@/services/haptics';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const { width: SW } = Dimensions.get('window');

// ─── Palette — matches app's dark NEXUS theme ──────────────────
const PM = {
  bg:        '#090a0f',
  surface:   '#0d0e14',
  surfaceHi: '#111318',
  border:    'rgba(255,255,255,0.06)',
  text:      '#e2e8f0',
  dim:       '#4a5568',
  mid:       '#8C95A6',
  teal:      '#00FF88',
  tealDim:   '#00FF8815',
  amber:     '#FFC400',
  amberDim:  '#FFC40015',
  red:       '#ef4444',
  redDim:    '#ef444415',
  purple:    '#FFC400',
  purpleDim: '#FFC40015',
  blue:      '#3b82f6',
  green:     '#22c55e',
  cyan:      '#22d3ee',
};

function getBarColor(pct: number, type: 'cpu' | 'ram' | 'disk' | 'ai' = 'cpu') {
  if (type === 'ai') return PM.purple;
  if (pct >= 85) return PM.red;
  if (pct >= 65) return PM.amber;
  return PM.teal;
}

// ─── Circular Ring Gauge ───────────────────────────────────────
function CircularRing({
  pct, color, size = 80, label, sublabel, animated = true,
}: {
  pct: number; color: string; size?: number; label: string;
  sublabel?: string; animated?: boolean;
}) {
  const animPct = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const RING_W = size * 0.09;

  useEffect(() => {
    if (animated) {
      Animated.timing(animPct, { toValue: pct, duration: 900, useNativeDriver: false }).start();
    } else {
      animPct.setValue(pct);
    }
  }, [pct]);

  useEffect(() => {
    const glow = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0.25, duration: 1400, useNativeDriver: false }),
    ]));
    glow.start();
    return () => glow.stop();
  }, []);

  const clampedPct = Math.max(0, Math.min(100, pct));
  const showRight  = clampedPct > 25;
  const showBottom = clampedPct > 50;
  const showLeft   = clampedPct > 75;

  const displayVal = pct >= 0 ? `${Math.round(pct)}%` : '--';

  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {/* Track */}
        <View style={{
          position: 'absolute', width: size, height: size,
          borderRadius: size / 2, borderWidth: RING_W, borderColor: color + '18',
        }} />
        {/* Active arc */}
        <Animated.View style={[{
          position: 'absolute', width: size, height: size,
          borderRadius: size / 2, borderWidth: RING_W,
          borderColor: 'transparent',
          borderTopColor: color,
        },
          showRight  ? { borderRightColor: color }  : {},
          showBottom ? { borderBottomColor: color } : {},
          showLeft   ? { borderLeftColor: color }   : {},
          Platform.OS === 'ios' ? {
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 6,
          } : {},
        ]} />
        {/* Center value */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{
            fontSize: size * 0.205,
            fontWeight: '900',
            color,
            fontFamily: MONO,
            lineHeight: size * 0.25,
          }}>
            {displayVal}
          </Text>
          {sublabel ? (
            <Text style={{ fontSize: size * 0.095, color: color + '70', fontFamily: MONO, letterSpacing: 0.3 }}>
              {sublabel}
            </Text>
          ) : null}
        </View>
      </View>
      <Text style={{ fontSize: 9, fontWeight: '700', color: PM.dim, fontFamily: MONO, letterSpacing: 1.2 }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Horizontal Progress Bar ────────────────────────────────────
function HorizBar({ label, pct, color, sublabel }: {
  label: string; pct: number; color: string; sublabel?: string;
}) {
  const barW = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barW, { toValue: pct, duration: 1000, useNativeDriver: false }).start();
  }, [pct]);

  return (
    <View style={pms.barRow}>
      <View style={pms.barLabelWrap}>
        <Text style={pms.barLabel}>{label}</Text>
        {sublabel ? <Text style={pms.barSublabel}>{sublabel}</Text> : null}
      </View>
      <View style={pms.barTrack}>
        <Animated.View style={[pms.barFill, {
          width: barW.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) as any,
          backgroundColor: color,
          ...Platform.select({
            ios: { shadowColor: color, shadowOffset:{width:0,height:0}, shadowOpacity:0.6, shadowRadius:4 },
            android: {},
          }),
        }]} />
      </View>
      <Text style={[pms.barPct, { color }]}>
        {pct >= 0 ? `${Math.round(pct)}%` : '--'}
      </Text>
    </View>
  );
}

// ─── Live Stats Feed (mini scrolling log) ──────────────────────
const STATIC_FEED = [
  { time: '--:--', msg: 'Waiting for PC connection...', col: PM.dim },
];

function StatsFeed({ isConnected, metrics }: {
  isConnected: boolean;
  metrics: { cpu: number; ram: number; disk: number };
}) {
  const [feed, setFeed] = useState<{ time: string; msg: string; col: string }[]>(STATIC_FEED);

  useEffect(() => {
    if (!isConnected) { setFeed(STATIC_FEED); return; }
    const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const alerts = [];
    if (metrics.cpu > 80) alerts.push({ time: now(), msg: `CPU spike: ${Math.round(metrics.cpu)}% usage`, col: PM.red });
    if (metrics.ram > 85) alerts.push({ time: now(), msg: `RAM high: ${Math.round(metrics.ram)}% used`, col: PM.amber });
    if (metrics.disk > 90) alerts.push({ time: now(), msg: `Disk critical: ${Math.round(metrics.disk)}% full`, col: PM.red });
    if (alerts.length === 0) {
      alerts.push({ time: now(), msg: `System nominal · CPU ${Math.round(metrics.cpu)}% RAM ${Math.round(metrics.ram)}%`, col: PM.teal });
    }
    setFeed(prev => [...alerts, ...prev].slice(0, 5));
  }, [metrics.cpu, metrics.ram, metrics.disk, isConnected]);

  return (
    <View style={pms.feedWrap}>
      {feed.slice(0, 3).map((entry, i) => (
        <View key={i} style={pms.feedRow}>
          <Text style={[pms.feedTime, { color: entry.col + '66' }]}>{entry.time}</Text>
          <View style={[pms.feedDot, { backgroundColor: entry.col }]} />
          <Text style={[pms.feedMsg, { color: PM.mid }]} numberOfLines={1}>{entry.msg}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── MAIN PERFORMANCE MONITOR WIDGET ───────────────────────────
export function PerformanceMonitorWidget({
  isConnected,
  serverAddr,
  initialCpu,
  initialRam,
  initialDisk,
  compact = false,
  onExpand,
}: {
  isConnected: boolean;
  serverAddr?: string;
  initialCpu?: number;
  initialRam?: number;
  initialDisk?: number;
  compact?: boolean;
  onExpand?: () => void;
}) {
  const [cpu,  setCpu]  = useState(initialCpu  ?? -1);
  const [ram,  setRam]  = useState(initialRam  ?? -1);
  const [disk, setDisk] = useState(initialDisk ?? -1);
  const [net,  setNet]  = useState(-1);
  const [temp, setTemp] = useState(-1); // GPU temp (Linux/Mac)
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const dotPulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(dotPulse, { toValue: 1, duration: 900, useNativeDriver: false }),
      Animated.timing(dotPulse, { toValue: 0.2, duration: 900, useNativeDriver: false }),
    ]));
    a.start();
    return () => a.stop();
  }, []);

  const fetchMetrics = useCallback(async () => {
    const ip   = serverConnection.getIP();
    const port = serverConnection.getPort();
    const tok  = serverConnection.getToken();
    if (!ip || !port) return;

    setLoading(true);
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 5000);
      const headers: Record<string, string> = {};
      if (tok) headers['Authorization'] = `Bearer ${tok}`;

      const res = await fetch(`http://${ip}:${port}/api/metrics`, {
        headers, signal: ctrl.signal,
      });
      if (res.ok) {
        const d = await res.json();
        setCpu(d.cpu?.percent  ?? d.metrics?.cpu?.percent  ?? -1);
        setRam(d.memory?.percent ?? d.metrics?.memory?.percent ?? -1);
        setDisk(d.disk?.percent ?? d.metrics?.disk?.percent  ?? -1);
        if (d.network?.bytes_sent !== undefined) {
          const netMbps = Math.round((d.network.bytes_sent + d.network.bytes_recv) / 1024 / 1024 * 10) / 10;
          setNet(Math.min(100, netMbps));
        }
        setLastUpdate(new Date());
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    if (isConnected) fetchMetrics();
    const t = setInterval(() => { if (isConnected) fetchMetrics(); }, 5000);
    return () => clearInterval(t);
  }, [isConnected, fetchMetrics]));

  const connCol = isConnected ? PM.teal : PM.red;
  const cpuCol  = getBarColor(cpu, 'cpu');
  const ramCol  = getBarColor(ram, 'ram');
  const diskCol = getBarColor(disk, 'disk');
  const netCol  = PM.blue;

  const timeStr = lastUpdate
    ? lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  return (
    <View style={pms.outer}>
      {/* Top accent bar */}
      <View style={[pms.topAccent, { backgroundColor: PM.teal }]} />

      {/* Header */}
      <View style={pms.header}>
        <View style={pms.headerLeft}>
          <Animated.View style={[pms.liveDot, { backgroundColor: connCol, opacity: dotPulse,
            ...Platform.select({ ios:{ shadowColor:connCol, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:6 }, android:{} }) }]} />
          <View>
            <Text style={pms.headerTitle}>
              PERFORMANCE <Text style={{ color: PM.teal }}>MONITOR</Text>
            </Text>
            <Text style={pms.headerSub}>
              {isConnected ? `LIVE · ${serverAddr || 'PC'} · ${timeStr}` : 'Offline — connect PC to monitor'}
            </Text>
          </View>
        </View>
        <View style={pms.headerRight}>
          {loading ? (
            <View style={pms.loadingDot} />
          ) : isConnected ? (
            <TouchableOpacity
              onPress={() => { haptics.light(); fetchMetrics(); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={pms.refreshBtn}
            >
              <MaterialIcons name="refresh" size={13} color={PM.teal} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => {
              haptics.light();
              if (onExpand) onExpand();
              else setExpanded(v => !v);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={pms.collapseBtn}
          >
            <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={16} color={PM.mid} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status badge row */}
      {isConnected ? (
        <View style={pms.badgeRow}>
          {[
            { label: 'LIVE', col: PM.teal },
            { label: 'ALL CORES', col: PM.dim },
            { label: loading ? 'UPDATING...' : '5s REFRESH', col: loading ? PM.amber : PM.dim },
          ].map(({ label, col }, i) => (
            <View key={i} style={[pms.badge, { borderColor: col + '40', backgroundColor: col + '0A' }]}>
              <Text style={[pms.badgeTxt, { color: col }]}>{label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {expanded ? (
        <>
          {/* Ring gauges row */}
          <View style={pms.ringsRow}>
            <CircularRing pct={cpu >= 0 ? cpu : 0}  color={cpuCol}  size={76} label="CPU"   animated />
            <CircularRing pct={ram >= 0 ? ram : 0}  color={ramCol}  size={76} label="RAM"   animated />
            <CircularRing pct={disk >= 0 ? disk : 0} color={PM.purple} size={76} label="DISK" sublabel={disk >= 0 ? 'USED' : ''} animated />
          </View>

          {/* Horizontal bars */}
          <View style={pms.barsSection}>
            <Text style={pms.sectionLabel}>DETAILED USAGE</Text>
            <HorizBar label="CPU"  pct={cpu >= 0  ? cpu  : 0} color={cpuCol}  sublabel={cpu  >= 0 ? `${Math.round(cpu)}% active` : 'N/A'} />
            <HorizBar label="RAM"  pct={ram >= 0  ? ram  : 0} color={ramCol}  sublabel={ram  >= 0 ? `${Math.round(ram)}% used`   : 'N/A'} />
            <HorizBar label="DISK" pct={disk >= 0 ? disk : 0} color={diskCol} sublabel={disk >= 0 ? `${Math.round(disk)}% full`  : 'N/A'} />
            {net >= 0 ? (
              <HorizBar label="NET" pct={net} color={netCol} sublabel="MB/s activity" />
            ) : null}
          </View>

          {/* Status feed */}
          <View style={pms.feedSection}>
            <Text style={pms.sectionLabel}>SYSTEM LOG</Text>
            <StatsFeed isConnected={isConnected} metrics={{ cpu, ram, disk }} />
          </View>

          {/* Quick stats footer */}
          <View style={pms.footer}>
            {[
              { val: cpu  >= 0 ? `${Math.round(cpu)}%`  : '—', label: 'CPU',  col: cpuCol  },
              { val: ram  >= 0 ? `${Math.round(ram)}%`  : '—', label: 'RAM',  col: ramCol  },
              { val: disk >= 0 ? `${Math.round(disk)}%` : '—', label: 'DISK', col: diskCol },
              { val: isConnected ? 'OK' : 'OFF',                label: 'STATUS', col: connCol },
            ].map(({ val, label, col }, i) => (
              <View key={i} style={[pms.footerChip, { borderColor: col + '35', backgroundColor: col + '08' }]}>
                <Text style={[pms.footerVal, { color: col }]}>{val}</Text>
                <Text style={pms.footerLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        /* Compact collapsed view — just rings in a row */
        <View style={pms.compactRow}>
          {[
            { val: cpu, col: cpuCol, label: 'CPU' },
            { val: ram, col: ramCol, label: 'RAM' },
            { val: disk, col: PM.purple, label: 'DISK' },
          ].map(({ val, col, label }, i) => (
            <View key={i} style={pms.compactItem}>
              <CircularRing pct={val >= 0 ? val : 0} color={col} size={52} label={label} animated />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Compact bar version (for header strips) ───────────────────
export function PerformanceStrip({
  cpu, ram, disk, isConnected,
}: {
  cpu: number; ram: number; disk: number; isConnected: boolean;
}) {
  const cpuCol  = getBarColor(cpu,  'cpu');
  const ramCol  = getBarColor(ram,  'ram');
  const diskCol = getBarColor(disk, 'disk');

  const BarMini = ({ pct, col, label }: { pct: number; col: string; label: string }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.timing(anim, { toValue: pct, duration: 800, useNativeDriver: false }).start();
    }, [pct]);
    return (
      <View style={pms.stripItem}>
        <MaterialIcons name={label === 'CPU' ? 'memory' : label === 'RAM' ? 'sd-card' : 'storage'} size={10} color={col} />
        <Text style={[pms.stripLabel, { color: col + '80' }]}>{label}</Text>
        <View style={pms.stripTrack}>
          <Animated.View style={[pms.stripFill, {
            width: anim.interpolate({ inputRange:[0,100], outputRange:['0%','100%'] }) as any,
            backgroundColor: col,
          }]} />
        </View>
        <Text style={[pms.stripPct, { color: col }]}>
          {pct >= 0 ? `${Math.round(pct)}%` : '--'}
        </Text>
      </View>
    );
  };

  return (
    <View style={pms.stripWrap}>
      <View style={[pms.stripDot, { backgroundColor: isConnected ? PM.teal : PM.dim }]} />
      <BarMini pct={cpu}  col={cpuCol}  label="CPU" />
      <View style={pms.stripDiv} />
      <BarMini pct={ram}  col={ramCol}  label="RAM" />
      <View style={pms.stripDiv} />
      <BarMini pct={disk} col={diskCol} label="DISK" />
    </View>
  );
}

const pms = StyleSheet.create({
  outer: {
    backgroundColor: PM.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    marginBottom: 14,
    ...Platform.select({
      ios:     { shadowColor: '#00FF88', shadowOffset:{width:0,height:4}, shadowOpacity:0.12, shadowRadius:14 },
      android: { elevation: 4 },
    }),
  },
  topAccent:    { height: 2, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle:  { fontSize: 13, fontWeight: '900', color: '#e2e8f0', fontFamily: MONO, letterSpacing: 0.5 },
  headerSub:    { fontSize: 9, color: PM.dim, fontFamily: MONO, marginTop: 2, letterSpacing: 0.3 },
  liveDot:      { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  badgeRow:     { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingBottom: 10 },
  badge:        { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeTxt:     { fontSize: 8, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  loadingDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: PM.amber, opacity: 0.8 },
  refreshBtn:   { width: 26, height: 26, borderRadius: 6, backgroundColor: PM.teal + '12', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: PM.teal + '35' },
  collapseBtn:  { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },

  // Rings
  ringsRow:     { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 14, paddingBottom: 16, paddingTop: 6 },

  // Bars
  barsSection:  { paddingHorizontal: 14, paddingBottom: 12 },
  sectionLabel: { fontSize: 8, fontWeight: '900', color: PM.dim, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 10 },
  barRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  barLabelWrap: { width: 38, gap: 1 },
  barLabel:     { fontSize: 8.5, fontWeight: '700', color: PM.mid, fontFamily: MONO, letterSpacing: 0.8 },
  barSublabel:  { fontSize: 7, color: PM.dim, fontFamily: MONO },
  barTrack:     { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 4 },
  barPct:       { fontSize: 11, fontWeight: '900', fontFamily: MONO, width: 38, textAlign: 'right' },

  // Feed
  feedSection:  { paddingHorizontal: 14, paddingBottom: 12 },
  feedWrap:     { backgroundColor: '#050505', borderRadius: 8, overflow: 'hidden' },
  feedRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  feedTime:     { fontSize: 9, fontFamily: MONO, fontWeight: '700', width: 56, flexShrink: 0 },
  feedDot:      { width: 4, height: 4, borderRadius: 2, flexShrink: 0 },
  feedMsg:      { flex: 1, fontSize: 10, fontFamily: MONO, lineHeight: 14 },

  // Footer chips
  footer:       { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 6 },
  footerChip:   { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', gap: 2 },
  footerVal:    { fontSize: 14, fontWeight: '900', fontFamily: MONO },
  footerLabel:  { fontSize: 7.5, color: PM.dim, fontFamily: MONO, letterSpacing: 0.8 },

  // Compact
  compactRow:   { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 },
  compactItem:  { alignItems: 'center' },

  // Strip (header bar version)
  stripWrap:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#0a0b0f', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  stripDot:     { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  stripItem:    { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  stripLabel:   { fontSize: 8, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.8, width: 22 },
  stripTrack:   { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  stripFill:    { height: '100%', borderRadius: 3 },
  stripPct:     { fontSize: 9, fontWeight: '900', fontFamily: MONO, width: 30, textAlign: 'right' },
  stripDiv:     { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.06)' },
});
