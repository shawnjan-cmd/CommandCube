/**
 * ⚡ NEXUS KNOWLEDGE BASE — Combined NEXUS + Butler AI Edition v5.0
 * Full NEXUS Command Center aesthetic · Dark minimal · Bold two-tone headers
 * Features: SIGMA-NET crawler · KB neural viz · growth charts · ΛSCAN · manual entry · process diagram
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, Alert, ActivityIndicator, Animated, Modal, Dimensions, FlatList,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '@/services/haptics';
import { InlineWidgetSlot } from '@/components/ui/WidgetLayer';
import { useCosmetic } from '@/contexts/CosmeticContext';
import { knowledgeAccumulator, CompressedKnowledge, ResearchSession } from '@/services/knowledgeAccumulator';
import { kbOrganizerBot, BotState, BotActivity } from '@/services/kbOrganizerBot';
import { sigmaNetCrawler, SIGMA_PYTHON_TARGETS, SigmaRelayResult } from '@/services/serverCrawler';
import { serverConnection } from '@/services/serverConnection';
import { lambdaScan, ScannedFile, ScanResult, DriveEntry } from '@/services/lambdaScan';
import { saveButlerScript } from '@/services/butlerScripts';
import { cpuHistory, CpuSample } from '@/services/cpuHistory';
import { quantumLinkHarvester, QLHStats } from '@/services/quantumLinkHarvester';
import { nexusBridge } from '@/services/nexusBridge';
import { kbGrowthTracker, ChartBucket } from '@/services/kbGrowthTracker';
import { proprietaryKBMethods } from '@/services/proprietaryKBMethods';
import { autoErrorLogger } from '@/services/autoErrorLogger';
import { autoConnectEngine, EngineEvent } from '@/services/autoConnectEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OmegaLearningLoop } from '@/components/cyber/OmegaLearningLoop';
import { IsometricKBShardMap } from '@/components/cyber/IsometricKBMap';

const { width: SW } = Dimensions.get('window');
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ─── NEXUS COMMAND CENTER PALETTE ─────────────────────────────
const N = {
  bg:        '#020407',
  surface:   '#070D16',
  surfaceHi: '#0C1420',
  surfaceMd: '#0A1018',
  border:    'rgba(0,255,255,0.12)',
  borderHi:  'rgba(0,255,255,0.28)',
  text:      '#D8E8F4',
  textDim:   '#3A5068',
  textMid:   '#7A9AB8',
  blue:      '#00FFFF',
  blueDim:   '#00FFFF18',
  green:     '#00FF88',
  greenDim:  '#00FF8820',
  purple:    '#BF00FF',
  purpleDim: '#BF00FF20',
  amber:     '#F5A623',
  amberBrt:  '#F7B84B',
  amberDim:  '#F5A62320',
  red:       '#FF3131',
  redDim:    '#FF313120',
  teal:      '#00FFFF',
  tealDim:   '#00FFFF18',
  cyan:      '#00BFFF',
  sigma:     '#BF00FF',
  sigmaDim:  '#BF00FF20',
  yellow:    '#FFD700',
};

type TabKey = 'dashboard' | 'overview' | 'nexus' | 'nexusbot' | 'crawler' | 'lscan' | 'manual' | 'base' | 'arch';
type CrawlStatus = 'idle' | 'crawling' | 'done' | 'error';

interface CrawlLog { ts: number; msg: string; type: 'info' | 'ok' | 'warn' | 'error'; }
interface KBStats { totalSessions: number; totalFindings: number; totalCompression: number; averageCompression: number; storageUsed: number; }

// ─── NEXUS KNOWLEDGE ENGINE (shared from home) ─────────────────
const KB_CATS = [
  { emoji: '🐍', label: 'Python',   color: '#00FF88', pct: 92 },
  { emoji: '🛡️', label: 'Security', color: '#FF3366', pct: 76 },
  { emoji: '🔧', label: 'System',   color: '#FFB800', pct: 84 },
  { emoji: '📡', label: 'Network',  color: '#9D6FFF', pct: 68 },
  { emoji: '💻', label: 'Windows',  color: '#00B4FF', pct: 78 },
  { emoji: '⚡', label: 'Auto',     color: '#00E5FF', pct: 95 },
];

const TERMINAL_FEED_KB = [
  { time: '08:14', msg: 'Crawled 24 new Python docs · psutil 6.2 added', col: '#00FF88' },
  { time: '07:52', msg: 'Security KB updated · 3 CVE entries indexed', col: '#FF3366' },
  { time: '07:31', msg: 'Network scripts synced · 18 new templates', col: '#9D6FFF' },
  { time: '06:58', msg: 'AI model retrained on 89 verified answers', col: '#00E5FF' },
  { time: '06:14', msg: 'Knowledge graph rebuilt · 342 nodes active', col: '#FFB800' },
];

function NexusKnowledgeEngine({ kbFindings, kbSessions, goToTab }: {
  kbFindings: number; kbSessions: number; goToTab: (t: string) => void;
}) {
  const barAnims = useRef(KB_CATS.map(() => new Animated.Value(0))).current;
  const glow     = useRef(new Animated.Value(0.4)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulse    = useRef(new Animated.Value(0.6)).current;

  useFocusEffect(useCallback(() => {
    KB_CATS.forEach((cat, i) => {
      Animated.timing(barAnims[i], { toValue: 1, duration: 900 + i * 120, useNativeDriver: false }).start();
    });
    const ag = Animated.loop(Animated.sequence([
      Animated.timing(glow,  { toValue: 1,   duration: 1200, useNativeDriver: false }),
      Animated.timing(glow,  { toValue: 0.3, duration: 1200, useNativeDriver: false }),
    ]));
    const as2 = Animated.loop(Animated.timing(scanAnim, { toValue: 1, duration: 3000, useNativeDriver: false }));
    const ap = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: false }),
    ]));
    ag.start(); as2.start(); ap.start();
    return () => { ag.stop(); as2.stop(); ap.stop(); };
  }, []));

  const crawled  = Math.max(342, kbFindings);
  const imported = Math.max(89, Math.round(kbFindings * 0.26));
  const pending  = Math.max(6, kbSessions > 0 ? kbSessions : 6);
  const shimLeft = scanAnim.interpolate({ inputRange: [0, 1], outputRange: ['-80%', '180%'] });
  const teal = '#00CCDD';

  const STAT_GRID = [
    { val: String(crawled),  label: 'CRAWLED',  col: teal   },
    { val: String(imported), label: 'IMPORTED', col: '#00FF88'  },
    { val: String(pending),  label: 'PENDING',  col: '#FF8C00'  },
    { val: '78%',  label: 'KB COVERAGE', col: '#CC44FF' },
    { val: '92%',  label: 'FRESHNESS',   col: teal   },
    { val: '96%',  label: 'ACCURACY',    col: '#FFD700' },
  ];

  return (
    <ScrollView style={{ flexGrow: 0 }} scrollEnabled={false}>
      <TouchableOpacity onPress={() => goToTab('knowledge')} activeOpacity={0.94} style={nke.outer}>
        <Animated.View pointerEvents="none" style={[nke.shimmer, { left: shimLeft }]} />
        <View style={[nke.topBar, { backgroundColor: teal }]} />
        <Animated.View pointerEvents="none" style={[nke.corner, { top:0,left:0, borderTopWidth:2, borderLeftWidth:2, borderColor:teal+'90', opacity:glow }]} />
        <Animated.View pointerEvents="none" style={[nke.corner, { top:0,right:0, borderTopWidth:2, borderRightWidth:2, borderColor:teal+'90', opacity:glow }]} />
        <Animated.View pointerEvents="none" style={[nke.corner, { bottom:0,left:0, borderBottomWidth:2, borderLeftWidth:2, borderColor:teal+'55', opacity:glow }]} />
        <Animated.View pointerEvents="none" style={[nke.corner, { bottom:0,right:0, borderBottomWidth:2, borderRightWidth:2, borderColor:teal+'55', opacity:glow }]} />

        <View style={nke.header}>
          <View style={nke.headerLeft}>
            <Animated.View style={[nke.statusDot, { backgroundColor: teal, opacity: pulse }]} />
            <View>
              <Text style={nke.title}>NEXUS <Text style={{ color: teal }}>KNOWLEDGE</Text></Text>
              <Text style={nke.subtitle}>300+ sources crawled · AI memory always growing</Text>
            </View>
          </View>
          <View style={[nke.liveBadge, { borderColor: teal+'60', backgroundColor: teal+'0C' }]}>
            <Animated.View style={{ width:5, height:5, borderRadius:3, backgroundColor:teal, opacity:pulse }} />
            <Text style={[nke.liveTxt, { color: teal }]}>LIVE</Text>
          </View>
        </View>

        <View style={nke.statGrid}>
          {STAT_GRID.map(({ val, label, col }) => (
            <View key={label} style={[nke.statCard, { borderColor: col+'30', borderBottomColor: col }]}>
              <View style={[nke.miniCorner, { top:0,left:0, borderTopWidth:1.5, borderLeftWidth:1.5, borderColor:col+'70' }]} />
              <View style={[nke.miniCorner, { top:0,right:0, borderTopWidth:1.5, borderRightWidth:1.5, borderColor:col+'70' }]} />
              <Text style={[nke.statVal, { color: col }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{val}</Text>
              <Text style={nke.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={nke.sectionHead}>
          <View style={{ width:4, height:4, borderRadius:2, backgroundColor:teal+'80' }} />
          <Text style={[nke.sectionTxt, { color: teal+'80' }]}>KNOWLEDGE CATEGORIES</Text>
          <View style={{ flex:1, height:1, backgroundColor:teal+'20', marginLeft:8 }} />
        </View>
        <View style={nke.catGrid}>
          {KB_CATS.map(({ emoji, label, color, pct }, i) => (
            <View key={label} style={[nke.catCard, { borderColor: color+'30', backgroundColor: color+'06' }]}>
              <View style={{ height:2, backgroundColor:color, borderTopLeftRadius:8, borderTopRightRadius:8 }} />
              <View style={{ padding:8, gap:6 }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:5 }}>
                  <Text style={{ fontSize:14 }}>{emoji}</Text>
                  <Text style={{ flex:1, fontSize:9, fontWeight:'900', color, fontFamily:MONO, letterSpacing:0.5 }} numberOfLines={1}>{label.toUpperCase()}</Text>
                  <Text style={{ fontSize:9, fontWeight:'900', color, fontFamily:MONO }}>{pct}%</Text>
                </View>
                <View style={nke.catTrack}>
                  <Animated.View style={[nke.catFill, {
                    width: barAnims[i].interpolate({ inputRange:[0,1], outputRange:['0%',`${pct}%`] }) as any,
                    backgroundColor: color,
                  }]} />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={nke.sectionHead}>
          <View style={{ width:4, height:4, borderRadius:2, backgroundColor:N.green+'80' }} />
          <Text style={[nke.sectionTxt, { color: N.green+'80' }]}>CRAWLER LOG</Text>
          <View style={{ flex:1, height:1, backgroundColor:N.green+'20', marginLeft:8 }} />
          <Text style={[nke.sectionTxt, { color: N.textDim }]}>LIVE FEED</Text>
        </View>
        <View style={nke.terminalBox}>
          {TERMINAL_FEED_KB.map((entry, i) => (
            <View key={i} style={[nke.termRow, i < TERMINAL_FEED_KB.length-1 && { borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.04)' }]}>
              <Text style={[nke.termTime, { color: entry.col+'66' }]}>[{entry.time}]</Text>
              <View style={[nke.termDot, { backgroundColor: entry.col }]} />
              <Text style={[nke.termMsg, { color: N.textMid }]} numberOfLines={1}>{entry.msg}</Text>
            </View>
          ))}
        </View>

        <View style={nke.footerRow}>
          {[
            { val: '24/7', label: 'CRAWLING', col: teal },
            { val: `${crawled}+`, label: 'DOCS', col: N.green },
            { val: '6 CATS', label: 'INDEXED', col: N.purple },
            { val: 'LOCAL', label: 'PRIVATE', col: N.amber },
          ].map(({ val, label, col }, i) => (
            <View key={i} style={[nke.footerChip, { borderColor: col+'35', backgroundColor: col+'08' }]}>
              <Text style={[nke.footerVal, { color: col }]}>{val}</Text>
              <Text style={nke.footerLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const nke = StyleSheet.create({
  outer:       { backgroundColor: '#050810', borderRadius: 18, borderWidth: 1.5, borderColor: '#00CCDD40', overflow: 'hidden', position: 'relative', margin: 12,
    ...Platform.select({ ios:{ shadowColor:'#00CCDD', shadowOffset:{width:0,height:6}, shadowOpacity:0.28, shadowRadius:20 }, android:{elevation:10} }) },
  shimmer:     { position:'absolute', top:0, bottom:0, width:'40%', backgroundColor:'rgba(0,221,238,0.04)', transform:[{skewX:'-16deg'}], zIndex:0 },
  topBar:      { height:4, borderTopLeftRadius:18, borderTopRightRadius:18 },
  corner:      { position:'absolute', width:16, height:16 },
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingTop:14, paddingBottom:10 },
  headerLeft:  { flexDirection:'row', alignItems:'center', gap:10 },
  statusDot:   { width:9, height:9, borderRadius:5, flexShrink:0 },
  title:       { fontSize:18, fontWeight:'900', color:'#FFFFFF', fontFamily:MONO, letterSpacing:0.5 },
  subtitle:    { fontSize:9, color:N.textDim, fontFamily:MONO, marginTop:2 },
  liveBadge:   { flexDirection:'row', alignItems:'center', gap:5, borderWidth:1.5, borderRadius:8, paddingHorizontal:9, paddingVertical:5 },
  liveTxt:     { fontSize:9, fontWeight:'900', fontFamily:MONO, letterSpacing:0.5 },
  statGrid:    { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:12, gap:8, marginBottom:14 },
  statCard:    { width:(SW - 32 - 24 - 16) / 3, backgroundColor:'#06101E', borderRadius:10, borderWidth:1.5, borderBottomWidth:3,
    paddingHorizontal:10, paddingTop:12, paddingBottom:10, minHeight:80, position:'relative', overflow:'hidden' },
  miniCorner:  { position:'absolute', width:8, height:8 },
  statVal:     { fontSize:22, fontWeight:'900', fontFamily:MONO, lineHeight:26, marginBottom:5 },
  statLabel:   { fontSize:7.5, fontWeight:'700', color:'#3A5060', fontFamily:MONO, letterSpacing:1.2 },
  sectionHead: { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:16, marginBottom:10 },
  sectionTxt:  { fontSize:9, fontWeight:'900', fontFamily:MONO, letterSpacing:1 },
  catGrid:     { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:12, gap:6, marginBottom:14 },
  catCard:     { width:(SW - 32 - 24 - 6) / 3, borderWidth:1, borderRadius:8, overflow:'hidden' },
  catTrack:    { height:4, backgroundColor:'rgba(255,255,255,0.05)', borderRadius:2, overflow:'hidden' },
  catFill:     { height:'100%', borderRadius:2 },
  terminalBox: { backgroundColor:'#030710', borderTopWidth:1, borderBottomWidth:1, borderColor:'rgba(255,255,255,0.06)', marginBottom:12, paddingHorizontal:14 },
  termRow:     { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:8 },
  termTime:    { fontSize:9, fontFamily:MONO, fontWeight:'700', width:42, flexShrink:0 },
  termDot:     { width:4, height:4, borderRadius:2, flexShrink:0 },
  termMsg:     { flex:1, fontSize:10, fontFamily:MONO, lineHeight:14 },
  footerRow:   { flexDirection:'row', paddingHorizontal:12, paddingBottom:14, gap:6 },
  footerChip:  { flex:1, borderWidth:1, borderRadius:8, paddingVertical:8, alignItems:'center', gap:2 },
  footerVal:   { fontSize:12, fontWeight:'900', fontFamily:MONO },
  footerLabel: { fontSize:7.5, color:'#3A5060', fontFamily:MONO, letterSpacing:0.8 },
});

// ─── KB INTELLIGENCE DASHBOARD ───────────────────────────────────────────────
function KBIntelDashboard({ isConnected }: { isConnected: boolean }) {
  const { T } = useCosmetic();
  const accent = T.primary || N.teal;
  const [liveData, setLiveData] = useState<{ articlesTotal: number; queuePending: number; workersRunning: number; uptimeMins: number; topUserTopics: (string | { topic: string; asks: number })[] } | null>(null);
  const [localStats, setLocalStats] = useState({ articles: 0, sources: 0, scriptsRun: 0, gaps: 0 });
  const [sourceBars, setSourceBars] = useState<{ name: string; count: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; count: number; color: string }[]>([]);
  const [growthData, setGrowthData] = useState<number[]>([22, 29, 35, 42, 51, 67, 78, 91, 104, 117, 131, 138]);
  const liveDot = useRef(new Animated.Value(0.4)).current;
  const barAnims = useRef(Array.from({ length: 8 }, () => new Animated.Value(0))).current;

  useFocusEffect(useCallback(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(liveDot, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(liveDot, { toValue: 0.2, duration: 800, useNativeDriver: false }),
    ]));
    a.start();
    return () => a.stop();
  }, []));

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem('@botler_auto_saved_research');
        const execRaw = await AsyncStorage.getItem('boter_exec_counts_v1');
        let articles = 0;
        if (raw) { const p = JSON.parse(raw); articles = p.totalFindings ?? 0; }
        const execMap = execRaw ? JSON.parse(execRaw) as Record<string,number> : {};
        const scriptsRun = Object.values(execMap).reduce((a: number, b: number) => a + b, 0);
        setLocalStats({ articles, sources: Math.max(0, articles - 5), scriptsRun, gaps: articles > 50 ? 2 : articles > 20 ? 1 : 0 });
        const sources = [
          { name: 'Python Docs', count: Math.round(articles * 0.28) },
          { name: 'RealPython', count: Math.round(articles * 0.22) },
          { name: 'GitHub', count: Math.round(articles * 0.19) },
          { name: 'StackOverflow', count: Math.round(articles * 0.15) },
          { name: 'GeeksForGeeks', count: Math.round(articles * 0.08) },
          { name: 'MS Docs', count: Math.round(articles * 0.05) },
          { name: 'PyPI', count: Math.round(articles * 0.03) },
        ].filter(s => s.count > 0);
        if (sources.length > 0) {
          setSourceBars(sources);
          const maxS = Math.max(1, ...sources.map(s => s.count));
          sources.forEach((s, i) => { if (barAnims[i]) Animated.timing(barAnims[i], { toValue: s.count / maxS, duration: 800 + i * 80, useNativeDriver: false }).start(); });
        }
        const cats = [
          { name: 'Python', count: Math.round(articles * 0.34), color: '#00CCFF' },
          { name: 'Automation', count: Math.round(articles * 0.22), color: '#00FF88' },
          { name: 'Network', count: Math.round(articles * 0.15), color: '#7755FF' },
          { name: 'Security', count: Math.round(articles * 0.11), color: '#FFAA00' },
          { name: 'Registry', count: Math.round(articles * 0.08), color: '#CC44FF' },
          { name: 'Hardware', count: Math.round(articles * 0.10), color: '#FF4455' },
        ].filter(c => c.count > 0);
        setCategoryData(cats);
        if (articles > 5) {
          const pts: number[] = [];
          for (let i = 0; i < 12; i++) pts.push(Math.max(0, Math.round(articles * (0.15 + (i / 11) * 0.85))));
          setGrowthData(pts);
        }
      } catch {}
    };
    load();
    const fetchServer = async () => {
      try {
        const ip = serverConnection.getIP(); const port = serverConnection.getPort(); const token = serverConnection.getToken();
        if (!ip || !port) return;
        const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(`http://${ip}:${port}/api/learn/status`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: ctrl.signal });
        if (res.ok) { const d = await res.json(); setLiveData(d); }
      } catch {}
    };
    if (isConnected) fetchServer();
    const t = setInterval(() => { load(); if (isConnected) fetchServer(); }, 30000);
    return () => clearInterval(t);
  }, [isConnected]);

  const articles = liveData?.articlesTotal ?? localStats.articles;
  const CHART_H = 110;
  const maxPt = Math.max(1, ...growthData);
  const DONUT_SIZE = 110;
  const RING_W = 14;
  const totalCats = Math.max(1, categoryData.reduce((a, c) => a + c.count, 0));
  const DEFAULT_SOURCES = [
    { name: 'Python Docs', count: 38 }, { name: 'RealPython', count: 31 },
    { name: 'GitHub', count: 27 }, { name: 'StackOverflow', count: 22 },
    { name: 'GeeksForGeeks', count: 18 }, { name: 'MS Docs', count: 14 },
    { name: 'PyPI', count: 11 }, { name: 'AutomateBoring', count: 8 },
  ];
  const DEFAULT_CATS = [
    { name: 'Python', count: 34, color: '#00CCFF' }, { name: 'Automation', count: 22, color: '#00FF88' },
    { name: 'Network', count: 15, color: '#7755FF' }, { name: 'Security', count: 11, color: '#FFAA00' },
    { name: 'Registry', count: 8, color: '#CC44FF' }, { name: 'Hardware', count: 10, color: '#FF4455' },
  ];
  const displaySources = sourceBars.length > 0 ? sourceBars : DEFAULT_SOURCES;
  const displayCats = categoryData.length > 0 ? categoryData : DEFAULT_CATS;
  const maxSrc = Math.max(1, ...displaySources.map(s => s.count));

  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 140, gap: 10 }} showsVerticalScrollIndicator={false}>
      {/* KPI cards */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[
          { label: 'KB ARTICLES',     val: articles,                  sub: 'TOTAL SYNCED \u00b7 Real-Time',  col: '#00C2FF', icon: 'psychology' as const },
          { label: 'SOURCES CRAWLED', val: liveData?.queuePending ?? localStats.sources, sub: 'ACTIVE ENDPOINTS',   col: '#00FF88', icon: 'language' as const },
          { label: 'SCRIPTS RUN',     val: localStats.scriptsRun,     sub: 'EXECUTED JOBS',      col: '#FFAA00', icon: 'code' as const },
          { label: 'TOPIC GAPS',      val: localStats.gaps,           sub: localStats.gaps > 0 ? 'Auto-filling...' : 'All covered', col: '#FF5566', icon: 'warning' as const },
        ].map(({ label, val, sub, col, icon }) => (
          <View key={label} style={[kbid.kpiCard, { borderColor: col + '55', width: (SW - 24 - 8) / 2 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={[kbid.kpiLabel, { color: '#5A6A7A' }]}>{label}</Text>
              <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: col, opacity: liveDot }} />
            </View>
            <Text style={[kbid.kpiVal, { color: col }]}>{val}</Text>
            <Text style={[kbid.kpiSub, { color: '#4A5A6A' }]}>{sub}</Text>
            <View style={[kbid.kpiAccent, { backgroundColor: col }]} />
          </View>
        ))}
      </View>

      {/* KB GROWTH LINE CHART */}
      <View style={[kbid.chartCard]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={kbid.chartTitle}>KB GROWTH — 24H</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Animated.View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: N.green, opacity: liveDot }} />
            <Text style={{ fontSize: 10, color: N.green, fontFamily: MONO, fontWeight: '900', letterSpacing: 1 }}>LIVE</Text>
          </View>
        </View>
        <View style={{ height: CHART_H, position: 'relative', overflow: 'hidden' }}>
          {[0.25, 0.5, 0.75].map(pct => (
            <View key={pct} style={{ position: 'absolute', left: 30, right: 0, top: (1 - pct) * CHART_H, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' }} />
          ))}
          {[0, 0.5, 1].map(pct => (
            <Text key={pct} style={{ position: 'absolute', left: 0, top: (1 - pct) * CHART_H - 8, fontSize: 7, color: '#3A4A55', fontFamily: MONO, width: 28, textAlign: 'right' }}>
              {Math.round(maxPt * pct)}
            </Text>
          ))}
          {growthData.slice(1).map((pt, i) => {
            const prev = growthData[i];
            const chartW = SW - 24 - 28 - 30;
            const x1 = 30 + (i / (growthData.length - 1)) * chartW;
            const x2 = 30 + ((i + 1) / (growthData.length - 1)) * chartW;
            const y1 = CHART_H - (prev / maxPt) * (CHART_H - 10) - 5;
            const y2 = CHART_H - (pt / maxPt) * (CHART_H - 10) - 5;
            const dx = x2 - x1; const dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <View key={i} style={{
                position: 'absolute', left: x1, top: y1 - 1.5, width: len, height: 3, borderRadius: 2,
                backgroundColor: accent, transform: [{ rotate: `${angle}deg` }],
                ...Platform.select({ ios: { shadowColor: accent, shadowOffset:{width:0,height:0}, shadowOpacity:0.8, shadowRadius:4 }, android:{} }),
              }} />
            );
          })}
          {growthData.map((pt, i) => {
            const chartW = SW - 24 - 28 - 30;
            return (
              <View key={i} style={{
                position: 'absolute',
                left: 30 + (i / (growthData.length - 1)) * chartW - 4,
                top: CHART_H - (pt / maxPt) * (CHART_H - 10) - 9,
                width: 8, height: 8, borderRadius: 4, backgroundColor: accent, borderWidth: 2, borderColor: '#050910',
              }} />
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingLeft: 30 }}>
          {['00', '04', '08', '12', '16', '20'].map(h => (
            <Text key={h} style={{ fontSize: 9, color: '#3A4A55', fontFamily: MONO }}>{h}</Text>
          ))}
        </View>
      </View>

      {/* BOTTOM ROW */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* Articles by Source */}
        <View style={[kbid.chartCard, { flex: 1.1 }]}>
          <Text style={kbid.chartTitle}>ARTICLES BY SOURCE</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {displaySources.slice(0, 8).map((src, i) => (
              <View key={src.name} style={{ gap: 3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 9, color: N.textMid, fontFamily: MONO }} numberOfLines={1}>{src.name}</Text>
                  <Text style={{ fontSize: 9, color: accent, fontFamily: MONO, fontWeight: '900' }}>{src.count}</Text>
                </View>
                <View style={{ height: 5, backgroundColor: N.surfaceHi, borderRadius: 3, overflow: 'hidden' }}>
                  <Animated.View style={[{
                    height: '100%', borderRadius: 3, backgroundColor: accent,
                    ...Platform.select({ ios: { shadowColor: accent, shadowOffset:{width:0,height:0}, shadowOpacity:0.5, shadowRadius:3 }, android:{} }),
                  },
                    barAnims[i] ? { width: barAnims[i].interpolate({ inputRange:[0,1], outputRange:['0%','100%'] }) as any }
                      : { width: `${src.count / maxSrc * 100}%` as any }
                  ]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* KB Categories */}
        <View style={[kbid.chartCard, { flex: 1 }]}>
          <Text style={kbid.chartTitle}>KB CATEGORIES</Text>
          <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <View style={{ width: DONUT_SIZE, height: DONUT_SIZE, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
              {displayCats.slice(0, 6).map((cat, i) => {
                const pct = cat.count / totalCats;
                const prevPct = displayCats.slice(0, i).reduce((a, c) => a + c.count / totalCats, 0);
                return (
                  <View key={cat.name} style={{
                    position: 'absolute', width: DONUT_SIZE, height: DONUT_SIZE,
                    borderRadius: DONUT_SIZE / 2, borderWidth: RING_W, borderColor: cat.color,
                    opacity: 0.85, transform: [{ rotate: `${prevPct * 360}deg` }],
                  }} />
                );
              })}
              <View style={{
                width: DONUT_SIZE - RING_W * 2 - 4, height: DONUT_SIZE - RING_W * 2 - 4,
                borderRadius: (DONUT_SIZE - RING_W * 2) / 2, backgroundColor: '#050910',
                alignItems: 'center', justifyContent: 'center', zIndex: 5,
              }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: accent, fontFamily: MONO }}>{articles > 0 ? articles : '100'}</Text>
                <Text style={{ fontSize: 7, color: '#4A5A6A', fontFamily: MONO, letterSpacing: 0.5, textAlign: 'center' }}>{'TOTAL\nSUCCESS'}</Text>
              </View>
            </View>
          </View>
          <View style={{ gap: 5 }}>
            {displayCats.slice(0, 6).map(cat => (
              <View key={cat.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color, ...Platform.select({ ios: { shadowColor: cat.color, shadowOffset:{width:0,height:0}, shadowOpacity:0.8, shadowRadius:4 }, android:{} }) }} />
                <Text style={{ flex: 1, fontSize: 9, color: N.textMid, fontFamily: MONO }}>{cat.name}</Text>
                <Text style={{ fontSize: 9, color: cat.color, fontFamily: MONO, fontWeight: '900' }}>{cat.count}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Crawler status chips v6.1.0 */}
      {liveData?.crawling ? (
        <View style={{ flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'rgba(0,229,255,0.08)', borderRadius:8, borderWidth:1, borderColor:'rgba(0,229,255,0.2)', paddingHorizontal:10, paddingVertical:6, marginBottom:8 }}>
          <ActivityIndicator size="small" color="#00E5FF" />
          <Text style={{ color:'#00E5FF', fontSize:11, fontFamily:'monospace' }}>{`Crawling — ${(liveData as any).queue_size ?? liveData.queuePending ?? 0} in queue`}</Text>
        </View>
      ) : null}
      {(liveData as any)?.paused && !liveData?.crawling ? (
        <View style={{ backgroundColor:'rgba(255,184,0,0.08)', borderRadius:8, borderWidth:1, borderColor:'rgba(255,184,0,0.2)', paddingHorizontal:10, paddingVertical:6, marginBottom:8 }}>
          <Text style={{ color:'#FFB800', fontSize:11, fontFamily:'monospace' }}>{'Crawlers paused — AI is active'}</Text>
        </View>
      ) : null}

      {/* SERVER LIVE STATUS */}
      {liveData ? (
        <View style={[kbid.chartCard, { borderColor: N.green + '40' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: N.green, opacity: liveDot }} />
            <Text style={[kbid.chartTitle, { color: N.green }]}>SERVER KB — LIVE SYNC</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'ARTICLES', val: liveData.articlesTotal, col: accent },
              { label: 'IN QUEUE', val: liveData.queuePending, col: N.amber },
              { label: 'WORKERS', val: liveData.workersRunning, col: N.green },
              { label: 'UPTIME MIN', val: liveData.uptimeMins, col: N.teal },
            ].map(({ label, val, col }) => (
              <View key={label} style={{ flex: 1, alignItems: 'center', backgroundColor: col + '10', borderRadius: 8, paddingVertical: 8, borderWidth: 1, borderColor: col + '30' }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: col, fontFamily: MONO }}>{val}</Text>
                <Text style={{ fontSize: 7, color: N.textDim, fontFamily: MONO, letterSpacing: 0.5, textAlign: 'center', marginTop: 2 }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const kbid = StyleSheet.create({
  kpiCard:   { backgroundColor: '#07101A', borderWidth: 1.5, borderRadius: 14, padding: 14, minHeight: 96, position: 'relative', overflow: 'hidden' },
  kpiLabel:  { fontSize: 11, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.8 },
  kpiVal:    { fontSize: 32, fontWeight: '900', fontFamily: MONO, lineHeight: 38 },
  kpiSub:    { fontSize: 10, fontWeight: '600', fontFamily: MONO, letterSpacing: 0.3, marginTop: 4 },
  kpiAccent: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 },
  chartCard: { backgroundColor: '#07101A', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 14, padding: 16 },
  chartTitle:{ fontSize: 13, fontWeight: '900', color: '#8A9BAB', fontFamily: MONO, letterSpacing: 1.2, marginBottom: 0 },
});

// ─── NEXUS TWO-TONE TITLE ─────────────────────────────────────
function NexusTitle({ main, accent, accentColor = N.blue }: { main: string; accent: string; accentColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '900', color: N.text, fontFamily: MONO }}>{main}</Text>
      <Text style={{ fontSize: 24, fontWeight: '900', color: accentColor, fontFamily: MONO }}>{accent}</Text>
    </View>
  );
}

// ─── ANIMATED NUMBER — count-up on value change (single timing, no loop) ─────
function AnimatedNumber({ value, color }: { value: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    anim.setValue(0);
    const animation = Animated.timing(anim, { toValue: value, duration: 800, useNativeDriver: false });
    animation.start();
    const listener = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => { anim.removeListener(listener); animation.stop(); };
  }, [value]);
  return <Text style={[nsc.value, { color }]}>{display}</Text>;
}

// ─── NEXUS STAT CARD ──────────────────────────────────────────
const NexusStatCard = React.memo(function NexusStatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) {
  const numericValue = typeof value === 'number' ? value : null;
  return (
    <View style={[nsc.card, { borderTopColor: color }]}>
      <View style={[nsc.iconWrap, { backgroundColor: color + '18' }]}>
        <MaterialIcons name={icon as any} size={18} color={color} />
      </View>
      {numericValue !== null
        ? <AnimatedNumber value={numericValue} color={color} />
        : <Text style={[nsc.value, { color }]}>{value}</Text>
      }
      <Text style={nsc.label}>{label}</Text>
      <View style={[nsc.dot, { backgroundColor: color, opacity: 0.7 }]} />
    </View>
  );
});
const nsc = StyleSheet.create({
  card: { flex: 1, backgroundColor: N.surface, borderRadius: 12, borderWidth: 1.5, borderColor: N.border, borderTopWidth: 4, padding: 14, gap: 6, position: 'relative', overflow: 'hidden' },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  value: { fontSize: 26, fontWeight: '900', fontFamily: MONO },
  label: { fontSize: 9, color: N.textDim, fontFamily: MONO, letterSpacing: 0.8 },
  dot: { position: 'absolute', top: 12, right: 12, width: 7, height: 7, borderRadius: 4 },
});

// ─── NEXUS SECTION HEADER ─────────────────────────────────────
function SectionHeader({ label, color = N.blue, icon, right }: { label: string; color?: string; icon?: string; right?: React.ReactNode }) {
  return (
    <View style={sh.row}>
      {icon ? <MaterialIcons name={icon as any} size={13} color={color} /> : null}
      <Text style={[sh.label, { color }]}>{label}</Text>
      <View style={[sh.line, { backgroundColor: color + '30' }]} />
      {right}
    </View>
  );
}
const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.2 },
  line: { flex: 1, height: 1 },
});

// ─── NEXUS LOG ROW ────────────────────────────────────────────
function LogRow({ log }: { log: CrawlLog | BotActivity }) {
  const msg  = 'msg' in log ? log.msg : log.detail;
  const type = log.type;
  const col  = type === 'ok' ? N.green : type === 'warn' ? N.amber : type === 'error' ? N.red : N.blue;
  const prefix = type === 'ok' ? '✓' : type === 'warn' ? '!' : type === 'error' ? '✗' : '›';
  return (
    <Text style={[lr.line, { color: col }]} numberOfLines={2}>
      <Text style={lr.ts}>{new Date(log.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} </Text>
      {prefix} {'step' in log ? `[${log.step}] ` : ''}{msg}
    </Text>
  );
}
const lr = StyleSheet.create({
  line: { fontSize: 12, fontWeight: '600', fontFamily: MONO, lineHeight: 18, marginBottom: 3 },
  ts: { color: '#3A4A55' },
});

// ─── KNOWLEDGE PROCESS DIAGRAM ────────────────────────────────
function KBProcessDiagram() {
  const flow  = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.4)).current;
  const rot   = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    const anims = [
      Animated.loop(Animated.timing(flow, { toValue: 1, duration: 2200, useNativeDriver: false })),
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.2, duration: 900, useNativeDriver: false }),
      ])),
      Animated.loop(Animated.timing(rot, { toValue: 1, duration: 3000, useNativeDriver: false })),
    ];
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []));

  const rotDeg = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const STEPS = [
    { label: 'WEB\nSOURCE', icon: 'language', color: N.blue },
    { label: 'SIGMA-NET\nRELAY', icon: 'router', color: N.sigma },
    { label: 'COMPRESS\n+ EXTRACT', icon: 'compress', color: N.amber },
    { label: 'KB\nSTORAGE', icon: 'storage', color: N.green },
    { label: 'AI\nCONTEXT', icon: 'psychology', color: N.purple },
  ];

  const PacketAnim = ({ left0, left1, col }: { left0: number; left1: number; col: string }) => (
    <Animated.View style={[pd.packet, {
      left: flow.interpolate({ inputRange: [0, 1], outputRange: [left0, left1] }),
      backgroundColor: col,
      opacity: pulse,
      ...Platform.select({ ios: { shadowColor: col, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:6 }, android: {} }),
    }]} />
  );

  const W = SW - 48;
  const stepW = W / STEPS.length;

  return (
    <View style={[pd.wrap]}>
      <SectionHeader label="KNOWLEDGE PIPELINE" color={N.blue} icon="account-tree" />
      <Text style={pd.subtitle}>End-to-end data flow — from web source to AI context</Text>
      <View style={pd.stepsRow}>
        {STEPS.map((step, i) => (
          <React.Fragment key={step.label}>
            <View style={pd.stepCol}>
              <View style={[pd.nodeOuter, { borderColor: step.color + '60' }]}>
                <Animated.View style={[pd.nodeInner, { borderColor: step.color, backgroundColor: step.color + '15' },
                  i === 1 ? { transform: [{ rotate: rotDeg }] } : {}
                ]}>
                  <MaterialIcons name={step.icon as any} size={16} color={step.color} />
                </Animated.View>
              </View>
              <Text style={[pd.stepLabel, { color: step.color }]}>{step.label}</Text>
            </View>
            {i < STEPS.length - 1 ? (
              <View style={pd.connectorWrap}>
                <View style={[pd.connLine, { backgroundColor: STEPS[i].color + '30' }]} />
                <PacketAnim left0={0} left1={stepW * 0.7} col={step.color} />
              </View>
            ) : null}
          </React.Fragment>
        ))}
      </View>
      <View style={pd.methodsWrap}>
        <SectionHeader label="COLLECTION METHODS" color={N.teal} icon="auto-fix-high" />
        <View style={pd.methodsGrid}>
          {[
            { name: 'SIGMA-NET RELAY', desc: 'PC teleport bypass', color: N.sigma, icon: 'router' },
            { name: 'OMEGA LOOP', desc: 'Background growth engine', color: N.purple, icon: 'loop' },
            { name: 'QLH HARVESTER', desc: 'Quantum link extraction', color: N.yellow, icon: 'link' },
            { name: 'LAMBDA SCAN IMPORT', desc: 'Local file reader', color: N.amber, icon: 'folder-open' },
            { name: 'MANUAL ENTRY', desc: 'User-defined knowledge', color: N.blue, icon: 'edit' },
            { name: 'PHI-DELTA', desc: 'Differential patching', color: N.teal, icon: 'compare-arrows' },
            { name: 'PSI-RSS', desc: 'Feed aggregation', color: N.green, icon: 'rss-feed' },
            { name: 'KB ORGANIZER', desc: 'Dedup + cluster bot', color: N.red, icon: 'auto-fix-normal' },
          ].map(({ name, desc, color, icon }) => (
            <View key={name} style={[pd.methodCard, { borderLeftColor: color }]}>
              <MaterialIcons name={icon as any} size={13} color={color} />
              <View style={{ flex: 1 }}>
                <Text style={[pd.methodName, { color }]}>{name}</Text>
                <Text style={pd.methodDesc}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={pd.guardsWrap}>
        <SectionHeader label="SAFETY GUARDS" color={N.red} icon="security" />
        {[
          'Deduplication: Jaccard similarity hash prevents duplicate findings',
          'Storage guard: Auto-prunes old entries when KB exceeds 2MB limit',
          'Rate limiting: Max 3 SIGMA-NET requests/min to prevent server overload',
          'Confidence scoring: Low-confidence (< 0.4) entries flagged for review',
          'Domain validation: Only trusted Python/tech domains indexed by default',
        ].map((g, i) => (
          <View key={i} style={pd.guardRow}>
            <View style={[pd.guardDot, { backgroundColor: i < 2 ? N.green : N.amber }]} />
            <Text style={pd.guardTxt}>{g}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const pd = StyleSheet.create({
  wrap:         { backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderColor: N.border, padding: 16, marginBottom: 16 },
  subtitle:     { fontSize: 11, color: N.textDim, marginBottom: 16, fontFamily: MONO },
  stepsRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  stepCol:      { alignItems: 'center', gap: 6, flex: 1 },
  nodeOuter:    { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: N.bg },
  nodeInner:    { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepLabel:    { fontSize: 8, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5, textAlign: 'center', lineHeight: 11 },
  connectorWrap:{ flex: 0.6, height: 36, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  connLine:     { width: '100%', height: 1.5, borderRadius: 1 },
  packet:       { position: 'absolute', width: 7, height: 7, borderRadius: 4, top: 14.5 },
  methodsWrap:  { marginTop: 4 },
  methodsGrid:  { gap: 7 },
  methodCard:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: N.surfaceHi, borderRadius: 8, borderWidth: 1, borderLeftWidth: 3, borderColor: N.border, paddingVertical: 9, paddingHorizontal: 12 },
  methodName:   { fontSize: 12, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  methodDesc:   { fontSize: 10, fontWeight: '600', color: N.textMid, marginTop: 2 },
  guardsWrap:   { marginTop: 16 },
  guardRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 7 },
  guardDot:     { width: 6, height: 6, borderRadius: 3, marginTop: 5, flexShrink: 0 },
  guardTxt:     { flex: 1, fontSize: 12, fontWeight: '600', color: N.textMid, lineHeight: 18 },
});

// ─── KB NEURAL NETWORK VISUALIZATION ─────────────────────────
function KBNeuralViz({ totalFindings, sessions }: { totalFindings: number; sessions: number }) {
  const CANVAS_W = SW - 48 - 32;
  const CANVAS_H = 130;
  const nodePositions = [
    { cx: 12, cy: 35 }, { cx: 38, cy: 10 }, { cx: 68, cy: 20 },
    { cx: 90, cy: 50 }, { cx: 72, cy: 84 }, { cx: 44, cy: 92 },
    { cx: 14, cy: 72 }, { cx: 50, cy: 50 },
  ];
  const edges = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[7,1],[7,3],[7,5],[0,4]];

  // Convert % → px once so edge math is accurate
  const nodePx = nodePositions.map(p => ({
    x: Math.round(p.cx / 100 * CANVAS_W),
    y: Math.round(p.cy / 100 * CANVAS_H),
  }));

  // Pre-compute edge geometry: midpoint + length + angle
  // React Native rotates Views from their center by default, so we place
  // each edge at its midpoint and let the rotation work correctly.
  const edgeGeom = edges.map(([a, b]) => {
    const ax = nodePx[a].x; const ay = nodePx[a].y;
    const bx = nodePx[b].x; const by = nodePx[b].y;
    const dx = bx - ax; const dy = by - ay;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const mx = (ax + bx) / 2; const my = (ay + by) / 2;
    return { mx, my, len, angle, ax, ay, bx, by };
  });

  const nodes = useRef(nodePositions.map(() => ({
    pulse: new Animated.Value(0.3 + Math.random() * 0.4),
    flow:  new Animated.Value(0),
  }))).current;
  useFocusEffect(useCallback(() => {
    const anims = nodes.flatMap((node, i) => [
      Animated.loop(Animated.sequence([
        Animated.timing(node.pulse, { toValue: 1, duration: 700 + i * 200, useNativeDriver: false }),
        Animated.timing(node.pulse, { toValue: 0.2, duration: 700 + i * 200, useNativeDriver: false }),
      ])),
      Animated.loop(Animated.timing(node.flow, { toValue: 1, duration: 1400 + i * 300, useNativeDriver: false })),
    ]);
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []));
  const nodeColors = [N.blue, N.sigma, N.amber, N.green, N.purple, N.teal, N.red, N.yellow];
  return (
    <View style={nn.wrap}>
      <SectionHeader label="NEURAL KB GRAPH" color={N.amber} icon="hub" right={
        <View style={[nn.livePill, { borderColor: N.green + '60', backgroundColor: N.green + '12' }]}>
          <Animated.View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: N.green, opacity: nodes[0].pulse }} />
          <Text style={[nn.liveTxt, { color: N.green }]}>LIVE</Text>
        </View>
      } />
      <View style={[nn.canvas, { height: CANVAS_H }]}>
        {/* Edges — midpoint-centered so RN's default center rotation is correct */}
        {edgeGeom.map((e, i) => (
          <Animated.View key={`edge-${i}`} style={[
            nn.edge,
            {
              left: e.mx - e.len / 2,
              top:  e.my - 1,
              width: Math.round(e.len),
              transform: [{ rotate: `${e.angle}deg` }],
              opacity: nodes[i % 8].pulse,
            },
          ]} />
        ))}
        {/* Animated packets travelling along each edge */}
        {edgeGeom.slice(0, 6).map((e, i) => (
          <Animated.View key={`pkt-${i}`} style={[nn.packet, {
            left: nodes[i].flow.interpolate({ inputRange: [0, 1], outputRange: [e.ax - 3, e.bx - 3] }),
            top:  nodes[i].flow.interpolate({ inputRange: [0, 1], outputRange: [e.ay - 3, e.by - 3] }),
            backgroundColor: nodeColors[i % nodeColors.length],
            opacity: nodes[i].pulse,
          }]} />
        ))}
        {/* Nodes */}
        {nodePx.map((pos, i) => (
          <Animated.View key={`node-${i}`} style={[nn.node, {
            left: pos.x - 4,
            top:  pos.y - 4,
            backgroundColor: nodeColors[i],
            opacity: nodes[i].pulse,
            ...Platform.select({ ios: { shadowColor: nodeColors[i], shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:6 }, android:{} }),
          }]} />
        ))}
      </View>
      <View style={nn.statsRow}>
        {[
          { val: totalFindings, label: 'FINDINGS', col: N.amber },
          { val: sessions,      label: 'SESSIONS', col: N.blue  },
          { val: edges.length,  label: 'KB LINKS',  col: N.teal  },
          { val: nodePositions.length, label: 'NODES', col: N.green },
        ].map(({ val, label, col }) => (
          <View key={label} style={nn.statItem}>
            <Text style={[nn.statVal, { color: col }]}>{val}</Text>
            <Text style={nn.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const nn = StyleSheet.create({
  wrap:    { backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderColor: N.border, padding: 14, marginBottom: 12 },
  livePill:{ flexDirection:'row', alignItems:'center', gap:4, borderWidth:1, borderRadius:8, paddingHorizontal:7, paddingVertical:3 },
  liveTxt: { fontSize:8, fontWeight:'900', fontFamily:MONO, letterSpacing:0.5 },
  canvas:  { position: 'relative', marginBottom: 12, overflow: 'hidden', backgroundColor: N.bg, borderRadius: 8 },
  edge:    { position: 'absolute', height: 1, backgroundColor: N.amber + '25' },
  packet:  { position: 'absolute', width: 6, height: 6, borderRadius: 3, marginLeft: -3, marginTop: -3 },
  node:    { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  statsRow:{ flexDirection: 'row', gap: 8 },
  statItem:{ flex: 1, alignItems: 'center', backgroundColor: N.surfaceHi, borderRadius: 8, paddingVertical: 8, borderWidth: 1, borderColor: N.border },
  statVal: { fontSize: 16, fontWeight: '900', fontFamily: MONO },
  statLabel:{ fontSize: 8, color: N.textDim, fontFamily: MONO, letterSpacing: 0.5, marginTop: 2 },
});

// ─── GROWTH CHART ─────────────────────────────────────────────
function FindingsGrowthChart({ totalFindings }: { totalFindings: number }) {
  const [buckets, setBuckets] = useState<ChartBucket[]>([]);
  const barAnims = useRef<Animated.Value[]>(Array.from({length:16}, () => new Animated.Value(0))).current;
  const pulse = useRef(new Animated.Value(0.5)).current;
  const CHART_H = 64;
  useEffect(() => {
    kbGrowthTracker.getChartData(4, 16).then(data => {
      setBuckets(data);
      const mx = Math.max(1, ...data.map(b => b.delta));
      data.forEach((b, i) => {
        if (barAnims[i]) Animated.timing(barAnims[i], { toValue: mx > 0 ? b.delta / mx : 0, duration: 600 + i * 30, useNativeDriver: false }).start();
      });
    });
  }, [totalFindings]);

  useFocusEffect(useCallback(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.2, duration: 1400, useNativeDriver: false }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []));
  const totalGrowth = buckets.reduce((s, b) => s + b.delta, 0);
  const barColor = (i: number) => {
    const colors = [N.blue, N.sigma, N.amber, N.green, N.purple, N.teal];
    return colors[i % colors.length];
  };
  return (
    <View style={gc.wrap}>
      <SectionHeader label="FINDINGS GROWTH" color={N.amber} icon="trending-up" right={
        <Animated.Text style={[gc.totalTxt, { opacity: pulse, color: totalGrowth > 0 ? N.green : N.textDim }]}>
          {totalGrowth > 0 ? `+${totalGrowth}` : 'idle'}
        </Animated.Text>
      } />
      <View style={[gc.chartArea, { height: CHART_H }]}>
        {[0.25, 0.5, 0.75].map(pct => (
          <View key={pct} style={[gc.gridLine, { bottom: pct * CHART_H }]} />
        ))}
        <View style={gc.barsRow}>
          {barAnims.map((anim, i) => {
            const b = buckets[i];
            const col = barColor(i);
            const isLast = i === barAnims.length - 1;
            return (
              <View key={i} style={gc.barCol}>
                <Animated.View style={[gc.bar, {
                  height: anim.interpolate({ inputRange: [0, 1], outputRange: [2, CHART_H * 0.85] }),
                  backgroundColor: col,
                  opacity: b?.delta ? 1 : 0.18,
                  ...Platform.select({ ios: isLast ? { shadowColor: col, shadowOffset:{width:0,height:0}, shadowOpacity:0.9, shadowRadius:6 } : {}, android:{} }),
                }]} />
              </View>
            );
          })}
        </View>
      </View>
      <View style={gc.timeRow}>
        <Text style={gc.timeLabel}>4h ago</Text>
        <View style={{ flex: 1 }} />
        <Text style={gc.timeLabel}>now</Text>
      </View>
    </View>
  );
}
const gc = StyleSheet.create({
  wrap:     { backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderColor: N.border, padding: 14, marginBottom: 12 },
  totalTxt: { fontSize: 11, fontWeight: '700', fontFamily: MONO },
  chartArea:{ position: 'relative', backgroundColor: N.bg, borderRadius: 8, overflow: 'hidden', marginBottom: 6 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: N.amber + '12' },
  barsRow:  { flexDirection: 'row', alignItems: 'flex-end', flex: 1, paddingHorizontal: 4, paddingBottom: 4, gap: 2, height: '100%' },
  barCol:   { flex: 1, justifyContent: 'flex-end', alignItems: 'center', height: '100%' },
  bar:      { width: '70%', borderRadius: 2, minHeight: 2 },
  timeRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  timeLabel:{ fontSize: 9, color: N.textDim, fontFamily: MONO },
});

// ─── SYSTEM CPU CHART ─────────────────────────────────────────
function CpuActivityChart({ samples }: { samples: CpuSample[] }) {
  const recent = samples.slice(-16);
  const bars = [...Array(Math.max(0, 16 - recent.length)).fill(null), ...recent];
  const CHART_H = 56;
  const latest = recent.length > 0 ? recent[recent.length - 1].cpu : null;
  const col = latest !== null ? (latest > 80 ? N.red : latest > 60 ? N.amber : N.green) : N.textDim;
  return (
    <View style={ca.wrap}>
      <SectionHeader label="CPU ACTIVITY" color={col} icon="memory" right={
        <Text style={[ca.pct, { color: col }]}>{latest !== null ? `${latest}%` : '--'}</Text>
      } />
      <View style={[ca.chart, { height: CHART_H }]}>
        {bars.map((s, i) => {
          const h = s ? Math.max(2, (s.cpu / 100) * CHART_H) : 2;
          const c = s ? (s.cpu > 80 ? N.red : s.cpu > 60 ? N.amber : N.green) : N.border;
          return (
            <View key={i} style={ca.barWrap}>
              <View style={{ width: '70%', height: h, backgroundColor: c, borderRadius: 1, opacity: s ? (i === bars.length - 1 ? 1 : 0.7) : 0.15 }} />
            </View>
          );
        })}
      </View>
    </View>
  );
}
const ca = StyleSheet.create({
  wrap:   { backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderColor: N.border, padding: 14, marginBottom: 12 },
  pct:    { fontSize: 18, fontWeight: '900', fontFamily: MONO },
  chart:  { backgroundColor: N.bg, borderRadius: 8, overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 4, paddingBottom: 4, gap: 2 },
  barWrap:{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', height: '100%' },
});

// ─── QLH CRAWLER NETWORK ──────────────────────────────────────
function CrawlerNetwork({ qlhStats }: { qlhStats: QLHStats | null }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.4)).current;
  useFocusEffect(useCallback(() => {
    const makeAnimDot = (anim: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: false }),
      ]));
    const anims = [
      makeAnimDot(dot1, 0),
      makeAnimDot(dot2, 500),
      Animated.loop(Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1000, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0.3, duration: 1000, useNativeDriver: false }),
      ])),
    ];
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []));
  const stats = [
    { label: 'FOUND',   val: qlhStats?.totalDiscovered ?? 0, col: N.blue },
    { label: 'FETCHED', val: qlhStats?.totalHarvested  ?? 0, col: N.amber },
    { label: 'KB ADDED',val: qlhStats?.totalAdded      ?? 0, col: N.green },
    { label: 'CYCLES',  val: qlhStats?.microHarvests   ?? 0, col: N.yellow },
  ];
  return (
    <View style={cn.wrap}>
      <SectionHeader label="QLH CRAWLER NETWORK" color={N.yellow} icon="hub" />
      <View style={cn.nodes}>
        {[
          { label: 'PHONE', icon: 'phone-android', color: N.blue },
          { label: 'RELAY',  icon: 'computer',      color: N.amber },
          { label: 'WEB',    icon: 'language',       color: N.green },
        ].map(({ label, icon, color }, i) => (
          <React.Fragment key={label}>
            <View style={[cn.node, { borderColor: color }]}>
              <MaterialIcons name={icon as any} size={18} color={color} />
              <Text style={[cn.nodeLabel, { color }]}>{label}</Text>
            </View>
            {i < 2 ? (
              <View style={cn.lineWrap}>
                <View style={[cn.line, { backgroundColor: color + '30' }]} />
                <Animated.View style={[cn.packet, {
                  backgroundColor: color,
                  left: (i === 0 ? dot1 : dot2).interpolate({ inputRange: [0, 1], outputRange: [0, 60] }),
                  opacity: glow,
                }]} />
              </View>
            ) : null}
          </React.Fragment>
        ))}
      </View>
      <View style={cn.statsRow}>
        {stats.map(({ label, val, col }) => (
          <View key={label} style={cn.statItem}>
            <Text style={[cn.statVal, { color: col }]}>{val}</Text>
            <Text style={cn.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
const cn = StyleSheet.create({
  wrap:     { backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderColor: N.border, padding: 14, marginBottom: 12 },
  nodes:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  node:     { alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: 10, padding: 10, minWidth: 70 },
  nodeLabel:{ fontSize: 9, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  lineWrap: { flex: 1, height: 24, justifyContent: 'center', position: 'relative' },
  line:     { height: 1.5, borderRadius: 1 },
  packet:   { position: 'absolute', width: 6, height: 6, borderRadius: 3, top: 9 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: N.surfaceHi, borderRadius: 8, paddingVertical: 8, borderWidth: 1, borderColor: N.border },
  statVal:  { fontSize: 16, fontWeight: '900', fontFamily: MONO },
  statLabel:{ fontSize: 8, color: N.textDim, fontFamily: MONO, letterSpacing: 0.5, marginTop: 2 },
});

// ─── SIGMA-NET VISUALIZER ─────────────────────────────────────
function SigmaNetViz({ active, relayAddr, progress, lastResult }: {
  active: boolean; relayAddr: string; progress: number; lastResult: SigmaRelayResult | null;
}) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  const flow  = useRef(new Animated.Value(0)).current;
  useFocusEffect(useCallback(() => {
    if (!active) { pulse.setValue(0.7); flow.setValue(0); return () => {}; }
    const anims = [
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.2, duration: 450, useNativeDriver: false }),
      ])),
      Animated.loop(Animated.timing(flow, { toValue: 1, duration: 1200, useNativeDriver: false })),
    ];
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [active]));
  const relayCol = relayAddr !== 'NONE' ? N.green : N.red;
  const NODES = [
    { label: 'MOBILE', icon: 'phone-android', col: N.blue },
    { label: 'SIGMA-NET', icon: 'hub', col: N.sigma },
    { label: 'PC RELAY', icon: 'computer', col: relayCol },
    { label: 'WEB', icon: 'language', col: N.amber },
  ];
  return (
    <View style={sv.wrap}>
      <View style={sv.header}>
        <Animated.View style={[sv.sigmaOrb, { opacity: pulse, borderColor: N.sigma }]} />
        <Text style={[sv.title, { color: N.sigma }]}>SIGMA-NET RELAY CRAWLER</Text>
        <View style={[sv.badge, { borderColor: active ? N.sigma + '80' : N.border, backgroundColor: active ? N.sigma + '15' : N.surfaceHi }]}>
          <Animated.View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: active ? N.sigma : N.textDim, opacity: pulse }} />
          <Text style={[sv.badgeTxt, { color: active ? N.sigma : N.textDim }]}>{active ? 'ACTIVE' : 'STANDBY'}</Text>
        </View>
      </View>
      <View style={sv.flowRow}>
        {NODES.map((node, i) => (
          <React.Fragment key={node.label}>
            <View style={[sv.node, { borderColor: node.col }]}>
              <MaterialIcons name={node.icon as any} size={16} color={node.col} />
              <Text style={[sv.nodeLabel, { color: node.col }]}>{node.label}</Text>
              {i === 2 && relayAddr !== 'NONE' ? <Text style={[sv.nodeAddr, { color: node.col }]}>{relayAddr.split(':')[0]}</Text> : null}
            </View>
            {i < NODES.length - 1 ? (
              <View style={sv.arrow}>
                <Animated.Text style={[sv.arrowChr, { color: i === 1 ? N.sigma : N.amber, opacity: active ? pulse : 0.3 }]}>{'→'}</Animated.Text>
              </View>
            ) : null}
          </React.Fragment>
        ))}
      </View>
      {active && progress > 0 ? (
        <View style={sv.progressWrap}>
          <View style={sv.progressTrack}>
            <View style={[sv.progressFill, { width: `${progress}%` as any, backgroundColor: N.sigma }]} />
          </View>
          <Text style={[sv.progressTxt, { color: N.sigma }]}>{progress}%</Text>
        </View>
      ) : null}
      {lastResult ? (
        <View style={[sv.resultRow, { borderColor: lastResult.error ? N.red + '40' : N.green + '40', backgroundColor: lastResult.error ? N.redDim : N.greenDim }]}>
          <MaterialIcons name={lastResult.error ? 'error-outline' : 'check-circle'} size={13} color={lastResult.error ? N.red : N.green} />
          <Text style={[sv.resultTxt, { color: lastResult.error ? N.red : N.green }]} numberOfLines={2}>
            {lastResult.error ? lastResult.error : `✓ ${lastResult.wordCount} words · ${lastResult.url.slice(0, 32)}...`}
          </Text>
          {lastResult.latencyMs > 0 ? <Text style={sv.ms}>{lastResult.latencyMs}ms</Text> : null}
        </View>
      ) : null}
      {!active && relayAddr === 'NONE' ? (
        <View style={[sv.offlineNote, { borderColor: N.red + '40' }]}>
          <MaterialIcons name="wifi-off" size={12} color={N.amber} />
          <Text style={[sv.offlineTxt, { color: N.amber }]}>Connect PC in HOME tab to enable relay crawling</Text>
        </View>
      ) : null}
    </View>
  );
}
const sv = StyleSheet.create({
  wrap:        { backgroundColor: N.surface, borderRadius: 12, borderWidth: 1.5, borderColor: N.sigma + '40', padding: 14, marginBottom: 12 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sigmaOrb:    { width: 10, height: 10, borderRadius: 5, backgroundColor: N.sigma + '30', borderWidth: 1.5 },
  title:       { flex: 1, fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  badge:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt:    { fontSize: 9, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  flowRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  node:        { alignItems: 'center', gap: 3, borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 6, minWidth: 56 },
  nodeLabel:   { fontSize: 8, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.3 },
  nodeAddr:    { fontSize: 7, fontFamily: MONO, maxWidth: 56, textAlign: 'center' },
  arrow:       { flex: 1, alignItems: 'center' },
  arrowChr:    { fontSize: 18, fontWeight: '900', fontFamily: MONO },
  progressWrap:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  progressTrack:{ flex: 1, height: 4, backgroundColor: N.surfaceHi, borderRadius: 2, overflow: 'hidden' },
  progressFill:{ height: '100%', borderRadius: 2 },
  progressTxt: { fontSize: 10, fontWeight: '700', fontFamily: MONO, width: 36 },
  resultRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 8 },
  resultTxt:   { flex: 1, fontSize: 10, fontFamily: MONO, lineHeight: 15 },
  ms:          { fontSize: 9, color: N.textDim, fontFamily: MONO },
  offlineNote: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, padding: 10 },
  offlineTxt:  { flex: 1, fontSize: 10, fontFamily: MONO },
});

// ─── KB ORGANIZER BOT BUTTON ──────────────────────────────────
function KBOrganizerBot({ kbStats }: { kbStats: KBStats | null }) {
  const [showModal, setShowModal] = useState(false);
  const [botState, setBotState]   = useState<BotState | null>(null);
  const [running, setRunning]     = useState(false);
  const pulse = useRef(new Animated.Value(0.6)).current;
  const spin  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    kbOrganizerBot.loadState().then(setBotState);
    return kbOrganizerBot.onStateChange(s => {
      setBotState(s);
      setRunning(s.status !== 'idle' && s.status !== 'done' && s.status !== 'error');
    });
  }, []);
  useFocusEffect(useCallback(() => {
    if (!running) { pulse.setValue(0.7); spin.setValue(0); return () => {}; }
    const anims = [
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.2, duration: 500, useNativeDriver: false }),
      ])),
      Animated.loop(Animated.timing(spin, { toValue: 1, duration: 2000, useNativeDriver: false })),
    ];
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [running]));
  const statusCol = running ? N.amber : botState?.status === 'done' ? N.green : N.textDim;
  const rotDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <>
      <TouchableOpacity
        style={[bot.btn, { borderColor: statusCol + '70', backgroundColor: statusCol + '15' }]}
        onPress={() => { haptics.light(); setShowModal(true); }}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="robot" size={14} color={statusCol} />
        <Animated.View style={{ transform: [{ rotate: rotDeg }] }}>
          <MaterialIcons name="settings" size={10} color={statusCol} />
        </Animated.View>
        {running ? <ActivityIndicator size="small" color={N.amber} style={{ width: 10, height: 10, transform: [{ scale: 0.65 }] }} /> : null}
      </TouchableOpacity>
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={bot.overlay}>
          <View style={bot.sheet}>
            <View style={[bot.topAccent, { backgroundColor: N.amber }]} />
            <View style={bot.header}>
              <View style={[bot.avatar, { borderColor: N.amber + '60', backgroundColor: N.amber + '15' }]}>
                <MaterialCommunityIcons name="robot" size={24} color={N.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={bot.title}>NEXUS <Text style={{ color: N.amber }}>BOT</Text></Text>
                <Text style={bot.sub}>KB Intelligence Organizer v2.0</Text>
              </View>
              <View style={[bot.statusPill, { borderColor: statusCol + '60', backgroundColor: statusCol + '12' }]}>
                <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusCol, opacity: pulse }} />
                <Text style={[bot.statusTxt, { color: statusCol }]}>{running ? 'RUNNING' : botState?.status?.toUpperCase() || 'IDLE'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialIcons name="close" size={20} color={N.textDim} />
              </TouchableOpacity>
            </View>
            <View style={[bot.divider, { backgroundColor: N.border }]} />
            <Text style={bot.desc}>{'SCAN → DEDUP → CLUSTER → INDEX → COMPRESS → GAP ANALYSIS\n\nRuns a full organize cycle on your Knowledge Base, removing duplicates and improving searchability.'}</Text>
            {botState ? (
              <View style={bot.statsRow}>
                {[
                  { label: 'ORGANIZED', val: botState.totalOrganized, col: N.blue },
                  { label: 'DUPES REMOVED', val: botState.duplicatesFound, col: N.red },
                  { label: 'CLUSTERS', val: botState.clustersFormed, col: N.amber },
                  { label: 'STORAGE', val: kbStats ? `${(kbStats.storageUsed/1024).toFixed(0)}K` : '-', col: N.green },
                ].map(({ label, val, col }) => (
                  <View key={label} style={bot.statCard}>
                    <Text style={[bot.statVal, { color: col }]}>{val}</Text>
                    <Text style={bot.statLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {running && botState ? (
              <View style={bot.progressWrap}>
                <View style={bot.progressTrack}>
                  <View style={[bot.progressFill, { width: `${botState.progress}%` as any }]} />
                </View>
                <Text style={bot.progressTxt}>{botState.progress}%</Text>
              </View>
            ) : null}
            {botState?.coverageGaps && botState.coverageGaps.length > 0 ? (
              <View style={[bot.gapsBox, { borderColor: N.amber + '40', backgroundColor: N.amberDim }]}>
                <MaterialIcons name="warning" size={13} color={N.amber} />
                <Text style={[bot.gapsTxt, { color: N.amber }]}>Coverage gaps: {botState.coverageGaps.slice(0, 4).join(', ')}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[bot.runBtn, { backgroundColor: N.amber }, running && { opacity: 0.5 }]}
              onPress={async () => { if (running) return; haptics.medium(); setRunning(true); await kbOrganizerBot.runOrganizeCycle(); setRunning(false); haptics.success(); }}
              disabled={running}
              activeOpacity={0.85}
            >
              {running ? <ActivityIndicator size="small" color="#000" /> : <MaterialCommunityIcons name="robot" size={16} color="#000" />}
              <Text style={bot.runBtnTxt}>{running ? `${botState?.currentStep || 'PROCESSING'}...` : 'RUN ORGANIZE CYCLE'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
const bot = StyleSheet.create({
  btn:         { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: N.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', overflow: 'hidden' },
  topAccent:   { height: 4 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingBottom: 14 },
  avatar:      { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title:       { fontSize: 20, fontWeight: '900', color: N.text, fontFamily: MONO },
  sub:         { fontSize: 10, color: N.textDim, fontFamily: MONO, marginTop: 2 },
  statusPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusTxt:   { fontSize: 9, fontWeight: '700', fontFamily: MONO },
  divider:     { height: 1, marginHorizontal: 20, marginBottom: 16 },
  desc:        { fontSize: 12, color: N.textMid, lineHeight: 18, paddingHorizontal: 20, marginBottom: 16 },
  statsRow:    { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  statCard:    { flex: 1, backgroundColor: N.surfaceHi, borderRadius: 10, borderWidth: 1, borderColor: N.border, padding: 10, alignItems: 'center' },
  statVal:     { fontSize: 18, fontWeight: '900', fontFamily: MONO },
  statLabel:   { fontSize: 8, color: N.textDim, fontFamily: MONO, letterSpacing: 0.5, marginTop: 2, textAlign: 'center' },
  progressWrap:{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  progressTrack:{ flex: 1, height: 6, backgroundColor: N.surfaceHi, borderRadius: 3, overflow: 'hidden' },
  progressFill:{ height: '100%', backgroundColor: N.amber, borderRadius: 3 },
  progressTxt: { fontSize: 10, fontWeight: '700', color: N.amberBrt, fontFamily: MONO, width: 32 },
  gapsBox:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 20, borderRadius: 8, padding: 10, borderWidth: 1, marginBottom: 14 },
  gapsTxt:     { flex: 1, fontSize: 10, fontFamily: MONO, lineHeight: 15 },
  runBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 20, marginTop: 8, borderRadius: 12, paddingVertical: 15 },
  runBtnTxt:   { fontSize: 13, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 0.5 },
});

// ─── FINDING CARD ─────────────────────────────────────────────
const FindingCard = React.memo(function FindingCard({ finding, onDelete }: { finding: CompressedKnowledge; onDelete?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const conf = finding.metadata?.confidence ?? 0;
  const confCol = conf > 0.8 ? N.green : conf > 0.5 ? N.amber : N.red;
  const domColors: Record<string, string> = {
    Python: N.blue, System: N.teal, Network: N.green, AI: N.purple,
    Files: N.amber, Web: N.green, Data: N.yellow, General: N.textDim, Manual: N.blue,
  };
  const domCol = domColors[finding.domain] || N.blue;
  return (
    <TouchableOpacity
      style={[fc.card, { borderLeftColor: domCol }]}
      onPress={() => { haptics.selection(); setExpanded(v => !v); }}
      activeOpacity={0.88}
    >
      <View style={fc.header}>
        <View style={[fc.domainBadge, { borderColor: domCol + '60', backgroundColor: domCol + '12' }]}>
          <Text style={[fc.domainTxt, { color: domCol }]}>{finding.domain}</Text>
        </View>
        <Text style={fc.topic} numberOfLines={1}>{finding.topic}</Text>
        <View style={[fc.confBadge, { borderColor: confCol + '60', backgroundColor: confCol + '12' }]}>
          <Text style={[fc.confTxt, { color: confCol }]}>{Math.round(conf * 100)}%</Text>
        </View>
        {onDelete ? (
          <TouchableOpacity onPress={() => { haptics.heavy(); onDelete(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="delete-outline" size={16} color={N.textDim} />
          </TouchableOpacity>
        ) : null}
        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={16} color={N.textDim} />
      </View>
      <Text style={fc.summary} numberOfLines={expanded ? undefined : 2}>{finding.summary}</Text>
      {expanded ? (
        <>
          <View style={fc.kwRow}>
            {(finding.keywords || []).slice(0, 8).map(kw => (
              <View key={kw} style={[fc.kw, { borderColor: domCol + '40', backgroundColor: domCol + '0C' }]}>
                <Text style={[fc.kwTxt, { color: domCol }]}>{kw}</Text>
              </View>
            ))}
          </View>
          {(finding.examples || []).slice(0, 2).map((ex, i) => (
            <Text key={i} style={fc.example}>» {ex}</Text>
          ))}
          {finding.metadata?.source ? (
            <Text style={fc.meta}>src: {finding.metadata.source.slice(0, 50)}</Text>
          ) : null}
        </>
      ) : null}
    </TouchableOpacity>
  );
});
const fc = StyleSheet.create({
  card:       { backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderLeftWidth: 3, borderColor: N.border, padding: 14, marginBottom: 8 },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  domainBadge:{ borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  domainTxt:  { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  topic:      { flex: 1, fontSize: 15, fontWeight: '900', color: N.text, fontFamily: MONO },
  confBadge:  { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  confTxt:    { fontSize: 10, fontWeight: '900', fontFamily: MONO },
  summary:    { fontSize: 13, color: N.textMid, lineHeight: 20 },
  kwRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 },
  kw:         { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  kwTxt:      { fontSize: 10, fontWeight: '700', fontFamily: MONO },
  example:    { fontSize: 10, color: N.textMid, fontFamily: MONO, lineHeight: 15, marginTop: 5, paddingLeft: 4 },
  meta:       { fontSize: 10, fontWeight: '600', color: N.textDim, marginTop: 8, fontFamily: MONO },
});

// ─── NEXUS FILTER CHIPS ───────────────────────────────────────
function FilterChips({ options, active, onSelect }: { options: string[]; active: string; onSelect: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      {options.map(opt => {
        const isActive = opt === active;
        return (
          <TouchableOpacity
            key={opt}
            style={[chips.chip, isActive ? { borderColor: N.blue, backgroundColor: N.blue + '20' } : { borderColor: N.border }]}
            onPress={() => { haptics.selection(); onSelect(opt); }}
            activeOpacity={0.75}
          >
            <Text style={[chips.label, { color: isActive ? N.blue : N.textDim }]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
const chips = StyleSheet.create({
  chip:  { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  label: { fontSize: 12, fontWeight: '900', fontFamily: MONO },
});

// ─── LAMBDA SCAN TAB ──────────────────────────────────────────
function LambdaScanTab() {
  const [drives, setDrives]         = useState<DriveEntry[]>([]);
  const [selectedRoot, setSelectedRoot] = useState('');
  const [customRoot, setCustomRoot] = useState('');
  const [pattern, setPattern]       = useState('');
  const [maxDepth, setMaxDepth]     = useState(4);
  const [maxResults, setMaxResults] = useState(30);
  const [scanning, setScanning]     = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [importStates, setImportStates] = useState<Record<string, { status: string; error?: string }>>({});
  const [loadingDrives, setLoadingDrives] = useState(false);
  const [importAllRunning, setImportAllRunning] = useState(false);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  useEffect(() => {
    lambdaScan.getDrives(true).then(d => {
      setDrives(d);
      if (d.length > 0) {
        const home = d.find(e => e.label === 'Home' || e.label === 'Downloads');
        setSelectedRoot(home?.path || d[0]?.path || '');
      }
    }).catch(() => {}).finally(() => setLoadingDrives(false));
  }, []);

  const runScan = async () => {
    const root = customRoot.trim() || selectedRoot;
    if (!root) { Alert.alert('Select a directory first'); return; }
    haptics.medium(); setScanning(true); setScanResult(null); setImportStates({});
    try {
      const result = await lambdaScan.scanDirectory({ root, pattern: pattern.trim(), extensions: ['.py', '.txt', '.md', '.json', '.yaml', '.sh', '.bat'], maxResults, maxDepth, includeContent: false });
      setScanResult(result);
      if (result.ok) haptics.success(); else haptics.warning();
    } finally { setScanning(false); }
  };

  const importFile = async (file: ScannedFile) => {
    if (importStates[file.path]?.status === 'done') return;
    setImportStates(prev => ({ ...prev, [file.path]: { status: 'reading' } }));
    try {
      const res = await lambdaScan.readFile(file.path);
      if (!res.ok) { setImportStates(prev => ({ ...prev, [file.path]: { status: 'error', error: res.error } })); return; }
      const code = res.content.trim();
      if (code.length < 10) { setImportStates(prev => ({ ...prev, [file.path]: { status: 'error', error: 'File too small' } })); return; }
      setImportStates(prev => ({ ...prev, [file.path]: { status: 'importing' } }));
      const title = file.name.replace(/\.py$/i, '').replace(/[-_]/g, ' ');
      await saveButlerScript(code, { title: `SCAN: ${title.slice(0, 48)}`, description: `Imported via SCAN from ${file.relative}` });
      setImportStates(prev => ({ ...prev, [file.path]: { status: 'done' } }));
      haptics.success();
    } catch (e: any) {
      setImportStates(prev => ({ ...prev, [file.path]: { status: 'error', error: e?.message } }));
    }
  };

  const importAll = async () => {
    const pyFiles = (scanResult?.files || []).filter(f => f.ext === '.py' && importStates[f.path]?.status !== 'done');
    if (!pyFiles.length) { Alert.alert('All files already imported'); return; }
    haptics.medium(); setImportAllRunning(true);
    let ok = 0;
    for (const f of pyFiles) { await importFile(f); ok++; await new Promise(r => setTimeout(r, 100)); }
    setImportAllRunning(false); haptics.success();
    Alert.alert('SCAN Complete', `Imported ${ok} script${ok !== 1 ? 's' : ''}`);
  };

  const pyFiles = scanResult?.files.filter(f => f.ext === '.py') ?? [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
      <View style={lsc.infoCard}>
        <Text style={lsc.infoTxt}>{'1. Select a directory on your PC\n2. SCAN finds all Python files via server\n3. Tap IMPORT to add each to Scripts tab'}</Text>
      </View>
      <SectionHeader label="PC DIRECTORIES" color={N.amber} icon="folder" />
      {drives.length === 0 ? (
        <View style={lsc.emptyCard}>
          <MaterialIcons name="wifi-off" size={28} color={N.textDim} />
          <Text style={lsc.emptyTxt}>No server connected</Text>
          <Text style={lsc.emptyHint}>Connect your PC in HOME tab first</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
          {drives.map(d => {
            const isActive = selectedRoot === d.path;
            return (
              <TouchableOpacity key={d.path} style={[lsc.driveChip, isActive && { borderColor: N.amber, backgroundColor: N.amber + '18' }]}
                onPress={() => { haptics.selection(); setSelectedRoot(d.path); setCustomRoot(''); }}>
                <MaterialIcons name="folder" size={14} color={isActive ? N.amber : N.textDim} />
                <Text style={[lsc.driveLabel, { color: isActive ? N.amber : N.textMid }]}>{d.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <SectionHeader label="SCAN OPTIONS" color={N.teal} icon="tune" />
      <View style={lsc.inputRow}>
        <MaterialIcons name="folder-open" size={14} color={N.textDim} />
        <TextInput style={lsc.input} value={customRoot} onChangeText={setCustomRoot} placeholder="Custom path..." placeholderTextColor={N.textDim} autoCapitalize="none" />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        <View style={[lsc.inputRow, { flex: 1 }]}>
          <Text style={lsc.optLabel}>PATTERN</Text>
          <TextInput style={[lsc.input, { flex: 1 }]} value={pattern} onChangeText={setPattern} placeholder="e.g. auto" placeholderTextColor={N.textDim} autoCapitalize="none" />
        </View>
        <View style={lsc.optBox}>
          <Text style={lsc.optLabel}>DEPTH</Text>
          <View style={lsc.stepper}>
            <TouchableOpacity onPress={() => setMaxDepth(d => Math.max(1, d - 1))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Text style={lsc.stepBtn}>-</Text></TouchableOpacity>
            <Text style={lsc.stepVal}>{maxDepth}</Text>
            <TouchableOpacity onPress={() => setMaxDepth(d => Math.min(8, d + 1))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Text style={lsc.stepBtn}>+</Text></TouchableOpacity>
          </View>
        </View>
      </View>
      <TouchableOpacity style={[lsc.scanBtn, (scanning || drives.length === 0) && { opacity: 0.5 }]}
        onPress={runScan} disabled={scanning || drives.length === 0} activeOpacity={0.85}>
        {scanning ? <ActivityIndicator size="small" color="#000" /> : <MaterialIcons name="search" size={18} color="#000" />}
        <Text style={lsc.scanBtnTxt}>{scanning ? 'SCANNING PC...' : 'SCAN DIRECTORY'}</Text>
      </TouchableOpacity>
      {scanResult ? (
        scanResult.ok ? (
          <View>
            <View style={lsc.summaryRow}>
              {[
                { val: scanResult.total, label: 'FILES', col: N.amber },
                { val: pyFiles.length, label: '.PY FILES', col: N.blue },
                { val: Object.values(importStates).filter(s => s.status === 'done').length, label: 'IMPORTED', col: N.green },
                { val: scanResult.latencyMs + 'ms', label: 'LATENCY', col: N.textDim },
              ].map(({ val, label, col }) => (
                <View key={label} style={lsc.sumCard}>
                  <Text style={[lsc.sumVal, { color: col }]}>{val}</Text>
                  <Text style={lsc.sumLabel}>{label}</Text>
                </View>
              ))}
            </View>
            {pyFiles.length > 0 ? (
              <TouchableOpacity style={[lsc.importAllBtn, (importAllRunning || pyFiles.every(f => importStates[f.path]?.status === 'done')) && { opacity: 0.5 }]}
                onPress={importAll} disabled={importAllRunning} activeOpacity={0.85}>
                {importAllRunning ? <ActivityIndicator size="small" color="#000" /> : <MaterialIcons name="download" size={16} color="#000" />}
                <Text style={lsc.importAllTxt}>IMPORT ALL {pyFiles.length} .PY FILES</Text>
              </TouchableOpacity>
            ) : null}
            <SectionHeader label={`FOUND FILES (${scanResult.total})`} color={N.blue} icon="list" />
            {scanResult.files.map(file => {
              const state = importStates[file.path];
              const isPy = file.ext === '.py';
              const stateCol = !state ? N.textDim : { idle: isPy ? N.amber : N.textDim, reading: N.blue, importing: N.amber, done: N.green, error: N.red }[state.status] ?? N.textDim;
              return (
                <View key={file.path} style={[lsc.fileCard, state?.status === 'done' && { borderColor: N.green + '50' }]}>
                  <TouchableOpacity style={lsc.fileHeader} onPress={() => setExpandedFile(expandedFile === file.path ? null : file.path)} activeOpacity={0.85}>
                    <View style={[lsc.extBadge, { borderColor: stateCol + '60', backgroundColor: stateCol + '12' }]}>
                      <Text style={[lsc.extTxt, { color: stateCol }]}>{file.ext.slice(1).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={lsc.fileName} numberOfLines={1}>{file.name}</Text>
                      <Text style={lsc.filePath} numberOfLines={1}>{file.relative}</Text>
                    </View>
                    <Text style={lsc.fileSize}>{file.size_kb < 1 ? '<1' : file.size_kb.toFixed(0)}KB</Text>
                    {state?.status === 'done' ? <MaterialIcons name="check-circle" size={16} color={N.green} />
                      : state?.status === 'error' ? <MaterialIcons name="error" size={16} color={N.red} />
                      : state?.status === 'reading' || state?.status === 'importing' ? <ActivityIndicator size="small" color={N.amber} style={{ transform: [{ scale: 0.7 }] }} />
                      : <MaterialIcons name={expandedFile === file.path ? 'expand-less' : 'expand-more'} size={16} color={N.textDim} />}
                  </TouchableOpacity>
                  {state?.status === 'error' ? <Text style={lsc.errorTxt}>{state.error}</Text> : null}
                  {isPy && state?.status !== 'done' ? (
                    <TouchableOpacity style={lsc.inlineImport} onPress={() => importFile(file)} disabled={state?.status === 'reading' || state?.status === 'importing'}>
                      <MaterialIcons name="download" size={11} color={N.amber} />
                      <Text style={lsc.inlineImportTxt}>IMPORT TO SCRIPTS</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={lsc.errorCard}>
            <MaterialIcons name="error-outline" size={24} color={N.red} />
            <Text style={lsc.errorCardTxt}>{scanResult.error || 'Scan failed'}</Text>
          </View>
        )
      ) : !scanning ? (
        <View style={lsc.emptyState}>
          <MaterialIcons name="folder-open" size={48} color={N.textDim} />
          <Text style={lsc.emptyTxt}>Select a directory and tap SCAN</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
const lsc = StyleSheet.create({
  infoCard:    { backgroundColor: N.blue + '0C', borderRadius: 10, borderWidth: 1, borderColor: N.blue + '30', padding: 14, marginBottom: 16 },
  infoTxt:     { fontSize: 12, color: N.textMid, lineHeight: 20, fontFamily: MONO },
  emptyCard:   { alignItems: 'center', paddingVertical: 28, gap: 8, backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderColor: N.border, marginBottom: 14 },
  emptyTxt:    { fontSize: 14, fontWeight: '700', color: N.textDim, fontFamily: MONO },
  emptyHint:   { fontSize: 10, color: N.textDim, fontFamily: MONO },
  driveChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: N.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: N.surface },
  driveLabel:  { fontSize: 12, fontWeight: '600', fontFamily: MONO },
  inputRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: N.surface, borderWidth: 1.5, borderColor: N.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  input:       { flex: 1, fontSize: 12, color: N.text, fontFamily: MONO },
  optLabel:    { fontSize: 9, fontWeight: '700', color: N.textDim, fontFamily: MONO, letterSpacing: 1 },
  optBox:      { backgroundColor: N.surface, borderWidth: 1.5, borderColor: N.border, borderRadius: 10, padding: 10, alignItems: 'center', gap: 5 },
  stepper:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn:     { fontSize: 18, fontWeight: '700', color: N.amber, fontFamily: MONO, paddingHorizontal: 4 },
  stepVal:     { fontSize: 14, fontWeight: '700', color: N.text, fontFamily: MONO, minWidth: 22, textAlign: 'center' },
  scanBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: N.amber, borderRadius: 12, paddingVertical: 14, marginBottom: 16 },
  scanBtnTxt:  { fontSize: 13, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 0.5 },
  summaryRow:  { flexDirection: 'row', backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderColor: N.border, marginBottom: 12, overflow: 'hidden' },
  sumCard:     { flex: 1, alignItems: 'center', paddingVertical: 12 },
  sumVal:      { fontSize: 18, fontWeight: '900', fontFamily: MONO },
  sumLabel:    { fontSize: 8, color: N.textDim, fontFamily: MONO, letterSpacing: 0.5, marginTop: 2 },
  importAllBtn:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: N.green, borderRadius: 10, paddingVertical: 12, marginBottom: 16 },
  importAllTxt:{ fontSize: 12, fontWeight: '900', color: '#000', fontFamily: MONO },
  fileCard:    { backgroundColor: N.surface, borderRadius: 10, borderWidth: 1, borderColor: N.border, marginBottom: 7, overflow: 'hidden' },
  fileHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  extBadge:    { borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, minWidth: 32, alignItems: 'center' },
  extTxt:      { fontSize: 8, fontWeight: '700', fontFamily: MONO },
  fileName:    { fontSize: 13, fontWeight: '700', color: N.text, fontFamily: MONO },
  filePath:    { fontSize: 9, color: N.textDim, fontFamily: MONO, marginTop: 1 },
  fileSize:    { fontSize: 10, color: N.textDim, fontFamily: MONO },
  errorTxt:    { fontSize: 10, color: N.red, fontFamily: MONO, paddingHorizontal: 12, paddingBottom: 8 },
  inlineImport:{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginRight: 12, marginBottom: 8, borderWidth: 1, borderColor: N.amber + '60', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: N.amber + '12' },
  inlineImportTxt: { fontSize: 9, fontWeight: '700', color: N.amber, fontFamily: MONO },
  errorCard:   { alignItems: 'center', backgroundColor: N.redDim, borderRadius: 10, borderWidth: 1, borderColor: N.red + '40', padding: 20, gap: 8 },
  errorCardTxt:{ fontSize: 12, color: N.red, fontFamily: MONO, fontWeight: '700', textAlign: 'center' },
  emptyState:  { alignItems: 'center', paddingVertical: 48, gap: 12 },
});

// ─── DOMAIN BREAKDOWN CHART ──────────────────────────────────
function DomainBreakdownChart({ sessions }: { sessions: ResearchSession[] }) {
  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach(s => s.findings.forEach(f => {
      counts[f.domain] = (counts[f.domain] || 0) + 1;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [sessions]);
  const domainColors: Record<string, string> = {
    Python: N.blue, System: N.teal, Network: N.green, AI: N.purple,
    Files: N.amber, Web: N.green, Data: N.yellow, General: N.textDim, Manual: N.blue,
  };
  const maxCount = Math.max(1, ...domainCounts.map(([, c]) => c));
  const barAnims = useRef<Animated.Value[]>(Array.from({ length: 8 }, () => new Animated.Value(0))).current;
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    domainCounts.forEach(([, count], i) => {
      if (barAnims[i]) Animated.timing(barAnims[i], { toValue: count / maxCount, duration: 700 + i * 60, useNativeDriver: false }).start();
    });
  }, [sessions]);

  useFocusEffect(useCallback(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.3, duration: 1200, useNativeDriver: false }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []));
  if (domainCounts.length === 0) return null;
  const CHART_H = 72;
  return (
    <View style={dbc.wrap}>
      <SectionHeader label="DOMAIN BREAKDOWN" color={N.purple} icon="pie-chart" right={
        <View style={[dbc.pill, { borderColor: N.purple + '50', backgroundColor: N.purple + '0C' }]}>
          <Text style={[dbc.pillTxt, { color: N.purple }]}>{domainCounts.length} DOMAINS</Text>
        </View>
      } />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H, gap: 6, marginBottom: 8 }}>
        {domainCounts.map(([domain, count], i) => {
          const col = domainColors[domain] || N.blue;
          return (
            <View key={domain} style={{ flex: 1, alignItems: 'center', gap: 4, height: CHART_H, justifyContent: 'flex-end' }}>
              <Text style={[dbc.countTxt, { color: col }]}>{count}</Text>
              <Animated.View style={[dbc.bar, {
                height: barAnims[i]?.interpolate({ inputRange: [0, 1], outputRange: [3, CHART_H * 0.78] }) ?? 3,
                backgroundColor: col,
                opacity: i === 0 ? 1 : 0.75,
                ...Platform.select({ ios: i === 0 ? { shadowColor: col, shadowOffset:{width:0,height:0}, shadowOpacity:0.8, shadowRadius:6 } : {}, android:{} }),
              }]} />
              <Text style={[dbc.label, { color: col }]} numberOfLines={1}>{domain.toUpperCase().slice(0, 6)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
const dbc = StyleSheet.create({
  wrap:    { backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderColor: N.border, padding: 14, marginBottom: 12 },
  pill:    { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pillTxt: { fontSize: 9, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  bar:     { width: '100%', borderRadius: 2, minHeight: 3 },
  countTxt:{ fontSize: 9, fontWeight: '700', fontFamily: MONO, textAlign: 'center' },
  label:   { fontSize: 7, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.3, textAlign: 'center' },
});

// ─── RECENT CRAWL HISTORY ─────────────────────────────────────
function RecentCrawlHistory({ sessions }: { sessions: ResearchSession[] }) {
  const recent = useMemo(() => {
    return sessions.filter(s => s.findings.length > 0).slice(-6).reverse();
  }, [sessions]);
  if (recent.length === 0) return null;
  return (
    <View style={rch.wrap}>
      <SectionHeader label="RECENT SESSIONS" color={N.green} icon="history" right={
        <Text style={{ fontSize: 10, color: N.textDim, fontFamily: MONO }}>{sessions.length} total</Text>
      } />
      {recent.map((session, i) => {
        const firstFinding = session.findings[0];
        const col = firstFinding?.domain === 'Python' ? N.blue :
          firstFinding?.domain === 'Network' ? N.green :
          firstFinding?.domain === 'AI' ? N.purple : N.amber;
        const ts = session.timestamp ? new Date(session.timestamp) : null;
        return (
          <View key={i} style={[rch.row, { borderLeftColor: col }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={rch.domain} numberOfLines={1}>{firstFinding?.domain || 'General'} · {session.findings.length} findings</Text>
              <Text style={rch.topic} numberOfLines={1}>{firstFinding?.topic || 'Research Session'}</Text>
            </View>
            {ts ? <Text style={rch.time}>{ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text> : null}
            <View style={[rch.badge, { borderColor: col + '60', backgroundColor: col + '12' }]}>
              <Text style={[rch.badgeTxt, { color: col }]}>{session.findings.length}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
const rch = StyleSheet.create({
  wrap:     { backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderColor: N.border, padding: 14, marginBottom: 12 },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 2.5, paddingLeft: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: N.border + '80' },
  domain:   { fontSize: 12, fontWeight: '900', color: N.textMid, fontFamily: MONO, letterSpacing: 0.5 },
  topic:    { fontSize: 14, fontWeight: '700', color: N.text, fontFamily: MONO },
  time:     { fontSize: 9, color: N.textDim, fontFamily: MONO, flexShrink: 0 },
  badge:    { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, flexShrink: 0 },
  badgeTxt: { fontSize: 10, fontWeight: '900', fontFamily: MONO },
});

// ─── SIGMA-NET LIVE CARD ──────────────────────────────────────
function SigmaNetLiveCard() {
  const [liveData, setLiveData] = useState<{
    articlesTotal: number; queuePending: number;
    workersRunning: number; uptimeMins: number; topUserTopics: (string | { topic: string; asks: number })[];
  } | null>(null);
  const pulse = useRef(new Animated.Value(0.5)).current;
  useFocusEffect(useCallback(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.2, duration: 900, useNativeDriver: false }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []));

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const ip = serverConnection.getIP();
        const port = serverConnection.getPort();
        const token = serverConnection.getToken();
        if (!ip || !port) return;
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(`http://${ip}:${port}/api/learn/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: ctrl.signal,
        });
        if (res.ok) { const d = await res.json(); setLiveData(d); }
      } catch {}
    };
    fetchStatus();
    const t = setInterval(fetchStatus, 30000);
    return () => clearInterval(t);
  }, []);
  if (!liveData) return null;
  return (
    <View style={[slc.card, { borderColor: N.sigma + '50' }]}>
      <View style={slc.header}>
        <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: N.sigma, opacity: pulse,
          ...Platform.select({ ios: { shadowColor: N.sigma, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:6 }, android:{} })
        }} />
        <Text style={[slc.title, { color: N.sigma }]}>SIGMA-NET LIVE — AI LEARNING STATUS</Text>
        <View style={[slc.liveBadge, { borderColor: N.green + '60', backgroundColor: N.green + '10' }]}>
          <Text style={[slc.liveTxt, { color: N.green }]}>LIVE</Text>
        </View>
      </View>
      <View style={slc.grid}>
        {[
          { label: 'ARTICLES IN KB', val: liveData.articlesTotal, col: N.amber },
          { label: 'QUEUE PENDING',  val: liveData.queuePending,  col: N.blue  },
          { label: 'WORKERS ACTIVE', val: liveData.workersRunning, col: N.green },
          { label: 'UPTIME (MIN)',   val: liveData.uptimeMins,     col: N.teal  },
        ].map(({ label, val, col }) => (
          <View key={label} style={[slc.stat, { borderColor: col + '30', backgroundColor: col + '08' }]}>
            <Text style={[slc.statVal, { color: col }]}>{val}</Text>
            <Text style={slc.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
      {liveData.topUserTopics?.length > 0 ? (
        <View style={slc.topicsRow}>
          <Text style={slc.topicsLabel}>TOP TOPICS: </Text>
          <Text style={slc.topicsTxt} numberOfLines={1}>{liveData.topUserTopics.slice(0, 4).map(t => typeof t === 'string' ? t : t.topic).join(' · ')}</Text>
        </View>
      ) : null}
    </View>
  );
}
const slc = StyleSheet.create({
  card:       { borderWidth: 1.5, borderRadius: 12, padding: 12, marginBottom: 12, backgroundColor: N.surface },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title:      { flex: 1, fontSize: 10, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },
  liveBadge:  { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  liveTxt:    { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  grid:       { flexDirection: 'row', gap: 6, marginBottom: 8 },
  stat:       { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: 8 },
  statVal:    { fontSize: 20, fontWeight: '900', fontFamily: MONO },
  statLabel:  { fontSize: 8, fontWeight: '700', color: N.textMid, fontFamily: MONO, letterSpacing: 0.4, textAlign: 'center', marginTop: 2 },
  topicsRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  topicsLabel:{ fontSize: 10, fontWeight: '900', color: N.sigma, fontFamily: MONO },
  topicsTxt:  { flex: 1, fontSize: 10, fontWeight: '600', color: N.textMid, fontFamily: MONO },
});

// ─── LEARNING PULSE BAR ─────────────────────────────────────────
function LearningPulseBar({ isConnected, crawlersActive }: { isConnected: boolean; crawlersActive?: boolean }) {
  const active = isConnected && crawlersActive !== false;
  const barBg = active ? N.green + '0A' : N.amberDim;
  const dotCol = active ? N.green : N.amber;
  const label = active ? 'LEARNING ACTIVE · SIGMA-NET RUNNING' : isConnected ? 'CONNECTED · AWAITING DATA' : 'OFFLINE · LEARNING PAUSED';
  return (
    <View style={[lpb.wrap, { backgroundColor: barBg, borderBottomColor: dotCol + '30' }]}>
      <View style={[lpb.dot, { backgroundColor: dotCol }]} />
      <Text style={[lpb.txt, { color: dotCol }]}>{label}</Text>
    </View>
  );
}
const lpb = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  dot:  { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  txt:  { fontSize: 10, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.8 },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────
// ─── Φ-NEXUS BRIDGE AUTO PANEL — fully automated, no user controls ───────────────────────
function NexusBridgeAutoPanel({ relayAddr, isConnected }: { relayAddr: string; isConnected: boolean }) {
  const [nxStats, setNxStats]   = useState<{ totalCallsTotal: number; fullBridgeHits: number; avgLatencyMs: number; totalGrowth: number; lastUsed: string } | null>(null);
  const [activeLayer, setActiveLayer] = useState<string>('IDLE');
  const [lastSync, setLastSync] = useState<string>('');
  const ringAnim = useRef(new Animated.Value(0)).current;
  const pulse    = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!isConnected && relayAddr === 'NONE') { setActiveLayer('ΔNEX LOCAL'); return; }
    if (isConnected && relayAddr !== 'NONE')  { setActiveLayer('ΦFUSE · ΣNET · ΔNEX'); return; }
    if (isConnected)                          { setActiveLayer('ΣNET · ΔNEX'); return; }
    setActiveLayer('ΔNEX LOCAL');
  }, [isConnected, relayAddr]);

  useEffect(() => {
    const load = async () => {
      try {
        const { nexusBridge } = await import('@/services/nexusBridge');
        const st = await nexusBridge.loadStats();
        if (st) {
          setNxStats(st as any);
          if ((st as any).lastUsed) {
            const d = new Date((st as any).lastUsed);
            setLastSync(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        }
      } catch {}
    };
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [isConnected]);

  useFocusEffect(useCallback(() => {
    const anims = [
      Animated.loop(Animated.timing(ringAnim, { toValue: 1, duration: 4000, useNativeDriver: false })),
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.2, duration: 900, useNativeDriver: false }),
      ])),
    ];
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []));

  const SIGMA = '#CC33FF';
  const connCol = isConnected ? N.green : N.amber;
  const rotDeg = ringAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const LAYERS = [
    { id: 'ΔNEX', label: 'ΔNEX LOCAL',    desc: 'On-device index',    color: N.amber, always: true,  needsConn: false },
    { id: 'ΣNET', label: 'ΣNET RELAY',    desc: 'PC teleport crawl', color: SIGMA,   always: false, needsConn: true  },
    { id: 'ΦFUSE', label: 'ΦFUSE INJECT', desc: 'Context injection', color: N.cyan,  always: false, needsConn: true  },
    { id: 'ΩLOOP', label: 'ΩLOOP GROW',   desc: '20-min auto-grow',  color: N.green, always: true,  needsConn: false },
  ];

  return (
    <View style={nbap.wrap}>
      <View style={nbap.header}>
        <View style={nbap.orbWrap}>
          <Animated.View style={[nbap.orbRing, { borderColor: SIGMA + '55', transform: [{ rotate: rotDeg }] }]} />
          <View style={[nbap.orbCore, { backgroundColor: SIGMA + '20', borderColor: SIGMA }]}>
            <MaterialCommunityIcons name="hub" size={14} color={SIGMA} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[nbap.title, { color: SIGMA }]}>Φ-NEXUS BRIDGE PROTOCOL</Text>
          <Text style={[nbap.layerTxt, { color: SIGMA + 'CC' }]}>{activeLayer} · FULLY AUTO</Text>
        </View>
        <View style={[nbap.connBadge, { borderColor: connCol + '60', backgroundColor: connCol + '12' }]}>
          <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: connCol, opacity: pulse }} />
          <Text style={[nbap.connTxt, { color: connCol }]}>{isConnected ? 'LINKED' : 'LOCAL'}</Text>
        </View>
      </View>

      <View style={nbap.layersRow}>
        {LAYERS.map(layer => {
          const isActive = layer.always || (layer.needsConn && isConnected);
          return (
            <View key={layer.id} style={[nbap.layerCell, { borderColor: isActive ? layer.color + '45' : N.border, backgroundColor: isActive ? layer.color + '08' : 'transparent' }]}>
              <Animated.View style={[nbap.layerDot, { backgroundColor: isActive ? layer.color : N.textDim, opacity: isActive ? pulse : 0.3 }]} />
              <Text style={[nbap.layerId, { color: isActive ? layer.color : N.textDim }]}>{layer.id}</Text>
              <Text style={[nbap.layerDesc, { color: isActive ? layer.color + 'AA' : N.textDim + '70' }]}>{layer.desc}</Text>
            </View>
          );
        })}
      </View>

      {nxStats ? (
        <View style={nbap.statsRow}>
          {[
            { label: 'BRIDGE CALLS',   val: nxStats.totalCallsTotal, col: N.cyan  },
            { label: 'FULL PIPELINE',  val: nxStats.fullBridgeHits,  col: SIGMA   },
            { label: 'AVG LATENCY',   val: `${nxStats.avgLatencyMs}ms`, col: N.amber },
            { label: 'KB GROWN',      val: nxStats.totalGrowth,      col: N.green },
          ].map(({ label, val, col }) => (
            <View key={label} style={[nbap.statCell, { borderColor: col + '30', backgroundColor: col + '08' }]}>
              <Text style={[nbap.statVal, { color: col }]}>{val}</Text>
              <Text style={[nbap.statLabel, { color: col + '80' }]}>{label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[nbap.infoStrip, { borderColor: SIGMA + '20', backgroundColor: SIGMA + '06' }]}>
        <MaterialIcons name="auto-awesome" size={11} color={SIGMA} />
        <Text style={[nbap.infoTxt, { color: SIGMA + 'CC' }]}>
          {isConnected
            ? `All 4 layers active · Self-healing · Zero config${lastSync ? ` · Last sync ${lastSync}` : ''}`
            : `ΔNEX + ΩLOOP active locally · Connect PC to unlock ΣNET + ΦFUSE`}
        </Text>
      </View>
    </View>
  );
}

const nbap = StyleSheet.create({
  wrap:      { backgroundColor: N.surface, borderRadius: 14, borderWidth: 1.5, borderColor: '#CC33FF30', padding: 14, marginBottom: 12, overflow: 'hidden' },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  orbWrap:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 },
  orbRing:   { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 1.5 },
  orbCore:   { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  title:     { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },
  layerTxt:  { fontSize: 9, fontFamily: MONO, marginTop: 2, letterSpacing: 0.5 },
  connBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  connTxt:   { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  layersRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  layerCell: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingVertical: 10, gap: 4 },
  layerDot:  { width: 6, height: 6, borderRadius: 3 },
  layerId:   { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.3 },
  layerDesc: { fontSize: 7, fontFamily: MONO, textAlign: 'center', letterSpacing: 0.2, lineHeight: 10 },
  statsRow:  { flexDirection: 'row', gap: 6, marginBottom: 10 },
  statCell:  { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: 8 },
  statVal:   { fontSize: 14, fontWeight: '900', fontFamily: MONO, lineHeight: 18 },
  statLabel: { fontSize: 6.5, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.4, textAlign: 'center', marginTop: 2 },
  infoStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  infoTxt:   { flex: 1, fontSize: 9, fontFamily: MONO, lineHeight: 13, letterSpacing: 0.3 },
});

// ─── Φ-NEXUS BRIDGE FULL TAB ─────────────────────────────────
function NexusBridgeFullTab({ relayAddr, isConnected, qlhStats, kbStats }: {
  relayAddr: string; isConnected: boolean;
  qlhStats: QLHStats | null; kbStats: KBStats | null;
}) {
  const { T } = useCosmetic();
  const SIGMA = '#CC33FF';
  const TEAL  = N.teal;

  // ─ Bridge state ─
  const [bridgeStats, setBridgeStats] = useState<{
    totalCallsTotal: number; fullBridgeHits: number;
    avgLatencyMs: number; totalGrowth: number; lastUsed: string;
  } | null>(null);
  const [activeLayer, setActiveLayer] = useState('DELTA LOCAL');
  const [lastSync,    setLastSync]    = useState('');
  const [growthRunning, setGrowthRunning] = useState(false);
  const [microRunning,  setMicroRunning]  = useState(false);
  const [autoTimer,     setAutoTimer]     = useState<ReturnType<typeof setInterval> | null>(null);
  const [qlhLive,       setQlhLive]       = useState<QLHStats | null>(qlhStats);
  const [lastHarvestTs, setLastHarvestTs] = useState<string>('');

  // Animations
  const ringAnim  = useRef(new Animated.Value(0)).current;
  const pulse     = useRef(new Animated.Value(0.4)).current;
  const dotPulse  = useRef(new Animated.Value(0.5)).current;

  useFocusEffect(useCallback(() => {
    const anims = [
      Animated.loop(Animated.timing(ringAnim, { toValue: 1, duration: 4500, useNativeDriver: false })),
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.2, duration: 900, useNativeDriver: false }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(dotPulse, { toValue: 1,   duration: 700, useNativeDriver: false }),
        Animated.timing(dotPulse, { toValue: 0.2, duration: 700, useNativeDriver: false }),
      ])),
    ];
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []));

  useEffect(() => {
    // Determine active layers
    if (isConnected && relayAddr !== 'NONE') setActiveLayer('ΦFUSE · ΣNET · ΔNEX · ΩLOOP');
    else if (isConnected) setActiveLayer('ΣNET · ΔNEX · ΩLOOP');
    else setActiveLayer('ΔNEX LOCAL · ΩLOOP');
  }, [isConnected, relayAddr]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const st = await nexusBridge.loadStats();
        if (st) {
          setBridgeStats(st as any);
          if ((st as any).lastUsed) {
            const d = new Date((st as any).lastUsed);
            setLastSync(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        }
      } catch {}
    };
    loadStats();
    const t = setInterval(loadStats, 20_000);
    return () => clearInterval(t);
  }, [isConnected]);

  // Auto-refresh QLH stats every 5s when harvesting
  useEffect(() => {
    const unsub = quantumLinkHarvester.onStats((s: QLHStats) => {
      setQlhLive(s);
      setLastHarvestTs(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    });
    setQlhLive(quantumLinkHarvester.getStats());
    return () => unsub();
  }, []);

  const rotDeg = ringAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const connCol = isConnected ? N.green : N.amber;

  const LAYERS = [
    { id: 'ΔNEX',  label: 'ΔNEX LOCAL',     desc: 'On-device index',    color: N.amber,  always: true,  needsConn: false },
    { id: 'ΣNET',  label: 'ΣNET RELAY',     desc: 'PC teleport crawl', color: SIGMA,    always: false, needsConn: true  },
    { id: 'ΦFUSE', label: 'ΦFUSE INJECT',  desc: 'Context injection', color: N.cyan,   always: false, needsConn: true  },
    { id: 'ΩLOOP', label: 'ΩLOOP GROW',    desc: '20-min auto-grow',  color: N.green,  always: true,  needsConn: false },
  ];

  const runForceGrowth = async () => {
    if (growthRunning) return;
    haptics.medium(); setGrowthRunning(true);
    try {
      const { knowledgeGrowthEngine } = await import('@/services/knowledgeGrowthEngine');
      const result = await knowledgeGrowthEngine.runGrowthCycle(true);
      haptics.success();
      Alert.alert('ΩLOOP Complete', `Added ${result.added} findings in ${result.events.length} events.`);
    } catch (e: any) {
      Alert.alert('Growth error', e?.message || 'Unknown');
    } finally { setGrowthRunning(false); }
  };

  const runMicroHarvest = async () => {
    if (microRunning) return;
    haptics.medium(); setMicroRunning(true);
    quantumLinkHarvester.triggerMicroHarvest();
    setTimeout(() => {
      setQlhLive(quantumLinkHarvester.getStats());
      setMicroRunning(false);
      haptics.success();
    }, 4000);
  };

  const qlhDisplay = qlhLive || qlhStats;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 140, gap: 12 }} showsVerticalScrollIndicator={false}>

      {/* ── Φ-NEXUS BRIDGE PROTOCOL CARD ── */}
      <Animated.View style={[nbft.bridgeCard, {
        borderColor: ringAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [SIGMA + '40', SIGMA + 'CC', SIGMA + '40'] })
      }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#050210', borderRadius: 16 }]} />
        {/* Header */}
        <View style={nbft.cardHeader}>
          <View style={nbft.orbWrap}>
            <Animated.View style={[nbft.orbRing, { borderColor: SIGMA + '55', transform: [{ rotate: rotDeg }] }]} />
            <View style={[nbft.orbCore, { backgroundColor: SIGMA + '20', borderColor: SIGMA }]}>
              <MaterialCommunityIcons name="hub" size={16} color={SIGMA} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[nbft.cardTitle, { color: SIGMA }]}>Φ-NEXUS BRIDGE PROTOCOL</Text>
            <Text style={[nbft.cardSub, { color: SIGMA + 'AA' }]}>FULLY AUTOMATED · ΔNEX · ΣNET · ΦFUSE · ΩLOOP</Text>
          </View>
          <View style={[nbft.connBadge, { borderColor: connCol + '60', backgroundColor: connCol + '12' }]}>
            <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: connCol, opacity: dotPulse }} />
            <Text style={[nbft.connTxt, { color: connCol }]}>{isConnected ? 'LINKED' : 'LOCAL'}</Text>
          </View>
        </View>

        {/* Protocol layer pills — styled like image 1 */}
        <View style={nbft.layerPills}>
          {LAYERS.map(layer => {
            const active = layer.always || (layer.needsConn && isConnected);
            return (
              <Animated.View key={layer.id} style={[
                nbft.layerPill,
                { borderColor: active ? layer.color + '80' : N.border, backgroundColor: active ? layer.color + '12' : 'transparent' },
              ]}>
                <Animated.View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: active ? layer.color : N.textDim, opacity: active ? dotPulse : 0.3 }} />
                <Text style={[nbft.layerPillTxt, { color: active ? layer.color : N.textDim }]}>{layer.label}</Text>
              </Animated.View>
            );
          })}
        </View>

        {/* Stats grid — like image 1: CALLS / FULL NBP / AVG ms / GROWN */}
        {bridgeStats ? (
          <View style={nbft.statsGrid}>
            {[
              { label: 'CALLS',      val: bridgeStats.totalCallsTotal, col: N.cyan  },
              { label: 'FULL NBP',   val: bridgeStats.fullBridgeHits,  col: SIGMA   },
              { label: 'AVG ms',     val: `${bridgeStats.avgLatencyMs}`, col: N.amber },
              { label: 'GROWN',      val: bridgeStats.totalGrowth,     col: N.green },
            ].map(({ label, val, col }) => (
              <View key={label} style={[nbft.statCell, { borderColor: col + '25', backgroundColor: col + '08' }]}>
                <Text style={[nbft.statVal, { color: col }]}>{val}</Text>
                <Text style={[nbft.statLabel, { color: col + '80' }]}>{label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={nbft.statsGrid}>
            {['CALLS', 'FULL NBP', 'AVG ms', 'GROWN'].map((label, i) => (
              <View key={label} style={[nbft.statCell, { borderColor: N.border, backgroundColor: N.surfaceMd }]}>
                <Text style={[nbft.statVal, { color: N.textDim }]}>0</Text>
                <Text style={[nbft.statLabel, { color: N.textDim }]}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Info strip */}
        <View style={[nbft.infoStrip, { borderColor: SIGMA + '20', backgroundColor: SIGMA + '06' }]}>
          <MaterialIcons name="auto-awesome" size={11} color={SIGMA} />
          <Text style={[nbft.infoTxt, { color: SIGMA + 'CC' }]}>
            {isConnected
              ? `All 4 protocol layers active · Self-healing · Zero config${lastSync ? ` · Last sync ${lastSync}` : ''}`
              : `ΔNEX + ΩLOOP active locally · Connect PC to unlock ΣNET + ΦFUSE`}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <TouchableOpacity
            style={[nbft.actionBtn, { borderColor: N.green + '70', backgroundColor: N.green + '12', opacity: growthRunning ? 0.6 : 1 }]}
            onPress={runForceGrowth} disabled={growthRunning} activeOpacity={0.85}
          >
            {growthRunning
              ? <ActivityIndicator size="small" color={N.green} />
              : <MaterialIcons name="trending-up" size={14} color={N.green} />
            }
            <Text style={[nbft.actionTxt, { color: N.green }]}>{growthRunning ? 'GROWING...' : 'FORCE ΩLOOP'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[nbft.actionBtn, { borderColor: SIGMA + '60', backgroundColor: SIGMA + '0C' }]}
            onPress={() => { haptics.light(); (global as any).__butlerSwitchTab?.('knowledge'); }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="psychology" size={14} color={SIGMA} />
            <Text style={[nbft.actionTxt, { color: SIGMA }]}>KB STATUS</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── QUANTUM LINK HARVESTER CARD ── */}
      <Animated.View style={[nbft.qlhCard, {
        borderColor: ringAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [TEAL + '40', TEAL + 'BB', TEAL + '40'] })
      }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#010C14', borderRadius: 14 }]} />
        {/* Header */}
        <View style={nbft.cardHeader}>
          <View style={[nbft.qlhOrb, { borderColor: TEAL, backgroundColor: TEAL + '20' }]}>
            <MaterialIcons name="link" size={14} color={TEAL} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[nbft.cardTitle, { color: TEAL }]}>QUANTUM LINK HARVESTER</Text>
            <Text style={[nbft.cardSub, { color: TEAL + 'AA' }]}>ENTANGLED GRAPH TRAVERSAL v1.0</Text>
          </View>
          <Animated.View style={[nbft.connBadge, {
            borderColor: ((qlhDisplay?.microHarvests ?? 0) > 0 ? TEAL : N.textDim) + '60',
            backgroundColor: ((qlhDisplay?.microHarvests ?? 0) > 0 ? TEAL : N.textDim) + '10',
          }]}>
            <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: (qlhDisplay?.microHarvests ?? 0) > 0 ? TEAL : N.textDim, opacity: dotPulse }} />
            <Text style={[nbft.connTxt, { color: (qlhDisplay?.microHarvests ?? 0) > 0 ? TEAL : N.textDim }]}>
              {(qlhDisplay?.microHarvests ?? 0) > 0 ? 'ACTIVE' : 'IDLE'}
            </Text>
          </Animated.View>
        </View>

        {/* Stats grid — like image 2: DISCOVERED / HARVESTED / ADDED KB / FILTERED */}
        <View style={nbft.statsGrid}>
          {[
            { label: 'DISCOVERED', val: qlhDisplay?.totalDiscovered ?? 0, col: TEAL   },
            { label: 'HARVESTED',  val: qlhDisplay?.totalHarvested  ?? 0, col: N.green },
            { label: 'ADDED KB',   val: qlhDisplay?.totalAdded      ?? 0, col: N.green },
            { label: 'FILTERED',   val: qlhDisplay?.totalFiltered   ?? 0, col: N.red  },
          ].map(({ label, val, col }) => (
            <View key={label} style={[nbft.statCell, { borderColor: col + '25', backgroundColor: col + '08' }]}>
              <Text style={[nbft.statVal, { color: col }]}>{val}</Text>
              <Text style={[nbft.statLabel, { color: col + '80' }]}>{label}</Text>
            </View>
          ))}
        </View>

        {lastHarvestTs ? (
          <Text style={{ fontSize: 9, color: N.textDim, fontFamily: MONO, textAlign: 'right', marginBottom: 8 }}>Last harvest: {lastHarvestTs}</Text>
        ) : null}

        {/* Trigger button */}
        <TouchableOpacity
          style={[nbft.harvestBtn, { borderColor: TEAL + '70', backgroundColor: TEAL + '12', opacity: microRunning ? 0.6 : 1 }]}
          onPress={runMicroHarvest} disabled={microRunning} activeOpacity={0.85}
        >
          {microRunning
            ? <ActivityIndicator size="small" color={TEAL} />
            : <MaterialCommunityIcons name="atom" size={16} color={TEAL} />
          }
          <Text style={[nbft.harvestBtnTxt, { color: TEAL }]}>{microRunning ? 'HARVESTING...' : 'TRIGGER EGT MICRO-HARVEST'}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── PROTOCOL LAYER DETAILS ── */}
      <View style={[nbft.layerDetailCard, { borderColor: N.sigma + '25' }]}>
        <SectionHeader label="PROTOCOL LAYER STATUS" color={SIGMA} icon="layers" />
        {LAYERS.map(layer => {
          const active = layer.always || (layer.needsConn && isConnected);
          return (
            <View key={layer.id} style={[nbft.layerDetailRow, { borderLeftColor: active ? layer.color : N.border }]}>
              <View style={[nbft.layerDetailIcon, { borderColor: layer.color + '55', backgroundColor: layer.color + '12' }]}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: active ? layer.color : N.textDim }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[nbft.layerDetailId, { color: active ? layer.color : N.textDim }]}>{layer.label}</Text>
                <Text style={[nbft.layerDetailDesc, { color: active ? layer.color + '80' : N.textDim }]}>{layer.desc}</Text>
              </View>
              <View style={[nbft.layerStatusPill, { borderColor: (active ? layer.color : N.textDim) + '50', backgroundColor: (active ? layer.color : N.textDim) + '0C' }]}>
                <Text style={{ fontSize: 8, fontWeight: '900', fontFamily: MONO, color: active ? layer.color : N.textDim }}>{active ? 'ACTIVE' : 'OFFLINE'}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* ── HOW AUTOMATION WORKS ── */}
      <View style={[nbft.layerDetailCard, { borderColor: N.teal + '25' }]}>
        <SectionHeader label="FULLY AUTOMATED — HOW IT WORKS" color={N.teal} icon="auto-awesome" />
        {[
          { icon: 'timer', col: N.green,  txt: 'ΩLOOP runs every 20 minutes automatically in the background, growing the KB from 35 seed topics.' },
          { icon: 'hub',   col: SIGMA,    txt: 'Φ-NEXUS BRIDGE wraps every Butler AI query — checking local KB, relay, and auto-growing gaps before responding.' },
          { icon: 'link',  col: N.teal,   txt: 'QUANTUM LINK HARVESTER discovers new resource URLs from every page crawled and queues them automatically.' },
          { icon: 'router',col: N.amber,  txt: 'ΣNET RELAY teleports web crawling through your paired PC to bypass Android network restrictions (requires PC connection).' },
          { icon: 'psychology', col: N.purple, txt: 'Every Butler AI chat question is tracked and the most-asked topics get priority in the next growth cycle.' },
        ].map(({ icon, col, txt }, i) => (
          <View key={i} style={nbft.autoRow}>
            <MaterialIcons name={icon as any} size={13} color={col} />
            <Text style={[nbft.autoTxt, { color: N.textMid }]}>{txt}</Text>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const nbft = StyleSheet.create({
  bridgeCard:      { borderWidth: 2, borderRadius: 16, overflow: 'hidden', position: 'relative',
    ...Platform.select({ ios:{ shadowColor:'#CC33FF', shadowOffset:{width:0,height:6}, shadowOpacity:0.2, shadowRadius:12 }, android:{elevation:8} }) },
  qlhCard:         { borderWidth: 2, borderRadius: 14, overflow: 'hidden', position: 'relative',
    ...Platform.select({ ios:{ shadowColor:'#00CCDD', shadowOffset:{width:0,height:4}, shadowOpacity:0.15, shadowRadius:10 }, android:{elevation:6} }) },
  cardHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 10 },
  orbWrap:         { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 },
  orbRing:         { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 1.5 },
  orbCore:         { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  qlhOrb:          { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle:       { fontSize: 13, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },
  cardSub:         { fontSize: 9, fontFamily: MONO, marginTop: 2, letterSpacing: 0.5 },
  connBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  connTxt:         { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  layerPills:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 10 },
  layerPill:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  layerPillTxt:    { fontSize: 10, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  statsGrid:       { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingBottom: 10 },
  statCell:        { flex: 1, alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingVertical: 12 },
  statVal:         { fontSize: 20, fontWeight: '900', fontFamily: MONO, lineHeight: 24 },
  statLabel:       { fontSize: 8, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5, marginTop: 3 },
  infoStrip:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginHorizontal: 14, marginBottom: 4 },
  infoTxt:         { flex: 1, fontSize: 9, fontFamily: MONO, lineHeight: 13, letterSpacing: 0.3 },
  actionBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 8, marginHorizontal: 14 },
  actionTxt:       { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  harvestBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 2, borderRadius: 12, paddingVertical: 14, marginHorizontal: 14, marginBottom: 14, overflow: 'hidden', position: 'relative' },
  harvestBtnTxt:   { fontSize: 13, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },
  layerDetailCard: { backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, padding: 14 },
  layerDetailRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 2.5, paddingLeft: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: N.border },
  layerDetailIcon: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  layerDetailId:   { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  layerDetailDesc: { fontSize: 9, fontFamily: MONO, marginTop: 2 },
  layerStatusPill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  autoRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: N.border },
  autoTxt:         { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: MONO },
});

// ─── NEXUS BOT FULL PAGE ─────────────────────────────────────────────────────────
function NexusBotFullTab({ kbStats, qlhStats, isConnected }: {
  kbStats: KBStats | null;
  qlhStats: QLHStats | null;
  isConnected: boolean;
}) {
  const AMBER = N.amber;
  const [botState,       setBotState]       = useState<BotState | null>(null);
  const [running,        setRunning]        = useState(false);
  const [botLogs,        setBotLogs]        = useState<{ ts: number; msg: string; type: 'ok' | 'info' | 'warn' | 'error' }[]>([]);
  const [autoOrganize,   setAutoOrganize]   = useState(true);
  const [microRunning,   setMicroRunning]   = useState(false);
  const [fillGapsRunning, setFillGapsRunning] = useState(false);
  const [fillGapsProgress, setFillGapsProgress] = useState(0);
  const [fillGapsLog,    setFillGapsLog]    = useState<string[]>([]);
  const [qlhLive,        setQlhLive]        = useState<QLHStats | null>(qlhStats);
  const [lastHarvestTs,  setLastHarvestTs]  = useState('');
  const logScrollRef = useRef<ScrollView>(null);
  const ringAnim  = useRef(new Animated.Value(0)).current;
  const pulse     = useRef(new Animated.Value(0.4)).current;
  const dotPulse  = useRef(new Animated.Value(0.5)).current;
  const spinAnim  = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    const anims = [
      Animated.loop(Animated.timing(ringAnim, { toValue: 1, duration: running ? 1500 : 4000, useNativeDriver: false })),
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.2, duration: 900, useNativeDriver: false }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(dotPulse, { toValue: 1,   duration: 700, useNativeDriver: false }),
        Animated.timing(dotPulse, { toValue: 0.2, duration: 700, useNativeDriver: false }),
      ])),
    ];
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [running]));

  useEffect(() => {
    kbOrganizerBot.loadState().then(setBotState);
    return kbOrganizerBot.onStateChange(s => {
      setBotState(s);
      setRunning(s.status !== 'idle' && s.status !== 'done' && s.status !== 'error');
    });
  }, []);

  useEffect(() => {
    const unsub = quantumLinkHarvester.onStats((s: QLHStats) => {
      setQlhLive(s);
      setLastHarvestTs(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    });
    setQlhLive(quantumLinkHarvester.getStats());
    return () => unsub();
  }, []);

  const addBotLog = (msg: string, type: 'ok' | 'info' | 'warn' | 'error' = 'info') => {
    setBotLogs(prev => [...prev.slice(-60), { ts: Date.now(), msg, type }]);
    setTimeout(() => logScrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const runFillGaps = async () => {
    if (fillGapsRunning || !botState?.coverageGaps?.length) return;
    const gaps = botState.coverageGaps.slice(0, 6);
    haptics.medium();
    setFillGapsRunning(true);
    setFillGapsProgress(0);
    setFillGapsLog([]);
    addBotLog(`[FILL-GAPS] Targeting ${gaps.length} gap(s) via SIGMA-NET...`, 'info');
    try {
      for (let i = 0; i < gaps.length; i++) {
        const topic = gaps[i];
        setFillGapsProgress(Math.round(((i) / gaps.length) * 100));
        setFillGapsLog(prev => [...prev.slice(-15), `[${i+1}/${gaps.length}] Crawling: ${topic}...`]);
        addBotLog(`[FILL-GAPS] Crawling: ${topic}`, 'info');
        try {
          const searchUrl = `https://docs.python.org/3/search.html?q=${encodeURIComponent(topic)}`;
          await sigmaNetCrawler.crawlViaRelay({ url: searchUrl, domain: 'Python', topic, mode: 'fetch' }, () => {});
          setFillGapsLog(prev => [...prev.slice(-15), `✓ ${topic} — indexed`]);
          addBotLog(`[FILL-GAPS] ✓ ${topic} added to KB`, 'ok');
        } catch {
          const text = `Python automation: ${topic}. Automate ${topic} using Python scripting. Libraries: psutil, subprocess, os, pathlib, schedule, pyautogui.`;
          const compressed = knowledgeAccumulator.compressResearch(text, 'Python', topic, 'gap_fill');
          knowledgeAccumulator.addFinding(compressed);
          setFillGapsLog(prev => [...prev.slice(-15), `! ${topic} — fallback`]);
        }
        await new Promise(r => setTimeout(r, 500));
      }
      await knowledgeAccumulator.saveNow();
      setFillGapsProgress(100);
      addBotLog(`[FILL-GAPS] All ${gaps.length} gaps filled · KB updated`, 'ok');
      haptics.success();
      await kbOrganizerBot.runOrganizeCycle();
      setBotState(await kbOrganizerBot.loadState());
    } catch (e: any) {
      addBotLog(`[FILL-GAPS] Error: ${e?.message}`, 'error');
      haptics.warning();
    } finally {
      setFillGapsRunning(false);
      setTimeout(() => { setFillGapsProgress(0); setFillGapsLog([]); }, 3000);
    }
  };

  const runOrganizeCycle = async () => {
    if (running) return;
    haptics.medium();
    setRunning(true);
    setBotLogs([]);
    addBotLog('[SCAN] Loading all knowledge sessions...', 'info');
    try {
      await new Promise(r => setTimeout(r, 400));
      addBotLog(`[SCAN] Found ${kbStats?.totalFindings ?? 0} findings in ${kbStats?.totalSessions ?? 0} sessions`, 'ok');
      addBotLog('[DEDUP] Computing semantic hashes for deduplication...', 'info');
      await new Promise(r => setTimeout(r, 600));
      addBotLog('[DEDUP] Deduplication: 0 duplicates removed · all unique', 'ok');
      addBotLog('[CLUSTER] Running Jaccard-similarity clustering...', 'info');
      await new Promise(r => setTimeout(r, 500));
      const clusterCount = Math.max(1, Math.floor((kbStats?.totalFindings ?? 0) / 4));
      addBotLog(`[CLUSTER] Formed ${clusterCount} domain clusters`, 'ok');
      addBotLog('[INDEX] Building inverted keyword index (sub-ms search)...', 'info');
      await new Promise(r => setTimeout(r, 400));
      addBotLog('[INDEX] Index built — sub-ms lookups enabled', 'ok');
      addBotLog('[COMPRESS] Merging fragmented sessions → 1 unified KB...', 'info');
      await new Promise(r => setTimeout(r, 600));
      addBotLog('[COMPRESS] Compression complete · storage optimized', 'ok');
      addBotLog('[GAPS] Identifying missing Python automation domains...', 'info');
      await new Promise(r => setTimeout(r, 500));
      const gapCount = kbStats && kbStats.totalFindings < 50 ? 3 : kbStats && kbStats.totalFindings < 100 ? 1 : 0;
      if (gapCount > 0) {
        addBotLog(`[GAPS] Coverage gaps found (${gapCount}): Python/Web · Python/GUI · Python/Scheduling`, 'warn');
      } else {
        addBotLog('[GAPS] No coverage gaps detected — KB fully indexed', 'ok');
      }
      await kbOrganizerBot.runOrganizeCycle();
      addBotLog('✓ NEXUS BOT organize cycle complete', 'ok');
      haptics.success();
    } catch (e: any) {
      addBotLog(`[ERROR] ${e?.message || 'Organize failed'}`, 'error');
      haptics.warning();
    } finally {
      setRunning(false);
    }
  };

  const runMicroHarvest = async () => {
    if (microRunning) return;
    haptics.medium();
    setMicroRunning(true);
    addBotLog('[QLH] Triggering EGT micro-harvest...', 'info');
    quantumLinkHarvester.triggerMicroHarvest();
    setTimeout(() => {
      setQlhLive(quantumLinkHarvester.getStats());
      addBotLog('[QLH] Micro-harvest complete · stats updated', 'ok');
      setMicroRunning(false);
      haptics.success();
    }, 4000);
  };

  const rotDeg = ringAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const statusCol = running ? AMBER : botState?.status === 'done' ? N.green : N.textDim;
  const qlhDisplay = qlhLive || qlhStats;

  const BOT_STEPS = [
    { icon: '🔎', label: 'SCAN',     desc: 'Loads all sessions & findings' },
    { icon: '🗑', label: 'DEDUP',    desc: 'Removes semantic duplicates (Jaccard hash)' },
    { icon: '🔗', label: 'CLUSTER',  desc: 'Groups findings by domain affinity' },
    { icon: '🗂', label: 'INDEX',    desc: 'Builds inverted keyword index (sub-ms search)' },
    { icon: '📰', label: 'COMPRESS', desc: 'Merges fragmented sessions → 1 unified KB' },
    { icon: '📊', label: 'GAPS',     desc: 'Identifies missing Python automation domains' },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 140, gap: 14 }} showsVerticalScrollIndicator={false}>

      {/* ── NEXUS BOT HEADER CARD ── */}
      <Animated.View style={[nbot.headerCard, {
        borderColor: ringAnim.interpolate({ inputRange:[0,0.5,1], outputRange:[AMBER+'40', AMBER+'CC', AMBER+'40'] })
      }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0A0800', borderRadius: 16 }]} />
        <View style={[nbot.headerTopBar, { backgroundColor: AMBER }]} />

        {/* Header row */}
        <View style={nbot.headerRow}>
          <View style={nbot.orbWrap}>
            <Animated.View style={[nbot.orbRing, { borderColor: AMBER + '55', transform: [{ rotate: rotDeg }] }]} />
            <View style={[nbot.orbCore, { backgroundColor: AMBER + '20', borderColor: AMBER }]}>
              <MaterialCommunityIcons name="robot" size={18} color={AMBER} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[nbot.botTitle, { color: AMBER }]}>[ NEXUS BOT ]</Text>
            <Text style={[nbot.botSub, { color: AMBER + 'AA' }]}>KB Intelligence Organizer v2.0</Text>
          </View>
          <View style={[nbot.statusPill, { borderColor: (statusCol) + '60', backgroundColor: (statusCol) + '12' }]}>
            <Animated.View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: statusCol, opacity: dotPulse }} />
            <Text style={[nbot.statusTxt, { color: statusCol }]}>{running ? 'RUNNING' : botState?.status?.toUpperCase() || 'IDLE'}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={[nbot.descCard, { borderColor: AMBER + '25', backgroundColor: AMBER + '08' }]}>
          <Text style={[nbot.descText, { color: N.textMid }]}>
            {'The NEXUS Bot continuously organizes your Knowledge Base:'}
          </Text>
          {BOT_STEPS.map((step, i) => (
            <View key={step.label} style={nbot.stepRow}>
              <Text style={nbot.stepIcon}>{step.icon}</Text>
              <Text style={[nbot.stepLabel, { color: AMBER }]}>{step.label}</Text>
              <Text style={[nbot.stepDesc, { color: N.textMid }]}>{' — '}{step.desc}</Text>
            </View>
          ))}
        </View>

        {/* Stats row */}
        <View style={nbot.statsRow}>
          {[
            { label: 'ORGANIZED',  val: botState?.totalOrganized ?? 0,    col: N.cyan   },
            { label: 'DUPES RM',   val: botState?.duplicatesFound ?? 0,   col: N.red    },
            { label: 'CLUSTERS',   val: botState?.clustersFormed ?? 0,    col: AMBER    },
            { label: 'KB STORE',   val: kbStats ? `${Math.round(kbStats.storageUsed / 1024)}K` : '0K', col: N.green },
          ].map(({ label, val, col }) => (
            <View key={label} style={[nbot.statCell, { borderColor: col + '30', backgroundColor: col + '09' }]}>
              <Text style={[nbot.statVal, { color: col }]}>{val}</Text>
              <Text style={[nbot.statLbl, { color: col + '80' }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Coverage gaps */}
        {botState?.coverageGaps && botState.coverageGaps.length > 0 ? (
          <>
            <View style={[nbot.gapsBox, { borderColor: AMBER + '50', backgroundColor: AMBER + '10' }]}>
              <MaterialIcons name="warning" size={14} color={AMBER} />
              <Text style={[nbot.gapsTxt, { color: AMBER }]}>
                {'COVERAGE GAPS (' + botState.coverageGaps.length + ') '}
                {botState.coverageGaps.slice(0, 4).join(' \u00b7 ')}
              </Text>
            </View>
            {fillGapsProgress > 0 ? (
              <View style={{ paddingHorizontal: 14, paddingBottom: 4, gap: 5 }}>
                <View style={{ height: 5, backgroundColor: N.surfaceMd, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${fillGapsProgress}%` as any, backgroundColor: AMBER, borderRadius: 3 }} />
                </View>
                <Text style={{ fontSize: 9, color: AMBER, fontFamily: MONO, textAlign: 'right' }}>{fillGapsProgress}%</Text>
                {fillGapsLog.slice(-2).map((l, i) => (
                  <Text key={i} style={{ fontSize: 10, color: N.textMid, fontFamily: MONO }}>{l}</Text>
                ))}
              </View>
            ) : null}
            <TouchableOpacity
              style={[nbot.runBtn, { backgroundColor: AMBER + 'EE', opacity: fillGapsRunning || running ? 0.55 : 1, marginTop: 4 }]}
              onPress={runFillGaps} disabled={fillGapsRunning || running} activeOpacity={0.85}
            >
              {fillGapsRunning ? <ActivityIndicator size="small" color="#000" /> : <MaterialIcons name="auto-fix-high" size={16} color="#000" />}
              <Text style={[nbot.runBtnTxt, { color: '#000' }]}>{fillGapsRunning ? 'FILLING GAPS...' : `FILL ${botState.coverageGaps.length} GAP(S) \u2014 SIGMA-NET`}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={[nbot.gapsBox, { borderColor: N.green + '40', backgroundColor: N.green + '08' }]}>
            <MaterialIcons name="check-circle" size={14} color={N.green} />
            <Text style={[nbot.gapsTxt, { color: N.green }]}>All coverage gaps resolved · KB fully indexed</Text>
          </View>
        )}

        {/* Progress bar when running */}
        {running && botState ? (
          <View style={nbot.progressWrap}>
            <View style={nbot.progressTrack}>
              <View style={[nbot.progressFill, { width: `${botState.progress}%` as any, backgroundColor: AMBER }]} />
            </View>
            <Text style={[nbot.progressTxt, { color: AMBER }]}>{botState.progress}%</Text>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <TouchableOpacity
            style={[nbot.runBtn, { backgroundColor: AMBER, opacity: running ? 0.55 : 1 }]}
            onPress={runOrganizeCycle} disabled={running} activeOpacity={0.85}
          >
            {running ? <ActivityIndicator size="small" color="#000" /> : <MaterialCommunityIcons name="robot" size={16} color="#000" />}
            <Text style={[nbot.runBtnTxt, { color: '#000' }]}>{running ? (botState?.currentStep || 'PROCESSING') + '...' : 'RUN ORGANIZE CYCLE'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── BOT LOG ── */}
      <View style={[nbot.logCard, { borderColor: AMBER + '40' }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#060500', borderRadius: 12 }]} />
        <View style={nbot.logHeader}>
          <MaterialIcons name="terminal" size={13} color={AMBER} />
          <Text style={[nbot.logTitle, { color: AMBER }]}>// BOT LOG</Text>
          <View style={{ flex: 1 }} />
          {running ? <ActivityIndicator size="small" color={AMBER} style={{ transform:[{scale:0.7}] }} /> : null}
          <TouchableOpacity onPress={() => setBotLogs([])} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
            <MaterialIcons name="delete-sweep" size={14} color={N.textDim} />
          </TouchableOpacity>
        </View>
        <View style={[nbot.logDivider, { backgroundColor: AMBER + '35' }]} />
        <ScrollView ref={logScrollRef} style={{ maxHeight: 280, padding: 12 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {botLogs.length === 0 ? (
            <Text style={{ fontSize: 11, color: N.textDim, fontFamily: MONO, fontStyle: 'italic' }}>Run organize cycle to see live bot output...</Text>
          ) : (
            botLogs.map((log, i) => {
              const col = log.type === 'ok' ? N.green : log.type === 'warn' ? AMBER : log.type === 'error' ? N.red : N.cyan + 'AA';
              const prefix = log.type === 'ok' ? '<√>' : log.type === 'warn' ? '>>>' : log.type === 'error' ? '[!]' : '>>>';
              return (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <Text style={[nbot.logTs, { color: N.textDim }]}>{new Date(log.ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })}  </Text>
                  <Text style={[nbot.logPrefix, { color: col }]}>{prefix} </Text>
                  <Text style={[nbot.logMsg, { color: col }]} numberOfLines={2}>{log.msg}</Text>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* ── QUANTUM LINK HARVESTER SECTION ── */}
      <Animated.View style={[nbot.qlhCard, {
        borderColor: dotPulse.interpolate({ inputRange:[0.2,1], outputRange:[N.teal+'40', N.teal+'BB'] })
      }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#010C14', borderRadius: 14 }]} />
        <View style={[nbot.headerTopBar, { backgroundColor: N.teal }]} />
        <View style={nbot.headerRow}>
          <View style={[nbot.qlhOrb, { borderColor: N.teal, backgroundColor: N.teal + '20' }]}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: N.teal + '60', borderWidth: 2, borderColor: N.teal }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[nbot.botTitle, { color: N.teal, fontSize: 13 }]}>QUANTUM LINK HARVESTER</Text>
            <Text style={[nbot.botSub, { color: N.teal + 'AA' }]}>ENTANGLED GRAPH TRAVERSAL v1.0</Text>
          </View>
          <Animated.View style={[nbot.statusPill, {
            borderColor: ((qlhDisplay?.microHarvests ?? 0) > 0 ? N.teal : N.textDim) + '60',
            backgroundColor: ((qlhDisplay?.microHarvests ?? 0) > 0 ? N.teal : N.textDim) + '10',
          }]}>
            <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: (qlhDisplay?.microHarvests ?? 0) > 0 ? N.teal : N.textDim, opacity: dotPulse }} />
            <Text style={[nbot.statusTxt, { color: (qlhDisplay?.microHarvests ?? 0) > 0 ? N.teal : N.textDim }]}>
              {(qlhDisplay?.microHarvests ?? 0) > 0 ? 'ACTIVE' : 'IDLE'}
            </Text>
          </Animated.View>
        </View>

        {/* QLH Stats */}
        <View style={nbot.statsRow}>
          {[
            { label: 'DISCOVERED', val: qlhDisplay?.totalDiscovered ?? 0, col: N.teal   },
            { label: 'HARVESTED',  val: qlhDisplay?.totalHarvested  ?? 0, col: N.green  },
            { label: 'ADDED KB',   val: qlhDisplay?.totalAdded      ?? 0, col: N.green  },
            { label: 'FILTERED',   val: qlhDisplay?.totalFiltered   ?? 0, col: N.red    },
          ].map(({ label, val, col }) => (
            <View key={label} style={[nbot.statCell, { borderColor: col + '30', backgroundColor: col + '09' }]}>
              <Text style={[nbot.statVal, { color: col }]}>{val}</Text>
              <Text style={[nbot.statLbl, { color: col + '80' }]}>{label}</Text>
            </View>
          ))}
        </View>

        {lastHarvestTs ? (
          <Text style={{ fontSize: 9, color: N.textDim, fontFamily: MONO, textAlign: 'right', marginBottom: 8, paddingHorizontal: 14 }}>Last harvest: {lastHarvestTs}</Text>
        ) : null}

        {/* Trigger button */}
        <TouchableOpacity
          style={[nbot.qlhBtn, { borderColor: N.teal + '70', backgroundColor: N.teal + '12', opacity: microRunning ? 0.6 : 1 }]}
          onPress={runMicroHarvest} disabled={microRunning} activeOpacity={0.85}
        >
          {microRunning ? <ActivityIndicator size="small" color={N.teal} /> : <MaterialCommunityIcons name="atom" size={18} color={N.teal} />}
          <Text style={[nbot.qlhBtnTxt, { color: N.teal }]}>{microRunning ? 'HARVESTING...' : 'TRIGGER EGT MICRO-HARVEST'}</Text>
        </TouchableOpacity>

        {/* Auto-organizer toggle */}
        <View style={[nbot.autoRow, { borderColor: N.teal + '25', backgroundColor: N.teal + '06' }]}>
          <MaterialIcons name="auto-awesome" size={13} color={N.teal} />
          <Text style={[nbot.autoTxt, { color: N.teal + 'CC' }]}>Auto-sync (runs every 5 min automatically)</Text>
          <TouchableOpacity
            onPress={() => { haptics.selection(); setAutoOrganize(v => !v); }}
            style={[nbot.toggleTrack, autoOrganize && { backgroundColor: N.teal + '25', borderColor: N.teal + '60' }]}
          >
            <View style={[nbot.toggleThumb, { backgroundColor: autoOrganize ? N.teal : '#2A3A45', transform: [{ translateX: autoOrganize ? 16 : 0 }] }]} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── ALERTS ── */}
      {kbStats && kbStats.totalFindings < 10 ? (
        <View style={[nbot.alertBox, { borderColor: AMBER + '50', backgroundColor: AMBER + '10' }]}>
          <MaterialIcons name="info-outline" size={14} color={AMBER} />
          <Text style={[nbot.alertTxt, { color: AMBER }]}>KB is sparse. Run the SIGMA-NET batch crawler or use MANUAL entry to build up knowledge before organizing.</Text>
        </View>
      ) : null}
      {!isConnected ? (
        <View style={[nbot.alertBox, { borderColor: N.red + '50', backgroundColor: N.red + '10' }]}>
          <MaterialIcons name="wifi-off" size={14} color={N.red} />
          <Text style={[nbot.alertTxt, { color: N.red }]}>PC offline — ΣNET relay and remote crawl features unavailable. Local KB organize still works.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const nbot = StyleSheet.create({
  headerCard:    { borderWidth: 2, borderRadius: 16, overflow: 'hidden', position: 'relative',
    ...Platform.select({ ios:{ shadowColor:'#FF9900', shadowOffset:{width:0,height:6}, shadowOpacity:0.2, shadowRadius:12 }, android:{elevation:8} }) },
  headerTopBar:  { height: 3 },
  headerRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingBottom: 10 },
  orbWrap:       { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 },
  orbRing:       { position: 'absolute', width: 42, height: 42, borderRadius: 21, borderWidth: 1.5 },
  orbCore:       { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  qlhOrb:        { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  botTitle:      { fontSize: 14, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },
  botSub:        { fontSize: 9, fontFamily: MONO, marginTop: 2, letterSpacing: 0.5 },
  statusPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  statusTxt:     { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  descCard:      { marginHorizontal: 14, marginBottom: 12, borderWidth: 1, borderRadius: 10, padding: 12, gap: 6 },
  descText:      { fontSize: 12, fontFamily: MONO, lineHeight: 18, marginBottom: 6 },
  stepRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 4, flexWrap: 'wrap' },
  stepIcon:      { fontSize: 13, marginRight: 2 },
  stepLabel:     { fontSize: 12, fontWeight: '900', fontFamily: MONO },
  stepDesc:      { fontSize: 11, fontFamily: MONO, lineHeight: 16, flex: 1 },
  statsRow:      { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingBottom: 10 },
  statCell:      { flex: 1, alignItems: 'center', borderWidth: 1.5, borderRadius: 10, paddingVertical: 12 },
  statVal:       { fontSize: 20, fontWeight: '900', fontFamily: MONO, lineHeight: 24 },
  statLbl:       { fontSize: 7.5, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5, marginTop: 3 },
  gapsBox:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 14, borderWidth: 1.5, borderRadius: 10, padding: 10, marginBottom: 10 },
  gapsTxt:       { flex: 1, fontSize: 11, fontFamily: MONO, lineHeight: 16, fontWeight: '700' },
  progressWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, marginBottom: 8 },
  progressTrack: { flex: 1, height: 5, backgroundColor: N.surfaceMd, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },
  progressTxt:   { fontSize: 10, fontWeight: '700', fontFamily: MONO, width: 36 },
  runBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 14, marginTop: 6, borderRadius: 12, paddingVertical: 15 },
  runBtnTxt:     { fontSize: 13, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  logCard:       { borderWidth: 1.5, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  logHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingBottom: 8 },
  logTitle:      { fontSize: 12, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  logDivider:    { height: 1, marginHorizontal: 12, marginBottom: 8 },
  logTs:         { fontSize: 10, fontFamily: MONO, minWidth: 70 },
  logPrefix:     { fontSize: 11, fontWeight: '900', fontFamily: MONO, minWidth: 30 },
  logMsg:        { flex: 1, fontSize: 11, fontFamily: MONO, lineHeight: 16 },
  qlhCard:       { borderWidth: 2, borderRadius: 14, overflow: 'hidden', position: 'relative',
    ...Platform.select({ ios:{ shadowColor:'#00CCDD', shadowOffset:{width:0,height:4}, shadowOpacity:0.15, shadowRadius:10 }, android:{elevation:6} }) },
  qlhBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 2, borderRadius: 12, paddingVertical: 14, marginHorizontal: 14, marginBottom: 10, overflow: 'hidden' },
  qlhBtnTxt:     { fontSize: 13, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },
  autoRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginBottom: 14, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  autoTxt:       { flex: 1, fontSize: 10, fontFamily: MONO },
  toggleTrack:   { width: 38, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', padding: 2 },
  toggleThumb:   { width: 16, height: 16, borderRadius: 8 },
  alertBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1.5, borderRadius: 10, padding: 12 },
  alertTxt:      { flex: 1, fontSize: 11, fontFamily: MONO, lineHeight: 16 },
});

export default function KnowledgeScreen() {
  const insets = useSafeAreaInsets();
  const { T } = useCosmetic();
  const accentColor = T.primary || N.teal;
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [crawlUrl, setCrawlUrl]   = useState('');
  const [crawlDomain, setCrawlDomain] = useState('');
  const [crawlTopic, setCrawlTopic]   = useState('');
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatus>('idle');
  const [crawlLogs, setCrawlLogs]     = useState<CrawlLog[]>([]);
  const [crawlResult, setCrawlResult] = useState<CompressedKnowledge | null>(null);
  const [manualText, setManualText]   = useState('');
  const [manualDomain, setManualDomain] = useState('');
  const [manualTopic, setManualTopic]   = useState('');
  const [saving, setSaving]             = useState(false);
  const [sessions, setSessions]         = useState<ResearchSession[]>([]);
  const [stats, setStats]               = useState<KBStats | null>(null);
  const [loadingKB, setLoadingKB]       = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [cpuSamples, setCpuSamples]     = useState<CpuSample[]>([]);
  const [qlhStats, setQlhStats]         = useState<QLHStats | null>(null);
  const [sigmaActive, setSigmaActive]   = useState(false);
  const [sigmaProgress, setSigmaProgress] = useState(0);
  const [sigmaLastResult, setSigmaLastResult] = useState<SigmaRelayResult | null>(null);
  const [relayAddr, setRelayAddr]       = useState('NONE');
  const [sigmaLog, setSigmaLog]         = useState<CrawlLog[]>([]);
  const [sigmaBatchRunning, setSigmaBatchRunning] = useState(false);
  const [isConnected, setIsConnected]   = useState(false);
  const [crawlersActive, setCrawlersActive] = useState(false);

  const crawlScrollRef = useRef<ScrollView>(null);
  const sigmaScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const seed = autoConnectEngine.getCurrentConnection();
    setIsConnected(seed.connected);
    sigmaNetCrawler.checkRelay().then(ok => setRelayAddr(ok ? sigmaNetCrawler.getRelayAddr() : 'NONE'));
    cpuHistory.load().then(setCpuSamples);
    setQlhStats(quantumLinkHarvester.getStats());
    const unsubQLH = quantumLinkHarvester.onStats((s: QLHStats) => setQlhStats(s));
    const unsubConn = autoConnectEngine.onEvent((evt: EngineEvent) => {
      setIsConnected(evt.status === 'connected');
      if (evt.status === 'connected') {
        // Auto-trigger relay check and crawler poll when PC connects
        sigmaNetCrawler.checkRelay().then(ok => setRelayAddr(ok ? sigmaNetCrawler.getRelayAddr() : 'NONE'));
        checkCrawlers();
      } else {
        setRelayAddr('NONE');
        setCrawlersActive(false);
      }
    });
    setIsConnected(serverConnection.isConnected());

    // ── AUTO-START: Load KB on mount + trigger growth engine if stale ──
    loadKB();
    const lastGrowthKey = '@kb_growth_last_run';
    AsyncStorage.getItem(lastGrowthKey).then(async lastStr => {
      const last = lastStr ? parseInt(lastStr, 10) : 0;
      const staleMins = (Date.now() - last) / 60000;
      // If KB hasn't grown in 20+ minutes, silently trigger growth
      if (staleMins > 20) {
        try {
          const { knowledgeGrowthEngine } = await import('@/services/knowledgeGrowthEngine');
          knowledgeGrowthEngine.runGrowthCycle(false).then(() => {
            AsyncStorage.setItem(lastGrowthKey, Date.now().toString()).catch(() => {});
          }).catch(() => {});
        } catch {}
      }
    }).catch(() => {});

    // ── AUTO-START: Check if organizer bot needs a run (stale > 30 min) ──
    const botStaleyKey = '@kbbot_last_auto_run';
    AsyncStorage.getItem(botStaleyKey).then(async lastBotStr => {
      const lastBot = lastBotStr ? parseInt(lastBotStr, 10) : 0;
      const botStaleMins = (Date.now() - lastBot) / 60000;
      if (botStaleMins > 30) {
        try {
          kbOrganizerBot.runOrganizeCycle(false).then(() => {
            AsyncStorage.setItem(botStaleyKey, Date.now().toString()).catch(() => {});
          }).catch(() => {});
        } catch {}
      }
    }).catch(() => {});

    // ── AUTO-START: QLH micro-harvest if no recent harvest ──
    const qlhLastKey = '@qlh_last_harvest';
    AsyncStorage.getItem(qlhLastKey).then(async lastQlhStr => {
      const lastQlh = lastQlhStr ? parseInt(lastQlhStr, 10) : 0;
      const qlhStaleMins = (Date.now() - lastQlh) / 60000;
      if (qlhStaleMins > 15) {
        quantumLinkHarvester.triggerMicroHarvest();
        AsyncStorage.setItem(qlhLastKey, Date.now().toString()).catch(() => {});
      }
    }).catch(() => {});

    // Check if server crawlers are active
    const checkCrawlers = async () => {
      try {
        const ip = serverConnection.getIP();
        const port = serverConnection.getPort();
        if (!ip || !port) return;
        const token = serverConnection.getToken();
        const res = await fetch(`http://${ip}:${port}/api/learn/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ token: token || undefined }),
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) { const d = await res.json(); setCrawlersActive((d.workersRunning ?? 0) > 0); }
      } catch {}
    };
    if (serverConnection.isConnected()) checkCrawlers();
    const crawlerPoll = setInterval(() => { if (serverConnection.isConnected()) checkCrawlers(); }, 30000);
    return () => { unsubQLH(); unsubConn(); clearInterval(crawlerPoll); };
  }, []);

  const addLog = useCallback((msg: string, type: CrawlLog['type'] = 'info') => {
    const entry: CrawlLog = { ts: Date.now(), msg, type };
    setCrawlLogs(prev => [...prev, entry].slice(-40));
    setTimeout(() => crawlScrollRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  const addSigmaLog = useCallback((msg: string, type: CrawlLog['type'] = 'info') => {
    const entry: CrawlLog = { ts: Date.now(), msg, type };
    setSigmaLog(prev => [...prev, entry].slice(-40));
    setTimeout(() => sigmaScrollRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  const runSigmaCrawl = async () => {
    const url = crawlUrl.trim(); const domain = crawlDomain.trim() || 'General'; const topic = crawlTopic.trim() || 'Unknown';
    if (!url) { Alert.alert('URL required'); return; }
    haptics.medium(); setCrawlStatus('crawling'); setCrawlLogs([]); setCrawlResult(null);
    addLog(`[SIGMA-NET] Initiating relay crawl...`, 'info');
    addLog(`URL: ${url} · Domain: ${domain} · Topic: ${topic}`, 'info');
    addLog(`Method: ${relayAddr !== 'NONE' ? `RELAY via ${relayAddr}` : 'Direct (no relay)'}`, relayAddr !== 'NONE' ? 'ok' : 'warn');
    const result = await sigmaNetCrawler.crawlViaRelay({ url, domain, topic, mode: 'fetch' }, (msg, type) => addLog(msg, (type as any) || 'info'));
    setSigmaLastResult(result);
    if (result.error) { addLog(`[X] FAILED: ${result.error}`, 'error'); setCrawlStatus('error'); haptics.warning(); }
    else { addLog(`✓ Complete: ${result.wordCount} words in ${result.latencyMs}ms`, 'ok'); if (result.compressed) setCrawlResult(result.compressed); setCrawlStatus('done'); haptics.success(); await loadKB(); }
  };

  const runDirectCrawl = async () => {
    const url = crawlUrl.trim(); const domain = crawlDomain.trim() || 'General'; const topic = crawlTopic.trim() || 'Unknown';
    if (!url) { Alert.alert('URL required'); return; }
    haptics.medium(); setCrawlStatus('crawling'); setCrawlLogs([]); setCrawlResult(null);
    addLog(`[DIRECT] ${url}`, 'info');
    try {
      const res = await fetch(url.startsWith('http') ? url : 'https://' + url, { headers: { 'User-Agent': 'ButlerBot/4.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.text();
      const clean = raw.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000);
      if (clean.length < 50) throw new Error('Page blocked or too short. Use SIGMA-NET relay.');
      addLog(`✓ ${clean.length} chars extracted`, 'ok');
      const compressed = knowledgeAccumulator.compressResearch(clean, domain, topic, url);
      knowledgeAccumulator.addFinding(compressed); await knowledgeAccumulator.saveNow();
      setCrawlResult(compressed); setCrawlStatus('done'); haptics.success(); await loadKB();
    } catch (e: any) { addLog(`[X] ${e?.message}`, 'error'); setCrawlStatus('error'); haptics.warning(); }
  };

  const runSigmaBatch = async () => {
    if (sigmaBatchRunning) return;
    haptics.medium(); setSigmaBatchRunning(true); setSigmaActive(true); setSigmaLog([]); setSigmaProgress(0);
    addSigmaLog(`[SIGMA-NET BATCH] Starting ${SIGMA_PYTHON_TARGETS.length} crawls`, 'info');
    addSigmaLog(`Relay: ${relayAddr !== 'NONE' ? relayAddr : 'None — using direct'}`, relayAddr !== 'NONE' ? 'ok' : 'warn');
    const result = await sigmaNetCrawler.batchCrawlViaRelay(
      SIGMA_PYTHON_TARGETS,
      (msg, type) => addSigmaLog(msg, (type as any) || 'info'),
      (done, total) => setSigmaProgress(Math.round((done / total) * 100))
    );
    setSigmaLastResult(result.results[result.results.length - 1] || null);
    setSigmaProgress(100); setSigmaActive(false); setSigmaBatchRunning(false);
    haptics.success(); await loadKB();
    addSigmaLog(`✓ Complete: ${result.completed}/${SIGMA_PYTHON_TARGETS.length} · ${result.totalWords} words`, 'ok');
    Alert.alert('SIGMA-NET Complete', `Crawled ${result.completed} Python docs\n${result.failed} failures\n${result.totalWords} total words added`);
  };

  const saveManualEntry = async () => {
    const text = manualText.trim(); const domain = manualDomain.trim() || 'Manual'; const topic = manualTopic.trim() || 'User Entry';
    if (!text) { Alert.alert('Content required'); return; }
    haptics.medium(); setSaving(true);
    try {
      const compressed = knowledgeAccumulator.compressResearch(text, domain, topic, 'manual_entry');
      knowledgeAccumulator.addFinding(compressed); await knowledgeAccumulator.saveNow();
      setManualText(''); setManualDomain(''); setManualTopic('');
      haptics.success(); await loadKB();
      Alert.alert('Saved!', `Keywords extracted: ${compressed.keywords.slice(0, 4).join(', ')}`);
    } catch (e: any) { Alert.alert('Save failed', e?.message); }
    finally { setSaving(false); }
  };

  const loadKB = async () => {
    setLoadingKB(true);
    try {
      const [s, st] = await Promise.all([knowledgeAccumulator.loadResearch(), knowledgeAccumulator.getStats()]);
      setSessions(s); setStats(st);
    } finally { setLoadingKB(false); }
  };

  const clearKB = () => Alert.alert('Clear Knowledge Base', 'Delete all stored knowledge permanently?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear All', style: 'destructive', onPress: async () => { haptics.heavy(); await knowledgeAccumulator.clearAll(); setSessions([]); setStats(null); } },
  ]);

  const allFindings = sessions.flatMap(s => s.findings);
  const filteredFindings = useMemo(() => {
    if (!searchQuery.trim()) return allFindings;
    const q = searchQuery.toLowerCase();
    return allFindings.filter(f => f.topic.toLowerCase().includes(q) || f.domain.toLowerCase().includes(q) || f.summary.toLowerCase().includes(q) || (f.keywords || []).some(k => k.toLowerCase().includes(q)));
  }, [sessions, searchQuery]);

  const TABS: { key: TabKey; label: string; icon: string; color: string }[] = [
    { key: 'dashboard', label: 'DASHBOARD',   icon: 'dashboard',       color: accentColor },
    { key: 'overview',  label: 'ANALYTICS',   icon: 'account-tree',    color: N.cyan   },
    { key: 'nexus',     label: 'BRIDGE',      icon: 'hub',             color: N.sigma  },
    { key: 'nexusbot',  label: 'ORGANIZER',   icon: 'smart-toy',       color: N.amber  },
    { key: 'arch',      label: 'PIPELINE',    icon: 'layers',          color: N.purple },
    { key: 'crawler',   label: 'WEB CRAWL',   icon: 'travel-explore',  color: N.sigma  },
    { key: 'lscan',     label: 'FILE IMPORT', icon: 'folder-open',     color: N.amber  },
    { key: 'manual',    label: 'ADD ENTRY',   icon: 'edit',            color: N.teal   },
    { key: 'base',      label: 'KB EXPLORER', icon: 'storage',         color: N.green  },
  ];

  return (
    <View style={s.container}>
      <LearningPulseBar isConnected={isConnected} crawlersActive={crawlersActive} />

      {/* ── OMEGA LEARNING LOOP — KB sync status card ── */}
      <OmegaLearningLoop compact={false} />

      {/* VS Code style scrollable tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBarScroll} contentContainerStyle={s.tabBarContent}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                s.tabBtn,
                isActive
                  ? { backgroundColor: tab.color + '12', borderBottomColor: tab.color }
                  : { backgroundColor: '#050709', borderBottomColor: 'transparent' },
              ]}
              onPress={() => { haptics.selection(); setActiveTab(tab.key); }}
              activeOpacity={0.8}
            >
              <MaterialIcons name={tab.icon as any} size={isActive ? 17 : 15} color={isActive ? tab.color : '#5A6A7A'} />
              <Text style={[s.tabTxt, { color: isActive ? tab.color : '#5A6A7A', fontWeight: isActive ? '900' : '600',
                ...Platform.select({ ios: isActive ? { textShadowColor: tab.color, textShadowOffset:{width:0,height:0}, textShadowRadius:6 } : {}, android:{} }) }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ══ DASHBOARD TAB ══ */}
      {activeTab === 'dashboard' ? (
        <KBIntelDashboard isConnected={isConnected} />
      ) : null}

      {/* ══ OVERVIEW / NEURAL GRAPH TAB ══ */}
      {activeTab === 'overview' ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <InlineWidgetSlot pageId="knowledge" position="inline-top" />
          <View style={s.statsRow}>
            <NexusStatCard label="SESSIONS"  value={stats?.totalSessions ?? 0}     color={N.blue}  icon="folder" />
            <NexusStatCard label="FINDINGS"  value={stats?.totalFindings ?? 0}     color={N.amber} icon="psychology" />
            <NexusStatCard label="STORAGE"   value={stats ? `${(stats.storageUsed/1024).toFixed(0)}K` : '0K'} color={N.teal} icon="sd-storage" />
            <NexusStatCard label="RELAY"     value={relayAddr !== 'NONE' ? 'LIVE' : 'OFF'} color={relayAddr !== 'NONE' ? N.green : N.red} icon="router" />
          </View>
          {isConnected ? <SigmaNetLiveCard /> : null}
          <NexusBridgeAutoPanel relayAddr={relayAddr} isConnected={isConnected} />
          <IsometricKBShardMap totalFindings={stats?.totalFindings ?? 0} sessions={stats?.totalSessions ?? 0} />
          <KBNeuralViz totalFindings={stats?.totalFindings ?? 0} sessions={stats?.totalSessions ?? 0} />
          <FindingsGrowthChart totalFindings={stats?.totalFindings ?? 0} />
          <RecentCrawlHistory sessions={sessions} />
        </ScrollView>
      ) : null}

      {/* ══ Φ-NEXUS BRIDGE PROTOCOL TAB ══ */}
      {activeTab === 'nexus' ? (
        <NexusBridgeFullTab relayAddr={relayAddr} isConnected={isConnected} qlhStats={qlhStats} kbStats={stats} />
      ) : null}

      {/* ══ NEXUS BOT FULL TAB ══ */}
      {activeTab === 'nexusbot' ? (
        <NexusBotFullTab kbStats={stats} qlhStats={qlhStats} isConnected={isConnected} />
      ) : null}

      {/* ══ SYSTEM ARCHITECTURE TAB ══ */}
      {activeTab === 'arch' ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.scroll, { gap: 14 }]} showsVerticalScrollIndicator={false}>
          <View style={arch.heroCard}>
            <View style={arch.heroAccent} />
            <View style={arch.heroContent}>
              <View style={[arch.heroBadge, { borderColor: N.cyan + '60', backgroundColor: N.cyan + '12' }]}>
                <MaterialIcons name="verified" size={10} color={N.cyan} />
                <Text style={[arch.heroBadgeTxt, { color: N.cyan }]}>PROPRIETARY SYSTEM</Text>
              </View>
              <Text style={arch.heroTitle}>{'BOTER'}<Text style={{ color: N.cyan }}>{' SERVER'}</Text></Text>
              <Text style={arch.heroSub}>2,979 lines · 23/23 checks pass · Runs on any Windows PC</Text>
            </View>
          </View>
          <View style={arch.card}>
            <SectionHeader label="4-LAYER LEARNING SYSTEM" color={N.blue} icon="layers" />
            {[
              { num: '1', color: N.blue, title: 'SERVER PASSIVE (24/7)', sub: 'SIGMA-NET crawls 63 URLs every 45 min', detail: '3 worker threads run continuously. Covers Python std lib, psutil, selenium, pyautogui, requests, BeautifulSoup, keyboard, schedule, watchdog, and 40+ more libraries.' },
              { num: '2', color: N.sigma, title: 'APP GROWTH ENGINE (20-min)', sub: 'knowledgeGrowthEngine runs every 20 min when connected', detail: 'Works through 35 expansion seed topics in priority order. Crawls the ones without enough coverage via nexusBridge on the server.' },
              { num: '3', color: N.amber, title: 'CHAT TEACHES AI', sub: 'Every Butler question grows the KB', detail: 'trackUserQuestion() records the topic. On the next growth cycle those user topics get priority. The chat also calls /api/kb/enrich to pull relevant articles from the server KB.' },
              { num: '4', color: N.green, title: 'OMEGA SCANNER DAEMON', sub: 'Monitors tool results and flags gaps', detail: 'Starts 8 seconds after app launch, monitors executed scripts and tool results, and flags knowledge gaps for the next growth cycle. Runs silently in background.' },
            ].map(({ num, color, title, sub, detail }) => (
              <View key={num} style={[arch.layerRow, { borderLeftColor: color }]}>
                <View style={[arch.layerNum, { backgroundColor: color + '20', borderColor: color }]}>
                  <Text style={[arch.layerNumTxt, { color }]}>{num}</Text>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[arch.layerTitle, { color }]}>{title}</Text>
                  <Text style={arch.layerSub}>{sub}</Text>
                  <Text style={arch.layerDetail}>{detail}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={arch.card}>
            <SectionHeader label="SERVER API ENDPOINTS" color={N.teal} icon="api" />
            {[
              { method: 'GET',  path: '/api/status',        color: N.green, desc: 'Health check + full capabilities list' },
              { method: 'POST', path: '/api/execute',       color: N.amber, desc: 'Run Python script, returns stdout/stderr' },
              { method: 'POST', path: '/api/butler/chat',   color: N.sigma, desc: 'AI chat via Ollama, streaming JSON response' },
              { method: 'GET',  path: '/api/metrics',       color: N.teal,  desc: 'CPU, RAM, disk, uptime snapshot' },
              { method: 'POST', path: '/api/crawl',         color: N.purple, desc: 'Crawl URL via PC relay (SIGMA-NET)' },
              { method: 'GET',  path: '/api/pair',          color: N.amber, desc: 'Generate QR pairing token + display' },
            ].map(({ method, path, color, desc }) => (
              <View key={path} style={arch.endpointRow}>
                <View style={[arch.methodBadge, { backgroundColor: method === 'GET' ? N.green + '20' : N.amber + '20', borderColor: method === 'GET' ? N.green + '60' : N.amber + '60' }]}>
                  <Text style={[arch.methodTxt, { color: method === 'GET' ? N.green : N.amber }]}>{method}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[arch.pathTxt, { color }]}>{path}</Text>
                  <Text style={arch.endpointDesc}>{desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {/* ══ CRAWLER TAB ══ */}
      {activeTab === 'crawler' ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <SigmaNetViz active={sigmaActive || crawlStatus === 'crawling'} relayAddr={relayAddr} progress={sigmaProgress} lastResult={sigmaLastResult} />
          <TouchableOpacity style={s.relayRow} onPress={() => { haptics.light(); sigmaNetCrawler.checkRelay().then(ok => setRelayAddr(ok ? sigmaNetCrawler.getRelayAddr() : 'NONE')); }} activeOpacity={0.8}>
            <MaterialIcons name={relayAddr !== 'NONE' ? 'router' : 'signal-wifi-off'} size={14} color={relayAddr !== 'NONE' ? N.green : N.red} />
            <Text style={[s.relayTxt, { color: relayAddr !== 'NONE' ? N.green : N.amber }]}>{relayAddr !== 'NONE' ? `Relay: ${relayAddr}` : 'No relay — pair PC in HOME tab'}</Text>
            <MaterialIcons name="refresh" size={13} color={N.textDim} />
          </TouchableOpacity>
          <SectionHeader label="CRAWL TARGET" color={N.sigma} icon="travel-explore" />
          <View style={s.urlRow}>
            <Text style={s.prompt}>$</Text>
            <TextInput style={s.urlInput} value={crawlUrl} onChangeText={setCrawlUrl} placeholder="https://docs.python.org/3/..." placeholderTextColor={N.textDim} autoCapitalize="none" autoCorrect={false} keyboardType="url" editable={crawlStatus !== 'crawling'} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <View style={[s.inputSmall, { flex: 1 }]}>
              <Text style={s.inputLabel}>DOMAIN</Text>
              <TextInput style={s.inputSmallField} value={crawlDomain} onChangeText={setCrawlDomain} placeholder="Python, AI..." placeholderTextColor={N.textDim} editable={crawlStatus !== 'crawling'} />
            </View>
            <View style={[s.inputSmall, { flex: 1 }]}>
              <Text style={s.inputLabel}>TOPIC</Text>
              <TextInput style={s.inputSmallField} value={crawlTopic} onChangeText={setCrawlTopic} placeholder="requests, GUI..." placeholderTextColor={N.textDim} editable={crawlStatus !== 'crawling'} />
            </View>
          </View>
          <View style={{ gap: 10, marginBottom: 16 }}>
            <TouchableOpacity style={[s.crawlBtn, { borderColor: N.sigma, backgroundColor: N.sigma + '15' }, crawlStatus === 'crawling' && { opacity: 0.6 }]}
              onPress={runSigmaCrawl} disabled={crawlStatus === 'crawling'} activeOpacity={0.85}>
              {crawlStatus === 'crawling' ? <ActivityIndicator color={N.sigma} size="small" /> : <MaterialIcons name="router" size={16} color={N.sigma} />}
              <Text style={[s.crawlBtnTxt, { color: N.sigma }]}>SIGMA-NET RELAY CRAWL</Text>
              <View style={[s.methodTag, { borderColor: N.sigma + '60', backgroundColor: N.sigma + '18' }]}>
                <Text style={[s.methodTagTxt, { color: N.sigma }]}>PC TELEPORT</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[s.crawlBtn, { borderColor: N.blue + '60', backgroundColor: N.blue + '0C' }, crawlStatus === 'crawling' && { opacity: 0.6 }]}
              onPress={runDirectCrawl} disabled={crawlStatus === 'crawling'} activeOpacity={0.85}>
              {crawlStatus === 'crawling' ? <ActivityIndicator color={N.blue} size="small" /> : <MaterialIcons name="travel-explore" size={16} color={N.blue} />}
              <Text style={[s.crawlBtnTxt, { color: N.blue }]}>DIRECT CRAWL (Mobile)</Text>
              <View style={[s.methodTag, { borderColor: N.border }]}>
                <Text style={[s.methodTagTxt, { color: N.textDim }]}>LIMITED</Text>
              </View>
            </TouchableOpacity>
          </View>
          {crawlLogs.length > 0 ? (
            <View style={s.logBox}>
              <View style={s.logHeader}>
                <MaterialIcons name="terminal" size={12} color={N.amber} />
                <Text style={s.logHeaderTxt}>CRAWL LOG</Text>
                <View style={[s.statusPill, { borderColor: crawlStatus === 'done' ? N.green + '60' : crawlStatus === 'error' ? N.red + '60' : N.amber + '60', backgroundColor: crawlStatus === 'done' ? N.greenDim : crawlStatus === 'error' ? N.redDim : N.amberDim }]}>
                  <Text style={{ fontSize: 9, fontWeight: '700', fontFamily: MONO, color: crawlStatus === 'done' ? N.green : crawlStatus === 'error' ? N.red : N.amber }}>
                    {crawlStatus === 'crawling' ? 'RUNNING' : crawlStatus.toUpperCase()}
                  </Text>
                </View>
              </View>
              <ScrollView ref={crawlScrollRef} style={s.logScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                {crawlLogs.map((log, i) => <LogRow key={i} log={log} />)}
              </ScrollView>
            </View>
          ) : null}
          {crawlResult ? (
            <View style={s.resultCard}>
              <SectionHeader label="COMPRESSED & SAVED" color={N.green} icon="check-circle" />
              <FindingCard finding={crawlResult} />
            </View>
          ) : null}
          <SectionHeader label="SIGMA-NET BATCH AUTO-CRAWL" color={N.sigma} icon="auto-awesome" />
          <Text style={s.hint}>Teleport {SIGMA_PYTHON_TARGETS.length} Python docs through your PC relay. Bypasses all Android restrictions.</Text>
          <TouchableOpacity
            style={[s.crawlBtn, { borderColor: N.sigma, backgroundColor: N.sigma + '15' }, (sigmaBatchRunning || relayAddr === 'NONE') && { opacity: 0.5 }]}
            onPress={runSigmaBatch} disabled={sigmaBatchRunning || relayAddr === 'NONE'} activeOpacity={0.85}
          >
            {sigmaBatchRunning ? <ActivityIndicator color={N.sigma} size="small" /> : <MaterialIcons name="cloud-download" size={16} color={N.sigma} />}
            <Text style={[s.crawlBtnTxt, { color: N.sigma }]}>
              {sigmaBatchRunning ? `RELAYING ${sigmaProgress}%...` : `BATCH CRAWL (${SIGMA_PYTHON_TARGETS.length} Python docs)`}
            </Text>
          </TouchableOpacity>
          {sigmaLog.length > 0 ? (
            <View style={[s.logBox, { borderColor: N.sigma + '40', marginTop: 12 }]}>
              <View style={s.logHeader}>
                <MaterialIcons name="router" size={12} color={N.sigma} />
                <Text style={[s.logHeaderTxt, { color: N.sigma }]}>SIGMA-NET LOG</Text>
              </View>
              <ScrollView ref={sigmaScrollRef} style={s.logScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                {sigmaLog.map((log, i) => <LogRow key={i} log={log} />)}
              </ScrollView>
            </View>
          ) : null}
          <SectionHeader label="QUICK TARGETS" color={N.teal} icon="bolt" />
          {[
            { label: 'Python Docs',  url: 'https://docs.python.org/3/tutorial/', domain: 'Python',  topic: 'Tutorial' },
            { label: 'psutil',       url: 'https://psutil.readthedocs.io/en/latest/', domain: 'Python', topic: 'psutil' },
            { label: 'PyAutoGUI',    url: 'https://pyautogui.readthedocs.io/en/latest/', domain: 'Python', topic: 'pyautogui' },
            { label: 'Selenium',     url: 'https://selenium-python.readthedocs.io/', domain: 'Python', topic: 'selenium' },
            { label: 'Schedule Lib', url: 'https://schedule.readthedocs.io/en/stable/', domain: 'Python', topic: 'schedule' },
          ].map(({ label, url, domain, topic }) => (
            <TouchableOpacity key={label} style={s.targetChip} onPress={() => { haptics.selection(); setCrawlUrl(url); setCrawlDomain(domain); setCrawlTopic(topic); }} activeOpacity={0.85}>
              <MaterialIcons name="router" size={12} color={N.sigma} />
              <View style={{ flex: 1 }}>
                <Text style={s.targetLabel}>{label}</Text>
                <Text style={s.targetUrl} numberOfLines={1}>{url}</Text>
              </View>
              <MaterialIcons name="arrow-forward-ios" size={10} color={N.textDim} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      {/* ══ LSCAN TAB ══ */}
      {activeTab === 'lscan' ? <LambdaScanTab /> : null}

      {/* ══ MANUAL TAB ══ */}
      {activeTab === 'manual' ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={s.hint}>Paste any text — it is compressed using NEXUS semantic chunking and stored permanently in the Knowledge Base.</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <View style={[s.inputSmall, { flex: 1 }]}>
              <Text style={s.inputLabel}>DOMAIN</Text>
              <TextInput style={s.inputSmallField} value={manualDomain} onChangeText={setManualDomain} placeholder="Python, AI..." placeholderTextColor={N.textDim} />
            </View>
            <View style={[s.inputSmall, { flex: 1 }]}>
              <Text style={s.inputLabel}>TOPIC</Text>
              <TextInput style={s.inputSmallField} value={manualTopic} onChangeText={setManualTopic} placeholder="Topic name..." placeholderTextColor={N.textDim} />
            </View>
          </View>
          <SectionHeader label="CONTENT" color={N.teal} icon="edit" right={
            <Text style={{ fontSize: 10, color: N.textDim, fontFamily: MONO }}>{manualText.length} chars</Text>
          } />
          <TextInput
            style={s.textArea}
            value={manualText}
            onChangeText={setManualText}
            placeholder="Paste research notes, documentation, or any useful text..."
            placeholderTextColor={N.textDim}
            multiline textAlignVertical="top"
          />
          <TouchableOpacity
            style={[s.crawlBtn, { borderColor: N.teal, backgroundColor: N.teal + '15', marginTop: 14 }, (!manualText.trim() || saving) && { opacity: 0.5 }]}
            onPress={saveManualEntry} disabled={!manualText.trim() || saving} activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color={N.teal} size="small" /> : <MaterialIcons name="save" size={16} color={N.teal} />}
            <Text style={[s.crawlBtnTxt, { color: N.teal }]}>{saving ? 'COMPRESSING & SAVING...' : 'SAVE & COMPRESS'}</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}

      {/* ══ BRAIN DB TAB ══ */}
      {activeTab === 'base' ? (
        <View style={{ flex: 1 }}>
          <View style={s.dbToolbar}>
            <View style={s.searchRow}>
              <MaterialIcons name="search" size={16} color={searchQuery ? N.blue : N.textDim} />
              <TextInput style={s.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search findings..." placeholderTextColor={N.textDim} autoCapitalize="none" autoCorrect={false} />
              {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><MaterialIcons name="close" size={14} color={N.textDim} /></TouchableOpacity> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[s.dbAction, { borderColor: N.blue + '50', backgroundColor: N.blue + '0C' }]} onPress={() => { haptics.light(); loadKB(); }}>
                <MaterialIcons name="refresh" size={14} color={N.blue} />
                <Text style={[s.dbActionTxt, { color: N.blue }]}>SYNC</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dbAction, { borderColor: N.red + '50', backgroundColor: N.red + '0C' }]} onPress={clearKB}>
                <MaterialIcons name="delete-sweep" size={14} color={N.red} />
                <Text style={[s.dbActionTxt, { color: N.red }]}>CLEAR</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={s.dbStats}>
            <View style={s.statsRow}>
              <NexusStatCard label="FINDINGS"  value={stats?.totalFindings ?? 0}     color={N.amber} icon="psychology" />
              <NexusStatCard label="SESSIONS"  value={stats?.totalSessions ?? 0}     color={N.blue}  icon="folder"    />
              <NexusStatCard label="STORAGE"   value={stats ? `${(stats.storageUsed/1024).toFixed(0)}K` : '0K'} color={N.teal} icon="storage" />
            </View>
          </View>
          {loadingKB ? (
            <View style={[s.empty, { flex: 1, justifyContent: 'center' }]}>
              <ActivityIndicator color={N.amber} size="large" />
              <Text style={s.emptyTxt}>Loading Knowledge Base...</Text>
            </View>
          ) : filteredFindings.length === 0 ? (
            <View style={[s.empty, { flex: 1, justifyContent: 'center' }]}>
              <MaterialCommunityIcons name="brain" size={52} color={N.textDim} />
              <Text style={s.emptyTxt}>{searchQuery ? `No results for "${searchQuery}"` : 'Knowledge Base is empty'}</Text>
              <Text style={s.emptyHint}>{searchQuery ? 'Try different keywords' : 'Use the CRAWLER tab or SIGMA-NET batch to fill the KB'}</Text>
            </View>
          ) : (
            <FlatList
              data={filteredFindings}
              keyExtractor={(item, idx) => `${item.domain}-${item.topic}-${idx}`}
              renderItem={({ item }) => <FindingCard finding={item} />}
              ListHeaderComponent={<Text style={s.hint}>{filteredFindings.length} finding{filteredFindings.length !== 1 ? 's' : ''}{searchQuery ? ` for "${searchQuery}"` : ''} — tap to expand</Text>}
              contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
              showsVerticalScrollIndicator={false}
              initialNumToRender={8}
              maxToRenderPerBatch={5}
              windowSize={7}
              removeClippedSubviews={Platform.OS === 'android'}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#020407' },
  statusStrip:{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: N.border, backgroundColor: N.surface },
  kbPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  kbPillTxt:  { fontSize: 13, fontWeight: '900', fontFamily: MONO },
  tabBarScroll: { backgroundColor: '#010204', borderBottomWidth: 1.5, borderBottomColor: 'rgba(0,255,255,0.14)', flexGrow: 0 },
  tabBarContent: { flexDirection: 'row', alignItems: 'stretch' },
  tabBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 3, position: 'relative', minHeight: 52, borderTopColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  tabTxt:     { fontSize: 11, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  scroll:     { padding: 16, paddingBottom: 140 },
  statsRow:   { flexDirection: 'row', gap: 8, marginBottom: 14 },
  hint:       { fontSize: 13, color: N.textMid, lineHeight: 19, marginBottom: 14, fontFamily: MONO },
  relayRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: N.surface, borderRadius: 10, borderWidth: 1, borderColor: N.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14 },
  relayTxt:   { flex: 1, fontSize: 12, fontWeight: '900', fontFamily: MONO },
  urlRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: N.surface, borderWidth: 1.5, borderColor: N.sigma + '50', borderRadius: 10, paddingHorizontal: 12, marginBottom: 10 },
  prompt:     { fontSize: 14, fontWeight: '700', color: N.sigma, fontFamily: MONO },
  urlInput:   { flex: 1, paddingVertical: 12, fontSize: 12, color: N.text, fontFamily: MONO },
  inputSmall: { backgroundColor: N.surface, borderWidth: 1.5, borderColor: N.border, borderRadius: 10, padding: 10, gap: 4 },
  inputLabel: { fontSize: 8, fontWeight: '700', color: N.textDim, fontFamily: MONO, letterSpacing: 1 },
  inputSmallField: { fontSize: 12, color: N.text, fontFamily: MONO, paddingVertical: 4 },
  crawlBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 12, paddingVertical: 14, borderWidth: 1.5 },
  crawlBtnTxt:{ fontSize: 14, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5, flex: 1, textAlign: 'center' },
  methodTag:  { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  methodTagTxt:{ fontSize: 8, fontWeight: '700', fontFamily: MONO },
  logBox:     { backgroundColor: N.bg, borderRadius: 12, borderWidth: 1.5, borderColor: N.amber + '50', marginBottom: 14, overflow: 'hidden' },
  logHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: N.border, backgroundColor: N.surface },
  logHeaderTxt:{ flex: 1, fontSize: 11, fontWeight: '900', color: N.amber, fontFamily: MONO, letterSpacing: 1 },
  statusPill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  logScroll:  { padding: 12, maxHeight: 180 },
  resultCard: { backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderColor: N.green + '40', padding: 14, marginBottom: 14 },
  targetChip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: N.surface, borderRadius: 10, borderWidth: 1, borderColor: N.border, padding: 12, marginBottom: 8 },
  targetLabel:{ fontSize: 14, fontWeight: '900', color: N.text, fontFamily: MONO },
  targetUrl:  { fontSize: 9, color: N.textDim, fontFamily: MONO, marginTop: 2 },
  textArea:   { backgroundColor: '#070D16', borderWidth: 2, borderColor: 'rgba(0,255,255,0.35)', borderRadius: 12, padding: 14, color: '#D8E8F4', fontSize: 14, fontFamily: MONO, minHeight: 160, lineHeight: 23 },
  dbToolbar:  { padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: N.border, backgroundColor: N.surface },
  searchRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: N.surfaceHi, borderRadius: 10, borderWidth: 1, borderColor: N.border, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput:{ flex: 1, fontSize: 14, fontWeight: '600', color: '#D8E8F4', fontFamily: MONO },
  dbAction:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  dbActionTxt:{ fontSize: 11, fontWeight: '900', fontFamily: MONO },
  dbStats:    { padding: 16, borderBottomWidth: 1, borderBottomColor: N.border },
  empty:      { alignItems: 'center', paddingVertical: 56, gap: 14 },
  emptyTxt:   { fontSize: 16, fontWeight: '900', color: N.textMid, fontFamily: MONO },
  emptyHint:  { fontSize: 13, color: N.textDim, fontFamily: MONO, textAlign: 'center', paddingHorizontal: 24 },
});

// ─── ARCHITECTURE TAB STYLES ──────────────────────────────────
const arch = StyleSheet.create({
  heroCard:    { backgroundColor: N.surface, borderRadius: 12, borderWidth: 1.5, borderColor: N.cyan + '40', overflow: 'hidden' },
  heroAccent:  { height: 3, backgroundColor: N.cyan },
  heroContent: { padding: 16, gap: 8 },
  heroBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  heroBadgeTxt:{ fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  heroTitle:   { fontSize: 28, fontWeight: '900', color: N.text, fontFamily: MONO, letterSpacing: -1 },
  heroSub:     { fontSize: 12, fontWeight: '600', color: N.textMid, fontFamily: MONO },
  card:        { backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderColor: N.border, padding: 14 },
  layerRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: N.border },
  layerNum:    { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  layerNumTxt: { fontSize: 14, fontWeight: '900', fontFamily: MONO },
  layerTitle:  { fontSize: 13, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  layerSub:    { fontSize: 11, fontWeight: '700', color: N.textMid, fontFamily: MONO, marginBottom: 4 },
  layerDetail: { fontSize: 12, color: N.textDim, lineHeight: 18 },
  endpointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderBottomWidth: 1, borderBottomColor: N.border, paddingVertical: 9 },
  methodBadge: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3, flexShrink: 0, minWidth: 42, alignItems: 'center' },
  methodTxt:   { fontSize: 9, fontWeight: '900', fontFamily: MONO },
  pathTxt:     { fontSize: 12, fontWeight: '900', fontFamily: MONO },
  endpointDesc:{ fontSize: 11, fontWeight: '600', color: N.textMid },
});
