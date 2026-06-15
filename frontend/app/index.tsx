/**
 * Bootstrap route — `/`
 *
 * SIMPLIFIED: Direct redirect to /(tabs)/nexushome. NO onboarding gate,
 * NO AsyncStorage check, NO inline overlay. The onboarding is now a
 * separate tab in the tab bar that users can open whenever they want.
 *
 * Why: Repeated APK builds had cold-start failures where the inline
 * onboarding wouldn't hand off to the home tab. Sidestepping the gate
 * entirely eliminates that whole failure mode — the app simply boots
 * straight into the homepage, the exact same path returning users
 * already hit (which has always worked).
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href={'/(tabs)/nexushome' as any} />;
}
