/**
 * HomeGreetingBanner.tsx
 * ──────────────────────────────────────────────────────────────────
 * Slim, elegant greeting strip pinned just above the privacy / clock
 * widgets on the homepage. Time-aware copy ("GOOD MORNING", etc.) +
 * subtle accent line + a soft linear gradient backdrop.
 *
 * Quiet, classy, no animations — exists to give the page a confident
 * "command-deck" opening rather than diving straight into the badge.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const MONO: any = Platform.OS === 'ios' ? 'Courier New' : 'monospace';
const BODY: any = Platform.OS === 'ios' ? 'System' : 'sans-serif';

const C = {
  accent:   '#FF2A1F',
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
  /** Reserved for future use — kept for backwards compatibility but no longer rendered. */
  callsign?: string;
}

export default React.memo(HomeGreetingBanner);

function HomeGreetingBanner(_props: Props) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);  // refresh greeting every 30s
    return () => clearInterval(id);
  }, []);

  const greeting = greetingFor(now);

  return (
    <View style={s.wrap}>
      <LinearGradient
        colors={[C.accent + '14', C.accent + '03', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Left accent rail */}
      <View style={s.rail} />

      <View style={s.content}>
        <Text style={s.greeting} numberOfLines={1}>
          {greeting}
          <Text style={s.dot}>  ·  </Text>
          <Text style={s.callsign}>BUTLER AI ONLINE</Text>
        </Text>
        <Text style={s.tagline} numberOfLines={1}>
          LAN-ONLY  ·  ZERO TELEMETRY  ·  YOUR PC · YOUR RULES
        </Text>
      </View>

      {/* Right-side hint chevron block */}
      <View style={s.rightBlock}>
        <View style={[s.tick, { width: 8 }]} />
        <View style={[s.tick, { width: 14 }]} />
        <View style={[s.tick, { width: 5 }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.accent + '25',
    overflow: 'hidden',
    backgroundColor: '#070A0E',
  },
  rail: {
    width: 2.5, height: '70%',
    backgroundColor: C.accent,
    borderRadius: 2,
    marginRight: 10,
    ...(Platform.OS === 'ios' ? { shadowColor: C.accent, shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } } : {}),
  },
  content: { flex: 1 },
  greeting: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 1.8,
    color: C.textBrt,
  },
  dot:      { color: C.accent, fontFamily: MONO, fontWeight: '900' },
  callsign: { color: C.accent, fontFamily: MONO, fontWeight: '900' },
  tagline: {
    marginTop: 2,
    fontSize: 9.5,
    fontFamily: MONO,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: C.textMid,
  },
  rightBlock: {
    alignItems: 'flex-end',
    gap: 2.5,
    marginLeft: 10,
  },
  tick: {
    height: 1.5,
    borderRadius: 1,
    backgroundColor: C.accent + '80',
  },
});
