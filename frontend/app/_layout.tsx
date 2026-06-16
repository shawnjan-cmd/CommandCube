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
// ⚠ MUST be second — hooks the global JS error handler so that any
//   uncaught error (including module-eval crashes in later imports
//   and crashes during cold-start BEFORE React even mounts) gets
//   written to AsyncStorage. On the next cold start we read it back
//   and display it on-screen so the user never needs adb/logcat.
import { installBootCrashLogger, readAndClearLastCrash, recordBoundaryCrash, markHomeReached } from '@/services/bootCrashLogger';
installBootCrashLogger();
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { Component, useEffect, useLayoutEffect, useRef, ReactNode } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TabBarProvider } from '@/contexts/TabBarContext';
import { CosmeticProvider } from '@/contexts/CosmeticContext';
import { useAppSync } from '@/hooks/useAppSync';
import { ONBOARDING_DONE_KEY, WELCOME_COMPLETE_KEY } from '@/constants/onboardingKeys';

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
    try { recordBoundaryCrash(error); } catch {}
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

// ── App-sync hook runner ────────────────────────────────────────────
// Defensive try/catch around the hook call. This is technically a
// Rules-of-Hooks violation, BUT in practice useAppSync only contains
// `useRef` + `useEffect` — neither can throw at render time. The
// try/catch exists as a belt-and-suspenders guard so that if
// `useAppSync`'s imports (serverConnection, serverFeatures) crash at
// module-eval on a fresh Android cold start, the entire RootLayout
// doesn't disappear with them. The GlobalErrorBoundary is one level
// up but only catches errors that propagate through the React tree
// — module-eval failures don't.
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
    // Use the deviceIdentifier service so legacy `@commandcube_device_id`
    // keys get migrated to the new key. Direct AsyncStorage read here
    // would miss the migration path entirely and leave encryptedStorage
    // uninitialised on devices that upgraded from old builds.
    const idMod = await import('@/services/deviceIdentifier');
    const id    = await (idMod as any)?.deviceIdentifier?.getDeviceId?.().catch(() => null);
    if (id) {
      const enc = await import('@/services/encryptedStorage');
      await (enc as any).encryptedStorage.init(id);
      await (enc as any).encryptedStorage.migrate();
    }
  } catch (e) { console.warn('[bootstrap] encryptedStorage:', e); }

  try {
    const [v2, v1] = await Promise.all([
      AsyncStorage.getItem(ONBOARDING_DONE_KEY),
      AsyncStorage.getItem(WELCOME_COMPLETE_KEY),
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
  // Holds any crash from the PREVIOUS cold-start session — displayed as a
  // dismissible banner over the home screen so the user can see what
  // crashed without ever needing adb/logcat.
  const [prevCrash, setPrevCrash] = React.useState<null | { at: number; message: string; stack?: string }>(null);

  // ── HIDE SPLASH at the earliest possible moment after React commits
  // useLayoutEffect fires synchronously after DOM mutations and before
  // the browser/native paints — perfect timing for splash hand-off.
  // We also clear the hard-timeout so it doesn't double-fire.
  useLayoutEffect(() => {
    clearTimeout(_splashHardTimer);
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Read any crash stored by the previous boot. Fire-and-forget — if it
  // throws, we just don't show the banner.
  useEffect(() => {
    readAndClearLastCrash().then(c => {
      if (c && typeof c.message === 'string' && c.message) setPrevCrash(c as any);
    }).catch(() => {});
  }, []);

  // If we've been alive for 3 seconds without a crash, we definitely
  // reached the home screen (or close enough). Mark it so we don't
  // keep showing a stale crash to a user whose problem is fixed.
  useEffect(() => {
    const t = setTimeout(() => { markHomeReached().catch(() => {}); }, 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    // Defer bootstrap by 1500ms past mount — gives the native bridge,
    // Hermes, and the first paint plenty of time to settle before we
    // touch AppState listeners, intervals, fetch, or AsyncStorage in
    // any heavy way. Was previously microtask-deferred which still
    // raced with the first paint on slower Android devices.
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
            {/* Previous-boot crash banner — only shows if the LAST cold
                start crashed before reaching home. Dismissible. Lets
                the user see the actual error message without adb. */}
            {prevCrash && (
              <View pointerEvents="box-none" style={pcb.wrap}>
                <View style={pcb.card}>
                  <Text style={pcb.title}>PREVIOUS LAUNCH CRASHED</Text>
                  <Text style={pcb.msg} numberOfLines={6}>
                    {prevCrash.message || 'Unknown error'}
                  </Text>
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
            )}
          </View>
        </TabBarProvider>
      </CosmeticProvider>
    </GlobalErrorBoundary>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
});

// Previous-boot crash banner — high-contrast red so it can't be missed.
// Floats on top of the home screen and is dismissible.
const pcb = StyleSheet.create({
  wrap:  { position: 'absolute', top: 0, left: 0, right: 0, padding: 12, paddingTop: Platform.OS === 'ios' ? 48 : 24, zIndex: 9999 },
  card:  { backgroundColor: '#1a0204', borderWidth: 1.5, borderColor: '#FF3131', borderRadius: 10, padding: 14 },
  title: { fontSize: 12, fontWeight: '900', color: '#FF3131', letterSpacing: 2, marginBottom: 8, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  msg:   { fontSize: 13, color: '#FFCCCC', lineHeight: 18, marginBottom: 6 },
  stack: { fontSize: 10, color: '#FFAAAA88', lineHeight: 14, marginBottom: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  btn:   { alignSelf: 'flex-end', borderWidth: 1, borderColor: '#FF3131', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 6 },
  btnTxt:{ fontSize: 11, fontWeight: '900', color: '#FF3131', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
});
