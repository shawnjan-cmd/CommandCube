/**
 * 📂 CATEGORY DETAIL — Bulletproof v3
 * FixBanner + KB Auto-Fix + aiLogger + healthCheck integrated
 * Real server execution · Error-free Android Hermes navigation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, Modal, ActivityIndicator, Animated,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { scriptExecutor } from '@/services/scriptExecutor';
import { aiLogger } from '@/services/aiLogger';
import { executionCounter } from '@/services/executionCounter';
import { executionHistory } from '@/services/executionHistory';
import { haptics } from '@/services/haptics';
import { CATEGORY_DATA, CatScript } from '@/services/scriptLibraryData';
import { detectErrorPattern, ErrorPattern } from '@/services/errorPatternDetector';
import { errorAutoFix, AutoFixResult } from '@/services/errorAutoFix';

// ─── Theme ───────────────────────────────────────────────────────
const C = {
  bg:      '#0A0E14',
  bgDark:  '#060D12',
  bgCard:  'rgba(24,26,31,0.95)',
  green:   '#00FF88',
  cyan:    '#00D4FF',
  gold:    '#FFC400',
  amber:   '#FF6A1F',
  red:     '#FF4444',
  orange:  '#FF6A1F',
  purple:  '#FFC400',
  text:    '#E0E8F0',
  textDim: '#7A8AA8',
  border:  '#1a2333',
};
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

function diffColor(d: CatScript['difficulty']): string {
  return d === 'BEGINNER' ? C.green : d === 'INTERMEDIATE' ? C.orange : C.red;
}

async function copyText(text: string) {
  try {
    if (Platform.OS === 'web') {
      await (navigator as any).clipboard.writeText(text);
    } else {
      const { setStringAsync } = await import('expo-clipboard');
      await setStringAsync(text);
    }
  } catch {}
}

// ─── Copy Code Button ─────────────────────────────────────────────
function CopyCodeBtn({ code, color }: { code: string; color?: string }) {
  const [copied, setCopied] = useState(false);
  const accent = color || C.cyan;
  return (
    <TouchableOpacity
      style={[ccb.btn, copied && { borderColor: C.green + '80', backgroundColor: C.green + '15' }]}
      onPress={async () => {
        haptics.light();
        await copyText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
      <MaterialIcons name={copied ? 'check' : 'content-copy'} size={12} color={copied ? C.green : accent} />
      <Text style={[ccb.txt, { color: copied ? C.green : accent }]}>{copied ? 'COPIED!' : 'COPY'}</Text>
    </TouchableOpacity>
  );
}
const ccb = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 5, borderWidth: 1, borderColor: '#2A4A60', backgroundColor: '#1A2D3E' },
  txt: { fontSize: 8, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.8 },
});

// ─── Fix Banner ───────────────────────────────────────────────────
function FixBanner({ pattern }: { pattern: ErrorPattern }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [expanded, setExpanded]   = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);

  const accentColor = pattern.color;
  return (
    <View style={[fb.card, { borderColor: accentColor + '70', borderLeftColor: accentColor }]}>
      <TouchableOpacity style={fb.headerRow} onPress={() => setExpanded(v => !v)} activeOpacity={0.85}>
        <Animated.View style={[fb.pulseOrb, { backgroundColor: accentColor + '40', opacity: pulseAnim }]} />
        <View style={[fb.typeBadge, { borderColor: accentColor + '60', backgroundColor: accentColor + '18' }]}>
          <MaterialIcons name="auto-fix-high" size={11} color={accentColor} />
          <Text style={[fb.typeTxt, { color: accentColor }]}>AUTO-FIX</Text>
        </View>
        <Text style={[fb.errorType, { color: accentColor }]}>{pattern.type}</Text>
        <View style={[fb.severityBadge, { backgroundColor: pattern.severity === 'critical' ? '#FF3C5A20' : '#FFC40020', borderColor: pattern.severity === 'critical' ? '#FF3C5A60' : '#FFC40060' }]}>
          <Text style={[fb.severityTxt, { color: pattern.severity === 'critical' ? '#FF3C5A' : '#FFC400' }]}>{pattern.severity.toUpperCase()}</Text>
        </View>
        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={16} color={accentColor} />
      </TouchableOpacity>

      {expanded ? (
        <>
          <Text style={[fb.title, { color: accentColor }]}>{pattern.title}</Text>
          <View style={fb.explanationBox}>
            <MaterialIcons name="info-outline" size={11} color={C.text} />
            <Text style={fb.explanationTxt}>{pattern.explanation}</Text>
          </View>
          <View style={fb.fixList}>
            <Text style={fb.fixListLabel}>⚡ EXACT FIX COMMANDS:</Text>
            {pattern.fixes.map((fix, idx) => {
              const isCopied = copiedIdx === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[fb.fixRow, { borderColor: isCopied ? C.green + '80' : accentColor + '35' }]}
                  onPress={async () => { haptics.medium(); await copyText(fix.command); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2200); }}
                  activeOpacity={0.82}>
                  <MaterialIcons name={fix.icon as any} size={13} color={isCopied ? C.green : accentColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={[fb.fixLabel, { color: isCopied ? C.green : C.text }]}>{fix.label}</Text>
                    <Text style={[fb.fixCmd, { color: isCopied ? C.green : accentColor }]} numberOfLines={2}>{fix.command}</Text>
                  </View>
                  <View style={[fb.copyBtn, { borderColor: isCopied ? C.green + '60' : accentColor + '50', backgroundColor: isCopied ? C.green + '18' : accentColor + '15' }]}>
                    <MaterialIcons name={isCopied ? 'check' : 'content-copy'} size={11} color={isCopied ? C.green : accentColor} />
                    <Text style={[fb.copyTxt, { color: isCopied ? C.green : accentColor }]}>{isCopied ? 'COPIED' : 'COPY'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {pattern.docsUrl ? (
            <View style={fb.docsRow}>
              <MaterialIcons name="open-in-new" size={9} color={C.textDim} />
              <Text style={fb.docsTxt} numberOfLines={1}>{pattern.docsUrl}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
const fb = StyleSheet.create({
  card: { backgroundColor: '#0A1B2C', borderRadius: 10, borderWidth: 1, borderLeftWidth: 3, marginBottom: 10, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, paddingBottom: 8 },
  pulseOrb: { width: 8, height: 8, borderRadius: 4 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  typeTxt: { fontSize: 7, fontWeight: '700', fontFamily: MONO, letterSpacing: 1 },
  errorType: { flex: 1, fontSize: 9, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  severityBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  severityTxt: { fontSize: 6, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.8 },
  title: { fontSize: 12, fontWeight: '700', fontFamily: MONO, paddingHorizontal: 12, marginBottom: 8 },
  explanationBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#0E1E2E', borderRadius: 7, padding: 10, marginHorizontal: 10, marginBottom: 10 },
  explanationTxt: { fontSize: 10, color: '#C8E0EE', lineHeight: 15, flex: 1 },
  fixList: { paddingHorizontal: 10, paddingBottom: 4 },
  fixListLabel: { fontSize: 7, fontWeight: '700', color: '#7AAEC4', fontFamily: MONO, letterSpacing: 1.5, marginBottom: 6 },
  fixRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1A1D24', borderWidth: 1, borderRadius: 8, padding: 9, marginBottom: 6 },
  fixLabel: { fontSize: 9, fontWeight: '600', marginBottom: 2 },
  fixCmd: { fontSize: 9, fontFamily: MONO, lineHeight: 13 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  copyTxt: { fontSize: 7, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.8 },
  docsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingBottom: 10 },
  docsTxt: { fontSize: 8, color: '#7AAEC4', fontFamily: MONO, flex: 1 },
});

// ─── KB Suggestion Banner ─────────────────────────────────────────
function KBSuggestionBanner({ suggestions }: { suggestions: Array<{ topic: string; summary: string; confidence: number }> }) {
  if (!suggestions.length) return null;
  return (
    <View style={ksb.wrap}>
      <View style={ksb.hdr}>
        <MaterialCommunityIcons name="brain" size={12} color={C.purple} />
        <Text style={ksb.hdrTxt}>KNOWLEDGE BASE INSIGHTS</Text>
        <View style={ksb.badge}><Text style={ksb.badgeTxt}>{suggestions.length} match{suggestions.length > 1 ? 'es' : ''}</Text></View>
      </View>
      {suggestions.slice(0, 2).map((s, i) => (
        <View key={i} style={ksb.item}>
          <View style={[ksb.dot, { backgroundColor: C.purple }]} />
          <View style={{ flex: 1 }}>
            <Text style={ksb.topic}>{s.topic}</Text>
            <Text style={ksb.summary} numberOfLines={2}>{s.summary}</Text>
          </View>
          <View style={ksb.confBadge}>
            <Text style={ksb.confTxt}>{Math.round(s.confidence * 100)}%</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
const ksb = StyleSheet.create({
  wrap: { backgroundColor: '#100A1C', borderRadius: 10, borderWidth: 1, borderColor: C.purple + '50', marginBottom: 10, overflow: 'hidden', padding: 12 },
  hdr: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  hdrTxt: { flex: 1, fontSize: 8, fontWeight: '700', color: C.purple, fontFamily: MONO, letterSpacing: 1 },
  badge: { backgroundColor: C.purple + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt: { fontSize: 7, fontWeight: '700', color: C.purple, fontFamily: MONO },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 4 },
  topic: { fontSize: 9, fontWeight: '700', color: C.text, fontFamily: MONO },
  summary: { fontSize: 9, color: C.textDim, lineHeight: 13, marginTop: 1 },
  confBadge: { backgroundColor: '#1A1030', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: C.purple + '40' },
  confTxt: { fontSize: 8, color: C.purple, fontFamily: MONO, fontWeight: '700' },
});

// ─── Connection Banner ────────────────────────────────────────────
function ConnectionBanner({ connected }: { connected: boolean | null }) {
  if (connected === null) return null;
  const col = connected ? C.green : C.red;
  return (
    <View style={[bn.bar, { borderColor: col + '50', backgroundColor: col + '0A' }]}>
      <View style={[bn.dot, { backgroundColor: col }]} />
      <Text style={[bn.txt, { color: col }]}>
        {connected
          ? 'PC SERVER ONLINE · Tap any script to run'
          : 'PC OFFLINE · Go to CONNECT tab to pair your PC'}
      </Text>
    </View>
  );
}
const bn = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 14, marginBottom: 8, borderRadius: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  txt: { flex: 1, fontSize: 9, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.8 },
});

// ─── Script Execution Modal ────────────────────────────────────────
function ExecutionModal({
  visible, script, catColor, onClose, onExecuted,
}: {
  visible: boolean;
  script: CatScript | null;
  catColor: string;
  onClose: () => void;
  onExecuted?: (success: boolean, ms: number) => void;
}) {
  const insets    = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [running, setRunning]       = useState(false);
  const [output,  setOutput]        = useState('');
  const [status,  setStatus]        = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [elapsed, setElapsed]       = useState<number | null>(null);
  const [copied,  setCopied]        = useState(false);
  const [autoFixResult, setAutoFixResult] = useState<AutoFixResult | null>(null);
  const [fixLoading, setFixLoading] = useState(false);

  useEffect(() => {
    if (visible && script) {
      setOutput(''); setStatus('idle'); setRunning(false);
      setElapsed(null); setCopied(false); setAutoFixResult(null); setFixLoading(false);
    }
  }, [visible, script?.id]);

  // Auto-analyze error when execution fails
  useEffect(() => {
    if (status !== 'error' || !output || autoFixResult) return;
    setFixLoading(true);
    errorAutoFix.analyze(output, script?.name || 'Script').then(result => {
      setAutoFixResult(result);
      setFixLoading(false);
      if (result.pattern) {
        aiLogger.warn(`[CategoryDetail] Auto-fix found: ${result.pattern.type} for ${script?.name}`);
      }
    }).catch(() => setFixLoading(false));
  }, [status, output]);

  const run = useCallback(async () => {
    if (!script || running) return;
    setRunning(true); setStatus('running'); setElapsed(null);
    setOutput('>>> Connecting to server...\n>>> Sending script...\n');
    setAutoFixResult(null); setFixLoading(false);
    haptics.medium();

    const t0 = Date.now();
    aiLogger.info(`[Exec] RUN: ${script.name}`);

    const result = await scriptExecutor.execute(script.code, 'python', { timeout: 45000 });
    const ms = Date.now() - t0;
    setElapsed(ms);
    setRunning(false);

    if (result.success) {
      setStatus('success');
      setOutput(`>>> Done in ${ms}ms\n\n${result.output?.trim() || '(no output)'}`);
      aiLogger.success(`[Exec] OK: ${script.name} (${ms}ms)`);
      haptics.success?.();
      executionCounter.increment(script.id).catch(() => {});
      executionHistory.addEntry({
        scriptId: script.id, scriptName: script.name,
        category: 'Library', success: true, ms,
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    } else {
      setStatus('error');
      const err = result.error || 'Unknown error';
      setOutput(`>>> FAILED (${ms}ms)\n>>> ${err}${result.output ? '\n\n' + result.output : ''}`);
      aiLogger.error(`[Exec] FAIL: ${script.name} — ${err}`);
      haptics.warning?.();
      executionHistory.addEntry({
        scriptId: script.id, scriptName: script.name,
        category: 'Library', success: false, ms,
        timestamp: new Date().toISOString(), error: err,
      }).catch(() => {});
    }
    onExecuted?.(result.success, ms);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }, [script, running, onExecuted]);

  if (!script) return null;
  const statusCol = status === 'success' ? C.green : status === 'error' ? C.red : catColor;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[em.root, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={[em.hdr, { borderBottomColor: catColor }]}>
          <TouchableOpacity onPress={onClose} style={em.back} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="arrow-back" size={22} color={catColor} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[em.title, { color: catColor }]} numberOfLines={2}>{script.name}</Text>
            <Text style={em.sub} numberOfLines={1}>{script.desc}</Text>
          </View>
          <View style={[em.diffBadge, { backgroundColor: diffColor(script.difficulty) + '25' }]}>
            <Text style={[em.diffTxt, { color: diffColor(script.difficulty) }]}>{script.difficulty}</Text>
          </View>
        </View>

        {/* Tags + meta */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }} contentContainerStyle={em.metaRow}>
          <View style={em.metaItem}>
            <MaterialIcons name="schedule" size={12} color={C.textDim} />
            <Text style={em.metaTxt}>~{script.time}</Text>
          </View>
          {script.admin ? (
            <View style={em.metaItem}>
              <MaterialIcons name="admin-panel-settings" size={12} color={C.orange} />
              <Text style={[em.metaTxt, { color: C.orange }]}>Admin</Text>
            </View>
          ) : null}
          {script.tags.map(t => (
            <View key={t} style={em.tag}><Text style={em.tagTxt}>#{t}</Text></View>
          ))}
        </ScrollView>

        {/* Code */}
        <View style={em.codeSect}>
          <View style={em.codeLblRow}>
            <Text style={em.codeLbl}>PYTHON · {script.code.split('\n').length} lines</Text>
            <CopyCodeBtn code={script.code} color={catColor} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }} showsVerticalScrollIndicator={false}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={em.code} selectable>{script.code}</Text>
            </ScrollView>
          </ScrollView>
        </View>

        {/* Output + Auto-Fix */}
        {output ? (
          <View style={em.outBox}>
            <View style={em.outHdr}>
              <View style={[em.outDot, { backgroundColor: statusCol }]} />
              <Text style={[em.outLbl, { color: statusCol }]}>
                {status === 'running' ? 'EXECUTING...'
                  : status === 'success' ? `SUCCESS · ${elapsed}ms`
                  : `ERROR · ${elapsed}ms`}
              </Text>
              {status !== 'running' ? (
                <TouchableOpacity onPress={() => copyText(output)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="content-copy" size={11} color={C.textDim} />
                </TouchableOpacity>
              ) : null}
            </View>
            <ScrollView ref={scrollRef} style={{ maxHeight: 140 }} contentContainerStyle={{ padding: 12 }} showsVerticalScrollIndicator={false}>
              <Text style={[em.outTxt, { color: status === 'error' ? '#FF7070' : C.green }]} selectable>
                {output}
              </Text>
            </ScrollView>

            {/* ── Auto-Fix Banner ── */}
            {status === 'error' ? (
              <View style={em.fixSection}>
                {fixLoading ? (
                  <View style={em.fixLoading}>
                    <ActivityIndicator size="small" color={C.amber} />
                    <Text style={em.fixLoadingTxt}>Analyzing error with KB + pattern engine...</Text>
                  </View>
                ) : null}
                {autoFixResult?.pattern ? (
                  <FixBanner pattern={autoFixResult.pattern} />
                ) : (!fixLoading && !autoFixResult?.pattern) ? (
                  <View style={em.genericHint}>
                    <MaterialIcons name="lightbulb-outline" size={12} color={C.amber} />
                    <Text style={em.genericHintTxt}>Ask Butler AI: &quot;How do I fix this error in my script?&quot;</Text>
                  </View>
                ) : null}
                {autoFixResult?.kbSuggestions && autoFixResult.kbSuggestions.length > 0 ? (
                  <KBSuggestionBanner suggestions={autoFixResult.kbSuggestions} />
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Run button */}
        <View style={[em.footer, { paddingBottom: Math.max(insets.bottom + 10, 20) }]}>
          <TouchableOpacity
            style={[em.runBtn, { backgroundColor: running ? '#1A1D24' : catColor, borderColor: catColor, opacity: running ? 0.75 : 1 }]}
            onPress={run} disabled={running} activeOpacity={0.85}>
            {running
              ? <><ActivityIndicator color={catColor} size="small" /><Text style={[em.runTxt, { color: catColor }]}>EXECUTING ON PC...</Text></>
              : <><MaterialIcons name="play-arrow" size={22} color={C.bgDark} /><Text style={[em.runTxt, { color: C.bgDark }]}>{status !== 'idle' ? 'RUN AGAIN' : 'RUN ON MY PC'}</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const C_bgDark = '#060D12';
const em = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C_bgDark },
  hdr:        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 2 },
  back:       { padding: 4 },
  title:      { fontSize: 14, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  sub:        { fontSize: 9, color: C.textDim, fontFamily: MONO, marginTop: 2 },
  diffBadge:  { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  diffTxt:    { fontSize: 8, fontWeight: '700', letterSpacing: 0.8 },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  metaItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt:    { fontSize: 9, color: C.textDim, fontFamily: MONO },
  tag:        { backgroundColor: C.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagTxt:     { fontSize: 8, color: C.cyan, fontFamily: MONO },
  codeSect:   { flex: 1, backgroundColor: '#060A0F', borderTopWidth: 1, borderTopColor: C.border },
  codeLblRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  codeLbl:    { flex: 1, fontSize: 8, color: C.cyan, fontFamily: MONO, letterSpacing: 1.5 },
  code:       { fontSize: 11, color: C.green, fontFamily: MONO, lineHeight: 18 },
  outBox:     { backgroundColor: '#050810', borderTopWidth: 2, borderTopColor: C.green },
  outHdr:     { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  outDot:     { width: 7, height: 7, borderRadius: 4 },
  outLbl:     { flex: 1, fontSize: 8, fontWeight: '700', fontFamily: MONO, letterSpacing: 1.2 },
  outTxt:     { fontSize: 11, fontFamily: MONO, lineHeight: 17 },
  fixSection: { paddingHorizontal: 12, paddingBottom: 8, paddingTop: 4 },
  fixLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  fixLoadingTxt: { fontSize: 9, color: C.amber, fontFamily: MONO, flex: 1 },
  genericHint:{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#1A1200', borderWidth: 1, borderColor: C.amber + '60', borderRadius: 8, padding: 10, marginBottom: 8 },
  genericHintTxt: { fontSize: 10, color: '#FFA040', fontFamily: MONO, flex: 1, lineHeight: 15 },
  footer:     { padding: 14, borderTopWidth: 1, borderTopColor: C.border },
  runBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 10, paddingVertical: 15, borderWidth: 1.5,
    ...Platform.select({
      ios: { shadowColor: C.green, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  runTxt:   { fontSize: 14, fontWeight: '700', fontFamily: MONO, letterSpacing: 1.2 },
});

// ─── Main Screen ───────────────────────────────────────────────────
export default function CategoryDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const insets   = useSafeAreaInsets();
  const [selectedScript, setSelectedScript] = useState<CatScript | null>(null);
  const [modalVisible,   setModalVisible]   = useState(false);
  const [serverOk,       setServerOk]       = useState<boolean | null>(null);

  // ── Bulletproof id decode — safe on Android Hermes ───────────
  const rawId = Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
  const categoryId = (() => {
    try { return decodeURIComponent(String(rawId)); }
    catch { return String(rawId); }
  })();

  const cat = CATEGORY_DATA[categoryId];

  // ── Health check + server sync on mount ──────────────────────
  useEffect(() => {
    let active = true;
    aiLogger.info(`[CategoryDetail] Mount — id="${categoryId}" found=${!!cat}`);
    if (!cat) {
      aiLogger.warn(`[CategoryDetail] Unknown category: "${categoryId}". Available: ${Object.keys(CATEGORY_DATA).join(', ')}`);
    }
    scriptExecutor.isServerReachable().then(ok => {
      if (!active) return;
      setServerOk(ok);
      if (ok) aiLogger.success('[CategoryDetail] Server reachable');
      else    aiLogger.warn('[CategoryDetail] Server offline');
    }).catch(e => {
      if (!active) return;
      setServerOk(false);
      aiLogger.error(`[CategoryDetail] Reachability check error: ${e?.message}`);
    });
    // Invalidate KB cache so auto-fix uses fresh data
    errorAutoFix.invalidateCache();
    return () => { active = false; };
  }, [categoryId, cat]);

  const openScript = useCallback((script: CatScript) => {
    haptics.selection();
    aiLogger.info(`[CategoryDetail] Open script: ${script.name}`);
    setSelectedScript(script);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setSelectedScript(null);
  }, []);

  // ── Unknown category — graceful fallback ─────────────────────
  if (!cat) {
    return (
      <View style={[s.root, { paddingTop: Math.max(insets.top, 20) }]}>
        <LinearGradient colors={[C_bgDark, C.bg]} style={StyleSheet.absoluteFill} />
        <View style={s.hdr}>
          <TouchableOpacity onPress={() => router.back()} style={s.back}>
            <MaterialIcons name="arrow-back" size={24} color={C.green} />
          </TouchableOpacity>
          <Text style={[s.hdrTitle, { color: C.green }]}>{categoryId || 'Category'}</Text>
        </View>
        <View style={s.center}>
          <MaterialCommunityIcons name="code-braces" size={48} color={C.textDim} />
          <Text style={s.notFound}>Category not found</Text>
          <Text style={s.notFoundSub}>
            ID: &quot;{categoryId}&quot;{'\n'}Scripts for this category are being added.
          </Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={14} color={C.green} />
            <Text style={s.backBtnTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: Math.max(insets.top, 20) }]}>
      <LinearGradient colors={[C_bgDark, C.bg, C_bgDark]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[s.hdr, { borderBottomColor: cat.color }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <MaterialIcons name="arrow-back" size={24} color={cat.color} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.hdrTitle, { color: cat.color }]}>{cat.title}</Text>
          <Text style={s.hdrSub}>{cat.subtitle}</Text>
        </View>
        <View style={[s.countBadge, { backgroundColor: cat.color + '20', borderColor: cat.color + '60' }]}>
          <Text style={[s.countTxt, { color: cat.color }]}>{cat.scripts.length}</Text>
        </View>
      </View>

      {/* Connection banner */}
      <ConnectionBanner connected={serverOk} />

      {/* Script list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 6, paddingBottom: insets.bottom + 100, gap: 10 }}
        showsVerticalScrollIndicator={false}>
        {cat.scripts.map((script, idx) => (
          <TouchableOpacity
            key={script.id}
            style={s.card}
            onPress={() => openScript(script)}
            activeOpacity={0.85}>
            <LinearGradient
              colors={['rgba(24,26,31,0.97)', 'rgba(10,11,13,0.99)']}
              style={s.cardGrad}>
              <View style={[s.cardBorder, { borderColor: cat.color + '50' }]} />
              <View style={[s.idxBadge, { backgroundColor: cat.color + '20' }]}>
                <Text style={[s.idxTxt, { color: cat.color }]}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.cardHdr}>
                  <Text style={[s.scriptName, { color: cat.color }]} numberOfLines={2}>{script.name}</Text>
                  <View style={[s.diffBadge, { backgroundColor: diffColor(script.difficulty) + '20' }]}>
                    <Text style={[s.diffTxt, { color: diffColor(script.difficulty) }]}>{script.difficulty}</Text>
                  </View>
                </View>
                <Text style={s.scriptDesc} numberOfLines={2}>{script.desc}</Text>
                <View style={s.cardFoot}>
                  <MaterialIcons name="schedule" size={10} color={C.textDim} />
                  <Text style={s.timeT}>{script.time}</Text>
                  {script.admin
                    ? <><MaterialIcons name="admin-panel-settings" size={10} color={C.orange} /><Text style={[s.timeT, { color: C.orange }]}>Admin</Text></>
                    : null}
                  <View style={s.tagsRow}>
                    {script.tags.slice(0, 2).map(t => (
                      <View key={t} style={s.tagChip}><Text style={s.tagTxt}>#{t}</Text></View>
                    ))}
                  </View>
                </View>
              </View>
              <MaterialIcons name="play-circle-outline" size={28} color={cat.color} />
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ExecutionModal
        visible={modalVisible}
        script={selectedScript}
        catColor={cat.color}
        onClose={closeModal}
        onExecuted={(ok, ms) => aiLogger.info(`[CategoryDetail] Done: ok=${ok} ms=${ms}`)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C_bgDark },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 32 },
  notFound:    { fontSize: 18, fontWeight: '700', color: C.textDim, fontFamily: MONO },
  notFoundSub: { fontSize: 11, color: C.textDim, textAlign: 'center', lineHeight: 17 },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: C.green + '60', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.green + '10', marginTop: 8 },
  backBtnTxt:  { fontSize: 12, fontWeight: '700', color: C.green, fontFamily: MONO },
  hdr:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 2 },
  back:        { padding: 4 },
  hdrTitle:    { fontSize: 16, fontWeight: '700', fontFamily: MONO, letterSpacing: 1 },
  hdrSub:      { fontSize: 9, color: C.textDim, fontFamily: MONO, marginTop: 2 },
  countBadge:  { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  countTxt:    { fontSize: 14, fontWeight: '700', fontFamily: MONO },
  card:        { borderRadius: 12, overflow: 'hidden' },
  cardGrad:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, position: 'relative' },
  cardBorder:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 12, borderWidth: 2 },
  idxBadge:    { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  idxTxt:      { fontSize: 13, fontWeight: '700', fontFamily: MONO },
  cardHdr:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  scriptName:  { fontSize: 13, fontWeight: '700', fontFamily: MONO, flex: 1, marginRight: 8 },
  diffBadge:   { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  diffTxt:     { fontSize: 7, fontWeight: '700', letterSpacing: 0.8 },
  scriptDesc:  { fontSize: 10, color: C.textDim, lineHeight: 15 },
  cardFoot:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, flexWrap: 'wrap' },
  timeT:       { fontSize: 8, color: C.textDim, fontFamily: MONO },
  tagsRow:     { flexDirection: 'row', gap: 4, marginLeft: 4 },
  tagChip:     { backgroundColor: 'rgba(255,42,31,0.1)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,42,31,0.25)' },
  tagTxt:      { fontSize: 7, color: C.cyan, fontFamily: MONO },
});
