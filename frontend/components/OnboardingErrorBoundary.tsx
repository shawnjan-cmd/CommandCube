/**
 * OnboardingErrorBoundary — Catches render errors INSIDE the onboarding flow.
 *
 * If any of the 10 onboarding screens crashes (e.g. a render-time bug in
 * Screen3Consent, a bad SVG, an animation calc with NaN), the user would
 * otherwise be bounced to the global SYSTEM FAULT boundary — confusing
 * and scary on first launch.
 *
 * This component-level boundary catches the crash, presents a friendly
 * recovery UI inside the existing onboarding tab, and offers TWO recovery
 * paths:
 *
 *   1. RETRY ONBOARDING  — re-mount the children (resets to Screen 1)
 *   2. SKIP TO HOME      — calls onSkipToHome() which persists the
 *                          completion flag AND navigates to /nexushome.
 *                          The user is never stuck — even if the entire
 *                          onboarding component is broken on their device,
 *                          they can still get into the app.
 *
 * Zero interference: only activates when `getDerivedStateFromError` fires.
 * In the happy path it's invisible.
 */
import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

interface Props {
  children: ReactNode;
  onSkipToHome: () => void;
}
interface State {
  error: Error | null;
  resetKey: number;
}

export default class OnboardingErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('[OnboardingErrorBoundary] uncaught:', error?.message);
    try {
      require('@/services/autoErrorLogger').autoErrorLogger.log(
        'error', 'OnboardingErrorBoundary', error?.message ?? 'unknown'
      );
    } catch {}
  }

  private handleRetry = () => {
    this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }));
  };

  private handleSkip = () => {
    this.setState({ error: null });
    try { this.props.onSkipToHome(); } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[OnboardingErrorBoundary] onSkipToHome threw:', e);
    }
  };

  render() {
    if (!this.state.error) {
      return <React.Fragment key={`onb-eb-${this.state.resetKey}`}>{this.props.children}</React.Fragment>;
    }

    return (
      <View style={st.root}>
        <View style={st.panel}>
          <View style={st.cornerTL} /><View style={st.cornerTR} />
          <View style={st.cornerBL} /><View style={st.cornerBR} />
          <View style={st.icon}>
            <MaterialIcons name="warning" size={28} color="#FFB020" />
          </View>
          <Text style={st.title}>ONBOARDING ERROR</Text>
          <View style={st.divider} />
          <Text style={st.subtitle} numberOfLines={4}>
            Something glitched in onboarding. You can retry or skip straight
            to the home screen — your progress is saved.
          </Text>

          <View style={{ height: 18 }} />

          <TouchableOpacity style={st.btn} onPress={this.handleRetry} activeOpacity={0.85}>
            <MaterialIcons name="refresh" size={16} color="#00FFC6" />
            <Text style={st.btnText}>RETRY ONBOARDING</Text>
          </TouchableOpacity>

          <View style={{ height: 10 }} />

          <TouchableOpacity style={[st.btn, st.btnSkip]} onPress={this.handleSkip} activeOpacity={0.85}>
            <MaterialIcons name="home" size={16} color="#FFB020" />
            <Text style={[st.btnText, { color: '#FFB020' }]}>SKIP TO HOME</Text>
          </TouchableOpacity>

          <Text style={st.errMsg} numberOfLines={3}>
            {this.state.error?.message ?? 'unknown error'}
          </Text>
        </View>
      </View>
    );
  }
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050A12', alignItems: 'center', justifyContent: 'center', padding: 28 },
  panel: { width: '100%', maxWidth: 380, borderWidth: 1, borderColor: '#FFB02055', backgroundColor: '#1A130688', borderRadius: 10, padding: 24, alignItems: 'center' },
  cornerTL: { position: 'absolute', top: -2, left: -2, width: 14, height: 14, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#FFB020' },
  cornerTR: { position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#FFB020' },
  cornerBL: { position: 'absolute', bottom: -2, left: -2, width: 14, height: 14, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#FFB020' },
  cornerBR: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#FFB020' },
  icon: { width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderColor: '#FFB02080', backgroundColor: '#FFB02012', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 14, fontWeight: '900', color: '#FFB020', letterSpacing: 3, fontFamily: MONO },
  divider: { width: 60, height: 2, backgroundColor: '#FFB020', opacity: 0.5, marginVertical: 12, borderRadius: 1 },
  subtitle: { fontSize: 12, color: '#E6D4A0', textAlign: 'center', lineHeight: 18, fontFamily: MONO },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 22, borderWidth: 1.5, borderColor: '#00FFC680', backgroundColor: '#00FFC610', borderRadius: 8, alignSelf: 'stretch' },
  btnSkip: { borderColor: '#FFB02080', backgroundColor: '#FFB02010' },
  btnText: { fontSize: 12, fontWeight: '900', color: '#00FFC6', letterSpacing: 2, fontFamily: MONO },
  errMsg: { fontSize: 9, color: '#8C95A6', marginTop: 14, textAlign: 'center', fontFamily: MONO, opacity: 0.7 },
});
