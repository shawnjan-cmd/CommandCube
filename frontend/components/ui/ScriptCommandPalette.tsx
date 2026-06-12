/**
 * SCRIPT COMMAND PALETTE — Drop-in v1.0
 * Path: components/ui/ScriptCommandPalette.tsx
 *
 * A cmd-k style fuzzy palette that overlays the scripts page.
 * Press a hotkey (e.g. long-press header) to open. Searches the full
 * SEARCH_INDEX, shows quick-run / pin / view actions inline.
 *
 * Wire-up in app/(tabs)/scripts.tsx:
 *   import { ScriptCommandPalette } from '@/components/ui/ScriptCommandPalette';
 *   const [paletteOpen, setPaletteOpen] = useState(false);
 *   // long-press header → setPaletteOpen(true)
 *   <ScriptCommandPalette
 *     visible={paletteOpen}
 *     onClose={() => setPaletteOpen(false)}
 *     index={SEARCH_INDEX}
 *     onRun={(hit) => runScript(hit)}
 *     onView={(hit) => openPreview(hit)}
 *     onPin={(hit) => togglePinService(hit.id)}
 *     pinnedIds={pinnedIds}
 *   />
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Platform, Animated, KeyboardAvoidingView, Easing,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { haptics } from '@/services/haptics';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const C = {
  scrim: 'rgba(2,4,7,0.86)', card: '#1A1D24', surface: '#0E0F12',
  cyan: '#FF2A1F', green: '#00FF88', amber: '#FFC400',
  text: '#E6E9EF', textDim: '#8C95A6', border: 'rgba(255,42,31,0.20)',
};

export interface PaletteHit {
  id: string; name: string; description?: string; category?: string;
  tags?: string[]; pinned?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  index: PaletteHit[];
  onRun: (h: PaletteHit) => void;
  onView: (h: PaletteHit) => void;
  onPin?: (h: PaletteHit) => void;
  pinnedIds?: Set<string> | string[];
  recents?: string[];
}

export function ScriptCommandPalette({
  visible, onClose, index, onRun, onView, onPin, pinnedIds, recents = [],
}: Props) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const slide = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setQ(''); setSel(0);
      Animated.timing(slide, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      setTimeout(() => inputRef.current?.focus(), 120);
    } else {
      slide.setValue(0);
    }
  }, [visible]);

  const pinSet = useMemo(() =>
    pinnedIds instanceof Set ? pinnedIds : new Set(pinnedIds || []),
  [pinnedIds]);

  const results = useMemo(() => fuzzy(index, q, recents).slice(0, 40), [index, q, recents]);

  const close = () => { try { haptics.light(); } catch {} onClose(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <TouchableOpacity activeOpacity={1} style={s.scrim} onPress={close}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.center}>
          <Animated.View
            style={[s.panel, {
              opacity: slide,
              transform: [{ translateY: slide.interpolate({ inputRange: [0,1], outputRange: [20,0] }) },
                          { scale: slide.interpolate({ inputRange: [0,1], outputRange: [0.96,1] }) }],
            }]}
            onStartShouldSetResponder={() => true}
          >
            {/* HEADER */}
            <View style={s.header}>
              <MaterialCommunityIcons name="console-line" size={16} color={C.cyan} />
              <TextInput
                ref={inputRef}
                style={s.input}
                value={q}
                onChangeText={(t) => { setQ(t); setSel(0); }}
                placeholder="Search scripts, tags, categories…"
                placeholderTextColor={C.textDim}
                autoCorrect={false}
                autoCapitalize="none"
              />
              <View style={s.kbd}><Text style={s.kbdTxt}>ESC</Text></View>
            </View>

            {/* HINT BAR */}
            <View style={s.hintBar}>
              <Hint icon="keyboard-return" txt="RUN" color={C.green} />
              <Hint icon="visibility" txt="VIEW" color={C.cyan} />
              {onPin && <Hint icon="push-pin" txt="PIN" color={C.amber} />}
              <View style={{ flex: 1 }} />
              <Text style={s.hintCount}>{results.length} RESULTS</Text>
            </View>

            {/* RESULTS */}
            <FlatList
              data={results}
              keyExtractor={(it) => it.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={s.empty}>
                  <MaterialCommunityIcons name="magnify-close" size={32} color={C.textDim} />
                  <Text style={s.emptyTxt}>NO MATCHES</Text>
                  <Text style={s.emptySub}>Try a different keyword or browse categories</Text>
                </View>
              }
              renderItem={({ item, index: i }) => (
                <PaletteRow
                  hit={item}
                  isSelected={i === sel}
                  pinned={pinSet.has(item.id)}
                  onRun={() => { close(); setTimeout(() => onRun(item), 80); }}
                  onView={() => { close(); setTimeout(() => onView(item), 80); }}
                  onPin={onPin ? () => onPin(item) : undefined}
                />
              )}
              style={{ maxHeight: 420 }}
            />

            {/* FOOTER */}
            <View style={s.footer}>
              <MaterialCommunityIcons name="lightning-bolt" size={10} color={C.cyan} />
              <Text style={s.footerTxt}>NEXUS COMMAND PALETTE  ·  v1.0</Text>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

function Hint({ icon, txt, color }: any) {
  return (
    <View style={[s.hint, { borderColor: color + '40' }]}>
      <MaterialIcons name={icon} size={9} color={color} />
      <Text style={[s.hintTxt, { color }]}>{txt}</Text>
    </View>
  );
}

function PaletteRow({ hit, isSelected, pinned, onRun, onView, onPin }: any) {
  return (
    <View style={[s.row, isSelected && s.rowSel]}>
      <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={onView} activeOpacity={0.7}>
        <View style={[s.rowIcon, pinned && { borderColor: C.amber + '60', backgroundColor: C.amber + '12' }]}>
          <MaterialCommunityIcons
            name={pinned ? 'pin' : 'script-text-outline'}
            size={14}
            color={pinned ? C.amber : C.cyan}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.rowName} numberOfLines={1}>{hit.name}</Text>
          {hit.description ? <Text style={s.rowDesc} numberOfLines={1}>{hit.description}</Text> : null}
          {hit.category ? <Text style={s.rowCat}>{hit.category.toUpperCase()}</Text> : null}
        </View>
      </TouchableOpacity>
      <View style={s.rowActions}>
        {onPin && (
          <TouchableOpacity style={s.actBtn} onPress={onPin} hitSlop={{ top:6,bottom:6,left:6,right:6 }}>
            <MaterialIcons name={pinned ? 'push-pin' : 'push-pin'} size={14} color={pinned ? C.amber : C.textDim} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.actBtn, { backgroundColor: C.green + '15', borderColor: C.green + '50' }]} onPress={onRun}>
          <MaterialIcons name="play-arrow" size={14} color={C.green} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ───────────────────────── FUZZY MATCH ─────────────────────────
   Tiny, dependency-free ranker. Boosts:
     • exact prefix on name (+100)
     • all chars in order in name (+score by density)
     • tag/category contains  (+30)
     • recently used          (+15)
     • pinned                 (+5)
*/
function fuzzy(items: PaletteHit[], q: string, recents: string[] = []): PaletteHit[] {
  const ql = q.trim().toLowerCase();
  const recentSet = new Set(recents);
  if (!ql) {
    return [...items].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  }
  const scored = items.map(it => {
    const n = (it.name || '').toLowerCase();
    const d = (it.description || '').toLowerCase();
    const tags = (it.tags || []).join(' ').toLowerCase();
    const cat = (it.category || '').toLowerCase();
    let score = 0;
    if (n.startsWith(ql)) score += 100;
    else if (n.includes(ql)) score += 60;
    else {
      const sub = subseq(n, ql);
      if (sub > 0) score += sub;
      else if (d.includes(ql)) score += 25;
      else if (tags.includes(ql) || cat.includes(ql)) score += 30;
      else return null;
    }
    if (recentSet.has(it.id)) score += 15;
    if (it.pinned) score += 5;
    return { it, score };
  }).filter(Boolean) as Array<{ it: PaletteHit; score: number }>;
  scored.sort((a, b) => b.score - a.score);
  return scored.map(x => x.it);
}

function subseq(hay: string, needle: string): number {
  let i = 0, score = 0, streak = 0;
  for (const ch of hay) {
    if (ch === needle[i]) { i++; streak++; score += 2 + streak; }
    else { streak = 0; }
    if (i >= needle.length) return score;
  }
  return 0;
}

/* ───────────────────────── STYLES ───────────────────────── */
const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: C.scrim },
  center: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: Platform.OS === 'ios' ? 80 : 50, paddingHorizontal: 16 },
  panel: { width: '100%', maxWidth: 560, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', shadowColor: C.cyan, shadowOpacity: 0.4, shadowRadius: 24, elevation: 20 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
  input: { flex: 1, color: C.text, fontSize: 15, fontFamily: MONO, padding: 0 },
  kbd: { borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  kbdTxt: { color: C.textDim, fontSize: 9, fontFamily: MONO, fontWeight: '900' },

  hintBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: 'rgba(255,42,31,0.02)' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  hintTxt: { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  hintCount: { fontSize: 9, color: C.textDim, fontFamily: MONO, fontWeight: '900' },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rowSel: { backgroundColor: 'rgba(255,42,31,0.06)' },
  rowIcon: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: 'rgba(255,42,31,0.06)', alignItems: 'center', justifyContent: 'center' },
  rowName: { color: C.text, fontSize: 13, fontWeight: '700' },
  rowDesc: { color: C.textDim, fontSize: 11, marginTop: 2 },
  rowCat: { color: C.cyan, fontSize: 8, fontFamily: MONO, fontWeight: '900', marginTop: 3, letterSpacing: 1 },
  rowActions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  actBtn: { width: 30, height: 30, borderRadius: 7, borderWidth: 1, borderColor: C.border, backgroundColor: 'rgba(255,42,31,0.05)', alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 6 },
  emptyTxt: { color: C.textDim, fontSize: 12, fontFamily: MONO, fontWeight: '900', letterSpacing: 1 },
  emptySub: { color: C.textDim, fontSize: 10 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.surface },
  footerTxt: { color: C.textDim, fontSize: 9, fontFamily: MONO, fontWeight: '900', letterSpacing: 1 },
});
