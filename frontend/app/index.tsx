/**
 * Butler AI — Root Boot Route  (`/`)
 * ──────────────────────────────────────────────────────────────────
 * BULLETPROOF v2 — no placeholder, no async gate, instant redirect.
 *
 * After 20+ blue-screen reports we eliminated EVERY possible cause of
 * a non-redirecting first render:
 *
 *   ✗ NO async AsyncStorage read in this file (cold-start bridge
 *     warm-up can delay it on Android — that was the "blue screen").
 *   ✗ NO useEffect, useState, Promise.race, setTimeout, or any other
 *     timing that could leave the user staring at a placeholder View.
 *   ✗ NO conditional rendering — only a <Redirect>. Always.
 *
 *   ✓ ALWAYS redirects to /(tabs)/onboarding on the very first render.
 *     This is the SAME tab navigator that hosts the home tab, so once
 *     the user has finished (or skipped) onboarding, the LAUNCH button
 *     in Screen 10 simply switches tabs — no overlay handoff, no nav
 *     stack swap, no possibility of a "blue screen".
 *
 *   ✓ "Returning user" detection (skip onboarding for users who've
 *     already finished it) happens INSIDE the onboarding tab itself
 *     (`app/(tabs)/onboarding.tsx`) where it can safely check the flag
 *     AFTER the tab navigator is mounted. See that file for details.
 *
 * That architecture means even in the absolute worst case (storage
 * permanently broken, JS bridge stalled, etc.) the user lands on a
 * working screen — never on a blank/colored placeholder.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href={'/(tabs)/onboarding' as any} />;
}
