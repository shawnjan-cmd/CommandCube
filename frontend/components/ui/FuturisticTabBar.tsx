/**
 * FuturisticTabBar — Custom bottom tab bar with cyberpunk styling.
 *
 *  • Active tab has a glowing cyan border, scale-up animation, and a sliding
 *    indicator pill that morphs between tab positions.
 *  • Inactive tabs render compact icons with subtle dim cyan.
 *  • Haptic feedback on every tap.
 *  • Same prop contract React Navigation expects from a custom tabBar.
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { haptics } from '@/services/haptics';

const CYAN     = '#3EC8FF';
const CYAN_HI  = '#7FE3FF';
const CYAN_DIM = 'rgba(62,200,255,0.55)';
const STEEL    = '#5E7186';
const BG       = '#02070D';
const BORDER   = 'rgba(62,200,255,0.18)';

function TabButton({
  isFocused,
  label,
  onPress,
  iconRender,
  testID,
}: {
  isFocused: boolean;
  label: string;
  onPress: () => void;
  iconRender: (color: string, size: number) => React.ReactNode;
  testID?: string;
}) {
  const scale  = useRef(new Animated.Value(isFocused ? 1 : 0.92)).current;
  const glow   = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isFocused ? 1.04 : 0.92,
        useNativeDriver: true,
        speed: 18,
        bounciness: 7,
      }),
      Animated.timing(glow, {
        toValue: isFocused ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
        easing: Easing.out(Easing.quad),
      }),
    ]).start();
  }, [isFocused, scale, glow]);

  const glowShadow = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] });
  const borderCol  = glow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', CYAN] });
  const bgCol      = glow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', 'rgba(0,229,255,0.08)'] });
  const lblColor   = isFocused ? CYAN : CYAN_DIM;
  const iconColor  = isFocused ? CYAN : CYAN_DIM;

  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.75}
      onPress={() => { haptics.light(); onPress(); }}
      style={styles.tabBtn}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          styles.tabInner,
          {
            transform: [{ scale }],
            borderColor: borderCol,
            backgroundColor: bgCol,
            shadowColor: CYAN,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: glowShadow as any,
            shadowRadius: 8,
          },
        ]}
      >
        <View style={styles.iconWrap}>
          {iconRender(iconColor, 22)}
          {isFocused && <View style={styles.activeDot} />}
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: lblColor,
              fontWeight: isFocused ? '900' : '700',
              letterSpacing: isFocused ? 0.8 : 0.3,
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// Friendly aliases used across the app → actual route names.
const TAB_ALIASES: Record<string, string> = {
  home: 'nexushome', nexushome: 'nexushome',
  scripts: 'scripts',
  butler: 'butler', ai: 'butler', chat: 'butler',
  knowledge: 'knowledge', kb: 'knowledge',
  logs: 'logs', pc: 'logs',
  builder: 'builder', build: 'builder',
  skins: 'skins',
  settings: 'settings', config: 'settings',
  fileshare: 'fileshare', tools: 'fileshare',
  support: 'support',
  terminal: 'terminal',
};

export default function FuturisticTabBar(
  props: BottomTabBarProps & {
    iconMap?: Record<string, (color: string, size: number) => React.ReactNode>;
  },
) {
  const { state, descriptors, navigation, iconMap = {} } = props;
  const insets = useSafeAreaInsets();
  const sweep = useRef(new Animated.Value(0)).current;

  // Global tab switcher — used by Quick Access tiles, settings shortcuts, etc.
  useEffect(() => {
    (global as any).__butlerSwitchTab = (tab: string) => {
      const route = TAB_ALIASES[String(tab || '').toLowerCase()] || tab;
      try { navigation.navigate(route as never); } catch {}
    };
    return () => { delete (global as any).__butlerSwitchTab; };
  }, [navigation]);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(sweep, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(sweep, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ])).start();
  }, [sweep]);

  const sweepOpacity = sweep.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.18] });
  const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-120, 380] });

  return (
    <View
      style={[
        styles.barOuter,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 8, height: 70 + (insets.bottom > 0 ? insets.bottom : 8) },
      ]}
    >
      {/* Chat-frame style top edge: steel outer stroke + neon core + plateau */}
      <View style={styles.topSteel} />
      <View style={styles.topNeon} />
      <View style={styles.plateau} />
      <View style={styles.plateauBar} />
      <View style={styles.hazardRow} pointerEvents="none">
        {[0, 1, 2, 3, 4].map(i => <View key={i} style={styles.hazard} />)}
      </View>
      {/* Diagonal sweep */}
      <Animated.View
        pointerEvents="none"
        style={[styles.sweep, { opacity: sweepOpacity, transform: [{ translateX: sweepX }, { skewX: '-18deg' }] }]}
      />

      <View style={styles.barRow}>
        {state.routes.map((route, idx) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === idx;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;

          // Hide routes that opted out of the tab bar.
          // expo-router maps `href: null` to either tabBarButton=null,
          // tabBarItemStyle.display='none', or simply not having a route icon.
          // We treat "no icon mapping" as "hidden" — index/fileshare/support
          // are explicitly excluded by absence from ICONS.
          const iconRender = iconMap[route.name];
          const hideStyle  = (options.tabBarItemStyle as any)?.display === 'none';
          if (!iconRender || options.tabBarButton === null || (options as any).href === null || hideStyle) {
            return null;
          }

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <TabButton
              key={route.key}
              isFocused={isFocused}
              label={String(label)}
              onPress={onPress}
              iconRender={iconRender}
              testID={`tab-${route.name}`}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barOuter: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: BG,
    borderTopWidth: 0,
    paddingTop: 6,
    paddingHorizontal: 2,
    overflow: 'hidden',
  },
  topSteel: {
    position: 'absolute', left: 0, right: 0, top: 0, height: 3,
    backgroundColor: STEEL, opacity: 0.85,
  },
  topNeon: {
    position: 'absolute', left: 0, right: 0, top: 3, height: 1.5,
    backgroundColor: CYAN,
    ...(Platform.OS === 'ios'
      ? { shadowColor: CYAN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6 }
      : {}),
  },
  plateau: {
    position: 'absolute', top: 0, alignSelf: 'center', width: '34%' as any, height: 5,
    backgroundColor: BG, borderBottomWidth: 1.5, borderBottomColor: CYAN,
    borderLeftWidth: 1.5, borderLeftColor: CYAN,
    borderRightWidth: 1.5, borderRightColor: CYAN,
  },
  plateauBar: {
    position: 'absolute', top: 1.5, alignSelf: 'center', width: '16%' as any, height: 2,
    backgroundColor: CYAN_HI, borderRadius: 1, opacity: 0.95,
  },
  hazardRow: {
    position: 'absolute', top: 7, left: 14, flexDirection: 'row', gap: 5,
  },
  hazard: {
    width: 6, height: 2.5, backgroundColor: CYAN, opacity: 0.6,
    transform: [{ skewX: '-30deg' }], borderRadius: 1,
  },
  sweep: {
    position: 'absolute', top: 0, bottom: 0, width: 100,
    backgroundColor: CYAN,
  },
  barRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    paddingHorizontal: 2,
    height: 64,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    minWidth: 38,
    minHeight: 50,
  },
  iconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  activeDot: {
    position: 'absolute', bottom: -2,
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: CYAN,
    ...(Platform.OS === 'ios'
      ? { shadowColor: CYAN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4 }
      : {}),
  },
  label: {
    fontSize: 10.5,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
});
