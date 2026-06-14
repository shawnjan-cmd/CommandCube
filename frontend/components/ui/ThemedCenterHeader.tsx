/**
 * ThemedCenterHeader.tsx
 * ──────────────────────────────────────────────────────────────────
 * Centered title page header — same vibe as the Builder page hero
 * but with the title perfectly centered. Shown on every tab EXCEPT
 * the home tab (homepage has its own MechBay hero).
 *
 * Visual style (matches the homepage theme):
 *   • Dark gunmetal background (#0B0F14)
 *   • Endo-red accent (#FF2A1F) glowing under-bar + corner brackets
 *   • Mono caps title with a 2-tone split: "> NAME"
 *   • Single hairline scan-line at top (static, no animation)
 *   • Optional connection-status dot row
 *
 * Used as a `header` renderer in (tabs)/_layout.tsx.
 */
import React from 'react';
import {
  View, Text, StyleSheet, Platform, TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

const MONO: any = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const C = {
  bg:        '#0B0F14',
  bgDeep:    '#070A0E',
  accent:    '#FF2A1F',
  textBrt:   '#E8EEF5',
  textMid:   '#8FA3B8',
  textDim:   '#4A5F75',
  ok:        '#44FF88',
  warn:      '#FF6A1F',
  err:       '#FF4444',
};

interface Props {
  title: string;                  // e.g. "AI TERMINAL"
  subtitle?: string;              // optional second line
  isConnected?: boolean;          // shows status dot if provided
  rightLabel?: string;            // optional right-side pill text
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightPress?: () => void;
  showBack?: boolean;
  onBackPress?: () => void;
  /** Show OFFLINE/ONLINE · SECURE · v1.0 pills below the title row */
  showStatusPills?: boolean;
  version?: string;
}

export default function ThemedCenterHeader({
  title, subtitle, isConnected, rightLabel, rightIcon, onRightPress,
  showBack, onBackPress, showStatusPills = false, version = 'v1.0',
}: Props) {
  const insets   = useSafeAreaInsets();
  const statusOk = isConnected === true;
  const showConn = isConnected !== undefined;
  const connColor = statusOk ? C.ok : C.err;

  return (
    <View style={[s.wrap, { paddingTop: insets.top, backgroundColor: C.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Top hairline scan-line (static) */}
      <View pointerEvents="none" style={s.scanTop} />

      {/* Corner brackets — top L/R */}
      <View pointerEvents="none" style={[s.corner, s.cornerTL, { top: insets.top + 4 }]} />
      <View pointerEvents="none" style={[s.corner, s.cornerTR, { top: insets.top + 4 }]} />

      {/* Row */}
      <View style={s.row}>
        {/* Left slot — optional back button */}
        <View style={s.slot}>
          {showBack ? (
            <TouchableOpacity onPress={onBackPress} activeOpacity={0.75} style={s.iconBtn}>
              <MaterialIcons name="chevron-left" size={26} color={C.accent} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Centered title block */}
        <View style={s.centerBlock}>
          <Text style={s.titleTop} numberOfLines={1} allowFontScaling={false}>
            <Text style={{ color: C.accent }}>{'> '}</Text>
            <Text style={{ color: C.textBrt }}>{title.toUpperCase()}</Text>
          </Text>
          {(subtitle || showConn) ? (
            <View style={s.metaRow}>
              {showConn ? (
                <>
                  <View style={[s.dot, {
                    backgroundColor: connColor,
                    ...(Platform.OS === 'ios' ? { shadowColor: connColor, shadowOpacity: 1, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } } : {}),
                  }]} />
                  <Text style={[s.metaTxt, { color: connColor }]} numberOfLines={1}>
                    {statusOk ? 'PC LINKED' : 'STANDBY'}
                  </Text>
                  {subtitle ? <Text style={[s.metaTxt, { color: C.textDim }]}> · </Text> : null}
                </>
              ) : null}
              {subtitle ? (
                <Text style={[s.metaTxt, { color: C.textMid }]} numberOfLines={1}>{subtitle}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Right slot — optional pill */}
        <View style={s.slot}>
          {rightLabel ? (
            <TouchableOpacity
              onPress={onRightPress}
              activeOpacity={onRightPress ? 0.78 : 1}
              style={s.rightPill}
            >
              {rightIcon ? <MaterialIcons name={rightIcon} size={12} color={C.accent} /> : null}
              <Text style={s.rightTxt} numberOfLines={1}>{rightLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Bottom glow border + accent strip */}
      <View pointerEvents="none" style={s.bottomBorder} />
      <View pointerEvents="none" style={s.accentStrip} />

      {/* Bottom corner brackets */}
      <View pointerEvents="none" style={[s.corner, s.cornerBL]} />
      <View pointerEvents="none" style={[s.corner, s.cornerBR]} />

      {/* Optional status pills row — OFFLINE/ONLINE · SECURE · vX.X */}
      {showStatusPills ? (
        <View style={s.pillsRow}>
          <View style={[s.pill, { borderColor: connColor + '50', backgroundColor: connColor + '12' }]}>
            <View style={[s.pillDot, { backgroundColor: connColor }]} />
            <Text style={[s.pillTxt, { color: connColor }]}>{statusOk ? 'ONLINE' : 'OFFLINE'}</Text>
          </View>
          <View style={[s.pill, { borderColor: C.accent + '55', backgroundColor: C.accent + '12' }]}>
            <View style={[s.pillDot, { backgroundColor: C.accent }]} />
            <Text style={[s.pillTxt, { color: C.accent }]}>SECURE</Text>
          </View>
          <View style={[s.pill, { borderColor: C.textDim + '60', backgroundColor: 'transparent' }]}>
            <Text style={[s.pillTxt, { color: C.textMid }]}>⚙ {version}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingBottom: 8,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  scanTop: {
    position: 'absolute', left: 0, right: 0, top: 0,
    height: StyleSheet.hairlineWidth, backgroundColor: C.accent + '55',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
    minHeight: 56,
  },
  slot: {
    width: 64,                       // equal left/right slots keep title visually centered
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1, borderColor: C.accent + '35',
    backgroundColor: C.bgDeep,
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTop: {
    fontSize: 17,
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 3,
    textAlign: 'center',
    ...(Platform.OS === 'ios'
      ? { textShadowColor: C.accent, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }
      : {}),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  dot:       { width: 6, height: 6, borderRadius: 3 },
  metaTxt:   { fontSize: 9, fontFamily: MONO, fontWeight: '700', letterSpacing: 1 },
  rightPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-end',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1, borderColor: C.accent + '60',
    backgroundColor: C.accent + '14',
  },
  rightTxt: {
    fontSize: 10, fontWeight: '900', fontFamily: MONO, letterSpacing: 1,
    color: C.accent,
  },
  bottomBorder: {
    position: 'absolute', left: 0, right: 0, bottom: 2,
    height: 1, backgroundColor: C.accent + '55',
  },
  accentStrip: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: 2, backgroundColor: C.accent + '30',
  },
  corner: {
    position: 'absolute', width: 14, height: 14,
    borderColor: C.accent + '80',
  },
  cornerTL: { left: 6,                       borderTopWidth: 1.5, borderLeftWidth: 1.5  },
  cornerTR: { right: 6,                      borderTopWidth: 1.5, borderRightWidth: 1.5 },
  cornerBL: { left: 6,  bottom: 4,           borderBottomWidth: 1.5, borderLeftWidth: 1.5  },
  cornerBR: { right: 6, bottom: 4,           borderBottomWidth: 1.5, borderRightWidth: 1.5 },
  pillsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 2,
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 100,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillTxt: { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
});
