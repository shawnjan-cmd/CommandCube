/**
 * Butler AI — Root Boot Route  (`/`)
 * ──────────────────────────────────────────────────────────────────
 * v7 — DECLARATIVE <Redirect> BOOT  (Android-safe)
 *
 * WHY THIS REWRITE?
 *   v6 used `router.replace()` from inside an InteractionManager
 *   callback. On native Android cold-start the (tabs) navigator was
 *   not yet fully mounted at the moment the callback fired, so the
 *   imperative navigation silently no-op'd — which then tripped the
 *   2.5 s escape-hatch ("BOOT TIMEOUT · TAP TO CONTINUE") because
 *   the user appeared stuck.
 *
 * THE FIX
 *   Use Expo Router's <Redirect> component instead of `router.replace()`.
 *   <Redirect> is declarative — it integrates with the navigator's own
 *   mount lifecycle, so it waits until the router is ready before
 *   actually navigating. No timing race, no InteractionManager.
 *
 * BEHAVIOR
 *   1. Read the boot-target from userSession (1.8 s hard cap inside).
 *   2. As soon as we have it, render <Redirect href={target} />.
 *   3. Until then, show a black "INITIALISING…" card.
 *   4. If we're STILL here 3.5 s after mount, show the manual escape
 *      hatch with CONTINUE → HOME / SHOW TUTORIAL buttons so the user
 *      is NEVER permanently stuck.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import {
  getBootTarget,
  HOME_ROUTE,
  ONBOARDING_ROUTE,
  type BootTarget,
} from '@/services/userSession';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ── Triple-fallback imperative navigation — used ONLY by the escape
//    hatch buttons (the auto path uses <Redirect>).
function safeNavigate(router: ReturnType<typeof useRouter>, route: string) {
  try { router.replace(route as any); return; } catch (e1) { try { console.warn('[root] replace failed:', e1); } catch {} }
  try { router.push(route as any);    return; } catch (e2) { try { console.warn('[root] push failed:',    e2); } catch {} }
  try { (router as any).navigate?.(route); return; } catch (e3) { try { console.warn('[root] navigate failed:', e3); } catch {} }
}

// ──────────────────────────────────────────────────────────────────
//                         ROOT BOOT ROUTE
// ──────────────────────────────────────────────────────────────────
export default function Index() {
  const router = useRouter();
  const [target, setTarget] = useState<BootTarget | null>(null);
  const [stuck, setStuck]   = useState(false);

  // Resolve the boot target on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let resolved: BootTarget;
      try {
        resolved = await getBootTarget();
      } catch {
        resolved = ONBOARDING_ROUTE; // safest fallback for new users
      }
      if (!cancelled) setTarget(resolved);
    })();

    // Defensive escape hatch — fires if for ANY reason we haven't
    // navigated after 3.5 s (e.g. <Redirect> blocked by a navigator
    // suspension, or the screen got re-mounted and the auto path was
    // cancelled). 3.5 s is comfortably > the 1.8 s storage cap.
    const stuckTimer = setTimeout(() => {
      if (!cancelled) setStuck(true);
    }, 3500);

    return () => {
      cancelled = true;
      clearTimeout(stuckTimer);
    };
  }, []);

  // ── HAPPY PATH ─────────────────────────────────────────────────
  // Once we know the target AND we haven't already shown the stuck
  // screen, render <Redirect>. Expo Router handles all the navigator-
  // ready timing for us.
  if (target && !stuck) {
    return <Redirect href={target as any} />;
  }

  // ── ESCAPE HATCH ───────────────────────────────────────────────
  if (stuck) {
    const goHome = () => safeNavigate(router, HOME_ROUTE);
    const goTut  = () => safeNavigate(router, ONBOARDING_ROUTE);
    return (
      <View style={styles.root}>
        <Text style={styles.brand}>NEXUS</Text>
        <Text style={styles.tagline}>BUTLER AI · LOCAL PC AUTOMATION</Text>

        <View style={styles.statusDotWarn} />
        <Text style={styles.statusWarn}>BOOT TIMEOUT · TAP TO CONTINUE</Text>

        <View style={{ height: 28 }} />

        <TouchableOpacity activeOpacity={0.85} onPress={goHome} style={styles.cta}>
          <Text style={styles.ctaText}>CONTINUE → HOME</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={goTut} style={styles.ctaAlt}>
          <Text style={styles.ctaAltText}>SHOW TUTORIAL</Text>
        </TouchableOpacity>

        <Text style={styles.foot}>
          If you see this for more than a few seconds, please reinstall.
        </Text>
      </View>
    );
  }

  // ── NORMAL LOADING CARD ────────────────────────────────────────
  // Shown for ~50–300 ms while userSession hydrates.
  return (
    <View style={styles.root}>
      <Text style={styles.brand}>NEXUS</Text>
      <Text style={styles.tagline}>BUTLER AI · LOCAL PC AUTOMATION</Text>
      <View style={{ height: 18 }} />
      <ActivityIndicator size="large" color="#3b82f6" />
      <View style={{ height: 18 }} />
      <Text style={styles.status}>INITIALISING…</Text>
    </View>
  );
}

// ── STYLES ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#000000',
    alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  brand: {
    fontSize: 38, fontWeight: '900', color: '#3b82f6',
    letterSpacing: 8, fontFamily: MONO, marginBottom: 6,
  },
  tagline: {
    fontSize: 10, color: '#93c5fd', letterSpacing: 3,
    fontFamily: MONO, fontWeight: '700',
    textAlign: 'center', marginBottom: 6,
  },
  statusDotWarn: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FFC400', marginBottom: 6,
  },
  statusWarn: {
    fontSize: 10, color: '#FFC400', letterSpacing: 2,
    fontFamily: MONO, fontWeight: '900',
  },
  status: {
    fontSize: 10, color: '#3b82f6', letterSpacing: 2,
    fontFamily: MONO, fontWeight: '900',
  },
  cta: {
    backgroundColor: '#3b82f6', borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 32,
    marginBottom: 12, minWidth: 240, alignItems: 'center',
  },
  ctaText: {
    fontSize: 13, fontWeight: '900', color: '#ffffff',
    letterSpacing: 2.5, fontFamily: MONO,
  },
  ctaAlt: {
    borderWidth: 1.5, borderColor: '#3b82f655', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 30,
    minWidth: 240, alignItems: 'center', marginBottom: 18,
  },
  ctaAltText: {
    fontSize: 12, fontWeight: '700', color: '#3b82f6',
    letterSpacing: 2, fontFamily: MONO,
  },
  foot: {
    fontSize: 10, color: '#4b5563', textAlign: 'center',
    letterSpacing: 1, fontFamily: MONO,
  },
});
