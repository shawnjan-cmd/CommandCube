/**
 * 🔧 ERROR AUTO-FIX ENGINE
 * Central service: combines pattern detection + KB lookup + server suggestions
 * Used by ALL tabs: Scripts, Library, Butler, Knowledge, Settings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectErrorPattern, ErrorPattern } from './errorPatternDetector';
import { aiLogger } from './aiLogger';
import { serverConnection } from './serverConnection';

export interface AutoFixResult {
  pattern: ErrorPattern | null;
  kbSuggestions: KBSuggestion[];
  serverAvailable: boolean;
  autoFixed: boolean;
  fixedBy: string;
}

export interface KBSuggestion {
  topic: string;
  summary: string;
  keywords: string[];
  confidence: number;
}

const KB_KEY = '@butler_knowledge_base_v2';
const FIX_HISTORY_KEY = '@butler_fix_history_v1';
const MAX_FIX_HISTORY = 100;

interface FixHistoryEntry {
  ts: number;
  errorType: string;
  scriptName: string;
  fixApplied: string;
  success: boolean;
}

class ErrorAutoFixEngine {
  private fixHistory: FixHistoryEntry[] = [];
  private kbCache: any[] = [];
  private cacheTs = 0;
  private readonly CACHE_TTL = 60_000; // 1 min

  // ── Load KB from AsyncStorage ──────────────────────────────────
  private async loadKB(): Promise<any[]> {
    const now = Date.now();
    if (this.kbCache.length > 0 && now - this.cacheTs < this.CACHE_TTL) {
      return this.kbCache;
    }
    try {
      const raw = await AsyncStorage.getItem(KB_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.kbCache = Array.isArray(data) ? data : (data?.entries || []);
        this.cacheTs = now;
        return this.kbCache;
      }
    } catch (e: any) {
      aiLogger.warn(`[AutoFix] KB load error: ${e?.message}`);
    }
    return [];
  }

  // ── Search KB for relevant entries ────────────────────────────
  async searchKB(errorOutput: string, scriptName?: string): Promise<KBSuggestion[]> {
    const kb = await this.loadKB();
    if (!kb.length) return [];

    const errorWords = errorOutput.toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 3)
      .slice(0, 15);

    const scored: Array<{ entry: any; score: number }> = [];
    for (const entry of kb) {
      const text = `${entry.topic || ''} ${entry.summary || ''} ${(entry.keywords || []).join(' ')}`.toLowerCase();
      let score = 0;
      for (const word of errorWords) {
        if (text.includes(word)) score += 1;
      }
      // Boost Python/error related entries
      if (text.includes('error') || text.includes('fix') || text.includes('install')) score += 0.5;
      if (score > 0) scored.push({ entry, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map(({ entry, score }) => ({
      topic: entry.topic || 'Python',
      summary: entry.summary || '',
      keywords: entry.keywords || [],
      confidence: Math.min(1, score / 5),
    }));
  }

  // ── Full auto-fix analysis ────────────────────────────────────
  async analyze(errorOutput: string, scriptName: string = 'Script'): Promise<AutoFixResult> {
    aiLogger.info(`[AutoFix] Analyzing error in: ${scriptName}`);

    const [pattern, kbSuggestions] = await Promise.all([
      Promise.resolve(detectErrorPattern(errorOutput)),
      this.searchKB(errorOutput, scriptName),
    ]);

    // Check server availability
    let serverAvailable = false;
    try {
      const ip = await AsyncStorage.getItem('commandcube_server_ip');
      const port = await AsyncStorage.getItem('commandcube_server_port');
      if (ip && port) {
        const res = await serverConnection.ping(ip, port, 3000);
        serverAvailable = res.connected;
      }
    } catch {}

    // Record to fix history
    if (pattern) {
      await this.recordFix(pattern.type, scriptName, pattern.fixes[0]?.command || '');
    }

    aiLogger.info(`[AutoFix] Done — type=${pattern?.type || 'unknown'} kb=${kbSuggestions.length} server=${serverAvailable}`);

    return {
      pattern,
      kbSuggestions,
      serverAvailable,
      autoFixed: false,
      fixedBy: '',
    };
  }

  // ── Record fix attempt ────────────────────────────────────────
  private async recordFix(errorType: string, scriptName: string, fixApplied: string) {
    try {
      const entry: FixHistoryEntry = {
        ts: Date.now(), errorType, scriptName, fixApplied, success: false,
      };
      this.fixHistory.unshift(entry);
      if (this.fixHistory.length > MAX_FIX_HISTORY) {
        this.fixHistory = this.fixHistory.slice(0, MAX_FIX_HISTORY);
      }
      await AsyncStorage.setItem(FIX_HISTORY_KEY, JSON.stringify(this.fixHistory));
    } catch {}
  }

  // ── Load fix history ──────────────────────────────────────────
  async loadHistory(): Promise<FixHistoryEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(FIX_HISTORY_KEY);
      if (raw) {
        this.fixHistory = JSON.parse(raw);
        return this.fixHistory;
      }
    } catch {}
    return [];
  }

  // ── Get most common error types ───────────────────────────────
  async getErrorStats(): Promise<Array<{ type: string; count: number }>> {
    const history = await this.loadHistory();
    const counts: Record<string, number> = {};
    for (const h of history) {
      counts[h.errorType] = (counts[h.errorType] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }

  // ── Invalidate KB cache (call after KB updates) ───────────────
  invalidateCache() {
    this.kbCache = [];
    this.cacheTs = 0;
  }

  // ── Quick pattern-only check (sync, no KB needed) ─────────────
  quickDetect(errorOutput: string): ErrorPattern | null {
    return detectErrorPattern(errorOutput);
  }
}

export const errorAutoFix = new ErrorAutoFixEngine();
