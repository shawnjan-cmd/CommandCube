/**
 * OnboardingProgress — drop-in step indicator for welcome.tsx.
 *
 * Reduces abandonment on the 10-screen onboarding by showing how
 * many steps are left. Pure presentational, no haptics, no state.
 *
 * Usage in app/welcome.tsx, at the top of each Screen* component:
 *
 *   <OnboardingProgress step={3} total={10} />
 *
 * Or once, inside the parent <WelcomeScreen> render, above
 * `renderStep()`:
 *
 *   <OnboardingProgress step={step + 1} total={TOTAL_STEPS} />
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

type Props = {
  step:  number;          // 1-based current step
  total: number;
  color?:    string;
  dimColor?: string;
  trackBg?:  string;
};

export function OnboardingProgress({
  step,
  total,
  color    = '#00FFFF',
  dimColor = '#3A5068',
  trackBg  = '#070D16',
}: Props) {
  const safeTotal = Math.max(1, total);
  const safeStep  = Math.max(1, Math.min(step, safeTotal));
  const pct       = safeStep / safeTotal;
  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${safeStep} of ${safeTotal}`}
      accessibilityValue={{ min: 1, max: safeTotal, now: safeStep }}
    >
      <View style={styles.row}>
        <Text style={[styles.label, { color: dimColor }]}>
          STEP {safeStep} OF {safeTotal}
        </Text>
        <Text style={[styles.label, { color: dimColor }]}>
          {Math.round(pct * 100)}%
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: trackBg }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:  { marginBottom: 16 },
  row:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 10, fontFamily: MONO, letterSpacing: 1.2 },
  track: { height: 2, borderRadius: 1, overflow: 'hidden' },
  fill:  { height: 2, borderRadius: 1 },
});

export default OnboardingProgress;
