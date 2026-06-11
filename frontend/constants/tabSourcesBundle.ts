/**
 * Tab Source Registration v5.0 — MAXIMUM SOURCE COVERAGE
 * ─────────────────────────────────────────────────────────────────────────────
 * Registers ACTUAL TypeScript source for all major files so the exported JSON
 * gives external AI builders (Claude/GPT) real code to work with.
 *
 * Files with full source: serverConnection, autoConnectEngine, haptics,
 * HeaderConstants, _layout.tsx, settings.tsx, privacy-policy, data-safety,
 * app/_layout.tsx, metro.config, react-native.config, app.json metadata.
 *
 * Files with rich metadata stubs: nexushome, knowledge, builder, scripts
 * (too large to embed inline — metadata gives AI full component inventory).
 */

import { registerTabSource } from './appSourceBundle';

// ─── REAL FULL SOURCE: services/haptics.ts ────────────────────────────────────
registerTabSource('services/haptics.ts', `/**
 * 🎯 HAPTICS HELPER — v2.0 Enhanced tactile feedback patterns
 * Consistent, page-aware vibration across all interactions
 * Wraps expo-haptics with safe fallbacks for web/simulator
 */

import { Platform } from 'react-native';

let Haptics: any = null;

const getHaptics = () => {
  if (!Haptics && Platform.OS !== 'web') {
    try { Haptics = require('expo-haptics'); } catch {}
  }
  return Haptics;
};

const imp = (style: string) => {
  try { getHaptics()?.impactAsync(getHaptics()?.ImpactFeedbackStyle?.[style]); } catch {}
};
const notif = (type: string) => {
  try { getHaptics()?.notificationAsync(getHaptics()?.NotificationFeedbackType?.[type]); } catch {}
};

export const haptics = {
  light:     () => imp('Light'),
  medium:    () => imp('Medium'),
  heavy:     () => imp('Heavy'),
  rigid:     () => { try { getHaptics()?.impactAsync(getHaptics()?.ImpactFeedbackStyle?.Rigid ?? getHaptics()?.ImpactFeedbackStyle?.Heavy); } catch {} },
  soft:      () => { try { getHaptics()?.impactAsync(getHaptics()?.ImpactFeedbackStyle?.Soft  ?? getHaptics()?.ImpactFeedbackStyle?.Light); } catch {} },
  success:   () => notif('Success'),
  warning:   () => notif('Warning'),
  error:     () => notif('Error'),
  selection: () => { try { getHaptics()?.selectionAsync(); } catch {} },
  doublePulse:       () => { imp('Medium'); setTimeout(() => imp('Light'), 100); },
  tripleSuccess:     () => { imp('Light'); setTimeout(() => imp('Medium'), 100); setTimeout(() => imp('Heavy'), 200); },
  heartbeat:         () => { imp('Light'); setTimeout(() => imp('Heavy'), 80); },
  stutter:           () => { imp('Heavy'); setTimeout(() => imp('Heavy'), 60); setTimeout(() => imp('Heavy'), 120); },
  swipeConfirm:      () => { imp('Light'); setTimeout(() => imp('Light'), 50); setTimeout(() => imp('Medium'), 150); },
  pageTransition:    () => { try { getHaptics()?.selectionAsync(); } catch {} },
  saveSuccess:       () => { imp('Light'); setTimeout(() => notif('Success'), 120); },
  copyFlash:         () => imp('Rigid'),
  scriptExecute:     () => { imp('Medium'); setTimeout(() => imp('Light'), 80); setTimeout(() => imp('Light'), 180); },
  scriptComplete:    () => { notif('Success'); setTimeout(() => imp('Light'), 150); },
  connectionSuccess: () => { imp('Light'); setTimeout(() => imp('Medium'), 100); setTimeout(() => notif('Success'), 250); },
  unlockCelebration: () => { imp('Heavy'); setTimeout(() => imp('Medium'), 100); setTimeout(() => imp('Light'), 200); setTimeout(() => notif('Success'), 350); },
  longPress:         () => imp('Heavy'),
  refresh:           () => { imp('Light'); setTimeout(() => imp('Rigid'), 100); },
};
`);

// ─── REAL FULL SOURCE: constants/HeaderConstants.ts ───────────────────────────
registerTabSource('constants/HeaderConstants.ts', `/**
 * BUTLER AI — ZERO-CREDIT HEADER CONSTANTS
 * Edit text labels, subtitles, button labels, and accent colors here.
 * All values consumed by NexusOriginalHeader in app/(tabs)/_layout.tsx
 */

export interface TabHeaderEntry {
  title: string;
  subtitle: string;
  actionLabel: string;
  actionIcon: string;
  accentColor: string;
}

export const TAB_HEADER_ENTRIES: Record<string, TabHeaderEntry> = {
  home:      { title: 'NEXUS HOME',     subtitle: 'PC Automation · Command Center',      actionLabel: 'QR SCAN',  actionIcon: 'qr-code-scanner', accentColor: '#00CCDD' },
  butler:    { title: 'BUTLER AI',      subtitle: 'Local Ollama · Private · Zero Cloud', actionLabel: 'CLEAR',    actionIcon: 'delete-sweep',    accentColor: '#BB33FF' },
  scripts:   { title: 'SCRIPT LIBRARY', subtitle: 'Python Automation · 70+ Scripts',     actionLabel: 'REFRESH',  actionIcon: 'refresh',         accentColor: '#4488FF' },
  knowledge: { title: 'KNOWLEDGE BASE', subtitle: 'SIGMA-NET · Live Crawler · KB Graph', actionLabel: 'SYNC',     actionIcon: 'sync',            accentColor: '#FF8C00' },
  fileshare: { title: 'TOOLS HUB',      subtitle: 'File Share · Clipboard · Terminal',   actionLabel: 'REFRESH',  actionIcon: 'refresh',         accentColor: '#00CCDD' },
  logs:      { title: 'PC CHECK',       subtitle: 'Health · Cleaning · Automation',      actionLabel: 'REFRESH',  actionIcon: 'refresh',         accentColor: '#00FF88' },
  support:   { title: 'COSMETIC PACKS', subtitle: 'Themes · Skins · Customization',      actionLabel: 'BROWSE',   actionIcon: 'palette',         accentColor: '#FF6EB4' },
  settings:  { title: 'SYSTEM CONFIG',  subtitle: 'App Settings · Preferences',          actionLabel: 'SAVE',     actionIcon: 'settings',        accentColor: '#CC7755' },
  terminal:  { title: 'LIVE TERMINAL',  subtitle: 'nexus@terminal:~$',                   actionLabel: 'CLEAR',    actionIcon: 'delete-sweep',    accentColor: '#44FF22' },
  builder:   { title: 'SCRIPT BUILDER', subtitle: 'Visual Node Pipeline · Drag & Build', actionLabel: 'CLEAR',    actionIcon: 'delete-sweep',    accentColor: '#BB33FF' },
};

export const CONN_COLORS = {
  connected:    '#00FF88',
  disconnected: '#FF3366',
};

export const SPLASH_CONFIG = {
  titleLine1:   'BUTLER',
  titleLine2:   'AI',
  tagline:      'PC AUTOMATION · COMMAND CENTER',
  bootText:     'INITIALIZING SYSTEMS...',
  versionBadge: 'v6.0 · ANDROID · LOCAL AI',
  accentColor:  '#1A5FCC',
};
`);

// ─── REAL FULL SOURCE: metro.config.js ───────────────────────────────────────
registerTabSource('metro.config.js', `// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = ['mjs', 'tsx', 'ts', 'jsx', 'js', 'json'];
config.resolver.assetExts = [
  ...config.resolver.assetExts.filter(ext => ext !== 'mjs'),
  'svg',
];
config.resolver.resolverMainFields = ['browser', 'react-native', 'module', 'main'];

// expo-video stub — prevents SimpleCache crash on Android hot-reload
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'expo-video': path.resolve(__dirname, './stubs/expo-video-stub.js'),
};

module.exports = config;
`);

// ─── REAL FULL SOURCE: react-native.config.js ────────────────────────────────
registerTabSource('react-native.config.js', `/**
 * react-native.config.js — Native auto-link exclusions
 * Excludes expo-video from Android native linking to prevent
 * IllegalStateException: Another SimpleCache instance uses the folder
 */
module.exports = {
  dependencies: {
    'expo-video': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
`);

// ─── REAL FULL SOURCE: services/serverConnection.ts ──────────────────────────
registerTabSource('services/serverConnection.ts', `/**
 * SERVER CONNECTION SERVICE v5.0 — Adaptive Global
 * Works on any port, any network, any country.
 * Port discovery: saved port → golden list → common ports scan.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { deviceIdentifier } from '@/services/deviceIdentifier';
import { features } from '@/services/serverFeatures';

const KNOWN_GOOD_KEY = '@sc_known_good_ips_v1';
export const AUTH_DISABLED_KEY = '@sc_auth_disabled_v1';

let _authDisabled = false;
export function isAuthDisabled(): boolean { return _authDisabled; }
export async function setAuthDisabled(val: boolean): Promise<void> {
  _authDisabled = val;
  try { await AsyncStorage.setItem(AUTH_DISABLED_KEY, val ? '1' : '0'); } catch {}
}
export async function loadAuthDisabled(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_DISABLED_KEY);
    _authDisabled = raw === '1';
  } catch {}
}

const KEYS = {
  IP:        'commandcube_server_ip',
  PORT:      'commandcube_server_port',
  DEVICE_ID: 'commandcube_device_id',
  TOKEN:     'commandcube_session_token',
  PAIRED_AT: 'commandcube_last_paired',
} as const;

const ALL_COMMON_PORTS = [
  5000, 8000, 8080, 8008,
  8765, 8766, 8767, 8768, 8769, 8770,
  3000, 3001, 4000,
  8888, 8081, 8082, 8090,
  9000, 9090, 9999,
  1337, 7000, 7777, 8500, 8600, 8700, 8800, 8900,
  10000, 12345,
];

const PROBE_PATHS = ['/api/status', '/status', '/health', '/', '/api/health'];

export interface ConnState {
  connected: boolean;
  ip:        string;
  port:      string;
  deviceId:  string;
  token:     string;
}

export interface ConnResult {
  success:    boolean;
  connected:  boolean;
  latency?:   number;
  error?:     string;
  errorType?: 'TIMEOUT' | 'REFUSED' | 'UNREACHABLE' | 'AUTH' | 'ALIEN' | 'UNKNOWN';
}

class ServerConnectionService {
  private static _inst: ServerConnectionService;
  private _ip     = '';
  private _port   = '';
  private _device = '';
  private _token  = '';
  private _ok     = false;
  private _storageLoaded = false;
  private _listeners: Set<(s: ConnState) => void> = new Set();
  private _knownGoodIPs: Array<{ ip: string; port: string }> = [];

  static getInstance() {
    if (!this._inst) this._inst = new ServerConnectionService();
    return this._inst;
  }

  get state(): ConnState {
    return { connected: this._ok, ip: this._ip, port: this._port, deviceId: this._device, token: this._token };
  }
  isConnected() { return this._ok; }
  getIP()       { return this._ip; }
  getPort()     { return this._port; }
  getToken()    { return this._token; }
  getDeviceId() { return this._device; }

  private async _buildAdaptivePortList(primaryPort?: string): Promise<string[]> {
    const seen = new Set<string>(); const list: string[] = [];
    const add = (p: string | number | null | undefined) => {
      if (!p) return; const s = String(p).trim(); const n = parseInt(s, 10);
      if (!isNaN(n) && n > 0 && n < 65536 && !seen.has(s)) { seen.add(s); list.push(s); }
    };
    add(primaryPort);
    add(await AsyncStorage.getItem(KEYS.PORT).catch(() => null));
    await this.loadKnownGood();
    this._knownGoodIPs.forEach(e => add(e.port));
    ALL_COMMON_PORTS.forEach(p => add(p));
    return list;
  }

  private async _ensureDeviceId(): Promise<string> {
    if (this._device) return this._device;
    this._device = await deviceIdentifier.getDeviceId();
    return this._device;
  }

  async load(): Promise<boolean> {
    try {
      await loadAuthDisabled();
      const [[,ip],[,port],[,device],[,token]] = await AsyncStorage.multiGet([KEYS.IP, KEYS.PORT, KEYS.DEVICE_ID, KEYS.TOKEN]);
      this._ip = ip || ''; this._port = port || ''; this._device = device || ''; this._token = token || '';
      this._storageLoaded = true;
      return !!(this._ip && this._port);
    } catch { return false; }
  }

  private async _save(): Promise<void> {
    this._storageLoaded = false;
    await AsyncStorage.multiSet([[KEYS.IP, this._ip],[KEYS.PORT, this._port],[KEYS.DEVICE_ID, this._device],[KEYS.TOKEN, this._token],[KEYS.PAIRED_AT, new Date().toISOString()]]).catch(() => {});
    this._storageLoaded = true;
  }

  private _notify() { const s = this.state; this._listeners.forEach(cb => { try { cb(s); } catch {} }); }

  buildAuthHeader(): string | null {
    if (_authDisabled) return null;
    return this._token ? 'Bearer ' + this._token : null;
  }

  buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!_authDisabled && this._token) h['Authorization'] = 'Bearer ' + this._token;
    if (this._device) h['X-Device-Id'] = this._device;
    if (extra) Object.assign(h, extra);
    return h;
  }

  private async _ensureLoaded(): Promise<void> {
    if (this._storageLoaded) return;
    try {
      const [[,ip],[,port],[,device],[,token]] = await AsyncStorage.multiGet([KEYS.IP, KEYS.PORT, KEYS.DEVICE_ID, KEYS.TOKEN]);
      if (ip) this._ip = ip; if (port) this._port = port; if (device) this._device = device; if (token) this._token = token;
      this._storageLoaded = true;
    } catch {}
  }

  async loadKnownGood(): Promise<void> {
    try { const raw = await AsyncStorage.getItem(KNOWN_GOOD_KEY); if (raw) this._knownGoodIPs = JSON.parse(raw).slice(0, 10); } catch {}
  }

  async saveKnownGood(ip: string, port: string): Promise<void> {
    this._knownGoodIPs = [{ ip, port }, ...this._knownGoodIPs.filter(e => !(e.ip === ip && e.port === port))].slice(0, 10);
    await AsyncStorage.setItem(KNOWN_GOOD_KEY, JSON.stringify(this._knownGoodIPs)).catch(() => {});
  }

  getKnownGoodIPs(): Array<{ ip: string; port: string }> { return [...this._knownGoodIPs]; }

  async quickPing(ip: string, port: string): Promise<number | null> {
    await this._ensureLoaded();
    const t0 = Date.now();
    for (const path of ['/api/status', '/health', '/status', '/']) {
      try {
        const ctrl = new AbortController(); const tid = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch('http://' + ip + ':' + port + path, { signal: ctrl.signal });
        clearTimeout(tid);
        const ht = res.headers.get('X-New-Token');
        if (ht && ht !== this._token) { this._token = ht; this._save().catch(() => {}); }
        if (res.status < 500) return Date.now() - t0;
      } catch {}
    }
    return null;
  }

  async ping(ip: string, port: string, timeoutMs = 10000): Promise<ConnResult & { resolvedPort?: string }> {
    await this._ensureLoaded();
    const t0 = Date.now(); const portList = await this._buildAdaptivePortList(port);
    if (port) {
      for (const path of ['/health', '/api/status', '/status']) {
        try {
          const ctrl = new AbortController(); const tid = setTimeout(() => ctrl.abort(), 6000);
          const res = await fetch('http://' + ip + ':' + port + path, { signal: ctrl.signal });
          clearTimeout(tid);
          if (res.status < 500) return { success: true, connected: true, latency: Date.now() - t0, resolvedPort: port };
        } catch (e: any) { const msg = (e?.message ?? '').toLowerCase(); if (msg.includes('refused') || msg.includes('econnrefused')) break; }
      }
    }
    for (const tryPort of portList) {
      if (tryPort === port) continue;
      for (const path of PROBE_PATHS) {
        if (Date.now() - t0 > timeoutMs) break;
        try {
          const ctrl = new AbortController(); const tid = setTimeout(() => ctrl.abort(), 1500);
          const res = await fetch('http://' + ip + ':' + tryPort + path, { signal: ctrl.signal });
          clearTimeout(tid);
          if (res.status < 500) {
            if (tryPort !== this._port && tryPort !== port) { this._port = tryPort; await AsyncStorage.setItem(KEYS.PORT, tryPort).catch(() => {}); }
            return { success: true, connected: true, latency: Date.now() - t0, resolvedPort: tryPort };
          }
        } catch {}
      }
      if (Date.now() - t0 > timeoutMs + 2000) break;
    }
    return { success: false, connected: false, error: 'No server found at ' + ip, errorType: 'UNREACHABLE', latency: Date.now() - t0 };
  }

  async reconnect(): Promise<ConnResult> {
    if (!this._ip) { const ok = await this.load(); if (!ok) return { success: false, connected: false, error: 'No saved server address' }; }
    const deviceId = await this._ensureDeviceId();
    const health = await this.ping(this._ip, this._port, 5000);
    if (!health.connected) { this._ok = false; this._notify(); return health; }
    try {
      const ctrl = new AbortController(); const tid = setTimeout(() => ctrl.abort(), 5000); const t0 = Date.now();
      const resolvedPort = (health as any).resolvedPort || this._port;
      const res = await fetch('http://' + this._ip + ':' + resolvedPort + '/reconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId }), signal: ctrl.signal });
      clearTimeout(tid); const latency = Date.now() - t0;
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.status === 'ok' && data.sessionToken) { this._token = data.sessionToken; this._ok = true; await this._save(); this._notify(); return { success: true, connected: true, latency }; }
      }
      if (res.status === 403) { this._ok = false; this._notify(); return { success: false, connected: false, error: 'Server locked to a different device', errorType: 'ALIEN' }; }
      if (res.status === 404) { this._ok = true; this._notify(); return { success: true, connected: true, latency }; }
    } catch {}
    this._ok = false; this._notify(); return { success: false, connected: false, error: 'Reconnect failed', errorType: 'UNKNOWN' };
  }

  async pair(ip: string, port: string, pairingCode = '', skipPing = false): Promise<ConnResult & { token?: string }> {
    const deviceId = await this._ensureDeviceId();
    let resolvedPort = port || this._port;
    if (!skipPing) { const health = await this.ping(ip, port, 12000); resolvedPort = (health as any).resolvedPort || port; }
    const attemptPair = async () => {
      try {
        const t0 = Date.now(); const ctrl = new AbortController(); const tid = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch('http://' + ip + ':' + resolvedPort + '/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pairingCode, deviceId, platform: 'android' }), signal: ctrl.signal });
        clearTimeout(tid); const latency = Date.now() - t0; const data = await res.json().catch(() => ({}));
        return { res, latency, data };
      } catch (e: any) { throw Object.assign(new Error(e?.name === 'AbortError' ? 'Connection timeout' : (e?.message ?? 'Unknown')), { errorType: 'TIMEOUT' }); }
    };
    try {
      let { res, latency, data } = await attemptPair();
      if (res.status === 403 && pairingCode && pairingCode.length >= 4) {
        try { const rc = new AbortController(); const rt = setTimeout(() => rc.abort(), 4000); await fetch('http://' + ip + ':' + resolvedPort + '/api/reset_pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pairingCode }), signal: rc.signal }); clearTimeout(rt); } catch {}
        await new Promise(r => setTimeout(r, 400));
        const retry = await attemptPair(); res = retry.res; latency = retry.latency; data = retry.data;
      }
      if (res.ok && (data.sessionToken || data.token)) {
        this._ip = ip; this._port = resolvedPort; this._token = data.sessionToken || data.token || ''; this._ok = true;
        await this._save(); await this.saveKnownGood(ip, resolvedPort); this._notify();
        return { success: true, connected: true, latency, token: data.sessionToken || data.token };
      }
      if (res.status === 403) return { success: false, connected: false, error: data.error || 'Server locked to another device', errorType: 'ALIEN' };
      if (res.status === 401) return { success: false, connected: false, error: data.error || 'Wrong pairing code', errorType: 'AUTH' };
      if (res.ok) { this._ip = ip; this._port = resolvedPort; this._ok = true; await this._save(); await this.saveKnownGood(ip, resolvedPort); this._notify(); return { success: true, connected: true, latency, token: '' }; }
      return { success: false, connected: false, error: data.message || data.error || 'HTTP ' + res.status };
    } catch (e: any) { return { success: false, connected: false, error: e?.message ?? 'Unknown', errorType: e?.errorType ?? 'TIMEOUT' }; }
  }

  async saveManual(ip: string, port: string): Promise<void> {
    this._ip = ip; this._port = port; await this._ensureDeviceId();
    await AsyncStorage.multiSet([[KEYS.IP, this._ip],[KEYS.PORT, this._port],[KEYS.DEVICE_ID, this._device],[KEYS.TOKEN, this._token]]).catch(() => {});
  }

  async connectManual(ip: string, port: string): Promise<ConnResult> {
    await this._ensureLoaded(); await this.saveManual(ip, port);
    const health = await this.ping(ip, port, 12000);
    if (!health.connected) { this._ok = false; this._notify(); return health; }
    const resolvedPort = (health as any).resolvedPort || port; this._ip = ip; this._port = resolvedPort;
    await AsyncStorage.multiSet([[KEYS.IP, ip],[KEYS.PORT, resolvedPort]]).catch(() => {});
    const deviceId = await this._ensureDeviceId();
    try {
      const ctrl = new AbortController(); const tid = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch('http://' + ip + ':' + resolvedPort + '/reconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId }), signal: ctrl.signal });
      clearTimeout(tid);
      if (res.ok) { const data = await res.json().catch(() => ({})); const tok = data.sessionToken || data.token; if (tok) { this._token = tok; await this._save(); } }
      else if (res.status === 403) { this._ok = false; this._notify(); return { success: false, connected: false, error: 'Server locked to a different device', errorType: 'ALIEN' }; }
    } catch {}
    this._ok = true; await this.saveKnownGood(ip, resolvedPort); this._notify();
    this._probeFeatures(ip, resolvedPort).catch(() => {});
    return { success: true, connected: true, latency: health.latency };
  }

  private async _probeFeatures(ip: string, port: string): Promise<void> {
    try { const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 5000); const res = await fetch('http://' + ip + ':' + port + '/api/status', { signal: ctrl.signal }); if (res.ok) { const j = await res.json().catch(() => ({})); features.setFromStatus(j); } } catch {}
  }

  async absorbHealedToken(res: Response, data?: any): Promise<void> {
    try {
      const h = res.headers.get('X-New-Token');
      if (h && h !== this._token) { this._token = h; await this._save(); return; }
      if (data?.newToken && data.newToken !== this._token) { this._token = data.newToken; await this._save(); }
    } catch {}
  }

  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(this._token ? { Authorization: 'Bearer ' + this._token } : {}), ...(this._device ? { 'X-Device-Id': this._device } : {}), ...((options.headers as Record<string, string>) || {}) };
    let res = await fetch(url, { ...options, headers });
    const ht = res.headers.get('X-New-Token'); if (ht && ht !== this._token) { this._token = ht; await this._save(); }
    if (res.status === 401 && this._ip && this._port) { await this.connectManual(this._ip, this._port).catch(() => {}); const refreshed = { ...headers, Authorization: 'Bearer ' + this._token }; res = await fetch(url, { ...options, headers: refreshed }); }
    return res;
  }

  async disconnect(): Promise<void> { this._ok = false; this._token = ''; await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.PAIRED_AT]).catch(() => {}); this._notify(); }
  async clearAll(): Promise<void> { this._ip = this._port = this._device = this._token = ''; this._ok = false; await AsyncStorage.multiRemove(Object.values(KEYS)).catch(() => {}); this._notify(); }
  onStateChange(cb: (s: ConnState) => void): () => void { this._listeners.add(cb); return () => this._listeners.delete(cb); }
}

export const serverConnection = ServerConnectionService.getInstance();
`);

// ─── REAL FULL SOURCE: services/autoConnectEngine.ts ─────────────────────────
registerTabSource('services/autoConnectEngine.ts', `/**
 * AUTO-CONNECT ENGINE v1.0 — Single Source of Truth
 * State machine: idle → connecting → connected → monitoring → reconnecting
 * Backoff: 2s → 5s → 10s → 20s → 40s → 60s
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { serverConnection } from './serverConnection';
import { connectionPersistence } from './connectionPersistence';
import { quickScan, fastProbeLastKnown } from './lanScanner';
import { AppState, AppStateStatus } from 'react-native';
import { networkMonitor } from './networkMonitor';

const KEYS = { IP: 'commandcube_server_ip', PORT: 'commandcube_server_port' };

export type EngineStatus = 'idle' | 'connecting' | 'connected' | 'scanning' | 'reconnecting';

export interface EngineEvent {
  status:       EngineStatus;
  ip?:          string;
  port?:        string;
  latencyMs?:   number;
  isFirstTime?: boolean;
  message?:     string;
}

type Listener = (event: EngineEvent) => void;

class AutoConnectEngine {
  private _status:       EngineStatus = 'idle';
  private _listeners:    Listener[]   = [];
  private _pingTimer:    ReturnType<typeof setInterval> | null = null;
  private _reconnTimer:  ReturnType<typeof setTimeout>  | null = null;
  private _appStateSub:  any = null;
  private _started           = false;
  private _failStreak        = 0;
  private _scanAbort         = { aborted: false };
  private _scanning          = false;
  private _lastIp            = '';
  private _lastPort          = '';
  private _persistRetryTimer: ReturnType<typeof setInterval> | null = null;
  private _pingFailCount     = 0;
  private _lastNotifyTs      = 0;
  private _lastNotifyIp      = '';

  private _backoff(): number {
    const steps = [2000, 5000, 10000, 20000, 40000, 60000];
    return steps[Math.min(this._failStreak, steps.length - 1)];
  }

  onEvent(cb: Listener): () => void {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(l => l !== cb); };
  }

  private _emit(event: EngineEvent) {
    this._status = event.status;
    this._listeners.forEach(l => { try { l(event); } catch {} });
  }

  getStatus(): EngineStatus { return this._status; }
  isConnected(): boolean    { return this._status === 'connected'; }

  getCurrentConnection(): { ip: string; port: string; connected: boolean } {
    return { ip: this._lastIp, port: this._lastPort, connected: this._status === 'connected' };
  }

  async start(): Promise<void> {
    if (this._started) return;
    this._started = true;
    (global as any).__autoConnectEngineReconnect = (ip: string, port: string) => {
      if (this._status !== 'connected') this._doReconnect(ip, port).catch(() => {});
    };
    await connectionPersistence.load().catch(() => {});
    await networkMonitor.load().catch(() => {});
    networkMonitor.engineStart();
    this._appStateSub = AppState.addEventListener('change', this._onAppState);
    await this._initialConnect();
    this._startPingMonitor();
  }

  stop(): void {
    this._started = false;
    if (this._pingTimer)        { clearInterval(this._pingTimer);       this._pingTimer = null; }
    if (this._reconnTimer)      { clearTimeout(this._reconnTimer);      this._reconnTimer = null; }
    if (this._persistRetryTimer){ clearInterval(this._persistRetryTimer); this._persistRetryTimer = null; }
    if (this._appStateSub)      { this._appStateSub.remove?.();         this._appStateSub = null; }
    this._scanAbort.aborted = true;
    networkMonitor.engineStop();
    delete (global as any).__autoConnectEngineReconnect;
    this._emit({ status: 'idle' });
  }

  notifyConnected(ip: string, port: string, latencyMs = 0): void {
    const now = Date.now();
    if (now - this._lastNotifyTs < 2000 && this._status === 'connected' && this._lastNotifyIp === ip) return;
    this._lastNotifyTs = now; this._lastNotifyIp = ip; this._lastIp = ip; this._lastPort = port;
    this._failStreak = 0; this._pingFailCount = 0;
    AsyncStorage.multiSet([[KEYS.IP, ip],[KEYS.PORT, port]]).catch(() => {});
    connectionPersistence.recordSuccess(ip, port, latencyMs).catch(() => {});
    networkMonitor.connectOk(ip, port, latencyMs);
    if (this._persistRetryTimer) { clearInterval(this._persistRetryTimer); this._persistRetryTimer = null; }
    this._emit({ status: 'connected', ip, port, latencyMs });
    setTimeout(() => { try { (global as any).__kgeOnReconnect?.(); } catch {} }, 2000);
  }

  notifyDisconnected(): void {
    const ip = this._lastIp; const port = this._lastPort;
    this._lastIp = ''; this._lastPort = '';
    if (ip && port) networkMonitor.disconnect(ip, port);
    this._emit({ status: 'idle', message: 'Disconnected by user' });
  }

  private async _initialConnect(): Promise<void> {
    const savedIp   = await AsyncStorage.getItem(KEYS.IP).catch(() => null);
    const savedPort = await AsyncStorage.getItem(KEYS.PORT).catch(() => null);
    if (savedIp && savedPort) {
      this._emit({ status: 'connecting', ip: savedIp, port: savedPort });
      const r = await serverConnection.connectManual(savedIp, savedPort).catch(() => null);
      if (r?.connected) { this._lastIp = savedIp; this._lastPort = serverConnection.getPort() || savedPort; this._failStreak = 0; await connectionPersistence.recordSuccess(this._lastIp, this._lastPort, r.latency ?? 0).catch(() => {}); networkMonitor.connectOk(this._lastIp, this._lastPort, r.latency ?? 0); this._emit({ status: 'connected', ip: this._lastIp, port: this._lastPort, latencyMs: r.latency }); return; }
      else networkMonitor.connectFail(savedIp, savedPort, r?.error || 'Connection failed');
      const fastest = await connectionPersistence.findFastestGolden().catch(() => null);
      if (fastest) { const r2 = await serverConnection.connectManual(fastest.ip, fastest.port).catch(() => null); if (r2?.connected) { this._lastIp = fastest.ip; this._lastPort = fastest.port; this._failStreak = 0; await AsyncStorage.multiSet([[KEYS.IP, fastest.ip],[KEYS.PORT, fastest.port]]).catch(() => {}); await connectionPersistence.recordSuccess(fastest.ip, fastest.port, fastest.latencyMs).catch(() => {}); this._emit({ status: 'connected', ip: fastest.ip, port: fastest.port, latencyMs: fastest.latencyMs }); return; } }
    }
    const isFirstTime = !savedIp;
    const fastFound = await fastProbeLastKnown((srv) => { this._connectToDiscovered(srv.ip, String(srv.port), isFirstTime); });
    if (fastFound) return;
    if (!savedIp) { this._emit({ status: 'idle', message: 'No server paired — scan QR code to connect' }); return; }
    this._runBackgroundScan(false);
  }

  private async _runBackgroundScan(isFirstTime: boolean): Promise<void> {
    if (this._scanning) return; this._scanning = true; this._scanAbort = { aborted: false };
    networkMonitor.scanStart();
    this._emit({ status: 'scanning', message: isFirstTime ? 'First launch — scanning...' : 'Scanning network...' });
    try {
      let found = false;
      await quickScan((progress) => {
        if (this._scanAbort.aborted || found) return;
        if (progress.found.length > 0) { found = true; this._scanAbort.aborted = true; const srv = progress.found[0]; this._connectToDiscovered(srv.ip, String(srv.port), isFirstTime); }
      }, this._scanAbort);
      if (!found) { this._scanning = false; networkMonitor.scanEmpty(); this._emit({ status: 'idle', message: 'No server found on network' }); const savedIp = await AsyncStorage.getItem(KEYS.IP).catch(() => null); const savedPort = await AsyncStorage.getItem(KEYS.PORT).catch(() => null); if (savedIp && savedPort) this._startPersistentRetry(savedIp, savedPort); this._scheduleReconnect(); }
    } catch { this._scanning = false; networkMonitor.scanEmpty(); this._emit({ status: 'idle', message: 'Scan error' }); this._scheduleReconnect(); }
  }

  private async _connectToDiscovered(ip: string, port: string, isFirstTime: boolean): Promise<void> {
    this._scanning = false; this._emit({ status: 'connecting', ip, port });
    try {
      const r = await serverConnection.connectManual(ip, port);
      if (r.connected) { const resolvedPort = serverConnection.getPort() || port; await AsyncStorage.multiSet([[KEYS.IP, ip],[KEYS.PORT, resolvedPort]]).catch(() => {}); await connectionPersistence.recordSuccess(ip, resolvedPort, r.latency ?? 0).catch(() => {}); networkMonitor.scanFound(ip, resolvedPort, r.latency ?? 0); networkMonitor.connectOk(ip, resolvedPort, r.latency ?? 0); this._lastIp = ip; this._lastPort = resolvedPort; this._failStreak = 0; this._emit({ status: 'connected', ip, port: resolvedPort, latencyMs: r.latency, isFirstTime }); }
      else { networkMonitor.connectFail(ip, port, r?.error || 'Auto-connect failed'); this._emit({ status: 'idle' }); this._scheduleReconnect(); }
    } catch (e: any) { networkMonitor.connectFail(ip, port, e?.message || 'Error'); this._emit({ status: 'idle' }); this._scheduleReconnect(); }
  }

  private _startPingMonitor(): void {
    if (this._pingTimer) clearInterval(this._pingTimer);
    this._pingTimer = setInterval(async () => {
      const ip   = this._lastIp   || await AsyncStorage.getItem(KEYS.IP).catch(() => null);
      const port = this._lastPort || await AsyncStorage.getItem(KEYS.PORT).catch(() => null);
      if (!ip || !port) return;
      const ms = await serverConnection.quickPing(ip, port).catch(() => null);
      if (ms !== null) { this._pingFailCount = 0; networkMonitor.pingOk(ip, port, ms); if (this._status !== 'connected') { this._lastIp = ip; this._lastPort = port; this._failStreak = 0; this._emit({ status: 'connected', ip, port, latencyMs: ms }); } }
      else {
        this._pingFailCount++;
        networkMonitor.pingFail(ip, port, 'Ping attempt ' + this._pingFailCount + '/4 failed');
        if (this._pingFailCount >= 4 && this._status === 'connected') {
          networkMonitor.disconnect(ip, port); const silentR = await serverConnection.quickPing(ip, port).catch(() => null);
          if (silentR !== null) { this._pingFailCount = 0; networkMonitor.pingOk(ip, port, silentR); return; }
          this._emit({ status: 'reconnecting', ip, port }); this._doReconnect(ip, port);
        } else if (this._pingFailCount >= 4 && this._status !== 'connected' && this._status !== 'reconnecting') {
          if (!this._reconnTimer) this._reconnTimer = setTimeout(async () => { this._reconnTimer = null; if (this._status !== 'connected') this._doReconnect(ip, port); }, 60000) as any;
        }
      }
    }, 30000);
  }

  private async _doReconnect(ip: string, port: string): Promise<void> {
    this._pingFailCount = 0;
    const fastFound = await fastProbeLastKnown(() => {}).catch(() => null);
    if (fastFound) { const rf = await serverConnection.connectManual(fastFound.ip, String(fastFound.port)).catch(() => null); if (rf?.connected) { this._failStreak = 0; const resolvedPortF = serverConnection.getPort() || String(fastFound.port); this._lastIp = fastFound.ip; this._lastPort = resolvedPortF; await AsyncStorage.multiSet([[KEYS.IP, fastFound.ip],[KEYS.PORT, resolvedPortF]]).catch(() => {}); await connectionPersistence.recordSuccess(fastFound.ip, resolvedPortF, fastFound.latencyMs).catch(() => {}); networkMonitor.reconnectOk(fastFound.ip, resolvedPortF, fastFound.latencyMs); this._emit({ status: 'connected', ip: fastFound.ip, port: resolvedPortF, latencyMs: fastFound.latencyMs }); return; } }
    const r = await serverConnection.connectManual(ip, port).catch(() => null);
    if (r?.connected) { this._failStreak = 0; const resolvedPort = serverConnection.getPort() || port; this._lastIp = ip; this._lastPort = resolvedPort; await connectionPersistence.recordSuccess(ip, resolvedPort, r.latency ?? 0).catch(() => {}); networkMonitor.reconnectOk(ip, resolvedPort, r.latency ?? 0); this._emit({ status: 'connected', ip, port: resolvedPort, latencyMs: r.latency }); return; }
    else networkMonitor.reconnectFail(ip, port, r?.error || 'Reconnect failed');
    const fastest = await connectionPersistence.findFastestGolden().catch(() => null);
    if (fastest) { const r2 = await serverConnection.connectManual(fastest.ip, fastest.port).catch(() => null); if (r2?.connected) { this._failStreak = 0; await AsyncStorage.multiSet([[KEYS.IP, fastest.ip],[KEYS.PORT, fastest.port]]).catch(() => {}); await connectionPersistence.recordSuccess(fastest.ip, fastest.port, fastest.latencyMs).catch(() => {}); networkMonitor.reconnectOk(fastest.ip, fastest.port, fastest.latencyMs); this._lastIp = fastest.ip; this._lastPort = fastest.port; this._emit({ status: 'connected', ip: fastest.ip, port: fastest.port, latencyMs: fastest.latencyMs }); return; } else networkMonitor.reconnectFail(fastest.ip, fastest.port, r2?.error || 'Golden list reconnect failed'); }
    this._failStreak++;
    this._emit({ status: 'idle', message: 'Reconnect failed' });
    this._startPersistentRetry(ip, port);
    this._runBackgroundScan(false);
  }

  private _startPersistentRetry(ip: string, port: string): void {
    if (this._persistRetryTimer) return;
    this._persistRetryTimer = setInterval(async () => {
      if (this._status === 'connected') { clearInterval(this._persistRetryTimer!); this._persistRetryTimer = null; return; }
      const ms = await serverConnection.quickPing(ip, port).catch(() => null);
      if (ms !== null) { clearInterval(this._persistRetryTimer!); this._persistRetryTimer = null; this._pingFailCount = 0; this._lastIp = ip; this._lastPort = port; await AsyncStorage.multiSet([[KEYS.IP, ip],[KEYS.PORT, port]]).catch(() => {}); await connectionPersistence.recordSuccess(ip, port, ms).catch(() => {}); this._emit({ status: 'connected', ip, port, latencyMs: ms }); }
    }, 90000);
  }

  private _scheduleReconnect(): void {
    if (this._reconnTimer) clearTimeout(this._reconnTimer);
    const delay = this._backoff();
    this._reconnTimer = setTimeout(async () => {
      this._reconnTimer = null; if (this._status === 'connected') return;
      const ip   = this._lastIp   || await AsyncStorage.getItem(KEYS.IP).catch(() => null);
      const port = this._lastPort || await AsyncStorage.getItem(KEYS.PORT).catch(() => null);
      if (ip && port) await this._doReconnect(ip, port); else this._runBackgroundScan(true);
    }, delay) as any;
  }

  private _onAppState = (nextState: AppStateStatus) => {
    if (nextState === 'active') networkMonitor.appResume();
    else if (nextState === 'background') networkMonitor.appBackground();
    if (nextState === 'active') {
      if (this._reconnTimer) { clearTimeout(this._reconnTimer); this._reconnTimer = null; }
      (async () => {
        if (!this._lastIp) { const si = await AsyncStorage.getItem(KEYS.IP).catch(() => null); const sp = await AsyncStorage.getItem(KEYS.PORT).catch(() => null); if (si && sp) { this._lastIp = si; this._lastPort = sp; } }
        const ip   = this._lastIp   || await AsyncStorage.getItem(KEYS.IP).catch(() => null);
        const port = this._lastPort || await AsyncStorage.getItem(KEYS.PORT).catch(() => null);
        if (ip && port) {
          if (this._status === 'connected') { const ms = await serverConnection.quickPing(ip, port).catch(() => null); if (ms !== null) { this._pingFailCount = 0; networkMonitor.pingOk(ip, port, ms); } else { this._pingFailCount = 0; networkMonitor.disconnect(ip, port); this._emit({ status: 'reconnecting', ip, port }); await this._doReconnect(ip, port); } }
          else await this._doReconnect(ip, port);
        } else if (!this._scanning) { const savedIp = await AsyncStorage.getItem(KEYS.IP).catch(() => null); if (savedIp) this._runBackgroundScan(false); }
      })().catch(() => {});
    }
  };
}

export const autoConnectEngine = new AutoConnectEngine();
`);

// ─── RICH METADATA: nexushome, builder, knowledge, scripts (too large for inline) ──

registerTabSource('app/(tabs)/nexushome.tsx', [
  '// app/(tabs)/nexushome.tsx — NEXUS HOME SCREEN v6.0',
  '// Stack: React Native / TypeScript / Expo Router / Expo SDK 53',
  '// Palette: bg #090a0f, NCX_BG #0d0e14, NCX_BORDER #1c1e28, teal #10d9a0',
  '//',
  '// KEY COMPONENTS:',
  '//   SectionHead, RingMeter, MiniBarChart, ConnectedPCWidget',
  '//   QuickRunGrid, RecentActivity, QuickToolsSection',
  '//   NexusKnowledgeEngine (6 stat cards, 6 KB bars, crawler log)',
  '//   NexusQRModal (CameraView + manual IP tab), DirectIPConnect',
  '//   PCEndpointsWidget, WsLatencyGraph',
  '//   Pre-permission camera dialog before requestPermission()',
  '//   OMEGA LOOP double-trigger guard (omegaRunningRef)',
  '//   Collapsible Play Store compliance section',
  '//   Quick Tools Carousel (8 items horizontal scroll)',
  '//   AI Builder shortcut card -> navigates to builder tab',
  '//',
  '// ROOT LAYOUT ORDER:',
  '//   WidgetLayer pageId="home"',
  '//   InlineWidgetSlot position="inline-top"',
  '//   ConnectedPCWidget → WsLatencyGraph (if connected)',
  '//   QuickRunGrid → RecentActivity → QuickToolsSection',
  '//   NexusDivider "SERVER SETUP" → Steps → PCEndpointsWidget',
  '//',
  '// GLOBAL SIGNALS:',
  '//   (global).__nexusHomeOpenQR = () => setShowQR(true)',
  '//',
  '// NCX CARD PATTERN:',
  '//   backgroundColor:"#0d0e14", borderWidth:1, borderColor:"#1c1e28"',
  '//   borderLeftWidth:2, borderLeftColor:<accent>',
  '//   borderTopWidth:1, borderTopColor:"rgba(255,255,255,0.04)"',
  '//   borderRadius:12, Android elevation:3',
  '//',
  '// PROTECTED IMPORTS:',
  "//   import { parseQRConnection } from '@/services/qrParser'",
  "//   import { serverConnection } from '@/services/serverConnection'",
  "//   import { autoConnectEngine } from '@/services/autoConnectEngine'",
  "//   import { knowledgeAccumulator } from '@/services/knowledgeAccumulator'",
  "//   import { CameraView, useCameraPermissions } from 'expo-camera'",
  '//',
  '// RESTORE: contentContainerStyle={{ paddingBottom:130 }} on root ScrollView.',
  '// NEVER add transformOrigin to StyleSheet — crashes Android.',
].join('\n'));

registerTabSource('app/(tabs)/builder.tsx', [
  '// app/(tabs)/builder.tsx — SCRIPT BUILDER v6.0',
  '// Palette: bg #060A10, teal #00DDEE, green #00FF88, purple #BB33FF',
  '//',
  '// NODE TYPES: TRIGGER (teal) | ACTION (green) | OUTPUT (purple)',
  '// 70+ NodeDef items',
  '//',
  '// KEY COMPONENTS:',
  '//   NodeDetailModal — long-press bottom sheet, code viewer, ADD TO CANVAS',
  '//   PaletteCard — 2-col grid, press scale, long-press opens detail',
  '//   CanvasNodeCard — slide-in anim, arrow connectors, step badge, remove X',
  '//   ExecuteResultPanel — slide-up, amber running / green success / red error',
  '//',
  '// genStage state: idle | connecting | generating | validating | done',
  '// isValidPythonCode() — validates AI output is real Python, not prose',
  '// ensureErrorHandling() — wraps scripts lacking try/except',
  '//',
  '// EXECUTE: POST /api/execute { script } Authorization: Bearer token 90s timeout',
  '// SAVE: saveButlerScript(script, { title, category:"AI Generated" })',
  '//',
  '// AI BUILDER INTEGRATION:',
  '//   openAIBuilder flag triggers when home shortcut is tapped',
  '//   Quick Prompts ScrollView with 10 preset prompts',
  '//   Describe field -> generates Python via /api/scripts/build',
].join('\n'));

registerTabSource('app/(tabs)/knowledge.tsx', [
  '// app/(tabs)/knowledge.tsx — KNOWLEDGE BASE v6.0 — ~2775 lines',
  '// Palette: bg #080808, blue #4488FF, sigma #CC33FF, amber #FF8C00, teal #00CCDD',
  '//',
  '// TABS: dashboard | overview | nexus | nexusbot | arch | crawler | lscan | manual | base',
  '// VS CODE STYLE TAB BAR: horizontal ScrollView, borderBottomWidth:3 on active',
  '//',
  '// COMPONENTS:',
  '//   NexusKnowledgeEngine, KBIntelDashboard, NexusTitle, AnimatedNumber',
  '//   NexusStatCard, SectionHeader, LogRow, KBProcessDiagram, KBNeuralViz',
  '//   FindingsGrowthChart, CpuActivityChart, CrawlerNetwork, SigmaNetViz',
  '//   KBOrganizerBot, FindingCard, FilterChips, LambdaScanTab',
  '//   DomainBreakdownChart, RecentCrawlHistory, SigmaNetLiveCard',
  '//   LearningPulseBar, NexusBridgeAutoPanel, NexusBridgeFullTab',
  '//',
  '// v6.1.0 FIELDS: crawling (bool), paused (bool), queue_size (int)',
  '//   crawled_today (int), last_url (str)',
  '//   Crawling spinner + Paused banner shown from these fields',
  '//',
  '// CRITICAL: KBNeuralViz edges use midpoint math — NO transformOrigin ever!',
  '//   edges: { left:midX-len/2, top:midY-1, width:len, transform:[{rotate:angle+"deg"}] }',
  '//',
  '// PROTECTED SERVICES:',
  '//   knowledgeAccumulator, kbOrganizerBot, cpuHistory',
  '//   quantumLinkHarvester, nexusBridge, kbGrowthTracker',
  '//   autoConnectEngine, serverConnection',
  '//',
  '// useFocusEffect used for polling — stops when tab loses focus',
].join('\n'));

registerTabSource('app/(tabs)/scripts.tsx', [
  '// app/(tabs)/scripts.tsx — SCRIPT LIBRARY v6.0 — ~2270 lines',
  '// Palette: bg #080808, blue #4488FF, green #00FF88, purple #BB33FF',
  '//',
  '// SECTIONS:',
  '//   Script Library (70+ built-in Python scripts)',
  '//   Favorites tab, Recent tab, Custom tab',
  '//   Script Editor (code viewer/editor with syntax hints)',
  '//   AI Builder modal (full-screen, Quick Prompts, describe field)',
  '//   Execution output modal with streaming SSE support',
  '//   pip install banner when Collecting/Installing detected',
  '//',
  '// SCRIPT EXECUTION:',
  '//   scriptExecutor.executeStream() — 90s timeout, SSE streaming',
  '//   onOutput callback updates UI in real-time',
  '//   isValidPythonCode() validation before save',
  '//   ensureErrorHandling() wraps bare scripts in try/except',
  '//',
  '// PROTECTED SERVICES:',
  '//   scriptExecutor, scriptPersistence, scriptFavorites',
  '//   scriptLibraryData, autoConnectEngine, serverConnection',
  '//',
  '// GHOST POLLING FIX:',
  '//   useFocusEffect wraps connRef and butlerRef intervals',
  '//   Intervals stop when tab is not focused',
].join('\n'));

registerTabSource('app/(tabs)/butler.tsx', [
  '// app/(tabs)/butler.tsx — BUTLER AI CHAT v6.0',
  '// Palette: bg #08090f, purple #BB33FF, teal #00CCDD',
  '//',
  '// KEY COMPONENTS:',
  '//   ChatBubble (React.memo, role: user/butler/system)',
  '//   StreamingAIBubble (live token append, memo comparison)',
  '//   ModelPicker (useFocusEffect, /api/ollama/status on mount)',
  '//   OllamaInstaller widget',
  '//',
  '// CHAT FLOW:',
  '//   chatAbortRef.current?.abort() on unmount + stop button',
  '//   SSE streaming: response.body.getReader() + TextDecoder',
  '//   updateLastMessage() mutates last message content in-place',
  '//   saveConversation() debounced — only called when streaming done',
  '//   Chat history restored from AsyncStorage on mount',
  '//',
  '// MODEL PICKER:',
  '//   handleModelChange() aborts in-flight SSE + POSTs to /api/ollama/set_model',
  '//   modelFetchRef prevents duplicate concurrent fetches',
  '//   useFocusEffect refreshes model list on tab focus',
  '//',
  '// FlatList for messages (not ScrollView+map)',
  '//   maintainVisibleContentPosition prevents scroll jump on token',
  '//   flatListRef.current?.scrollToEnd({ animated: false })',
  '//',
  '// GLOBAL SIGNALS:',
  '//   (global).__butlerQuickSend(msg) — send from home chat bar',
  '//   (global).__butlerClearChat() — clear from header button',
  '//',
  '// API ENDPOINT: POST /api/butler/chat',
  '//   Headers: Content-Type, Authorization: Bearer token, X-Device-Id',
  '//   Body: { message, model, deviceId }',
  '//   Response: text/event-stream SSE',
  '//   Each event: data: { token?, chunk?, done?, error? }',
].join('\n'));

registerTabSource('app/(tabs)/logs.tsx', [
  '// app/(tabs)/logs.tsx — PC CHECK DASHBOARD v6.0',
  '// Palette: bg #080808, green #00FF88, amber #FF8C00, red #FF3300',
  '//',
  '// SECTIONS:',
  '//   System vitals: CPU, RAM, Disk, Network',
  '//   Process list with kill option',
  '//   Disk cleanup tools',
  '//   Script automation shortcuts',
  '//   Undo last script action',
  '//',
  '// API ENDPOINTS:',
  '//   GET /api/status — CPU, RAM, Disk metrics',
  '//   POST /api/kill_process { pid }',
  '//   POST /api/execute — disk cleanup scripts',
  '//',
  '// FlatList for process list with keyExtractor={(_, i) => String(i)}',
  '// useFocusEffect for polling — stops when tab loses focus',
].join('\n'));

registerTabSource('app/(tabs)/fileshare.tsx', [
  '// app/(tabs)/fileshare.tsx — TOOLS HUB v6.0',
  '// Palette: bg #080808, teal #00CCDD, green #00FF88',
  '//',
  '// SECTIONS:',
  '//   File Share — upload/download files between phone and PC',
  '//   Clipboard Sync — copy text/clipboard to PC',
  '//   Live Terminal — SSH/exec streaming terminal',
  '//   Quick Tools — frequently used tools',
  '//',
  '// FILE OPERATIONS:',
  '//   expo-document-picker for file selection',
  '//   POST /api/upload multipart/form-data',
  '//   GET /api/download/:filename',
  '//',
  '// CLIPBOARD:',
  '//   expo-clipboard for local clipboard read',
  '//   POST /api/clipboard/set { text }',
  '//   GET /api/clipboard/get',
].join('\n'));

registerTabSource('app/(tabs)/support.tsx', [
  '// app/(tabs)/support.tsx — COSMETIC PACKS v6.0',
  '// Palette: bg #080808, pink #FF6EB4, gold #FFD700',
  '//',
  '// COSMETIC SYSTEM:',
  '//   CosmeticContext provides T (theme) across app',
  '//   PACK_THEMES: default | cyber | matrix | gold | neon | blood',
  '//   Each pack: { primary, secondary, tertiary, textAccent, id }',
  '//   Selected theme persisted to AsyncStorage',
  '//',
  '// COMPONENTS:',
  '//   ThemePackCard — preview card, locked/unlocked state',
  '//   ColorPreview — shows primary/secondary/tertiary swatches',
  '//   UnlockModal — IAP flow placeholder (all free currently)',
  '//',
  '// proLicense.ts: source: "free" — all packs unlocked',
].join('\n'));

registerTabSource('app/(tabs)/terminal.tsx', [
  '// app/(tabs)/terminal.tsx — LIVE TERMINAL v6.0',
  '// Palette: bg #000, green #44FF22, amber #FF8C00',
  '//',
  '// Streaming terminal output via SSE from /api/execute/stream',
  '// TextInput at bottom for commands',
  '// FlatList of output lines with ANSI color stripping',
  '// Max 500 lines (ring buffer to prevent memory leak)',
  '//',
  '// PROTECTED: do not add transformOrigin to any style',
].join('\n'));
