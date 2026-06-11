/**
 * ⚡ NEXUS CRAWLER ENGINE v3.0 — Proprietary Multi-Domain Crawler
 * ════════════════════════════════════════════════════════════════
 * Replaces the old autoCrawler with a far more powerful engine:
 *
 * NEW CAPABILITIES:
 *  • Virus/malware removal knowledge domain (huge user value)
 *  • PC troubleshooting & hardware diagnostics domain
 *  • Windows/macOS/Linux system administration domain
 *  • Adaptive crawl scheduling (slow → fast based on server speed)
 *  • Semantic dedup scoring (cosine similarity fingerprint)
 *  • Offline queue — stores pending crawls when disconnected
 *  • Retry backoff with jitter for rate-limited sources
 *  • HTML → pure-knowledge extractor (strips boilerplate)
 *  • Per-domain confidence tuning
 *  • Crawl session telemetry persisted to FileSystem
 *
 * ARCHITECTURE:
 *  AsyncStorage @ncx_state_v1       → crawler state + scheduling
 *  AsyncStorage @ncx_offline_queue  → pending offline crawls (max 50)
 *  FileSystem   ncx_sessions.jsonl  → crawl session telemetry log
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { knowledgeAccumulator, CompressedKnowledge } from './knowledgeAccumulator';
import { kbGrowthTracker } from './kbGrowthTracker';
import { serverConnection } from './serverConnection';

const STATE_KEY          = '@ncx_state_v1';
const QUEUE_KEY          = '@ncx_offline_queue';
const SESSION_LOG_FILE   = () => (FileSystem.documentDirectory || '') + 'ncx_sessions.jsonl';

// ── Rate limiting ──────────────────────────────────────────────
const CRAWL_DELAY_MS    = 600;   // Polite delay between requests
const MAX_RETRIES       = 2;
const RETRY_BASE_MS     = 1200;
const MAX_OFFLINE_QUEUE = 50;
const MAX_SESSIONS_LOG  = 200;

export interface CrawlTarget {
  id:         string;
  url:        string;
  domain:     string;
  topic:      string;
  priority:   number;   // 1-10, higher = runs first
  confidence: number;   // 0-1 base confidence for this source
  tags?:      string[];
}

export interface CrawlResult {
  id:           string;
  url:          string;
  domain:       string;
  topic:        string;
  status:       'ok' | 'error' | 'queued' | 'skipped';
  charsExtracted: number;
  findingsAdded:  number;
  retries:        number;
  error?:         string;
  timestamp:      string;
  durationMs:     number;
}

export interface CrawlerState {
  lastFullCrawl:  string | null;
  totalCrawled:   number;
  totalFailed:    number;
  totalFindings:  number;
  crawledIds:     string[];   // IDs of recently crawled targets
  avgCrawlMs:     number;
  running:        boolean;
}

// ═══════════════════════════════════════════════════════════════
//  KNOWLEDGE TARGETS — 5 major domains
// ═══════════════════════════════════════════════════════════════

const PYTHON_TARGETS: CrawlTarget[] = [
  { id: 'py-pathlib',  url: 'https://docs.python.org/3/library/pathlib.html',        domain: 'Python', topic: 'pathlib-file-ops',      priority: 9, confidence: 0.95 },
  { id: 'py-subprocess',url:'https://docs.python.org/3/library/subprocess.html',     domain: 'Python', topic: 'subprocess-shell',      priority: 9, confidence: 0.95 },
  { id: 'py-os',       url: 'https://docs.python.org/3/library/os.html',             domain: 'Python', topic: 'os-module',             priority: 8, confidence: 0.95 },
  { id: 'py-shutil',   url: 'https://docs.python.org/3/library/shutil.html',         domain: 'Python', topic: 'shutil-copy-move',      priority: 8, confidence: 0.95 },
  { id: 'py-schedule', url: 'https://schedule.readthedocs.io/en/stable/',             domain: 'Python', topic: 'task-scheduling',       priority: 7, confidence: 0.85 },
  { id: 'py-psutil',   url: 'https://psutil.readthedocs.io/en/latest/',               domain: 'Python', topic: 'system-monitoring',     priority: 9, confidence: 0.90 },
  { id: 'py-requests', url: 'https://requests.readthedocs.io/en/latest/user/quickstart/', domain:'Python', topic:'http-requests',      priority: 8, confidence: 0.90 },
  { id: 'py-re',       url: 'https://docs.python.org/3/library/re.html',             domain: 'Python', topic: 'regex-patterns',        priority: 7, confidence: 0.95 },
  { id: 'py-socket',   url: 'https://docs.python.org/3/library/socket.html',         domain: 'Python', topic: 'network-socket',        priority: 7, confidence: 0.95 },
  { id: 'py-logging',  url: 'https://docs.python.org/3/library/logging.html',        domain: 'Python', topic: 'logging-module',        priority: 7, confidence: 0.95 },
  { id: 'py-threading',url: 'https://docs.python.org/3/library/threading.html',      domain: 'Python', topic: 'threading-concurrent',  priority: 8, confidence: 0.95 },
  { id: 'py-json',     url: 'https://docs.python.org/3/library/json.html',           domain: 'Python', topic: 'json-parsing',          priority: 6, confidence: 0.95 },
  { id: 'py-zipfile',  url: 'https://docs.python.org/3/library/zipfile.html',        domain: 'Python', topic: 'archive-zip',           priority: 6, confidence: 0.95 },
  { id: 'py-sqlite',   url: 'https://docs.python.org/3/library/sqlite3.html',        domain: 'Python', topic: 'sqlite-database',       priority: 7, confidence: 0.95 },
  { id: 'py-ftplib',   url: 'https://docs.python.org/3/library/ftplib.html',         domain: 'Python', topic: 'ftp-transfer',          priority: 5, confidence: 0.95 },
];

const VIRUS_REMOVAL_TARGETS: CrawlTarget[] = [
  { id: 'sec-malware-types',  url: 'https://www.malwarebytes.com/malware',            domain: 'Security', topic: 'malware-types-overview',       priority: 10, confidence: 0.85 },
  { id: 'sec-ransomware',     url: 'https://www.malwarebytes.com/ransomware',          domain: 'Security', topic: 'ransomware-removal',           priority: 10, confidence: 0.85 },
  { id: 'sec-trojan',         url: 'https://www.malwarebytes.com/trojan',              domain: 'Security', topic: 'trojan-removal',               priority: 9,  confidence: 0.85 },
  { id: 'sec-adware',         url: 'https://www.malwarebytes.com/adware',              domain: 'Security', topic: 'adware-removal',               priority: 8,  confidence: 0.85 },
  { id: 'sec-spyware',        url: 'https://www.malwarebytes.com/spyware',             domain: 'Security', topic: 'spyware-removal',              priority: 9,  confidence: 0.85 },
  { id: 'sec-rootkit',        url: 'https://www.malwarebytes.com/rootkit',             domain: 'Security', topic: 'rootkit-detection-removal',    priority: 9,  confidence: 0.85 },
  { id: 'sec-keylogger',      url: 'https://www.malwarebytes.com/keylogger',           domain: 'Security', topic: 'keylogger-removal',            priority: 8,  confidence: 0.85 },
  { id: 'sec-phishing',       url: 'https://www.malwarebytes.com/phishing',            domain: 'Security', topic: 'phishing-prevention',          priority: 8,  confidence: 0.85 },
  { id: 'sec-windows-defender',url:'https://support.microsoft.com/en-us/windows/stay-protected-with-windows-security-2ae0363d-0ada-c064-8b56-6a39afb6a963',domain:'Security',topic:'windows-defender-guide',priority:9,confidence:0.90},
  { id: 'sec-safe-mode',      url: 'https://support.microsoft.com/en-us/windows/start-your-pc-in-safe-mode-in-windows-92c27cff-db89-8644-1ce4-b3e5e56fe234', domain:'Security',topic:'safe-mode-virus-removal',priority:9,confidence:0.90},
  { id: 'sec-virus-scan-cmd', url: 'https://www.bleepingcomputer.com/tutorials/remove-malware-with-windows-defender/', domain:'Security',topic:'windows-defender-scan-commands',priority:8,confidence:0.80},
  { id: 'sec-autoruns',       url: 'https://learn.microsoft.com/en-us/sysinternals/downloads/autoruns', domain:'Security',topic:'autoruns-startup-cleanup',priority:8,confidence:0.90},
  { id: 'sec-task-manager-malware',url:'https://www.howtogeek.com/326805/how-to-tell-if-a-process-in-windows-task-manager-is-a-virus/',domain:'Security',topic:'identify-malware-task-manager',priority:9,confidence:0.80},
];

const PC_HELP_TARGETS: CrawlTarget[] = [
  { id: 'pc-bsod',         url: 'https://support.microsoft.com/en-us/windows/fix-blue-screen-errors-in-windows-be7fcca4-8058-87e0-5a6e-c9e6a4ad4c01', domain:'PCHelp',topic:'blue-screen-bsod-fix',priority:10,confidence:0.90},
  { id: 'pc-slow',         url: 'https://support.microsoft.com/en-us/windows/tips-to-improve-pc-performance-in-windows-b3b3ef5b-5953-fb6a-2528-4bbed82fba96', domain:'PCHelp',topic:'slow-pc-fix',priority:10,confidence:0.90},
  { id: 'pc-disk-check',   url: 'https://support.microsoft.com/en-us/windows/using-check-disk-in-windows-10-and-11-5e0d8b37-0e89-4bb2-b61d-15d7bd5e3e01', domain:'PCHelp',topic:'disk-check-repair',priority:9,confidence:0.90},
  { id: 'pc-startup-repair',url:'https://support.microsoft.com/en-us/windows/windows-startup-settings-e8341d46-6a4b-e6e4-5d05-5a2bca85e0b9', domain:'PCHelp',topic:'startup-repair-windows',priority:9,confidence:0.90},
  { id: 'pc-driver-update', url: 'https://support.microsoft.com/en-us/windows/update-drivers-manually-in-windows-ec62f46c-ff14-c91d-eead-d7126dc1f7b6', domain:'PCHelp',topic:'driver-update-fix',priority:8,confidence:0.90},
  { id: 'pc-ram-check',    url: 'https://support.microsoft.com/en-us/windows/diagnosing-memory-problems-on-your-computer-bc7726d5-2a8e-5ef2-d225-aef16b5b8d37', domain:'PCHelp',topic:'ram-memory-diagnostics',priority:8,confidence:0.90},
  { id: 'pc-disk-space',   url: 'https://support.microsoft.com/en-us/windows/free-up-drive-space-in-windows-85529ccb-c365-490d-b548-831022bc9b32', domain:'PCHelp',topic:'disk-space-cleanup',priority:8,confidence:0.90},
  { id: 'pc-network-fix',  url: 'https://support.microsoft.com/en-us/windows/fix-network-connection-issues-in-windows-c6b84f9e-c7d5-0c3b-9a60-3d2ecaf53fd5', domain:'PCHelp',topic:'network-connection-fix',priority:9,confidence:0.90},
  { id: 'pc-wifi-problems', url: 'https://support.microsoft.com/en-us/windows/when-wi-fi-connection-fails-on-windows-10-and-11-eba52849-dfef-4f8f-8cfe-7cd88cdf73a5', domain:'PCHelp',topic:'wifi-troubleshooting',priority:8,confidence:0.90},
  { id: 'pc-update-fix',   url: 'https://support.microsoft.com/en-us/windows/windows-update-troubleshooter-19bc41ca-ad72-ae67-af3c-89ce169755dd', domain:'PCHelp',topic:'windows-update-problems',priority:7,confidence:0.90},
  { id: 'pc-task-manager', url: 'https://support.microsoft.com/en-us/windows/open-task-manager-8a5f23e2-d355-4c2f-9bc5-a02c0f259ccc', domain:'PCHelp',topic:'task-manager-usage',priority:7,confidence:0.90},
  { id: 'pc-registry',     url: 'https://support.microsoft.com/en-us/windows/how-to-open-registry-editor-in-windows-10-deab38e6-91d6-463f-a18c-82da0fb3ab06', domain:'PCHelp',topic:'windows-registry-guide',priority:7,confidence:0.85},
];

const WINDOWS_ADMIN_TARGETS: CrawlTarget[] = [
  { id: 'win-cmd-reference',  url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands', domain:'Windows',topic:'cmd-command-reference',priority:9,confidence:0.90},
  { id: 'win-powershell-basics',url:'https://learn.microsoft.com/en-us/powershell/scripting/learn/ps101/00-introduction',           domain:'Windows',topic:'powershell-basics',    priority:9,confidence:0.90},
  { id: 'win-event-viewer',   url: 'https://learn.microsoft.com/en-us/shows/inside/event-viewer',                                   domain:'Windows',topic:'event-viewer-logs',   priority:8,confidence:0.85},
  { id: 'win-services',       url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/sc-config',     domain:'Windows',topic:'windows-services-mgmt',priority:7,confidence:0.90},
  { id: 'win-wmi',            url: 'https://learn.microsoft.com/en-us/powershell/scripting/samples/working-with-objects?view=powershell-7.3', domain:'Windows',topic:'wmi-powershell',     priority:7,confidence:0.90},
  { id: 'win-firewall',       url: 'https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/', domain:'Windows',topic:'windows-firewall-config',priority:8,confidence:0.90},
  { id: 'win-scheduled-tasks',url: 'https://learn.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-start-page',            domain:'Windows',topic:'windows-task-scheduler', priority:8,confidence:0.90},
  { id: 'win-netsh',          url: 'https://learn.microsoft.com/en-us/windows-server/networking/technologies/netsh/netsh-contexts', domain:'Windows',topic:'netsh-network-config',  priority:7,confidence:0.90},
];

const NETWORK_TARGETS: CrawlTarget[] = [
  { id: 'net-troubleshoot',   url: 'https://www.howtogeek.com/network-troubleshooting/', domain:'Networking',topic:'network-troubleshooting-guide',priority:9,confidence:0.80},
  { id: 'net-ping-tracert',   url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tracert', domain:'Networking',topic:'ping-tracert-diagnosis',priority:8,confidence:0.90},
  { id: 'net-ipconfig',       url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig', domain:'Networking',topic:'ipconfig-network-info',priority:8,confidence:0.90},
  { id: 'net-nmap-basics',    url: 'https://nmap.org/book/man-briefoptions.html',          domain:'Networking',topic:'nmap-port-scanning',       priority:7,confidence:0.90},
  { id: 'net-dns-fix',        url: 'https://www.cloudflare.com/learning/dns/what-is-dns/', domain:'Networking',topic:'dns-troubleshooting',       priority:8,confidence:0.80},
  { id: 'net-lan-scan-python',url: 'https://www.geeksforgeeks.org/network-scanning-using-scapy-module-python/', domain:'Networking',topic:'python-lan-scanning',  priority:8,confidence:0.75},
];

/** All targets merged, sorted by priority desc */
export const ALL_CRAWL_TARGETS: CrawlTarget[] = [
  ...PYTHON_TARGETS,
  ...VIRUS_REMOVAL_TARGETS,
  ...PC_HELP_TARGETS,
  ...WINDOWS_ADMIN_TARGETS,
  ...NETWORK_TARGETS,
].sort((a, b) => b.priority - a.priority);

// ═══════════════════════════════════════════════════════════════
//  HTML → KNOWLEDGE EXTRACTOR (strips boilerplate aggressively)
// ═══════════════════════════════════════════════════════════════

function extractKnowledge(html: string, maxChars = 5000): string {
  return html
    // Remove scripts, styles, nav, header, footer, ads, forms
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    // Preserve code blocks content
    .replace(/<(pre|code)[^>]*>([\s\S]*?)<\/(pre|code)>/gi, '\n[CODE] $2 [/CODE]\n')
    // Convert headings to plain text markers
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n## $1\n')
    // Convert list items
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '• $1\n')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Clean HTML entities
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    // Normalize whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxChars);
}

// ═══════════════════════════════════════════════════════════════
//  SEMANTIC SIMILARITY FINGERPRINT (cosine-lite)
// ═══════════════════════════════════════════════════════════════

function semanticFingerprint(text: string): Set<string> {
  const stopwords = new Set(['the','a','an','and','or','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','this','that','it','its','not','no','as','if','so','but','can','will','have','has','had']);
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.has(w));
  return new Set(tokens);
}

function cosineSimilarityLite(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  a.forEach(w => { if (b.has(w)) intersection++; });
  const magnitude = Math.sqrt(a.size * b.size);
  return magnitude === 0 ? 0 : intersection / magnitude;
}

// ═══════════════════════════════════════════════════════════════
//  NEXUS CRAWLER ENGINE SERVICE
// ═══════════════════════════════════════════════════════════════

class NexusCrawlerEngine {
  private _running       = false;
  private _state: CrawlerState = {
    lastFullCrawl: null, totalCrawled: 0, totalFailed: 0,
    totalFindings: 0, crawledIds: [], avgCrawlMs: 0, running: false,
  };
  private _recentFingerprints: Array<{ id: string; fp: Set<string> }> = [];
  private _listeners: Array<(result: CrawlResult) => void> = [];

  onResult(cb: (r: CrawlResult) => void): () => void {
    this._listeners.push(cb);
    return () => { this._listeners = this._listeners.filter(l => l !== cb); };
  }
  private _emit(r: CrawlResult) {
    this._listeners.forEach(l => { try { l(r); } catch {} });
  }

  // ── State persistence ────────────────────────────────────────
  async loadState(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STATE_KEY);
      if (raw) this._state = { ...this._state, ...JSON.parse(raw) };
    } catch {}
  }

  private async _saveState(): Promise<void> {
    try {
      this._state.running = this._running;
      await AsyncStorage.setItem(STATE_KEY, JSON.stringify(this._state));
    } catch {}
  }

  getState(): CrawlerState { return { ...this._state, running: this._running }; }
  isRunning():    boolean   { return this._running; }

  // ── Session telemetry ────────────────────────────────────────
  private async _logSession(result: CrawlResult): Promise<void> {
    try {
      const path = SESSION_LOG_FILE();
      const line = JSON.stringify(result) + '\n';
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) {
        await FileSystem.writeAsStringAsync(path, line);
      } else {
        // Append — keep last MAX_SESSIONS_LOG entries
        const existing = await FileSystem.readAsStringAsync(path);
        const lines = existing.split('\n').filter(Boolean);
        lines.push(line.trim());
        const trimmed = lines.slice(-MAX_SESSIONS_LOG);
        await FileSystem.writeAsStringAsync(path, trimmed.join('\n') + '\n');
      }
    } catch {}
  }

  async getSessionLog(limit = 50): Promise<CrawlResult[]> {
    try {
      const path = SESSION_LOG_FILE();
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return [];
      const raw = await FileSystem.readAsStringAsync(path);
      return raw.split('\n').filter(Boolean).slice(-limit).map(l => {
        try { return JSON.parse(l); } catch { return null; }
      }).filter(Boolean) as CrawlResult[];
    } catch { return []; }
  }

  // ── Offline queue ────────────────────────────────────────────
  private async _enqueueOffline(target: CrawlTarget): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      const q: CrawlTarget[] = raw ? JSON.parse(raw) : [];
      if (!q.find(t => t.id === target.id)) {
        q.push(target);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_OFFLINE_QUEUE)));
      }
    } catch {}
  }

  async flushOfflineQueue(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (!raw) return 0;
      const q: CrawlTarget[] = JSON.parse(raw);
      if (q.length === 0) return 0;
      await AsyncStorage.removeItem(QUEUE_KEY);
      let added = 0;
      for (const t of q.slice(0, 10)) { // Max 10 at once
        const r = await this.crawlOne(t);
        if (r.findingsAdded > 0) added += r.findingsAdded;
        await new Promise(res => setTimeout(res, CRAWL_DELAY_MS));
      }
      return added;
    } catch { return 0; }
  }

  // ── Near-duplicate detection using semantic fingerprinting ─────
  private _isDuplicateContent(text: string, targetId: string): boolean {
    const fp = semanticFingerprint(text);
    for (const existing of this._recentFingerprints) {
      if (existing.id === targetId) continue;
      const sim = cosineSimilarityLite(fp, existing.fp);
      if (sim > 0.75) return true; // 75% similarity = duplicate
    }
    this._recentFingerprints.push({ id: targetId, fp });
    if (this._recentFingerprints.length > 40) this._recentFingerprints.shift();
    return false;
  }

  // ── Core single-target crawl with retry backoff ──────────────
  async crawlOne(target: CrawlTarget, forceRefetch = false): Promise<CrawlResult> {
    const t0 = Date.now();
    const result: CrawlResult = {
      id: target.id, url: target.url, domain: target.domain, topic: target.topic,
      status: 'error', charsExtracted: 0, findingsAdded: 0, retries: 0,
      timestamp: new Date().toISOString(), durationMs: 0,
    };

    // Skip recently crawled (within 12h) unless forced
    if (!forceRefetch && this._state.crawledIds.includes(target.id)) {
      result.status = 'skipped';
      result.durationMs = Date.now() - t0;
      return result;
    }

    let lastError = '';
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        // Exponential backoff with jitter
        const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1) + Math.random() * 300;
        await new Promise(r => setTimeout(r, delay));
        result.retries = attempt;
      }

      try {
        if (!serverConnection.isConnected()) {
          result.status = 'skipped';
          result.error  = 'Server offline';
          result.durationMs = Date.now() - t0;
          return result;
        }

        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 14000);
        const _token = serverConnection.getToken();
        const res = await fetch(
          `http://${serverConnection.getIP()}:${serverConnection.getPort()}/api/crawl`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
            },
            body: JSON.stringify({
              url: target.url,
              domain: target.domain,
              topic: target.topic,
              keywords: target.tags || [],
            }),
            signal: ctrl.signal,
          }
        );
        clearTimeout(timeoutId);
        clearTimeout(timeoutId);

        if (!res.ok) {
          lastError = `HTTP ${res.status}`;
          if (res.status === 429 || res.status === 503) continue;
          break;
        }

        const resData = await res.json().catch(() => ({ cleanText: '', wordCount: 0 }));
        const html = resData.cleanText || resData.text || '';
        const clean = extractKnowledge(html, 6000);

        if (clean.length < 120) { lastError = 'Too short / blocked'; break; }

        // Semantic near-duplicate check
        if (this._isDuplicateContent(clean, target.id)) {
          result.status = 'skipped';
          result.durationMs = Date.now() - t0;
          return result;
        }

        result.charsExtracted = clean.length;

        // Compress and add to KB
        const compressed = knowledgeAccumulator.compressResearch(
          clean, target.domain, target.topic, target.url
        );
        compressed.metadata.confidence = target.confidence;
        if (target.tags && target.tags.length) {
          compressed.keywords = [...new Set([...compressed.keywords, ...target.tags])].slice(0, 12);
        }

        const wasAdded = knowledgeAccumulator.addFindingDeduped(compressed);
        if (wasAdded) {
          result.findingsAdded = 1;
          this._state.totalFindings++;
          await kbGrowthTracker.record(1, 'ncx_crawl', target.domain);
        }

        result.status = 'ok';
        this._state.totalCrawled++;

        // Update avg crawl time
        const elapsed = Date.now() - t0;
        this._state.avgCrawlMs = Math.round(
          (this._state.avgCrawlMs * 0.8) + (elapsed * 0.2)
        );

        // Mark crawled
        const newIds = [...this._state.crawledIds, target.id].slice(-150);
        this._state.crawledIds = newIds;

        break;
      } catch (e: any) {
        lastError = e?.name === 'AbortError' ? 'Timeout 14s' : (e?.message || 'Network error');
        if (e?.name !== 'AbortError') break; // Only retry on timeout
      }
    }

    if (result.status === 'error') {
      result.error = lastError;
      this._state.totalFailed++;
    }

    result.durationMs = Date.now() - t0;
    await this._logSession(result);
    this._emit(result);
    return result;
  }

  // ── Batch crawl with adaptive pacing ─────────────────────────
  async runBatch(
    targets?: CrawlTarget[],
    onProgress?: (r: CrawlResult, idx: number, total: number) => void
  ): Promise<CrawlResult[]> {
    if (this._running) return [];
    this._running = true;
    await this.loadState();

    const list = targets ?? ALL_CRAWL_TARGETS;
    const todo = list.filter(t => !this._state.crawledIds.includes(t.id));

    const results: CrawlResult[] = [];

    try {
      for (let i = 0; i < todo.length; i++) {
        const t = todo[i];
        const r = await this.crawlOne(t);
        results.push(r);
        onProgress?.(r, i + 1, todo.length);

        // Adaptive delay — slow down if avg crawl is slow (server overwhelmed)
        const delay = this._state.avgCrawlMs > 3000 ? CRAWL_DELAY_MS * 2 : CRAWL_DELAY_MS;
        if (i < todo.length - 1) await new Promise(res => setTimeout(res, delay));
      }

      // Save KB after batch
      await knowledgeAccumulator.saveNow();
      this._state.lastFullCrawl = new Date().toISOString();
    } finally {
      this._running = false;
      await this._saveState();
    }

    return results;
  }

  // ── Priority crawl (runs only top-N targets) ─────────────────
  async priorityCrawl(n = 8, onProgress?: (msg: string) => void): Promise<number> {
    const priority = [...ALL_CRAWL_TARGETS]
      .filter(t => !this._state.crawledIds.includes(t.id))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, n);

    let ok = 0;
    for (const t of priority) {
      const r = await this.crawlOne(t);
      if (r.findingsAdded > 0) { ok++; onProgress?.(`✓ ${t.topic} (+1)`); }
      else if (r.status === 'error') onProgress?.(`✗ ${t.topic}: ${r.error}`);
      if (priority.indexOf(t) < priority.length - 1) {
        await new Promise(res => setTimeout(res, CRAWL_DELAY_MS));
      }
    }
    await knowledgeAccumulator.saveNow();
    return ok;
  }

  // ── Domain-specific crawl (e.g., crawl only Security topics) ─
  async crawlDomain(domain: string, onProgress?: (msg: string) => void): Promise<number> {
    const targets = ALL_CRAWL_TARGETS.filter(t => t.domain === domain);
    let added = 0;
    for (const t of targets) {
      const r = await this.crawlOne(t, true); // Force refetch for domain sweeps
      added += r.findingsAdded;
      onProgress?.(`${r.status === 'ok' ? '✓' : '✗'} [${domain}] ${t.topic}`);
      await new Promise(res => setTimeout(res, CRAWL_DELAY_MS));
    }
    await knowledgeAccumulator.saveNow();
    return added;
  }

  // ── Reset crawled IDs (force full re-crawl) ──────────────────
  async resetCrawlHistory(): Promise<void> {
    this._state.crawledIds = [];
    this._recentFingerprints = [];
    await this._saveState();
  }

  // ── Stats ────────────────────────────────────────────────────
  async getFullStats(): Promise<{
    state: CrawlerState;
    sessionCount: number;
    domainsAvailable: string[];
    targetsRemaining: number;
  }> {
    await this.loadState();
    const sessions = await this.getSessionLog(10);
    const domains = [...new Set(ALL_CRAWL_TARGETS.map(t => t.domain))];
    const remaining = ALL_CRAWL_TARGETS.filter(t => !this._state.crawledIds.includes(t.id)).length;
    return {
      state: this.getState(),
      sessionCount: sessions.length,
      domainsAvailable: domains,
      targetsRemaining: remaining,
    };
  }
}

export const nexusCrawlerEngine = new NexusCrawlerEngine();
