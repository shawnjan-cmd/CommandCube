/**
 * Butler AI — Root Boot Route  (`/`)
 * ──────────────────────────────────────────────────────────────────
 * v6 — INTERACTION-MANAGER-AWARE AUTO-REDIRECT
 *
 * BEHAVIOR
 *   1. Read the boot-target from the in-memory userSession cache (the
 *      cache is hydrated by `_layout.tsx` at module-eval; this read is
 *      almost always a single-tick lookup).
 *   2. Wait for `InteractionManager.runAfterInteractions` so the router
 *      animation/transition system is guaranteed-ready before we fire
 *      a navigation. This eliminates the `setTimeout(50)` race that
 *      previous versions used.
 *   3. Triple-fallback navigation (`replace` → `push` → `navigate`).
 *   4. Manual ESCAPE HATCH after 2.5 s in case anything goes weird.
 *
 * WHY THIS FILE EXISTS
 *   The route `/` is the cold-start entry on web AND native. It must
 *   never block, never throw, and always end with either an automatic
 *   redirect or a manual recovery button visible to the user.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  getBootTarget,
  HOME_ROUTE,
  ONBOARDING_ROUTE,
  type BootTarget,
} from '@/services/userSession';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ── Triple-fallback navigation — never throws ─────────────────────
function safeNavigate(router: ReturnType<typeof useRouter>, route: string) {
  try { router.replace(route as any); return; } catch (e1) { try { console.warn('[root] replace failed:', e1); } catch {} }
  try { router.push(route as any);    return; } catch (e2) { try { console.warn('[root] push failed:',    e2); } catch {} }
  try { (router as any).navigate?.(route); return; } catch (e3) { try { console.warn('[root] navigate failed:', e3); } catch {} }
  try { router.replace('/(tabs)/nexushome' as any); } catch {}
}

// ──────────────────────────────────────────────────────────────────
//                         ROOT BOOT ROUTE
// ──────────────────────────────────────────────────────────────────
export default function Index() {
  const router = useRouter();
  const [stuck, setStuck] = useState(false);

  // Auto-redirect on mount — driven by InteractionManager.
  useEffect(() => {
    let cancelled = false;
    let interactionHandle: { cancel: () => void } | null = null;

    (async () => {
      let target: BootTarget;
      try {
        target = await getBootTarget();
      } catch {
        target = ONBOARDING_ROUTE; // safest fallback for new users
      }
      if (cancelled) return;

      // InteractionManager.runAfterInteractions guarantees the JS
      // thread is idle (no in-flight animations, no batched renders).
      // This is the canonical way to defer navigation until the
      // router is fully painted on screen — drastically better than
      // a setTimeout race.
      interactionHandle = InteractionManager.runAfterInteractions(() => {
        if (!cancelled) safeNavigate(router, target);
      });
    })();

    // ESCAPE HATCH — if we're still on this route after 2.5 s, show
    // manual buttons so the user is NEVER permanently stuck.
    const stuckTimer = setTimeout(() => {
      if (!cancelled) setStuck(true);
    }, 2500);

    return () => {
      cancelled = true;
      try { interactionHandle?.cancel?.(); } catch {}
      clearTimeout(stuckTimer);
    };
  }, [router]);

  // Manual escape hatch handlers ─────────────────────────────────
  const goHome = useCallback(() => safeNavigate(router, HOME_ROUTE),       [router]);
  const goTut  = useCallback(() => safeNavigate(router, ONBOARDING_ROUTE), [router]);

  if (stuck) {
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

  // Normal boot card — quietly shown for ~50–300 ms before the redirect.
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
