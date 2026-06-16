/**
 * HomeGreetingBanner.tsx
 * ──────────────────────────────────────────────────────────────────
 * Centered, matrix-style greeting card. Time-aware copy + HUD corner
 * brackets + accent dot.
 *
 * Zero animations — keeps the strip lightweight on low-end devices.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const C = {
  accent:   '#3b82f6',
  textBrt:  '#E8EEF5',
  textMid:  '#8FA3B8',
  textDim:  '#4A5F75',
};

function greetingFor(d: Date) {
  const h = d.getHours();
  if (h < 5)  return 'GOOD NIGHT';
  if (h < 12) return 'GOOD MORNING';
  if (h < 17) return 'GOOD AFTERNOON';
  if (h < 22) return 'GOOD EVENING';
  return 'GOOD NIGHT';
}

interface Props {
  callsign?: string;
}

export default React.memo(HomeGreetingBanner);

function HomeGreetingBanner(_props: Props) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const greeting = greetingFor(now);

  return (
    <View style={s.wrap}>
      <View style={s.card}>
        {/* HUD corner brackets (all 4) */}
        <View style={[s.corner, { top: 0,    left: 0,    borderTopWidth: 1.5,    borderLeftWidth: 1.5,   borderColor: C.accent + 'AA' }]} />
        <View style={[s.corner, { top: 0,    right: 0,   borderTopWidth: 1.5,    borderRightWidth: 1.5,  borderColor: C.accent + 'AA' }]} />
        <View style={[s.corner, { bottom: 0, left: 0,    borderBottomWidth: 1.5, borderLeftWidth: 1.5,   borderColor: C.accent + 'AA' }]} />
        <View style={[s.corner, { bottom: 0, right: 0,   borderBottomWidth: 1.5, borderRightWidth: 1.5,  borderColor: C.accent + 'AA' }]} />

        {/* Top accent strip */}
        <View style={s.topBar} />

        {/* Greeting row — centered */}
        <View style={s.greetingRow}>
          <MaterialCommunityIcons name="weather-night" size={11} color={C.accent} />
          <Text style={s.greeting} numberOfLines={1}>
            {greeting}
          </Text>
          <Text style={s.sep}> · </Text>
          <Text style={s.callsign} numberOfLines={1}>BUTLER AI ONLINE</Text>
        </View>

        {/* Tagline — centered */}
        <Text style={s.tagline} numberOfLines={1}>
          LAN-ONLY  ·  ZERO TELEMETRY  ·  YOUR PC · YOUR RULES
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  card: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.accent + '40',
    backgroundColor: 'rgba(59,130,246,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  corner: { position: 'absolute', width: 10, height: 10 },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 1.5,
    backgroundColor: C.accent + '80',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 1.8,
    color: C.textBrt,
    textAlign: 'center',
  },
  sep:      { color: C.accent + 'AA', fontFamily: MONO, fontWeight: '900', fontSize: 13 },
  callsign: { color: C.accent, fontFamily: MONO, fontWeight: '900', fontSize: 13, letterSpacing: 1.8 },
  tagline: {
    marginTop: 5,
    fontSize: 9,
    fontFamily: MONO,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: C.textMid,
    textAlign: 'center',
  },
});
