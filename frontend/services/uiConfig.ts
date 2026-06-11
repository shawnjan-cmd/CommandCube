/**
 * ⚡ UI CONFIG SERVICE — One JSON file controls ALL visual UI
 * Edit locally or with any AI, upload to apply instantly — NO credits needed.
 *
 * Covers: card visibility, card order, all text strings, colors, hero copy,
 * button labels, section titles, badge text, quick access items, everything.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const UI_CONFIG_KEY = '@butler_ui_config_v1';

// ─── CARD IDs — these map to the 13 homepage sections ─────────────────────
export type HomeCardId =
  | 'hero'
  | 'connected_pc'
  | 'terminal_feed'
  | 'crawlers_graph'
  | 'kb_graph'
  | 'scripts_graph'
  | 'fileshare_clipboard'
  | 'sigma_net'
  | 'smart_alerts'
  | 'omega_loop'
  | 'security_grid'
  | 'kb_articles'
  | 'server_setup'
  | 'quick_access'
  | 'recent_activity';

export interface CardConfig {
  id: HomeCardId;
  visible: boolean;
  /** Lower number = higher on page. Default is 1–15 */
  order: number;
  /** Optional label override shown in section dividers */
  label?: string;
}

export interface UIStrings {
  // Hero section
  heroBadge:        string;
  heroTitle:        string;
  heroTitleAccent:  string;
  heroTagline:      string;
  heroPlatform:     string;
  heroDesc1:        string;
  heroDesc2:        string;
  heroDesc3:        string;
  heroBtnScan:      string;
  heroBtnChat:      string;
  heroStatVectors:  string;
  heroStatScripts:  string;
  heroStatMode:     string;
  heroStatRuntime:  string;
  // Section headers
  sectionQuickAccess: string;
  sectionRecentActivity: string;
  // Connected PC card
  pcCardTitle:   string;
  pcCardOffline: string;
  // Terminal feed
  terminalTitle: string;
  terminalEmpty: string;
  // KB Articles
  kbArticlesHeadline: string;
  kbArticlesSubhead:  string;
  kbArticlesCta:      string;
  // Sigma-net
  sigmaNetTitle: string;
  // Smart alerts
  smartAlertsTitle:  string;
  smartAlertsAllOk:  string;
  // Security grid
  securityTitle:  string;
  securityFooter: string;
  // Server setup
  serverSetupTitle:   string;
  serverSetupStep1:   string;
  serverSetupStep2:   string;
  serverSetupStep3:   string;
  serverSetupGithubBtn: string;
  serverSetupEmailBtn:  string;
  serverSetupScanBtn:   string;
  // Quick access items (6 items)
  quickItem0Label: string; quickItem0Desc: string;
  quickItem1Label: string; quickItem1Desc: string;
  quickItem2Label: string; quickItem2Desc: string;
  quickItem3Label: string; quickItem3Desc: string;
  quickItem4Label: string; quickItem4Desc: string;
  quickItem5Label: string; quickItem5Desc: string;
}

export interface UIColors {
  primary:    string;
  secondary:  string;
  tertiary:   string;
  background: string;
  surface:    string;
  surfaceHi:  string;
  cyan:       string;
  green:      string;
  amber:      string;
  purple:     string;
  blue:       string;
  red:        string;
  text:       string;
  textMid:    string;
  textDim:    string;
}

export interface UIConfig {
  _version: string;
  _note: string;
  colors:  UIColors;
  strings: UIStrings;
  home: {
    cards: CardConfig[];
  };
}

// ─── DEFAULTS — matches the current live app exactly ──────────────────────
export const DEFAULT_UI_CONFIG: UIConfig = {
  _version: '1.0',
  _note: 'Edit any value. Upload this file back to Settings → One JSON Powerhouse → IMPORT JSON to apply instantly. No credits needed.',

  colors: {
    primary:    '#00FFFF',
    secondary:  '#00FF88',
    tertiary:   '#FFD700',
    background: '#000003',
    surface:    '#02070D',
    surfaceHi:  '#071120',
    cyan:       '#00FFFF',
    green:      '#00FF88',
    amber:      '#F5A623',
    purple:     '#BF00FF',
    blue:       '#4A9EFF',
    red:        '#FF3131',
    text:       '#D8E8F4',
    textMid:    '#7A9AB8',
    textDim:    '#3A5068',
  },

  strings: {
    // Hero
    heroBadge:        'SELF-HOSTED · PRIVATE · ALWAYS LEARNING · V6.0',
    heroTitle:        'BUTLER',
    heroTitleAccent:  'AI',
    heroTagline:      'TAKE CONTROL OF YOUR PC',
    heroPlatform:     'NEXUS INTELLIGENCE PLATFORM',
    heroDesc1:        'Your ',
    heroDesc2:        'self-hosted AI',
    heroDesc3:        ' that controls your PC with plain language, and never sends your data anywhere.',
    heroBtnScan:      'SCAN QR TO PAIR',
    heroBtnChat:      'OPEN AI CHAT',
    heroStatVectors:  'VECTORS\nINDEXED',
    heroStatScripts:  'SCRIPTS\nFORGED',
    heroStatMode:     'AI\nMODE',
    heroStatRuntime:  'AI\nRUNTIME',
    // Sections
    sectionQuickAccess:    'QUICK ACCESS',
    sectionRecentActivity: 'RECENT ACTIVITY',
    // PC card
    pcCardTitle:   'CONNECTED PC',
    pcCardOffline: 'NOT PAIRED',
    // Terminal
    terminalTitle: 'BUTLER_SERVER.PY',
    terminalEmpty: 'Connect PC to see live logs',
    // KB Articles
    kbArticlesHeadline: "Butler learns so you don't have to",
    kbArticlesSubhead:  'The Nexus crawler continuously indexes technical documentation, security advisories, and automation guides relevant to your workflow.',
    kbArticlesCta:      'VIEW ALL IN KNOWLEDGE BASE →',
    // Sigma-net
    sigmaNetTitle: 'SIGMA-NET CRAWLER',
    // Smart alerts
    smartAlertsTitle: 'SMART ALERTS',
    smartAlertsAllOk: 'ALL SYSTEMS NORMAL',
    // Security
    securityTitle:  'SECURITY PROTOCOLS [SYSTEM SECURE]',
    securityFooter: 'System Security: 100% Private · Local SQLite · HMAC-SHA256 · Zero Cloud · No Accounts',
    // Server setup
    serverSetupTitle:   'BUTLER AI SERVER INSTALLATION',
    serverSetupStep1:   'INSTALL REQUIREMENTS',
    serverSetupStep2:   'DOWNLOAD BUTLER SERVER',
    serverSetupStep3:   'CONNECT & CONTROL',
    serverSetupGithubBtn: 'GitHub · Free',
    serverSetupEmailBtn:  'Email Guide',
    serverSetupScanBtn:   'SCAN QR TO CONNECT',
    // Quick access
    quickItem0Label: 'Python Scripts',    quickItem0Desc: 'Automate your PC with AI-generated scripts',
    quickItem1Label: 'Butler AI Chat',    quickItem1Desc: 'Ask Ollama anything, run code instantly',
    quickItem2Label: 'Knowledge Base',   quickItem2Desc: 'SIGMA-NET indexed docs & automation guides',
    quickItem3Label: 'Tools Hub',        quickItem3Desc: 'File share, clipboard, utilities',
    quickItem4Label: 'PC Check',         quickItem4Desc: 'CPU, RAM, disk health & quick actions',
    quickItem5Label: 'Script Builder',   quickItem5Desc: 'Visual node pipeline · Ollama generates code',
  },

  home: {
    cards: [
      { id: 'hero',               visible: true,  order: 1  },
      { id: 'fileshare_clipboard',visible: true,  order: 2  },
      { id: 'connected_pc',       visible: true,  order: 3  },
      { id: 'crawlers_graph',     visible: true,  order: 4  },
      { id: 'kb_graph',           visible: true,  order: 5  },
      { id: 'scripts_graph',      visible: true,  order: 6  },
      { id: 'sigma_net',          visible: true,  order: 8  },
      { id: 'smart_alerts',       visible: true,  order: 9  },
      { id: 'omega_loop',         visible: true,  order: 10 },
      { id: 'security_grid',      visible: true,  order: 11 },
      { id: 'kb_articles',        visible: true,  order: 12 },
      { id: 'server_setup',       visible: true,  order: 13 },
      { id: 'quick_access',       visible: true,  order: 14 },
      { id: 'recent_activity',    visible: true,  order: 15 },
    ],
  },
};

// ─── SERVICE ───────────────────────────────────────────────────────────────
class UIConfigService {
  private _config: UIConfig = DEFAULT_UI_CONFIG;
  private _loaded = false;
  private _listeners: Array<(cfg: UIConfig) => void> = [];

  async load(): Promise<UIConfig> {
    if (this._loaded) return this._config;
    try {
      const raw = await AsyncStorage.getItem(UI_CONFIG_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<UIConfig>;
        // Deep merge — saved values override defaults, missing keys use defaults
        this._config = deepMerge(DEFAULT_UI_CONFIG, saved) as UIConfig;
      }
    } catch {}
    this._loaded = true;
    return this._config;
  }

  get(): UIConfig { return this._config; }

  getStrings(): UIStrings { return this._config.strings; }
  getColors(): UIColors   { return this._config.colors; }

  /** Returns cards sorted by order, filtered to visible only */
  getVisibleCards(): CardConfig[] {
    return [...this._config.home.cards]
      .sort((a, b) => a.order - b.order)
      .filter(c => c.visible);
  }

  /** Returns ALL cards sorted by order (for the config editor) */
  getAllCards(): CardConfig[] {
    return [...this._config.home.cards].sort((a, b) => a.order - b.order);
  }

  async save(patch: Partial<UIConfig>): Promise<UIConfig> {
    this._config = deepMerge(this._config, patch) as UIConfig;
    await AsyncStorage.setItem(UI_CONFIG_KEY, JSON.stringify(this._config));
    this._listeners.forEach(fn => fn(this._config));
    return this._config;
  }

  async applyFromPowerhouse(uiSection: any): Promise<void> {
    if (!uiSection || typeof uiSection !== 'object') return;
    await this.save(uiSection);
  }

  async reset(): Promise<UIConfig> {
    this._config = JSON.parse(JSON.stringify(DEFAULT_UI_CONFIG));
    await AsyncStorage.setItem(UI_CONFIG_KEY, JSON.stringify(this._config));
    this._listeners.forEach(fn => fn(this._config));
    return this._config;
  }

  onUpdate(fn: (cfg: UIConfig) => void): () => void {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  toExportJson(): UIConfig {
    return JSON.parse(JSON.stringify(this._config));
  }
}

// ─── Deep merge helper ─────────────────────────────────────────────────────
function deepMerge(base: any, patch: any): any {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch ?? base;
  const result = { ...base };
  for (const key of Object.keys(patch)) {
    if (patch[key] !== null && typeof patch[key] === 'object' && !Array.isArray(patch[key]) && typeof base[key] === 'object') {
      result[key] = deepMerge(base[key], patch[key]);
    } else if (patch[key] !== undefined) {
      result[key] = patch[key];
    }
  }
  return result;
}

export const uiConfig = new UIConfigService();
