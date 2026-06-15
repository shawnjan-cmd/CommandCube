/**
 * ButlerHeroSvg — Animated Butler AI hero illustration.
 *
 * The source SVG (`assets/svg/butler_ai_hero.svg`) uses SMIL <animate>
 * tags. We try three render strategies in order, each wrapped in try/catch
 * so a single module-load failure can NEVER produce a black screen:
 *
 *   1. Native (iOS / Android) → WebView   (SMIL animations play live)
 *   2. Web preview            → <Image>   (static, animations baked-in)
 *   3. Any failure            → <SvgXml>  (always works — same package
 *                                          already used elsewhere in the app)
 *
 *   • viewBox  : 800 × 400  → 2:1 aspect ratio
 *   • Default  : full width of parent, height auto-derived
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { BUTLER_AI_HERO_SVG_XML } from '@/constants/butlerHeroSvg';

interface Props {
  width?: number;
  height?: number;
  style?: any;
}

const ASPECT = 800 / 400;

/** Static-SVG fallback using react-native-svg's SvgXml.
 *  Always available because react-native-svg ships with Expo. */
function StaticSvgFallback({ width, height, style }: Props) {
  try {
    // Late require so the import never crashes the module top-level.
    const { SvgXml } = require('react-native-svg');
    return (
      <View style={[styles.root, { width, height }, style]} pointerEvents="none">
        <SvgXml xml={BUTLER_AI_HERO_SVG_XML} width={width} height={height} />
      </View>
    );
  } catch {
    // Even SvgXml unavailable? Render an empty placeholder so nothing crashes.
    return <View style={[styles.root, { width, height }, style]} pointerEvents="none" />;
  }
}

export default function ButlerHeroSvg({ width, height, style }: Props) {
  const SW = Dimensions.get('window').width;
  const w  = width  ?? Math.min(SW - 32, 540);
  const h  = height ?? w / ASPECT;

  // ── Web preview ─────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    try {
      let b64: string;
      try {
        b64 = (typeof btoa === 'function')
          ? btoa(unescape(encodeURIComponent(BUTLER_AI_HERO_SVG_XML)))
          : Buffer.from(BUTLER_AI_HERO_SVG_XML, 'utf8').toString('base64');
      } catch { b64 = ''; }
      const dataUri = 'data:image/svg+xml;base64,' + b64;
      const RNImg: any = require('react-native').Image;
      return (
        <View style={[styles.root, { width: w, height: h }, style]} pointerEvents="none">
          <RNImg source={{ uri: dataUri }} style={{ width: w, height: h }} resizeMode="contain" />
        </View>
      );
    } catch { return <StaticSvgFallback width={w} height={h} style={style} />; }
  }

  // ── Native (iOS / Android) — try WebView; fall back to SvgXml on failure ──
  // We attempt to `require()` the module synchronously inside the render so
  // a missing/broken native module can never explode the bundle parse on
  // first boot. If require throws, we silently fall back to SvgXml.
  let WebView: any = null;
  try { WebView = require('react-native-webview').WebView; } catch { WebView = null; }
  if (!WebView) return <StaticSvgFallback width={w} height={h} style={style} />;

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

  try {
    return (
      <View style={[styles.root, { width: w, height: h }, style]} pointerEvents="none">
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webview}
          // @ts-ignore
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
          // @ts-ignore - prop may not exist on older versions
          backgroundColor="transparent"
          setSupportMultipleWindows={false}
          onError={() => { /* silently swallow — fallback will render via re-render below if state-driven */ }}
          renderError={() => null}
        />
      </View>
    );
  } catch {
    return <StaticSvgFallback width={w} height={h} style={style} />;
  }
}

const styles = StyleSheet.create({
  root:    { backgroundColor: 'transparent', overflow: 'hidden' },
  webview: { backgroundColor: 'transparent', flex: 1 },
});
