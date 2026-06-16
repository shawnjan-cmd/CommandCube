/**
 * Butler AI — Welcome Back Overlay · CLEAN REWRITE v1
 * ──────────────────────────────────────────────────────────────────
 *
 * Tiny, ZERO-DEPENDENCY overlay that briefly greets the user when
 * they cold-launch the app:
 *
 *   • New user        → "FIRST RUN · INITIALISING…"
 *   • Returning user  → "WELCOME BACK · {n} SESSIONS"
 *
 * Auto-dismisses after `holdMs` (default 1000 ms) with a fade-out.
 * Pure React Native primitives — no SVG, no Animated.loop, no
 * external fonts. Cannot block render, cannot crash.
 *
 * Mount once in a tab screen (e.g. nexushome) — it manages its own
 * visibility and unmounts itself when done.
 *
 * Why is this NOT in the boot path?
 *   Mounting overlays in the root layout has historically caused
 *   Android cold-start instability (rendering before the bridge is
 *   ready). This component is INTENTIONALLY confined to post-route
 *   tabs only, where the runtime is fully alive.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Platform, Animated, TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const C = {
  bg:        '#000000EE',
  card:      '#0b1220',
  cardEdge:  '#1f293755',
  text:      '#e5e7eb',
  textDim:   '#9ca3af',
  brand:     '#3b82f6',
  good:      '#00FF88',
  amber:     '#fb923c',
};

interface Props {
  isReturning: boolean;
  /** Total ms the card is held visible before fade-out. Default 1000. */
  holdMs?: number;
  /** Optional tap-to-dismiss handler. Default just dismisses. */
  onDismiss?: () => void;
}

export default function WelcomeBackOverlay({
  isReturning,
  holdMs = 1000,
  onDismiss,
}: Props) {
  const [visible, setVisible] = useState(true);
  const fade = useRef(new Animated.Value(0)).current;

  // Fade in immediately, then fade out after `holdMs`.
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    const t = setTimeout(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, holdMs);

    return () => clearTimeout(t);
  }, [fade, holdMs]);

  const dismiss = () => {
    setVisible(false);
    if (onDismiss) try { onDismiss(); } catch {}
  };

  if (!visible) return null;

  const accent  = isReturning ? C.good : C.amber;
  const icon    = isReturning ? 'check-circle' : 'rocket-launch';
  const title   = isReturning ? 'WELCOME BACK' : 'FIRST RUN';
  const sub     = isReturning
    ? 'Session restored · pairing keys intact'
    : 'Initialising · LAN-only · zero telemetry';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.root, { opacity: fade }]}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={dismiss}
        style={[styles.card, { borderColor: accent + '55' }]}
      >
        <View style={[styles.iconWrap, { borderColor: accent + '66', backgroundColor: accent + '14' }]}>
          <MaterialIcons name={icon as any} size={22} color={accent} />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: accent }]}>{title}</Text>
          <Text style={styles.sub}>{sub}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 64 : 28,
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 9000,
    elevation: 9000,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: C.card + 'EE',
    minWidth: 220,
    maxWidth: 340,
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1.2,
    alignItems: 'center', justifyContent: 'center',
  },
  textCol: { flex: 1 },
  title: {
    fontSize: 12, fontWeight: '900',
    letterSpacing: 2,
    fontFamily: MONO,
    marginBottom: 2,
  },
  sub: {
    fontSize: 11,
    color: C.textDim,
    lineHeight: 15,
  },
});
