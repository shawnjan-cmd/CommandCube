/**
 * AutomationFeed.tsx
 * ──────────────────────────────────────────────────────────────────
 * Live CRT-style "PROCESS FEED" widget for the homepage. Renders an
 * auto-scrolling terminal log of simulated automation activity to give
 * the app a sense of motion / "rig is running" presence even when the
 * user is just idling on the home screen.
 *
 * • A small pool of believable automation events (heartbeat, LAN scan,
 *   KB crawl, ollama warmup, script idle, etc.) is sampled at random
 *   every 2.2–4.5 seconds. New entries push from the bottom.
 * • Color-coded status prefix: ▸ ok (green), ⚠ warn (amber), ✗ err (red),
 *   ◆ info (cyan), ▣ exec (accent red).
 * • Timestamps are real wall-clock HH:MM:SS — gives the user the sense
 *   that real work is being scheduled.
 * • Auto-trims to the last 14 lines so the box never overflows.
 * • Pure visual — no network calls, no setState on every char.
 *
 * Drop on the homepage between any two sections. No props required.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const MONO: any = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const C = {
  bg:       '#070A0E',
  surface:  '#0E141C',
  border:   '#1A2230',
  accent:   '#FF2A1F',
  amber:    '#FF9F1F',
  green:    '#44FF88',
  cyan:     '#5BD4FF',
  textBrt:  '#E8EEF5',
  textMid:  '#8FA3B8',
  textDim:  '#4A5F75',
};

type EventKind = 'ok' | 'warn' | 'err' | 'info' | 'exec';

interface FeedEvent {
  id: string;
  ts: string;        // HH:MM:SS
  kind: EventKind;
  command: string;   // "kb.crawl"
  detail: string;    // "47 new findings · 0.8s"
}

// ── EVENT TEMPLATES ──────────────────────────────────────────────────────────
// A varied pool — never repeats two of the same in a row.
const TEMPLATES: { kind: EventKind; cmd: string; details: string[] }[] = [
  { kind: 'ok', cmd: 'heartbeat.tick', details: [
    'server alive · 12ms', 'server alive · 9ms', 'server alive · 17ms',
    'server alive · 22ms', 'server alive · 11ms',
  ]},
  { kind: 'ok', cmd: 'pc.poll', details: [
    'idle · cpu 3% · ram 41%', 'idle · cpu 5% · ram 38%', 'busy · cpu 22% · ram 47%',
    'idle · cpu 2% · ram 35%',
  ]},
  { kind: 'info', cmd: 'lan.scan', details: [
    '1 device pinged', '4 devices on subnet', '0 new hosts', '7 devices total',
    'mdns probe sent',
  ]},
  { kind: 'info', cmd: 'ollama.warmup', details: [
    'llama3:8b cached · 2.1s', 'qwen2:7b cold-loaded · 4.8s', 'model registry refreshed',
    'context window verified · 8192',
  ]},
  { kind: 'ok', cmd: 'kb.scan', details: [
    '0 new findings', '3 new findings', '11 stale entries pruned',
    'index rebuilt · 142 docs', '0 duplicates',
  ]},
  { kind: 'info', cmd: 'kb.crawl', details: [
    'docs.python.org · 12 pages', 'wiki/automation · 8 pages',
    'expo.dev/docs · 5 pages indexed', 'depth 2 · 47 links queued',
  ]},
  { kind: 'exec', cmd: 'script.runner', details: [
    'idle · pool 0/4', 'idle · pool 1/4 standby', 'queue empty',
    'awaiting commands',
  ]},
  { kind: 'info', cmd: 'butler.context', details: [
    'session pinned', 'memory: 1.2MB', '0 prompts in queue',
    'safety sandbox armed',
  ]},
  { kind: 'warn', cmd: 'beacon.timeout', details: [
    'no broadcast · retrying', 'retry 1/3', 'switching subnet',
  ]},
  { kind: 'ok', cmd: 'privacy.audit', details: [
    'cloud calls · 0', 'telemetry blocked', 'all traffic LAN-only',
    'no external hosts contacted',
  ]},
  { kind: 'info', cmd: 'cosmic.snapshot', details: [
    'theme synced', 'skin: terminal v1.0', 'preference cache hot',
  ]},
  { kind: 'ok', cmd: 'cron.tick', details: [
    'scheduler alive', 'next job in 14m', 'no overdue tasks',
  ]},
  { kind: 'exec', cmd: 'auto.heal', details: [
    'memory pool optimized', 'gc cycle · 4ms', '2 sockets recycled',
  ]},
  { kind: 'info', cmd: 'network.probe', details: [
    'latency 8ms · jitter 1ms', 'rtt 14ms · loss 0%',
    'gateway 192.168.1.1 · ok',
  ]},
];

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const fmtTime = (d: Date) =>
  `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

function pickEvent(prevId?: string): Omit<FeedEvent, 'id' | 'ts'> {
  for (let i = 0; i < 6; i++) {
    const t = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    if (t.cmd === prevId) continue;    // no immediate repeats
    return {
      kind: t.kind,
      command: t.cmd,
      detail: t.details[Math.floor(Math.random() * t.details.length)],
    };
  }
  const t = TEMPLATES[0];
  return { kind: t.kind, command: t.cmd, detail: t.details[0] };
}

const SEED: FeedEvent[] = (() => {
  // Seed with 4 events so the panel doesn't look empty on first paint.
  const now = new Date();
  return Array.from({ length: 4 }).map((_, i) => {
    const d = new Date(now.getTime() - (4 - i) * 2400);
    const e = pickEvent();
    return { id: `seed_${i}`, ts: fmtTime(d), ...e };
  });
})();

const KIND_META: Record<EventKind, { color: string; glyph: string; label: string }> = {
  ok:   { color: C.green,  glyph: '▸', label: 'OK'   },
  warn: { color: C.amber,  glyph: '⚠', label: 'WRN'  },
  err:  { color: C.accent, glyph: '✗', label: 'ERR'  },
  info: { color: C.cyan,   glyph: '◆', label: 'INF'  },
  exec: { color: C.accent, glyph: '▣', label: 'EXEC' },
};

const MAX_LINES = 14;

interface Props { isConnected?: boolean }

function AutomationFeedImpl({ isConnected }: Props) {
  const [events, setEvents] = useState<FeedEvent[]>(SEED);
  const lastCmdRef = useRef<string | undefined>(undefined);
  const counterRef = useRef(SEED.length);

  useEffect(() => {
    let cancelled = false;

    const schedule = () => {
      // Random interval 2.2s – 4.5s
      const delay = 2200 + Math.floor(Math.random() * 2300);
      const id = setTimeout(() => {
        if (cancelled) return;
        const next = pickEvent(lastCmdRef.current);
        lastCmdRef.current = next.command;
        counterRef.current += 1;
        const newEvent: FeedEvent = {
          id: `e_${counterRef.current}_${Date.now()}`,
          ts: fmtTime(new Date()),
          ...next,
        };
        setEvents(prev => {
          const next = [...prev, newEvent];
          return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
        });
        schedule();
      }, delay);
      return id;
    };

    const tid = schedule();
    return () => { cancelled = true; if (tid) clearTimeout(tid); };
  }, []);

  const linkColor = isConnected ? C.green : C.textDim;

  return (
    <View style={s.wrap}>
      {/* HEADER STRIP */}
      <View style={s.header}>
        <View style={[s.dot, { backgroundColor: C.accent,
          ...(Platform.OS === 'ios' ? { shadowColor: C.accent, shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } } : {}),
        }]} />
        <Text style={s.headerLabel}>PROCESS FEED</Text>
        <View style={s.headerSep} />
        <Text style={s.headerSub}>LIVE · STREAMING</Text>
        <View style={{ flex: 1 }} />
        <View style={[s.linkPill, { borderColor: linkColor + '60', backgroundColor: linkColor + '10' }]}>
          <MaterialIcons name={isConnected ? 'link' : 'link-off'} size={9} color={linkColor} />
          <Text style={[s.linkTxt, { color: linkColor }]}>{isConnected ? 'NODE OK' : 'STANDBY'}</Text>
        </View>
      </View>

      {/* SCAN-LINE STRIP under header */}
      <View style={s.scanStrip} />

      {/* TERMINAL LOG */}
      <View style={s.log}>
        {events.map((ev, idx) => {
          const meta = KIND_META[ev.kind];
          // Older events fade slightly
          const opacity = 0.45 + ((idx + 1) / events.length) * 0.55;
          return (
            <View key={ev.id} style={[s.row, { opacity }]}>
              <Text style={[s.glyph, { color: meta.color }]}>{meta.glyph}</Text>
              <Text style={[s.ts, { color: C.textDim }]}>{ev.ts}</Text>
              <Text style={[s.tag, { color: meta.color + 'CC', borderColor: meta.color + '50', backgroundColor: meta.color + '12' }]}>
                {meta.label}
              </Text>
              <Text style={s.cmd} numberOfLines={1}>
                {ev.command}
                <Text style={s.dim}>  →  </Text>
                <Text style={s.detail}>{ev.detail}</Text>
              </Text>
            </View>
          );
        })}
      </View>

      {/* FOOTER bar with cursor */}
      <View style={s.footer}>
        <Text style={s.footerPrompt}>{'>'}</Text>
        <View style={s.cursor} />
        <View style={{ flex: 1 }} />
        <Text style={s.footerHint}>AUTO · UPDATE 2-4s</Text>
      </View>
    </View>
  );
}

const AutomationFeed = React.memo(AutomationFeedImpl);
export default AutomationFeed;

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.accent + '30',
    backgroundColor: C.bg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    gap: 8,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.accent + '20',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  headerLabel: { fontSize: 10, fontWeight: '900', fontFamily: MONO, letterSpacing: 2, color: C.accent },
  headerSep: { width: 1, height: 10, backgroundColor: C.border },
  headerSub: { fontSize: 9, fontWeight: '700', fontFamily: MONO, letterSpacing: 1.4, color: C.textMid },
  linkPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  linkTxt: { fontSize: 8.5, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },

  scanStrip: { height: StyleSheet.hairlineWidth, backgroundColor: C.accent + '40' },

  log: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 1.5 },
  glyph: { fontSize: 11, fontFamily: MONO, fontWeight: '900', width: 12, textAlign: 'center' },
  ts: { fontSize: 9, fontFamily: MONO, fontWeight: '700', letterSpacing: 0.5, width: 54 },
  tag: {
    fontSize: 7.5, fontFamily: MONO, fontWeight: '900', letterSpacing: 0.6,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 3,
    paddingHorizontal: 4, paddingVertical: 1,
    minWidth: 26, textAlign: 'center',
  },
  cmd: {
    flex: 1, fontSize: 10.5, fontFamily: MONO, fontWeight: '700',
    color: C.textBrt, letterSpacing: 0.3,
  },
  dim: { color: C.textDim, fontWeight: '400' },
  detail: { color: C.textMid, fontWeight: '500' },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  footerPrompt: { color: C.accent, fontSize: 11, fontWeight: '900', fontFamily: MONO },
  cursor: {
    width: 7, height: 11, backgroundColor: C.accent,
    ...(Platform.OS === 'ios' ? { shadowColor: C.accent, shadowOpacity: 1, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } } : {}),
  },
  footerHint: { fontSize: 8, fontFamily: MONO, fontWeight: '700', letterSpacing: 1, color: C.textDim },
});
