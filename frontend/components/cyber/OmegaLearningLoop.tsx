/**
 * OmegaLearningLoop — Self-learning KB sync status widget
 * Polls /api/learn/status every 5 minutes and merges entries into local AsyncStorage.
 * Also triggers /api/kb/expand for the top user topic on each poll.
 * Auto-starts on mount. Styled to NexusMind Omega design system.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Platform, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { serverConnection } from '@/services/serverConnection';

// ── NexusMind Omega tokens ──────────────────────────────────────
const C = {
  bg:      '#07101C',
  card:    '#0C1520',
  border:  'rgba(255,106,31,0.22)',
  cyan:    '#FF6A1F',
  green:   '#00FF88',
  amber:   '#FFC400',
  red:     '#EF4444',
  violet:  '#FF6A1F',
  text:    '#9AA3B2',
  textDim: '#525A68',
};
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const OMEGA_STORAGE_KEY = '@butler_omega_knowledge';
const POLL_INTERVAL_MS  = 5 * 60 * 1000; // 5 minutes
const EXPAND_TOPICS = ['python automation', 'windows scripts', 'psutil', 'file management', 'network utilities'];

type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error' | 'no-server';

interface OmegaStats {
  topicCount: number;
  lastSynced: string | null;
  newEntries: number;
}

interface OmegaLearningLoopProps {
  /** Optional: override server IP (uses serverConnection otherwise) */
  serverIp?: string;
  /** Optional: override server port */
  serverPort?: string;
  /** Optional: auth token */
  token?: string;
  /** Compact mode — single row pill */
  compact?: boolean;
}

export function OmegaLearningLoop({
  serverIp, serverPort, token, compact = false,
}: OmegaLearningLoopProps) {
  const [status,    setStatus]    = useState<SyncStatus>('idle');
  const [stats,     setStats]     = useState<OmegaStats>({ topicCount: 0, lastSynced: null, newEntries: 0 });
  const [expanded,  setExpanded]  = useState(false);

  const pulseAnim    = useRef(new Animated.Value(0.3)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const loopRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef   = useRef(true);

  // ── Animations ──────────────────────────────────────────────────
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1,   duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.25, duration: 1800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => { mountedRef.current = false; pulse.stop(); };
  }, []);

  const animateProgress = useCallback((running: boolean) => {
    if (running) {
      progressAnim.setValue(0);
      Animated.timing(progressAnim, { toValue: 1, duration: POLL_INTERVAL_MS, useNativeDriver: false }).start();
    } else {
      Animated.timing(progressAnim, { toValue: 1, duration: 600, useNativeDriver: false }).start();
    }
  }, [progressAnim]);

  // ── Core sync function ───────────────────────────────────────────
  const fetchOmegaKnowledge = useCallback(async () => {
    const ip   = serverIp   || serverConnection.getIP()   || '';
    const port = serverPort || serverConnection.getPort() || '';
    if (!ip || !port) { if (mountedRef.current) setStatus('no-server'); return; }

    if (mountedRef.current) setStatus('syncing');

    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 8000);

      const tok = token || (serverConnection as any).getToken?.() || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tok) headers['Authorization'] = `Bearer ${tok}`;

      // ── PRIMARY: poll /api/learn/status (always available on v12+) ──
      const res = await fetch(`http://${ip}:${port}/api/learn/status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token: tok || undefined }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);

      if (!res.ok) {
        // Fallback: try GET /api/learn/status
        try {
          const res2 = await fetch(`http://${ip}:${port}/api/learn/status`, { headers, signal: AbortSignal.timeout(5000) });
          if (!res2.ok) { if (mountedRef.current) setStatus('error'); return; }
          const d2 = await res2.json();
          if (mountedRef.current) {
            setStatus('ok');
            setStats({ topicCount: d2.articlesTotal ?? 0, lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), newEntries: d2.articlesSession ?? 0 });
            animateProgress(true);
          }
          return;
        } catch { if (mountedRef.current) setStatus('error'); return; }
      }

      const data = await res.json();

      // Persist to local storage for offline display
      const existing = await AsyncStorage.getItem(OMEGA_STORAGE_KEY).catch(() => null);
      const kbMap: Record<string, any> = existing ? JSON.parse(existing) : {};
      let newCount = data.articlesSession ?? 0;

      // Store top user topics as keys for offline reference
      if (Array.isArray(data.topUserTopics)) {
        data.topUserTopics.forEach((t: any) => {
          const topic = typeof t === 'string' ? t : t?.topic;
          if (topic) kbMap[topic] = { ts: Date.now(), asks: typeof t === 'object' ? t.asks : 1 };
        });
        await AsyncStorage.setItem(OMEGA_STORAGE_KEY, JSON.stringify(kbMap)).catch(() => {});
      }

      const topicCount = data.articlesTotal ?? Object.keys(kbMap).length;

      // ── BACKGROUND: trigger /api/kb/expand for a rotating topic ──
      // This makes the server crawl related docs silently
      const expandTopic = data.topUserTopics?.[0]
        ? (typeof data.topUserTopics[0] === 'string' ? data.topUserTopics[0] : data.topUserTopics[0]?.topic)
        : EXPAND_TOPICS[Math.floor(Date.now() / POLL_INTERVAL_MS) % EXPAND_TOPICS.length];
      if (expandTopic) {
        fetch(`http://${ip}:${port}/api/kb/expand`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ topic: expandTopic, token: tok || undefined }),
        }).catch(() => {});
      }

      if (mountedRef.current) {
        setStatus('ok');
        setStats({
          topicCount,
          lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          newEntries: newCount,
        });
        animateProgress(true);
      }
    } catch (e: any) {
      if (mountedRef.current) setStatus(e?.name === 'AbortError' ? 'error' : 'error');
    }
  }, [serverIp, serverPort, token, animateProgress]);

  useEffect(() => {
    fetchOmegaKnowledge();
    loopRef.current = setInterval(fetchOmegaKnowledge, POLL_INTERVAL_MS);
    return () => { if (loopRef.current) clearInterval(loopRef.current); };
  }, [fetchOmegaKnowledge]);

  // ── Derived display ─────────────────────────────────────────────
  const statusColor = status === 'ok' ? C.green : status === 'syncing' ? C.cyan : status === 'error' ? C.red : C.textDim;
  const statusLabel = status === 'ok'
    ? `LIVE — ${stats.topicCount} ARTICLES${stats.newEntries > 0 ? ` · +${stats.newEntries} NEW` : ''}`
    : status === 'syncing'
    ? 'OMEGA LOOP SYNCING...'
    : status === 'no-server'
    ? 'PC OFFLINE — LOCAL MODE'
    : status === 'error'
    ? 'SERVER UNREACHABLE'
    : 'AWAITING FIRST SYNC';

  const progressBarColor = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [statusColor + '88', statusColor],
  });
  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // ── Compact single-line pill ─────────────────────────────────────
  if (compact) {
    return (
      <View style={[s.compactPill, { borderColor: statusColor + '40' }]}>
        <Animated.View style={{ opacity: pulseAnim }}>
          <MaterialCommunityIcons name="brain" size={12} color={statusColor} />
        </Animated.View>
        <Text style={[s.compactTxt, { color: statusColor }]} numberOfLines={1}>
          OMEGA: {statusLabel}
        </Text>
        {stats.newEntries > 0 ? (
          <View style={[s.badge, { backgroundColor: C.green + '20', borderColor: C.green + '50' }]}>
            <Text style={[s.badgeTxt, { color: C.green }]}>+{stats.newEntries}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  // ── Full card ────────────────────────────────────────────────────
  return (
    <View style={[s.card, { borderColor: statusColor + '35' }]}>
      {/* Top border accent */}
      <View style={[s.topAccent, { backgroundColor: statusColor }]} />

      {/* Header row */}
      <TouchableOpacity
        style={s.headerRow}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.8}
      >
        <Animated.View style={[s.brainWrap, { borderColor: statusColor + '50', backgroundColor: statusColor + '10' }, { opacity: pulseAnim.interpolate({ inputRange:[0.25,1], outputRange:[0.7,1] }) }]}>
          <MaterialCommunityIcons name="brain" size={16} color={statusColor} />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: statusColor }]}>Ω SELF-LEARNING ENGINE</Text>
          <Text style={[s.subtitle, { color: C.textDim }]} numberOfLines={1}>{statusLabel}</Text>
        </View>
        {stats.newEntries > 0 ? (
          <View style={[s.badge, { backgroundColor: C.green + '15', borderColor: C.green + '40' }]}>
            <Text style={[s.badgeTxt, { color: C.green }]}>+{stats.newEntries} NEW</Text>
          </View>
        ) : null}
        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={14} color={C.textDim} />
      </TouchableOpacity>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <Animated.View style={[s.progressFill, { width: progressBarWidth as any, backgroundColor: progressBarColor as any }]} />
      </View>

      {/* Expanded stats */}
      {expanded ? (
        <View style={s.statsBlock}>
          <View style={s.statRow}>
            <Text style={s.statKey}>TOTAL TOPICS</Text>
            <Text style={[s.statVal, { color: C.cyan }]}>{stats.topicCount}</Text>
          </View>
          <View style={s.statRow}>
            <Text style={s.statKey}>LAST SYNC</Text>
            <Text style={[s.statVal, { color: C.text }]}>{stats.lastSynced || '—'}</Text>
          </View>
          <View style={s.statRow}>
            <Text style={s.statKey}>POLL INTERVAL</Text>
            <Text style={[s.statVal, { color: C.text }]}>5 MIN</Text>
          </View>
          <View style={s.statRow}>
            <Text style={s.statKey}>NEW THIS SESSION</Text>
            <Text style={[s.statVal, { color: C.green }]}>{stats.newEntries > 0 ? `+${stats.newEntries}` : '—'}</Text>
          </View>
          <View style={s.statRow}>
            <Text style={s.statKey}>AUTO EXPAND</Text>
            <Text style={[s.statVal, { color: C.textDim }]} numberOfLines={1}>ENABLED · 5-MIN CYCLE</Text>
          </View>
          {/* Manual sync button */}
          <TouchableOpacity
            style={[s.syncBtn, { borderColor: statusColor + '50', backgroundColor: statusColor + '08' }]}
            onPress={fetchOmegaKnowledge}
            activeOpacity={0.8}
            disabled={status === 'syncing'}
          >
            <MaterialIcons name="sync" size={12} color={statusColor} style={status === 'syncing' ? { opacity: 0.5 } : {}} />
            <Text style={[s.syncTxt, { color: statusColor }]}>
              {status === 'syncing' ? 'SYNCING...' : 'FORCE SYNC'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  topAccent: { height: 1.5, width: '100%' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  brainWrap: {
    width: 28, height: 28,
    borderRadius: 6, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 9, fontWeight: '900',
    fontFamily: MONO, letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 8, fontFamily: MONO, letterSpacing: 0.5, marginTop: 2,
  },
  badge: {
    borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
    flexShrink: 0,
  },
  badgeTxt: {
    fontSize: 7, fontWeight: '900',
    fontFamily: MONO, letterSpacing: 0.8,
  },
  progressTrack: {
    height: 2, backgroundColor: 'rgba(255,106,31,0.10)',
    marginHorizontal: 12, borderRadius: 1, overflow: 'hidden', marginBottom: 2,
  },
  progressFill: { height: '100%', borderRadius: 1 },
  statsBlock: {
    paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4, gap: 6,
    borderTopWidth: 1, borderTopColor: 'rgba(255,106,31,0.08)', marginTop: 4,
  },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statKey: { fontSize: 8, color: C.textDim, fontFamily: MONO, letterSpacing: 0.8 },
  statVal: { fontSize: 9, fontWeight: '700', fontFamily: MONO },
  syncBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderRadius: 7,
    paddingVertical: 8, marginTop: 4,
  },
  syncTxt: { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  // Compact pill
  compactPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.bg,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  compactTxt: { fontSize: 9, fontFamily: MONO, fontWeight: '700', letterSpacing: 0.8 },
});

export default OmegaLearningLoop;
