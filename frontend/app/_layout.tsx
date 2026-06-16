/**
 * Butler AI — Root Layout (v10 — bulletproof cold-start)
 * ──────────────────────────────────────────────────────────────────
 * COLD-START CONTRACT
 *   1. `safeDimensionsShim` patches Dimensions.get() BEFORE anything
 *      else can read it (prevents NaN crashes in ~19 files that read
 *      width/height at module load).
 *   2. `SplashScreen.preventAutoHideAsync()` runs once at module load.
 *   3. A *short* (800 ms) hard-timeout fallback fires hideAsync() —
 *      whether or not React ever mounts. This guarantees the splash
 *      never sticks past 800 ms even if a deep import crashes.
 *   4. `useLayoutEffect` hides the splash immediately on first commit.
 *   5. Bootstrap services run in the background, each independently
 *      wrapped in try/catch so a single failure can never block paint.
 *
 * NO BootCurtain. The native splash + first paint is enough — adding
 * a JS-side curtain on top of an already-fragile cold-start window
 * was net-negative (more animations = more surface for crashes).
 */
// ⚠ This import MUST be first — it monkey-patches Dimensions.get()
//   so subsequent module-load reads can never see width=0/height=0.
import '@/services/safeDimensionsShim';
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

// ── KEEP SPLASH VISIBLE UNTIL FIRST REACT FRAME ──────────────────────────
// Called exactly once at module evaluation. Paired with hideAsync() below.
try { SplashScreen.preventAutoHideAsync().catch(() => {}); } catch {}

// Hard safety net — fires hideAsync() at 800 ms regardless of React state.
// Drastically shorter than the old 2.5 s value: even if the JS module-load
// chain partially fails, the user is never stuck staring at a black splash
// for more than ~1 s. Anything past 800 ms is "broken" anyway.
const _splashHardTimer: any = (typeof setTimeout !== 'undefined') ? setTimeout(() => {
  try { SplashScreen.hideAsync().catch(() => {}); } catch {}
}, 800) : null;

// Belt + suspenders — schedule another hideAsync on the next microtask in
// case `setTimeout` itself is starved by a long synchronous task.
try {
  Promise.resolve().then(() => {
    setTimeout(() => { try { SplashScreen.hideAsync().catch(() => {}); } catch {} }, 50);
  });
} catch {}

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
          </View>
        </TabBarProvider>
      </CosmeticProvider>
    </GlobalErrorBoundary>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
});
