/**
 * Tabs Group Index — `/(tabs)/`
 * ───────────────────────────────────────────────────────────────
 * REQUIRED ENTRY POINT for the `(tabs)` route group on native.
 *
 * Why this file exists (root cause of 20+ EAS blue-screen builds):
 *   • Expo Router on native Android strictly requires an `index`
 *     route inside every group directory. Without it, the tabs
 *     navigator silently fails to mount during cold start — the
 *     root <View> never renders → onLayout never fires →
 *     SplashScreen.hideAsync() is never called → the splash
 *     background color (#050A12) persists forever.
 *   • Web is more forgiving and works without this file, which is
 *     why our preview environment never caught this.
 *
 * Behavior:
 *   • This route is hidden from the tab bar (`href: null` in
 *     `_layout.tsx`).
 *   • When something resolves to `/(tabs)` with no specific child,
 *     this index emits a `<Redirect>` to `nexushome` (the home
 *     dashboard) — a synchronous, atomic redirect.
 *   • App cold-start flows: `/` → `/(tabs)/nexushome` (handled by
 *     `app/index.tsx`); this file only catches fallback cases where
 *     a child isn't specified. Onboarding is NOT in the auto-flow —
 *     it's a manually-tapable INTRO tab in the toolbar.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function TabsIndex() {
  return <Redirect href={'/(tabs)/nexushome' as any} />;
}
