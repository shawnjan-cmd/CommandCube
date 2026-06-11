/**
 * ΛSCAN — Local Filesystem Scanner Service
 * Connects to butler_server.py /api/fs/* endpoints
 * Bulletproof: validates all data, handles corruption, auto-retries
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { serverConnection } from './serverConnection';

const SCAN_HISTORY_KEY = '@lambda_scan_history_v1';
const MAX_HISTORY = 50;

// ─── Types ────────────────────────────────────────────────────────

export interface ScannedFile {
  path:     string;
  name:     string;
  ext:      string;
  size_kb:  number;
  modified: string;
  relative: string;
  content?: string;
  truncated?: boolean;
  lines?:   number;
}

export interface ScanResult {
  ok:        boolean;
  root:      string;
  pattern:   string;
  files:     ScannedFile[];
  total:     number;
  scanned:   number;
  latencyMs: number;
  method:    string;
  error?:    string;
  timestamp: string;
}

export interface DriveEntry {
  path:      string;
  label:     string;
  free_gb:   number | null;
  total_gb:  number | null;
}

export interface ScanHistoryEntry {
  id:        string;
  root:      string;
  pattern:   string;
  total:     number;
  latencyMs: number;
  timestamp: string;
}

// ─── Validation Helpers ────────────────────────────────────────────

function validateScannedFile(f: any): f is ScannedFile {
  return (
    typeof f === 'object' && f !== null &&
    typeof f.path    === 'string' && f.path.length > 0 &&
    typeof f.name    === 'string' && f.name.length > 0 &&
    typeof f.ext     === 'string' &&
    typeof f.size_kb === 'number' && f.size_kb >= 0 &&
    typeof f.modified === 'string' &&
    typeof f.relative === 'string'
  );
}

function sanitizeScannedFile(f: any): ScannedFile | null {
  if (!validateScannedFile(f)) return null;
  return {
    path:     String(f.path).slice(0, 512),
    name:     String(f.name).slice(0, 128),
    ext:      String(f.ext).slice(0, 16).toLowerCase(),
    size_kb:  Math.max(0, Number(f.size_kb) || 0),
    modified: String(f.modified).slice(0, 32),
    relative: String(f.relative || f.name).slice(0, 256),
    content:  typeof f.content === 'string' ? f.content.slice(0, 65536) : undefined,
    truncated: Boolean(f.truncated),
    lines:    typeof f.lines === 'number' ? Math.max(0, f.lines) : undefined,
  };
}

// ─── ΛSCAN Service ─────────────────────────────────────────────────

class LambdaScanService {
  private _lastScanResult: ScanResult | null = null;
  private _drives: DriveEntry[] = [];
  private _drivesLoadedAt = 0;

  private _getBase(): { ip: string; port: string; token: string } | null {
    const ip    = serverConnection.getIP();
    const port  = serverConnection.getPort();
    const token = serverConnection.getToken();
    if (!ip || !port) return null;
    return { ip, port, token };
  }

  private _headers(token: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * List available drives / root paths from the PC.
   * Cached for 60 seconds.
   */
  async getDrives(forceRefresh = false): Promise<DriveEntry[]> {
    const base = this._getBase();
    if (!base) return [];

    const age = Date.now() - this._drivesLoadedAt;
    if (!forceRefresh && this._drives.length > 0 && age < 60_000) {
      return this._drives;
    }

    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`http://${base.ip}:${base.port}/api/fs/drives`, {
        signal: ctrl.signal,
        headers: this._headers(base.token),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.drives)) throw new Error('Invalid drives response');
      // Validate and sanitize
      this._drives = data.drives.filter((d: any) =>
        d && typeof d.path === 'string' && typeof d.label === 'string'
      ).map((d: any) => ({
        path:     String(d.path).slice(0, 256),
        label:    String(d.label).slice(0, 64),
        free_gb:  typeof d.free_gb  === 'number' ? d.free_gb  : null,
        total_gb: typeof d.total_gb === 'number' ? d.total_gb : null,
      }));
      this._drivesLoadedAt = Date.now();
      return this._drives;
    } catch (e: any) {
      console.warn('[ΛSCAN] getDrives error:', e?.message);
      return this._drives; // Return cached if available
    }
  }

  /**
   * Scan a directory on the PC for Python/text files.
   * Full validation, corruption prevention, auto-retry once on timeout.
   */
  async scanDirectory(opts: {
    root:           string;
    pattern?:       string;
    extensions?:    string[];
    maxResults?:    number;
    includeContent?: boolean;
    maxDepth?:      number;
  }, attempt = 1): Promise<ScanResult> {
    const base = this._getBase();
    if (!base) {
      return {
        ok: false, root: opts.root, pattern: opts.pattern || '', files: [],
        total: 0, scanned: 0, latencyMs: 0, method: 'LAMBDA-SCAN',
        error: 'No server connected — pair your PC in CONNECT tab',
        timestamp: new Date().toISOString(),
      };
    }

    // Sanitize input
    const body = {
      root:           String(opts.root || '').slice(0, 256),
      pattern:        String(opts.pattern || '').slice(0, 100),
      extensions:     Array.isArray(opts.extensions) ? opts.extensions.map(e => String(e).slice(0, 10)) : undefined,
      maxResults:     Math.min(Math.max(Number(opts.maxResults) || 20, 1), 50),
      includeContent: Boolean(opts.includeContent),
      maxDepth:       Math.min(Math.max(Number(opts.maxDepth) || 4, 1), 8),
    };

    const t0 = Date.now();
    try {
      const timeout = (opts.includeContent ? 30000 : 15000);
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), timeout);

      const res = await fetch(`http://${base.ip}:${base.port}/api/fs/crawl`, {
        method:  'POST',
        headers: this._headers(base.token),
        body:    JSON.stringify(body),
        signal:  ctrl.signal,
      });

      const ms = Date.now() - t0;

      if (res.status === 401) {
        return { ok: false, root: opts.root, pattern: opts.pattern || '', files: [], total: 0, scanned: 0, latencyMs: ms, method: 'LAMBDA-SCAN', error: 'Unauthorized — reconnect in CONNECT tab', timestamp: new Date().toISOString() };
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error('Invalid JSON response from server');
      }

      // Validate response structure
      if (typeof data !== 'object' || data === null) {
        throw new Error('Corrupted scan response');
      }
      if (data.error) {
        return { ok: false, root: opts.root, pattern: opts.pattern || '', files: [], total: 0, scanned: data.scanned || 0, latencyMs: ms, method: 'LAMBDA-SCAN', error: String(data.error), timestamp: new Date().toISOString() };
      }

      // Sanitize files array
      const rawFiles: any[] = Array.isArray(data.files) ? data.files : [];
      const safeFiles: ScannedFile[] = [];
      for (const f of rawFiles) {
        const safe = sanitizeScannedFile(f);
        if (safe) safeFiles.push(safe);
      }

      const result: ScanResult = {
        ok:        true,
        root:      String(data.root || opts.root).slice(0, 256),
        pattern:   String(data.pattern || opts.pattern || '').slice(0, 100),
        files:     safeFiles,
        total:     Math.max(0, Number(data.total) || safeFiles.length),
        scanned:   Math.max(0, Number(data.scanned) || 0),
        latencyMs: ms,
        method:    'LAMBDA-SCAN',
        timestamp: new Date().toISOString(),
      };

      this._lastScanResult = result;
      await this._addToHistory(result);
      return result;

    } catch (e: any) {
      const ms = Date.now() - t0;
      const isTimeout = e?.name === 'AbortError';

      // Auto-retry once on timeout with reduced scope
      if (isTimeout && attempt === 1) {
        console.warn('[ΛSCAN] Timeout, retrying with reduced depth/results...');
        return this.scanDirectory({ ...opts, maxDepth: Math.min(2, (opts.maxDepth || 4) - 1), maxResults: Math.min(10, (opts.maxResults || 20) - 5), includeContent: false }, 2);
      }

      return {
        ok: false, root: opts.root, pattern: opts.pattern || '', files: [],
        total: 0, scanned: 0, latencyMs: ms, method: 'LAMBDA-SCAN',
        error: isTimeout ? 'Scan timeout — try a shallower directory or add a pattern filter' : String(e?.message || 'Unknown error'),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Read a specific file from the PC.
   * Returns validated content with corruption checks.
   */
  async readFile(filePath: string): Promise<{ ok: boolean; content: string; size_kb: number; lines: number; error?: string }> {
    const base = this._getBase();
    if (!base) return { ok: false, content: '', size_kb: 0, lines: 0, error: 'No server connected' };
    if (!filePath || typeof filePath !== 'string' || filePath.length < 2) {
      return { ok: false, content: '', size_kb: 0, lines: 0, error: 'Invalid file path' };
    }

    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(`http://${base.ip}:${base.port}/api/fs/read`, {
        method:  'POST',
        headers: this._headers(base.token),
        body:    JSON.stringify({ path: filePath.slice(0, 512) }),
        signal:  ctrl.signal,
      });

      if (res.status === 401) return { ok: false, content: '', size_kb: 0, lines: 0, error: 'Unauthorized — reconnect in CONNECT tab' };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      let data: any;
      try { data = await res.json(); } catch { throw new Error('Invalid JSON from server'); }

      if (!data.ok) return { ok: false, content: '', size_kb: 0, lines: 0, error: String(data.error || 'Read failed') };

      // Validate content
      const content = typeof data.content === 'string' ? data.content : '';
      if (content.length === 0) return { ok: false, content: '', size_kb: 0, lines: 0, error: 'File is empty' };

      // Sanity check: content should have valid characters
      const hasBinaryJunk = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(content.slice(0, 100));
      if (hasBinaryJunk) return { ok: false, content: '', size_kb: 0, lines: 0, error: 'File appears to be binary — cannot import' };

      return {
        ok:      true,
        content: content.slice(0, 256 * 1024), // 256KB hard cap
        size_kb: typeof data.size_kb === 'number' ? data.size_kb : Math.round(content.length / 1024),
        lines:   typeof data.lines   === 'number' ? data.lines   : content.split('\n').length,
      };
    } catch (e: any) {
      const isTimeout = e?.name === 'AbortError';
      return { ok: false, content: '', size_kb: 0, lines: 0, error: isTimeout ? 'Read timeout (15s)' : String(e?.message || 'Network error') };
    }
  }

  // ─── History ────────────────────────────────────────────────────

  private async _addToHistory(result: ScanResult): Promise<void> {
    try {
      const entry: ScanHistoryEntry = {
        id:        `scan-${Date.now()}`,
        root:      result.root,
        pattern:   result.pattern,
        total:     result.total,
        latencyMs: result.latencyMs,
        timestamp: result.timestamp,
      };
      const raw = await AsyncStorage.getItem(SCAN_HISTORY_KEY);
      const existing: ScanHistoryEntry[] = raw ? JSON.parse(raw) : [];
      const updated = [entry, ...existing].slice(0, MAX_HISTORY);
      await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updated));
    } catch {/* history is non-critical */}
  }

  async getHistory(): Promise<ScanHistoryEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(SCAN_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  async clearHistory(): Promise<void> {
    await AsyncStorage.removeItem(SCAN_HISTORY_KEY);
  }

  getLastResult(): ScanResult | null { return this._lastScanResult; }
}

export const lambdaScan = new LambdaScanService();
