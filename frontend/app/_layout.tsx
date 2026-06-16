/**
 * Butler AI — Root Layout (CLEAN v8.1.0)
 *
 * ARCHITECTURE
 * ────────────
 * First-launch onboarding renders INLINE inside `app/index.tsx`:
 *   • app/index.tsx reads the completion flag.
 *   • If unset → renders OnboardingOverlay directly inline (no redirect,
 *     no (tabs) group involvement on first run — this sidesteps the EAS
 *     production-build routing edge case where (tabs) children failed
 *     to mount on cold start).
 *   • If set → emits <Redirect href="/(tabs)/nexushome" /> which mounts
 *     the tab navigator with nexushome focused (via initialRouteName).
 *   • On LAUNCH tap from Screen 10 → flag persisted → setDecision('go_home')
 *     re-renders <Redirect> → user lands on home tab.
 *
 * This root layout therefore does NOT contain any onboarding overlay,
 * polling, hardcoded globals, modal scrim, or duplicate gate logic. Its
 * sole responsibilities are:
 *   1. Mount the Stack with valid routes only.
 *   2. Install global error guards.
 *   3. Bootstrap background services (auto-connect, error logger, etc.)
 *      once onboarding has been completed.
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import React, { Component, useCallback, useEffect, useRef, ReactNode } from 'react';
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
// ── NATIVE SPLASH ──────────────────────────────────────────────────────────
// Canonical Expo splash pattern: hold the splash up at module-load with
// preventAutoHideAsync(), and hide it ONLY after the root View has actually
// rendered (via its onLayout callback in RootLayout below). This eliminates
// the black gap that occurred when the splash auto-hid before React was
// ready to paint.
SplashScreen.preventAutoHideAsync().catch(() => {});

// ── HARD-TIMEOUT SPLASH FALLBACK (FIX FOR 20+ BLUE-SCREEN BUILDS) ──────────
// If ANYTHING prevents the root View's onLayout from firing — a render
// error caught by GlobalErrorBoundary (whose error screen has no onLayout),
// a navigation race, a native module timing issue, etc. — the splash would
// otherwise stay on screen forever, looking exactly like a "blue screen
// of death". This unconditional 3-second timeout guarantees the splash is
// hidden no matter what. The View's onLayout still fires earlier in the
// happy path; this is purely a safety net.
setTimeout(() => {
  SplashScreen.hideAsync().catch(() => {});
}, 3000);

// ─── GLOBAL ERROR BOUNDARY ──────────────────────────────────────────────────
interface EBState { error: Error | null; }
class GlobalErrorBoundary extends Component<{ children: ReactNode }, EBState & { resetCount: number; reloadConfirm: boolean }> {
  state = { error: null as Error | null, resetCount: 0, reloadConfirm: false };
  static getDerivedStateFromError(error: Error): any { return { error }; }
  componentDidCatch(error: Error) {
    try { require('@/services/autoErrorLogger').autoErrorLogger.log('error', 'GlobalErrorBoundary', error.message); } catch {}
    // CRITICAL: If we caught an error during cold start, the root View's
    // onLayout will never fire — which means the splash never hides and
    // the user sees the splash background forever (the infamous "blue
    // screen"). Force-hide the splash here so the SYSTEM FAULT screen
    // becomes visible instead.
    try { SplashScreen.hideAsync().catch(() => {}); } catch {}
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
  // Writes timestamped boot stage markers to AsyncStorage. Fire-and-forget,
  // never awaited, never throws.
  const mark = (stage: string) => {
    try {
      AsyncStorage.setItem(`@butler_boot_${stage}`, String(Date.now())).catch(() => {});
    } catch {}
  };

  // Stage 1: RootLayout function body executed
  mark('layout_executed');

  // Hide the native splash THE MOMENT the root View renders its first frame.
  // This is the canonical Expo splash pattern: preventAutoHideAsync() holds
  // the splash up at module load, then onLayout fires when React has actually
  // painted, so the splash → React handoff happens with no visible gap.
  const onRootLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
    mark('splash_hidden');
    // Signal the boot watchdog (defined in /index.js) that the React tree
    // has successfully mounted and painted. This resets the boot-attempts
    // counter to 0 and cancels the 8s auto-reload timer.
    try {
      if (typeof (global as any).__butlerBootHeartbeat === 'function') {
        (global as any).__butlerBootHeartbeat();
      }
    } catch {}
  }, []);

  // Bootstrap background services AFTER React mounts. None of these are
  // required for first paint — they're all wrapped in try/catch + withTimeout
  // so a single failure can't cascade.
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;

    // Stage 2: useEffect fired
    mark('effect_fired');

    const t = setTimeout(() => {
      (async () => {
        // Error interceptor
        try {
          const mod = await withTimeout(import('@/services/errorInterceptor'), 2500, 'errorInterceptor import');
          (mod as any)?.errorInterceptor?.install?.();
        } catch (e) { console.warn('[_layout] errorInterceptor install failed:', e); }

        // Privacy audit
        try {
          const mod = await withTimeout(import('@/services/privacyAudit'), 2500, 'privacyAudit import');
          (mod as any)?.privacyAudit?.install?.();
        } catch (e) { console.warn('[_layout] privacyAudit install failed:', e); }

        // Pro license — fully fire-and-forget
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

        // System upgrade overrides
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
          <View style={s.container} onLayout={onRootLayout}>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#050A12' } }}>
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
  container: { flex: 1, backgroundColor: '#050A12' },
});
