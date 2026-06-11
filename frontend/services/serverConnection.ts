/**
 * 🔌 SERVER CONNECTION SERVICE v5.0 — Adaptive Global
 * ──────────────────────────────────────────────────────────────────
 * PlayStore-ready · Works on any port, any network, any country.
 *
 * KEY PRINCIPLE: The "correct" port is whatever the server is running on.
 * We never assume a port — we discover it, remember it, and use it.
 *
 * Port discovery order:
 *  1. Last-saved port from AsyncStorage (fastest — worked before)
 *  2. Golden list (previously successful IPs/ports)
 *  3. Common server ports (adaptive scan, broadest coverage)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { deviceIdentifier } from '@/services/deviceIdentifier';
import { features } from '@/services/serverFeatures';

const KNOWN_GOOD_KEY = '@sc_known_good_ips_v1';
export const AUTH_DISABLED_KEY = '@sc_auth_disabled_v1';

// ── Global auth-disabled flag (loaded once at startup, toggled from Settings) ──
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

// All common server ports — no single "correct" port assumed.
// Ordered by global probability across all frameworks.
const ALL_COMMON_PORTS = [
  5000, 8000, 8080, 8008,
  8765, 8766, 8767, 8768, 8769, 8770,
  3000, 3001, 4000,
  8888, 8081, 8082, 8090,
  9000, 9090, 9999,
  1337, 7000, 7777, 8500, 8600, 8700, 8800, 8900,
  10000, 12345,
];

// Probe paths — works with any HTTP server, not just butler_server.py
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
  private _storageLoaded = false; // FIX 1A — memory cache flag

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

  // ── Build adaptive port list ─────────────────────────────────
  // Reads last-used port and golden list, puts them first.
  // Never assumes any specific port is "correct".
  private async _buildAdaptivePortList(primaryPort?: string): Promise<string[]> {
    const seen  = new Set<string>();
    const list: string[] = [];

    const add = (p: string | number | null | undefined) => {
      if (!p) return;
      const s = String(p).trim();
      const n = parseInt(s, 10);
      if (!isNaN(n) && n > 0 && n < 65536 && !seen.has(s)) {
        seen.add(s); list.push(s);
      }
    };

    // 1. Primary port (user-specified or last argument)
    add(primaryPort);

    // 2. Saved port from storage
    const savedPort = await AsyncStorage.getItem(KEYS.PORT).catch(() => null);
    add(savedPort);

    // 3. Golden list ports
    await this.loadKnownGood();
    this._knownGoodIPs.forEach(e => add(e.port));

    // 4. All common ports
    ALL_COMMON_PORTS.forEach(p => add(p));

    return list;
  }

  // ── Device ID ────────────────────────────────────────────────
  // CRITICAL: must read from the SAME storage key as deviceIdentifier.ts
  // (no '@' prefix). Previous bug: '@commandcube_device_id' vs 'commandcube_device_id'
  // caused a new device ID to be generated every session → server always saw alien device.
  private async _ensureDeviceId(): Promise<string> {
    if (this._device) return this._device;
    // Delegate to deviceIdentifier — which produces a hardware-derived stable ID
    // (butler-hw-<32hex>) that survives APK rebuilds and reinstalls.
    // It writes to the same KEYS.DEVICE_ID ('commandcube_device_id') so storage
    // is always consistent between both services.
    const id = await deviceIdentifier.getDeviceId();
    this._device = id;
    return id;
  }

  // ── Load from storage ────────────────────────────────────────
  async load(): Promise<boolean> {
    try {
      await loadAuthDisabled(); // sync auth-disabled flag on every load
      const [[, ip],[, port],[, device],[, token]] = await AsyncStorage.multiGet([
        KEYS.IP, KEYS.PORT, KEYS.DEVICE_ID, KEYS.TOKEN,
      ]);
      this._ip     = ip     || '';
      this._port   = port   || '';
      this._device = device || '';
      this._token  = token  || '';
      this._storageLoaded = true; // mark cache warm
      return !!(this._ip && this._port);
    } catch { return false; }
  }

  // ── Persist ──────────────────────────────────────────────────
  private async _save(): Promise<void> {
    this._storageLoaded = false; // invalidate cache so next load re-reads fresh
    await AsyncStorage.multiSet([
      [KEYS.IP,        this._ip],
      [KEYS.PORT,      this._port],
      [KEYS.DEVICE_ID, this._device],
      [KEYS.TOKEN,     this._token],
      [KEYS.PAIRED_AT, new Date().toISOString()],
    ]).catch(() => {});
    this._storageLoaded = true; // re-mark warm after write
  }

  private _notify() {
    const s = this.state;
    this._listeners.forEach(cb => { try { cb(s); } catch {} });
  }

  // ── Build auth header string (respects global auth-disabled flag) ─
  buildAuthHeader(): string | null {
    if (_authDisabled) return null;
    return this._token ? `Bearer ${this._token}` : null;
  }

  // ── Build full request headers (auth + X-Device-Id) ─────────
  // Server uses X-Device-Id for per-device rate limiting and better auth context.
  buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!_authDisabled && this._token) h['Authorization'] = `Bearer ${this._token}`;
    if (this._device) h['X-Device-Id'] = this._device;
    if (extra) Object.assign(h, extra);
    return h;
  }
  // FIX 1A — ensure storage is loaded into memory once
  private async _ensureLoaded(): Promise<void> {
    if (this._storageLoaded) return;
    try {
      const [[, ip],[, port],[, device],[, token]] = await AsyncStorage.multiGet([
        KEYS.IP, KEYS.PORT, KEYS.DEVICE_ID, KEYS.TOKEN,
      ]);
      if (ip)     this._ip     = ip;
      if (port)   this._port   = port;
      if (device) this._device = device;
      if (token)  this._token  = token;
      this._storageLoaded = true;
    } catch {}
  }

  async loadKnownGood(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(KNOWN_GOOD_KEY);
      if (raw) this._knownGoodIPs = JSON.parse(raw).slice(0, 10);
    } catch {}
  }

  async saveKnownGood(ip: string, port: string): Promise<void> {
    this._knownGoodIPs = [
      { ip, port },
      ...this._knownGoodIPs.filter(e => !(e.ip === ip && e.port === port)),
    ].slice(0, 10);
    await AsyncStorage.setItem(KNOWN_GOOD_KEY, JSON.stringify(this._knownGoodIPs)).catch(() => {});
  }

  getKnownGoodIPs(): Array<{ ip: string; port: string }> { return [...this._knownGoodIPs]; }

  // ── Ultra-fast ping — tries /api/status AND /health (works with any server) ──
  async quickPing(ip: string, port: string): Promise<number | null> {
    await this._ensureLoaded();
    const t0 = Date.now();
    for (const path of ['/api/status', '/health', '/status', '/']) {
      try {
        const ctrl = new AbortController();
        const tid  = setTimeout(() => ctrl.abort(), 8000);
        const res  = await fetch(`http://${ip}:${port}${path}`, { signal: ctrl.signal });
        clearTimeout(tid);
        // Absorb self-healed token if present in health response
        const ht = res.headers.get('X-New-Token');
        if (ht && ht !== this._token) { this._token = ht; this._save().catch(() => {}); }
        if (res.status < 500) return Date.now() - t0;
      } catch {}
    }
    return null;
  }

  // ── Full adaptive ping ────────────────────────────────────────
  // Tries: primary port → adaptive port list → multiple endpoint paths
  // Automatically discovers whatever port the server is on.
  async ping(ip: string, port: string, timeoutMs = 10000): Promise<ConnResult & { resolvedPort?: string }> {
    await this._ensureLoaded();
    const t0 = Date.now();
    const portList = await this._buildAdaptivePortList(port);

    // ── PHASE 1: Try primary port with a generous timeout first ──
    // This prevents the scanner from wasting time on wrong ports when
    // the server IS running on the correct port but is slightly slow.
    if (port) {
      for (const path of ['/health', '/api/status', '/status']) {
        try {
          const ctrl = new AbortController();
          const tid  = setTimeout(() => ctrl.abort(), 6000); // 6s for primary port
          const res  = await fetch(`http://${ip}:${port}${path}`, { signal: ctrl.signal });
          clearTimeout(tid);
          if (res.status < 500) {
            return { success: true, connected: true, latency: Date.now() - t0, resolvedPort: port };
          }
        } catch (e: any) {
          const msg = (e?.message ?? '').toLowerCase();
          if (msg.includes('refused') || msg.includes('econnrefused')) break;
        }
      }
    }

    // ── PHASE 2: Fallback scan of other common ports ──
    for (const tryPort of portList) {
      if (tryPort === port) continue; // already tried above
      for (const path of PROBE_PATHS) {
        if (Date.now() - t0 > timeoutMs) break;
        try {
          const ctrl = new AbortController();
          const tid   = setTimeout(() => ctrl.abort(), 1500);
          const res   = await fetch(`http://${ip}:${tryPort}${path}`, { signal: ctrl.signal });
          clearTimeout(tid);
          const latency = Date.now() - t0;

          if (res.status < 500) {
            // Found a responsive server — update stored port if different
            if (tryPort !== this._port && tryPort !== port) {
              this._port = tryPort;
              await AsyncStorage.setItem(KEYS.PORT, tryPort).catch(() => {});
            }
            return { success: true, connected: true, latency, resolvedPort: tryPort };
          }
        } catch (e: any) {
          const msg = (e?.message ?? '').toLowerCase();
          if (msg.includes('refused') || msg.includes('econnrefused')) break;
          if (e?.name === 'AbortError') break;
        }
      }
      if (Date.now() - t0 > timeoutMs + 2000) break;
    }

    return {
      success: false, connected: false,
      error: `No server found at ${ip} — ensure server is running on same WiFi network`,
      errorType: 'UNREACHABLE', latency: Date.now() - t0,
    };
  }

  // ── Auto-reconnect (locked device only) ─────────────────────
  async reconnect(): Promise<ConnResult> {
    if (!this._ip) {
      const ok = await this.load();
      if (!ok) return { success: false, connected: false, error: 'No saved server address' };
    }
    const deviceId = await this._ensureDeviceId();

    // Verify alive with adaptive ping (5s cap for reconnect speed)
    const health = await this.ping(this._ip, this._port, 5000);
    if (!health.connected) { this._ok = false; this._notify(); return health; }

    // Request fresh token
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 5000);
      const t0   = Date.now();
      const resolvedPort = (health as any).resolvedPort || this._port;
      const res  = await fetch(`http://${this._ip}:${resolvedPort}/reconnect`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ deviceId }),
        signal:  ctrl.signal,
      });
      clearTimeout(tid);
      const latency = Date.now() - t0;

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.status === 'ok' && data.sessionToken) {
          this._token = data.sessionToken;
          this._ok    = true;
          await this._save();
          this._notify();
          return { success: true, connected: true, latency };
        }
      }
      if (res.status === 403) {
        this._ok = false; this._notify();
        return { success: false, connected: false, error: 'Server locked to a different device', errorType: 'ALIEN' };
      }
      if (res.status === 404) {
        // Open server — connected without token
        this._ok = true; this._notify();
        return { success: true, connected: true, latency };
      }
    } catch {}

    this._ok = false; this._notify();
    return { success: false, connected: false, error: 'Reconnect failed', errorType: 'UNKNOWN' };
  }

  // ── Full QR pair ─────────────────────────────────────────────
  // Auto-unlock: if /pair returns 403, silently call /api/reset_pair then retry once.
  // The user never sees the lock error unless a different device holds the lock.
  async pair(ip: string, port: string, pairingCode: string = '', skipPing = false): Promise<ConnResult & { token?: string }> {
    const deviceId = await this._ensureDeviceId();
    // Discover the correct port — skip ping if caller already confirmed server is alive
    // (avoids 8-12s double-ping when called right after quickPing).
    let resolvedPort = port || this._port;
    if (!skipPing) {
      const health = await this.ping(ip, port, 12000);
      resolvedPort = (health as any).resolvedPort || port;
    }

    const attemptPair = async (): Promise<{ res: Response; latency: number; data: any } | null> => {
      try {
        const t0   = Date.now();
        const ctrl = new AbortController();
        const tid  = setTimeout(() => ctrl.abort(), 8000);
        const res  = await fetch(`http://${ip}:${resolvedPort}/pair`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ pairingCode, deviceId, platform: 'android' }),
          signal:  ctrl.signal,
        });
        clearTimeout(tid);
        const latency = Date.now() - t0;
        const data    = await res.json().catch(() => ({}));
        return { res, latency, data };
      } catch (e: any) {
        const msg = e?.name === 'AbortError' ? 'Connection timeout' : (e?.message ?? 'Unknown');
        throw Object.assign(new Error(msg), { errorType: 'TIMEOUT' });
      }
    };

    try {
      let attempt = await attemptPair();
      let { res, latency, data } = attempt!;

      // 403 = server locked to a DIFFERENT device.
      // Only try /api/reset_pair if the caller provided a real pairingCode
      // (visible on the PC screen) — never reset blindly with an empty code.
      // An empty-code reset would kick a legitimately paired device off the server.
      if (res.status === 403 && pairingCode && pairingCode.length >= 4) {
        try {
          const resetCtrl = new AbortController();
          const resetTid  = setTimeout(() => resetCtrl.abort(), 4000);
          await fetch(`http://${ip}:${resolvedPort}/api/reset_pair`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ pairingCode }),
            signal:  resetCtrl.signal,
          });
          clearTimeout(resetTid);
        } catch { /* reset is best-effort */ }

        // Small delay to let server process the reset
        await new Promise(r => setTimeout(r, 400));

        // Retry pair
        const retry = await attemptPair();
        res     = retry!.res;
        latency = retry!.latency;
        data    = retry!.data;
      }

      // Accept any 2xx response with a sessionToken — server may return 200 with ok/success
      const hasToken = data.sessionToken || data.token;
      if ((res.ok || res.status < 300) && hasToken) {
        // Normalise the token field
        if (!data.sessionToken) data.sessionToken = data.token;
        // Also handle servers that don't return data.status === 'ok' (custom servers)
      }
      if ((res.ok || res.status < 300) && (data.sessionToken || data.token)) {
        if (!data.sessionToken) data.sessionToken = data.token;
      }
      if (res.ok && (data.sessionToken || data.token)) {
        this._ip    = ip;
        this._port  = resolvedPort;
        this._token = data.sessionToken || data.token || '';
        this._ok    = true;
        await this._save();
        await this.saveKnownGood(ip, resolvedPort);
        this._notify();
        // Silent token verification — fire-and-forget, just logs if it fails
        const verifyDeviceId = this._device;
        const verifyToken    = data.sessionToken;
        fetch(`http://${ip}:${resolvedPort}/api/verify`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${verifyToken}` },
          body:    JSON.stringify({ deviceId: verifyDeviceId }),
        }).then(r => { if (!r.ok) console.warn('[Pair] Token verify failed:', r.status); }).catch(() => {});
        return { success: true, connected: true, latency, token: data.sessionToken };
      }
      if (res.status === 403) return { success: false, connected: false, error: data.error || 'Server locked to another device', errorType: 'ALIEN' };
      if (res.status === 401) return { success: false, connected: false, error: data.error || 'Wrong pairing code', errorType: 'AUTH' };
      // Some custom servers return 200 with an error field instead of the sessionToken
      // Try connectManual as a last resort (works with auth-off servers)
      if (res.ok && !data.sessionToken && !data.token) {
        this._ip   = ip;
        this._port = resolvedPort;
        this._ok   = true;
        await this._save();
        await this.saveKnownGood(ip, resolvedPort);
        this._notify();
        return { success: true, connected: true, latency, token: '' };
      }
      return { success: false, connected: false, error: data.message || data.error || `HTTP ${res.status}` };
    } catch (e: any) {
      const msg = e?.message ?? 'Unknown';
      return { success: false, connected: false, error: msg, errorType: e?.errorType ?? 'TIMEOUT' };
    }
  }

  // ── Manual save (silent — no notify so UI doesn't flicker mid-connect) ────
  async saveManual(ip: string, port: string): Promise<void> {
    this._ip   = ip;
    this._port = port;
    await this._ensureDeviceId();
    // Persist to storage only — do NOT call _notify() here
    // _notify() is called only after a successful connection is confirmed
    await AsyncStorage.multiSet([
      [KEYS.IP,        this._ip],
      [KEYS.PORT,      this._port],
      [KEYS.DEVICE_ID, this._device],
      [KEYS.TOKEN,     this._token],
    ]).catch(() => {});
  }

  // ── Full manual connect ──────────────────────────────────────
  // Adaptively discovers the right port if the primary doesn't work.
  async connectManual(ip: string, port: string): Promise<ConnResult> {
    await this._ensureLoaded();
    // Save immediately so other tabs see the IP even before we confirm
    await this.saveManual(ip, port);

    // Adaptive ping — tries primary port then all common ports
    const health = await this.ping(ip, port, 12000);
    if (!health.connected) { this._ok = false; this._notify(); return health; }

    const resolvedPort = (health as any).resolvedPort || port;
    this._ip   = ip;
    this._port = resolvedPort;

    // Persist the actually-working port immediately
    await AsyncStorage.multiSet([
      [KEYS.IP,   ip],
      [KEYS.PORT, resolvedPort],
    ]).catch(() => {});

    // ── Authenticate: try /pair (BOTER server) then /reconnect (fallback) ──────
    const deviceId = await this._ensureDeviceId();
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 5000);
      const res  = await fetch(`http://${ip}:${resolvedPort}/reconnect`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ deviceId }),
        signal:  ctrl.signal,
      });
      clearTimeout(tid);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        // Accept sessionToken or token (both field names used by various servers)
        const tok = data.sessionToken || data.token;
        if (tok) { this._token = tok; await this._save(); }
        // Absorb self-healed token injected by BOTER server's _authed()
        const ht = res.headers.get('X-New-Token');
        if (ht && ht !== this._token) { this._token = ht; await this._save(); }
        if (data.newToken && data.newToken !== this._token) { this._token = data.newToken; await this._save(); }
      } else if (res.status === 403) {
        // Try /pair — server may auto-unlock after 5min stale
        const pc  = new AbortController();
        setTimeout(() => pc.abort(), 8000);
        try {
          const pr  = await fetch(`http://${ip}:${resolvedPort}/pair`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ deviceId }),
            signal:  pc.signal,
          });
          if (pr.ok) {
            const pd = await pr.json().catch(() => ({}));
            const tok = pd.sessionToken || pd.token;
            if (tok) {
              this._token = tok;
              this._ok    = true;
              this._ip    = ip;
              this._port  = resolvedPort;
              await this._save();
              await this.saveKnownGood(ip, resolvedPort);
              this._notify();
              return { success: true, connected: true, latency: health.latency };
            }
          }
        } catch {}
        this._ok = false;
        this._notify();
        return { success: false, connected: false, error: 'Server locked to a different device', errorType: 'ALIEN' };
      }
    } catch {
      // /reconnect absent on this server — open mode, continue
    }
    // ── Try /pair directly (BOTER server first-connect, or server without /reconnect) ──
    try {
      const pc = new AbortController(); setTimeout(() => pc.abort(), 5000);
      const pr = await fetch(`http://${ip}:${resolvedPort}/pair`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }), signal: pc.signal,
      });
      if (pr.ok) {
        const pd = await pr.json().catch(() => ({}));
        const tok = pd.sessionToken || pd.token;
        if (tok) { this._token = tok; await this._save(); }
        const ht = pr.headers.get('X-New-Token');
        if (ht) { this._token = ht; await this._save(); }
        if (pd.newToken) { this._token = pd.newToken; await this._save(); }
      } else if (pr.status === 403) {
        this._ok = false; this._notify();
        return { success: false, connected: false, error: 'Server locked to a different device', errorType: 'ALIEN' };
      }
    } catch { /* no /pair endpoint — open server, token-less connection is fine */ }

    this._ok = true;
    await this.saveKnownGood(ip, resolvedPort);
    this._notify();
    // Update feature gate from /api/status response
    this._probeFeatures(ip, resolvedPort).catch(() => {});
    return { success: true, connected: true, latency: health.latency };
  }

  // ── Probe /api/status to populate feature gate ───────────────
  private async _probeFeatures(ip: string, port: string): Promise<void> {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(`http://${ip}:${port}/api/status`, { signal: ctrl.signal });
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        features.setFromStatus(j);
      }
    } catch {}
  }

  // ── Token auto-heal: absorb newToken from any server response ─────────────
  // Call this after every authenticated fetch so self-healed tokens are saved.
  async absorbHealedToken(res: Response, data?: any): Promise<void> {
    try {
      // Check X-New-Token header first (fastest path)
      const headerToken = res.headers.get('X-New-Token');
      if (headerToken && headerToken !== this._token) {
        this._token = headerToken;
        await this._save();
        console.log('[AUTH] Token auto-healed via X-New-Token header');
        return;
      }
      // Fall back to body newToken field
      if (data && data.newToken && data.newToken !== this._token) {
        this._token = data.newToken;
        await this._save();
        console.log('[AUTH] Token auto-healed via response body newToken');
      }
    } catch {}
  }

  // ── fetchWithAuth — auto-refreshes token on 401, absorbs healed tokens ─────
  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this._token ? { Authorization: `Bearer ${this._token}` } : {}),
      ...(this._device ? { 'X-Device-Id': this._device } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };
    let res = await fetch(url, { ...options, headers });

    // Absorb self-healed token from header immediately (before reading body)
    const headerToken = res.headers.get('X-New-Token');
    if (headerToken && headerToken !== this._token) {
      this._token = headerToken;
      await this._save();
      console.log('[AUTH] Token auto-healed via X-New-Token header (fetchWithAuth)');
    }

    if (res.status === 401 && this._ip && this._port) {
      await this.connectManual(this._ip, this._port).catch(() => {});
      const refreshed = { ...headers, Authorization: `Bearer ${this._token}` };
      res = await fetch(url, { ...options, headers: refreshed });
    }
    return res;
  }

  // ── Disconnect ───────────────────────────────────────────────
  async disconnect(): Promise<void> {
    this._ok    = false;
    this._token = '';
    await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.PAIRED_AT]).catch(() => {});
    this._notify();
  }

  async clearAll(): Promise<void> {
    this._ip = this._port = this._device = this._token = '';
    this._ok = false;
    await AsyncStorage.multiRemove(Object.values(KEYS)).catch(() => {});
    this._notify();
  }

  onStateChange(cb: (s: ConnState) => void): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }
}

export const serverConnection = ServerConnectionService.getInstance();
