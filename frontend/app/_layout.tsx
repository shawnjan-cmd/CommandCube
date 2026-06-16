/**
 * Butler AI — Root Layout · CLEAN REWRITE v12
 * ──────────────────────────────────────────────────────────────────
 *
 * COLD-START CONTRACT  ─── now a single import line.
 *
 *   `bootGuard.installBootGuard()` does ALL of the below in one call:
 *     1. Patches `Dimensions.get()` so module-load reads can never see 0.
 *     2. Hooks the global JS error handler so any cold-start crash is
 *        persisted to AsyncStorage and surfaced as a banner on the
 *        next launch.
 *     3. Calls `SplashScreen.preventAutoHideAsync()` so the native
 *        splash stays up until React mounts.
 *
 *   `useSplashHide()` hides the splash on first commit, with a hard
 *   1.5 s cap for safety.
 *
 *   `<BootErrorBoundary>` wraps the tree and renders a recoverable
 *   fault screen if any render throws.
 *
 *   `<PreviousCrashBanner />` reads any persisted previous-launch
 *   crash and shows a dismissible banner. Auto-clears after 3 s alive.
 *
 * That is the entire boot path. No other files needed.
 */

// ⚠ MUST be the very first import — installs Dimensions shim and
//   crash capture before any other module can evaluate.
import { installBootGuard } from '@/services/bootGuard';
installBootGuard();

// Kick off the AsyncStorage "are you a new user?" read in parallel
// with React mount so `app/index.tsx` redirects without flash.
import { hydrateUserSession } from '@/services/userSession';
hydrateUserSession().catch(() => {});

import React, { useEffect, useRef } from 'react';
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

  // Hide native splash on first commit (with hard 1.5 s cap fallback).
  useSplashHide(1500);

  // Background services start 1500ms after mount.
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    const t = setTimeout(() => { bootstrapServices().catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <BootErrorBoundary>
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

            {/* Previous-launch crash banner — only ever shows if the last
                cold start crashed. Dismissible. Auto-clears after 3 s alive. */}
            <PreviousCrashBanner />
          </View>
        </TabBarProvider>
      </CosmeticProvider>
    </BootErrorBoundary>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});
