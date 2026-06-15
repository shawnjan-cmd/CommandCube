/**
 * Settings v7.2 - Tap-to-Edit + Registry-based Export UI Code
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {

  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Switch,
  Platform, Animated, Linking, Modal, KeyboardAvoidingView,
} from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { haptics } from '@/services/haptics';
import { logger } from '@/utils/logger';
import { useTabBar } from '@/contexts/TabBarContext';
import { useCosmetic } from '@/contexts/CosmeticContext';
import { deviceIdentifier } from '@/services/deviceIdentifier';
import { nexusBridge } from '@/services/nexusBridge';
import { nexusBridgeSettings, NexusBridgeSettings } from '@/services/nexusBridgeSettings';
import { kbOrganizerBot } from '@/services/kbOrganizerBot';
import { knowledgeGrowthEngine, AutoUpgradeEntry, registerOmegaSignal, unregisterOmegaSignal } from '@/services/knowledgeGrowthEngine';
import { serverConnection } from '@/services/serverConnection';
import { isAuthDisabled, setAuthDisabled, loadAuthDisabled } from '@/services/serverConnection';
import { pcClipboard } from '@/services/pcClipboard';
import { features } from '@/services/serverFeatures';
import { autoConnectEngine } from '@/services/autoConnectEngine';
import { autoUpgradeMonitor, MonitorReport } from '@/services/autoUpgradeMonitor';
import { quantumLinkHarvester, QLHStats } from '@/services/quantumLinkHarvester';
import { knowledgeAccumulator } from '@/services/knowledgeAccumulator';
import { PYTHON_AUTOMATION_SCRIPTS } from '@/services/pythonAutomationKnowledge';
import { BUNDLE_MANIFEST, BUNDLE_SOURCES, buildAllFilesExport, buildExportJson, DETAILED_AI_PROMPT, computeSourceHash } from '@/constants/appSourceBundle';
import { BUTLER_STARTER_KNOWLEDGE, BUTLER_KNOWLEDGE_COMPACT } from '@/constants/butlerKnowledge';
import '@/constants/tabSourcesBundle'; // registers nexushome/knowledge/builder/settings sources
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { uiConfig, DEFAULT_UI_CONFIG, HomeCardId } from '@/services/uiConfig';
import SectionTitle3D from '@/components/ui/SectionTitle3D';

const N = {
  bg:       '#050505',
  panel:    '#0E0F12',
  card:     '#0E0F12',
  border:   'rgba(255,42,31,0.12)',
  cyan:     '#FF2A1F',
  green:    '#00FF88',
  amber:    '#FFC400',
  red:      '#FF3131',
  sigma:    '#FFC400',
  purple:   '#FFC400',
  blue:     '#FF6A1F',
  text:     '#6A7384',
  textBrt:  '#E6E9EF',
  textDim:  '#3C424D',
};
const C_BLUE = '#FF6A1F';
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

export const SCRIPT_ONLY_MODE_KEY = 'commandcube_script_only_mode';
const STORAGE_KEYS = {
  AUTO_RUN:         'commandcube_autorun',
  AUTO_CONNECT:     'commandcube_autoconnect',
  NOTIFICATIONS:    'commandcube_notifications',
  KEEP_SCREEN_ON:   'commandcube_keep_screen_on',
  SAVE_HISTORY:     'commandcube_save_history',
  PAUSE_ANIMATIONS: 'commandcube_pause_animations',
  MINIMAL_MODE:     'commandcube_minimal_mode',
  HAPTICS_OFF:      'commandcube_haptics_off',
  LARGE_TEXT:       'commandcube_large_text',
  SCRIPT_ONLY_MODE: 'commandcube_script_only_mode',
};

interface Settings {
  autoRun: boolean; autoConnect: boolean; notifications: boolean;
  keepScreenOn: boolean; saveHistory: boolean; pauseAnimations: boolean;
  minimalMode: boolean; hapticsOff: boolean; largeText: boolean; scriptOnlyMode: boolean;
}
interface NexusStats {
  totalCallsTotal: number; localHits: number; relayHits: number;
  fullBridgeHits: number; totalGrowth: number; avgLatencyMs: number; lastUsed: string;
}

// ─── INLINE TAP-TO-EDIT ROW ────────────────────────────────────────────────
function EditableRow({
  label, value, onSave, hint, keyboardType, multiline, last,
  iconName, iconColor,
}: {
  label: string; value: string; onSave: (v: string) => void;
  hint?: string; keyboardType?: 'default' | 'numeric' | 'email-address' | 'url';
  multiline?: boolean; last?: boolean;
  iconName?: string; iconColor?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const inputRef = useRef<TextInput>(null);

  const startEdit = () => {
    haptics.light();
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const save = () => {
    setEditing(false);
    if (draft.trim() !== value) {
      haptics.success();
      onSave(draft.trim());
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value);
    haptics.light();
  };

  return (
    <View style={[er.wrap, last && { borderBottomWidth: 0 }]}>
      <View style={er.header}>
        {iconName ? <MaterialIcons name={iconName as any} size={16} color={iconColor || N.cyan} style={{ flexShrink: 0 }} /> : null}
        <Text style={[er.label, { color: N.textBrt }]}>{label}</Text>
        {!editing ? (
          <TouchableOpacity
            onPress={startEdit}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={er.editChip}
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={11} color={N.cyan} />
            <Text style={er.editChipTxt}>EDIT</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {editing ? (
        <View style={er.inputWrap}>
          <TextInput
            ref={inputRef}
            style={[er.input, multiline && { minHeight: 72, textAlignVertical: 'top' }]}
            value={draft}
            onChangeText={setDraft}
            placeholder={hint || label}
            placeholderTextColor={N.text}
            keyboardType={keyboardType || 'default'}
            multiline={multiline}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType={multiline ? 'default' : 'done'}
            onSubmitEditing={multiline ? undefined : save}
            blurOnSubmit={!multiline}
          />
          <View style={er.actions}>
            <TouchableOpacity onPress={cancel} style={er.cancelBtn} activeOpacity={0.8}>
              <Text style={er.cancelTxt}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={save} style={er.saveBtn} activeOpacity={0.8}>
              <MaterialIcons name="check" size={13} color="#000" />
              <Text style={er.saveTxt}>SAVE</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity onPress={startEdit} activeOpacity={0.7} style={er.valueWrap}>
          <Text style={er.value} numberOfLines={multiline ? 3 : 1}>{value || <Text style={{ color: N.text + '80' }}>{hint || 'Tap to edit'}</Text>}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const er = StyleSheet.create({
  wrap:      { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#1A1D24' },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  label:     { flex: 1, fontSize: 11, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.3 },
  editChip:  { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, borderColor: '#FF2A1F40', backgroundColor: '#FF2A1F0A' },
  editChipTxt:{ fontSize: 8, fontWeight: '900', color: '#FF2A1F', fontFamily: MONO, letterSpacing: 0.5 },
  valueWrap: { paddingVertical: 2 },
  value:     { fontSize: 13, color: '#9AA3B2', fontFamily: MONO, lineHeight: 19 },
  inputWrap: { gap: 8 },
  input:     {
    backgroundColor: '#131418', borderWidth: 1.5, borderColor: '#FF2A1F55',
    borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 14, color: '#D5D9E0', fontFamily: MONO, lineHeight: 20,
  },
  actions:   { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, backgroundColor: '#1A1D24', borderWidth: 1, borderColor: '#232730' },
  cancelTxt: { fontSize: 10, fontWeight: '700', color: '#5A626E', fontFamily: MONO },
  saveBtn:   { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 8, backgroundColor: '#FF2A1F' },
  saveTxt:   { fontSize: 11, fontWeight: '900', color: '#000', fontFamily: MONO },
});

// ─── SECTION HEADER ────────────────────────────────────────────────────────
function SectionHeader({ title, color = N.cyan, icon }: { title: string; color?: string; icon?: string }) {
  return <SectionTitle3D title={title} accent={color} icon={icon} />;
}

function ToggleRow({ icon, iconColor, title, subtitle, value, onToggle, danger, last }: {
  icon: string; iconColor: string; title: string; subtitle: string;
  value: boolean; onToggle: () => void; danger?: boolean; last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[sc.row, last && { borderBottomWidth: 0 }]}
      onPress={() => { haptics.selection(); onToggle(); }}
      activeOpacity={0.85}
    >
      <MaterialIcons name={icon as any} size={20} color={iconColor} />
      <View style={{ flex: 1 }}>
        <Text style={[sc.rowTitle, danger && { color: N.red }]}>{title}</Text>
        <Text style={sc.rowSub}>{subtitle}</Text>
      </View>
      <View style={[sc.toggle, value && sc.toggleOn, danger && value && { borderColor: N.red + '80', backgroundColor: N.red + '18' }]}>
        <View style={[sc.thumb, value && sc.thumbOn, danger && value && { backgroundColor: N.red }]} />
      </View>
    </TouchableOpacity>
  );
}

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={sc.statPill}>
      <Text style={[sc.statVal, { color }]}>{value}</Text>
      <Text style={sc.statLbl}>{label}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  hdr:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  hdrTxt:   { fontSize: 10, fontWeight: '900', fontFamily: MONO, letterSpacing: 2 },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: N.border },
  rowTitle: { fontSize: 13, fontWeight: '700', color: N.textBrt, marginBottom: 2 },
  rowSub:   { fontSize: 10, color: N.text, lineHeight: 14 },
  toggle:   { width: 46, height: 26, borderRadius: 13, backgroundColor: N.panel, borderWidth: 2, borderColor: N.border, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: N.cyan + '28', borderColor: N.cyan },
  thumb:    { width: 18, height: 18, borderRadius: 9, backgroundColor: N.text },
  thumbOn:  { backgroundColor: N.cyan, alignSelf: 'flex-end' },
  statPill: { flex: 1, alignItems: 'center', backgroundColor: N.card, borderRadius: 10, borderWidth: 1.5, borderColor: N.border, paddingVertical: 12 },
  statVal:  { fontSize: 16, fontWeight: '900', fontFamily: MONO },
  statLbl:  { fontSize: 8, color: N.textBrt + '60', fontFamily: MONO, marginTop: 3, letterSpacing: 0.8 },
  sliderBtn:{ width: 26, height: 26, borderRadius: 13, backgroundColor: N.panel, borderWidth: 1, borderColor: N.border, alignItems: 'center', justifyContent: 'center' },
});

// PC POWER CONTROLS CARD
function PowerControlsCard({ isConnected }: { isConnected: boolean }) {
  const [busy, setBusy] = useState<'sleep' | 'restart' | 'shutdown' | null>(null);

  const sendPowerAction = (action: 'sleep' | 'restart' | 'shutdown') => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Connect to your PC first before sending power commands.');
      return;
    }
    const labels: Record<string, string> = { sleep: 'Sleep', restart: 'Restart', shutdown: 'Shutdown' };
    const warnings: Record<string, string> = {
      sleep:    'Your PC will enter sleep mode.',
      restart:  'Your PC will restart. Save all open files first.',
      shutdown: 'Your PC will shut down completely. All unsaved work will be lost.',
    };
    Alert.alert(
      labels[action] + ' PC?',
      warnings[action],
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: labels[action].toUpperCase(),
          style: action === 'shutdown' ? 'destructive' : 'default',
          onPress: async () => {
            haptics.heavy();
            setBusy(action);
            try {
              const result = await pcClipboard.powerAction(action);
              if (result.ok) {
                haptics.success();
                Alert.alert('Command Sent', 'PC will ' + action + ' shortly.');
              } else {
                haptics.warning();
                Alert.alert('Failed', result.error || 'Power command rejected by server.');
              }
            } catch (e: any) {
              haptics.warning();
              Alert.alert('Error', e?.message || 'Could not reach server.');
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const BTNS: { action: 'sleep' | 'restart' | 'shutdown'; icon: string; label: string; col: string; desc: string }[] = [
    { action: 'sleep',    icon: 'bedtime',            label: 'SLEEP',    col: '#FF2A1F', desc: 'Suspend to RAM - resumes in seconds' },
    { action: 'restart',  icon: 'restart-alt',        label: 'RESTART',  col: '#FF6A1F', desc: 'Reboot PC - apps will restart' },
    { action: 'shutdown', icon: 'power-settings-new', label: 'SHUTDOWN', col: '#FF6A1F', desc: 'Full power off - save work first' },
  ];

  return (
    <View style={[g.card, { borderColor: '#FF2A1F55', borderWidth: 2 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View style={[g.iconBox, { borderColor: '#FF2A1F', backgroundColor: '#FF2A1F12' }]}>
          <MaterialIcons name="power-settings-new" size={20} color="#FF2A1F" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[g.cardTitle, { color: '#FF2A1F', marginBottom: 0 }]}>PC POWER CONTROLS</Text>
          <Text style={g.cardSub}>Sleep, Restart, Shutdown - confirmation required</Text>
        </View>
        <View style={[g.statusBadge, { borderColor: isConnected ? '#00FF8855' : '#FF6A1F55' }]}>
          <View style={[g.statusDot, { backgroundColor: isConnected ? '#00FF88' : '#FF6A1F' }]} />
          <Text style={[g.statusTxt, { color: isConnected ? '#00FF88' : '#FF6A1F' }]}>
            {isConnected ? 'READY' : 'OFFLINE'}
          </Text>
        </View>
      </View>
      <View style={[g.infoBanner, { borderColor: '#FF6A1F35', backgroundColor: '#FF6A1F08', marginBottom: 14 }]}>
        <MaterialIcons name="warning" size={13} color="#FF6A1F" />
        <Text style={[g.infoBannerTxt, { color: '#FF6A1FCC' }]}>
          Each button shows a confirmation dialog. Requires butler_server.py v7.1.0+ with power controls enabled.
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        {BTNS.map(({ action, icon, label, col, desc }) => (
          <TouchableOpacity
            key={action}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 14,
              borderWidth: 1.5, borderRadius: 10,
              borderColor: col + '55', backgroundColor: col + '0A',
              paddingHorizontal: 16, paddingVertical: 14,
              opacity: (!isConnected || busy !== null) ? 0.45 : 1,
            }}
            onPress={() => sendPowerAction(action)}
            disabled={!isConnected || busy !== null}
            activeOpacity={0.8}
          >
            {busy === action ? (
              <ActivityIndicator size="small" color={col} />
            ) : (
              <View style={{ width: 38, height: 38, borderRadius: 10, borderWidth: 1.5, borderColor: col + '60', backgroundColor: col + '14', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name={icon as any} size={20} color={col} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: col, fontFamily: MONO, letterSpacing: 1.5 }}>{label}</Text>
              <Text style={{ fontSize: 10, color: N.text, fontFamily: MONO, marginTop: 2 }}>{desc}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={col + '70'} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// OLLAMA PANEL
function OllamaPanel() {
  const [status,      setStatus]      = useState<'checking'|'online'|'offline'|'no-server'>('checking');
  const [activeModel, setActiveModel] = useState('');
  const [models,      setModels]      = useState<string[]>([]);
  const [pulling,     setPulling]     = useState(false);
  const [pullModel,   setPullModel]   = useState('qwen2.5-coder:7b');
  const [pullResult,  setPullResult]  = useState('');

  const RECOMMENDED = [
    { name: 'qwen2.5-coder:7b', size: '4 GB',  license: 'Apache 2.0', note: 'Best for Python/code' },
    { name: 'phi4-mini:latest', size: '2.5 GB', license: 'MIT',        note: 'Fastest, small' },
    { name: 'mistral:7b',       size: '4 GB',   license: 'Apache 2.0', note: 'General purpose' },
    { name: 'llama3.2:3b',      size: '2 GB',   license: 'Meta Llama', note: 'Compact + fast' },
  ];

  useEffect(() => { checkOllama(); }, []);

  const checkOllama = async () => {
    setStatus('checking');
    try {
      const ip   = serverConnection.getIP() || await AsyncStorage.getItem('commandcube_server_ip');
      const port = serverConnection.getPort() || await AsyncStorage.getItem('commandcube_server_port');
      if (!ip || !port) { setStatus('no-server'); return; }
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(`http://${ip}:${port}/api/ollama/status`, { signal: ctrl.signal });
      if (!res.ok) { setStatus('offline'); return; }
      const d = await res.json();
      setActiveModel(d.activeModel || '');
      setModels(d.models || []);
      setStatus(d.available ? 'online' : 'offline');
    } catch { setStatus('offline'); }
  };

  const pullOllamaModel = async () => {
    const modelName = pullModel.trim();
    if (!modelName) return;
    haptics.medium(); setPulling(true); setPullResult('');
    try {
      const ip   = serverConnection.getIP() || await AsyncStorage.getItem('commandcube_server_ip');
      const port = serverConnection.getPort() || await AsyncStorage.getItem('commandcube_server_port');
      if (!ip || !port) { setPullResult('No server connected'); return; }
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(`http://${ip}:${port}/api/ollama/pull`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName }), signal: ctrl.signal,
      });
      const d = await res.json();
      if (d.ok) { setPullResult('OK Pull started for ' + modelName + ' - check back in ~5 min.'); haptics.success(); setTimeout(checkOllama, 6000); }
      else { setPullResult('ERR ' + (d.error || 'Pull failed')); haptics.warning(); }
    } catch (e: any) { setPullResult('ERR ' + (e?.message || 'Network error')); haptics.warning(); }
    finally { setPulling(false); }
  };

  const statusColor = status === 'online' ? N.green : status === 'checking' ? N.amber : N.red;
  const statusLabel = status === 'online' ? 'ACTIVE - LOCAL AI RUNNING'
    : status === 'checking' ? 'CHECKING SERVER...'
    : status === 'no-server' ? 'NO SERVER PAIRED'
    : 'OLLAMA OFFLINE - NOT INSTALLED';

  return (
    <View style={{ gap: 12 }}>
      <View style={[ol.banner, { borderColor: statusColor + '55', backgroundColor: statusColor + '10' }]}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5, color: statusColor }}>{statusLabel}</Text>
          {status === 'online' && <Text style={ol.sub}>{'Active: ' + (activeModel || 'none') + ' - ' + models.length + ' model(s)'}</Text>}
          {status === 'offline' && <Text style={ol.sub}>Install Ollama at ollama.com/download then restart butler_server.py</Text>}
          {status === 'no-server' && <Text style={ol.sub}>Go to HOME and connect to your PC first</Text>}
        </View>
        <TouchableOpacity onPress={checkOllama} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="refresh" size={15} color={statusColor} />
        </TouchableOpacity>
      </View>

      {models.length > 0 && (
        <View style={{ gap: 5 }}>
          <Text style={ol.sectionLbl}>INSTALLED ({models.length})</Text>
          {models.map(m => (
            <View key={m} style={[ol.modelRow, m === activeModel && { borderColor: N.green + '50' }]}>
              <MaterialIcons name={m === activeModel ? 'radio-button-checked' : 'radio-button-unchecked'} size={12} color={m === activeModel ? N.green : N.text} />
              <Text style={[ol.modelName, m === activeModel && { color: N.green }]} numberOfLines={1}>{m}</Text>
              {m === activeModel && <Text style={[ol.badge, { color: N.green, borderColor: N.green + '50' }]}>ACTIVE</Text>}
            </View>
          ))}
        </View>
      )}

      <View style={{ gap: 5 }}>
        <Text style={ol.sectionLbl}>RECOMMENDED MODELS</Text>
        {RECOMMENDED.map(rec => {
          const installed = models.some(m => m.includes(rec.name.split(':')[0]));
          return (
            <TouchableOpacity key={rec.name} style={[ol.recRow, installed && { borderColor: N.green + '35', backgroundColor: N.green + '06' }]} onPress={() => setPullModel(rec.name)} activeOpacity={0.8}>
              <View style={{ flex: 1 }}>
                <Text style={[ol.recName, installed && { color: N.green }]}>{rec.name}</Text>
                <Text style={ol.sub}>{rec.size + ' - ' + rec.license + ' - ' + rec.note}</Text>
              </View>
              {installed ? <MaterialIcons name="check-circle" size={13} color={N.green} /> : <Text style={{ fontSize: 8, color: N.amber, fontFamily: MONO }}>TAP</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ gap: 6 }}>
        <Text style={ol.sectionLbl}>PULL MODEL TO YOUR PC</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput style={ol.input} value={pullModel} onChangeText={setPullModel} placeholder="model:tag" placeholderTextColor={N.text + '55'} autoCapitalize="none" autoCorrect={false} editable={!pulling} />
          <TouchableOpacity style={[ol.pullBtn, (pulling || status !== 'online') && { opacity: 0.45 }]} onPress={pullOllamaModel} disabled={pulling || status !== 'online'}>
            {pulling ? <ActivityIndicator size="small" color="#000" /> : <MaterialIcons name="download" size={13} color="#000" />}
            <Text style={ol.pullBtnTxt}>{pulling ? 'PULLING...' : 'PULL'}</Text>
          </TouchableOpacity>
        </View>
        {pullResult ? <Text style={{ fontSize: 9, fontFamily: MONO, color: pullResult.startsWith('OK') ? N.green : N.red }}>{pullResult}</Text> : null}
      </View>

      {status !== 'online' && (
        <View style={ol.guide}>
          <Text style={[ol.sectionLbl, { color: N.cyan, marginBottom: 6 }]}>ONE-TIME SETUP</Text>
          {['1. Download Ollama: ollama.com/download','2. Install and start Ollama on your PC','3. ollama pull qwen2.5-coder:7b','4. Restart butler_server.py'].map((line, i) => (
            <Text key={i} style={ol.sub}>{line}</Text>
          ))}
        </View>
      )}
    </View>
  );
}
const ol = StyleSheet.create({
  banner:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 8, padding: 10 },
  sub:       { fontSize: 9, color: N.text, fontFamily: MONO, marginTop: 2, lineHeight: 13 },
  sectionLbl:{ fontSize: 8, fontWeight: '900', color: N.textBrt, fontFamily: MONO, letterSpacing: 2 },
  modelRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: N.card, borderRadius: 6, borderWidth: 1, borderColor: N.border, paddingHorizontal: 10, paddingVertical: 7 },
  modelName: { flex: 1, fontSize: 10, color: N.textBrt, fontFamily: MONO },
  badge:     { fontSize: 7, fontWeight: '900', fontFamily: MONO, borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  recRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: N.card, borderRadius: 6, borderWidth: 1, borderColor: N.border, paddingHorizontal: 10, paddingVertical: 9 },
  recName:   { fontSize: 10, fontWeight: '700', color: N.textBrt, fontFamily: MONO },
  input:     { flex: 1, backgroundColor: N.panel, borderWidth: 1.5, borderColor: N.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 10, fontSize: 11, color: N.textBrt, fontFamily: MONO },
  pullBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: N.cyan, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10 },
  pullBtnTxt:{ fontSize: 10, fontWeight: '700', color: '#000', fontFamily: MONO },
  guide:     { backgroundColor: N.panel, borderRadius: 8, borderWidth: 1, borderColor: N.border, padding: 12, gap: 4 },
});

// SHOW WELCOME TOGGLE
const WELCOME_SKIP_KEY = '@butler_welcome_complete_v1';
function ShowWelcomeToggle() {
  const [showOnLaunch, setShowOnLaunch] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_SKIP_KEY).then(val => {
      setShowOnLaunch(val !== 'true');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    haptics.selection();
    const next = !showOnLaunch;
    setShowOnLaunch(next);
    try {
      if (next) await AsyncStorage.removeItem(WELCOME_SKIP_KEY);
      else await AsyncStorage.setItem(WELCOME_SKIP_KEY, 'true');
    } catch { setShowOnLaunch(!next); }
  };

  if (loading) return null;
  return (
    <View style={[sc.row]}>
      <MaterialIcons name={showOnLaunch ? 'visibility' : 'visibility-off'} size={20} color={showOnLaunch ? N.cyan : N.text} />
      <View style={{ flex: 1 }}>
        <Text style={[sc.rowTitle, { color: showOnLaunch ? N.cyan : N.textBrt }]}>Show on Next Launch</Text>
        <Text style={sc.rowSub}>{showOnLaunch ? 'Setup guide will appear on next start' : 'Setup guide skipped - tap to re-enable'}</Text>
      </View>
      <Switch value={showOnLaunch} onValueChange={handleToggle} thumbColor={showOnLaunch ? N.cyan : N.textBrt} trackColor={{ false: N.border, true: N.cyan + '55' }} ios_backgroundColor={N.border} />
    </View>
  );
}

// COPY POLICY ROW
const POLICY_COPY_TEXT = 'PRIVACY POLICY - Butler AI: PC Automation\n\nLast Updated: May 2026\n\n1. We collect ZERO personal data.\n2. We transmit ZERO data to external servers.\n3. All processing on your device and your own PC.\n4. Functions entirely within your local network (LAN).\n\nCONTACT: andrejsladkovic1992@gmail.com\nPrivacy Policy URL: https://shawnjan-cmd.github.io/privacy-policy-/';

function CopyPolicyRow() {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (copied) return;
    haptics.medium();
    try {
      if (Platform.OS === 'web') await (navigator as any).clipboard?.writeText(POLICY_COPY_TEXT);
      else await ExpoClipboard.setStringAsync(POLICY_COPY_TEXT);
      setCopied(true); haptics.success();
      setTimeout(() => setCopied(false), 3000);
    } catch { Alert.alert('Copy failed', 'Unable to copy on this device.'); }
  };
  return (
    <TouchableOpacity style={[sc.row, { borderBottomWidth: 0 }]} onPress={handleCopy} activeOpacity={0.82}>
      <MaterialIcons name={copied ? 'check-circle' : 'content-copy'} size={20} color={copied ? N.green : N.cyan} />
      <View style={{ flex: 1 }}>
        <Text style={[sc.rowTitle, { color: copied ? N.green : N.cyan }]}>{copied ? 'COPIED!' : 'Copy Privacy Policy'}</Text>
        <Text style={sc.rowSub}>Paste into your website or GitHub Pages</Text>
      </View>
      <View style={{ borderWidth: 1, borderColor: N.border, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
        <Text style={{ fontSize: 7, fontWeight: '900', color: N.text, fontFamily: MONO }}>~2KB</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── SERVER ADDRESS EDITOR (tap-to-edit) ──────────────────────────────────
function ServerAddressCard() {
  const [ip,   setIp]   = useState('');
  const [port, setPort] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(['commandcube_server_ip', 'commandcube_server_port']).then(vals => {
      const map = Object.fromEntries(vals.map(([k, v]) => [k, v ?? '']));
      setIp(map['commandcube_server_ip'] || '');
      setPort(map['commandcube_server_port'] || '');
    }).catch(() => {});
  }, []);

  const saveAddr = async (newIp: string, newPort: string) => {
    try {
      await AsyncStorage.multiSet([['commandcube_server_ip', newIp], ['commandcube_server_port', newPort]]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  return (
    <View style={g.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <MaterialIcons name="computer" size={16} color={N.cyan} />
        <Text style={[g.cardTitle, { marginBottom: 0, flex: 1 }]}>SERVER ADDRESS</Text>
        {saved ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: N.green + '15', borderWidth: 1, borderColor: N.green + '40' }}>
            <MaterialIcons name="check" size={11} color={N.green} />
            <Text style={{ fontSize: 8, fontWeight: '900', color: N.green, fontFamily: MONO }}>SAVED</Text>
          </View>
        ) : null}
      </View>
      <Text style={[g.cardSub, { marginBottom: 8 }]}>Tap a field to edit — persists across app restarts</Text>
      <EditableRow
        label="IP Address"
        value={ip}
        onSave={v => { setIp(v); saveAddr(v, port); }}
        hint="192.168.1.100"
        keyboardType="numeric"
        iconName="router"
        iconColor={N.cyan}
      />
      <EditableRow
        label="Port"
        value={port}
        onSave={v => { setPort(v); saveAddr(ip, v); }}
        hint="8766"
        keyboardType="numeric"
        iconName="swap-horiz"
        iconColor={N.amber}
        last
      />
    </View>
  );
}

// ─── OMEGA SCANNER CARD — Full-featured self-healing intelligence panel ────────
function OmegaScannerCard({
  monitorReport,
  setMonitorReport,
}: {
  monitorReport: MonitorReport | null;
  setMonitorReport: (r: MonitorReport | null) => void;
}) {
  const [scanning,     setScanning]     = useState(false);
  const [expanded,     setExpanded]     = useState(false);
  const [showFixLog,   setShowFixLog]   = useState(false);
  const [showHistory,  setShowHistory]  = useState(false);
  const [fixLog,       setFixLog]       = useState<string[]>([]);
  const [history,      setHistory]      = useState<MonitorReport[]>([]);
  const [criticalToast, setCriticalToast] = useState<string | null>(null);
  const toastTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scanAnim  = useRef(new Animated.Value(0)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.5)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  const statusColor = monitorReport
    ? monitorReport.status === 'healthy' ? N.green
    : monitorReport.status === 'degraded' ? N.amber
    : N.red
    : N.textBrt;

  useEffect(() => {
    // Subscribe to critical fix toasts
    const unsub = autoUpgradeMonitor.onCriticalFix((fix, severity) => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setCriticalToast(fix.slice(0, 80));
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.delay(4000),
        Animated.timing(toastAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
      toastTimerRef.current = setTimeout(() => setCriticalToast(null), 5000);
    });
    // Load persisted fix log + history on mount
    autoUpgradeMonitor.getFixes().then(f => setFixLog(f)).catch(() => {});
    autoUpgradeMonitor.getReports().then(h => setHistory(h)).catch(() => {});
    // Radar pulse
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0.2, duration: 1100, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => { unsub(); pulse.stop(); if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, []);

  // FIX: store loop refs so stopScanAnim and unmount cleanup can stop them.
  // logger.FIX_PATTERNS.ANIM_CLEANUP shows the pattern.
  const scanLoopRef  = useRef<Animated.CompositeAnimation | null>(null);
  const radarLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const startScanAnim = () => {
    scanLoopRef.current  = Animated.loop(
      Animated.timing(scanAnim, { toValue: 1, duration: 1800, useNativeDriver: true })
    );
    radarLoopRef.current = Animated.loop(
      Animated.timing(radarAnim, { toValue: 1, duration: 2400, useNativeDriver: false })
    );
    scanLoopRef.current.start();
    radarLoopRef.current.start();
  };
  const stopScanAnim = () => {
    scanLoopRef.current?.stop();  radarLoopRef.current?.stop();
    scanLoopRef.current = null;   radarLoopRef.current = null;
    scanAnim.setValue(0);
    radarAnim.setValue(0);
  };

  const handleForceScan = async () => {
    if (scanning) return;
    haptics.medium();
    setScanning(true);
    startScanAnim();
    try {
      const r = await autoUpgradeMonitor.forceCheck();
      setMonitorReport(r);
      // Refresh fix log and history after scan
      const [fixes, hist] = await Promise.all([
        autoUpgradeMonitor.getFixes(),
        autoUpgradeMonitor.getReports(),
      ]);
      setFixLog(fixes);
      setHistory(hist);
      haptics.success();
    } finally {
      setScanning(false);
      stopScanAnim();
    }
  };

  const handleClearLogs = () => {
    Alert.alert('Clear Omega Logs', 'Delete all scan history and fix logs?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        haptics.heavy();
        await autoUpgradeMonitor.clearLogs();
        setMonitorReport(null);
        setFixLog([]);
        setHistory([]);
      }},
    ]);
  };

  const handleToggleExpand = () => {
    haptics.light();
    setExpanded(v => {
      Animated.timing(expandAnim, { toValue: v ? 0 : 1, duration: 280, useNativeDriver: false }).start();
      return !v;
    });
  };

  const radarWidth = radarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const scanTranslateY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-2, 200] });

  const SEVERITY_COLORS: Record<string, string> = {
    critical: N.red,
    warning:  N.amber,
    info:     N.cyan,
  };
  const CATEGORY_ICONS: Record<string, string> = {
    kb:       'library-books',
    server:   'dns',
    memory:   'memory',
    organize: 'sort',
    growth:   'trending-up',
  };

  const score = monitorReport?.score ?? 0;
  const scoreCol = score >= 80 ? N.green : score >= 50 ? N.amber : N.red;
  const criticals = monitorReport?.issues.filter(i => i.severity === 'critical').length ?? 0;
  const warnings  = monitorReport?.issues.filter(i => i.severity === 'warning').length ?? 0;
  const infos     = monitorReport?.issues.filter(i => i.severity === 'info').length ?? 0;
  const autoFixed = monitorReport?.issues.filter(i => i.autoFixed).length ?? 0;

  return (
    <View style={[omega.outer, { borderColor: statusColor + '55' }]}>
      {/* ── Top accent + scan sweep line ── */}
      <View style={[omega.topBar, { backgroundColor: statusColor }]} />
      {scanning ? (
        <Animated.View
          pointerEvents="none"
          style={[omega.scanSweep, { backgroundColor: statusColor + '18', transform: [{ translateY: scanTranslateY }] }]}
        />
      ) : null}

      {/* ── Critical fix toast ── */}
      {criticalToast ? (
        <Animated.View style={[omega.toast, { opacity: toastAnim, borderColor: N.green + '70', backgroundColor: N.green + '12' }]}>
          <MaterialIcons name="auto-fix-high" size={12} color={N.green} />
          <Text style={[omega.toastTxt, { color: N.green }]} numberOfLines={2}>AUTO-FIX: {criticalToast}</Text>
        </Animated.View>
      ) : null}

      {/* ── Header ── */}
      <TouchableOpacity onPress={handleToggleExpand} style={omega.header} activeOpacity={0.85}>
        {/* Radar icon with animated ring */}
        <View style={omega.radarWrap}>
          <View style={[omega.radarBase, { borderColor: statusColor + '40', backgroundColor: statusColor + '08' }]}>
            {/* Animated radar sweep */}
            {scanning ? (
              <Animated.View style={[omega.radarFill, { width: radarWidth, backgroundColor: statusColor + '30' }]} />
            ) : null}
            <Animated.View style={[omega.radarDot, { backgroundColor: statusColor, opacity: pulseAnim }]} />
            <MaterialIcons name="radar" size={22} color={statusColor} />
          </View>
          {autoUpgradeMonitor.isRunning() || scanning ? (
            <View style={[omega.runningBadge, { backgroundColor: N.amber }]} />
          ) : null}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[omega.title, { color: statusColor }]}>OMEGA SCANNER</Text>
          <Text style={omega.sub}>
            {scanning ? 'Scanning...' : monitorReport
              ? `Last: ${new Date(monitorReport.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${monitorReport.cycleMs}ms`
              : 'Self-healing · 8-min auto-cycles'}
          </Text>
        </View>

        {/* Status badge */}
        {monitorReport ? (
          <View style={[omega.statusBadge, { borderColor: statusColor + '55', backgroundColor: statusColor + '10' }]}>
            <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor, opacity: pulseAnim }} />
            <Text style={[omega.statusTxt, { color: statusColor }]}>{monitorReport.status.toUpperCase()}</Text>
          </View>
        ) : null}
        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={18} color={statusColor + '80'} style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      {/* ── Score + stat chips ── */}
      <View style={omega.statsRow}>
        {/* Score gauge */}
        <View style={[omega.scoreBox, { borderColor: scoreCol + '50', backgroundColor: scoreCol + '08' }]}>
          <Text style={[omega.scoreNum, { color: scoreCol }]}>{monitorReport ? score : '—'}</Text>
          <Text style={omega.scoreLabel}>SCORE</Text>
          {monitorReport ? (
            <View style={[omega.scoreBar, { backgroundColor: N.border }]}>
              <View style={{ width: `${score}%` as any, height: '100%', borderRadius: 2, backgroundColor: scoreCol }} />
            </View>
          ) : null}
        </View>
        {/* Issue chips */}
        {[
          { val: criticals, label: 'CRITICAL', col: N.red    },
          { val: warnings,  label: 'WARN',     col: N.amber  },
          { val: infos,     label: 'INFO',     col: N.cyan   },
          { val: autoFixed, label: 'FIXED',    col: N.green  },
        ].map(({ val, label, col }) => (
          <View key={label} style={[omega.chipBox, { borderColor: col + '35', backgroundColor: col + (val > 0 ? '12' : '06') }]}>
            <Text style={[omega.chipVal, { color: val > 0 ? col : N.text }]}>{monitorReport ? val : '—'}</Text>
            <Text style={[omega.chipLabel, { color: val > 0 ? col + 'BB' : N.text }]}>{label}</Text>
          </View>
        ))}
        {/* KB findings */}
        <View style={[omega.chipBox, { borderColor: N.cyan + '35', backgroundColor: N.cyan + '06' }]}>
          <Text style={[omega.chipVal, { color: N.cyan }]}>{monitorReport?.kbFindings ?? '—'}</Text>
          <Text style={[omega.chipLabel, { color: N.cyan + 'BB' }]}>KB</Text>
        </View>
      </View>

      {/* ── Radar progress bar ── */}
      {scanning ? (
        <View style={omega.progressTrack}>
          <Animated.View style={[omega.progressFill, { width: radarWidth, backgroundColor: statusColor }]} />
        </View>
      ) : null}

      {/* ── Expandable detail panel ── */}
      <Animated.View style={{ overflow: 'hidden', maxHeight: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 2400] }) }}>

        {/* Issues list */}
        {monitorReport && monitorReport.issues.length > 0 ? (
          <View style={omega.section}>
            <Text style={[omega.sectionLbl, { color: N.textBrt }]}>DETECTED ISSUES ({monitorReport.issues.length})</Text>
            {monitorReport.issues.map((issue, i) => {
              const col = SEVERITY_COLORS[issue.severity] || N.cyan;
              const icon = CATEGORY_ICONS[issue.category] || 'info';
              return (
                <View key={issue.id} style={[omega.issueRow, { borderLeftColor: col, borderBottomWidth: i < monitorReport.issues.length - 1 ? 1 : 0 }]}>
                  <View style={[omega.issueIconBox, { borderColor: col + '50', backgroundColor: col + '10' }]}>
                    <MaterialIcons name={icon as any} size={13} color={col} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={[omega.severityPill, { borderColor: col + '55', backgroundColor: col + '12' }]}>
                        <Text style={[omega.severityTxt, { color: col }]}>{issue.severity.toUpperCase()}</Text>
                      </View>
                      <Text style={[omega.issueCategory, { color: col + '80' }]}>{issue.category.toUpperCase()}</Text>
                      {issue.autoFixed ? (
                        <View style={[omega.fixedBadge, { borderColor: N.green + '50', backgroundColor: N.green + '10' }]}>
                          <MaterialIcons name="auto-fix-high" size={9} color={N.green} />
                          <Text style={[omega.fixedTxt, { color: N.green }]}>AUTO-FIXED</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={omega.issueDesc} numberOfLines={2}>{issue.description}</Text>
                    {issue.fix ? (
                      <Text style={[omega.issueFix, { color: N.green + '99' }]} numberOfLines={2}>▸ {issue.fix}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : monitorReport ? (
          <View style={[omega.section, { alignItems: 'center', paddingVertical: 14 }]}>
            <MaterialIcons name="verified" size={24} color={N.green} />
            <Text style={{ fontSize: 11, color: N.green, fontFamily: MONO, marginTop: 6, fontWeight: '700' }}>ALL CLEAR — No issues detected</Text>
          </View>
        ) : null}

        {/* Fix log viewer */}
        {fixLog.length > 0 ? (
          <View style={omega.section}>
            <TouchableOpacity
              onPress={() => setShowFixLog(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: showFixLog ? 8 : 0 }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="build" size={12} color={N.amber} />
              <Text style={[omega.sectionLbl, { color: N.amber, flex: 1 }]}>FIX LOG ({fixLog.length} entries)</Text>
              <MaterialIcons name={showFixLog ? 'expand-less' : 'expand-more'} size={14} color={N.amber + '80'} />
            </TouchableOpacity>
            {showFixLog ? (
              <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {fixLog.slice(0, 30).map((fix, i) => (
                  <View key={i} style={[omega.fixLogRow, { borderBottomWidth: i < Math.min(fixLog.length, 30) - 1 ? 1 : 0, borderBottomColor: '#1A1D24' }]}>
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: N.green, flexShrink: 0, marginTop: 4 }} />
                    <Text style={omega.fixLogTxt} numberOfLines={2}>{fix}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>
        ) : null}

        {/* Scan history */}
        {history.length > 1 ? (
          <View style={omega.section}>
            <TouchableOpacity
              onPress={() => setShowHistory(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: showHistory ? 8 : 0 }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="history" size={12} color={N.cyan} />
              <Text style={[omega.sectionLbl, { color: N.cyan, flex: 1 }]}>SCAN HISTORY ({history.length} reports)</Text>
              <MaterialIcons name={showHistory ? 'expand-less' : 'expand-more'} size={14} color={N.cyan + '80'} />
            </TouchableOpacity>
            {showHistory ? (
              <View style={{ gap: 4 }}>
                {history.slice(0, 10).map((rep, i) => {
                  const col = rep.status === 'healthy' ? N.green : rep.status === 'degraded' ? N.amber : N.red;
                  return (
                    <View key={i} style={[omega.histRow, { borderColor: col + '30', backgroundColor: col + '06' }]}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: col, flexShrink: 0 }} />
                      <Text style={[omega.histStatus, { color: col }]}>{rep.status.toUpperCase()}</Text>
                      <Text style={omega.histScore}>{rep.score}/100</Text>
                      <Text style={omega.histTime}>{new Date(rep.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      <Text style={[omega.histFixes, { color: rep.fixes.length > 0 ? N.green : N.text }]}>
                        {rep.fixes.length > 0 ? `+${rep.fixes.length} fix` : 'clean'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* What this scanner does */}
        <View style={[omega.section, { backgroundColor: N.panel, borderRadius: 8, borderWidth: 1, borderColor: N.border }]}>
          <Text style={[omega.sectionLbl, { color: N.textBrt, marginBottom: 6 }]}>WHAT OMEGA SCANS</Text>
          {[
            { icon: 'library-books', col: N.cyan,  txt: 'KB stagnation → auto-triggers ΩLOOP growth cycle' },
            { icon: 'content-copy',  col: N.amber, txt: 'High duplicate rate → runs organize cycle + prune' },
            { icon: 'error-outline', col: N.red,   txt: 'Error clusters → reduces relay relay results' },
            { icon: 'memory',        col: N.sigma, txt: 'Near-capacity KB → prunes low-confidence findings' },
            { icon: 'explore',       col: N.cyan,  txt: 'Coverage gaps → triggers QLH micro-harvest' },
            { icon: 'dns',           col: N.green, txt: 'Server status → enables/disables local-only mode' },
            { icon: 'sort',          col: N.amber, txt: 'Slow organize → prunes and optimizes index' },
          ].map(({ icon, col, txt }) => (
            <View key={txt} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginBottom: 5 }}>
              <MaterialIcons name={icon as any} size={11} color={col} style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 9, color: N.text, fontFamily: MONO, lineHeight: 14 }}>{txt}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* ── Action buttons ── */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <TouchableOpacity
          style={[omega.actionBtn, { borderColor: statusColor + '55', backgroundColor: statusColor + '10', flex: 2, opacity: scanning ? 0.6 : 1 }]}
          onPress={handleForceScan}
          disabled={scanning}
          activeOpacity={0.8}
        >
          {scanning
            ? <ActivityIndicator size="small" color={statusColor} style={{ transform: [{ scale: 0.75 }] }} />
            : <MaterialIcons name="radar" size={13} color={statusColor} />}
          <Text style={[omega.actionTxt, { color: statusColor }]}>{scanning ? 'SCANNING...' : 'FORCE SCAN'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[omega.actionBtn, { borderColor: N.cyan + '40', backgroundColor: N.cyan + '08', flex: 2 }]}
          onPress={async () => {
            haptics.medium();
            const [fixes, hist] = await Promise.all([
              autoUpgradeMonitor.getFixes(),
              autoUpgradeMonitor.getReports(),
            ]);
            setFixLog(fixes);
            setHistory(hist);
            if (!expanded) handleToggleExpand();
          }}
          activeOpacity={0.8}
        >
          <MaterialIcons name="history" size={13} color={N.cyan} />
          <Text style={[omega.actionTxt, { color: N.cyan }]}>LOAD HISTORY</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[omega.actionBtn, { borderColor: N.red + '40', backgroundColor: N.red + '08', flex: 1 }]}
          onPress={handleClearLogs}
          activeOpacity={0.8}
        >
          <MaterialIcons name="delete-sweep" size={13} color={N.red} />
          <Text style={[omega.actionTxt, { color: N.red }]}>CLR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const omega = StyleSheet.create({
  outer:        { backgroundColor: N.card, borderRadius: 14, borderWidth: 2, marginBottom: 14, overflow: 'hidden', position: 'relative' },
  topBar:       { height: 2.5 },
  scanSweep:    { position: 'absolute', left: 0, right: 0, height: 3, zIndex: 5 },
  toast:        { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 8, marginHorizontal: 14, marginTop: 6, padding: 9 },
  toastTxt:     { flex: 1, fontSize: 10, fontFamily: MONO, fontWeight: '700', lineHeight: 14 },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingBottom: 8 },
  radarWrap:    { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 },
  radarBase:    { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  radarFill:    { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 0 },
  radarDot:     { position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: 3.5 },
  runningBadge: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: N.card },
  title:        { fontSize: 12, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.5 },
  sub:          { fontSize: 9, color: N.text, fontFamily: MONO, marginTop: 2 },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  statusTxt:    { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  statsRow:     { flexDirection: 'row', gap: 5, paddingHorizontal: 14, paddingBottom: 10 },
  scoreBox:     { width: 60, borderWidth: 1.5, borderRadius: 10, padding: 6, alignItems: 'center', gap: 2, flexShrink: 0 },
  scoreNum:     { fontSize: 18, fontWeight: '900', fontFamily: MONO, lineHeight: 22 },
  scoreLabel:   { fontSize: 6.5, color: N.text, fontFamily: MONO, letterSpacing: 0.8 },
  scoreBar:     { height: 3, width: '100%', borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  chipBox:      { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 6, alignItems: 'center', gap: 2 },
  chipVal:      { fontSize: 14, fontWeight: '900', fontFamily: MONO, lineHeight: 18 },
  chipLabel:    { fontSize: 6, fontFamily: MONO, letterSpacing: 0.5 },
  progressTrack:{ height: 2, backgroundColor: N.border, marginHorizontal: 14, marginBottom: 6, borderRadius: 1, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 1 },
  section:      { marginHorizontal: 14, marginBottom: 10, padding: 10, backgroundColor: N.panel, borderRadius: 10, borderWidth: 1, borderColor: N.border },
  sectionLbl:   { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.5, marginBottom: 0 },
  issueRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 9, borderLeftWidth: 3, paddingLeft: 8, borderBottomColor: '#1A1D24', backgroundColor: N.bg, marginBottom: 4, borderRadius: 6 },
  issueIconBox: { width: 26, height: 26, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  severityPill: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  severityTxt:  { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.3 },
  issueCategory:{ fontSize: 8, fontFamily: MONO, letterSpacing: 0.5 },
  fixedBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  fixedTxt:     { fontSize: 7, fontWeight: '900', fontFamily: MONO },
  issueDesc:    { fontSize: 10, color: N.textBrt, fontFamily: MONO, lineHeight: 15 },
  issueFix:     { fontSize: 9, fontFamily: MONO, lineHeight: 13, fontStyle: 'italic' },
  fixLogRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingVertical: 6 },
  fixLogTxt:    { flex: 1, fontSize: 9, color: N.textBrt, fontFamily: MONO, lineHeight: 14 },
  histRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7 },
  histStatus:   { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5, width: 70 },
  histScore:    { fontSize: 10, fontWeight: '700', fontFamily: MONO, color: N.textBrt, width: 44 },
  histTime:     { flex: 1, fontSize: 9, color: N.text, fontFamily: MONO },
  histFixes:    { fontSize: 9, fontFamily: MONO, fontWeight: '700' },
  actionBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1.5, borderRadius: 9, paddingVertical: 11, marginHorizontal: 0 },
  actionTxt:    { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
});

// ─── BUTLER AI KNOWLEDGE VIEWER ─────────────────────────────────────────────
// Displays the full starter knowledge injected into every AI chat session.
// Sections are parsed from the [SECTION_NAME] block headers in the knowledge string.

const KNOWLEDGE_SECTIONS: { id: string; title: string; icon: string; color: string }[] = [
  { id: 'WHAT YOU ARE',          title: 'Identity & Mission',      icon: 'smart-toy',       color: '#FF6A1F' },
  { id: 'APP ARCHITECTURE',      title: 'App Architecture',        icon: 'account-tree',    color: '#00FF88' },
  { id: 'TABS & FEATURES',       title: 'Tabs & Features',         icon: 'tab',             color: '#FF6A1F' },
  { id: 'HOW TO HELP',           title: 'AI Priority Rules',       icon: 'rule',            color: '#FFC400' },
  { id: 'SERVER API ENDPOINTS',  title: 'Server API Endpoints',    icon: 'api',             color: '#FF6A1F' },
  { id: 'SCRIPT EXECUTION',      title: 'Script Execution Rules',  icon: 'code',            color: '#00FF88' },
  { id: 'OLLAMA AI MODELS',      title: 'Ollama AI Models',        icon: 'memory',          color: '#FF6A1F' },
  { id: 'RESPONSE FORMAT',       title: 'Response Format Rules',   icon: 'format-align-left', color: '#FFC400' },
  { id: 'HOW THE APP STORES',    title: 'AsyncStorage Keys',       icon: 'storage',         color: '#FFC400' },
  { id: 'UI / JSON EDITING',     title: 'UI / JSON Editing',       icon: 'edit',            color: '#FF6A1F' },
  { id: 'COSMETIC THEMES',       title: 'Cosmetic Themes',         icon: 'palette',         color: '#FF6A1F' },
  { id: 'PLAY STORE COMPLIANCE', title: 'Play Store Compliance',   icon: 'verified-user',   color: '#00FF88' },
  { id: 'SELF-LEARNING',         title: 'Self-Learning System',    icon: 'school',          color: '#FF2A1F' },
  { id: 'MEMORY SYSTEM',         title: 'Memory System',           icon: 'psychology',      color: '#FF6A1F' },
  { id: 'QUICK AUTOMATION',      title: 'Quick Automation Examples', icon: 'bolt',          color: '#FFC400' },
  { id: 'WHEN USER ASKS',        title: 'Capability Summary',      icon: 'help-circle',     color: '#00FF88' },
];

function extractSection(knowledge: string, sectionId: string): string {
  try {
    const startMarker = `[${sectionId}`;
    const startIdx = knowledge.indexOf(startMarker);
    if (startIdx === -1) return '';
    // Find the next section header or end
    const afterStart = knowledge.indexOf('\n', startIdx) + 1;
    const nextBracket = knowledge.indexOf('\n[', afterStart);
    const endIdx = nextBracket === -1 ? knowledge.length : nextBracket;
    return knowledge.slice(afterStart, endIdx).trim();
  } catch { return ''; }
}

function ButlerKnowledgeViewer() {
  const ACCENT = '#FF6A1F';
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const knowledgeLen = BUTLER_STARTER_KNOWLEDGE.length;
  const knowledgeWords = Math.round(BUTLER_STARTER_KNOWLEDGE.split(/\s+/).length / 1000 * 10) / 10;
  const knowledgeSections = KNOWLEDGE_SECTIONS.length;

  const toggle = () => {
    haptics.light();
    setOpen(v => {
      Animated.timing(heightAnim, { toValue: v ? 0 : 1, duration: 300, useNativeDriver: false }).start();
      return !v;
    });
  };

  const handleCopyAll = async () => {
    haptics.medium();
    try {
      await ExpoClipboard.setStringAsync(BUTLER_STARTER_KNOWLEDGE);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      haptics.success();
    } catch {}
  };

  const NEON = '#FF2A1F';

  return (
    <View style={[bkv.outer, { borderColor: ACCENT + '55' }]}>
      {/* Top accent */}
      <View style={[bkv.topBar, { backgroundColor: ACCENT }]} />

      {/* Header toggle */}
      <TouchableOpacity onPress={toggle} style={bkv.header} activeOpacity={0.82}>
        <View style={[bkv.iconBox, { borderColor: ACCENT + '60', backgroundColor: ACCENT + '12' }]}>
          <MaterialIcons name="psychology" size={22} color={ACCENT} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[bkv.title, { color: ACCENT }]}>BUTLER AI STARTER KNOWLEDGE</Text>
          <Text style={bkv.sub}>Injected into every chat session automatically</Text>
        </View>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={20} color={ACCENT + '80'} />
      </TouchableOpacity>

      {/* Stats strip */}
      <View style={bkv.statsRow}>
        {[
          { val: String(knowledgeSections), label: 'SECTIONS', col: ACCENT },
          { val: `${knowledgeWords}K`,      label: 'WORDS',    col: '#00FF88' },
          { val: `${(knowledgeLen / 1024).toFixed(0)}KB`, label: 'SIZE', col: '#FFC400' },
          { val: 'AUTO',                    label: 'INJECT',   col: '#FF6A1F' },
        ].map(({ val, label, col }) => (
          <View key={label} style={[bkv.statChip, { borderColor: col + '35', backgroundColor: col + '08' }]}>
            <Text style={[bkv.statVal, { color: col }]}>{val}</Text>
            <Text style={bkv.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Info banner */}
      <View style={[bkv.infoBanner, { borderColor: ACCENT + '30', backgroundColor: ACCENT + '06' }]}>
        <MaterialIcons name="info-outline" size={13} color={ACCENT + '90'} />
        <Text style={[bkv.infoBannerTxt, { color: ACCENT + '90' }]}>
          This knowledge is automatically prepended to Butler AI's system prompt on every conversation so it starts fully informed about your app, server endpoints, scripts, Play Store rules, and how to help you.
        </Text>
      </View>

      {/* Expandable section list */}
      <Animated.View style={{ overflow: 'hidden', maxHeight: heightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 9999] }) }}>
        <View style={bkv.sectionList}>
          {KNOWLEDGE_SECTIONS.map((sec, idx) => {
            const content = extractSection(BUTLER_STARTER_KNOWLEDGE, sec.id);
            const isExp = expandedSection === sec.id;
            if (!content) return null;
            return (
              <View key={sec.id} style={[bkv.sectionCard, { borderLeftColor: sec.color, borderBottomWidth: idx < KNOWLEDGE_SECTIONS.length - 1 ? 1 : 0, borderBottomColor: '#1A1D24' }]}>
                <TouchableOpacity
                  onPress={() => { haptics.light(); setExpandedSection(isExp ? null : sec.id); }}
                  style={bkv.sectionHeader}
                  activeOpacity={0.8}
                >
                  <View style={[bkv.sectionIconBox, { borderColor: sec.color + '50', backgroundColor: sec.color + '12' }]}>
                    <MaterialIcons name={sec.icon as any} size={14} color={sec.color} />
                  </View>
                  <Text style={[bkv.sectionTitle, { color: sec.color + 'DD' }]}>{sec.title}</Text>
                  <Text style={bkv.sectionLen}>{content.length > 999 ? `${(content.length / 1000).toFixed(1)}K chars` : `${content.length} chars`}</Text>
                  <MaterialIcons name={isExp ? 'expand-less' : 'chevron-right'} size={14} color={sec.color + '60'} />
                </TouchableOpacity>
                {isExp ? (
                  <ScrollView style={bkv.sectionContent} scrollEnabled nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    <Text selectable style={bkv.sectionText}>{content}</Text>
                  </ScrollView>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Action buttons */}
        <View style={bkv.actionRow}>
          <TouchableOpacity
            onPress={handleCopyAll}
            style={[bkv.copyBtn, { borderColor: copied ? '#00FF8860' : ACCENT + '55', backgroundColor: copied ? '#00FF8810' : ACCENT + '0C' }]}
            activeOpacity={0.85}
          >
            <MaterialIcons name={copied ? 'check-circle' : 'content-copy'} size={14} color={copied ? '#00FF88' : ACCENT} />
            <Text style={[bkv.copyBtnTxt, { color: copied ? '#00FF88' : ACCENT }]}>
              {copied ? 'COPIED FULL KNOWLEDGE' : 'COPY ALL KNOWLEDGE'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Compact version */}
        <View style={[bkv.compactBox, { borderColor: '#00FF8825', backgroundColor: '#00FF8806' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <MaterialIcons name="compress" size={12} color="#00FF88" />
            <Text style={{ fontSize: 9, fontWeight: '900', color: '#00FF88', fontFamily: MONO, letterSpacing: 1.2 }}>COMPACT VERSION (BUTLER_KNOWLEDGE_COMPACT)</Text>
          </View>
          <Text selectable style={bkv.compactText}>{BUTLER_KNOWLEDGE_COMPACT}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const bkv = StyleSheet.create({
  outer:          { backgroundColor: N.card, borderRadius: 12, borderWidth: 1.5, marginBottom: 14, overflow: 'hidden' },
  topBar:         { height: 2 },
  header:         { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  iconBox:        { width: 46, height: 46, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title:          { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.5 },
  sub:            { fontSize: 9, color: N.text, fontFamily: MONO, marginTop: 2 },
  statsRow:       { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingBottom: 10 },
  statChip:       { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', gap: 2 },
  statVal:        { fontSize: 14, fontWeight: '900', fontFamily: MONO },
  statLabel:      { fontSize: 7, color: N.text, fontFamily: MONO, letterSpacing: 0.8 },
  infoBanner:     { flexDirection: 'row', alignItems: 'flex-start', gap: 7, borderWidth: 1, borderRadius: 8, marginHorizontal: 14, marginBottom: 4, padding: 10 },
  infoBannerTxt:  { flex: 1, fontSize: 10, fontFamily: MONO, lineHeight: 15 },
  sectionList:    { paddingTop: 8 },
  sectionCard:    { borderLeftWidth: 2, backgroundColor: N.panel, marginHorizontal: 14, marginBottom: 4, borderRadius: 8, overflow: 'hidden' },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 10 },
  sectionIconBox: { width: 26, height: 26, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sectionTitle:   { flex: 1, fontSize: 11, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.3 },
  sectionLen:     { fontSize: 8, color: N.text, fontFamily: MONO },
  sectionContent: { maxHeight: 280, backgroundColor: '#050505', borderTopWidth: 1, borderTopColor: '#1A1D24' },
  sectionText:    { fontSize: 10, color: '#9AA3B2', fontFamily: MONO, lineHeight: 16, padding: 12 },
  actionRow:      { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  copyBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 10, paddingVertical: 12 },
  copyBtnTxt:     { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  compactBox:     { margin: 14, marginTop: 4, borderWidth: 1, borderRadius: 10, padding: 12 },
  compactText:    { fontSize: 9, color: '#5A8090', fontFamily: MONO, lineHeight: 15 },
});

// ─── EXPORT UI CODE CARD ───────────────────────────────────────────────────────
// Produces a single combined dump of ALL app files — manifest + embedded sources.

function ExportUICodeCard() {
  const [copied,        setCopied]        = useState(false);
  const [copying,       setCopying]       = useState(false);
  const [showModal,     setShowModal]     = useState(false);
  const [exportText,    setExportText]    = useState('');
  const [promptCopied,  setPromptCopied]  = useState(false);
  const [jsonSaving,    setJsonSaving]    = useState(false);
  const [lastExportTs,  setLastExportTs]  = useState<string>('');
  const [hasChanged,    setHasChanged]    = useState(false);

  const EXPORT_HASH_KEY = '@butler_export_hash_v1';

  // Check hash on mount to show green badge if app changed since last export
  useEffect(() => {
    const checkHash = async () => {
      try {
        const currentHash = computeSourceHash();
        const savedHash   = await AsyncStorage.getItem(EXPORT_HASH_KEY).catch(() => null);
        setHasChanged(savedHash !== currentHash);
      } catch { setHasChanged(false); }
    };
    checkHash();
  }, []);

  const saveExportHash = async () => {
    try {
      await AsyncStorage.setItem(EXPORT_HASH_KEY, computeSourceHash());
      setHasChanged(false);
    } catch {}
  };

  // ─── Auto-copy AI prompt — guaranteed on Android + iOS ────────────────────
  const autoCopyPrompt = async () => {
    try {
      await ExpoClipboard.setStringAsync(DETAILED_AI_PROMPT);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 5000);
    } catch {
      // Fallback: retry once after 200ms (Android clipboard can be sluggish)
      try {
        await new Promise(r => setTimeout(r, 200));
        await ExpoClipboard.setStringAsync(DETAILED_AI_PROMPT);
        setPromptCopied(true);
        setTimeout(() => setPromptCopied(false), 5000);
      } catch { /* silent */ }
    }
  };

  const accentColor = '#00FF88';
  const embeddedCount = Object.keys(BUNDLE_SOURCES).length;
  const totalFiles    = BUNDLE_MANIFEST.length;

  const buildAndCopy = async () => {
    haptics.heavy();
    setCopying(true);
    try {
      const text = buildAllFilesExport();
      setExportText(text);
      await ExpoClipboard.setStringAsync(text);
      setCopied(true);
      setLastExportTs(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      haptics.success();
      setTimeout(() => setCopied(false), 4000);
      // Save hash so green dot clears (COPY ALL also counts as an export)
      saveExportHash();
      // Auto-copy AI prompt after 1.5s so user can paste export first, then prompt
      setTimeout(autoCopyPrompt, 1500);
    } catch {
      Alert.alert('Copy failed', 'Unable to copy. Try PREVIEW + share instead.');
    } finally {
      setCopying(false);
    }
  };

  const handlePreview = () => {
    haptics.light();
    const text = exportText || buildAllFilesExport();
    setExportText(text);
    setShowModal(true);
  };

  const handleShare = async () => {
    haptics.medium();
    try {
      const text = exportText || buildAllFilesExport();
      const { Share } = require('react-native');
      await Share.share({
        message: text,
        title:   'Butler AI — Full App Export',
      });
    } catch {}
  };

  const handleSaveJson = async () => {
    if (jsonSaving) return;
    haptics.heavy();
    setJsonSaving(true);
    const STEP = (n: number, msg: string) => {
      const line = `[SAVE_JSON] Step ${n}: ${msg}`;
      console.log(line);
    };
    try {
      // ── STEP 1: documentDirectory guard ──────────────────────
      STEP(1, 'Checking FileSystem.documentDirectory...');
      const docDir = FileSystem.documentDirectory;
      console.log('[SAVE_JSON] documentDirectory =', docDir);
      if (!docDir) {
        const msg = 'FileSystem.documentDirectory is null/undefined. Platform: ' + Platform.OS;
        console.error('[SAVE_JSON] FAIL step 1:', msg);
        Alert.alert('STEP 1 FAILED', msg);
        return;
      }
      STEP(1, 'OK — docDir: ' + docDir);

      // ── STEP 2: Build JSON object ─────────────────────────────
      STEP(2, 'Building JSON object via buildExportJson()...');
      let jsonObj: Record<string, unknown>;
      let jsonStr: string;
      try {
        jsonObj = buildExportJson();
        jsonStr = JSON.stringify(jsonObj, null, 2);
        STEP(2, `OK — JSON size: ${(jsonStr.length / 1024).toFixed(1)} KB, keys: ${Object.keys(jsonObj).length}`);
        console.log('[SAVE_JSON] Top-level keys:', Object.keys(jsonObj).join(', '));
      } catch (buildErr: any) {
        const msg = 'buildExportJson() threw: ' + (buildErr?.message || String(buildErr));
        console.error('[SAVE_JSON] FAIL step 2:', msg, buildErr?.stack);
        Alert.alert('STEP 2 FAILED — Build Error', msg + '\n\n' + (buildErr?.stack || ''));
        return;
      }

      // ── STEP 3: makeDirectoryAsync ────────────────────────────
      const dir = docDir + 'butler_exports/';
      STEP(3, 'makeDirectoryAsync: ' + dir);
      try {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        STEP(3, 'OK — directory ready');
      } catch (dirErr: any) {
        // May already exist — log but continue
        const msg = 'makeDirectoryAsync warn (may exist): ' + (dirErr?.message || String(dirErr));
        console.warn('[SAVE_JSON] Step 3 warn:', msg);
        STEP(3, 'WARN (ignored): ' + msg);
      }

      // ── STEP 4: writeAsStringAsync ────────────────────────────
      const filename = `butler_ai_export_${Date.now()}.json`;
      const outPath = dir + filename;
      STEP(4, 'writeAsStringAsync → ' + outPath);
      try {
        await FileSystem.writeAsStringAsync(outPath, jsonStr, { encoding: FileSystem.EncodingType.UTF8 });
        STEP(4, 'OK — write complete');
      } catch (writeErr: any) {
        const msg = 'writeAsStringAsync failed: ' + (writeErr?.message || String(writeErr));
        console.error('[SAVE_JSON] FAIL step 4:', msg, writeErr?.stack);
        Alert.alert('STEP 4 FAILED — Write Error', msg + '\n\n' + (writeErr?.stack || ''));
        return;
      }

      // ── STEP 5: getInfoAsync (verify) ─────────────────────────
      STEP(5, 'getInfoAsync: ' + outPath);
      let info: { exists: boolean; size?: number };
      try {
        info = await FileSystem.getInfoAsync(outPath);
        console.log('[SAVE_JSON] getInfoAsync result:', JSON.stringify(info));
        STEP(5, `exists=${info.exists}, size=${(info as any)?.size ?? 'n/a'} bytes`);
      } catch (infoErr: any) {
        const msg = 'getInfoAsync threw: ' + (infoErr?.message || String(infoErr));
        console.error('[SAVE_JSON] FAIL step 5:', msg);
        Alert.alert('STEP 5 FAILED — Verify Error', msg);
        return;
      }
      if (!info.exists) {
        const msg = 'File does not exist after write! Path: ' + outPath;
        console.error('[SAVE_JSON] FAIL step 5:', msg);
        Alert.alert('STEP 5 FAILED — File Missing', msg);
        return;
      }

      // ── STEP 6: saveExportHash ────────────────────────────────
      STEP(6, 'Saving export hash to AsyncStorage...');
      try {
        await saveExportHash();
        STEP(6, 'OK');
      } catch (hashErr: any) {
        console.warn('[SAVE_JSON] Step 6 warn (hash):', hashErr?.message);
      }

      // ── STEP 7: isAvailableAsync ──────────────────────────────
      STEP(7, 'Sharing.isAvailableAsync()...');
      let canShare = false;
      try {
        canShare = await Sharing.isAvailableAsync();
        STEP(7, 'canShare = ' + canShare);
      } catch (shareCheckErr: any) {
        console.warn('[SAVE_JSON] Step 7 warn:', shareCheckErr?.message);
        STEP(7, 'WARN — isAvailableAsync threw, defaulting to false');
      }

      // ── STEP 8: shareAsync ────────────────────────────────────
      if (canShare) {
        STEP(8, 'Sharing.shareAsync → ' + outPath);
        try {
          await Sharing.shareAsync(outPath, {
            mimeType: 'application/json',
            dialogTitle: 'Save Butler AI Source Export',
            UTI: 'public.json',
          });
          STEP(8, 'OK — share sheet opened');
        } catch (shareErr: any) {
          const msg = 'shareAsync failed: ' + (shareErr?.message || String(shareErr));
          console.error('[SAVE_JSON] FAIL step 8:', msg, shareErr?.stack);
          Alert.alert('STEP 8 FAILED — Share Error', msg + '\n\n' + (shareErr?.stack || ''));
          return;
        }
        haptics.success();
        setLastExportTs(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        autoCopyPrompt();
        console.log('[SAVE_JSON] ALL STEPS COMPLETE ✓ — file:', outPath);
      } else {
        STEP(8, 'Sharing unavailable — showing path alert');
        Alert.alert('Saved', `JSON written to:\n${outPath}\n\nSize: ${((jsonStr.length) / 1024).toFixed(1)} KB`);
        haptics.success();
        autoCopyPrompt();
      }
    } catch (e: any) {
      const msg = e?.message || 'Unknown error';
      const stack = e?.stack || '';
      console.error('[SAVE_JSON] UNCAUGHT ERROR:', msg, stack);
      Alert.alert(
        'Save Failed — Uncaught Error',
        msg + '\n\n' + stack.slice(0, 400)
      );
      haptics.warning();
    } finally {
      setJsonSaving(false);
    }
  };

  return (
    <>
      <View style={[g.card, { borderColor: accentColor + '70', borderWidth: 2, marginBottom: 14 }]}>
        {/* Top accent bar */}
        <View style={{ height: 2, backgroundColor: accentColor, borderTopLeftRadius: 10, borderTopRightRadius: 10, marginHorizontal: -14, marginTop: -14, marginBottom: 14 }} />

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <View style={[g.iconBox, { borderColor: accentColor, backgroundColor: accentColor + '12' }]}>
            <MaterialIcons name="folder-zip" size={22} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[g.cardTitle, { color: accentColor, marginBottom: 2 }]}>EXPORT ALL FILES</Text>
            <Text style={g.cardSub}>Full app export → edit in any AI builder</Text>
          </View>
        </View>

        {/* AI Prompt quick-copy strip */}
        <TouchableOpacity
          style={[{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: promptCopied ? '#00FF8815' : '#1A1D24',
            borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
            borderWidth: 1.5, borderColor: promptCopied ? '#00FF8870' : '#232730',
          }]}
          onPress={() => { haptics.medium(); autoCopyPrompt(); }}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name={promptCopied ? 'check-circle' : 'psychology'}
            size={16}
            color={promptCopied ? '#00FF88' : accentColor}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: promptCopied ? '#00FF88' : accentColor, fontFamily: MONO, letterSpacing: 0.5 }}>
              {promptCopied ? 'AI PROMPT COPIED — PASTE INTO AI BUILDER' : 'COPY AI BUILDER PROMPT'}
            </Text>
            <Text style={{ fontSize: 9, color: N.text, fontFamily: MONO, marginTop: 2 }}>
              {promptCopied
                ? 'Now paste it + attach the exported JSON file'
                : 'Auto-copies after SAVE JSON · includes full guide for Claude/GPT/local AI'}
            </Text>
          </View>
          <MaterialIcons name="content-copy" size={13} color={promptCopied ? '#00FF88' : N.textBrt} />
        </TouchableOpacity>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'FILES',    val: String(totalFiles),    col: accentColor },
            { label: 'EMBEDDED', val: String(embeddedCount), col: '#00FF88'   },
            { label: 'FORMAT',   val: 'JS/TS',               col: '#FF6A1F'   },
            { label: 'OUTPUT',   val: 'CLIPBOARD',            col: '#FF6A1F'   },
          ].map(({ label, val, col }) => (
            <View key={label} style={{ flex: 1, alignItems: 'center', backgroundColor: N.card, borderRadius: 8, borderWidth: 1, borderColor: N.border, paddingVertical: 9 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: col, fontFamily: MONO }}>{val}</Text>
              <Text style={{ fontSize: 7, color: N.text, fontFamily: MONO, marginTop: 3, letterSpacing: 0.5 }}>{label}</Text>
            </View>
          ))}
        </View>

        {/* File list preview */}
        <View style={{ backgroundColor: '#050505', borderRadius: 8, borderWidth: 1, borderColor: '#1A1D24', padding: 10, marginBottom: 12, gap: 3 }}>
          <Text style={{ fontSize: 8, fontWeight: '900', color: '#525A68', fontFamily: MONO, letterSpacing: 1.5, marginBottom: 5 }}>FILE MANIFEST</Text>
          {BUNDLE_MANIFEST.slice(0, 8).map((f, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: BUNDLE_SOURCES[f.path] ? '#00FF88' : '#525A68', flexShrink: 0 }} />
              <Text style={{ flex: 1, fontSize: 9, color: BUNDLE_SOURCES[f.path] ? '#A8D8B8' : '#525A68', fontFamily: MONO }} numberOfLines={1}>{f.path}</Text>
              <Text style={{ fontSize: 7, color: '#5A626E', fontFamily: MONO }}>~{f.lines}L</Text>
            </View>
          ))}
          {BUNDLE_MANIFEST.length > 8 ? (
            <Text style={{ fontSize: 8, color: '#525A68', fontFamily: MONO, marginTop: 3 }}>+ {BUNDLE_MANIFEST.length - 8} more files listed in manifest...</Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#1A1D24' }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#00FF88' }} />
            <Text style={{ fontSize: 8, color: '#00FF88', fontFamily: MONO }}>green = full source embedded</Text>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#525A68', marginLeft: 8 }} />
            <Text style={{ fontSize: 8, color: '#525A68', fontFamily: MONO }}>grey = manifest only</Text>
          </View>
        </View>

        {/* Workflow guide banner */}
        <View style={{ backgroundColor: accentColor + '06', borderRadius: 10, borderWidth: 1, borderColor: accentColor + '30', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}>
          <Text style={{ fontSize: 9, fontWeight: '900', color: accentColor, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 6 }}>WORKFLOW</Text>
          {[
            { step: '1', txt: 'Tap SAVE JSON → file saved + AI prompt auto-copied to clipboard' },
            { step: '2', txt: 'Open Claude / GPT → paste the AI prompt' },
            { step: '3', txt: 'Attach the exported .json file → describe your UI changes' },
            { step: '4', txt: 'Paste AI response into OnSpace.ai chat → auto-applied instantly' },
            { step: '5', txt: 'Test in live preview → done!' },
          ].map(({ step, txt }) => (
            <View key={step} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: accentColor + '20', borderWidth: 1, borderColor: accentColor + '60', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Text style={{ fontSize: 8, fontWeight: '900', color: accentColor, fontFamily: MONO }}>{step}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 9, color: '#7A8392', fontFamily: MONO, lineHeight: 14 }}>{txt}</Text>
            </View>
          ))}
        </View>

        {/* Last export timestamp */}
        {lastExportTs ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <MaterialIcons name="history" size={11} color={N.green} />
            <Text style={{ fontSize: 9, color: N.green, fontFamily: MONO }}>Last export: {lastExportTs} · AI prompt auto-copied</Text>
          </View>
        ) : null}

        {/* Action buttons — row 1: primary copy */}
        <TouchableOpacity
          style={[{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: copied ? N.green : copying ? accentColor + 'AA' : accentColor,
            borderRadius: 10, paddingVertical: 14, marginBottom: 8,
            ...Platform.select({ ios: { shadowColor: accentColor, shadowOffset:{width:0,height:4}, shadowOpacity:0.5, shadowRadius:10 }, android: { elevation: 6 } }),
          }]}
          onPress={buildAndCopy} disabled={copying} activeOpacity={0.85}
        >
          {copying
            ? <ActivityIndicator size="small" color="#000" />
            : <MaterialIcons name={copied ? 'check-circle' : 'content-copy'} size={17} color="#000" />}
          <Text style={{ fontSize: 13, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 0.5 }}>
            {copying ? 'BUILDING...' : copied ? 'COPIED! (prompt auto-copies in 1.5s)' : 'COPY ALL FILES'}
          </Text>
        </TouchableOpacity>
        {/* Action buttons — row 2: secondary actions */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <TouchableOpacity
            style={[{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
              borderWidth: 1.5, borderColor: accentColor + '55', borderRadius: 10, paddingVertical: 12,
              backgroundColor: accentColor + '0A',
            }]}
            onPress={handlePreview} activeOpacity={0.8}
          >
            <MaterialIcons name="open-in-new" size={14} color={accentColor} />
            <Text style={{ fontSize: 9, fontWeight: '900', color: accentColor, fontFamily: MONO }}>PREVIEW</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
              borderWidth: 1.5, borderColor: '#FFC40055', borderRadius: 10, paddingVertical: 12,
              backgroundColor: '#FFC4000A',
            }]}
            onPress={handleShare} activeOpacity={0.8}
          >
            <MaterialIcons name="share" size={14} color="#FFC400" />
            <Text style={{ fontSize: 9, fontWeight: '900', color: '#FFC400', fontFamily: MONO }}>SHARE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
              borderWidth: 1.5,
              borderColor: hasChanged ? '#00FF8855' : '#FFC40055',
              borderRadius: 10, paddingVertical: 12,
              backgroundColor: jsonSaving ? '#FFC40015' : hasChanged ? '#00FF8808' : '#FFC4000A',
              opacity: jsonSaving ? 0.7 : 1,
              position: 'relative' as const,
            }]}
            onPress={handleSaveJson} disabled={jsonSaving} activeOpacity={0.8}
          >
            {/* Green dot badge when app has changed since last export */}
            {hasChanged && !jsonSaving ? (
              <View style={{
                position: 'absolute', top: -5, right: -5,
                width: 11, height: 11, borderRadius: 6,
                backgroundColor: '#00FF88',
                borderWidth: 2, borderColor: '#0E0F12',
                zIndex: 10,
                ...Platform.select({ ios: { shadowColor: '#00FF88', shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:5 }, android: {} }),
              }} />
            ) : null}
            {jsonSaving
              ? <ActivityIndicator size="small" color={hasChanged ? '#00FF88' : '#FFC400'} />
              : <MaterialIcons name="save-alt" size={14} color={hasChanged ? '#00FF88' : '#FFC400'} />}
            <Text style={{ fontSize: 9, fontWeight: '900', color: hasChanged ? '#00FF88' : '#FFC400', fontFamily: MONO }}>
              {jsonSaving ? 'SAVING...' : hasChanged ? 'SAVE JSON ●' : 'SAVE JSON'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>


      {/* Full preview modal */}
      <Modal visible={showModal} animationType="slide" statusBarTranslucent onRequestClose={() => setShowModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#0E0F12' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16,
            paddingTop: Platform.OS === 'android' ? 40 : 60, paddingBottom: 14,
            borderBottomWidth: 1, borderBottomColor: '#1A1D24', backgroundColor: '#0E0F12' }}>
            <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="arrow-back" size={20} color="#9AA3B2" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFFFFF', fontFamily: MONO }}>
                ALL FILES <Text style={{ color: accentColor }}>EXPORT</Text>
              </Text>
              <Text style={{ fontSize: 9, color: '#5A626E', fontFamily: MONO, marginTop: 2 }}>{totalFiles} files · {embeddedCount} with full source</Text>
            </View>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: copied ? N.green : accentColor,
                borderRadius: 9, paddingHorizontal: 14, paddingVertical: 9 }}
              onPress={() => { buildAndCopy(); setShowModal(false); }} activeOpacity={0.85}
            >
              <MaterialIcons name={copied ? 'check' : 'content-copy'} size={14} color="#000" />
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#000', fontFamily: MONO }}>{copied ? 'COPIED' : 'COPY'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
            <View style={{ backgroundColor: '#050505', borderRadius: 10, borderWidth: 1, borderColor: '#1A1D24', padding: 14, marginBottom: 16 }}>
              <Text style={{ fontSize: 10, color: '#A8D8B8', fontFamily: MONO, lineHeight: 18 }}>
                {exportText || buildAllFilesExport()}
              </Text>
            </View>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                backgroundColor: accentColor, borderRadius: 10, paddingVertical: 14, marginBottom: 8 }}
              onPress={() => { buildAndCopy(); setShowModal(false); }} activeOpacity={0.85}
            >
              <MaterialIcons name="content-copy" size={17} color="#000" />
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#000', fontFamily: MONO }}>COPY ALL TO CLIPBOARD</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                borderWidth: 1.5, borderColor: '#FFC40055', borderRadius: 10, paddingVertical: 13,
                backgroundColor: '#FFC4000A' }}
              onPress={() => { handleShare(); setShowModal(false); }} activeOpacity={0.8}
            >
              <MaterialIcons name="share" size={15} color="#FFC400" />
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFC400', fontFamily: MONO }}>SHARE AS TEXT FILE</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}


// ─── UI CONFIG CARD — Download/edit/upload the visual config JSON ─────────────
// Edit card visibility, order, all text strings, colors.
// Zero credits needed — edit JSON in any text editor or AI, upload back.
function UIConfigCard() {
  const ACCENT = '#00FF88';
  const [saving,       setSaving]       = React.useState(false);
  const [resetting,    setResetting]    = React.useState(false);
  const [savedOk,      setSavedOk]      = React.useState(false);
  const [cardToggles,  setCardToggles]  = React.useState<Record<string, boolean>>({});
  const [showCards,    setShowCards]    = React.useState(false);

  React.useEffect(() => {
    uiConfig.load().then(cfg => {
      const toggles: Record<string, boolean> = {};
      cfg.home.cards.forEach(c => { toggles[c.id] = c.visible; });
      setCardToggles(toggles);
    });
  }, []);

  const CARD_LABELS: Record<string, string> = {
    hero:               'Hero Section (BUTLER AI logo + buttons)',
    connected_pc:       'Connected PC Card (CPU/RAM/Disk)',
    terminal_feed:      'Terminal Feed (live server logs)',
    crawlers_graph:     'Crawlers Graph',
    kb_graph:           'Knowledgebank Graph',
    scripts_graph:      'Scripts Graph',
    fileshare_clipboard:'File Share & Clipboard Card',
    sigma_net:          'Sigma-Net Crawler Card',
    smart_alerts:       'Smart Alerts Card',
    omega_loop:         'Omega Learning Loop',
    security_grid:      'Security Protocols Grid',
    kb_articles:        'KB Articles Feed',
    server_setup:       'Server Setup Section',
    quick_access:       'Quick Access Grid',
    recent_activity:    'Recent Activity',
  };

  const handleDownload = async () => {
    haptics.heavy(); setSaving(true);
    try {
      await uiConfig.load();
      const json    = uiConfig.toExportJson();
      const jsonStr = JSON.stringify({ _type: 'butler_ui_config', ...json }, null, 2);
      const dir     = FileSystem.documentDirectory + 'butler_exports/';
      const path    = dir + 'butler_ui_config_' + Date.now() + '.json';
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
      await FileSystem.writeAsStringAsync(path, jsonStr, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) { await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Butler AI — UI Config' }); }
      else { await ExpoClipboard.setStringAsync(jsonStr); Alert.alert('Copied!', 'UI Config JSON copied to clipboard.'); }
      setSavedOk(true); haptics.success();
      setTimeout(() => setSavedOk(false), 3000);
    } catch (e: any) { Alert.alert('Error', e?.message); haptics.warning(); }
    finally { setSaving(false); }
  };

  const handleReset = () => {
    Alert.alert('Reset UI Config', 'Restore all visual settings to default?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        haptics.heavy(); setResetting(true);
        await uiConfig.reset();
        const toggles: Record<string, boolean> = {};
        DEFAULT_UI_CONFIG.home.cards.forEach(c => { toggles[c.id] = c.visible; });
        setCardToggles(toggles);
        setResetting(false); haptics.success();
        Alert.alert('Reset', 'UI config restored to defaults.');
      }},
    ]);
  };

  const toggleCard = async (id: string, val: boolean) => {
    haptics.selection();
    setCardToggles(prev => ({ ...prev, [id]: val }));
    const cfg = uiConfig.get();
    const updatedCards = cfg.home.cards.map(c => c.id === id ? { ...c, visible: val } : c);
    await uiConfig.save({ home: { cards: updatedCards } });
  };

  return (
    <View style={[g.card, { borderColor: ACCENT + '60', borderWidth: 2 }]}>
      <View style={{ height: 2, backgroundColor: ACCENT, borderTopLeftRadius: 10, borderTopRightRadius: 10, marginHorizontal: -14, marginTop: -14, marginBottom: 14 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <View style={[g.iconBox, { borderColor: ACCENT, backgroundColor: ACCENT + '12' }]}>
          <MaterialIcons name="palette" size={22} color={ACCENT} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[g.cardTitle, { color: ACCENT, marginBottom: 0 }]}>UI VISUAL CONFIG</Text>
          <Text style={g.cardSub}>Edit any card, text or color — zero credits needed</Text>
        </View>
      </View>

      <View style={{ backgroundColor: N.panel, borderRadius: 10, borderWidth: 1, borderColor: ACCENT + '25', padding: 10, marginBottom: 12, gap: 5 }}>
        <Text style={{ fontSize: 8, fontWeight: '900', color: ACCENT, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 4 }}>WHAT THIS JSON CONTROLS</Text>
        {[['visibility', 'Show / hide any section on the homepage'],['swap-vert', 'Reorder sections (change "order" numbers)'],['text-fields', 'Every title, label, button, badge text'],['format-paint', 'All colors (primary, secondary, backgrounds)'],['lock-open', 'No credits — edit in Notepad or any AI']].map(([icon, txt]) => (
          <View key={txt} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7 }}>
            <MaterialIcons name={icon as any} size={11} color={ACCENT + '80'} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 10, color: N.textBrt, fontFamily: MONO, lineHeight: 15 }}>{txt}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={() => { haptics.light(); setShowCards(v => !v); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: showCards ? 10 : 0, borderWidth: 1, borderColor: ACCENT + '35', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: ACCENT + '07' }}
        activeOpacity={0.8}>
        <MaterialIcons name="view-module" size={14} color={ACCENT} />
        <Text style={{ flex: 1, fontSize: 10, fontWeight: '900', color: ACCENT, fontFamily: MONO, letterSpacing: 0.5 }}>QUICK CARD TOGGLES (no JSON needed)</Text>
        <MaterialIcons name={showCards ? 'expand-less' : 'expand-more'} size={16} color={ACCENT + '80'} />
      </TouchableOpacity>

      {showCards ? (
        <View style={{ backgroundColor: N.panel, borderRadius: 10, borderWidth: 1, borderColor: ACCENT + '22', overflow: 'hidden', marginBottom: 12 }}>
          {Object.keys(CARD_LABELS).map((id, i, arr) => (
            <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: '#1A1D24' }}>
              <Text style={{ flex: 1, fontSize: 10, color: cardToggles[id] !== false ? N.textBrt : N.textDim, fontFamily: MONO, lineHeight: 15 }} numberOfLines={1}>{CARD_LABELS[id]}</Text>
              <Switch value={cardToggles[id] !== false} onValueChange={val => toggleCard(id, val)} thumbColor={cardToggles[id] !== false ? ACCENT : N.textDim} trackColor={{ false: N.border, true: ACCENT + '55' }} ios_backgroundColor={N.border} />
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ backgroundColor: '#0A1A10', borderRadius: 9, borderWidth: 1, borderColor: ACCENT + '30', padding: 10, marginBottom: 12, gap: 5 }}>
        <Text style={{ fontSize: 8, fontWeight: '900', color: ACCENT, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 4 }}>WORKFLOW (ZERO CREDITS)</Text>
        {['1. Tap DOWNLOAD UI CONFIG — get a JSON file','2. Open in any text editor or send to ChatGPT/Claude','3. Use it as a reference of every card, text and color','4. Toggle cards on/off instantly with the switches above'].map((line, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 7 }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: ACCENT + '20', borderWidth: 1, borderColor: ACCENT + '50', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <Text style={{ fontSize: 8, fontWeight: '900', color: ACCENT, fontFamily: MONO }}>{i + 1}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 10, color: N.textBrt, fontFamily: MONO, lineHeight: 15 }}>{line}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 11, paddingVertical: 15, backgroundColor: saving ? ACCENT + 'AA' : ACCENT, marginBottom: 8, opacity: saving ? 0.75 : 1 }} onPress={handleDownload} disabled={saving} activeOpacity={0.85}>
        {saving ? <ActivityIndicator size="small" color="#000" /> : <MaterialIcons name="download" size={18} color="#000" />}
        <Text style={{ fontSize: 13, fontWeight: '900', color: '#000', fontFamily: MONO }}>{saving ? 'GENERATING...' : savedOk ? '✓ DOWNLOADED!' : 'DOWNLOAD UI CONFIG'}</Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.5, borderColor: N.red + '55', borderRadius: 10, paddingVertical: 12, backgroundColor: N.red + '08', opacity: resetting ? 0.65 : 1 }} onPress={handleReset} disabled={resetting} activeOpacity={0.8} testID="ui-config-reset-btn">
          {resetting ? <ActivityIndicator size="small" color={N.red} /> : <MaterialIcons name="restore" size={14} color={N.red} />}
          <Text style={{ fontSize: 9, fontWeight: '900', color: N.red, fontFamily: MONO }}>RESET TO DEFAULTS</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize: 8, color: N.text, fontFamily: MONO, textAlign: 'center', marginTop: 8, lineHeight: 13 }}>
        Reference export — strings, colors, card order, visibility — all in one file.
      </Text>
    </View>
  );
}


// ─── MAIN SCREEN ─────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { isCompactMode, setCompactMode, clearOmegaLog, signalOmegaLog } = useTabBar();
  const { T } = useCosmetic();
  const PR = T.primary || N.cyan;

  const [settings, setSettings] = useState<Settings>({
    autoRun: false, autoConnect: true, notifications: true,
    keepScreenOn: false, saveHistory: true, pauseAnimations: false,
    minimalMode: false, hapticsOff: false, largeText: false, scriptOnlyMode: false,
  });
  const [isConnected,      setIsConnected]      = useState(false);
  const [authDisabled,     setAuthDisabledState] = useState(false);
  const [resetPairLoading, setResetPairLoading] = useState(false);
  const [resetPairMsg,     setResetPairMsg]     = useState('');
  const [kbSeeded,         setKbSeeded]         = useState(false);
  const [kbSeeding,        setKbSeeding]        = useState(false);
  const [kbStats,          setKbStats]          = useState<{ totalFindings: number; storageUsed: number } | null>(null);
  const [nx,               setNx]               = useState<NexusBridgeSettings>({ relayEnabled: true, growthEnabled: true, localOnlyMode: false, cacheTTLMinutes: 5, maxRelayResults: 4, autoOrganize: true, enginePort: 8767 });
  const [nxStats,          setNxStats]          = useState<NexusStats | null>(null);
  const [nxConnected,      setNxConnected]      = useState(false);
  const [engineChecking,   setEngineChecking]   = useState(false);
  const [engineStatus,     setEngineStatus]     = useState<any>(null);
  const [growthRunning,    setGrowthRunning]    = useState(false);
  const [upgradeLog,       setUpgradeLog]       = useState<AutoUpgradeEntry[]>([]);
  const [exportingLog,     setExportingLog]     = useState(false);
  const [exportResult,     setExportResult]     = useState<{ visible: boolean; ok: boolean; applied?: string[]; entryCount?: number; error?: string; }>({ visible: false, ok: false });
  const [monitorReport,    setMonitorReport]    = useState<MonitorReport | null>(null);
  const [qlhStats,         setQlhStats]         = useState<QLHStats | null>(null);

  useEffect(() => {
    loadAll();
    loadAuthDisabled().then(() => setAuthDisabledState(isAuthDisabled()));
    registerOmegaSignal((result) => { signalOmegaLog(result); });
    clearOmegaLog();
    const unsubMonitor = autoUpgradeMonitor.onReport(r => setMonitorReport(r));
    const unsubQLH     = quantumLinkHarvester.onStats(s => setQlhStats(s));
    setQlhStats(quantumLinkHarvester.getStats());
    setMonitorReport(autoUpgradeMonitor.getLastReport());
    const id = setInterval(checkEngine, 60_000);
    return () => { clearInterval(id); unregisterOmegaSignal(); unsubMonitor(); unsubQLH(); };
  }, []);

  useEffect(() => {
    const seed = autoConnectEngine.getCurrentConnection();
    setIsConnected(seed.connected);
    const unsub = autoConnectEngine.onEvent((evt) => {
      setIsConnected(evt.status === 'connected');
    });
    return () => unsub();
  }, []);

  const loadAll = async () => {
    await Promise.all([loadSettings(), loadKbStats(), loadNexusSettings(), loadNexusStats(), checkEngine(), loadUpgradeLog()]);
    // Auto-seed KB silently if empty — no user interaction needed
    const kbStatsNow = await knowledgeAccumulator.getStats();
    if (kbStatsNow.totalFindings === 0) {
      try {
        // Always seed when empty — ignore isSeedDone flag so clearing KB re-seeds correctly
        const already = false; // kbStatsNow.totalFindings === 0 is the canonical check
        if (!already) {
          for (const script of PYTHON_AUTOMATION_SCRIPTS) {
            const text = script.title + '\n' + script.description + '\nCategory: ' + script.category + '\nTags: ' + script.tags.join(', ') + '\n\n' + script.script;
            const compressed = knowledgeAccumulator.compressResearch(text, script.category, script.title, 'auto_seed');
            knowledgeAccumulator.addFindingDeduped(compressed);
          }
          await knowledgeAccumulator.saveNow();
          await knowledgeAccumulator.markSeedDone();
          await loadKbStats();
          setKbSeeded(true);
        }
      } catch {}
    }
  };

  const loadSettings = async () => {
    try {
      const keys   = Object.values(STORAGE_KEYS);
      const values = await AsyncStorage.multiGet(keys);
      const get = (k: string, def = false) => {
        const v = values.find(([key]) => key === k)?.[1];
        return v === null || v === undefined ? def : v === 'true';
      };
      setSettings({
        autoRun:         get(STORAGE_KEYS.AUTO_RUN),
        autoConnect:     get(STORAGE_KEYS.AUTO_CONNECT, true),
        notifications:   get(STORAGE_KEYS.NOTIFICATIONS, true),
        keepScreenOn:    get(STORAGE_KEYS.KEEP_SCREEN_ON),
        saveHistory:     get(STORAGE_KEYS.SAVE_HISTORY, true),
        pauseAnimations: get(STORAGE_KEYS.PAUSE_ANIMATIONS),
        minimalMode:     get(STORAGE_KEYS.MINIMAL_MODE),
        hapticsOff:      get(STORAGE_KEYS.HAPTICS_OFF),
        largeText:       get(STORAGE_KEYS.LARGE_TEXT),
        scriptOnlyMode:  get(STORAGE_KEYS.SCRIPT_ONLY_MODE),
      });
    } catch {}
  };

  const saveSetting = async (key: string, value: boolean) => {
    try { await AsyncStorage.setItem(key, String(value)); } catch {}
  };

  const toggleSetting = (settingKey: keyof Settings, storageKey: string) => {
    const v = !settings[settingKey];
    setSettings(prev => ({ ...prev, [settingKey]: v }));
    saveSetting(storageKey, v);
  };

  const loadUpgradeLog    = async () => { const log = await knowledgeGrowthEngine.getUpgradeLog(); setUpgradeLog(log.slice(0, 20)); };
  const loadNexusSettings = async () => { const s = await nexusBridgeSettings.load(); setNx(s); };
  const loadNexusStats    = async () => { const st = await nexusBridge.loadStats(); setNxStats(st as NexusStats); };
  const saveNx = async (partial: Partial<NexusBridgeSettings>) => { const updated = await nexusBridgeSettings.save(partial); setNx(updated); };

  const checkEngine = async () => {
    setEngineChecking(true);
    try {
      const ip   = serverConnection.getIP();
      const port = nx.enginePort || 8767;
      if (!ip) { setNxConnected(false); return; }
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(`http://${ip}:${port}/status`, { signal: ctrl.signal });
      if (res.ok) { setNxConnected(true); setEngineStatus(await res.json()); }
      else setNxConnected(false);
    } catch { setNxConnected(false); }
    finally { setEngineChecking(false); }
  };

  const runGrowthCycle = async () => {
    if (growthRunning) return;
    haptics.medium(); setGrowthRunning(true);
    try {
      const result = await knowledgeGrowthEngine.runGrowthCycle(true);
      haptics.success();
      Alert.alert('OMEGA-LOOP Complete', 'Added ' + result.added + ' new findings in ' + result.events.length + ' events.');
    } finally { setGrowthRunning(false); await loadKbStats(); }
  };

  const exportLogToServer = async () => {
    if (exportingLog) return;
    if (upgradeLog.length === 0) { Alert.alert('No Log', 'Run FORCE OMEGA first.'); return; }
    haptics.medium(); setExportingLog(true);
    try {
      const result = await knowledgeGrowthEngine.exportLogToServer();
      setExportResult({ visible: true, ...result });
      if (result.ok) { haptics.success(); await loadUpgradeLog(); }
      else haptics.warning();
    } catch (e: any) { setExportResult({ visible: true, ok: false, error: e?.message }); haptics.warning(); }
    finally { setExportingLog(false); }
  };

  const loadKbStats = async () => {
    const stats = await knowledgeAccumulator.getStats();
    setKbStats({ totalFindings: stats.totalFindings, storageUsed: stats.storageUsed });
    setKbSeeded(stats.totalFindings > 0);
  };

  const seedPythonKB = async () => {
    const already = await knowledgeAccumulator.isSeedDone();
    if (already && kbStats && kbStats.totalFindings >= PYTHON_AUTOMATION_SCRIPTS.length) {
      Alert.alert('Already Seeded', kbStats.totalFindings + ' findings already in KB.'); return;
    }
    setKbSeeding(true); haptics.medium();
    try {
      const existingFps = await knowledgeAccumulator.loadPersistedFingerprints();
      let added = 0;
      for (const script of PYTHON_AUTOMATION_SCRIPTS) {
        const text = script.title + '\n' + script.description + '\nCategory: ' + script.category + '\nTags: ' + script.tags.join(', ') + '\n\n' + script.script;
        const compressed = knowledgeAccumulator.compressResearch(text, script.category, script.title, 'manual_seed');
        const fp = compressed.domain.toLowerCase() + '::' + compressed.topic.toLowerCase() + '::' + (compressed.summary || '').slice(0, 32).toLowerCase();
        if (!existingFps.has(fp) && knowledgeAccumulator.addFindingDeduped(compressed)) added++;
      }
      if (added > 0) {
        await knowledgeAccumulator.saveNow();
        await knowledgeAccumulator.markSeedDone();
        await loadKbStats();
        setKbSeeded(true); haptics.success();
        Alert.alert('Python KB Seeded', 'Added ' + added + ' new scripts.');
      } else {
        await knowledgeAccumulator.markSeedDone();
        haptics.success();
        Alert.alert('Up To Date', 'All Python scripts already in KB.');
      }
    } catch (e: any) { Alert.alert('Seed failed', e?.message); }
    finally { setKbSeeding(false); }
  };

  const clearKB = () => {
    Alert.alert('Clear Knowledge Base', 'Delete all stored knowledge?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { haptics.heavy(); await knowledgeAccumulator.clearAll(); await loadKbStats(); setKbSeeded(false); } },
    ]);
  };

  const exportKB = async () => {
    haptics.medium();
    try {
      const raw  = await AsyncStorage.getItem('@botler_auto_saved_research');
      const raw2 = await AsyncStorage.getItem('butler_kb_v4');
      const exportData = { exportedAt: new Date().toISOString(), kbFindings: raw ? JSON.parse(raw) : {}, kbSessions: raw2 ? JSON.parse(raw2) : [] };
      const json = JSON.stringify(exportData, null, 2);
      const kbPath = (FileSystem.documentDirectory || '') + 'kb_export_' + Date.now() + '.json';
      await FileSystem.writeAsStringAsync(kbPath, json);
      const sharingOk = await Sharing.isAvailableAsync();
      if (sharingOk) await Sharing.shareAsync(kbPath, { mimeType: 'application/json', dialogTitle: 'Export KB' });
      else Alert.alert('KB Exported', 'Saved to: ' + kbPath);
    } catch (e: any) { Alert.alert('Export Failed', e?.message); }
  };

  return (
    <KeyboardAvoidingView style={[g.root, { backgroundColor: T.bg || N.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 160 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={g.scrollPad}>

        {/* ── ONBOARDING SKIP CONTROL — prominent, below top ── */}
        <View style={[g.card, { borderColor: N.cyan + '55', borderWidth: 2 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={[g.iconBox, { borderColor: N.cyan, backgroundColor: N.cyan + '12' }]}>
              <MaterialIcons name="tour" size={20} color={N.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[g.cardTitle, { color: N.cyan, marginBottom: 0 }]}>ONBOARDING SCREENS</Text>
              <Text style={g.cardSub}>Control whether the setup guide appears on launch</Text>
            </View>
          </View>
          <ShowWelcomeToggle />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <TouchableOpacity
              style={[g.actionBtn, { flex: 1, borderColor: N.cyan + '55', backgroundColor: N.cyan + '0A' }]}
              onPress={() => {
                haptics.medium();
                Alert.alert(
                  'Reset All Consents?',
                  'This will clear all your saved agreements and re-show the onboarding flow immediately.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: () => {
                        AsyncStorage.multiRemove([
                          '@butler_consent_v2',
                          '@butler_lan_consent_v1',
                          '@butler_onboarding_done_v2',
                          '@butler_terms_accepted_v1',
                          '@butler_privacy_accepted_v1',
                          '@butler_age_confirmed_v1',
                          '@butler_remote_exec_consent_v1',
                          '@butler_camera_consent_v1',
                          '@butler_welcome_complete_v1',
                          '@butler_server_privacy_accepted_v1',
                          '@butler_show_post_onboarding_chat',
                          '@butler_stable_state',
                        ]).then(() => {
                          haptics.success();
                          // Onboarding is a tab route — navigate directly.
                          try {
                            router.push('/' as any);
                          } catch {
                            Alert.alert('Reset Complete', 'Restart the app to view the onboarding flow.');
                          }
                        }).catch(() => {});
                      },
                    },
                  ]
                );
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="refresh" size={14} color={N.cyan} />
              <Text style={[g.actionTxt, { color: N.cyan }]}>RESET ALL CONSENTS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[g.actionBtn, { flex: 1, borderColor: N.green + '55', backgroundColor: N.green + '0A' }]}
              onPress={() => {
                haptics.light();
                // Clear gate keys then navigate to /onboarding route.
                AsyncStorage.multiRemove([
                  '@butler_onboarding_done_v2',
                  '@butler_welcome_complete_v1',
                  '@butler_stable_state',
                ]).finally(() => {
                  router.push('/' as any);
                });
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="play-arrow" size={14} color={N.green} />
              <Text style={[g.actionTxt, { color: N.green }]}>VIEW ONBOARDING</Text>
            </TouchableOpacity>
          </View>
          <View style={[g.infoBanner, { borderColor: N.cyan + '25', backgroundColor: N.cyan + '06', marginTop: 10 }]}>
            <MaterialIcons name="info-outline" size={13} color={N.cyan + '80'} />
            <Text style={[g.infoBannerTxt, { color: N.cyan + '80' }]}>
              Previously accepted agreements are saved permanently and shown as green locks in the onboarding. They never need to be re-accepted unless you reset consents above.
            </Text>
          </View>
        </View>

        {/* ── PLAY STORE COMPLIANCE — moved to top for Google reviewers ── */}
        <View style={[g.card, { borderColor: N.green + '55', borderWidth: 2, borderTopColor: N.green, borderTopWidth: 3 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <View style={[g.iconBox, { borderColor: N.green, backgroundColor: N.green + '12' }]}>
              <MaterialIcons name="verified-user" size={20} color={N.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[g.cardTitle, { color: N.green, marginBottom: 0 }]}>PLAY STORE COMPLIANCE</Text>
              <Text style={g.cardSub}>Privacy · Security · Google Play Policy — all checks pass</Text>
            </View>
            <View style={{ borderWidth: 1, borderColor: N.green + '55', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: N.green + '10' }}>
              <Text style={{ fontSize: 8, fontWeight: '900', color: N.green, fontFamily: MONO, letterSpacing: 0.5 }}>✓ COMPLIANT</Text>
            </View>
          </View>
          <ShowWelcomeToggle />
          {([
            { icon: 'home' as any,       col: N.green, title: 'Self-Hosted Only',       desc: 'Commands run ONLY on your own PC — no third-party cloud.' },
            { icon: 'lock' as any,       col: N.blue,  title: 'AES-256 + HMAC-SHA256',  desc: 'Every request signed. Auto-locks on timeout. Pair code required.' },
            { icon: 'block' as any,      col: N.green, title: 'Zero Data Collection',   desc: 'No analytics, no telemetry, no tracking of any kind.' },
            { icon: 'camera-alt' as any, col: N.amber, title: 'Camera: QR Scan Only',   desc: 'One-shot pairing — no images stored or transmitted.' },
            { icon: 'wifi' as any,       col: N.cyan,  title: 'LAN Scan: One-Time',     desc: 'Consent shown before first scan. Scans your subnet only.' },
          ] as { icon: any; col: string; title: string; desc: string }[]).map(({ icon, col, title, desc }) => (
            <View key={title} style={[sc.row, { gap: 10 }]}>
              <MaterialIcons name={icon} size={15} color={col} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: col, fontFamily: MONO }}>{title}</Text>
                <Text style={sc.rowSub}>{desc}</Text>
              </View>
            </View>
          ))}
          <View style={{ marginTop: 10, gap: 3 }}>
            <Text style={[g.cardTitle, { marginBottom: 6, fontSize: 9 }]}>LEGAL DOCUMENTS</Text>
            {([
              { icon: 'verified-user' as any, col: N.green, label: 'Privacy Audit · Live', onPress: () => { try { router.push('/privacy-audit' as any); } catch {} } },
              { icon: 'shield' as any,      col: N.green,  label: 'Data Safety Declaration', onPress: () => { try { router.push('/data-safety' as any); } catch { Linking.openURL('https://shawnjan-cmd.github.io/privacy-policy-/'); } } },
              { icon: 'privacy-tip' as any, col: N.green,  label: 'Privacy Policy',           onPress: () => { try { router.push('/privacy-policy' as any); } catch { Linking.openURL('https://shawnjan-cmd.github.io/privacy-policy-/'); } } },
              { icon: 'gavel' as any,       col: N.amber,  label: 'Terms of Service',         onPress: () => { try { router.push('/terms' as any); } catch { Linking.openURL('https://shawnjan-cmd.github.io/privacy-policy-/'); } } },
              { icon: 'email' as any,       col: N.cyan,   label: 'Contact Support',           onPress: () => Linking.openURL('mailto:andrejsladkovic1992@gmail.com') },
            ] as { icon: any; col: string; label: string; onPress: () => void }[]).map(({ icon, col, label, onPress }) => (
              <TouchableOpacity key={label} style={sc.row} onPress={onPress} activeOpacity={0.82}>
                <MaterialIcons name={icon} size={15} color={col} />
                <Text style={[sc.rowTitle, { color: col, flex: 1, fontSize: 11 }]}>{label}</Text>
                <MaterialIcons name="chevron-right" size={15} color={N.text} />
              </TouchableOpacity>
            ))}
            <CopyPolicyRow />
          </View>
        </View>

        {/* ── PERSONAL FILES & ACCOUNT — required 3 taps from main screen ── */}
        <View style={[g.card, { backgroundColor: N.card, borderColor: C_BLUE + '55', borderWidth: 2 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={[g.iconBox, { borderColor: C_BLUE, backgroundColor: C_BLUE + '12' }]}>
              <MaterialIcons name="folder-special" size={20} color={C_BLUE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[g.cardTitle, { color: C_BLUE, marginBottom: 0 }]}>PERSONAL FILES & ACCOUNT</Text>
              <Text style={g.cardSub}>Export data · Privacy rights · Delete account (Play Store required)</Text>
            </View>
          </View>
          <TouchableOpacity style={sc.row} onPress={exportKB} activeOpacity={0.82}>
            <MaterialIcons name="file-download" size={20} color={N.cyan} />
            <View style={{ flex: 1 }}><Text style={sc.rowTitle}>Export My Knowledge Base</Text><Text style={sc.rowSub}>{(kbStats?.totalFindings ?? 0) + ' findings — JSON to device'}</Text></View>
            <MaterialIcons name="chevron-right" size={16} color={N.text} />
          </TouchableOpacity>
          <TouchableOpacity style={sc.row} onPress={async () => {
            haptics.medium();
            try { const { Share } = require('react-native'); await Share.share({ message: 'Butler AI Usage Summary\n\nKB Findings: ' + (kbStats?.totalFindings ?? 0) + '\nAll data stays on your device — no cloud.', title: 'Butler AI Data Export' }); } catch {}
          }} activeOpacity={0.82}>
            <MaterialIcons name="share" size={20} color={N.blue} />
            <View style={{ flex: 1 }}><Text style={sc.rowTitle}>Share Usage Summary</Text><Text style={sc.rowSub}>No sensitive content — summary only</Text></View>
            <MaterialIcons name="chevron-right" size={16} color={N.text} />
          </TouchableOpacity>
          <TouchableOpacity style={sc.row} onPress={() => { haptics.light(); router.push('/privacy-policy' as any); }} activeOpacity={0.82}>
            <MaterialIcons name="privacy-tip" size={20} color={N.green} />
            <View style={{ flex: 1 }}><Text style={sc.rowTitle}>Privacy Policy</Text><Text style={sc.rowSub}>What we collect, how we protect it, your rights</Text></View>
            <MaterialIcons name="chevron-right" size={16} color={N.text} />
          </TouchableOpacity>
          <TouchableOpacity style={sc.row} onPress={() => { haptics.light(); router.push('/data-safety' as any); }} activeOpacity={0.82}>
            <MaterialIcons name="shield" size={20} color={N.cyan} />
            <View style={{ flex: 1 }}><Text style={sc.rowTitle}>Data Safety Declaration</Text><Text style={sc.rowSub}>Exact Play Store data disclosure</Text></View>
            <MaterialIcons name="chevron-right" size={16} color={N.text} />
          </TouchableOpacity>
          <TouchableOpacity style={sc.row} onPress={() => {
            Alert.alert('Reset Consents', 'Show the welcome & consent screens again on next launch?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', onPress: async () => {
                haptics.medium();
                await AsyncStorage.multiRemove(['@butler_consent_v2', '@butler_lan_consent_v1', '@butler_onboarding_done_v2']);
                haptics.success();
                Alert.alert('Done', 'Consents reset. Restart the app to see the welcome screen.');
              }},
            ]);
          }} activeOpacity={0.82}>
            <MaterialIcons name="fact-check" size={20} color={N.amber} />
            <View style={{ flex: 1 }}><Text style={sc.rowTitle}>Review / Reset Consents</Text><Text style={sc.rowSub}>Re-read remote-execution and LAN-scan disclosures</Text></View>
            <MaterialIcons name="chevron-right" size={16} color={N.text} />
          </TouchableOpacity>
          {/* Delete account — Google Play requires this since 2024 */}
          <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: N.border, marginTop: 4, gap: 8 }}>
            <Text style={[g.cardTitle, { color: N.red, marginBottom: 2, fontSize: 10 }]}>DELETE ALL MY DATA / ACCOUNT DELETION</Text>
            <Text style={sc.rowSub}>{'Google Play requires this. Permanently erases from this device: pair secret, device UUID, all settings, knowledge base entries, and execution history. Your PC server software is NOT affected — remove it separately.'}</Text>
            <TouchableOpacity
              style={[g.btn, { backgroundColor: N.red + 'CC', borderWidth: 1, borderColor: N.red }]}
              onPress={() => Alert.alert('⚠ Delete Everything?', 'Permanently erases all local data. You will need to re-pair with your PC. Cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'DELETE EVERYTHING', style: 'destructive', onPress: async () => {
                  haptics.heavy();
                  try {
                    const keys = ['commandcube_server_ip','commandcube_server_port','commandcube_session_token','commandcube_alien_403','@botler_exec_history','boter_exec_counts_v1','@botler_auto_saved_research','butler_kb_v4','@butler_consent_v2','@butler_lan_consent_v1','@butler_onboarding_done_v2','@nexus_first_launch_v1','@butler_welcome_complete_v1','commandcube_device_id','commandcube_autorun','commandcube_autoconnect','commandcube_notifications','commandcube_keep_screen_on','commandcube_save_history','commandcube_pause_animations','commandcube_minimal_mode','commandcube_haptics_off','commandcube_large_text','commandcube_script_only_mode','@kb_growth_log_v1','@kb_growth_topics_v1','@kb_growth_last_run_v2','@kb_auto_upgrade_log_v1','@kb_domain_coverage_v1','@butler_conv_nexus_v1','@butler_ai_disclosure_v1','@butler_user_avatar_v1','@butler_ai_avatar_v1'];
                    await AsyncStorage.multiRemove(keys);
                    await deviceIdentifier.clearDeviceId();
                    await knowledgeAccumulator.clearAll();
                    haptics.success();
                    Alert.alert('✓ All Data Deleted', 'All locally stored data permanently deleted. Restart the app.');
                  } catch (e: any) { Alert.alert('Error', e?.message || 'Could not fully clear data.'); }
                }},
              ])}
              activeOpacity={0.82}
            >
              <MaterialIcons name="delete-forever" size={14} color="#000" />
              <Text style={[g.btnTxt, { color: '#000' }]}>DELETE ALL MY DATA</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 }} onPress={() => Linking.openURL('https://shawnjan-cmd.github.io/privacy-policy-/').catch(() => {})} activeOpacity={0.8}>
              <MaterialIcons name="open-in-browser" size={13} color={N.blue} />
              <Text style={{ fontSize: 10, color: N.blue, fontFamily: MONO, fontWeight: '700' }}>Account Deletion / Web deletion form →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 }} onPress={() => Linking.openURL('mailto:andrejsladkovic1992@gmail.com?subject=Butler%20AI%20Account%20Deletion').catch(() => {})} activeOpacity={0.8}>
              <MaterialIcons name="email" size={13} color={N.textBrt} />
              <Text style={{ fontSize: 10, color: N.textBrt, fontFamily: MONO }}>Email deletion request → andrejsladkovic1992@gmail.com</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SERVER ADDRESS (tap-to-edit) ── */}
        {/* ── SCRIPT ONLY MODE ── */}
        <View style={[g.card, { backgroundColor: T.panel || N.card, borderColor: settings.scriptOnlyMode ? N.green : PR + '55', borderWidth: 2 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={[g.iconBox, { borderColor: settings.scriptOnlyMode ? N.green : PR, backgroundColor: (settings.scriptOnlyMode ? N.green : PR) + '12' }]}>
              <MaterialCommunityIcons name="code-braces" size={20} color={settings.scriptOnlyMode ? N.green : PR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[g.cardTitle, { color: settings.scriptOnlyMode ? N.green : PR, marginBottom: 0 }]}>SCRIPT ONLY MODE</Text>
              <Text style={g.cardSub}>{settings.scriptOnlyMode ? 'ACTIVE — Only Home + Scripts visible' : 'Show only Home and Scripts — hide AI, KB, Terminal'}</Text>
            </View>
            <TouchableOpacity
              style={[sc.toggle, settings.scriptOnlyMode && { ...sc.toggleOn, borderColor: N.green, backgroundColor: N.green + '25' }]}
              onPress={() => {
                haptics.medium();
                const next = !settings.scriptOnlyMode;
                setSettings(prev => ({ ...prev, scriptOnlyMode: next }));
                saveSetting(STORAGE_KEYS.SCRIPT_ONLY_MODE, next);
                (global as any).__butlerScriptOnlyModeChanged?.(next);
              }}
              activeOpacity={0.85}
            >
              <View style={[sc.thumb, settings.scriptOnlyMode && { ...sc.thumbOn, backgroundColor: N.green }]} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[g.modeCol, { borderColor: N.green + '35', backgroundColor: N.green + '06' }]}>
              <Text style={[g.modeHdr, { color: N.green }]}>ALWAYS SHOWN</Text>
              {[['cpu-64-bit','Home'],['code-braces','Scripts'],['tune-variant','Settings']].map(([ic,lb]) => (
                <View key={lb as string} style={g.modeRow}>
                  <MaterialCommunityIcons name={ic as any} size={10} color={N.green} />
                  <Text style={[g.modeTxt, { color: N.green }]}>{lb}</Text>
                </View>
              ))}
            </View>
            <View style={[g.modeCol, { borderColor: settings.scriptOnlyMode ? '#FF444435' : N.cyan + '25', backgroundColor: settings.scriptOnlyMode ? '#FF000006' : N.cyan + '06' }]}>
              <Text style={[g.modeHdr, { color: settings.scriptOnlyMode ? '#FF4444' : N.cyan }]}>{settings.scriptOnlyMode ? 'HIDDEN' : 'FULL MODE'}</Text>
              {[['robot-angry','Butler AI'],['head-cog-outline','Knowledge'],['folder-sync','File Share'],['console-line','Terminal']].map(([ic,lb]) => (
                <View key={lb as string} style={g.modeRow}>
                  <MaterialCommunityIcons name={ic as any} size={10} color={settings.scriptOnlyMode ? '#FF444466' : N.cyan + 'AA'} />
                  <Text style={[g.modeTxt, { color: settings.scriptOnlyMode ? '#FF444466' : N.cyan + 'AA', textDecorationLine: settings.scriptOnlyMode ? 'line-through' : 'none' }]}>{lb}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── PERFORMANCE ── */}
        <View style={[g.card, { backgroundColor: T.panel || N.card, borderColor: N.amber + '60', borderWidth: 2 }]}>
          <SectionHeader title="PERFORMANCE MODE" color={N.amber} icon="speed" />
          <ToggleRow icon="animation" iconColor={N.amber} title="Pause All Animations" subtitle="Stops glow loops — saves CPU on slow phones" value={settings.pauseAnimations} onToggle={() => toggleSetting('pauseAnimations', STORAGE_KEYS.PAUSE_ANIMATIONS)} />
          <ToggleRow icon="battery-saver" iconColor={N.red} title="Bare Minimum Mode" subtitle="Disables HUD effects — max performance" value={settings.minimalMode} onToggle={() => toggleSetting('minimalMode', STORAGE_KEYS.MINIMAL_MODE)} danger />
          <ToggleRow icon="vibration" iconColor={N.textBrt} title="Disable Haptics" subtitle="Turn off vibration feedback" value={settings.hapticsOff} onToggle={() => toggleSetting('hapticsOff', STORAGE_KEYS.HAPTICS_OFF)} />
          <View style={[sc.row, { borderBottomWidth: 0 }]}>
            <MaterialIcons name="view-compact" size={20} color={N.amber} />
            <View style={{ flex: 1 }}>
              <Text style={sc.rowTitle}>Compact Tab Bar</Text>
              <Text style={sc.rowSub}>{isCompactMode ? 'Icon-only (saves height)' : 'Icon + label (larger touch targets)'}</Text>
            </View>
            <Switch value={isCompactMode} onValueChange={v => { haptics.selection(); setCompactMode(v); }}
              trackColor={{ false: N.border, true: N.cyan + '55' }} thumbColor={isCompactMode ? N.cyan : N.textBrt} />
          </View>
        </View>

        {/* ── CONNECTION & BEHAVIOR ── */}
        <View style={[g.card, { backgroundColor: T.panel || N.card }]}>
          <SectionHeader title="CONNECTION AND BEHAVIOR" color={PR} icon="wifi" />
          <ToggleRow icon="wifi" iconColor={N.cyan} title="Auto-connect on startup" subtitle="Connect to last server when app opens" value={settings.autoConnect} onToggle={() => toggleSetting('autoConnect', STORAGE_KEYS.AUTO_CONNECT)} />
          <ToggleRow icon="play-arrow" iconColor={N.cyan} title="Auto-run on startup" subtitle="Execute saved script when connected" value={settings.autoRun} onToggle={() => toggleSetting('autoRun', STORAGE_KEYS.AUTO_RUN)} />
          <ToggleRow icon="notifications" iconColor={N.cyan} title="Notifications" subtitle="Show execution result alerts" value={settings.notifications} onToggle={() => toggleSetting('notifications', STORAGE_KEYS.NOTIFICATIONS)} />
          <ToggleRow icon="phonelink" iconColor={N.cyan} title="Keep screen on" subtitle="Prevent screen timeout while app is open" value={settings.keepScreenOn} onToggle={() => toggleSetting('keepScreenOn', STORAGE_KEYS.KEEP_SCREEN_ON)} />
          <ToggleRow icon="history" iconColor={N.cyan} title="Save execution history" subtitle="Remember recently executed commands" value={settings.saveHistory} onToggle={() => toggleSetting('saveHistory', STORAGE_KEYS.SAVE_HISTORY)} />
          <ToggleRow
            icon="no-encryption"
            iconColor={authDisabled ? N.amber : N.textBrt}
            title="Disable Auth Header"
            subtitle={authDisabled ? 'Security OFF — requests without Bearer token (dev mode)' : 'Security ON — Bearer token sent with every request (default)'}
            value={authDisabled}
            onToggle={async () => {
              haptics.heavy();
              const next = !authDisabled;
              if (next) {
                Alert.alert('Disable Auth?', 'This removes the Bearer token from all server requests.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Disable Auth', style: 'destructive', onPress: async () => {
                      await setAuthDisabled(true);
                      setAuthDisabledState(true);
                      haptics.warning();
                    }},
                  ]
                );
              } else {
                await setAuthDisabled(false);
                setAuthDisabledState(false);
                haptics.success();
              }
            }}
            danger={authDisabled}
          />
          {/* Reset Pairing */}
          <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: N.border, marginTop: 4, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <MaterialIcons name="link-off" size={18} color={N.red} />
              <View style={{ flex: 1 }}>
                <Text style={[g.cardTitle, { color: N.red, marginBottom: 2 }]}>Reset Device Pairing</Text>
                <Text style={sc.rowSub}>Clears device ID and unlocks server — use when you see "locked to another device"</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[g.btn, { backgroundColor: N.red, opacity: resetPairLoading ? 0.55 : 1 }]}
              disabled={resetPairLoading}
              onPress={async () => {
                haptics.heavy(); setResetPairMsg(''); setResetPairLoading(true);
                try {
                  await deviceIdentifier.clearDeviceId();
                  const ip   = serverConnection.getIP()   || await AsyncStorage.getItem('commandcube_server_ip').catch(() => null) || '';
                  const port = serverConnection.getPort() || await AsyncStorage.getItem('commandcube_server_port').catch(() => null) || '';
                  if (ip) {
                    try {
                      const ctrl = new AbortController();
                      setTimeout(() => ctrl.abort(), 5000);
                      await fetch('http://' + ip + ':' + port + '/api/reset_pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}), signal: ctrl.signal });
                    } catch {}
                  }
                  await AsyncStorage.setItem('commandcube_alien_403', '0').catch(() => {});
                  setResetPairMsg('Done — device ID cleared.');
                  haptics.success();
                  setTimeout(() => { (global as any).__butlerSwitchTab?.('home'); }, 600);
                } catch (e: any) { setResetPairMsg('Error: ' + (e?.message || 'Reset failed')); haptics.warning(); }
                finally { setResetPairLoading(false); }
              }}
              activeOpacity={0.82}
            >
              {resetPairLoading ? <ActivityIndicator size="small" color="#000" /> : <MaterialIcons name="qr-code-scanner" size={14} color="#000" />}
              <Text style={g.btnTxt}>{resetPairLoading ? 'RESETTING...' : 'RESET AND OPEN QR SCANNER'}</Text>
            </TouchableOpacity>
            {resetPairMsg ? (
              <Text style={{ fontSize: 10, color: resetPairMsg.startsWith('Error') ? N.red : N.green, fontFamily: MONO }}>{resetPairMsg}</Text>
            ) : null}
          </View>
        </View>

        {/* ── OLLAMA LOCAL AI ── */}
        <View style={[g.card, { backgroundColor: T.panel || N.card }]}>
          <SectionHeader title="OLLAMA LOCAL AI ENGINE" color={PR} icon="smart-toy" />
          <OllamaPanel />
        </View>

        {/* ── PC POWER CONTROLS — gated by server feature flag ── */}
        {features.has('power') ? (
          <PowerControlsCard isConnected={isConnected} />
        ) : null}

        {/* ── KNOWLEDGE BASE ── */}
        <View style={[g.card, { backgroundColor: T.panel || N.card }]}>
          <SectionHeader title="BUTLER AI KNOWLEDGE BASE" color={PR} icon="psychology" />
          <View style={[g.infoBanner, { borderColor: (kbSeeded ? N.green : N.amber) + '50', backgroundColor: (kbSeeded ? N.green : N.amber) + '08', marginBottom: 10 }]}>
            <MaterialIcons name={kbSeeded ? 'psychology' : 'psychology-alt'} size={14} color={kbSeeded ? N.green : N.amber} />
            <View style={{ flex: 1 }}>
              <Text style={[g.infoBannerTxt, { color: kbSeeded ? N.green : N.amber }]}>{kbSeeded ? 'PYTHON KB ACTIVE' : 'PYTHON KB EMPTY'}</Text>
              {kbStats ? <Text style={{ fontSize: 8, color: N.text, fontFamily: MONO }}>{kbStats.totalFindings + ' findings — ' + (kbStats.storageUsed / 1024).toFixed(0) + 'KB'}</Text> : null}
            </View>
          </View>
          <Text style={{ fontSize: 10, color: N.text, fontFamily: MONO, lineHeight: 15, marginBottom: 10 }}>
            {(kbStats?.totalFindings ?? 0) + ' findings stored (' + ((kbStats?.storageUsed ?? 0) / 1024).toFixed(0) + 'KB). Butler AI checks the KB before every query.'}
          </Text>
          {kbSeeding ? (
            <View style={[g.btn, { backgroundColor: N.green + '08', borderWidth: 1, borderColor: N.green + '40', marginBottom: 8 }]}>
              <ActivityIndicator size="small" color={N.green} />
              <Text style={[g.btnTxt, { color: N.green + 'AA', fontSize: 10 }]}>Seeding knowledge base...</Text>
            </View>
          ) : null}
          {kbStats && kbStats.totalFindings > 0 ? (
            <>
              <TouchableOpacity style={sc.row} onPress={exportKB}>
                <MaterialIcons name="file-download" size={20} color={N.cyan} />
                <View style={{ flex: 1 }}><Text style={[sc.rowTitle, { color: N.cyan }]}>Export Knowledge Base</Text><Text style={sc.rowSub}>{kbStats.totalFindings + ' findings — ' + (kbStats.storageUsed / 1024).toFixed(0) + 'KB — JSON'}</Text></View>
                <MaterialIcons name="chevron-right" size={16} color={N.text} />
              </TouchableOpacity>
              <TouchableOpacity style={[sc.row, { borderBottomWidth: 0 }]} onPress={clearKB}>
                <MaterialIcons name="delete-sweep" size={20} color={N.red} />
                <View style={{ flex: 1 }}><Text style={[sc.rowTitle, { color: N.red }]}>Clear Knowledge Base</Text><Text style={sc.rowSub}>{kbStats.totalFindings + ' findings'}</Text></View>
                <MaterialIcons name="chevron-right" size={16} color={N.text} />
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        {/* ── OMEGA SCANNER — FULL FEATURED ── */}
        <OmegaScannerCard
          monitorReport={monitorReport}
          setMonitorReport={setMonitorReport}
        />

        {/* ── DATA AND STORAGE ── */}
        <View style={[g.card, { backgroundColor: T.panel || N.card }]}>
          <SectionHeader title="DATA AND STORAGE" color={PR} icon="storage" />
          <TouchableOpacity style={[sc.row, { borderBottomWidth: 0 }]} onPress={() => {
            Alert.alert('Clear All App Data', 'Reset connection settings, execution history, and cached data?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: async () => {
                haptics.heavy();
                await AsyncStorage.multiRemove(['commandcube_server_ip','commandcube_server_port','commandcube_session_token','commandcube_alien_403','@botler_exec_history','boter_exec_counts_v1','@botler_auto_crawler_state','@botler_quick_slots_v1','@botler_quick_slots_v3']);
                Alert.alert('Done', 'App data cleared. Restart the app.');
              }},
            ]);
          }}>
            <MaterialIcons name="cleaning-services" size={20} color={N.amber} />
            <View style={{ flex: 1 }}>
              <Text style={sc.rowTitle}>Clear App Cache</Text>
              <Text style={sc.rowSub}>Reset connection, history, and cached data (keeps KB + scripts)</Text>
            </View>
            <MaterialIcons name="chevron-right" size={16} color={N.text} />
          </TouchableOpacity>
        </View>

        {/* ── SUPPORT BUTLER AI ── */}
        <View style={[g.card, { backgroundColor: T.panel || N.card, borderColor: PR + '50', borderWidth: 2 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <View style={[g.iconBox, { borderColor: PR, backgroundColor: PR + '12' }]}>
              <MaterialIcons name="favorite" size={20} color={PR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[g.cardTitle, { color: PR, marginBottom: 0 }]}>SUPPORT BUTLER AI</Text>
              <Text style={g.cardSub}>FREE FOREVER — DONATION POWERED</Text>
            </View>
          </View>
          <Text style={{ fontSize: 10, color: N.text, fontFamily: MONO, lineHeight: 15, marginBottom: 10 }}>Every feature is permanently free. Donations fund new scripts, faster fixes, and keep servers running.</Text>
          <TouchableOpacity style={[g.btn, { backgroundColor: PR }]} onPress={() => { haptics.medium(); (global as any).__butlerSwitchTab?.('support'); }}>
            <MaterialIcons name="palette" size={14} color="#000" />
            <Text style={g.btnTxt}>EXPLORE COSMETIC PACKS</Text>
          </TouchableOpacity>
        </View>

        {/* ── BUTLER AI KNOWLEDGE VIEWER ── */}
        <ButlerKnowledgeViewer />

        {/* ── UI CONFIG CARD ── */}
        <UIConfigCard />

        {/* ── EXPORT UI CODE ── */}
        <ExportUICodeCard />

        {/* ════════════════════════════════════════════════════════════
            DEV / TECH SECTION — at the very bottom
            ════════════════════════════════════════════════════════════ */}
        <View style={devs.sectionDivider}>
          <View style={devs.divLine} />
          <View style={devs.divBadge}>
            <MaterialIcons name="developer-mode" size={11} color={N.text} />
            <Text style={devs.divTxt}>DEVELOPER INFO</Text>
          </View>
          <View style={devs.divLine} />
        </View>

        {/* About / App Info — tap any value to copy */}
        <View style={[g.card, devs.devCard]}>

          {/* ─── DOWNLOAD BUTLER SERVER ─── */}
          <View style={[g.card, { borderColor: N.amber + '40', borderWidth: 1.5 }]}>
            <View style={{ height: 2.5, backgroundColor: N.amber, marginBottom: 14, borderRadius: 2, marginHorizontal: -16, marginTop: -14 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: N.amber + '18', borderWidth: 1.5, borderColor: N.amber + '50', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="download" size={20} color={N.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: N.amber, fontFamily: MONO, letterSpacing: 1.2 }}>BUTLER SERVER</Text>
                <Text style={{ fontSize: 10, color: N.amber + '80', fontFamily: MONO }}>v20.0.0  ·  Official Release</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: N.textBrt, lineHeight: 19, marginBottom: 12 }}>
              {'Download the latest butler_server.py to run on your PC. This is the official, verified release — only download from this source.'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => { haptics.medium(); Linking.openURL('https://github.com/shawnjan-cmd/CommandCube').catch(()=>{}); }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12, backgroundColor: N.amber, marginBottom: 12 }}
            >
              <MaterialIcons name="download" size={18} color="#000" />
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 1 }}>GET BUTLER SERVER</Text>
            </TouchableOpacity>
            <View style={{ borderRadius: 10, backgroundColor: 'rgba(255,49,49,0.07)', borderWidth: 1, borderColor: 'rgba(255,49,49,0.22)', padding: 11, gap: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <MaterialIcons name="gavel" size={13} color="#FF3131" />
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#FF3131', fontFamily: MONO, letterSpacing: 1 }}>LEGAL NOTICE</Text>
              </View>
              <Text style={{ fontSize: 10, color: '#FF3131CC', fontFamily: MONO, lineHeight: 15 }}>
                {'© 2026 Shawn Jan. All Rights Reserved.\nThis software is proprietary and confidential. Copying, forking,\nmodifying, or redistributing this source code — even a single line —\nis a violation of copyright law and may result in civil and\ncriminal penalties. Reverse engineering is strictly prohibited.'}
              </Text>
            </View>
          </View>

          <SectionHeader title="ABOUT" color={N.text} icon="info" />

          {([
            ['App Version',  'Butler AI v6.0'],
            ['Package',      'com.butlerai.pc.automation'],
            ['AI Engine',    'Ollama Local AI (no cloud)'],
            ['Platform',     'React Native / Expo SDK 53'],
            ['Architecture', 'Expo Router + Hermes JS Engine'],
            ['Target SDK',   'Android API 35'],
            ['Min SDK',      'Android API 26 (Android 8.0+)'],
            ['License',      'Proprietary (c) 2026'],
          ] as [string, string][]).map(([k, v], i, arr) => (
            <TouchableOpacity
              key={k}
              style={[devs.infoRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
              onPress={async () => {
                haptics.light();
                try { await ExpoClipboard.setStringAsync(v); haptics.success(); } catch {}
              }}
              activeOpacity={0.65}
            >
              <Text style={devs.infoKey}>{k}</Text>
              <Text style={devs.infoVal} numberOfLines={1}>{v}</Text>
              <MaterialIcons name="content-copy" size={10} color={N.text + '60'} style={{ marginLeft: 4, flexShrink: 0 }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Import / React Native stack info */}
        <View style={[g.card, devs.devCard]}>
          <SectionHeader title="TECH STACK" color={N.text} icon="layers" />
          <Text style={devs.stackNote}>Key dependencies used in this build:</Text>
          {([
            ['expo',                     '^53.0.0'],
            ['expo-router',              '~5.0.0'],
            ['react-native',             '0.79.3'],
            ['@shopify/flash-list',      '^1.7.3'],
            ['expo-camera',              '~16.1.6'],
            ['expo-file-system',         '~18.1.4'],
            ['expo-secure-store',        '~14.2.0'],
            ['react-native-reanimated',  '~3.17.5'],
          ] as [string, string][]).map(([pkg, ver], i, arr) => (
            <View key={pkg} style={[devs.pkgRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={devs.pkgName} numberOfLines={1}>{pkg}</Text>
              <View style={devs.pkgVerBadge}>
                <Text style={devs.pkgVer}>{ver}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Debug controls */}
        <View style={[g.card, devs.devCard]}>
          <SectionHeader title="DEBUG TOOLS" color={N.text} icon="bug-report" />
          <TouchableOpacity
            style={[devs.debugBtn, { borderColor: N.text + '30' }]}
            onPress={() => {
              haptics.medium();
              Alert.alert(
                'App Diagnostics',
                [
                  'Platform: ' + Platform.OS,
                  'OS Version: ' + Platform.Version,
                  'Connected: ' + (autoConnectEngine.getCurrentConnection().connected ? 'Yes' : 'No'),
                  'Server IP: ' + (serverConnection.getIP() || 'none'),
                  'Auth Disabled: ' + isAuthDisabled(),
                  'Active Tab: ' + ((global as any).__activeTab || 'home'),
                ].join('\n'),
                [{ text: 'Close' }]
              );
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="info-outline" size={14} color={N.text} />
            <Text style={devs.debugBtnTxt}>View Runtime Diagnostics</Text>
            <MaterialIcons name="chevron-right" size={14} color={N.text + '60'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[devs.debugBtn, { borderColor: N.text + '30', borderTopWidth: 0 }]}
            onPress={() => {
              haptics.medium();
              Alert.alert('Clear Session Token', 'Wipe stored session token from memory?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: async () => {
                  try {
                    await AsyncStorage.removeItem('commandcube_session_token');
                    haptics.success();
                    Alert.alert('Done', 'Session token cleared. Reconnect from HOME tab.');
                  } catch {}
                }},
              ]);
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="vpn-key-off" size={14} color={N.text} />
            <Text style={devs.debugBtnTxt}>Clear Session Token</Text>
            <MaterialIcons name="chevron-right" size={14} color={N.text + '60'} />
          </TouchableOpacity>
        </View>

        <Text style={devs.footer}>Butler AI — Local PC Automation — No Cloud — v6.0{'\n'}© 2026 OnSpace · contact@onspace.ai</Text>

      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Global Styles
const g = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#050505' },
  scrollPad:   { padding: 14, paddingTop: 12 },
  card:        { backgroundColor: N.card, borderRadius: 12, borderWidth: 1.5, borderColor: N.border, marginBottom: 14, padding: 14 },
  cardTitle:   { fontSize: 10, fontWeight: '900', color: N.cyan, fontFamily: MONO, letterSpacing: 2, marginBottom: 12 },
  cardSub:     { fontSize: 8, color: N.text, fontFamily: MONO, marginTop: 2, letterSpacing: 0.5 },
  iconBox:     { width: 44, height: 44, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  btn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 9, paddingVertical: 12 },
  btnTxt:      { fontSize: 12, fontWeight: '700', color: '#000', fontFamily: MONO, letterSpacing: 0.8 },
  actionBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: 8, paddingVertical: 10 },
  actionTxt:   { fontSize: 9, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.8 },
  subCard:     { backgroundColor: N.panel, borderRadius: 8, borderWidth: 1, borderColor: N.border, padding: 10 },
  infoBanner:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, padding: 10 },
  infoBannerTxt:{ flex: 1, fontSize: 10, fontFamily: MONO, lineHeight: 14 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  statusDot:   { width: 5, height: 5, borderRadius: 3 },
  statusTxt:   { fontSize: 7, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.8 },
  modeCol:     { flex: 1, borderWidth: 1, borderRadius: 8, padding: 8, gap: 5 },
  modeHdr:     { fontSize: 7, fontWeight: '900', fontFamily: MONO, letterSpacing: 1, marginBottom: 3 },
  modeRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  modeTxt:     { fontSize: 9, fontFamily: MONO },
  autoPill:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  autoPillTxt: { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },
});

// Dev section styles
const devs = StyleSheet.create({
  sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, marginTop: 4 },
  divLine:        { flex: 1, height: 1, backgroundColor: N.border },
  divBadge:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: N.panel, borderWidth: 1, borderColor: N.border },
  divTxt:         { fontSize: 8, fontWeight: '900', color: N.text, fontFamily: MONO, letterSpacing: 1.5 },
  devCard:        { borderColor: N.border, opacity: 0.85 },
  infoRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: N.border },
  infoKey:        { width: 110, fontSize: 10, color: N.text, fontFamily: MONO },
  infoVal:        { flex: 1, fontSize: 10, fontWeight: '600', color: N.textBrt, fontFamily: MONO, textAlign: 'right' },
  stackNote:      { fontSize: 9, color: N.text, fontFamily: MONO, marginBottom: 10, lineHeight: 14 },
  pkgRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: N.border },
  pkgName:        { flex: 1, fontSize: 10, color: N.textBrt, fontFamily: MONO },
  pkgVerBadge:    { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderColor: N.border },
  pkgVer:         { fontSize: 9, color: N.text, fontFamily: MONO },
  debugBtn:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: N.border },
  debugBtnTxt:    { flex: 1, fontSize: 11, color: N.text, fontFamily: MONO },
  footer:         { textAlign: 'center', fontSize: 8, color: N.text + '55', fontFamily: MONO, lineHeight: 16, marginTop: 4, marginBottom: 8, paddingHorizontal: 16 },
});



// Expo Router per-route ErrorBoundary — isolates crashes to this tab
export { ErrorBoundary } from '@/components/ui/TabErrorBoundary';
