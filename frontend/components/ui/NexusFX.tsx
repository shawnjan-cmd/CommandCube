/**
 * ⚡ NEXUS HUD FX — Reusable boot-screen animations for any page
 * Extracts: MiniSkull · TypewriterBoot · TechGrid · GlitchPress · ChromeHeader
 * NOTE: ALL animations use useNativeDriver: false to prevent Hermes Android driver conflicts
 * (previously TerminatorFX.tsx — renamed to NexusFX.tsx)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Platform, Animated, Dimensions, TouchableOpacity,
} from 'react-native';
import { autoErrorLogger } from '@/services/autoErrorLogger';
import { haptics } from '@/services/haptics';

const { width: SW, height: SH } = Dimensions.get('window');
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ─── NEXUS palette ─────────────────────────────────────────────────
export const FX = {
  bg:      '#000509',
  red:     '#CC2200',
  redBrt:  '#FF3300',
  amber:   '#FF7700',
  text:    '#00CCDD',
  dim:     '#0A1A22',
};

// ═══════════════════════════════════════════════════════════════════
// 1. MiniSkull — compact HUD skull for page headers
// ═══════════════════════════════════════════════════════════════════
export function MiniSkull({
  size = 52,
  glitchOnPress = false,
  onPress,
}: {
  size?: number;
  glitchOnPress?: boolean;
  onPress?: () => void;
}) {
  const eyeGlow   = useRef(new Animated.Value(0.7)).current;
  const floatY    = useRef(new Animated.Value(0)).current;
  const scanOp    = useRef(new Animated.Value(0)).current;
  const scanTY    = useRef(new Animated.Value(0)).current;
  const jitterX   = useRef(new Animated.Value(0)).current;
  const crackAnim = useRef(new Animated.Value(0.5)).current;

  const fireGlitch = useCallback(() => {
    scanTY.setValue(0);
    Animated.sequence([
      Animated.timing(scanOp, { toValue: 0.95, duration: 25, useNativeDriver: false }),
      Animated.timing(scanTY, { toValue: 1, duration: 180, useNativeDriver: false }),
      Animated.timing(scanOp, { toValue: 0, duration: 50, useNativeDriver: false }),
    ]).start();
    Animated.sequence([
      Animated.timing(jitterX, { toValue: -4, duration: 25, useNativeDriver: false }),
      Animated.timing(jitterX, { toValue: 5,  duration: 20, useNativeDriver: false }),
      Animated.timing(jitterX, { toValue: -2, duration: 18, useNativeDriver: false }),
      Animated.timing(jitterX, { toValue: 0,  duration: 80, useNativeDriver: false }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(1600),
      Animated.timing(eyeGlow, { toValue: 0.05, duration: 55,  useNativeDriver: false }),
      Animated.timing(eyeGlow, { toValue: 1,    duration: 75,  useNativeDriver: false }),
      Animated.timing(eyeGlow, { toValue: 0.05, duration: 50,  useNativeDriver: false }),
      Animated.timing(eyeGlow, { toValue: 0.9,  duration: 85,  useNativeDriver: false }),
      Animated.delay(500),
      Animated.timing(eyeGlow, { toValue: 0.4,  duration: 500, useNativeDriver: false }),
      Animated.timing(eyeGlow, { toValue: 0.9,  duration: 500, useNativeDriver: false }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(floatY, { toValue: -4, duration: 2000, useNativeDriver: false }),
      Animated.timing(floatY, { toValue: 0,  duration: 2000, useNativeDriver: false }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(crackAnim, { toValue: 1,   duration: 2800, useNativeDriver: false }),
      Animated.timing(crackAnim, { toValue: 0.3, duration: 2800, useNativeDriver: false }),
    ])).start();
    const t = setInterval(() => {
      if (Math.random() > 0.65) fireGlitch();
    }, 4500);
    return () => clearInterval(t);
  }, []);

  const S = size;
  const eyeColor = eyeGlow.interpolate({ inputRange: [0, 1], outputRange: ['#001A22', '#00EEFF'] });

  const skull = (
    <Animated.View style={[ms.wrap, { width: S, height: S * 1.15, transform: [{ translateY: floatY }, { translateX: jitterX }] }]}>
      <View style={[ms.cranium, {
        width: S * 0.9,
        height: S * 0.62,
        borderTopLeftRadius: S * 0.45,
        borderTopRightRadius: S * 0.45,
        borderBottomLeftRadius: S * 0.08,
        borderBottomRightRadius: S * 0.08,
      }]}>
        <Animated.View style={[ms.crack, { opacity: crackAnim, left: S * 0.47, height: S * 0.22 }]} />
        <View style={[ms.socketRow, { gap: S * 0.12 }]}>
          {[0, 1].map(i => (
            <View key={i} style={[ms.socket, { width: S * 0.26, height: S * 0.18, borderRadius: S * 0.055 }]}>
              <Animated.View style={[ms.eyeLens, {
                width: S * 0.14, height: S * 0.10,
                backgroundColor: eyeColor as any,
                shadowColor: '#00EEFF',
                shadowRadius: S * 0.06,
              }]} />
              <Animated.View style={[ms.lensFlare, { opacity: eyeGlow, top: S * 0.025, left: S * 0.045, width: S * 0.04, height: S * 0.03 }]} />
            </View>
          ))}
        </View>
        <View style={[ms.nasalRow, { gap: S * 0.045 }]}>
          {[0, 1].map(i => <View key={i} style={[ms.nasal, { width: S * 0.07, height: S * 0.09, borderRadius: S * 0.02 }]} />)}
        </View>
      </View>
      <View style={[ms.jaw, { width: S * 0.82, borderBottomLeftRadius: S * 0.09, borderBottomRightRadius: S * 0.09 }]}>
        <View style={[ms.teethRow, { gap: S * 0.022 }]}>
          {[7, 6, 8, 6, 7].map((h, i) => (
            <View key={i} style={[ms.tooth, { width: S * 0.08, height: S * (h / 50), borderRadius: S * 0.015 }]} />
          ))}
        </View>
      </View>
      <View style={[ms.neckRow, { gap: S * 0.04 }]}>
        {[4, 6, 4].map((w, i) => (
          <View key={i} style={[ms.neckPipe, { width: S * (w / 50), height: S * 0.1, borderRadius: S * 0.02 }]} />
        ))}
      </View>
      <Animated.View style={[ms.led, { opacity: eyeGlow, width: S * 0.06, height: S * 0.06, borderRadius: S * 0.03, shadowRadius: S * 0.04 }]} />
      <Animated.View style={[ms.glitchScan, {
        opacity: scanOp,
        height: S * 0.045,
        transform: [{ translateY: scanTY.interpolate({ inputRange: [0, 1], outputRange: [-S * 0.6, S * 0.6] }) }],
      }]} />
    </Animated.View>
  );

  if (!onPress) return skull;
  return (
    <TouchableOpacity
      onPress={() => {
        haptics.light();
        if (glitchOnPress) fireGlitch();
        onPress();
      }}
      activeOpacity={0.85}
    >
      {skull}
    </TouchableOpacity>
  );
}

const ms = StyleSheet.create({
  wrap:      { alignItems: 'center', justifyContent: 'center', gap: 0, position: 'relative' },
  cranium: {
    backgroundColor: '#001018', borderWidth: 1.5, borderColor: '#00CCDD',
    alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
    shadowColor: '#00EEFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 4,
  },
  crack:     { position: 'absolute', top: 6, width: 1.5, backgroundColor: '#00EEFF', borderRadius: 1, transform: [{ rotate: '8deg' }] },
  socketRow: { flexDirection: 'row', marginBottom: 2, marginTop: 6 },
  socket:    {
    backgroundColor: '#000',
    borderWidth: 1, borderColor: '#005577',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  eyeLens:   { borderRadius: 3, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, elevation: 3 },
  lensFlare: { position: 'absolute', backgroundColor: '#88EEFF', borderRadius: 2 },
  nasalRow:  { flexDirection: 'row', marginBottom: 2 },
  nasal:     { backgroundColor: '#000A0E', borderWidth: 1, borderColor: '#003344' },
  jaw: {
    backgroundColor: '#001018', borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderRightWidth: 1.5,
    borderColor: '#00CCDD', paddingVertical: 4, paddingHorizontal: 4, alignItems: 'center', marginTop: 1,
  },
  teethRow: { flexDirection: 'row', alignItems: 'flex-start' },
  tooth:    { backgroundColor: '#002233', borderWidth: 1, borderColor: '#005577' },
  neckRow:  { flexDirection: 'row', marginTop: 2, alignItems: 'flex-start' },
  neckPipe: { backgroundColor: '#001A22', borderWidth: 1, borderColor: '#003344', borderRadius: 2 },
  led:      { backgroundColor: '#00EEFF', marginTop: 2, shadowColor: '#00EEFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1 },
  glitchScan: {
    position: 'absolute', left: -8, right: -8,
    backgroundColor: '#00EEFF', borderRadius: 2,
    shadowColor: '#00EEFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8,
  },
});

// ═══════════════════════════════════════════════════════════════════
// 2. TypewriterLine
// ═══════════════════════════════════════════════════════════════════
export function TypewriterLine({
  text, color, speed = 16, style,
}: {
  text: string; color: string; speed?: number; style?: any;
}) {
  const [shown, setShown] = useState('');
  const cursorBlink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setShown('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    Animated.loop(Animated.sequence([
      Animated.timing(cursorBlink, { toValue: 0, duration: 400, useNativeDriver: false }),
      Animated.timing(cursorBlink, { toValue: 1, duration: 400, useNativeDriver: false }),
    ])).start();
    return () => clearInterval(id);
  }, [text, speed]);

  return (
    <Text style={[tw.line, { color }, style]}>
      {shown}
      {shown.length < text.length ? (
        <Animated.Text style={[tw.cursor, { opacity: cursorBlink }]}>|</Animated.Text>
      ) : null}
    </Text>
  );
}
const tw = StyleSheet.create({
  line:   { fontSize: 10, fontFamily: MONO, lineHeight: 17, letterSpacing: 0.3 },
  cursor: { fontSize: 10, color: '#00EEFF', fontFamily: MONO },
});

// ═══════════════════════════════════════════════════════════════════
// 3. TechGrid
// ═══════════════════════════════════════════════════════════════════
export function TechGrid({
  rows = 20, cols = 14, color = 'rgba(0,200,220,0.06)', animated = false,
}: {
  rows?: number; cols?: number; color?: string; animated?: boolean;
}) {
  const opacity = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    if (!animated) return;
    Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1,   duration: 2200, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 0.3, duration: 2200, useNativeDriver: false }),
    ])).start();
  }, [animated]);

  const content = (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={`h${i}`} style={[tg.line, { top: (i / rows) * SH, left: 0, right: 0, height: 1, backgroundColor: color }]} />
      ))}
      {Array.from({ length: cols }).map((_, i) => (
        <View key={`v${i}`} style={[tg.line, { left: (i / cols) * SW, top: 0, bottom: 0, width: 1, backgroundColor: color }]} />
      ))}
    </View>
  );
  if (!animated) return content;
  return <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">{content}</Animated.View>;
}
const tg = StyleSheet.create({
  line: { position: 'absolute' },
});

// ═══════════════════════════════════════════════════════════════════
// 4. GlitchPressButton
// ═══════════════════════════════════════════════════════════════════
export function GlitchPressButton({
  onPress, children, style, disabled,
  logLabel,
}: {
  onPress: () => void;
  children: React.ReactNode;
  style?: any;
  disabled?: boolean;
  logLabel?: string;
}) {
  const scale    = useRef(new Animated.Value(1)).current;
  const scanOp   = useRef(new Animated.Value(0)).current;
  const scanTY   = useRef(new Animated.Value(0)).current;
  const borderOp = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    if (disabled) return;
    haptics.light();
    if (logLabel) {
      autoErrorLogger.log('info', 'GlitchButton', `Button pressed: ${logLabel}`);
    }
    scanTY.setValue(0);
    borderOp.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.93, duration: 65, useNativeDriver: false }),
        Animated.timing(scale, { toValue: 1,    duration: 110, useNativeDriver: false }),
      ]),
      Animated.sequence([
        Animated.timing(scanOp,   { toValue: 0.85, duration: 22, useNativeDriver: false }),
        Animated.timing(scanTY,   { toValue: 1,    duration: 150, useNativeDriver: false }),
        Animated.timing(scanOp,   { toValue: 0,    duration: 40, useNativeDriver: false }),
      ]),
      Animated.sequence([
        Animated.timing(borderOp, { toValue: 0.9, duration: 55, useNativeDriver: false }),
        Animated.timing(borderOp, { toValue: 0,   duration: 220, useNativeDriver: false }),
      ]),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} disabled={disabled} activeOpacity={0.82}>
      <Animated.View style={[{ transform: [{ scale }] }, style, { position: 'relative', overflow: 'hidden' }]}>
        {children}
        <Animated.View pointerEvents="none" style={[gp.scan, {
          opacity: scanOp,
          transform: [{ translateY: scanTY.interpolate({ inputRange: [0, 1], outputRange: [-40, 80] }) }],
        }]} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {
          borderRadius: 6, borderWidth: 2, borderColor: '#00EEFF', opacity: borderOp,
        }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}
const gp = StyleSheet.create({
  scan: {
    position: 'absolute', left: 0, right: 0, height: 3,
    backgroundColor: '#00EEFF',
    shadowColor: '#00EEFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
  },
});

// ═══════════════════════════════════════════════════════════════════
// 5. ChromeHeader
// ═══════════════════════════════════════════════════════════════════
export function ChromeHeader({
  title, subtitle, showSkull = false, connected, rightContent,
}: {
  title: string;
  subtitle?: string;
  showSkull?: boolean;
  connected?: boolean;
  rightContent?: React.ReactNode;
}) {
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 1100, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0.3, duration: 1100, useNativeDriver: false }),
    ])).start();
  }, []);

  const connColor = connected == null ? '#FF8C00' : connected ? '#44FF22' : '#FF3300';

  return (
    <View style={ch.wrap}>
      <TechGrid rows={6} cols={8} color="rgba(0,200,220,0.04)" />
      <View style={ch.row}>
        {showSkull ? (
          <MiniSkull size={40} glitchOnPress />
        ) : (
          <View style={ch.tBox}>
            <Text style={ch.tTxt}>N</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <TypewriterLine text={title} color="#00EEFF" speed={22} style={ch.title} />
          {subtitle ? <Text style={ch.sub}>{subtitle}</Text> : null}
        </View>
        <View style={ch.rightWrap}>
          {rightContent}
          {connected != null ? (
            <View style={[ch.connBadge, { borderColor: connColor + '70', backgroundColor: connColor + '12' }]}>
              <Animated.View style={[ch.connDot, { backgroundColor: connColor, opacity: glowAnim }]} />
              <Text style={[ch.connTxt, { color: connColor }]}>{connected ? 'LINKED' : 'OFFLINE'}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Animated.View style={[ch.bottomEdge, {
        opacity: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.4, 0.9] }),
      }]} />
    </View>
  );
}
const ch = StyleSheet.create({
  wrap:       { backgroundColor: '#040C14', borderBottomWidth: 3, borderBottomColor: '#00CCDD', paddingHorizontal: 12, paddingVertical: 9, overflow: 'hidden', position: 'relative' },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tBox:       { width: 30, height: 30, borderRadius: 5, backgroundColor: '#00CCDD', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#00EEFF' },
  tTxt:       { fontSize: 18, fontWeight: '900', color: '#000', fontFamily: MONO },
  title:      { fontSize: 11, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  sub:        { fontSize: 6, color: '#336677', fontFamily: MONO, letterSpacing: 1, marginTop: 1 },
  rightWrap:  { alignItems: 'flex-end', gap: 4 },
  connBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  connDot:    { width: 5, height: 5, borderRadius: 3 },
  connTxt:    { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.5 },
  bottomEdge: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: '#00EEFF' },
});

// ═══════════════════════════════════════════════════════════════════
// 6. BootLogBox
// ═══════════════════════════════════════════════════════════════════
export function BootLogBox({
  lines,
  title = 'SYSTEM LOG',
  height: boxH = 80,
  autoPlay = true,
}: {
  lines: { text: string; color: string }[];
  title?: string;
  height?: number;
  autoPlay?: boolean;
}) {
  const [visible, setVisible] = useState<number[]>([]);
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 900, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0.2, duration: 900, useNativeDriver: false }),
    ])).start();
    if (!autoPlay) return;
    lines.forEach((_, i) => {
      setTimeout(() => setVisible(prev => [...prev, i]), i * 320);
    });
  }, []);

  return (
    <View style={[blb.box, { height: boxH }]}>
      <View style={blb.hdr}>
        <View style={blb.dot} />
        <View style={blb.dot} />
        <View style={blb.dot} />
        <Text style={blb.hdrTxt}>{title}</Text>
        <Animated.Text style={[blb.recTxt, { opacity: glowAnim }]}>REC</Animated.Text>
      </View>
      <View style={blb.body}>
        {lines.slice(0, 4).map((l, i) =>
          visible.includes(i) || !autoPlay ? (
            <TypewriterLine key={i} text={l.text} color={l.color} speed={14} />
          ) : null
        )}
        <Animated.Text style={[blb.cursor, { opacity: glowAnim }]}>{'> _'}</Animated.Text>
      </View>
    </View>
  );
}
const blb = StyleSheet.create({
  box:    { backgroundColor: '#020810', borderRadius: 5, borderWidth: 1.5, borderColor: '#00CCDD70', overflow: 'hidden' },
  hdr:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#00CCDD', paddingHorizontal: 10, paddingVertical: 5 },
  dot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: '#000' },
  hdrTxt: { fontSize: 8, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 1.5, flex: 1 },
  recTxt: { fontSize: 8, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 1 },
  body:   { padding: 8, gap: 1 },
  cursor: { fontSize: 10, color: '#00EEFF', fontFamily: MONO, marginTop: 3 },
});

// ═══════════════════════════════════════════════════════════════════
// 7. AutoHealthButton
// ═══════════════════════════════════════════════════════════════════
export function AutoHealthButton({
  label, icon, color = '#00EEFF', onPress, onCheck, disabled, style, textStyle,
}: {
  label: string;
  icon?: string;
  color?: string;
  onPress: () => Promise<void> | void;
  onCheck?: () => Promise<boolean>;
  disabled?: boolean;
  style?: any;
  textStyle?: any;
}) {
  const [checking, setChecking] = useState(false);
  const [lastStatus, setLastStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 1000, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0.3, duration: 1000, useNativeDriver: false }),
    ])).start();
  }, []);

  const handlePress = async () => {
    autoErrorLogger.log('info', 'AutoHealthButton', `Tapped: ${label}`);
    await onPress();
    if (onCheck) {
      setChecking(true);
      try {
        const ok = await onCheck();
        setLastStatus(ok ? 'ok' : 'fail');
        autoErrorLogger.log(ok ? 'info' : 'warning', 'AutoHealthButton', `Health check for ${label}: ${ok ? 'PASS' : 'FAIL'}`);
      } catch (e: any) {
        setLastStatus('fail');
        autoErrorLogger.log('error', 'AutoHealthButton', `Health check error for ${label}: ${e?.message}`);
      } finally {
        setChecking(false);
        setTimeout(() => setLastStatus('idle'), 3000);
      }
    }
  };

  const statusColor = lastStatus === 'ok' ? '#44FF22' : lastStatus === 'fail' ? '#FF3300' : color;

  return (
    <GlitchPressButton onPress={handlePress} disabled={disabled || checking} style={style} logLabel={label}>
      <Animated.View style={[ahb.inner, {
        borderColor: statusColor + '80',
        shadowColor: statusColor,
        shadowOpacity: glowAnim as unknown as number,
      }]}>
        {icon ? <Text style={ahb.icon}>{icon}</Text> : null}
        <Text style={[ahb.label, { color: statusColor }, textStyle]}>{label}</Text>
        {checking ? (
          <Animated.View style={[ahb.led, { backgroundColor: '#FF8800', opacity: glowAnim }]} />
        ) : lastStatus !== 'idle' ? (
          <View style={[ahb.led, { backgroundColor: statusColor }]} />
        ) : null}
      </Animated.View>
    </GlitchPressButton>
  );
}
const ahb = StyleSheet.create({
  inner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#040C14', borderRadius: 6, borderWidth: 1.5,
    paddingHorizontal: 12, paddingVertical: 9, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 0 }, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  icon:  { fontSize: 13 },
  label: { fontSize: 10, fontWeight: '900', fontFamily: MONO, letterSpacing: 1, flex: 1 },
  led:   { width: 6, height: 6, borderRadius: 3 },
});
