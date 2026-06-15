/**
 * QuickButlerBar — Persistent floating "ASK BUTLER_" terminal prompt that
 * sits just above the bottom tab bar on every screen.
 *
 *  • Visuals: TERMINATOR TERMINAL command line — squared gunmetal slab,
 *    steel border, endo-red prompt chevron, blinking cursor underscore in
 *    the placeholder, red glow when composing.
 *  • Send button morphs idle → armed (scale + solid red) with haptics.
 *  • Pressing send writes the prompt to AsyncStorage (@butler_prefill_prompt)
 *    and navigates to the AI tab so the chat picks it up.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Platform,
  Keyboard, Animated, Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { haptics } from '@/services/haptics';

export const BUTLER_PREFILL_KEY = '@butler_prefill_prompt';

const BAR_H = 64;

const RED      = '#FF2A1F';
const RED_HI   = '#FF6A52';
const STEEL    = '#3C424D';
const DECK     = '#0A0B0E';
const TEXT     = '#F4F6F9';
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

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
  const cursor    = useRef(new Animated.Value(1)).current;
  const sendScale = useRef(new Animated.Value(1)).current;

  // Blinking cursor block next to the prompt chevron (terminal idle pulse).
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(cursor, { toValue: 0, duration: 60, delay: 620, useNativeDriver: true }),
      Animated.timing(cursor, { toValue: 1, duration: 60, delay: 620, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [cursor]);

  // Focus glow — arms when the user starts composing.
  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: focused || text.length > 0 ? 1 : 0,
      duration: 220,
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

  const focusOpacity = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.slabOuter}>
        {/* Drop shadow plate */}
        <View pointerEvents="none" style={styles.depthPlate} />

        {/* Armed/composing red glow frame */}
        <Animated.View pointerEvents="none" style={[styles.focusFrame, { opacity: focusOpacity }]} />

        {/* Terminal slab */}
        <View style={styles.slab}>
          {/* Red signal edge */}
          <View pointerEvents="none" style={styles.signalEdge} />
          <View pointerEvents="none" style={styles.rimLight} />

          {/* Top matrix-style accent strip */}
          <View pointerEvents="none" style={styles.topAccentBar} />

          {/* HUD corner brackets — match the matrix card aesthetic */}
          <View pointerEvents="none" style={[styles.hudCorner, { top: 0,    left: 4,    borderTopWidth: 1.5,    borderLeftWidth: 1.5 }]} />
          <View pointerEvents="none" style={[styles.hudCorner, { top: 0,    right: 0,   borderTopWidth: 1.5,    borderRightWidth: 1.5 }]} />
          <View pointerEvents="none" style={[styles.hudCorner, { bottom: 0, left: 4,    borderBottomWidth: 1.5, borderLeftWidth: 1.5 }]} />
          <View pointerEvents="none" style={[styles.hudCorner, { bottom: 0, right: 0,   borderBottomWidth: 1.5, borderRightWidth: 1.5 }]} />

          <View style={styles.row}>
            {/* Robot badge + prompt chevron + blinking cursor */}
            <View style={styles.robotBadge}>
              <MaterialCommunityIcons name="robot-angry-outline" size={17} color={RED} />
              {/* Pulse dot indicator on top-right of badge */}
              <View pointerEvents="none" style={styles.armedDot} />
            </View>
            <View style={styles.promptBlock}>
              <Text style={styles.promptGlyph}>{'>'}</Text>
              {!focused && text.length === 0 ? (
                <Animated.View style={[styles.cursorBlock, { opacity: cursor }]} />
              ) : null}
            </View>

            <TextInput
              ref={inputRef}
              testID="quickbar-input"
              value={text}
              onChangeText={setText}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="ASK BUTLER"
              placeholderTextColor="rgba(255,106,82,0.45)"
              style={styles.input}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              maxLength={500}
              underlineColorAndroid="transparent"
              selectionColor={RED}
            />

            <Animated.View style={{ transform: [{ scale: sendScale }] }}>
              <TouchableOpacity
                testID="quickbar-send"
                activeOpacity={0.8}
                onPress={handleSend}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.sendBtn, ready ? styles.sendBtnArmed : styles.sendBtnIdle]}
              >
                <MaterialCommunityIcons
                  name={ready ? 'send' : 'chevron-right'}
                  size={16}
                  color={ready ? '#1F0500' : RED}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Bottom status line — matrix-style identifier */}
          <View pointerEvents="none" style={styles.bottomStatusRow}>
            <Text style={styles.bottomStatusTxt}>BUTLER · LOCAL LLM · LAN-ONLY</Text>
          </View>
        </View>
      </View>
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
    paddingHorizontal: 16,
  },
  slabOuter: {
    width: '96%',
    maxWidth: 440,
    height: BAR_H,
    position: 'relative',
  },
  depthPlate: {
    position: 'absolute',
    left: 4, right: 4, top: 4, bottom: -4,
    borderRadius: 10,
    backgroundColor: '#000',
    opacity: 0.55,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 12 }
      : { elevation: 14 }),
  },
  focusFrame: {
    position: 'absolute',
    left: -2, right: -2, top: -2, bottom: -2,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: RED_HI,
    ...(Platform.OS === 'ios'
      ? { shadowColor: RED, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 10 }
      : {}),
  },
  slab: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: DECK,
    borderWidth: 1,
    borderColor: STEEL,
  },
  signalEdge: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: RED,
    opacity: 0.9,
    zIndex: 2,
  },
  rimLight: {
    position: 'absolute',
    left: 4, right: 4, top: 0.5,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  hudCorner: {
    position: 'absolute',
    width: 9, height: 9,
    borderColor: RED_HI + 'CC',
  },
  topAccentBar: {
    position: 'absolute',
    top: 0, left: 4, right: 4,
    height: 2,
    backgroundColor: RED + 'BB',
    zIndex: 1,
  },
  armedDot: {
    position: 'absolute',
    top: -2, right: -2,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: RED_HI,
    borderWidth: 1,
    borderColor: DECK,
  },
  bottomStatusRow: {
    position: 'absolute',
    bottom: 2, left: 0, right: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  bottomStatusTxt: {
    fontFamily: MONO, fontSize: 7,
    color: 'rgba(255,106,82,0.55)',
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 7,
    paddingBottom: 7,
    gap: 8,
  },
  robotBadge: {
    width: 30, height: 30, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,42,31,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,42,31,0.45)',
    position: 'relative',
  },
  promptBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  promptGlyph: {
    color: RED,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: MONO,
  },
  cursorBlock: {
    width: 8,
    height: 15,
    backgroundColor: RED,
    opacity: 0.9,
  },
  input: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: MONO,
    letterSpacing: 0.5,
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  sendBtnArmed: {
    backgroundColor: RED,
    borderColor: RED_HI,
    ...(Platform.OS === 'ios'
      ? { shadowColor: RED, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8 }
      : { elevation: 8 }),
  },
  sendBtnIdle: {
    backgroundColor: 'rgba(255,42,31,0.06)',
    borderColor: 'rgba(255,42,31,0.40)',
  },
});
