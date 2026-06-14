/**
 * Bootstrap route — `/`
 *
 * Reads the onboarding completion flag from AsyncStorage and redirects:
 *   • Onboarding done  → /(tabs)/nexushome
 *   • Not done         → /onboarding
 *
 * This is the single source of truth for first-launch routing. No overlay,
 * no conditional render — just a clean redirect on the very first frame.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem('@butler_onboarding_done_v2');
        // Accept both 'true' and '1' (legacy format compatibility)
        const done = v === 'true' || v === '1';
        setTarget(done ? '/(tabs)/nexushome' : '/onboarding');
      } catch {
        setTarget('/onboarding');
      }
    })();
  }, []);

  if (target === null) {
    // Dark screen while AsyncStorage reads — prevents white flash
    return <View style={{ flex: 1, backgroundColor: '#050505' }} />;
  }
  return <Redirect href={target as any} />;
}
