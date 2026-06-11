/**
 * 🌐 SIGMA-NET RELAY CRAWLER
 * Server-Integrated Graph-Mapped Autonomous-crawler
 * via Network-Encoded Teleport Relay
 *
 * CONCEPT: Instead of crawling from Android (limited, blocked),
 * we TELEPORT the crawl request through the paired PC server.
 * The PC's Python process does the actual HTTP fetch (unrestricted),
 * applies cleaning, returns compressed clean text back to mobile.
 *
 * Mobile → [SIGMA-NET RELAY] → PC Server → Open Web → Data back
 *
 * Benefits:
 *  ✅ No Android SSL pinning / network policy blocks
 *  ✅ Full desktop browser User-Agent from the PC
 *  ✅ Access to sites that block mobile user agents
 *  ✅ PC can run the dedicated kb_crawler.py for deep crawls
 *  ✅ Unlimited concurrent fetches via Python asyncio
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { serverConnection } from './serverConnection';
import { knowledgeAccumulator, CompressedKnowledge } from './knowledgeAccumulator';

// ── Types ────────────────────────────────────────────────────────
export interface SigmaRelayRequest {
  url: string;
  domain: string;
  topic: string;
  mode?: 'fetch' | 'deep' | 'multi'; // multi = crawl + follow links
  maxLinks?: number;
  keywords?: string[]; // focus keywords for extraction
}

export interface SigmaRelayResult {
  url: string;
  domain: string;
  topic: string;
  cleanText: string;
  title?: string;
  wordCount: number;
  links?: string[];
  compressed?: CompressedKnowledge;
  error?: string;
  teleportedVia: string; // IP of relay server
  latencyMs: number;
  method: 'SIGMA-NET-RELAY' | 'DIRECT';
}

export interface BatchRelayResult {
  completed: number;
  failed: number;
  results: SigmaRelayResult[];
  totalWords: number;
  totalMs: number;
}

// ── Log callback type ────────────────────────────────────────────
export type RelayLogCallback = (msg: string, type?: 'info' | 'ok' | 'warn' | 'error') => void;

class SigmaNetRelayCrawler {
  private _relayAvailable = false;
  private _relayIp = '';
  private _relayPort = '';

  // ── Check if relay is available ───────────────────────────────
  async checkRelay(): Promise<boolean> {
    await serverConnection.load();
    const ip   = serverConnection.getIP();
    const port = serverConnection.getPort();
    if (!ip || !port) { this._relayAvailable = false; return false; }

    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`http://${ip}:${port}/api/status`, { signal: ctrl.signal });
      if (res.ok) {
        this._relayAvailable = true;
        this._relayIp = ip;
        this._relayPort = port;
        return true;
      }
    } catch {}
    this._relayAvailable = false;
    return false;
  }

  // ── Single URL crawl via SIGMA-NET relay ─────────────────────
  async crawlViaRelay(
    req: SigmaRelayRequest,
    onLog?: RelayLogCallback
  ): Promise<SigmaRelayResult> {
    const start = Date.now();
    const log = (msg: string, type: Parameters<RelayLogCallback>[1] = 'info') => onLog?.(msg, type);

    // Ensure relay is available
    if (!this._relayAvailable) {
      const ok = await this.checkRelay();
      if (!ok) {
        log('Server offline — crawl skipped (server handles all fetching)', 'warn');
        return {
          url: req.url, domain: req.domain, topic: req.topic,
          cleanText: '', wordCount: 0, error: 'Server offline — crawl skipped',
          teleportedVia: 'SKIPPED', latencyMs: 0, method: 'SIGMA-NET-RELAY' as any,
        };
      }
    }

    const token = serverConnection.getToken();
    log(`[SIGMA-NET] Teleporting request → ${this._relayIp}:${this._relayPort}`, 'info');
    log(`[RELAY] Fetching: ${req.url}`, 'info');

    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 35000);

      const res = await fetch(
        `http://${this._relayIp}:${this._relayPort}/api/crawl`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            url: req.url,
            domain: req.domain,
            topic: req.topic,
            mode: req.mode || 'fetch',
            maxLinks: req.maxLinks || 5,
            keywords: req.keywords || [],
          }),
          signal: ctrl.signal,
        }
      );

      const latencyMs = Date.now() - start;

      if (!res.ok) {
        if (res.status === 404) {
          // Server doesn't have /api/crawl yet — execute via /api/execute
          log('[SIGMA-NET] /api/crawl not found, using execute relay', 'warn');
          return this._executeRelayCrawl(req, onLog);
        }
        throw new Error(`Relay HTTP ${res.status}`);
      }

      const data = await res.json();
      log(`[RELAY] ✓ Received ${data.wordCount || 0} words in ${latencyMs}ms`, 'ok');

      const result: SigmaRelayResult = {
        url: req.url,
        domain: req.domain,
        topic: req.topic,
        cleanText: data.cleanText || data.text || '',
        title: data.title,
        wordCount: data.wordCount || 0,
        links: data.links || [],
        teleportedVia: `${this._relayIp}:${this._relayPort}`,
        latencyMs,
        method: 'SIGMA-NET-RELAY',
      };

      // Auto-compress and save
      if (result.cleanText.length > 50) {
        result.compressed = knowledgeAccumulator.compressResearch(
          result.cleanText, req.domain, req.topic, req.url
        );
        knowledgeAccumulator.addFinding(result.compressed);
        log(`[SIGMA-NET] Compressed + saved to KB`, 'ok');
      }

      return result;

    } catch (err: any) {
      const msg = err?.name === 'AbortError' ? 'Relay timeout (35s)' : err?.message || 'Unknown';
      log(`[SIGMA-NET] Relay failed: ${msg}`, 'warn');
      log('Server offline — crawl skipped (server handles all fetching)', 'warn');
      return {
        url: req.url, domain: req.domain, topic: req.topic,
        cleanText: '', wordCount: 0, error: `Relay failed: ${msg}`,
        teleportedVia: 'SKIPPED', latencyMs: Date.now() - start, method: 'SIGMA-NET-RELAY' as any,
      };
    }
  }

  // ── Batch multi-URL crawl via SIGMA-NET ──────────────────────
  async batchCrawlViaRelay(
    requests: SigmaRelayRequest[],
    onLog?: RelayLogCallback,
    onProgress?: (done: number, total: number) => void
  ): Promise<BatchRelayResult> {
    const log = (msg: string, type: Parameters<RelayLogCallback>[1] = 'info') => onLog?.(msg, type);
    log(`[SIGMA-NET BATCH] Starting ${requests.length} relay crawls`, 'info');

    const results: SigmaRelayResult[] = [];
    let failed = 0;
    let totalWords = 0;
    const batchStart = Date.now();

    // Check if we can use the multi-crawl endpoint
    if (this._relayAvailable) {
      try {
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 60000);
        const token = serverConnection.getToken();

        const res = await fetch(
          `http://${this._relayIp}:${this._relayPort}/api/crawl/batch`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ requests }),
            signal: ctrl.signal,
          }
        );

        if (res.ok) {
          const data = await res.json();
          log(`[SIGMA-NET BATCH] ✓ Batch complete: ${data.completed} done, ${data.failed} failed`, 'ok');
          await knowledgeAccumulator.saveNow();
          return data as BatchRelayResult;
        }
      } catch { /* fall through to sequential */ }
    }

    // Sequential fallback
    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];
      log(`[${i + 1}/${requests.length}] Relaying: ${req.url.slice(0, 50)}...`, 'info');
      try {
        const result = await this.crawlViaRelay(req, onLog);
        results.push(result);
        totalWords += result.wordCount;
        if (result.error) failed++;
        onProgress?.(i + 1, requests.length);
        await new Promise(r => setTimeout(r, 400)); // rate limit
      } catch (e: any) {
        failed++;
        results.push({
          url: req.url, domain: req.domain, topic: req.topic,
          cleanText: '', wordCount: 0, error: e?.message,
          teleportedVia: 'FAILED', latencyMs: 0, method: 'SIGMA-NET-RELAY',
        });
      }
    }

    await knowledgeAccumulator.saveNow();
    log(`[SIGMA-NET BATCH] All done: ${results.length - failed} success, ${failed} fail`, failed > 0 ? 'warn' : 'ok');

    return {
      completed: results.length - failed,
      failed,
      results,
      totalWords,
      totalMs: Date.now() - batchStart,
    };
  }

  // ── Execute-relay fallback: uses /api/execute + Python urllib ─
  private async _executeRelayCrawl(
    req: SigmaRelayRequest,
    onLog?: RelayLogCallback
  ): Promise<SigmaRelayResult> {
    const start = Date.now();
    const log = (msg: string, type: Parameters<RelayLogCallback>[1] = 'info') => onLog?.(msg, type);
    const token = serverConnection.getToken();

    // Craft a Python script that fetches the URL and returns clean text
    const pythonScript = `
import urllib.request, re, json

url = ${JSON.stringify(req.url)}
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,text/plain',
}
req_obj = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req_obj, timeout=20) as r:
        html = r.read().decode('utf-8', errors='replace')
    # Strip tags
    clean = re.sub(r'<script[\\s\\S]*?</script>', '', html, flags=re.I)
    clean = re.sub(r'<style[\\s\\S]*?</style>', '', clean, flags=re.I)
    clean = re.sub(r'<[^>]+>', ' ', clean)
    clean = re.sub(r'\\s+', ' ', clean).strip()[:8000]
    # Extract title
    title_m = re.search(r'<title[^>]*>([^<]+)</title>', html, re.I)
    title = title_m.group(1).strip() if title_m else '${req.topic}'
    words = len(clean.split())
    print(json.dumps({'text': clean, 'title': title, 'words': words, 'ok': True}))
except Exception as e:
    print(json.dumps({'text': '', 'title': '', 'words': 0, 'ok': False, 'error': str(e)}))
`;

    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(
        `http://${this._relayIp}:${this._relayPort}/api/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ script: pythonScript }),
          signal: ctrl.signal,
        }
      );

      const latencyMs = Date.now() - start;
      if (!res.ok) throw new Error(`Execute relay HTTP ${res.status}`);

      const execData = await res.json();
      const output = (execData.output || '').trim();

      // Parse JSON from Python output
      const jsonLine = output.split('\n').find((l: string) => l.trim().startsWith('{'));
      if (!jsonLine) throw new Error('No JSON output from relay script');

      const parsed = JSON.parse(jsonLine);
      if (!parsed.ok) throw new Error(parsed.error || 'Relay script failed');

      log(`[EXEC-RELAY] ✓ ${parsed.words} words via Python urllib`, 'ok');

      const result: SigmaRelayResult = {
        url: req.url,
        domain: req.domain,
        topic: req.topic,
        cleanText: parsed.text,
        title: parsed.title,
        wordCount: parsed.words,
        teleportedVia: `${this._relayIp}:${this._relayPort} (exec)`,
        latencyMs,
        method: 'SIGMA-NET-RELAY',
      };

      if (result.cleanText.length > 50) {
        result.compressed = knowledgeAccumulator.compressResearch(
          result.cleanText, req.domain, req.topic, req.url
        );
        knowledgeAccumulator.addFinding(result.compressed);
        log('[EXEC-RELAY] Compressed + saved to KB', 'ok');
      }

      return result;
    } catch (err: any) {
      log(`[EXEC-RELAY] Failed: ${err?.message}`, 'warn');
      return {
        url: req.url, domain: req.domain, topic: req.topic,
        cleanText: '', wordCount: 0, error: `Exec relay failed: ${err?.message}`,
        teleportedVia: 'SKIPPED', latencyMs: Date.now() - start, method: 'SIGMA-NET-RELAY' as any,
      };
    }
  }

  // ── Direct crawl fallback (Android, limited) ─────────────────
  private async _directCrawl(
    req: SigmaRelayRequest,
    onLog?: RelayLogCallback
  ): Promise<SigmaRelayResult> {
    const start = Date.now();
    const log = (msg: string, type: Parameters<RelayLogCallback>[1] = 'info') => onLog?.(msg, type);
    log(`[DIRECT] Attempting direct crawl: ${req.url}`, 'info');

    try {
      let url = req.url;
      if (!url.startsWith('http')) url = 'https://' + url;
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 15000);

      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'ButlerBot/4.0', 'Accept': 'text/html,text/plain' },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const clean = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ').trim().slice(0, 8000);

      if (clean.length < 50) throw new Error('Page content too short or blocked');

      const latencyMs = Date.now() - start;
      log(`[DIRECT] ✓ ${clean.split(' ').length} words`, 'ok');

      const result: SigmaRelayResult = {
        url: req.url, domain: req.domain, topic: req.topic,
        cleanText: clean, wordCount: clean.split(' ').length,
        teleportedVia: 'DIRECT (no relay)',
        latencyMs, method: 'DIRECT',
      };

      if (result.cleanText.length > 50) {
        result.compressed = knowledgeAccumulator.compressResearch(
          result.cleanText, req.domain, req.topic, req.url
        );
        knowledgeAccumulator.addFinding(result.compressed);
      }

      return result;
    } catch (err: any) {
      return {
        url: req.url, domain: req.domain, topic: req.topic,
        cleanText: '', wordCount: 0,
        error: err?.message || 'Direct crawl failed',
        teleportedVia: 'FAILED', latencyMs: Date.now() - start,
        method: 'DIRECT',
      };
    }
  }

  // ── Getters ───────────────────────────────────────────────────
  isRelayAvailable() { return this._relayAvailable; }
  getRelayAddr()     { return this._relayAvailable ? `${this._relayIp}:${this._relayPort}` : 'NONE'; }
}

export const sigmaNetCrawler = new SigmaNetRelayCrawler();

// ── Python automation crawl targets (for batch relay) ────────────
export const SIGMA_PYTHON_TARGETS: SigmaRelayRequest[] = [
  { url: 'https://docs.python.org/3/library/pathlib.html',    domain: 'Python', topic: 'pathlib',   mode: 'fetch', keywords: ['path', 'file', 'directory'] },
  { url: 'https://docs.python.org/3/library/subprocess.html', domain: 'Python', topic: 'subprocess', mode: 'fetch', keywords: ['process', 'shell', 'command'] },
  { url: 'https://docs.python.org/3/library/os.html',         domain: 'Python', topic: 'os module',  mode: 'fetch', keywords: ['os', 'environment', 'file'] },
  { url: 'https://pypi.org/project/psutil/',                  domain: 'Python', topic: 'psutil',     mode: 'fetch', keywords: ['cpu', 'memory', 'process'] },
  { url: 'https://pypi.org/project/pyautogui/',               domain: 'Python', topic: 'pyautogui',  mode: 'fetch', keywords: ['gui', 'mouse', 'keyboard'] },
  { url: 'https://pypi.org/project/selenium/',                domain: 'Python', topic: 'selenium',   mode: 'fetch', keywords: ['browser', 'web', 'automation'] },
  { url: 'https://pypi.org/project/requests/',                domain: 'Python', topic: 'requests',   mode: 'fetch', keywords: ['http', 'api', 'web'] },
  { url: 'https://pypi.org/project/schedule/',                domain: 'Python', topic: 'schedule',   mode: 'fetch', keywords: ['cron', 'timer', 'interval'] },
  { url: 'https://pypi.org/project/watchdog/',                domain: 'Python', topic: 'watchdog',   mode: 'fetch', keywords: ['file', 'watch', 'event'] },
  { url: 'https://pypi.org/project/pandas/',                  domain: 'Python', topic: 'pandas',     mode: 'fetch', keywords: ['data', 'csv', 'dataframe'] },
  { url: 'https://pypi.org/project/openpyxl/',                domain: 'Python', topic: 'openpyxl',   mode: 'fetch', keywords: ['excel', 'xlsx', 'spreadsheet'] },
  { url: 'https://pypi.org/project/beautifulsoup4/',          domain: 'Python', topic: 'beautifulsoup', mode: 'fetch', keywords: ['html', 'parse', 'scrape'] },
  { url: 'https://docs.python.org/3/library/smtplib.html',   domain: 'Python', topic: 'smtplib',    mode: 'fetch', keywords: ['email', 'smtp', 'mail'] },
  { url: 'https://docs.python.org/3/library/socket.html',    domain: 'Python', topic: 'socket',     mode: 'fetch', keywords: ['network', 'tcp', 'socket'] },
  { url: 'https://pypi.org/project/apscheduler/',             domain: 'Python', topic: 'apscheduler', mode: 'fetch', keywords: ['scheduler', 'cron', 'job'] },
];
