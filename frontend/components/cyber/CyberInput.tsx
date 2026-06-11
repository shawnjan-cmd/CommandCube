/**
 * CyberInput Component
 * Professional text input with encrypted gold styling
 * 
 * Features:
 * - Monospace font for technical data (IPs, ports)
 * - Gold focus glow
 * - Error state handling
 * - Helper text support
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { DesignSystem } from '@/constants/designSystem';

interface CyberInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof MaterialIcons.glyphMap;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightIconPress?: () => void;
  monospace?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const CyberInput: React.FC<CyberInputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  monospace = false,
  containerStyle,
  ...inputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const borderOpacity = useSharedValue(0.6);
  const glowOpacity = useSharedValue(0);
  
  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(255, 215, 0, ${borderOpacity.value})`,
  }));
  
  const animatedGlowStyle = useAnimatedStyle(() => ({
    ...DesignSystem.shadows.goldGlowMd,
    shadowOpacity: glowOpacity.value,
  }));
  
  const handleFocus = () => {
    setIsFocused(true);
    borderOpacity.value = withTiming(1, { duration: DesignSystem.animation.fast });
    glowOpacity.value = withTiming(0.4, { duration: DesignSystem.animation.fast });
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    borderOpacity.value = withTiming(0.6, { duration: DesignSystem.animation.fast });
    glowOpacity.value = withTiming(0, { duration: DesignSystem.animation.fast });
  };
  
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      
      <Animated.View
        style={[
          styles.inputContainer,
          error && styles.inputContainerError,
          animatedBorderStyle,
          animatedGlowStyle,
        ]}
      >
        {leftIcon && (
          <MaterialIcons
            name={leftIcon}
            size={DesignSystem.layout.iconSize.md}
            color={error ? DesignSystem.colors.cyberRed : DesignSystem.colors.textSecondary}
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          {...inputProps}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            monospace && { fontFamily: DesignSystem.fonts.code },
            leftIcon && { paddingLeft: 0 },
            rightIcon && { paddingRight: 0 },
          ]}
          placeholderTextColor={DesignSystem.colors.textDim}
        />
        
        {rightIcon && (
          <MaterialIcons
            name={rightIcon}
            size={DesignSystem.layout.iconSize.md}
            color={DesignSystem.colors.textSecondary}
            style={styles.rightIcon}
            onPress={onRightIconPress}
          />
        )}
      </Animated.View>
      
      {(error || helperText) && (
        <View style={styles.helperContainer}>
          {error ? (
            <>
              <MaterialIcons
                name="error-outline"
                size={DesignSystem.layout.iconSize.sm}
                color={DesignSystem.colors.cyberRed}
              />
              <Text style={styles.errorText}>{error}</Text>
            </>
          ) : (
            <Text style={styles.helperText}>{helperText}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: DesignSystem.spacing.sm,
  },
  label: {
    fontSize: DesignSystem.fontSizes.sm,
    fontWeight: DesignSystem.fonts.semiBold,
    color: DesignSystem.colors.gold,
    marginBottom: DesignSystem.spacing.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DesignSystem.colors.surface,
    borderRadius: DesignSystem.radius.md,
    borderWidth: 1,
    borderColor: DesignSystem.colors.borderGold,
    paddingHorizontal: DesignSystem.spacing.md,
    height: DesignSystem.layout.inputHeight,
  },
  inputContainerError: {
    borderColor: DesignSystem.colors.cyberRed,
  },
  input: {
    flex: 1,
    fontSize: DesignSystem.fontSizes.md,
    color: DesignSystem.colors.textPrimary,
    fontFamily: DesignSystem.fonts.ui,
  },
  leftIcon: {
    marginRight: DesignSystem.spacing.sm,
  },
  rightIcon: {
    marginLeft: DesignSystem.spacing.sm,
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: DesignSystem.spacing.xs,
    gap: DesignSystem.spacing.xs,
  },
  errorText: {
    fontSize: DesignSystem.fontSizes.xs,
    color: DesignSystem.colors.cyberRed,
  },
  helperText: {
    fontSize: DesignSystem.fontSizes.xs,
    color: DesignSystem.colors.textSecondary,
  },
});
