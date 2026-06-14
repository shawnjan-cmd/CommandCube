/**
 * Bootstrap route — `/`
 *
 * Reads the onboarding completion flag and redirects:
 *   • Done  → /(tabs)/nexushome
 *   • Not done → /(tabs)/onboarding  (the new onboarding TAB)
 *
 * Onboarding is now a regular tab inside (tabs), so users always land
 * inside the main app shell with the tab bar visible.
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
        const done = v === 'true' || v === '1';
        setTarget(done ? '/(tabs)/nexushome' : '/(tabs)/onboarding');
      } catch {
        setTarget('/(tabs)/onboarding');
      }
    })();
  }, []);

  if (target === null) return <View style={{ flex: 1, backgroundColor: '#050505' }} />;
  return <Redirect href={target as any} />;
}
