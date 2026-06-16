/**
 * HomeSectionDivider.tsx
 * ──────────────────────────────────────────────────────────────────
 * Slim, elegant section divider — used between major homepage cards
 * to give the page a clear visual rhythm. Renders as a thin gradient
 * line with a centered label in mono caps, e.g. "— PC OVERVIEW —".
 *
 * Zero animations, pure stylesheet. Reusable on any dark page.
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const MONO: any = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const C = {
  accent:  '#3b82f6',
  textDim: '#5A6B7A',
};

interface Props {
  label: string;
  accentColor?: string;
}

export default function HomeSectionDivider({ label, accentColor = C.accent }: Props) {
  return (
    <View style={s.wrap}>
      <LinearGradient
        colors={['transparent', accentColor + '40', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={s.line}
      />
      <View style={[s.labelHolder, { borderColor: accentColor + '40' }]}>
        <View style={[s.tick, { backgroundColor: accentColor }]} />
        <Text style={s.label} numberOfLines={1}>{label.toUpperCase()}</Text>
        <View style={[s.tick, { backgroundColor: accentColor }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: 18,
    marginTop: 18,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  line: {
    position: 'absolute', left: 0, right: 0, top: 11, height: 1.2,
  },
  labelHolder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#040608',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tick: { width: 5, height: 1.5, borderRadius: 1 },
  label: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 2.2,
    color: C.textDim,
  },
});
