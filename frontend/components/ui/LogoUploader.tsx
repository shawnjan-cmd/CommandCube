import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LogoUploaderProps {
  storageKey: string;
  size?: number;
  themeColor?: string;
  shape?: 'circle' | 'rounded' | 'square';
  fallback?: React.ReactNode;
}

export default function LogoUploader({
  storageKey,
  size = 120,
  themeColor = '#FF2A1F',
  shape = 'rounded',
  fallback,
}: LogoUploaderProps) {
  const [logoUri, setLogoUri] = useState<string | null>(null);

  const borderRadius = shape === 'circle' ? size / 2 : shape === 'rounded' ? 16 : 0;

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then(v => { if (v) setLogoUri(v); }).catch(() => {});
  }, [storageKey]);

  const handlePress = async () => {
    // Image picker is not available in this environment; fallback is displayed
  };

  const handleLongPress = async () => {
    try {
      await AsyncStorage.removeItem(storageKey);
      setLogoUri(null);
    } catch {}
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          borderColor: themeColor + '60',
          backgroundColor: themeColor + '12',
        },
      ]}
    >
      <View style={styles.inner}>
        {fallback}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
