/**
 * HomeTerminalClock.tsx
 * ──────────────────────────────────────────────────────────────────
 * Small "command-deck" widget for the homepage. Three compact tiles:
 *   1. LIVE CLOCK + date (HH:MM:SS terminal style)
 *   2. SESSION UPTIME (since the app was opened)
 *   3. TODAY'S OPS — scripts executed today, pulled from executionHistory
 *
 * Pure visual / read-only. No network calls. Updates once per second
 * for the clock + uptime, and once on mount for the ops counter.
 */
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MONO: any = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const C = {
  bg:       '#0B0F14',
  bgDeep:   '#070A0E',
  surface:  '#10161F',
  border:   '#222B36',
  accent:   '#3b82f6',
  amber:    '#a855f7',
  green:    '#44FF88',
  textBrt:  '#E8EEF5',
  textMid:  '#8FA3B8',
  textDim:  '#4A5F75',
};

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function fmtTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtDate(d: Date) {
  const dow = ['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()];
  return `${dow} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function fmtUptime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

interface Props {
  isConnected?: boolean;
}

function HomeTerminalClockImpl({ isConnected }: Props) {
  const [now, setNow] = useState(new Date());
  const startedAt = useRef(Date.now()).current;
  const [todayOps, setTodayOps] = useState<number>(0);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Pull execution history once on mount + every 30s — counts today's scripts.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem('@execution_history_v1');
        if (!raw) { if (active) setTodayOps(0); return; }
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) { if (active) setTodayOps(0); return; }
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const startMs = startOfDay.getTime();
        const count = arr.filter((e: any) => {
          const t = typeof e?.timestamp === 'number' ? e.timestamp :
                    typeof e?.time === 'number' ? e.time :
                    typeof e?.at === 'string' ? Date.parse(e.at) :
                    0;
          return t >= startMs;
        }).length;
        if (active) setTodayOps(count);
      } catch { if (active) setTodayOps(0); }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const uptime = Math.floor((Date.now() - startedAt) / 1000);
  const linkColor = isConnected ? C.green : C.textDim;

  return (
    <View style={s.wrap}>
      {/* Header strip */}
      <View style={s.headerStrip}>
        <View style={[s.dot, { backgroundColor: C.accent }]} />
        <Text style={s.headerTxt}>COMMAND DECK · LIVE</Text>
        <View style={{ flex: 1 }} />
        <View style={[s.linkPill, { borderColor: linkColor + '60', backgroundColor: linkColor + '10' }]}>
          <Text style={[s.linkTxt, { color: linkColor }]}>
            {isConnected ? '◉ LINKED' : '○ STANDBY'}
          </Text>
        </View>
      </View>

      {/* 3-tile row */}
      <View style={s.row}>
        {/* TILE 1 — Live Clock */}
        <View style={[s.tile, { borderColor: C.accent + '40' }]}>
          <View style={s.tileLabel}>
            <MaterialIcons name="schedule" size={10} color={C.accent + 'AA'} />
            <Text style={[s.tileLabelTxt, { color: C.accent + 'AA' }]}>LOCAL TIME</Text>
          </View>
          <Text style={[s.tileValue, {
            color: C.textBrt,
            ...(Platform.OS === 'ios' ? { textShadowColor: C.accent, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 } : {}),
          }]}>{fmtTime(now)}</Text>
          <Text style={s.tileMeta}>{fmtDate(now)}</Text>
        </View>

        {/* TILE 2 — Session Uptime */}
        <View style={[s.tile, { borderColor: C.amber + '40' }]}>
          <View style={s.tileLabel}>
            <MaterialIcons name="timer" size={10} color={C.amber + 'AA'} />
            <Text style={[s.tileLabelTxt, { color: C.amber + 'AA' }]}>SESSION</Text>
          </View>
          <Text style={[s.tileValue, {
            color: C.textBrt,
            ...(Platform.OS === 'ios' ? { textShadowColor: C.amber, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 } : {}),
          }]}>{fmtUptime(uptime)}</Text>
          <Text style={s.tileMeta}>SINCE LAUNCH</Text>
        </View>

        {/* TILE 3 — Today's Operations */}
        <View style={[s.tile, { borderColor: C.green + '40' }]}>
          <View style={s.tileLabel}>
            <MaterialIcons name="bolt" size={10} color={C.green + 'AA'} />
            <Text style={[s.tileLabelTxt, { color: C.green + 'AA' }]}>OPS TODAY</Text>
          </View>
          <Text style={[s.tileValue, {
            color: C.textBrt,
            ...(Platform.OS === 'ios' ? { textShadowColor: C.green, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 } : {}),
          }]}>{todayOps.toString().padStart(3, '0')}</Text>
          <Text style={s.tileMeta}>SCRIPTS EXECUTED</Text>
        </View>
      </View>

      {/* Bottom marquee — coordinates + IP suffix vibes */}
      <View style={s.footerStrip}>
        <Text style={s.footerTxt} numberOfLines={1}>
          ┄ HOST: BUTLER_AI · TZ: {Intl.DateTimeFormat().resolvedOptions().timeZone || 'LOCAL'} · BUILD: v1.0.8 ┄
        </Text>
      </View>
    </View>
  );
}

// Memoized export — avoids re-renders when the parent (nexushome) state ticks.
const HomeTerminalClock = React.memo(HomeTerminalClockImpl);
export default HomeTerminalClock;

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.accent + '30',
    backgroundColor: C.bgDeep,
    overflow: 'hidden',
  },
  headerStrip: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6,
    borderBottomWidth: 1, borderBottomColor: C.accent + '20',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  headerTxt: {
    fontSize: 9, fontWeight: '900', fontFamily: MONO,
    letterSpacing: 1.6, color: C.accent,
  },
  linkPill: {
    borderWidth: 1, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 2,
  },
  linkTxt: { fontSize: 8.5, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },

  row: { flexDirection: 'row', padding: 10, gap: 8 },
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: C.surface,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 3,
    minHeight: 64,
  },
  tileLabel: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tileLabelTxt: { fontSize: 7.5, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.2 },
  tileValue: { fontSize: 18, fontWeight: '900', fontFamily: MONO, letterSpacing: 1, lineHeight: 22 },
  tileMeta: { fontSize: 7, fontWeight: '700', fontFamily: MONO, letterSpacing: 1, color: C.textDim },

  footerStrip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderTopWidth: 1, borderTopColor: C.accent + '15',
    backgroundColor: C.bg,
  },
  footerTxt: {
    fontSize: 8, fontFamily: MONO, fontWeight: '700', letterSpacing: 1,
    color: C.textDim, textAlign: 'center',
  },
});
