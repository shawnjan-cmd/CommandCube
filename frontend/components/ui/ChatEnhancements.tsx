/**
 * BUTLER CHAT ENHANCEMENTS — Drop-in v1.0
 * Path: components/ui/ChatEnhancements.tsx
 *
 * Adds (zero new dependencies, uses your existing palette):
 *   • <SlashCommandPalette/>   — animated /-command popover (history, clear, script, model)
 *   • <MessageActionBar/>      — copy / regenerate / share / speak row under every AI msg
 *   • <TypingShimmer/>         — premium 3-dot shimmer (replaces ActivityIndicator)
 *   • <JumpToBottomFab/>       — appears when user scrolls up mid-stream
 *   • <MarkdownLite/>          — bold / italic / inline `code` / fenced ``` blocks (no deps)
 *
 * Wire-up in app/(tabs)/butler.tsx (3 lines):
 *   import { SlashCommandPalette, MessageActionBar, TypingShimmer, JumpToBottomFab, MarkdownLite } from '@/components/ui/ChatEnhancements';
 *   // replace <Text>{m.text}</Text> with <MarkdownLite text={m.text} />
 *   // render <TypingShimmer/> while awaiting response
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Platform,
  ScrollView, Share, Easing,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { haptics } from '@/services/haptics';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const C = {
  bg: '#02070D', card: '#071120', cyan: '#00FFFF', green: '#00FF88',
  amber: '#F5A623', red: '#FF3131', text: '#D8E8F4', textDim: '#7A9AB8',
  border: 'rgba(0,255,255,0.18)',
};

const safeH = { light: () => { try { haptics.light(); } catch {} },
                sel:   () => { try { haptics.selection(); } catch {} } };

/* ───────────────────────── SLASH COMMANDS ───────────────────────── */
export interface SlashCmd { cmd: string; label: string; icon: string; color?: string; }

export const DEFAULT_SLASH: SlashCmd[] = [
  { cmd: '/clear',     label: 'Clear conversation',   icon: 'delete-sweep', color: C.red },
  { cmd: '/history',   label: 'Show recent history',  icon: 'history',      color: C.cyan },
  { cmd: '/script',    label: 'Generate Python script', icon: 'code-tags',  color: C.green },
  { cmd: '/explain',   label: 'Explain last output',  icon: 'lightbulb',    color: C.amber },
  { cmd: '/heal',      label: 'Self-heal last script', icon: 'auto-fix',    color: C.green },
  { cmd: '/model',     label: 'Switch AI backend',    icon: 'tune',         color: C.cyan },
];

export function SlashCommandPalette({
  query, visible, onPick, commands = DEFAULT_SLASH,
}: { query: string; visible: boolean; onPick: (c: SlashCmd) => void; commands?: SlashCmd[]; }) {
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slide, { toValue: visible ? 1 : 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return commands.filter(c => c.cmd.includes(q) || c.label.toLowerCase().includes(q.replace('/','')));
  }, [query, commands]);

  if (!visible || filtered.length === 0) return null;

  return (
    <Animated.View style={[s.palette, {
      opacity: slide,
      transform: [{ translateY: slide.interpolate({ inputRange: [0,1], outputRange: [12,0] }) }],
    }]}>
      <View style={s.paletteHeader}>
        <MaterialCommunityIcons name="slash-forward" size={12} color={C.cyan} />
        <Text style={s.paletteHeaderTxt}>SLASH COMMANDS</Text>
      </View>
      {filtered.map(c => (
        <TouchableOpacity key={c.cmd} style={s.paletteRow} onPress={() => { safeH.sel(); onPick(c); }} activeOpacity={0.7}>
          <View style={[s.paletteIcon, { backgroundColor: (c.color || C.cyan) + '18', borderColor: (c.color || C.cyan) + '50' }]}>
            <MaterialCommunityIcons name={c.icon as any} size={14} color={c.color || C.cyan} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.paletteCmd, { color: c.color || C.cyan }]}>{c.cmd}</Text>
            <Text style={s.paletteLabel}>{c.label}</Text>
          </View>
          <MaterialIcons name="keyboard-return" size={12} color={C.textDim} />
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
}

/* ───────────────────────── MESSAGE ACTIONS ───────────────────────── */
export function MessageActionBar({
  text, onRegenerate, onSpeak,
}: { text: string; onRegenerate?: () => void; onSpeak?: () => void; }) {
  const [copied, setCopied] = useState(false);

  const doCopy = async () => {
    safeH.light();
    try { await Clipboard.setStringAsync(text); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch {}
  };
  const doShare = async () => {
    safeH.light();
    try { await Share.share({ message: text }); } catch {}
  };

  return (
    <View style={s.actionRow}>
      <ActionBtn icon={copied ? 'check' : 'content-copy'} label={copied ? 'COPIED' : 'COPY'} color={copied ? C.green : C.cyan} onPress={doCopy} />
      {onRegenerate && <ActionBtn icon="refresh" label="REGEN" color={C.amber} onPress={() => { safeH.light(); onRegenerate(); }} />}
      <ActionBtn icon="share" label="SHARE" color={C.cyan} onPress={doShare} />
      {onSpeak && <ActionBtn icon="volume-up" label="SPEAK" color={C.green} onPress={() => { safeH.light(); onSpeak(); }} />}
    </View>
  );
}

function ActionBtn({ icon, label, color, onPress }: any) {
  return (
    <TouchableOpacity style={[s.actionBtn, { borderColor: color + '40' }]} onPress={onPress} activeOpacity={0.7}>
      <MaterialIcons name={icon} size={11} color={color} />
      <Text style={[s.actionTxt, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ───────────────────────── TYPING SHIMMER ───────────────────────── */
export function TypingShimmer({ label = 'BUTLER IS THINKING' }: { label?: string }) {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    const loops = dots.map((d, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 180),
      Animated.timing(d, { toValue: 1,   duration: 380, useNativeDriver: true }),
      Animated.timing(d, { toValue: 0.3, duration: 380, useNativeDriver: true }),
    ])));
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <View style={s.typingWrap}>
      <View style={s.typingBubble}>
        {dots.map((d, i) => (
          <Animated.View key={i} style={[s.typingDot, { opacity: d, transform: [{ scale: d }] }]} />
        ))}
      </View>
      <Text style={s.typingLabel}>{label}</Text>
    </View>
  );
}

/* ───────────────────────── JUMP TO BOTTOM FAB ───────────────────────── */
export function JumpToBottomFab({ visible, onPress, unread = 0 }: { visible: boolean; onPress: () => void; unread?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: visible ? 1 : 0, useNativeDriver: true, tension: 200, friction: 12 }).start();
  }, [visible]);
  return (
    <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[s.fab, {
      opacity: anim,
      transform: [{ scale: anim }, { translateY: anim.interpolate({ inputRange: [0,1], outputRange: [40, 0] }) }],
    }]}>
      <TouchableOpacity style={s.fabBtn} onPress={() => { safeH.sel(); onPress(); }} activeOpacity={0.85}>
        <MaterialIcons name="keyboard-arrow-down" size={22} color={C.cyan} />
        {unread > 0 && (
          <View style={s.fabBadge}><Text style={s.fabBadgeTxt}>{unread > 9 ? '9+' : unread}</Text></View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ───────────────────────── MARKDOWN LITE ─────────────────────────
   Supports: **bold**, *italic*, `inline code`, ```fenced blocks```
   No deps. Linear-time parser. Safe for streamed text. */
export function MarkdownLite({ text, style }: { text: string; style?: any }) {
  const blocks = useMemo(() => splitFences(text), [text]);
  return (
    <View>
      {blocks.map((b, i) => b.type === 'code' ? (
        <CodeBlock key={i} code={b.content} lang={b.lang} />
      ) : (
        <Text key={i} style={[s.mdText, style]}>{renderInline(b.content)}</Text>
      ))}
    </View>
  );
}

function splitFences(t: string): Array<{ type: 'text'|'code'; content: string; lang?: string }> {
  const out: Array<{ type:'text'|'code'; content:string; lang?:string }> = [];
  const re = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    if (m.index > last) out.push({ type: 'text', content: t.slice(last, m.index) });
    out.push({ type: 'code', content: m[2] || '', lang: m[1] });
    last = m.index + m[0].length;
  }
  if (last < t.length) out.push({ type: 'text', content: t.slice(last) });
  if (out.length === 0) out.push({ type: 'text', content: t });
  return out;
}

function renderInline(t: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(t))) {
    if (m.index > last) parts.push(t.slice(last, m.index));
    const s2 = m[0];
    if (s2.startsWith('**')) parts.push(<Text key={k++} style={{ fontWeight: '900', color: C.text }}>{s2.slice(2,-2)}</Text>);
    else if (s2.startsWith('`')) parts.push(<Text key={k++} style={{ fontFamily: MONO, color: C.green, backgroundColor: 'rgba(0,255,136,0.10)' }}>{` ${s2.slice(1,-1)} `}</Text>);
    else parts.push(<Text key={k++} style={{ fontStyle: 'italic', color: C.text }}>{s2.slice(1,-1)}</Text>);
    last = m.index + s2.length;
  }
  if (last < t.length) parts.push(t.slice(last));
  return parts;
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await Clipboard.setStringAsync(code); setCopied(true); setTimeout(() => setCopied(false), 1200); safeH.light(); } catch {} };
  return (
    <View style={s.codeWrap}>
      <View style={s.codeHead}>
        <Text style={s.codeLang}>{(lang || 'code').toUpperCase()}</Text>
        <TouchableOpacity onPress={copy} style={s.codeCopyBtn} activeOpacity={0.7}>
          <MaterialIcons name={copied ? 'check' : 'content-copy'} size={11} color={copied ? C.green : C.cyan} />
          <Text style={[s.codeCopyTxt, { color: copied ? C.green : C.cyan }]}>{copied ? 'COPIED' : 'COPY'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={s.codeTxt} selectable>{code}</Text>
      </ScrollView>
    </View>
  );
}

/* ───────────────────────── STYLES ───────────────────────── */
const s = StyleSheet.create({
  palette: {
    position: 'absolute', left: 12, right: 12, bottom: 72,
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    padding: 6, shadowColor: C.cyan, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width:0, height:4 }, elevation: 12, zIndex: 999,
  },
  paletteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6 },
  paletteHeaderTxt: { fontSize: 9, fontWeight: '900', color: C.cyan, fontFamily: MONO, letterSpacing: 1.5 },
  paletteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8 },
  paletteIcon: { width: 26, height: 26, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  paletteCmd: { fontSize: 12, fontWeight: '900', fontFamily: MONO },
  paletteLabel: { fontSize: 10, color: C.textDim, marginTop: 1 },

  actionRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  actionTxt: { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },

  typingWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12 },
  typingBubble: { flexDirection: 'row', gap: 5, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.cyan },
  typingLabel: { fontSize: 10, fontWeight: '900', color: C.cyan, fontFamily: MONO, letterSpacing: 1 },

  fab: { position: 'absolute', right: 16, bottom: 110, zIndex: 50 },
  fabBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', shadowColor: C.cyan, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8 },
  fabBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.amber, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  fabBadgeTxt: { fontSize: 9, fontWeight: '900', color: '#000', fontFamily: MONO },

  mdText: { color: C.text, fontSize: 14, lineHeight: 21 },
  codeWrap: { marginVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: '#000003', overflow: 'hidden' },
  codeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(0,255,255,0.04)', borderBottomWidth: 1, borderBottomColor: C.border },
  codeLang: { fontSize: 9, fontWeight: '900', color: C.cyan, fontFamily: MONO, letterSpacing: 1 },
  codeCopyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  codeCopyTxt: { fontSize: 9, fontWeight: '900', fontFamily: MONO },
  codeTxt: { color: C.green, fontFamily: MONO, fontSize: 12, padding: 10, lineHeight: 18 },
});
