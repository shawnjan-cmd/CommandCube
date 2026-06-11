/**
 * ⚡ NEXUS DIVIDER — Elegant per-page thin dividers that get thinner as you go down
 * Tinted to match page particle FX color, professional and minimal
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface Props {
  color: string;
  level?: number; // 1=thickest at top, 2,3,4...= progressively thinner
  marginVertical?: number;
  marginHorizontal?: number;
  animated?: boolean;
  style?: any;
}

export default function NexusDivider({
  color,
  level = 1,
  marginVertical = 6,
  marginHorizontal = 0,
  animated = true,
  style,
}: Props) {
  // Level: 1=1.5px, 2=1px, 3=0.75px, 4=0.5px, 5+=0.33px
  const heights = [1.5, 1.0, 0.75, 0.5, 0.33];
  const height = heights[Math.min(level - 1, heights.length - 1)];
  const opacities = [0.28, 0.20, 0.14, 0.10, 0.07];
  const baseOpacity = opacities[Math.min(level - 1, opacities.length - 1)];

  const glow = useRef(new Animated.Value(baseOpacity * 0.5)).current;

  // Animation removed for performance — static opacity instead
  useEffect(() => {}, []);

  // Unified static render — animation disabled for perf

  return (
    <View style={[{ marginVertical, marginHorizontal }, style]}>
      <View style={{
        height,
        backgroundColor: color,
        borderRadius: height,
        opacity: baseOpacity,
      }} />
    </View>
  );
}
