/**
 * FuturisticTabBar — Custom bottom tab bar.
 *
 *  • Floating glass "command deck" — BlurView surface, dual gradient border,
 *    soft drop shadow gives true 3D lift off the screen background.
 *  • Active tab is highlighted by a sliding neon pill that smoothly morphs
 *    between positions (Animated.spring on width + left).
 *  • Icons are clean monochrome — focus state pops via color + scale, labels
 *    only render for the active tab to reduce visual clutter.
 *  • Haptic feedback on every tap.
 *  • Same prop contract React Navigation expects from a custom tabBar.
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Easing,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { haptics } from '@/services/haptics';

const CYAN     = '#3EC8FF';
const CYAN_HI  = '#7FE3FF';
const CYAN_DIM = 'rgba(62,200,255,0.55)';
const INACTIVE = 'rgba(150,190,220,0.55)';

const BAR_HEIGHT = 64;
const PILL_INSET = 4;

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
  const scale = useRef(new Animated.Value(isFocused ? 1.05 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isFocused ? 1.08 : 1,
      useNativeDriver: true,
      speed: 22,
      bounciness: 9,
    }).start();
  }, [isFocused, scale]);

  const iconColor = isFocused ? CYAN_HI : INACTIVE;

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
          {iconRender(iconColor, 22)}
        </View>
        {isFocused && (
          <Text
            numberOfLines={1}
            style={styles.activeLabel}
          >
            {label}
          </Text>
        )}
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

  // Pre-filter visible routes so the indicator pill aligns to the visible set.
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

  // Layout tracking for the sliding pill.
  const [layouts, setLayouts] = useState<Record<string, { x: number; w: number }>>({});
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;
  const ambient = useRef(new Animated.Value(0)).current;

  // Active visible index (within the visible array).
  const activeVisibleIdx = visibleRoutes.findIndex(r => r.idx === state.index);

  useEffect(() => {
    if (activeVisibleIdx < 0) return;
    const activeRoute = visibleRoutes[activeVisibleIdx].route;
    const lay = layouts[activeRoute.key];
    if (!lay) return;
    Animated.parallel([
      Animated.spring(pillX, { toValue: lay.x + PILL_INSET, useNativeDriver: false, speed: 18, bounciness: 6 }),
      Animated.spring(pillW, { toValue: Math.max(0, lay.w - PILL_INSET * 2), useNativeDriver: false, speed: 18, bounciness: 6 }),
    ]).start();
  }, [activeVisibleIdx, layouts, pillX, pillW, visibleRoutes]);

  // Ambient breathing for the pill glow.
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(ambient, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(ambient, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [ambient]);

  const ambientOp = ambient.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.95] });

  const bottomPad = insets.bottom > 0 ? insets.bottom : 10;
  const sidePad = 12;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outerWrap, { paddingBottom: bottomPad, paddingHorizontal: sidePad }]}
    >
      {/* Soft 3D drop shadow plate */}
      <View pointerEvents="none" style={styles.shadowPlate} />

      {/* Gradient border ring */}
      <LinearGradient
        colors={['rgba(127,227,255,0.55)', 'rgba(62,200,255,0.18)', 'rgba(30,107,156,0.55)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.borderRing}
      >
        {/* Glass surface */}
        <View style={styles.surface}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 50 : 28}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          {/* Dark fill so it reads even when blur not supported */}
          <LinearGradient
            colors={['rgba(7,16,28,0.92)', 'rgba(3,8,16,0.96)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Top rim highlight */}
          <View pointerEvents="none" style={styles.rimLight} />

          {/* Sliding active pill */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activePill,
              {
                left: pillX,
                width: pillW,
                opacity: ambientOp as any,
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(62,200,255,0.28)', 'rgba(62,200,255,0.10)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activePillBorder,
              {
                left: pillX,
                width: pillW,
              },
            ]}
          />

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
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingTop: 6,
  },
  shadowPlate: {
    position: 'absolute',
    left: 18, right: 18, bottom: 6, top: 14,
    borderRadius: 24,
    backgroundColor: '#000',
    opacity: 0.6,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.6, shadowRadius: 18 }
      : { elevation: 18 }),
  },
  borderRing: {
    borderRadius: 24,
    padding: 1.2,
  },
  surface: {
    height: BAR_HEIGHT,
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: '#050B14',
  },
  rimLight: {
    position: 'absolute',
    left: 28, right: 28, top: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 1,
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
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 2,
    minHeight: 50,
  },
  iconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  activeLabel: {
    fontSize: 9.5,
    marginTop: 3,
    color: CYAN_HI,
    fontWeight: '800',
    letterSpacing: 1.1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  activePill: {
    position: 'absolute',
    top: 6, bottom: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  activePillBorder: {
    position: 'absolute',
    top: 6, bottom: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CYAN_DIM,
    ...(Platform.OS === 'ios'
      ? { shadowColor: CYAN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 8 }
      : {}),
  },
});
