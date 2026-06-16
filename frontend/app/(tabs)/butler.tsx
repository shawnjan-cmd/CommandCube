/**
 * ⚡ BUTLER AI — NEXUS COMMAND CONSOLE v5.3
 * Performance optimized:
 * - inputText state moved INSIDE CommandConsoleBarThemed (zero re-renders on typing)
 * - sendMessage stale-closure fixed via useEffect ref assignment
 * - isAtBottom ref pattern (no stale closure)
 * - Enriched context capped at 3000 chars (prevents 4K model overflow)
 * - AI chat timeout raised to 120s base (Ollama cold-start needs ~90s)
 * - Script keyword suggestion chips after AI responses
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {

  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, ActivityIndicator, KeyboardAvoidingView,
  Alert, Animated, Dimensions, Modal, Image, Easing,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { haptics } from '@/services/haptics';
import { logger } from '@/utils/logger';
import * as Clipboard from 'expo-clipboard';
import { InlineWidgetSlot, WidgetLayer } from '@/components/ui/WidgetLayer';
import NexusQuickChips, { BUTLER_DEFAULT_CHIPS } from '@/components/butler/NexusQuickChips';
import { useCosmetic } from '@/contexts/CosmeticContext';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File as FsFile } from 'expo-file-system';

import ButlerWelcomeHub from '@/components/ui/ButlerWelcomeHub';
import { useChatHistory } from '@/hooks/useChatHistory';
import { buildHistoryOnly } from '@/utils/contextManager';
import { BUTLER_STARTER_KNOWLEDGE, BUTLER_KNOWLEDGE_COMPACT } from '@/constants/butlerKnowledge';
import { serverConnection } from '@/services/serverConnection';
import { serverMetrics } from '@/services/serverMetrics';
import { taskMemory } from '@/services/taskMemory';
import { autoErrorLogger } from '@/services/autoErrorLogger';
import { knowledgeAccumulator } from '@/services/knowledgeAccumulator';
import { extractPythonCode, saveButlerScript, loadButlerScripts } from '@/services/butlerScripts';
import { nexusBridge } from '@/services/nexusBridge';
import { knowledgeGrowthEngine } from '@/services/knowledgeGrowthEngine';
import { autoConnectEngine, EngineEvent } from '@/services/autoConnectEngine';
import { runSynapseHeal, makeBrokenScript, SynapseState, SynapseLog } from '@/services/synapseHeal';
// nexusWS / WsState removed — autoConnectEngine is the single source of truth

// Helper — must be defined AFTER all imports (Metro/Babel strict-mode
// requires every `import` to appear before any other statement).
function isAuthDisabled(): boolean {
  try { return (serverConnection as any).isAuthDisabled?.() === true; } catch { return false; }
}

const { width: SW } = Dimensions.get('window');
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const BODY_FONT: any = Platform.OS === 'ios' ? 'System' : 'sans-serif';

const ROBOT_BG = require('@/assets/images/butler-robot-tux.jpg');

const C = {
  bg:          '#050505',
  bgDeep:      '#050505',
  surface:     '#0E0F12',
  surfaceHi:   '#1A1D24',
  panel:       '#0A0B0E',
  teal:        '#FF2A1F',
  tealDim:     'rgba(255,42,31,0.08)',
  tealGlow:    'rgba(255,42,31,0.25)',
  green:       '#00FF88',
  greenDim:    '#00FF8820',
  amber:       '#FFC400',
  amberDim:    '#FFC40020',
  purple:      '#FFC400',
  red:         '#FF3131',
  redDim:      '#FF313120',
  cyan:        '#FF2A1F',
  cyanDim:     'rgba(255,42,31,0.08)',
  text:        '#E6E9EF',
  textBright:  '#F4F6F9',
  textDim:     '#6A7384',
  textMid:     '#8C95A6',
  borderFaint: 'rgba(255,42,31,0.12)',
};

type AiBackend = 'ollama' | 'local' | null;
type Role = 'user' | 'butler' | 'system' | 'tool';
type MsgStatus = 'sending' | 'sent' | 'delivered' | 'read';

interface ToolCall {
  name: string;
  status: 'running' | 'done' | 'error';
  result?: string;
}

interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  toolCall?: ToolCall;
  metricsSnapshot?: string;
  status?: MsgStatus;
  reaction?: string;
  metadata?: {
    model?: string;
    responseMs?: number;
    kbUsed?: number;
    tokensPerSec?: number;
    isCached?: boolean;
  };
}

interface ButlerTool {
  name: string;
  trigger: RegExp;
  run: () => Promise<string>;
}

// ── Attachment types (clipboard / file / image quick-send) ─────────────────
type AttachmentKind = 'clipboard' | 'file' | 'image';

interface Attachment {
  id: string;
  kind: AttachmentKind;
  name: string;       // file name or "Clipboard"
  size: number;       // bytes
  mime?: string;
  content?: string;   // text content (UTF-8) — only for text-like files
  preview?: string;   // base64 data-uri for images
  truncated?: boolean;
}

const TEXT_MIME_RE = /^(text\/|application\/(json|xml|x-(yaml|toml|ini)|javascript|x-sh|x-python|x-csh|x-shellscript))/i;
const TEXT_EXT_RE  = /\.(txt|md|markdown|json|jsonl|xml|csv|tsv|log|py|js|jsx|ts|tsx|sh|bash|zsh|fish|yml|yaml|toml|ini|cfg|conf|env|html|htm|css|scss|sql|rs|go|c|h|cpp|hpp|java|kt|swift|rb|php|lua|r|pl|ps1|bat|cmd|dockerfile|gitignore)$/i;
const MAX_TEXT_BYTES = 12_000;   // per-attachment cap inside prompt
const MAX_IMAGE_BYTES = 800_000; // ~600KB image limit
function isLikelyText(name: string, mime?: string): boolean {
  if (mime && TEXT_MIME_RE.test(mime)) return true;
  return TEXT_EXT_RE.test(name);
}
function fmtBytes(b: number): string {
  if (!b) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

const CONV_KEY = '@butler_conv_nexus_v1';
const AI_DISCLOSURE_KEY = '@butler_ai_disclosure_v1';
const USER_AVATAR_KEY = '@butler_user_avatar_v1';
const AI_AVATAR_KEY   = '@butler_ai_avatar_v1';

const INTENT_META: Record<string, { icon: string; color: string; label: string }> = {
  question:     { icon: 'help-outline',  color: '#FF6A1F', label: 'Question'     },
  script:       { icon: 'code',          color: '#00FF88', label: 'Script'       },
  troubleshoot: { icon: 'build',         color: '#FFC400', label: 'Troubleshoot' },
  install:      { icon: 'get-app',       color: '#FF6A1F', label: 'Install'      },
  explain:      { icon: 'library-books', color: '#FF6A1F', label: 'Explain'      },
  general:      { icon: 'smart-toy',     color: '#7A8FA8', label: 'General'      },
};

const SCRIPT_KEYWORD_MAP: [RegExp, string, string][] = [
  [/cpu|slow|lag|performance|speed|overheating/i,   'logs',    'PC Health Check'],
  [/clean|junk|temp|disk|storage|free space/i,      'scripts', 'Cleaning Scripts'],
  [/file|folder|organize|rename|move|sort/i,        'scripts', 'File Scripts'],
  [/network|wifi|ping|port|ip|internet|connection/i,'scripts', 'Network Scripts'],
  [/backup|save|restore|copy|archive/i,             'scripts', 'Backup Scripts'],
  [/security|virus|malware|scan|protect|firewall/i, 'scripts', 'Security Scripts'],
  [/python|script|automat|code|program/i,           'scripts', 'Python Scripts'],
  [/monitor|watch|alert|notify|schedule/i,          'scripts', 'Monitoring Scripts'],
  [/knowledge|learn|crawl|research/i,               'knowledge','Knowledge Base'],
];

function RobotWatermark() {
  return (
    <View
      style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', alignItems: 'flex-end', zIndex: 0, paddingBottom: 70 }]}
      pointerEvents="none"
    >
      <Image
        source={ROBOT_BG}
        style={{ width: '68%', height: '58%', resizeMode: 'contain', opacity: 0.12 }}
      />
    </View>
  );
}

function HUDGridBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[hud.corner, { top: 0, left: 0, borderTopWidth: 1, borderLeftWidth: 1 }]} />
      <View style={[hud.corner, { top: 0, right: 0, borderTopWidth: 1, borderRightWidth: 1 }]} />
      <View style={[hud.corner, { bottom: 0, left: 0, borderBottomWidth: 1, borderLeftWidth: 1 }]} />
      <View style={[hud.corner, { bottom: 0, right: 0, borderBottomWidth: 1, borderRightWidth: 1 }]} />
    </View>
  );
}
const hud = StyleSheet.create({
  corner: { position: 'absolute', width: 24, height: 24, borderColor: 'rgba(255,106,31,0.14)' },
});

function NexusChatHeader({ isConnected, onClear, accentColor, onBuildScript, onToggleVoice, onToggleHistory }: {
  isConnected: boolean;
  onClear: () => void;
  accentColor: string;
  onBuildScript?: () => void;
  onToggleVoice?: () => void;
  onToggleHistory?: () => void;
}) {
  const pr = accentColor;
  const statusCol = isConnected ? C.green : '#FF4466';
  const pulse = useRef(new Animated.Value(0.4)).current;
  const [histActive, setHistActive] = React.useState(false);
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.2, duration: 900, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, []);

  // Compact, persistent PID-style identifier (decorative — visual continuity with
  // user's NEXUS HTML mockup; derives from process uptime so it's stable per session
  // without exposing any real device data).
  const pid = React.useMemo(() => {
    const n = Math.abs(Math.floor((Date.now() / 1000) % 65535)).toString(16).padStart(4, '0').toUpperCase();
    return `0x${n}`;
  }, []);

  return (
    <View>
      {/* ── NEXUS terminal-style status bar (NEW) ───────────────────── */}
      <View style={[nch.statusBar, { borderColor: pr + '22', backgroundColor: '#000000' }]}>
        {/* RGB stoplight dots — terminal-window vibe from nexus-v9 HTML */}
        <View style={nch.stopRow}>
          <View style={[nch.stopDot, { backgroundColor: '#FF4466' }]} />
          <View style={[nch.stopDot, { backgroundColor: '#F59E0B' }]} />
          <View style={[nch.stopDot, { backgroundColor: '#10B981' }]} />
        </View>
        <Text style={[nch.consoleTitle, { color: pr }]} numberOfLines={1}>
          BUTLER AI <Text style={{ color: C.textDim }}>›</Text> <Text style={{ color: C.textMid }}>COMMAND CONSOLE</Text>
        </Text>
        <View style={nch.statusRight}>
          <Animated.View style={[nch.liveDot, { backgroundColor: statusCol, opacity: pulse, shadowColor: statusCol }]} />
          <Text style={[nch.pidTxt, { color: C.textDim }]} numberOfLines={1}>PID {pid}</Text>
        </View>
      </View>

      <View style={nch.wrap}>
        <View style={[nch.iconBox, { borderColor: pr + '50', backgroundColor: pr + '0C' }]}>
          <View style={nch.robotFace}>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              <View style={[nch.eye, { backgroundColor: pr }]} />
              <View style={[nch.eye, { backgroundColor: pr }]} />
            </View>
            <View style={[nch.mouth, { backgroundColor: pr + '60' }]} />
          </View>
          <Animated.View style={[nch.led, { backgroundColor: statusCol, opacity: pulse }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[nch.title, { color: C.textBright }]}>
            BUTLER <Text style={{ color: pr }}>· AI</Text>
          </Text>
          <Text style={[nch.sub, { color: statusCol + '90' }]}>
            {isConnected ? '✦ self-learning  ·  nexus-flash  ·  local' : 'offline · connect PC from Home tab'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClear}
          style={[nch.iconBtn, { borderColor: C.red + '25', backgroundColor: C.red + '06' }]}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          activeOpacity={0.75}
        >
          <MaterialIcons name="delete-sweep" size={15} color={C.red + '60'} />
        </TouchableOpacity>
      </View>
      {/* ── Toolbar row ── */}
      <View style={nch.toolbarRow}>
        <TouchableOpacity
          onPress={onBuildScript}
          style={[nch.toolBtn, { borderColor: pr + '35', backgroundColor: pr + '09' }]}
          activeOpacity={0.78}
        >
          <MaterialIcons name="auto-awesome" size={12} color={pr} />
          <Text style={[nch.toolBtnTxt, { color: pr }]}>✦ BUILD SCRIPT</Text>
        </TouchableOpacity>
        <View style={nch.toolSep} />
        <TouchableOpacity
          onPress={() => { setHistActive(v => !v); onToggleHistory?.(); }}
          style={[nch.toolBtn, { borderColor: (histActive ? pr : C.textDim) + '35', backgroundColor: histActive ? pr + '12' : 'transparent' }]}
          activeOpacity={0.78}
        >
          <MaterialIcons name="history" size={12} color={histActive ? pr : C.textDim} />
          <Text style={[nch.toolBtnTxt, { color: histActive ? pr : C.textDim }]}>HISTORY</Text>
        </TouchableOpacity>
        <View style={nch.toolSep} />
        <TouchableOpacity
          onPress={onToggleVoice}
          style={[nch.toolBtn, { borderColor: C.amber + '35', backgroundColor: 'transparent' }]}
          activeOpacity={0.78}
        >
          <MaterialIcons name="mic" size={12} color={C.amber} />
          <Text style={[nch.toolBtnTxt, { color: C.amber }]}>VOICE</Text>
        </TouchableOpacity>
        {/* Model indicator badge — terminal-style */}
        <View style={[nch.modelBadge, { borderColor: C.purple + '30', backgroundColor: C.purple + '08' }]}>
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: isConnected ? C.green : '#FF4466' }} />
          <Text style={[nch.modelTxt, { color: C.purple }]}>OLLAMA</Text>
        </View>
      </View>
    </View>
  );
}
const nch = StyleSheet.create({
  wrap:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,42,31,0.12)', backgroundColor: '#0E0F12' },
  iconBox:   { width: 46, height: 46, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', overflow: 'hidden' },
  robotFace: { alignItems: 'center', gap: 3, zIndex: 2 },
  eye:       { width: 7, height: 5, borderRadius: 2.5 },
  mouth:     { width: 12, height: 2.5, borderRadius: 1.5 },
  led:       { position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: 3.5 },
  title:     { fontSize: 15, fontWeight: '800', fontFamily: BODY_FONT, letterSpacing: 0.4 },
  sub:       { fontSize: 9, fontFamily: MONO, letterSpacing: 0.4, marginTop: 1 },
  iconBtn:   { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  toolbarRow:{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0E0F12', borderBottomWidth: 1, borderBottomColor: 'rgba(255,42,31,0.10)' },
  toolBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, flexShrink: 0 },
  toolBtnTxt:{ fontSize: 9, fontWeight: '800', fontFamily: MONO, letterSpacing: 0.7 },
  toolSep:   { width: 1, height: 18, backgroundColor: 'rgba(255,42,31,0.1)', marginHorizontal: 2 },
  modelBadge:{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, borderWidth: 1, marginLeft: 'auto' as any },
  modelTxt:  { fontSize: 8, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  // Terminal-window status bar at very top
  statusBar:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1 },
  stopRow:      { flexDirection: 'row', gap: 5, alignItems: 'center' },
  stopDot:      { width: 9, height: 9, borderRadius: 5 },
  consoleTitle: { flex: 1, fontSize: 10, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.6, textAlign: 'center' },
  statusRight:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot:      { width: 7, height: 7, borderRadius: 4, ...(Platform.OS === 'ios' ? { shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } } : {}) },
  pidTxt:       { fontSize: 9, fontFamily: MONO, fontWeight: '700', letterSpacing: 0.7 },
});

const QUICK_CHIPS = [
  { icon: 'memory',            label: 'PC Stats',      cmd: 'Run: import psutil, platform; cpu=psutil.cpu_percent(interval=1); ram=psutil.virtual_memory(); disk=psutil.disk_usage("C:\\"); print(f"Host: {platform.node()}\\nCPU: {cpu}%\\nRAM: {ram.used//1024**3:.1f}/{ram.total//1024**3:.1f}GB ({ram.percent}%)\\nDisk: {disk.used//1024**3:.1f}/{disk.total//1024**3:.1f}GB ({disk.percent}%)\\nOS: {platform.system()} {platform.release()}")' },
  { icon: 'cleaning-services', label: 'Clean Temp',    cmd: 'Write and run a Python script to delete all temp files from %TEMP% and C:\\Windows\\Temp and report how many MB were freed' },
  { icon: 'folder-special',    label: 'Sort Downloads', cmd: 'Write and run a Python script to organize my Downloads folder — sort all files into subfolders by type: Images, Videos, Documents, Archives, Installers, Code' },
  { icon: 'find-in-page',      label: 'Find Dupes',    cmd: 'Write a Python script to find all duplicate files in my Downloads folder using MD5 hash comparison and list them with their sizes' },
  { icon: 'apps',              label: 'Top Processes', cmd: 'Run: import psutil; procs=sorted(psutil.process_iter(["pid","name","cpu_percent","memory_percent"]), key=lambda p: p.info.get("cpu_percent") or 0, reverse=True); [print(f\'[{p.info["pid"]}] {p.info["name"]:<28} CPU:{p.info.get("cpu_percent",0):.1f}%  MEM:{p.info.get("memory_percent",0):.1f}%\') for p in procs[:10]]' },
  { icon: 'backup',            label: 'Backup Docs',   cmd: 'Write and run a Python script to backup my Documents folder as a timestamped ZIP file on my Desktop' },
  { icon: 'wifi',              label: 'Network Info',  cmd: 'Run: import socket, subprocess, psutil; h=socket.gethostname(); ip=socket.gethostbyname(h); net=psutil.net_io_counters(); ping=subprocess.run(["ping","-n","2","8.8.8.8"],capture_output=True,text=True); print(f"Host: {h}\\nIP: {ip}\\nSent: {net.bytes_sent//1024//1024:.1f}MB | Recv: {net.bytes_recv//1024//1024:.1f}MB\\nPing: {[l for l in ping.stdout.split(chr(10)) if \'Average\' in l] or [\'OK\']}")' },
  { icon: 'psychology',        label: 'KB Status',     cmd: 'What topics are in my Knowledge Base right now? How many findings do you have? What are the most-asked topics?' },
];

function QuickSuggestionChips({ onTap, onBuildScript, accentColor }: {
  onTap: (cmd: string) => void;
  onBuildScript: () => void;
  accentColor?: string;
}) {
  const pr = accentColor || C.teal;
  return (
    <View style={qsc.wrap}>
      <View style={qsc.header}>
        <View style={[qsc.dot, { backgroundColor: pr }]} />
        <Text style={[qsc.label, { color: pr + '55' }]}>QUICK START</Text>
        <View style={[qsc.headerLine, { backgroundColor: pr + '15' }]} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingRight: 16 }}>
        <TouchableOpacity
          onPress={() => { haptics.medium(); onBuildScript(); }}
          activeOpacity={0.78}
          style={[qsc.buildChip, { borderColor: C.green + '55', backgroundColor: C.green + '10' }]}
        >
          <MaterialCommunityIcons name="code-braces-box" size={15} color={C.green} />
          <Text style={[qsc.buildChipTxt, { color: C.green }]}>⚡ Build Script</Text>
        </TouchableOpacity>
        {QUICK_CHIPS.map((c, i) => (
          <TouchableOpacity key={i} onPress={() => { haptics.medium(); onTap(c.cmd); }} activeOpacity={0.75}
            style={[qsc.chip, { borderColor: pr + '35', backgroundColor: pr + '0C' }]}>
            <MaterialIcons name={c.icon as any} size={13} color={pr} />
            <Text style={[qsc.chipTxt, { color: pr + 'CC' }]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
const qsc = StyleSheet.create({
  wrap:         { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10, gap: 10 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot:          { width: 6, height: 6, borderRadius: 3 },
  label:        { fontSize: 10, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.8 },
  headerLine:   { flex: 1, height: 1 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5 },
  chipTxt:      { fontFamily: BODY_FONT, fontSize: 12, fontWeight: '600' },
  buildChip:    { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, borderWidth: 2 },
  buildChipTxt: { fontFamily: BODY_FONT, fontSize: 13, fontWeight: '800' },
});

function FollowUpChips({ chips, onTap, accentColor }: { chips: string[]; onTap: (cmd: string) => void; accentColor: string }) {
  const pr = accentColor;
  return (
    <View style={{ marginHorizontal: 14, marginBottom: 12, marginTop: 4, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: pr }} />
        <Text style={{ fontSize: 9, fontWeight: '900', color: pr + '70', fontFamily: MONO, letterSpacing: 1.5 }}>RELATED</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: pr + '18' }} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {chips.map((chip, i) => (
          <TouchableOpacity key={i} onPress={() => { haptics.medium(); onTap(chip); }} activeOpacity={0.78}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5,
              borderColor: pr + '45', backgroundColor: pr + '0E', borderRadius: 22,
              paddingHorizontal: 14, paddingVertical: 9 }}>
            <MaterialIcons name="subdirectory-arrow-right" size={12} color={pr + 'AA'} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: pr + 'DD', fontFamily: BODY_FONT }}>{chip}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function ContextStrip({ responseTimeMs, model, modelSize, kbUsed, isCached, intent }: {
  responseTimeMs: number | null; model: string; modelSize?: string; kbUsed?: number;
  isCached?: boolean; intent?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!responseTimeMs && !isCached) return null;

  const isInstant = isCached || (responseTimeMs !== null && responseTimeMs < 200);
  const timeStr = isCached ? '⚡ instant' : responseTimeMs !== null ? (responseTimeMs > 1000 ? `${(responseTimeMs / 1000).toFixed(1)}s` : `${responseTimeMs}ms`) : '';
  const timeColor = isCached ? C.green : responseTimeMs !== null ? (responseTimeMs < 1000 ? C.green : responseTimeMs < 5000 ? C.amber : C.red) : C.green;
  const timeBg = isCached ? C.greenDim : responseTimeMs !== null ? (responseTimeMs < 1000 ? C.greenDim : responseTimeMs < 5000 ? C.amberDim : C.redDim) : C.greenDim;
  const intentMeta = intent && INTENT_META[intent] ? INTENT_META[intent] : null;

  const modelShort = model
    ? model.replace('qwen2.5-coder', 'QWEN').replace('qwen2.5', 'QWEN').replace('llama', 'LLAMA')
           .toUpperCase().split(':')[0].slice(0, 12)
    : 'LOCAL';
  const sizeTag = modelSize ? ` · ${modelSize}` : '';

  return (
    <TouchableOpacity onPress={() => setExpanded(v => !v)} style={cst.wrap}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }} activeOpacity={0.7}>
      <View style={cst.row}>
        <View style={[cst.chip, { borderColor: C.teal + '20', backgroundColor: C.tealDim }]}>
          <MaterialIcons name="memory" size={10} color={C.teal + '70'} />
          <Text style={[cst.chipTxt, { color: C.textDim }]}>{modelShort}{sizeTag}</Text>
        </View>
        <View style={[cst.chip, { borderColor: timeColor + '30', backgroundColor: timeBg }]}>
          <MaterialIcons name="bolt" size={10} color={timeColor + '80'} />
          <Text style={[cst.chipTxt, { color: timeColor + '90' }]}>{timeStr}</Text>
        </View>
        {kbUsed && kbUsed > 0 ? (
          <View style={[cst.chip, { borderColor: C.purple + '25', backgroundColor: C.purple + '0A' }]}>
            <MaterialIcons name="library-books" size={10} color={C.purple + '70'} />
            <Text style={[cst.chipTxt, { color: C.purple + '80' }]}>📚 {kbUsed} sources</Text>
          </View>
        ) : null}
        {intentMeta ? (
          <View style={[cst.chip, { borderColor: intentMeta.color + '30', backgroundColor: intentMeta.color + '0A' }]}>
            <MaterialIcons name={intentMeta.icon as any} size={10} color={intentMeta.color + '80'} />
            <Text style={[cst.chipTxt, { color: intentMeta.color + '90' }]}>{intentMeta.label}</Text>
          </View>
        ) : null}
        {isCached ? (
          <View style={[cst.chip, { borderColor: C.green + '40', backgroundColor: C.green + '0C' }]}>
            <MaterialIcons name="bolt" size={10} color={C.green + '90'} />
            <Text style={[cst.chipTxt, { color: C.green + '90' }]}>Cached</Text>
          </View>
        ) : null}
        <View style={[cst.chip, { borderColor: C.green + '20', backgroundColor: C.greenDim }]}>
          <MaterialIcons name="lock" size={9} color={C.green + '60'} />
          <Text style={[cst.chipTxt, { color: C.green + '70' }]}>LOCAL</Text>
        </View>
      </View>
      {expanded ? (
        <Text style={cst.detail}>
          {model || 'Local AI'}{sizeTag ? ` (${modelSize})` : ''} · {timeStr} · All processing on your PC. Zero cloud.
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}
const cst = StyleSheet.create({
  wrap:    { marginHorizontal: 16, marginBottom: 12, marginTop: -6 },
  row:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 7,
             paddingHorizontal: 9, paddingVertical: 5 },
  chipTxt: { fontSize: 10, fontWeight: '600', fontFamily: MONO, letterSpacing: 0.3 },
  detail:  { marginTop: 8, fontSize: 11, color: C.textDim, fontFamily: BODY_FONT, lineHeight: 17, paddingHorizontal: 2 },
});

function AIDisclosureModal({ visible, onAccept }: { visible: boolean; onAccept: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={disc.overlay}>
        <View style={disc.sheet}>
          <View style={disc.topAccent} />
          <View style={disc.header}>
            <View style={disc.iconBox}>
              <MaterialIcons name="psychology" size={28} color={C.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={disc.title}>BUTLER <Text style={{ color: C.teal }}>AI</Text></Text>
              <Text style={disc.sub}>LOCAL AI BEHAVIORAL NOTICE</Text>
            </View>
          </View>
          <View style={disc.divider} />
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            {[
              { icon: 'psychology', color: C.teal,  title: 'LOCAL AI ONLY', text: 'Butler AI tracks query categories on-device — never transmitted externally.' },
              { icon: 'lock',       color: C.green, title: 'ZERO CLOUD',    text: 'All conversations, data, and KB stay within your local network.' },
              { icon: 'delete-sweep', color: C.cyan, title: 'YOUR CONTROL', text: 'Delete all data in Settings → Knowledge Base at any time.' },
            ].map(({ icon, color, title, text }) => (
              <View key={title} style={[disc.item, { borderLeftColor: color }]}>
                <MaterialIcons name={icon as any} size={16} color={color} />
                <View style={{ flex: 1 }}>
                  <Text style={[disc.itemTitle, { color }]}>{title}</Text>
                  <Text style={disc.itemText}>{text}</Text>
                </View>
              </View>
            ))}
          </View>
          <TouchableOpacity style={disc.acceptBtn} onPress={onAccept} activeOpacity={0.85}>
            <MaterialIcons name="check-circle" size={18} color="#000" />
            <Text style={disc.acceptTxt}>ENTER BUTLER AI</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const disc = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet:     { width: '100%', maxWidth: 460, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.teal + '30', overflow: 'hidden' },
  topAccent: { height: 3, backgroundColor: C.teal },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20 },
  iconBox:   { width: 56, height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: C.teal + '40', backgroundColor: C.teal + '0C', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title:     { fontSize: 20, fontWeight: '900', fontFamily: MONO, color: C.textBright, letterSpacing: 1.5 },
  sub:       { fontSize: 9, fontFamily: MONO, color: C.textDim, letterSpacing: 1, marginTop: 2 },
  divider:   { height: 1, backgroundColor: C.teal + '18', marginHorizontal: 20, marginVertical: 8 },
  item:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderLeftWidth: 2, paddingLeft: 12, paddingVertical: 4 },
  itemTitle: { fontSize: 10, fontWeight: '900', fontFamily: MONO, letterSpacing: 1, marginBottom: 2 },
  itemText:  { fontSize: 12, color: C.textMid, fontFamily: BODY_FONT, lineHeight: 18 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 20, backgroundColor: C.teal, borderRadius: 12, paddingVertical: 16 },
  acceptTxt: { fontSize: 14, fontWeight: '900', fontFamily: MONO, color: '#000', letterSpacing: 1.5 },
});

// ── Script Suggestion Chips (after AI responses) ────────────────────────────
function ScriptSuggestionChips({ content, onSuggest, accentColor }: {
  content: string;
  onSuggest: (tab: string, label: string) => void;
  accentColor: string;
}) {
  const matched = SCRIPT_KEYWORD_MAP.filter(([re]) => re.test(content)).slice(0, 3);
  if (!matched.length) return null;
  const pr = accentColor;
  return (
    <View style={{ marginHorizontal: 14, marginTop: 4, marginBottom: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {matched.map(([, tab, label], i) => (
        <TouchableOpacity key={i} onPress={() => { haptics.light(); onSuggest(tab, label); }} activeOpacity={0.78}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1,
            borderColor: pr + '40', backgroundColor: pr + '0A', borderRadius: 18,
            paddingHorizontal: 11, paddingVertical: 6 }}>
          <MaterialIcons name="arrow-forward" size={11} color={pr + 'BB'} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: pr + 'CC', fontFamily: MONO }}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Synapse Heal Panel ──────────────────────────────────────────────────────
function SynapseHealPanel({ script, onClose, accentColor }: {
  script: string;
  onClose: () => void;
  accentColor: string;
}) {
  const pr = accentColor;
  const [state, setState] = useState<SynapseState>('idle');
  const [logs, setLogs] = useState<SynapseLog[]>([]);
  const [fixed, setFixed] = useState<string | null>(null);

  const runHeal = useCallback(async () => {
    setState('running');
    setLogs([]);
    setFixed(null);
    try {
      const result = await runSynapseHeal(script, (log) => {
        setLogs(prev => [...prev, log]);
      });
      setState(result.state);
      if (result.fixedScript) setFixed(result.fixedScript);
    } catch (e) {
      setState('failed');
    }
  }, [script]);

  useEffect(() => { runHeal(); }, []);

  const statusColor = state === 'healed' ? C.green : state === 'failed' ? C.red : C.amber;

  return (
    <View style={[shp.wrap, { borderColor: pr + '30' }]}>
      <View style={shp.header}>
        <MaterialCommunityIcons name="heart-pulse" size={14} color={pr} />
        <Text style={[shp.title, { color: pr }]}>SYNAPSE HEAL</Text>
        <View style={{ flex: 1 }} />
        <View style={[shp.badge, { borderColor: statusColor + '50', backgroundColor: statusColor + '12' }]}>
          <Text style={[shp.badgeTxt, { color: statusColor }]}>{state.toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="close" size={14} color={C.textDim} />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
        {logs.map((log, i) => (
          <Text key={i} style={[shp.logLine, { color: log.type === 'error' ? C.red : log.type === 'success' ? C.green : C.textMid }]}>
            {'>'} {log.message}
          </Text>
        ))}
      </ScrollView>
      {fixed ? (
        <TouchableOpacity style={[shp.applyBtn, { backgroundColor: C.green }]}
          onPress={() => { haptics.heavy(); onClose(); }}
          activeOpacity={0.85}>
          <MaterialIcons name="check" size={14} color="#000" />
          <Text style={shp.applyTxt}>APPLY FIXED SCRIPT</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
const shp = StyleSheet.create({
  wrap:     { margin: 12, borderWidth: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0E0F12' },
  header:   { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,42,31,0.1)' },
  title:    { fontSize: 10, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.5 },
  badge:    { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeTxt: { fontSize: 8, fontWeight: '900', fontFamily: MONO },
  logLine:  { fontSize: 10, fontFamily: MONO, paddingHorizontal: 12, paddingVertical: 2, lineHeight: 16 },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 10, borderRadius: 10, paddingVertical: 10 },
  applyTxt: { fontSize: 11, fontWeight: '900', fontFamily: MONO, color: '#000' },
});

// ── Script Builder Modal ────────────────────────────────────────────────────
function ScriptBuilderModal({ visible, onClose, onBuild, accentColor }: {
  visible: boolean;
  onClose: () => void;
  onBuild: (prompt: string) => void;
  accentColor: string;
}) {
  const [prompt, setPrompt] = useState('');
  const pr = accentColor;
  const TEMPLATES = [
    'Monitor CPU and send alert if above 80%',
    'Clean Downloads folder — delete files older than 30 days',
    'Find all large files (>100MB) on C: drive',
    'Auto-restart a process if it crashes',
    'Backup Desktop to external drive daily',
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#0E0F12', borderTopLeftRadius: 20, borderTopRightRadius: 20,
          borderWidth: 1, borderColor: pr + '30', paddingBottom: 32 }}>
          <View style={{ alignItems: 'center', padding: 16 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: pr + '40' }} />
          </View>
          <Text style={{ fontSize: 14, fontWeight: '900', fontFamily: MONO, color: pr,
            paddingHorizontal: 20, marginBottom: 4, letterSpacing: 1.5 }}>⚡ SCRIPT BUILDER</Text>
          <Text style={{ fontSize: 10, fontFamily: MONO, color: C.textDim, paddingHorizontal: 20, marginBottom: 16 }}>
            Describe what you want to automate — Butler AI will write and run it
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12,
            borderWidth: 1.5, borderColor: pr + '40', borderRadius: 12, backgroundColor: '#050505', paddingHorizontal: 12 }}>
            <TextInput
              style={{ flex: 1, fontSize: 14, color: C.textBright, paddingVertical: 12, fontFamily: BODY_FONT }}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="e.g. find all duplicate files and list them..."
              placeholderTextColor={C.textDim}
              multiline
              numberOfLines={3}
              autoFocus
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16, marginBottom: 16 }}>
            {TEMPLATES.map((t, i) => (
              <TouchableOpacity key={i} onPress={() => setPrompt(t)} activeOpacity={0.78}
                style={{ borderWidth: 1, borderColor: pr + '35', backgroundColor: pr + '0A',
                  borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ fontSize: 11, color: pr + 'CC', fontFamily: MONO }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
            <TouchableOpacity onPress={onClose} style={{ flex: 1, borderWidth: 1, borderColor: C.textDim + '40',
              borderRadius: 12, paddingVertical: 14, alignItems: 'center' }} activeOpacity={0.8}>
              <Text style={{ fontSize: 13, fontWeight: '900', fontFamily: MONO, color: C.textDim }}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { if (prompt.trim()) { haptics.heavy(); onBuild(prompt.trim()); onClose(); setPrompt(''); } }}
              style={{ flex: 2, backgroundColor: pr, borderRadius: 12, paddingVertical: 14,
                alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                opacity: prompt.trim() ? 1 : 0.5 }}
              activeOpacity={0.85} disabled={!prompt.trim()}>
              <MaterialIcons name="bolt" size={18} color="#000" />
              <Text style={{ fontSize: 13, fontWeight: '900', fontFamily: MONO, color: '#000' }}>BUILD & RUN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Message Bubble ──────────────────────────────────────────────────────────
function MessageBubble({ msg, onCopy, onReact, onSave, onSuggest, isLast, accentColor, themeSecondary }: {
  msg: Message;
  onCopy: (text: string) => void;
  onReact: (id: string, emoji: string) => void;
  onSave: (code: string) => void;
  onSuggest: (tab: string, label: string) => void;
  isLast: boolean;
  accentColor: string;
  themeSecondary: string;
}) {
  const isButler = msg.role === 'butler';
  const isSystem = msg.role === 'system';
  const isTool   = msg.role === 'tool';
  const pr = accentColor;
  const sc = themeSecondary;

  const codeBlocks = useMemo(() => extractPythonCode(msg.content), [msg.content]);
  const hasCode = codeBlocks.length > 0;
  const displayText = useMemo(() => {
    let t = msg.content;
    codeBlocks.forEach(cb => { t = t.replace(cb.raw, '').trim(); });
    return t;
  }, [msg.content, codeBlocks]);

  if (isSystem) {
    return (
      <View style={mb.systemRow}>
        <View style={[mb.systemPill, { borderColor: pr + '25', backgroundColor: pr + '08' }]}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: pr }} />
          <Text style={[mb.systemTxt, { color: pr + '80' }]}>{msg.content}</Text>
        </View>
      </View>
    );
  }

  if (isTool) {
    const tc = msg.toolCall;
    const col = tc?.status === 'done' ? C.green : tc?.status === 'error' ? C.red : C.amber;
    return (
      <View style={[mb.toolRow, { borderColor: col + '30', backgroundColor: col + '07' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <MaterialIcons
            name={tc?.status === 'running' ? 'hourglass-empty' : tc?.status === 'done' ? 'check-circle' : 'error'}
            size={13} color={col} />
          <Text style={[mb.toolLabel, { color: col }]}>
            {tc?.name || 'TOOL'} · {(tc?.status || 'running').toUpperCase()}
          </Text>
        </View>
        {tc?.result ? <Text style={[mb.toolResult, { color: C.textMid }]}>{tc.result}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[mb.row, isButler ? mb.butlerRow : mb.userRow]}>
      <View style={[
        mb.bubble,
        isButler
          ? [mb.butlerBubble, { backgroundColor: C.surface, borderColor: pr + '22', borderLeftColor: pr }]
          : [mb.userBubble, { backgroundColor: sc + '18', borderColor: sc + '40' }],
      ]}>
        {/* NEXUS corner brackets — decorative HUD touch (matches HTML mockup) */}
        {isButler ? (
          <>
            <View pointerEvents="none" style={[mb.cornerTL, { borderColor: pr + '70' }]} />
            <View pointerEvents="none" style={[mb.cornerBR, { borderColor: pr + '50' }]} />
          </>
        ) : (
          <>
            <View pointerEvents="none" style={[mb.cornerTR, { borderColor: sc + '70' }]} />
            <View pointerEvents="none" style={[mb.cornerBL, { borderColor: sc + '50' }]} />
          </>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          {isButler ? (
            <>
              <View style={[mb.roleIcon, { borderColor: pr + '50', backgroundColor: pr + '0C' }]}>
                <MaterialIcons name="smart-toy" size={10} color={pr} />
              </View>
              <Text style={[mb.roleLabel, { color: pr }]}>{'BUTLER >'}</Text>
            </>
          ) : (
            <>
              <View style={[mb.roleIcon, { borderColor: sc + '50', backgroundColor: sc + '0C' }]}>
                <MaterialIcons name="person" size={10} color={sc} />
              </View>
              <Text style={[mb.roleLabel, { color: sc }]}>{'USER >'}</Text>
            </>
          )}
          <Text style={mb.timestamp}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {msg.reaction ? <Text style={{ fontSize: 14, marginLeft: 4 }}>{msg.reaction}</Text> : null}
        </View>

        {/* Text content */}
        {displayText ? (
          <Text style={[mb.content, { color: isButler ? C.text : C.textBright }]}>{displayText}</Text>
        ) : null}

        {/* Code blocks */}
        {codeBlocks.map((cb, i) => (
          <View key={i} style={[mb.codeBlock, { borderColor: C.teal + '25', backgroundColor: C.bgDeep }]}>
            <View style={mb.codeHeader}>
              <Text style={[mb.codeLang, { color: C.teal + '80' }]}>{cb.language.toUpperCase()}</Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => { haptics.light(); onCopy(cb.code); }}
                style={[mb.codeAction, { borderColor: C.teal + '30' }]} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                <MaterialIcons name="content-copy" size={11} color={C.teal + '80'} />
                <Text style={[mb.codeActionTxt, { color: C.teal + '80' }]}>COPY</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { haptics.medium(); onSave(cb.code); }}
                style={[mb.codeAction, { borderColor: C.green + '35', backgroundColor: C.green + '09' }]}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                <MaterialIcons name="save" size={11} color={C.green} />
                <Text style={[mb.codeActionTxt, { color: C.green }]}>SAVE</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={mb.codeText}>{cb.code}</Text>
            </ScrollView>
          </View>
        ))}

        {/* Actions */}
        {isButler ? (
          <View style={mb.actions}>
            <TouchableOpacity onPress={() => { haptics.light(); onCopy(msg.content); }}
              style={mb.actionBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <MaterialIcons name="content-copy" size={13} color={C.textDim} />
            </TouchableOpacity>
            {['👍', '👎', '⭐'].map(e => (
              <TouchableOpacity key={e} onPress={() => { haptics.light(); onReact(msg.id, e); }}
                style={[mb.actionBtn, msg.reaction === e && { backgroundColor: pr + '18' }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={{ fontSize: 13 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
const mb = StyleSheet.create({
  row:         { paddingHorizontal: 14, marginBottom: 10 },
  butlerRow:   { alignItems: 'flex-start' },
  userRow:     { alignItems: 'flex-end' },
  bubble:      { maxWidth: SW * 0.88, borderWidth: 1, borderRadius: 16, padding: 14 },
  butlerBubble:{ borderLeftWidth: 3, borderTopLeftRadius: 4 },
  userBubble:  { borderTopRightRadius: 4 },
  roleIcon:    { width: 18, height: 18, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  roleLabel:   { fontSize: 10, fontWeight: '800', fontFamily: MONO, letterSpacing: 0.5 },
  timestamp:   { fontSize: 9, color: C.textDim, fontFamily: MONO, marginLeft: 'auto' as any },
  content:     { fontSize: 14, lineHeight: 22, fontFamily: BODY_FONT },
  codeBlock:   { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginTop: 10 },
  codeHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
                 borderBottomWidth: 1, borderBottomColor: 'rgba(255,42,31,0.1)', backgroundColor: 'rgba(0,0,0,0.3)' },
  codeLang:    { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  codeAction:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 6,
                 paddingHorizontal: 7, paddingVertical: 4 },
  codeActionTxt:{ fontSize: 8, fontWeight: '900', fontFamily: MONO },
  codeText:    { fontSize: 12, color: '#FFB3AD', fontFamily: MONO, padding: 12, lineHeight: 19 },
  actions:     { flexDirection: 'row', gap: 4, marginTop: 10, paddingTop: 8,
                 borderTopWidth: 1, borderTopColor: 'rgba(255,42,31,0.08)' },
  actionBtn:   { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  systemRow:   { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  systemPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20,
                 paddingHorizontal: 14, paddingVertical: 7 },
  systemTxt:   { fontSize: 10, fontFamily: MONO, fontWeight: '700' },
  toolRow:     { marginHorizontal: 14, marginBottom: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  toolLabel:   { fontSize: 10, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  toolResult:  { fontSize: 11, fontFamily: MONO, lineHeight: 17, marginTop: 4 },
  // NEXUS HUD corner brackets — anchored to bubble corners
  cornerTL:    { position: 'absolute', top: 5, left: 5, width: 10, height: 10,
                 borderTopWidth: 1.5, borderLeftWidth: 1.5, borderTopLeftRadius: 3 },
  cornerBR:    { position: 'absolute', bottom: 5, right: 5, width: 10, height: 10,
                 borderBottomWidth: 1.5, borderRightWidth: 1.5, borderBottomRightRadius: 3 },
  cornerTR:    { position: 'absolute', top: 5, right: 5, width: 10, height: 10,
                 borderTopWidth: 1.5, borderRightWidth: 1.5, borderTopRightRadius: 3 },
  cornerBL:    { position: 'absolute', bottom: 5, left: 5, width: 10, height: 10,
                 borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderBottomLeftRadius: 3 },
});

// ── Typing Indicator ────────────────────────────────────────────────────────
function TypingIndicator({ accentColor }: { accentColor: string }) {
  const dot0 = useRef(new Animated.Value(0.3)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const make = (d: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(d, { toValue: 1,   duration: 280, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0.2, duration: 280, useNativeDriver: true }),
        Animated.delay(Math.max(0, 560 - delay)),
      ]));
    const a0 = make(dot0, 0);
    const a1 = make(dot1, 180);
    const a2 = make(dot2, 360);
    a0.start(); a1.start(); a2.start();
    return () => { a0.stop(); a1.stop(); a2.stop(); };
  }, []);
  const pr = accentColor;
  return (
    <View style={[ti.wrap, { borderColor: pr + '22', borderLeftColor: pr }]}>
      <View style={[ti.iconBox, { borderColor: pr + '40', backgroundColor: pr + '0C' }]}>
        <MaterialIcons name="smart-toy" size={11} color={pr} />
      </View>
      <View style={ti.dots}>
        {[dot0, dot1, dot2].map((d, i) => (
          <Animated.View key={i} style={[ti.dot, { backgroundColor: pr, opacity: d }]} />
        ))}
      </View>
      <Text style={[ti.label, { color: pr + '70' }]}>{'BUTLER > processing...'}</Text>
    </View>
  );
}
const ti = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 14, marginBottom: 10,
             borderWidth: 1, borderLeftWidth: 3, borderRadius: 12, padding: 12, backgroundColor: C.surface },
  iconBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dots:    { flexDirection: 'row', gap: 4 },
  dot:     { width: 6, height: 6, borderRadius: 3 },
  label:   { fontSize: 10, fontFamily: MONO, letterSpacing: 0.5 },
});

// ── Command Console Bar ──────────────────────────────────────────────────────
function CommandConsoleBarThemed({ onSend, isConnected, disabled, accentColor }: {
  onSend: (text: string) => void;
  isConnected: boolean;
  disabled: boolean;
  accentColor: string;
}) {
  const [inputText, setInputText] = useState('');
  const [focused, setFocused] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pickingKind, setPickingKind] = useState<AttachmentKind | null>(null);
  const inputRef = useRef<TextInput>(null);
  const sendRef  = useRef(onSend);
  useEffect(() => { sendRef.current = onSend; }, [onSend]);

  // Pick up any prompt typed in the floating QuickButlerBar on another tab.
  // Drains the AsyncStorage handoff key once and pre-fills the composer.
  useEffect(() => {
    let active = true;
    const drainPrefill = async () => {
      try {
        const v = await AsyncStorage.getItem('@butler_prefill_prompt');
        if (active && v && v.trim()) {
          setInputText(v);
          await AsyncStorage.removeItem('@butler_prefill_prompt');
          try { haptics.success(); } catch {}
          // Auto-focus so the user can just tap send (or edit first)
          setTimeout(() => inputRef.current?.focus(), 250);
        }
      } catch {}
    };
    drainPrefill();
    const id = setInterval(drainPrefill, 1500);
    return () => { active = false; clearInterval(id); };
  }, []);

  // ── Quick-action: paste clipboard directly into the composer ────────────
  const pasteClipboard = useCallback(async () => {
    try {
      haptics.light();
      const txt = await Clipboard.getStringAsync();
      if (!txt || !txt.trim()) {
        (global as any).__showConnectionToast?.('Clipboard is empty', '#FFC400');
        return;
      }
      // For large clipboards, attach as a chip; for small text, inline.
      if (txt.length > 600) {
        setAttachments(prev => [...prev, {
          id: `clip-${Date.now()}`,
          kind: 'clipboard',
          name: 'Clipboard',
          size: txt.length,
          mime: 'text/plain',
          content: txt.slice(0, MAX_TEXT_BYTES),
          truncated: txt.length > MAX_TEXT_BYTES,
        }]);
        (global as any).__showConnectionToast?.(`Clipboard attached (${fmtBytes(txt.length)})`, '#00FF88');
      } else {
        setInputText(prev => prev ? `${prev}\n${txt}` : txt);
        (global as any).__showConnectionToast?.('Pasted from clipboard', '#00FF88');
      }
      setTimeout(() => inputRef.current?.focus(), 80);
    } catch (e: any) {
      (global as any).__showConnectionToast?.('Paste failed', '#FF3131');
    }
  }, []);

  // ── Quick-action: attach a file (text-like preferred) ───────────────────
  const attachFile = useCallback(async () => {
    if (pickingKind) return;
    try {
      setPickingKind('file');
      haptics.medium();
      const res: any = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res?.canceled) return;
      const asset = res?.assets?.[0];
      if (!asset?.uri) {
        (global as any).__showConnectionToast?.('No file selected', '#FFC400');
        return;
      }
      const name: string = asset.name || 'file';
      const size: number = asset.size || 0;
      const mime: string = asset.mimeType || '';
      const isText = isLikelyText(name, mime);
      let content: string | undefined;
      let truncated = false;
      if (isText) {
        try {
          const file = new FsFile(asset.uri);
          const raw = await file.text();
          if (raw.length > MAX_TEXT_BYTES) { content = raw.slice(0, MAX_TEXT_BYTES); truncated = true; }
          else content = raw;
        } catch {
          content = undefined;
        }
      }
      setAttachments(prev => [...prev, {
        id: `f-${Date.now()}`,
        kind: 'file',
        name,
        size,
        mime,
        content,
        truncated,
      }]);
      (global as any).__showConnectionToast?.(
        `${name} attached (${fmtBytes(size)})${isText ? '' : ' · binary (metadata only)'}`,
        '#00FF88',
      );
      setTimeout(() => inputRef.current?.focus(), 80);
    } catch (e: any) {
      (global as any).__showConnectionToast?.(`Attach failed: ${e?.message || 'unknown'}`, '#FF3131');
    } finally {
      setPickingKind(null);
    }
  }, [pickingKind]);

  // ── Quick-action: attach an image ───────────────────────────────────────
  const attachImage = useCallback(async () => {
    if (pickingKind) return;
    try {
      setPickingKind('image');
      haptics.medium();
      // Soft-permission check — image picker handles internally on iOS/Android
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => null);
      if (perm && perm.status !== 'granted') {
        (global as any).__showConnectionToast?.('Photos permission denied', '#FFC400');
        return;
      }
      const res: any = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });
      if (res?.canceled) return;
      const asset = res?.assets?.[0];
      if (!asset?.uri) return;
      const name: string = asset.fileName || `image-${Date.now()}.jpg`;
      const sizeApprox = asset.base64 ? Math.floor((asset.base64.length * 3) / 4) : 0;
      const preview = asset.base64 && sizeApprox <= MAX_IMAGE_BYTES
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64.slice(0, 200_000)}`
        : asset.uri;
      setAttachments(prev => [...prev, {
        id: `img-${Date.now()}`,
        kind: 'image',
        name,
        size: sizeApprox,
        mime: asset.mimeType || 'image/jpeg',
        preview,
        truncated: sizeApprox > MAX_IMAGE_BYTES,
      }]);
      (global as any).__showConnectionToast?.(`Image attached (${fmtBytes(sizeApprox)})`, '#00FF88');
      setTimeout(() => inputRef.current?.focus(), 80);
    } catch (e: any) {
      (global as any).__showConnectionToast?.(`Image attach failed: ${e?.message || 'unknown'}`, '#FF3131');
    } finally {
      setPickingKind(null);
    }
  }, [pickingKind]);

  const removeAttachment = useCallback((id: string) => {
    haptics.light();
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  // ── Serialize attachments into the outgoing prompt ─────────────────────
  const buildOutgoingText = useCallback((userText: string, atts: Attachment[]): string => {
    if (!atts.length) return userText;
    const blocks: string[] = [];
    for (const a of atts) {
      if (a.kind === 'image') {
        blocks.push(`[ATTACHMENT image: ${a.name} (${fmtBytes(a.size)}) — base64 preview omitted from history; PC bridge can fetch on demand]`);
      } else if (a.content) {
        const ext = (a.name.split('.').pop() || '').toLowerCase();
        const lang = ext === 'py' ? 'python'
          : ['js','jsx'].includes(ext) ? 'javascript'
          : ['ts','tsx'].includes(ext) ? 'typescript'
          : ['json','jsonl'].includes(ext) ? 'json'
          : ['sh','bash','zsh'].includes(ext) ? 'bash'
          : ['md','markdown'].includes(ext) ? 'markdown'
          : '';
        const label = a.kind === 'clipboard' ? 'CLIPBOARD' : `FILE ${a.name}`;
        const trunc = a.truncated ? ' (truncated to first 12KB)' : '';
        blocks.push(`[ATTACHMENT ${label} · ${fmtBytes(a.size)}${trunc}]\n\`\`\`${lang}\n${a.content}\n\`\`\``);
      } else {
        blocks.push(`[ATTACHMENT file: ${a.name} (${fmtBytes(a.size)}, ${a.mime || 'binary'}) — content not previewed]`);
      }
    }
    const head = userText.trim() || 'Please analyze the attachment(s) below.';
    return `${head}\n\n${blocks.join('\n\n')}`;
  }, []);

  const handleSend = useCallback(() => {
    const t = inputText.trim();
    if (!t && !attachments.length) return;
    haptics.medium();
    const outgoing = buildOutgoingText(t, attachments);
    sendRef.current(outgoing);
    setInputText('');
    setAttachments([]);
  }, [inputText, attachments, buildOutgoingText]);

  const pr = accentColor;
  const canSend = !disabled && (!!inputText.trim() || attachments.length > 0);
  const statusCol = isConnected ? C.green : '#FF4466';
  const charCount = inputText.length;
  const attCount = attachments.length;

  return (
    <View style={[ccb.outer, { backgroundColor: C.bgDeep, borderTopColor: pr + '40' }]}>
      {/* Top accent glow strip */}
      <View pointerEvents="none" style={[ccb.glowStrip, { backgroundColor: pr + (focused ? '90' : '50') }]} />

      {/* Status strip — slim row above the input */}
      <View style={ccb.statusStrip}>
        <View style={[ccb.statusChip, { borderColor: statusCol + '60', backgroundColor: statusCol + '14' }]}>
          <View style={[ccb.statusDot, {
            backgroundColor: statusCol,
            ...(Platform.OS === 'ios' ? { shadowColor: statusCol, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } } : {}),
          }]} />
          <Text style={[ccb.statusTxt, { color: statusCol }]}>
            {isConnected ? 'BUTLER ONLINE · NEURAL LINK STABLE' : 'OFFLINE · PAIR PC FIRST'}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        {/* Latency / status indicator */}
        <View style={[ccb.latencyChip, { borderColor: pr + '40', backgroundColor: pr + '10' }]}>
          <MaterialIcons name="speed" size={10} color={pr + 'CC'} />
          <Text style={[ccb.latencyTxt, { color: pr + 'CC' }]}>LAN</Text>
        </View>
        <Text style={[ccb.charTxt, {
          color: charCount > 1700 ? '#FF4466' : charCount > 0 ? pr + 'AA' : C.textDim,
        }]}>{charCount}/2000</Text>
      </View>

      {/* ── Attachment chip preview row ──────────────────────────── */}
      {attCount > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingBottom: 6 }}
        >
          {attachments.map(att => {
            const kindCol = att.kind === 'image' ? C.purple
              : att.kind === 'clipboard' ? C.green
              : pr;
            const kindIcon: any = att.kind === 'image' ? 'image'
              : att.kind === 'clipboard' ? 'content-paste'
              : 'insert-drive-file';
            return (
              <View
                key={att.id}
                style={[ccb.attChip, { borderColor: kindCol + '55', backgroundColor: kindCol + '10' }]}
              >
                {att.kind === 'image' && att.preview ? (
                  <Image source={{ uri: att.preview }} style={ccb.attThumb} />
                ) : (
                  <MaterialIcons name={kindIcon} size={13} color={kindCol} />
                )}
                <View style={{ maxWidth: 130 }}>
                  <Text style={[ccb.attName, { color: kindCol }]} numberOfLines={1}>
                    {att.name}
                  </Text>
                  <Text style={[ccb.attMeta, { color: kindCol + '99' }]} numberOfLines={1}>
                    {fmtBytes(att.size)}{att.truncated ? ' · trimmed' : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeAttachment(att.id)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={[ccb.attClose, { backgroundColor: kindCol + '22' }]}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="close" size={11} color={kindCol} />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      ) : null}

      {/* ── Attach toolbar (quick clipboard / file / image send) ────── */}
      <View style={ccb.attachBar}>
        <TouchableOpacity
          onPress={pasteClipboard}
          disabled={disabled}
          style={[ccb.attachBtn, { borderColor: C.green + '40', backgroundColor: C.green + '0A', opacity: disabled ? 0.4 : 1 }]}
          activeOpacity={0.75}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialIcons name="content-paste" size={13} color={C.green} />
          <Text style={[ccb.attachTxt, { color: C.green }]}>PASTE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={attachFile}
          disabled={disabled || pickingKind !== null}
          style={[ccb.attachBtn, { borderColor: pr + '40', backgroundColor: pr + '0A', opacity: (disabled || pickingKind !== null) ? 0.5 : 1 }]}
          activeOpacity={0.75}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          {pickingKind === 'file'
            ? <ActivityIndicator size="small" color={pr} />
            : <MaterialIcons name="attach-file" size={13} color={pr} />}
          <Text style={[ccb.attachTxt, { color: pr }]}>FILE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={attachImage}
          disabled={disabled || pickingKind !== null}
          style={[ccb.attachBtn, { borderColor: C.purple + '40', backgroundColor: C.purple + '0A', opacity: (disabled || pickingKind !== null) ? 0.5 : 1 }]}
          activeOpacity={0.75}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          {pickingKind === 'image'
            ? <ActivityIndicator size="small" color={C.purple} />
            : <MaterialIcons name="image" size={13} color={C.purple} />}
          <Text style={[ccb.attachTxt, { color: C.purple }]}>IMAGE</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {attCount > 0 ? (
          <View style={[ccb.attCountChip, { borderColor: pr + '40', backgroundColor: pr + '14' }]}>
            <MaterialIcons name="attach-file" size={10} color={pr} />
            <Text style={[ccb.attCountTxt, { color: pr }]}>{attCount} attached</Text>
          </View>
        ) : null}
      </View>

      {/* Input row — beefier */}
      <View style={ccb.wrap}>
        <View style={[ccb.inputWrap, {
          borderColor: focused ? pr : pr + '40',
          backgroundColor: focused ? pr + '0A' : C.surface,
          ...(focused && Platform.OS === 'ios'
            ? { shadowColor: pr, shadowOpacity: 0.7, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } }
            : {}),
        }]}>
          {/* Decorative left rail with corner brackets */}
          <View pointerEvents="none" style={[ccb.cornerTL, { borderColor: pr + 'AA' }]} />
          <View pointerEvents="none" style={[ccb.cornerBR, { borderColor: pr + 'AA' }]} />

          <View style={ccb.promptBlock}>
            <Text style={[ccb.prompt, { color: pr }]}>{'>'}</Text>
            <Text style={[ccb.promptTag, { color: pr + '70' }]}>CMD</Text>
          </View>

          <TextInput
            ref={inputRef}
            style={[ccb.input, { color: C.textBright }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={isConnected ? 'Ask Butler AI anything…  (e.g. "open chrome", "what\'s my CPU?")' : 'Connect PC from Home tab first…'}
            placeholderTextColor={C.textDim}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            blurOnSubmit={false}
            editable={!disabled}
            multiline
            maxLength={2000}
            keyboardAppearance="dark"
            scrollEnabled
          />
        </View>

        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          style={[ccb.sendBtn, {
            backgroundColor: canSend ? pr : pr + '14',
            borderColor: canSend ? pr : pr + '40',
            ...(canSend && Platform.OS === 'ios'
              ? { shadowColor: pr, shadowOpacity: 0.85, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } }
              : {}),
          }]}
          activeOpacity={0.82}
        >
          {disabled
            ? <ActivityIndicator size="small" color={pr} />
            : (
              <>
                <MaterialIcons name="send" size={22} color={canSend ? '#000' : pr + '80'} />
                <Text style={[ccb.sendBtnTxt, { color: canSend ? '#000' : pr + '80' }]}>SEND</Text>
              </>
            )
          }
        </TouchableOpacity>
      </View>

      {/* Bottom corner brackets — frame the whole console */}
      <View pointerEvents="none" style={[ccb.frameBL, { borderColor: pr + '55' }]} />
      <View pointerEvents="none" style={[ccb.frameBR, { borderColor: pr + '55' }]} />
    </View>
  );
}
const ccb = StyleSheet.create({
  outer:        { borderTopWidth: 1.5, paddingBottom: 4, position: 'relative' },
  glowStrip:    { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  statusStrip:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  statusChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4 },
  statusDot:    { width: 7, height: 7, borderRadius: 4 },
  statusTxt:    { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.2 },
  latencyChip:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  latencyTxt:   { fontSize: 8.5, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  charTxt:      { fontSize: 9.5, fontFamily: MONO, fontWeight: '700', letterSpacing: 1, marginLeft: 4 },
  wrap:         { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 12 },
  inputWrap:    { flex: 1, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 2, borderRadius: 14, paddingLeft: 12, paddingRight: 14, paddingTop: 12, paddingBottom: 12, minHeight: 64, maxHeight: 160, gap: 8, position: 'relative' },
  cornerTL:     { position: 'absolute', top: -2, left: -2, width: 12, height: 12, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 4 },
  cornerBR:     { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 4 },
  promptBlock:  { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 1, gap: 2, width: 28 },
  prompt:       { fontSize: 20, fontFamily: MONO, fontWeight: '900', lineHeight: 22 },
  promptTag:    { fontSize: 7, fontFamily: MONO, fontWeight: '900', letterSpacing: 0.8 },
  input:        { flex: 1, fontSize: 15.5, fontFamily: BODY_FONT, lineHeight: 22, includeFontPadding: false, padding: 0, minHeight: 36 },
  sendBtn:      { minWidth: 72, height: 64, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0, paddingHorizontal: 6, gap: 2 },
  sendBtnTxt:   { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  frameBL:      { position: 'absolute', bottom: 6, left: 6, width: 12, height: 12, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
  frameBR:      { position: 'absolute', bottom: 6, right: 6, width: 12, height: 12, borderBottomWidth: 1.5, borderRightWidth: 1.5 },

  // Attachment toolbar & chips
  attachBar:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 6 },
  attachBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5,
                  borderWidth: 1, borderRadius: 6 },
  attachTxt:    { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.9 },
  attCountChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 4,
                  paddingHorizontal: 7, paddingVertical: 3 },
  attCountTxt:  { fontSize: 8.5, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  attChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8,
                  paddingLeft: 6, paddingRight: 4, paddingVertical: 4 },
  attThumb:     { width: 26, height: 26, borderRadius: 4, backgroundColor: '#000' },
  attName:      { fontSize: 11, fontFamily: MONO, fontWeight: '800', letterSpacing: 0.2 },
  attMeta:      { fontSize: 8.5, fontFamily: MONO, fontWeight: '700', letterSpacing: 0.5 },
  attClose:     { width: 18, height: 18, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
});

// ── Main Butler Screen ────────────────────────────────────────────────────────
export default function ButlerScreen() {
  const insets = useSafeAreaInsets();
  const { T } = useCosmetic();
  const accentColor    = T.primary   || C.teal;
  const themeSecondary = T.secondary || C.green;

  const [messages,       setMessages]       = useState<Message[]>([]);
  const [isLoading,      setIsLoading]      = useState(false);
  const [isConnected,    setIsConnected]    = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [wsState,        setWsState]        = useState<string>('disconnected');
  const [followUpChips,  setFollowUpChips]  = useState<string[]>([]);
  const [lastButlerMsgId, setLastButlerMsgId] = useState<string | null>(null);
  const [showScriptBuilder, setShowScriptBuilder] = useState(false);

  const scrollRef  = useRef<ScrollView>(null);
  const isAtBottom = useRef(true);
  const { addEntry } = useChatHistory();

  // ── Load persisted conversation ──────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(CONV_KEY);
        if (raw) {
          const parsed = logger.safeJSON<Message[]>(raw, [], '[Butler]');
          if (Array.isArray(parsed) && parsed.length) {
            setMessages(parsed);
          }
        }
        const disclosureSeen = await AsyncStorage.getItem(AI_DISCLOSURE_KEY);
        if (disclosureSeen !== '1') setShowDisclosure(true);
      } catch {}
    };
    load();
  }, []);

  // ── Save conversation on change ──────────────────────────────────────────
  useEffect(() => {
    if (!messages.length) return;
    AsyncStorage.setItem(CONV_KEY, JSON.stringify(messages.slice(-80))).catch(() => {});
  }, [messages]);

  // ── Connection status ────────────────────────────────────────────────────
  useEffect(() => {
    setIsConnected(serverConnection.isConnected());
    const unsub = autoConnectEngine.onEvent((evt: EngineEvent) => {
      setIsConnected(evt.status === 'connected');
    });
    return unsub;
  }, []);

  // ── WebSocket state ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = autoConnectEngine.onEvent((evt: EngineEvent) => {
      setWsState(evt.status === 'connected' ? 'connected' : 'disconnected');
    });
    return unsub;
  }, []);

  // ── Clear handler ────────────────────────────────────────────────────────
  const clearConversation = useCallback(async () => {
    haptics.medium();
    setMessages([]);
    setFollowUpChips([]);
    setLastButlerMsgId(null);
    await AsyncStorage.removeItem(CONV_KEY).catch(() => {});
  }, []);

  useEffect(() => {
    (global as any).__butlerClearChat = clearConversation;
    return () => { delete (global as any).__butlerClearChat; };
  }, [clearConversation]);

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
      status: 'sending',
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setFollowUpChips([]);
    setLastButlerMsgId(null);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const t0 = Date.now();

      // Build context
      const historyCtx = buildHistoryOnly(messages.slice(-10));
      const kbCtx = await knowledgeAccumulator.buildContext(text).catch(() => '');
      const metricsCtx = await serverMetrics.getContextString().catch(() => '');

      const systemPrompt = [
        BUTLER_KNOWLEDGE_COMPACT,
        metricsCtx ? `PC METRICS:\n${metricsCtx}` : '',
        kbCtx ? `KNOWLEDGE BASE:\n${kbCtx.slice(0, 3000)}` : '',
      ].filter(Boolean).join('\n\n');

      let responseText = '';
      let modelUsed = '';
      let kbUsed = 0;

      if (kbCtx) kbUsed = (kbCtx.match(/\n---\n/g) || []).length + 1;

      // Call Ollama via server bridge
      const result = await nexusBridge.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyCtx,
          { role: 'user', content: text },
        ],
        stream: false,
      }).catch(async (e: any) => {
        const sc = serverConnection as any;
        if (sc.ollamaChat) {
          return await sc.ollamaChat({ prompt: text, systemPrompt, history: historyCtx });
        }
        throw e;
      });

      responseText = result?.content || result?.message || result?.response || result?.text
        || 'I processed your request but got no response. Please check Ollama is running.';
      modelUsed = result?.model || '';

      const responseMs = Date.now() - t0;

      const butlerMsg: Message = {
        id: `b-${Date.now()}`,
        role: 'butler',
        content: responseText,
        timestamp: Date.now(),
        metadata: { model: modelUsed, responseMs, kbUsed },
      };

      setMessages(prev => [...prev, butlerMsg]);
      setLastButlerMsgId(butlerMsg.id);

      // Generate follow-up chips
      const chips: string[] = [];
      if (responseText.includes('script') || responseText.includes('python'))
        chips.push('Save this script', 'Run it now', 'Explain the code');
      else if (responseText.includes('CPU') || responseText.includes('RAM'))
        chips.push('Show processes', 'Clean up memory', 'Schedule monitoring');
      else
        chips.push('Tell me more', 'Give an example', 'What else can you do?');
      setFollowUpChips(chips.slice(0, 3));

      // Save to history
      addEntry({ role: 'user', content: text, timestamp: Date.now() });
      addEntry({ role: 'assistant', content: responseText, timestamp: Date.now() });

      // KB accumulation
      knowledgeAccumulator.processExchange(text, responseText).catch(() => {});
      knowledgeGrowthEngine.silentGrowth().catch(() => {});

    } catch (err: any) {
      const errMsg = err?.message || 'Unknown error';
      autoErrorLogger.log('error', '[Butler] sendMessage', errMsg);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'system',
        content: isConnected
          ? `Connection error: ${errMsg}. Is Ollama running?`
          : 'PC not connected. Go to Home tab and connect first.',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [isLoading, isConnected, messages, addEntry]);

  // Fix stale closure for inject
  const sendMessageRef = useRef(sendMessage);
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);
  useEffect(() => {
    (global as any).__butlerInjectMessage = (text: string) => {
      if (text?.trim()) sendMessageRef.current(text.trim());
    };
    return () => { delete (global as any).__butlerInjectMessage; };
  }, []);

  const handleCopy = useCallback((text: string) => {
    haptics.light();
    Clipboard.setStringAsync(text).catch(() => {});
  }, []);

  const handleReact = useCallback((id: string, emoji: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, reaction: m.reaction === emoji ? undefined : emoji } : m));
  }, []);

  const handleSave = useCallback(async (code: string) => {
    haptics.medium();
    try {
      await saveButlerScript({ name: `Butler_Script_${Date.now()}`, code, source: 'butler_ai', createdAt: Date.now() });
      (global as any).__showConnectionToast?.('Script saved to Scripts tab', '#00FF88');
    } catch { (global as any).__showConnectionToast?.('Save failed', '#FF3131'); }
  }, []);

  const handleSuggest = useCallback((tab: string, _label: string) => {
    (global as any).__butlerSwitchTab?.(tab);
  }, []);

  const handleBuildScript = useCallback((prompt: string) => {
    sendMessage(`Write and immediately run a Python script that: ${prompt}. Include error handling.`);
  }, [sendMessage]);

  const pr = accentColor;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <AIDisclosureModal
        visible={showDisclosure}
        onAccept={async () => {
          await AsyncStorage.setItem(AI_DISCLOSURE_KEY, '1').catch(() => {});
          setShowDisclosure(false);
        }}
      />
      <ScriptBuilderModal
        visible={showScriptBuilder}
        onClose={() => setShowScriptBuilder(false)}
        onBuild={handleBuildScript}
        accentColor={pr}
      />
      <HUDGridBackground />
      <RobotWatermark />

      {/* Header */}
      <NexusChatHeader
        isConnected={isConnected}
        onClear={clearConversation}
        accentColor={pr}
        onBuildScript={() => setShowScriptBuilder(true)}
        onToggleHistory={() => {}}
        onToggleVoice={() => { (global as any).__showConnectionToast?.('Voice input coming soon', '#FFC400'); }}
      />

      {/* Message list */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          isAtBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 60;
        }}
        scrollEventThrottle={120}
        keyboardDismissMode="on-drag"
      >
        {messages.length === 0 ? (
          <ButlerWelcomeHub
            accentColor={pr}
            isConnected={isConnected}
            modelName={null}
            onSendPrompt={sendMessage}
            onBuildScript={() => setShowScriptBuilder(true)}
          />
        ) : (
          messages.map((msg, idx) => (
            <React.Fragment key={msg.id}>
              <MessageBubble
                msg={msg}
                onCopy={handleCopy}
                onReact={handleReact}
                onSave={handleSave}
                onSuggest={handleSuggest}
                isLast={idx === messages.length - 1}
                accentColor={pr}
                themeSecondary={themeSecondary}
              />
              {msg.id === lastButlerMsgId && msg.role === 'butler' ? (
                <ContextStrip
                  responseTimeMs={msg.metadata?.responseMs ?? null}
                  model={msg.metadata?.model || 'Ollama'}
                  kbUsed={msg.metadata?.kbUsed}
                />
              ) : null}
              {msg.id === lastButlerMsgId && msg.role === 'butler' && msg.content ? (
                <ScriptSuggestionChips
                  content={msg.content}
                  onSuggest={handleSuggest}
                  accentColor={pr}
                />
              ) : null}
            </React.Fragment>
          ))
        )}

        {/* Follow-up chips */}
        {followUpChips.length > 0 && !isLoading ? (
          <FollowUpChips chips={followUpChips} onTap={sendMessage} accentColor={pr} />
        ) : null}

        {/* Typing indicator */}
        {isLoading ? <TypingIndicator accentColor={pr} /> : null}
      </ScrollView>

      {/* Input bar */}
      <NexusQuickChips
        chips={BUTLER_DEFAULT_CHIPS}
        onPick={(prompt) => {
          // Drop the prompt into the input via the existing AsyncStorage
          // handoff key — CommandConsoleBarThemed already drains it.
          AsyncStorage.setItem('@butler_prefill_prompt', prompt).catch(() => {});
        }}
        disabled={isLoading}
      />
      <CommandConsoleBarThemed
        onSend={sendMessage}
        isConnected={isConnected}
        disabled={isLoading}
        accentColor={pr}
      />
    </KeyboardAvoidingView>
  );
}


// Expo Router per-route ErrorBoundary — isolates crashes to this tab
export { ErrorBoundary } from '@/components/ui/TabErrorBoundary';

