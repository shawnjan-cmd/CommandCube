/**
 * SafeBoundary.tsx
 * ──────────────────────────────────────────────────────────────────
 * Tiny class-based ErrorBoundary used to wrap individual homepage
 * widgets (AutomationFeed, HomeTerminalClock, etc.) so that a runtime
 * error in one card cannot take down the whole home screen.
 *
 * When a child throws:
 *   • The full error is still logged to console (so we can debug it).
 *   • A small "WIDGET OFFLINE" pill is rendered in place of the card
 *     so the user never sees a white-screen-of-death.
 *   • The boundary will NOT auto-retry — the widget stays offline for
 *     the rest of the session to prevent crash loops.
 *
 * Usage:
 *   <SafeBoundary label="PROCESS FEED">
 *     <AutomationFeed />
 *   </SafeBoundary>
 *
 * Class component is required because function components don't have
 * componentDidCatch / getDerivedStateFromError.
 */
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

const MONO: any = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

interface Props {
  label?: string;
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
}

export default class SafeBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(_e: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Verbose log so we can debug from device logs / sentry / etc.
    try {
      console.warn('[SafeBoundary]', this.props.label || 'widget', 'crashed:', error?.message);
      if (info?.componentStack) console.warn('[SafeBoundary] stack:', info.componentStack);
    } catch {}
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={s.wrap}>
        <View style={s.dot} />
        <Text style={s.txt}>
          {this.props.label ? `${this.props.label} · ` : ''}WIDGET OFFLINE
        </Text>
      </View>
    );
  }
}

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: 12, marginVertical: 6,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1,
    borderColor: '#FF2A1F40',
    backgroundColor: '#1A0A0A',
  },
  dot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF2A1F' },
  txt:  { fontSize: 9.5, fontFamily: MONO, fontWeight: '900', letterSpacing: 1.4, color: '#FF6660' },
});
