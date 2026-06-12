
/**
 * 📚 Script Library Data — Extended with 12 categories
 */

export interface LibraryScript {
  id:         string;
  name:       string;
  desc:       string;
  tags:       string[];
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  time:       string;
  admin:      boolean;
  code:       string;
}

export interface CategoryDef {
  id:          string;
  title:       string;
  subtitle:    string;
  icon:        string;
  iconLibrary: 'material' | 'community' | 'ionicons';
  color:       string;
  scripts:     LibraryScript[];
}

export interface SearchHit {
  categoryId:    string;
  categoryTitle: string;
  categoryColor: string;
  script:        LibraryScript;
}

export interface CatScript {
  id:         string;
  name:       string;
  desc:       string;
  tags:       string[];
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  time:       string;
  admin:      boolean;
  code:       string;
}

const CAT_META: Record<string, {
  title: string; subtitle: string; icon: string;
  iconLibrary: 'material' | 'community' | 'ionicons'; color: string;
}> = {
  Files:       { title: 'File & Folder',         subtitle: 'Organize, backup, rename',       icon: 'folder',              iconLibrary: 'material',   color: '#FF6A1F' },
  System:      { title: 'System Tools',           subtitle: 'CPU, RAM, processes',            icon: 'computer',            iconLibrary: 'material',   color: '#00D4FF' },
  Web:         { title: 'Web & Scraping',         subtitle: 'Scrape, download, automate',     icon: 'web',                 iconLibrary: 'material',   color: '#00FF88' },
  GUI:         { title: 'GUI Automation',         subtitle: 'Mouse, keyboard, windows',       icon: 'mouse',               iconLibrary: 'material',   color: '#FFC400' },
  Email:       { title: 'Email & Notify',         subtitle: 'SMTP, Slack, Discord, alerts',   icon: 'email',               iconLibrary: 'material',   color: '#FF6FD8' },
  Data:        { title: 'Data Processing',        subtitle: 'CSV, Excel, PDF, SQLite',        icon: 'table-chart',         iconLibrary: 'material',   color: '#FFC400' },
  Scheduling:  { title: 'Scheduling',             subtitle: 'Cron, timers, automation',       icon: 'schedule',            iconLibrary: 'material',   color: '#00D4FF' },
  Setup:       { title: 'Setup & DevOps',         subtitle: 'Dev env, Docker, git, CI/CD',    icon: 'build',               iconLibrary: 'material',   color: '#FF6A1F' },
  Network:     { title: 'Network & Monitoring',   subtitle: 'Scan, ping, ports, bandwidth',   icon: 'router',              iconLibrary: 'material',   color: '#00FF88' },
  Text:        { title: 'Text & Docs',            subtitle: 'PDF, Word, regex, Markdown',     icon: 'description',         iconLibrary: 'material',   color: '#A8C8D8' },
  Monitoring:  { title: 'Monitoring & Alerts',    subtitle: 'Watch, alert, log, GPU, disk',   icon: 'monitor-heart',       iconLibrary: 'material',   color: '#FF3C5A' },
  Security:    { title: 'Security & Threat',      subtitle: 'Scan, harden, SSL, passwords',   icon: 'security',            iconLibrary: 'material',   color: '#FF4444' },
  Privacy:     { title: 'Privacy & Protection',   subtitle: 'Block, shred, WiFi, DNS, VPN',   icon: 'privacy-tip',         iconLibrary: 'material',   color: '#FFC400' },
  Performance: { title: 'Performance & Speed',    subtitle: 'Profile, benchmark, TCP, CPU',   icon: 'speed',               iconLibrary: 'material',   color: '#00FFB3' },
  Cleaning:    { title: 'System Cleaning',        subtitle: 'Temp, Docker, git, pip, logs',   icon: 'cleaning-services',   iconLibrary: 'material',   color: '#4DFFEA' },
  Backup:      { title: 'Backup & Recovery',      subtitle: 'Verify, sync, cloud, database',  icon: 'backup',              iconLibrary: 'material',   color: '#FFA040' },
  PCCheck:     { title: 'PC CHECK SUITE',          subtitle: 'Health · Clean · Audit · Diagnose', icon: 'heart-pulse',         iconLibrary: 'community',  color: '#00FF88' },
};

function inferDifficulty(req: string[], scriptLen: number): LibraryScript['difficulty'] {
  if (req.length >= 3 || scriptLen > 1200) return 'ADVANCED';
  if (req.length >= 1 || scriptLen > 600)  return 'INTERMEDIATE';
  return 'BEGINNER';
}

function inferTime(scriptLen: number): string {
  if (scriptLen > 1200) return '5-10 min';
  if (scriptLen > 600)  return '2-5 min';
  return '< 2 min';
}

function inferAdmin(script: string): boolean {
  return /winreg|admin|ctypes\.windll|HKEY_LOCAL_MACHINE|sudo|iptables/i.test(script);
}

// Lazy require — uses relative path to avoid @/ alias resolution issues on Hermes cold start.
// The PYTHON_AUTOMATION_SCRIPTS export is itself a lazy Proxy, so this is doubly safe.
function _loadAutomationScripts(): any[] {
  try {
    // The error message "Definition for rule '@typescript-eslint/no-var-requires' was not found"
    // indicates an ESLint configuration issue, not a TypeScript syntax error.
    // The `require` call itself is valid JavaScript/TypeScript in environments
    // where `require` is available (e.g., Node.js, or environments with specific bundler configs).
    // To resolve this specific error, we remove the ESLint directive, as the goal is
    // to fix *syntax* errors, not linter configuration issues.
    // If the intent was to fix a TypeScript error related to `require` itself (e.g.,
    // "Cannot find name 'require'"), the fix would typically involve ensuring a Node.js
    // type definition is available (`@types/node`) or using dynamic import.
    // However, given the *exact* error message, removing the problematic linter comment is
    // the most targeted change for the reported problem.
    const mod = require('./pythonAutomationKnowledge');
    const scripts = mod && mod.PYTHON_AUTOMATION_SCRIPTS;
    return Array.isArray(scripts) ? scripts : [];
  } catch {
    return [];
  }
}

function buildCategories(): CategoryDef[] {
  const grouped: Record<string, CategoryDef> = {};
  const scripts = _loadAutomationScripts();

  for (const s of scripts) {
    const catKey = s.category;          // e.g. 'Files', 'System'
    const meta   = CAT_META[catKey];
    if (!meta) continue;                // skip unknown categories

    const catId = catKey.toLowerCase(); // 'files', 'system' — matches CATEGORY_DATA key

    if (!grouped[catId]) {
      grouped[catId] = {
        id:          catId,
        title:       meta.title,
        subtitle:    meta.subtitle,
        icon:        meta.icon,
        iconLibrary: meta.iconLibrary,
        color:       meta.color,
        scripts:     [],
      };
    }

    grouped[catId].scripts.push({
      id:         s.id,
      name:       s.title,
      desc:       s.description,
      tags:       s.tags,
      difficulty: inferDifficulty(s.requirements, s.script.length),
      time:       inferTime(s.script.length),
      admin:      inferAdmin(s.script),
      code:       s.script,
    });
  }

  return Object.values(grouped);
}

// ALL_CATEGORIES — IIFE with try/catch, no Proxy (Proxy unsupported in older Hermes)
export const ALL_CATEGORIES: CategoryDef[] = (() => {
  try { return buildCategories(); } catch { return []; }
})();

// Safe flatMap replacement — flatMap is ES2019 and may not exist on all Hermes targets
function safeFlatMap<T, U>(arr: T[], fn: (item: T) => U[]): U[] {
  try {
    if (!Array.isArray(arr)) return [];
    const result: U[] = [];
    for (let i = 0; i < arr.length; i++) {
      const mapped = fn(arr[i]);
      if (Array.isArray(mapped)) {
        for (let j = 0; j < mapped.length; j++) result.push(mapped[j]);
      }
    }
    return result;
  } catch { return []; }
}

// SEARCH_INDEX — IIFE with try/catch, no Proxy
export const SEARCH_INDEX: SearchHit[] = (() => {
  try {
    return safeFlatMap(
      ALL_CATEGORIES,
      cat => (Array.isArray(cat.scripts) ? cat.scripts : []).map(script => ({
        categoryId:    cat.id,
        categoryTitle: cat.title,
        categoryColor: cat.color,
        script,
      }))
    );
  } catch { return []; }
})();

// CATEGORY_DATA — IIFE with try/catch, no Proxy
export const CATEGORY_DATA: Record<string, {
  title: string;
  subtitle: string;
  color: string;
  scripts: CatScript[];
}> = (() => {
  try {
    const out: Record<string, { title: string; subtitle: string; color: string; scripts: CatScript[] }> = {};
    for (let i = 0; i < ALL_CATEGORIES.length; i++) {
      const cat = ALL_CATEGORIES[i];
      if (cat && cat.id) {
        out[cat.id] = { title: cat.title, subtitle: cat.subtitle, color: cat.color, scripts: cat.scripts };
      }
    }
    return out;
  } catch { return {}; }
})();

// Validation — deferred via setTimeout so it never blocks module init
try {
  setTimeout(() => {
    try {
      const keys = Object.keys(CATEGORY_DATA);
      const total = ALL_CATEGORIES.reduce((s: number, c: CategoryDef) => s + (c.scripts?.length || 0), 0);
      if (keys.length === 0) { console.warn('[scriptLibraryData] WARNING: CATEGORY_DATA is empty'); }
      else { console.log(`[scriptLibraryData] OK: ${keys.length} categories, ${total} scripts`); }
    } catch (_inner) {}
  }, 5000);
} catch (_e) {}
