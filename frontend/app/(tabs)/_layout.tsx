import { Tabs, usePathname } from 'expo-router';
import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import QuickButlerBar from '@/components/ui/QuickButlerBar';
import FuturisticTabBar from '@/components/ui/FuturisticTabBar';
import ConnectionBadge from '@/components/ui/ConnectionBadge';
import ThemedCenterHeader from '@/components/ui/ThemedCenterHeader';
import { useServerConnection } from '@/hooks/useServerConnection';

// ── CRITICAL — Expo Router native-cold-start fix ─────────────────────────
// The hidden `index.tsx` route below MUST exist for expo-router on native
// Android to properly mount the (tabs) group on cold start. Without that
// file the navigator never mounts → splash never hides → blue screen.
//
// LANDING-PAGE CONTRACT (post-doom-loop, per explicit user request):
//   • `app/index.tsx` → ALWAYS redirects to `/(tabs)/nexushome`. No async.
//   • `(tabs)/index.tsx` (this group's hidden index) → same redirect.
//   • `nexushome.tsx` NO LONGER auto-redirects to INTRO on first launch.
//   • INTRO remains a manually-tapable tab in the bottom toolbar.
export const unstable_settings = {
  initialRouteName: 'nexushome',
};

type MCName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type MIName = React.ComponentProps<typeof MaterialIcons>['name'];

const mc = (name: MCName) => (color: string, size: number) =>
  <MaterialCommunityIcons name={name} color={color} size={size} />;
const mi = (name: MIName) => (color: string, size: number) =>
  <MaterialIcons name={name} color={color} size={size} />;

// Map route name → icon renderer. Order doesn't matter; the Tabs definitions
// below decide the on-screen ordering.
const ICONS: Record<string, (color: string, size: number) => React.ReactNode> = {
  nexushome:  mc('view-dashboard-variant'),
  scripts:    mc('code-braces-box'),
  butler:     mc('robot-happy'),
  knowledge:  mc('head-cog-outline'),
  logs:       mc('desktop-tower-monitor'),
  builder:    mc('hammer-screwdriver'),
  skins:      mc('palette-swatch-outline'),
  settings:   mc('cog-box'),
  onboarding: mc('school-outline'),
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isConnected } = useServerConnection();
  const pathname = usePathname();
  // Legacy flag — kept for harmless backward-compat with other components.
  // Onboarding is no longer a tab route (rendered inline by app/index.tsx),
  // so this will normally be false in production.
  const onOnboarding = pathname?.includes('onboarding') ?? false;
  // Hide the floating Ask-Butler composer on the Butler tab itself —
  // the tab already has a full-featured Command Console at the bottom,
  // and overlaying QuickButlerBar on top of it produces a confusing
  // double-input. Show it everywhere else.
  const onButlerTab = pathname?.includes('butler') ?? false;

  // ── Boot-complete sentinel ─────────────────────────────────────────────
  // The first time TabLayout mounts successfully, we stamp a diagnostic key
  // proving the whole startup chain (_layout → index gate → (tabs) layout)
  // is alive. Fire-and-forget — never blocks render, never throws.
  React.useEffect(() => {
    try {
      const AS = require('@react-native-async-storage/async-storage').default;
      AS?.setItem?.('@butler_boot_complete_at', String(Date.now())).catch(() => {});
    } catch {}
  }, []);

  // ── Themed centered header — applied to every tab except home ────────────
  // Uses our custom ThemedCenterHeader so titles are perfectly centered with
  // the homepage's gunmetal+endo-red treatment. Each Tab.Screen title is
  // automatically picked up from the `options.title` field.
  //
  // PERF flags applied to every tab:
  //   • freezeOnBlur — background tabs stop updating state/animations until
  //     they regain focus. Massive battery + frame-rate win on tab switches.
  //   • lazy — tabs aren't rendered until the user visits them the first time,
  //     so cold-start only mounts the home tab instead of all 8.
  //   • animation: none — eliminates the slide/cross-fade between tabs which
  //     was the single biggest cause of frame drops on lower-end Androids.
  const HEADER_OPTS = {
    headerShown: true as const,
    freezeOnBlur: true,
    lazy: true,
    animation: 'none' as const,
    header: ({ options }: any) => (
      <ThemedCenterHeader
        title={String(options?.title ?? '').replace(/^>\s*/, '')}
        isConnected={isConnected}
        showStatusPills
        version="v1.0"
      />
    ),
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {/* CyberneticBackdrop DELETED — was a suspected cold-start crash cause.
          The app gets a clean solid-black background under the tabs instead. */}
      <Tabs
        initialRouteName="nexushome"
        screenOptions={{ ...HEADER_OPTS, sceneStyle: { backgroundColor: 'transparent' } }}
        tabBar={(props) => <FuturisticTabBar {...props} iconMap={ICONS} />}
      >
        {/* Hidden index entry — REQUIRED for native cold-start.
            Never shown in the tab bar (href: null). When something resolves
            to `/(tabs)` with no specific child, this index.tsx kicks in and
            redirects to nexushome. */}
        <Tabs.Screen name="index"      options={{ href: null, title: 'INDEX' }} />
        <Tabs.Screen name="nexushome"  options={{ title: 'HOME',           tabBarLabel: 'HOME',    headerShown: false }} />
        <Tabs.Screen name="scripts"    options={{ title: 'SCRIPTS',        tabBarLabel: 'SCRIPTS' }} />
        <Tabs.Screen name="butler"     options={{ title: 'AI TERMINAL',    tabBarLabel: 'AI'      }} />
        <Tabs.Screen name="knowledge"  options={{ title: 'KNOWLEDGE',      tabBarLabel: 'KB'      }} />
        <Tabs.Screen name="logs"       options={{ title: 'PC TELEMETRY',   tabBarLabel: 'PC'      }} />
        <Tabs.Screen name="builder"    options={{ title: 'BUILDER',        tabBarLabel: 'BUILD'   }} />
        <Tabs.Screen name="onboarding" options={{ title: 'TUTORIAL',       tabBarLabel: 'INTRO'   }} />
        <Tabs.Screen name="skins"      options={{ title: 'SKINS',          tabBarLabel: 'SKINS'   }} />
        <Tabs.Screen name="settings"   options={{ title: 'CONFIG',         tabBarLabel: 'CONFIG'  }} />

        {/* Hidden routes — accessible via navigation but not shown in the bar */}
        <Tabs.Screen name="terminal"  options={{ href: null, title: 'TERMINAL'    }} />
        <Tabs.Screen name="fileshare" options={{ href: null, title: 'FILE SHARE'  }} />
        <Tabs.Screen name="support"   options={{ href: null, title: 'SUPPORT'     }} />
      </Tabs>

      {/* Global persistent connection status — visible on every tab EXCEPT
          onboarding. Floats at the top-right edge of the screen, respecting
          safe area. Tappable so users can manually retry the LAN handshake. */}
      {!onOnboarding && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: (insets.top || (Platform.OS === 'ios' ? 44 : 12)) + 6,
            right: 12,
            zIndex: 100,
          }}
        >
          <ConnectionBadge tappable />
        </View>
      )}

      {/* Persistent Ask-Butler composer floating above the tab bar.
          Hidden during onboarding so users can't bypass the flow by
          sending a prompt that navigates to the AI tab.
          Also hidden on the Butler tab itself since that tab has a
          full Command Console at the bottom and a stacked second
          input would just confuse users. */}
      {!onOnboarding && !onButlerTab && <QuickButlerBar />}
    </View>
  );
}
