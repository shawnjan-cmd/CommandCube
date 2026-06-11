/**
 * ⚡ NEXUS ROTATING TIPS BAR v4.0
 * 35 rotating tips · random order · 3.5s interval · FULL TEXT VISIBLE (multi-line auto-height)
 * Cosmetic-theme aware · NEXUS monospace aesthetic
 * Smooth fade+slide transitions · tap to pause 5s · pauses when not active
 * TIPS HUB button opens searchable categorized tips panel
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Platform, Animated, Dimensions,
  TouchableOpacity, Modal, ScrollView, TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCosmetic } from '@/contexts/CosmeticContext';

const MONO: any = Platform.OS === 'ios' ? 'Courier New' : 'monospace';
const { width: SW } = Dimensions.get('window');

// ─── 35 NEXUS APP-WIDE TIPS ──────────────────────────
export const NEXUS_TIPS_35: string[] = [
  'Swipe left or right anywhere on the screen to switch between app tabs',
  'Butler AI runs entirely on your local PC via Ollama — no cloud or API key required',
  'Script Only Mode in Settings hides AI and KB tabs for a focused remote control view',
  'The app saves your last server connection and reconnects automatically on every launch',
  'Long-press any script card to preview the full Python code without opening the detail view',
  'QR pairing uses HMAC-SHA256 token authentication — your server connection is encrypted',
  'OMEGA LOOP is a background knowledge accumulation cycle that runs automatically every few minutes',
  'Install psutil on your PC to enable live CPU, RAM, and Disk percentage metrics on Home',
  'Script execution timeout is 35 seconds — use Python threading for any long-running tasks',
  'LAN Auto-Scan pings all 255 hosts on your WiFi subnet simultaneously to locate your server',
  'All cosmetic themes change tab icon colors, card borders, glow effects, and particle colors',
  'Export your Knowledge Base as JSON from Settings before clearing or reinstalling the app',
  'Butler AI reads your entire Knowledge Base context before generating every response',
  'Execution count on each script card persists across all app restarts and sessions',
  'Quantum Link Harvester automatically discovers new Python documentation resource links',
  'Script chains can sequence up to 20 scripts and execute them in order with one tap',
  'Clipboard Sync sends any text from your phone directly to your PC clipboard instantly',
  'Butler chat history stores the last 80 messages before the oldest entries are removed',
  'Reset Device Pairing in Settings is the fastest fix for server locked to another device errors',
  'Bare Minimum Mode disables all visual effects for maximum performance on older devices',
  'Compact Tab Bar in Settings saves 18px of vertical screen space on smaller phones',
  'File Share transfers any file from your phone to PC Desktop over your local WiFi network',
  'All script execution runs inside a Python subprocess sandbox on your paired PC only',
  'Knowledge Base growth tracking graph shows expansion activity over the past 4 hours',
  'Health Check in Tools tests all 5 server endpoints and reports individual latency values',
  'All app data including scripts and chat history is stored entirely on your device',
  'Champion Holo cosmetic is unlocked exclusively by leaving a review on the Play Store',
  'Auto-Fix in Tools runs 8 sequential server repair steps with live animated progress',
  'Phi-DELTA local index enables sub-millisecond Knowledge Base search on your device',
  'SIGMA-NET relay allows your PC to crawl web pages and deliver content to the KB engine',
  'Task Memory in Tools lets Butler AI understand exactly what project you are working on',
  'Auto-Connect setting links to your last paired server every time the app is opened',
  'Network Map tool pings all 255 LAN hosts in parallel threads directly from your PC',
  'Backup Vault script creates a dated zip archive of your entire PC Documents folder',
  'NEXUS KB auto-seeds with 20 Python automation scripts when the app first launches',
];

// ─── TIPS CATEGORIES ──────────────────────────────────
const TIP_CATEGORIES: { label: string; icon: string; color: string; tips: string[] }[] = [
  {
    label: 'CONNECTION',
    icon: 'wifi',
    color: '#00FF88',
    tips: [
      'Swipe left or right anywhere on the screen to switch between app tabs',
      'The app saves your last server connection and reconnects automatically on every launch',
      'LAN Auto-Scan pings all 255 hosts on your WiFi subnet simultaneously to locate your server',
      'QR pairing uses HMAC-SHA256 token authentication — your server connection is encrypted',
      'Auto-Connect setting links to your last paired server every time the app is opened',
      'Reset Device Pairing in Settings is the fastest fix for server locked to another device errors',
    ],
  },
  {
    label: 'BUTLER AI',
    icon: 'psychology',
    color: '#4488FF',
    tips: [
      'Butler AI runs entirely on your local PC via Ollama — no cloud or API key required',
      'Butler AI reads your entire Knowledge Base context before generating every response',
      'Butler chat history stores the last 80 messages before the oldest entries are removed',
      'Task Memory in Tools lets Butler AI understand exactly what project you are working on',
      'Phi-DELTA local index enables sub-millisecond Knowledge Base search on your device',
    ],
  },
  {
    label: 'SCRIPTS',
    icon: 'code',
    color: '#FF8C00',
    tips: [
      'Long-press any script card to preview the full Python code without opening the detail view',
      'Script execution timeout is 35 seconds — use Python threading for any long-running tasks',
      'Script chains can sequence up to 20 scripts and execute them in order with one tap',
      'All script execution runs inside a Python subprocess sandbox on your paired PC only',
      'Execution count on each script card persists across all app restarts and sessions',
      'Backup Vault script creates a dated zip archive of your entire PC Documents folder',
    ],
  },
  {
    label: 'KNOWLEDGE BASE',
    icon: 'book',
    color: '#CC44FF',
    tips: [
      'OMEGA LOOP is a background knowledge accumulation cycle that runs automatically every few minutes',
      'Quantum Link Harvester automatically discovers new Python documentation resource links',
      'Export your Knowledge Base as JSON from Settings before clearing or reinstalling the app',
      'Knowledge Base growth tracking graph shows expansion activity over the past 4 hours',
      'SIGMA-NET relay allows your PC to crawl web pages and deliver content to the KB engine',
      'NEXUS KB auto-seeds with 20 Python automation scripts when the app first launches',
    ],
  },
  {
    label: 'SYSTEM',
    icon: 'settings',
    color: '#00CCDD',
    tips: [
      'Install psutil on your PC to enable live CPU, RAM, and Disk percentage metrics on Home',
      'Health Check in Tools tests all 5 server endpoints and reports individual latency values',
      'All app data including scripts and chat history is stored entirely on your device',
      'Auto-Fix in Tools runs 8 sequential server repair steps with live animated progress',
      'Bare Minimum Mode disables all visual effects for maximum performance on older devices',
      'Compact Tab Bar in Settings saves 18px of vertical screen space on smaller phones',
    ],
  },
  {
    label: 'FEATURES',
    icon: 'star',
    color: '#FFD700',
    tips: [
      'All cosmetic themes change tab icon colors, card borders, glow effects, and particle colors',
      'Script Only Mode in Settings hides AI and KB tabs for a focused remote control view',
      'Clipboard Sync sends any text from your phone directly to your PC clipboard instantly',
      'File Share transfers any file from your phone to PC Desktop over your local WiFi network',
      'Champion Holo cosmetic is unlocked exclusively by leaving a review on the Play Store',
      'Network Map tool pings all 255 LAN hosts in parallel threads directly from your PC',
    ],
  },
];

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── TIPS HUB MODAL ──────────────────────────────────
function TipsHubModal({ visible, onClose, primary }: { visible: boolean; onClose: () => void; primary: string }) {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const slideY = useRef(new Animated.Value(600)).current;
  const fadeOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 60, friction: 12, useNativeDriver: false }),
        Animated.timing(fadeOp, { toValue: 1, duration: 220, useNativeDriver: false }),
      ]).start();
    } else {
      slideY.setValue(600);
      fadeOp.setValue(0);
    }
  }, [visible]);

  const allTips = NEXUS_TIPS_35;
  const displayedTips = activeCategory === 'ALL'
    ? (search.trim()
        ? allTips.filter(t => t.toLowerCase().includes(search.toLowerCase()))
        : allTips)
    : (() => {
        const cat = TIP_CATEGORIES.find(c => c.label === activeCategory);
        const tips = cat?.tips || [];
        return search.trim() ? tips.filter(t => t.toLowerCase().includes(search.toLowerCase())) : tips;
      })();

  const activeCatColor = activeCategory === 'ALL'
    ? primary
    : TIP_CATEGORIES.find(c => c.label === activeCategory)?.color || primary;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[th.overlay, { opacity: fadeOp }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[th.sheet, { transform: [{ translateY: slideY }] }]}>
          {/* Top accent */}
          <View style={[th.topAccent, { backgroundColor: primary }]} />
          {/* Handle */}
          <View style={th.handle} />

          {/* Header */}
          <View style={th.header}>
            <View style={[th.headerIcon, { backgroundColor: primary + '18', borderColor: primary + '50' }]}>
              <MaterialIcons name="lightbulb" size={20} color={primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[th.headerTitle, { color: primary }]}>TIPS <Text style={{ color: '#FFF' }}>HUB</Text></Text>
              <Text style={th.headerSub}>{allTips.length} tips · tap any to learn more</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={th.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="close" size={18} color="#5A6470" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[th.searchRow, { borderColor: primary + '40' }]}>
            <MaterialIcons name="search" size={14} color={search ? primary : '#5A6470'} />
            <TextInput
              style={th.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search tips..."
              placeholderTextColor="#5A6470"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={13} color="#5A6470" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Category chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={th.catRow}
            style={{ flexShrink: 0 }}
          >
            {/* ALL chip */}
            <TouchableOpacity
              style={[th.catChip, activeCategory === 'ALL' && { backgroundColor: primary + '22', borderColor: primary }]}
              onPress={() => setActiveCategory('ALL')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="apps" size={10} color={activeCategory === 'ALL' ? primary : '#5A6470'} />
              <Text style={[th.catChipTxt, activeCategory === 'ALL' && { color: primary }]}>ALL</Text>
            </TouchableOpacity>
            {TIP_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.label}
                style={[th.catChip, activeCategory === cat.label && { backgroundColor: cat.color + '22', borderColor: cat.color }]}
                onPress={() => setActiveCategory(cat.label)}
                activeOpacity={0.8}
              >
                <MaterialIcons name={cat.icon as any} size={10} color={activeCategory === cat.label ? cat.color : '#5A6470'} />
                <Text style={[th.catChipTxt, activeCategory === cat.label && { color: cat.color }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Divider */}
          <View style={[th.divider, { backgroundColor: activeCatColor + '30' }]} />

          {/* Tips list */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={th.tipsList}
            showsVerticalScrollIndicator={false}
          >
            {displayedTips.length === 0 ? (
              <View style={th.empty}>
                <MaterialIcons name="search-off" size={36} color="#5A6470" />
                <Text style={th.emptyTxt}>No tips match your search</Text>
              </View>
            ) : (
              displayedTips.map((tip, i) => {
                // Find category for color
                const catMatch = TIP_CATEGORIES.find(c => c.tips.includes(tip));
                const col = catMatch?.color || primary;
                return (
                  <View key={i} style={[th.tipRow, { borderLeftColor: col }]}>
                    <View style={[th.tipNumWrap, { backgroundColor: col + '18', borderColor: col + '40' }]}>
                      <Text style={[th.tipNum, { color: col }]}>{String(i + 1).padStart(2, '0')}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      {catMatch ? (
                        <View style={[th.tipCatTag, { backgroundColor: col + '12', borderColor: col + '35' }]}>
                          <MaterialIcons name={catMatch.icon as any} size={8} color={col} />
                          <Text style={[th.tipCatTagTxt, { color: col }]}>{catMatch.label}</Text>
                        </View>
                      ) : null}
                      <Text style={th.tipTxt}>{tip}</Text>
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Footer */}
          <View style={th.footer}>
            <MaterialIcons name="lightbulb-outline" size={11} color="#5A6470" />
            <Text style={th.footerTxt}>Tips rotate automatically in the bar above · tap to pause</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const th = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#0E0E14', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '86%', minHeight: 400, overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset:{width:0,height:-8}, shadowOpacity:0.5, shadowRadius:20 }, android:{ elevation:24 } }) },
  topAccent:   { height: 3, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle:      { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  headerIcon:  { width: 42, height: 42, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  headerTitle: { fontSize: 20, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  headerSub:   { fontSize: 10, color: '#5A6470', fontFamily: MONO, marginTop: 2 },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: '#16161F', alignItems: 'center', justifyContent: 'center' },
  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, backgroundColor: '#16161F', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  searchInput: { flex: 1, fontSize: 13, color: '#FFF', fontFamily: MONO, paddingVertical: 0 },
  catRow:      { gap: 6, paddingHorizontal: 16, paddingBottom: 10 },
  catChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'transparent' },
  catChipTxt:  { fontSize: 9, fontWeight: '700', color: '#5A6470', fontFamily: MONO, letterSpacing: 0.3 },
  divider:     { height: 1, marginHorizontal: 16, marginBottom: 10 },
  tipsList:    { paddingHorizontal: 16, gap: 8 },
  tipRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#111116', borderRadius: 10, borderWidth: 1, borderLeftWidth: 3, borderColor: 'rgba(255,255,255,0.07)', padding: 12 },
  tipNumWrap:  { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tipNum:      { fontSize: 9, fontWeight: '900', fontFamily: MONO },
  tipCatTag:   { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 5 },
  tipCatTagTxt:{ fontSize: 8, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.3 },
  tipTxt:      { fontSize: 12.5, color: '#9CA3AF', lineHeight: 19, fontFamily: MONO },
  empty:       { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyTxt:    { fontSize: 13, color: '#5A6470', fontFamily: MONO },
  footer:      { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  footerTxt:   { fontSize: 9, color: '#5A6470', fontFamily: MONO, textAlign: 'center' },
});

interface Props {
  tips?: string[];
  intervalMs?: number;
  active?: boolean;
}

export default function NexusRotatingBar({ tips = NEXUS_TIPS_35, intervalMs = 5000, active = true }: Props) {
  const { T } = useCosmetic();
  const primary = T?.primary || '#00CCDD';

  const [shuffled, setShuffled]   = useState<string[]>([]);
  const [idx, setIdx]             = useState(0);
  const [text, setText]           = useState('');
  const [paused, setPaused]       = useState(false);
  const [showTipsHub, setShowTipsHub] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(6)).current;
  const pulse     = useRef(new Animated.Value(0.5)).current;
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef    = useRef<Animated.CompositeAnimation | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build initial shuffled list on mount
  useEffect(() => {
    const s = shuffle(tips);
    setShuffled(s);
    setText(s[0] || '');
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start();
  }, []);

  // LED pulse
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1,    duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.25, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const transitionNext = useCallback((currentShuffled: string[], currentIdx: number) => {
    animRef.current?.stop();
    animRef.current = Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 220, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: -8, duration: 220, useNativeDriver: false }),
    ]);
    animRef.current.start(() => {
      let nextIdx = currentIdx + 1;
      let nextShuffled = currentShuffled;
      if (nextIdx >= currentShuffled.length) {
        nextShuffled = shuffle(tips);
        setShuffled(nextShuffled);
        nextIdx = 0;
      }
      setIdx(nextIdx);
      setText(nextShuffled[nextIdx] || '');
      slideAnim.setValue(8);
      animRef.current = Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 260, useNativeDriver: false }),
        Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: false }),
      ]);
      animRef.current.start();
    });
  }, [tips]);

  // Interval timer
  useEffect(() => {
    if (shuffled.length === 0 || paused || !active) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => {
      setIdx(prev => { transitionNext(shuffled, prev); return prev; });
    }, intervalMs);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [shuffled, intervalMs, paused, active, transitionNext]);

  // Cleanup
  useEffect(() => () => {
    animRef.current?.stop();
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
  }, []);

  // Tap to pause 5 seconds (only on the text area, not the tips button)
  const handleTextPress = useCallback(() => {
    if (paused) {
      setPaused(false);
      if (pauseTimer.current) clearTimeout(pauseTimer.current);
      return;
    }
    setPaused(true);
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => setPaused(false), 5000);
  }, [paused]);

  if (!text) return null;

  return (
    <>
      <TipsHubModal
        visible={showTipsHub}
        onClose={() => setShowTipsHub(false)}
        primary={primary}
      />

      <View style={[s.wrap, { borderColor: primary + '25', backgroundColor: primary + '07' }]}>
        {/* Left glow line */}
        <Animated.View style={[s.leftGlow, { backgroundColor: paused ? primary + '60' : primary, opacity: paused ? 1 : pulse }]} />

        {/* Text area — tappable for pause, full text, auto-height */}
        <TouchableOpacity
          onPress={handleTextPress}
          activeOpacity={0.85}
          style={s.textArea}
          hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
        >
          <Animated.Text
            style={[s.tipText, {
              color: paused ? primary + 'AA' : primary,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              ...Platform.select({
                ios: { textShadowColor: primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 },
                android: {},
              }),
            }]}
          >
            {paused ? '⏸ ' + text : text}
          </Animated.Text>
        </TouchableOpacity>

        {/* TIPS button */}
        <TouchableOpacity
          onPress={() => { setPaused(true); setShowTipsHub(true); }}
          style={[s.tipsBtn, { borderColor: primary + '50', backgroundColor: primary + '12' }]}
          activeOpacity={0.8}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <MaterialIcons name="lightbulb-outline" size={10} color={primary} />
          <Text style={[s.tipsBtnTxt, { color: primary }]}>TIPS</Text>
        </TouchableOpacity>

        {/* Right LED */}
        <Animated.View style={[s.rightLed, { backgroundColor: paused ? primary + '60' : primary, opacity: paused ? 0.8 : pulse,
          ...Platform.select({ ios: { shadowColor: primary, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:6 }, android:{} }),
        }]} />
      </View>
    </>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minHeight: 40,
  },
  leftGlow: {
    width: 2.5,
    height: 14,
    borderRadius: 2,
    flexShrink: 0,
    marginRight: 8,
    alignSelf: 'center',
  },
  textArea: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 6,
  },
  tipText: {
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 0.3,
    lineHeight: 16,
    // NO numberOfLines — full text always visible
    flexWrap: 'wrap',
  },
  tipsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexShrink: 0,
    marginLeft: 6,
  },
  tipsBtnTxt: {
    fontSize: 8,
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 0.5,
  },
  rightLed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
    marginLeft: 6,
    alignSelf: 'center',
  },
});
