/**
 * SkeletonLoader Component
 * Shimmer loading effect powered by Reanimated V3 (60 FPS)
 * 
 * Features:
 * - Gold shimmer effect
 * - Pulse and shimmer modes
 * - Customizable dimensions
 * - Zero layout shift
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { DesignSystem } from '@/constants/designSystem';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  variant?: 'pulse' | 'shimmer';
  style?: StyleProp<ViewStyle>;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 48,
  variant = 'shimmer',
  style,
}) => {
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(-300);
  
  useEffect(() => {
    if (variant === 'pulse') {
      // Pulse animation (opacity fade)
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.4, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      );
    } else {
      // Shimmer animation (horizontal sweep)
      translateX.value = withRepeat(
        withTiming(300, {
          duration: 1500,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }
    
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateX);
    };
  }, [variant]);
  
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  
  if (variant === 'pulse') {
    return (
      <Animated.View
        style={[
          styles.skeleton,
          { width: width as any, height: height as any },
          pulseStyle,
          style,
        ]}
      />
    );
  }
  
  return (
    <View style={[styles.skeleton, { width: width as any, height: height as any }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            DesignSystem.colors.goldGlow,
            DesignSystem.colors.gold + '60',
            DesignSystem.colors.goldGlow,
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: DesignSystem.colors.surface,
    borderRadius: DesignSystem.radius.md,
    overflow: 'hidden',
  },
});
