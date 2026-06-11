/**
 * QuickButlerBar — Persistent floating "Ask Butler..." composer that sits
 * just above the bottom tab bar on every screen.
 *
 *  • Visuals: vector recreation of the user's neon speech-bubble artwork
 *    (NeonChatFrame) — angular cyan frame, robot-head badge, speech tail.
 *  • Pressing send writes the prompt to AsyncStorage (@butler_prefill_prompt)
 *    and navigates to the AI tab so the chat picks it up.
 */

import React, { useState, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Platform,
  Keyboard, Animated, Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { haptics } from '@/services/haptics';
import { NeonChatFrame } from '@/components/ui/NeonChatFrame';

export const BUTLER_PREFILL_KEY = '@butler_prefill_prompt';

const BAR_H  = 52;  // total height incl. speech tail (compact)
const TAIL_H = 9;

const safeHaptics = {
  light:  () => { try { haptics.light();  } catch {} },
  medium: () => { try { haptics.medium(); } catch {} },
};

export default function QuickButlerBar() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [barW, setBarW] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const glowAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
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

  const haloOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.30] });

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View
        style={styles.bubble}
        onLayout={e => setBarW(Math.round(e.nativeEvent.layout.width))}
      >
        {/* breathing ambient halo behind the frame */}
        <Animated.View pointerEvents="none" style={[styles.halo, { opacity: haloOpacity }]} />

        {barW > 0 && <NeonChatFrame width={barW} height={BAR_H} tailHeight={TAIL_H} badgeRadius={15} />}

        <View style={styles.row}>
          <TextInput
            ref={inputRef}
            testID="quickbar-input"
            value={text}
            onChangeText={setText}
            placeholder="Ask Butler…"
            placeholderTextColor="rgba(127,227,255,0.45)"
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
                ? { backgroundColor: '#3EC8FF', borderColor: '#7FE3FF' }
                : { backgroundColor: 'rgba(62,200,255,0.10)', borderColor: 'rgba(62,200,255,0.50)' },
            ]}
          >
            <MaterialCommunityIcons
              name={text.trim().length > 0 ? 'send' : 'arrow-right'}
              size={13}
              color={text.trim().length > 0 ? '#04101C' : '#3EC8FF'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: Platform.OS === 'ios' ? 94 : 76,
    zIndex: 50,
  },
  bubble: {
    height: BAR_H,
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    left: 4, right: 4, top: 2, bottom: TAIL_H - 2,
    borderRadius: 14,
    backgroundColor: '#3EC8FF',
    transform: [{ scale: 1.01 }],
  },
  row: {
    position: 'absolute',
    left: 42, right: 8, top: 3,
    height: BAR_H - TAIL_H - 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    color: '#D7F6FF',
    fontSize: 13.5,
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  sendBtn: {
    width: 25, height: 25, borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
