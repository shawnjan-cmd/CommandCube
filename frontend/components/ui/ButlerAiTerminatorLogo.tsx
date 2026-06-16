/**
 * ButlerAiTerminatorLogo
 * ──────────────────────────────────────────────────────────────────
 * Renders the user-uploaded Butler AI Terminator SVG as a React Native
 * component using `react-native-svg`'s `SvgXml`. The raw SVG markup is
 * exported from `./ButlerAiTerminatorSvg.ts` (with CSS animations
 * stripped — react-native-svg doesn't support <style> blocks).
 *
 * Props:
 *   • width   — render width. Aspect ratio (412:200) is preserved by
 *               react-native-svg automatically.
 *   • height  — optional explicit height. If omitted, computed from width.
 *   • opacity — optional wrapper opacity.
 *
 * Usage:
 *   <ButlerAiTerminatorLogo width={260} />
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { BUTLER_AI_TERMINATOR_SVG } from './ButlerAiTerminatorSvg';

// Native SVG viewBox is 412 × 200 → aspect ratio 2.06:1
const NATIVE_W = 412;
const NATIVE_H = 200;
const ASPECT   = NATIVE_W / NATIVE_H;

interface Props {
  width?: number;
  height?: number;
  style?: ViewStyle;
}

const ButlerAiTerminatorLogo: React.FC<Props> = ({ width = 260, height, style }) => {
  const h = height ?? Math.round(width / ASPECT);
  return (
    <View style={[styles.holder, { width, height: h }, style]}>
      <SvgXml xml={BUTLER_AI_TERMINATOR_SVG} width="100%" height="100%" />
    </View>
  );
};

const styles = StyleSheet.create({
  holder: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default React.memo(ButlerAiTerminatorLogo);
