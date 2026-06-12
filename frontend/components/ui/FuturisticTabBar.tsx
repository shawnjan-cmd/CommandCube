/**
 * FuturisticTabBar — TERMINATOR TERMINAL command dock.
 *
 *  • Solid gunmetal deck, squared corners, steel border, endo-red signal line.
 *  • Active tab marked by a sliding "target lock" frame (red top bar + faint
 *    red fill) that springs between positions.
 *  • ALL labels always visible (8px mono, uppercase) — professional terminal
 *    readability, never icon-only guessing.
 *  • Haptic feedback on every tap. Same prop contract React Navigation
 *    expects from a custom tabBar.
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { haptics } from '@/services/haptics';

const RED      = '#FF2A1F';
const RED_HI   = '#FF6A52';
const STEEL    = '#3C424D';
const STEEL_HI = '#697283';
const INACTIVE = '#6A7384';
const DECK     = '#0A0B0E';
const DECK_HI  = '#15171C';
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const BAR_HEIGHT = 62;
const PILL_INSET = 3;

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

function TabButton({
  isFocused,
  label,
  onPress,
  iconRender,
  testID,
  onLayout,
}: {
  isFocused: boolean;
  label: string;
  onPress: () => void;
  iconRender: (color: string, size: number) => React.ReactNode;
  testID?: string;
  onLayout: (e: any) => void;
}) {
  const scale = useRef(new Animated.Value(isFocused ? 1.04 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isFocused ? 1.06 : 1,
      useNativeDriver: true,
      speed: 22,
      bounciness: 8,
    }).start();
  }, [isFocused, scale]);

  const iconColor = isFocused ? RED : INACTIVE;

  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.7}
      onPress={() => { haptics.light(); onPress(); }}
      style={styles.tabBtn}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        <View style={styles.iconWrap}>
          {iconRender(iconColor, 20)}
        </View>
        <Text
          numberOfLines={1}
          style={[styles.label, isFocused ? styles.labelActive : null]}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function FuturisticTabBar(
  props: BottomTabBarProps & {
    iconMap?: Record<string, (color: string, size: number) => React.ReactNode>;
  },
) {
  const { state, descriptors, navigation, iconMap = {} } = props;
  const insets = useSafeAreaInsets();

  // Global tab switcher — used by Quick Access tiles, settings shortcuts, etc.
  useEffect(() => {
    (global as any).__butlerSwitchTab = (tab: string) => {
      const route = TAB_ALIASES[String(tab || '').toLowerCase()] || tab;
      try { navigation.navigate(route as never); } catch {}
    };
    return () => { delete (global as any).__butlerSwitchTab; };
  }, [navigation]);

  // Pre-filter visible routes so the indicator aligns to the visible set.
  const visibleRoutes = useMemo(() => {
    return state.routes
      .map((route, idx) => ({ route, idx }))
      .filter(({ route }) => {
        const opts = descriptors[route.key].options as any;
        const iconRender = iconMap[route.name];
        const hideStyle = opts?.tabBarItemStyle?.display === 'none';
        if (!iconRender || opts?.tabBarButton === null || opts?.href === null || hideStyle) return false;
        return true;
      });
  }, [state.routes, descriptors, iconMap]);

  // Layout tracking for the sliding target-lock frame.
  const [layouts, setLayouts] = useState<Record<string, { x: number; w: number }>>({});
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;
  const ambient = useRef(new Animated.Value(0)).current;

  const activeVisibleIdx = visibleRoutes.findIndex(r => r.idx === state.index);

  useEffect(() => {
    if (activeVisibleIdx < 0) return;
    const activeRoute = visibleRoutes[activeVisibleIdx].route;
    const lay = layouts[activeRoute.key];
    if (!lay) return;
    Animated.parallel([
      Animated.spring(pillX, { toValue: lay.x + PILL_INSET, useNativeDriver: false, speed: 18, bounciness: 5 }),
      Animated.spring(pillW, { toValue: Math.max(0, lay.w - PILL_INSET * 2), useNativeDriver: false, speed: 18, bounciness: 5 }),
    ]).start();
  }, [activeVisibleIdx, layouts, pillX, pillW, visibleRoutes]);

  // Ambient breathing for the target-lock glow (Terminator eye pulse).
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(ambient, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(ambient, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [ambient]);

  const ambientOp = ambient.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  const bottomPad = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outerWrap, { paddingBottom: bottomPad }]}
    >
      {/* Drop shadow plate */}
      <View pointerEvents="none" style={styles.shadowPlate} />

      <View style={styles.deck}>
        {/* Red signal line across the top edge */}
        <View pointerEvents="none" style={styles.signalLine} />
        {/* Steel rim highlight under the signal line */}
        <View pointerEvents="none" style={styles.rimLight} />

        {/* Sliding target-lock frame */}
        <Animated.View
          pointerEvents="none"
          style={[styles.lockFill, { left: pillX, width: pillW, opacity: ambientOp as any }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.lockFrame, { left: pillX, width: pillW }]}
        >
          <View style={styles.lockTopBar} />
        </Animated.View>

        {/* Tab buttons */}
        <View style={styles.row}>
          {visibleRoutes.map(({ route, idx }) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === idx;
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title ?? route.name;

            const iconRender = iconMap[route.name]!;

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
                onLayout={(e: any) => {
                  const { x, width } = e.nativeEvent.layout;
                  setLayouts(prev => {
                    const cur = prev[route.key];
                    if (cur && cur.x === x && cur.w === width) return prev;
                    return { ...prev, [route.key]: { x, w: width } };
                  });
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingTop: 4,
    paddingHorizontal: 8,
  },
  shadowPlate: {
    position: 'absolute',
    left: 14, right: 14, bottom: 4, top: 10,
    borderRadius: 12,
    backgroundColor: '#000',
    opacity: 0.6,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 14 }
      : { elevation: 16 }),
  },
  deck: {
    height: BAR_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: DECK,
    borderWidth: 1,
    borderColor: STEEL,
  },
  signalLine: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    height: 2,
    backgroundColor: RED,
    opacity: 0.85,
    zIndex: 3,
  },
  rimLight: {
    position: 'absolute',
    left: 0, right: 0, top: 2,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    zIndex: 3,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 2,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 2,
    gap: 3,
    minHeight: 48,
  },
  iconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  label: {
    fontSize: 8,
    color: INACTIVE,
    fontWeight: '800',
    letterSpacing: 0.8,
    fontFamily: MONO,
    textAlign: 'center',
  },
  labelActive: {
    color: RED_HI,
    fontWeight: '900',
  },
  lockFill: {
    position: 'absolute',
    top: 3, bottom: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,42,31,0.10)',
  },
  lockFrame: {
    position: 'absolute',
    top: 3, bottom: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,42,31,0.45)',
    overflow: 'hidden',
    ...(Platform.OS === 'ios'
      ? { shadowColor: RED, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 7 }
      : {}),
  },
  lockTopBar: {
    position: 'absolute',
    left: 8, right: 8, top: 0,
    height: 2,
    backgroundColor: RED,
    borderRadius: 1,
  },
});
