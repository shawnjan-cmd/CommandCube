/**
 * 🌱 KNOWLEDGE GROWTH ENGINE — ΩLOOP Autonomous Expansion v3.0
 *
 * FULLY AUTOMATED pipeline:
 *  1. App launch → silentGrowth() → seed + grow + auto-organize
 *  2. Every Butler chat → trackUserQuestion() → gap fill on next cycle
 *  3. Growth threshold (10 findings) → auto-organize fires immediately
 *  4. Background timer every 20min → growth cycle if connected
 *  5. Dedup fingerprinting → zero duplicate findings ever saved
 *  6. Coverage gap detection → auto-fills missing Python domains
 *  7. BM25-style keyword scoring → better relevance ranking
 *  8. Priority queue → seeds most valuable topics first
 *  9. Virus/Security/PCHelp domain seeds (NEW)
 * 10. NCX crawler integration (1-in-3 chance per cycle) (NEW)
 * 11. Omega Scanner Daemon started on silentGrowth (NEW)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { serverConnection } from './serverConnection';
import { autoConnectEngine } from './autoConnectEngine';
import { knowledgeAccumulator } from './knowledgeAccumulator';
import { kbOrganizerBot } from './kbOrganizerBot';
import { nexusBridge } from './nexusBridge';
import { PYTHON_AUTOMATION_SCRIPTS } from './pythonAutomationKnowledge';
import { proprietaryKBMethods } from './proprietaryKBMethods';

// ── Global OMEGA signal bridge ────────────────────────────────────
type OmegaSignalFn = (result: Record<string, any>) => void;
let _omegaSignal: OmegaSignalFn | null = null;
export function registerOmegaSignal(fn: OmegaSignalFn) { _omegaSignal = fn; }
export function unregisterOmegaSignal()                 { _omegaSignal = null; }

const GROWTH_LOG_KEY       = '@kb_growth_log_v1';
const GROWTH_TOPICS_KEY    = '@kb_growth_topics_v1';
const GROWTH_LAST_KEY      = '@kb_growth_last_run_v2';
const AUTO_UPGRADE_LOG_KEY = '@kb_auto_upgrade_log_v1';
const DOMAIN_COVERAGE_KEY  = '@kb_domain_coverage_v1';
const MIN_INTERVAL_MS      = 20 * 60 * 1000; // 20 min between full runs

export interface AutoUpgradeEntry {
  ts: number;
  type: 'organize' | 'prune' | 'seed' | 'growth' | 'error' | 'filter';
  trigger: string;
  before: number;
  after: number;
  delta: number;
  detail: string;
  durationMs: number;
  autoFixed?: string;
}

// ── Priority-scored expansion seeds ─────────────────────────────
// Python + Security/Virus + PCHelp + Windows + Networking
const EXPANSION_SEEDS = [
  // ── Python (core) ──────────────────────────────────────────
  { query: 'python file automation pathlib shutil watchdog os.walk',    domain: 'Python', topic: 'file-automation',    priority: 10 },
  { query: 'python subprocess shell command windows registry winreg',   domain: 'Python', topic: 'subprocess',         priority: 10 },
  { query: 'python system monitoring psutil cpu ram disk process kill', domain: 'Python', topic: 'system-monitoring',  priority: 9  },
  { query: 'python gui automation pyautogui win32 keyboard mouse click',domain: 'Python', topic: 'gui-automation',     priority: 9  },
  { query: 'python web scraping requests beautifulsoup selenium',       domain: 'Python', topic: 'web-scraping',       priority: 9  },
  { query: 'python task scheduling apscheduler schedule cron interval', domain: 'Python', topic: 'scheduling',         priority: 7  },
  { query: 'python network socket http server flask fastapi REST',      domain: 'Python', topic: 'networking',         priority: 7  },
  { query: 'python email smtp gmail automation send receive imap',      domain: 'Python', topic: 'email-automation',   priority: 7  },
  { query: 'python data processing pandas csv excel json openpyxl',    domain: 'Python', topic: 'data-processing',    priority: 6  },
  { query: 'python browser automation selenium playwright chromedriver',domain: 'Python', topic: 'browser-automation', priority: 6  },
  { query: 'python image processing pillow opencv screenshot',          domain: 'Python', topic: 'image-processing',   priority: 5  },
  { query: 'python zip archive extract compression backup shutil',      domain: 'Python', topic: 'archive-ops',        priority: 5  },
  { query: 'python sqlite database crud asyncio threading concurrent',  domain: 'Python', topic: 'database',           priority: 4  },
  { query: 'python regex pattern match replace parse text file',        domain: 'Python', topic: 'text-processing',    priority: 4  },
  { query: 'python logging monitor log file rotate handler',            domain: 'Python', topic: 'logging',            priority: 4  },
  // ── Security / Virus Removal ────────────────────────────────
  { query: 'virus removal steps windows defender safe mode scan malware delete infected', domain: 'Security', topic: 'virus-removal-steps',     priority: 10 },
  { query: 'ransomware removal safe mode restore point backup decrypt payment', domain: 'Security', topic: 'ransomware-removal',       priority: 10 },
  { query: 'malware trojan spyware adware removal tools malwarebytes hitmanpro', domain: 'Security', topic: 'malware-removal-tools',    priority: 9  },
  { query: 'suspicious process task manager startup autoruns sysinternals malware', domain: 'Security', topic: 'process-analysis',         priority: 9  },
  { query: 'rootkit detection removal GMER TDSSKiller bootkit mbr',    domain: 'Security', topic: 'rootkit-removal',          priority: 8  },
  { query: 'browser hijack remove chrome extension toolbar adware redirect', domain: 'Security', topic: 'browser-hijack-removal',   priority: 8  },
  { query: 'windows defender full offline scan enable real time protection antivirus', domain: 'Security', topic: 'windows-defender-usage',   priority: 9  },
  { query: 'python security file hash sha256 scan malicious detect reputation', domain: 'Security', topic: 'python-security-scanner',  priority: 7  },
  { query: 'powershell virus removal startup script quarantine clean malware', domain: 'Security', topic: 'powershell-security',     priority: 7  },
  { query: 'network intrusion detection firewall rules block suspicious ip', domain: 'Security', topic: 'network-security',         priority: 7  },
  // ── PC Help / Troubleshooting ────────────────────────────────
  { query: 'windows blue screen bsod stop error code fix kernel crash memory dump', domain: 'PCHelp', topic: 'bsod-fix',               priority: 10 },
  { query: 'pc slow performance fix startup cleanup optimize registry windows 10 11', domain: 'PCHelp', topic: 'performance-optimization', priority: 10 },
  { query: 'disk check repair chkdsk sfc scannow dism windows corrupt files', domain: 'PCHelp', topic: 'disk-repair',              priority: 9  },
  { query: 'network connection fix wifi reset winsock netsh dns flush adapter', domain: 'PCHelp', topic: 'network-fix',              priority: 9  },
  { query: 'windows update stuck fail reset wuauclt stop bits service', domain: 'PCHelp', topic: 'windows-update-fix',       priority: 8  },
  { query: 'high cpu usage fix windows search superfetch process kill powershell', domain: 'PCHelp', topic: 'cpu-usage-fix',            priority: 8  },
  { query: 'memory ram test problem memtest86 windows memory diagnostic', domain: 'PCHelp', topic: 'ram-diagnostics',          priority: 8  },
  { query: 'driver update rollback device manager fail crash dism', domain: 'PCHelp', topic: 'driver-troubleshooting',   priority: 7  },
  { query: 'python system health monitor alert threshold cpu ram disk reboot', domain: 'PCHelp', topic: 'python-health-monitor',   priority: 8  },
  { query: 'hard drive ssd failure signs smart data crystal disk info', domain: 'PCHelp', topic: 'storage-health',           priority: 7  },
  // ── Windows Administration ───────────────────────────────────
  { query: 'powershell script automation windows admin task schedule', domain: 'Windows', topic: 'powershell-admin',         priority: 8  },
  { query: 'windows registry backup restore export import reg file', domain: 'Windows', topic: 'registry-management',      priority: 7  },
  { query: 'windows event viewer log error warning system application', domain: 'Windows', topic: 'event-viewer',             priority: 7  },
];

export interface GrowthEvent {
  ts: number;
  type: 'seed' | 'user_topic' | 'gap_fill' | 'relay_crawl' | 'auto_organize';
  topic: string;
  wordsAdded: number;
  findingsAdded: number;
  method: 'ΔNEX' | 'ΣNET' | 'ΦFUSE' | 'direct' | 'organize';
}

class KnowledgeGrowthEngine {
  private _running          = false;
  private _log: GrowthEvent[] = [];
  private _growthUnsubscribe: (() => void) | null = null;
  private _autoOrganizeRunning = false;
  private _upgradeLog: AutoUpgradeEntry[] = [];
  private _backgroundTimer: ReturnType<typeof setInterval> | null = null;
  private _domainCoverage: Set<string> = new Set();

  // ── Wire auto-organize + background growth timer ────────────
  initAutoOrganize(): void {
    if (this._growthUnsubscribe) this._growthUnsubscribe();

    this._growthUnsubscribe = knowledgeAccumulator.onGrowth(async (newCount, total) => {
      if (this._autoOrganizeRunning) return;
      this._autoOrganizeRunning = true;
      const t0 = Date.now();
      const before = total - newCount;
      const trigger = `growth_threshold(${newCount} new, total ${total})`;
      try {
        await kbOrganizerBot.runOrganizeCycle(true);
        knowledgeAccumulator.resetGrowthCounter();
        await this._appendUpgradeLog({
          ts: Date.now(), type: 'organize', trigger, before, after: total,
          delta: newCount,
          detail: `Auto-organize [SILENT]: +${newCount} findings → dedup+cluster+index (${Date.now()-t0}ms)`,
          durationMs: Date.now() - t0,
        });
        (global as any).__refreshHeaderTokens?.();
        _omegaSignal?.({ type: 'organize', newFindings: newCount, total });
      } catch (e: any) {
        await this._appendUpgradeLog({
          ts: Date.now(), type: 'error', trigger, before, after: total, delta: 0,
          detail: `Auto-organize failed: ${e?.message || 'unknown'}`,
          durationMs: Date.now() - t0,
          autoFixed: 'Retrying on next growth event',
        });
      } finally {
        this._autoOrganizeRunning = false;
      }
    });

    if (this._backgroundTimer) clearInterval(this._backgroundTimer);
    // DISABLED: Server handles all knowledge growth via SIGMA-NET crawlers 24/7
    // this._backgroundTimer = setInterval(async () => {
      // Queue the cycle — runs immediately if connected, otherwise runs on next tick when connected
    //   if (serverConnection.isConnected()) {
    //     await this.runGrowthCycle(false).catch(() => {});
    //   } else {
    //     (global as any).__kgePendingGrowth = true;
    //   }
    // }, MIN_INTERVAL_MS);

    // Flush any queued offline growth tasks when the server reconnects
    (global as any).__kgeOnReconnect = async () => {
      if ((global as any).__kgePendingGrowth) {
        delete (global as any).__kgePendingGrowth;
        await this.runGrowthCycle(false).catch(() => {});
      }
    };

    console.log('[ΩLOOP] Auto-organize + background timer initialized');
  }

  stopBackgroundTimer(): void {
    if (this._backgroundTimer) { clearInterval(this._backgroundTimer); this._backgroundTimer = null; }
    if (this._growthUnsubscribe) { this._growthUnsubscribe(); this._growthUnsubscribe = null; }
  }

  private async _appendUpgradeLog(entry: AutoUpgradeEntry): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(AUTO_UPGRADE_LOG_KEY);
      const log: AutoUpgradeEntry[] = raw ? JSON.parse(raw) : [];
      log.unshift(entry);
      if (log.length > 100) log.splice(100);
      await AsyncStorage.setItem(AUTO_UPGRADE_LOG_KEY, JSON.stringify(log));
      this._upgradeLog = log.slice(0, 20);
    } catch {}
  }

  async getUpgradeLog(): Promise<AutoUpgradeEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(AUTO_UPGRADE_LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  getRecentUpgradeLog(): AutoUpgradeEntry[] { return this._upgradeLog; }
  async clearUpgradeLog(): Promise<void> {
    await AsyncStorage.removeItem(AUTO_UPGRADE_LOG_KEY);
    this._upgradeLog = [];
  }

  private async _loadCoverage(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(DOMAIN_COVERAGE_KEY);
      if (raw) this._domainCoverage = new Set(JSON.parse(raw));
    } catch {}
  }

  private async _saveCoverage(): Promise<void> {
    try {
      await AsyncStorage.setItem(DOMAIN_COVERAGE_KEY, JSON.stringify([...this._domainCoverage]));
    } catch {}
  }

  async trackUserQuestion(question: string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(GROWTH_TOPICS_KEY);
      const topics: string[] = raw ? JSON.parse(raw) : [];
      const q = question.slice(0, 120).toLowerCase();
      const isDupe = topics.some(t => t.toLowerCase().slice(0, 40) === q.slice(0, 40));
      if (!isDupe) {
        topics.push(question.slice(0, 120));
        if (topics.length > 100) topics.splice(0, topics.length - 100);
        await AsyncStorage.setItem(GROWTH_TOPICS_KEY, JSON.stringify(topics));
      }
    } catch {}
  }

  async exportLogToServer(): Promise<{
    ok: boolean; analysis?: any; applied?: string[];
    entryCount?: number; analyzedBy?: string; error?: string;
  }> {
    const ip = serverConnection.getIP(); const port = serverConnection.getPort();
    const token = serverConnection.getToken();
    if (!ip || !port) return { ok: false, error: 'No server connected' };
    try {
      const log = await this.getUpgradeLog();
      if (log.length === 0) return { ok: false, error: 'No log entries to export' };
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(`http://${ip}:${port}/api/kb/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ log }), signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) return { ok: false, error: data.error || 'Server returned error' };
      await this._appendUpgradeLog({
        ts: Date.now(), type: 'growth', trigger: 'manual_export_to_server',
        before: log.length, after: log.length, delta: 0,
        detail: `Log exported: ${log.length} entries → score=${data.analysis?.score ?? '?'} applied=${(data.applied ?? []).length}`,
        durationMs: 0, autoFixed: (data.applied ?? []).slice(0, 2).join('; ') || undefined,
      });
      _omegaSignal?.({ score: data.analysis?.score, health: data.analysis?.health, insights: data.analysis?.insights ?? [], applied: data.applied ?? [], analyzedBy: data.analyzedBy ?? 'local' });
      return { ok: true, analysis: data.analysis, applied: data.applied ?? [], entryCount: data.entryCount ?? log.length, analyzedBy: data.analyzedBy ?? 'local' };
    } catch (e: any) {
      return { ok: false, error: e?.name === 'AbortError' ? 'Export timeout (20s)' : String(e?.message || 'Network error') };
    }
  }

  // ── MAIN GROWTH CYCLE ────────────────────────────────────────
  async runGrowthCycle(force = false): Promise<{ added: number; events: GrowthEvent[] }> {
    if (this._running) return { added: 0, events: [] };
    if (!serverConnection.isConnected()) return { added: 0, events: [] };

    if (!force) {
      const lastRun = await AsyncStorage.getItem(GROWTH_LAST_KEY);
      if (lastRun && Date.now() - parseInt(lastRun) < MIN_INTERVAL_MS) {
        return { added: 0, events: [] };
      }
    }

    if (!serverConnection.isConnected()) return { added: 0, events: [] };

    this._running = true;
    const events: GrowthEvent[] = [];
    let totalAdded = 0;

    try {
      await AsyncStorage.setItem(GROWTH_LAST_KEY, Date.now().toString());
      await this._loadCoverage();

      // ── Phase 1: Priority-sorted seed expansion ─────────────
      const sorted = [...EXPANSION_SEEDS].sort((a, b) => b.priority - a.priority);
      for (const seed of sorted.slice(0, 8)) { // Up from 6 to 8
        const coverageKey = `${seed.domain}::${seed.topic}`;
        if (this._domainCoverage.has(coverageKey)) continue;

        const existing = await kbOrganizerBot.queryIndex(seed.query, 2);
        if (existing.length >= 2) {
          this._domainCoverage.add(coverageKey);
          continue;
        }

        try {
          const ctx = await nexusBridge.buildNexusContext(seed.query, {
            maxLocal: 1, maxRelay: 3, timeoutMs: 4000, growthEnabled: true,
          });
          if (ctx.growthCount > 0) {
            events.push({
              ts: Date.now(), type: 'seed', topic: seed.topic,
              wordsAdded: ctx.relayFindings.reduce((s: number, r: any) => s + r.snippet.split(' ').length, 0),
              findingsAdded: ctx.growthCount,
              method: ctx.channel === 'FULL_BRIDGE' ? 'ΦFUSE' : 'ΣNET',
            });
            totalAdded += ctx.growthCount;
            if (ctx.growthCount >= 2) this._domainCoverage.add(coverageKey);
          }
        } catch {}

        await new Promise(r => setTimeout(r, 300));
      }

      // ── Phase 2: User question gap-fill ─────────────────────
      const rawTopics = await AsyncStorage.getItem(GROWTH_TOPICS_KEY);
      const userTopics: string[] = rawTopics ? JSON.parse(rawTopics) : [];
      const recentTopics = userTopics.slice(-10); // Up from 8 to 10
      for (const topic of recentTopics) {
        const existing = await kbOrganizerBot.queryIndex(topic, 3);
        if (existing.length >= 3) continue;
        try {
          const ctx = await nexusBridge.buildNexusContext(topic, {
            maxLocal: 1, maxRelay: 2, timeoutMs: 3000, growthEnabled: true,
          });
          if (ctx.growthCount > 0) {
            events.push({
              ts: Date.now(), type: 'user_topic', topic: topic.slice(0, 40),
              wordsAdded: ctx.relayFindings.reduce((s: number, r: any) => s + r.snippet.split(' ').length, 0),
              findingsAdded: ctx.growthCount, method: 'ΦFUSE',
            });
            totalAdded += ctx.growthCount;
          }
        } catch {}
        await new Promise(r => setTimeout(r, 200));
      }

      // ── Phase 3: KB gap detection & auto-fill ────────────────
      const botState = await kbOrganizerBot.loadState();
      const gaps = (botState.coverageGaps || []).slice(0, 4);
      for (const gap of gaps) {
        const gapQuery = `python ${gap.toLowerCase()} automation examples tutorial`;
        try {
          const ctx = await nexusBridge.buildNexusContext(gapQuery, {
            maxLocal: 0, maxRelay: 2, timeoutMs: 3000, growthEnabled: true,
          });
          if (ctx.growthCount > 0) {
            events.push({
              ts: Date.now(), type: 'gap_fill', topic: gap,
              wordsAdded: 0, findingsAdded: ctx.growthCount, method: 'ΣNET',
            });
            totalAdded += ctx.growthCount;
          }
        } catch {}
        await new Promise(r => setTimeout(r, 200));
      }

      // ── Phase 4: PSI-RSS feed harvest (50% chance) ──────────
      if (Math.random() < 0.5) {
        const pkmStats = await proprietaryKBMethods.runPsiRSS().catch(() => 0);
        if (pkmStats > 0) {
          totalAdded += pkmStats;
          events.push({ ts: Date.now(), type: 'gap_fill', topic: 'PSI-RSS',
            wordsAdded: 0, findingsAdded: pkmStats, method: 'ΣNET' });
        }
      }

      // ── Phase 5: NCX crawler (33% chance, runs background) ──
      // Lazy-load to avoid circular dep at module init
      if (Math.random() < 0.33) {
        try {
          const { nexusCrawlerEngine } = await import('./nexusCrawlerEngine');
          if (!nexusCrawlerEngine.isRunning()) {
            nexusCrawlerEngine.priorityCrawl(4).then(ncxAdded => {
              if (ncxAdded > 0) {
                console.log(`[ΩLOOP] NCX background crawl: +${ncxAdded} findings`);
                (global as any).__refreshHeaderTokens?.();
              }
            }).catch(() => {});
          }
        } catch {}
      }

      // ── Phase 7 (proprietary): ΨRSS + ΦDELTA + ΤTRACE — fire-and-forget ──
      proprietaryKBMethods.runAllProprietaryMethods().catch(() => {});

      // ── Phase 8: Save state ─────────────────────────────────
      await this._saveCoverage();
      this._log = [...events, ...this._log].slice(0, 50);
      await AsyncStorage.setItem(GROWTH_LOG_KEY, JSON.stringify(this._log));

      if (totalAdded > 0) {
        await this._appendUpgradeLog({
          ts: Date.now(), type: 'growth', trigger: 'ΩLOOP_scheduled_cycle',
          before: 0, after: totalAdded, delta: totalAdded,
          detail: `ΩLOOP v3 +${totalAdded} findings via ${events.length} events (seeds+user+gap_fill+rss+ncx)`,
          durationMs: 0,
        });
        (global as any).__refreshHeaderTokens?.();
        _omegaSignal?.({ type: 'growth', totalAdded, events: events.length });
        console.log(`[ΩLOOP] Growth cycle: +${totalAdded} findings (${events.length} events)`);
      }

    } finally {
      this._running = false;
    }

    return { added: totalAdded, events };
  }

  // ── One-time seed (Python + Security/PCHelp static entries) ─
  async autoSeedIfNeeded(): Promise<void> {
    try {
      const alreadyDone = await knowledgeAccumulator.isSeedDone();
      if (alreadyDone) return;

      const existingFps = await knowledgeAccumulator.loadPersistedFingerprints();
      let added = 0;

      for (const script of PYTHON_AUTOMATION_SCRIPTS) {
        const text = `${script.title}\n${script.description}\nCategory: ${script.category}\nTags: ${script.tags.join(', ')}\n\n${script.script}`;
        const compressed = knowledgeAccumulator.compressResearch(text, script.category, script.title, 'auto_seed');
        const fp = `${compressed.domain.toLowerCase()}::${compressed.topic.toLowerCase()}::${(compressed.summary || '').slice(0, 32).toLowerCase()}`;
        if (!existingFps.has(fp)) {
          const wasAdded = knowledgeAccumulator.addFindingDeduped(compressed);
          if (wasAdded) added++;
        }
      }

      // Seed security & PC help static knowledge
      const staticSecuritySeeds = [
        { domain: 'Security', topic: 'virus-removal-guide', text: 'Virus Removal Guide\nStep 1: Boot into Safe Mode with Networking. Step 2: Run Windows Defender Offline Scan. Step 3: Use Malwarebytes free version for second opinion. Step 4: Check Autoruns (Sysinternals) for suspicious startup entries. Step 5: Run SFC /scannow to repair system files. Step 6: Check browser extensions for adware. Step 7: Reset network settings if browser is hijacked. Common tools: Windows Defender, Malwarebytes, Hitman Pro, AdwCleaner, RKill. For ransomware: Do NOT pay ransom. Use No More Ransom project decryptors. Restore from backup if available.' },
        { domain: 'Security', topic: 'malware-types', text: 'Common Malware Types and Removal:\nVirus: Self-replicating code. Remove with antivirus scan.\nTrojan: Disguised as legitimate software. Check Task Manager for unknown processes.\nRansomware: Encrypts files for payment. Boot from USB, scan offline, restore from backup.\nSpyware: Monitors activity. Check startup items, browser extensions.\nAdware: Shows unwanted ads. Run AdwCleaner, remove browser extensions.\nRootkit: Hides deep in system. Use GMER, TDSSKiller, offline boot scan.\nKeylogger: Records keystrokes. Check scheduled tasks, autoruns, unusual processes.\nBotnet: Remote control malware. Check firewall logs for unusual outbound connections.' },
        { domain: 'PCHelp', topic: 'bsod-fix-guide', text: 'Blue Screen of Death (BSOD) Fix Guide\nCommon BSOD codes: MEMORY_MANAGEMENT, IRQL_NOT_LESS_OR_EQUAL, PAGE_FAULT_IN_NONPAGED_AREA, CRITICAL_PROCESS_DIED, SYSTEM_THREAD_EXCEPTION_NOT_HANDLED.\nFixes: 1) Run Windows Memory Diagnostic (mdsched.exe). 2) Run SFC /scannow and DISM /Online /Cleanup-Image /RestoreHealth. 3) Check for driver updates in Device Manager. 4) Run chkdsk /f /r on startup. 5) Check Event Viewer > Windows Logs > System for errors. 6) Roll back recently installed drivers. 7) Boot in Safe Mode to test if hardware driver causes issue.' },
        { domain: 'PCHelp', topic: 'slow-pc-fix', text: 'Fix Slow PC Performance\n1) Check startup programs: Task Manager > Startup tab, disable unneeded items.\n2) Run Disk Cleanup and delete temp files.\n3) Check disk health: CrystalDiskInfo for SMART data.\n4) Defragment HDD (not SSD): defrag C: /U /V\n5) Check for viruses with Windows Defender full scan.\n6) Check RAM usage: Task Manager > Performance.\n7) Disable visual effects: sysdm.cpl > Advanced > Performance Settings > Adjust for best performance.\n8) Update drivers especially GPU and chipset.\n9) Check for Windows Update issues.\n10) Consider adding RAM or switching to SSD.' },
        { domain: 'PCHelp', topic: 'network-troubleshooting', text: 'Network Troubleshooting Steps\n1) ipconfig /all - shows IP, DNS, gateway\n2) ipconfig /flushdns - clears DNS cache\n3) netsh winsock reset - resets network stack (requires reboot)\n4) netsh int ip reset - resets TCP/IP stack\n5) ping 8.8.8.8 - test internet connectivity\n6) tracert google.com - trace route to find bottleneck\n7) Test DNS: nslookup google.com 8.8.8.8\n8) Reset network adapter in Device Manager\n9) Disable firewall temporarily to test if blocking\n10) Check router admin panel for connected devices and blocked MACs' },
      ];

      for (const seed of staticSecuritySeeds) {
        const compressed = knowledgeAccumulator.compressResearch(seed.text, seed.domain, seed.topic, 'static_security_seed');
        compressed.metadata.confidence = 0.90;
        const fp = `${compressed.domain.toLowerCase()}::${compressed.topic.toLowerCase()}::${(compressed.summary || '').slice(0, 32).toLowerCase()}`;
        if (!existingFps.has(fp)) {
          const wasAdded = knowledgeAccumulator.addFindingDeduped(compressed);
          if (wasAdded) added++;
        }
      }

      if (added > 0) {
        await knowledgeAccumulator.saveNow();
        console.log(`[ΩLOOP] Auto-seeded ${added} entries (Python + Security + PCHelp) into KB`);
      }

      await knowledgeAccumulator.markSeedDone();
      setTimeout(() => kbOrganizerBot.runOrganizeCycle(true).catch(() => {}), 5000);
    } catch (e: any) {
      console.warn('[ΩLOOP] Auto-seed error:', e?.message);
    }
  }

  // ── Silent growth on app start ─────────────────────────────
  async silentGrowth(): Promise<void> {
    this.initAutoOrganize();
    this.autoSeedIfNeeded().catch(() => {});
    // Growth only runs when server is connected — defer until first connect event.
    // If already connected, runs after 3s. If offline, waits for connection event.
    const seedConn = autoConnectEngine.getCurrentConnection();
    if (seedConn.connected) {
      setTimeout(() => this.runGrowthCycle(false).catch(() => {}), 3000);
    } else {
      const unsub = autoConnectEngine.onEvent((evt) => {
        if (evt.status === 'connected') {
          unsub();
          setTimeout(() => this.runGrowthCycle(false).catch(() => {}), 3000);
        }
      });
    }
    // Fallback 60s timer: catches cases where engine is mid-reconnect on first silentGrowth call
    setTimeout(() => this.runGrowthCycle(false).catch(() => {}), 60000);
    // Flush offline crawl queue after 20s
    setTimeout(async () => {
      try {
        const { nexusCrawlerEngine } = await import('./nexusCrawlerEngine');
        await nexusCrawlerEngine.flushOfflineQueue();
      } catch {}
    }, 20000);
  }

  async getLog(): Promise<GrowthEvent[]> {
    try {
      const raw = await AsyncStorage.getItem(GROWTH_LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  isRunning() { return this._running; }
}

export const knowledgeGrowthEngine = new KnowledgeGrowthEngine();
