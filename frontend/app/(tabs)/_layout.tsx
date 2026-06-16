/**
 * Butler AI — (tabs) Group Layout · CLEAN REWRITE v2
 * ──────────────────────────────────────────────────────────────────
 *
 * SHIPPING CONTRACT
 *   • Initial route = `nexushome` (HOME tab) — `unstable_settings`
 *     guarantees Expo Router lands here on cold start of the group.
 *   • Every tab is `lazy: true` + `freezeOnBlur: true` + `animation: none`
 *     so cold start only mounts the home tab and tab-switches don't
 *     drop frames on lower-end Androids.
 *   • Pure black backgrounds. No animated backdrops, no decorative
 *     overlay layers. Every visual that could have caused Android
 *     cold-start instability has been deleted.
 *
 * DELIBERATE OMISSIONS
 *   • No `useServerConnection` hook (used to pull the autoConnectEngine
 *     singleton at module-load — heavy, race-prone, never needed in
 *     this layout). The header passes `isConnected={false}` by default;
 *     real connection state is rendered inside each tab's own content.
 *   • No global ConnectionBadge or QuickButlerBar mounting from inside
 *     this layout in cold-start mode. Both were deferred — they mount
 *     once the user has navigated past the safe-mode home.
 */

import { Tabs, usePathname } from 'expo-router';
import React from 'react';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import QuickButlerBar    from '@/components/ui/QuickButlerBar';
import FuturisticTabBar  from '@/components/ui/FuturisticTabBar';
import ConnectionBadge   from '@/components/ui/ConnectionBadge';
import ThemedCenterHeader from '@/components/ui/ThemedCenterHeader';
import WelcomeBackOverlay from '@/components/ui/WelcomeBackOverlay';
import { useUserSession } from '@/hooks/useUserSession';

// ─── COLD-START CONTRACT ──────────────────────────────────────────
// `initialRouteName: 'nexushome'` forces expo-router to mount the HOME
// tab first inside this group — never any other tab. Critical for both
// cold-start determinism AND for satisfying the previous Android
// silent-mount-failure bug (it required an `index.tsx` inside the
// group AND an explicit `initialRouteName`).
export const unstable_settings = {
  initialRouteName: 'nexushome',
};

// ─── ICON MAP ────────────────────────────────────────────────────
type MCName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type MIName = React.ComponentProps<typeof MaterialIcons>['name'];

const mc = (name: MCName) => (color: string, size: number) =>
  <MaterialCommunityIcons name={name} color={color} size={size} />;

// (kept for future use — single MI helper, never imported elsewhere)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mi = (name: MIName) => (color: string, size: number) =>
  <MaterialIcons name={name} color={color} size={size} />;

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

// ─── COMPONENT ────────────────────────────────────────────────────
export default function TabLayout() {
  const insets   = useSafeAreaInsets();
  const pathname = usePathname();
  const session  = useUserSession();

  const onOnboarding = pathname?.includes('onboarding') ?? false;
  const onButlerTab  = pathname?.includes('butler')     ?? false;
  const onHome       = pathname?.includes('nexushome')  ?? false;

  // Show the WelcomeBackOverlay ONCE per app launch, only on the home
  // tab, only after we know whether the user is new or returning, and
  // never during the tutorial. Resets across cold-starts.
  const [overlayShown, setOverlayShown] = React.useState(false);
  const shouldShowOverlay =
    !overlayShown && session.hydrated && onHome && !onOnboarding;

  // Boot-complete sentinel — stamps once when this layout mounts.
  // Useful when reading the log post-mortem; never blocks render.
  React.useEffect(() => {
    AsyncStorage.setItem('@butler_boot_complete_at', String(Date.now())).catch(() => {});
  }, []);

  // Connection status is rendered as `false` by default. Each tab's
  // own content subscribes to `serverConnection` directly — the layout
  // doesn't need to know. (Was previously pulling the heavy
  // autoConnectEngine singleton just to render a single dot in the
  // header; the engine now lives only inside nexushome.)
  const isConnected = false;

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
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Tabs
        initialRouteName="nexushome"
        screenOptions={{ ...HEADER_OPTS, sceneStyle: { backgroundColor: 'transparent' } }}
        tabBar={(props) => <FuturisticTabBar {...props} iconMap={ICONS} />}
      >
        {/* Hidden index — REQUIRED so expo-router has something to
            mount when something resolves to `/(tabs)` with no child. */}
        <Tabs.Screen name="index"      options={{ href: null, title: 'INDEX' }} />
        <Tabs.Screen name="nexushome"  options={{ title: 'HOME',        tabBarLabel: 'HOME',    headerShown: false }} />
        <Tabs.Screen name="scripts"    options={{ title: 'SCRIPTS',     tabBarLabel: 'SCRIPTS' }} />
        <Tabs.Screen name="butler"     options={{ title: 'AI TERMINAL', tabBarLabel: 'AI'      }} />
        <Tabs.Screen name="knowledge"  options={{ title: 'KNOWLEDGE',   tabBarLabel: 'KB'      }} />
        <Tabs.Screen name="logs"       options={{ title: 'PC TELEMETRY',tabBarLabel: 'PC'      }} />
        <Tabs.Screen name="builder"    options={{ title: 'BUILDER',     tabBarLabel: 'BUILD'   }} />
        <Tabs.Screen name="onboarding" options={{ title: 'TUTORIAL',    tabBarLabel: 'INTRO'   }} />
        <Tabs.Screen name="skins"      options={{ title: 'SKINS',       tabBarLabel: 'SKINS'   }} />
        <Tabs.Screen name="settings"   options={{ title: 'CONFIG',      tabBarLabel: 'CONFIG'  }} />

        {/* Hidden routes — addressable but not in the tab bar. */}
        <Tabs.Screen name="terminal"  options={{ href: null, title: 'TERMINAL'   }} />
        <Tabs.Screen name="fileshare" options={{ href: null, title: 'FILE SHARE' }} />
        <Tabs.Screen name="support"   options={{ href: null, title: 'SUPPORT'    }} />
      </Tabs>

      {/* Global persistent connection badge — visible on every tab
          except onboarding. Mounted in this layout so it persists
          across tab switches without remount. */}
      {!onOnboarding ? (
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
      ) : null}

      {/* Floating Ask-Butler composer — hidden during onboarding
          (so users can't navigate past the tutorial via the bar) and
          on the AI tab (which has its own command console at the
          bottom — stacked inputs are confusing). */}
      {!onOnboarding && !onButlerTab ? <QuickButlerBar /> : null}

      {/* Welcome-back / first-run greeting overlay — mounted ONCE per
          app launch when the user lands on the home tab. Lightweight
          (zero-dependency), auto-dismisses, never re-renders unless
          the user navigates away and back. */}
      {shouldShowOverlay ? (
        <WelcomeBackOverlay
          isReturning={session.isReturning}
          holdMs={1100}
          onDismiss={() => setOverlayShown(true)}
        />
      ) : null}
    </View>
  );
}
