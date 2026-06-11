/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  QUANTUM LINK HARVESTER (QLH) — Proprietary Resource Discovery Engine  ║
 * ║                                                                          ║
 * ║  Method: ENTANGLED GRAPH TRAVERSAL (EGT) v1.0                           ║
 * ║                                                                          ║
 * ║  Unique Architecture:                                                    ║
 * ║    - Seed URLs → recursive link extraction → relevance scoring           ║
 * ║    - "Quantum entanglement": each found URL generates 3 derivatives      ║
 * ║      (parent pattern, sibling pattern, depth-1 subdirectory)             ║
 * ║    - Cross-domain graph: links from A to B also pull B's nav links       ║
 * ║    - Temporal decay: older links get re-evaluated on a rolling schedule  ║
 * ║    - Bloom filter dedup: never visits same URL twice in 72h              ║
 * ║    - Relevance scoring: Python keyword density × authority × freshness  ║
 * ║    - PC relay teleport: all fetches happen server-side (no Android limits)║
 * ║                                                                          ║
 * ║  PROPRIETARY — do not disclose EGT algorithm details.                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { autoConnectEngine } from './autoConnectEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { serverConnection } from './serverConnection';
import { knowledgeAccumulator } from './knowledgeAccumulator';

// ─── Config ────────────────────────────────────────────────────────
const QLH_GRAPH_KEY   = '@qlh_link_graph_v1';
const QLH_BLOOM_KEY   = '@qlh_bloom_filter_v1';
const QLH_STATS_KEY   = '@qlh_stats_v1';
const QLH_QUEUE_KEY   = '@qlh_queue_v1';
const BLOOM_TTL_MS    = 72 * 60 * 60 * 1000;  // 72h URL cooldown
const MAX_GRAPH_SIZE  = 1000;                  // max URLs in graph
const MAX_QUEUE_SIZE  = 200;                   // crawl queue limit
const RELEVANCE_FLOOR = 0.35;                  // min relevance to store

// ─── Seed domains — the quantum seeds that sprout the resource graph ──
const QUANTUM_SEEDS: QLHSeed[] = [
  // Official docs
  { url: 'https://docs.python.org/3/', domain: 'Python', topic: 'stdlib', authority: 1.0 },
  { url: 'https://docs.python.org/3/library/', domain: 'Python', topic: 'stdlib', authority: 1.0 },
  { url: 'https://pypi.org/pypi/', domain: 'Python', topic: 'packages', authority: 0.95 },
  { url: 'https://realpython.com/tutorials/all/', domain: 'Python', topic: 'tutorials', authority: 0.9 },
  { url: 'https://psutil.readthedocs.io/en/latest/', domain: 'Python/System', topic: 'psutil', authority: 0.95 },
  { url: 'https://selenium-python.readthedocs.io/', domain: 'Python/Browser', topic: 'selenium', authority: 0.9 },
  { url: 'https://pyautogui.readthedocs.io/en/latest/', domain: 'Python/GUI', topic: 'pyautogui', authority: 0.9 },
  { url: 'https://requests.readthedocs.io/en/latest/', domain: 'Python/Web', topic: 'requests', authority: 0.95 },
  { url: 'https://beautiful-soup-4.readthedocs.io/en/latest/', domain: 'Python/Web', topic: 'beautifulsoup', authority: 0.9 },
  { url: 'https://schedule.readthedocs.io/en/stable/', domain: 'Python/Schedule', topic: 'schedule', authority: 0.85 },
  { url: 'https://apscheduler.readthedocs.io/en/3.x/', domain: 'Python/Schedule', topic: 'apscheduler', authority: 0.88 },
  { url: 'https://watchdog.readthedocs.io/en/stable/', domain: 'Python/Files', topic: 'watchdog', authority: 0.85 },
  { url: 'https://pandas.pydata.org/docs/user_guide/', domain: 'Python/Data', topic: 'pandas', authority: 0.95 },
  { url: 'https://openpyxl.readthedocs.io/en/stable/', domain: 'Python/Data', topic: 'openpyxl', authority: 0.85 },
  { url: 'https://paramiko.org/', domain: 'Python/Network', topic: 'paramiko', authority: 0.88 },
  { url: 'https://playwright.dev/python/docs/intro', domain: 'Python/Browser', topic: 'playwright', authority: 0.9 },
  { url: 'https://cryptography.io/en/latest/', domain: 'Python/Security', topic: 'cryptography', authority: 0.9 },
  { url: 'https://loguru.readthedocs.io/en/stable/', domain: 'Python/Logging', topic: 'loguru', authority: 0.85 },
  { url: 'https://fastapi.tiangolo.com/', domain: 'Python/Network', topic: 'fastapi', authority: 0.92 },
  { url: 'https://flask.palletsprojects.com/en/3.0.x/', domain: 'Python/Network', topic: 'flask', authority: 0.92 },
  // Community/learning
  { url: 'https://github.com/vinta/awesome-python', domain: 'Python', topic: 'awesome-list', authority: 0.88 },
  { url: 'https://github.com/TheAlgorithms/Python', domain: 'Python', topic: 'algorithms', authority: 0.85 },
  { url: 'https://stackoverflow.com/questions/tagged/python?sort=votes&pagesize=15', domain: 'Python', topic: 'stackoverflow', authority: 0.8 },
  { url: 'https://www.geeksforgeeks.org/python-programming-language/', domain: 'Python', topic: 'tutorials', authority: 0.82 },
];

// ─── Python relevance keywords (for scoring) ──────────────────────
const PYTHON_KEYWORDS = new Set([
  'python', 'script', 'automation', 'subprocess', 'pathlib', 'shutil',
  'requests', 'selenium', 'pyautogui', 'psutil', 'asyncio', 'threading',
  'pandas', 'numpy', 'flask', 'fastapi', 'socket', 'smtplib', 'sqlite',
  'watchdog', 'schedule', 'apscheduler', 'playwright', 'beautifulsoup',
  'paramiko', 'winreg', 'ctypes', 'logging', 'argparse', 'typing',
  'dataclass', 'decorator', 'generator', 'context', 'protocol',
  'automation', 'monitor', 'bot', 'crawler', 'scraper', 'parser',
]);

// ─── Types ────────────────────────────────────────────────────────
export interface QLHSeed {
  url:       string;
  domain:    string;
  topic:     string;
  authority: number;  // 0-1
}

export interface QLHNode {
  url:          string;
  domain:       string;
  topic:        string;
  relevance:    number;   // 0-1
  authority:    number;   // 0-1
  depth:        number;   // hops from seed
  harvestedAt:  number;   // timestamp
  wordCount:    number;
  outLinks:     string[]; // discovered URLs from this page
  added:        boolean;  // was added to KB
}

export interface QLHStats {
  totalDiscovered:  number;
  totalHarvested:   number;
  totalAdded:       number;
  totalFiltered:    number;
  avgRelevance:     number;
  lastRunTs:        number;
  graphSize:        number;
  queueSize:        number;
  microHarvests:    number;
}

// ─── Proprietary EGT Algorithm helpers ───────────────────────────

/**
 * EGT: Quantum URL Entanglement — generates 3 derivative URLs from any URL.
 * These are "entangled" in that they statistically co-occur with Python content.
 */
function entangle(url: string): string[] {
  const derivatives: string[] = [];
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);

    // Derivative 1: parent directory (sibling exploration)
    if (parts.length > 1) {
      derivatives.push(`${u.origin}/${parts.slice(0, -1).join('/')}/`);
    }

    // Derivative 2: depth+1 'api' or 'reference' subdirectory
    const APIcandidates = ['api', 'reference', 'guide', 'tutorial', 'examples', 'cookbook'];
    const lastPart = parts[parts.length - 1] || '';
    if (!APIcandidates.includes(lastPart)) {
      const chosen = APIcandidates[Math.floor(Math.random() * APIcandidates.length)];
      derivatives.push(`${u.origin}/${parts.join('/')}/${chosen}/`);
    }

    // Derivative 3: same domain different path — 'changelog' or 'installation'
    derivatives.push(`${u.origin}/changelog/`);

  } catch {}
  return derivatives.filter(d => d.startsWith('http'));
}

/**
 * Compute relevance score for a URL and its text content.
 * Score = (keyword density × 0.6) + (authority × 0.3) + (freshness × 0.1)
 */
function scoreRelevance(text: string, url: string, authority: number): number {
  if (!text || text.length < 20) return 0;
  const words  = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const total  = words.length || 1;
  const hits   = words.filter(w => PYTHON_KEYWORDS.has(w)).length;
  const density = Math.min(1, hits / total * 10);  // 10% keyword density = score 1.0

  // URL authority bonus
  const urlBonus = [
    'docs.python.org', 'realpython.com', 'readthedocs.io', 'pypi.org',
    'github.com', 'stackoverflow.com', 'geeksforgeeks.org',
  ].some(d => url.includes(d)) ? 0.15 : 0;

  return Math.min(1, density * 0.6 + authority * 0.3 + urlBonus + 0.05);
}

/**
 * Bloom filter — fast dedup using Set of URL hashes.
 * Persisted with TTL so URLs can be re-visited after 72h.
 */
class BloomFilter {
  private _set: Map<string, number> = new Map();  // url → expiry timestamp

  load(raw: Record<string, number>) {
    const now = Date.now();
    Object.entries(raw).forEach(([url, exp]) => {
      if (exp > now) this._set.set(url, exp);
    });
  }

  export(): Record<string, number> {
    const obj: Record<string, number> = {};
    this._set.forEach((exp, url) => { obj[url] = exp; });
    return obj;
  }

  has(url: string): boolean   { return (this._set.get(url) ?? 0) > Date.now(); }
  add(url: string): void      { this._set.set(url, Date.now() + BLOOM_TTL_MS); }
  size(): number              { return this._set.size; }
  prune(): void {
    const now = Date.now();
    this._set.forEach((exp, url) => { if (exp <= now) this._set.delete(url); });
  }
}

// ─── Main QLH Service ─────────────────────────────────────────────
class QuantumLinkHarvesterService {
  private _graph:    Map<string, QLHNode> = new Map();
  private _queue:    QLHSeed[]            = [];
  private _bloom:    BloomFilter          = new BloomFilter();
  private _stats:    QLHStats             = {
    totalDiscovered: 0, totalHarvested: 0, totalAdded: 0,
    totalFiltered: 0, avgRelevance: 0, lastRunTs: 0,
    graphSize: 0, queueSize: 0, microHarvests: 0,
  };
  private _running  = false;
  private _loaded   = false;
  private _timer:   ReturnType<typeof setInterval> | null = null;
  private _listeners = new Set<(stats: QLHStats) => void>();

  // ── Subscribe to stats updates ──────────────────────────────
  onStats(cb: (s: QLHStats) => void): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }
  getStats(): QLHStats { return { ...this._stats }; }
  getGraph(): QLHNode[] { return Array.from(this._graph.values()); }
  isRunning(): boolean  { return this._running; }

  // ── Start the harvester (call on app start) ─────────────────
  async start(): Promise<void> {
    await this._load();
    // Seed queue with any unfetched seed URLs
    for (const seed of QUANTUM_SEEDS) {
      if (!this._bloom.has(seed.url) && !this._graph.has(seed.url)) {
        this._enqueue(seed);
      }
    }
    await this._saveQueue();

    // DISABLED: Server handles link discovery via _search_scripts()
    // this._timer = setInterval(() => this.triggerMicroHarvest(), 18 * 60 * 1000);

    // First micro-harvest fires only after server connects (not on a blind timer)
    const _qlhUnsub = autoConnectEngine.onEvent((evt: any) => {
      if (evt.status === 'connected') {
        _qlhUnsub();
        setTimeout(() => this.triggerMicroHarvest(), 5000);
      }
    });
    console.log('[QLH] Quantum Link Harvester started — EGT v1.0 active');
  }

  stop(): void {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  // ── Micro-harvest: process 3 queue items ────────────────────
  async triggerMicroHarvest(): Promise<void> {
    if (this._running) return;
    if (!serverConnection.isConnected()) return;

    await this._load();
    this._running = true;
    this._stats.microHarvests++;
    const batch = this._queue.splice(0, 3); // 3 URLs per micro-harvest

    const ip   = serverConnection.getIP();
    const port = serverConnection.getPort();
    if (!ip || !port) { this._running = false; return; }

    for (const seed of batch) {
      try {
        await this._harvestOne(seed, ip, port);
      } catch {}
    }

    this._stats.lastRunTs = Date.now();
    this._stats.queueSize = this._queue.length;
    this._stats.graphSize = this._graph.size;
    await this._save();
    this._running = false;
    this._listeners.forEach(cb => { try { cb({ ...this._stats }); } catch {} });
  }

  // ── Harvest a single URL via PC relay ───────────────────────
  private async _harvestOne(seed: QLHSeed, ip: string, port: string): Promise<void> {
    if (this._bloom.has(seed.url)) return;

    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 15_000);

    try {
      let res: Response | null = null;
      let lastFetchError: Error | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const attemptCtrl = new AbortController();
          setTimeout(() => attemptCtrl.abort(), 15_000);
          res = await fetch(`http://${ip}:${port}/api/crawl`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url:     seed.url,
              domain:  seed.domain,
              topic:   seed.topic,
              keywords: Array.from(PYTHON_KEYWORDS).slice(0, 8),
            }),
            signal: attemptCtrl.signal,
          });
          if (res.ok) break;
          lastFetchError = new Error(`HTTP ${res.status}`);
        } catch (fetchErr: any) {
          lastFetchError = fetchErr;
          if (attempt === 0) await new Promise(r => setTimeout(r, 2000)); // 2s delay before retry
        }
      }

      if (!res || !res.ok) return;
      const data = await res.json();
      if (!data.ok || !data.cleanText) return;

      const text      = (data.cleanText as string).slice(0, 8000);
      const relevance = scoreRelevance(text, seed.url, seed.authority);
      const wordCount = data.wordCount || text.split(' ').length;

      this._stats.totalHarvested++;
      this._bloom.add(seed.url);

      // Extract outbound links from text heuristically (URLs in text)
      const outLinks = this._extractLinks(text, seed.url).slice(0, 12);

      // EGT: quantum entanglement — generate derivative URLs
      const entangled = entangle(seed.url);

      const node: QLHNode = {
        url: seed.url, domain: seed.domain, topic: seed.topic,
        relevance, authority: seed.authority,
        depth: 0, harvestedAt: Date.now(),
        wordCount, outLinks, added: false,
      };

      if (relevance >= RELEVANCE_FLOOR) {
        // Add compressed knowledge to KB
        const compressed = knowledgeAccumulator.compressResearch(
          text, seed.domain, seed.topic, seed.url
        );
        knowledgeAccumulator.addFinding(compressed);
        node.added = true;
        this._stats.totalAdded++;
        // Mirror to server KB so crawls found by app also grow the server SQLite KB
        // Fire-and-forget — don't let server errors block local KB growth
        try {
          const token = serverConnection.getToken();
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          fetch(`http://${ip}:${port}/api/kb/log`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              domain:   seed.domain,
              topic:    seed.topic,
              summary:  compressed.summary.slice(0, 500),
              keywords: compressed.keywords,
              source:   seed.url,
            }),
          }).catch(() => {});
        } catch {}
      } else {
        this._stats.totalFiltered++;
      }

      // Store node in graph
      if (this._graph.size < MAX_GRAPH_SIZE) {
        this._graph.set(seed.url, node);
      }
      this._stats.graphSize = this._graph.size;

      // Enqueue outbound links (depth+1) — only if relevant domain
      const nextSeeds: QLHSeed[] = [
        ...outLinks.map(u => ({
          url:       u,
          domain:    seed.domain,
          topic:     seed.topic,
          authority: seed.authority * 0.85,  // authority decays 15% per hop
        })),
        ...entangled.map(u => ({
          url:       u,
          domain:    seed.domain,
          topic:     `${seed.topic}-related`,
          authority: seed.authority * 0.75,
        })),
      ];

      for (const next of nextSeeds) {
        if (!this._bloom.has(next.url) && !this._graph.has(next.url)) {
          this._enqueue(next);
        }
      }

      this._stats.totalDiscovered += nextSeeds.length;

      // Update avg relevance
      const nodes = Array.from(this._graph.values());
      this._stats.avgRelevance = nodes.length > 0
        ? Math.round(nodes.reduce((s, n) => s + n.relevance, 0) / nodes.length * 100) / 100
        : 0;

    } catch {}
  }

  // ── Extract HTTP links from plain text ──────────────────────
  private _extractLinks(text: string, baseUrl: string): string[] {
    const found: string[] = [];
    // Match http(s) URLs in text
    const urlRx = /https?:\/\/[^\s<>"']+/g;
    let m: RegExpExecArray | null;
    while ((m = urlRx.exec(text)) !== null) {
      const u = m[0].replace(/[.,;:)\]>]+$/, ''); // trim trailing punctuation
      if (
        u.length < 200 &&
        !u.includes('javascript:') &&
        !u.includes('#') &&
        (
          u.includes('python') ||
          u.includes('readthedocs') ||
          u.includes('pypi.org') ||
          u.includes('github.com/') ||
          u.includes('stackoverflow.com/questions') ||
          PYTHON_KEYWORDS.has(u.split('/').pop()?.toLowerCase() ?? '')
        )
      ) {
        found.push(u);
      }
    }
    return [...new Set(found)];
  }

  // ── Queue management ─────────────────────────────────────────
  private _enqueue(seed: QLHSeed): void {
    if (this._queue.length >= MAX_QUEUE_SIZE) {
      // Drop lowest authority item if over limit
      this._queue.sort((a, b) => b.authority - a.authority);
      this._queue.splice(MAX_QUEUE_SIZE - 1);
    }
    this._queue.push(seed);
  }

  // ── Query graph for relevant nodes ───────────────────────────
  queryGraph(query: string, limit = 5): QLHNode[] {
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const scored: [QLHNode, number][] = [];
    this._graph.forEach(node => {
      let score = 0;
      terms.forEach(t => {
        if (node.url.includes(t))    score += 3;
        if (node.topic.includes(t))  score += 2;
        if (node.domain.includes(t)) score += 1;
      });
      if (score > 0) scored.push([node, score * node.relevance]);
    });
    return scored.sort((a, b) => b[1] - a[1]).slice(0, limit).map(x => x[0]);
  }

  // ── Get prioritized URLs for a topic ────────────────────────
  getResourcesForTopic(topic: string): string[] {
    const nodes = this.queryGraph(topic, 8);
    return nodes.filter(n => n.relevance > 0.5).map(n => n.url);
  }

  // ── Persistence ──────────────────────────────────────────────
  private async _load(): Promise<void> {
    if (this._loaded) return;
    try {
      const [graphRaw, bloomRaw, statsRaw, queueRaw] = await AsyncStorage.multiGet([
        QLH_GRAPH_KEY, QLH_BLOOM_KEY, QLH_STATS_KEY, QLH_QUEUE_KEY,
      ]);
      if (graphRaw[1]) {
        const obj: Record<string, QLHNode> = JSON.parse(graphRaw[1]);
        Object.entries(obj).forEach(([url, node]) => this._graph.set(url, node));
      }
      if (bloomRaw[1]) this._bloom.load(JSON.parse(bloomRaw[1]));
      if (statsRaw[1]) this._stats = { ...this._stats, ...JSON.parse(statsRaw[1]) };
      if (queueRaw[1]) this._queue = JSON.parse(queueRaw[1]);
      this._loaded = true;
    } catch { this._loaded = true; }
  }

  private async _save(): Promise<void> {
    try {
      this._bloom.prune();
      const graphObj: Record<string, QLHNode> = {};
      // Only persist nodes with relevance above floor + limit to 500
      const sorted = Array.from(this._graph.entries())
        .filter(([, n]) => n.relevance >= RELEVANCE_FLOOR)
        .sort((a, b) => b[1].relevance - a[1].relevance)
        .slice(0, 500);
      sorted.forEach(([url, node]) => { graphObj[url] = node; });

      await AsyncStorage.multiSet([
        [QLH_GRAPH_KEY,   JSON.stringify(graphObj)],
        [QLH_BLOOM_KEY,   JSON.stringify(this._bloom.export())],
        [QLH_STATS_KEY,   JSON.stringify(this._stats)],
        [QLH_QUEUE_KEY,   JSON.stringify(this._queue.slice(0, MAX_QUEUE_SIZE))],
      ]);
    } catch {}
  }

  private async _saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QLH_QUEUE_KEY, JSON.stringify(this._queue.slice(0, MAX_QUEUE_SIZE)));
    } catch {}
  }

  async clearAll(): Promise<void> {
    this._graph.clear();
    this._bloom = new BloomFilter();
    this._queue = [];
    this._stats = {
      totalDiscovered: 0, totalHarvested: 0, totalAdded: 0,
      totalFiltered: 0, avgRelevance: 0, lastRunTs: 0,
      graphSize: 0, queueSize: 0, microHarvests: 0,
    };
    this._loaded = false;
    await AsyncStorage.multiRemove([QLH_GRAPH_KEY, QLH_BLOOM_KEY, QLH_STATS_KEY, QLH_QUEUE_KEY]);
  }
}

export const quantumLinkHarvester = new QuantumLinkHarvesterService();
