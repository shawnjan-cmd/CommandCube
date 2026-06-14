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
import React, { Component, useEffect, useRef, ReactNode } from 'react';
import { View, Text, StyleSheet, Platform, Animated, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TabBarProvider } from '@/contexts/TabBarContext';
import { CosmeticProvider } from '@/contexts/CosmeticContext';
import { useAppSync } from '@/hooks/useAppSync';
import { deviceIdentifier } from '@/services/deviceIdentifier';
import { errorInterceptor } from '@/services/errorInterceptor';
import { privacyAudit } from '@/services/privacyAudit';
import { autoConnectEngine } from '@/services/autoConnectEngine';
import { proLicense } from '@/services/proLicense';
import { ONBOARDING_DONE_KEY } from '@/constants/onboardingKeys';
import '@/services/imageRegistry';

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
            console.warn('[GlobalGuard] unhandled rejection #' + id + ':', error?.message || error);
          },
          onHandled: () => {},
        });
      }
      if (typeof g.process?.on === 'function') {
        g.process.on('unhandledRejection', (reason: any) => {
          console.warn('[GlobalGuard] unhandledRejection:', reason?.message || reason);
        });
      }
    }
  } catch {}
})();

// Keep the native splash visible until we mount.
SplashScreen.preventAutoHideAsync().catch(() => {});

errorInterceptor.install();
privacyAudit.install();
proLicense.load().catch(() => {});
import('@/services/systemUpgrade').then(m => m.applyBootOverrides()).catch(() => {});
import('@/services/encryptedStorage').then(async m => {
  try {
    const id = await (await import('@react-native-async-storage/async-storage')).default
      .getItem('commandcube_device_id').catch(() => null);
    if (id) { await m.encryptedStorage.init(id); await m.encryptedStorage.migrate(); }
  } catch {}
}).catch(() => {});

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
  useAppSync();
  const bootRef = useRef(false);

  // One-shot bootstrap: hide native splash + start background services
  // if the user has already completed onboarding.
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;

    (async () => {
      try {
        await deviceIdentifier.getDeviceId().catch(() => {});
        const v = await AsyncStorage.getItem(ONBOARDING_DONE_KEY).catch(() => null);
        const onboarded = v === '1' || v === 'true';
        if (onboarded) {
          autoConnectEngine.start().catch(() => {});
        }
      } catch (e) {
        console.warn('[_layout] bootstrap failed:', e);
      } finally {
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
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
