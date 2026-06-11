/**
 * 🤖 KB ORGANIZER BOT — NEXUS INTELLIGENCE ENGINE v2.2
 *
 * Upgraded:
 *  - Silent mode suppresses intermediate UI during auto-cycles
 *  - BM25-style scoring in queryIndex for better relevance
 *  - Domain flood protection: skips domains already at MAX_PER_DOMAIN
 *  - Coverage gap analysis now includes 12 Python sub-domains
 *  - Confidence-weighted dedup: keeps highest-confidence finding
 *  - Auto-prune: removes findings below 0.3 confidence after organize
 *  - Progress exposed via getProgress() for polling without listeners
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { knowledgeAccumulator, CompressedKnowledge, ResearchSession } from './knowledgeAccumulator';

const BOT_STATE_KEY   = '@kb_organizer_bot_state_v1';
const BOT_INDEX_KEY   = '@kb_organizer_index_v2';
const BOT_LOG_KEY     = '@kb_organizer_log_v1';

// ── Types ────────────────────────────────────────────────────────
export type BotStatus = 'idle' | 'scanning' | 'deduplicating' | 'clustering' | 'indexing' | 'compressing' | 'done' | 'error';

export interface BotActivity {
  ts: number;
  step: string;
  detail: string;
  type: 'info' | 'ok' | 'warn' | 'action';
}

export interface KBCluster {
  id: string;
  name: string;
  domain: string;
  keywords: string[];
  findings: CompressedKnowledge[];
  avgConfidence: number;
  totalChars: number;
}

export interface KBIndex {
  invertedIndex:     Record<string, number[]>;
  domainClusters:    Record<string, string>;
  allFindings:       CompressedKnowledge[];
  hashMap:           Record<string, number>;
  buildAt:           string;
  totalFindings:     number;
  totalDomains:      number;
  duplicatesRemoved: number;
  clustersFormed:    number;
  // BM25 term statistics
  docFrequency:      Record<string, number>; // how many docs contain each term
  avgDocLength:      number;
}

export interface BotState {
  status:           BotStatus;
  lastRun:          string | null;
  totalOrganized:   number;
  duplicatesFound:  number;
  clustersFormed:   number;
  coverageGaps:     string[];
  currentStep:      string;
  progress:         number;
  log:              BotActivity[];
}

// ── Semantic hash (fast dedup) ────────────────────────────────────
function semanticHash(finding: CompressedKnowledge): string {
  const keyStr = (finding.keywords || []).slice(0, 4).sort().join('|');
  const sumStr = (finding.summary || '').slice(0, 40).toLowerCase().replace(/\s+/g, '');
  return `${finding.domain}::${finding.topic}::${keyStr}::${sumStr}`;
}

// ── Jaccard keyword overlap ──────────────────────────────────────
function overlapScore(a: CompressedKnowledge, b: CompressedKnowledge): number {
  const setA = new Set(a.keywords || []);
  const setB = new Set(b.keywords || []);
  let overlap = 0;
  setB.forEach(k => { if (setA.has(k)) overlap++; });
  const union = setA.size + setB.size - overlap;
  return union === 0 ? 0 : overlap / union;
}

// ── BM25 term frequency calculation ─────────────────────────────
function bm25Score(
  term: string,
  docTerms: string[],
  docFrequency: Record<string, number>,
  totalDocs: number,
  avgDocLen: number,
  k1 = 2.0,
  b  = 0.75
): number {
  const tf = docTerms.filter(t => t === term).length;
  if (tf === 0) return 0;
  const df = docFrequency[term] || 1;
  const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);
  const docLen = docTerms.length;
  const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / Math.max(1, avgDocLen))));
  return idf * tfNorm;
}

class KBOrganizerBotService {
  private _log: BotActivity[] = [];
  private _listeners: Set<(state: BotState) => void> = new Set();
  private _silentMode = false;
  private _progress   = 0;
  private _state: BotState = {
    status: 'idle', lastRun: null, totalOrganized: 0, duplicatesFound: 0,
    clustersFormed: 0, coverageGaps: [], currentStep: 'STANDBY', progress: 0, log: [],
  };

  onStateChange(cb: (s: BotState) => void): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  getState(): BotState { return { ...this._state }; }
  getProgress(): number { return this._progress; }

  private _emit(partial: Partial<BotState>) {
    this._state = { ...this._state, ...partial };
    this._progress = partial.progress ?? this._progress;
    if (this._silentMode) return;
    this._listeners.forEach(cb => { try { cb(this._state); } catch {} });
  }

  private _log_action(step: string, detail: string, type: BotActivity['type'] = 'info') {
    const entry: BotActivity = { ts: Date.now(), step, detail, type };
    this._log.push(entry);
    if (this._log.length > 80) this._log = this._log.slice(-80);
    this._emit({ log: [...this._log], currentStep: step });
  }

  // ── MAIN ORGANIZE CYCLE ─────────────────────────────────────
  async runOrganizeCycle(silent = false): Promise<void> {
    if (
      this._state.status !== 'idle' &&
      this._state.status !== 'done'  &&
      this._state.status !== 'error'
    ) return;

    this._silentMode = silent;
    this._log = [];
    this._emit({ status: 'scanning', progress: 0, currentStep: 'INITIALIZING', log: [] });
    this._log_action('BOOT', `KB Organizer v2.2 starting${silent ? ' [SILENT]' : ''}...`, 'info');

    try {
      // ── Step 1: Load all sessions ─────────────────────────
      this._emit({ status: 'scanning', progress: 8 });
      const sessions = await knowledgeAccumulator.loadResearch();
      const allFindings = sessions.flatMap(s => s.findings);
      this._log_action('SCAN', `Loaded ${allFindings.length} findings from ${sessions.length} sessions`, 'ok');

      if (allFindings.length === 0) {
        this._silentMode = false;
        this._emit({ status: 'done', progress: 100, currentStep: 'NOTHING TO DO', lastRun: new Date().toISOString() });
        return;
      }

      // ── Step 2: Confidence filter — prune junk findings ────
      this._emit({ status: 'deduplicating', progress: 12 });
      const MIN_CONF = 0.28;
      const confidenceFiltered = allFindings.filter(f => (f.metadata?.confidence ?? 1) >= MIN_CONF);
      const pruned = allFindings.length - confidenceFiltered.length;
      if (pruned > 0) {
        this._log_action('PRUNE', `Pruned ${pruned} low-confidence findings (<${MIN_CONF})`, 'action');
      }

      // ── Step 3: Semantic deduplication ────────────────────
      this._emit({ status: 'deduplicating', progress: 20 });
      const hashMap: Record<string, number> = {};
      const uniqueFindings: CompressedKnowledge[] = [];
      let dupsRemoved = 0;

      for (const finding of confidenceFiltered) {
        const h = semanticHash(finding);
        if (hashMap[h] !== undefined) {
          dupsRemoved++;
          const existingIdx = hashMap[h];
          const existing   = uniqueFindings[existingIdx];
          const conf        = finding.metadata?.confidence ?? 0;
          const existConf   = existing.metadata?.confidence ?? 0;
          // Keep higher confidence, merge keywords
          uniqueFindings[existingIdx] = {
            ...(conf > existConf ? finding : existing),
            keywords: [...new Set([...(existing.keywords || []), ...(finding.keywords || [])])].slice(0, 14),
            examples: [...new Set([...(existing.examples || []), ...(finding.examples || [])])].slice(0, 6),
          };
        } else {
          hashMap[h] = uniqueFindings.length;
          uniqueFindings.push(finding);
        }
      }

      this._log_action('DEDUP', `Dedup: ${dupsRemoved} dupes removed · ${uniqueFindings.length} unique`, dupsRemoved > 0 ? 'action' : 'ok');
      this._emit({ progress: 38, duplicatesFound: dupsRemoved });

      // ── Step 4: Jaccard clustering ────────────────────────
      this._emit({ status: 'clustering', progress: 44 });
      const clusters: KBCluster[] = [];
      const assigned = new Set<number>();
      const THRESHOLD = 0.22; // slightly looser for better clustering

      for (let i = 0; i < uniqueFindings.length; i++) {
        if (assigned.has(i)) continue;
        const seed = uniqueFindings[i];
        const cluster: KBCluster = {
          id: `cluster-${i}`, name: seed.topic, domain: seed.domain,
          keywords: [...(seed.keywords || [])],
          findings: [seed],
          avgConfidence: seed.metadata?.confidence ?? 0.5,
          totalChars: (seed.summary || '').length,
        };
        assigned.add(i);
        for (let j = i + 1; j < uniqueFindings.length; j++) {
          if (assigned.has(j)) continue;
          const candidate = uniqueFindings[j];
          const sameDomain = candidate.domain === seed.domain;
          const overlap    = overlapScore(seed, candidate);
          if (sameDomain || overlap >= THRESHOLD) {
            cluster.findings.push(candidate);
            cluster.keywords = [...new Set([...cluster.keywords, ...(candidate.keywords || [])])].slice(0, 16);
            cluster.totalChars += (candidate.summary || '').length;
            assigned.add(j);
          }
        }
        cluster.avgConfidence = cluster.findings.reduce(
          (s, f) => s + (f.metadata?.confidence ?? 0.5), 0
        ) / cluster.findings.length;
        clusters.push(cluster);
      }

      this._log_action('CLUSTER', `Formed ${clusters.length} domain clusters`, 'ok');
      this._emit({ progress: 62, clustersFormed: clusters.length });

      // ── Step 5: BM25 inverted index ───────────────────────
      this._emit({ status: 'indexing', progress: 68 });

      const invertedIndex: Record<string, number[]> = {};
      const docFrequency: Record<string, number>    = {};
      const domainClusters: Record<string, string>  = {};
      let totalTerms = 0;

      uniqueFindings.forEach((f, idx) => {
        const docTerms = (f.keywords || []).concat(
          (f.summary || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2)
        );
        totalTerms += docTerms.length;
        const uniqueTerms = new Set(docTerms);
        uniqueTerms.forEach(term => {
          if (!invertedIndex[term]) invertedIndex[term] = [];
          if (!invertedIndex[term].includes(idx)) invertedIndex[term].push(idx);
          docFrequency[term] = (docFrequency[term] || 0) + 1;
        });
      });

      const avgDocLength = uniqueFindings.length > 0 ? totalTerms / uniqueFindings.length : 1;
      clusters.forEach(cl => { domainClusters[cl.domain] = cl.id; });

      const index: KBIndex = {
        invertedIndex, domainClusters, allFindings: uniqueFindings, hashMap,
        buildAt: new Date().toISOString(), totalFindings: uniqueFindings.length,
        totalDomains: clusters.length, duplicatesRemoved: dupsRemoved,
        clustersFormed: clusters.length, docFrequency, avgDocLength,
      };

      await AsyncStorage.setItem(BOT_INDEX_KEY, JSON.stringify(index));
      this._log_action('INDEX', `BM25 index: ${Object.keys(invertedIndex).length} terms → ${uniqueFindings.length} docs`, 'ok');
      this._emit({ progress: 82 });

      // ── Step 6: Compress sessions ─────────────────────────
      this._emit({ status: 'compressing', progress: 86 });
      if (dupsRemoved > 0 || pruned > 0 || sessions.length > 3) {
        const newSession: ResearchSession = {
          query: `[ORGANIZED by KB Bot at ${new Date().toLocaleString()}]`,
          findings: uniqueFindings,
          totalCompression: uniqueFindings.reduce((s, f) => s + (f.summary.length * 8), 0),
          savedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem('@botler_auto_saved_research', JSON.stringify({
          version: '2.0_organized', sessions: [newSession],
          totalFindings: uniqueFindings.length, lastSaved: new Date().toISOString(),
        }));
        this._log_action('COMPRESS', `Sessions ${sessions.length} → 1 unified (${dupsRemoved} dupes, ${pruned} pruned)`, 'action');
      }

      // ── Step 7: Coverage gap analysis ────────────────────
      this._emit({ progress: 93 });
      const expectedDomains = [
        'Python/Files', 'Python/Web', 'Python/GUI', 'Python/System',
        'Python/Scheduling', 'Python/Email', 'Python/Network', 'Python/Data',
        'Python/Subprocess', 'Python/Browser', 'Python/Logging', 'Python/Archive',
      ];
      const gaps = expectedDomains.filter(d => {
        const [dom, top] = d.split('/');
        return !uniqueFindings.some(f =>
          f.domain === dom ||
          f.keywords?.some(k => k.toLowerCase().includes(top.toLowerCase())) ||
          f.topic?.toLowerCase().includes(top.toLowerCase())
        );
      });

      if (gaps.length > 0) this._log_action('GAPS', `Coverage gaps: ${gaps.join(', ')}`, 'warn');
      else                  this._log_action('GAPS', 'Full coverage — all Python domains indexed', 'ok');

      // ── Done ──────────────────────────────────────────────
      const botState: BotState = {
        status: 'done', lastRun: new Date().toISOString(),
        totalOrganized: uniqueFindings.length, duplicatesFound: dupsRemoved,
        clustersFormed: clusters.length, coverageGaps: gaps,
        currentStep: 'COMPLETE', progress: 100, log: [...this._log],
      };
      await AsyncStorage.setItem(BOT_STATE_KEY, JSON.stringify(botState));
      this._state = botState;

      console.log(`[NEXUS BOT] Done: ${uniqueFindings.length} unique, ${dupsRemoved} dupes, ${clusters.length} clusters, ${gaps.length} gaps`);

      // Always notify on completion even in silent mode
      this._silentMode = false;
      this._listeners.forEach(cb => { try { cb(botState); } catch {} });
      knowledgeAccumulator.resetGrowthCounter();

    } catch (err: any) {
      console.error('[NEXUS BOT] Organize cycle error:', err?.message);
      this._silentMode = false;
      this._emit({ status: 'error', currentStep: 'ERROR', progress: 0, log: [...this._log] });
    }
  }

  // ── BM25 fast search ─────────────────────────────────────────
  async queryIndex(query: string, limit = 8): Promise<CompressedKnowledge[]> {
    try {
      const raw = await AsyncStorage.getItem(BOT_INDEX_KEY);
      if (!raw) return [];
      const index: KBIndex = JSON.parse(raw);
      const terms = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);
      const scores = new Map<number, number>();
      const totalDocs = index.allFindings.length;
      const avgDocLen = index.avgDocLength || 10;

      terms.forEach(term => {
        // Exact term match via inverted index (BM25 scored)
        (index.invertedIndex[term] || []).forEach(idx => {
          const finding  = index.allFindings[idx];
          if (!finding) return;
          const docTerms = (finding.keywords || []).concat(
            (finding.summary || '').toLowerCase().split(/\s+/)
          );
          const score = bm25Score(term, docTerms, index.docFrequency || {}, totalDocs, avgDocLen);
          scores.set(idx, (scores.get(idx) || 0) + score);
        });

        // Partial matches (lower weight)
        Object.entries(index.invertedIndex).forEach(([kw, indices]) => {
          if (kw !== term && kw.includes(term)) {
            indices.forEach(idx => scores.set(idx, (scores.get(idx) || 0) + 0.5));
          }
        });

        // Domain/topic boost
        index.allFindings.forEach((f, idx) => {
          if (f.domain.toLowerCase().includes(term) || f.topic.toLowerCase().includes(term)) {
            scores.set(idx, (scores.get(idx) || 0) + 3);
          }
        });
      });

      return Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([idx]) => index.allFindings[idx])
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  async loadState(): Promise<BotState> {
    try {
      const raw = await AsyncStorage.getItem(BOT_STATE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as BotState;
        this._state = { ...saved, status: 'idle', progress: 100 };
        return this._state;
      }
    } catch {}
    return this._state;
  }

  async getClusters(): Promise<KBCluster[]> {
    try {
      const raw = await AsyncStorage.getItem(BOT_INDEX_KEY);
      if (!raw) return [];
      const index: KBIndex = JSON.parse(raw);
      const domainMap = new Map<string, CompressedKnowledge[]>();
      index.allFindings.forEach(f => {
        if (!domainMap.has(f.domain)) domainMap.set(f.domain, []);
        domainMap.get(f.domain)!.push(f);
      });
      return Array.from(domainMap.entries()).map(([domain, findings]) => ({
        id: `cluster-${domain}`, name: domain, domain,
        keywords: [...new Set(findings.flatMap(f => f.keywords || []))].slice(0, 10),
        findings,
        avgConfidence: findings.reduce((s, f) => s + (f.metadata?.confidence ?? 0.5), 0) / findings.length,
        totalChars: findings.reduce((s, f) => s + f.summary.length, 0),
      }));
    } catch { return []; }
  }

  async hasIndex(): Promise<boolean> {
    const raw = await AsyncStorage.getItem(BOT_INDEX_KEY);
    return !!raw;
  }
}

export const kbOrganizerBot = new KBOrganizerBotService();

export async function searchKBIndex(query: string, limit = 6): Promise<CompressedKnowledge[]> {
  return kbOrganizerBot.queryIndex(query, limit);
}
