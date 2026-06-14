/**
 * RootSafeShell.tsx
 * ──────────────────────────────────────────────────────────────────
 * Top-level error boundary wrapped around the entire app's <Stack>.
 * Catches any uncaught render-time exception that slipped past every
 * per-screen / per-widget SafeBoundary. Shows a calm "TAP TO RESTART"
 * recovery screen instead of a blank white screen-of-death.
 *
 * Cannot interfere with anything else — by definition it only renders
 * the fallback when something has ALREADY thrown.
 *
 * Recovery actions, in order:
 *   1. "TRY AGAIN"    — re-mounts the subtree (clears the error state).
 *      Cheap, no JS reload, no nav reset.
 *   2. "RELOAD APP"   — DevSettings.reload() — forces a full JS bundle
 *      reload. Last resort. Hidden behind a confirm tap.
 *
 * Verbose logging via console.error so the actual stack is debuggable
 * from adb logcat / sentry / etc.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

const MONO: any = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

interface State {
  hasError: boolean;
  errorMessage: string;
  resetCount: number;     // forces subtree re-mount when bumped
  reloadConfirm: boolean; // two-tap confirm for the JS-reload nuclear option
}

interface Props {
  children: React.ReactNode;
}

export default class RootSafeShell extends React.Component<Props, State> {
  state: State = { hasError: false, errorMessage: '', resetCount: 0, reloadConfirm: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, errorMessage: String(error?.message || 'unknown error') };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Loud log so adb logcat / sentry can pick it up.
    console.error('[RootSafeShell] uncaught render error:', error?.message);
    if (info?.componentStack) console.error('[RootSafeShell] component stack:', info.componentStack);
  }

  private handleTryAgain = () => {
    // Re-mount the children subtree by bumping resetCount via key.
    this.setState({ hasError: false, errorMessage: '', resetCount: this.state.resetCount + 1, reloadConfirm: false });
  };

  private handleReload = () => {
    if (!this.state.reloadConfirm) {
      this.setState({ reloadConfirm: true });
      // auto-clear confirm after 4s
      setTimeout(() => this.setState({ reloadConfirm: false }), 4000);
      return;
    }
    try {
      // Dynamic require so this is safe in environments where DevSettings is unavailable.
      const RN = require('react-native');
      RN?.DevSettings?.reload?.();
    } catch (e) {
      console.warn('[RootSafeShell] DevSettings.reload failed:', e);
      // last-resort fallback: clear the error and let the user manually retry.
      this.handleTryAgain();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.wrap}>
          <View style={s.box}>
            <View style={s.brackets} />
            <Text style={s.glyph}>!</Text>
            <Text style={s.title}>BUTLER AI</Text>
            <Text style={s.subtitle}>SOMETHING WENT WRONG</Text>
            <View style={s.errorBox}>
              <Text style={s.errorTxt} numberOfLines={4}>
                {this.state.errorMessage || 'A widget threw an unrecoverable error.'}
              </Text>
            </View>

            <TouchableOpacity onPress={this.handleTryAgain} activeOpacity={0.8} style={[s.btn, s.btnPrimary]}>
              <Text style={s.btnTxt}>TRY AGAIN</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={this.handleReload} activeOpacity={0.8} style={[s.btn, s.btnSecondary, this.state.reloadConfirm && s.btnSecondaryConfirm]}>
              <Text style={[s.btnTxt, { color: this.state.reloadConfirm ? '#000' : '#FFB020' }]}>
                {this.state.reloadConfirm ? 'TAP AGAIN TO CONFIRM' : 'RELOAD APP'}
              </Text>
            </TouchableOpacity>

            <Text style={s.helpTxt}>Your data is safe · No personal info is lost</Text>
          </View>
        </View>
      );
    }
    // Bump key to force unmount/remount on retry — clears any stale subscriptions
    return <React.Fragment key={`shell-${this.state.resetCount}`}>{this.props.children}</React.Fragment>;
  }
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#040608', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box:  { width: '100%', maxWidth: 380, alignItems: 'center', borderWidth: 1, borderColor: '#FF2A1F40', borderRadius: 14, backgroundColor: '#0A0D12', padding: 22 },
  brackets: { position: 'absolute', top: 6, left: 6, right: 6, height: 12, borderTopWidth: 1.5, borderColor: '#FF2A1F70' },
  glyph: { fontSize: 56, color: '#FF2A1F', fontFamily: MONO, fontWeight: '900',
    ...(Platform.OS === 'ios' ? { textShadowColor: '#FF2A1F', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 } : {}) },
  title: { fontSize: 22, fontWeight: '900', fontFamily: MONO, letterSpacing: 4, color: '#E8EEF5', marginTop: 6 },
  subtitle: { fontSize: 10, fontWeight: '900', fontFamily: MONO, letterSpacing: 2.4, color: '#FF6660', marginTop: 4 },
  errorBox: { marginTop: 16, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#222B36', backgroundColor: '#070A0E', width: '100%' },
  errorTxt: { fontSize: 10, fontFamily: MONO, color: '#8FA3B8', letterSpacing: 0.2, lineHeight: 14 },
  btn:  { marginTop: 12, width: '100%', paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1.5 },
  btnPrimary:   { backgroundColor: '#FF2A1F', borderColor: '#FF2A1F' },
  btnSecondary: { borderColor: '#FFB02080', backgroundColor: '#FFB02012' },
  btnSecondaryConfirm: { borderColor: '#FFB020', backgroundColor: '#FFB020' },
  btnTxt: { fontSize: 12, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 2 },
  helpTxt: { fontSize: 9, fontFamily: MONO, color: '#4A5F75', marginTop: 14, letterSpacing: 1 },
});
