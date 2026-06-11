/**
 * ⚡ SCRIPT EXECUTOR SERVICE
 * Sends scripts to connected PC server for real execution
 * Handles streaming output, timeouts, and error reporting
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiLogger } from './aiLogger';
import { serverConnection } from './serverConnection';

export interface ExecutionResult {
  success: boolean;
  output: string;
  exitCode?: number;
  executionTime?: number;
  error?: string;
}

export interface ExecutionOptions {
  timeout?: number; // ms
  onOutput?: (chunk: string) => void; // streaming callback
}

class ScriptExecutorService {
  // ── Get saved server ────────────────────────────────────────
  private async getServer(): Promise<{ ip: string; port: string } | null> {
    try {
      const ip = await AsyncStorage.getItem('commandcube_server_ip');
      const port = await AsyncStorage.getItem('commandcube_server_port');
      if (ip && port) return { ip, port };
      return null;
    } catch {
      return null;
    }
  }

  // ── Get session token (with auto-refresh via /reconnect) ────
  private async getToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('commandcube_session_token');
      if (token) return token;
      // No token stored — try to reconnect to get a fresh one
      const { serverConnection } = await import('./serverConnection');
      const result = await serverConnection.reconnect();
      if (result.success) {
        return await AsyncStorage.getItem('commandcube_session_token');
      }
      return null;
    } catch {
      return null;
    }
  }

  // ── Test server reachability ───────────────────────────────
  async isServerReachable(): Promise<boolean> {
    const server = await this.getServer();
    if (!server) return false;

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`http://${server.ip}:${server.port}/api/status`, {
        signal: controller.signal,
      });
      clearTimeout(id);
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── Execute script on PC server ────────────────────────────
  async execute(
    scriptCode: string,
    language: string = 'python',
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    // FIX 2A — raised from 30s to 90s: pip auto-install can take 30-90s
    const { timeout = 90000, onOutput } = options;
    const start = Date.now();

    aiLogger.info(`⚡ Executing ${language} script (${scriptCode.length} chars)...`);

    // Get server — use in-memory cache via serverConnection first
    let serverIp = serverConnection.getIP();
    let serverPort = serverConnection.getPort();
    if (!serverIp || !serverPort) {
      const server = await this.getServer();
      if (!server) {
        return {
          success: false,
          output: '',
          error: 'No server connected. Go to CONNECT tab and pair with your PC.',
        };
      }
      serverIp = server.ip;
      serverPort = server.port;
    }

    // Build endpoint
    const url = `http://${serverIp}:${serverPort}/api/execute`;
    const token = serverConnection.getToken() || await this.getToken();

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ script: scriptCode, language }),
        signal: controller.signal,
      });

      clearTimeout(id);

      if (!response.ok) {
        const errText = await response.text().catch(() => `HTTP ${response.status}`);
        aiLogger.error(`❌ Server returned ${response.status}: ${errText}`);
        return {
          success: false,
          output: '',
          error: `Server error ${response.status}: ${errText}`,
        };
      }

      const data = await response.json();
      const elapsed = Date.now() - start;

      const output: string = data.output ?? data.result ?? data.stdout ?? '';
      const exitCode: number = data.exitCode ?? data.exit_code ?? 0;
      const serverError: string = data.error ?? data.stderr ?? '';

      // #4 AUTO-INSTALL MISSING pip PACKAGES
      const finalOutputRaw = [output, serverError].filter(Boolean).join('\n');
      const missingModule = finalOutputRaw.match(/No module named '([^']+)'/);
      if (missingModule && serverConnection.isConnected()) {
        const pkg = missingModule[1].split('.')[0]; // top-level package
        onOutput?.(`\u{1F4E6} Auto-installing ${pkg}...\n`);
        (global as any).__showConnectionToast?.(`Auto-installing ${pkg}...`, '#FF8C00');
        try {
          await fetch(`http://${serverIp}:${serverPort}/api/pip/install`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ package: pkg }),
          });
          // #10 INFINITE LOOP GUARD: _retry flag prevents infinite retry loop
          if (!(options as any)?._retry) {
            return this.execute(scriptCode, language, { ...options, _retry: true } as any);
          }
        } catch {}
      }

      const finalOutput = [output, serverError].filter(Boolean).join('\n');

      if (data.status === 'error' || exitCode !== 0) {
        aiLogger.error(`❌ Script exited with code ${exitCode}`);
        return {
          success: false,
          output: finalOutput,
          exitCode,
          executionTime: elapsed,
          error: serverError || `Exit code ${exitCode}`,
        };
      }

      aiLogger.success(`✅ Script completed in ${elapsed}ms`);
      onOutput?.(finalOutput);

      return {
        success: true,
        output: finalOutput,
        exitCode: 0,
        executionTime: elapsed,
      };
    } catch (err: any) {
      const elapsed = Date.now() - start;
      const msg = err?.name === 'AbortError'
        ? `Timeout after ${timeout / 1000}s — is the server still running?`
        : err?.message ?? 'Unknown error';

      aiLogger.error(`❌ Execution failed: ${msg}`);
      return { success: false, output: '', executionTime: elapsed, error: msg };
    }
  }

  // ── SSE Streaming execution (Prompt 4) ────────────────────────
  // Uses /api/execute/stream if server supports it (features.has('execute-stream')).
  // Falls back to regular execute() for older servers transparently.
  async executeStream(
    scriptCode: string,
    opts: { onChunk: (line: string) => void; signal?: AbortSignal }
  ): Promise<{ exitCode: number; ms: number }> {
    const start = Date.now();

    // Feature gate: fall back gracefully for older servers
    let useStream = false;
    try {
      const { features } = await import('./serverFeatures');
      useStream = features.has('execute-stream');
    } catch {}

    if (!useStream) {
      // Legacy path — call regular execute + emit full output as one chunk
      const r = await this.execute(scriptCode, 'python');
      if (r.output) opts.onChunk(r.output);
      if (r.error)  opts.onChunk(`ERROR: ${r.error}`);
      return { exitCode: r.exitCode ?? (r.success ? 0 : 1), ms: r.executionTime ?? (Date.now() - start) };
    }

    const server = await this.getServer();
    if (!server) throw new Error('Not connected');
    const token = await this.getToken();

    const ctrl = new AbortController();
    const tid   = setTimeout(() => ctrl.abort(), 90_000);
    // Merge caller signal with our timeout
    if (opts.signal) {
      opts.signal.addEventListener('abort', () => ctrl.abort());
    }

    try {
      const res = await fetch(`http://${server.ip}:${server.port}/api/execute/stream`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body:   JSON.stringify({ script: scriptCode, language: 'python' }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        // Server responded but not streaming — fall back
        const text = await res.text().catch(() => '');
        if (text) opts.onChunk(text);
        return { exitCode: res.ok ? 0 : 1, ms: Date.now() - start };
      }

      const reader  = (res.body as any).getReader();
      const decoder = new TextDecoder();
      let buf      = '';
      let exitCode = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const event    = buf.slice(0, idx);
          buf            = buf.slice(idx + 2);
          const dataLine = event.split('\n').find(l => l.startsWith('data: '));
          if (!dataLine) continue;
          try {
            const j = JSON.parse(dataLine.slice(6));
            if (j.chunk)     opts.onChunk(j.chunk);
            if (j.done)      exitCode = j.exitCode ?? 0;
            if (j.error && !j.done) opts.onChunk(`ERROR: ${j.error}\n`);
          } catch {}
        }
      }

      return { exitCode, ms: Date.now() - start };
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      // Network error — fall back to standard execute
      const r = await this.execute(scriptCode, 'python');
      if (r.output) opts.onChunk(r.output);
      if (r.error)  opts.onChunk(`ERROR: ${r.error}`);
      return { exitCode: r.exitCode ?? 1, ms: Date.now() - start };
    } finally {
      clearTimeout(tid);
    }
  }

  // ── Scripts ETag cache (Prompt 10) ───────────────────────────
  // Fetches library only when server ETag changes — eliminates full refetch on every mount.
  async fetchLibraryWithETag(): Promise<any> {
    const server = await this.getServer();
    if (!server) return null;
    const token = await this.getToken();

    try {
      const savedEtag = await AsyncStorage.getItem('@scripts_etag_v1');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (savedEtag) headers['If-None-Match'] = savedEtag;

      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 8_000);
      const res = await fetch(`http://${server.ip}:${server.port}/api/scripts/library`, {
        headers, signal: ctrl.signal,
      });

      // 304 Not Modified — use cached data
      if (res.status === 304) {
        const cached = await AsyncStorage.getItem('@scripts_data_v1');
        return cached ? JSON.parse(cached) : null;
      }

      if (!res.ok) return null;

      const etag = res.headers.get('ETag');
      const j    = await res.json();

      if (etag) await AsyncStorage.setItem('@scripts_etag_v1', etag).catch(() => {});
      await AsyncStorage.setItem('@scripts_data_v1', JSON.stringify(j)).catch(() => {});

      return j;
    } catch { return null; }
  }

  // ── Save script to PC (Prompt 10) ────────────────────────────
  async uploadScriptToPC(name: string, script: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const { features } = await import('./serverFeatures');
      if (!features.has('scripts-upload')) {
        return { ok: false, error: 'Update your server to v8+ to enable script upload' };
      }
    } catch {}

    const server = await this.getServer();
    if (!server) return { ok: false, error: 'Not connected' };
    const token = await this.getToken();

    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 8_000);
      const res = await fetch(`http://${server.ip}:${server.port}/api/scripts/upload`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body:    JSON.stringify({ name, script }),
        signal:  ctrl.signal,
      });
      const j = await res.json().catch(() => ({}));
      return { ok: res.ok && (j.ok !== false), error: j.error };
    } catch (e: any) { return { ok: false, error: e?.message }; }
  }

  // ── Quick one-liner test ────────────────────────────────────
  async runQuickTest(): Promise<ExecutionResult> {
    const testScript = `
import platform, datetime, socket
print("✅ BUTLER SERVER OK")
print(f"OS: {platform.system()} {platform.release()}")
print(f"Host: {socket.gethostname()}")
print(f"Time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
`.trim();
    return this.execute(testScript);
  }
}

export const scriptExecutor = new ScriptExecutorService();
