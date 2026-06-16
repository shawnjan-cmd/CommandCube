/**
 * Butler AI — Root Boot Route  (`/`)
 * ──────────────────────────────────────────────────────────────────
 * v3 — "STRAIGHT TO HOMEPAGE" (post-blue-screen)
 *
 * Per user request after 20+ blue-screen reports, this route now
 * skips ALL conditional gating and lands the user on the home tab
 * immediately. The onboarding intro remains available via the
 * "INTRO" tab in the bottom toolbar for users who want it.
 *
 *   ✗ NO async checks, NO useEffect, NO conditional renders
 *   ✓ Single instant <Redirect /> to /(tabs)/nexushome
 *
 * If the user has never seen onboarding, they can tap INTRO in
 * the tab bar at any time. This removes the entire "blue screen"
 * surface area: no overlay, no watchdog trigger, no splash race.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function Index() {
  // ALWAYS go to home. The onboarding tab remains reachable manually.
  return <Redirect href={'/(tabs)/nexushome' as any} />;
}
