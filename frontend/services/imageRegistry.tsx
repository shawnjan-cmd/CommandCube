/**
 * 🛡️ IMAGE ASSET GUARDIAN — All images removed per user request.
 * Replaced with black robot cartoon theme placeholders.
 */

import React from 'react';
import { View, Text } from 'react-native';

export const IMAGE_REGISTRY: Record<string, any> = {};
export type ImageKey = string;

/**
 * SafeImage — Returns a black robot cartoon placeholder View.
 * All actual image loading removed permanently.
 */
export function SafeImage({
  style,
  fallbackColor = '#0D0404',
  fallbackIcon,
}: {
  imageKey?: string;
  style?: any;
  contentFit?: string;
  contentPosition?: any;
  fallbackColor?: string;
  fallbackIcon?: string;
}) {
  return (
    <View style={[style, {
      backgroundColor: fallbackColor,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }]}>
      {/* Black robot cartoon circuit decoration */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {[0,1,2].map(i => (
          <View key={i} style={{ position: 'absolute', left: 0, right: 0, height: 1, top: i * 14, backgroundColor: '#FF220010' }} />
        ))}
      </View>
      {fallbackIcon ? <Text style={{ fontSize: 20, color: '#FF2200' }}>{fallbackIcon}</Text> : null}
    </View>
  );
}

export default IMAGE_REGISTRY;
