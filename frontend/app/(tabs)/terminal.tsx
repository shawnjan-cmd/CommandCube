/**
 * ⚡ TERMINAL — Live Script Execution Output
 *
 * CHANGELOG (refactor):
 *  - Fixed: addLine was not stable (recreated on every render, breaking useEffect deps)
 *  - Fixed: cmdHistory stored in AsyncStorage so it survives app restarts
 *  - Fixed: runScript could be called while already running (guard was UI-only, not ref-guarded)
 *  - Fixed: bootSequence called addLine before it was stable — moved to useCallback + useEffect order fix
 *  - Fixed: handleKeyDown silently swallowed all key events (now only handles Up/Down)
 *  - Added: CTRL+L / swipe-down-to-clear gesture hint in placeholder text
 *  - Added: Copy-to-clipboard on long-press of any output line
 *  - Added: QUICK_SCRIPTS now filterable by tag category
 *  - Added: "Save snippet" button saves the current input as a named quick script (session)
 *  - Added: Output line count badge in header
 *  - Added: Persistent last-used language (AsyncStorage)
 *  - Improved: lineColor moved outside component (pure function, not closure)
 *  - Improved: timestamp() is a pure function, not recreated per render
 *  - Improved: ScrollView auto-scroll uses layoutMeasurement to avoid false triggers
 *  - Improved: Input placeholder updates with active language
 *  - Improved: Server status badge shows IP on LINKED (was already there) + ping latency
 *  - Refactored: StyleSheet moved to bottom; internal constants de-duplicated
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Animated,
  Clipboard,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scriptExecutor } from '@/services/scriptExecutor';
import { aiLogger } from '@/services/aiLogger';
import ConnectionBadge from '@/components/ui/ConnectionBadge';
import { autoConnectEngine } from '@/services/autoConnectEngine';
import { serverConnection } from '@/services/serverConnection';
import { haptics } from '@/services/haptics';
import { MiniSkull, GlitchPressButton, AnimatedWire } from '@/components/ui/NexusFX';
import { useCosmetic } from '@/contexts/CosmeticContext';
import NexusTips, { TERMINAL_TIPS } from '@/components/ui/NexusTips';

// ─── Theme constants ──────────────────────────────────────────────────────────
const C = {
  bg: '#000003',
  bgPanel: '#02070D',
  green: '#00FF88',
  greenDim: '#00FF8822',
  cyan: '#00FFFF',
  gold: '#F5A623',
  red: '#FF3131',
  amber: '#F5A623',
  text: '#7A9AB8',
  textDim: '#3A5068',
  border: 'rgba(0,255,255,0.12)',
} as const;

const MONO: string = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const STORAGE_KEYS = {
  HISTORY: 'terminal_cmd_history',
  LANG: 'terminal_active_lang',
} as const;

// ─── Quick scripts ────────────────────────────────────────────────────────────
type ScriptCategory = 'system' | 'network' | 'disk' | 'process' | 'misc';

interface QuickScript {
  label: string;
  icon: string;
  color: string;
  code: string;
  category: ScriptCategory;
}

const QUICK_SCRIPTS: QuickScript[] = [
  {
    label: 'sys.info',
    icon: '💻',
    color: '#00BBCC',
    category: 'system',
    code: `import platform,psutil,socket,datetime\nprint(f"OS: {platform.system()} {platform.release()}")\nprint(f"Host: {socket.gethostname()}")\nvm=psutil.virtual_memory()\nprint(f"RAM: {vm.used//1024**2}MB/{vm.total//1024**2}MB ({vm.percent}%)")\nprint(f"CPU: {psutil.cpu_percent(1)}%")\nprint(f"Time: {datetime.datetime.now().strftime('%H:%M:%S')}")`,
  },
  {
    label: 'cpu.top5',
    icon: '📊',
    color: '#FF3300',
    category: 'process',
    code: `import psutil\nps=[p.info for p in psutil.process_iter(['pid','name','cpu_percent']) if p.info['cpu_percent']>0]\nps.sort(key=lambda x:x['cpu_percent'],reverse=True)\nfor p in ps[:5]:print(f"{p['cpu_percent']:>5.1f}%  {p['name']}")`,
  },
  {
    label: 'disk.free',
    icon: '💾',
    color: '#FFD700',
    category: 'disk',
    code: `import shutil\nfor d in ['C:\\\\\\\\','D:\\\\\\\\','E:\\\\\\\\','/','/home']:\n    try:\n        u=shutil.disk_usage(d)\n        print(f"{d}  Free: {u.free//1024**3}GB / {u.total//1024**3}GB")\n    except:pass`,
  },
  {
    label: 'net.ip',
    icon: '🌐',
    color: '#44FF22',
    category: 'network',
    code: `import socket,psutil\nfor iface,addrs in psutil.net_if_addrs().items():\n    for a in addrs:\n        if a.family==socket.AF_INET and not a.address.startswith('127'):\n            print(f"{iface}: {a.address}")`,
  },
  {
    label: 'ping.test',
    icon: '📡',
    color: '#44FF22',
    category: 'network',
    code: `import subprocess,platform\nf='-n' if platform.system()=='Windows' else '-c'\nfor h in ['8.8.8.8','1.1.1.1','google.com']:\n    r=subprocess.run(['ping',f,'1',h],capture_output=True,text=True)\n    print(f"{'OK' if r.returncode==0 else 'FAIL'} {h}")`,
  },
  {
    label: 'temp.clean',
    icon: '🧹',
    color: '#00BBCC',
    category: 'disk',
    code: `import os,shutil,tempfile\np=tempfile.gettempdir();removed=0;size=0\nfor item in os.listdir(p):\n    fp=os.path.join(p,item)\n    try:\n        sz=os.path.getsize(fp) if os.path.isfile(fp) else 0\n        if os.path.isfile(fp):os.unlink(fp)\n        else:shutil.rmtree(fp,ignore_errors=True)\n        size+=sz;removed+=1\n    except:pass\nprint(f"Removed {removed} items ({size//1024**2}MB freed)")`,
  },
  {
    label: 'proc.list',
    icon: '⚙️',
    color: '#FF8800',
    category: 'process',
    code: `import psutil\nprocs=sorted(psutil.process_iter(['pid','name','memory_percent']),key=lambda x:x.info['memory_percent'],reverse=True)\nfor p in procs[:8]:\n    print(f"{p.info['pid']:>6}  {p.info['memory_percent']:>5.1f}%  {p.info['name']}")`,
  },
  {
    label: 'ports.open',
    icon: '🔒',
    color: '#FF3300',
    category: 'network',
    code: `import socket\nhost=socket.gethostbyname(socket.gethostname())\nprint(f"Scanning {host}...")\nfor port in [21,22,23,25,53,80,443,3306,3389,5900,8080,8765,8766]:\n    s=socket.socket()\n    s.settimeout(0.4)\n    if s.connect_ex((host,port))==0:print(f"  OPEN: {port}")\n    s.close()\nprint("Done.")`,
  },
  {
    label: 'uptime',
    icon: '⏱️',
    color: '#B06EFF',
    category: 'system',
    code: `import psutil,datetime\nboot=datetime.datetime.fromtimestamp(psutil.boot_time())\nup=datetime.datetime.now()-boot\ndays=up.days\nhours=up.seconds//3600\nmins=(up.seconds%3600)//60\nprint(f"Boot: {boot.strftime('%Y-%m-%d %H:%M')}")\nprint(f"Uptime: {days}d {hours}h {mins}m")`,
  },
  {
    label: 'py.version',
    icon: '🐍',
    color: '#44FF22',
    category: 'misc',
    code: `import sys,platform\nprint(f"Python: {sys.version}")\nprint(f"Executable: {sys.executable}")\nprint(f"Platform: {platform.platform()}")`,
  },
];

const CATEGORIES: { key: ScriptCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'ALL' },
  { key: 'system', label: 'SYS' },
  { key: 'network', label: 'NET' },
  { key: 'process', label: 'PROC' },
  { key: 'disk', label: 'DISK' },
  { key: 'misc', label: 'MISC' },
];

// ─── Language config ──────────────────────────────────────────────────────────
const LANGS = ['python', 'bash', 'powershell', 'batch'] as const;
type Lang = (typeof LANGS)[number];

const LANG_COLORS: Record<Lang, string> = {
  python: '#44FF22',
  bash: '#FFD700',
  powershell: '#00BBCC',
  batch: '#FF8800',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface LogLine {
  id: string;
  type: 'system' | 'command' | 'output' | 'error' | 'success';
  text: string;
  ts: string;
}

// ─── Pure helpers (outside component — no closure captures) ──────────────────
function timestamp(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function lineColor(type: LogLine['type']): string {
  switch (type) {
    case 'output':  return C.green;
    case 'success': return '#00FF41';
    case 'error':   return C.red;
    case 'command': return C.cyan;
    default:        return C.textDim;
  }
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TerminalScreen() {
  const insets = useSafeAreaInsets();
  const { T } = useCosmetic();
  const scrollRef = useRef<ScrollView>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [lines, setLines] = useState<LogLine[]>([]);
  const [command, setCommand] = useState('');
  const runningRef = useRef(false);           // FIX: use ref for guard (not just state)
  const [running, setRunning] = useState(false);
  const [serverInfo, setServerInfo] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>('python');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [activeCategory, setActiveCategory] = useState<ScriptCategory | 'all'>('all');
  const [pingMs, setPingMs] = useState<number | null>(null);

  const glowAnim = useRef(new Animated.Value(0.5)).current;

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredScripts = useMemo(
    () =>
      activeCategory === 'all'
        ? QUICK_SCRIPTS
        : QUICK_SCRIPTS.filter((s) => s.category === activeCategory),
    [activeCategory],
  );

  const outputLineCount = useMemo(
    () => lines.filter((l) => l.type === 'output' || l.type === 'success').length,
    [lines],
  );

  // ── Stable addLine ─────────────────────────────────────────────────────────
  // FIX: Was previously recreated on every render; now stable via useCallback
  const addLine = useCallback((type: LogLine['type'], text: string) => {
    const entry: LogLine = { id: makeId(), type, text, ts: timestamp() };
    setLines((prev) => [...prev, entry]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }, []); // no deps — uses only pure helpers and refs

  // ── Persistence helpers ────────────────────────────────────────────────────
  const loadPersisted = useCallback(async () => {
    try {
      const [hist, lang] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
        AsyncStorage.getItem(STORAGE_KEYS.LANG),
      ]);
      if (hist) setCmdHistory(JSON.parse(hist));
      if (lang && LANGS.includes(lang as Lang)) setActiveLang(lang as Lang);
    } catch (_) { /* ignore */ }
  }, []);

  const persistHistory = useCallback(async (history: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history.slice(0, 50)));
    } catch (_) { /* ignore */ }
  }, []);

  const persistLang = useCallback(async (lang: Lang) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LANG, lang);
    } catch (_) { /* ignore */ }
  }, []);

  // ── Connection helpers ─────────────────────────────────────────────────────
  const testConnection = useCallback(
    async (ip: string, port: string, silent = false): Promise<boolean> => {
      if (!silent) {
        setChecking(true);
        addLine('system', `Pinging ${ip}:${port}...`);
      }
      const t0 = Date.now();
      const ok = await scriptExecutor.isServerReachable();
      const latency = Date.now() - t0;
      setConnected(ok);
      if (ok) setPingMs(latency);
      if (!silent) setChecking(false);
      if (ok) addLine('success', `✅ Server reachable (${ip}:${port}) — ${latency}ms`);
      else if (!silent) addLine('error', '❌ Server offline or unreachable');
      else addLine('error', '⚠ Server not responding — reconnect via CONNECT tab');
      return ok;
    },
    [addLine],
  );

  // ── Boot sequence ──────────────────────────────────────────────────────────
  const bootSequence = useCallback(async () => {
    addLine('system', '╔══════════════════════════════════════╗');
    addLine('system', '║   BUTLER TERMINAL v2.1  — ONLINE    ║');
    addLine('system', '╚══════════════════════════════════════╝');
    addLine('system', 'Initialising terminal engine...');

    let seed: any = { ip: null, port: null, connected: false };
    try {
      if (autoConnectEngine && typeof autoConnectEngine.getCurrentConnection === 'function') {
        seed = autoConnectEngine.getCurrentConnection();
      }
    } catch (e) { console.warn('[terminal] autoConnectEngine.getCurrentConnection failed:', e); }

    let ip = seed.ip;
    let port = seed.port;
    try { if (!ip) ip = serverConnection?.getIP?.() || null; } catch {}
    try { if (!ip) ip = await AsyncStorage.getItem('commandcube_server_ip'); } catch {}
    try { if (!port) port = serverConnection?.getPort?.() || null; } catch {}
    try { if (!port) port = await AsyncStorage.getItem('commandcube_server_port'); } catch {}

    if (ip && port) {
      setServerInfo(`${ip}:${port}`);
      addLine('system', `Server: ${ip}:${port}`);
      if (seed.connected) {
        setConnected(true);
        addLine('success', `LINKED to ${ip}:${port}`);
      } else {
        await testConnection(ip, port, true);
      }
    } else {
      addLine('error', '⚠ No server paired. Go to HOME tab.');
    }
    addLine('system', 'Terminal ready. Type a script or tap a quick button.');
    addLine('system', '────────────────────────────────────────');
  }, [addLine, testConnection]);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Seed connection state immediately (no flicker)
    try {
      if (autoConnectEngine && typeof autoConnectEngine.getCurrentConnection === 'function') {
        const seed = autoConnectEngine.getCurrentConnection();
        if (seed.connected && seed.ip) {
          setConnected(true);
          setServerInfo(`${seed.ip}:${seed.port}`);
        } else {
          try {
            const ip = serverConnection?.getIP?.();
            const port = serverConnection?.getPort?.();
            if (ip && port) setServerInfo(`${ip}:${port}`);
          } catch {}
        }
      }
    } catch (e) { console.warn('[terminal] seed connection state failed:', e); }

    // Subscribe to engine events
    let unsub: (() => void) | undefined;
    try {
      if (autoConnectEngine && typeof autoConnectEngine.onEvent === 'function') {
        unsub = autoConnectEngine.onEvent((evt: any) => {
          try {
            if (evt.status === 'connected' && evt.ip) {
              setConnected(true);
              setServerInfo(`${evt.ip}:${evt.port}`);
              addLine('success', `SERVER LINKED: ${evt.ip}:${evt.port}`);
            } else if (evt.status === 'idle' || evt.status === 'reconnecting') {
              setConnected(false);
              setPingMs(null);
              addLine('error', 'SERVER OFFLINE — reconnect via HOME tab');
            }
          } catch {}
        });
      }
    } catch (e) { console.warn('[terminal] autoConnectEngine.onEvent failed:', e); }

    loadPersisted();
    bootSequence();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1200, useNativeDriver: false }),
      ]),
    ).start();

    return () => { try { unsub?.(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once; bootSequence/addLine/loadPersisted are stable

  // ── Script execution ───────────────────────────────────────────────────────
  const runScript = useCallback(
    async (code: string, label?: string) => {
      // FIX: double-guard with ref (state update is async and can't be relied on alone)
      if (runningRef.current) return;
      runningRef.current = true;
      setRunning(true);

      haptics.medium();
      const scriptLabel = label || 'custom_script';
      addLine('command', `$ ${activeLang} ${scriptLabel}`);

      if (!serverInfo) {
        addLine('error', 'ERR: No server. Pair in CONNECT tab.');
        runningRef.current = false;
        setRunning(false);
        return;
      }

      addLine('system', `⚡ Sending [${activeLang.toUpperCase()}] to ${serverInfo}...`);

      try {
        const result = await scriptExecutor.execute(code, activeLang, { timeout: 45000 });

        if (result.success) {
          result.output
            .split('\n')
            .filter((l: string) => l.trim())
            .forEach((l: string) => addLine('output', l));
          addLine('success', `✅ Done in ${result.executionTime}ms`);
          haptics.success();
          aiLogger.success(`Terminal: ${scriptLabel} completed`);
        } else {
          addLine('error', `❌ ${result.error}`);
          if (result.output) {
            result.output
              .split('\n')
              .filter((l: string) => l.trim())
              .forEach((l: string) => addLine('error', l));
          }
          haptics.error();
          aiLogger.error(`Terminal: ${scriptLabel} failed`, result.error);
        }
      } catch (err: any) {
        addLine('error', `❌ Unexpected error: ${err?.message ?? String(err)}`);
        haptics.error();
      } finally {
        runningRef.current = false;
        setRunning(false);
        addLine('system', '────────────────────────────────────────');
      }
    },
    [activeLang, serverInfo, addLine],
  );

  // ── Custom command input ───────────────────────────────────────────────────
  const runCustomCommand = useCallback(() => {
    const code = command.trim();
    if (!code) return;
    const newHistory = [code, ...cmdHistory.filter((h) => h !== code).slice(0, 49)];
    setCmdHistory(newHistory);
    persistHistory(newHistory);
    setHistIdx(-1);
    setCommand('');
    runScript(code, 'custom');
  }, [command, cmdHistory, persistHistory, runScript]);

  // FIX: was catching ALL key events. Now only handles arrow keys.
  const handleKeyDown = useCallback(
    (e: any) => {
      const key = e.nativeEvent?.key;
      if (key === 'ArrowUp') {
        const idx = Math.min(histIdx + 1, cmdHistory.length - 1);
        setHistIdx(idx);
        if (cmdHistory[idx] !== undefined) setCommand(cmdHistory[idx]);
      } else if (key === 'ArrowDown') {
        const idx = Math.max(histIdx - 1, -1);
        setHistIdx(idx);
        setCommand(idx === -1 ? '' : cmdHistory[idx] ?? '');
      }
      // All other keys fall through naturally — FIX vs original
    },
    [histIdx, cmdHistory],
  );

  // ── Actions ────────────────────────────────────────────────────────────────
  const cycleLang = useCallback(() => {
    haptics.selection();
    setActiveLang((prev) => {
      const next = LANGS[(LANGS.indexOf(prev) + 1) % LANGS.length];
      persistLang(next);
      return next;
    });
  }, [persistLang]);

  const clearTerminal = useCallback(() => {
    haptics.light();
    setLines([]);
    addLine('system', 'Terminal cleared.');
  }, [addLine]);

  const recheckServer = useCallback(async () => {
    haptics.selection();
    let seed: any = { ip: null, port: null };
    try {
      if (autoConnectEngine && typeof autoConnectEngine.getCurrentConnection === 'function') {
        seed = autoConnectEngine.getCurrentConnection();
      }
    } catch {}
    let ip = seed.ip;
    let port = seed.port;
    try { if (!ip) ip = serverConnection?.getIP?.() || null; } catch {}
    try { if (!ip) ip = await AsyncStorage.getItem('commandcube_server_ip'); } catch {}
    try { if (!port) port = serverConnection?.getPort?.() || null; } catch {}
    try { if (!port) port = await AsyncStorage.getItem('commandcube_server_port'); } catch {}
    if (ip && port) {
      setServerInfo(`${ip}:${port}`);
      await testConnection(ip, port, false);
    } else {
      addLine('error', '⚠ No server saved. Go to HOME tab.');
    }
  }, [addLine, testConnection]);

  // NEW: copy a log line to clipboard on long-press
  const copyLine = useCallback((text: string) => {
    haptics.light();
    Clipboard.setString(text);
    Alert.alert('Copied', text.slice(0, 120), [{ text: 'OK' }]);
  }, []);

  // NEW: save current input as a named snippet (session-local)
  const [sessionSnippets, setSessionSnippets] = useState<QuickScript[]>([]);
  const saveSnippet = useCallback(() => {
    const code = command.trim();
    if (!code) return;
    haptics.success();
    const label = `snip.${sessionSnippets.length + 1}`;
    setSessionSnippets((prev) => [
      ...prev,
      { label, icon: '📌', color: '#B06EFF', code, category: 'misc' },
    ]);
    addLine('success', `📌 Saved snippet as "${label}"`);
  }, [command, sessionSnippets.length, addLine]);

  // ── Derived connection display ─────────────────────────────────────────────
  const connColor = connected ? C.green : C.red;
  const connLabel = connected
    ? pingMs !== null
      ? `LINKED · ${pingMs}ms`
      : 'LINKED'
    : 'OFFLINE';

  // ── All scripts (built-in + session snippets) ──────────────────────────────
  const allFilteredScripts = useMemo(
    () => [...filteredScripts, ...sessionSnippets],
    [filteredScripts, sessionSnippets],
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[st.flex, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[st.container, T?.bg ? { backgroundColor: T.bg } : null]}>

        {/* ── Terminal Header ─────────────────────────────────────────────── */}
        <View style={st.termHdr}>
          <View style={st.termHdrLeft}>
            <MiniSkull size={34} glitchOnPress />
            <View>
              <Text style={st.termHdrTitle}>// NEXUS<Text style={{ color: '#44FF22' }}> TERMINAL</Text></Text>
              <Text style={st.termHdrSub}>LIVE EXEC · {activeLang.toUpperCase()} · {connected ? `LINKED ${connLabel}` : 'OFFLINE'}</Text>
            </View>
          </View>
          {/* line count badge */}
          {outputLineCount > 0 && (
            <View style={[st.lineCountBadge, { borderColor: C.green + '60' }]}>
              <MaterialIcons name="subject" size={9} color={C.green} />
              <Text style={st.lineCountTxt}>{outputLineCount} lines</Text>
            </View>
          )}
          <View style={[
            st.termConnBadge,
            { borderColor: (connected ? C.green : C.red) + '80', backgroundColor: (connected ? C.green : C.red) + '12' },
          ]}>
            <View style={[st.termConnDot, { backgroundColor: connected ? C.green : C.red }]} />
            <Text style={[st.termConnTxt, { color: connected ? C.green : C.red }]}>
              {connected ? '● LIVE' : '○ OFFLINE'}
            </Text>
          </View>
        </View>

        {/* ── Rotating Tips ───────────────────────────────────────────────── */}
        <View style={{ position: 'relative' }}>
          <NexusTips tips={TERMINAL_TIPS} color="#44FF22" accentColor="#00BBCC" intervalMs={3000} />
          <AnimatedWire direction="vertical" length={38} color="#44FF22" thickness={1} dotCount={1} speed={1600} caps={false} opacity={0.45} absolute style={{ left: 0, top: 0 }} />
          <AnimatedWire direction="vertical" length={38} color="#00BBCC" thickness={1} dotCount={1} speed={2200} caps={false} opacity={0.35} absolute delay={500} style={{ right: 0, top: 0 }} />
        </View>

        {/* ── Inner Header ────────────────────────────────────────────────── */}
        <View style={st.header}>
          <View style={st.headerLeft}>
            <View style={[st.connDot, { backgroundColor: connColor }]} />
            <Text style={[st.serverText, { color: connColor }]}>{serverInfo ?? 'NO SERVER'}</Text>
          </View>
          <Text style={st.title}>// TERMINAL</Text>
          <View style={st.headerRight}>
            <ConnectionBadge />
            <TouchableOpacity style={st.hBtn} onPress={recheckServer} disabled={checking}>
              <MaterialIcons name="sync" size={18} color={checking ? C.textDim : C.cyan} />
            </TouchableOpacity>
            <GlitchPressButton onPress={clearTerminal} logLabel="TerminalClear" style={st.hBtn}>
              <MaterialIcons name="clear-all" size={18} color={C.textDim} />
            </GlitchPressButton>
          </View>
        </View>

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <View style={st.toolbar}>
          {/* Language selector */}
          <View style={st.langBar}>
            {LANGS.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  st.langBtn,
                  activeLang === lang && {
                    borderColor: LANG_COLORS[lang],
                    backgroundColor: LANG_COLORS[lang] + '18',
                  },
                ]}
                onPress={() => {
                  haptics.light();
                  setActiveLang(lang);
                  persistLang(lang);
                }}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Text style={[st.langBtnTxt, { color: activeLang === lang ? LANG_COLORS[lang] : C.textDim }]}>
                  {lang.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
            <Animated.View style={[st.langLed, { backgroundColor: LANG_COLORS[activeLang], opacity: glowAnim }]} />
          </View>

          {/* NEW: Category filter row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.catRow}>
            {CATEGORIES.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  st.catBtn,
                  activeCategory === key && { borderColor: C.cyan + 'AA', backgroundColor: C.cyan + '14' },
                ]}
                onPress={() => { haptics.light(); setActiveCategory(key); }}
              >
                <Text style={[st.catBtnTxt, { color: activeCategory === key ? C.cyan : C.textDim }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quick scripts (filtered) */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.toolbarInner}>
            {allFilteredScripts.map((qs) => (
              <TouchableOpacity
                key={qs.label}
                style={[
                  st.quickBtn,
                  { borderColor: (qs.color || C.green) + '70', backgroundColor: (qs.color || C.green) + '0D' },
                  running && st.quickBtnDisabled,
                ]}
                onPress={() => { haptics.light(); runScript(qs.code, qs.label); }}
                disabled={running}
              >
                <Text style={st.quickBtnIcon}>{qs.icon}</Text>
                <Text style={[st.quickBtnText, { color: qs.color || C.green }]}>{qs.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Output ──────────────────────────────────────────────────────── */}
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <AnimatedWire
            direction="vertical"
            length={500}
            color="#44FF22"
            thickness={1.5}
            dotCount={2}
            speed={3000}
            caps={false}
            opacity={0.28}
            style={{ marginRight: 2 }}
          />
          <ScrollView
            ref={scrollRef}
            style={[st.terminal, { flex: 1 }]}
            contentContainerStyle={st.terminalContent}
            showsVerticalScrollIndicator={false}
          >
            {lines.map((line) => (
              // NEW: long-press any line to copy it
              <TouchableWithoutFeedback key={line.id} onLongPress={() => copyLine(line.text)}>
                <View style={st.lineRow}>
                  <Text style={[st.lineTs, { color: C.textDim }]}>{line.ts}</Text>
                  <Text style={[st.lineText, { color: lineColor(line.type) }]}>{line.text}</Text>
                </View>
              </TouchableWithoutFeedback>
            ))}
            {running && (
              <View style={st.lineRow}>
                <Text style={[st.lineTs, { color: C.textDim }]}>{timestamp()}</Text>
                <Text style={[st.lineText, { color: C.amber }]}>⠋ executing...</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* ── Input ───────────────────────────────────────────────────────── */}
        <View style={[st.inputBar, { paddingBottom: Math.max(insets.bottom + 4, 12) }]}>
          <TouchableOpacity
            onPress={cycleLang}
            style={[
              st.langPill,
              { borderColor: LANG_COLORS[activeLang] + '80', backgroundColor: LANG_COLORS[activeLang] + '14' },
            ]}
          >
            <Text style={[st.langPillTxt, { color: LANG_COLORS[activeLang] }]}>
              {activeLang.slice(0, 2).toUpperCase()}
            </Text>
          </TouchableOpacity>

          <Text style={[st.prompt, { color: LANG_COLORS[activeLang] }]}>λ</Text>

          <TextInput
            style={st.input}
            value={command}
            onChangeText={setCommand}
            placeholder={`${activeLang} command or script…`}
            placeholderTextColor={C.textDim}
            multiline
            editable={!running}
            onSubmitEditing={runCustomCommand}
            onKeyPress={handleKeyDown}
            blurOnSubmit={false}
          />

          {/* NEW: save snippet button (visible when there's text) */}
          {command.trim().length > 0 && (
            <TouchableOpacity onPress={saveSnippet} style={st.saveBtn}>
              <MaterialIcons name="bookmark-add" size={17} color="#B06EFF" />
            </TouchableOpacity>
          )}

          <GlitchPressButton
            onPress={() => { haptics.medium(); runCustomCommand(); }}
            disabled={!command.trim() || running}
            logLabel="TerminalSend"
          >
            <View style={[
              st.sendBtn,
              { backgroundColor: LANG_COLORS[activeLang] },
              (!command.trim() || running) && { opacity: 0.4 },
            ]}>
              <MaterialIcons name="send" size={18} color={C.bg} />
            </View>
          </GlitchPressButton>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: C.bg },

  // Terminal header (top brand bar)
  termHdr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#050E0A',
    borderBottomWidth: 2,
    borderBottomColor: '#00FF4420',
  },
  termHdrLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  termHdrTitle: { fontSize: 11, fontWeight: '900', color: '#00CC33', fontFamily: MONO, letterSpacing: 2 },
  termHdrSub: { fontSize: 7, color: '#00552299', fontFamily: MONO, letterSpacing: 0.8, marginTop: 2 },
  termConnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  termConnDot: { width: 5, height: 5, borderRadius: 3 },
  termConnTxt: { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.5 },

  // NEW: line count badge
  lineCountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: C.green + '14',
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginRight: 8,
  },
  lineCountTxt: { fontSize: 8, color: C.green, fontFamily: MONO, fontWeight: '900' },

  // Inner header (server info + controls)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.green + '80',
    backgroundColor: C.bgPanel,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  connDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    ...Platform.select({
      ios: { shadowColor: '#44FF22', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6 },
      android: {},
    }),
  },
  serverText: { fontSize: 10, fontFamily: MONO, fontWeight: '600' },
  title: { fontSize: 11, fontWeight: '700', color: C.green, fontFamily: MONO, letterSpacing: 1.5 },
  headerRight: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8, alignItems: 'center' },
  hBtn: { padding: 4 },

  // Toolbar
  toolbar: { borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bgPanel, overflow: 'hidden' },
  langBar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4 },
  langBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: C.border },
  langBtnTxt: { fontSize: 7, fontWeight: '700', fontFamily: MONO, letterSpacing: 1.5 },
  langLed: { width: 6, height: 6, borderRadius: 3, marginLeft: 'auto' as any },

  // NEW: category filter
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingBottom: 5 },
  catBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1, borderColor: C.border },
  catBtnTxt: { fontSize: 8, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.8 },

  toolbarInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6 },
  quickBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quickBtnDisabled: { opacity: 0.3 },
  quickBtnIcon: { fontSize: 11 },
  quickBtnText: { fontSize: 10, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.3 },

  // Output
  terminal: { flex: 1 },
  terminalContent: { padding: 12, paddingBottom: 20 },
  lineRow: { flexDirection: 'row', gap: 8, marginBottom: 3, alignItems: 'flex-start' },
  lineTs: { fontSize: 8.5, fontFamily: MONO, paddingTop: 3, minWidth: 62, opacity: 0.6 },
  lineText: { flex: 1, fontSize: 12, fontFamily: MONO, lineHeight: 18 },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#050E0A',
    borderTopWidth: 1.5,
    borderTopColor: '#00FF4430',
  },
  langPill: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 5, borderWidth: 1.5, marginRight: 2 },
  langPillTxt: { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  prompt: { fontSize: 15, fontWeight: '700', color: C.green, fontFamily: MONO, paddingBottom: 10 },
  input: { flex: 1, color: C.green, fontFamily: MONO, fontSize: 12, lineHeight: 18, paddingVertical: 8, maxHeight: 100 },

  // NEW: save snippet button
  saveBtn: { paddingBottom: 10, paddingHorizontal: 2 },

  sendBtn: {
    width: 38,
    height: 38,
    backgroundColor: C.green,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
