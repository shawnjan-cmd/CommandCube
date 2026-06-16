/**
 * Butler AI — Root Layout (v9.1 — splash hand-off restored)
 * ──────────────────────────────────────────────────────────────────
 * v9.0 removed the splash logic entirely → caused a BLACK screen
 * because the system splash auto-hides as soon as JS starts but
 * React still needs ~1-3s to mount the first frame.
 *
 * v9.1 restores the OFFICIAL expo-splash-screen contract:
 *   1. preventAutoHideAsync() once at module load
 *   2. hideAsync() from the root layout's first useLayoutEffect
 *      (fires after the React tree commits)
 *   3. 2.5 s safety timeout fallback (in case effect never fires)
 *
 * No watchdog. No recovery mode. No heartbeat. Just the standard
 * pattern that ships in every Expo template.
 */
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { Component, useEffect, useLayoutEffect, useRef, ReactNode } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TabBarProvider } from '@/contexts/TabBarContext';
import { CosmeticProvider } from '@/contexts/CosmeticContext';
import { useAppSync } from '@/hooks/useAppSync';
import { ONBOARDING_DONE_KEY } from '@/constants/onboardingKeys';
import BootCurtain from '@/components/ui/BootCurtain';

// ── KEEP SPLASH VISIBLE UNTIL FIRST REACT FRAME ──────────────────────────
// Called exactly once at module evaluation. Must be paired with hideAsync().
SplashScreen.preventAutoHideAsync().catch(() => {});

// Hard safety net — if for ANY reason hideAsync() inside the layout never
// fires (early render throw, native module hang, etc.), force-hide after
// 2.5 s. This guarantees the splash never lingers past that point.
const _splashHardTimer = setTimeout(() => {
  SplashScreen.hideAsync().catch(() => {});
}, 2500);

// ─── GLOBAL ERROR BOUNDARY (kept — but pure black bg now) ──────────────
interface EBState { error: Error | null; resetCount: number; }
class GlobalErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null, resetCount: 0 };
  static getDerivedStateFromError(error: Error): any { return { error }; }
  componentDidCatch(error: Error) {
    try { require('@/services/autoErrorLogger').autoErrorLogger.log('error', 'GlobalErrorBoundary', error.message); } catch {}
    console.error('[GlobalErrorBoundary] uncaught:', error?.message);
  }
  private handleReinit = () => this.setState((s) => ({ error: null, resetCount: s.resetCount + 1 }));
  render() {
    if (this.state.error) {
      const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
      return (
        <View style={eb.root}>
          <View style={eb.iconWrap}>
            <MaterialIcons name="warning" size={38} color="#FF3131" />
          </View>
          <Text style={[eb.title, { fontFamily: MONO }]}>SYSTEM FAULT</Text>
          <View style={eb.errorBox}>
            <Text style={[eb.errorMsg, { fontFamily: MONO }]} numberOfLines={6}>
              {this.state.error.message}
            </Text>
          </View>
          <TouchableOpacity style={eb.btn} onPress={this.handleReinit} activeOpacity={0.8}>
            <MaterialIcons name="refresh" size={16} color="#FF3131" />
            <Text style={[eb.btnTxt, { fontFamily: MONO }]}>REINITIALIZE</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return <React.Fragment key={`eb-${this.state.resetCount}`}>{this.props.children}</React.Fragment>;
  }
}

const eb = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', padding: 28 },
  iconWrap:  { width: 70, height: 70, borderRadius: 35, borderWidth: 1.5, borderColor: 'rgba(255,49,49,0.6)', alignItems: 'center', justifyContent: 'center', marginBottom: 18, backgroundColor: 'rgba(255,49,49,0.08)' },
  title:     { fontSize: 22, fontWeight: '900', color: '#FF3131', letterSpacing: 4, marginBottom: 18 },
  errorBox:  { width: '100%', maxWidth: 360, borderWidth: 1, borderRadius: 10, borderColor: 'rgba(255,49,49,0.22)', backgroundColor: 'rgba(255,49,49,0.04)', padding: 14, marginBottom: 22 },
  errorMsg:  { fontSize: 12, color: '#FFCCCC', lineHeight: 19 },
  btn:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#FF3131', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 12, backgroundColor: 'rgba(255,49,49,0.08)' },
  btnTxt:    { fontSize: 13, fontWeight: '900', color: '#FF3131', letterSpacing: 2 },
});

// ── Safe wrapper for the app-sync hook (Rules of Hooks compliant) ─────
function AppSyncRunner() {
  try { useAppSync(); } catch (e) { console.warn('[_layout] useAppSync failed:', e); }
  return null;
}

// ── Background bootstrap. Fire-and-forget, never blocks render ────────
async function bootstrapServices() {
  // Each step is independent and silently fails on its own.
  try {
    const mod = await import('@/services/errorInterceptor');
    (mod as any)?.errorInterceptor?.install?.();
  } catch (e) { console.warn('[bootstrap] errorInterceptor:', e); }

  try {
    const mod = await import('@/services/privacyAudit');
    (mod as any)?.privacyAudit?.install?.();
  } catch (e) { console.warn('[bootstrap] privacyAudit:', e); }

  try {
    const mod = await import('@/services/proLicense');
    (mod as any)?.proLicense?.load?.().catch(() => {});
  } catch (e) { console.warn('[bootstrap] proLicense:', e); }

  try { await import('@/services/imageRegistry'); }
  catch (e) { console.warn('[bootstrap] imageRegistry:', e); }

  try {
    const mod = await import('@/services/deviceIdentifier');
    await (mod as any)?.deviceIdentifier?.getDeviceId?.();
  } catch (e) { console.warn('[bootstrap] deviceIdentifier:', e); }

  try {
    const m = await import('@/services/systemUpgrade');
    (m as any)?.applyBootOverrides?.();
  } catch (e) { console.warn('[bootstrap] systemUpgrade:', e); }

  try {
    const enc = await import('@/services/encryptedStorage');
    const id  = await AsyncStorage.getItem('commandcube_device_id');
    if (id) {
      await (enc as any).encryptedStorage.init(id);
      await (enc as any).encryptedStorage.migrate();
    }
  } catch (e) { console.warn('[bootstrap] encryptedStorage:', e); }

  try {
    const [v2, v1] = await Promise.all([
      AsyncStorage.getItem(ONBOARDING_DONE_KEY),
      AsyncStorage.getItem('@butler_welcome_complete_v1'),
    ]);
    const onboarded = v2 === '1' || v2 === 'true' || v1 === '1' || v1 === 'true';
    if (onboarded) {
      const mod = await import('@/services/autoConnectEngine');
      (mod as any)?.autoConnectEngine?.start?.().catch(() => {});
    }
  } catch (e) { console.warn('[bootstrap] autoConnect:', e); }
}

// ─── ROOT LAYOUT ─────────────────────────────────────────────────────────
export default function RootLayout() {
  const bootRef = useRef(false);

  // ── HIDE SPLASH at the earliest possible moment after React commits
  // useLayoutEffect fires synchronously after DOM mutations and before
  // the browser/native paints — perfect timing for splash hand-off.
  // We also clear the hard-timeout so it doesn't double-fire.
  useLayoutEffect(() => {
    clearTimeout(_splashHardTimer);
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    // Defer bootstrap to next microtask — never blocks first paint.
    Promise.resolve().then(() => { bootstrapServices().catch(() => {}); });
  }, []);

  return (
    <GlobalErrorBoundary>
      <CosmeticProvider>
        <TabBarProvider>
          <AppSyncRunner />
          <View style={s.container}>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }}>
              <Stack.Screen name="index"          options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)"         options={{ headerShown: false }} />
              <Stack.Screen name="privacy-policy" options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="terms"          options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="category/[id]"  options={{ headerShown: false }} />
              <Stack.Screen name="data-safety"    options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="privacy-audit"  options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="+not-found"     options={{ headerShown: false }} />
            </Stack>
            {/* Boot curtain — NEXUS-style branded initialization veil.
                Covers the brief gap between native-splash dismissal and
                the first tab paint with a polished hex-logo + circuit
                + progress-bar overlay. Auto-removes itself after 700 ms. */}
            <BootCurtain holdMs={700} />
          </View>
        </TabBarProvider>
      </CosmeticProvider>
    </GlobalErrorBoundary>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
});
