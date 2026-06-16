/**
 * SystemMetricsBar — CPU & RAM bar shown under every page header
 * Inspired by the reference image: ⊙ CPU ━━━━━ 43% | ≡ RAM ━━━━━ 37%
 * Dark background, blue CPU bar, amber RAM bar, monospace text
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Animated, Dimensions } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { serverConnection } from '@/services/serverConnection';
import { autoConnectEngine } from '@/services/autoConnectEngine';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const _DIM_SMB = Dimensions.get('window'); /* cold-start safe */
const SW = _DIM_SMB.width > 0 ? _DIM_SMB.width : 414;

interface MetricsState {
  cpu: number;
  ram: number;
  disk: number;
  connected: boolean;
}

function MetricBar({
  label, value, color, iconName, iconLib = 'material',
}: {
  label: string;
  value: number;
  color: string;
  iconName: string;
  iconLib?: 'material' | 'community';
}) {
  const barAnim = useRef(new Animated.Value(0)).current;
  const Icon = iconLib === 'community' ? MaterialCommunityIcons : MaterialIcons;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: Math.min(1, Math.max(0, value / 100)),
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const displayVal = value > 0 ? `${Math.round(value)}%` : '--';

  // Bar track width: reserve space for label (52px), value (34px), separator padding
  const TRACK_W = (SW - 32 - 16 - 52 - 34 - 24) / 2;

  return (
    <View style={mb.wrap}>
      <Icon name={iconName as any} size={11} color={color} style={{ flexShrink: 0 }} />
      <Text style={[mb.label, { color }]}>{label}</Text>
      <View style={[mb.track, { width: Math.max(40, TRACK_W) }]}>
        <Animated.View style={[
          mb.fill,
          {
            width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any,
            backgroundColor: color,
          },
          Platform.OS === 'ios' ? { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 } : {},
        ]} />
        {/* Track grid lines */}
        {[0.25, 0.5, 0.75].map((f, i) => (
          <View key={i} style={[mb.gridLine, { left: `${f * 100}%` as any }]} />
        ))}
      </View>
      <Text style={[mb.value, { color }]}>{displayVal}</Text>
    </View>
  );
}

const mb = StyleSheet.create({
  wrap:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label:    { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 1, width: 30, flexShrink: 0 },
  track:    { height: 3, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'visible', position: 'relative', flexShrink: 0 },
  fill:     { height: '100%', borderRadius: 2 },
  gridLine: { position: 'absolute', top: -2, width: 1, height: 7, backgroundColor: 'rgba(0,0,0,0.4)' },
  value:    { fontSize: 10, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5, width: 28, textAlign: 'right', flexShrink: 0 },
});

export function SystemMetricsBar({ isConnected, accentColor }: { isConnected: boolean; accentColor?: string }) {
  const accent = accentColor || '#00BFFF';
  const [metrics, setMetrics] = useState<MetricsState>({ cpu: 0, ram: 0, disk: 0, connected: false });
  const pulse = useRef(new Animated.Value(0.4)).current;
  const scanAnim = useRef(new Animated.Value(-SW)).current;

  useEffect(() => {
    const p = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
    ]));
    p.start();
    return () => p.stop();
  }, []);

  useEffect(() => {
    if (!isConnected) {
      setMetrics(prev => ({ ...prev, connected: false }));
      return;
    }
    setMetrics(prev => ({ ...prev, connected: true }));

    const fetchMetrics = async () => {
      try {
        const ip = serverConnection.getIP();
        const port = serverConnection.getPort();
        const token = serverConnection.getToken();
        if (!ip || !port) return;
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(`http://${ip}:${port}/api/metrics`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: ctrl.signal,
        });
        if (res.ok) {
          const d = await res.json();
          setMetrics({
            cpu:       d.cpu?.percent  ?? d.cpu  ?? 0,
            ram:       d.memory?.percent ?? d.ram ?? 0,
            disk:      d.disk?.percent ?? d.disk ?? 0,
            connected: true,
          });
        }
      } catch {}
    };

    fetchMetrics();
    const t = setInterval(fetchMetrics, 5000);
    return () => clearInterval(t);
  }, [isConnected]);

  const statusCol = isConnected ? '#00FF88' : '#EF4444';

  return (
    <View style={s.bar}>
      {/* Left: status dot */}
      <Animated.View style={[s.statusDot, { backgroundColor: statusCol, opacity: pulse }]} />

      {/* CPU bar — uses accent color tint */}
      <MetricBar
        label="CPU"
        value={metrics.cpu}
        color={accent}
        iconName="circle"
        iconLib="material"
      />

      {/* Separator */}
      <View style={[s.separator, { backgroundColor: (accent + '30') }]} />

      {/* RAM bar — complementary color: shift hue slightly */}
      <MetricBar
        label="RAM"
        value={metrics.ram}
        color={accent === '#00FF88' ? '#FFC400' : accent === '#FFC400' ? '#00FF88' : accent === '#FFC400' ? '#FF2A1F' : accent === '#FF6A1F' ? '#FF9A44' : '#FFC400'}
        iconName="menu"
        iconLib="material"
      />

      {/* Separator */}
      <View style={[s.separator, { backgroundColor: (accent + '30') }]} />

      {/* DISK bar */}
      <MetricBar
        label="DISK"
        value={metrics.disk}
        color={accent + 'BB'}
        iconName="storage"
        iconLib="material"
      />

      {/* Right: wifi + connection indicator */}
      <View style={{ flex: 1 }} />
      <View style={[s.connBadge, { borderColor: statusCol + '50', backgroundColor: statusCol + '0C' }]}>
        <MaterialIcons name={isConnected ? 'wifi' : 'wifi-off'} size={9} color={statusCol} />
        <Text style={[s.connTxt, { color: statusCol }]}>{isConnected ? 'LIVE' : 'OFF'}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#0A0B0D',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,42,31,0.08)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  separator: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  connBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexShrink: 0,
  },
  connTxt: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 0.5,
  },
});
