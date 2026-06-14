/**
 * ButlerHeroSvg — Animated Butler AI hero illustration.
 *
 * The source SVG (`assets/svg/butler_ai_hero.svg`) uses SMIL <animate>
 * tags which `react-native-svg` does not support on native. We therefore
 * embed it inside a transparent WebView so the animations render natively
 * on both iOS and Android while keeping the file a real SVG (vector,
 * resolution-independent, tiny payload).
 *
 *   • viewBox  : 800 × 400  → 2:1 aspect ratio
 *   • Default  : full width of parent, height auto-derived
 *   • Web      : falls back to a normal <img> when WebView is unavailable
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { BUTLER_AI_HERO_SVG_XML } from '@/constants/butlerHeroSvg';

interface Props {
  /** Width in pixels. Defaults to (screen width - 32). */
  width?: number;
  /** Optional explicit height. Defaults to width / 2 (matches viewBox 800x400). */
  height?: number;
  /** Inject extra wrapper styles. */
  style?: any;
}

const ASPECT = 800 / 400; // matches viewBox

export default function ButlerHeroSvg({ width, height, style }: Props) {
  const SW = Dimensions.get('window').width;
  const w  = width  ?? Math.min(SW - 32, 540);
  const h  = height ?? w / ASPECT;

  // Wrap the SVG in a minimal HTML doc so the WebView can render it
  // edge-to-edge without scrollbars or default browser margins.
  const html = useMemo(() => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
<style>
  html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
  body { display: flex; align-items: center; justify-content: center; height: 100vh; width: 100vw; }
  svg { width: 100%; height: 100%; display: block; }
  * { -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; user-select: none; }
</style></head>
<body>${BUTLER_AI_HERO_SVG_XML}</body></html>`, []);

  // ── Web preview ─────────────────────────────────────────────────────────
  // react-native-webview on web is buggy (renders inside an iframe that
  // doesn't size correctly). Use a plain <img data:image/svg+xml;base64,…>
  // on web so the Metro web preview / Expo Go web tabs stay correct.
  if (Platform.OS === 'web') {
    // Base64 is more reliable than utf8 + encodeURIComponent for complex
    // SVGs containing # in colors, quotes, etc.
    let b64: string;
    try {
      // btoa needs Latin-1 — encode via unescape(encodeURIComponent(...))
      // which is the standard UTF-8 → Latin-1 trick used by every web app.
      b64 = (typeof btoa === 'function')
        ? btoa(unescape(encodeURIComponent(BUTLER_AI_HERO_SVG_XML)))
        : Buffer.from(BUTLER_AI_HERO_SVG_XML, 'utf8').toString('base64');
    } catch {
      b64 = '';
    }
    const dataUri = 'data:image/svg+xml;base64,' + b64;
    const RNImg: any = require('react-native').Image;
    return (
      <View style={[styles.root, { width: w, height: h }, style]} pointerEvents="none">
        <RNImg source={{ uri: dataUri }} style={{ width: w, height: h }} resizeMode="contain" />
      </View>
    );
  }

  // ── Native (iOS / Android) — WebView keeps SMIL animations running ─────
  return (
    <View style={[styles.root, { width: w, height: h }, style]} pointerEvents="none">
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        // Transparent background so the parent's color shows through.
        // androidLayerType="hardware" gives the smoothest SMIL playback on Android.
        // @ts-ignore - cross-platform shim
        androidLayerType="hardware"
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled={false}
        domStorageEnabled={false}
        cacheEnabled={false}
        // @ts-ignore - iOS only
        contentInsetAdjustmentBehavior="never"
        backgroundColor="transparent"
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { backgroundColor: 'transparent', overflow: 'hidden' },
  webview: { backgroundColor: 'transparent', flex: 1 },
});
