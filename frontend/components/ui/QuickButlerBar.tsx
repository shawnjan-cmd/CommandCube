/**
 * QuickButlerBar — Persistent floating "Ask Butler…" composer that sits
 * just above the bottom tab bar on every screen.
 *
 *  • Visuals: elegant glass-morphism pill with a gradient cyan border,
 *    BlurView surface, layered 3D shadow stack, and a focus-aware ambient
 *    glow that activates only when the user is composing a prompt.
 *  • Send button morphs idle → ready (scale + color) with haptic feedback.
 *  • Pressing send writes the prompt to AsyncStorage (@butler_prefill_prompt)
 *    and navigates to the AI tab so the chat picks it up.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Platform,
  Keyboard, Animated, Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { haptics } from '@/services/haptics';

export const BUTLER_PREFILL_KEY = '@butler_prefill_prompt';

const BAR_H = 44;

const CYAN     = '#3EC8FF';
const CYAN_HI  = '#7FE3FF';
const CYAN_DIM = 'rgba(62,200,255,0.35)';
const INK      = '#04101C';
const TEXT     = '#E6F8FF';

const safeHaptics = {
  light:  () => { try { haptics.light();  } catch {} },
  medium: () => { try { haptics.medium(); } catch {} },
};

export default function QuickButlerBar() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const focusAnim = useRef(new Animated.Value(0)).current;
  const ambient   = useRef(new Animated.Value(0)).current;
  const sendScale = useRef(new Animated.Value(1)).current;

  // Ambient breathing loop — very subtle when idle.
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(ambient, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(ambient, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [ambient]);

  // Focus glow — pops in when user starts composing.
  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: focused || text.length > 0 ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [focused, text.length, focusAnim]);

  const handleSend = async () => {
    const prompt = text.trim();
    safeHaptics.medium();

    Animated.sequence([
      Animated.spring(sendScale, { toValue: 0.86, useNativeDriver: true, speed: 36, bounciness: 0 }),
      Animated.spring(sendScale, { toValue: 1, useNativeDriver: true, speed: 26, bounciness: 8 }),
    ]).start();

    if (prompt.length > 0) {
      try { await AsyncStorage.setItem(BUTLER_PREFILL_KEY, prompt); } catch {}
      setText('');
      Keyboard.dismiss();
    }
    try { router.push('/(tabs)/butler' as any); } catch {}
  };

  const ready = text.trim().length > 0;

  const ambientOpacity = ambient.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.34] });
  const focusOpacity   = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const focusScale     = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.015] });

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Animated.View style={[styles.pillOuter, { transform: [{ scale: focusScale }] }]}>
        {/* Layered 3D depth plate */}
        <View pointerEvents="none" style={styles.depthPlate} />

        {/* Ambient idle halo */}
        <Animated.View pointerEvents="none" style={[styles.ambientHalo, { opacity: ambientOpacity }]} />

        {/* Focused/active neon glow */}
        <Animated.View pointerEvents="none" style={[styles.focusHalo, { opacity: focusOpacity }]} />

        {/* Gradient border via two stacked gradients (outer + inner mask) */}
        <LinearGradient
          colors={['#7FE3FF', '#3EC8FF', '#1E6B9C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.borderGrad}
        >
          {/* Glass surface */}
          <View style={styles.surfaceWrap}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 40 : 22}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            {/* Inner sheen / depth fill so blur reads even when unsupported */}
            <LinearGradient
              colors={['rgba(8,20,38,0.92)', 'rgba(3,8,16,0.96)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Top highlight (3D rim light) */}
            <View pointerEvents="none" style={styles.rimLight} />

            {/* Content row */}
            <View style={styles.row}>
              <View style={styles.avatarDot}>
                <MaterialCommunityIcons name="robot-outline" size={14} color={CYAN_HI} />
              </View>

              <TextInput
                ref={inputRef}
                testID="quickbar-input"
                value={text}
                onChangeText={setText}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Ask Butler…"
                placeholderTextColor="rgba(127,227,255,0.55)"
                style={styles.input}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                maxLength={500}
                underlineColorAndroid="transparent"
                selectionColor={CYAN}
              />

              <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                <TouchableOpacity
                  testID="quickbar-send"
                  activeOpacity={0.8}
                  onPress={handleSend}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.sendShell}
                >
                  <LinearGradient
                    colors={ready ? ['#7FE3FF', '#3EC8FF'] : ['rgba(62,200,255,0.10)', 'rgba(62,200,255,0.04)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.sendBtn,
                      ready ? styles.sendBtnActive : styles.sendBtnIdle,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={ready ? 'send' : 'arrow-up'}
                      size={15}
                      color={ready ? INK : CYAN}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 96 : 82,
    zIndex: 50,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pillOuter: {
    width: '92%',
    maxWidth: 420,
    height: BAR_H,
    position: 'relative',
  },
  /* Soft drop shadow plate behind the pill — gives lift / 3D feel */
  depthPlate: {
    position: 'absolute',
    left: 6, right: 6, top: 4, bottom: -4,
    borderRadius: BAR_H / 2,
    backgroundColor: '#000',
    opacity: 0.55,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.55, shadowRadius: 14 }
      : { elevation: 16 }),
  },
  ambientHalo: {
    position: 'absolute',
    left: -10, right: -10, top: -6, bottom: -6,
    borderRadius: (BAR_H + 12) / 2,
    backgroundColor: CYAN,
    transform: [{ scale: 1.0 }],
    opacity: 0.18,
    ...(Platform.OS === 'ios'
      ? { shadowColor: CYAN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 18 }
      : {}),
  },
  focusHalo: {
    position: 'absolute',
    left: -3, right: -3, top: -3, bottom: -3,
    borderRadius: (BAR_H + 6) / 2,
    borderWidth: 1,
    borderColor: CYAN_HI,
    ...(Platform.OS === 'ios'
      ? { shadowColor: CYAN_HI, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 12 }
      : {}),
  },
  borderGrad: {
    flex: 1,
    borderRadius: BAR_H / 2,
    padding: 1.2,
  },
  surfaceWrap: {
    flex: 1,
    borderRadius: BAR_H / 2 - 1,
    overflow: 'hidden',
    backgroundColor: '#050B14',
  },
  rimLight: {
    position: 'absolute',
    left: 14, right: 14, top: 0.5,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 1,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 8,
  },
  avatarDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(62,200,255,0.12)',
    borderWidth: 1,
    borderColor: CYAN_DIM,
  },
  input: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 0,
    paddingHorizontal: 2,
    letterSpacing: 0.2,
  },
  sendShell: {
    width: 32, height: 32, borderRadius: 16,
  },
  sendBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  sendBtnActive: {
    borderColor: CYAN_HI,
    ...(Platform.OS === 'ios'
      ? { shadowColor: CYAN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8 }
      : { elevation: 8 }),
  },
  sendBtnIdle: {
    borderColor: 'rgba(62,200,255,0.45)',
  },
});
