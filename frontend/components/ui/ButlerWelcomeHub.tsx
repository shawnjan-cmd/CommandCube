/**
 * ButlerWelcomeHub — Rich empty-state for the Butler AI chat screen.
 *
 *  Shown when there are zero messages in the conversation. Replaces the old
 *  "tiny icon + one line" empty state with a real welcome surface:
 *
 *    1. Time-aware greeting + animated avatar
 *    2. Live status card (connected / model / latency)
 *    3. Categorized prompt cards (2-col grid)
 *    4. Capability pills row ("Butler can…")
 *    5. Rotating tip of the day
 *
 *  100% RN + reanimated/expo-linear-gradient. Theme-aware via accent prop.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { haptics } from '@/services/haptics';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const BODY_FONT: any = Platform.OS === 'ios' ? 'System' : 'sans-serif';

type PromptCard = {
  key: string;
  icon: string;
  iconLib?: 'mc' | 'mi';
  title: string;
  desc: string;
  cmd: string;
  hue: string;
};

const PROMPT_CARDS: PromptCard[] = [
  {
    key: 'pc-stats',
    icon: 'speedometer',
    iconLib: 'mc',
    title: 'PC Health Snapshot',
    desc: 'CPU, RAM, disk + OS info at a glance',
    hue: '#3EC8FF',
    cmd: 'Run: import psutil, platform; cpu=psutil.cpu_percent(interval=1); ram=psutil.virtual_memory(); disk=psutil.disk_usage("C:\\"); print(f"Host: {platform.node()}\\nCPU: {cpu}%\\nRAM: {ram.used//1024**3:.1f}/{ram.total//1024**3:.1f}GB ({ram.percent}%)\\nDisk: {disk.used//1024**3:.1f}/{disk.total//1024**3:.1f}GB ({disk.percent}%)\\nOS: {platform.system()} {platform.release()}")',
  },
  {
    key: 'clean-temp',
    icon: 'broom',
    iconLib: 'mc',
    title: 'Clean Temp Files',
    desc: 'Sweep %TEMP% & Windows\\Temp safely',
    hue: '#00FF88',
    cmd: 'Write and run a Python script to delete all temp files from %TEMP% and C:\\Windows\\Temp and report how many MB were freed',
  },
  {
    key: 'sort-downloads',
    icon: 'folder-multiple-outline',
    iconLib: 'mc',
    title: 'Sort Downloads',
    desc: 'Auto-organize by file type',
    hue: '#F5A623',
    cmd: 'Write and run a Python script to organize my Downloads folder — sort all files into subfolders by type: Images, Videos, Documents, Archives, Installers, Code',
  },
  {
    key: 'find-dupes',
    icon: 'file-search-outline',
    iconLib: 'mc',
    title: 'Find Duplicates',
    desc: 'MD5-hash scan for repeated files',
    hue: '#BF00FF',
    cmd: 'Write a Python script to find all duplicate files in my Downloads folder using MD5 hash comparison and list them with their sizes',
  },
  {
    key: 'top-procs',
    icon: 'apps',
    iconLib: 'mi',
    title: 'Top Processes',
    desc: 'See what is eating CPU & RAM',
    hue: '#3EC8FF',
    cmd: 'Run: import psutil; procs=sorted(psutil.process_iter(["pid","name","cpu_percent","memory_percent"]), key=lambda p: p.info.get("cpu_percent") or 0, reverse=True); [print(f\'[{p.info["pid"]}] {p.info["name"]:<28} CPU:{p.info.get("cpu_percent",0):.1f}%  MEM:{p.info.get("memory_percent",0):.1f}%\') for p in procs[:10]]',
  },
  {
    key: 'backup',
    icon: 'archive-outline',
    iconLib: 'mc',
    title: 'Backup Documents',
    desc: 'Timestamped ZIP onto Desktop',
    hue: '#00FF88',
    cmd: 'Write and run a Python script to backup my Documents folder as a timestamped ZIP file on my Desktop',
  },
];

const CAPABILITIES = [
  { icon: 'language-python',     label: 'Run Python',   color: '#3EC8FF' },
  { icon: 'chip',                label: 'Read stats',   color: '#00FF88' },
  { icon: 'folder-cog-outline',  label: 'Manage files', color: '#F5A623' },
  { icon: 'head-cog-outline',    label: 'Search KB',    color: '#BF00FF' },
  { icon: 'code-braces-box',     label: 'Build scripts',color: '#7FE3FF' },
  { icon: 'chat-processing-outline', label: 'Chat',     color: '#FF6BCB' },
];

const TIPS = [
  'Tap a card to send the command instantly — or just type your own request.',
  'Butler runs every command on YOUR PC over local Wi-Fi. Nothing touches the cloud.',
  'Long-press a chat bubble to copy, react, or save the reply as a script.',
  'Type "what can you do" any time for a live capability tour.',
  'After any reply, tap a follow-up chip for the next likely question.',
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Good night';
}

export default function ButlerWelcomeHub({
  accentColor,
  isConnected,
  modelName,
  onSendPrompt,
  onBuildScript,
}: {
  accentColor: string;
  isConnected: boolean;
  modelName?: string | null;
  onSendPrompt: (cmd: string) => void;
  onBuildScript: () => void;
}) {
  const pr = accentColor || '#3EC8FF';

  // Tip rotator
  const [tipIdx, setTipIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 6500);
    return () => clearInterval(id);
  }, []);

  // Avatar breathing
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ])).start();
  }, [pulse]);
  const haloOp    = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });
  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.18] });

  const greet = useMemo(greeting, []);
  const statusColor = isConnected ? '#00FF88' : '#FF6B6B';
  const statusLabel = isConnected ? 'ONLINE' : 'OFFLINE';

  const tap = (cmd: string) => { haptics.medium(); onSendPrompt(cmd); };

  return (
    <View style={s.wrap}>
      {/* ── 1. Greeting + Avatar ─────────────────────────────────── */}
      <View style={s.heroRow}>
        <View style={s.avatarWrap}>
          <Animated.View style={[s.avatarHalo, {
            opacity: haloOp,
            transform: [{ scale: haloScale }],
            backgroundColor: pr,
          }]} />
          <LinearGradient
            colors={[pr + 'DD', pr + '40']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.avatarRing}
          >
            <View style={s.avatarInner}>
              <MaterialCommunityIcons name="robot-happy-outline" size={30} color={pr} />
            </View>
          </LinearGradient>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.greetLabel, { color: pr + '85' }]}>· BUTLER ONLINE</Text>
          <Text style={s.greetTitle}>{greet}</Text>
          <Text style={s.greetSub}>Ready when you are.</Text>
        </View>
      </View>

      {/* ── 2. Live status card ──────────────────────────────────── */}
      <LinearGradient
        colors={['rgba(8,20,38,0.95)', 'rgba(3,8,16,0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[s.statusCard, { borderColor: pr + '30' }]}
      >
        <View style={s.statusItem}>
          <View style={[s.statusDot, { backgroundColor: statusColor,
            shadowColor: statusColor, shadowOpacity: 0.9, shadowRadius: 6 }]} />
          <View>
            <Text style={s.statusKey}>LINK</Text>
            <Text style={[s.statusVal, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <View style={s.statusDivider} />
        <View style={s.statusItem}>
          <MaterialCommunityIcons name="brain" size={16} color={pr} />
          <View>
            <Text style={s.statusKey}>MODEL</Text>
            <Text style={[s.statusVal, { color: pr }]} numberOfLines={1}>
              {modelName || 'Ollama Local'}
            </Text>
          </View>
        </View>
        <View style={s.statusDivider} />
        <View style={s.statusItem}>
          <MaterialCommunityIcons name="shield-lock-outline" size={16} color="#00FF88" />
          <View>
            <Text style={s.statusKey}>PRIVACY</Text>
            <Text style={[s.statusVal, { color: '#00FF88' }]}>LAN ONLY</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── 3. Categorized prompt cards (2-col grid) ─────────────── */}
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: pr }]} />
        <Text style={[s.sectionLabel, { color: pr + 'CC' }]}>SUGGESTED COMMANDS</Text>
        <View style={[s.sectionLine, { backgroundColor: pr + '18' }]} />
      </View>
      <View style={s.grid}>
        {PROMPT_CARDS.map((c) => {
          const IconC: any = c.iconLib === 'mi' ? MaterialIcons : MaterialCommunityIcons;
          return (
            <TouchableOpacity
              key={c.key}
              activeOpacity={0.78}
              onPress={() => tap(c.cmd)}
              style={[s.gridCard, { borderColor: c.hue + '40' }]}
            >
              <LinearGradient
                colors={[c.hue + '18', 'rgba(3,8,16,0.95)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={[s.gridIconWrap, { borderColor: c.hue + '55', backgroundColor: c.hue + '12' }]}>
                <IconC name={c.icon as any} size={18} color={c.hue} />
              </View>
              <Text style={s.gridTitle}>{c.title}</Text>
              <Text style={s.gridDesc} numberOfLines={2}>{c.desc}</Text>
              <View style={[s.gridArrow, { borderColor: c.hue + '50' }]}>
                <MaterialIcons name="arrow-forward" size={11} color={c.hue} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Build-your-own CTA ───────────────────────────────────── */}
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => { haptics.medium(); onBuildScript(); }}
        style={s.buildCta}
      >
        <LinearGradient
          colors={['rgba(0,255,136,0.18)', 'rgba(0,255,136,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <MaterialCommunityIcons name="code-braces-box" size={18} color="#00FF88" />
        <View style={{ flex: 1 }}>
          <Text style={s.buildTitle}>Build a Custom Script</Text>
          <Text style={s.buildSub}>Describe what you want — Butler writes & runs it.</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color="#00FF88" />
      </TouchableOpacity>

      {/* ── 4. Capability pills ──────────────────────────────────── */}
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: pr }]} />
        <Text style={[s.sectionLabel, { color: pr + 'CC' }]}>BUTLER CAN…</Text>
        <View style={[s.sectionLine, { backgroundColor: pr + '18' }]} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.capsRow}
      >
        {CAPABILITIES.map(cap => (
          <View key={cap.label} style={[s.capPill, { borderColor: cap.color + '40' }]}>
            <MaterialCommunityIcons name={cap.icon as any} size={13} color={cap.color} />
            <Text style={[s.capTxt, { color: cap.color }]}>{cap.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* ── 5. Tip of the day ────────────────────────────────────── */}
      <View style={[s.tipBar, { borderColor: pr + '25' }]}>
        <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color={pr} />
        <Text style={s.tipTxt} numberOfLines={2}>{TIPS[tipIdx]}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 14,
  },

  /* hero */
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 2,
  },
  avatarWrap: {
    width: 64, height: 64,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarHalo: {
    position: 'absolute',
    width: 64, height: 64, borderRadius: 32,
  },
  avatarRing: {
    width: 60, height: 60, borderRadius: 30,
    padding: 1.5,
  },
  avatarInner: {
    flex: 1, borderRadius: 28.5,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#040A14',
  },
  greetLabel: {
    fontSize: 10, fontWeight: '900', fontFamily: MONO,
    letterSpacing: 1.6, marginBottom: 2,
  },
  greetTitle: {
    color: '#EFF4FF', fontSize: 19, fontWeight: '800',
    fontFamily: BODY_FONT, letterSpacing: 0.2,
  },
  greetSub: {
    color: '#7A9AB8', fontSize: 12.5,
    fontFamily: BODY_FONT, marginTop: 1,
  },

  /* status card */
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderRadius: 14,
    gap: 10,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusDot: { width: 9, height: 9, borderRadius: 4.5 },
  statusDivider: {
    width: 1, height: 26,
    backgroundColor: 'rgba(127,227,255,0.18)',
  },
  statusKey: {
    fontSize: 8.5, fontWeight: '900', fontFamily: MONO,
    color: '#3A5068', letterSpacing: 1.3,
  },
  statusVal: {
    fontSize: 11, fontWeight: '800', fontFamily: MONO,
    letterSpacing: 0.6, marginTop: 1,
  },

  /* section headers */
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: 2, marginBottom: -2, paddingHorizontal: 2,
  },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionLabel: {
    fontSize: 10, fontWeight: '900', fontFamily: MONO,
    letterSpacing: 1.8,
  },
  sectionLine: { flex: 1, height: 1 },

  /* grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    width: '48.4%',
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
    overflow: 'hidden',
    gap: 4,
    position: 'relative',
  },
  gridIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 4,
  },
  gridTitle: {
    color: '#EFF4FF', fontSize: 13, fontWeight: '800',
    fontFamily: BODY_FONT, letterSpacing: 0.2,
  },
  gridDesc: {
    color: '#7A9AB8', fontSize: 10.5,
    fontFamily: BODY_FONT, lineHeight: 14,
    marginTop: 2,
  },
  gridArrow: {
    position: 'absolute',
    top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  /* build CTA */
  buildCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: 'rgba(0,255,136,0.45)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  buildTitle: {
    color: '#EFF4FF', fontSize: 13, fontWeight: '800',
    fontFamily: BODY_FONT,
  },
  buildSub: {
    color: '#7A9AB8', fontSize: 10.5, fontFamily: BODY_FONT,
    marginTop: 1,
  },

  /* capability pills */
  capsRow: { gap: 7, paddingRight: 16, paddingVertical: 2 },
  capPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 18, borderWidth: 1,
    backgroundColor: 'rgba(3,8,16,0.7)',
  },
  capTxt: {
    fontSize: 11, fontWeight: '700', fontFamily: BODY_FONT,
  },

  /* tip */
  tipBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderRadius: 12,
    backgroundColor: 'rgba(8,20,38,0.6)',
    marginTop: 2,
  },
  tipTxt: {
    flex: 1,
    color: '#9CB2C8', fontSize: 11.5,
    fontFamily: BODY_FONT, lineHeight: 16,
  },
});
