import { Tabs } from 'expo-router';
import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import QuickButlerBar from '@/components/ui/QuickButlerBar';
import FuturisticTabBar from '@/components/ui/FuturisticTabBar';
import ConnectionBadge from '@/components/ui/ConnectionBadge';

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
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // ── Terminator-themed centered header config ─────────────────────────────
  // Shown on every tab EXCEPT the home tab (`nexushome`), per per-screen
  // override below. Endo-red bottom border, monospace caps title.
  const HEADER_OPTS = {
    headerShown: true as const,
    headerTitleAlign: 'center' as const,
    headerStyle: {
      backgroundColor: '#0B0F14',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#FF2A1F33',
      elevation: 0,
      shadowOpacity: 0,
      height: Platform.OS === 'ios' ? 52 : 56,
    },
    headerTintColor: '#FF2A1F',
    headerTitleStyle: {
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      fontSize: 14,
      fontWeight: '900' as const,
      letterSpacing: 3,
      color: '#E8EEF5',
    },
    headerShadowVisible: false,
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#040608' }}>
      <Tabs
        screenOptions={HEADER_OPTS}
        tabBar={(props) => <FuturisticTabBar {...props} iconMap={ICONS} />}
      >
        <Tabs.Screen name="nexushome" options={{ title: 'HOME',          tabBarLabel: 'HOME',    headerShown: false }} />
        <Tabs.Screen name="scripts"   options={{ title: '> SCRIPTS',     tabBarLabel: 'SCRIPTS' }} />
        <Tabs.Screen name="butler"    options={{ title: '> AI TERMINAL', tabBarLabel: 'AI'      }} />
        <Tabs.Screen name="knowledge" options={{ title: '> KNOWLEDGE',   tabBarLabel: 'KB'      }} />
        <Tabs.Screen name="logs"      options={{ title: '> PC TELEMETRY',tabBarLabel: 'PC'      }} />
        <Tabs.Screen name="builder"   options={{ title: '> BUILDER',     tabBarLabel: 'BUILD'   }} />
        <Tabs.Screen name="skins"     options={{ title: '> SKINS',       tabBarLabel: 'SKINS'   }} />
        <Tabs.Screen name="settings"  options={{ title: '> CONFIG',      tabBarLabel: 'CONFIG'  }} />

        {/* Hidden routes — accessible via navigation but not shown in the bar */}
        <Tabs.Screen name="terminal"  options={{ href: null, title: '> TERMINAL'   }} />
        <Tabs.Screen name="index"     options={{ href: null, headerShown: false    }} />
        <Tabs.Screen name="fileshare" options={{ href: null, title: '> FILE SHARE' }} />
        <Tabs.Screen name="support"   options={{ href: null, title: '> SUPPORT'    }} />
      </Tabs>

      {/* Global persistent connection status — visible on every tab.
          Floats at the top-right edge of the screen, respecting safe area.
          Tappable so users can manually retry the LAN handshake. */}
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

      {/* Persistent Ask-Butler composer floating above the tab bar */}
      <QuickButlerBar />
    </View>
  );
}
