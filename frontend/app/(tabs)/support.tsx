// app/(tabs)/support.tsx
// COSMETIC PACKS v9.0 — Full app-wide theming · Immersive preview · Tiered packages
// No payment links — Play Store IAP ready placeholder

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {

  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Platform, Animated, Easing, Dimensions, Modal, StatusBar, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCosmetic, PACK_THEMES, TIER_CONFIG, AppTheme, TierId, grantReviewReward, checkReviewUnlock } from '@/contexts/CosmeticContext';
import { haptics } from '@/services/haptics';

const MONO: any    = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const BODY: any    = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const { width: SW, height: SH } = Dimensions.get('window');

// ─────────────────────────────────────────────
// FULL-SCREEN IMMERSIVE PREVIEW
// Shows every major page element theemed
// ─────────────────────────────────────────────
function ImmersivePreview({ theme, visible, onClose, onApply, isActive }: {
  theme: AppTheme | null;
  visible: boolean;
  onClose: () => void;
  onApply: (t: AppTheme) => void;
  isActive: boolean;
}) {
  const slideAnim  = useRef(new Animated.Value(SH)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;
  const scanAnim   = useRef(new Animated.Value(0)).current;
  const [tab, setTab] = useState(0);
  const TABS = ['HOME', 'AI CHAT', 'SCRIPTS', 'SETTINGS'];

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }).start();
      const gl = Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1600, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1600, useNativeDriver: false }),
      ]));
      const sc = Animated.loop(
        Animated.timing(scanAnim, { toValue: 1, duration: 3000, useNativeDriver: true, easing: Easing.linear })
      );
      gl.start(); sc.start();
      return () => { gl.stop(); sc.stop(); };
    } else {
      Animated.timing(slideAnim, { toValue: SH, duration: 300, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!theme) return null;
  const pr = theme.primary;
  const borderGlow = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [pr + '40', pr + 'AA'] });
  const scanY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, SH * 0.7] });

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <View style={[ip.backdrop, { backgroundColor: 'rgba(0,0,0,0.95)' }]}>
        <Animated.View style={[ip.sheet, { transform: [{ translateY: slideAnim }], backgroundColor: theme.bg }]}>

          {/* Scanning light sweep */}
          <Animated.View pointerEvents="none" style={[ip.scanLine, { backgroundColor: pr + '18', transform: [{ translateY: scanY }] }]} />

          {/* Top drag handle */}
          <View style={ip.handle}>
            <View style={[ip.handleBar, { backgroundColor: pr + '40' }]} />
          </View>

          {/* Header */}
          <View style={[ip.header, { borderBottomColor: pr + '25', backgroundColor: theme.panel }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={[ip.themeCircle, { borderColor: pr, backgroundColor: pr + '15' }]}>
                <MaterialCommunityIcons name={theme.icon as any || 'palette'} size={18} color={pr} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ip.themeName, { color: pr }]}>{theme.name}</Text>
                <Text style={[ip.themeTagline, { color: theme.textDim }]}>{theme.tagline}</Text>
              </View>
              {theme.badge ? (
                <View style={[ip.badge, { borderColor: pr + '55', backgroundColor: pr + '18' }]}>
                  <Text style={[ip.badgeTxt, { color: pr }]}>{theme.badge}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} style={ip.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <MaterialIcons name="close" size={22} color={theme.textDim} />
            </TouchableOpacity>
          </View>

          {/* Page tabs */}
          <View style={[ip.tabsRow, { backgroundColor: theme.panel, borderBottomColor: pr + '20' }]}>
            {TABS.map((t, i) => (
              <TouchableOpacity key={t} onPress={() => { haptics.light(); setTab(i); }} style={[ip.tabBtn, i === tab && { borderBottomColor: pr, borderBottomWidth: 2 }]}>
                <Text style={[ip.tabTxt, { color: i === tab ? pr : theme.textDim }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Page previews */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {tab === 0 && <HomePreview theme={theme} borderGlow={borderGlow} />}
            {tab === 1 && <AIChatPreview theme={theme} />}
            {tab === 2 && <ScriptsPreview theme={theme} />}
            {tab === 3 && <SettingsPreview theme={theme} />}
          </ScrollView>

          {/* Color strip */}
          <View style={ip.colorStrip}>
            {[theme.primary, theme.secondary, theme.tertiary, theme.aiBorder.replace(/rgba\((.+),.+\)/, 'rgba($1,1)'), theme.borderBrt].map((col, i) => (
              <View key={i} style={[ip.colorBlock, { backgroundColor: col }]}>
                <Text style={ip.colorLabel} numberOfLines={1}>{col.startsWith('#') ? col.slice(0, 7) : ''}</Text>
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={[ip.actions, { borderTopColor: pr + '20', backgroundColor: theme.panel }]}>
            <TouchableOpacity style={[ip.cancelBtn, { borderColor: theme.borderColor }]} onPress={onClose} activeOpacity={0.8}>
              <Text style={[ip.cancelTxt, { color: theme.textDim }]}>BACK</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ip.applyBtn, { backgroundColor: isActive ? theme.secondary : pr }]}
              onPress={() => { onApply(theme); onClose(); }}
              activeOpacity={0.85}
            >
              <MaterialIcons name={isActive ? 'check-circle' : 'palette'} size={18} color="#000" />
              <Text style={ip.applyTxt}>{isActive ? 'APPLIED ✓' : 'APPLY THEME'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Home Page Preview ───────────────────────────────────────
function HomePreview({ theme, borderGlow }: { theme: AppTheme; borderGlow: Animated.AnimatedInterpolation<string> }) {
  const pr = theme.primary;
  const sc = theme.secondary;
  const tc = theme.tertiary;
  return (
    <View style={{ padding: 14, gap: 10 }}>
      {/* Fake header */}
      <Animated.View style={[pp.fakeHeader, { backgroundColor: theme.panel, borderBottomColor: borderGlow }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[pp.fakeLogo, { borderColor: pr + '60', backgroundColor: pr + '0C' }]}>
            <View style={[pp.fakeLogoInner, { backgroundColor: pr }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[pp.fakeTitle, { color: theme.textHi }]}>Butler <Text style={{ color: pr }}>AI</Text></Text>
            <Text style={[pp.fakeSub, { color: theme.textDim }]}>PC Automation · Command Center</Text>
          </View>
          <View style={[pp.fakeStatusPill, { borderColor: '#00FF8860', backgroundColor: '#00FF8810' }]}>
            <View style={[pp.fakeStatusDot, { backgroundColor: '#00FF88' }]} />
            <Text style={[pp.fakeStatusTxt, { color: '#00FF88' }]}>LIVE</Text>
          </View>
        </View>
      </Animated.View>
      {/* Fake cards */}
      <Text style={[pp.sectionLabel, { color: pr + '80' }]}>QUICK ACCESS</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { label: 'Python Scripts', icon: 'code-braces', color: sc },
          { label: 'Butler AI',      icon: 'robot-angry', color: pr },
        ].map(({ label, icon, color }) => (
          <View key={label} style={[pp.fakeCard, { borderColor: color + '40', backgroundColor: color + '0A', borderLeftColor: color, flex: 1 }]}>
            <MaterialCommunityIcons name={icon as any} size={22} color={color} />
            <Text style={[pp.fakeCardTxt, { color: theme.textHi }]}>{label}</Text>
            <View style={[pp.fakeCardBar, { backgroundColor: color }]} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { label: 'Terminal',  icon: 'console-line', color: tc },
          { label: 'Knowledge', icon: 'head-cog',     color: sc },
        ].map(({ label, icon, color }) => (
          <View key={label} style={[pp.fakeCard, { borderColor: color + '40', backgroundColor: color + '0A', borderLeftColor: color, flex: 1 }]}>
            <MaterialCommunityIcons name={icon as any} size={22} color={color} />
            <Text style={[pp.fakeCardTxt, { color: theme.textHi }]}>{label}</Text>
          </View>
        ))}
      </View>
      {/* Fake system vitals */}
      <Text style={[pp.sectionLabel, { color: pr + '80' }]}>SYSTEM VITALS</Text>
      {[
        { label: 'CPU', pct: 32, color: pr },
        { label: 'RAM', pct: 68, color: sc },
        { label: 'DISK', pct: 45, color: tc },
      ].map(({ label, pct, color }) => (
        <View key={label} style={[pp.vitalsRow, { borderColor: color + '20', backgroundColor: color + '06' }]}>
          <Text style={[pp.vitalsLabel, { color: color + 'AA' }]}>{label}</Text>
          <View style={[pp.vitalsTrack, { backgroundColor: color + '15' }]}>
            <View style={[pp.vitalsBar, { backgroundColor: color, width: `${pct}%` as any }]} />
          </View>
          <Text style={[pp.vitalsVal, { color: color }]}>{pct}%</Text>
        </View>
      ))}
    </View>
  );
}

// ─── AI Chat Preview ─────────────────────────────────────────
function AIChatPreview({ theme }: { theme: AppTheme }) {
  const pr = theme.primary;
  return (
    <View style={{ padding: 14, gap: 12 }}>
      <Text style={[pp.sectionLabel, { color: pr + '80' }]}>AI CONVERSATION</Text>
      {/* System msg */}
      <View style={[pp.sysMsg, { borderColor: pr + '25', backgroundColor: pr + '06' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: pr }} />
          <Text style={[pp.sysMsgTxt, { color: pr + '90' }]}>Butler AI v6.0 · Local Ollama · Ready</Text>
        </View>
      </View>
      {/* AI bubble */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={[pp.aiAvatar, { borderColor: pr + '50', backgroundColor: pr + '0C' }]}>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {[0,1].map(i => <View key={i} style={[pp.aiEye, { backgroundColor: pr }]} />)}
          </View>
          <View style={[pp.aiMouth, { backgroundColor: pr + '60' }]} />
          <View style={[pp.aiLed, { backgroundColor: '#00FF88' }]} />
        </View>
        <View style={[pp.aiBubble, { backgroundColor: theme.aiBubble, borderColor: pr + '25', borderLeftColor: pr }]}>
          <Text style={[pp.bubbleTxt, { color: theme.textHi }]}>Hello! I am Butler AI running on your local Ollama model.</Text>
          <Text style={[pp.bubbleMeta, { color: theme.textDim }]}>qwen2.5-coder · 1.2s · LOCAL</Text>
        </View>
      </View>
      {/* User bubble */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 10 }}>
        <View style={[pp.userBubble, { backgroundColor: theme.userBubble, borderColor: pr + '40' }]}>
          <Text style={[pp.bubbleTxt, { color: theme.textHi }]}>Show me my PC stats</Text>
        </View>
        <View style={[pp.userAvatar, { borderColor: pr + '50', backgroundColor: pr + '12' }]}>
          <MaterialCommunityIcons name="account" size={16} color={pr} />
        </View>
      </View>
      {/* Input bar */}
      <View style={[pp.inputBar, { backgroundColor: theme.chatBarBg, borderTopColor: theme.chatBarBorderTop }]}>
        <View style={[pp.inputConnBlock, { borderColor: '#00FF8840', backgroundColor: '#00FF880C' }]}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#00FF88' }} />
          <Text style={[pp.inputConnLabel, { color: '#00FF8890' }]}>ON</Text>
        </View>
        <View style={[pp.inputField, { borderColor: pr + '40' }]}>
          <Text style={[pp.inputPlaceholder, { color: pr + '40' }]}>Ask Butler AI...</Text>
        </View>
        <View style={[pp.sendBtn, { backgroundColor: pr + '18', borderColor: pr + '55' }]}>
          <MaterialIcons name="send" size={16} color={pr} />
        </View>
      </View>
    </View>
  );
}

// ─── Scripts Preview ─────────────────────────────────────────
function ScriptsPreview({ theme }: { theme: AppTheme }) {
  const pr = theme.primary;
  const sc = theme.secondary;
  const tc = theme.tertiary;
  const SCRIPTS = [
    { name: 'Clean Temp Files',    cat: 'SYSTEM', color: pr },
    { name: 'CPU Monitor',         cat: 'MONITOR', color: sc },
    { name: 'Backup Documents',    cat: 'BACKUP', color: tc },
    { name: 'Network Speed Test',  cat: 'NETWORK', color: pr },
  ];
  return (
    <View style={{ padding: 14, gap: 10 }}>
      <Text style={[pp.sectionLabel, { color: pr + '80' }]}>PYTHON SCRIPTS</Text>
      {/* Search bar */}
      <View style={[pp.searchBar, { borderColor: pr + '35', backgroundColor: pr + '08' }]}>
        <MaterialIcons name="search" size={16} color={pr + '60'} />
        <Text style={[pp.searchTxt, { color: theme.textDim }]}>Search scripts...</Text>
      </View>
      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {['ALL', 'SYSTEM', 'NETWORK', 'BACKUP'].map((c, i) => (
          <View key={c} style={[pp.catChip, { borderColor: i === 0 ? pr + '70' : pr + '25', backgroundColor: i === 0 ? pr + '18' : pr + '06' }]}>
            <Text style={[pp.catChipTxt, { color: i === 0 ? pr : theme.textDim }]}>{c}</Text>
          </View>
        ))}
      </ScrollView>
      {/* Script cards */}
      {SCRIPTS.map(({ name, cat, color }) => (
        <View key={name} style={[pp.scriptCard, { backgroundColor: theme.panel, borderColor: color + '30', borderLeftColor: color }]}>
          <View style={[pp.scriptIcon, { borderColor: color + '40', backgroundColor: color + '12' }]}>
            <MaterialIcons name="code" size={16} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[pp.scriptName, { color: theme.textHi }]}>{name}</Text>
            <View style={[pp.scriptCatPill, { borderColor: color + '40', backgroundColor: color + '0C' }]}>
              <Text style={[pp.scriptCatTxt, { color: color + 'AA' }]}>{cat}</Text>
            </View>
          </View>
          <MaterialIcons name="play-arrow" size={20} color={color} />
        </View>
      ))}
    </View>
  );
}

// ─── Settings Preview ────────────────────────────────────────
function SettingsPreview({ theme }: { theme: AppTheme }) {
  const pr = theme.primary;
  return (
    <View style={{ padding: 14, gap: 10 }}>
      <Text style={[pp.sectionLabel, { color: pr + '80' }]}>SYSTEM CONFIG</Text>
      {/* Server card */}
      <View style={[pp.settingsCard, { backgroundColor: theme.panel, borderColor: pr + '35' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <MaterialIcons name="computer" size={16} color={pr} />
          <Text style={[pp.settingsCardTitle, { color: pr }]}>SERVER ADDRESS</Text>
        </View>
        {[['IP Address', '192.168.1.100'], ['Port', '8766']].map(([label, val]) => (
          <View key={label} style={[pp.settingsRow, { borderBottomColor: pr + '15' }]}>
            <Text style={[pp.settingsLabel, { color: theme.textMid }]}>{label}</Text>
            <Text style={[pp.settingsVal, { color: theme.textHi }]}>{val}</Text>
            <View style={[pp.settingsEditChip, { borderColor: pr + '40', backgroundColor: pr + '0A' }]}>
              <Text style={[pp.settingsEditTxt, { color: pr }]}>EDIT</Text>
            </View>
          </View>
        ))}
      </View>
      {/* Toggle rows */}
      <View style={[pp.settingsCard, { backgroundColor: theme.panel, borderColor: theme.borderColor }]}>
        {[
          { label: 'Auto-connect', sub: 'Connect on startup', on: true },
          { label: 'Haptics', sub: 'Vibration feedback', on: true },
          { label: 'Keep Screen On', sub: 'Prevent timeout', on: false },
        ].map(({ label, sub, on }, i, arr) => (
          <View key={label} style={[pp.toggleRow, i < arr.length - 1 && { borderBottomColor: pr + '15', borderBottomWidth: 1 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[pp.toggleLabel, { color: theme.textHi }]}>{label}</Text>
              <Text style={[pp.toggleSub, { color: theme.textDim }]}>{sub}</Text>
            </View>
            <View style={[pp.toggleTrack, { borderColor: on ? pr + '60' : theme.borderColor, backgroundColor: on ? pr + '18' : theme.bg }]}>
              <View style={[pp.toggleThumb, { backgroundColor: on ? pr : theme.textDim, alignSelf: on ? 'flex-end' : 'flex-start' }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const pp = StyleSheet.create({
  sectionLabel: { fontSize: 8, fontFamily: MONO, fontWeight: '900', letterSpacing: 2, marginBottom: 2 },
  fakeHeader:   { borderBottomWidth: 1, borderRadius: 10, padding: 12 },
  fakeLogo:     { width: 38, height: 38, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  fakeLogoInner:{ width: 14, height: 14, borderRadius: 4 },
  fakeTitle:    { fontSize: 17, fontWeight: '900', fontFamily: MONO },
  fakeSub:      { fontSize: 8, fontFamily: MONO, marginTop: 2 },
  fakeStatusPill:{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  fakeStatusDot: { width: 5, height: 5, borderRadius: 3 },
  fakeStatusTxt: { fontSize: 8, fontFamily: MONO, fontWeight: '900' },
  fakeCard:     { borderWidth: 1, borderLeftWidth: 3, borderRadius: 12, padding: 12, gap: 6, minHeight: 80, justifyContent: 'center' },
  fakeCardTxt:  { fontSize: 11, fontWeight: '700', fontFamily: MONO },
  fakeCardBar:  { height: 2, borderRadius: 1, width: '60%', marginTop: 4 },
  vitalsRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  vitalsLabel:  { width: 36, fontSize: 8, fontWeight: '900', fontFamily: MONO },
  vitalsTrack:  { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  vitalsBar:    { height: 6, borderRadius: 3 },
  vitalsVal:    { width: 36, fontSize: 9, fontFamily: MONO, fontWeight: '900', textAlign: 'right' },
  sysMsg:       { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  sysMsgTxt:    { fontSize: 9, fontFamily: MONO },
  aiAvatar:     { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 3, position: 'relative', overflow: 'hidden', flexShrink: 0 },
  aiEye:        { width: 5, height: 3.5, borderRadius: 2 },
  aiMouth:      { width: 9, height: 2, borderRadius: 1.5 },
  aiLed:        { position: 'absolute', bottom: -1, right: -1, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: '#000' },
  aiBubble:     { flex: 1, borderWidth: 1, borderLeftWidth: 3, borderRadius: 14, borderTopLeftRadius: 4, padding: 12, gap: 6 },
  userBubble:   { borderWidth: 1.5, borderRadius: 14, borderBottomRightRadius: 4, padding: 12, maxWidth: '70%' },
  userAvatar:   { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubbleTxt:    { fontSize: 11, lineHeight: 17, fontFamily: BODY },
  bubbleMeta:   { fontSize: 8, fontFamily: MONO, marginTop: 4 },
  inputBar:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 10, borderTopWidth: 1.5, borderRadius: 12, marginTop: 4 },
  inputConnBlock:{ width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 1 },
  inputConnLabel:{ fontSize: 6, fontWeight: '900', fontFamily: MONO },
  inputField:   { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  inputPlaceholder:{ fontSize: 12, fontFamily: BODY },
  sendBtn:      { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  searchBar:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  searchTxt:    { fontSize: 12, fontFamily: BODY },
  catChip:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  catChipTxt:   { fontSize: 9, fontFamily: MONO, fontWeight: '700' },
  scriptCard:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderLeftWidth: 3, borderRadius: 10, padding: 12 },
  scriptIcon:   { width: 36, height: 36, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  scriptName:   { fontSize: 12, fontWeight: '700', fontFamily: MONO, marginBottom: 4 },
  scriptCatPill:{ alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  scriptCatTxt: { fontSize: 7, fontFamily: MONO, fontWeight: '900' },
  settingsCard: { borderWidth: 1.5, borderRadius: 12, padding: 12 },
  settingsCardTitle:{ fontSize: 9, fontFamily: MONO, fontWeight: '900', letterSpacing: 1.5 },
  settingsRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  settingsLabel:{ flex: 1, fontSize: 10, fontFamily: MONO },
  settingsVal:  { fontSize: 12, fontFamily: MONO, fontWeight: '700', marginRight: 10 },
  settingsEditChip:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  settingsEditTxt:{ fontSize: 7, fontFamily: MONO, fontWeight: '900' },
  toggleRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  toggleLabel:  { fontSize: 12, fontWeight: '600', fontFamily: BODY },
  toggleSub:    { fontSize: 9, fontFamily: MONO, marginTop: 2 },
  toggleTrack:  { width: 38, height: 22, borderRadius: 11, borderWidth: 2, padding: 2, justifyContent: 'center' },
  toggleThumb:  { width: 14, height: 14, borderRadius: 7 },
});

const ip = StyleSheet.create({
  backdrop:    { flex: 1, justifyContent: 'flex-end' },
  sheet:       { height: SH * 0.92, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  scanLine:    { position: 'absolute', left: 0, right: 0, height: 3, zIndex: 0 },
  handle:      { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handleBar:   { width: 36, height: 4, borderRadius: 2 },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  themeCircle: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  themeName:   { fontSize: 16, fontFamily: MONO, fontWeight: '900', letterSpacing: 0.8 },
  themeTagline:{ fontSize: 9, fontFamily: MONO, marginTop: 2 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  badgeTxt:    { fontSize: 8, fontFamily: MONO, fontWeight: '900' },
  closeBtn:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tabsRow:     { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn:      { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabTxt:      { fontSize: 8, fontFamily: MONO, fontWeight: '900', letterSpacing: 1 },
  colorStrip:  { flexDirection: 'row', height: 40, margin: 12, gap: 4, borderRadius: 10, overflow: 'hidden' },
  colorBlock:  { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
  colorLabel:  { fontSize: 6, color: '#fff', fontFamily: MONO, textShadowColor: '#000', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  actions:     { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 28, borderTopWidth: 1 },
  cancelBtn:   { flex: 1, borderWidth: 1.5, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  cancelTxt:   { fontSize: 11, fontFamily: MONO, fontWeight: '900' },
  applyBtn:    { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15 },
  applyTxt:    { fontSize: 14, fontFamily: MONO, fontWeight: '900', color: '#000' },
});

// ─────────────────────────────────────────────
// THEME SWATCH MINI
// ─────────────────────────────────────────────
function ThemeSwatch({ theme, size = 36 }: { theme: AppTheme; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 4, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap' }}>
      <View style={{ width: size / 2, height: size / 2, backgroundColor: theme.primary }} />
      <View style={{ width: size / 2, height: size / 2, backgroundColor: theme.secondary }} />
      <View style={{ width: size / 2, height: size / 2, backgroundColor: theme.bg }} />
      <View style={{ width: size / 2, height: size / 2, backgroundColor: theme.tertiary }} />
    </View>
  );
}

// ─────────────────────────────────────────────
// INDIVIDUAL THEME ROW (inside tier card)
// ─────────────────────────────────────────────
function ThemeRow({ theme, isActive, onApply, onPreview, onLivePreview }: {
  theme: AppTheme;
  isActive: boolean;
  onApply: (t: AppTheme) => void;
  onPreview: (t: AppTheme) => void;
  onLivePreview: (t: AppTheme) => void;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const shimmer    = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    if (!isActive) return;
    const a = Animated.loop(
      Animated.timing(shimmer, { toValue: SW + 200, duration: 2500, useNativeDriver: true, easing: Easing.linear })
    );
    a.start();
    return () => a.stop();
  }, [isActive]);

  const handlePress = () => {
    haptics.heavy();
    Animated.sequence([
      Animated.timing(pressScale, { toValue: 0.95, duration: 80,  useNativeDriver: true }),
      Animated.timing(pressScale, { toValue: 1.02, duration: 120, useNativeDriver: true }),
      Animated.timing(pressScale, { toValue: 1,    duration: 80,  useNativeDriver: true }),
    ]).start();
    onApply(theme);
  };

  const pr = theme.primary;

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <TouchableOpacity
        style={[tr.card, {
          backgroundColor: isActive ? pr + '10' : '#0a0c14',
          borderColor: isActive ? pr + '70' : '#1a1e2a',
          borderLeftColor: pr,
        }]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        {/* Active shimmer */}
        {isActive ? (
          <Animated.View pointerEvents="none" style={[tr.shimmer, { transform: [{ translateX: shimmer }] }]} />
        ) : null}

        {/* Active ring */}
        {isActive ? (
          <View style={[tr.activeRing, { borderColor: pr + '80' }]} />
        ) : null}

        {/* Left swatch */}
        <ThemeSwatch theme={theme} size={46} />

        {/* Info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <Text style={[tr.name, { color: isActive ? pr : '#D5D9E0' }]}>{theme.name}</Text>
            {theme.badge ? (
              <View style={[tr.badge, { borderColor: pr + '55', backgroundColor: pr + '18' }]}>
                <Text style={[tr.badgeTxt, { color: pr }]}>{theme.badge}</Text>
              </View>
            ) : null}
            {isActive ? (
              <View style={[tr.activeBadge, { borderColor: '#00FF8860', backgroundColor: '#00FF8810' }]}>
                <MaterialIcons name="check" size={9} color="#00FF88" />
                <Text style={[tr.activeTxt]}>ACTIVE</Text>
              </View>
            ) : null}
          </View>
          <Text style={tr.tagline}>{theme.tagline}</Text>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
            {[theme.primary, theme.secondary, theme.tertiary].map((c, i) => (
              <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} />
            ))}
            <Text style={[tr.catLabel, { color: theme.textDim }]}>{theme.category}</Text>
          </View>
        </View>

        {/* Preview button */}
        <View style={{ gap: 4, alignItems: 'flex-end' }}>
          <TouchableOpacity
            onPress={() => { haptics.light(); onPreview(theme); }}
            style={[tr.previewBtn, { borderColor: pr + '50', backgroundColor: pr + '10' }]}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            activeOpacity={0.75}
          >
            <MaterialIcons name="fullscreen" size={12} color={pr} />
            <Text style={[tr.previewBtnTxt, { color: pr }]}>PREVIEW</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { haptics.medium(); onLivePreview(theme); }}
            style={[tr.previewBtn, { borderColor: '#00FF8860', backgroundColor: '#00FF8810' }]}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            activeOpacity={0.75}
          >
            <MaterialIcons name="visibility" size={12} color="#00FF88" />
            <Text style={[tr.previewBtnTxt, { color: '#00FF88' }]}>LIVE</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const tr = StyleSheet.create({
  card:      { borderWidth: 1, borderLeftWidth: 3, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, overflow: 'hidden', position: 'relative' },
  shimmer:   { position: 'absolute', top: 0, bottom: 0, width: 80, backgroundColor: 'rgba(255,255,255,0.035)', transform: [{ skewX: '-20deg' }] },
  activeRing:{ position: 'absolute', top: -1, left: -1, right: -1, bottom: -1, borderRadius: 13, borderWidth: 2 },
  name:      { fontSize: 11, fontFamily: MONO, fontWeight: '900', letterSpacing: 0.4 },
  tagline:   { fontSize: 8, color: '#525A68', fontFamily: MONO },
  badge:     { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5, borderWidth: 1 },
  badgeTxt:  { fontSize: 7, fontFamily: MONO, fontWeight: '900' },
  activeBadge:{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5, borderWidth: 1 },
  activeTxt: { fontSize: 7, fontFamily: MONO, fontWeight: '900', color: '#00FF88' },
  catLabel:  { fontSize: 8, fontFamily: MONO, marginLeft: 4 },
  previewBtn:{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7, flexShrink: 0 },
  previewBtnTxt:{ fontSize: 8, fontFamily: MONO, fontWeight: '900' },
});

// ─────────────────────────────────────────────
// TIER CARD
// ─────────────────────────────────────────────
function TierCard({ tierId, currentPackId, onApply, onPreview, onLivePreview }: {
  tierId: TierId;
  currentPackId: string;
  onApply: (id: string) => void;
  onPreview: (t: AppTheme) => void;
  onLivePreview: (t: AppTheme) => void;
}) {
  const cfg = TIER_CONFIG[tierId];
  const pr  = cfg.color;
  const [expanded, setExpanded] = useState(tierId === 'free' || false);
  const expandAnim = useRef(new Animated.Value(tierId === 'free' ? 1 : 0)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;

  const isFree    = tierId === 'free';
  const isPopular = (cfg as any).isPopular;
  const themes    = cfg.themeIds.map(id => PACK_THEMES[id]).filter(Boolean);
  const hasActive = cfg.themeIds.includes(currentPackId);

  useEffect(() => {
    if (!isPopular) return;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0, duration: 1800, useNativeDriver: false }),
    ]));
    a.start();
    return () => a.stop();
  }, [isPopular]);

  const toggleExpand = () => {
    haptics.light();
    const next = !expanded;
    setExpanded(next);
    Animated.timing(expandAnim, { toValue: next ? 1 : 0, duration: 300, useNativeDriver: false }).start();
  };

  const borderColor = isPopular
    ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: [pr + '60', pr + 'BB'] })
    : pr + '50';

  const CardBorder = isPopular ? Animated.View : View;
  const borderStyle = isPopular
    ? { borderColor: borderColor, borderWidth: 2, borderRadius: 18 }
    : { borderColor: pr + '50', borderWidth: isFree ? 1.5 : 1.5, borderRadius: 18 };

  return (
    <CardBorder style={[tc2.outerWrap, borderStyle, { marginBottom: 14 }]}>
      <View style={[tc2.card, { backgroundColor: pr + '05' }]}>
        {/* Popular / Elite glow top bar */}
        {(isPopular || tierId === 'elite') ? (
          <View style={[tc2.topBar, { backgroundColor: pr }]} />
        ) : null}

        {/* TIER HEADER */}
        <TouchableOpacity onPress={toggleExpand} style={tc2.headerRow} activeOpacity={0.85}>
          {/* Icon */}
          <View style={[tc2.iconBox, { borderColor: pr + '50', backgroundColor: pr + '12' }]}>
            <MaterialCommunityIcons name={cfg.icon} size={26} color={pr} />
          </View>

          {/* Name + price */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <Text style={[tc2.tierName, { color: pr }]}>{cfg.name}</Text>
              {isPopular ? (
                <View style={[tc2.popularChip, { borderColor: pr + '60', backgroundColor: pr + '18' }]}>
                  <MaterialIcons name="star" size={9} color={pr} />
                  <Text style={[tc2.popularTxt, { color: pr }]}>POPULAR</Text>
                </View>
              ) : null}
              {tierId === 'elite' ? (
                <View style={[tc2.popularChip, { borderColor: pr + '60', backgroundColor: pr + '18' }]}>
                  <MaterialCommunityIcons name="diamond-stone" size={9} color={pr} />
                  <Text style={[tc2.popularTxt, { color: pr }]}>BEST VALUE</Text>
                </View>
              ) : null}
              {hasActive && !isFree ? (
                <View style={[tc2.popularChip, { borderColor: '#00FF8860', backgroundColor: '#00FF8812' }]}>
                  <MaterialIcons name="check-circle" size={9} color="#00FF88" />
                  <Text style={[tc2.popularTxt, { color: '#00FF88' }]}>OWNED</Text>
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 3 }}>
              <Text style={[tc2.price, { color: pr }]}>{cfg.price}</Text>
              {!isFree ? <Text style={tc2.pricePeriod}>one-time</Text> : null}
            </View>
            {/* Theme swatches preview */}
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
              {themes.slice(0, 7).map(t => (
                <ThemeSwatch key={t.id} theme={t} size={18} />
              ))}
              {themes.length > 7 ? (
                <View style={[tc2.morePill, { borderColor: pr + '40', backgroundColor: pr + '0A' }]}>
                  <Text style={[tc2.moreTxt, { color: pr }]}>+{themes.length - 7}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Expand arrow */}
          <MaterialIcons
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={22} color={pr + '80'}
          />
        </TouchableOpacity>

        {/* Features list */}
        <View style={[tc2.featuresList, { borderTopColor: pr + '18' }]}>
          {cfg.features.map((f, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <MaterialIcons name="check" size={12} color={pr + 'CC'} style={{ marginTop: 1.5, flexShrink: 0 }} />
              <Text style={[tc2.featureTxt, { color: pr + 'BB' }]}>{f}</Text>
            </View>
          ))}
        </View>

        {/* EXPANDED: theme rows */}
        {expanded ? (
          <View style={[tc2.themesSection, { borderTopColor: pr + '18' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <MaterialIcons name="palette" size={12} color={pr + '80'} />
              <Text style={[tc2.themesLabel, { color: pr + '90' }]}>
                {themes.length} {themes.length === 1 ? 'THEME' : 'THEMES'} INCLUDED
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              {themes.map(t => (
                <ThemeRow
                  key={t.id}
                  theme={t}
                  isActive={t.id === currentPackId}
                  onApply={(th) => onApply(th.id)}
                  onPreview={onPreview}
                  onLivePreview={onLivePreview}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* CTA */}
        {isFree ? (
          <TouchableOpacity
            style={[tc2.freeBtn, { borderColor: pr + '50', backgroundColor: pr + '0C' }]}
            onPress={() => { haptics.medium(); if (themes[0]) onApply(themes[0].id); }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="check-circle" size={16} color={currentPackId === 'nexus' ? '#00FF88' : pr} />
            <Text style={[tc2.freeBtnTxt, { color: currentPackId === 'nexus' ? '#00FF88' : pr }]}>
              {currentPackId === 'nexus' ? 'ACTIVE — DEFAULT THEME' : 'APPLY DEFAULT THEME'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[tc2.donateBtn, { backgroundColor: pr }]}
            onPress={() => {
              haptics.heavy();
              // Play Store IAP will be linked here
              // For now, open themes to preview
              setExpanded(true);
              Animated.timing(expandAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
            }}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="heart-outline" size={16} color="#000" />
            <Text style={tc2.donateBtnTxt}>SUPPORT DEV · {cfg.price}</Text>
            <Text style={tc2.donateSub}>(coming to Play Store)</Text>
          </TouchableOpacity>
        )}
      </View>
    </CardBorder>
  );
}

const tc2 = StyleSheet.create({
  outerWrap:   { overflow: 'hidden' },
  card:        { borderRadius: 18, padding: 15, gap: 0 },
  topBar:      { height: 4, borderTopLeftRadius: 18, borderTopRightRadius: 18, marginHorizontal: -15, marginTop: -15, marginBottom: 15 },
  headerRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  iconBox:     { width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tierName:    { fontSize: 13, fontFamily: MONO, fontWeight: '900', letterSpacing: 0.8 },
  price:       { fontSize: 24, fontFamily: MONO, fontWeight: '900' },
  pricePeriod: { fontSize: 9, color: '#525A68', fontFamily: MONO, letterSpacing: 0.5 },
  popularChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  popularTxt:  { fontSize: 7, fontFamily: MONO, fontWeight: '900', letterSpacing: 0.4 },
  morePill:    { width: 18, height: 18, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  moreTxt:     { fontSize: 6, fontFamily: MONO, fontWeight: '900' },
  featuresList:{ gap: 7, borderTopWidth: 1, paddingTop: 10, marginBottom: 10 },
  featureTxt:  { flex: 1, fontSize: 9, fontFamily: MONO, lineHeight: 14 },
  themesSection:{ borderTopWidth: 1, paddingTop: 12, marginBottom: 12 },
  themesLabel: { fontSize: 8, fontFamily: MONO, fontWeight: '900', letterSpacing: 1.5 },
  freeBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, paddingVertical: 13 },
  freeBtnTxt:  { fontSize: 11, fontFamily: MONO, fontWeight: '900' },
  donateBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13, flexWrap: 'wrap' },
  donateBtnTxt:{ fontSize: 13, fontWeight: '900', fontFamily: MONO, color: '#000' },
  donateSub:   { fontSize: 8, fontFamily: MONO, color: '#00000090', width: '100%', textAlign: 'center', marginTop: -4 },
});

// ─────────────────────────────────────────────
// LIVE BANNER — annotated token showcase
// Animated pointer arrows teach users what
// each color token controls in the real app
// ─────────────────────────────────────────────
const TOKEN_ANNOTATIONS = [
  { token: 'PRIMARY', desc: 'Accent color — buttons, active tab, borders, icons, AI robot eyes', target: 'header' },
  { token: 'SECONDARY', desc: 'Secondary actions — chat input ring, secondary stat chips, progress fill', target: 'dots' },
  { token: 'TERTIARY', desc: 'Tertiary accents — third-level highlights, category tags, graph bars', target: 'dots' },
  { token: 'BG', desc: 'App background — every screen dark base', target: 'tabbar' },
  { token: 'PANEL', desc: 'Card & header background — panels, modals, wsBar surface', target: 'header' },
  { token: 'TEXT', desc: 'Primary text — script names, stat values, bubble content', target: 'tabbar' },
  { token: 'AI BUBBLE', desc: 'AI chat message bubble background — Butler AI responses', target: 'header' },
  { token: 'USER BUBBLE', desc: 'Your message bubble — everything you send to Butler AI', target: 'header' },
];

function LiveActiveBanner({ theme }: { theme: AppTheme }) {
  const pr = theme.primary;
  const sc = theme.secondary;
  const tc = theme.tertiary;
  const pulse = useRef(new Animated.Value(0)).current;
  const arrowBounce = useRef(new Animated.Value(0)).current;
  const [annoIdx, setAnnoIdx] = useState(0);
  const fadeAnno = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: false }),
    ]));
    const b = Animated.loop(Animated.sequence([
      Animated.timing(arrowBounce, { toValue: -5, duration: 500, useNativeDriver: true }),
      Animated.timing(arrowBounce, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]));
    a.start(); b.start();
    // Cycle annotations every 2.5s
    const t = setInterval(() => {
      Animated.timing(fadeAnno, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setAnnoIdx(i => (i + 1) % TOKEN_ANNOTATIONS.length);
        Animated.timing(fadeAnno, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, 2500);
    return () => { a.stop(); b.stop(); clearInterval(t); };
  }, [theme.id]);

  const borderCol = pulse.interpolate({ inputRange: [0, 1], outputRange: [pr + '35', pr + '80'] });
  const anno = TOKEN_ANNOTATIONS[annoIdx];

  return (
    <Animated.View style={[lab.wrap, { backgroundColor: theme.panel, borderColor: borderCol }]}>
      {/* Mini fake app header */}
      <View style={[lab.miniHeader, { backgroundColor: theme.bg, borderBottomColor: pr + '30' }]}>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {[pr, sc, tc].map((c, i) => <View key={i} style={[lab.dot, { backgroundColor: c }]} />)}
        </View>
        <Text style={[lab.headerTitle, { color: pr }]}>BUTLER AI — {theme.name}</Text>
        <View style={[lab.livePill, { borderColor: '#00FF8850', backgroundColor: '#00FF8810' }]}>
          <View style={[lab.liveDot, { backgroundColor: '#00FF88' }]} />
          <Text style={[lab.liveTxt]}>LIVE</Text>
        </View>
      </View>

      {/* Annotation pointer overlay */}
      <Animated.View style={[lab.annotation, { opacity: fadeAnno, borderColor: pr + '40', backgroundColor: pr + '08' }]}>
        <Animated.View style={{ transform: [{ translateY: arrowBounce }] }}>
          <MaterialIcons name="arrow-upward" size={14} color={pr} />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[lab.tokenChip, { borderColor: pr + '60', backgroundColor: pr + '18' }]}>
              <Text style={[lab.tokenChipTxt, { color: pr }]}>{anno.token}</Text>
            </View>
            <Text style={[lab.annoDesc, { color: theme.textMid || theme.textDim }]} numberOfLines={2}>{anno.desc}</Text>
          </View>
        </View>
        <Text style={[lab.annoStep, { color: pr + '60' }]}>{annoIdx + 1}/{TOKEN_ANNOTATIONS.length}</Text>
      </Animated.View>

      {/* Color grid */}
      <View style={lab.colorGrid}>
        {[
          { label: 'PRIMARY', col: pr },
          { label: 'SECONDARY', col: sc },
          { label: 'TERTIARY', col: tc },
          { label: 'BG', col: theme.bg },
          { label: 'PANEL', col: theme.panel },
          { label: 'TEXT', col: theme.textHi },
        ].map(({ label, col }) => {
          const isActive = anno.token === label;
          return (
            <View key={label} style={[lab.colorItem, isActive && { transform: [{ scale: 1.12 }] }]}>
              <Animated.View style={[
                lab.colorCircle,
                { backgroundColor: col, borderColor: isActive ? pr : '#ffffff20' },
                isActive && { borderWidth: 2.5, ...Platform.select({ ios: { shadowColor: col, shadowOffset:{width:0,height:0}, shadowOpacity:0.8, shadowRadius:8 }, android:{} }) }
              ]} />
              <Text style={[lab.colorName, { color: isActive ? pr : theme.textDim, fontWeight: isActive ? '900' : '400' }]}>{label}</Text>
            </View>
          );
        })}
      </View>

      {/* Mini tab bar */}
      <View style={[lab.tabBar, { backgroundColor: theme.bg, borderTopColor: pr + '20' }]}>
        {['HOME', 'AI', 'SCRIPTS', 'KB', '⚙'].map((l, i) => (
          <View key={l} style={{ flex: 1, alignItems: 'center', position: 'relative' }}>
            {i === 0 ? <View style={[lab.activeBar, { backgroundColor: pr }]} /> : null}
            <Text style={[lab.tabLabel, { color: i === 0 ? pr : theme.textDim }]}>{l}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const lab = StyleSheet.create({
  wrap:       { borderWidth: 1.5, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  miniHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  dot:        { width: 7, height: 7, borderRadius: 4 },
  headerTitle:{ flex: 1, fontSize: 9, fontFamily: MONO, fontWeight: '900', letterSpacing: 1 },
  livePill:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  liveDot:    { width: 5, height: 5, borderRadius: 3 },
  liveTxt:    { fontSize: 7, fontFamily: MONO, fontWeight: '900', color: '#00FF88' },
  annotation: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  tokenChip:  { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1.5, flexShrink: 0 },
  tokenChipTxt:{ fontSize: 8, fontFamily: MONO, fontWeight: '900', letterSpacing: 0.5 },
  annoDesc:   { flex: 1, fontSize: 9, fontFamily: MONO, lineHeight: 13 },
  annoStep:   { fontSize: 8, fontFamily: MONO, flexShrink: 0 },
  colorGrid:  { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  colorItem:  { alignItems: 'center', gap: 5, width: (SW - 60) / 6 },
  colorCircle:{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5 },
  colorName:  { fontSize: 6, fontFamily: MONO, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center' },
  tabBar:     { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 8 },
  activeBar:  { position: 'absolute', top: -8, left: '15%', right: '15%', height: 2.5, borderRadius: 1.5 },
  tabLabel:   { fontSize: 7, fontFamily: MONO, fontWeight: '900', letterSpacing: 0.5 },
});

// ─────────────────────────────────────────────
// PREVIEW BANNER — floating during preview mode
// Shows current active tab + theme name
// ─────────────────────────────────────────────
const TAB_LABELS: Record<string, string> = {
  index: 'HOME', home: 'HOME', nexushome: 'HOME',
  butler: 'AI CHAT', scripts: 'SCRIPTS', knowledge: 'KNOWLEDGE',
  fileshare: 'TOOLS', terminal: 'TERMINAL', logs: 'PC CHECK',
  builder: 'BUILDER', support: 'SKINS', settings: 'SETTINGS',
};

function PreviewModeBanner({ theme, onApply, onCancel }: {
  theme: AppTheme;
  onApply: () => void;
  onCancel: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pr = theme.primary;
  const [currentTab, setCurrentTab] = useState<string>('SKINS');

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }).start();
    // Log preview activation for testing
    console.log('[BUTLER_SKINS] 🎨 PREVIEW ACTIVATED — theme:', theme.name, '| id:', theme.id, '| primary:', theme.primary);
  }, []);

  // Track current tab via global
  useEffect(() => {
    const readTab = () => {
      const raw: string = (global as any).__activeTab || 'support';
      setCurrentTab(TAB_LABELS[raw] || raw.toUpperCase());
    };
    readTab();
    const t = setInterval(readTab, 800);
    return () => clearInterval(t);
  }, []);

  return (
    <Animated.View style={[pmb.wrap, { borderColor: pr + '70', backgroundColor: pr + '12', transform: [{ translateY: slideAnim }] }]}>
      {/* Eye icon */}
      <View style={[pmb.eyeIcon, { backgroundColor: pr + '20', borderColor: pr + '50' }]}>
        <MaterialIcons name="visibility" size={14} color={pr} />
      </View>

      {/* Info: tab + theme name */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[pmb.label, { color: pr }]}>PREVIEWING: {theme.name}</Text>
          {/* Current tab pill */}
          <View style={[pmb.tabPill, { borderColor: pr + '55', backgroundColor: pr + '18' }]}>
            <MaterialIcons name="tab" size={9} color={pr + 'CC'} />
            <Text style={[pmb.tabTxt, { color: pr }]}>{currentTab}</Text>
          </View>
        </View>
        <Text style={[pmb.sub, { color: pr + '70' }]}>Browse any tab — theme applies live everywhere</Text>
      </View>

      {/* Actions */}
      <TouchableOpacity onPress={onCancel} style={[pmb.cancelBtn, { borderColor: pr + '40' }]} activeOpacity={0.8}>
        <Text style={[pmb.cancelTxt, { color: pr + '80' }]}>CANCEL</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onApply} style={[pmb.applyBtn, { backgroundColor: pr }]} activeOpacity={0.85}>
        <Text style={pmb.applyTxt}>APPLY</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const pmb = StyleSheet.create({
  wrap:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 14, marginBottom: 8, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  eyeIcon:   { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  label:     { fontSize: 10, fontFamily: MONO, fontWeight: '900', letterSpacing: 0.5 },
  sub:       { fontSize: 8, fontFamily: MONO, marginTop: 1 },
  tabPill:   { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  tabTxt:    { fontSize: 7, fontFamily: MONO, fontWeight: '900', letterSpacing: 0.5 },
  cancelBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5 },
  cancelTxt: { fontSize: 9, fontFamily: MONO, fontWeight: '900' },
  applyBtn:  { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  applyTxt:  { fontSize: 9, fontFamily: MONO, fontWeight: '900', color: '#000' },
});

// ─────────────────────────────────────────────
// CHAMPION HOLO REVIEW REWARD CARD
// Exclusive theme earned by leaving a review
// ─────────────────────────────────────────────
function ChampionHoloCard({ isUnlocked, currentPackId, onApply, onPreview, onLivePreview, onVerify }: {
  isUnlocked: boolean;
  currentPackId: string;
  onApply: (id: string) => void;
  onPreview: (t: AppTheme) => void;
  onLivePreview: (t: AppTheme) => void;
  onVerify: () => void;
}) {
  const theme = PACK_THEMES.champion_holo;
  const pr = theme.primary;
  const isActive = currentPackId === 'champion_holo';
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shimmer  = useRef(new Animated.Value(-SW)).current;

  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
    ]));
    const sh = Animated.loop(
      Animated.timing(shimmer, { toValue: SW * 2, duration: 3500, useNativeDriver: true, easing: Easing.linear })
    );
    a.start(); sh.start();
    return () => { a.stop(); sh.stop(); };
  }, []);

  // Cycling holo colors for the border
  const borderCol = glowAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['#FFC400', '#00FFEE', '#FFEE00', '#FF6A1F', '#FFC400'],
  });

  const COLORS = ['#FFC400', '#00FFEE', '#FFEE00', '#FF6A1F', '#44AAFF'];

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Section label */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: pr }} />
        <Text style={{ fontSize: 9, fontFamily: MONO, fontWeight: '900', letterSpacing: 2, color: '#525A68' }}>REVIEW REWARD</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: pr + '20' }} />
        {isUnlocked ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#00FF8815', borderWidth: 1, borderColor: '#00FF8850' }}>
            <Text style={{ fontSize: 7, fontFamily: MONO, fontWeight: '900', color: '#00FF88' }}>OWNED</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: pr + '15', borderWidth: 1, borderColor: pr + '40' }}>
            <Text style={{ fontSize: 7, fontFamily: MONO, fontWeight: '900', color: pr }}>CANNOT BE PURCHASED</Text>
          </View>
        )}
      </View>

      {/* Card */}
      <Animated.View style={[{
        borderRadius: 18, borderWidth: 2, overflow: 'hidden',
        borderColor: borderCol,
      }]}>
        {/* Shimmer overlay */}
        <Animated.View pointerEvents="none" style={[{
          position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
          transform: [{ translateX: shimmer }, { skewX: '-20deg' }],
          backgroundColor: 'rgba(255,255,255,0.04)', width: 100, zIndex: 10,
        }]} />

        {/* Header gradient bar */}
        <View style={{ height: 3, flexDirection: 'row' }}>
          {COLORS.map((c, i) => <View key={i} style={{ flex: 1, backgroundColor: c }} />)}
        </View>

        <View style={{ backgroundColor: '#08040e', padding: 14 }}>
          {/* Title row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {/* Holo icon box */}
            <View style={{ width: 56, height: 56, borderRadius: 14, borderWidth: 2, borderColor: pr, backgroundColor: pr + '15',
              alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
              {/* Rainbow corner squares */}
              {COLORS.map((c, i) => (
                <View key={i} style={{ position: 'absolute', width: 10, height: 10, backgroundColor: c + '80',
                  top: i < 2 ? 0 : undefined, bottom: i >= 2 ? 0 : undefined,
                  left: i % 2 === 0 ? 0 : undefined, right: i % 2 === 1 ? 0 : undefined }} />
              ))}
              <MaterialCommunityIcons name="star-shooting" size={26} color={pr} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 14, fontFamily: MONO, fontWeight: '900', color: pr, letterSpacing: 0.8 }}>CHAMPION HOLO</Text>
                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: pr + '60', backgroundColor: pr + '18' }}>
                  <Text style={{ fontSize: 7, fontFamily: MONO, fontWeight: '900', color: pr }}>★ REVIEW</Text>
                </View>
              </View>
              <Text style={{ fontSize: 9, fontFamily: MONO, color: '#9966CC' }}>Review Reward — Exclusive</Text>
              <Text style={{ fontSize: 9, fontFamily: MONO, color: '#6A4A88', marginTop: 2 }}>Holographic · Rare · Community</Text>
              {/* Color swatches */}
              <View style={{ flexDirection: 'row', gap: 5, marginTop: 8 }}>
                {COLORS.map((c, i) => <View key={i} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: c, opacity: 0.85 }} />)}
              </View>
            </View>
          </View>

          {/* Description */}
          <Text style={{ fontSize: 11, fontFamily: MONO, color: '#7A5A99', lineHeight: 17, marginBottom: 14 }}>
            The rarest Butler AI theme — earned, not bought. Holographic iridescent panels shift between every color.
          </Text>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {isUnlocked ? (
              <>
                <TouchableOpacity
                  onPress={() => { haptics.light(); onPreview(theme); }}
                  style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                    borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, borderColor: pr + '60', backgroundColor: pr + '10' }]}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="fullscreen" size={13} color={pr} />
                  <Text style={{ fontSize: 9, fontFamily: MONO, fontWeight: '900', color: pr }}>PREVIEW (3)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { haptics.medium(); onLivePreview(theme); }}
                  style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                    borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, borderColor: '#00FF8860', backgroundColor: '#00FF8810' }]}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="visibility" size={13} color="#00FF88" />
                  <Text style={{ fontSize: 9, fontFamily: MONO, fontWeight: '900', color: '#00FF88' }}>LIVE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { haptics.heavy(); onApply('champion_holo'); }}
                  style={[{ flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    borderRadius: 12, paddingVertical: 12, backgroundColor: isActive ? '#00FF88' : pr }]}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name={isActive ? 'check-circle' : 'palette'} size={16} color="#000" />
                  <Text style={{ fontSize: 12, fontFamily: MONO, fontWeight: '900', color: '#000' }}>
                    {isActive ? '✓ ACTIVE' : 'APPLY'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={onVerify}
                style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  borderWidth: 2, borderRadius: 12, paddingVertical: 14, borderColor: pr,
                  backgroundColor: pr + '10',
                }]}
                activeOpacity={0.85}
              >
                <MaterialIcons name="star" size={18} color={pr} />
                <Text style={{ fontSize: 13, fontFamily: MONO, fontWeight: '900', color: pr }}>VERIFY REVIEW →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}


// ─────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────
export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const { T, currentPackId, activePackId, applyPack, startPreview, endPreview, confirmPreview, isPreviewMode, previewTheme, reviewRewardUnlocked, setReviewRewardUnlocked } = useCosmetic();

  const [previewModalTheme, setPreviewModalTheme] = useState<AppTheme | null>(null);
  const [showPreviewModal,  setShowPreviewModal]  = useState(false);
  const [justApplied,       setJustApplied]       = useState<string | null>(null);
  const toastAnim  = useRef(new Animated.Value(0)).current;
  const toastSlide = useRef(new Animated.Value(-60)).current;

  const accentColor  = T.primary || '#FF2A1F';
  const activeTheme  = PACK_THEMES[currentPackId] || PACK_THEMES.nexus;

  const showToast = useCallback((name: string) => {
    setJustApplied(name);
    Animated.parallel([
      Animated.timing(toastAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(toastSlide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastAnim,  { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(toastSlide, { toValue: -60, duration: 300, useNativeDriver: true }),
      ]).start(() => setJustApplied(null));
    }, 2200);
  }, []);

  const handleApply = useCallback((packId: string) => {
    haptics.heavy();
    applyPack(packId);
    const t = PACK_THEMES[packId];
    endPreview();
    showToast(t?.name || packId);
  }, [applyPack, endPreview, showToast]);

  const handlePreview = useCallback((theme: AppTheme) => {
    setPreviewModalTheme(theme);
    setShowPreviewModal(true);
  }, []);

  const handleLivePreview = useCallback((theme: AppTheme) => {
    haptics.medium();
    // Logger guard — verify preview wires through correctly
    console.log('[BUTLER_SKINS] 🔴 LIVE PREVIEW triggered:', {
      themeId: theme.id,
      themeName: theme.name,
      primary: theme.primary,
      bg: theme.bg,
      tier: theme.tier,
      timestamp: new Date().toISOString(),
    });
    startPreview(theme.id);
    // Verify context received it
    setTimeout(() => {
      const confirmed = (global as any).__cosmeticPreviewId;
      console.log('[BUTLER_SKINS] ✅ Preview context confirmed ID:', confirmed, '| Expected:', theme.id);
    }, 150);
  }, [startPreview]);

  const handleConfirmPreview = useCallback(() => {
    haptics.heavy();
    confirmPreview();
    const t = previewTheme;
    if (t) {
      showToast(t.name);
      console.log('[BUTLER_SKINS] ✅ PREVIEW CONFIRMED — theme applied permanently:', t.id);
    }
  }, [confirmPreview, previewTheme, showToast]);

  const TIER_ORDER: TierId[] = ['free', 'supporter', 'pro', 'elite'];

  // Champion Holo review-reward handler
  const handleVerifyReview = useCallback(() => {
    haptics.heavy();
    Alert.alert(
      '⭐ VERIFY PLAY STORE REVIEW',
      'To unlock CHAMPION HOLO:\n\n1. Rate Butler AI on Google Play\n2. Leave any review (1–5 stars)\n3. Come back and tap VERIFY\n\nOnce your review is live, the theme unlocks permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OPEN PLAY STORE',
          onPress: () => {
            const { Linking } = require('react-native');
            Linking.openURL('market://details?id=com.butlerai.pc.automation').catch(() =>
              Linking.openURL('https://play.google.com/store/apps/details?id=com.butlerai.pc.automation')
            );
            // After a delay, show confirmation prompt
            setTimeout(() => {
              Alert.alert(
                'MARK AS REVIEWED?',
                'Did you leave a review on Google Play?\n\nOnce you confirm, CHAMPION HOLO will be unlocked permanently on this device.',
                [
                  { text: 'Not Yet', style: 'cancel' },
                  {
                    text: 'YES — UNLOCK THEME',
                    onPress: async () => {
                      await grantReviewReward();
                      setReviewRewardUnlocked(true);
                      haptics.success();
                      Alert.alert('🎉 CHAMPION HOLO UNLOCKED!', 'The rarest Butler AI theme is now yours forever. Thank you for the review!');
                    },
                  },
                ]
              );
            }, 3000);
          },
        },
        {
          text: 'ALREADY REVIEWED',
          onPress: async () => {
            await grantReviewReward();
            setReviewRewardUnlocked(true);
            haptics.success();
            Alert.alert('🎉 CHAMPION HOLO UNLOCKED!', 'Thank you for your support!');
          },
        },
      ]
    );
  }, [setReviewRewardUnlocked]);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>

      {/* Apply toast */}
      {justApplied ? (
        <Animated.View style={[s.toast, {
          opacity: toastAnim,
          transform: [{ translateY: toastSlide }],
          borderColor: accentColor + '60',
          backgroundColor: T.panel,
        }]}>
          <MaterialIcons name="check-circle" size={16} color={accentColor} />
          <Text style={[s.toastTxt, { color: accentColor }]}>
            {justApplied} — APPLIED TO ENTIRE APP
          </Text>
        </Animated.View>
      ) : null}

      {/* Preview mode floating banner */}
      {isPreviewMode && previewTheme ? (
        <PreviewModeBanner
          theme={previewTheme}
          onApply={handleConfirmPreview}
          onCancel={endPreview}
        />
      ) : null}

      {/* Full-screen immersive preview modal */}
      <ImmersivePreview
        theme={previewModalTheme}
        visible={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onApply={(t) => handleApply(t.id)}
        isActive={previewModalTheme?.id === currentPackId}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160, paddingHorizontal: 14, paddingTop: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HEADER ── */}
        <View style={s.pageHeader}>
          <MaterialCommunityIcons name="palette" size={18} color={accentColor} />
          <Text style={[s.pageTitle, { color: accentColor }]}>COSMETIC PACKS</Text>
          <View style={{ flex: 1 }} />
          <View style={[s.headerChip, { borderColor: accentColor + '40', backgroundColor: accentColor + '0C' }]}>
            <Text style={[s.headerChipTxt, { color: accentColor + '90' }]}>
              {Object.keys(PACK_THEMES).length} THEMES
            </Text>
          </View>
        </View>
        <Text style={[s.headerSub, { color: T.textDim }]}>
          Themes apply instantly to every page — header, tabs, chat, cards, backgrounds, text and font colors. Support the dev to unlock more.
        </Text>

        {/* ── LIVE ACTIVE THEME SHOWCASE ── */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={[s.sectionHead, { color: accentColor }]}>◈ ACTIVE THEME</Text>
            <View style={[s.liveTag, { borderColor: accentColor + '55', backgroundColor: accentColor + '12' }]}>
              <Animated.View style={[s.liveDot, { backgroundColor: accentColor }]} />
              <Text style={[s.liveTagTxt, { color: accentColor }]}>LIVE EVERYWHERE</Text>
            </View>
          </View>
          <LiveActiveBanner theme={isPreviewMode && previewTheme ? previewTheme : activeTheme} />
        </View>

        {/* ── BUTLER AI DONATION SUPPORT CARD ── */}
        <View style={[s.donationCard, { borderColor: accentColor + '50', borderWidth: 2 }]}>
          <View style={[s.donationTopBar, { backgroundColor: accentColor }]} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={[s.donationIconBox, { borderColor: accentColor, backgroundColor: accentColor + '12' }]}>
              <MaterialIcons name="favorite" size={22} color={accentColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.donationTitle, { color: accentColor }]}>SUPPORT BUTLER AI</Text>
              <Text style={[s.donationSub, { color: T.textDim }]}>FREE FOREVER · DONATION POWERED</Text>
            </View>
            <View style={[s.donationBadge, { borderColor: accentColor + '50', backgroundColor: accentColor + '10' }]}>
              <MaterialIcons name="verified" size={11} color={accentColor} />
              <Text style={[s.donationBadgeTxt, { color: accentColor }]}>100% FREE</Text>
            </View>
          </View>
          <Text style={[s.donationDesc, { color: T.textDim }]}>
            Butler AI is completely free, self-hosted, and never collects your data. Every feature is permanently free.
            Donations fund new scripts, AI model integrations, faster bug fixes, and keep the project alive.
          </Text>
          {/* Mission statement from old Cosmetics page */}
          <View style={[s.missionBox, { borderColor: accentColor + '25', backgroundColor: accentColor + '07' }]}>
            <MaterialIcons name="shield" size={12} color={accentColor + '80'} />
            <Text style={[s.missionTxt, { color: accentColor + 'AA' }]}>
              Butler AI operates with zero cloud servers, zero tracking, and zero hidden fees. Support the solo development
              to unlock exclusive cosmetic system protocols and keep the automation engine growing.
            </Text>
          </View>
          {/* Features from old page */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {[
              { icon: 'lock', label: '100% PRIVATE' },
              { icon: 'cloud-off', label: 'NO CLOUD' },
              { icon: 'home', label: 'SELF-HOSTED' },
              { icon: 'security', label: 'SANDBOXED' },
            ].map(({ icon, label }) => (
              <View key={label} style={[s.complianceChip, { borderColor: accentColor + '40', backgroundColor: accentColor + '0A' }]}>
                <MaterialIcons name={icon as any} size={10} color={accentColor} />
                <Text style={[s.complianceChipTxt, { color: accentColor }]}>{label}</Text>
              </View>
            ))}
          </View>
          {/* Play Store IAP placeholder - no PayPal */}
          <View style={[s.iapBox, { borderColor: accentColor + '30', backgroundColor: accentColor + '06' }]}>
            <MaterialIcons name="store" size={14} color={accentColor} />
            <View style={{ flex: 1 }}>
              <Text style={[s.iapTitle, { color: accentColor }]}>PLAY STORE SUPPORT — COMING SOON</Text>
              <Text style={[s.iapDesc, { color: T.textDim }]}>Unlock premium theme packs through Google Play Billing. Once published, purchase cosmetic packs to support development.</Text>
            </View>
          </View>
          {/* Show themes to support below */}
          <TouchableOpacity
            style={[s.supportBtn, { borderColor: accentColor + '60', backgroundColor: accentColor + '12' }]}
            onPress={() => {
              haptics.medium();
              // Scroll to tier cards
            }}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="palette" size={16} color={accentColor} />
            <Text style={[s.supportBtnTxt, { color: accentColor }]}>BROWSE THEME PACKS BELOW</Text>
          </TouchableOpacity>
        </View>

        {/* ── WHAT CHANGES INFO BOX ── */}
        <View style={[s.infoBox, { borderColor: accentColor + '25', backgroundColor: accentColor + '07' }]}>
          <MaterialIcons name="info-outline" size={13} color={accentColor + '70'} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[s.infoTitle, { color: accentColor + 'AA' }]}>WHAT THEMES CHANGE</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {['App background', 'Header & nav', 'Tab bar colors', 'Chat bubbles', 'Input bars', 'Cards & panels', 'Accent colors', 'Text colors', 'Borders & glows', 'Icons & badges'].map(item => (
                <View key={item} style={[s.changeChip, { borderColor: accentColor + '30', backgroundColor: accentColor + '08' }]}>
                  <MaterialIcons name="check" size={9} color={accentColor + 'AA'} />
                  <Text style={[s.changeChipTxt, { color: accentColor + '90' }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── CHAMPION HOLO REVIEW REWARD ── */}
        <ChampionHoloCard
          isUnlocked={reviewRewardUnlocked}
          currentPackId={currentPackId}
          onApply={handleApply}
          onPreview={handlePreview}
          onLivePreview={handleLivePreview}
          onVerify={handleVerifyReview}
        />

        {/* ── TIER CARDS ── */}
        <View style={[s.section, { marginTop: 8 }]}>
          <Text style={[s.sectionHead, { color: accentColor, marginBottom: 14 }]}>◈ THEME TIERS</Text>

          {TIER_ORDER.map(tierId => (
            <TierCard
              key={tierId}
              tierId={tierId}
              currentPackId={currentPackId}
              onApply={handleApply}
              onPreview={handlePreview}
              onLivePreview={handleLivePreview}
            />
          ))}
        </View>

        {/* ── FOOTER ── */}
        <View style={[s.footer, { borderColor: accentColor + '18' }]}>
          <MaterialCommunityIcons name="heart" size={14} color={accentColor + '50'} />
          <Text style={[s.footerTxt, { color: T.textDim }]}>
            Butler AI is 100% free forever. All themes apply instantly — no server needed. Donations fuel new features, scripts, and fixes. Thank you for your support.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  pageHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  pageTitle:    { fontSize: 14, fontFamily: MONO, fontWeight: '900', letterSpacing: 2 },
  headerChip:   { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  headerChipTxt:{ fontSize: 8, fontFamily: MONO, fontWeight: '900' },
  headerSub:    { fontSize: 10, fontFamily: MONO, lineHeight: 16, marginBottom: 18 },
  section:      { marginBottom: 14 },
  sectionRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionHead:  { fontSize: 9, fontFamily: MONO, fontWeight: '900', letterSpacing: 2 },
  liveTag:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  liveDot:      { width: 5, height: 5, borderRadius: 3 },
  liveTagTxt:   { fontSize: 7, fontFamily: MONO, fontWeight: '900' },
  infoBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 18 },
  infoTitle:    { fontSize: 8, fontFamily: MONO, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  changeChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  changeChipTxt:{ fontSize: 8, fontFamily: MONO },
  donationCard:    { borderRadius: 18, marginBottom: 14, overflow: 'hidden' },
  donationTopBar:  { height: 3 },
  donationIconBox: { width: 48, height: 48, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  donationTitle:   { fontSize: 13, fontFamily: MONO, fontWeight: '900', letterSpacing: 0.8 },
  donationSub:     { fontSize: 9, fontFamily: MONO, marginTop: 2 },
  donationBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  donationBadgeTxt:{ fontSize: 7, fontFamily: MONO, fontWeight: '900' },
  donationDesc:    { fontSize: 11, fontFamily: MONO, lineHeight: 17, marginBottom: 12 },
  missionBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: 7, borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12 },
  missionTxt:      { flex: 1, fontSize: 10, fontFamily: MONO, lineHeight: 15 },
  complianceChip:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  complianceChipTxt:{ fontSize: 8, fontFamily: MONO, fontWeight: '700', letterSpacing: 0.3 },
  iapBox:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  iapTitle:        { fontSize: 10, fontFamily: MONO, fontWeight: '900', letterSpacing: 0.5, marginBottom: 3 },
  iapDesc:         { fontSize: 9, fontFamily: MONO, lineHeight: 14 },
  supportBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12 },
  supportBtnTxt:   { fontSize: 11, fontFamily: MONO, fontWeight: '900' },
  footer:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 14, borderWidth: 1, borderRadius: 12, backgroundColor: '#0a0c12', marginTop: 4 },
  footerTxt:    { flex: 1, fontSize: 10, fontFamily: MONO, lineHeight: 16 },
  toast: {
    position: 'absolute', top: 10, left: 20, right: 20, zIndex: 999,
    flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12,
    borderRadius: 14, borderWidth: 1.5,
    ...Platform.select({
      ios: { shadowColor: '#FF2A1F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 14 },
      android: { elevation: 14 },
    }),
  },
  toastTxt: { fontSize: 11, fontFamily: MONO, fontWeight: '900', letterSpacing: 0.4, flex: 1 },
});


// Expo Router per-route ErrorBoundary — isolates crashes to this tab
export { ErrorBoundary } from '@/components/ui/TabErrorBoundary';
