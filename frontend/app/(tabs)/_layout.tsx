import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import QuickButlerBar from '@/components/ui/QuickButlerBar';
import FuturisticTabBar from '@/components/ui/FuturisticTabBar';

type MCName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type MIName = React.ComponentProps<typeof MaterialIcons>['name'];

const mc = (name: MCName) => (color: string, size: number) =>
  <MaterialCommunityIcons name={name} color={color} size={size} />;
const mi = (name: MIName) => (color: string, size: number) =>
  <MaterialIcons name={name} color={color} size={size} />;

// Map route name → icon renderer. Order doesn't matter; the Tabs definitions
// below decide the on-screen ordering.
const ICONS: Record<string, (color: string, size: number) => React.ReactNode> = {
  nexushome:  mc('home-lightning-bolt'),
  scripts:    mc('script-text-outline'),
  butler:     mc('robot-happy-outline'),
  knowledge:  mc('brain'),
  terminal:   mc('console-line'),
  logs:       mc('monitor-dashboard'),
  builder:    mc('hammer-wrench'),
  skins:      mc('palette-swatch'),
  settings:   mc('cog-outline'),
};

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <FuturisticTabBar {...props} iconMap={ICONS} />}
      >
        <Tabs.Screen name="nexushome" options={{ title: 'HOME'    }} />
        <Tabs.Screen name="scripts"   options={{ title: 'SCRIPTS' }} />
        <Tabs.Screen name="butler"    options={{ title: 'AI'      }} />
        <Tabs.Screen name="knowledge" options={{ title: 'KB'      }} />
        <Tabs.Screen name="terminal"  options={{ title: 'TOOLS'   }} />
        <Tabs.Screen name="logs"      options={{ title: 'PC'      }} />
        <Tabs.Screen name="builder"   options={{ title: 'BUILD'   }} />
        <Tabs.Screen name="skins"     options={{ title: 'SKINS'   }} />
        <Tabs.Screen name="settings"  options={{ title: 'CONFIG'  }} />

        {/* Hidden routes — accessible via navigation but not shown in the bar */}
        <Tabs.Screen name="index"     options={{ href: null }} />
        <Tabs.Screen name="fileshare" options={{ href: null }} />
        <Tabs.Screen name="support"   options={{ href: null }} />
      </Tabs>
      {/* Persistent Ask-Butler composer floating above the tab bar */}
      <QuickButlerBar />
    </View>
  );
}
