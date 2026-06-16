/**
 * Butler AI — Root Layout · CLEAN REWRITE v13 (defensive)
 * ──────────────────────────────────────────────────────────────────
 *
 * GOAL: bullet-proof cold-start. Nothing in this layer is allowed to
 *   crash the app or stall the splash.
 *
 * WHAT CHANGED FROM v12
 *   • `bootstrapServices()` has been audited to remove DUPLICATE work
 *     and any module that monkey-patches native polyfills at boot:
 *       ─ REMOVED: errorInterceptor.install()    (duplicate of bootGuard handler)
 *       ─ REMOVED: privacyAudit.install()        (wraps global.fetch + XHR — risky timing on cold-start)
 *       ─ REMOVED: applyBootOverrides()          (recovery utility — only run on-demand)
 *       ─ KEPT:    proLicense, deviceIdentifier+encryptedStorage, imageRegistry
 *       ─ KEPT:    autoConnectEngine — deferred to 4 s (was 1.5 s)
 *   • Provider stack wrapped in <SafeProvider> guards so a single
 *     provider initialisation error cannot kill the whole tree.
 *   • Bootstrap is staged: critical at 1.5 s, network engine at 4 s.
 */

// ⚠ MUST be first — installs Dimensions shim, crash capture, splash prevent-auto-hide.
import { installBootGuard } from '@/services/bootGuard';
installBootGuard();

// Kick off AsyncStorage "are you a new user?" read in parallel with React mount.
import { hydrateUserSession } from '@/services/userSession';
hydrateUserSession().catch(() => {});

import React, { Component, ReactNode, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  BootErrorBoundary,
  PreviousCrashBanner,
  useSplashHide,
} from '@/services/bootGuard';
import { TabBarProvider }  from '@/contexts/TabBarContext';
import { CosmeticProvider } from '@/contexts/CosmeticContext';
import { useAppSync }      from '@/hooks/useAppSync';
import { ONBOARDING_DONE_KEY, WELCOME_COMPLETE_KEY } from '@/constants/onboardingKeys';

// ═══════════════════════════════════════════════════════════════════
// SAFE-PROVIDER GUARD
// ═══════════════════════════════════════════════════════════════════
// Wraps a Provider component so any throw during its init / render
// doesn't kill the whole tree — children just render with no provider.
class SafeProvider extends Component<{ children: ReactNode; name: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: Error) {
    try { console.warn(`[SafeProvider:${this.props.name}] crashed:`, err?.message); } catch {}
  }
  render() {
    if (this.state.failed) return <>{this.props.children}</>;
    return this.props.children as any;
  }
}

// ═══════════════════════════════════════════════════════════════════
// APP-SYNC RUNNER (one hook, mounted once, never throws at render)
// ═══════════════════════════════════════════════════════════════════
function AppSyncRunner() {
  try { useAppSync(); } catch (e) { try { console.warn('[AppSyncRunner]', (e as any)?.message); } catch {} }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// BACKGROUND BOOTSTRAP — minimal, staged, fire-and-forget
// ═══════════════════════════════════════════════════════════════════
//
// REMOVED FROM v12:
//   • errorInterceptor.install()   — duplicate of bootGuard's ErrorUtils handler
//   • privacyAudit.install()       — wraps global.fetch / XMLHttpRequest at boot (risky)
//   • applyBootOverrides()         — recovery utility; runs on-demand only
//
// Anyone needing those: import + install from inside Settings tab.
async function bootstrapCritical() {
  // 1) Pro license — lightweight AsyncStorage read.
  try { (await import('@/services/proLicense'))?.proLicense?.load?.().catch(() => {}); } catch {}
  // 2) Image registry — initialises once, no side effects.
  try { await import('@/services/imageRegistry'); } catch {}
  // 3) Encrypted storage — bound to device UUID. Read-only at this stage.
  try {
    const idMod = await import('@/services/deviceIdentifier');
    const id    = await idMod?.deviceIdentifier?.getDeviceId?.().catch(() => null);
    if (id) {
      const enc = await import('@/services/encryptedStorage');
      await enc.encryptedStorage.init(id);
      await enc.encryptedStorage.migrate();
    }
  } catch {}
}

async function bootstrapNetwork() {
  // Only start the auto-connect engine if the user is already onboarded.
  // First-time users see no spurious network noise during the tutorial.
  try {
    const [v2, v1] = await Promise.all([
      AsyncStorage.getItem(ONBOARDING_DONE_KEY),
      AsyncStorage.getItem(WELCOME_COMPLETE_KEY),
    ]);
    const onboarded = v2 === '1' || v2 === 'true' || v1 === '1' || v1 === 'true';
    if (!onboarded) return;
    const m = await import('@/services/autoConnectEngine');
    m?.autoConnectEngine?.start?.().catch(() => {});
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════
// ROOT LAYOUT
// ═══════════════════════════════════════════════════════════════════
export default function RootLayout() {
  const critRef = useRef(false);
  const netRef  = useRef(false);

  // Hide native splash on first commit (with hard 1.5 s cap fallback).
  useSplashHide(1500);

  // Stage 1 — lightweight services at 1.5 s.
  useEffect(() => {
    if (critRef.current) return;
    critRef.current = true;
    const t = setTimeout(() => { bootstrapCritical().catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, []);

  // Stage 2 — network engine at 4 s (only if onboarded).
  useEffect(() => {
    if (netRef.current) return;
    netRef.current = true;
    const t = setTimeout(() => { bootstrapNetwork().catch(() => {}); }, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <BootErrorBoundary>
      <SafeProvider name="cosmetic">
        <CosmeticProvider>
          <SafeProvider name="tabbar">
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

                {/* Previous-launch crash banner — only ever shows if the last
                    cold start crashed. Dismissible. Auto-clears after 3 s alive. */}
                <PreviousCrashBanner />
              </View>
            </TabBarProvider>
          </SafeProvider>
        </CosmeticProvider>
      </SafeProvider>
    </BootErrorBoundary>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});
