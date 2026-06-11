import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

const CYAN = '#00E5FF';
const DIM = 'rgba(0,229,255,0.55)';
const BG = '#060D12';
const BORDER = 'rgba(0,229,255,0.12)';

type MCIcon = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type MIIcon = React.ComponentProps<typeof MaterialIcons>['name'];

function TabIcon({
  lib,
  name,
  color,
  size,
}: {
  lib: 'community' | 'material';
  name: string;
  color: string;
  size: number;
}) {
  if (lib === 'community') {
    return <MaterialCommunityIcons name={name as MCIcon} color={color} size={size} />;
  }
  return <MaterialIcons name={name as MIIcon} color={color} size={size} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: CYAN,
        tabBarInactiveTintColor: DIM,
        tabBarStyle: {
          backgroundColor: BG,
          borderTopColor: BORDER,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.4,
        },
      }}
    >
      <Tabs.Screen
        name="nexushome"
        options={{
          title: 'HOME',
          tabBarIcon: ({ color, size }) => (
            <TabIcon lib="community" name="home-lightning-bolt" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="scripts"
        options={{
          title: 'SCRIPTS',
          tabBarIcon: ({ color, size }) => (
            <TabIcon lib="community" name="script-text-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="butler"
        options={{
          title: 'BUTLER',
          tabBarIcon: ({ color, size }) => (
            <TabIcon lib="community" name="robot-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="terminal"
        options={{
          title: 'TERMINAL',
          tabBarIcon: ({ color, size }) => (
            <TabIcon lib="material" name="terminal" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="knowledge"
        options={{
          title: 'KB',
          tabBarIcon: ({ color, size }) => (
            <TabIcon lib="community" name="brain" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'SETTINGS',
          tabBarIcon: ({ color, size }) => (
            <TabIcon lib="community" name="cog-outline" color={color} size={size} />
          ),
        }}
      />
      {/* Hidden tabs — accessible via navigation but not shown in the tab bar */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="builder" options={{ href: null }} />
      <Tabs.Screen name="fileshare" options={{ href: null }} />
      <Tabs.Screen name="logs" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
    </Tabs>
  );
}
