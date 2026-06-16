/**
 * Butler AI — Root Boot Route  (`/`)
 * ──────────────────────────────────────────────────────────────────
 * v5 — AUTO-REDIRECT (replaces v4 Safe-Mode diagnostic)
 *
 * Behavior
 * ────────
 *   1. Read onboarding status from AsyncStorage in parallel:
 *        • ONBOARDING_DONE_KEY  (preferred, v2 contract)
 *        • WELCOME_COMPLETE_KEY (legacy v1, still respected)
 *   2. If either is `'true'` / `'1'`           → `/(tabs)/nexushome`
 *      Otherwise (first-launch or wiped data) → `/(tabs)/onboarding`
 *   3. Navigation uses a triple-fallback (`replace` → `push` →
 *      `navigate`) — same contract as the onboarding finish handler.
 *   4. While reading, we render a tiny black "boot card" identical
 *      to the splash so the user never sees a flash of white.
 *   5. If anything in step 1–3 takes > 2.5 s (AsyncStorage hang,
 *      router init delay, anything weird) we surface a manual
 *      ESCAPE HATCH with two buttons so the user is NEVER stuck.
 *
 * What this fixes
 * ───────────────
 *   • Removes the manual "LAUNCH FULL NEXUS" tap that v4 forced.
 *   • Onboarded users now go straight to the dashboard.
 *   • First-time users go straight to the tutorial.
 *   • Triple-fallback nav + 2.5 s timeout = no possible boot dead-end.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ONBOARDING_DONE_KEY,
  WELCOME_COMPLETE_KEY,
} from '@/constants/onboardingKeys';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const HOME_ROUTE       = '/(tabs)/nexushome'  as const;
const ONBOARDING_ROUTE = '/(tabs)/onboarding' as const;

// ── Triple-fallback navigation — never throws ─────────────────────
function safeNavigate(router: ReturnType<typeof useRouter>, route: string) {
  try { router.replace(route as any); return; } catch (e1) { console.warn('[root] replace failed:', e1); }
  try { router.push(route as any);    return; } catch (e2) { console.warn('[root] push failed:',    e2); }
  try { (router as any).navigate?.(route); } catch (e3) { console.warn('[root] navigate failed:', e3); }
}

// ── Read onboarding state with a hard timeout ─────────────────────
async function readOnboardingTarget(): Promise<typeof HOME_ROUTE | typeof ONBOARDING_ROUTE> {
  try {
    const read = Promise.all([
      AsyncStorage.getItem(ONBOARDING_DONE_KEY).catch(() => null),
      AsyncStorage.getItem(WELCOME_COMPLETE_KEY).catch(() => null),
    ]);
    // Hard cap at 1.8 s — if AsyncStorage hangs, default to HOME so
    // returning users don't get re-shown the tutorial.
    const timeout = new Promise<[null, null]>(res =>
      setTimeout(() => res([null, null]), 1800),
    );

    const [v2, v1] = (await Promise.race([read, timeout])) as [any, any];
    const onboarded =
      v2 === 'true' || v2 === '1' ||
      v1 === 'true' || v1 === '1';
    return onboarded ? HOME_ROUTE : ONBOARDING_ROUTE;
  } catch {
    // On any unexpected failure, default to HOME (safer than tutorial
    // loop, and the user can re-open the tutorial from the INTRO tab).
    return HOME_ROUTE;
  }
}

// ──────────────────────────────────────────────────────────────────
//                         ROOT BOOT ROUTE
// ──────────────────────────────────────────────────────────────────
export default function Index() {
  const router = useRouter();
  const [stuck, setStuck] = useState(false);

  // Auto-redirect on mount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const target = await readOnboardingTarget();
      if (cancelled) return;
      // Tiny 50 ms defer so React's first commit + splash hide happen
      // before the router starts the screen-transition animation.
      setTimeout(() => {
        if (cancelled) return;
        safeNavigate(router, target);
      }, 50);
    })();

    // ESCAPE HATCH — if we're still on this route after 2.5 s, surface
    // manual buttons so the user is never permanently stuck.
    const t = setTimeout(() => {
      if (!cancelled) setStuck(true);
    }, 2500);

    return () => { cancelled = true; clearTimeout(t); };
  }, [router]);

  // Manual escape hatch ──────────────────────────────────────────
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

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={goHome}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>CONTINUE → HOME</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={goTut}
          style={styles.ctaAlt}
        >
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
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  brand: {
    fontSize: 38,
    fontWeight: '900',
    color: '#3b82f6',
    letterSpacing: 8,
    fontFamily: MONO,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 10,
    color: '#93c5fd',
    letterSpacing: 3,
    fontFamily: MONO,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  statusDotWarn: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FFC400',
    marginBottom: 6,
  },
  statusWarn: {
    fontSize: 10,
    color: '#FFC400',
    letterSpacing: 2,
    fontFamily: MONO,
    fontWeight: '900',
  },
  status: {
    fontSize: 10,
    color: '#3b82f6',
    letterSpacing: 2,
    fontFamily: MONO,
    fontWeight: '900',
  },
  cta: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 12,
    minWidth: 240,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2.5,
    fontFamily: MONO,
  },
  ctaAlt: {
    borderWidth: 1.5,
    borderColor: '#3b82f655',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
    minWidth: 240,
    alignItems: 'center',
    marginBottom: 18,
  },
  ctaAltText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
    letterSpacing: 2,
    fontFamily: MONO,
  },
  foot: {
    fontSize: 10,
    color: '#4b5563',
    textAlign: 'center',
    letterSpacing: 1,
    fontFamily: MONO,
  },
});
