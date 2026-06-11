/**
 * NexusWrapper — Root wrapper with animated theme-aware background.
 * Uses effectiveTheme (preview or active) so live preview works instantly.
 * The Animated.View fade gives a smooth color transition on theme switch.
 */

import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useCosmetic } from '@/contexts/CosmeticContext';

interface NexusWrapperProps {
  children: React.ReactNode;
}

export function NexusWrapper({ children }: NexusWrapperProps) {
  const { effectiveTheme, fadeAnim } = useCosmetic();

  return (
    <Animated.View
      style={[
        styles.root,
        {
          backgroundColor: effectiveTheme.bg || '#020508',
          opacity: fadeAnim,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // NexusMind Omega root bg applied via effectiveTheme.bg (updated in CosmeticContext)
});
