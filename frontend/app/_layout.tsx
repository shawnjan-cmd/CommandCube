/**
 * Butler AI — Root Layout
 * cache-bust: CLEAN-BUILD-77
 */
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import React, { Component, useEffect, useState, useRef, ReactNode } from 'react';
import { useAppSync } from '@/hooks/useAppSync';
import { SPLASH_CONFIG } from '@/constants/HeaderConstants';
import { View, Text, StyleSheet, Platform, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TabBarProvider } from '@/contexts/TabBarContext';
import { CosmeticProvider } from '@/contexts/CosmeticContext';
import { deviceIdentifier } from '@/services/deviceIdentifier';
import { errorInterceptor } from '@/services/errorInterceptor';
import { privacyAudit } from '@/services/privacyAudit';
import { autoConnectEngine } from '@/services/autoConnectEngine';
import { connectionPersistence } from '@/services/connectionPersistence';
import { proLicense } from '@/services/proLicense';
import { ONBOARDING_DONE_KEY } from '@/constants/onboardingKeys';
import OnboardingOverlay from '@/components/OnboardingOverlay';
import FirstBootCinematic, { hasFirstBootPlayed } from '@/components/FirstBootCinematic';
import '@/services/imageRegistry';
import RootSafeShell from '@/components/ui/RootSafeShell';

// ── GLOBAL UNHANDLED PROMISE & ERROR GUARD ──────────────────────────────────
// Captures any unhandled promise rejection / global error and writes a single
// console.warn instead of letting them crash the dev red-box or surface as
// silent app freezes. Pure passive listener — does NOT swallow real errors,
// only ensures they're logged. Safe to install at module load.
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
      // Fallback for non-Hermes JS engines:
      if (typeof g.process?.on === 'function') {
        g.process.on('unhandledRejection', (reason: any) => {
          console.warn('[GlobalGuard] unhandledRejection:', reason?.message || reason);
        });
      }
    }
  } catch {}
})();

// Keep the native splash visible until the gate check + first navigation are done.
// MUST be at module scope.
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
    // Cheap recovery: clear error state + bump key to force subtree re-mount.
    this.setState({ error: null, resetCount: this.state.resetCount + 1, reloadConfirm: false });
  };
  private handleHardReload = () => {
    // Two-tap confirm to avoid accidental nuclear reload.
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
          <TouchableOpacity
            style={eb.btn}
            onPress={this.handleReinit}
            activeOpacity={0.8}>
            <MaterialIcons name="refresh" size={16} color="#FFFFFF" />
            <Text style={[eb.btnTxt, { fontFamily: MONO }]}>REINITIALIZE</Text>
          </TouchableOpacity>
          {/* Hard-reload fallback — last resort. Two-tap confirm. */}
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
              GLOBAL ERROR BOUNDARY · BUTLER AI v7.3.0
            </Text>
          </View>
        </View>
      );
    }
    // Bump key on reinit so any stale subscriptions / refs are torn down cleanly.
    return <React.Fragment key={`eb-${this.state.resetCount}`}>{this.props.children}</React.Fragment>;
  }
}
// ─── ONBOARDING ERROR BOUNDARY ──────────────────────────────────────────────
// Wraps the OnboardingOverlay. If anything inside the overlay crashes, this
// boundary calls onRecover() to dismiss it and drop the user into the app,
// rather than trapping them in a broken onboarding screen forever.
class OnboardingErrorBoundary extends Component<
  { children: ReactNode; onRecover: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error): any { return { error }; }
  componentDidCatch(error: Error) {
    try { require('@/services/autoErrorLogger').autoErrorLogger.log('error', 'OnboardingErrorBoundary', error.message); } catch {}
    console.error('[OnboardingErrorBoundary] crash inside overlay — auto-recovering:', error?.message);
    // Auto-dismiss the overlay so the user lands in the app instead of being trapped.
    setTimeout(() => { try { this.props.onRecover(); } catch {} }, 50);
  }
  render() {
    if (this.state.error) {
      // Tiny dark spinner shown for ~50ms before onRecover fires.
      return (
        <View style={{ flex: 1, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#FF2A1F', opacity: 0.6 }} />
        </View>
      );
    }
    return this.props.children;
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

// ─── BUTLER AI SVG LOGO ──────────────────────────────────────────────────────
function ButlerLogoSVG({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="350 300 850 420">
      <Path d="m376 323h157l61 1 15 4 14 7 10 8 8 10 7 14 3 11 1 7v225l-3 14-5 13-8 11-9 9-13 8-18 6h-235l-12-3-16-8-11-9-9-12-5-11-4-17v-227l3-15 8-16 7-9 10-9 14-7 14-4z" fill="#0A0B0E"/>
      <Path d="m1220 323h174l44 1 15 4 14 7 10 8 8 10 7 15 3 11 1 8v219l-3 17-6 16-8 10-8 8-13 8-18 6h-234l-12-3-12-5-11-8-5-5-7-8-6-12-4-14-1-7v-224l3-15 5-12 8-12 7-7 10-7 12-5 11-3z" fill="#0A0B0D"/>
      <Path d="m796 323h174l46 1 15 4 14 7 10 8 8 10 7 14 2 7 1 10v226l-2 15-5 12-7 10-5 6-14 10-11 5-11 3h-235l-14-4-14-7-12-11-6-7-7-14-3-12v-237l3-13 8-15 12-13 13-8 18-6z" fill="#0A0B0D"/>
      <Path d="m440 379h9l5 3 2 6-1 6-3 4-1 4v35l22 1-1-7v-24l-1-9-3-4v-10l5-5h9l5 4 1 9-4 7-1 39h22l-1-38-4-8 1-9 5-4h9l5 5 1 7-2 5-3 3-1 39h10l5 2 6 7 1 5v8h41l1-4 1-1h10l5 3 1 2v9l-3 5-2 1h-10l-2-1-1-3-41-1 1 22h40l1-4 8-1 8 3 1 4v7l-1 4-4 2h-12l-1-3-40-1-1 22 41-1 1-4h9l6 2 2 4v7l-2 5-5 2-10-1-2-3-40-1v9l-3 7-4 4-3 1-11 1v39l4 4 1 7-3 7-2 1h-11l-4-4-1-2v-7l4-6 1-40-21 1v39l3 4 1 7-2 6-3 2h-11l-4-4v-10l2-3h2v-41h-21v38l4 5v11l-4 4h-12l-3-3-1-4v-7l4-4 1-3v-37l-11-1-5-3-5-6v-12l-41 1-1 3h-14l-3-4v-11l3-3h13l2 3 3 1 37 1v-18l1-3h-42l-1 4h-13l-3-4v-12l3-3h13l2 3 3 1 37 1v-10l1-13-41 1-2 4h-11l-5-4-1-8 2-5 4-3 6-1 5 2 2 4h40l1-12 6-8 4-2h12l-1-4-1-36-4-5v-7l3-6z" fill="#FCFCFC"/>
      <Path d="m899 422l4 2 10 14h5l11-10 3 1v29l4 7 10 11 8 11v108h-108l-1-106 3-6 11-12 8-10 1-32h3l11 9 5-1 8-10z" fill="#FCFCFC"/>
      <Path d="m1242 422h160l5 3 1 21v82l-1 8-3 3 14 1 9 3 3 5v12l-4 6-1 1-13 1h-185l-8-1-4-4-1-3v-13l5-5 7-2h14l-4-6v-107l3-4zm64 9-60 1v97l1 1h150l1-22v-74l-1-2-61-1z" fill="#FBFBFB"/>
      <Path d="m785 313h230l15 3 12 5 10 6 10 8 10 13 8 16 3 11 1 13v210l-1 19-4 17-6 11-10 13-10 9-10 6-15 6-4 1-13 1h-227l-16-3-11-5-12-7-10-9-8-11-7-14-4-18-1-16v-193l1-23 3-16 5-12 8-12 10-11 13-9 15-6zm11 10-15 1-18 6-10 6-10 9-6 8-8 16-2 10v237l4 15 6 11 9 10 9 8 16 8 12 3h235l16-5 11-6 9-7 9-11 7-14 2-8 1-10v-226l-2-14-5-12-9-13-9-8-14-8-13-4-5-1-46-1z" fill="#F7F7F8"/>
      <Path d="m1207 313h231l14 3 12 5 12 7 12 11 9 14 6 13 3 13 1 21v203l-2 20-5 13-6 11-11 13-12 10-17 8-8 2-11 1h-229l-16-3-12-5-12-8-12-12-7-11-6-13-3-15-1-53v-115l1-62 2-15 5-13 7-11 9-11 11-9 17-8 11-3zm13 10-16 1-17 5-11 6-13 12-8 13-5 13-2 12v224l3 15 5 13 8 11 4 5 14 10 14 6 10 2h234l18-6 14-9 10-10 6-9 5-14 3-17v-219l-3-16-5-12-6-10-8-9-10-7-11-5-15-4-44-1z" fill="#F8F8F8"/>
      <Path d="m363 313h230l15 3 12 5 10 6 12 10 9 13 7 14 3 12 1 37v126l-1 75-2 13-7 16-8 11-4 5-8 7-11 7-14 6-17 2h-227l-17-3-12-5-12-8-13-13-9-15-4-11-2-12v-232l2-13 5-13 6-10 11-13 10-8 17-8 11-3zm13 10-16 1-17 5-11 6-12 11-7 10-7 16-2 12v227l4 17 7 14 9 11 12 9 16 7 9 2h235l18-6 14-9 10-10 6-9 6-16 2-11v-225l-3-15-5-12-7-10-7-8-14-9-13-5-9-2-61-1z" fill="#F7F7F7"/>
    </Svg>
  );
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const FIRST_LAUNCH_KEY   = '@nexus_first_launch_v1';
const SPLASH_DURATION_MS = 2400;

const BOOT_MSGS = [
  'INITIALIZING NEXUS ENGINE...',
  'LOADING SECURITY MODULES...',
  'ESTABLISHING LAN BRIDGE...',
  'LOADING AI CONTEXT...',
  'BUTLER AI READY \u2713',
];

// ─── NEXUS BOOT SPLASH ───────────────────────────────────────────────────────
function NexusSplash({ onDone }: { onDone: () => void }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const dotAnim   = useRef(new Animated.Value(0)).current;
  const barAnim   = useRef(new Animated.Value(0)).current;
  const scanAnim  = useRef(new Animated.Value(0)).current;
  const ring1Anim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0.5)).current;

  const { width: SW, height: SH } = Dimensions.get('window');
  const [bootMsg, setBootMsg] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 130, friction: 9, useNativeDriver: true }),
    ]).start();

    Animated.timing(barAnim, {
      toValue: 1, duration: SPLASH_DURATION_MS - 350, useNativeDriver: false,
    }).start();

    const dotLoop = Animated.loop(Animated.sequence([
      Animated.timing(dotAnim, { toValue: 1,    duration: 440, useNativeDriver: true }),
      Animated.timing(dotAnim, { toValue: 0.12, duration: 440, useNativeDriver: true }),
    ]));
    dotLoop.start();

    const scanLoop = Animated.loop(Animated.sequence([
      Animated.timing(scanAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(scanAnim, { toValue: 0, duration: 0,    useNativeDriver: true }),
      Animated.delay(300),
    ]));
    scanLoop.start();

    const ring1Loop = Animated.loop(Animated.sequence([
      Animated.timing(ring1Anim, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.timing(ring1Anim, { toValue: 0, duration: 1100, useNativeDriver: true }),
    ]));
    const ring2Loop = Animated.loop(Animated.sequence([
      Animated.timing(ring2Anim, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.timing(ring2Anim, { toValue: 0, duration: 1100, useNativeDriver: true }),
    ]));
    ring1Loop.start();
    ring2Loop.start();

    const msgTimers = [340, 760, 1200, 1680, 2060].map((delay, i) =>
      setTimeout(() => setBootMsg(Math.min(i + 1, BOOT_MSGS.length - 1)), delay)
    );

    const exitTimer = setTimeout(() => {
      dotLoop.stop(); scanLoop.stop(); ring1Loop.stop(); ring2Loop.stop();
      msgTimers.forEach(clearTimeout);
      Animated.timing(fadeAnim, { toValue: 0, duration: 380, useNativeDriver: true })
        .start(() => onDone());
    }, SPLASH_DURATION_MS);

    return () => {
      clearTimeout(exitTimer);
      msgTimers.forEach(clearTimeout);
      dotLoop.stop(); scanLoop.stop(); ring1Loop.stop(); ring2Loop.stop();
    };
  }, []);

  const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
  const teal      = SPLASH_CONFIG.accentColor;

  const scanY = scanAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [-SH * 0.04, SH * 1.04],
  });

  const r1Opacity = ring1Anim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.7, 0] });
  const r1Scale   = ring1Anim.interpolate({ inputRange: [0, 1],       outputRange: [1.0, 1.25] });
  const r2Opacity = ring2Anim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.45, 0] });
  const r2Scale   = ring2Anim.interpolate({ inputRange: [0, 1],       outputRange: [1.1, 1.45] });

  const STAGE_THRESHOLDS = [0.18, 0.38, 0.58, 0.78, 1.0];

  return (
    <View style={sp.root}>
      <Animated.View
        pointerEvents="none"
        style={[sp.scanLine, { backgroundColor: teal, transform: [{ translateY: scanY }] }]}
      />
      <View style={sp.gridH1} /><View style={sp.gridH2} />
      <View style={sp.gridV1} /><View style={sp.gridV2} />
      <View style={[sp.corner, { top: 32, left: 24,  borderTopWidth: 2,    borderLeftWidth: 2  }]} />
      <View style={[sp.corner, { top: 32, right: 24, borderTopWidth: 2,    borderRightWidth: 2 }]} />
      <View style={[sp.corner, { bottom: 32, left: 24,  borderBottomWidth: 2, borderLeftWidth: 2  }]} />
      <View style={[sp.corner, { bottom: 32, right: 24, borderBottomWidth: 2, borderRightWidth: 2 }]} />

      <Animated.View style={[sp.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={sp.logoContainer}>
          <Animated.View style={[sp.logoWaveRing, { borderColor: teal, opacity: r1Opacity, transform: [{ scale: r1Scale }] }]} />
          <Animated.View style={[sp.logoWaveRing, { borderColor: teal, opacity: r2Opacity, transform: [{ scale: r2Scale }] }]} />
          <View style={[sp.iconRing, { borderColor: teal + '45' }]}>
            <View style={[sp.iconInner, { borderColor: teal + '85', backgroundColor: '#070D18', overflow: 'hidden', borderRadius: 14 }]}>
              <ButlerLogoSVG size={76} />
            </View>
          </View>
        </View>

        <Text style={[sp.title,       { color: '#FFFFFF', fontFamily: MONO }]}>{SPLASH_CONFIG.titleLine1}</Text>
        <Text style={[sp.titleAccent, { color: teal,      fontFamily: MONO }]}>{SPLASH_CONFIG.titleLine2}</Text>
        <Text style={[sp.sub,         { color: teal + '75', fontFamily: MONO }]}>{SPLASH_CONFIG.tagline}</Text>

        <View style={{ width: SW * 0.6, marginTop: 22, gap: 8 }}>
          <View style={[sp.barTrack, { width: '100%' }]}>
            <Animated.View style={[sp.barFill, {
              width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any,
              backgroundColor: teal,
            }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 1 }}>
            {STAGE_THRESHOLDS.map((threshold, i) => (
              <Animated.View key={i} style={{
                width: 5, height: 5, borderRadius: 2.5,
                backgroundColor: teal,
                opacity: barAnim.interpolate({
                  inputRange:   [Math.max(0, threshold - 0.08), threshold],
                  outputRange:  [0.12, 1],
                  extrapolate:  'clamp',
                }),
              }} />
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, minHeight: 20 }}>
          <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: teal, opacity: dotAnim }} />
          <Text style={[sp.bootTxt, { color: teal + '60', fontFamily: MONO }]}>
            {BOOT_MSGS[bootMsg]}
          </Text>
        </View>

        <View style={[sp.verBadge, { borderColor: teal + '35', backgroundColor: teal + '09' }]}>
          <Text style={[sp.verTxt, { color: teal + '65', fontFamily: MONO }]}>
            {SPLASH_CONFIG.versionBadge}
          </Text>
        </View>

        <View style={[sp.privacyBox, { borderColor: teal + '28', backgroundColor: teal + '07' }]}>
          <MaterialCommunityIcons name="shield-lock-outline" size={11} color={teal + '95'} style={{ flexShrink: 0, marginTop: 1 }} />
          <Text style={[sp.privacyTxt, { color: teal + '72', fontFamily: MONO }]}>
            {'Runs on your PC \u00b7 SQLite local DB \u00b7 LAN-only \u00b7 HMAC-SHA256 signed \u00b7 Ollama AI local \u00b7 No data leaves your machine'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const sp = StyleSheet.create({
  root:          { ...StyleSheet.absoluteFillObject, backgroundColor: '#070708', zIndex: 9999, alignItems: 'center', justifyContent: 'center' },
  scanLine:      { position: 'absolute', left: 0, right: 0, height: 1.5, opacity: 0.32 },
  gridH1:        { position: 'absolute', top: '33%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,42,31,0.034)' },
  gridH2:        { position: 'absolute', top: '66%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,42,31,0.034)' },
  gridV1:        { position: 'absolute', left: '33%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,42,31,0.025)' },
  gridV2:        { position: 'absolute', left: '66%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,42,31,0.025)' },
  corner:        { position: 'absolute', width: 24, height: 24, borderColor: 'rgba(255,42,31,0.38)' },
  content:       { alignItems: 'center', gap: 7 },
  logoContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  logoWaveRing:  { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1.5 },
  iconRing:      { width: 110, height: 110, borderRadius: 55, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  iconInner:     { width: 90,  height: 90,  borderRadius: 45, borderWidth: 2,   alignItems: 'center', justifyContent: 'center' },
  title:         { fontSize: 48, fontWeight: '900', letterSpacing: 4, lineHeight: 52 },
  titleAccent:   { fontSize: 48, fontWeight: '900', letterSpacing: 8, lineHeight: 52, marginTop: -10 },
  sub:           { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 3 },
  barTrack:      { height: 3, backgroundColor: 'rgba(255,42,31,0.10)', borderRadius: 2, overflow: 'hidden' },
  barFill:       { height: '100%', borderRadius: 2 },
  bootTxt:       { fontSize: 10, fontWeight: '700', letterSpacing: 0.7 },
  verBadge:      { borderWidth: 1, borderRadius: 8, paddingHorizontal: 13, paddingVertical: 5, marginTop: 16 },
  verTxt:        { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  privacyBox:    { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9, marginTop: 11, maxWidth: 320 },
  privacyTxt:    { flex: 1, fontSize: 8, fontWeight: '600', letterSpacing: 0.25, lineHeight: 13 },
});

// ─── MODULE-LEVEL ROUTER REF ─────────────────────────────────────────────────
// Stable reference kept for backwards compatibility with any service that
// might call `_routerRef.current.replace(...)` directly. Under the SDK 54+
// Stack.Protected architecture this ref is no longer used for onboarding
// dismissal — that path is now 100% driven by the `needsOnboarding` gate.
const _routerRef: { current: ReturnType<typeof useRouter> | null } = { current: null };

// Legacy global — kept as a no-op so any old code path that still calls it
// (debug menu, deep links, third-party helpers) doesn't throw. Under
// Stack.Protected, onboarding completion is driven by `__setNeedsOnboarding(false)`,
// NOT by a router.replace to /(tabs).
(global as any).__onboardingComplete = () => {
  // Forward to the canonical channel — flip the gate. Stack.Protected will
  // mount the tabs automatically. NO router.replace here.
  try { (global as any).__setNeedsOnboarding?.(false); } catch {}
};

// ─── ROOT LAYOUT ─────────────────────────────────────────────────────────────
export default function RootLayout() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [showCinematic, setShowCinematic] = useState(false);
  const [appReady, setAppReady] = useState(false);

  useAppSync();

  _routerRef.current = router;

  // Expose setter so settings/dev tools can re-trigger the overlay directly.
  // Hardened: validates input type, logs all calls, ignores no-op writes.
  useEffect(() => {
    (global as any).__setNeedsOnboarding = (v: boolean) => {
      if (typeof v !== 'boolean') {
        console.warn('[_layout] __setNeedsOnboarding called with non-boolean:', v, '— ignored');
        return;
      }
      console.log('[_layout] __setNeedsOnboarding(' + v + ') called');
      setNeedsOnboarding(v);
    };
    return () => { delete (global as any).__setNeedsOnboarding; };
  }, []);

  // Guard against double-init (Strict Mode, hot reload, etc.)
  const appInitRef = useRef(false);

  useEffect(() => {
    if (appInitRef.current) return;
    appInitRef.current = true;
    const checkState = async () => {
      try {
        const [onboardingDone, firstLaunch] = await Promise.all([
          AsyncStorage.getItem(ONBOARDING_DONE_KEY).catch(() => null),
          AsyncStorage.getItem(FIRST_LAUNCH_KEY).catch(() => null),
        ]);
        // Accept both '1' (legacy) and 'true' (overlay v7) for backwards compat.
        const isDone = onboardingDone === '1' || onboardingDone === 'true';
        const needs = !isDone;
        setNeedsOnboarding(needs);
        // Show splash on Android first launch only when onboarding is done
        if (Platform.OS === 'android' && !firstLaunch && !needs) {
          setShowSplash(true);
          AsyncStorage.setItem(FIRST_LAUNCH_KEY, Date.now().toString()).catch(() => {});
        } else {
          setSplashDone(true);
        }
      } catch {
        // fallback: skip splash, go to onboarding
        setNeedsOnboarding(true);
        setSplashDone(true);
      }
    };
    checkState();
  }, []);

  useEffect(() => {
    if (!splashDone || needsOnboarding === null) return;

    const initApp = async () => {
      try {
        await deviceIdentifier.getDeviceId().catch(() => {});

        // ── Stack.Protected handles navigation ────────────────────────────
        // Under the SDK 54+ Stack.Protected architecture, the navigator
        // automatically mounts the correct route based on the `needsOnboarding`
        // gate. NO router.replace() needed during init — calling it here
        // would target /(tabs) which is GUARDED OUT while needsOnboarding is
        // still true, causing an unmatched-route warning or fighting with
        // Stack.Protected's own guard re-evaluation when the gate flips.
        setAppReady(true);

        // Background services only run once the user has accepted onboarding.
        if (!needsOnboarding) {
          autoConnectEngine.start().catch(() => {});

          const unsubScan = autoConnectEngine.onEvent(async (evt) => {
            if (evt.status === 'connected' && evt.ip) {
              unsubScan();
              setTimeout(async () => {
                try {
                  const { appScanner } = require('@/services/appScanner');
                  const report = await appScanner.runFullScan();
                  if (report.overallStatus !== 'ok') {
                    console.log('[AutoScan] Health score:', report.score, '-', report.summary);
                  }
                } catch {}
              }, 8000);
            }
          });
        }
      } catch (e) {
        console.warn('[_layout] initApp failed:', e);
        setAppReady(true);
      }
    };

    initApp();
    // Hide the native splash once we've decided where to go.
    SplashScreen.hideAsync().catch(() => {});
  }, [splashDone, needsOnboarding]);

  // ─── BULLETPROOF GUARDS ───────────────────────────────────────────────────
  // Guard 1: hard timeout. If AsyncStorage hangs forever (corrupt iCloud sync,
  // failed migration, low-memory kill), force the gate to "needs onboarding"
  // after 8 s so the user is NEVER stuck on the holding screen forever.
  useEffect(() => {
    if (needsOnboarding !== null) return;
    const t = setTimeout(() => {
      console.warn('[_layout] AsyncStorage gate timed out after 8s — assuming first launch');
      setNeedsOnboarding(true);
      setSplashDone(true);
    }, 8000);
    return () => clearTimeout(t);
  }, [needsOnboarding]);

  // Guard 2: every time the app comes back to the foreground, re-check the
  // onboarding flag. If the user completed onboarding on another install and
  // restored state from a backup, the in-memory flag may be stale.
  useEffect(() => {
    const { AppState } = require('react-native');
    const sub = AppState.addEventListener('change', async (s: string) => {
      if (s !== 'active') return;
      try {
        const v = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
        if (v === '1' && needsOnboarding === true) {
          console.log('[_layout] foreground re-check: flag set, closing overlay');
          setNeedsOnboarding(false);
        }
      } catch {}
    });
    return () => sub?.remove?.();
  }, [needsOnboarding]);

  // Guard 3: while the onboarding modal is open, poll the gate flag every
  // 750 ms. ANY independent write to AsyncStorage (Screen 10, debug menu,
  // settings reset, ANY code path) immediately closes the modal — no matter
  // whether onComplete fired correctly or not. This is the "no more onboarding
  // navigation issues, solve it in any way" insurance policy.
  useEffect(() => {
    if (needsOnboarding !== true) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        // Synchronous global wins if it's been flipped this turn of the loop.
        if ((global as any).__butler_onboarding_just_completed === true) {
          console.log('[_layout] poller: global completion flag detected');
          (global as any).__butler_onboarding_just_completed = false;
          setNeedsOnboarding(false);
          return;
        }
        const v = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
        // Accept both '1' (legacy) and 'true' (overlay v7 format).
        if ((v === '1' || v === 'true') && !cancelled) {
          console.log('[_layout] poller: AsyncStorage flag detected, closing overlay');
          setNeedsOnboarding(false);
        }
      } catch {}
    };
    const id = setInterval(tick, 600);
    return () => { cancelled = true; clearInterval(id); };
  }, [needsOnboarding]);

  // Render a dark holding screen while AsyncStorage is being read
  // to prevent the white/black flash before navigation fires
  const showHoldingScreen = needsOnboarding === null && !showSplash;

  // ─── BULLETPROOF v7: IN-APP OVERLAY ARCHITECTURE ───────────────────────
  // Tabs are ALWAYS mounted from app start. Onboarding renders as an
  // absolute-positioned full-screen overlay on top of the tabs.
  //
  // When the user completes onboarding:
  //   1. AsyncStorage keys are persisted by the OnboardingOverlay
  //   2. setNeedsOnboarding(false) is called via onComplete
  //   3. The overlay component unmounts
  //   4. The tabs (already mounted, fully rendered) are immediately visible
  //
  // ZERO navigation. ZERO router calls. ZERO race conditions.
  //
  // On subsequent app launches, needsOnboarding resolves to `false` from
  // AsyncStorage before the overlay ever renders, so returning users see
  // only the tabs.

  return (
    <GlobalErrorBoundary>
      <CosmeticProvider>
        <TabBarProvider>
          <View style={{ flex: 1, backgroundColor: '#050505' }}>
            <StatusBar style="light" />

            {/* ── ALWAYS-MOUNTED TABS STACK ─────────────────────────────── */}
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#050505' } }}>
              <Stack.Screen name="(tabs)"         options={{ headerShown: false }} />
              <Stack.Screen name="privacy-policy" options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="terms"          options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="tutorial"       options={{ headerShown: false }} />
              <Stack.Screen name="main-menu"      options={{ headerShown: false }} />
              <Stack.Screen name="category/[id]"  options={{ headerShown: false }} />
              <Stack.Screen name="data-safety"    options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />
              <Stack.Screen name="privacy-audit"  options={{ headerShown: false, animation: 'slide_from_right' }} />
            </Stack>

            {/* ── LOADING / SPLASH (covers everything while AsyncStorage reads) ── */}
            {needsOnboarding === null ? (
              showSplash && !splashDone ? (
                <View style={StyleSheet.absoluteFill}>
                  <NexusSplash onDone={() => { setShowSplash(false); setSplashDone(true); }} />
                </View>
              ) : (
                <View style={[StyleSheet.absoluteFill, s.holdingScreen]}>
                  <View style={{ width: 48, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,42,31,0.30)', backgroundColor: 'rgba(255,42,31,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                    <Animated.View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#FF2A1F', opacity: 0.6 }} />
                  </View>
                </View>
              )
            ) : null}

            {/* ── ONBOARDING WINDOW (floating panel above home tab) ──
                Renders as a CENTERED WINDOW with the home tab visible on
                all sides — gives the user context that they're inside the
                app, not in a separate flow. Has a 2px red border + neon
                shadow so it stands out cleanly against the HUD backdrop. */}
            {needsOnboarding === true && (
              <View style={s.onboardingScrim} pointerEvents="auto" accessibilityViewIsModal={true}>
                {/* Tap-outside dimming layer (does NOT close — onboarding only
                    exits via the LAUNCH button on Screen 10) */}
                <View style={s.onboardingScrimDim} pointerEvents="none" />
                <View style={s.onboardingWindow}>
                  {/* HUD top accent bar */}
                  <View style={s.onboardingTopBar} />
                  {/* HUD header strip — like a terminal title bar */}
                  <View style={s.onboardingHeaderStrip}>
                    <View style={s.onboardingHeaderLeft}>
                      <View style={s.onboardingHeaderDot} />
                      <Text style={s.onboardingHeaderLabel}>BUTLER-CORE · INITIALIZATION</Text>
                    </View>
                    <Text style={s.onboardingHeaderId}>UNIT-01 · 0xA1</Text>
                  </View>
                  {/* Corner brackets inside the window */}
                  <View style={[s.onboardingCornerBracket, { top: 32,    left: 6,  borderTopWidth: 1.5, borderLeftWidth: 1.5 }]}     pointerEvents="none" />
                  <View style={[s.onboardingCornerBracket, { top: 32,    right: 6, borderTopWidth: 1.5, borderRightWidth: 1.5 }]}    pointerEvents="none" />
                  <View style={[s.onboardingCornerBracket, { bottom: 6, left: 6,  borderBottomWidth: 1.5, borderLeftWidth: 1.5 }]}  pointerEvents="none" />
                  <View style={[s.onboardingCornerBracket, { bottom: 6, right: 6, borderBottomWidth: 1.5, borderRightWidth: 1.5 }]} pointerEvents="none" />
                  <OnboardingErrorBoundary onRecover={() => setNeedsOnboarding(false)}>
                    <OnboardingOverlay
                      onComplete={() => {
                        setNeedsOnboarding(false);
                        hasFirstBootPlayed().then((played) => {
                          if (!played) setShowCinematic(true);
                        });
                      }}
                    />
                  </OnboardingErrorBoundary>
                </View>
              </View>
            )}

            {/* ── FIRST-BOOT CINEMATIC (plays ONCE after onboarding) ─────── */}
            {showCinematic && (
              <FirstBootCinematic onDone={() => setShowCinematic(false)} />
            )}
          </View>
        </TabBarProvider>
      </CosmeticProvider>
    </GlobalErrorBoundary>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#050505' },
  holdingScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#010306',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
  },
  /* ─── ONBOARDING WINDOW (Terminator HUD-themed, 70% coverage) ──────
     A floating panel matching the home tab's red/gunmetal HUD theme.
     Covers ~70% of screen so home tab is clearly visible on all sides.  */
  onboardingScrim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: '8%',   // ~32px on 414w → leaves ~84% wide
    paddingVertical:   '15%',  // ~134px on 896h → ~70% tall
  },
  onboardingScrimDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,4,6,0.72)',
  },
  /* HUD shell — outer red glow + bracket frame matching home tab vibe */
  onboardingWindow: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#070A0E',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,42,31,0.75)',
    shadowColor: '#FF2A1F',
    shadowOpacity: 0.85,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 0 },
    elevation: 28,
    overflow: 'hidden',
  },
  /* Top accent bar — like home tab section headers */
  onboardingTopBar: {
    height: 3,
    backgroundColor: '#FF2A1F',
    shadowColor: '#FF2A1F',
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  /* HUD header strip inside the window */
  onboardingHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,42,31,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,42,31,0.22)',
  },
  onboardingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onboardingHeaderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF2A1F',
    shadowColor: '#FF2A1F',
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  onboardingHeaderLabel: {
    color: '#FF2A1F',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1.5,
  },
  onboardingHeaderId: {
    color: 'rgba(255,42,31,0.65)',
    fontSize: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  /* Corner brackets inside the window (HUD target-lock vibe) */
  onboardingCornerBracket: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: '#FF2A1F',
  },
});
