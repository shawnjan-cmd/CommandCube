/**
 * ⚡ POWERHOUSE IMPORT — One JSON rules everything
 * Upload a single JSON file to change ANY part of the app:
 *   tokens / navigation / features / ai / server / scripts /
 *   knowledge / automations / assets / files[] / patches[]
 *
 * Runtime changes (tokens, features, nav, ai, server, scripts, KB)
 * apply instantly via AsyncStorage.
 *
 * File patches (files[], patches[]) generate a Python script sent
 * to the PC server to write project source files.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { uiConfig } from './uiConfig';

// ── Keys ──────────────────────────────────────────────────────────────────
export const PH_TOKEN_KEY     = '@ph_token_overrides_v1';
export const PH_NAV_KEY       = '@ph_nav_overrides_v1';
export const PH_LAST_JSON_KEY = '@ph_last_import_v1';
export const PH_IMPORT_LOG    = '@ph_import_log_v1';

export interface PHResult {
  ok: boolean;
  applied: string[];
  warnings: string[];
  patchScript?: string;
  aiPrompt?: string;
  summary: string;
}

export interface PHLog {
  ts: number;
  name: string;
  appliedCount: number;
  warningCount: number;
}

const pushOk  = (s: string, arr: string[]) => { arr.push('\u2713 ' + s); };
const pushWrn = (s: string, arr: string[]) => { arr.push('\u26A0 ' + s); };

// ── Sample script code — stored as array to avoid escape issues ────────────
const SAMPLE_SCRIPT_LINES = [
  'import platform, psutil, socket, datetime',
  'vm = psutil.virtual_memory()',
  'disk = psutil.disk_usage("/")',
  'h = socket.gethostname()',
  'print("Host:", h, "| OS:", platform.system(), platform.release())',
  'print("CPU:", psutil.cpu_percent(1), "% | RAM:", vm.percent, "% | Disk:", disk.percent, "%")',
  'print("Time:", str(datetime.datetime.now())[:19])',
];

// ── MAIN PROCESSOR ────────────────────────────────────────────────────────
export async function processPowerhouseJson(
  json: Record<string, any>
): Promise<PHResult> {
  const applied: string[]  = [];
  const warnings: string[] = [];

  try { await AsyncStorage.setItem(PH_LAST_JSON_KEY, JSON.stringify(json)); } catch {}

  // 1. TOKENS
  if (json.tokens && typeof json.tokens === 'object') {
    try {
      await AsyncStorage.setItem(PH_TOKEN_KEY, JSON.stringify(json.tokens));
      pushOk('Tokens applied (colors/typography/motion/spacing)', applied);
      (global as any).__powerhouseTokensChanged?.(json.tokens);
    } catch (e: any) { pushWrn('Tokens: ' + (e?.message || 'error'), warnings); }
  }

  // 2. NAVIGATION
  if (json.navigation?.tabs && Array.isArray(json.navigation.tabs)) {
    try {
      await AsyncStorage.setItem(PH_NAV_KEY, JSON.stringify(json.navigation));
      pushOk('Navigation: tabs=[' + json.navigation.tabs.join(', ') + ']', applied);
      (global as any).__powerhouseNavChanged?.(json.navigation);
    } catch (e: any) { pushWrn('Navigation: ' + (e?.message || 'error'), warnings); }
  }

  // 3. FEATURES
  if (json.features && typeof json.features === 'object') {
    const FEATURE_MAP: Record<string, string> = {
      scriptOnlyMode:  'commandcube_script_only_mode',
      autoConnect:     'commandcube_autoconnect',
      autoRun:         'commandcube_autorun',
      notifications:   'commandcube_notifications',
      keepScreenOn:    'commandcube_keep_screen_on',
      saveHistory:     'commandcube_save_history',
      pauseAnimations: 'commandcube_pause_animations',
      minimalMode:     'commandcube_minimal_mode',
      hapticsOff:      'commandcube_haptics_off',
      largeText:       'commandcube_large_text',
      authDisabled:    '@ph_auth_disabled',
    };
    const pairs: [string, string][] = [];
    for (const [key, storeKey] of Object.entries(FEATURE_MAP)) {
      if (key in json.features) pairs.push([storeKey, String(json.features[key])]);
    }
    if (pairs.length > 0) {
      try {
        await AsyncStorage.multiSet(pairs);
        pushOk('Features: ' + pairs.map(([k]) => k.replace('commandcube_', '')).join(', '), applied);
        if ('scriptOnlyMode' in json.features) {
          (global as any).__butlerScriptOnlyModeChanged?.(json.features.scriptOnlyMode);
        }
      } catch (e: any) { pushWrn('Features: ' + (e?.message || 'error'), warnings); }
    }
  }

  // 4. SERVER
  if (json.server && typeof json.server === 'object') {
    const pairs: [string, string][] = [];
    if (json.server.ip)   pairs.push(['commandcube_server_ip',   String(json.server.ip)]);
    if (json.server.port) pairs.push(['commandcube_server_port', String(json.server.port)]);
    if (pairs.length > 0) {
      try {
        await AsyncStorage.multiSet(pairs);
        pushOk('Server: ' + pairs.map(([k, v]) => k.replace('commandcube_server_', '') + '=' + v).join(', '), applied);
      } catch (e: any) { pushWrn('Server: ' + (e?.message || 'error'), warnings); }
    }
  }

  // 5. AI SETTINGS
  if (json.ai && typeof json.ai === 'object') {
    try {
      const existing = await AsyncStorage.getItem('@nexus_bridge_settings_v1').catch(() => null);
      const current  = existing ? JSON.parse(existing) : {};
      const merged   = { ...current };
      if ('localOnly'       in json.ai) merged.localOnlyMode   = json.ai.localOnly;
      if ('relayEnabled'    in json.ai) merged.relayEnabled    = json.ai.relayEnabled;
      if ('growthEnabled'   in json.ai) merged.growthEnabled   = json.ai.growthEnabled;
      if ('cacheTTLMinutes' in json.ai) merged.cacheTTLMinutes = json.ai.cacheTTLMinutes;
      if ('maxRelayResults' in json.ai) merged.maxRelayResults = json.ai.maxRelayResults;
      await AsyncStorage.setItem('@nexus_bridge_settings_v1', JSON.stringify(merged));
      if (json.ai.model)        await AsyncStorage.setItem('@ph_preferred_model', json.ai.model);
      if (json.ai.systemPrompt) await AsyncStorage.setItem('@ph_system_prompt_override', json.ai.systemPrompt);
      pushOk('AI settings: model=' + (json.ai.model || 'unchanged'), applied);
    } catch (e: any) { pushWrn('AI: ' + (e?.message || 'error'), warnings); }
  }

  // 6. SCRIPTS
  if (Array.isArray(json.scripts) && json.scripts.length > 0) {
    let saved = 0;
    for (const script of json.scripts) {
      if (!script.code || !script.name) continue;
      try {
        const { saveButlerScript } = await import('./butlerScripts');
        await saveButlerScript(script.code, {
          title:       script.name,
          description: script.description || '',
          tags:        script.tags || ['powerhouse'],
        });
        saved++;
      } catch {}
    }
    if (saved > 0) pushOk('Scripts: saved ' + saved + ' to library', applied);
    else pushWrn('Scripts: none saved (missing name/code)', warnings);
  }

  // 7. KNOWLEDGE
  if (Array.isArray(json.knowledge) && json.knowledge.length > 0) {
    let added = 0;
    try {
      const { knowledgeAccumulator } = await import('./knowledgeAccumulator');
      for (const entry of json.knowledge) {
        if (!entry.summary && !entry.topic) continue;
        const text = [entry.title || entry.topic, entry.summary, (entry.keywords || []).join(' ')].filter(Boolean).join('\n');
        const compressed = knowledgeAccumulator.compressResearch(
          text,
          entry.domain || 'Custom',
          entry.topic  || 'entry',
          'powerhouse'
        );
        if (knowledgeAccumulator.addFindingDeduped(compressed)) added++;
      }
      if (added > 0) await knowledgeAccumulator.saveNow();
      pushOk('Knowledge: added ' + added + ' entries to KB', applied);
    } catch (e: any) { pushWrn('Knowledge: ' + (e?.message || 'error'), warnings); }
  }

  // 8. AUTOMATIONS
  if (Array.isArray(json.automations) && json.automations.length > 0) {
    try {
      await AsyncStorage.setItem('@ph_automations', JSON.stringify(json.automations));
      pushOk('Automations: stored ' + json.automations.length + ' rules', applied);
    } catch (e: any) { pushWrn('Automations: ' + (e?.message || 'error'), warnings); }
  }

  // 8.5. UI CONFIG (cards visibility/order + all text strings + colors)
  if (json.ui && typeof json.ui === 'object') {
    try {
      await uiConfig.applyFromPowerhouse(json.ui);
      const cardChanges = json.ui?.home?.cards?.length || 0;
      const strChanges  = Object.keys(json.ui?.strings || {}).length;
      const colChanges  = Object.keys(json.ui?.colors  || {}).length;
      pushOk(`UI Config: ${cardChanges} cards, ${strChanges} strings, ${colChanges} colors applied`, applied);
      (global as any).__nexusHomeUIConfigChanged?.();
    } catch (e: any) { pushWrn('UI Config: ' + (e?.message || 'error'), warnings); }
  }

  // 9. ASSETS
  if (json.assets && typeof json.assets === 'object') {
    try {
      await AsyncStorage.setItem('@ph_assets_overrides', JSON.stringify(json.assets));
      pushOk('Assets: stored (' + Object.keys(json.assets).join(', ') + ')', applied);
    } catch (e: any) { pushWrn('Assets: ' + (e?.message || 'error'), warnings); }
  }

  // 10. FILE PATCHES
  const hasFiles   = Array.isArray(json.files)   && json.files.filter((f: any) => !f.__EXAMPLE_ONLY__).length > 0;
  const hasPatches = Array.isArray(json.patches) && json.patches.filter((p: any) => !p.__EXAMPLE_ONLY__).length > 0;
  let patchScript: string | undefined;
  let aiPrompt: string | undefined;

  if (hasFiles || hasPatches) {
    const realFiles   = (json.files   || []).filter((f: any) => !f.__EXAMPLE_ONLY__);
    const realPatches = (json.patches || []).filter((p: any) => !p.__EXAMPLE_ONLY__);
    patchScript = buildPatchScript(realFiles, realPatches);
    const patchSummary = [
      ...realFiles.map((f: any)   => '\u2022 Replace entire file: ' + f.path),
      ...realPatches.map((p: any) => '\u2022 ' + p.op + ': ' + (p.file || p.path || '')),
    ].join('\n');
    aiPrompt = 'Apply these file changes to my Butler AI project:\n\n' + patchSummary +
      '\n\nFull patch JSON:\n```json\n' + JSON.stringify({ files: realFiles, patches: realPatches }, null, 2) + '\n```\nPlease apply each patch and confirm.';
    pushOk('File patches: ' + realFiles.length + ' replacements + ' + realPatches.length + ' patches queued', applied);
  }

  // Save import log
  try {
    const existing = await AsyncStorage.getItem(PH_IMPORT_LOG).catch(() => null);
    const log: PHLog[] = existing ? JSON.parse(existing) : [];
    log.unshift({ ts: Date.now(), name: json._meta?.name || 'Powerhouse Import', appliedCount: applied.length, warningCount: warnings.length });
    await AsyncStorage.setItem(PH_IMPORT_LOG, JSON.stringify(log.slice(0, 20)));
  } catch {}

  const summary = 'Applied ' + applied.length + ' changes' + (warnings.length > 0 ? ', ' + warnings.length + ' warnings' : '');
  await uiConfig.load();
  const currentUIConfig = uiConfig.toExportJson();

  return { ok: warnings.length < applied.length || applied.length > 0, applied, warnings, patchScript, aiPrompt, summary };
}

// ── Patch script builder (no inline Python strings in TS) ──────────────────
function buildPatchScript(files: any[], patches: any[]): string {
  const L: string[] = [];
  L.push('"""Butler AI Powerhouse Patch Script"""');
  L.push('import os, re, shutil, pathlib');
  L.push('SEARCH = ["app", "services", "components"]');
  L.push('def find_root():');
  L.push('    cwd = pathlib.Path.cwd()');
  L.push('    for p in [cwd, *cwd.parents]:');
  L.push('        if all((p / s).exists() for s in SEARCH): return p');
  L.push('    raise FileNotFoundError("Project root not found")');
  L.push('ROOT = find_root()');
  L.push('print("Project root:", ROOT)');
  L.push('');

  for (const file of files) {
    if (!file.path || !file.content) continue;
    const safeP = JSON.stringify(file.path);
    const safeC = JSON.stringify(file.content);
    L.push('try:');
    L.push('    t = ROOT / ' + safeP);
    L.push('    t.parent.mkdir(parents=True, exist_ok=True)');
    L.push('    if t.exists(): shutil.copy(str(t), str(t) + ".bak")');
    L.push('    t.write_text(' + safeC + ', encoding="utf-8")');
    L.push('    print("replaced:", ' + safeP + ')');
    L.push('except Exception as e: print("error:", e)');
    L.push('');
  }

  for (const patch of patches) {
    if (!patch.op) continue;
    const fp = JSON.stringify(patch.file || patch.path || '');
    L.push('try:');
    L.push('    f = ROOT / ' + fp);
    if (patch.op === 'file.replace') {
      L.push('    c = f.read_text(encoding="utf-8")');
      L.push('    c2 = c.replace(' + JSON.stringify(patch.find || '') + ', ' + JSON.stringify(patch.replace || '') + ', ' + (patch.count || 1) + ')');
      L.push('    if c2 != c: f.write_text(c2, encoding="utf-8"); print("patched:", ' + fp + ')');
      L.push('    else: print("no match:", ' + fp + ')');
    } else if (patch.op === 'file.regex') {
      L.push('    c = f.read_text(encoding="utf-8")');
      L.push('    c2 = re.sub(' + JSON.stringify(patch.pattern || '') + ', ' + JSON.stringify(patch.replace || '') + ', c, count=' + (patch.count || 0) + ')');
      L.push('    if c2 != c: f.write_text(c2, encoding="utf-8"); print("regex:", ' + fp + ')');
    } else if (patch.op === 'file.insertAfter') {
      L.push('    c = f.read_text(encoding="utf-8")');
      L.push('    marker = ' + JSON.stringify(patch.after || ''));
      L.push('    idx = c.find(marker)');
      L.push('    if idx >= 0:');
      L.push('        ins = idx + len(marker)');
      L.push('        f.write_text(c[:ins] + "\\n" + ' + JSON.stringify(patch.content || '') + ' + c[ins:], encoding="utf-8")');
      L.push('        print("inserted after marker:", ' + fp + ')');
      L.push('    else: print("marker not found:", ' + fp + ')');
    } else if (patch.op === 'file.deleteRange') {
      L.push('    c = f.read_text(encoding="utf-8")');
      L.push('    si = c.find(' + JSON.stringify(patch.startAfter || '') + ')');
      L.push('    ei = c.find(' + JSON.stringify(patch.endBefore || '') + ')');
      L.push('    if si >= 0 and ei > si:');
      L.push('        f.write_text(c[:si + len(' + JSON.stringify(patch.startAfter || '') + ')] + c[ei:], encoding="utf-8")');
      L.push('        print("deleted range:", ' + fp + ')');
    } else if (patch.op === 'file.create') {
      L.push('    f.parent.mkdir(parents=True, exist_ok=True)');
      L.push('    f.write_text(' + JSON.stringify(patch.content || '') + ', encoding="utf-8")');
      L.push('    print("created:", ' + fp + ')');
    } else if (patch.op === 'file.delete') {
      L.push('    if f.exists(): f.unlink(); print("deleted:", ' + fp + ')');
    }
    L.push('except Exception as e: print("patch error:", e)');
    L.push('');
  }
  L.push('print("Powerhouse patches complete")');
  return L.join('\n');
}

// ── TEMPLATE GENERATOR ────────────────────────────────────────────────────
export async function generateCurrentStateJson(): Promise<Record<string, any>> {
  const ip   = await AsyncStorage.getItem('commandcube_server_ip').catch(() => null)   || '';
  const port = await AsyncStorage.getItem('commandcube_server_port').catch(() => null) || '8766';

  const featureKeys: [string, string][] = [
    ['scriptOnlyMode',  'commandcube_script_only_mode'],
    ['autoConnect',     'commandcube_autoconnect'],
    ['autoRun',         'commandcube_autorun'],
    ['notifications',   'commandcube_notifications'],
    ['keepScreenOn',    'commandcube_keep_screen_on'],
    ['saveHistory',     'commandcube_save_history'],
    ['pauseAnimations', 'commandcube_pause_animations'],
    ['minimalMode',     'commandcube_minimal_mode'],
    ['hapticsOff',      'commandcube_haptics_off'],
    ['largeText',       'commandcube_large_text'],
  ];
  const vals = await AsyncStorage.multiGet(featureKeys.map(([, k]) => k)).catch(() => []);
  const features: Record<string, boolean> = {};
  featureKeys.forEach(([key, storeKey]) => {
    const val = vals.find(([k]) => k === storeKey)?.[1];
    features[key] = val === 'true';
  });

  let aiSettings: Record<string, any> = {
    model: 'qwen2.5-coder:7b', localOnly: false, relayEnabled: true,
    growthEnabled: true, cacheTTLMinutes: 5, maxRelayResults: 4, temperature: 0.7, systemPrompt: '',
  };
  try {
    const raw = await AsyncStorage.getItem('@nexus_bridge_settings_v1').catch(() => null);
    if (raw) {
      const s = JSON.parse(raw);
      aiSettings = {
        model:           s.preferredModel || 'qwen2.5-coder:7b',
        localOnly:       s.localOnlyMode  ?? false,
        relayEnabled:    s.relayEnabled   ?? true,
        growthEnabled:   s.growthEnabled  ?? true,
        cacheTTLMinutes: s.cacheTTLMinutes ?? 5,
        maxRelayResults: s.maxRelayResults ?? 4,
        temperature:     0.7,
        systemPrompt:    '',
      };
    }
  } catch {}

  let tokens: Record<string, any> = {
    colors: {
      primary: '#00FFFF', secondary: '#00FF88', tertiary: '#FFD700',
      background: '#020407', surface: '#070D16', purple: '#BF00FF',
      amber: '#F5A623', red: '#FF3131', text: '#D8E8F4', textMid: '#7A9AB8', textDim: '#3A5068',
    },
    typography: { baseFontSize: 16, monoFont: 'monospace', fontScale: 1.0 },
    motion:     { reducedMotion: false, animationSpeed: 1.0 },
    spacing:    { base: 8, cardPadding: 14, borderRadius: 12 },
  };
  try {
    const raw = await AsyncStorage.getItem(PH_TOKEN_KEY).catch(() => null);
    if (raw) tokens = JSON.parse(raw);
  } catch {}

  await uiConfig.load();
  const currentUIConfig = uiConfig.toExportJson();

  return {
    _meta: {
      name:        'Butler AI Powerhouse',
      version:     '7.0.0',
      description: 'Upload to IMPORT JSON in Settings to apply all changes. No Save button — just keep uploading.',
      exportedAt:  new Date().toISOString(),
      howToUse: [
        '1. Download this JSON via Settings > Powerhouse > DOWNLOAD CURRENT STATE',
        '2. Send it to Claude/GPT/Gemini with your request (e.g. "add a graph to homepage")',
        '3. AI returns a modified JSON with files[] and/or patches[] entries',
        '4. Upload the new JSON via Settings > Powerhouse > IMPORT JSON',
        '5. Changes apply — patch script auto-runs on your PC server',
        '6. Keep re-uploading new versions — no Save button needed',
      ],
    },
    _ai_instructions: {
      note: 'READ THIS BEFORE MAKING CHANGES',
      stack: 'React Native + Expo + TypeScript. Files are in app/(tabs)/, services/, components/ui/, constants/.',
      howToAddComponent: [
        'Step 1: Create the component in files[] — path: "components/ui/MyCard.tsx", content: full TSX source',
        'Step 2: Import it in nexushome.tsx via patches[] — op: "file.insertAfter", after: last import line, content: import line',
        'Step 3: Render it via patches[] — op: "file.insertAfter", after: a landmark comment like /* 6. SIGMA-NET */, content: <MyCard /> JSX',
      ],
      howToEditExisting: [
        'Use op: "file.replace" to swap out any text in any file — find the exact string, provide replacement',
        'Use op: "file.regex" for pattern replacements across multiple matches',
        'Use op: "file.insertAfter" to add code after a specific line without replacing anything',
      ],
      colorSystem: {
        background: '#020407',
        surface: '#070D16',
        cyan: '#00FFFF',
        green: '#00FF88',
        amber: '#F5A623',
        purple: '#BF00FF',
        blue: '#4A9EFF',
        red: '#FF3131',
        border: 'rgba(0,255,255,0.12)',
        text: '#D8E8F4',
        textMid: '#7A9AB8',
        textDim: '#3A5068',
      },
      designRules: [
        'Dark obsidian background (#020407) — no white backgrounds',
        'Neon cyan (#00FFFF) as primary accent, purple (#BF00FF) as secondary',
        'Monospace font (Platform.OS === "ios" ? "Courier" : "monospace") for all labels',
        'All cards: borderRadius 14-16, border 1.5px rgba(0,255,255,0.18)',
        'iOS shadow: shadowColor=accentColor, shadowOpacity 0.2-0.25, shadowRadius 18-22',
        'Animated.loop for all pulse/glow effects with useNativeDriver:true for opacity',
        'ProgressBar components for metrics — never use raw View width',
        'StyleSheet.create() at bottom of file — no inline styles for repeated patterns',
      ],
      homepageLandmarks: [
        'After hero: ConnectedPCCard',
        'After ConnectedPCCard: TerminalFeedCard',
        'After TerminalFeedCard: CrawlersGraphCard',
        'After CrawlersGraphCard: KnowledgebankGraphCard',
        'After KnowledgebankGraphCard: ScriptsGraphCard',
        'After ScriptsGraphCard: FileShareClipboardCard',
        'After FileShareClipboardCard: SigmaNetCrawlerHomeCard + SmartAlertsHomeCard',
        'After SmartAlerts: OmegaLearningLoop',
        'After OmegaLearningLoop: SecurityProtocolsGrid',
        'After SecurityProtocols: KBArticlesFeed',
        'After KBArticlesFeed: ServerSetupSection',
        'After ServerSetup: QuickAccessGrid',
        'After QuickAccess: RecentActivity',
      ],
      exampleAddGraph: {
        description: 'How to add a new NetworkSpeedCard after CrawlersGraphCard',
        files: [
          {
            path: 'components/ui/NetworkSpeedCard.tsx',
            content: 'FULL TSX SOURCE HERE — must be self-contained with StyleSheet at bottom'
          }
        ],
        patches: [
          { op: 'file.insertAfter', file: 'app/(tabs)/nexushome.tsx', after: "import { FileShareClipboardCard } from '@/components/ui/FileShareClipboardCard';", content: "import { NetworkSpeedCard } from '@/components/ui/NetworkSpeedCard';" },
          { op: 'file.insertAfter', file: 'app/(tabs)/nexushome.tsx', after: '      {/* 4. CRAWLERS + KB CARDS */}', content: '      {/* 4b. NETWORK SPEED */}\n      <NetworkSpeedCard isConnected={isConnected} />' }
        ]
      }
    },
    tokens,
    navigation: {
      tabs: ['home', 'scripts', 'butler', 'knowledge', 'fileshare', 'logs', 'builder', 'support', 'settings'],
      defaultTab: 'home',
    },
    features,
    server:       { ip, port, autoConnect: features.autoConnect },
    ai:           aiSettings,
    i18n: {
      appName:      'Butler AI: PC Automation',
      heroTitle:    'BUTLER AI',
      heroSubtitle: 'TAKE CONTROL OF YOUR PC',
      heroDesc:     'Your self-hosted AI that controls your PC with plain language.',
      scanQrBtn:    'SCAN QR TO PAIR',
      openChatBtn:  'OPEN AI CHAT',
    },
    ui: currentUIConfig,
    scripts: [
      {
        name:        'Quick System Report',
        description: 'Full PC snapshot in one command',
        category:    'System',
        tags:        ['system', 'monitoring'],
        code:        SAMPLE_SCRIPT_LINES.join('\n'),
      },
    ],
    knowledge: [
      { domain: 'Custom', topic: 'example', summary: 'Example KB entry — replace with your own', keywords: ['example'] },
    ],
    automations: [
      { trigger: 'on_connect', action: 'run_health_check', enabled: false },
    ],
    assets: {
      splashColor: '#020810',
      appName:     'Butler AI: PC Automation',
    },
    files: [
      { __EXAMPLE_ONLY__: true, path: 'constants/theme.ts', content: '// Replace this with the full file content you want to apply' },
    ],
    patches: [
      { __EXAMPLE_ONLY__: true, op: 'file.replace', file: 'constants/theme.ts', find: "primary: '#5B9CF6'", replace: "primary: '#00FFFF'", count: 1 },
      { __EXAMPLE_ONLY__: true, op: 'file.regex',  file: 'app/(tabs)/nexushome.tsx', pattern: 'BUTLER AI', replace: 'BUTLER AI' },
      { __EXAMPLE_ONLY__: true, op: 'file.create', file: 'components/ui/MyNewComponent.tsx', content: 'export default function MyNewComponent() { return null; }' },
    ],
  };
}

// ── Get / Clear import log ────────────────────────────────────────────────
export async function getImportLog(): Promise<PHLog[]> {
  try {
    const raw = await AsyncStorage.getItem(PH_IMPORT_LOG);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function clearImportLog(): Promise<void> {
  await AsyncStorage.multiRemove([PH_IMPORT_LOG, PH_LAST_JSON_KEY, PH_TOKEN_KEY, PH_NAV_KEY]).catch(() => {});
}
