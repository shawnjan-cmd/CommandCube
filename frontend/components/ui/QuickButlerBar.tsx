/**
 * QuickButlerBar — Persistent floating "Ask Butler..." composer that sits
 * just above the bottom tab bar on every screen.
 *
 *  • Single-line input with cyan glow border matching the BUTLER AI shield
 *  • Send icon button with haptic feedback
 *  • Pressing send writes the prompt to AsyncStorage (@butler_prefill_prompt)
 *    and navigates to the AI tab so the chat picks it up.
 *  • Tap on the bar without typing also opens the AI tab (zero-friction entry).
 *  • Hidden by default in dev preview if EXPO_PUBLIC_HIDE_QUICKBAR=1
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Platform,
  Keyboard, Animated, Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { haptics } from '@/services/haptics';

export const BUTLER_PREFILL_KEY = '@butler_prefill_prompt';

const safeHaptics = {
  light:   () => { try { haptics.light();   } catch {} },
  medium:  () => { try { haptics.medium();  } catch {} },
  success: () => { try { haptics.success(); } catch {} },
};

export default function QuickButlerBar() {
  const router = useRouter();
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Subtle continuous glow pulse so the bar reads as "alive" without being noisy
  React.useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [glowAnim]);

  const handleSend = async () => {
    const prompt = text.trim();
    safeHaptics.medium();
    if (prompt.length > 0) {
      try { await AsyncStorage.setItem(BUTLER_PREFILL_KEY, prompt); } catch {}
      setText('');
      Keyboard.dismiss();
    }
    try { router.push('/(tabs)/butler' as any); } catch {}
  };

  const handleTapBar = () => {
    if (text.length === 0) {
      safeHaptics.light();
      // Focus the input first; if the user just taps the bar without typing, open Butler
      inputRef.current?.focus();
    }
  };

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,229,255,0.28)', 'rgba(0,229,255,0.65)'],
  });
  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.45],
  });

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.bar,
          {
            borderColor,
            shadowColor: '#00E5FF',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity,
            shadowRadius: 10,
            elevation: 6,
          },
        ]}
      >
        {/* Left status LED — replaces the robot avatar with a discrete cyan dot */}
        <View style={styles.led}>
          <View style={styles.ledInner} />
        </View>

        <TextInput
          ref={inputRef}
          testID="quickbar-input"
          value={text}
          onChangeText={setText}
          placeholder="Ask Butler…"
          placeholderTextColor="rgba(0,229,255,0.50)"
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          maxLength={500}
          underlineColorAndroid="transparent"
        />

        <TouchableOpacity
          testID="quickbar-send"
          activeOpacity={0.75}
          onPress={handleSend}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[
            styles.sendBtn,
            text.trim().length > 0
              ? { backgroundColor: '#00E5FF', borderColor: '#00E5FF' }
              : { backgroundColor: 'rgba(0,229,255,0.10)', borderColor: 'rgba(0,229,255,0.45)' },
          ]}
        >
          <MaterialCommunityIcons
            name={text.trim().length > 0 ? 'send' : 'arrow-right'}
            size={13}
            color={text.trim().length > 0 ? '#001018' : '#00E5FF'}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: Platform.OS === 'ios' ? 96 : 76,
    zIndex: 50,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#060D18',
  },
  led: {
    width: 14, height: 14, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,229,255,0.15)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,229,255,0.45)',
  },
  ledInner: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#00E5FF',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#00E5FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4 }
      : {}),
  },
  input: {
    flex: 1,
    color: '#D7F6FF',
    fontSize: 12.5,
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  sendBtn: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
