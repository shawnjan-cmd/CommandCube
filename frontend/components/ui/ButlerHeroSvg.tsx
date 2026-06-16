/**
 * ButlerHeroSvg — Static Butler AI hero illustration (v3 — WebView REMOVED)
 * ─────────────────────────────────────────────────────────────────────
 *
 * HISTORY
 *   v1/v2 tried to render the SMIL-animated source SVG inside a
 *   `react-native-webview` on native. Result: known Android cold-start
 *   crash → user taps INTRO tab → black screen. The WebView native
 *   module proved too fragile during the onboarding-tab first-mount
 *   window on stock Android (especially with New Architecture +
 *   Hermes + first-launch storage warm-up all racing each other).
 *
 *   v3 NUKES WebView entirely. We now render the same SVG content via
 *   `react-native-svg`'s `SvgXml`, which is already a hard dependency
 *   of every Expo project. No SMIL animations (those need WebView or
 *   a JS-side anim engine) — but the source SVG looks ~identical
 *   statically, and the trade-off is: no animation, but the app
 *   actually opens. We will not break startup again to get a wiggle.
 *
 * NEVER REINTRODUCE WEBVIEW HERE. If animation is wanted later, do
 * it with `Animated.Value` + react-native-svg primitives — not a
 * native WebView wrapper.
 */
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { BUTLER_AI_HERO_SVG_XML } from '@/constants/butlerHeroSvg';

interface Props {
  width?: number;
  height?: number;
  style?: any;
}

const ASPECT = 800 / 400;

export default function ButlerHeroSvg({ width, height, style }: Props) {
  const dim = Dimensions.get('window');
  const SW  = dim?.width && dim.width > 0 ? dim.width : 375;
  const w   = width  ?? Math.min(SW - 32, 540);
  const h   = height ?? w / ASPECT;

  // Late-require `react-native-svg`'s SvgXml inside the function so any
  // theoretical bundling weirdness can never explode at module-load. If
  // somehow SvgXml is unavailable, we render a plain placeholder View
  // (still no crash, just no illustration).
  try {
    const { SvgXml } = require('react-native-svg');
    return (
      <View style={[styles.root, { width: w, height: h }, style]} pointerEvents="none">
        <SvgXml xml={BUTLER_AI_HERO_SVG_XML} width={w} height={h} />
      </View>
    );
  } catch {
    return <View style={[styles.root, { width: w, height: h }, style]} pointerEvents="none" />;
  }
}

const styles = StyleSheet.create({
  root: { backgroundColor: 'transparent', overflow: 'hidden' },
});
