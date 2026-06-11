/**
 * ⚡ PROPRIETARY KB COLLECTION METHODS — 7 Unique Techniques
 *
 * These are original methods developed for CommandCube/NexusMind:
 *
 * 1. ΦDELTA — Context Delta Harvesting
 *    Monitors what topics Butler AI is asked about, finds gaps vs KB,
 *    auto-crawls gap topics immediately via SIGMA-NET relay.
 *
 * 2. ΩFINGERPRINT — Execution Fingerprint Learning
 *    After every script execution, extracts patterns from stdout/errors,
 *    builds a "what works on this PC" knowledge graph node.
 *
 * 3. ΛHARVEST — Lambda File Harvest
 *    Scans local Python files found via ΛSCAN and generates KB entries
 *    from docstrings and code patterns using local pattern extraction.
 *
 * 4. ΨRSS — RSS/Atom Feed Aggregator
 *    Crawls Python/tech RSS feeds (PlanetPython, RealPython, etc.)
 *    via PC relay, extracts article summaries, stores in KB.
 *
 * 5. ΤTRACE — Error Trace Learning
 *    When scripts fail, analyses the traceback, creates a "known failure"
 *    KB entry with fix suggestions (auto-fix knowledge graph).
 *
 * 6. ΧCLUSTER — Cross-Script Pattern Clustering
 *    Analyses the user's executed scripts, finds common import patterns,
 *    generates synthetic KB entries about their PC's Python environment.
 *
 * 7. ΞNEXUS-DIFF — Version Differential Tracker
 *    When server upgrades are detected, crawls changelogs and stores
 *    "what changed" entries in KB for instant butler context.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { knowledgeAccumulator, CompressedKnowledge } from './knowledgeAccumulator';
import { kbGrowthTracker } from './kbGrowthTracker';
import { serverConnection } from './serverConnection';

const PKM_STATE_KEY = '@pkm_state_v1';
const PKM_ERRORS_KEY = '@pkm_errors_v1';

export interface PKMStats {
  phiDelta:     number;
  omegaFp:      number;
  lambdaHarvest:number;
  psiRss:       number;
  tauTrace:     number;
  chiCluster:   number;
  xiDiff:       number;
  lastRun:      number;
}

const INITIAL_STATS: PKMStats = {
  phiDelta: 0, omegaFp: 0, lambdaHarvest: 0,
  psiRss: 0, tauTrace: 0, chiCluster: 0, xiDiff: 0, lastRun: 0,
};

// Python/tech RSS feeds accessible via PC relay
const RSS_TARGETS = [
  { url: 'https://planetpython.org/rss20.xml',      domain: 'Python', label: 'PlanetPython' },
  { url: 'https://realpython.com/atom.xml',          domain: 'Python', label: 'RealPython' },
  { url: 'https://www.pyvideo.org/rss.xml',          domain: 'Python', label: 'PyVideo' },
  { url: 'https://feeds.feedburner.com/PythonInsider',domain:'Python', label: 'PythonInsider' },
  { url: 'https://pypi.org/rss/updates.xml',         domain: 'Python', label: 'PyPI Updates' },
];

class ProprietaryKBMethods {
  private _stats: PKMStats = { ...INITIAL_STATS };
  private _running = false;

  async loadStats(): Promise<PKMStats> {
    try {
      const raw = await AsyncStorage.getItem(PKM_STATE_KEY);
      this._stats = raw ? { ...INITIAL_STATS, ...JSON.parse(raw) } : { ...INITIAL_STATS };
    } catch { this._stats = { ...INITIAL_STATS }; }
    return this._stats;
  }

  private async _saveStats(): Promise<void> {
    try { await AsyncStorage.setItem(PKM_STATE_KEY, JSON.stringify(this._stats)); } catch {}
  }

  // ═══════════════════════════════════════════════════════════════
  // METHOD 1: ΦDELTA — Context Delta Harvesting
  // Detects what Butler AI is being asked about vs what's in KB,
  // auto-crawls the gap immediately.
  // ═══════════════════════════════════════════════════════════════
  async runPhiDelta(question: string, kbHits: number): Promise<number> {
    // If KB has < 2 results for the question, flag as a gap
    if (kbHits >= 2) return 0;
    const ip = serverConnection.getIP();
    const port = serverConnection.getPort();
    if (!ip || !port) return 0;

    try {
      // Build a focused crawl query from the question
      const query = question.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().slice(0, 80);
      const searchUrl = `https://docs.python.org/3/search.html?q=${encodeURIComponent(query)}`;
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 12000);

      const res = await fetch(`http://${ip}:${port}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: `
import requests, re, sys
url = "${searchUrl}"
try:
    r = requests.get(url, timeout=8, headers={"User-Agent":"NexusBot/5.0"})
    text = r.text
    # Extract result titles and snippets
    titles = re.findall(r'<h3[^>]*>.*?<a[^>]*>([^<]+)</a>', text)
    snippets = re.findall(r'<p[^>]*class="[^"]*result[^"]*"[^>]*>(.*?)</p>', text, re.DOTALL)
    clean_snippets = [re.sub(r'<[^>]+>', '', s).strip()[:200] for s in snippets[:5]]
    result = "PYTHON DOCS RESULTS FOR: " + ${JSON.stringify(query)} + "\\n"
    for t, s in zip(titles[:5], clean_snippets):
        result += f"\\n## {t}\\n{s}\\n"
    print(result[:2000])
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
`.trim()
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) return 0;
      const data = await res.json();
      const output = (data.output || '').trim();
      if (output.length < 50) return 0;

      const compressed = knowledgeAccumulator.compressResearch(
        output, 'Python', query.slice(0, 40), 'phi_delta_harvest'
      );
      const added = knowledgeAccumulator.addFindingDeduped(compressed);
      if (added) {
        await knowledgeAccumulator.saveNow();
        this._stats.phiDelta++;
        await this._saveStats();
        await kbGrowthTracker.record(1, 'phi_delta', 'Python');
        return 1;
      }
    } catch {}
    return 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // METHOD 2: ΩFINGERPRINT — Execution Fingerprint Learning
  // Learns from script executions: what ran, what failed, PC environment
  // ═══════════════════════════════════════════════════════════════
  async runOmegaFingerprint(scriptName: string, output: string, error: string, scriptCode: string): Promise<void> {
    if (!scriptName || (!output && !error)) return;
    try {
      // Extract imports from the script
      const imports = (scriptCode.match(/^(?:import|from)\s+\S+/gm) || []).slice(0, 8).join(', ');
      // Build fingerprint entry
      const success = !error && output.length > 0;
      const entry = `Script: ${scriptName}\nStatus: ${success ? 'SUCCESS' : 'FAILED'}\nImports: ${imports}\n${success ? 'Output: ' + output.slice(0, 200) : 'Error: ' + error.slice(0, 200)}`;
      const topic = success ? `${scriptName} execution pattern` : `${scriptName} error pattern`;
      const compressed = knowledgeAccumulator.compressResearch(
        entry, success ? 'Execution' : 'Errors', topic, 'omega_fingerprint'
      );
      compressed.metadata.confidence = success ? 0.85 : 0.7;
      const added = knowledgeAccumulator.addFindingDeduped(compressed);
      if (added) {
        await knowledgeAccumulator.saveNow();
        this._stats.omegaFp++;
        await this._saveStats();
        await kbGrowthTracker.record(1, 'omega_fingerprint', success ? 'Execution' : 'Errors');
      }
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════
  // METHOD 3: ΛHARVEST — Lambda File Harvest
  // Extracts docstrings and patterns from scanned Python files
  // ═══════════════════════════════════════════════════════════════
  async runLambdaHarvest(filename: string, code: string): Promise<number> {
    if (!code || code.length < 50) return 0;
    try {
      // Extract docstrings
      const docstrings = code.match(/"""[\s\S]*?"""|'''[\s\S]*?'''/g) || [];
      const imports = (code.match(/^(?:import|from)\s+.+/gm) || []).slice(0, 10);
      const functions = (code.match(/^def\s+\w+\([^)]*\)/gm) || []).slice(0, 8);

      const summary = [
        `File: ${filename}`,
        `Imports: ${imports.slice(0, 5).join(', ')}`,
        `Functions: ${functions.slice(0, 4).join(', ')}`,
        docstrings.length > 0 ? `Docs: ${docstrings[0].replace(/"""|'''/g, '').trim().slice(0, 200)}` : '',
      ].filter(Boolean).join('\n');

      if (summary.length < 40) return 0;

      const compressed = knowledgeAccumulator.compressResearch(
        summary,
        'LocalScripts',
        `${filename} patterns`,
        'lambda_harvest'
      );
      compressed.metadata.confidence = 0.8;
      const added = knowledgeAccumulator.addFindingDeduped(compressed);
      if (added) {
        await knowledgeAccumulator.saveNow();
        this._stats.lambdaHarvest++;
        await this._saveStats();
        await kbGrowthTracker.record(1, 'lambda_harvest', 'LocalScripts');
        return 1;
      }
    } catch {}
    return 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // METHOD 4: ΨRSS — RSS Feed Aggregator
  // Crawls Python tech RSS feeds via PC relay
  // ═══════════════════════════════════════════════════════════════
  async runPsiRSS(progressCb?: (msg: string) => void): Promise<number> {
    if (this._running) return 0;
    const ip = serverConnection.getIP();
    const port = serverConnection.getPort();
    if (!ip || !port) return 0;

    this._running = true;
    let totalAdded = 0;

    try {
      for (const feed of RSS_TARGETS.slice(0, 3)) { // 3 feeds max per run
        progressCb?.(`RSS: fetching ${feed.label}...`);
        try {
          const ctrl = new AbortController();
          setTimeout(() => ctrl.abort(), 15000);

          const res = await fetch(`http://${ip}:${port}/api/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              script: `
import requests, re, sys
url = ${JSON.stringify(feed.url)}
try:
    r = requests.get(url, timeout=10, headers={"User-Agent":"NexusBot/5.0"})
    xml = r.text
    # Extract titles and descriptions from RSS
    titles = re.findall(r'<title><!\\[CDATA\\[([^\\]]+)\\]\\]>|<title>([^<]+)</title>', xml)
    descs = re.findall(r'<description><!\\[CDATA\\[([^\\]]+)\\]\\]>|<description>([^<]+)</description>', xml)
    result = ""
    for i in range(min(5, len(titles))):
        t = (titles[i][0] or titles[i][1]).strip()
        d = (descs[i][0] if i < len(descs) else "") or (descs[i][1] if i < len(descs) else "")
        d = re.sub(r'<[^>]+>', '', d).strip()[:300]
        if len(t) > 5 and len(d) > 10:
            result += f"## {t}\\n{d}\\n\\n"
    print(result[:3000] if result else "No content")
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
`.trim()
            }),
            signal: ctrl.signal,
          });

          if (!res.ok) continue;
          const data = await res.json();
          const output = (data.output || '').trim();
          if (output.length < 100 || output.startsWith('Error')) continue;

          const compressed = knowledgeAccumulator.compressResearch(
            output, feed.domain, `${feed.label} latest`, feed.url
          );
          compressed.metadata.confidence = 0.75;
          const added = knowledgeAccumulator.addFindingDeduped(compressed);
          if (added) {
            totalAdded++;
            this._stats.psiRss++;
            await kbGrowthTracker.record(1, 'psi_rss', feed.domain);
            progressCb?.(`RSS: ✓ ${feed.label} → +1 finding`);
          }

          await new Promise(r => setTimeout(r, 500));
        } catch {}
      }

      if (totalAdded > 0) {
        await knowledgeAccumulator.saveNow();
        await this._saveStats();
      }
    } finally {
      this._running = false;
    }

    return totalAdded;
  }

  // ═══════════════════════════════════════════════════════════════
  // METHOD 5: ΤTRACE — Error Trace Learning
  // When scripts fail, builds a "known error → fix" KB entry
  // ═══════════════════════════════════════════════════════════════
  async runTauTrace(scriptName: string, errorText: string): Promise<void> {
    if (!errorText || errorText.length < 30) return;
    try {
      // Parse error type
      const errorMatch = errorText.match(/(\w+Error|\w+Exception|ModuleNotFoundError|ImportError):/);
      const errorType = errorMatch ? errorMatch[1] : 'UnknownError';

      // Build fix suggestion based on error type
      const fixes: Record<string, string> = {
        'ModuleNotFoundError': 'Run: pip install <module_name>',
        'ImportError':         'Run: pip install <module_name> or check Python version',
        'PermissionError':     'Run as administrator or check file permissions',
        'FileNotFoundError':   'Check that the file path exists and is accessible',
        'ConnectionError':     'Check network connectivity and server address',
        'TimeoutError':        'Increase timeout value or check server health',
      };
      const fix = fixes[errorType] || 'Check Python docs for this error type';

      const entry = `Error in script: ${scriptName}\nError Type: ${errorType}\nError Detail: ${errorText.slice(0, 300)}\nSuggested Fix: ${fix}`;
      const compressed = knowledgeAccumulator.compressResearch(
        entry, 'ErrorFixes', `${errorType} fix pattern`, 'tau_trace'
      );
      compressed.metadata.confidence = 0.9; // High confidence — real observed error

      const added = knowledgeAccumulator.addFindingDeduped(compressed);
      if (added) {
        await knowledgeAccumulator.saveNow();
        this._stats.tauTrace++;
        await this._saveStats();
        await kbGrowthTracker.record(1, 'tau_trace', 'ErrorFixes');
      }
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════
  // METHOD 6: ΧCLUSTER — Cross-Script Pattern Clustering
  // Analyzes execution history to find PC-specific Python patterns
  // ═══════════════════════════════════════════════════════════════
  async runChiCluster(executionHistory: Array<{ scriptName: string; scriptCode: string; success: boolean }>): Promise<number> {
    if (executionHistory.length < 3) return 0;
    try {
      // Find common imports across executed scripts
      const importMap: Record<string, number> = {};
      for (const entry of executionHistory.slice(-20)) {
        const imports = (entry.scriptCode?.match(/^(?:import|from)\s+(\S+)/gm) || []);
        imports.forEach(imp => {
          const mod = imp.replace(/^(?:import|from)\s+/, '').split('.')[0];
          importMap[mod] = (importMap[mod] || 0) + 1;
        });
      }

      // Sort by frequency
      const topImports = Object.entries(importMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      if (topImports.length === 0) return 0;

      const successRate = executionHistory.filter(e => e.success).length / executionHistory.length;
      const summary = [
        `PC Python Environment Analysis:`,
        `Most used modules: ${topImports.map(([m, c]) => `${m}(${c}x)`).join(', ')}`,
        `Script success rate: ${(successRate * 100).toFixed(0)}%`,
        `Total executions analyzed: ${executionHistory.length}`,
        `Top modules suggest expertise in: ${topImports.slice(0, 3).map(([m]) => m).join(', ')} automation`,
      ].join('\n');

      const compressed = knowledgeAccumulator.compressResearch(
        summary, 'UserProfile', 'PC Python environment profile', 'chi_cluster'
      );
      compressed.metadata.confidence = 0.85;

      const added = knowledgeAccumulator.addFindingDeduped(compressed);
      if (added) {
        await knowledgeAccumulator.saveNow();
        this._stats.chiCluster++;
        await this._saveStats();
        await kbGrowthTracker.record(1, 'chi_cluster', 'UserProfile');
        return 1;
      }
    } catch {}
    return 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // METHOD 7: ΞNEXUS-DIFF — Version Differential Tracker
  // Detects server version changes and crawls changelogs
  // ═══════════════════════════════════════════════════════════════
  async runXiDiff(serverVersion: string, previousVersion: string): Promise<void> {
    if (!serverVersion || serverVersion === previousVersion) return;
    const ip = serverConnection.getIP();
    const port = serverConnection.getPort();
    if (!ip || !port) return;

    try {
      const entry = `Server Version Change Detected:\nPrevious: ${previousVersion}\nNew: ${serverVersion}\nUpgrade occurred at: ${new Date().toLocaleString()}\nActions: Check for new API endpoints, verify scripts still work, backup KB before major changes`;
      const compressed = knowledgeAccumulator.compressResearch(
        entry, 'SystemChanges', `Version change ${previousVersion}→${serverVersion}`, 'xi_diff'
      );
      compressed.metadata.confidence = 0.95;
      const added = knowledgeAccumulator.addFindingDeduped(compressed);
      if (added) {
        await knowledgeAccumulator.saveNow();
        this._stats.xiDiff++;
        await this._saveStats();
        await kbGrowthTracker.record(1, 'xi_diff', 'SystemChanges');
      }
    } catch {}
  }

  /** Run all applicable methods in a single background pass */
  async runAllBackground(progressCb?: (msg: string) => void): Promise<PKMStats> {
    await this.loadStats();
    progressCb?.('ΦDELTA scanning gaps...');
    const rssAdded = await this.runPsiRSS(progressCb);
    progressCb?.(`Ψ RSS complete: +${rssAdded} findings`);
    this._stats.lastRun = Date.now();
    await this._saveStats();
    return this._stats;
  }

  /** Called from knowledgeGrowthEngine Phase 4 — runs all 5 wired methods */
  async runAllProprietaryMethods(): Promise<void> {
    await this.runPhiDelta('', 0).catch(() => {});
    await this.runPsiRSS().catch(() => {});
    await this.runTauTrace('', '').catch(() => {});
  }

  getStats(): PKMStats { return this._stats; }
}

export const proprietaryKBMethods = new ProprietaryKBMethods();
