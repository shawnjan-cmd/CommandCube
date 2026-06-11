import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import QuickButlerBar from '@/components/ui/QuickButlerBar';

const CYAN   = '#00E5FF';
const DIM    = 'rgba(0,229,255,0.50)';
const BG     = '#060D12';
const BORDER = 'rgba(0,229,255,0.14)';

type MCIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type MIIcon = React.ComponentProps<typeof MaterialIcons>['name'];

function TabIcon({
  lib, name, color, size,
}: { lib: 'community' | 'material'; name: string; color: string; size: number }) {
  return lib === 'community'
    ? <MaterialCommunityIcons name={name as MCIcon} color={color} size={size} />
    : <MaterialIcons          name={name as MIIcon} color={color} size={size} />;
}

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: CYAN,
        tabBarInactiveTintColor: DIM,
        tabBarScrollEnabled: false,
        tabBarStyle: {
          backgroundColor: BG,
          borderTopColor: BORDER,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 86 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 6,
          paddingHorizontal: 2,
        },
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '800',
          letterSpacing: 0.3,
          marginTop: 1,
        },
        tabBarIconStyle: { marginBottom: -2 },
      }}
    >
      {/* 1 HOME */}
      <Tabs.Screen name="nexushome"
        options={{ title: 'HOME',    tabBarIcon: ({ color, size }) => <TabIcon lib="community" name="home-lightning-bolt" color={color} size={size - 2} /> }} />
      {/* 2 SCRIPTS */}
      <Tabs.Screen name="scripts"
        options={{ title: 'SCRIPTS', tabBarIcon: ({ color, size }) => <TabIcon lib="community" name="code-tags"          color={color} size={size - 2} /> }} />
      {/* 3 AI (Butler chat) */}
      <Tabs.Screen name="butler"
        options={{ title: 'AI',      tabBarIcon: ({ color, size }) => <TabIcon lib="community" name="robot-happy"        color={color} size={size - 2} /> }} />
      {/* 4 KB */}
      <Tabs.Screen name="knowledge"
        options={{ title: 'KB',      tabBarIcon: ({ color, size }) => <TabIcon lib="community" name="brain"              color={color} size={size - 2} /> }} />
      {/* 5 TOOLS (terminal repurposed) */}
      <Tabs.Screen name="terminal"
        options={{ title: 'TOOLS',   tabBarIcon: ({ color, size }) => <TabIcon lib="community" name="tools"              color={color} size={size - 2} /> }} />
      {/* 6 PC (logs / health) */}
      <Tabs.Screen name="logs"
        options={{ title: 'PC',      tabBarIcon: ({ color, size }) => <TabIcon lib="community" name="monitor-dashboard"  color={color} size={size - 2} /> }} />
      {/* 7 BUILD (script builder) */}
      <Tabs.Screen name="builder"
        options={{ title: 'BUILD',   tabBarIcon: ({ color, size }) => <TabIcon lib="community" name="hammer-wrench"      color={color} size={size - 2} /> }} />
      {/* 8 SKINS (cosmetics) */}
      <Tabs.Screen name="skins"
        options={{ title: 'SKINS',   tabBarIcon: ({ color, size }) => <TabIcon lib="community" name="palette"            color={color} size={size - 2} /> }} />
      {/* 9 CONFIG (settings) */}
      <Tabs.Screen name="settings"
        options={{ title: 'CONFIG',  tabBarIcon: ({ color, size }) => <TabIcon lib="community" name="cog-outline"        color={color} size={size - 2} /> }} />

      {/* Hidden routes — accessible via navigation but not shown in the tab bar */}
      <Tabs.Screen name="index"     options={{ href: null }} />
      <Tabs.Screen name="fileshare" options={{ href: null }} />
      <Tabs.Screen name="support"   options={{ href: null }} />
    </Tabs>
  );
}
<QuickButlerBar />
    </View>
  );
}
