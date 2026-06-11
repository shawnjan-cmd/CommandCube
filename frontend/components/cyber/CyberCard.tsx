/**
 * CyberCard Component
 * Professional glowing neon card with encrypted gold aesthetic
 * 
 * Features:
 * - Platform-optimized glow effects
 * - Customizable glow color
 * - Border gradient support
 * - Elevation system
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { DesignSystem } from '@/constants/designSystem';

interface CyberCardProps {
  children: React.ReactNode;
  glowColor?: string;
  glowIntensity?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  noBorder?: boolean;
  padding?: keyof typeof DesignSystem.spacing;
}

export const CyberCard: React.FC<CyberCardProps> = ({
  glowColor = DesignSystem.colors.gold,
  glowIntensity = 'md',
  children,
  style,
  noBorder = false,
  padding = 'lg',
}) => {
  const shadowStyle = getShadowStyle(glowIntensity, glowColor);
  
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: noBorder ? 'transparent' : glowColor,
          borderWidth: noBorder ? 0 : 1,
          padding: DesignSystem.spacing[padding],
        },
        shadowStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
};

// Helper to get shadow style based on intensity
function getShadowStyle(intensity: 'sm' | 'md' | 'lg', color: string) {
  const intensityMap = {
    sm: DesignSystem.shadows.goldGlowSm,
    md: DesignSystem.shadows.goldGlowMd,
    lg: DesignSystem.shadows.goldGlowLg,
  };
  
  const baseShadow = intensityMap[intensity];
  
  // Override shadow color
  return {
    ...baseShadow,
    shadowColor: color, // iOS only
  };
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DesignSystem.colors.surface,
    borderRadius: DesignSystem.radius.lg,
    marginVertical: DesignSystem.spacing.sm,
  },
});
