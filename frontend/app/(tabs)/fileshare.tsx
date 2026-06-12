/**
 * ⚡ NEXUS TOOLS HUB — File Share + Clipboard + Quick Launch Tools v3.0
 * Full NEXUS Command Center aesthetic · Dark black · Monospace · Bold two-tone headers
 * Features: file transfer, clipboard sync, 10 quick tools, terminal cmds, network scanner
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {

  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Alert, ActivityIndicator, TextInput, Animated, Dimensions, Modal,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { serverConnection } from '@/services/serverConnection';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { haptics } from '@/services/haptics';
import { InlineWidgetSlot } from '@/components/ui/WidgetLayer';
import { autoConnectEngine, EngineEvent } from '@/services/autoConnectEngine';
import { useCosmetic } from '@/contexts/CosmeticContext';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const { width: SW } = Dimensions.get('window');

// ─── NEXUS COMMAND CENTER PALETTE ─────────────────────────────
const N = {
  bg:        '#050505',
  surface:   '#0E0F12',
  surfaceHi: '#1A1D24',
  surfaceMd: '#0E0F12',
  border:    'rgba(255,42,31,0.12)',
  borderHi:  'rgba(255,42,31,0.28)',
  text:      '#E6E9EF',
  textDim:   '#6A7384',
  textMid:   '#8C95A6',
  blue:      '#FF6A1F',
  blueDim:   '#FF6A1F25',
  green:     '#00FF88',
  greenDim:  '#00FF8825',
  purple:    '#FFC400',
  purpleDim: '#FFC40025',
  amber:     '#FFC400',
  amberBrt:  '#F7B84B',
  amberDim:  '#FFC40025',
  red:       '#FF3131',
  redDim:    '#FF313125',
  teal:      '#FF2A1F',
  tealDim:   'rgba(255,42,31,0.15)',
  cyan:      '#FF2A1F',
  yellow:    '#FFC400',
};

// ─── Types ────────────────────────────────────────────────────
interface PCFile { name: string; size: number; modified: number; type: string; }
interface TransferLog {
  id: string; direction: 'upload' | 'download'; filename: string;
  size: number; status: 'pending' | 'success' | 'error'; message: string; timestamp: number;
}
interface QuickTool {
  id: string; icon: string; iconLib: 'material' | 'community';
  name: string; desc: string; color: string; category: string; script: string;
}

// ─── Helpers ──────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fileIcon(filename: string): { name: string; color: string } {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, { name: string; color: string }> = {
    py:   { name: 'language-python', color: N.blue   },
    txt:  { name: 'file-document',   color: N.textMid },
    pdf:  { name: 'file-pdf-box',    color: N.red    },
    jpg:  { name: 'file-image',      color: N.amber  },
    png:  { name: 'file-image',      color: N.amber  },
    zip:  { name: 'zip-box',         color: N.yellow },
    exe:  { name: 'application',     color: N.red    },
    mp4:  { name: 'file-video',      color: N.purple },
    json: { name: 'code-json',       color: N.yellow },
    csv:  { name: 'file-delimited',  color: N.green  },
    sh:   { name: 'bash',            color: N.green  },
    bat:  { name: 'microsoft-windows', color: N.blue },
  };
  return map[ext] || { name: 'file-outline', color: N.textDim };
}

// ─── QUICK TOOLS ───────────────────────────────────────────────
const QUICK_TOOLS: QuickTool[] = [
  {
    id: 'perf', iconLib: 'material', icon: 'speed', name: 'PERFORMANCE', desc: 'CPU + RAM live',
    color: N.blue, category: 'SYSTEM',
    script: `import psutil\ncpu=psutil.cpu_percent(1)\nram=psutil.virtual_memory()\nprint(f"CPU: {cpu:.1f}% | RAM: {ram.percent:.1f}% ({ram.used//1024**2}MB/{ram.total//1024**2}MB) | Cores: {psutil.cpu_count()}")`,
  },
  {
    id: 'snapshot', iconLib: 'material', icon: 'bar-chart', name: 'SYS SNAPSHOT', desc: 'Full system info',
    color: N.teal, category: 'SYSTEM',
    script: `import platform,socket,psutil\nvm=psutil.virtual_memory()\ndisk=psutil.disk_usage('/')\nprint(f"Host: {socket.gethostname()} | OS: {platform.system()} {platform.release()}")\nprint(f"CPU: {psutil.cpu_percent(1)}% | RAM: {vm.percent}% | Disk: {disk.percent}%")\nprint(f"IP: {socket.gethostbyname(socket.gethostname())}")`,
  },
  {
    id: 'netmap', iconLib: 'material', icon: 'wifi-find', name: 'LAN MAP', desc: 'Network scan',
    color: N.amber, category: 'NETWORK',
    script: `import socket,subprocess,platform,concurrent.futures\ndef ping(h):\n    p='-n' if platform.system()=='Windows' else '-c'\n    return subprocess.run(['ping',p,'1','-w','400',h],capture_output=True).returncode==0\nbase='.'.join(socket.gethostbyname(socket.gethostname()).split('.')[:3])\nalive=[]\nwith concurrent.futures.ThreadPoolExecutor(max_workers=50) as ex:\n    futs={ex.submit(ping,f"{base}.{i}"):f"{base}.{i}" for i in range(1,255)}\n    for f in concurrent.futures.as_completed(futs):\n        if f.result():alive.append(futs[f]);print(f"ALIVE: {futs[f]}")\nprint(f"Found {len(alive)} devices")`,
  },
  {
    id: 'ports', iconLib: 'material', icon: 'security', name: 'PORT SCAN', desc: 'Open port audit',
    color: N.red, category: 'NETWORK',
    script: `import socket\nhost=socket.gethostbyname(socket.gethostname())\nopen_p=[]\nfor port in [21,22,23,25,53,80,110,443,445,3306,3389,5900,8080,8766]:\n    s=socket.socket();s.settimeout(0.4)\n    if s.connect_ex((host,port))==0:open_p.append(port);print(f"OPEN: {port}")\n    s.close()\nprint(f"Done — {len(open_p)} open ports")`,
  },
  {
    id: 'backup', iconLib: 'material', icon: 'backup', name: 'BACKUP DOCS', desc: 'Zip Documents',
    color: N.purple, category: 'FILES',
    script: `import shutil,os,datetime\nsrc=os.path.expanduser('~/Documents')\nout=os.path.expanduser('~/Desktop')\nstamp=datetime.datetime.now().strftime('%Y%m%d_%H%M%S')\narchive=shutil.make_archive(os.path.join(out,f'backup_{stamp}'),'zip',src)\nprint(f"Backup: {archive}")`,
  },
  {
    id: 'clean', iconLib: 'material', icon: 'cleaning-services', name: 'CACHE CLEAN', desc: 'Clear temp files',
    color: N.green, category: 'FILES',
    script: `import os,shutil,tempfile\nfreed=0;removed=0\nfor p in [tempfile.gettempdir(),os.path.expanduser('~/.cache')]:\n    if not os.path.exists(p):continue\n    for item in os.listdir(p):\n        fp=os.path.join(p,item)\n        try:\n            sz=os.path.getsize(fp) if os.path.isfile(fp) else 0\n            (os.unlink if os.path.isfile(fp) else shutil.rmtree)(fp)\n            freed+=sz;removed+=1\n        except:pass\nprint(f"Cleared {removed} items — freed {freed//1024//1024}MB")`,
  },
  {
    id: 'bench', iconLib: 'material', icon: 'flash-on', name: 'BENCHMARK', desc: 'CPU/disk speed',
    color: N.yellow, category: 'SYSTEM',
    script: `import time,hashlib,os\nprint("=== NEXUS BENCHMARK ===")\nt=time.time();[hashlib.md5(str(i).encode()).hexdigest() for i in range(100000)]\nprint(f"CPU: {time.time()-t:.3f}s (100k MD5)")\nt=time.time();data=bytearray(32*1024*1024);del data\nprint(f"MEM: {time.time()-t:.3f}s (32MB alloc)")\nt=time.time();p='/tmp/bm.tmp' if os.name!='nt' else 'C:/Temp/bm.tmp'\nwith open(p,'wb') as f:f.write(os.urandom(8*1024*1024))\nos.remove(p)\nprint(f"DISK: {time.time()-t:.3f}s (8MB write)")`,
  },
  {
    id: 'org', iconLib: 'material', icon: 'folder-special', name: 'FILE SORT', desc: 'Sort Downloads',
    color: N.amber, category: 'FILES',
    script: `import os,shutil\nfolder=os.path.expanduser('~/Downloads')\nfor f in os.listdir(folder):\n    fp=os.path.join(folder,f)\n    if os.path.isfile(fp):\n        ext=f.rsplit('.',1)[-1].lower() if '.' in f else 'misc'\n        dest=os.path.join(folder,ext.upper())\n        os.makedirs(dest,exist_ok=True)\n        shutil.move(fp,os.path.join(dest,f))\n        print(f"Moved: {f} -> {ext.upper()}/")\nprint("Downloads organized!")`,
  },
  {
    id: 'scrape', iconLib: 'community', icon: 'spider-web', name: 'WEB SCRAPER', desc: 'Fetch + parse site',
    color: N.blue, category: 'NETWORK',
    script: `import urllib.request\nfrom html.parser import HTMLParser\nclass LP(HTMLParser):\n    def __init__(self):super().__init__();self.links=[];self.title=''\n    def handle_starttag(self,t,a):\n        if t=='a':\n            for k,v in a:\n                if k=='href' and v.startswith('http'):self.links.append(v)\n    def handle_data(self,d):\n        if self.lasttag=='title':self.title=d\nurl='https://example.com'\nreq=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})\nhtml=urllib.request.urlopen(req,timeout=8).read().decode('utf-8','ignore')\np=LP();p.feed(html)\nprint(f"Title: {p.title.strip()}\\nLinks: {len(p.links)}")\nfor l in p.links[:5]:print(f"  {l}")`,
  },
  {
    id: 'processes', iconLib: 'material', icon: 'memory', name: 'TOP PROCS', desc: 'Running processes',
    color: N.teal, category: 'SYSTEM',
    script: `import psutil\nprocs=sorted(psutil.process_iter(['pid','name','cpu_percent','memory_percent']),key=lambda p:p.info['cpu_percent'],reverse=True)\nprint("PID    CPU%   MEM%   NAME")\nprint("-"*40)\nfor p in procs[:15]:\n    i=p.info\n    print(f"{i['pid']:<7}{i['cpu_percent']:<7.1f}{i['memory_percent']:<7.1f}{i['name'][:28]}")`,
  },
];

const TOOL_CATEGORIES = ['ALL', 'SYSTEM', 'NETWORK', 'FILES'];

// ─── NEXUS TWO-TONE SECTION TITLE ─────────────────────────────
function NexusTitle({ main, accent, accentColor = N.blue }: { main: string; accent: string; accentColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 }}>
      <Text style={{ fontSize: 22, fontWeight: '900', color: N.text, fontFamily: MONO }}>{main}</Text>
      <Text style={{ fontSize: 22, fontWeight: '900', color: accentColor, fontFamily: MONO }}>{accent}</Text>
    </View>
  );
}

// ─── NEXUS SECTION HEADER ──────────────────────────────────────
function SectionHeader({ label, color = N.blue, icon, right }: { label: string; color?: string; icon?: string; right?: React.ReactNode }) {
  return (
    <View style={sh.row}>
      <View style={[sh.accent, { backgroundColor: color }]} />
      {icon ? <MaterialIcons name={icon as any} size={13} color={color} /> : null}
      <Text style={[sh.label, { color }]}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: color + '20', marginLeft: 8 }} />
      {right}
    </View>
  );
}
const sh = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  accent: { width: 3, height: 16, borderRadius: 2 },
  label:  { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
});

// ─── NEXUS CONNECTION STATUS STRIP ────────────────────────────
function NexusConnStrip({ isConnected, addr }: { isConnected: boolean; addr: string }) {
  const pulse = useRef(new Animated.Value(0.5)).current;
  const col   = isConnected ? N.green : N.red;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.2, duration: 900, useNativeDriver: false }),
    ])).start();
  }, []);

  return (
    <View style={[cs.strip, { borderColor: col + '40', backgroundColor: col + '08' }]}>
      <Animated.View style={[cs.dot, { backgroundColor: col, opacity: pulse,
        ...Platform.select({ ios: { shadowColor: col, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:8 }, android:{} }),
      }]} />
      <View style={{ flex: 1 }}>
        <Text style={[cs.status, { color: col }]}>{isConnected ? 'SERVER ONLINE' : 'NO SERVER CONNECTED'}</Text>
        <Text style={cs.addr} numberOfLines={1}>{isConnected ? addr : 'Pair in HOME tab → Scan QR'}</Text>
      </View>
      {isConnected ? (
        <View style={[cs.livePill, { borderColor: N.blue + '60', backgroundColor: N.blue + '12' }]}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: N.blue }} />
          <Text style={[cs.liveTxt, { color: N.blue }]}>LIVE</Text>
        </View>
      ) : null}
    </View>
  );
}
const cs = StyleSheet.create({
  strip:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderLeftWidth: 4, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  dot:     { width: 11, height: 11, borderRadius: 6, flexShrink: 0 },
  status:  { fontSize: 14, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  addr:    { fontSize: 10, color: N.textDim, fontFamily: MONO, marginTop: 2 },
  livePill:{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  liveTxt: { fontSize: 9, fontWeight: '900', fontFamily: MONO },
});

// ─── NEXUS TOOL CARD ──────────────────────────────────────────
function NexusToolCard({ tool, running, onPress }: { tool: QuickTool; running: boolean; onPress: () => void }) {
  const col      = tool.color;
  const scale    = useRef(new Animated.Value(1)).current;
  const glow     = useRef(new Animated.Value(0.4)).current;
  const shimX    = useRef(new Animated.Value(0)).current;
  const IconComp = tool.iconLib === 'community' ? MaterialCommunityIcons : MaterialIcons;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1600, useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0.25, duration: 1600, useNativeDriver: false }),
    ])).start();
    Animated.loop(Animated.timing(shimX, { toValue: 1, duration: 3800, useNativeDriver: false })).start();
  }, []);

  const handlePress = () => {
    haptics.medium();
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.89, duration: 60, useNativeDriver: false }),
      Animated.spring(scale, { toValue: 1.04, tension: 300, friction: 7, useNativeDriver: false }),
      Animated.spring(scale, { toValue: 1, tension: 260, friction: 9, useNativeDriver: false }),
    ]).start();
    onPress();
  };

  const borderCol = glow.interpolate({ inputRange: [0.25, 1], outputRange: [col + '30', col + 'BB'] });
  const shimLeft  = shimX.interpolate({ inputRange: [0, 1], outputRange: ['-60%', '160%'] });

  return (
    <Animated.View style={{ width: (SW - 48) / 2, transform: [{ scale }] }}>
      <TouchableOpacity onPress={handlePress} disabled={running} activeOpacity={0.9} style={{ flex: 1 }}>
        <Animated.View style={[ntc.card, {
          borderColor: borderCol,
          ...Platform.select({ ios: { shadowColor: col, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:10 }, android:{ elevation:5 } }),
        }]}>
          {/* Background */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: N.surface, borderRadius: 12 }]} />
          {/* Shimmer */}
          <Animated.View pointerEvents="none" style={[ntc.shimmer, { left: shimLeft }]} />
          {/* Top accent */}
          <View style={[ntc.topBar, { backgroundColor: col }]} />
          {/* Category badge */}
          <View style={[ntc.catBadge, { borderColor: col + '50', backgroundColor: col + '12' }]}>
            <Text style={[ntc.catTxt, { color: col }]}>{tool.category}</Text>
          </View>
          {/* Icon */}
          <View style={[ntc.iconBox, { backgroundColor: col + '15', borderColor: col + '40' }]}>
            {running
              ? <ActivityIndicator size="small" color={col} />
              : <IconComp name={tool.icon as any} size={24} color={col} />
            }
          </View>
          {/* Labels */}
          <Text style={ntc.name} numberOfLines={1}>{tool.name}</Text>
          <Text style={[ntc.desc, { color: col + 'AA' }]} numberOfLines={1}>{tool.desc}</Text>
          {/* LED */}
          <Animated.View style={[ntc.led, { backgroundColor: col, opacity: glow,
            ...Platform.select({ ios: { shadowColor: col, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:6 }, android:{} }),
          }]} />
          {/* HUD corners */}
          {[{top:0,left:0,borderTopWidth:1.5,borderLeftWidth:1.5},{top:0,right:0,borderTopWidth:1.5,borderRightWidth:1.5},{bottom:0,left:0,borderBottomWidth:1.5,borderLeftWidth:1.5},{bottom:0,right:0,borderBottomWidth:1.5,borderRightWidth:1.5}].map((c,i)=>(
            <Animated.View key={i} style={[{ position:'absolute', width:9, height:9, borderColor: col + 'AA', opacity: glow }, c]} />
          ))}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const ntc = StyleSheet.create({
  card:     { borderWidth: 1.5, borderRadius: 12, overflow: 'hidden', position: 'relative', paddingBottom: 14, minHeight: 120 },
  shimmer:  { position: 'absolute', top: 0, bottom: 0, width: '35%', backgroundColor: '#FFFFFF', opacity: 0.04, transform: [{ skewX: '-18deg' }] },
  topBar:   { height: 3 },
  catBadge: { position: 'absolute', top: 10, right: 8, borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, zIndex: 5 },
  catTxt:   { fontSize: 7, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  iconBox:  { width: 46, height: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', margin: 12, marginBottom: 8 },
  name:     { fontSize: 11, fontWeight: '900', color: N.text, fontFamily: MONO, letterSpacing: 0.3, paddingHorizontal: 12 },
  desc:     { fontSize: 9, fontFamily: MONO, paddingHorizontal: 12, marginTop: 2 },
  led:      { position: 'absolute', bottom: 8, right: 8, width: 6, height: 6, borderRadius: 3 },
});

// ─── OUTPUT MODAL ─────────────────────────────────────────────
function NexusOutputModal({ visible, title, output, color, onClose }: {
  visible: boolean; title: string; output: string; color: string; onClose: () => void;
}) {
  const slideY = useRef(new Animated.Value(100)).current;
  const fadeOp = useRef(new Animated.Value(0)).current;
  const glow   = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 70, friction: 11, useNativeDriver: false }),
        Animated.timing(fadeOp, { toValue: 1, duration: 200, useNativeDriver: false }),
      ]).start();
      Animated.loop(Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1100, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0.3, duration: 1100, useNativeDriver: false }),
      ])).start();
    } else { slideY.setValue(100); fadeOp.setValue(0); }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[nom.overlay, { opacity: fadeOp }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[nom.sheet, { borderTopColor: color, transform: [{ translateY: slideY }] }]}>
          {/* Top accent */}
          <View style={[nom.topAccent, { backgroundColor: color }]} />
          {/* Header */}
          <View style={nom.header}>
            <View style={[nom.iconBox, { borderColor: color + '60', backgroundColor: color + '18' }]}>
              <MaterialIcons name="terminal" size={18} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[nom.title, { color }]} numberOfLines={1}>{title}</Text>
              <Text style={nom.sub}>EXECUTION OUTPUT // PC SERVER</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={nom.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="close" size={18} color={N.textDim} />
            </TouchableOpacity>
          </View>
          {/* Progress bar */}
          <Animated.View style={[nom.progressBar, { backgroundColor: color, opacity: glow, width: '70%' as any }]} />
          {/* Output */}
          <ScrollView style={{ maxHeight: '55%' }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
            <Text style={[nom.output, { color: color + 'CC' }]} selectable>{output || '(no output)'}</Text>
          </ScrollView>
          {/* Dismiss */}
          <TouchableOpacity onPress={onClose} style={nom.footer} activeOpacity={0.85}>
            <View style={[nom.divider, { backgroundColor: color + '30' }]} />
            <Text style={[nom.footerTxt, { color }]}>DISMISS</Text>
            <View style={[nom.divider, { backgroundColor: color + '30' }]} />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
const nom = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.90)', justifyContent: 'flex-end' },
  sheet:      { maxHeight: '78%', backgroundColor: N.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 3, overflow: 'hidden' },
  topAccent:  { height: 4 },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: N.border },
  iconBox:    { width: 44, height: 44, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title:      { fontSize: 15, fontWeight: '900', color: N.text, fontFamily: MONO },
  sub:        { fontSize: 9, color: N.textDim, fontFamily: MONO, letterSpacing: 0.8, marginTop: 2 },
  closeBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: N.surfaceHi, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  progressBar:{ height: 2, borderRadius: 1, marginHorizontal: 18, marginBottom: 4 },
  output:     { fontSize: 12, fontFamily: MONO, lineHeight: 20 },
  footer:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: N.border },
  divider:    { flex: 1, height: 1 },
  footerTxt:  { fontSize: 12, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
});

// ─── PC FILE ROW ─────────────────────────────────────────────
function PCFileRow({ file, onDownload, downloading }: { file: PCFile; onDownload: (f: PCFile) => void; downloading: boolean }) {
  const ico = fileIcon(file.name);
  return (
    <TouchableOpacity style={pfr.row} onPress={() => { haptics.light(); onDownload(file); }} activeOpacity={0.85}>
      <View style={[pfr.iconBox, { borderColor: ico.color + '50', backgroundColor: ico.color + '12' }]}>
        <MaterialCommunityIcons name={ico.name as any} size={20} color={ico.color} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={pfr.name} numberOfLines={1}>{file.name}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Text style={pfr.meta}>{formatBytes(file.size)}</Text>
          <Text style={pfr.meta}>·</Text>
          <Text style={pfr.meta}>{formatTime(file.modified)}</Text>
        </View>
      </View>
      {downloading
        ? <ActivityIndicator size="small" color={N.teal} />
        : <MaterialIcons name="file-download" size={20} color={N.teal} />
      }
    </TouchableOpacity>
  );
}
const pfr = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: N.border },
  iconBox:{ width: 42, height: 42, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  name:   { fontSize: 13, fontWeight: '700', color: N.text, fontFamily: MONO },
  meta:   { fontSize: 10, color: N.textDim, fontFamily: MONO },
});

// ─── TRANSFER LOG ROW ─────────────────────────────────────────
function LogRow({ log }: { log: TransferLog }) {
  const isUp = log.direction === 'upload';
  const col = log.status === 'success' ? N.green : log.status === 'error' ? N.red : N.amber;
  return (
    <View style={[tlr.row, { borderLeftColor: col }]}>
      <MaterialIcons name={log.status === 'success' ? 'check-circle' : log.status === 'error' ? 'error' : 'timelapse'} size={14} color={col} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <View style={[tlr.dirBadge, { borderColor: (isUp ? N.blue : N.teal) + '60', backgroundColor: (isUp ? N.blue : N.teal) + '12' }]}>
            <Text style={[tlr.dirTxt, { color: isUp ? N.blue : N.teal }]}>{isUp ? '↑ UP' : '↓ DN'}</Text>
          </View>
          <Text style={[tlr.fname, { color: col }]} numberOfLines={1}>{log.filename}</Text>
        </View>
        <Text style={tlr.msg}>{log.message} · {formatBytes(log.size)}</Text>
      </View>
      <Text style={tlr.time}>{formatTime(log.timestamp)}</Text>
    </View>
  );
}
const tlr = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: N.border, borderLeftWidth: 2.5, paddingLeft: 10 },
  dirBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  dirTxt:   { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  fname:    { flex: 1, fontSize: 11, fontWeight: '700', fontFamily: MONO },
  msg:      { fontSize: 9, color: N.textDim, fontFamily: MONO, marginTop: 2 },
  time:     { fontSize: 9, color: N.textDim, fontFamily: MONO, flexShrink: 0 },
});

// ─── CLIPBOARD SYNC ───────────────────────────────────────────
function ClipboardSync({ connected }: { connected: boolean }) {
  const [clipText, setClipText] = useState('');
  const [sending, setSending]   = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [history, setHistory]   = useState<{ text: string; type: string; time: number }[]>([]);
  const [sendResult, setSendResult] = useState('');
  const autoSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('@clipboard_history_v1').then(raw => {
      if (raw) try { setHistory(JSON.parse(raw).slice(0, 12)); } catch {}
    });
    return () => { if (autoSyncRef.current) clearInterval(autoSyncRef.current); };
  }, []);

  useEffect(() => {
    if (autoSync && connected) {
      autoSyncRef.current = setInterval(async () => { // 5s — was 1s, reduces battery drain
        try {
          const { getStringAsync } = await import('expo-clipboard');
          const txt = await getStringAsync();
          if (txt && txt !== clipText) { setClipText(txt); sendClip(txt); }
        } catch {}
      }, 5000);
    } else {
      if (autoSyncRef.current) { clearInterval(autoSyncRef.current); autoSyncRef.current = null; }
    }
    return () => { if (autoSyncRef.current) clearInterval(autoSyncRef.current); };
  }, [autoSync, connected, clipText]);

  const sendClip = async (text?: string) => {
    const toSend = (text || clipText).trim();
    if (!toSend) { Alert.alert('Empty', 'Type or paste text first.'); return; }
    if (!connected) { Alert.alert('Offline', 'Pair with PC first.'); return; }
    setSending(true); setSendResult('');
    try {
      const ip = serverConnection.getIP(), port = serverConnection.getPort(), tok = serverConnection.getToken();
      const escaped = JSON.stringify(toSend);
      const script = `import subprocess,sys\ntry:\n    if sys.platform=='win32':\n        subprocess.run(['clip'],input=${escaped}.encode(),check=True)\n    elif sys.platform=='darwin':\n        subprocess.run(['pbcopy'],input=${escaped}.encode(),check=True)\n    else:\n        subprocess.run(['xclip','-selection','clipboard'],input=${escaped}.encode(),check=True)\n    print('Clipboard updated')\nexcept Exception as e:\n    print(f'Error: {e}')`;
      const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 8000);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tok) headers['Authorization'] = `Bearer ${tok}`;
      const res = await fetch(`http://${ip}:${port}/api/execute`, { method: 'POST', headers, body: JSON.stringify({ script }), signal: ctrl.signal });
      const data = await res.json();
      setSendResult(data.output?.trim() || 'Sent!');
      haptics.success();
      const entry = { text: toSend.slice(0, 80), type: toSend.startsWith('http') ? 'URL' : /\d{1,3}\.\d{1,3}/.test(toSend) ? 'IP' : toSend.includes('\n') ? 'CODE' : 'TEXT', time: Date.now() };
      const updated = [entry, ...history].slice(0, 12);
      setHistory(updated);
      AsyncStorage.setItem('@clipboard_history_v1', JSON.stringify(updated)).catch(() => {});
    } catch (e: any) { setSendResult('Error: ' + (e?.message || 'Failed')); haptics.warning(); }
    finally { setSending(false); }
  };

  const pasteFromDevice = async () => {
    try { const { getStringAsync } = await import('expo-clipboard'); const txt = await getStringAsync(); if (txt) { setClipText(txt); haptics.light(); } } catch {}
  };
  const copyToDevice = async (text: string) => {
    try { const { setStringAsync } = await import('expo-clipboard'); await setStringAsync(text); haptics.copyFlash(); } catch {}
  };

  const typeCol: Record<string, string> = { URL: N.cyan, IP: N.teal, CODE: N.amber, TEXT: N.textMid };

  return (
    <View style={cls.wrap}>
      <SectionHeader label="CLIPBOARD SYNC · REAL-TIME" color={N.purple} icon="content-paste" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {/* Left: send to PC */}
        <View style={[cls.panel, { flex: 1, borderColor: N.purple + '40' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <MaterialCommunityIcons name="lead-pencil" size={11} color={N.purple} />
            <Text style={[cls.panelLabel, { color: N.purple }]}>SEND TO PC</Text>
          </View>
          <TextInput
            style={cls.input}
            value={clipText} onChangeText={setClipText}
            multiline placeholder="Type or paste text..." placeholderTextColor={N.textDim}
            autoCapitalize="none" autoCorrect={false} textAlignVertical="top"
          />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            <TouchableOpacity style={[cls.btn, { backgroundColor: N.purple, flex: 2 }]} onPress={() => sendClip()} disabled={sending} activeOpacity={0.85}>
              {sending ? <ActivityIndicator size="small" color="#FFF" style={{ transform: [{ scale: 0.75 }] }} /> : <MaterialIcons name="send" size={12} color="#FFF" />}
              <Text style={cls.btnTxt}>{sending ? '...' : 'SEND'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cls.btn, { backgroundColor: N.surfaceHi, flex: 1 }]} onPress={pasteFromDevice} activeOpacity={0.85}>
              <MaterialIcons name="content-paste" size={12} color={N.purple} />
              <Text style={[cls.btnTxt, { color: N.purple }]}>PASTE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cls.btn, { backgroundColor: N.surfaceHi, flex: 1 }]} onPress={() => { setClipText(''); setSendResult(''); }} activeOpacity={0.85}>
              <MaterialIcons name="clear" size={12} color={N.red} />
              <Text style={[cls.btnTxt, { color: N.red }]}>CLR</Text>
            </TouchableOpacity>
          </View>
          {/* Auto-sync toggle */}
          <View style={cls.autoRow}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: autoSync && connected ? N.green : N.textDim }} />
            <Text style={cls.autoTxt}>Auto-sync (1s)</Text>
            <TouchableOpacity
              style={[cls.toggleWrap, autoSync ? { backgroundColor: N.purple + '30', borderColor: N.purple } : { backgroundColor: N.surfaceHi, borderColor: N.border }]}
              onPress={() => { haptics.selection(); setAutoSync(v => !v); }} activeOpacity={0.85}
            >
              <View style={[cls.toggleThumb, { alignSelf: autoSync ? 'flex-end' : 'flex-start', backgroundColor: autoSync ? N.purple : N.textDim }]} />
            </TouchableOpacity>
          </View>
          {sendResult ? <Text style={[cls.result, { color: sendResult.includes('Error') ? N.red : N.green }]}>{sendResult}</Text> : null}
        </View>

        {/* Right: history */}
        <View style={[cls.panel, { flex: 1, borderColor: N.teal + '40' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <MaterialCommunityIcons name="clipboard-text-clock" size={11} color={N.teal} />
            <Text style={[cls.panelLabel, { color: N.teal }]}>CLIP HISTORY</Text>
          </View>
          {history.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
              <MaterialCommunityIcons name="clipboard-outline" size={28} color={N.textDim} />
              <Text style={{ fontSize: 9, color: N.textDim, fontFamily: MONO, textAlign: 'center' }}>Empty{'\n'}Send something first</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {history.map((item, i) => {
                const col = typeCol[item.type] || N.textMid;
                const mins = Math.round((Date.now() - item.time) / 60000);
                const tStr = mins < 1 ? 'now' : mins < 60 ? `${mins}m` : `${Math.round(mins / 60)}h`;
                return (
                  <View key={i} style={[cls.histRow, { borderLeftColor: col + '70' }]}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 2 }}>
                        <View style={[cls.typePill, { borderColor: col + '50', backgroundColor: col + '10' }]}>
                          <Text style={[cls.typeTxt, { color: col }]}>{item.type}</Text>
                        </View>
                        <Text style={cls.histTime}>{tStr}</Text>
                      </View>
                      <Text style={cls.histTxt} numberOfLines={1}>{item.text}</Text>
                    </View>
                    <TouchableOpacity onPress={() => copyToDevice(item.text)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Text style={[cls.copyTxt, { color: col }]}>COPY</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}
const cls = StyleSheet.create({
  wrap:       { marginBottom: 20 },
  panel:      { borderWidth: 1.5, borderRadius: 10, padding: 10, backgroundColor: N.surface },
  panelLabel: { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 },
  input:      { height: 100, fontSize: 12, color: N.text, fontFamily: MONO, lineHeight: 18, backgroundColor: N.surfaceHi, borderRadius: 8, borderWidth: 1, borderColor: N.purple + '30', padding: 8 },
  btn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 8, paddingVertical: 9 },
  btnTxt:     { fontSize: 10, fontWeight: '900', color: '#FFF', fontFamily: MONO },
  autoRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  autoTxt:    { flex: 1, fontSize: 9, color: N.textMid, fontFamily: MONO },
  toggleWrap: { width: 34, height: 18, borderRadius: 9, borderWidth: 1, padding: 2, justifyContent: 'center' },
  toggleThumb:{ width: 12, height: 12, borderRadius: 6 },
  result:     { fontSize: 9, fontFamily: MONO, marginTop: 5, lineHeight: 13 },
  histRow:    { borderLeftWidth: 2, paddingLeft: 7, paddingVertical: 7, marginBottom: 5, flexDirection: 'row', alignItems: 'center', gap: 6 },
  typePill:   { borderWidth: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  typeTxt:    { fontSize: 7, fontWeight: '900', fontFamily: MONO },
  histTime:   { fontSize: 8, color: N.textDim, fontFamily: MONO },
  histTxt:    { fontSize: 10, color: N.text, fontFamily: MONO },
  copyTxt:    { fontSize: 8, fontWeight: '900', fontFamily: MONO },
});

// ─── FILTER CHIPS ─────────────────────────────────────────────
function NexusFilterChips({ options, active, onSelect }: { options: string[]; active: string; onSelect: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4, marginBottom: 14 }}>
      {options.map(opt => {
        const isActive = opt === active;
        return (
          <TouchableOpacity key={opt} style={[fc.chip, isActive && { borderColor: N.blue, backgroundColor: N.blue + '22' }]}
            onPress={() => { haptics.selection(); onSelect(opt); }} activeOpacity={0.75}>
            <Text style={[fc.label, isActive && { color: N.blue }]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
const fc = StyleSheet.create({
  chip:  { borderWidth: 1.5, borderColor: N.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  label: { fontSize: 11, fontWeight: '700', color: N.textDim, fontFamily: MONO },
});

// ─── TERMINAL COMMANDS GRID ────────────────────────────────────
function TerminalCommands({ connected, onResult }: { connected: boolean; onResult: (title: string, out: string, col: string) => void }) {
  const CMDS = [
    { cmd: 'python --version', desc: 'Python version',   col: N.blue   },
    { cmd: 'pip list',         desc: 'Installed pkgs',    col: N.green  },
    { cmd: 'whoami',           desc: 'Current user',      col: N.teal   },
    { cmd: 'df -h',            desc: 'Disk usage',        col: N.amber  },
    { cmd: 'ps aux | head -15',desc: 'Top processes',     col: N.purple },
    { cmd: 'netstat -an | head -20', desc: 'Network conns', col: N.red },
    { cmd: 'free -h',          desc: 'Memory info',       col: N.yellow },
    { cmd: 'uname -a',         desc: 'System info',       col: N.textMid },
  ];
  const [runningCmd, setRunningCmd] = useState<string | null>(null);

  const runCmd = async (cmd: string, col: string) => {
    if (!connected) { Alert.alert('OFFLINE', 'Connect to server first.'); return; }
    haptics.light(); setRunningCmd(cmd);
    try {
      const ip = serverConnection.getIP(), port = serverConnection.getPort(), tok = serverConnection.getToken();
      const script = `import subprocess\ntry:\n    r=subprocess.run(${JSON.stringify(cmd)},shell=True,capture_output=True,text=True,timeout=10)\n    print(r.stdout.strip() or r.stderr.strip() or '[exit 0]')\nexcept Exception as e:\n    print(f'[ERROR] {e}')`;
      const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 30_000);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tok) headers['Authorization'] = `Bearer ${tok}`;
      const res = await fetch(`http://${ip}:${port}/api/execute`, { method: 'POST', headers, body: JSON.stringify({ script }), signal: ctrl.signal });
      const data = await res.json();
      haptics.success();
      onResult(cmd, (data.output || data.error || 'No output').slice(0, 1000), col);
    } catch (e: any) { haptics.warning(); onResult(cmd, e?.message || 'Error', N.red); }
    finally { setRunningCmd(null); }
  };

  return (
    <View>
      <SectionHeader label="TERMINAL COMMANDS" color={N.purple} icon="terminal" />
      <Text style={{ fontSize: 11, color: N.textDim, fontFamily: MONO, marginBottom: 12, lineHeight: 17 }}>Quick shell commands executed directly on your PC. Tap any to run instantly.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {CMDS.map(({ cmd, desc, col }) => (
          <TouchableOpacity key={cmd} style={[tcmd.btn, { borderColor: col + '50', backgroundColor: col + '0A', width: (SW - 64) / 2 }]}
            onPress={() => runCmd(cmd, col)} disabled={runningCmd === cmd} activeOpacity={0.82}>
            {runningCmd === cmd
              ? <ActivityIndicator size="small" color={col} style={{ transform: [{ scale: 0.7 }] }} />
              : <MaterialIcons name="play-arrow" size={13} color={col} />
            }
            <View style={{ flex: 1 }}>
              <Text style={[tcmd.cmd, { color: col }]} numberOfLines={1}>{cmd}</Text>
              <Text style={tcmd.desc}>{desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const tcmd = StyleSheet.create({
  btn:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  cmd:  { fontSize: 10, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.3 },
  desc: { fontSize: 8.5, color: N.textDim, fontFamily: MONO, marginTop: 2 },
});

// ── Removed: ScheduledTask interface + PRESETS + ScheduleSection + styles
//    The /api/scheduler endpoint isn't part of butler_server.py, so the
//    entire 279-line block was dead code referencing broken identifiers.


const s2 = StyleSheet.create({
  noteBox:    { flexDirection:'row', alignItems:'flex-start', gap:8, borderWidth:1, borderColor:'rgba(255,42,31,0.25)', borderRadius:8, padding:10, backgroundColor:'rgba(255,42,31,0.05)' },
  noteTxt:    { flex:1, fontSize:10, fontFamily:MONO, lineHeight:15 },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────
export default function FileShareScreen() {
  const insets = useSafeAreaInsets();
  const { T } = useCosmetic();
  const PR = T.primary || N.cyan;
  const [isConnected,     setIsConnected]     = useState(false);
  const [serverAddr,      setServerAddr]       = useState('');
  const [uploading,       setUploading]        = useState(false);
  const [uploadProgress,  setUploadProgress]   = useState('');
  const [pcFiles,         setPcFiles]          = useState<PCFile[]>([]);
  const [loadingFiles,    setLoadingFiles]     = useState(false);
  const [downloadingFile, setDownloadingFile]  = useState<string | null>(null);
  const [logs,            setLogs]             = useState<TransferLog[]>([]);
  const [filterText,      setFilterText]       = useState('');
  const [toolCategory,    setToolCategory]     = useState('ALL');
  const [outputModal,     setOutputModal]      = useState<{ visible: boolean; title: string; output: string; color: string }>({ visible: false, title: '', output: '', color: N.blue });
  const [runningTool,     setRunningTool]      = useState<string | null>(null);
  const [activeSection,   setActiveSection]    = useState<'files' | 'tools' | 'terminal'>('files');

  // ── Connection sync ──────────────────────────────────────────
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      if (autoConnectEngine && typeof autoConnectEngine.onEvent === 'function') {
        unsub = autoConnectEngine.onEvent((evt: any) => {
          try {
            if (evt.status === 'connected' && evt.ip) {
              setIsConnected(true); setServerAddr(`${evt.ip}:${evt.port}`);
            } else if (evt.status === 'idle') {
              setIsConnected(false); setServerAddr('');
            }
          } catch {}
        });
      }
    } catch (e) { console.warn('[fileshare] autoConnectEngine.onEvent failed:', e); }
    // Seed immediately from engine — prevents 'NO SERVER CONNECTED' flash when already connected
    try {
      if (autoConnectEngine && typeof autoConnectEngine.getCurrentConnection === 'function') {
        const seed = autoConnectEngine.getCurrentConnection();
        if (seed.connected && seed.ip) {
          setIsConnected(true); setServerAddr(`${seed.ip}:${seed.port}`);
        }
      }
    } catch {}
    try {
      serverConnection?.load?.().then(() => {
        try {
          if (serverConnection?.isConnected?.()) {
            setIsConnected(true);
            setServerAddr(`${serverConnection.getIP()}:${serverConnection.getPort()}`);
          }
        } catch {}
      }).catch(() => {});
    } catch {}
    AsyncStorage.getItem('@fileshare_logs_v1').then(raw => {
      if (raw) try { setLogs(JSON.parse(raw).slice(0, 50)); } catch {}
    });
    return () => { try { unsub?.(); } catch {} };
  }, []);

  useEffect(() => {
    if (isConnected) fetchPCFiles();
  }, [isConnected]);

  const addLog = useCallback((log: Omit<TransferLog, 'id' | 'timestamp'>) => {
    setLogs(prev => {
      const entry: TransferLog = { ...log, id: Date.now().toString(), timestamp: Date.now() / 1000 };
      const updated = [entry, ...prev].slice(0, 50);
      AsyncStorage.setItem('@fileshare_logs_v1', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const fetchPCFiles = useCallback(async () => {
    if (!serverConnection.isConnected()) return;
    setLoadingFiles(true);
    try {
      const ip = serverConnection.getIP(), port = serverConnection.getPort(), tok = serverConnection.getToken();
      const script = `import os,json\nfrom pathlib import Path\np=Path.home()/'Desktop'\nfiles=[]\ntry:\n  for f in sorted(p.iterdir(),key=lambda x:x.stat().st_mtime,reverse=True):\n    if f.is_file():st=f.stat();files.append({"name":f.name,"size":st.st_size,"modified":int(st.st_mtime),"type":f.suffix.lstrip('.')})\nexcept Exception as e:files=[{"name":str(e),"size":0,"modified":0,"type":"error"}]\nprint(json.dumps(files[:60]))`;
      const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 8000);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tok) headers['Authorization'] = `Bearer ${tok}`;
      const res = await fetch(`http://${ip}:${port}/api/execute`, { method: 'POST', headers, body: JSON.stringify({ script }), signal: ctrl.signal });
      const data = await res.json();
      if (data.output) { try { const parsed = JSON.parse(data.output.trim()); if (Array.isArray(parsed)) setPcFiles(parsed); } catch {} }
    } catch {}
    finally { setLoadingFiles(false); }
  }, []);

  const pickAndUpload = useCallback(async () => {
    if (!isConnected) { Alert.alert('OFFLINE', 'Connect to PC in HOME tab first.'); return; }
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if ((asset.size || 0) > 10 * 1024 * 1024) { Alert.alert('Too Large', 'Max 10MB per file.'); return; }
      setUploading(true); setUploadProgress(`Reading ${asset.name}...`);
      const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      setUploadProgress('Transmitting to PC...');
      const ip = serverConnection.getIP(), port = serverConnection.getPort(), tok = serverConnection.getToken();
      const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 30000);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tok) headers['Authorization'] = `Bearer ${tok}`;
      const res = await fetch(`http://${ip}:${port}/api/receive_file`, { method: 'POST', headers, body: JSON.stringify({ filename: asset.name, data: b64 }), signal: ctrl.signal });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === 'ok') {
        addLog({ direction: 'upload', filename: asset.name, size: asset.size || 0, status: 'success', message: 'Saved to PC Desktop' });
        haptics.success(); Alert.alert('Upload Complete', `"${data.filename || asset.name}" saved to PC Desktop.`);
        fetchPCFiles();
      } else {
        addLog({ direction: 'upload', filename: asset.name, size: asset.size || 0, status: 'error', message: data.error || `HTTP ${res.status}` });
      }
    } catch (e: any) {
      const msg = e?.name === 'AbortError' ? 'Timeout' : (e?.message || 'Error');
      addLog({ direction: 'upload', filename: 'unknown', size: 0, status: 'error', message: msg });
    } finally { setUploading(false); setUploadProgress(''); }
  }, [isConnected, addLog, fetchPCFiles]);

  const downloadFile = useCallback(async (file: PCFile) => {
    if (!isConnected) return;
    setDownloadingFile(file.name);
    try {
      const ip = serverConnection.getIP(), port = serverConnection.getPort(), tok = serverConnection.getToken();
      const safeFileName = file.name.replace(/'/g, "\\'");
      const script = `import base64,json\nfrom pathlib import Path\np=Path.home()/'Desktop'/'${safeFileName}'\ntry:\n  data=base64.b64encode(p.read_bytes()).decode()\n  print(json.dumps({"ok":True,"data":data}))\nexcept Exception as e:\n  print(json.dumps({"ok":False,"error":str(e)}))`;
      const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 30000);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tok) headers['Authorization'] = `Bearer ${tok}`;
      const res = await fetch(`http://${ip}:${port}/api/execute`, { method: 'POST', headers, body: JSON.stringify({ script }), signal: ctrl.signal });
      const data = await res.json().catch(() => ({}));
      let parsed: any = {};
      try { parsed = JSON.parse((data.output || '').trim()); } catch {}
      if (!parsed.ok) {
        addLog({ direction: 'download', filename: file.name, size: file.size, status: 'error', message: parsed.error || 'Read failed' });
        Alert.alert('Failed', parsed.error); return;
      }
      const localUri = `${FileSystem.cacheDirectory}${file.name}`;
      await FileSystem.writeAsStringAsync(localUri, parsed.data, { encoding: FileSystem.EncodingType.Base64 });
      addLog({ direction: 'download', filename: file.name, size: file.size, status: 'success', message: 'Saved to device' });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(localUri, { dialogTitle: `Open ${file.name}` });
      else Alert.alert('Saved', 'File saved to app cache.');
    } catch (e: any) {
      addLog({ direction: 'download', filename: file.name, size: file.size, status: 'error', message: e?.message || 'Error' });
    } finally { setDownloadingFile(null); }
  }, [isConnected, addLog]);

  const launchTool = useCallback(async (tool: QuickTool) => {
    haptics.medium();
    if (!isConnected) { Alert.alert('OFFLINE', 'Connect to PC in HOME tab first.'); return; }
    setRunningTool(tool.id);
    try {
      const ip = serverConnection.getIP(), port = serverConnection.getPort(), tok = serverConnection.getToken();
      const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 30000);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tok) headers['Authorization'] = `Bearer ${tok}`;
      const res = await fetch(`http://${ip}:${port}/api/execute`, { method: 'POST', headers, body: JSON.stringify({ script: tool.script }), signal: ctrl.signal });
      const data = await res.json();
      haptics.success();
      setOutputModal({ visible: true, title: tool.name, output: (data.output || data.error || 'No output').slice(0, 1400), color: tool.color });
    } catch (e: any) {
      haptics.warning();
      setOutputModal({ visible: true, title: tool.name, output: `Error: ${e?.message || 'Unknown'}`, color: N.red });
    } finally { setRunningTool(null); }
  }, [isConnected]);

  const filteredFiles  = pcFiles.filter(f => !filterText || f.name.toLowerCase().includes(filterText.toLowerCase()));
  const filteredTools  = toolCategory === 'ALL' ? QUICK_TOOLS : QUICK_TOOLS.filter(t => t.category === toolCategory);
  const SECTIONS = ['files', 'tools', 'terminal'] as const;
  const SECTION_LABELS = { files: 'FILES', tools: 'TOOLS', terminal: 'TERMINAL' };
  const SECTION_ICONS  = { files: 'folder-multiple', tools: 'wrench', terminal: 'console' };

  return (
    <View style={[s.container, { backgroundColor: T.bg || N.bg }]}>
      {/* Output modal */}
      <NexusOutputModal
        visible={outputModal.visible}
        title={outputModal.title}
        output={outputModal.output}
        color={outputModal.color}
        onClose={() => setOutputModal(prev => ({ ...prev, visible: false }))}
      />

      {/* ── Section tab bar ── */}
      <View style={s.sectionBar}>
        {SECTIONS.map(sec => {
          const isActive = activeSection === sec;
          const col = sec === 'files' ? N.teal : sec === 'tools' ? N.amber : N.purple;
          return (
            <TouchableOpacity
              key={sec}
              style={[s.sectionBtn, isActive && { borderBottomColor: col, borderBottomWidth: 2.5, backgroundColor: col + '0C' }]}
              onPress={() => { haptics.selection(); setActiveSection(sec); }} activeOpacity={0.8}
            >
              <MaterialCommunityIcons name={SECTION_ICONS[sec] as any} size={13} color={isActive ? col : N.textDim} />
              <Text style={[s.sectionBtnTxt, isActive && { color: col }]}>{SECTION_LABELS[sec]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <InlineWidgetSlot pageId="fileshare" position="inline-top" />

        {/* ── CONNECTION STATUS ── */}
        <NexusConnStrip isConnected={isConnected} addr={serverAddr} />

        {/* ══ FILE SHARE ══ */}
        {activeSection === 'files' ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 3, height: 18, backgroundColor: N.teal, borderRadius: 2 }} />
              <Text style={{ fontSize: 14, fontWeight: '900', color: N.teal, fontFamily: MONO, letterSpacing: 1 }}>FILE SHARE</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: N.teal + '25', marginLeft: 4 }} />
            </View>

            {/* ── FILE TRANSFER — 2-column dashed-border cards ── */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {/* Send card */}
              <TouchableOpacity
                style={[ftc.card, { borderColor: N.blue + '55', backgroundColor: '#080C14', flex: 1 }, uploading && { opacity: 0.6 }]}
                onPress={() => { haptics.medium(); pickAndUpload(); }}
                disabled={uploading || !isConnected}
                activeOpacity={0.85}
              >
                <View style={[ftc.topBar, { backgroundColor: N.blue }]} />
                <View style={[ftc.cornerTL, { borderColor: N.blue + '80' }]} />
                <View style={[ftc.cornerBR, { borderColor: N.blue + '50' }]} />
                <Text style={[ftc.cardHeader, { color: N.textDim }]}>📤 SEND FILES</Text>
                <View style={[ftc.dropZone, { borderColor: N.blue + '45' }]}>
                  {uploading
                    ? <ActivityIndicator size="small" color={N.blue} />
                    : <MaterialCommunityIcons name="file-upload" size={28} color={isConnected ? N.blue : N.textDim} />}
                  <Text style={[ftc.dropMain, { color: isConnected ? N.text : N.textDim }]}>
                    {uploading ? uploadProgress || 'Uploading...' : 'Tap to select'}
                  </Text>
                  <Text style={[ftc.dropSub, { color: N.blue }]}>Any file · max 10MB</Text>
                </View>
                <View style={[ftc.actionBtn, { backgroundColor: N.blue, opacity: isConnected ? 1 : 0.4 }]}>
                  <MaterialIcons name="upload" size={12} color="#000" />
                  <Text style={ftc.actionTxt}>SEND TO PC</Text>
                </View>
              </TouchableOpacity>
              {/* Receive card */}
              <View style={[ftc.card, { borderColor: N.green + '55', backgroundColor: '#040E08', flex: 1 }]}>
                <View style={[ftc.topBar, { backgroundColor: N.green }]} />
                <View style={[ftc.cornerTL, { borderColor: N.green + '80' }]} />
                <View style={[ftc.cornerBR, { borderColor: N.green + '50' }]} />
                <Text style={[ftc.cardHeader, { color: N.textDim }]}>📥 RECEIVED</Text>
                <View style={[ftc.dropZone, { borderColor: N.green + '30' }]}>
                  <MaterialCommunityIcons name="download-circle-outline" size={28} color={isConnected ? N.green : N.textDim} />
                  <Text style={[ftc.dropMain, { color: N.textDim }]}>Waiting...</Text>
                  <Text style={[ftc.dropSub, { color: N.green }]}>From Desktop</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingBottom: 10 }}>
                  <TouchableOpacity style={[ftc.actionBtn, { backgroundColor: N.green + '20', flex: 1, marginHorizontal: 0, marginBottom: 0 }]} onPress={fetchPCFiles}>
                    <MaterialIcons name="refresh" size={12} color={N.green} />
                    <Text style={[ftc.actionTxt, { color: N.green }]}>REFRESH</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[ftc.actionBtn, { backgroundColor: N.surfaceHi, borderColor: N.border, borderWidth: 1, flex: 1, marginHorizontal: 0, marginBottom: 0 }]} onPress={() => setPcFiles([])}>
                    <MaterialIcons name="clear-all" size={12} color={N.textDim} />
                    <Text style={[ftc.actionTxt, { color: N.textDim }]}>CLEAR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Desktop file browser */}
            <SectionHeader
              label={`PC DESKTOP${pcFiles.length > 0 ? ` (${pcFiles.length})` : ''}`}
              color={N.teal} icon="folder"
              right={
                <TouchableOpacity onPress={fetchPCFiles} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  {loadingFiles ? <ActivityIndicator size="small" color={N.teal} /> : <MaterialIcons name="refresh" size={16} color={N.teal} />}
                </TouchableOpacity>
              }
            />

            {pcFiles.length > 3 ? (
              <View style={s.searchBar}>
                <MaterialIcons name="search" size={14} color={filterText ? N.teal : N.textDim} />
                <TextInput style={s.searchInput} value={filterText} onChangeText={setFilterText} placeholder="Filter files..." placeholderTextColor={N.textDim} returnKeyType="search" autoCapitalize="none" />
                {filterText ? <TouchableOpacity onPress={() => setFilterText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><MaterialIcons name="close" size={14} color={N.textDim} /></TouchableOpacity> : null}
              </View>
            ) : null}

            <View style={s.fileListCard}>
              {!isConnected ? (
                <View style={s.emptyState}>
                  <MaterialIcons name="wifi-off" size={36} color={N.textDim} />
                  <Text style={s.emptyTxt}>NO SERVER CONNECTED</Text>
                  <Text style={s.emptyHint}>Scan QR code in HOME tab</Text>
                </View>
              ) : loadingFiles && pcFiles.length === 0 ? (
                <View style={s.emptyState}><ActivityIndicator color={N.teal} size="large" /></View>
              ) : filteredFiles.length === 0 ? (
                <View style={s.emptyState}>
                  <MaterialIcons name="folder-open" size={36} color={N.textDim} />
                  <Text style={s.emptyTxt}>{filterText ? 'NO MATCH' : 'DESKTOP EMPTY'}</Text>
                </View>
              ) : filteredFiles.map(file => (
                <PCFileRow key={file.name} file={file} onDownload={downloadFile} downloading={downloadingFile === file.name} />
              ))}
            </View>

            {/* Clipboard sync */}
            <ClipboardSync connected={isConnected} />

            {/* Transfer log */}
            {logs.length > 0 ? (
              <View>
                <SectionHeader label={`TRANSFER LOG (${logs.length})`} color={N.amber} icon="history"
                  right={
                    <TouchableOpacity onPress={() => { setLogs([]); AsyncStorage.removeItem('@fileshare_logs_v1'); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: N.red, fontFamily: MONO }}>CLEAR</Text>
                    </TouchableOpacity>
                  }
                />
                <View style={s.logCard}>
                  {logs.slice(0, 8).map(log => <LogRow key={log.id} log={log} />)}
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        {/* ══ TOOLS ══ */}
        {activeSection === 'tools' ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 3, height: 18, backgroundColor: N.amber, borderRadius: 2 }} />
              <Text style={{ fontSize: 14, fontWeight: '900', color: N.amber, fontFamily: MONO, letterSpacing: 1 }}>QUICK TOOLS</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: N.amber + '25', marginLeft: 4 }} />
            </View>
            <Text style={s.hint}>Scripts execute via Python on your paired PC. psutil required for metrics tools.</Text>

            {/* Category filter */}
            <NexusFilterChips options={TOOL_CATEGORIES} active={toolCategory} onSelect={setToolCategory} />

            {/* Tools grid */}
            <View style={s.toolsGrid}>
              {filteredTools.map(tool => (
                <NexusToolCard key={tool.id} tool={tool} running={runningTool === tool.id} onPress={() => launchTool(tool)} />
              ))}
            </View>

            {/* Info note */}
            <View style={[s.noteBox, { borderColor: N.teal + '30', backgroundColor: N.teal + '08' }]}>
              <MaterialIcons name="info-outline" size={12} color={N.teal} />
              <Text style={[s.noteTxt, { color: N.teal + 'AA' }]}>All scripts run via Python subprocess on your PC · 30s timeout per tool</Text>
            </View>
          </>
        ) : null}

        {/* ══ TERMINAL ══ */}
        {activeSection === 'terminal' ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 3, height: 18, backgroundColor: N.purple, borderRadius: 2 }} />
              <Text style={{ fontSize: 14, fontWeight: '900', color: N.purple, fontFamily: MONO, letterSpacing: 1 }}>TERMINAL CMDS</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: N.purple + '25', marginLeft: 4 }} />
            </View>
            <TerminalCommands connected={isConnected} onResult={(title, out, col) => setOutputModal({ visible: true, title, output: out, color: col })} />
          </>
        ) : null}

        {/* Schedule section removed — /api/scheduler not available on this server version */}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#050505' },

  sectionBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: N.border, backgroundColor: N.surface },
  sectionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  sectionBtnTxt: { fontSize: 10, fontWeight: '700', color: N.textDim, fontFamily: MONO, letterSpacing: 0.5 },

  scroll:     { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 140 },

  uploadBtn:  { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: N.surface, borderRadius: 12, borderWidth: 1.5, borderColor: N.teal + '50', padding: 16, marginBottom: 16,
    ...Platform.select({ ios: { shadowColor: N.teal, shadowOffset:{width:0,height:4}, shadowOpacity:0.25, shadowRadius:12 }, android:{ elevation:5 } }) },
  uploadIcon: { width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  uploadTxt:  { fontSize: 14, fontWeight: '900', color: N.teal, fontFamily: MONO, letterSpacing: 0.5 },
  uploadSub:  { fontSize: 10, color: N.textDim, fontFamily: MONO, marginTop: 4 },

  searchBar:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: N.surface, borderRadius: 10, borderWidth: 1, borderColor: N.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  searchInput:{ flex: 1, fontSize: 13, color: N.text, fontFamily: MONO },

  fileListCard: { backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderColor: N.border, overflow: 'hidden', marginBottom: 20 },
  logCard:    { backgroundColor: N.surface, borderRadius: 12, borderWidth: 1, borderColor: N.border, overflow: 'hidden', marginBottom: 20 },

  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyTxt:   { fontSize: 13, fontWeight: '700', color: N.textDim, fontFamily: MONO },
  emptyHint:  { fontSize: 11, color: N.textDim, fontFamily: MONO },

  toolsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },

  hint:       { fontSize: 12, color: N.textDim, fontFamily: MONO, lineHeight: 18, marginBottom: 14 },
  noteBox:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 4 },
  noteTxt:    { flex: 1, fontSize: 10, fontFamily: MONO, lineHeight: 15 },
});

// ── File Transfer Card styles ──
const ftc = StyleSheet.create({
  card:       { borderWidth: 1.5, borderRadius: 12, overflow: 'hidden', position: 'relative',
    ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.3, shadowRadius:6 }, android:{elevation:4} }) },
  topBar:     { height: 2.5 },
  cornerTL:   { position: 'absolute', top: 0, left: 0, width: 9, height: 9, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  cornerBR:   { position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
  cardHeader: { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 1, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 6 },
  dropZone:   { borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, marginHorizontal: 10, marginBottom: 8, padding: 18, alignItems: 'center', gap: 6 },
  dropMain:   { fontSize: 12, fontWeight: '700', fontFamily: MONO, textAlign: 'center' },
  dropSub:    { fontSize: 9, fontFamily: MONO, letterSpacing: 0.5, textAlign: 'center' },
  actionBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 8, paddingVertical: 9, marginHorizontal: 10, marginBottom: 10 },
  actionTxt:  { fontSize: 10, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 0.3 },
});


// Expo Router per-route ErrorBoundary — isolates crashes to this tab
export { ErrorBoundary } from '@/components/ui/TabErrorBoundary';
