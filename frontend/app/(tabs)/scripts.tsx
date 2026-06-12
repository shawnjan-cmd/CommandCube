/**
 * ⚡ NEXUS SCRIPT LIB — Performance-optimized v3.0
 * ALL animations on GPU thread (useNativeDriver:true) or removed
 * CategoryDetailModal: inline full-screen modal replaces router.push (unreliable in custom tab layout)
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {

  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, ScrollView, Platform, Alert, ActivityIndicator, Animated, Dimensions,
  FlatList, KeyboardAvoidingView, PanResponder, RefreshControl,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { haptics } from '@/services/haptics';
import { InlineWidgetSlot } from '@/components/ui/WidgetLayer';
import { autoConnectEngine } from '@/services/autoConnectEngine';
import VerificationArc from '@/components/ui/VerificationArc';
import { executionCounter } from '@/services/executionCounter';
import { executionHistory, HistoryEntry } from '@/services/executionHistory';
import { detectErrorPattern } from '@/services/errorPatternDetector';
import { errorAutoFix } from '@/services/errorAutoFix';
import { serverConnection } from '@/services/serverConnection';
import { scriptExecutor } from '@/services/scriptExecutor';
import { PYTHON_AUTOMATION_SCRIPTS, AutomationScript } from '@/services/pythonAutomationKnowledge';
import { loadButlerScripts, deleteButlerScript, saveButlerScript, updateButlerScript, ButlerScript } from '@/services/butlerScripts';
import { aiLogger } from '@/services/aiLogger';
import { useAppActive } from '@/hooks/useAppActive';
import { ALL_CATEGORIES, SEARCH_INDEX, SearchHit, CategoryDef } from '@/services/scriptLibraryData';
import { loadPinnedIds, togglePin as togglePinService } from '@/services/pinnedScripts';
import { SCRIPT_TEMPLATES, TEMPLATE_CATEGORIES, ScriptTemplate } from '@/services/scriptTemplates';
import { analyzeScript, SafetyReport, THREAT_META, ThreatLevel } from '@/services/scriptSafetyGuard';
import { scriptUndoManager } from '@/services/scriptUndo';
import NexusRotatingBar from '@/components/ui/NexusRotatingBar';
import {
  getCachedServerLib, setCachedServerLib,
  getCachedRunCounts, setCachedRunCounts,
} from '@/services/scriptCache';
import {
  loadFavorites, addFavorite, removeFavorite, recordFavoriteRun,
  reorderFavorites, isFavorited, toggleFavorite, invalidateFavCache,
  FavoriteScript,
} from '@/services/scriptFavorites';
import { useCosmetic } from '@/contexts/CosmeticContext';

const SCRIPTS_PAGE_TIPS: string[] = [
  'Long-press any script card to instantly preview the full Python code without navigating away',
  'Tap the play button on any card to execute that script directly on your paired PC',
  'Star any script to pin it permanently to the top of your library above all other scripts',
  'The AI tab generates complete Python scripts from plain English descriptions using local Ollama',
  'CHAIN builder lets you sequence up to 20 scripts and run them all in order with one tap',
  'Search box matches against script names, descriptions, and tags across all built-in scripts',
  'AI-generated scripts from Butler are saved permanently to your library for future re-use',
  'Filter chips narrow results to System, Network, Files, Web, Data, GUI, and Monitoring categories',
  'Execution output modal streams output lines from your PC in real time as the script runs',
  'Templates tab has 30 pre-built Python automation recipes ready to customize and use immediately',
  'All scripts execute in a Python subprocess on your PC — your phone is only the remote control',
  'Safety scanner checks every script for 15 threat patterns before allowing execution to proceed',
  'Run count badge on each card tracks total executions accumulated across all app sessions',
  'Pinned scripts are always displayed above all unpinned scripts in every list view',
];

const { width: SW } = Dimensions.get('window');
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// FIX 4B — detect Python code vs prose returned by AI
function isValidPythonCode(c: string): boolean {
  if (!c || c.trim().length < 10) return false;
  return [/^import\s+\w/m,/^from\s+\w/m,/^def\s+\w/m,/^class\s+\w/m,/^print\s*\(/m,/^\w+\s*=/m].some(r=>r.test(c));
}
// FIX 4C — auto-wrap scripts lacking error handling
function ensureErrorHandling(c: string): string {
  if (c.includes('try:') || c.includes('except ')) return c;
  if (c.split('\n').filter(l=>l.trim()).length < 3) return c;
  const ind = c.split('\n').map(l=>'    '+l).join('\n');
  return `import sys, traceback\n\ntry:\n${ind}\nexcept Exception as e:\n    print(f"Script error: {e}", file=sys.stderr)\n    traceback.print_exc()\n    sys.exit(1)\n`;
}

const N = {
  bg:       '#050505',
  surface:  '#0E0F12',
  surfaceHi:'#1A1D24',
  surfaceMd:'#0E0F12',
  border:   'rgba(255,42,31,0.12)',
  borderHi:  'rgba(255,42,31,0.28)',
  text:      '#E6E9EF',
  textDim:   '#6A7384',
  textMid:   '#8C95A6',
  blue:      '#FF2A1F',
  blueDim:   '#FF2A1F18',
  green:     '#00FF88',
  greenDim:  '#00FF8820',
  purple:    '#FFC400',
  purpleDim: '#FFC40020',
  amber:     '#FFC400',
  amberDim:  '#FFC40020',
  red:       '#FF3131',
  redDim:    '#FF313120',
  teal:      '#FF2A1F',
  tealDim:   '#FF2A1F18',
  yellow:    '#FFC400',
};

const CAT_COLOR: Record<string, string> = {
  'AI Generated': '#FFC400',
  Files:          '#FFC400',
  System:         '#FF2A1F',
  Web:            '#00FF88',
  GUI:            '#FFC400',
  Data:           '#FFC400',
  Scheduling:     '#FF2A1F',
  Setup:          '#FFC400',
  Network:        '#00FF88',
  Email:          '#FF6A1F',
  Text:           '#FF2A1F',
  Monitoring:     '#FF3131',
};

const CATEGORIES = ['All', 'AI Generated', 'Files', 'System', 'Web', 'GUI', 'Data', 'Scheduling', 'Setup', 'Network', 'Email', 'Text', 'Monitoring'];

const CARD_ITEM_HEIGHT    = 72;
const SECTION_ITEM_HEIGHT = 36;
const DIVIDER_ITEM_HEIGHT = 13;
const EMPTY_ITEM_HEIGHT   = 200;

// ─── UNIQUE CATEGORY ICONS ────────────────────────────────────────
function CategoryIcon({ category, size = 22, color }: { category: string; size?: number; color: string }) {
  const col = color;
  const DARK = '#0A0A0A';
  const s2 = size;
  switch (category) {
    case 'System':
      return (
        <View style={{ width: s2, height: s2, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <View style={{ width: s2 * 0.62, height: s2 * 0.62, borderWidth: 2, borderColor: col, backgroundColor: DARK, borderRadius: 2, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: s2 * 0.22, height: s2 * 0.22, backgroundColor: col, borderRadius: 1 }} />
          </View>
          {[0, 1, 2].map(i => (<View key={`l${i}`} style={{ position: 'absolute', left: 0, top: s2 * 0.2 + i * s2 * 0.2, width: s2 * 0.19, height: 1.5, backgroundColor: col }} />))}
          {[0, 1, 2].map(i => (<View key={`r${i}`} style={{ position: 'absolute', right: 0, top: s2 * 0.2 + i * s2 * 0.2, width: s2 * 0.19, height: 1.5, backgroundColor: col }} />))}
        </View>
      );
    case 'Network':
      return (
        <View style={{ width: s2, height: s2, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 1 }}>
          {[s2 * 0.88, s2 * 0.62, s2 * 0.36].map((w, i) => (
            <View key={i} style={{ position: 'absolute', bottom: s2 * 0.22 + i * s2 * 0.2, width: w, height: w / 2, borderTopLeftRadius: w, borderTopRightRadius: w, borderWidth: 1.5, borderBottomWidth: 0, borderColor: col + (i === 0 ? 'FF' : i === 1 ? 'BB' : '77'), backgroundColor: 'transparent' }} />
          ))}
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: col }} />
        </View>
      );
    case 'Files':
      return (
        <View style={{ width: s2, height: s2, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', top: s2 * 0.06, left: 0, width: s2 * 0.42, height: s2 * 0.22, backgroundColor: DARK, borderTopLeftRadius: 2, borderTopRightRadius: 2, borderWidth: 1.5, borderColor: col }} />
          <View style={{ position: 'absolute', top: s2 * 0.2, left: 0, right: 0, height: s2 * 0.65, backgroundColor: DARK, borderRadius: 2, borderTopLeftRadius: 0, borderWidth: 1.5, borderColor: col, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 5, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: col }} />
            <View style={{ width: 1.5, height: s2 * 0.18, backgroundColor: col, marginTop: -1 }} />
          </View>
        </View>
      );
    case 'Web':
      return (
        <View style={{ width: s2, height: s2, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: s2 * 0.85, height: s2 * 0.85, borderRadius: s2, borderWidth: 1.5, borderColor: col, backgroundColor: DARK, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <View style={{ position: 'absolute', width: '100%', height: 1.5, backgroundColor: col + '60' }} />
            <View style={{ position: 'absolute', height: '100%', width: 1.5, backgroundColor: col + '60' }} />
            <View style={{ position: 'absolute', width: s2 * 0.45, height: s2 * 0.85, borderWidth: 1.5, borderColor: col + '50', borderRadius: s2, backgroundColor: 'transparent' }} />
          </View>
        </View>
      );
    case 'GUI':
      return (
        <View style={{ width: s2, height: s2, borderWidth: 1.5, borderColor: col, borderRadius: 2, backgroundColor: DARK, overflow: 'hidden' }}>
          <View style={{ height: s2 * 0.28, backgroundColor: col + '30', borderBottomWidth: 1, borderBottomColor: col, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2, gap: 2 }}>
            {['#FF5F57', '#FEBC2E', '#28C840'].map((c, i) => <View key={i} style={{ width: s2 * 0.12, height: s2 * 0.12, borderRadius: 10, backgroundColor: c }} />)}
          </View>
          <View style={{ flex: 1, padding: 2, gap: 1.5 }}>
            {[0.8, 0.6, 0.9].map((w, i) => <View key={i} style={{ width: `${w * 100}%` as any, height: 1.5, backgroundColor: col + '55', borderRadius: 1 }} />)}
          </View>
        </View>
      );
    case 'Data':
      return (
        <View style={{ width: s2, height: s2, alignItems: 'flex-end', justifyContent: 'flex-end', flexDirection: 'row', gap: 2, paddingBottom: 1 }}>
          {[0.4, 0.7, 0.55, 0.9, 0.65].map((h, i) => (
            <View key={i} style={{ flex: 1, height: s2 * h, backgroundColor: i === 3 ? col : col + '60', borderRadius: 1 }} />
          ))}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1.5, backgroundColor: col }} />
        </View>
      );
    case 'AI Generated':
      return (
        <View style={{ width: s2, height: s2, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: s2 * 0.75, height: s2 * 0.65, borderRadius: s2, borderWidth: 1.5, borderColor: col, backgroundColor: DARK, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {[col, col + '80', col].map((c, i) => <View key={i} style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: c }} />)}
            </View>
            <View style={{ width: s2 * 0.4, height: 1, backgroundColor: col + '60' }} />
          </View>
          <View style={{ position: 'absolute', top: 1, right: 2 }}>
            <View style={{ width: 1.5, height: 6, backgroundColor: col, position: 'absolute', left: 2 }} />
            <View style={{ width: 6, height: 1.5, backgroundColor: col, position: 'absolute', top: 2 }} />
          </View>
        </View>
      );
    case 'Email':
      return <View style={{ width: s2, height: s2, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="email" size={s2} color={col} /></View>;
    case 'Monitoring':
      return (
        <View style={{ width: s2, height: s2, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
            <View style={{ flex: 1, height: 1.5, backgroundColor: col + '60' }} />
            <View style={{ width: 0, height: 0, borderLeftWidth: 3, borderRightWidth: 3, borderBottomWidth: 5, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: col }} />
            <View style={{ width: 0, height: 0, borderLeftWidth: 3, borderRightWidth: 3, borderTopWidth: 5, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: col }} />
            <View style={{ flex: 1, height: 1.5, backgroundColor: col + '60' }} />
          </View>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: col }} />
        </View>
      );
    case 'Scheduling': return <View style={{ width: s2, height: s2, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="schedule" size={s2} color={col} /></View>;
    case 'Setup': return <View style={{ width: s2, height: s2, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="build" size={s2} color={col} /></View>;
    case 'Text':
      return (
        <View style={{ width: s2, height: s2, borderWidth: 1.5, borderColor: col, borderRadius: 2, backgroundColor: DARK, padding: s2 * 0.1, gap: 2 }}>
          {[1, 0.8, 1, 0.6].map((w, i) => <View key={i} style={{ width: `${w * 100}%` as any, height: 1.5, backgroundColor: col + (i % 2 === 0 ? 'CC' : '60'), borderRadius: 1 }} />)}
          <View style={{ position: 'absolute', top: 0, right: 0, width: s2 * 0.25, height: s2 * 0.25, borderLeftWidth: 1.5, borderBottomWidth: 1.5, borderColor: col, backgroundColor: DARK }} />
        </View>
      );
    default: return <MaterialIcons name="code" size={s2} color={col} />;
  }
}

function NexusRefreshSpinner({ refreshing }: { refreshing: boolean }) {
  if (!refreshing) return null;
  return (
    <View style={{ alignItems: 'center', paddingVertical: 14, gap: 6 }}>
      <ActivityIndicator color={N.blue} size="small" />
      <Text style={{ fontSize: 9, fontWeight: '900', color: N.blue, fontFamily: MONO, letterSpacing: 1.5 }}>SYNCING...</Text>
    </View>
  );
}

function MaliciousScriptBlocker({ report, onDismiss, onForce }: {
  report: SafetyReport; onDismiss: () => void; onForce?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const meta = THREAT_META[report.level];
  const maxH = expanded ? Math.min(report.findings.length * 90 + 20, 400) : 0;
  const LEVEL_ICONS: Record<string, string> = { safe: '✓', low: '⚠', medium: '⚠⚠', high: '⊘', critical: '☠' };

  return (
    <View style={[msbst.wrap, { borderColor: meta.color + '70', backgroundColor: meta.bgColor }]}>
      <View style={[msbst.topBar, { backgroundColor: meta.color }]} />
      <View style={msbst.header}>
        <View style={[msbst.iconBox, { borderColor: meta.color + '60', backgroundColor: meta.color + '15' }]}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: meta.color }} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={[msbst.levelBadge, { color: meta.color, borderColor: meta.color + '60', backgroundColor: meta.color + '18' }]}>
              {LEVEL_ICONS[report.level]} {meta.label}
            </Text>
            {report.executionBlocked ? (
              <View style={[msbst.pill, { borderColor: N.red + '80', backgroundColor: N.red + '18' }]}>
                <MaterialIcons name="block" size={9} color={N.red} />
                <Text style={[msbst.pillTxt, { color: N.red }]}>EXECUTION BLOCKED</Text>
              </View>
            ) : (
              <View style={[msbst.pill, { borderColor: N.amber + '60', backgroundColor: N.amber + '12' }]}>
                <MaterialIcons name="warning" size={9} color={N.amber} />
                <Text style={[msbst.pillTxt, { color: N.amber }]}>CAUTION</Text>
              </View>
            )}
          </View>
          <Text style={msbst.countTxt}>{report.findings.length} threat{report.findings.length !== 1 ? 's' : ''} · {report.linesChecked} lines scanned</Text>
        </View>
        <TouchableOpacity onPress={() => setExpanded(v => !v)} style={msbst.expandBtn} hitSlop={{top:8,bottom:8,left:8,right:8}}>
          <MaterialIcons name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={18} color={meta.color} />
        </TouchableOpacity>
      </View>
      <Text style={[msbst.summary, { color: meta.color + 'CC' }]}>{report.summary}</Text>
      {expanded ? (
        <View style={{ maxHeight: maxH, overflow: 'hidden' }}>
          <View style={{ gap: 6, paddingHorizontal: 12, paddingBottom: 8 }}>
            {report.findings.map((f, i) => {
              const fm = THREAT_META[f.level];
              return (
                <View key={i} style={[msbst.finding, { borderLeftColor: fm.color }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <Text style={[msbst.findingRule, { color: fm.color }]}>{f.rule}</Text>
                    <View style={[msbst.findingLevel, { borderColor: fm.color + '60', backgroundColor: fm.color + '12' }]}>
                      <Text style={[msbst.findingLevelTxt, { color: fm.color }]}>{fm.label}</Text>
                    </View>
                    <Text style={msbst.findingLine}>L{f.line}</Text>
                  </View>
                  <Text style={msbst.findingDesc}>{f.description}</Text>
                  {f.excerpt ? <Text style={msbst.findingExcerpt} numberOfLines={1}>{f.excerpt}</Text> : null}
                  {f.fix ? <Text style={[msbst.findingFix, { color: N.green + 'BB' }]}>💡 {f.fix}</Text> : null}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
      <View style={msbst.actions}>
        <TouchableOpacity style={[msbst.actionBtn, { borderColor: N.textDim + '50', backgroundColor: N.surfaceHi }]} onPress={onDismiss} activeOpacity={0.8}>
          <MaterialIcons name="edit" size={14} color={N.textDim} />
          <Text style={[msbst.actionTxt, { color: N.textDim }]}>EDIT SCRIPT</Text>
        </TouchableOpacity>
        {!report.executionBlocked && onForce ? (
          <TouchableOpacity style={[msbst.actionBtn, { borderColor: N.amber + '60', backgroundColor: N.amber + '12' }]} onPress={onForce} activeOpacity={0.8}>
            <MaterialIcons name="play-arrow" size={14} color={N.amber} />
            <Text style={[msbst.actionTxt, { color: N.amber }]}>RUN ANYWAY</Text>
          </TouchableOpacity>
        ) : null}
        {report.executionBlocked && onForce ? (
          !showForceConfirm ? (
            <TouchableOpacity style={[msbst.actionBtn, { borderColor: N.red + '50', backgroundColor: N.red + '10' }]} onPress={() => setShowForceConfirm(true)} activeOpacity={0.8}>
              <MaterialIcons name="dangerous" size={14} color={N.red} />
              <Text style={[msbst.actionTxt, { color: N.red }]}>OVERRIDE</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[msbst.actionBtn, { borderColor: N.red, backgroundColor: N.red + '25' }]} onPress={() => { setShowForceConfirm(false); onForce(); }} activeOpacity={0.8}>
              <MaterialIcons name="lock-open" size={14} color={N.red} />
              <Text style={[msbst.actionTxt, { color: N.red }]}>CONFIRM OVERRIDE</Text>
            </TouchableOpacity>
          )
        ) : null}
      </View>
      {[{t:0,l:0,bT:1.5,bL:1.5},{t:0,r:0,bT:1.5,bR:1.5},{b:0,l:0,bB:1.5,bL:1.5},{b:0,r:0,bB:1.5,bR:1.5}].map((c: any, i) => (
        <View key={i} style={{ position:'absolute', width:10, height:10, borderColor: meta.color + 'AA',
          ...(c.t !== undefined ? { top: c.t } : { bottom: c.b }),
          ...(c.l !== undefined ? { left: c.l } : { right: c.r }),
          borderTopWidth:c.bT||0, borderLeftWidth:c.bL||0, borderBottomWidth:c.bB||0, borderRightWidth:c.bR||0 }} />
      ))}
    </View>
  );
}
const msbst = StyleSheet.create({
  wrap:          { borderWidth: 1.5, borderRadius: 12, overflow: 'hidden', position: 'relative', marginBottom: 10,
    ...Platform.select({ ios: { shadowColor: '#FF0044', shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:12 }, android:{elevation:6} }) },
  topBar:        { height: 3 },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingBottom: 6 },
  iconBox:       { width: 36, height: 36, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  levelBadge:    { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8, borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  pill:          { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  pillTxt:       { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },
  countTxt:      { fontSize: 10, color: N.textDim, fontFamily: MONO },
  expandBtn:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  summary:       { fontSize: 11, fontFamily: MONO, paddingHorizontal: 12, paddingBottom: 8, lineHeight: 17 },
  finding:       { borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 6, gap: 2 },
  findingRule:   { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  findingLevel:  { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  findingLevelTxt:{ fontSize: 8, fontWeight: '700', fontFamily: MONO },
  findingLine:   { fontSize: 9, color: N.textDim, fontFamily: MONO },
  findingDesc:   { fontSize: 11, color: N.textMid, lineHeight: 16 },
  findingExcerpt:{ fontSize: 10, color: N.textDim, fontFamily: MONO, backgroundColor: 'rgba(0,0,0,0.35)', padding: 5, borderRadius: 4, marginTop: 2 },
  findingFix:    { fontSize: 10, lineHeight: 15, marginTop: 2 },
  actions:       { flexDirection: 'row', gap: 8, padding: 10, paddingTop: 6 },
  actionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: 8, paddingVertical: 10 },
  actionTxt:     { fontSize: 10, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
});

type ViewMode = 'scripts' | 'library' | 'favorites';
type ModalTab = 'write' | 'templates' | 'sequence' | 'ai';

async function copyCode(code: string) {
  try {
    if (Platform.OS === 'web') await navigator.clipboard.writeText(code);
    else { const { setStringAsync } = await import('expo-clipboard'); await setStringAsync(code); }
  } catch {}
}

async function executeOnServer(
  scriptCode: string,
  onChunk: (line: string) => void
): Promise<{ output: string; error: string; success: boolean; ms: number }> {
  const ip = serverConnection.getIP(), port = serverConnection.getPort(), token = serverConnection.getToken();
  if (!ip || !port) return { output: '', error: 'No server. Go to HOME and scan QR.', success: false, ms: 0 };
  const start = Date.now();
  const PATHS = ['/api/execute', '/execute', '/api/run', '/run'];
  const PORTS = [port, '8766', '8765', '5000'].filter((p, i, a) => a.indexOf(p) === i);
  for (const tryPort of PORTS) {
    for (const path of PATHS) {
      try {
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 35000);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`http://${ip}:${tryPort}${path}`, {
          method: 'POST', headers, body: JSON.stringify({ script: scriptCode, language: 'python' }), signal: ctrl.signal,
        });
        const ms = Date.now() - start;
        if (res.status === 404) continue;
        if (!res.ok) {
          if (res.status === 401) {
            const reconnResult = await serverConnection.reconnect().catch(() => null);
            if (reconnResult?.connected) {
              const newToken = serverConnection.getToken();
              const retryHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
              if (newToken) retryHeaders['Authorization'] = `Bearer ${newToken}`;
              const retryCtrl = new AbortController();
              setTimeout(() => retryCtrl.abort(), 35000);
              try {
                const retryRes = await fetch(`http://${ip}:${tryPort}${path}`, {
                  method: 'POST', headers: retryHeaders,
                  body: JSON.stringify({ script: scriptCode, language: 'python' }),
                  signal: retryCtrl.signal,
                });
                if (retryRes.ok) {
                  const retryReader = retryRes.body?.getReader();
                  let retryFull = '';
                  if (retryReader) {
                    const dec2 = new TextDecoder();
                    while (true) {
                      const { done, value } = await retryReader.read();
                      if (done) break;
                      const chunk = dec2.decode(value, { stream: true });
                      retryFull += chunk;
                      chunk.split('\n').forEach(l => { if (l.trim()) onChunk(l); });
                    }
                  } else {
                    retryFull = await retryRes.text();
                    retryFull.split('\n').forEach(l => { if (l.trim()) onChunk(l); });
                  }
                  let retryData: any = {};
                  try { retryData = JSON.parse(retryFull); } catch { retryData = { output: retryFull }; }
                  const retryRaw = (retryData.output || '').trim();
                  const retryHasErr = retryRaw.toLowerCase().includes('traceback') || retryRaw.toLowerCase().includes('error:');
                  return { output: retryHasErr ? '' : retryRaw, error: retryHasErr ? retryRaw : (retryData.error || ''), success: !retryHasErr && !retryData.error, ms: Date.now() - start };
                }
              } catch {}
            }
            return { output: '', error: 'Session expired — reconnect in HOME tab', success: false, ms };
          }
          continue;
        }
        const reader = res.body?.getReader();
        let fullText = '';
        if (reader) {
          const dec = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = dec.decode(value, { stream: true });
            fullText += chunk;
            chunk.split('\n').forEach(l => { if (l.trim()) onChunk(l); });
          }
        } else {
          fullText = await res.text();
          fullText.split('\n').forEach(l => { if (l.trim()) onChunk(l); });
        }
        let data: any = {};
        try { data = JSON.parse(fullText); } catch { data = { output: fullText }; }
        const raw = (data.output || '').trim();
        const hasErr = raw.toLowerCase().includes('traceback') || raw.toLowerCase().includes('error:');
        return { output: hasErr ? '' : raw, error: hasErr ? raw : (data.error || ''), success: !hasErr && !data.error, ms };
      } catch (e: any) {
        if (e?.name === 'AbortError') return { output: '', error: 'Timeout (35s)', success: false, ms: Date.now() - start };
      }
    }
  }
  return { output: '', error: 'No working execution endpoint found', success: false, ms: Date.now() - start };
}

// ─── CONNECTION STATUS PILL ───────────────────────────────────────
function ConnStatusPill({ isConnected, addr }: { isConnected: boolean; addr: string }) {
  const glow = useRef(new Animated.Value(0.5)).current;
  const col  = isConnected ? N.green : N.red;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1,    duration: 1100, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.35, duration: 1100, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <View style={[csp.pill, { borderColor: col + '55', backgroundColor: col + '0C' }]}>
      <Animated.View style={[csp.dot, { backgroundColor: col, opacity: glow }]} />
      <Text style={[csp.label, { color: col }]} numberOfLines={1}>{isConnected ? addr || 'LINKED' : 'OFFLINE'}</Text>
      {isConnected ? (
        <View style={[csp.liveBadge, { borderColor: col + '60', backgroundColor: col + '18' }]}>
          <Text style={[csp.liveTxt, { color: col }]}>LIVE</Text>
        </View>
      ) : null}
    </View>
  );
}
const csp = StyleSheet.create({
  pill:      { flexDirection:'row', alignItems:'center', gap:6, borderWidth:1.5, borderRadius:20, paddingHorizontal:10, paddingVertical:6, maxWidth: 180 },
  dot:       { width:7, height:7, borderRadius:4, flexShrink:0 },
  label:     { fontSize:11, fontWeight:'700', fontFamily:MONO, letterSpacing:0.3, flexShrink:1 },
  liveBadge: { borderWidth:1, borderRadius:6, paddingHorizontal:5, paddingVertical:2 },
  liveTxt:   { fontSize:8, fontWeight:'900', fontFamily:MONO, letterSpacing:0.5 },
});

function NexusSectionTitle({ main, accent, accentColor = N.blue }: { main: string; accent: string; accentColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 0, marginBottom: 14 }}>
      <Text style={{ fontSize: 22, fontWeight: '900', color: N.text, fontFamily: MONO }}>{main}</Text>
      <Text style={{ fontSize: 22, fontWeight: '900', color: accentColor, fontFamily: MONO }}>{accent}</Text>
    </View>
  );
}

function NexusFilterChips({ options, active, onSelect, colorMap }: {
  options: string[]; active: string; onSelect: (v: string) => void; colorMap?: Record<string, string>;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 7, paddingVertical: 5, paddingHorizontal: 2 }}>
      {options.map(opt => {
        const isActive = opt === active;
        const col = (colorMap && colorMap[opt]) || N.blue;
        return (
          <TouchableOpacity key={opt} onPress={() => { haptics.selection(); onSelect(opt); }}
            style={[
              nfc.chip,
              isActive
                ? { borderColor: col, backgroundColor: col + '20', ...Platform.OS === 'ios' ? { shadowColor: col, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6 } : {} }
                : { borderColor: 'rgba(255,42,31,0.1)', backgroundColor: 'rgba(0,0,0,0.2)' }
            ]}
            activeOpacity={0.75}>
            {opt !== 'All' ? (
              <View style={{ marginRight: 4 }}><CategoryIcon category={opt} size={11} color={isActive ? col : N.textDim} /></View>
            ) : (
              <MaterialIcons name="grid-view" size={11} color={isActive ? col : N.textDim} style={{ marginRight: 4 }} />
            )}
            <Text style={[nfc.label, { color: isActive ? col : N.textDim, fontWeight: isActive ? '800' : '600' }]}>{opt.toUpperCase()}</Text>
            {isActive && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: col, marginLeft: 4 }} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
const nfc = StyleSheet.create({
  chip:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  label: { fontSize: 10, fontWeight: '700', color: N.textDim, fontFamily: MONO },
});

function SafetyDot({ code }: { code: string }) {
  const report = useMemo(() => analyzeScript(code), [code]);
  const col = report.level === 'safe' || report.level === 'low' ? N.green
    : report.level === 'medium' ? N.amber
    : report.level === 'high' ? '#FF6622'
    : N.red;
  const label = report.level === 'safe' || report.level === 'low' ? 'SAFE'
    : report.level === 'medium' ? 'MED'
    : report.level === 'high' ? 'HIGH'
    : 'CRIT';
  return (
    <View style={[sfd.wrap, { borderColor: col + '50', backgroundColor: col + '12' }]}>
      <View style={[sfd.dot, { backgroundColor: col }]} />
      <Text style={[sfd.label, { color: col }]}>{label}</Text>
    </View>
  );
}
const sfd = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2.5 },
  dot:   { width: 5, height: 5, borderRadius: 3 },
  label: { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.3 },
});

// ─── NEXUS SCRIPT CARD — 3D Cyberpunk Edition ───────────────────
const NexusScriptCard = React.memo(function NexusScriptCard({ title, description, category, isRunning, runCount, lastRunTime, isPinned, scriptCode, isFavorited, onPress, onRun, onTogglePin, onToggleFav }: {
  title: string; description: string; category: string;
  isRunning: boolean; runCount: number; lastRunTime?: string; isPinned?: boolean;
  scriptCode?: string; isFavorited?: boolean;
  onPress: () => void; onRun: () => void; onTogglePin?: () => void; onToggleFav?: () => void;
}) {
  const col = CAT_COLOR[category] || N.blue;
  const runScale   = useRef(new Animated.Value(1)).current;
  const glowOp     = useRef(new Animated.Value(0)).current;
  const pressDepth = useRef(new Animated.Value(0)).current;

  const handleRun = useCallback(() => {
    haptics.medium();
    // 3D press animation
    Animated.sequence([
      Animated.timing(pressDepth, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.spring(pressDepth, { toValue: 0, tension: 340, friction: 8, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(runScale, { toValue: 0.78, duration: 55, useNativeDriver: true }),
      Animated.spring(runScale, { toValue: 1, tension: 340, friction: 7, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(glowOp, { toValue: 0.7, duration: 55, useNativeDriver: true }),
      Animated.timing(glowOp, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
    onRun();
  }, [onRun]);

  const handleCardPress = useCallback(() => { haptics.selection(); onPress(); }, [onPress]);

  // 3D button translate: pressed sinks down+right
  const btnTranslateY = pressDepth.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });
  const btnTranslateX = pressDepth.interpolate({ inputRange: [0, 1], outputRange: [0, 1.5] });

  return (
    <View style={nsc.wrap}>
      {/* Glow flash overlay on run */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 14, backgroundColor: col, opacity: glowOp, zIndex: 10 }]} />
      <TouchableOpacity style={[nsc.card, { borderColor: col + '28' }]} onPress={handleCardPress} activeOpacity={0.88} delayPressIn={0}>
        {/* ── THICK TOP ACCENT BAR ── */}
        <View style={[nsc.topAccent, { backgroundColor: col }]} />
        {/* ── BOTTOM GLOW SHADOW STRIP ── */}
        <View style={[nsc.bottomStrip, { backgroundColor: col + '30' }]} />
        {/* ── CORNER BRACKETS ── */}
        <View style={[nsc.corner, { top: 4, left: 4, borderTopWidth: 2, borderLeftWidth: 2, borderColor: col + '90' }]} />
        <View style={[nsc.corner, { top: 4, right: 4, borderTopWidth: 2, borderRightWidth: 2, borderColor: col + '90' }]} />
        <View style={[nsc.corner, { bottom: 4, left: 4, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: col + '55' }]} />
        <View style={[nsc.corner, { bottom: 4, right: 4, borderBottomWidth: 2, borderRightWidth: 2, borderColor: col + '55' }]} />
        {/* ── LEFT ACCENT STRIP ── */}
        <View style={[nsc.leftStrip, { backgroundColor: col }]} />
        {/* ── ICON BOX ── */}
        <View style={[nsc.iconBox, { backgroundColor: col + '12', borderColor: col + '40' }]}>
          <CategoryIcon category={category} size={22} color={col} />
          {runCount > 0 ? (
            <View style={[nsc.runBadge, { backgroundColor: col }]}>
              <Text style={nsc.runBadgeTxt}>×{runCount}</Text>
            </View>
          ) : null}
        </View>
        {/* ── CONTENT ── */}
        <View style={nsc.content}>
          <Text style={[nsc.title, { color: '#FFFFFF' }]} numberOfLines={1}>{title}</Text>
          <Text style={nsc.desc} numberOfLines={1}>{description}</Text>
          <View style={nsc.metaRow}>
            <View style={[nsc.catChip, { borderColor: col + '55', backgroundColor: col + '12' }]}>
              <Text style={[nsc.catTxt, { color: col }]}>{category.toUpperCase()}</Text>
            </View>
            {scriptCode ? <SafetyDot code={scriptCode} /> : null}
            {lastRunTime ? (
              <View style={nsc.timeChip}>
                <MaterialIcons name="access-time" size={8} color={N.textDim} />
                <Text style={nsc.timeTxt}>{lastRunTime}</Text>
              </View>
            ) : (
              <View style={nsc.timeChip}><Text style={[nsc.timeTxt, { color: N.textDim + '60' }]}>never run</Text></View>
            )}
          </View>
        </View>
        {/* ── ACTION COLUMN ── */}
        {(onToggleFav || onTogglePin) ? (
          <View style={nsc.actionCol}>
            {onToggleFav ? (
              <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); onToggleFav(); }} hitSlop={{ top: 10, bottom: 10, left: 12, right: 4 }} activeOpacity={0.7} style={nsc.actionBtn}>
                <MaterialIcons name={isFavorited ? 'favorite' : 'favorite-border'} size={16} color={isFavorited ? '#FF4488' : N.textDim + '60'} />
              </TouchableOpacity>
            ) : null}
            {onTogglePin ? (
              <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); haptics.light(); onTogglePin(); }} hitSlop={{ top: 10, bottom: 10, left: 12, right: 4 }} activeOpacity={0.7} style={nsc.actionBtn}>
                <MaterialIcons name={isPinned ? 'star' : 'star-border'} size={16} color={isPinned ? N.yellow : N.textDim + '60'} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
        {/* ── 3D PLAY BUTTON ── */}
        <View style={nsc.runWrap}>
          {/* 3D depth shadow layer behind button */}
          <View style={[nsc.playBtnShadow, { backgroundColor: col + '50' }]} />
          <Animated.View style={[
            { transform: [{ scale: runScale }, { translateY: btnTranslateY }, { translateX: btnTranslateX }] },
          ]}>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); handleRun(); }}
              disabled={isRunning}
              style={[nsc.playBtn, {
                borderColor: col,
                backgroundColor: isRunning ? col + '30' : col + '22',
                borderBottomColor: col + 'FF',
                borderRightColor: col + 'EE',
                ...Platform.select({
                  ios: { shadowColor: col, shadowOffset:{width:2,height:4}, shadowOpacity:0.7, shadowRadius:8 },
                  android: { elevation: 6 },
                }),
              }]}
              activeOpacity={0.85}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              {isRunning
                ? <ActivityIndicator size="small" color={col} style={{ width: 18, height: 18 }} />
                : <MaterialIcons name="play-arrow" size={22} color={col}
                    style={Platform.OS === 'ios' ? { textShadowColor: col, textShadowOffset:{width:0,height:0}, textShadowRadius:8 } : {}} />
              }
            </TouchableOpacity>
          </Animated.View>
          {isRunning ? <Text style={[nsc.runningLabel, { color: col }]}>RUN...</Text> : null}
        </View>
      </TouchableOpacity>
    </View>
  );
});

const nsc = StyleSheet.create({
  wrap:         { marginBottom: 8 },
  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#040A14', borderRadius: 12, borderWidth: 1, overflow: 'hidden', minHeight: 76, position: 'relative',
    ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.35, shadowRadius:10 }, android:{ elevation:5 } }) },
  topAccent:    { position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 5, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  bottomStrip:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, zIndex: 5, opacity: 0.3 },
  corner:       { position: 'absolute', width: 10, height: 10 },
  leftStrip:    { width: 3.5, alignSelf: 'stretch', flexShrink: 0, marginTop: 3, marginBottom: 3, borderRadius: 2 },
  iconBox:      { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 10, marginRight: 10, flexShrink: 0, position: 'relative' },
  runBadge:     { position: 'absolute', top: -6, right: -7, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1.5, minWidth: 18, alignItems: 'center',
    ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.5, shadowRadius:4 }, android:{elevation:3} }) },
  runBadgeTxt:  { fontSize: 7.5, fontWeight: '900', color: '#000', fontFamily: MONO },
  content:      { flex: 1, paddingVertical: 11, paddingRight: 4, gap: 4 },
  title:        { fontSize: 13.5, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.2 },
  actionCol:    { width: 32, alignSelf: 'stretch', flexShrink: 0, alignItems: 'center', justifyContent: 'center', gap: 0 },
  actionBtn:    { width: 32, height: 28, alignItems: 'center', justifyContent: 'center' },
  desc:         { fontSize: 10.5, color: N.textDim, lineHeight: 14 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  catChip:      { borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  catTxt:       { fontSize: 8, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.2 },
  timeChip:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeTxt:      { fontSize: 8, color: N.textDim, fontFamily: MONO },
  runWrap:      { paddingRight: 12, paddingLeft: 4, alignItems: 'center', justifyContent: 'center', gap: 3, position: 'relative' },
  playBtnShadow:{ position: 'absolute', bottom: 3, right: 9, width: 36, height: 36, borderRadius: 18, zIndex: 0 },
  playBtn:      { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderBottomWidth: 2.5, borderRightWidth: 2, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  runningLabel: { fontSize: 7, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
});

// ─── AI SCRIPT CARD ───────────────────────────────────────────────
const NexusAIScriptCard = React.memo(function NexusAIScriptCard({ script, isRunning, runCount, lastRunTime, isPinned, isFavorited, onPress, onRun, onDelete, onEdit, onTogglePin, onToggleFav }: {
  script: ButlerScript; isRunning: boolean; runCount: number; lastRunTime?: string; isPinned?: boolean; isFavorited?: boolean;
  onPress: () => void; onRun: () => void; onDelete: () => void; onEdit?: () => void; onTogglePin?: () => void; onToggleFav?: () => void;
}) {
  const runScale = useRef(new Animated.Value(1)).current;
  const glowOp   = useRef(new Animated.Value(0)).current;

  const handleRun = useCallback(() => {
    haptics.medium();
    Animated.sequence([
      Animated.timing(runScale, { toValue: 0.80, duration: 60, useNativeDriver: true }),
      Animated.spring(runScale, { toValue: 1, tension: 280, friction: 7, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(glowOp, { toValue: 0.85, duration: 60, useNativeDriver: true }),
      Animated.timing(glowOp, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
    onRun();
  }, [onRun]);

  const handleCardPress = useCallback(() => { haptics.selection(); onPress(); }, [onPress]);

  return (
    <View style={nsc.wrap}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 11, backgroundColor: N.amber, opacity: glowOp, zIndex: 10 }]} />
      <TouchableOpacity style={[nsc.card, { borderColor: N.amber + '28' }]} onPress={handleCardPress} activeOpacity={0.88}>
        <View style={[nsc.topAccent, { backgroundColor: N.amber }]} />
        <View style={[nsc.iconBox, { backgroundColor: N.amber + '15', borderColor: N.amber + '35' }]}>
          <MaterialIcons name="psychology" size={20} color={N.amber} />
          {runCount > 0 ? (
            <View style={[nsc.runBadge, { backgroundColor: N.amber + 'CC' }]}>
              <Text style={nsc.runBadgeTxt}>×{runCount}</Text>
            </View>
          ) : null}
        </View>
        <View style={nsc.content}>
          <Text style={nsc.title} numberOfLines={1}>{script.title}</Text>
          <Text style={nsc.desc} numberOfLines={1}>{script.description}</Text>
          <View style={nsc.metaRow}>
            <View style={[nsc.catChip, { borderColor: N.amber + '45', backgroundColor: N.amber + '0E', flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
              <MaterialIcons name="auto-awesome" size={7} color={N.amber} />
              <Text style={[nsc.catTxt, { color: N.amber }]}>AI</Text>
            </View>
            <View style={[nsc.catChip, { borderColor: N.blue + '40', backgroundColor: N.blue + '0E' }]}>
              <Text style={[nsc.catTxt, { color: N.blue }]}>{script.category.toUpperCase()}</Text>
            </View>
            <SafetyDot code={script.script} />
            {lastRunTime ? (
              <View style={nsc.timeChip}><MaterialIcons name="access-time" size={8} color={N.textDim} /><Text style={nsc.timeTxt}>{lastRunTime}</Text></View>
            ) : (
              <View style={nsc.timeChip}><Text style={[nsc.timeTxt, { color: N.textDim + '55' }]}>never run</Text></View>
            )}
          </View>
        </View>
        <View style={nsc.actionCol}>
          {onToggleFav ? (
            <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); onToggleFav(); }} hitSlop={{ top: 10, bottom: 10, left: 12, right: 4 }} activeOpacity={0.7} style={nsc.actionBtn}>
              <MaterialIcons name={isFavorited ? 'favorite' : 'favorite-border'} size={16} color={isFavorited ? '#FF4488' : N.textDim + '60'} />
            </TouchableOpacity>
          ) : null}
          {onTogglePin ? (
            <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); haptics.light(); onTogglePin(); }} hitSlop={{ top: 10, bottom: 10, left: 12, right: 4 }} activeOpacity={0.7} style={nsc.actionBtn}>
              <MaterialIcons name={isPinned ? 'star' : 'star-border'} size={16} color={isPinned ? N.yellow : N.textDim + '60'} />
            </TouchableOpacity>
          ) : null}
          {onEdit ? (
            <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); haptics.light(); onEdit?.(); }} hitSlop={{ top: 6, bottom: 6, left: 12, right: 4 }} activeOpacity={0.7} style={[nsc.actionBtn, { opacity: 0.6 }]}>
              <MaterialIcons name="edit" size={13} color={N.textDim} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); haptics.heavy(); onDelete(); }} hitSlop={{ top: 6, bottom: 6, left: 12, right: 4 }} activeOpacity={0.7} style={[nsc.actionBtn, { opacity: 0.55 }]}>
            <MaterialIcons name="delete-outline" size={13} color={N.red + 'AA'} />
          </TouchableOpacity>
        </View>
        <Animated.View style={[nsc.runWrap, { transform: [{ scale: runScale }] }]}>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); handleRun(); }}
            disabled={isRunning}
            style={[nsc.playBtn, {
              borderColor: N.amber + '70',
              backgroundColor: isRunning ? N.amber + '20' : N.amber + '18',
              ...Platform.select({ ios: isRunning ? {} : { shadowColor: N.amber, shadowOffset:{width:0,height:2}, shadowOpacity:0.5, shadowRadius:6 }, android: {} }),
            }]}
            activeOpacity={0.75}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            {isRunning ? <ActivityIndicator size="small" color={N.amber} style={{ width: 16, height: 16 }} /> : <MaterialIcons name="play-arrow" size={20} color={N.amber} />}
          </TouchableOpacity>
          {isRunning ? <Text style={[nsc.runningLabel, { color: N.amber }]}>RUN...</Text> : null}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
});

// ─── INLINE CATEGORY DETAIL MODAL ────────────────────────────────
// Replaces router.push (unreliable inside custom tab layout) with a proper Modal
function CategoryDetailModal({ cat, onClose }: { cat: CategoryDef | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [selectedScript, setSelectedScript] = useState<any | null>(null);
  const [execRunning, setExecRunning] = useState(false);
  const [execOutput, setExecOutput] = useState('');
  const [execError, setExecError] = useState('');
  const [execMs, setExecMs] = useState<number | null>(null);
  const [execSuccess, setExecSuccess] = useState<boolean | null>(null);
  const [liveLines, setLiveLines] = useState<string[]>([]);

  useEffect(() => {
    if (!cat) {
      setSelectedScript(null); setExecOutput(''); setExecError('');
      setExecRunning(false); setExecMs(null); setExecSuccess(null); setLiveLines([]);
    }
  }, [cat]);

  const runSelectedScript = useCallback(async () => {
    if (!selectedScript) return;
    haptics.heavy();
    setExecRunning(true); setExecOutput(''); setExecError('');
    setExecMs(null); setExecSuccess(null); setLiveLines([]);
    const start = Date.now();
    const result = await executeOnServer(
      selectedScript.code,
      (line) => setLiveLines(prev => [...prev.slice(-40), line])
    );
    const ms = Date.now() - start;
    setExecMs(ms); setExecRunning(false);
    setExecSuccess(result.success); setExecOutput(result.output); setExecError(result.error);
    haptics[result.success ? 'success' : 'warning']();
    executionCounter.increment(selectedScript.id).catch(() => {});
    executionHistory.addEntry({
      scriptId: selectedScript.id, scriptName: selectedScript.name,
      category: cat?.title || 'Library', success: result.success, ms,
      timestamp: new Date().toISOString(), error: result.error || undefined,
    }).catch(() => {});
  }, [selectedScript, cat]);

  if (!cat) return null;

  const diffCol = (d: string) => d === 'BEGINNER' ? N.green : d === 'INTERMEDIATE' ? N.amber : N.red;

  return (
    <Modal visible={!!cat} animationType="slide" statusBarTranslucent
      onRequestClose={() => { if (selectedScript) setSelectedScript(null); else onClose(); }}>
      <View style={{ flex: 1, backgroundColor: '#0E0F12', paddingTop: Math.max(insets.top, 20) }}>

        {/* Header */}
        <View style={[cdm.header, { borderBottomColor: cat.color }]}>
          <TouchableOpacity
            onPress={() => { if (selectedScript) { setSelectedScript(null); } else { onClose(); } }}
            style={cdm.backBtn} hitSlop={{top:12,bottom:12,left:12,right:12}}>
            <MaterialIcons name="arrow-back" size={22} color={cat.color} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[cdm.title, { color: cat.color }]} numberOfLines={1}>
              {selectedScript ? selectedScript.name : cat.title}
            </Text>
            <Text style={cdm.subtitle} numberOfLines={1}>
              {selectedScript ? selectedScript.desc : cat.subtitle}
            </Text>
          </View>
          {selectedScript ? (
            <View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, backgroundColor: diffCol(selectedScript.difficulty) + '25' }}>
              <Text style={[cdm.diffTxt, { color: diffCol(selectedScript.difficulty) }]}>{selectedScript.difficulty}</Text>
            </View>
          ) : (
            <View style={[cdm.countBadge, { borderColor: cat.color + '60', backgroundColor: cat.color + '20' }]}>
              <Text style={[cdm.countTxt, { color: cat.color }]}>{cat.scripts.length}</Text>
            </View>
          )}
        </View>

        {selectedScript ? (
          <View style={{ flex: 1 }}>
            {/* Tags */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}
              contentContainerStyle={{ flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingVertical: 8 }}>
              {(selectedScript.tags || []).map((t: string) => (
                <View key={t} style={{ backgroundColor: cat.color + '15', borderRadius: 4,
                  paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: cat.color + '35' }}>
                  <Text style={{ fontSize: 9, color: cat.color, fontFamily: MONO }}>#{t}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Code viewer */}
            <View style={{ flex: 1, backgroundColor: '#050505', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                <Text style={{ flex: 1, fontSize: 9, color: cat.color, fontFamily: MONO, letterSpacing: 1.5 }}>
                  PYTHON · {(selectedScript.code || '').split('\n').length} LINES
                </Text>
                <TouchableOpacity onPress={() => copyCode(selectedScript.code)} hitSlop={{top:6,bottom:6,left:6,right:6}}>
                  <Text style={{ fontSize: 10, color: N.blue, fontFamily: MONO }}>COPY</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }} showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 12, color: cat.color + 'DD', fontFamily: MONO, lineHeight: 18 }} selectable>
                  {selectedScript.code}
                </Text>
              </ScrollView>
            </View>

            {/* Output */}
            {(execOutput || execError || execRunning) ? (
              <View style={[cdm.outputBox, { borderTopColor: execSuccess ? N.green : execSuccess === false ? N.red : N.blue }]}>
                <Text style={[cdm.outputLabel, { color: execSuccess ? N.green : execSuccess === false ? N.red : N.blue }]}>
                  {execRunning ? 'EXECUTING...' : execSuccess ? `SUCCESS · ${execMs}ms` : `FAILED · ${execMs}ms`}
                </Text>
                <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 8 }}>
                  {execRunning ? liveLines.map((l, i) => <Text key={i} style={cdm.outputLine}>{l}</Text>) : null}
                  {execOutput ? <Text style={[cdm.outputLine, { color: '#88FF99' }]} selectable>{execOutput}</Text> : null}
                  {execError  ? <Text style={[cdm.outputLine, { color: '#FF8888' }]} selectable>{execError}</Text>  : null}
                </ScrollView>
              </View>
            ) : null}

            {/* Run button */}
            <View style={[cdm.footer, { paddingBottom: Math.max(insets.bottom + 10, 16) }]}>
              <TouchableOpacity
                style={[cdm.runBtn, { backgroundColor: execRunning ? '#1A1D24' : cat.color,
                  borderColor: cat.color, opacity: execRunning ? 0.75 : 1 }]}
                onPress={runSelectedScript} disabled={execRunning} activeOpacity={0.85}>
                {execRunning
                  ? <><ActivityIndicator color={cat.color} size="small" />
                      <Text style={[cdm.runTxt, { color: cat.color }]}>EXECUTING...</Text></>
                  : <><MaterialIcons name="play-arrow" size={22} color="#000" />
                      <Text style={[cdm.runTxt, { color: '#000' }]}>
                        {execSuccess !== null ? 'RUN AGAIN' : 'RUN ON MY PC'}
                      </Text></>
                }
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Script list */
          <ScrollView style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 8,
              paddingBottom: Math.max(insets.bottom + 80, 100), gap: 8 }}
            showsVerticalScrollIndicator={false}>
            {cat.scripts.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60, gap: 14 }}>
                <MaterialIcons name="code-off" size={48} color={N.textDim} />
                <Text style={{ fontSize: 15, color: N.textDim, fontFamily: MONO }}>No scripts in this category yet</Text>
              </View>
            ) : cat.scripts.map((script: any, idx: number) => (
              <TouchableOpacity key={script.id}
                style={[cdm.scriptCard, { borderColor: cat.color + '45', borderLeftColor: cat.color }]}
                onPress={() => {
                  haptics.selection();
                  setSelectedScript(script);
                  setExecOutput(''); setExecError(''); setExecRunning(false);
                  setExecMs(null); setExecSuccess(null); setLiveLines([]);
                }}
                activeOpacity={0.85}>
                <View style={[cdm.idxBadge, { backgroundColor: cat.color + '20' }]}>
                  <Text style={[cdm.idxTxt, { color: cat.color }]}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={[cdm.scriptName, { color: cat.color, flex: 1 }]} numberOfLines={2}>{script.name}</Text>
                    <View style={[cdm.diffPill, { backgroundColor: diffCol(script.difficulty) + '20' }]}>
                      <Text style={[cdm.diffTxt, { color: diffCol(script.difficulty) }]}>{script.difficulty}</Text>
                    </View>
                  </View>
                  <Text style={cdm.scriptDesc} numberOfLines={2}>{script.desc}</Text>
                  <View style={{ flexDirection: 'row', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                    {(script.tags || []).slice(0, 3).map((t: string) => (
                      <View key={t} style={{ backgroundColor: cat.color + '10', borderRadius: 4,
                        paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: cat.color + '30' }}>
                        <Text style={{ fontSize: 8, color: cat.color + 'AA', fontFamily: MONO }}>#{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <MaterialIcons name="play-circle-outline" size={28} color={cat.color} style={{ flexShrink: 0 }} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const cdm = StyleSheet.create({
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 2 },
  backBtn:    { padding: 4 },
  title:      { fontSize: 18, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.3 },
  subtitle:   { fontSize: 10, color: N.textDim, fontFamily: MONO, marginTop: 2 },
  countBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  countTxt:   { fontSize: 15, fontWeight: '700', fontFamily: MONO },
  scriptCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderLeftWidth: 3, padding: 14 },
  idxBadge:   { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  idxTxt:     { fontSize: 12, fontWeight: '700', fontFamily: MONO },
  scriptName: { fontSize: 13, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.2 },
  scriptDesc: { fontSize: 10, color: N.textDim, lineHeight: 15 },
  diffPill:   { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, flexShrink: 0 },
  diffTxt:    { fontSize: 8, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  outputBox:  { borderTopWidth: 2.5, backgroundColor: '#050505', maxHeight: 200 },
  outputLabel:{ fontSize: 9, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.8, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4 },
  outputLine: { fontSize: 11, fontFamily: MONO, lineHeight: 17, color: N.textMid, marginBottom: 2 },
  footer:     { padding: 14, borderTopWidth: 1, borderTopColor: N.border },
  runBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 10, paddingVertical: 16, borderWidth: 1.5,
    ...Platform.select({ ios: { shadowColor: N.green, shadowOffset:{width:0,height:3}, shadowOpacity:0.35, shadowRadius:8 }, android:{elevation:6} }) },
  runTxt:     { fontSize: 14, fontWeight: '700', fontFamily: MONO, letterSpacing: 1 },
});

// ─── LIBRARY CATEGORY CARD ────────────────────────────────────────
function NexusLibraryCat({ cat, onPress }: { cat: CategoryDef; onPress: () => void }) {
  const IconComp: any = cat.iconLibrary === 'community' ? MaterialCommunityIcons
    : cat.iconLibrary === 'ionicons' ? Ionicons : MaterialIcons;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    haptics.medium();
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 60, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 280, friction: 7, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity style={[nlc.card, { borderLeftColor: cat.color }]} onPress={handlePress} activeOpacity={0.85}>
        <View style={[nlc.icon, { backgroundColor: cat.color + '18', borderColor: cat.color + '40' }]}>
          <IconComp name={cat.icon} size={22} color={cat.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[nlc.title, { color: cat.color }]} numberOfLines={1}>{cat.title}</Text>
          <Text style={nlc.sub} numberOfLines={1}>{cat.subtitle}</Text>
          <Text style={[nlc.count, { color: cat.color + '99' }]}>{cat.scripts.length} scripts</Text>
        </View>
        <View style={[nlc.arrowBox, { borderColor: cat.color + '40', backgroundColor: cat.color + '10' }]}>
          <MaterialIcons name="chevron-right" size={18} color={cat.color} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const nlc = StyleSheet.create({
  card:    { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderLeftWidth: 3, borderColor: N.border, padding: 14, marginBottom: 8 },
  icon:    { width: 46, height: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title:   { fontSize: 14, fontWeight: '700', fontFamily: MONO, marginBottom: 2 },
  sub:     { fontSize: 11, color: N.textDim, marginBottom: 3 },
  count:   { fontSize: 10, fontFamily: MONO },
  arrowBox:{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});

// ─── UNDO WIDGET — Clean slash-badge design ──────────────────
// ─── FUI TIP BANNER — premium left-accent style ───────────────────
function FuiTipBanner({ tips }: { tips: string[] }) {
  const [idx, setIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
        setIdx(i => (i + 1) % tips.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
      });
    }, 5000);
    return () => clearInterval(t);
  }, [tips.length]);

  return (
    <View style={ftb.wrap}>
      <View style={ftb.accent} />
      <Animated.Text style={[ftb.txt, { opacity: fadeAnim }]} numberOfLines={2}>
        {tips[idx]}
      </Animated.Text>
      <View style={[ftb.chip]}>
        <MaterialIcons name="lightbulb-outline" size={10} color={N.blue} />
        <Text style={ftb.chipTxt}>TIP</Text>
      </View>
    </View>
  );
}
const ftb = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginTop: 8, marginBottom: 2,
    backgroundColor: N.blue + '07', borderRadius: 8, borderWidth: 1, borderColor: N.blue + '20',
    paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden', minHeight: 40 },
  accent:{ width: 3, alignSelf: 'stretch', backgroundColor: N.blue, flexShrink: 0 },
  txt:   { flex: 1, fontSize: 11, color: N.blue + 'CC', fontFamily: MONO, lineHeight: 16, paddingHorizontal: 10, paddingVertical: 10 },
  chip:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: N.blue + '15', borderLeftWidth: 1,
    borderLeftColor: N.blue + '30', paddingHorizontal: 10, alignSelf: 'stretch', justifyContent: 'center', flexShrink: 0 },
  chipTxt:{ fontSize: 9, fontWeight: '900', color: N.blue, fontFamily: MONO, letterSpacing: 0.5 },
});

function NexusUndoWidget({ isConnected }: { isConnected: boolean }) {
  const [undoEntries, setUndoEntries] = useState<{ id: number; remainingMin: string; userRequest: string }[]>([]);
  const [undoing,    setUndoing]    = useState(false);
  const [undone,     setUndone]     = useState(false);
  const [dismissed,  setDismissed]  = useState(false);
  const dotPulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(dotPulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
      Animated.timing(dotPulse, { toValue: 0.2, duration: 800, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    const fetchUndos = async () => {
      try {
        const ip = serverConnection.getIP(); const port = serverConnection.getPort();
        if (!ip || !port) return;
        const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(`http://${ip}:${port}/api/undo/list`, { signal: ctrl.signal });
        if (res.ok) {
          const d = await res.json();
          const entries = d.entries || [];
          setUndoEntries(entries);
          if (entries.length > 0) setDismissed(false);
        }
      } catch {}
    };
    fetchUndos();
    const t = setInterval(fetchUndos, 30_000);
    return () => clearInterval(t);
  }, [isConnected]);

  const runCount = undoEntries.length > 0 ? undoEntries.length : 0;

  const handleUndo = () => {
    if (undoing) return;
    haptics.heavy();
    Alert.alert(
      'UNDO LAST SCRIPTS',
      `Roll back ${runCount} reversible execution${runCount !== 1 ? 's' : ''}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'UNDO', style: 'destructive', onPress: async () => {
          setUndoing(true); haptics.medium();
          try {
            const ip = serverConnection.getIP(); const port = serverConnection.getPort();
            const token = serverConnection.getToken();
            if (!ip || !port) { Alert.alert('Not connected'); setUndoing(false); return; }
            const headers: Record<string,string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            for (const entry of undoEntries) {
              await fetch(`http://${ip}:${port}/api/undo/rollback`, {
                method: 'POST', headers,
                body: JSON.stringify({ id: entry.id }),
              }).catch(() => {});
            }
            haptics.success(); setUndone(true);
          } catch (e: any) { Alert.alert('Undo Error', e?.message || 'Network error'); haptics.warning(); }
          finally { setUndoing(false); }
        }},
      ]
    );
  };

  const hasUndo  = !dismissed && !undone && runCount > 0;
  const accentCol = hasUndo ? N.blue : N.textDim + '55';

  return (
    <View style={[nuw.wrap, {
      borderColor:     hasUndo ? N.blue + '55' : N.border,
      backgroundColor: hasUndo ? N.blue + '0A' : N.surfaceHi + '80',
      opacity: hasUndo ? 1 : 0.55,
    }]}>
      {/* Left: icon */}
      <TouchableOpacity
        onPress={hasUndo ? handleUndo : undefined}
        disabled={undoing || !hasUndo}
        style={[nuw.iconBtn, {
          borderColor:     accentCol,
          backgroundColor: hasUndo ? N.blue + '15' : N.surfaceHi,
        }]}
        activeOpacity={0.75}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {undoing
          ? <ActivityIndicator size="small" color={N.blue} style={{ transform: [{ scale: 0.8 }] }} />
          : <MaterialIcons name="undo" size={18} color={accentCol} />
        }
      </TouchableOpacity>
      {/* Center info */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accentCol, opacity: hasUndo ? dotPulse : 0.3 }} />
          <Text style={[nuw.label, { color: hasUndo ? '#FFFFFF' : N.textDim }]}>
            UNDO {hasUndo
              ? <Text style={{ color: N.blue }}>AVAILABLE</Text>
              : <Text style={{ color: N.textDim + '80' }}>UNAVAILABLE</Text>}
          </Text>
          {hasUndo ? (
            <View style={[nuw.countBadge, { backgroundColor: N.blue + 'CC' }]}>
              <Text style={nuw.countTxt}>{runCount}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[nuw.sub, { color: hasUndo ? N.textDim : N.textDim + '60' }]}>
          {hasUndo ? `Tap to roll back last script${runCount !== 1 ? 's' : ''} · 15 min window` : 'Run a script to enable undo'}
        </Text>
      </View>
      {/* Right: dismiss (only when active) */}
      {hasUndo ? (
        <TouchableOpacity
          onPress={() => { haptics.light(); setDismissed(true); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={nuw.dismissBtn}
        >
          <MaterialIcons name="close" size={14} color={N.textDim} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const nuw = StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16,
    marginBottom: 8, borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    ...Platform.select({ ios:{ shadowColor: N.blue, shadowOffset:{width:0,height:2}, shadowOpacity:0.15, shadowRadius:8 }, android:{elevation:3} }) },
  iconBtn:    { width: 36, height: 36, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  label:      { fontSize: 12, fontWeight: '900', fontFamily: MONO, color: '#FFFFFF', letterSpacing: 0.3 },
  sub:        { fontSize: 9.5, color: N.textDim, fontFamily: MONO, marginTop: 2 },
  countBadge: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  countTxt:   { fontSize: 9, fontWeight: '900', color: '#000', fontFamily: MONO },
  dismissBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});

// ─── UNDO COUNTDOWN BANNER ────────────────────────────────────────
function UndoCountdownBanner({ undoId, expiresSec, serverIp, serverPort, serverToken }: {
  undoId: number; expiresSec: number;
  serverIp?: string; serverPort?: string; serverToken?: string;
}) {
  const [secondsLeft, setSecondsLeft] = useState(expiresSec);
  const [undoing, setUndoing] = useState(false);
  const [undone, setUndone] = useState(false);
  const [undoneMsg, setUndoneMsg] = useState('');

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const expired = secondsLeft === 0;
  const urgent  = secondsLeft < 120;
  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, '0');

  const handleUndo = async () => {
    if (!serverIp || !serverPort || expired || undoing || undone) return;
    Alert.alert('UNDO SCRIPT', 'Rollback this script execution and restore affected files?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'UNDO', style: 'destructive', onPress: async () => {
        haptics.heavy(); setUndoing(true);
        try {
          const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 10000);
          const res = await fetch(`http://${serverIp}:${serverPort}/api/undo/rollback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(serverToken ? { Authorization: `Bearer ${serverToken}` } : {}) },
            body: JSON.stringify({ id: undoId }), signal: ctrl.signal,
          });
          const d = await res.json();
          if (d.ok) { setUndone(true); setUndoneMsg(d.message || `Rolled back ${d.restored ?? 0} file(s)`); haptics.success(); }
          else { Alert.alert('Undo Failed', d.error || 'Could not rollback'); haptics.warning(); }
        } catch (e: any) { Alert.alert('Undo Error', e?.message || 'Network error'); }
        finally { setUndoing(false); }
      }},
    ]);
  };

  if (undone) {
    return (
      <View style={[unb.wrap, { borderColor: N.green + '60', backgroundColor: N.green + '0C' }]}>
        <MaterialIcons name="check-circle" size={14} color={N.green} />
        <Text style={[unb.txt, { color: N.green }]}>{undoneMsg || 'Rollback complete'}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={handleUndo} disabled={expired || undoing}
      style={[unb.wrap, {
        borderColor: expired ? N.textDim + '30' : urgent ? N.red + '60' : N.amber + '50',
        backgroundColor: expired ? 'transparent' : urgent ? N.red + '08' : N.amber + '08',
        opacity: expired ? 0.45 : 1,
      }]} activeOpacity={0.85}>
      {undoing ? <ActivityIndicator size="small" color={N.amber} style={{ transform:[{scale:0.7}] }} />
        : <MaterialIcons name="undo" size={14} color={expired ? N.textDim : urgent ? N.red : N.amber} />}
      <View style={{ flex: 1 }}>
        <Text style={[unb.title, { color: expired ? N.textDim : urgent ? N.red : N.amber }]}>
          {undoing ? 'ROLLING BACK...' : expired ? 'UNDO EXPIRED' : 'UNDO AVAILABLE'}
        </Text>
        <Text style={unb.sub}>{expired ? 'Rollback window closed' : 'Tap to restore files to pre-execution state'}</Text>
      </View>
      <View style={[unb.timer, { borderColor: (urgent ? N.red : N.amber) + '50' }]}>
        <Text style={[unb.timerTxt, { color: urgent ? N.red : N.amber }]}>{mins}:{secs}</Text>
      </View>
    </TouchableOpacity>
  );
}
const unb = StyleSheet.create({
  wrap:  { flexDirection:'row', alignItems:'center', gap:10, borderWidth:1.5, borderRadius:10, paddingHorizontal:14, paddingVertical:10, marginBottom:10 },
  txt:   { flex:1, fontSize:12, fontWeight:'700', fontFamily:MONO },
  title: { fontSize:11, fontWeight:'900', fontFamily:MONO, letterSpacing:0.5 },
  sub:   { fontSize:9, color:N.textDim, fontFamily:MONO, marginTop:2 },
  timer: { borderWidth:1.5, borderRadius:8, paddingHorizontal:8, paddingVertical:4, alignItems:'center' },
  timerTxt: { fontSize:13, fontWeight:'900', fontFamily:MONO },
});

// ─── EXECUTION MODAL ─────────────────────────────────────────────
function ExecutionModal({ visible, scriptName, running, success, output, error, ms, onClose, onRunAgain, liveLines = [], progressPct = 0, undoId, undoExpiresSec }: {
  visible: boolean; scriptName: string; running: boolean;
  success: boolean | null; output: string; error: string; ms: number | null;
  onClose: () => void; onRunAgain: () => void; liveLines?: string[]; progressPct?: number;
  undoId?: number; undoExpiresSec?: number;
}) {
  const insets = useSafeAreaInsets();
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (running) {
      Animated.timing(progressAnim, { toValue: progressPct / 100, duration: 400, useNativeDriver: false }).start();
    } else {
      progressAnim.setValue(success ? 1 : 0);
    }
  }, [running, progressPct, success]);

  const statusColor = running ? N.blue : success ? N.green : N.red;
  const errorPattern = error ? detectErrorPattern(error) : null;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={xm.overlay}>
        <View style={xm.sheet}>
          <View style={[xm.topAccent, { backgroundColor: statusColor }]} />
          <View style={xm.header}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[xm.scriptName, { color: statusColor }]} numberOfLines={1}>{scriptName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
                <Text style={[xm.statusTxt, { color: statusColor }]}>{running ? 'EXECUTING...' : success ? 'COMPLETE' : success === false ? 'FAILED' : 'STANDBY'}</Text>
                {running ? <ActivityIndicator size="small" color={statusColor} style={{ transform: [{ scale: 0.65 }] }} /> : null}
              </View>
            </View>
            {ms !== null && !running ? (
              <View style={[xm.badge, { borderColor: N.border, backgroundColor: N.surfaceHi }]}>
                <Text style={{ fontSize: 11, color: N.textMid, fontFamily: MONO }}>{ms >= 1000 ? `${(ms/1000).toFixed(1)}s` : `${ms}ms`}</Text>
              </View>
            ) : null}
            <TouchableOpacity onPress={onClose} style={xm.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="close" size={18} color={N.textDim} />
            </TouchableOpacity>
          </View>
          {running ? (
            <View style={xm.progressTrack}>
              <Animated.View style={[xm.progressFill, {
                width: progressAnim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }),
                backgroundColor: statusColor,
              }]} />
            </View>
          ) : null}
          <ScrollView style={{ maxHeight: '60%' }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
            {running ? (
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: N.textDim, fontFamily: MONO, letterSpacing: 0.5, marginBottom: 8 }}>LIVE OUTPUT</Text>
                {liveLines.slice(-18).map((line, i) => (
                  <Text key={i} style={{ fontSize: 12, color: N.textMid, fontFamily: MONO, lineHeight: 18 }} numberOfLines={2}>{line}</Text>
                ))}
                {liveLines.length === 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <ActivityIndicator color={N.blue} size="small" />
                    <Text style={{ fontSize: 12, color: N.textDim, fontFamily: MONO }}>Waiting for output...</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <>
                {output ? (
                  <View style={[xm.outputBox, { borderLeftColor: N.green }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: N.green, fontFamily: MONO, letterSpacing: 1 }}>OUTPUT</Text>
                      <TouchableOpacity onPress={() => { haptics.light(); copyCode(output); }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Text style={{ fontSize: 10, color: N.blue, fontFamily: MONO }}>COPY</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 12, color: '#88FF99', fontFamily: MONO, lineHeight: 18 }} selectable>{output}</Text>
                  </View>
                ) : null}
                {error ? (
                  <View style={[xm.outputBox, { borderLeftColor: N.red }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: N.red, fontFamily: MONO, letterSpacing: 1, marginBottom: 10 }}>ERROR</Text>
                    <Text style={{ fontSize: 12, color: '#FF8888', fontFamily: MONO, lineHeight: 18 }} selectable>{error}</Text>
                  </View>
                ) : null}
                {!output && !error ? <Text style={{ fontSize: 12, color: N.textDim, fontFamily: MONO }}>No output returned.</Text> : null}
                {errorPattern ? (
                  <View style={[xm.outputBox, { borderLeftColor: N.amber, marginTop: 10 }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: N.amber, fontFamily: MONO, marginBottom: 8 }}>AUTO-FIX AVAILABLE</Text>
                    <Text style={{ fontSize: 11, color: N.textMid, marginBottom: 10 }}>{errorPattern.title}</Text>
                    {errorPattern.fixes.slice(0, 2).map((fix, i) => (
                      <TouchableOpacity key={i} onPress={() => copyCode(fix.command)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: N.surfaceHi, borderRadius: 6, padding: 8, marginBottom: 6 }}>
                        <MaterialIcons name={fix.icon as any} size={12} color={N.amber} />
                        <Text style={{ flex: 1, fontSize: 11, color: N.amber, fontFamily: MONO }} numberOfLines={1}>{fix.command}</Text>
                        <Text style={{ fontSize: 10, color: N.blue, fontFamily: MONO }}>COPY</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
          {!running ? (
            <View style={[xm.footer, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
              {undoId && undoExpiresSec && success ? (
                <UndoCountdownBanner
                  undoId={undoId} expiresSec={undoExpiresSec}
                  serverIp={serverConnection.getIP() || undefined}
                  serverPort={serverConnection.getPort() || undefined}
                  serverToken={serverConnection.getToken() || undefined}
                />
              ) : null}
              <TouchableOpacity style={[xm.runAgainBtn, { backgroundColor: N.blue }]} onPress={() => { haptics.heavy(); onRunAgain(); }} activeOpacity={0.85}>
                <MaterialIcons name="play-arrow" size={18} color="#000" />
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 0.5 }}>RUN AGAIN</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
                <Text style={{ fontSize: 12, color: N.textDim, fontFamily: MONO, textAlign: 'center' }}>DISMISS</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
const xm = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: N.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%', minHeight: 200, overflow: 'hidden' },
  topAccent:    { height: 3, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: N.border },
  scriptName:   { fontSize: 16, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.3 },
  statusTxt:    { fontSize: 11, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  badge:        { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, flexShrink: 0, alignSelf: 'flex-start' },
  closeBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: N.surfaceHi, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  progressTrack:{ height: 3, backgroundColor: N.surfaceHi, marginHorizontal: 20, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  outputBox:    { backgroundColor: N.bg, borderRadius: 10, borderWidth: 1, borderLeftWidth: 3, borderColor: N.border, padding: 14, marginBottom: 12 },
  footer:       { paddingHorizontal: 20, paddingTop: 14, gap: 12 },
  runAgainBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 12, paddingVertical: 15 },
});

// ─── QUICK PREVIEW MODAL ─────────────────────────────────────────
function QuickPreviewModal({ visible, title, code, description, category, onClose }: {
  visible: boolean; title: string; code: string; description?: string; category?: string; onClose: () => void;
}) {
  const col = (category && CAT_COLOR[category]) || N.blue;
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={qp.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[qp.card, { borderTopColor: col }]}>
          <View style={qp.handle} />
          <View style={qp.header}>
            <View style={[qp.catPill, { borderColor: col + '60', backgroundColor: col + '18' }]}>
              <Text style={[qp.catTxt, { color: col }]}>{(category || 'SCRIPT').toUpperCase()}</Text>
            </View>
            <Text style={qp.title} numberOfLines={2}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={qp.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="close" size={16} color={N.textDim} />
            </TouchableOpacity>
          </View>
          {description ? <Text style={qp.desc} numberOfLines={3}>{description}</Text> : null}
          <View style={[qp.codeHeader, { backgroundColor: N.surfaceHi }]}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {['#FF5F57','#FEBC2E','#28C840'].map((c,i)=><View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} />)}
            </View>
            <Text style={{ flex: 1, fontSize: 10, color: N.textDim, fontFamily: MONO, textAlign: 'center' }}>script.py</Text>
            <TouchableOpacity onPress={() => { import('expo-clipboard').then(m => m.setStringAsync(code)).catch(() => {}); }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={{ fontSize: 10, color: N.blue, fontFamily: MONO }}>COPY</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14 }}>
            <Text style={[qp.code, { color: col + 'DD' }]} selectable>{code}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const qp = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  card:    { backgroundColor: N.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 3, maxHeight: '82%', overflow: 'hidden' },
  handle:  { width: 36, height: 4, backgroundColor: N.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  header:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  catPill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0, marginTop: 2 },
  catTxt:  { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  title:   { flex: 1, fontSize: 15, fontWeight: '700', color: N.text, fontFamily: MONO, lineHeight: 20 },
  closeBtn:{ width: 28, height: 28, borderRadius: 14, backgroundColor: N.surfaceHi, alignItems: 'center', justifyContent: 'center' },
  desc:    { fontSize: 12, color: N.textDim, lineHeight: 18, paddingHorizontal: 16, paddingBottom: 10 },
  codeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: N.border, borderBottomWidth: 1, borderBottomColor: N.border },
  code:    { fontSize: 12, fontFamily: MONO, lineHeight: 18 },
});

// ─── SYNTAX HIGHLIGHTER ──────────────────────────────────────────
const PY_KW = new Set(['import','from','as','def','class','return','yield','raise','pass','break','continue','lambda','with','in','not','and','or','is','None','True','False','if','elif','else','for','while','try','except','finally','global','nonlocal','del','assert','async','await']);
function SyntaxHighlight({ code }: { code: string }) {
  return (
    <View style={{ padding: 12 }}>
      {code.split('\n').map((line, li) => {
        const parts: { text: string; color: string }[] = [];
        let i = 0; const ci = line.indexOf('#');
        const effective = ci >= 0 ? line.slice(0, ci) : line;
        const comment = ci >= 0 ? line.slice(ci) : '';
        let buf = '';
        while (i < effective.length) {
          const ch = effective[i];
          if (ch === '"' || ch === "'") {
            if (buf) { parts.push({ text: buf, color: '#9AA3B2' }); buf = ''; }
            let str = ch; let j = i + 1;
            while (j < effective.length && effective[j] !== ch) str += effective[j++];
            str += ch; i = j + 1;
            parts.push({ text: str, color: '#FF9944' });
          } else if (/[a-zA-Z_]/.test(ch)) {
            let word = '';
            while (i < effective.length && /[\w]/.test(effective[i])) word += effective[i++];
            if (buf) { parts.push({ text: buf, color: '#9AA3B2' }); buf = ''; }
            parts.push({ text: word, color: PY_KW.has(word) ? N.blue : '#E8E8E8' });
          } else { buf += ch; i++; }
        }
        if (buf) parts.push({ text: buf, color: '#9AA3B2' });
        if (comment) parts.push({ text: comment, color: '#667744' });
        return (
          <View key={li} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 9, color: N.textDim, fontFamily: MONO, minWidth: 26 }}>{li + 1}</Text>
            {parts.map((p, pi) => <Text key={pi} style={{ fontSize: 12, color: p.color, fontFamily: MONO, lineHeight: 18 }}>{p.text}</Text>)}
          </View>
        );
      })}
    </View>
  );
}

// ─── SCRIPT EDITOR MODAL ─────────────────────────────────────────
function ScriptEditorModal({ visible, onClose, onExecute, editScript }: {
  visible: boolean; onClose: () => void;
  onExecute: (name: string, code: string) => void;
  editScript?: ButlerScript | null;
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<ModalTab>('write');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('System');
  const [saving, setSaving] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [safetyReport, setSafetyReport] = useState<SafetyReport | null>(null);
  const [tmplSearch, setTmplSearch] = useState('');
  const [tmplCat, setTmplCat] = useState('All');
  const [seqSlots, setSeqSlots] = useState<ScriptTemplate[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiError, setAiError] = useState('');
  const undoStack = scriptUndoManager.getStack(editScript?.id || '__new__');

  useEffect(() => {
    if (visible) {
      setName(editScript?.title || '');
      setCode(editScript?.script || '');
      setCategory(editScript?.category || 'System');
      setTab('write'); setAiResult(''); setAiError(''); setSafetyReport(null);
      if (editScript?.script) undoStack.snapshotNow(editScript.script);
    }
  }, [visible, editScript?.id]);

  const handleCodeChange = (text: string) => {
    setCode(text);
    undoStack.push(text);
    if (text.length > 30) {
      const r = analyzeScript(text);
      setSafetyReport(r.findings.length > 0 ? r : null);
    } else setSafetyReport(null);
  };

  const handleSave = async () => {
    if (!code.trim()) { Alert.alert('Empty Script', 'Add some Python code first.'); return; }
    if (!name.trim()) { Alert.alert('No Name', 'Give your script a name.'); return; }
    setSaving(true);
    try {
      if (editScript?.id) await updateButlerScript(editScript.id, { title: name, script: code, category });
      else await saveButlerScript(code, { title: name, category });
      haptics.success(); onClose();
    } catch (e: any) { Alert.alert('Save Failed', e?.message || 'Could not save'); }
    finally { setSaving(false); }
  };

  const handleImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['*/*'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const content = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      setCode(content);
      if (!name.trim()) setName(asset.name.replace(/\.py$/i, '').replace(/[_-]/g, ' '));
      setTab('write'); haptics.success();
    } catch (e: any) { Alert.alert('Import Error', e?.message || 'Could not read file'); }
  };

  const handleAskAI = async () => {
    if (!aiPrompt.trim()) return;
    const ip = serverConnection.getIP(), port = serverConnection.getPort();
    if (!ip || !port) { setAiError('Connect to PC server first (HOME tab)'); return; }
    setAiLoading(true); setAiResult(''); setAiError('');
    try {
      const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 45000);
      const res = await fetch(`http://${ip}:${port}/api/butler/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(serverConnection.getToken() ? { Authorization: `Bearer ${serverConnection.getToken()}` } : {}) },
        body: JSON.stringify({ message: `Write a Python script that: ${aiPrompt}`, systemPrompt: 'Write ONLY Python code, no markdown, no backticks.', conversation: [] }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      const cleaned = (data.response || data.message || '').replace(/```python\n?/gi, '').replace(/```\n?/g, '').trim();
      if (cleaned) {
            if (!isValidPythonCode(cleaned)) {
              setAiError('AI returned a description instead of code. Try: "Python script that monitors CPU".');
            } else {
              setAiResult(ensureErrorHandling(cleaned));
              haptics.success();
            }
          }
      else setAiError('AI returned empty response.');
    } catch (e: any) {
      setAiError(e?.name === 'AbortError' ? 'Timeout — try again.' : e?.message || 'AI generation failed');
    } finally { setAiLoading(false); }
  };

  const CATS = ['System', 'Files', 'Network', 'Web', 'Data', 'AI Generated', 'Monitoring', 'Scheduling', 'Setup', 'GUI', 'Email', 'Text'];
  const TABS = [
    { id: 'write', label: 'WRITE', icon: 'code', color: N.blue },
    { id: 'templates', label: 'TEMPLATES', icon: 'library-books', color: N.amber },
    { id: 'sequence', label: 'CHAIN', icon: 'account-tree', color: N.purple },
    { id: 'ai', label: 'AI', icon: 'psychology', color: N.green },
  ] as const;

  const filteredTmpls = SCRIPT_TEMPLATES.filter(t => {
    if (tmplCat !== 'All' && t.cat !== tmplCat) return false;
    if (!tmplSearch.trim()) return true;
    const q = tmplSearch.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q);
  });

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: N.bg }}>
        <View style={[sem.header, { paddingTop: Platform.OS === 'ios' ? 52 : 32 }]}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <MaterialIcons name="arrow-back" size={22} color={N.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={sem.headerTitle}>{editScript ? 'EDIT ' : 'NEW '}<Text style={{ color: N.blue }}>SCRIPT</Text></Text>
            <Text style={sem.headerSub}>Python automation · executes on your PC</Text>
          </View>
          <View style={[sem.pyBadge, { borderColor: N.amber + '60', backgroundColor: N.amber + '12' }]}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: N.green }} />
            <Text style={{ fontSize: 11, fontWeight: '900', color: N.amber, fontFamily: MONO }}>PY</Text>
          </View>
        </View>
        <View style={sem.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity key={t.id}
              style={[sem.tabBtn, tab === t.id && { borderBottomWidth: 2.5, borderBottomColor: t.color, backgroundColor: t.color + '10' }]}
              onPress={() => { haptics.light(); setTab(t.id as ModalTab); }}
              activeOpacity={0.8}>
              <MaterialIcons name={t.icon as any} size={12} color={tab === t.id ? t.color : N.textDim} />
              <Text style={[sem.tabTxt, tab === t.id && { color: t.color }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {tab === 'write' ? (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View>
                <Text style={sem.label}>SCRIPT NAME</Text>
                <TextInput style={sem.input} value={name} onChangeText={setName} placeholder="e.g. System Snapshot" placeholderTextColor={N.textDim} autoCapitalize="words" maxLength={40} />
              </View>
              <View>
                <Text style={sem.label}>CATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {CATS.map(cat => (
                    <TouchableOpacity key={cat} style={[sem.catChip, category === cat && { borderColor: N.blue, backgroundColor: N.blue + '18' }]} onPress={() => setCategory(cat)}>
                      <Text style={[sem.catChipTxt, category === cat && { color: N.blue }]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {safetyReport ? (
                <MaliciousScriptBlocker report={safetyReport} onDismiss={() => setSafetyReport(null)}
                  onForce={!safetyReport.executionBlocked ? () => { if (code.trim()) onExecute(name.trim() || 'Custom Script', code); setSafetyReport(null); } : undefined} />
              ) : (
                code.trim().length > 10 ? (
                  <View style={[sem.safetyBox, { borderColor: N.green + '40', backgroundColor: N.green + '08' }]}>
                    <MaterialIcons name="verified" size={14} color={N.green} />
                    <Text style={{ flex: 1, fontSize: 11, color: N.green, fontFamily: MONO }}>✓ All security checks passed</Text>
                  </View>
                ) : null
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { label: 'IMPORT .PY', color: N.teal, onPress: handleImport },
                  { label: showHighlight ? 'RAW' : 'SYNTAX', color: N.purple, onPress: () => setShowHighlight(v => !v) },
                  { label: 'UNDO', color: N.amber, onPress: () => { const p = undoStack.pop(); if (p !== null) setCode(p); } },
                ].map(({ label, color, onPress }) => (
                  <TouchableOpacity key={label} onPress={onPress} style={[sem.actionBtn, { borderColor: color + '50', backgroundColor: color + '10' }]} activeOpacity={0.8}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color, fontFamily: MONO }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {['import os', 'import sys', 'import json', 'import time', 'import socket', 'from pathlib import Path', 'import psutil'].map(h => (
                  <TouchableOpacity key={h} style={sem.insertChip} onPress={() => setCode(p => p ? p + '\n' + h : h)}>
                    <Text style={sem.insertChipTxt}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={sem.codeWrap}>
                <View style={sem.codeHeader}>
                  {['#FF5F57','#FEBC2E','#28C840'].map((c,i)=><View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} />)}
                  <Text style={sem.codeFilename}>script.py</Text>
                  <Text style={sem.codeStats}>{code.split('\n').length} lines</Text>
                  <TouchableOpacity onPress={() => setCode('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <MaterialIcons name="delete-outline" size={14} color={N.textDim} />
                  </TouchableOpacity>
                </View>
                {showHighlight && code.trim() ? (
                  <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}><SyntaxHighlight code={code} /></ScrollView>
                ) : (
                  <TextInput style={sem.codeInput} value={code} onChangeText={handleCodeChange}
                    multiline autoCapitalize="none" autoCorrect={false} spellCheck={false}
                    placeholder={'# Write your Python script here\nimport platform\nprint(platform.system())'}
                    placeholderTextColor={N.textDim} textAlignVertical="top" />
                )}
              </View>
            </ScrollView>
            <View style={[sem.footer, { paddingBottom: Math.max(insets.bottom + 6, 14) }]}>
              <TouchableOpacity style={[sem.saveBtn, saving && { opacity: 0.5 }, { backgroundColor: N.amber }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator size="small" color="#000" /> : <MaterialIcons name="save" size={16} color="#000" />}
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#000', fontFamily: MONO }}>{saving ? 'SAVING...' : editScript ? 'UPDATE' : 'SAVE'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[sem.saveBtn, !code.trim() && { opacity: 0.4 }, { backgroundColor: N.blue }]} onPress={() => { if (code.trim()) onExecute(name.trim() || 'Custom Script', code); }} disabled={!code.trim()} activeOpacity={0.85}>
                <MaterialIcons name="play-arrow" size={18} color="#000" />
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#000', fontFamily: MONO }}>RUN NOW</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        ) : null}
        {tab === 'templates' ? (
          <View style={{ flex: 1 }}>
            <View style={{ padding: 14, gap: 10 }}>
              <View style={[sem.searchRow, { borderColor: N.amber + '50' }]}>
                <MaterialIcons name="search" size={14} color={tmplSearch ? N.amber : N.textDim} />
                <TextInput style={sem.searchInput} value={tmplSearch} onChangeText={setTmplSearch} placeholder="Search templates..." placeholderTextColor={N.textDim} autoCapitalize="none" autoCorrect={false} />
                {tmplSearch ? <TouchableOpacity onPress={() => setTmplSearch('')}><MaterialIcons name="close" size={12} color={N.textDim} /></TouchableOpacity> : null}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {TEMPLATE_CATEGORIES.map(cat => (
                  <TouchableOpacity key={cat} style={[sem.catChip, tmplCat === cat && { borderColor: N.amber, backgroundColor: N.amber + '18' }]} onPress={() => setTmplCat(cat)}>
                    <Text style={[sem.catChipTxt, tmplCat === cat && { color: N.amber }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <FlatList data={filteredTmpls} keyExtractor={t => t.id}
              contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: t }) => (
                <TouchableOpacity style={[sem.tmplCard, { borderLeftColor: t.color }]}
                  onPress={() => { setCode(t.code); setName(t.title); setCategory(t.cat); setTab('write'); haptics.success(); }}
                  activeOpacity={0.85}>
                  <View style={[sem.tmplIcon, { backgroundColor: t.color + '18', borderColor: t.color + '40' }]}>
                    <MaterialIcons name={t.icon as any} size={18} color={t.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[sem.tmplTitle, { color: t.color }]} numberOfLines={1}>{t.title}</Text>
                    <Text style={sem.tmplDesc} numberOfLines={2}>{t.desc}</Text>
                  </View>
                  <TouchableOpacity style={[sem.catChip, { borderColor: t.color, backgroundColor: t.color + '18', alignSelf: 'center' }]}
                    onPress={() => { if (!seqSlots.find(s => s.id === t.id)) setSeqSlots(p => [...p, t]); haptics.light(); }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: t.color, fontFamily: MONO }}>CHAIN</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 40, gap: 10 }}><MaterialIcons name="code-off" size={44} color={N.textDim} /><Text style={{ color: N.textDim, fontFamily: MONO }}>No templates match</Text></View>}
            />
          </View>
        ) : null}
        {tab === 'sequence' ? (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
            <NexusSectionTitle main="SCRIPT " accent="CHAIN" accentColor={N.purple} />
            <Text style={{ fontSize: 12, color: N.textDim, marginBottom: 8 }}>Chain scripts — they execute in order on your PC</Text>
            {seqSlots.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
                <MaterialIcons name="playlist-add" size={44} color={N.textDim} />
                <Text style={{ fontSize: 13, color: N.textDim, fontFamily: MONO, textAlign: 'center' }}>{'Go to TEMPLATES tab\nand tap CHAIN to add scripts'}</Text>
              </View>
            ) : seqSlots.map((s, i) => (
              <View key={s.id + i} style={[sem.tmplCard, { borderLeftColor: s.color }]}>
                <View style={[sem.tmplIcon, { backgroundColor: s.color + '18', borderColor: s.color + '40', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: s.color, fontFamily: MONO }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}><Text style={sem.tmplTitle} numberOfLines={1}>{s.title}</Text><Text style={sem.tmplDesc}>{s.desc}</Text></View>
                <TouchableOpacity onPress={() => setSeqSlots(p => p.filter((_,j) => j !== i))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="remove-circle-outline" size={18} color={N.red} />
                </TouchableOpacity>
              </View>
            ))}
            {seqSlots.length > 0 ? (
              <TouchableOpacity style={{ backgroundColor: N.purple, borderRadius: 12, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                onPress={() => {
                  const combined = seqSlots.map((s, i) => `# STEP ${i+1}: ${s.title.toUpperCase()}\n${s.code}`).join('\n\nimport time as _t; _t.sleep(0.2)\n\n');
                  setCode(`# NEXUS SEQUENCER — ${seqSlots.length} steps\n\n` + combined);
                  setName(`Sequence: ${seqSlots.map(s => s.title.split(' ')[0]).join(' > ')}`);
                  setTab('write'); haptics.success();
                }}>
                <MaterialIcons name="merge-type" size={18} color="#000" />
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#000', fontFamily: MONO }}>BUILD SEQUENCE</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        ) : null}
        {tab === 'ai' ? (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <NexusSectionTitle main="AI SCRIPT " accent="GENERATOR" accentColor={N.green} />
              <View style={{ backgroundColor: N.green + '10', borderRadius: 10, borderWidth: 1, borderColor: N.green + '30', padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <MaterialIcons name="info-outline" size={16} color={N.green} style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 12, color: N.textMid, lineHeight: 18 }}>{'Powered by your local Ollama AI model.\nRequires connected PC server.'}</Text>
              </View>
              <Text style={sem.label}>QUICK PROMPTS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {['monitor CPU every 5s', 'find large files over 100MB', 'scan open ports', 'batch rename files', 'compress folder to zip', 'extract webpage links'].map(p => (
                  <TouchableOpacity key={p} style={[sem.catChip, { borderColor: N.green + '40', backgroundColor: N.green + '08' }]} onPress={() => setAiPrompt(p)}>
                    <Text style={{ fontSize: 10, color: N.green + 'CC', fontFamily: MONO }}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={sem.label}>DESCRIBE YOUR SCRIPT</Text>
              <TextInput style={[sem.codeInput, { minHeight: 100, borderWidth: 1.5, borderColor: N.green + '40', borderRadius: 10, backgroundColor: N.surface, fontSize: 13 }]}
                value={aiPrompt} onChangeText={setAiPrompt}
                placeholder={'e.g. monitor system temperature and alert if CPU gets too hot...'}
                placeholderTextColor={N.textDim} multiline autoCapitalize="none" autoCorrect={false} textAlignVertical="top" />
              <TouchableOpacity style={[sem.saveBtn, { backgroundColor: N.green }, (!aiPrompt.trim() || aiLoading) && { opacity: 0.45 }]}
                onPress={handleAskAI} disabled={!aiPrompt.trim() || aiLoading}>
                {aiLoading ? <ActivityIndicator size="small" color="#000" /> : <MaterialIcons name="auto-awesome" size={16} color="#000" />}
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#000', fontFamily: MONO }}>{aiLoading ? 'GENERATING...' : 'GENERATE'}</Text>
              </TouchableOpacity>
              {aiError ? (
                <View style={{ backgroundColor: N.red + '12', borderRadius: 10, borderWidth: 1, borderColor: N.red + '30', padding: 12, flexDirection: 'row', gap: 8 }}>
                  <MaterialIcons name="error-outline" size={14} color={N.red} />
                  <Text style={{ flex: 1, fontSize: 12, color: N.red, fontFamily: MONO }}>{aiError}</Text>
                </View>
              ) : null}
              {aiResult ? (
                <View style={{ backgroundColor: N.green + '08', borderRadius: 10, borderWidth: 1, borderColor: N.green + '30', overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: N.green + '20' }}>
                    <MaterialIcons name="check-circle" size={14} color={N.green} />
                    <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: N.green, fontFamily: MONO }}>SCRIPT GENERATED</Text>
                    <TouchableOpacity style={{ borderWidth: 1.5, borderColor: N.blue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: N.blue + '18' }}
                      onPress={() => { setCode(aiResult); setTab('write'); haptics.success(); }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: N.blue, fontFamily: MONO }}>USE THIS</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled showsVerticalScrollIndicator={false}><SyntaxHighlight code={aiResult} /></ScrollView>
                </View>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        ) : null}
      </View>
    </Modal>
  );
}
const sem = StyleSheet.create({
  header:     { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: N.surface, borderBottomWidth: 1, borderBottomColor: N.border },
  headerTitle:{ fontSize: 22, fontWeight: '900', color: N.text, fontFamily: MONO },
  headerSub:  { fontSize: 11, color: N.textDim, marginTop: 2 },
  pyBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, flexShrink: 0 },
  tabBar:     { flexDirection: 'row', backgroundColor: N.surface, borderBottomWidth: 1, borderBottomColor: N.border },
  tabBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabTxt:     { fontSize: 10, fontWeight: '700', color: N.textDim, fontFamily: MONO, letterSpacing: 0.5 },
  label:      { fontSize: 10, fontWeight: '700', color: N.textDim, fontFamily: MONO, letterSpacing: 1, marginBottom: 6 },
  input:      { backgroundColor: N.surface, borderWidth: 1.5, borderColor: N.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, color: N.text, fontSize: 15, fontFamily: MONO },
  safetyBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  catChip:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: N.border },
  catChipTxt: { fontSize: 11, fontWeight: '600', color: N.textDim, fontFamily: MONO },
  actionBtn:  { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 8, paddingVertical: 9 },
  insertChip: { borderWidth: 1, borderColor: N.blue + '40', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: N.blue + '08' },
  insertChipTxt: { fontSize: 10, color: N.blue + 'CC', fontFamily: MONO },
  codeWrap:   { backgroundColor: N.surfaceHi, borderRadius: 12, borderWidth: 1, borderColor: N.border, overflow: 'hidden' },
  codeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: N.border },
  codeFilename:{ flex: 1, fontSize: 11, color: N.textDim, fontFamily: MONO, textAlign: 'center' },
  codeStats:  { fontSize: 10, color: N.textDim, fontFamily: MONO },
  codeInput:  { padding: 14, fontSize: 13, color: N.text, fontFamily: MONO, minHeight: 260, lineHeight: 20 },
  footer:     { paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', gap: 10, backgroundColor: N.surface, borderTopWidth: 1, borderTopColor: N.border },
  saveBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  searchRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: N.surface, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput:{ flex: 1, fontSize: 13, color: N.text, fontFamily: MONO },
  tmplCard:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderLeftWidth: 3, borderColor: N.border, padding: 12, marginBottom: 8 },
  tmplIcon:   { width: 42, height: 42, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tmplTitle:  { fontSize: 13, fontWeight: '700', fontFamily: MONO, color: N.text, marginBottom: 3 },
  tmplDesc:   { fontSize: 11, color: N.textDim, lineHeight: 15 },
});

// ─── DETAIL MODAL ────────────────────────────────────────────────
function DetailModal({ visible, title, description, code, requirements, category, executing, onClose, onExecute }: {
  visible: boolean; title: string; description: string; code: string;
  requirements?: string[]; category: string; executing: boolean;
  onClose: () => void; onExecute: () => void;
}) {
  const insets = useSafeAreaInsets();
  const col = CAT_COLOR[category] || N.blue;
  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: N.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 3, borderTopColor: col, maxHeight: '90%', overflow: 'hidden', paddingBottom: Math.max(insets.bottom + 8, 16) }}>
          <View style={{ width: 36, height: 4, backgroundColor: N.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 14 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: N.border }}>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={[nfc.chip, { borderColor: col + '60', backgroundColor: col + '15', alignSelf: 'flex-start' }]}>
                <Text style={[nfc.label, { color: col, fontSize: 9 }]}>{category.toUpperCase()}</Text>
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: N.text, fontFamily: MONO }} numberOfLines={2}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: N.surfaceHi, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="close" size={16} color={N.textDim} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: '70%' }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 13, color: N.textMid, lineHeight: 20, marginBottom: 16 }}>{description}</Text>
            {requirements && requirements.length > 0 ? (
              <View style={{ backgroundColor: N.amber + '10', borderRadius: 10, borderWidth: 1, borderColor: N.amber + '30', padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <MaterialIcons name="download" size={14} color={N.amber} style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 12, color: N.amber, fontFamily: MONO }}>pip install {requirements.join(' ')}</Text>
              </View>
            ) : null}
            <View style={{ backgroundColor: N.bg, borderRadius: 10, borderWidth: 1, borderColor: N.border, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: N.border }}>
                {['#FF5F57','#FEBC2E','#28C840'].map((c,i)=><View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />)}
                <Text style={{ flex: 1, fontSize: 10, color: N.textDim, fontFamily: MONO, textAlign: 'center' }}>script.py</Text>
                <TouchableOpacity onPress={() => copyCode(code)}><Text style={{ fontSize: 10, color: N.blue, fontFamily: MONO }}>COPY</Text></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}><Text style={{ fontSize: 12, color: N.textMid, fontFamily: MONO, lineHeight: 18, padding: 14 }} selectable>{code}</Text></ScrollView>
            </View>
          </ScrollView>
          <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: col, borderRadius: 12, paddingVertical: 15, opacity: executing ? 0.5 : 1 }}
              onPress={onExecute} disabled={executing} activeOpacity={0.85}>
              {executing ? <ActivityIndicator color="#000" size="small" /> : <MaterialIcons name="play-arrow" size={20} color="#000" />}
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#000', fontFamily: MONO }}>{executing ? 'EXECUTING...' : 'RUN ON PC'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── HISTORY MODAL ────────────────────────────────────────────────
function HistoryModal({ visible, entries, onClose, onClear }: { visible: boolean; entries: HistoryEntry[]; onClose: () => void; onClear: () => void; }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: N.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', overflow: 'hidden', paddingBottom: Math.max(insets.bottom + 8, 16) }}>
          <View style={{ width: 36, height: 4, backgroundColor: N.border, borderRadius: 2, alignSelf: 'center', marginTop: 10 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: N.border }}>
            <Text style={{ flex: 1, fontSize: 20, fontWeight: '900', color: N.text, fontFamily: MONO }}>ACTIVITY <Text style={{ color: N.blue }}>LOGS</Text></Text>
            <Text style={{ fontSize: 12, color: N.textDim, fontFamily: MONO, marginRight: 14 }}>{entries.length} entries</Text>
            <TouchableOpacity onPress={onClear} style={{ backgroundColor: N.red + '20', borderRadius: 8, borderWidth: 1, borderColor: N.red + '60', paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <MaterialIcons name="delete-sweep" size={13} color={N.red} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: N.red, fontFamily: MONO }}>CLEAR</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ marginLeft: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: N.surfaceHi, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="close" size={16} color={N.textDim} />
            </TouchableOpacity>
          </View>
          {entries.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
              <MaterialIcons name="history" size={44} color={N.textDim} />
              <Text style={{ fontSize: 14, color: N.textDim, fontFamily: MONO }}>No entries yet</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              {entries.map((entry, i) => {
                const col = entry.success ? N.green : N.red;
                return (
                  <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: i < entries.length - 1 ? 1 : 0, borderBottomColor: N.border }}>
                    <View style={{ width: 3, alignSelf: 'stretch', backgroundColor: col, borderRadius: 2, flexShrink: 0, marginTop: 2 }} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: N.text, fontFamily: MONO }} numberOfLines={1}>{entry.scriptName}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[nfc.chip, { borderColor: col + '50', backgroundColor: col + '15', paddingHorizontal: 8, paddingVertical: 3 }]}>
                          <Text style={[nfc.label, { color: col, fontSize: 9 }]}>{entry.success ? 'SUCCESS' : 'FAILED'}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: N.textDim, fontFamily: MONO }}>{entry.ms >= 1000 ? `${(entry.ms/1000).toFixed(1)}s` : `${entry.ms}ms`}</Text>
                        <Text style={{ fontSize: 10, color: N.textDim, fontFamily: MONO }}>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                      {entry.error ? <Text style={{ fontSize: 10, color: N.red + 'CC', fontFamily: MONO }} numberOfLines={1}>{entry.error.slice(0, 60)}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── FAVORITES SECTION ────────────────────────────────────────────
const SWIPE_THRESHOLD = -70;
const DRAG_ACTIVATE_MS = 400;

function FavoriteCard({ fav, isRunning, onRun, onUnfav, onDragStart }: {
  fav: FavoriteScript; isRunning: boolean; onRun: () => void; onUnfav: () => void; onDragStart: () => void;
}) {
  const col       = CAT_COLOR[fav.category] || N.blue;
  const swipeX    = useRef(new Animated.Value(0)).current;
  const runScale  = useRef(new Animated.Value(1)).current;
  const glowOp    = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const isSwipedRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const relativeTime = (ts?: number) => {
    if (!ts) return 'never';
    const diffMs = Date.now() - ts;
    const m = Math.floor(diffMs / 60000); const h = Math.floor(m / 60); const d = Math.floor(h / 24);
    if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; if (h < 24) return `${h}h ago`; return `${d}d ago`;
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => { swipeX.setValue(Math.max(SWIPE_THRESHOLD * 1.4, Math.min(0, g.dx))); },
      onPanResponderRelease: (_, g) => {
        if (g.dx < SWIPE_THRESHOLD) {
          Animated.spring(swipeX, { toValue: SWIPE_THRESHOLD, tension: 200, friction: 14, useNativeDriver: false }).start();
          isSwipedRef.current = true;
        } else {
          Animated.spring(swipeX, { toValue: 0, tension: 220, friction: 14, useNativeDriver: false }).start();
          isSwipedRef.current = false;
        }
      },
    })
  ).current;

  const handleRun = () => {
    if (isSwipedRef.current) {
      Animated.spring(swipeX, { toValue: 0, tension: 220, friction: 14, useNativeDriver: false }).start();
      isSwipedRef.current = false; return;
    }
    haptics.medium();
    Animated.sequence([
      Animated.timing(runScale, { toValue: 0.82, duration: 60, useNativeDriver: true }),
      Animated.spring(runScale, { toValue: 1, tension: 300, friction: 7, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(glowOp, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(glowOp, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    onRun();
  };

  const handleLongPressIn = () => {
    longPressTimer.current = setTimeout(() => {
      haptics.heavy();
      Animated.spring(cardScale, { toValue: 1.03, tension: 200, friction: 10, useNativeDriver: true }).start();
      onDragStart();
    }, DRAG_ACTIVATE_MS);
  };

  const handlePressOut = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    Animated.spring(cardScale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();
  };

  const unfavBg = swipeX.interpolate({ inputRange: [SWIPE_THRESHOLD, 0], outputRange: [N.red + 'FF', N.red + '00'], extrapolate: 'clamp' });

  return (
    <View style={{ marginBottom: 10, position: 'relative', overflow: 'hidden', borderRadius: 14 }}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 14, backgroundColor: unfavBg, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 16 }]}>
        <TouchableOpacity onPress={() => { haptics.heavy(); onUnfav(); }} style={favc.unfavBtn} activeOpacity={0.8}>
          <MaterialIcons name="heart-broken" size={14} color="#FFF" />
          <Text style={favc.unfavTxt}>UNFAV</Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: swipeX }, { scale: cardScale }] }} {...panResponder.panHandlers}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 14, backgroundColor: col, opacity: glowOp, zIndex: 20 }]} />
        <View style={[favc.card, { borderColor: col + '40', borderTopColor: col }]}>
          <View style={[favc.leftStrip, { backgroundColor: col }]} />
          <TouchableOpacity onPressIn={handleLongPressIn} onPressOut={handlePressOut} activeOpacity={1} style={favc.dragHandle} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
            <MaterialIcons name="drag-indicator" size={18} color={N.textDim + '80'} />
          </TouchableOpacity>
          <View style={{ flex: 1, paddingVertical: 12 }}>
            <View style={favc.titleRow}>
              <MaterialIcons name="star" size={11} color={N.yellow} />
              <Text style={favc.title} numberOfLines={1}>{fav.title}</Text>
              {fav.runCount > 0 ? <View style={[favc.countBadge, { backgroundColor: col + 'CC' }]}><Text style={favc.countBadgeTxt}>×{fav.runCount}</Text></View> : null}
            </View>
            <Text style={favc.desc} numberOfLines={1}>{fav.description}</Text>
            <View style={favc.metaRow}>
              <View style={[favc.catChip, { borderColor: col + '50', backgroundColor: col + '12' }]}>
                <CategoryIcon category={fav.category} size={9} color={col} />
                <Text style={[favc.catTxt, { color: col }]}>{fav.category.toUpperCase()}</Text>
              </View>
              <View style={favc.timeBit}>
                <MaterialIcons name={fav.lastRunAt ? 'access-time' : 'radio-button-unchecked'} size={9} color={N.textDim} />
                <Text style={favc.timeTxt}>{relativeTime(fav.lastRunAt)}</Text>
              </View>
              {fav.type === 'butler' ? (
                <View style={[favc.aiBadge, { borderColor: N.amber + '50', backgroundColor: N.amber + '10' }]}>
                  <MaterialIcons name="auto-awesome" size={8} color={N.amber} />
                  <Text style={[favc.catTxt, { color: N.amber }]}>AI</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Animated.View style={[{ transform: [{ scale: runScale }] }, favc.runWrap]}>
            <TouchableOpacity onPress={handleRun} disabled={isRunning}
              style={[favc.runBtn, { backgroundColor: isRunning ? col + '30' : col, ...Platform.select({ ios: { shadowColor: col, shadowOffset:{width:0,height:3}, shadowOpacity:0.6, shadowRadius:10 }, android: { elevation: 6 } }) }]}
              activeOpacity={0.85}>
              {isRunning ? <ActivityIndicator size="small" color={col} style={{ width: 20, height: 20 }} /> : <MaterialIcons name="play-arrow" size={22} color={isRunning ? col : '#000'} />}
            </TouchableOpacity>
            <Text style={[favc.runLabel, { color: col }]}>{isRunning ? 'RUN...' : 'RUN'}</Text>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}
const favc = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'center', backgroundColor: N.surface, borderRadius: 14, borderWidth: 1.5, borderTopWidth: 3, overflow: 'hidden', minHeight: 82,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:10 }, android: { elevation: 5 } }) },
  leftStrip: { width: 4, alignSelf: 'stretch', flexShrink: 0 },
  dragHandle:{ width: 28, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  titleRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  title:     { flex: 1, fontSize: 14, fontWeight: '700', color: N.text, fontFamily: MONO, letterSpacing: 0.1 },
  countBadge:{ borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
  countBadgeTxt:{ fontSize: 8.5, fontWeight: '900', color: '#000', fontFamily: MONO },
  desc:      { fontSize: 11, color: N.textDim, lineHeight: 15, marginBottom: 6 },
  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catChip:   { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  catTxt:    { fontSize: 8, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.3 },
  aiBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  timeBit:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeTxt:   { fontSize: 9, color: N.textDim, fontFamily: MONO },
  runWrap:   { paddingRight: 12, paddingLeft: 4, alignItems: 'center', gap: 3, flexShrink: 0 },
  runBtn:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  runLabel:  { fontSize: 7.5, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  unfavBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: N.red, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  unfavTxt:  { fontSize: 9, fontWeight: '900', color: '#FFF', fontFamily: MONO, letterSpacing: 0.5 },
});

function FavoritesView({ favorites, runningId, onRun, onUnfav, onReorder, isConnected }: {
  favorites: FavoriteScript[]; runningId: string | null;
  onRun: (fav: FavoriteScript) => void; onUnfav: (id: string) => void;
  onReorder: (newOrder: string[]) => void; isConnected: boolean;
}) {
  const [items, setItems] = useState<FavoriteScript[]>(favorites);
  useEffect(() => { setItems(favorites); }, [favorites]);

  const startDrag = (id: string, fromIndex: number) => {
    haptics.medium();
    const newItems = [...items];
    const newIndex = fromIndex > 0 ? fromIndex - 1 : items.length - 1;
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(newIndex, 0, moved);
    setItems(newItems);
    onReorder(newItems.map(i => i.id));
  };

  if (items.length === 0) {
    return (
      <View style={fvs.empty}>
        <View style={fvs.emptyIconWrap}><MaterialIcons name="star-border" size={40} color={N.textDim} /></View>
        <Text style={fvs.emptyTitle}>NO FAVORITES YET</Text>
        <Text style={fvs.emptySub}>{"Tap ★ on any script to add it here.\nFavorites run with one tap — always at hand."}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 210, paddingTop: 6 }} showsVerticalScrollIndicator={false}>
      <InlineWidgetSlot pageId="scripts" position="inline-top" />
      <View style={fvs.statsRow}>
        <View style={fvs.statPill}><MaterialIcons name="star" size={10} color={N.yellow} /><Text style={fvs.statTxt}>{items.length} saved</Text></View>
        <View style={fvs.statPill}><MaterialIcons name="play-circle-outline" size={10} color={N.blue} /><Text style={fvs.statTxt}>{items.reduce((s, f) => s + f.runCount, 0)} total runs</Text></View>
        <Text style={fvs.hintTxt}>Hold ≡ to move up · swipe left to remove</Text>
      </View>
      {items.map((fav, index) => (
        <FavoriteCard key={fav.id} fav={fav} isRunning={runningId === fav.id} onRun={() => onRun(fav)} onUnfav={() => onUnfav(fav.id)} onDragStart={() => startDrag(fav.id, index)} />
      ))}
    </ScrollView>
  );
}
const fvs = StyleSheet.create({
  empty:       { alignItems: 'center', paddingVertical: 60, gap: 14, paddingHorizontal: 24 },
  emptyIconWrap:{ width: 80, height: 80, borderRadius: 20, borderWidth: 2, borderColor: N.textDim + '30', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptyTitle:  { fontSize: 14, fontWeight: '900', color: N.textDim, fontFamily: MONO, letterSpacing: 1 },
  emptySub:    { fontSize: 12, color: N.textDim, fontFamily: MONO, textAlign: 'center', lineHeight: 18 },
  statsRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  statPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: N.surfaceHi, borderWidth: 1, borderColor: N.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  statTxt:     { fontSize: 10, color: N.textMid, fontFamily: MONO, fontWeight: '600' },
  hintTxt:     { flex: 1, fontSize: 9, color: N.textDim, fontFamily: MONO, textAlign: 'right', lineHeight: 14 },
});

// ─── DISPATCH TOAST ──────────────────────────────────────────────
function DispatchToast({ name, visible, onHide }: { name: string; visible: boolean; onHide: () => void }) {
  const slideY = useRef(new Animated.Value(80)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 120, friction: 8, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      const t = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideY, { toValue: 80, duration: 280, useNativeDriver: true }),
          Animated.timing(op, { toValue: 0, duration: 280, useNativeDriver: true }),
        ]).start(() => onHide());
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [visible]);
  if (!visible) return null;
  return (
    <Animated.View style={[toast.wrap, { transform: [{ translateY: slideY }], opacity: op }]}>
      <View style={toast.dot} />
      <View style={{ flex: 1 }}>
        <Text style={toast.label}>EXECUTING ON SERVER</Text>
        <Text style={toast.name} numberOfLines={1}>{name}</Text>
      </View>
      <ActivityIndicator size="small" color={N.blue} style={{ transform: [{ scale: 0.7 }] }} />
    </Animated.View>
  );
}
const toast = StyleSheet.create({
  wrap:  { position: 'absolute', bottom: 90, left: 16, right: 16, zIndex: 999, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderColor: N.blue + '50', paddingVertical: 12, paddingHorizontal: 14, ...Platform.select({ ios: { shadowColor: N.blue, shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:12 }, android:{elevation:14} }) },
  dot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: N.blue, flexShrink: 0 },
  label: { fontSize: 9, fontWeight: '700', color: N.blue, fontFamily: MONO, letterSpacing: 0.5 },
  name:  { fontSize: 12, fontWeight: '700', color: N.text, fontFamily: MONO, marginTop: 1 },
});

// ─── MAIN SCREEN ─────────────────────────────────────────────────
export default function ScriptsScreen() {
  const insets = useSafeAreaInsets();
  const { T } = useCosmetic();
  // Wire cosmetic theme — primary color flows into key accent elements
  const PR = T.primary || N.blue;
  const [viewMode, setViewMode]             = useState<ViewMode>('scripts');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery]       = useState('');
  const [libSearch, setLibSearch]           = useState('');
  const [libResults, setLibResults]         = useState<SearchHit[]>([]);
  const [isConnected, setIsConnected]       = useState(false);
  const [serverAddr, setServerAddr]         = useState('');
  const [butlerScripts, setButlerScripts]   = useState<ButlerScript[]>([]);
  const [executing, setExecuting]           = useState(false);
  const [showEditor, setShowEditor]         = useState(false);
  const [editingScript, setEditingScript]   = useState<ButlerScript | null>(null);
  const [runningCardId, setRunningCardId]   = useState<string | null>(null);
  const [dispatchToast, setDispatchToast]   = useState({ name: '', visible: false });
  const [runCounts, setRunCounts]           = useState<Record<string, number>>({});
  const [showHistory, setShowHistory]       = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [execResult, setExecResult]         = useState<{
    visible: boolean; scriptName: string; running: boolean;
    success: boolean | null; output: string; error: string; ms: number | null; scriptCode: string;
    undoId?: number; undoAvailable?: boolean; undoExpiresSec?: number;
  }>({ visible: false, scriptName: '', running: false, success: null, output: '', error: '', ms: null, scriptCode: '' });
  const [liveLines, setLiveLines]           = useState<string[]>([]);
  const [execPct, setExecPct]               = useState(0);
  const [detailScript, setDetailScript]     = useState<AutomationScript | null>(null);
  const [detailButler, setDetailButler]     = useState<ButlerScript | null>(null);
  const [libServerOk, setLibServerOk]       = useState<boolean | null>(null);
  const [pinnedIds, setPinnedIds]           = useState<Set<string>>(new Set());
  const [previewScript, setPreviewScript]   = useState<{ title: string; code: string; desc?: string; cat?: string } | null>(null);
  const [favorites,     setFavorites]       = useState<FavoriteScript[]>([]);
  const [favIds,        setFavIds]          = useState<Set<string>>(new Set());
  const [favRunningId,  setFavRunningId]    = useState<string | null>(null);
  const [isRefreshing,  setIsRefreshing]    = useState(false);
  const [serverScripts, setServerScripts]   = useState<Record<string,{title:string;icon:string;color:string;scripts:{id:string;name:string;desc:string;difficulty:string}[]}> | null>(null);
  const [serverLibLoading, setServerLibLoading] = useState(false);
  const [buildModalVisible, setBuildModalVisible] = useState(false);
  const [buildDesc, setBuildDesc] = useState('');
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildResult, setBuildResult] = useState<{code:string;desc:string;source?:'library'|'kb'|'generated'}|null>(null);
  const [catDetailModal, setCatDetailModal] = useState<CategoryDef | null>(null);
  // PC Library state
  const [pcLibScripts,    setPcLibScripts]    = useState<any[]>([]);
  const [pcLibLoading,    setPcLibLoading]    = useState(false);
  const [pcLibError,      setPcLibError]      = useState('');
  const [pcLibSearch,     setPcLibSearch]     = useState('');
  const [pcLibRunning,    setPcLibRunning]    = useState<string | null>(null);
  const [pcLibOutput,     setPcLibOutput]     = useState<{id:string;out:string;ok:boolean}|null>(null);

  // ─── GLOBAL HOOK — homepage AI Builder shortcut triggers this ────
  useEffect(() => {
    (global as any).__scriptsOpenAIBuilder = () => {
      setBuildResult(null);
      setBuildDesc('');
      setBuildModalVisible(true);
    };
    return () => { delete (global as any).__scriptsOpenAIBuilder; };
  }, []);

  const isAppActive = useAppActive();
  const connRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const butlerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const engineUnsubRef = useRef<(() => void) | null>(null);
  const connDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchServerLibrary = useCallback(async () => {
    const ip = serverConnection.getIP(); const port = serverConnection.getPort();
    if (!ip || !port) return;
    const cached = await getCachedServerLib();
    if (cached) setServerScripts(cached);
    setServerLibLoading(true);
    try {
      const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 8000);
      // Try both endpoints
      for (const ep of ['/api/scripts/library', '/api/scripts/list']) {
        try {
          const res = await fetch(`http://${ip}:${port}${ep}`, { signal: ctrl.signal });
          if (res.ok) {
            const d = await res.json();
            const cats = d.categories ?? d;
            if (cats && typeof cats === 'object' && Object.keys(cats).length > 0) {
              setServerScripts(cats);
              setCachedServerLib(cats);
              break;
            }
          }
        } catch {}
      }
    } catch {} finally { setServerLibLoading(false); }
  }, []);

  useEffect(() => {
    if (isConnected) fetchServerLibrary();
  }, [isConnected, fetchServerLibrary]);

  const runServerScript = useCallback(async (scriptId: string, scriptName: string) => {
    const ip = serverConnection.getIP(); const port = serverConnection.getPort(); const token = serverConnection.getToken();
    if (!ip || !port) { Alert.alert('Not connected', 'Connect your PC from the HOME tab first.'); return; }
    haptics.heavy();
    setExecResult({ visible: true, scriptName, running: true, success: null, output: '', error: '', ms: null, scriptCode: scriptId });
    setLiveLines(['Fetching script from server...']); setExecPct(10);
    let simPct = 10;
    const simTimer = setInterval(() => { simPct = Math.min(60, simPct + Math.random() * 8 + 1); setExecPct(Math.round(simPct)); }, 600);
    try {
      const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 120000);
      const res = await fetch(`http://${ip}:${port}/api/scripts/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ id: scriptId }), signal: ctrl.signal,
      });
      const data = await res.json();
      clearInterval(simTimer);
      if (data.generated && data.script) {
        setExecPct(80);
        setLiveLines([`✓ AI generated script for: ${scriptName}`, 'Review the code below, then tap RUN to execute on your PC']);
        setTimeout(() => {
          setExecResult(prev => ({ ...prev, running: false, success: null, output: `// AI-GENERATED SCRIPT: ${scriptName}\n\n` + data.script, error: '', ms: null }));
          const genScript: any = { id: 'generated_' + scriptId, title: scriptName, description: data.description || 'AI-generated script', script: data.script, category: 'AI Generated', tags: [], createdAt: new Date().toISOString() };
          setEditingScript(genScript); setShowEditor(true);
        }, 500);
        return;
      }
      setExecPct(100);
      const out = data.output || '';
      const hasErr = out.toLowerCase().includes('traceback') || out.toLowerCase().includes('error:');
      setExecResult(prev => ({ ...prev, running: false, success: !hasErr && !data.error, output: hasErr ? '' : out, error: hasErr ? out : (data.error || ''), ms: data.ms ?? null, undoId: data.undoId, undoExpiresSec: data.undoAvailable ? 900 : undefined }));
      haptics[!hasErr ? 'success' : 'warning']();
    } catch (e: any) {
      clearInterval(simTimer);
      setExecResult(prev => ({ ...prev, running: false, success: false, error: e?.message || 'Run failed', ms: null }));
      haptics.warning();
    }
  }, []);

  const buildScriptFromAI = useCallback(async () => {
    if (!buildDesc.trim()) return;
    const ip = serverConnection.getIP(); const port = serverConnection.getPort(); const token = serverConnection.getToken();
    if (!ip || !port) { Alert.alert('Not connected', 'Connect your PC to use AI script builder.'); return; }
    setBuildLoading(true); setBuildResult(null);
    try {
      const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch(`http://${ip}:${port}/api/scripts/build`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ description: buildDesc }), signal: ctrl.signal });
      const data = await res.json();
      if (data.script) {
                if (!isValidPythonCode(data.script)) { throw new Error('AI returned prose instead of code — try a more specific prompt.'); }
                setBuildResult({ code: ensureErrorHandling(data.script), desc: buildDesc }); haptics.success();
              } else throw new Error(data.error || 'No script returned');
    } catch (e: any) { Alert.alert('Build Error', e?.message || 'AI generation failed'); haptics.warning(); }
    finally { setBuildLoading(false); }
  }, [buildDesc]);

  const fetchPCLibrary = useCallback(async (query?: string) => {
    const ip = serverConnection.getIP();
    const port = serverConnection.getPort();
    const token = serverConnection.getToken();
    if (!ip || !port) {
      // Silently do nothing when offline — hint shown in pcLibraryHeader
      setPcLibScripts([]);
      setPcLibError('');
      return;
    }
    setPcLibLoading(true); setPcLibError('');
    try {
      const path = query
        ? `/api/pc_scripts/search?q=${encodeURIComponent(query)}`
        : '/api/pc_scripts/list';
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 15_000);
      const res = await fetch(`http://${ip}:${port}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setPcLibScripts(data.scripts ?? []);
    } catch (err: any) {
      if (isConnected) {
        setPcLibError(err?.name === 'AbortError' ? 'Request timed out' : String(err?.message || err));
      }
    } finally {
      setPcLibLoading(false);
    }
  }, [isConnected]);

  const runPCScript = useCallback(async (scriptId: string, scriptName: string) => {
    const ip = serverConnection.getIP();
    const port = serverConnection.getPort();
    const token = serverConnection.getToken();
    if (!ip || !port) return;
    setPcLibRunning(scriptId); setPcLibOutput(null);
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 90_000);
      const res = await fetch(`http://${ip}:${port}/api/pc_scripts/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: scriptId }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      const out = [data.output, data.error].filter(Boolean).join('\n') || 'Done.';
      const ok = res.ok && data.success !== false;
      setPcLibOutput({ id: scriptId, out, ok });
      haptics[ok ? 'success' : 'warning']();
    } catch (err: any) {
      const msg = err?.name === 'AbortError' ? 'Timed out (90s)' : String(err?.message || err);
      setPcLibOutput({ id: scriptId, out: `Error: ${msg}`, ok: false });
      haptics.warning();
    } finally {
      setPcLibRunning(null);
    }
  }, []);

  const savePCScriptToPhone = useCallback(async (script: any) => {
    try {
      const ip = serverConnection.getIP(); const port = serverConnection.getPort();
      const token = serverConnection.getToken();
      const res = await fetch(`http://${ip}:${port}/api/pc_scripts/get?id=${script.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const code = data.script?.code || '';
      if (!code) { Alert.alert('Error', 'Could not fetch script code'); return; }
      await saveButlerScript(code);
      haptics.success();
      Alert.alert('Saved', `"${script.name}" saved to your Scripts tab.`);
    } catch (e: any) {
      Alert.alert('Error', String(e?.message || e));
    }
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      await serverConnection.load();
      const connected = serverConnection.isConnected();
      setIsConnected(connected);
      setServerAddr(connected ? `${serverConnection.getIP()}:${serverConnection.getPort()}` : '');
    } catch { setIsConnected(false); }
  }, []);

  const loadButler = useCallback(async () => {
    try { setButlerScripts(await loadButlerScripts()); } catch {}
  }, []);

  useEffect(() => {
    if (isAppActive) { if (!butlerRef.current) butlerRef.current = setInterval(loadButler, 6_000); }
    else {
      if (connRef.current) { clearInterval(connRef.current); connRef.current = null; }
      if (butlerRef.current) { clearInterval(butlerRef.current); butlerRef.current = null; }
    }
  }, [isAppActive, loadButler]);

  useEffect(() => {
    engineUnsubRef.current = autoConnectEngine.onEvent((evt) => {
      if (connDebounceRef.current) clearTimeout(connDebounceRef.current);
      // 200ms debounce: prevents rapid connect/disconnect flicker on engine state transitions
      // 'reconnecting' and 'scanning' states intentionally ignored — engine handles it
      connDebounceRef.current = setTimeout(() => {
        if (evt.status === 'connected' && evt.ip) {
          setIsConnected(true);
          setServerAddr(`${evt.ip}:${evt.port}`);
          fetchServerLibrary();
        } else if (evt.status === 'idle') {
          // Only go offline on true idle — NOT during reconnecting/scanning
          setIsConnected(false);
          setServerAddr('');
        }
      }, 200);
    });
    const seedConn = autoConnectEngine.getCurrentConnection();
    if (seedConn.connected && seedConn.ip) { setIsConnected(true); setServerAddr(`${seedConn.ip}:${seedConn.port}`); }
    serverConnection.load().then(() => { if (serverConnection.isConnected()) setIsConnected(true); }).catch(() => {});
    checkConnection(); loadButler();
    getCachedRunCounts().then(cached => { if (cached) setRunCounts(cached); });
    executionCounter.load().then(counts => { setRunCounts(counts); setCachedRunCounts(counts); });
    executionHistory.loadHistory().then(setHistoryEntries);
    errorAutoFix.invalidateCache();
    loadPinnedIds().then(ids => setPinnedIds(new Set(ids)));
    loadFavorites().then(favs => { setFavorites(favs); setFavIds(new Set(favs.map(f => f.id))); });
    butlerRef.current = setInterval(loadButler, 6_000);
    return () => {
      engineUnsubRef.current?.();
      if (connRef.current) clearInterval(connRef.current);
      if (butlerRef.current) clearInterval(butlerRef.current);
      if (connDebounceRef.current) clearTimeout(connDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (viewMode !== 'library') return;
    scriptExecutor.isServerReachable().then(setLibServerOk).catch(() => setLibServerOk(false));
  }, [viewMode]);

  useEffect(() => {
    const term = libSearch.trim().toLowerCase();
    if (!term) { setLibResults([]); return; }
    const hits: SearchHit[] = [];
    for (const hit of SEARCH_INDEX) {
      if (hit.script.name.toLowerCase().includes(term) || hit.script.desc.toLowerCase().includes(term) || hit.script.tags.some(t => t.toLowerCase().includes(term))) hits.push(hit);
    }
    hits.sort((a, b) => (b.script.name.toLowerCase().startsWith(term) ? 1 : 0) - (a.script.name.toLowerCase().startsWith(term) ? 1 : 0));
    setLibResults(hits.slice(0, 30));
  }, [libSearch]);

  const filtered = useMemo(() => PYTHON_AUTOMATION_SCRIPTS.filter(s => {
    if (activeCategory !== 'All' && activeCategory !== 'AI Generated' && s.category !== activeCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some(t => t.includes(q));
  }), [activeCategory, searchQuery]);

  const filteredButler = useMemo(() => butlerScripts.filter(s => {
    if (activeCategory !== 'All' && activeCategory !== 'AI Generated' && s.category !== activeCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some(t => t.includes(q));
  }), [butlerScripts, activeCategory, searchQuery]);

  const runScript = useCallback(async (scriptName: string, scriptCode: string, cardId?: string, scriptId?: string, category?: string) => {
    haptics.medium();
    setDetailScript(null); setDetailButler(null); setShowEditor(false); setEditingScript(null);
    if (cardId) setRunningCardId(cardId);
    setLiveLines([]); setExecPct(0);
    setExecResult({ visible: true, scriptName, running: true, success: null, output: '', error: '', ms: null, scriptCode });
    let simPct = 0;
    const timer = setInterval(() => { simPct = Math.min(78, simPct + Math.random() * 10 + 2); setExecPct(Math.round(simPct)); }, 600);
    const result = await executeOnServer(scriptCode, (line) => { setLiveLines(prev => [...prev.slice(-80), line]); setExecPct(prev => Math.min(90, prev + 5)); });
    clearInterval(timer); setExecPct(100);
    haptics[result.success ? 'success' : 'warning']();
    if (cardId) setRunningCardId(null);
    setExecResult(prev => ({ ...prev, running: false, success: result.success, output: result.output, error: result.error, ms: result.ms }));
    const updated = await executionHistory.addEntry({ scriptId: scriptId ?? cardId ?? 'custom', scriptName, category: category ?? 'Custom', success: result.success, ms: result.ms ?? 0, timestamp: new Date().toISOString(), error: result.error || undefined });
    setHistoryEntries(updated);
  }, []);

  const handleDirectRun = useCallback((scriptId: string, scriptName: string, scriptCode: string, cardId: string, category?: string) => {
    const engineConn = autoConnectEngine.getCurrentConnection();
    const trulyConnected = isConnected || engineConn.connected;
    if (!trulyConnected) { Alert.alert('OFFLINE', 'Connect to PC via HOME tab first.'); return; }
    setDispatchToast({ name: scriptName, visible: true });
    executionCounter.increment(scriptId).then(next => { setRunCounts(prev => { const updated = { ...prev, [scriptId]: next }; setCachedRunCounts(updated); return updated; }); });
    runScript(scriptName, scriptCode, cardId, scriptId, category);
  }, [isConnected, runScript]);

  // ─── navigate to category — uses inline modal, no router.push ───
  const navigateToCat = useCallback((cat: CategoryDef) => {
    haptics.light();
    setCatDetailModal(cat);
  }, []);

  const handleTogglePin = useCallback(async (id: string) => {
    await togglePinService(id); const updated = await loadPinnedIds(); setPinnedIds(new Set(updated)); haptics.success();
  }, []);

  const handleToggleFavorite = useCallback(async (script: { id: string; title: string; description: string; category: string; script: string; }, type: 'builtin' | 'butler') => {
    const nowFav = await toggleFavorite({ id: script.id, type, title: script.title, description: script.description, category: script.category, scriptCode: script.script });
    haptics[nowFav ? 'success' : 'medium']();
    invalidateFavCache();
    const updated = await loadFavorites();
    setFavorites(updated); setFavIds(new Set(updated.map(f => f.id)));
  }, []);

  const handleFavRun = useCallback(async (fav: FavoriteScript) => {
    if (!isConnected) { Alert.alert('OFFLINE', 'Connect to PC via HOME tab first.'); return; }
    setFavRunningId(fav.id);
    await recordFavoriteRun(fav.id); invalidateFavCache();
    const updated = await loadFavorites(); setFavorites(updated); setFavIds(new Set(updated.map(f => f.id)));
    await runScript(fav.title, fav.scriptCode, fav.id, fav.id, fav.category);
    setFavRunningId(null);
  }, [isConnected, runScript]);

  const handleFavUnfav = useCallback(async (id: string) => {
    await removeFavorite(id); invalidateFavCache();
    const updated = await loadFavorites(); setFavorites(updated); setFavIds(new Set(updated.map(f => f.id)));
    haptics.medium();
  }, []);

  const handleFavReorder = useCallback(async (newOrder: string[]) => {
    await reorderFavorites(newOrder); invalidateFavCache();
    const updated = await loadFavorites(); setFavorites(updated);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true); haptics.medium();
    try {
      await Promise.all([checkConnection(), loadButler()]);
      const counts = await executionCounter.load(); setRunCounts(counts); setCachedRunCounts(counts);
      const hist = await executionHistory.loadHistory(); setHistoryEntries(hist);
      const pins = await loadPinnedIds(); setPinnedIds(new Set(pins));
      haptics.success();
    } catch {}
    setIsRefreshing(false);
  }, [checkConnection, loadButler]);

  // Load PC library when focused — always loads local scripts, silently tries PC if connected
  useFocusEffect(useCallback(() => {
    loadButler();
    const t = setTimeout(() => { fetchPCLibrary(); }, 1200);
    return () => clearTimeout(t);
  }, [fetchPCLibrary, loadButler]));

  const pinnedBuiltin   = useMemo(() => filtered.filter(s => pinnedIds.has(s.id)), [filtered, pinnedIds]);
  const pinnedButler    = useMemo(() => filteredButler.filter(s => pinnedIds.has(s.id)), [filteredButler, pinnedIds]);
  const unpinnedBuiltin = useMemo(() => activeCategory !== 'AI Generated' ? filtered.filter(s => !pinnedIds.has(s.id)) : [], [filtered, pinnedIds, activeCategory]);
  const unpinnedButler  = useMemo(() => filteredButler.filter(s => !pinnedIds.has(s.id)), [filteredButler, pinnedIds]);

  const lastRunMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const entry of historyEntries) {
      if (!map[entry.scriptId]) {
        try {
          const d = new Date(entry.timestamp); const diffMs = Date.now() - d.getTime();
          const diffMin = Math.floor(diffMs / 60000); const diffHr = Math.floor(diffMin / 60); const diffDay = Math.floor(diffHr / 24);
          if (diffMin < 1) map[entry.scriptId] = 'just now';
          else if (diffMin < 60) map[entry.scriptId] = `${diffMin}m ago`;
          else if (diffHr < 24) map[entry.scriptId] = `${diffHr}h ago`;
          else map[entry.scriptId] = `${diffDay}d ago`;
        } catch { map[entry.scriptId] = '--'; }
      }
    }
    return map;
  }, [historyEntries]);

  const totalCount = filtered.length + filteredButler.length;

  type ListItem =
    | { _type: 'section'; label: string; count: number; color: string; icon: string }
    | { _type: 'builtin'; script: AutomationScript }
    | { _type: 'butler'; script: ButlerScript }
    | { _type: 'divider' }
    | { _type: 'empty' };

  const flatListData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    const hasPinned = pinnedBuiltin.length + pinnedButler.length > 0;
    if (hasPinned) {
      items.push({ _type: 'section', label: 'PINNED', count: pinnedBuiltin.length + pinnedButler.length, color: N.yellow, icon: 'star' });
      pinnedButler.forEach(s => items.push({ _type: 'butler', script: s }));
      pinnedBuiltin.forEach(s => items.push({ _type: 'builtin', script: s }));
      items.push({ _type: 'divider' });
    }
    if (unpinnedButler.length > 0) {
      items.push({ _type: 'section', label: 'AI GENERATED', count: filteredButler.length, color: N.amber, icon: 'auto-awesome' });
      unpinnedButler.forEach(s => items.push({ _type: 'butler', script: s }));
    }
    if (activeCategory !== 'AI Generated' && unpinnedBuiltin.length > 0) {
      if (unpinnedButler.length > 0 || hasPinned) items.push({ _type: 'section', label: 'BUILT-IN', count: filtered.length, color: N.blue, icon: 'code' });
      unpinnedBuiltin.forEach(s => items.push({ _type: 'builtin', script: s }));
    }
    if (totalCount === 0) items.push({ _type: 'empty' });
    return items;
  }, [pinnedBuiltin, pinnedButler, unpinnedBuiltin, unpinnedButler, filteredButler, filtered, activeCategory, totalCount]);

  const getItemLayout = useCallback((_: any, index: number) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      const it = flatListData[i]; if (!it) break;
      if (it._type === 'section') offset += SECTION_ITEM_HEIGHT;
      else if (it._type === 'divider') offset += DIVIDER_ITEM_HEIGHT;
      else if (it._type === 'empty') offset += EMPTY_ITEM_HEIGHT;
      else offset += CARD_ITEM_HEIGHT;
    }
    const it = flatListData[index];
    const length = !it ? CARD_ITEM_HEIGHT : it._type === 'section' ? SECTION_ITEM_HEIGHT : it._type === 'divider' ? DIVIDER_ITEM_HEIGHT : it._type === 'empty' ? EMPTY_ITEM_HEIGHT : CARD_ITEM_HEIGHT;
    return { length, offset, index };
  }, [flatListData]);

  const keyExtractorScript = useCallback((item: ListItem, index: number): string => {
    if (item._type === 'builtin') return `builtin-${item.script.id}`;
    if (item._type === 'butler') return `butler-${item.script.id}`;
    if (item._type === 'section') return `section-${item.label}`;
    return `special-${index}`;
  }, []);

  const renderScriptListItem = useCallback(({ item }: { item: ListItem }) => {
    if (item._type === 'section') {
      return (
        <View style={s.sectionHdr}>
          <MaterialIcons name={item.icon as any} size={12} color={item.color} />
          <Text style={[s.sectionTxt, { color: item.color }]}>{item.label}</Text>
          <Text style={s.sectionCount}>({item.count})</Text>
          <View style={[s.sectionLine, { backgroundColor: item.color + '30' }]} />
        </View>
      );
    }
    if (item._type === 'divider') return <View style={s.pinDivider} />;
    if (item._type === 'empty') {
      return (
        <View style={s.empty}>
          <MaterialIcons name="code-off" size={48} color={N.textDim} />
          <Text style={s.emptyTitle}>No Scripts</Text>
          <Text style={s.emptyHint}>{activeCategory === 'AI Generated' ? 'Create a script with the AI generator' : 'Try a different category or search'}</Text>
        </View>
      );
    }
    if (item._type === 'builtin') {
      const script = item.script;
      return (
        <NexusScriptCard
          title={script.title} description={script.description} category={script.category}
          isRunning={runningCardId === `s-${script.id}`} scriptCode={script.script}
          onPress={() => setPreviewScript({ title: script.title, code: script.script, desc: script.description, cat: script.category })}
          runCount={runCounts[script.id] ?? 0} lastRunTime={lastRunMap[script.id]}
          onRun={() => handleDirectRun(script.id, script.title, script.script, `s-${script.id}`, script.category)}
          isPinned={pinnedIds.has(script.id)} onTogglePin={() => handleTogglePin(script.id)}
          isFavorited={favIds.has(script.id)}
          onToggleFav={() => handleToggleFavorite({ id: script.id, title: script.title, description: script.description, category: script.category, script: script.script }, 'builtin')}
        />
      );
    }
    if (item._type === 'butler') {
      const script = item.script;
      return (
        <NexusAIScriptCard
          script={script} isRunning={runningCardId === `b-${script.id}`}
          onPress={() => setDetailButler(script)}
          runCount={runCounts[script.id] ?? 0} lastRunTime={lastRunMap[script.id]}
          onRun={() => handleDirectRun(script.id, script.title, script.script, `b-${script.id}`, 'AI Generated')}
          onDelete={async () => { await deleteButlerScript(script.id); await loadButler(); }}
          onEdit={() => { setEditingScript(script); setShowEditor(true); }}
          isPinned={pinnedIds.has(script.id)} onTogglePin={() => handleTogglePin(script.id)}
          isFavorited={favIds.has(script.id)}
          onToggleFav={() => handleToggleFavorite({ id: script.id, title: script.title, description: script.description, category: script.category, script: script.script }, 'butler')}
        />
      );
    }
    return null;
  }, [activeCategory, runningCardId, runCounts, lastRunMap, pinnedIds, favIds, handleDirectRun, handleTogglePin, handleToggleFavorite, loadButler]);

  // PC Library footer rendered as FlatList ListFooterComponent so built-in scripts appear FIRST
  const pcLibraryHeader = useMemo(() => {
    if (viewMode !== 'scripts') return null;
    return (
      <View style={{ marginBottom: 6 }}>
        {/* HEADER ROW */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(47,217,139,0.12)' }}>
          <MaterialCommunityIcons name="server" size={13} color="#00FF88" />
          <Text style={{ flex: 1, fontSize: 10, fontWeight: '900', color: '#00FF88',
            fontFamily: MONO, letterSpacing: 1.5 }}>PC LIBRARY</Text>
          <Text style={{ fontSize: 9, color: N.textDim, fontFamily: MONO }}>
            {pcLibScripts.length} scripts
          </Text>
          <TouchableOpacity
            onPress={() => isConnected ? fetchPCLibrary(pcLibSearch || undefined) : null}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={pcLibLoading || !isConnected}>
            {pcLibLoading
              ? <ActivityIndicator size={12} color="#00FF88" />
              : <MaterialIcons name="refresh" size={14} color={isConnected ? '#00FF88' : N.textDim} />}
          </TouchableOpacity>
        </View>
        {/* SEARCH — only when connected */}
        {isConnected ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8,
            marginTop: 6, marginBottom: 4, borderWidth: 1, borderColor: N.borderHi,
            borderRadius: 8, backgroundColor: '#0E0F12', paddingHorizontal: 10 }}>
            <MaterialIcons name="search" size={14} color={N.textDim} />
            <TextInput
              style={{ flex: 1, fontSize: 12, color: N.text, fontFamily: MONO, paddingVertical: 7 }}
              value={pcLibSearch}
              onChangeText={v => setPcLibSearch(v)}
              onSubmitEditing={() => fetchPCLibrary(pcLibSearch || undefined)}
              placeholder="Search PC scripts..."
              placeholderTextColor={N.textDim}
              returnKeyType="search"
            />
            {pcLibSearch ? (
              <TouchableOpacity onPress={() => { setPcLibSearch(''); fetchPCLibrary(); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={13} color={N.textDim} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
        {/* OFFLINE HINT */}
        {!isConnected && !pcLibLoading ? (
          <View style={{ marginTop: 4, padding: 10, borderRadius: 8,
            backgroundColor: N.surface, borderWidth: 1, borderColor: N.border,
            flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <MaterialCommunityIcons name="server-off" size={14} color={N.textDim} />
            <Text style={{ flex: 1, fontSize: 10, color: N.textDim, fontFamily: MONO }}>
              PC scripts load automatically when connected
            </Text>
          </View>
        ) : null}
        {/* ERROR with RETRY */}
        {pcLibError && isConnected ? (
          <View style={{ marginTop: 4, marginBottom: 4, padding: 10, borderRadius: 8,
            backgroundColor: '#EF444408', borderWidth: 1, borderColor: '#EF444430',
            flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialIcons name="error-outline" size={13} color="#EF4444" />
            <Text style={{ flex: 1, fontSize: 11, color: '#EF4444', fontFamily: MONO }}>{pcLibError}</Text>
            <TouchableOpacity onPress={() => fetchPCLibrary()}
              style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
                borderWidth: 1, borderColor: '#EF444440', backgroundColor: '#EF444410' }}>
              <Text style={{ fontSize: 10, color: '#EF4444', fontFamily: MONO, fontWeight: '700' }}>RETRY</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {/* PC SCRIPT CARDS */}
        {pcLibScripts.map(item => {
          const isRunning = pcLibRunning === item.id;
          const hasOutput = pcLibOutput?.id === item.id;
          const CAT_COLORS: Record<string, string> = {
            Cleaning: '#FF2A1F', System: '#FF2A1F', Network: '#FF6A1F',
            Security: '#FFC400', Files: '#FF6A1F', Developer: '#00FF88',
            Monitoring: '#00FF88', Automation: '#FF2A1F', Performance: '#00FF88',
            Fun: '#FF6FD8', Custom: '#FFC400', General: N.blue,
          };
          const col = CAT_COLORS[item.category] || N.blue;
          return (
            <View key={item.id} style={{ borderRadius: 8, borderWidth: 1,
              borderColor: col + '30', borderLeftWidth: 3, borderLeftColor: col,
              backgroundColor: N.bg, marginBottom: 6, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <MaterialCommunityIcons name="server" size={10} color="#FF6A1F80" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: N.text,
                      fontFamily: MONO, flex: 1 }} numberOfLines={1}>{item.name}</Text>
                  </View>
                  {item.description ? (
                    <Text style={{ fontSize: 10, color: N.textDim, marginTop: 1 }}
                      numberOfLines={1}>{item.description}</Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                    <View style={{ paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
                      backgroundColor: col + '15', borderWidth: 1, borderColor: col + '35' }}>
                      <Text style={{ fontSize: 8, color: col, fontFamily: MONO,
                        fontWeight: '700', letterSpacing: 0.5 }}>
                        {(item.category || 'Custom').toUpperCase()}
                      </Text>
                    </View>
                    {item.size_bytes ? (
                      <Text style={{ fontSize: 8, color: N.textDim, fontFamily: MONO,
                        alignSelf: 'center' }}>{(item.size_bytes / 1024).toFixed(1)}KB</Text>
                    ) : null}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity onPress={() => savePCScriptToPhone(item)}
                    style={{ padding: 6, borderRadius: 6, borderWidth: 1,
                      borderColor: N.blue + '40', backgroundColor: N.blue + '10' }}>
                    <MaterialIcons name="save-alt" size={14} color={N.blue} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => isRunning ? null : runPCScript(item.id, item.name)}
                    disabled={isRunning}
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
                      borderWidth: 1,
                      borderColor: isRunning ? N.amber + '50' : '#00FF8850',
                      backgroundColor: isRunning ? N.amber + '10' : '#00FF8810',
                      flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {isRunning
                      ? <ActivityIndicator size={10} color={N.amber} />
                      : <MaterialIcons name="play-arrow" size={14} color="#00FF88" />}
                    <Text style={{ fontSize: 10, fontFamily: MONO, fontWeight: '700',
                      color: isRunning ? N.amber : '#00FF88' }}>
                      {isRunning ? 'RUNNING' : 'RUN'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {hasOutput && pcLibOutput ? (
                <View style={{ borderTopWidth: 1,
                  borderTopColor: pcLibOutput.ok ? '#00FF8825' : '#EF444425',
                  backgroundColor: pcLibOutput.ok ? '#00FF8806' : '#EF444406' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 10, paddingVertical: 5, gap: 6 }}>
                    <MaterialIcons name={pcLibOutput.ok ? 'check-circle' : 'error-outline'}
                      size={11} color={pcLibOutput.ok ? '#00FF88' : '#EF4444'} />
                    <Text style={{ flex: 1, fontSize: 9, fontFamily: MONO, fontWeight: '700',
                      color: pcLibOutput.ok ? '#00FF88' : '#EF4444', letterSpacing: 0.8 }}>
                      {pcLibOutput.ok ? 'OUTPUT' : 'ERROR'}
                    </Text>
                    <TouchableOpacity onPress={() => setPcLibOutput(null)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialIcons name="close" size={12} color={N.textDim} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ maxHeight: 150 }}
                    contentContainerStyle={{ padding: 10 }}
                    showsVerticalScrollIndicator={false}>
                    <Text style={{ fontSize: 10, fontFamily: MONO, lineHeight: 16,
                      color: pcLibOutput.ok ? '#88FF99' : '#FF8888' }}
                      selectable>{pcLibOutput.out}</Text>
                  </ScrollView>
                  <TouchableOpacity onPress={() => runPCScript(item.id, item.name)}
                    style={{ flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'center', gap: 5, paddingVertical: 7,
                      borderTopWidth: 1,
                      borderTopColor: pcLibOutput.ok ? '#00FF8820' : '#EF444420' }}>
                    <MaterialIcons name="replay" size={11} color={N.textDim} />
                    <Text style={{ fontSize: 9, color: N.textDim, fontFamily: MONO }}>RUN AGAIN</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          );
        })}
        {/* EMPTY STATE when connected but no scripts */}
        {isConnected && !pcLibLoading && pcLibScripts.length === 0 && !pcLibError ? (
          <View style={{ alignItems: 'center', paddingVertical: 14, gap: 6, marginBottom: 6 }}>
            <MaterialCommunityIcons name="script-text-outline" size={22} color={N.textDim} />
            <Text style={{ fontSize: 11, color: N.textDim, fontFamily: MONO }}>
              {pcLibSearch ? `No scripts matching "${pcLibSearch}"` : 'No PC scripts yet — ask AI to make one!'}
            </Text>
          </View>
        ) : null}
        {/* ONLINE STATUS INDICATOR */}
        {isConnected ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
            marginBottom: 6, paddingVertical: 5, paddingHorizontal: 10,
            borderRadius: 8, backgroundColor: N.green + '08',
            borderWidth: 1, borderColor: N.green + '25' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: N.green }} />
            <Text style={{ fontSize: 9, color: N.green + 'AA', fontFamily: MONO, flex: 1, letterSpacing: 0.3 }}>
              PC ONLINE — {serverAddr}
            </Text>
            {pcLibScripts.length > 0 ? (
              <Text style={{ fontSize: 8, color: N.textDim, fontFamily: MONO }}>
                {pcLibScripts.length} PC scripts
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }, [viewMode, pcLibScripts, pcLibLoading, pcLibError, pcLibSearch, pcLibOutput,
      pcLibRunning, isConnected, serverAddr, fetchPCLibrary, runPCScript, savePCScriptToPhone]);

  const catColorMap = useMemo(() => {
    const m: Record<string, string> = { All: N.blue };
    CATEGORIES.forEach(c => { m[c] = CAT_COLOR[c] || N.blue; });
    return m;
  }, []);

  return (
    <View style={[s.container, { backgroundColor: T.bg || N.bg }]}>
      <QuickPreviewModal
        visible={!!previewScript}
        title={previewScript?.title || ''}
        code={previewScript?.code || ''}
        description={previewScript?.desc}
        category={previewScript?.cat}
        onClose={() => setPreviewScript(null)}
      />
      <ExecutionModal
        visible={execResult.visible}
        scriptName={execResult.scriptName}
        running={execResult.running}
        success={execResult.success}
        output={execResult.output}
        error={execResult.error}
        ms={execResult.ms}
        liveLines={liveLines}
        progressPct={execPct}
        onClose={() => setExecResult(prev => ({ ...prev, visible: false }))}
        onRunAgain={() => { setLiveLines([]); setExecPct(0); runScript(execResult.scriptName, execResult.scriptCode); }}
        undoId={execResult.undoId}
        undoExpiresSec={execResult.undoExpiresSec}
      />
      <ScriptEditorModal
        visible={showEditor}
        onClose={async () => { setShowEditor(false); setEditingScript(null); await loadButler(); }}
        onExecute={(name, code) => { setShowEditor(false); setEditingScript(null); runScript(name, code); }}
        editScript={editingScript}
      />
      {detailScript ? (
        <DetailModal visible title={detailScript.title} description={detailScript.description} code={detailScript.script} requirements={detailScript.requirements} category={detailScript.category} executing={executing} onClose={() => setDetailScript(null)}
          onExecute={() => { if (!isConnected) { Alert.alert('OFFLINE', 'Connect to PC via HOME tab first.'); return; } setExecuting(true); runScript(detailScript.title, detailScript.script).finally(() => setExecuting(false)); }} />
      ) : null}
      {detailButler ? (
        <DetailModal visible title={detailButler.title} description={detailButler.description} code={detailButler.script} category={detailButler.category} executing={executing} onClose={() => setDetailButler(null)}
          onExecute={() => { if (!isConnected) { Alert.alert('OFFLINE', 'Connect to PC via HOME tab first.'); return; } setExecuting(true); runScript(detailButler.title, detailButler.script).finally(() => setExecuting(false)); }} />
      ) : null}
      <HistoryModal visible={showHistory} entries={historyEntries} onClose={() => setShowHistory(false)}
        onClear={async () => { haptics.heavy(); await executionHistory.clearHistory(); setHistoryEntries([]); }} />
      <DispatchToast name={dispatchToast.name} visible={dispatchToast.visible} onHide={() => setDispatchToast(prev => ({ ...prev, visible: false }))} />
      {/* Category detail modal — replaces router.push */}
      <CategoryDetailModal cat={catDetailModal} onClose={() => setCatDetailModal(null)} />

      {viewMode === 'favorites' ? (
        <View style={{ flex: 1 }}>
          <View style={s.controlRow}>
            <View style={{ flex: 1 }} />
            <View style={s.countBadge}><MaterialIcons name="star" size={11} color={N.yellow} /><Text style={[s.countBadgeTxt, { color: N.yellow }]}>{favorites.length}</Text></View>
            <TouchableOpacity onPress={() => setViewMode('scripts')} style={[s.historyBtn, { backgroundColor: N.blue + '18', borderColor: N.blue + '40', borderWidth: 1 }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={16} color={N.blue} />
            </TouchableOpacity>
          </View>
          <View style={[fvs.statsRow, { paddingHorizontal: 16, paddingTop: 12, marginBottom: 0 }]}>
            <MaterialIcons name="star" size={14} color={N.yellow} />
            <Text style={{ fontSize: 18, fontWeight: '900', color: N.text, fontFamily: MONO }}>FAVORITES <Text style={{ color: N.yellow }}>HUB</Text></Text>
          </View>
          <FavoritesView favorites={favorites} runningId={favRunningId} onRun={handleFavRun} onUnfav={handleFavUnfav} onReorder={handleFavReorder} isConnected={isConnected} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* ── TACTICAL ACTION ROW ── */}
          <View style={[s.fuiActionRow, { backgroundColor: T.panel || '#0E0F12', borderBottomColor: PR + '20' }]}>
            {/* Favorites toggle */}
            <TouchableOpacity
              onPress={() => { haptics.selection(); setViewMode('favorites'); }}
              style={[s.fuiIconCircle, favIds.size > 0 ? { backgroundColor: N.yellow + '20', borderColor: N.yellow + '60' } : { borderColor: N.textDim + '30' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.75}
            >
              <MaterialIcons name="star" size={18} color={favIds.size > 0 ? N.yellow : N.textDim} />
              {favIds.size > 0 ? (
                <View style={s.fuiBubble}><Text style={[s.fuiBubbleTxt, { color: N.yellow }]}>{favIds.size}</Text></View>
              ) : null}
            </TouchableOpacity>
            {/* Script count readout */}
            <View style={[s.fuiCountReadout, { borderColor: PR + '40', backgroundColor: PR + '0C' }]}>
              <MaterialIcons name="code" size={14} color={PR} />
              <Text style={[s.fuiCountNum, { color: PR }]}>{totalCount + pcLibScripts.length}</Text>
              <Text style={[s.fuiCountLabel, { color: PR + 'AA' }]}>SCRIPTS</Text>
            </View>
            {/* History */}
            <TouchableOpacity
              onPress={() => { haptics.selection(); setShowHistory(true); }}
              style={[s.fuiIconCircle, { borderColor: N.textDim + '30' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.75}
            >
              <MaterialIcons name="history" size={18} color={N.textDim} />
            </TouchableOpacity>
            {/* Run all / chain button */}
            <TouchableOpacity
              onPress={() => { haptics.selection(); setShowChainBuilder(true); }}
              style={[s.fuiIconCircle, { borderColor: N.green + '35', backgroundColor: N.green + '08' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.75}
            >
              <MaterialIcons name="playlist-play" size={20} color={N.green} />
            </TouchableOpacity>
          </View>

          {/* ── TIP BANNER — FUI accent-border style ── */}
          <FuiTipBanner tips={SCRIPTS_PAGE_TIPS} />
          {/* Connection status pill */}
          {isConnected ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 14, paddingVertical: 6,
              backgroundColor: N.green + '06', borderBottomWidth: 1, borderBottomColor: N.green + '18' }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: N.green }} />
              <Text style={{ flex: 1, fontSize: 9, color: N.green + 'AA', fontFamily: MONO, letterSpacing: 0.8, fontWeight: '700' }}>
                PC CONNECTED · SCRIPTS EXECUTE ON YOUR MACHINE
              </Text>
              <Text style={{ fontSize: 9, color: N.green + '70', fontFamily: MONO }}>
                {pcLibScripts.length > 0 ? `${pcLibScripts.length} PC SCRIPTS` : 'READY'}
              </Text>
            </View>
          ) : null}

          <View style={[s.fuiModeRow, { borderBottomColor: PR + '12' }]}>
            {/* Mode toggle — pill style */}
            <View style={s.modeToggle}>
              {(['scripts', 'library'] as ViewMode[]).map(m => (
                <TouchableOpacity key={m}
                  style={[s.modeBtn, viewMode === m && { backgroundColor: PR + '18', borderColor: PR + '40' }]}
                  onPress={() => { haptics.selection(); setViewMode(m as ViewMode); }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={m === 'scripts' ? 'code' : 'local-library'}
                    size={12}
                    color={viewMode === m ? PR : N.textDim}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={[s.modeBtnTxt, viewMode === m && { color: PR, fontWeight: '900' }]}>{m === 'scripts' ? 'MY SCRIPTS' : 'LIBRARY'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {viewMode === 'library' ? (
              <View style={s.libStatsInline}>
                {[{ n: SEARCH_INDEX.length, c: N.blue }, { n: ALL_CATEGORIES.length, c: N.green }, { n: '100%', c: N.amber }].map(({ n, c }, i) => (
                  <View key={i} style={[s.libStatChip, { borderColor: c + '40', backgroundColor: c + '10' }]}>
                    <Text style={[s.libStatChipNum, { color: c }]}>{n}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {/* AI Builder FAB */}
            <TouchableOpacity
              style={[s.createFAB, { backgroundColor: '#1A1D24', borderColor: '#7722BB40' }]}
              onPress={() => { haptics.medium(); setBuildResult(null); setBuildDesc(''); setBuildModalVisible(true); }}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="robot-angry" size={18} color="#FFF" />
            </TouchableOpacity>
            {/* New Script FAB */}
            <TouchableOpacity style={[s.createFAB, { backgroundColor: PR, borderWidth: 2, borderColor: PR + '60' }]} onPress={() => { haptics.medium(); setEditingScript(null); setShowEditor(true); }} activeOpacity={0.85}>
              <MaterialIcons name="add" size={18} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={[s.searchWrap, { backgroundColor: T.panel || '#080E18', borderColor: PR + '35', borderWidth: 1.5 }]}>
            <MaterialIcons name="search" size={16} color={(viewMode === 'scripts' ? searchQuery : libSearch) ? PR : PR + '55'} />
            <TextInput style={[s.searchInput, { color: N.text }]}
              value={viewMode === 'scripts' ? searchQuery : libSearch}
              onChangeText={viewMode === 'scripts' ? setSearchQuery : setLibSearch}
              placeholder={viewMode === 'scripts' ? 'Search scripts, tags, categories...' : 'Search 70+ built-in scripts...'}
              placeholderTextColor={N.textDim} autoCapitalize="none" autoCorrect={false} />
            {(viewMode === 'scripts' ? searchQuery : libSearch) ? (
              <TouchableOpacity onPress={() => viewMode === 'scripts' ? setSearchQuery('') : setLibSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={14} color={N.textDim} />
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Text style={{ fontSize: 9, color: N.textDim, fontFamily: MONO, paddingRight: 2 }}>
                  {viewMode === 'scripts' ? `${totalCount} total` : '70+ scripts'}
                </Text>
              </View>
            )}
          </View>

          <NexusUndoWidget isConnected={isConnected} />

          {/* AI Script Builder Modal */}
          <Modal visible={buildModalVisible} animationType="slide" statusBarTranslucent onRequestClose={() => setBuildModalVisible(false)}>
            <View style={{ flex: 1, backgroundColor: N.bg }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:20, paddingTop: Platform.OS==='ios'?52:32, paddingBottom:14, backgroundColor:N.surface, borderBottomWidth:1, borderBottomColor:N.border }}>
                <TouchableOpacity onPress={() => setBuildModalVisible(false)} hitSlop={{top:12,bottom:12,left:12,right:12}}><MaterialIcons name="arrow-back" size={22} color={N.text} /></TouchableOpacity>
                <View style={{ flex: 1 }}><Text style={{ fontSize:22, fontWeight:'900', color:N.text, fontFamily:MONO }}>AI <Text style={{color:N.green}}>BUILDER</Text></Text><Text style={{ fontSize:11, color:N.textDim, fontFamily:MONO }}>Describe what you want — Ollama writes it</Text></View>
                <MaterialIcons name="auto-awesome" size={22} color={N.green} />
              </View>
              <ScrollView contentContainerStyle={{ padding:16, gap:14, paddingBottom:120 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={{ backgroundColor:N.green+'0C', borderRadius:10, borderWidth:1, borderColor:N.green+'30', padding:12, flexDirection:'row', gap:10 }}>
                  <MaterialIcons name="info-outline" size={16} color={N.green} />
                  <Text style={{ flex:1, fontSize:12, color:N.textMid, lineHeight:18, fontFamily:MONO }}>Powered by Ollama on your PC. Describe in plain English — the AI writes complete Python automatically.</Text>
                </View>
                <Text style={{ fontSize:10, fontWeight:'700', color:N.textDim, fontFamily:MONO, letterSpacing:1 }}>QUICK PROMPTS</Text>
                <View style={{ flexDirection:'row', flexWrap:'wrap', gap:6 }}>
                  {['organize my Downloads folder by file type','delete temp files older than 7 days','monitor CPU every 5 seconds','find all duplicate files on Desktop','auto-backup Documents to external drive','send email when disk is over 90%','screenshot every 30 minutes','kill processes using over 80% CPU','batch rename photos by date','compress all videos in a folder'].map(p=>(
                    <TouchableOpacity key={p} onPress={()=>setBuildDesc(p)} style={{ borderWidth:1, borderColor:N.green+'40', borderRadius:8, paddingHorizontal:10, paddingVertical:6, backgroundColor:N.green+'08' }}>
                      <Text style={{ fontSize:11, color:N.green+'CC', fontFamily:MONO }}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ fontSize:10, fontWeight:'700', color:N.textDim, fontFamily:MONO, letterSpacing:1 }}>DESCRIBE YOUR SCRIPT</Text>
                <TextInput style={{ backgroundColor:N.surface, borderWidth:1.5, borderColor:N.green+'50', borderRadius:12, padding:14, color:N.text, fontSize:14, fontFamily:MONO, minHeight:120, textAlignVertical:'top' }}
                  value={buildDesc} onChangeText={setBuildDesc}
                  placeholder="e.g. Find all large video files over 500MB and move them to an archive folder on my Desktop..."
                  placeholderTextColor={N.textDim} multiline autoCapitalize="none" autoCorrect={false} />
                <TouchableOpacity style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10, backgroundColor:N.green, borderRadius:12, paddingVertical:15, opacity:(!buildDesc.trim()||buildLoading)?0.45:1 }}
                  onPress={buildScriptFromAI} disabled={!buildDesc.trim()||buildLoading} activeOpacity={0.85}>
                  {buildLoading ? <ActivityIndicator size="small" color="#000" /> : <MaterialIcons name="auto-awesome" size={18} color="#000" />}
                  <Text style={{ fontSize:14, fontWeight:'900', color:'#000', fontFamily:MONO }}>{buildLoading ? 'GENERATING...' : 'BUILD SCRIPT'}</Text>
                </TouchableOpacity>
                {buildResult ? (
                  <View style={{ backgroundColor:N.green+'08', borderRadius:12, borderWidth:1, borderColor:N.green+'40', overflow:'hidden' }}>
                    <View style={{ flexDirection:'row', alignItems:'center', gap:8, padding:12, borderBottomWidth:1, borderBottomColor:N.green+'20' }}>
                      <MaterialIcons name="check-circle" size={14} color={N.green} />
                      <Text style={{ flex:1, fontSize:13, fontWeight:'700', color:buildResult?.source==='generated'?N.amber:N.green, fontFamily:MONO }}>
                        {buildResult?.source==='library'?'📂 FOUND IN PC LIBRARY':buildResult?.source==='kb'?'✅ PROVEN WORKING SCRIPT':'🤖 AI GENERATED + SAVED'}
                      </Text>
                      <TouchableOpacity style={{ borderWidth:1.5, borderColor:N.blue, borderRadius:8, paddingHorizontal:14, paddingVertical:7, backgroundColor:N.blue+'18' }}
                        onPress={() => { setEditingScript({ id:'new_'+Date.now(), title:buildDesc.slice(0,50), description:'AI Generated: '+buildDesc, script:buildResult.code, category:'AI Generated', tags:[], createdAt:new Date().toISOString() } as any); setBuildModalVisible(false); setShowEditor(true); }}>
                        <Text style={{ fontSize:12, fontWeight:'700', color:N.blue, fontFamily:MONO }}>USE THIS</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight:280 }} showsVerticalScrollIndicator={false}><Text style={{ fontSize:12, color:N.green+'DD', fontFamily:MONO, lineHeight:18, padding:14 }} selectable>{buildResult.code}</Text></ScrollView>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </Modal>

          <View style={s.filterRow}>
            <NexusFilterChips options={CATEGORIES} active={activeCategory} onSelect={setActiveCategory} colorMap={catColorMap} />
          </View>

          {/* Server Script Library */}
          {viewMode === 'library' && serverScripts && Object.keys(serverScripts).length > 0 ? (
            <View style={{ backgroundColor:N.purple+'0C', borderRadius:10, borderWidth:1, borderColor:N.purple+'30', marginHorizontal:16, marginBottom:10, padding:12 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:7, marginBottom:8 }}>
                <MaterialIcons name="computer" size={14} color={N.purple} />
                <Text style={{ flex:1, fontSize:11, fontWeight:'900', color:N.purple, fontFamily:MONO, letterSpacing:0.8 }}>SERVER SCRIPTS — 198 SCRIPTS</Text>
                {serverLibLoading ? <ActivityIndicator size="small" color={N.purple} style={{transform:[{scale:0.7}]}} />
                  : <TouchableOpacity onPress={fetchServerLibrary} hitSlop={{top:8,bottom:8,left:8,right:8}}><MaterialIcons name="refresh" size={13} color={N.purple} /></TouchableOpacity>}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8, paddingHorizontal:12, paddingBottom:12 }}>
                {Object.entries(serverScripts).map(([catKey, cat]) => (
                  <View key={catKey} style={{ backgroundColor:N.surface, borderRadius:10, borderWidth:1, borderColor:N.border, width:220, overflow:'hidden' }}>
                    <View style={{ backgroundColor:(cat.color||N.purple)+'20', borderBottomWidth:1, borderBottomColor:(cat.color||N.purple)+'30', flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:10, paddingVertical:8 }}>
                      <MaterialIcons name={(cat.icon as any)||'folder'} size={13} color={cat.color||N.purple} />
                      <Text style={{ flex:1, fontSize:11, fontWeight:'900', color:cat.color||N.purple, fontFamily:MONO, letterSpacing:0.5 }}>{cat.title||catKey.toUpperCase()}</Text>
                      <Text style={{ fontSize:9, color:(cat.color||N.purple)+'80', fontFamily:MONO }}>{(cat.scripts||[]).length}</Text>
                    </View>
                    {(cat.scripts||[]).slice(0,6).map((sc:{id:string;name:string;desc:string;difficulty:string;hasCode?:boolean}) => (
                      <TouchableOpacity key={sc.id} style={{ flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:10, paddingVertical:10, borderBottomWidth:1, borderBottomColor:N.border }}
                        onPress={() => { haptics.medium(); runServerScript(sc.id, sc.name); }} activeOpacity={0.85}>
                        <View style={{ flex:1 }}>
                          <Text style={{ fontSize:12, fontWeight:'700', color:N.text, fontFamily:MONO }} numberOfLines={1}>{sc.name}</Text>
                          <Text style={{ fontSize:9.5, color:N.textDim, fontFamily:MONO, marginTop:2 }} numberOfLines={1}>{sc.desc}</Text>
                          <View style={{ flexDirection:'row', gap:4, marginTop:4 }}>
                            {sc.hasCode ? (
                              <View style={{ borderWidth:1, borderRadius:4, paddingHorizontal:5, paddingVertical:2, borderColor:N.green+'60', backgroundColor:N.green+'10' }}>
                                <Text style={{ fontSize:7.5, fontWeight:'900', color:N.green, fontFamily:MONO }}>⚡ INSTANT</Text>
                              </View>
                            ) : (
                              <View style={{ borderWidth:1, borderRadius:4, paddingHorizontal:5, paddingVertical:2, borderColor:N.purple+'50', backgroundColor:N.purple+'10' }}>
                                <Text style={{ fontSize:7.5, fontWeight:'900', color:N.purple, fontFamily:MONO }}>🤖 AI GEN</Text>
                              </View>
                            )}
                            <View style={{ borderWidth:1, borderRadius:4, paddingHorizontal:5, paddingVertical:2,
                              borderColor: sc.difficulty==='BEGINNER' ? N.green+'50' : sc.difficulty==='ADVANCED' ? N.red+'50' : N.amber+'50',
                              backgroundColor: sc.difficulty==='BEGINNER' ? N.green+'10' : sc.difficulty==='ADVANCED' ? N.red+'10' : N.amber+'10' }}>
                              <Text style={{ fontSize:7.5, fontWeight:'900', fontFamily:MONO, color: sc.difficulty==='BEGINNER' ? N.green : sc.difficulty==='ADVANCED' ? N.red : N.amber }}>{sc.difficulty||'MED'}</Text>
                            </View>
                          </View>
                        </View>
                        <MaterialIcons name="play-arrow" size={20} color={cat.color||N.purple} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* ── PC SCRIPT LIBRARY — moved into FlatList ListHeaderComponent ── */}
          {viewMode === 'scripts' ? (
            <View style={{ marginHorizontal: 16, marginBottom: 6, display: 'none' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8,
                paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(47,217,139,0.12)' }}>
                <MaterialCommunityIcons name="server" size={13} color="#00FF88" />
                <Text style={{ flex: 1, fontSize: 10, fontWeight: '900', color: '#00FF88',
                  fontFamily: MONO, letterSpacing: 1.5 }}>PC LIBRARY</Text>
                <Text style={{ fontSize: 9, color: N.textDim, fontFamily: MONO }}>
                  {pcLibScripts.length} scripts
                </Text>
                <TouchableOpacity onPress={() => fetchPCLibrary(pcLibSearch || undefined)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} disabled={pcLibLoading}>
                  {pcLibLoading
                    ? <ActivityIndicator size={12} color="#00FF88" />
                    : <MaterialIcons name="refresh" size={14} color="#00FF88" />}
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8,
                marginTop: 6, marginBottom: 4, borderWidth: 1, borderColor: N.borderHi,
                borderRadius: 8, backgroundColor: '#0E0F12', paddingHorizontal: 10 }}>
                <MaterialIcons name="search" size={14} color={N.textDim} />
                <TextInput
                  style={{ flex: 1, fontSize: 12, color: N.text, fontFamily: MONO, paddingVertical: 7 }}
                  value={pcLibSearch}
                  onChangeText={v => setPcLibSearch(v)}
                  onSubmitEditing={() => fetchPCLibrary(pcLibSearch || undefined)}
                  placeholder="Search PC scripts..."
                  placeholderTextColor={N.textDim}
                  returnKeyType="search"
                />
                {pcLibSearch ? (
                  <TouchableOpacity onPress={() => { setPcLibSearch(''); fetchPCLibrary(); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name="close" size={13} color={N.textDim} />
                  </TouchableOpacity>
                ) : null}
              </View>
              {pcLibError ? (
                <View style={{ marginTop: 4, padding: 10, borderRadius: 8,
                  backgroundColor: '#EF444408', borderWidth: 1, borderColor: '#EF444430' }}>
                  <Text style={{ fontSize: 11, color: '#EF4444', fontFamily: MONO }}>{pcLibError}</Text>
                </View>
              ) : null}
              {!serverConnection.isConnected() && !pcLibError && pcLibScripts.length === 0 ? (
                <View style={{ marginTop: 4, padding: 10, borderRadius: 8,
                  backgroundColor: N.surface, borderWidth: 1, borderColor: N.border,
                  flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="server-off" size={16} color={N.textDim} />
                  <Text style={{ fontSize: 10, color: N.textDim, fontFamily: MONO }}>
                    PC scripts load automatically when connected
                  </Text>
                </View>
              ) : null}
              {pcLibScripts.length > 0 ? (
                pcLibScripts.map(item => {
                  const isRunning = pcLibRunning === item.id;
                  const hasOutput = pcLibOutput?.id === item.id;
                  const CAT_COLORS: Record<string,string> = {
                    Cleaning:'#FF2A1F', System:'#FF2A1F', Network:'#FF6A1F',
                    Security:'#FFC400', Files:'#FF6A1F', Developer:'#00FF88',
                    Monitoring:'#00FF88', Automation:'#FF2A1F', Performance:'#00FF88',
                    Fun:'#FF6FD8', Custom:'#FFC400',
                  };
                  const col = CAT_COLORS[item.category] || N.blue;
                  return (
                    <View key={item.id} style={{ borderRadius: 8, borderWidth: 1,
                      borderColor: col + '30', borderLeftWidth: 3, borderLeftColor: col,
                      backgroundColor: N.bg, marginBottom: 6, overflow: 'hidden' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <MaterialCommunityIcons name="server" size={10} color="#FF6A1F80" />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: N.text,
                              fontFamily: MONO }} numberOfLines={1}>{item.name}</Text>
                          </View>
                          {item.description ? (
                            <Text style={{ fontSize: 10, color: N.textDim, marginTop: 2 }}
                              numberOfLines={1}>{item.description}</Text>
                          ) : null}
                          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                            <View style={{ paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
                              backgroundColor: col + '15', borderWidth: 1, borderColor: col + '35' }}>
                              <Text style={{ fontSize: 8, color: col, fontFamily: MONO,
                                fontWeight: '700', letterSpacing: 0.5 }}>{item.category.toUpperCase()}</Text>
                            </View>
                            {item.size_bytes ? (
                              <Text style={{ fontSize: 8, color: N.textDim, fontFamily: MONO,
                                alignSelf: 'center' }}>{(item.size_bytes/1024).toFixed(1)}KB</Text>
                            ) : null}
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity onPress={() => savePCScriptToPhone(item)}
                            style={{ padding: 6, borderRadius: 6, borderWidth: 1,
                              borderColor: N.blue + '40', backgroundColor: N.blue + '10' }}>
                            <MaterialIcons name="save-alt" size={14} color={N.blue} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => isRunning ? null : runPCScript(item.id, item.name)}
                            disabled={isRunning}
                            style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
                              borderWidth: 1,
                              borderColor: isRunning ? N.amber + '50' : '#00FF8850',
                              backgroundColor: isRunning ? N.amber + '10' : '#00FF8810',
                              flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            {isRunning
                              ? <ActivityIndicator size={10} color={N.amber} />
                              : <MaterialIcons name="play-arrow" size={14} color="#00FF88" />}
                            <Text style={{ fontSize: 10, fontFamily: MONO, fontWeight: '700',
                              color: isRunning ? N.amber : '#00FF88' }}>
                              {isRunning ? 'RUNNING' : 'RUN'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      {hasOutput && pcLibOutput ? (
                        <View style={{ borderTopWidth: 1,
                          borderTopColor: pcLibOutput.ok ? '#00FF8825' : '#EF444425',
                          backgroundColor: pcLibOutput.ok ? '#00FF8808' : '#EF444408' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center',
                            paddingHorizontal: 10, paddingVertical: 5, gap: 6 }}>
                            <MaterialIcons
                              name={pcLibOutput.ok ? 'check-circle' : 'error-outline'}
                              size={11} color={pcLibOutput.ok ? '#00FF88' : '#EF4444'} />
                            <Text style={{ flex: 1, fontSize: 9, fontFamily: MONO, fontWeight: '700',
                              color: pcLibOutput.ok ? '#00FF88' : '#EF4444', letterSpacing: 0.8 }}>
                              {pcLibOutput.ok ? 'OUTPUT' : 'ERROR'}
                            </Text>
                            <TouchableOpacity onPress={() => setPcLibOutput(null)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <MaterialIcons name="close" size={12} color={N.textDim} />
                            </TouchableOpacity>
                          </View>
                          <ScrollView style={{ maxHeight: 150 }}
                            contentContainerStyle={{ padding: 10 }}
                            showsVerticalScrollIndicator={false}>
                            <Text style={{ fontSize: 10, fontFamily: MONO, lineHeight: 16,
                              color: pcLibOutput.ok ? '#88FF99' : '#FF8888' }}
                              selectable>{pcLibOutput.out}</Text>
                          </ScrollView>
                          <TouchableOpacity onPress={() => runPCScript(item.id, item.name)}
                            style={{ flexDirection: 'row', alignItems: 'center',
                              justifyContent: 'center', gap: 5, paddingVertical: 7,
                              borderTopWidth: 1,
                              borderTopColor: pcLibOutput.ok ? '#00FF8820' : '#EF444420' }}>
                            <MaterialIcons name="replay" size={11} color={N.textDim} />
                            <Text style={{ fontSize: 9, color: N.textDim, fontFamily: MONO }}>RUN AGAIN</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              ) : null}
              {!pcLibLoading && pcLibScripts.length === 0 && !pcLibError && serverConnection.isConnected() ? (
                <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
                  <MaterialCommunityIcons name="script-text-outline" size={28} color={N.textDim} />
                  <Text style={{ fontSize: 11, color: N.textDim, fontFamily: MONO }}>
                    {pcLibSearch ? `No scripts matching "${pcLibSearch}"` : 'No PC scripts yet'}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {viewMode === 'library' ? (
            <View style={{ flex: 1 }}>
              {libServerOk ? (
                <View style={[s.serverBanner, { borderColor: N.green + '40', backgroundColor: N.green + '08' }]}>
                  <View style={[s.connDot, { backgroundColor: N.green }]} />
                  <Text style={[s.serverBannerTxt, { color: N.green }]}>PC ONLINE — tap any script to execute</Text>
                </View>
              ) : null}
              {libSearch.trim() ? (
                libResults.length === 0 ? (
                  <View style={s.empty}>
                    <MaterialIcons name="search-off" size={48} color={N.textDim} />
                    <Text style={s.emptyTitle}>No Results</Text>
                    <Text style={s.emptyHint}>Try: cpu · backup · ping · git · files</Text>
                  </View>
                ) : (
                  <FlatList data={libResults} keyExtractor={item => `${item.categoryId}-${item.script.id}`}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 210, paddingTop: 8 }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                      const col = item.categoryColor;
                      const isPinned = pinnedIds.has(item.script.id);
                      return (
                        <TouchableOpacity style={[s.libSearchCard, { borderLeftColor: col }]}
                          onPress={() => navigateToCat({ id: item.categoryId, title: item.categoryTitle, subtitle: '', icon: 'code', iconLibrary: 'material', color: col, scripts: [] })}
                          onLongPress={() => setPreviewScript({ title: item.script.name, code: item.script.code || '', desc: item.script.desc, cat: item.categoryTitle })}
                          delayLongPress={360} activeOpacity={0.85}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <View style={[nfc.chip, { borderColor: col + '60', backgroundColor: col + '15', paddingHorizontal: 8, paddingVertical: 3 }]}>
                              <Text style={[nfc.label, { color: col, fontSize: 9 }]}>{item.categoryTitle.toUpperCase()}</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleTogglePin(item.script.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <MaterialIcons name={isPinned ? 'star' : 'star-border'} size={16} color={isPinned ? N.yellow : N.textDim} />
                            </TouchableOpacity>
                          </View>
                          <Text style={s.libSearchName} numberOfLines={1}>{item.script.name}</Text>
                          <Text style={s.libSearchDesc} numberOfLines={2}>{item.script.desc}</Text>
                          <View style={{ flexDirection: 'row', gap: 5, marginTop: 6 }}>
                            {item.script.tags.slice(0, 3).map(t => (
                              <View key={t} style={[nfc.chip, { borderColor: col + '30', paddingHorizontal: 7, paddingVertical: 2 }]}>
                                <Text style={[nfc.label, { color: col + 'AA', fontSize: 9 }]}>#{t}</Text>
                              </View>
                            ))}
                            <View style={[nfc.chip, { borderColor: col + '30', backgroundColor: col + '08', paddingHorizontal: 7, paddingVertical: 2 }]}>
                              <Text style={[nfc.label, { color: col, fontSize: 9 }]}>VIEW →</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />
                )
              ) : (
                <FlatList data={ALL_CATEGORIES} keyExtractor={item => item.id}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 210, paddingTop: 8 }}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => <NexusLibraryCat cat={item} onPress={() => navigateToCat(item)} />}
                />
              )}
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {isRefreshing ? <NexusRefreshSpinner refreshing={isRefreshing} /> : null}
              <FlatList
                data={flatListData}
                keyExtractor={keyExtractorScript}
                renderItem={renderScriptListItem}
                getItemLayout={getItemLayout}
                ListHeaderComponent={pcLibraryHeader}
                contentContainerStyle={s.list}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={10}
                maxToRenderPerBatch={6}
                windowSize={7}
                updateCellsBatchingPeriod={30}
                removeClippedSubviews={Platform.OS === 'android'}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    tintColor="transparent"
                    colors={['transparent']}
                    style={{ backgroundColor: 'transparent' }}
                  />
                }
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#050505' },
  // ── FUI COMMAND HEADER ──────────────────────────────────────────
  fuiHeader:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#0E0F12', borderBottomWidth: 1, borderBottomColor: 'rgba(255,42,31,0.1)' },
  fuiTitle:     { fontSize: 18, fontWeight: '900', color: '#FFFFFF', fontFamily: MONO, letterSpacing: 1.2, lineHeight: 22 },
  fuiSub:       { fontSize: 9, color: N.blue + 'AA', fontFamily: MONO, letterSpacing: 0.8, marginTop: 1 },
  fuiRefreshBtn:{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: N.blue + '70',
    borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: N.blue + '10', flexShrink: 0 },
  fuiRefreshTxt:{ fontSize: 10, fontWeight: '900', color: N.blue, fontFamily: MONO, letterSpacing: 0.5 },
  // ── TACTICAL ACTION ROW ──────────────────────────────────────────
  fuiActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 14,
    paddingVertical: 9, backgroundColor: '#0E0F12', borderBottomWidth: 1, borderBottomColor: 'rgba(255,42,31,0.12)' },
  fuiIconCircle:{ width: 36, height: 36, borderRadius: 9, backgroundColor: '#1A1D24', borderWidth: 1,
    borderColor: 'rgba(255,42,31,0.14)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  fuiCountReadout: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  fuiCountNum:  { fontSize: 16, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.3 },
  fuiCountLabel:{ fontSize: 8, fontWeight: '800', fontFamily: MONO, letterSpacing: 1 },
  fuiBubble:    { position: 'absolute', top: -4, right: -4, minWidth: 15, height: 15, borderRadius: 8,
    backgroundColor: N.yellow, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  fuiBubbleTxt: { fontSize: 7.5, fontWeight: '900', color: '#000', fontFamily: MONO },
  // ── MODE TOGGLE ROW ──────────────────────────────────────────────
  fuiModeRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  onlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: N.green + '20', backgroundColor: N.green + '05' },
  onlineTxt:    { flex: 1, fontSize: 10, color: N.green + 'AA', fontFamily: MONO, letterSpacing: 0.2 },
  modeToggle:   { flex: 1, flexDirection: 'row', backgroundColor: '#050505', borderRadius: 8, padding: 2, gap: 2, borderWidth: 1, borderColor: 'rgba(255,42,31,0.10)' },
  modeBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: 6, borderWidth: 0, borderColor: 'transparent' },
  modeBtnTxt:   { fontSize: 10, fontWeight: '700', color: N.textDim, fontFamily: MONO, letterSpacing: 0.3 },
  createBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: N.blue, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  createBtnTxt: { fontSize: 12, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 0.3 },
  createFAB:    { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  // Legacy aliases
  controlRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: N.border },
  connDot:      { width: 7, height: 7, borderRadius: 4 },
  countBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: N.blue + '15', borderWidth: 1, borderColor: N.blue + '40', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  countBadgeTxt:{ fontSize: 11, fontWeight: '700', color: N.blue, fontFamily: MONO },
  historyBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: N.surfaceHi, alignItems: 'center', justifyContent: 'center' },
  actionRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 0, marginBottom: 0 },
    searchWrap:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 14, marginBottom: 6, marginTop: 8, borderRadius: 12 },
  searchInput:  { flex: 1, fontSize: 12, color: N.text, fontFamily: MONO, paddingVertical: 0 },
  filterRow:    { paddingHorizontal: 16, marginBottom: 4 },
  list:         { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 },
  sectionHdr:   { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10, marginTop: 6 },
  sectionTxt:   { fontSize: 10, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  sectionCount: { fontSize: 10, color: N.textDim, fontFamily: MONO },
  sectionLine:  { flex: 1, height: 1 },
  pinDivider:   { height: 1, backgroundColor: N.yellow + '20', marginVertical: 6 },
  empty:        { alignItems: 'center', paddingVertical: 64, gap: 12 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: N.textDim, fontFamily: MONO },
  emptyHint:    { fontSize: 12, color: N.textDim, fontFamily: MONO, textAlign: 'center', paddingHorizontal: 24 },
  libStatsInline: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  libStatChip:    { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, alignItems: 'center', justifyContent: 'center' },
  libStatChipNum: { fontSize: 10, fontWeight: '900', fontFamily: MONO },
  serverBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  serverBannerTxt: { flex: 1, fontSize: 12, fontFamily: MONO },
  libSearchCard:{ backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderLeftWidth: 3, borderColor: N.border, padding: 14, marginBottom: 8 },
  libSearchName:{ fontSize: 14, fontWeight: '700', color: N.text, fontFamily: MONO, marginBottom: 5 },
  libSearchDesc:{ fontSize: 12, color: N.textDim, lineHeight: 17 },
});


// Expo Router per-route ErrorBoundary — isolates crashes to this tab
export { ErrorBoundary } from '@/components/ui/TabErrorBoundary';
