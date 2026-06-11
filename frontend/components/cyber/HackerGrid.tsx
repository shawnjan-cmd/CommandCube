/**
 * HackerGrid Background
 * SVG-based grid pattern (< 1KB, scales perfectly)
 * 
 * Features:
 * - Pure SVG (no image assets)
 * - Scales to any screen size
 * - Animated glow dots
 * - Zero pixelation
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { DesignSystem } from '@/constants/designSystem';

const { width, height } = Dimensions.get('window');
const GRID_SIZE = 40;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const HackerGrid: React.FC = () => {
  // Create vertical lines
  const verticalLines = [];
  for (let i = 0; i <= width / GRID_SIZE; i++) {
    verticalLines.push(
      <Line
        key={`v-${i}`}
        x1={i * GRID_SIZE}
        y1={0}
        x2={i * GRID_SIZE}
        y2={height}
        stroke={DesignSystem.colors.borderSubtle}
        strokeWidth={0.5}
        opacity={0.15}
      />
    );
  }
  
  // Create horizontal lines
  const horizontalLines = [];
  for (let i = 0; i <= height / GRID_SIZE; i++) {
    horizontalLines.push(
      <Line
        key={`h-${i}`}
        x1={0}
        y1={i * GRID_SIZE}
        x2={width}
        y2={i * GRID_SIZE}
        stroke={DesignSystem.colors.borderSubtle}
        strokeWidth={0.5}
        opacity={0.15}
      />
    );
  }
  
  // Animated glow dots at intersections
  const glowDots = [
    { x: width * 0.2, y: height * 0.3 },
    { x: width * 0.7, y: height * 0.5 },
    { x: width * 0.5, y: height * 0.7 },
  ];
  
  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={DesignSystem.colors.gold} stopOpacity="0.6" />
            <Stop offset="100%" stopColor={DesignSystem.colors.gold} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        

        {verticalLines}
        {horizontalLines}
        

        {glowDots.map((dot, i) => (
          <GlowDot key={`dot-${i}`} x={dot.x} y={dot.y} delay={i * 500} />
        ))}
      </Svg>
    </View>
  );
};

// Animated glow dot component
const GlowDot: React.FC<{ x: number; y: number; delay: number }> = ({ x, y, delay }) => {
  const opacity = useSharedValue(0.3);
  const radius = useSharedValue(2);
  
  React.useEffect(() => {
    setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      
      radius.value = withRepeat(
        withSequence(
          withTiming(4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(2, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }, delay);
  }, []);
  
  const animatedProps = useAnimatedProps(() => ({
    opacity: opacity.value,
    r: radius.value,
  }));
  
  return (
    <AnimatedCircle
      cx={x}
      cy={y}
      fill="url(#glowGradient)"
      animatedProps={animatedProps}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
});
