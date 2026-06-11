/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  Φ-NEXUS BRIDGE PROTOCOL (NBP) v1.0                            ║
 * ║  Proprietary Dual-Channel Knowledge Amplification System        ║
 * ║                                                                  ║
 * ║  Method: Bidirectional Context Fusion (BCF)                     ║
 * ║                                                                  ║
 * ║  ΔNEX  — Mobile local KB index query (sub-millisecond)          ║
 * ║  ΣNET  — PC relay enrichment (unrestricted web access)          ║
 * ║  ΦFUSE — Dual-channel synthesis before every Gemini call        ║
 * ║  ΩLOOP — Self-reinforcing growth loop (every answer grows KB)   ║
 * ║                                                                  ║
 * ║  Unique Architecture:                                            ║
 * ║    Mobile ──[ΔNEX]──► Local Index ──────────────────────┐       ║
 * ║                                                          ▼       ║
 * ║    Mobile ──[ΣNET]──► PC Server ──► Web ──► PC ──► [ΦFUSE]     ║
 * ║                                                          │       ║
 * ║                                                     Gemini API  ║
 * ║                                                          │       ║
 * ║                                                    [ΩLOOP]─►KB  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { serverConnection } from './serverConnection';
import { knowledgeAccumulator, CompressedKnowledge } from './knowledgeAccumulator';
import { kbOrganizerBot } from './kbOrganizerBot';
import { nexusBridgeSettings } from './nexusBridgeSettings';

// ── Types ─────────────────────────────────────────────────────────
export interface NexusContext {
  localFindings:   CompressedKnowledge[];   // ΔNEX results
  relayFindings:   PCEnrichmentResult[];    // ΣNET results
  fusedBlock:      string;                  // ΦFUSE — ready for Gemini
  growthCount:     number;                  // ΩLOOP — new KB entries added
  latencyMs:       number;
  channel:         'FULL_BRIDGE' | 'LOCAL_ONLY' | 'RELAY_ONLY' | 'EMPTY';
  deltaScore:      number;                  // 0-100 relevance confidence
}

export interface PCEnrichmentResult {
  source:   string;
  topic:    string;
  snippet:  string;
  keywords: string[];
  score:    number;
}

export interface BridgeStats {
  totalCallsTotal:    number;
  localHits:         number;
  relayHits:         number;
  fullBridgeHits:    number;
  totalGrowth:       number;
  avgLatencyMs:      number;
  lastUsed:          string;
}

const BRIDGE_STATS_KEY = '@nexus_bridge_stats_v1';
const BRIDGE_CACHE_KEY = '@nexus_bridge_cache_v2';
const CACHE_TTL_MS_DEFAULT = 5 * 60 * 1000; // 5 minute default; overridden by nexusBridgeSettings

// ── Keyword extractor (no embedding model needed) ────────────────
function extractQueryKeywords(text: string): string[] {
  // Remove common stop words, extract meaningful terms
  const stopWords = new Set([
    'the','a','an','is','are','was','were','be','been','being',
    'have','has','had','do','does','did','will','would','could',
    'should','may','might','can','to','of','in','on','at','by',
    'for','with','about','as','into','through','during','before',
    'after','above','below','from','up','down','that','this',
    'these','those','then','so','but','not','or','and','if','i',
    'me','my','we','you','your','he','she','it','they','them',
    'what','how','why','when','where','who','which','get','want',
    'make','use','help','need','can','run','its','just','like',
    'also','do','got','has','any','all','our','out','more','some',
  ]);
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 12);
}

// ── Relevance scorer (BM25-inspired, no vector db needed) ─────────
function scoreRelevance(finding: CompressedKnowledge, queryKws: string[]): number {
  if (!queryKws.length) return 0;
  const fKws = new Set((finding.keywords || []).map(k => k.toLowerCase()));
  const fText = `${finding.topic} ${finding.domain} ${finding.summary}`.toLowerCase();

  let score = 0;
  for (const kw of queryKws) {
    if (fKws.has(kw))           score += 3;   // exact keyword match
    if (finding.topic.toLowerCase().includes(kw)) score += 2; // topic match
    if (fText.includes(kw))     score += 1;   // text contains keyword
  }

  // Boost by confidence
  score *= (finding.metadata?.confidence ?? 0.7);
  // Decay by age (recency bonus)
  const ageDays = finding.metadata?.timestamp
    ? (Date.now() - finding.metadata.timestamp) / 86400000
    : 30;
  score *= Math.max(0.5, 1 - ageDays / 90); // decay over 90 days

  return Math.round(score * 10) / 10;
}

class NexusBridgeService {
  private _stats: BridgeStats = {
    totalCallsTotal: 0, localHits: 0, relayHits: 0,
    fullBridgeHits: 0, totalGrowth: 0, avgLatencyMs: 0, lastUsed: '',
  };
  private _latencies: number[] = [];

  // ── MAIN BRIDGE ENTRY POINT ──────────────────────────────────
  /**
   * The Φ-NEXUS BRIDGE PROTOCOL:
   * Dual-channel knowledge amplification before every Gemini call.
   *
   * @param userMessage - The user's current message
   * @param options     - Bridge configuration
   * @returns NexusContext with fusedBlock ready to inject into system prompt
   */
  async buildNexusContext(
    userMessage: string,
    options: {
      maxLocal?: number;    // max KB findings from ΔNEX
      maxRelay?: number;    // max enrichments from ΣNET
      timeoutMs?: number;   // total budget for both channels
      relayEnabled?: boolean; // use PC relay (ΣNET)
      growthEnabled?: boolean; // ΩLOOP auto-grow KB
    } = {}
  ): Promise<NexusContext> {
    const start = Date.now();
    const {
      maxLocal     = 6,
      maxRelay     = 4,
      timeoutMs    = 5000, // increased from 2500 so KB relay results actually arrive
      relayEnabled = true,
      growthEnabled = true,
    } = options;

    this._stats.totalCallsTotal++;
    this._stats.lastUsed = new Date().toISOString();

    const queryKws = extractQueryKeywords(userMessage);

    // ── Check cache first ─────────────────────────────────────
    const cacheKey = queryKws.slice(0, 6).sort().join('|');
    // Load user-configured settings
    const userSettings = nexusBridgeSettings.get();
    const effectiveMaxRelay  = userSettings.maxRelayResults || maxRelay;
    const effectiveRelayOn   = relayEnabled && userSettings.relayEnabled && !userSettings.localOnlyMode;
    const effectiveCacheTTL  = (userSettings.cacheTTLMinutes || 5) * 60 * 1000;
    const effectiveGrowth    = growthEnabled && userSettings.growthEnabled;

    const cached = await this._getCached(cacheKey, effectiveCacheTTL);
    if (cached) {
      return { ...cached, latencyMs: Date.now() - start };
    }

    // ── ΔNEX — Local KB index query (always runs, sub-ms) ────
    const localFindings = await this._deltaNex(queryKws, maxLocal);

    // ── ΣNET — PC relay enrichment (parallel, with timeout) ──
    let relayFindings: PCEnrichmentResult[] = [];
    if (effectiveRelayOn) {
      const relayBudget = Math.max(600, timeoutMs - (Date.now() - start) - 200);
      relayFindings = await this._sigmaNet(userMessage, queryKws, effectiveMaxRelay, relayBudget);
    }

    // ── ΦFUSE — Synthesize both channels into one context block ─
    const fusedBlock = this._phiFuse(userMessage, localFindings, relayFindings, queryKws);

    // ── ΩLOOP — Auto-grow KB from relay findings ──────────────
    let growthCount = 0;
    if (effectiveGrowth && relayFindings.length > 0) {
      growthCount = await this._omegaLoop(relayFindings, queryKws);
    }

    // ── Determine channel type ────────────────────────────────
    const channel: NexusContext['channel'] =
      localFindings.length > 0 && relayFindings.length > 0 ? 'FULL_BRIDGE' :
      localFindings.length > 0 ? 'LOCAL_ONLY' :
      relayFindings.length > 0 ? 'RELAY_ONLY' : 'EMPTY';

    // ── Compute delta score ───────────────────────────────────
    const topScore = localFindings.length > 0
      ? Math.max(...localFindings.map(f => scoreRelevance(f, queryKws)))
      : 0;
    const deltaScore = Math.min(100, Math.round(topScore * 10 + relayFindings.length * 8));

    const latencyMs = Date.now() - start;
    this._trackLatency(latencyMs);

    // ── Update stats ──────────────────────────────────────────
    if (localFindings.length > 0)   this._stats.localHits++;
    if (relayFindings.length > 0)   this._stats.relayHits++;
    if (channel === 'FULL_BRIDGE')  this._stats.fullBridgeHits++;
    this._stats.totalGrowth += growthCount;

    const result: NexusContext = {
      localFindings, relayFindings, fusedBlock,
      growthCount, latencyMs, channel, deltaScore,
    };

    // Cache for 5 minutes
    await this._setCached(cacheKey, result);
    await this._saveStats();

    return result;
  }

  // ── ΔNEX: Local KB Index Query ────────────────────────────────
  private async _deltaNex(
    queryKws: string[],
    maxResults: number
  ): Promise<CompressedKnowledge[]> {
    try {
      // Try NEXUS bot index first (O(1) lookup via inverted index)
      const indexed = await kbOrganizerBot.queryIndex(queryKws.join(' '), maxResults);
      if (indexed.length > 0) return indexed;

      // Fallback: linear scan with BM25-inspired scoring
      const sessions = await knowledgeAccumulator.loadResearch();
      const allFindings = sessions.flatMap(s => s.findings);
      if (!allFindings.length || !queryKws.length) return [];

      const scored = allFindings
        .map(f => ({ f, score: scoreRelevance(f, queryKws) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
        .map(({ f }) => f);

      return scored;
    } catch {
      return [];
    }
  }

  // ── ΣNET: PC Relay Enrichment ─────────────────────────────────
  private async _sigmaNet(
    userMessage: string,
    queryKws: string[],
    maxResults: number,
    budgetMs: number
  ): Promise<PCEnrichmentResult[]> {
    const ip    = serverConnection.getIP();
    const port  = serverConnection.getPort();
    const token = serverConnection.getToken();
    if (!ip || !port) return [];

    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), budgetMs);

      const res = await fetch(`http://${ip}:${port}/api/kb/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: userMessage,
          keywords: queryKws,
          maxResults,
          mode: 'semantic', // PC side: semantic keyword matching
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) return [];
      const data = await res.json();
      return (data.enrichments || []).slice(0, maxResults) as PCEnrichmentResult[];
    } catch {
      // ΣNET offline — degrade gracefully to ΔNEX only
      return [];
    }
  }

  // ── ΦFUSE: Dual-Channel Synthesis ────────────────────────────
  private _phiFuse(
    userMessage: string,
    local: CompressedKnowledge[],
    relay: PCEnrichmentResult[],
    queryKws: string[]
  ): string {
    if (local.length === 0 && relay.length === 0) return '';

    const lines: string[] = [];
    lines.push('[KB CONTEXT — Φ-NEXUS BRIDGE]');
    lines.push(`Query keywords: ${queryKws.slice(0, 8).join(', ')}`);
    lines.push('');

    // ΔNEX local findings
    if (local.length > 0) {
      lines.push(`── ΔNEX LOCAL INDEX (${local.length} findings) ──`);
      for (const f of local) {
        const conf = Math.round((f.metadata?.confidence ?? 0.7) * 100);
        lines.push(`[${f.domain}/${f.topic}] conf:${conf}%`);
        lines.push(`  Summary: ${f.summary.slice(0, 200)}`);
        if (f.keywords?.length) {
          lines.push(`  Keywords: ${f.keywords.slice(0, 6).join(', ')}`);
        }
        if (f.examples?.length) {
          lines.push(`  Example: ${f.examples[0].slice(0, 120)}`);
        }
        lines.push('');
      }
    }

    // ΣNET relay findings
    if (relay.length > 0) {
      lines.push(`── ΣNET PC-RELAY ENRICHMENT (${relay.length} sources) ──`);
      for (const r of relay) {
        lines.push(`[${r.topic}] score:${r.score} src:${r.source.slice(0, 40)}`);
        lines.push(`  ${r.snippet.slice(0, 250)}`);
        if (r.keywords?.length) {
          lines.push(`  kw: ${r.keywords.slice(0, 5).join(', ')}`);
        }
        lines.push('');
      }
    }

    lines.push('[/KB CONTEXT]');
    lines.push('USE THE ABOVE KNOWLEDGE FIRST before answering. If relevant, cite the domain/topic.');

    return lines.join('\n');
  }

  // ── ΩLOOP: Auto-grow KB from new relay findings ───────────────
  private async _omegaLoop(
    relay: PCEnrichmentResult[],
    queryKws: string[]
  ): Promise<number> {
    let added = 0;
    for (const r of relay) {
      if (!r.snippet || r.snippet.length < 40) continue;
      try {
        const existing = await kbOrganizerBot.queryIndex(r.topic, 1);
        // Only add if not already known (dedup check)
        const alreadyKnown = existing.some(f =>
          f.topic.toLowerCase() === r.topic.toLowerCase() &&
          f.summary.slice(0, 60) === r.snippet.slice(0, 60)
        );
        if (!alreadyKnown) {
          const domain = r.source.includes('python') ? 'Python' :
                        r.source.includes('github') ? 'GitHub' : 'Web';
          const compressed = knowledgeAccumulator.compressResearch(
            r.snippet, domain, r.topic, r.source
          );
          knowledgeAccumulator.addFinding(compressed);
          added++;
        }
      } catch {}
    }
    if (added > 0) {
      // Fire-and-forget save (don't await — don't block Gemini call)
      knowledgeAccumulator.saveNow().catch(() => {});
    }
    return added;
  }

  // ── Cache helpers ────────────────────────────────────────────
  private async _getCached(key: string, ttlMs = CACHE_TTL_MS_DEFAULT): Promise<NexusContext | null> {
    try {
      const raw = await AsyncStorage.getItem(`${BRIDGE_CACHE_KEY}:${key}`);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > ttlMs) return null;
      return data as NexusContext;
    } catch { return null; }
  }

  private async _setCached(key: string, ctx: NexusContext): Promise<void> {
    try {
      // Strip large fields before caching
      const slim: NexusContext = {
        ...ctx,
        localFindings: ctx.localFindings.slice(0, 4),
        relayFindings: ctx.relayFindings.slice(0, 3),
      };
      await AsyncStorage.setItem(
        `${BRIDGE_CACHE_KEY}:${key}`,
        JSON.stringify({ ts: Date.now(), data: slim })
      );
    } catch {}
  }

  private _trackLatency(ms: number) {
    this._latencies.push(ms);
    if (this._latencies.length > 20) this._latencies.shift();
    this._stats.avgLatencyMs = Math.round(
      this._latencies.reduce((a, b) => a + b, 0) / this._latencies.length
    );
  }

  private async _saveStats() {
    try {
      await AsyncStorage.setItem(BRIDGE_STATS_KEY, JSON.stringify(this._stats));
    } catch {}
  }

  async loadStats(): Promise<BridgeStats> {
    try {
      const raw = await AsyncStorage.getItem(BRIDGE_STATS_KEY);
      if (raw) this._stats = JSON.parse(raw);
    } catch {}
    return this._stats;
  }

  getStats(): BridgeStats { return { ...this._stats }; }

  /**
   * Format a compact one-line bridge status for the Butler header
   */
  formatBridgeStatus(ctx: NexusContext): string {
    const ch = ctx.channel === 'FULL_BRIDGE' ? 'Φ-NBP' :
               ctx.channel === 'LOCAL_ONLY'   ? 'ΔNEX' :
               ctx.channel === 'RELAY_ONLY'   ? 'ΣNET' : '--';
    return `[${ch}] ${ctx.localFindings.length}L+${ctx.relayFindings.length}R · Δ${ctx.deltaScore} · ${ctx.latencyMs}ms`;
  }
}

export const nexusBridge = new NexusBridgeService();
