/**
 * DiagnosticOverlay — On-device debug HUD.
 *
 * Renders a small, always-on-top panel that shows:
 *   • Current pathname
 *   • Boot stage timestamps from AsyncStorage (@butler_boot_*)
 *   • Last 8 console.error / console.warn messages captured during runtime
 *   • Tap to copy current state to clipboard / dismiss
 *
 * Activate by setting AsyncStorage key `@butler_diag` to `"1"` from any
 * accessible context (e.g. settings) OR set EXPO_PUBLIC_DIAG=1 in env.
 * In normal use it stays dormant. When activated, the user sees the
 * HUD and can screenshot it — giving us EXACT diagnostic data from the
 * device without needing adb logcat.
 *
 * Safe to mount globally: only fires console capture when active.
 */
import React, { Component } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const MAX_LOG = 12;

interface State {
  visible: boolean;
  collapsed: boolean;
  pathname: string;
  bootMarks: Record<string, string>;
  logs: { level: 'E' | 'W' | 'L'; msg: string; ts: number }[];
}

class _DiagnosticOverlayInner extends Component<{ pathname: string }, State> {
  state: State = { visible: false, collapsed: false, pathname: '', bootMarks: {}, logs: [] };
  private origErr?: any;
  private origWarn?: any;
  private mounted = false;

  async componentDidMount() {
    this.mounted = true;
    try {
      const flag = await AsyncStorage.getItem('@butler_diag').catch(() => null);
      const envFlag = (process as any)?.env?.EXPO_PUBLIC_DIAG;
      const active = flag === '1' || envFlag === '1';
      if (!active) return;

      this.setState({ visible: true });
      this.installConsoleCapture();
      this.loadBootMarks();
      // Auto-refresh boot marks every 1.5s
      const tick = () => {
        if (!this.mounted) return;
        this.loadBootMarks();
        setTimeout(tick, 1500);
      };
      setTimeout(tick, 1500);
    } catch {}
  }

  componentWillUnmount() {
    this.mounted = false;
    try { if (this.origErr) console.error = this.origErr; } catch {}
    try { if (this.origWarn) console.warn = this.origWarn; } catch {}
  }

  componentDidUpdate(prev: { pathname: string }) {
    if (prev.pathname !== this.props.pathname) {
      this.setState({ pathname: this.props.pathname });
    }
  }

  private installConsoleCapture() {
    this.origErr = console.error;
    this.origWarn = console.warn;
    console.error = (...args: any[]) => {
      this.pushLog('E', args.map((a) => safeStr(a)).join(' '));
      try { this.origErr?.(...args); } catch {}
    };
    console.warn = (...args: any[]) => {
      this.pushLog('W', args.map((a) => safeStr(a)).join(' '));
      try { this.origWarn?.(...args); } catch {}
    };
  }

  private pushLog(level: 'E' | 'W' | 'L', msg: string) {
    if (!this.mounted) return;
    this.setState((s) => ({ logs: [...s.logs, { level, msg: msg.slice(0, 200), ts: Date.now() }].slice(-MAX_LOG) }));
  }

  private async loadBootMarks() {
    if (!this.mounted) return;
    try {
      const keys = ['@butler_boot_layout_executed', '@butler_boot_effect_fired', '@butler_boot_splash_hidden', '@butler_boot_services_done', '@butler_boot_complete_at', '@butler_onboarding_done_v2', '@butler_onboarding_exit_at'];
      const pairs = await AsyncStorage.multiGet(keys).catch(() => [] as any);
      const out: Record<string, string> = {};
      for (const [k, v] of pairs) out[k.replace('@butler_', '')] = v ?? '—';
      this.setState({ bootMarks: out });
    } catch {}
  }

  private toggleCollapse = () => this.setState((s) => ({ collapsed: !s.collapsed }));
  private hide = () => {
    AsyncStorage.setItem('@butler_diag', '0').catch(() => {});
    this.setState({ visible: false });
  };

  render() {
    if (!this.state.visible) return null;
    const { collapsed, pathname, bootMarks, logs } = this.state;
    if (collapsed) {
      return (
        <TouchableOpacity style={s.dot} onPress={this.toggleCollapse} activeOpacity={0.7}>
          <Text style={s.dotTxt}>DIAG</Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={s.root} pointerEvents="box-none">
        <View style={s.panel} pointerEvents="auto">
          <View style={s.header}>
            <Text style={s.title}>BUTLER DIAGNOSTIC</Text>
            <TouchableOpacity onPress={this.toggleCollapse} style={s.hdrBtn}><Text style={s.hdrBtnTxt}>—</Text></TouchableOpacity>
            <TouchableOpacity onPress={this.hide}        style={s.hdrBtn}><Text style={s.hdrBtnTxt}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={s.body}>
            <Text style={s.label}>PATH:</Text>
            <Text style={s.val}>{pathname || '(none)'}</Text>
            <Text style={s.label}>BOOT MARKS:</Text>
            {Object.entries(bootMarks).map(([k, v]) => (
              <Text key={k} style={s.val}>{k}: {v}</Text>
            ))}
            <Text style={s.label}>LOGS (last {logs.length}/{MAX_LOG}):</Text>
            {logs.length === 0 ? <Text style={s.dim}>(no errors / warnings yet)</Text> : null}
            {logs.map((l, i) => (
              <Text key={i} style={[s.val, l.level === 'E' ? s.errLog : s.warnLog]} numberOfLines={3}>
                [{l.level}] {l.msg}
              </Text>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }
}

function safeStr(x: any): string {
  try {
    if (x == null) return String(x);
    if (typeof x === 'string') return x;
    if (x?.message) return String(x.message);
    return JSON.stringify(x).slice(0, 200);
  } catch { return '[unstringifiable]'; }
}

// Functional wrapper to access usePathname hook from class
export default function DiagnosticOverlay() {
  let pathname = '';
  try { pathname = usePathname() ?? ''; } catch {}
  return <_DiagnosticOverlayInner pathname={pathname} />;
}

const s = StyleSheet.create({
  root:     { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, paddingTop: Platform.OS === 'ios' ? 48 : 28 },
  panel:    { marginHorizontal: 12, maxHeight: 360, borderWidth: 1, borderColor: '#FFB02080', backgroundColor: '#0A0A12EE', borderRadius: 8, overflow: 'hidden' },
  header:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFB02022', paddingHorizontal: 10, paddingVertical: 6 },
  title:    { flex: 1, fontSize: 10, fontWeight: '900', color: '#FFB020', letterSpacing: 1.5, fontFamily: MONO },
  hdrBtn:   { paddingHorizontal: 8, paddingVertical: 2, marginLeft: 4, borderRadius: 3, backgroundColor: '#FFB02022' },
  hdrBtnTxt:{ fontSize: 11, color: '#FFB020', fontWeight: '900' },
  body:     { paddingHorizontal: 10, paddingVertical: 6 },
  label:    { fontSize: 9, color: '#7FE5D6', letterSpacing: 1.2, fontWeight: '900', marginTop: 6, fontFamily: MONO },
  val:      { fontSize: 10, color: '#E6FFFA', marginTop: 2, fontFamily: MONO },
  dim:      { fontSize: 10, color: '#7FE5D680', marginTop: 2, fontFamily: MONO, fontStyle: 'italic' },
  errLog:   { color: '#FF6B6B' },
  warnLog:  { color: '#FFB020' },
  dot:      { position: 'absolute', top: Platform.OS === 'ios' ? 52 : 30, right: 12, zIndex: 9999, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#FFB02080', backgroundColor: '#0A0A12CC' },
  dotTxt:   { fontSize: 9, color: '#FFB020', fontWeight: '900', letterSpacing: 1.2, fontFamily: MONO },
});
