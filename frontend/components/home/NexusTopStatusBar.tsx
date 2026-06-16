/**
 * NexusTopStatusBar.tsx — NEXUS v5 top bar
 * ──────────────────────────────────────────────────────────────────
 * Replicates the top status bar from the nexus-ultimate-v5 mockup:
 *
 *   [⬢ NEXUS · v9.0]    [● SYSTEM OK] [v2.1] [00:00] [PAIR] [🔒]
 *
 * • Left: animated hex logo + gradient title.
 * • Right: connection status pill (blinking dot), version pill,
 *   live clock, optional PAIR CTA, lock icon (panic / settings).
 *
 * Zero data dependencies — accepts everything as props so the home
 * screen owns the connection / version state.
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Platform, TouchableOpacity, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

const MONO: any = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

// ── NEXUS v5 palette ─────────────────────────────────────────────
const C = {
  bg:         '#07090f',
  surface:    '#0f1219',
  surface2:   '#141823',
  surface3:   '#1a1f2e',
  border:     '#1e2538',
  border2:    '#252d42',
  text:       '#dde2f0',
  textDim:    '#4a5270',
  accent:     '#3b82f6',
  accent2:    '#60a5fa',
  purple:     '#a855f7',
  green:      '#10b981',
  red:        '#ef4444',
  amber:      '#f59e0b',
  netgreen:   '#00e5a0',
};

interface Props {
  isConnected: boolean;
  /** "192.168.1.42:1817" or empty when disconnected. */
  serverAddr?: string;
  /** App version, e.g. "2.1.15". */
  version: string;
  /** Triggered when the user taps the right-side PAIR CTA. */
  onPair: () => void;
  /** Triggered when the user taps the lock / settings icon. */
  onLock?: () => void;
}

function NexusTopStatusBarInner({
  isConnected, serverAddr, version, onPair, onLock,
}: Props) {
  // ── Live clock ─────────────────────────────────────────────────
  const [time, setTime] = useState(() => fmtTime(new Date()));
  useEffect(() => {
    const id = setInterval(() => setTime(fmtTime(new Date())), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  // ── Hex logo gentle pulsing glow ───────────────────────────────
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.65] });

  // ── Status-pill blink (when online) ────────────────────────────
  const blink = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(blink, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(blink, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const blinkOpacity = blink.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  const statusCol = isConnected ? C.green : C.red;
  const statusLabel = isConnected ? 'SYSTEM OK' : 'OFFLINE';

  return (
    <View style={s.wrap}>
      {/* ─── LEFT: hex logo + title ──────────────────────────── */}
      <View style={s.leftGroup}>
        <View style={s.hexWrap}>
          <Animated.View
            pointerEvents="none"
            style={[
              s.hexGlow,
              { opacity: glowOpacity, transform: [{ scale: glowScale }] },
            ]}
          />
          <LinearGradient
            colors={[C.accent, C.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hex}
          >
            <MaterialCommunityIcons name="hexagon-outline" size={18} color="#fff" />
          </LinearGradient>
        </View>
        <View style={{ marginLeft: 9 }}>
          <Text style={s.title}>NEXUS</Text>
          <Text style={s.subtitle}>BUTLER · AUTOMATION CORE</Text>
        </View>
      </View>

      {/* ─── RIGHT: status group ─────────────────────────────── */}
      <View style={s.rightGroup}>
        {/* Status pill */}
        <View
          style={[
            s.pill,
            {
              backgroundColor: statusCol + '14',
              borderColor: statusCol + '33',
            },
          ]}
        >
          <Animated.View
            style={[
              s.pillDot,
              {
                backgroundColor: statusCol,
                opacity: isConnected ? blinkOpacity : 0.9,
              },
              Platform.OS === 'ios' && isConnected ? {
                shadowColor: statusCol, shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
              } : null,
            ]}
          />
          <Text style={[s.pillTxt, { color: statusCol }]} numberOfLines={1}>
            {statusLabel}
          </Text>
        </View>

        {/* Version pill */}
        <View
          style={[
            s.pill,
            { backgroundColor: C.accent + '12', borderColor: C.accent + '33' },
          ]}
        >
          <Text style={[s.pillTxt, { color: C.accent2 }]} numberOfLines={1}>
            v{version}
          </Text>
        </View>

        {/* Live clock */}
        <Text style={s.clock} numberOfLines={1}>{time}</Text>

        {/* PAIR CTA (only when disconnected) */}
        {!isConnected ? (
          <TouchableOpacity
            onPress={onPair}
            activeOpacity={0.85}
            style={[
              s.pairBtn,
              { backgroundColor: C.netgreen + '14', borderColor: C.netgreen + '33' },
            ]}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={11} color={C.netgreen} />
            <Text style={[s.pairTxt, { color: C.netgreen }]}>PAIR</Text>
          </TouchableOpacity>
        ) : (
          <Text style={s.serverTxt} numberOfLines={1}>
            {(serverAddr || '').split(':')[0] || 'LAN'}
          </Text>
        )}

        {/* Lock / settings icon */}
        <TouchableOpacity
          onPress={onLock}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={s.lockBtn}
        >
          <MaterialIcons
            name={isConnected ? 'lock' : 'lock-open'}
            size={14}
            color={C.textDim}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function fmtTime(d: Date) {
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export default memo(NexusTopStatusBarInner);

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    marginHorizontal: -14, // counteract parent contentContainer padding
    marginTop: -42,         // pull above the parent's paddingTop
    paddingTop: 46,
  },

  // Left group
  leftGroup: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  hexWrap:   { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  hexGlow:   {
    position: 'absolute', width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.accent,
  },
  hex: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  title:    {
    fontSize: 12, fontWeight: '900', fontFamily: MONO,
    letterSpacing: 2.4, color: C.text,
  },
  subtitle: {
    fontSize: 7.5, fontWeight: '600', fontFamily: MONO,
    letterSpacing: 1.6, color: C.textDim, marginTop: 1,
  },

  // Right group
  rightGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },

  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 100, borderWidth: 1,
  },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillTxt: {
    fontSize: 7.5, fontWeight: '800', fontFamily: MONO,
    letterSpacing: 1.2,
  },

  clock: {
    fontSize: 9, fontFamily: MONO, fontWeight: '700',
    color: C.textDim, letterSpacing: 0.8, minWidth: 26, textAlign: 'right',
  },
  serverTxt: {
    fontSize: 7.5, fontFamily: MONO, fontWeight: '800',
    color: C.netgreen, letterSpacing: 0.8, maxWidth: 60,
  },

  pairBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 100, borderWidth: 1,
  },
  pairTxt: {
    fontSize: 8, fontWeight: '900', fontFamily: MONO,
    letterSpacing: 1.4,
  },

  lockBtn: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surface2,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.border2,
  },
});
