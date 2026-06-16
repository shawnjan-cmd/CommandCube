/**
 * CyberButton Component
 * Professional action button with haptic feedback and micro-interactions
 * 
 * Features:
 * - Haptic feedback on press
 * - Smooth 60 FPS animations
 * - Loading state with skeleton
 * - Disabled state handling
 * - Size variants (sm, md, lg)
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
// LAZY Haptics — load native module only on first user-tap, never at
// module evaluation time. Prevents Android cold-start race conditions
// where the native bridge isn't ready when this module is parsed.
let _haptics: any = null;
function getHaptics() {
  if (!_haptics) { try { _haptics = require('expo-haptics'); } catch { _haptics = {}; } }
  return _haptics;
}
const Haptics = new Proxy({}, { get: (_t, prop) => (getHaptics() as any)?.[prop] }) as any;
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { DesignSystem } from '@/constants/designSystem';

interface CyberButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  hapticFeedback?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const CyberButton: React.FC<CyberButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  hapticFeedback = true,
  style,
  textStyle,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  
  const handlePressIn = () => {
    if (disabled || loading) return;
    
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 400,
    });
    
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 400,
    });
  };
  
  const handlePress = () => {
    if (disabled || loading) return;
    
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    onPress();
  };
  
  // Disabled opacity animation
  React.useEffect(() => {
    opacity.value = withTiming(disabled ? 0.5 : 1, {
      duration: DesignSystem.animation.fast,
    });
  }, [disabled]);
  
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);
  
  return (
    <AnimatedTouchable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.9}
      style={[
        styles.button,
        variantStyles.container,
        sizeStyles.container,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyles.text.color}
        />
      ) : (
        <Text
          style={[
            styles.text,
            variantStyles.text,
            sizeStyles.text,
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </AnimatedTouchable>
  );
};

// Variant styles
function getVariantStyles(variant: 'primary' | 'secondary' | 'destructive') {
  const variants = {
    primary: {
      container: {
        backgroundColor: DesignSystem.colors.gold,
        borderColor: DesignSystem.colors.gold,
      },
      text: {
        color: DesignSystem.colors.void,
        fontWeight: DesignSystem.fonts.bold,
      },
    },
    secondary: {
      container: {
        backgroundColor: 'transparent',
        borderColor: DesignSystem.colors.borderGold,
        borderWidth: 1,
      },
      text: {
        color: DesignSystem.colors.gold,
        fontWeight: DesignSystem.fonts.semiBold,
      },
    },
    destructive: {
      container: {
        backgroundColor: DesignSystem.colors.cyberRed,
        borderColor: DesignSystem.colors.cyberRed,
      },
      text: {
        color: DesignSystem.colors.textPrimary,
        fontWeight: DesignSystem.fonts.bold,
      },
    },
  };
  
  return variants[variant];
}

// Size styles
function getSizeStyles(size: 'sm' | 'md' | 'lg') {
  const sizes = {
    sm: {
      container: {
        height: 36,
        paddingHorizontal: DesignSystem.spacing.md,
      },
      text: {
        fontSize: DesignSystem.fontSizes.sm,
      },
    },
    md: {
      container: {
        height: DesignSystem.layout.buttonHeight,
        paddingHorizontal: DesignSystem.spacing.lg,
      },
      text: {
        fontSize: DesignSystem.fontSizes.md,
      },
    },
    lg: {
      container: {
        height: 56,
        paddingHorizontal: DesignSystem.spacing.xl,
      },
      text: {
        fontSize: DesignSystem.fontSizes.lg,
      },
    },
  };
  
  return sizes[size];
}

const styles = StyleSheet.create({
  button: {
    borderRadius: DesignSystem.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...DesignSystem.shadows.goldGlowSm,
  },
  text: {
    fontFamily: DesignSystem.fonts.ui,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
