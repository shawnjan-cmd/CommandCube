/**
 * Butler AI — Root Layout · CLEAN REWRITE v11
 * ──────────────────────────────────────────────────────────────────
 *
 * COLD-START CONTRACT
 *   1. `safeDimensionsShim` (auto-installs on import) patches
 *      Dimensions.get() so module-load reads can never see 0.
 *   2. `bootCrashLogger.installBootCrashLogger()` hooks the global
 *      JS error handler so any cold-start crash is persisted to
 *      AsyncStorage and surfaced as a red banner on the NEXT launch.
 *   3. `SplashScreen.preventAutoHideAsync()` keeps the splash up
 *      until React's first commit. `useLayoutEffect` hides it
 *      synchronously after first paint.
 *   4. Background `bootstrapServices()` is deferred 1500ms after
 *      mount and each step is independently try-wrapped.
 *
 * DELIBERATE OMISSIONS
 *   • No try/catch around `useAppSync()` — that's a Rules-of-Hooks
 *     violation. The hook only does `useRef + useEffect` and can't
 *     throw at render. If it ever does, the error boundary catches.
 *   • No 800ms hard-timeout splash kill, no microtask splash kill —
 *     the layout layer fires hideAsync synchronously on first commit;
 *     additional kills were redundant guards causing log noise.
 *   • No ad-hoc fallback render trees — one `GlobalErrorBoundary`
 *     handles every render crash, period.
 */

// ⚠ MUST be first — patches Dimensions.get() before any other module
//   can call it.
import '@/services/safeDimensionsShim';
// ⚠ MUST be second — hooks the global JS error handler. Module-eval
//   errors in any later import will be persisted and shown next launch.
import {
  installBootCrashLogger,
  readAndClearLastCrash,
  recordBoundaryCrash,
  markHomeReached,
} from '@/services/bootCrashLogger';
installBootCrashLogger();

import React, { Component, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TabBarProvider }  from '@/contexts/TabBarContext';
import { CosmeticProvider } from '@/contexts/CosmeticContext';
import { useAppSync }      from '@/hooks/useAppSync';
import { ONBOARDING_DONE_KEY, WELCOME_COMPLETE_KEY } from '@/constants/onboardingKeys';

// Keep splash visible until first React frame.
try { SplashScreen.preventAutoHideAsync().catch(() => {}); } catch {}

// ═══════════════════════════════════════════════════════════════════
// ERROR BOUNDARY
// ═══════════════════════════════════════════════════════════════════
interface EBState { error: Error | null; resetCount: number; }
class GlobalErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null, resetCount: 0 };
  static getDerivedStateFromError(error: Error): any { return { error }; }
  componentDidCatch(error: Error) {
    recordBoundaryCrash(error);
    console.error('[GlobalErrorBoundary]', error?.message);
  }
  private reinit = () => this.setState(s => ({ error: null, resetCount: s.resetCount + 1 }));
  render() {
    if (!this.state.error) {
      return <React.Fragment key={`eb-${this.state.resetCount}`}>{this.props.children}</React.Fragment>;
    }
    return (
      <View style={eb.root}>
        <View style={eb.iconWrap}>
          <MaterialIcons name="warning" size={38} color="#ef4444" />
        </View>
        <Text style={eb.title}>SYSTEM FAULT</Text>
        <View style={eb.errBox}>
          <Text style={eb.errMsg} numberOfLines={6}>{this.state.error.message}</Text>
        </View>
        <TouchableOpacity style={eb.btn} onPress={this.reinit} activeOpacity={0.8}>
          <MaterialIcons name="refresh" size={16} color="#ef4444" />
          <Text style={eb.btnTxt}>REINITIALIZE</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const eb = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 28 },
  iconWrap: { width: 70, height: 70, borderRadius: 35, borderWidth: 1.5, borderColor: '#ef444499', alignItems: 'center', justifyContent: 'center', marginBottom: 18, backgroundColor: '#ef444415' },
  title:    { fontSize: 22, fontWeight: '900', color: '#ef4444', letterSpacing: 4, marginBottom: 18, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  errBox:   { width: '100%', maxWidth: 360, borderWidth: 1, borderRadius: 10, borderColor: '#ef444433', backgroundColor: '#ef44440a', padding: 14, marginBottom: 22 },
  errMsg:   { fontSize: 12, color: '#fecaca', lineHeight: 19 },
  btn:      { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 12, backgroundColor: '#ef444415' },
  btnTxt:   { fontSize: 13, fontWeight: '900', color: '#ef4444', letterSpacing: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
});

// ═══════════════════════════════════════════════════════════════════
// APP-SYNC RUNNER (one hook, mounted once)
// ═══════════════════════════════════════════════════════════════════
function AppSyncRunner() {
  useAppSync();
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// BACKGROUND BOOTSTRAP — fire-and-forget, never blocks render
// ═══════════════════════════════════════════════════════════════════
async function bootstrapServices() {
  try { (await import('@/services/errorInterceptor'))?.errorInterceptor?.install?.(); } catch {}
  try { (await import('@/services/privacyAudit'))?.privacyAudit?.install?.(); } catch {}
  try { (await import('@/services/proLicense'))?.proLicense?.load?.().catch(() => {}); } catch {}
  try { await import('@/services/imageRegistry'); } catch {}
  try {
    const idMod = await import('@/services/deviceIdentifier');
    const id    = await idMod?.deviceIdentifier?.getDeviceId?.().catch(() => null);
    if (id) {
      const enc = await import('@/services/encryptedStorage');
      await enc.encryptedStorage.init(id);
      await enc.encryptedStorage.migrate();
    }
  } catch {}
  try { (await import('@/services/systemUpgrade'))?.applyBootOverrides?.(); } catch {}
  try {
    const [v2, v1] = await Promise.all([
      AsyncStorage.getItem(ONBOARDING_DONE_KEY),
      AsyncStorage.getItem(WELCOME_COMPLETE_KEY),
    ]);
    const onboarded = v2 === '1' || v2 === 'true' || v1 === '1' || v1 === 'true';
    if (onboarded) {
      const m = await import('@/services/autoConnectEngine');
      m?.autoConnectEngine?.start?.().catch(() => {});
    }
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════
// ROOT LAYOUT
// ═══════════════════════════════════════════════════════════════════
export default function RootLayout() {
  const bootRef = useRef(false);
  const [prevCrash, setPrevCrash] = useState<null | { message: string; stack?: string }>(null);

  // Hide splash on first commit.
  useLayoutEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Read any crash from the previous session (fire-and-forget).
  useEffect(() => {
    readAndClearLastCrash().then(c => {
      if (c?.message) setPrevCrash({ message: c.message, stack: c.stack });
    }).catch(() => {});
  }, []);

  // If we've been alive 3s without dying, mark home reached so we
  // don't show stale crashes to a user whose problem is fixed.
  useEffect(() => {
    const t = setTimeout(() => { markHomeReached().catch(() => {}); }, 3000);
    return () => clearTimeout(t);
  }, []);

  // Background services start 1500ms after mount.
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    const t = setTimeout(() => { bootstrapServices().catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <GlobalErrorBoundary>
      <CosmeticProvider>
        <TabBarProvider>
          <AppSyncRunner />
          <View style={s.container}>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
              <Stack.Screen name="index"          options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)"         options={{ headerShown: false }} />
              <Stack.Screen name="privacy-policy" options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="terms"          options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="category/[id]"  options={{ headerShown: false }} />
              <Stack.Screen name="data-safety"    options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="privacy-audit"  options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="+not-found"     options={{ headerShown: false }} />
            </Stack>

            {/* Previous-launch crash banner — only ever shows if the
                last cold start crashed. Dismissible. Gives the user a
                visible error message without ever needing logcat. */}
            {prevCrash ? (
              <View pointerEvents="box-none" style={pcb.wrap}>
                <View style={pcb.card}>
                  <Text style={pcb.title}>PREVIOUS LAUNCH CRASHED</Text>
                  <Text style={pcb.msg} numberOfLines={6}>{prevCrash.message}</Text>
                  {prevCrash.stack ? (
                    <Text style={pcb.stack} numberOfLines={8}>
                      {prevCrash.stack.split('\n').slice(0, 8).join('\n')}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    style={pcb.btn}
                    onPress={() => setPrevCrash(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={pcb.btnTxt}>DISMISS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        </TabBarProvider>
      </CosmeticProvider>
    </GlobalErrorBoundary>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});

const pcb = StyleSheet.create({
  wrap:  { position: 'absolute', top: 0, left: 0, right: 0, padding: 12, paddingTop: Platform.OS === 'ios' ? 48 : 24, zIndex: 9999 },
  card:  { backgroundColor: '#1a0204', borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 10, padding: 14 },
  title: { fontSize: 12, fontWeight: '900', color: '#ef4444', letterSpacing: 2, marginBottom: 8, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  msg:   { fontSize: 13, color: '#FFCCCC', lineHeight: 18, marginBottom: 6 },
  stack: { fontSize: 10, color: '#FFAAAA88', lineHeight: 14, marginBottom: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  btn:   { alignSelf: 'flex-end', borderWidth: 1, borderColor: '#ef4444', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 6 },
  btnTxt:{ fontSize: 11, fontWeight: '900', color: '#ef4444', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
});
