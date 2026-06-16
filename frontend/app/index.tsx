/**
 * Butler AI — Root Boot Route  (`/`)
 * ──────────────────────────────────────────────────────────────────
 * v4 — "MINIMAL SAFE HOME" (diagnostic mode for native black-screen)
 *
 * Per user request after 20+ black-screen builds, this route now
 * renders a SELF-CONTAINED home screen instead of redirecting to
 * `/(tabs)/nexushome`. That bypasses every heavy component in the
 * (tabs) tree — FuturisticTabBar, QuickButlerBar, ConnectionBadge,
 * 9 tab routes, ~2400-line dashboard — any one of which could be
 * the crash culprit.
 *
 * Diagnostic value:
 *   • If THIS minimal screen renders → JS bundle + Hermes are fine;
 *     the crash is inside the (tabs) tree → we strip components.
 *   • If THIS minimal screen still black-screens → JS bundle never
 *     loaded; the crash is native (ProGuard, native module init,
 *     manifest) → we look there.
 *
 * Once we identify the root cause, this file goes back to a simple
 * <Redirect /> to the real home.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

export default function Index() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [stage, setStage] = useState<'safe' | 'goingFull'>('safe');

  const goFull = () => {
    setStage('goingFull');
    // Defer the navigation 100ms so the user actually SEES this safe screen
    // first — confirms the bundle ran before we attempt the full app.
    setTimeout(() => {
      try { router.replace('/(tabs)/nexushome' as any); }
      catch (e) { console.warn('[index] route to full app failed:', e); }
    }, 100);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* HERO — proves JS bundle loaded + RN renders */}
        <View style={styles.hero}>
          <Text style={styles.brand}>NEXUS</Text>
          <Text style={styles.tagline}>BUTLER AI · LOCAL PC AUTOMATION</Text>
          <View style={styles.statusDot} />
          <Text style={styles.status}>SAFE MODE · BOOT OK</Text>
        </View>

        {/* INFO PANEL — proves StyleSheet, flex, scroll, text all work */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>COLD-START DIAGNOSTIC</Text>
          <Text style={styles.cardBody}>
            If you can read this, the JS bundle loaded, React Native mounted,
            and the root layout rendered successfully. The previous
            black-screen issue was inside the full tab layout, not the boot
            chain.
          </Text>
          <Text style={styles.cardBody}>
            Tap below to load the full NEXUS app. If THAT screen black-screens,
            we know the crash is inside one of the heavy components
            (dashboard / tab bar / floating composer) — we'll strip them next.
          </Text>
        </View>

        {/* PLATFORM INFO */}
        <View style={styles.metaRow}>
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>PLATFORM</Text>
            <Text style={styles.metaValue}>{Platform.OS.toUpperCase()}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>VERSION</Text>
            <Text style={styles.metaValue}>{String(Platform.Version ?? '?')}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>ARCH</Text>
            <Text style={styles.metaValue}>NEW</Text>
          </View>
        </View>

        {/* PRIMARY ACTION */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={goFull}
          disabled={stage === 'goingFull'}
          style={[styles.cta, stage === 'goingFull' && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>
            {stage === 'goingFull' ? 'LOADING FULL APP…' : 'LAUNCH FULL NEXUS →'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.foot}>
          Safe Mode v1.0 · No providers · No tabs · No native services.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#000000' },
  scroll:  { padding: 20, paddingBottom: 60, alignItems: 'stretch' },
  hero:    { alignItems: 'center', marginBottom: 28 },
  brand:   {
    fontSize: 44,
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
    marginBottom: 14,
    textAlign: 'center',
  },
  statusDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#00FF41',
    marginBottom: 8,
  },
  status:  {
    fontSize: 10,
    color: '#00FF41',
    letterSpacing: 2,
    fontFamily: MONO,
    fontWeight: '900',
  },
  card: {
    borderWidth: 1,
    borderColor: '#3b82f655',
    borderRadius: 10,
    backgroundColor: '#0f1219EE',
    padding: 16,
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#3b82f6',
    letterSpacing: 2,
    marginBottom: 10,
    fontFamily: MONO,
  },
  cardBody: {
    fontSize: 13,
    color: '#dde2f0',
    lineHeight: 19,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  meta: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0f1219AA',
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 9,
    color: '#6b7280',
    letterSpacing: 1.5,
    fontFamily: MONO,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 13,
    color: '#dde2f0',
    fontWeight: '900',
    fontFamily: MONO,
  },
  cta: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaPressed: { opacity: 0.6 },
  ctaText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2.5,
    fontFamily: MONO,
  },
  foot: {
    fontSize: 10,
    color: '#4b5563',
    textAlign: 'center',
    letterSpacing: 1.5,
    fontFamily: MONO,
  },
});
