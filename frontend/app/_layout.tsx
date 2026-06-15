/**
 * Butler AI — Root Layout (CLEAN v8.0.0)
 *
 * ARCHITECTURE
 * ────────────
 * Onboarding is a regular TAB route: /(tabs)/onboarding
 *   • app/index.tsx reads the completion flag and redirects to
 *     /(tabs)/onboarding (first run) or /(tabs)/nexushome (returning user).
 *   • The tab bar inside (tabs)/_layout.tsx hides itself while the user
 *     is on the onboarding tab so they cannot skip ahead.
 *   • On the final onboarding screen the user taps LAUNCH, the AsyncStorage
 *     keys are persisted, and we router.replace() to /(tabs)/nexushome.
 *
 * This root layout therefore does NOT contain any onboarding overlay,
 * polling, hardcoded globals, modal scrim, or duplicate gate logic. All
 * that machinery has been removed. The root layout's sole responsibility
 * is:
 *   1. Mount the Stack with valid routes only.
 *   2. Install global error guards.
 *   3. Start background services (auto-connect, error logger, etc.)
 *      once onboarding has been completed.
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import React, { Component, useEffect, useRef, ReactNode } from 'react';
import { View, Text, StyleSheet, Platform, Animated, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TabBarProvider } from '@/contexts/TabBarContext';
import { CosmeticProvider } from '@/contexts/CosmeticContext';
import { useAppSync } from '@/hooks/useAppSync';
import { ONBOARDING_DONE_KEY } from '@/constants/onboardingKeys';
import { withTimeout } from '@/utils/withTimeout';

// ── GLOBAL UNHANDLED PROMISE & ERROR GUARD ──────────────────────────────────
(() => {
  try {
    const g: any = global as any;
    if (!g.__butler_global_guards_installed) {
      g.__butler_global_guards_installed = true;
      const orig = g.HermesInternal?.setPromiseRejectionTracker;
      if (orig) {
        orig.call(g.HermesInternal, {
          allRejections: true,
          onUnhandled: (id: number, error: any) => {
            try { console.warn('[GlobalGuard] unhandled rejection #' + id + ':', error?.message || error); } catch {}
          },
          onHandled: () => {},
        });
      }
    }
  } catch {}
})();

// ── ROOT WINDOW BACKGROUND ─────────────────────────────────────────────────
// Sets the Android Activity / iOS UIView root-window background color so
// any moment the React tree is being mounted/swapped/unmounted, the user
// sees Butler-themed dark navy instead of pure black. This eliminates the
// brief black flash that can occur between the splash hiding and the React
// tree's first paint — a common false-positive "black screen" symptom.
try { SystemUI.setBackgroundColorAsync('#050A12').catch(() => {}); } catch {}

// ── NATIVE SPLASH POLICY (IMPORTANT — black-screen prevention) ─────────────
// We DO NOT call preventAutoHideAsync() because:
//   • Our splash background (#050202) is near-black. If anything stalls
//     (slow AsyncStorage, hung native module, JSI bridge cold-start), the
//     user sees a pure black screen with no indication the app is alive.
//   • Letting the splash auto-hide guarantees that the moment JS is ready,
//     the user sees the React tree — even if our first screen is just a
//     loading indicator, it's clearly "alive" instead of black.
//
// We still keep a HARD 5-second hideAsync() force-call as a belt-and-suspenders
// safety net for the rare devices where auto-hide doesn't kick in.
try {
  setTimeout(() => {
    try { SplashScreen.hideAsync().catch(() => {}); } catch {}
  }, 5000);
} catch {}

// ─── GLOBAL ERROR BOUNDARY ──────────────────────────────────────────────────
interface EBState { error: Error | null; }
class GlobalErrorBoundary extends Component<{ children: ReactNode }, EBState & { resetCount: number; reloadConfirm: boolean }> {
  state = { error: null as Error | null, resetCount: 0, reloadConfirm: false };
  static getDerivedStateFromError(error: Error): any { return { error }; }
  componentDidCatch(error: Error) {
    try { require('@/services/autoErrorLogger').autoErrorLogger.log('error', 'GlobalErrorBoundary', error.message); } catch {}
    console.error('[GlobalErrorBoundary] uncaught:', error?.message);
  }
  private handleReinit = () => {
    this.setState({ error: null, resetCount: this.state.resetCount + 1, reloadConfirm: false });
  };
  private handleHardReload = () => {
    if (!this.state.reloadConfirm) {
      this.setState({ reloadConfirm: true });
      setTimeout(() => { try { this.setState({ reloadConfirm: false }); } catch {} }, 4000);
      return;
    }
    try { require('react-native').DevSettings?.reload?.(); } catch (e) {
      console.warn('[GlobalErrorBoundary] DevSettings.reload failed:', e);
      this.handleReinit();
    }
  };
  render() {
    if (this.state.error) {
      const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
      return (
        <View style={eb.root}>
          <View style={eb.gridH} /><View style={eb.gridV} />
          <View style={[eb.corner, { top: 28, left: 20, borderTopWidth: 2, borderLeftWidth: 2 }]} />
          <View style={[eb.corner, { top: 28, right: 20, borderTopWidth: 2, borderRightWidth: 2 }]} />
          <View style={[eb.corner, { bottom: 28, left: 20, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
          <View style={[eb.corner, { bottom: 28, right: 20, borderBottomWidth: 2, borderRightWidth: 2 }]} />
          <View style={eb.iconWrap}>
            <View style={eb.iconInner}>
              <MaterialIcons name="warning" size={38} color="#FF3131" />
            </View>
          </View>
          <Text style={[eb.title, { fontFamily: MONO }]}>SYSTEM FAULT</Text>
          <View style={eb.divider} />
          <View style={eb.errorBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#CC3333' }} />
              <Text style={[eb.errorLabel, { fontFamily: MONO }]}>EXCEPTION CAUGHT</Text>
            </View>
            <Text style={[eb.errorMsg, { fontFamily: MONO }]} numberOfLines={6}>
              {this.state.error.message}
            </Text>
          </View>
          <TouchableOpacity style={eb.btn} onPress={this.handleReinit} activeOpacity={0.8}>
            <MaterialIcons name="refresh" size={16} color="#FFFFFF" />
            <Text style={[eb.btnTxt, { fontFamily: MONO }]}>REINITIALIZE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[eb.btn, {
              backgroundColor: this.state.reloadConfirm ? '#FFB020' : 'transparent',
              borderWidth: 1.5, borderColor: '#FFB020', marginTop: 10,
            }]}
            onPress={this.handleHardReload}
            activeOpacity={0.8}>
            <MaterialIcons name="restart-alt" size={16} color={this.state.reloadConfirm ? '#000' : '#FFB020'} />
            <Text style={[eb.btnTxt, { fontFamily: MONO, color: this.state.reloadConfirm ? '#000' : '#FFB020' }]}>
              {this.state.reloadConfirm ? 'TAP AGAIN TO CONFIRM' : 'HARD RELOAD'}
            </Text>
          </TouchableOpacity>
          <View style={eb.badge}>
            <Text style={[eb.badgeTxt, { fontFamily: MONO }]}>
              GLOBAL ERROR BOUNDARY · BUTLER AI v8.0
            </Text>
          </View>
        </View>
      );
    }
    return <React.Fragment key={`eb-${this.state.resetCount}`}>{this.props.children}</React.Fragment>;
  }
}

const eb = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#030608', alignItems: 'center', justifyContent: 'center', padding: 28 },
  gridH:     { position: 'absolute', top: '50%', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,49,49,0.06)' },
  gridV:     { position: 'absolute', left: '50%', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,49,49,0.06)' },
  corner:    { position: 'absolute', width: 20, height: 20, borderColor: 'rgba(255,49,49,0.4)' },
  iconWrap:  { width: 92, height: 92, borderRadius: 46, borderWidth: 1.5, borderColor: 'rgba(255,49,49,0.4)', alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: 'rgba(255,49,49,0.04)' },
  iconInner: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: 'rgba(255,49,49,0.65)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,49,49,0.09)' },
  title:     { fontSize: 22, fontWeight: '900', color: '#CC3333', letterSpacing: 4, marginBottom: 14 },
  divider:   { width: 60, height: 2, backgroundColor: '#CC3333', borderRadius: 1, marginBottom: 20, opacity: 0.55 },
  errorBox:  { width: '100%', borderWidth: 1, borderRadius: 12, borderColor: 'rgba(255,49,49,0.22)', backgroundColor: 'rgba(255,49,49,0.04)', padding: 14, marginBottom: 24 },
  errorLabel:{ fontSize: 9, fontWeight: '900', color: '#CC3333', letterSpacing: 1.5 },
  errorMsg:  { fontSize: 12, color: '#8C95A6', lineHeight: 19 },
  btn:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: 'rgba(0,255,136,0.5)', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 13, backgroundColor: 'rgba(0,255,136,0.06)', marginBottom: 20 },
  btnTxt:    { fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 },
  badge:     { borderWidth: 1, borderRadius: 6, borderColor: 'rgba(255,49,49,0.2)', paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(255,49,49,0.04)' },
  badgeTxt:  { fontSize: 9, fontWeight: '700', color: '#CC3333', letterSpacing: 0.8, opacity: 0.7 },
});

// ─── ROOT LAYOUT ─────────────────────────────────────────────────────────────
export default function RootLayout() {
  // useAppSync is wrapped in try/catch via a stable hook ref — never throws.
  try { useAppSync(); } catch (e) { /* eslint-disable-next-line no-console */ console.warn('[_layout] useAppSync failed:', e); }
  const bootRef = useRef(false);

  // ── BOOT DIAGNOSTIC HELPER ────────────────────────────────────────────────
  // Writes timestamped boot stage markers to AsyncStorage. If the user ever
  // hits a black screen again, these will tell us EXACTLY how far boot got
  // (visible via Settings → "Reset App Data" debug dump). Fire-and-forget,
  // never awaited, never throws.
  const mark = (stage: string) => {
    try {
      AsyncStorage.setItem(`@butler_boot_${stage}`, String(Date.now())).catch(() => {});
    } catch {}
  };

  // Stage 1: RootLayout function body executed (React has called us)
  mark('layout_executed');

  // One-shot bootstrap: install error/privacy interceptors, hide native splash,
  // and start background services if the user has already completed onboarding.
  // EVERY side-effect is wrapped in try/catch so a single service failure can
  // never produce a black screen on a fresh install.
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;

    // Stage 2: useEffect fired → React mount cycle is alive.
    mark('effect_fired');

    // Defer all heavy I/O to next tick so React can mount FIRST. This is the
    // critical fix for the "black screen after APK install" bug — module-level
    // side-effects were blocking the first paint.
    const t = setTimeout(() => {
      // 1. Hide native splash IMMEDIATELY so UI is visible even if init lags.
      try { SplashScreen.hideAsync().catch(() => {}); } catch {}
      mark('splash_hidden');

      // 2. Boot services — each wrapped in try/catch AND withTimeout so a
      //    single hung dynamic import can NEVER produce a black screen. The
      //    timeout per stage is set deliberately tight (1.5-3s) because none
      //    of these services are required for first paint; they all enhance
      //    later interactions and can complete or fail in the background.
      (async () => {
        // Error interceptor — composes with any existing global handler
        try {
          const mod = await withTimeout(import('@/services/errorInterceptor'), 2500, 'errorInterceptor import');
          (mod as any)?.errorInterceptor?.install?.();
        } catch (e) { console.warn('[_layout] errorInterceptor install failed:', e); }

        // Privacy audit
        try {
          const mod = await withTimeout(import('@/services/privacyAudit'), 2500, 'privacyAudit import');
          (mod as any)?.privacyAudit?.install?.();
        } catch (e) { console.warn('[_layout] privacyAudit install failed:', e); }

        // Pro license — fully fire-and-forget (per guide §2.1 — app is FREE,
        // this should never block UI)
        try {
          const mod = await withTimeout(import('@/services/proLicense'), 1500, 'proLicense import');
          (mod as any)?.proLicense?.load?.().catch(() => {});
        } catch (e) { console.warn('[_layout] proLicense load failed:', e); }

        // Image registry (side-effect import)
        try { await withTimeout(import('@/services/imageRegistry'), 2500, 'imageRegistry import'); }
        catch (e) { console.warn('[_layout] imageRegistry import failed:', e); }

        // Device identifier
        try {
          const mod = await withTimeout(import('@/services/deviceIdentifier'), 2500, 'deviceIdentifier import');
          await withTimeout((mod as any)?.deviceIdentifier?.getDeviceId?.() ?? Promise.resolve(null), 2000, 'deviceIdentifier.getDeviceId');
        } catch (e) { console.warn('[_layout] deviceIdentifier failed:', e); }

        // System upgrade overrides — idempotent via version check inside
        try {
          const m = await withTimeout(import('@/services/systemUpgrade'), 2500, 'systemUpgrade import');
          (m as any)?.applyBootOverrides?.();
        } catch (e) { console.warn('[_layout] systemUpgrade failed:', e); }

        // Encrypted storage init (only if device id is already cached)
        try {
          const enc = await withTimeout(import('@/services/encryptedStorage'), 2500, 'encryptedStorage import');
          const id  = await withTimeout(AsyncStorage.getItem('commandcube_device_id'), 1500, 'AsyncStorage getItem device id');
          if (id && enc) {
            await withTimeout((enc as any).encryptedStorage.init(id), 2000, 'encryptedStorage.init');
            await withTimeout((enc as any).encryptedStorage.migrate(), 2000, 'encryptedStorage.migrate');
          }
        } catch (e) { console.warn('[_layout] encryptedStorage init failed:', e); }

        // Conditionally start auto-connect (only if onboarded)
        try {
          const v = await withTimeout(AsyncStorage.getItem(ONBOARDING_DONE_KEY), 1500, 'AsyncStorage onboarding flag');
          const onboarded = v === '1' || v === 'true';
          if (onboarded) {
            const mod = await withTimeout(import('@/services/autoConnectEngine'), 2500, 'autoConnectEngine import');
            (mod as any)?.autoConnectEngine?.start?.().catch(() => {});
          }
        } catch (e) { console.warn('[_layout] autoConnect bootstrap failed:', e); }

        // Stage 3: All boot services attempted.
        mark('services_done');
      })().catch((e) => console.warn('[_layout] bootstrap chain failed:', e));
    }, 0);

    return () => clearTimeout(t);
  }, []);

  return (
    <GlobalErrorBoundary>
      <CosmeticProvider>
        <TabBarProvider>
          <View style={s.container}>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#050505' } }}>
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
  container: { flex: 1, backgroundColor: '#050505' },
});
