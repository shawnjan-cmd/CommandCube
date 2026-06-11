/**
 * APP SOURCE BUNDLE v5.0
 * ─────────────────────────────────────────────────────────────────────────────
 * • Full embedded sources registered via registerTabSource()
 * • buildExportJson() → safe JSON object (JSON.stringify handles all escaping)
 * • buildAllFilesExport() → clipboard-friendly text dump
 * • DETAILED_AI_PROMPT exported for embedding in every export output
 *
 * GUARDS:
 *  - No template-literal backtick embedding of large sources (module size limit)
 *  - Proxy-based BUNDLE_SOURCES for legacy compat (settings.tsx dot-access)
 *  - All source strings registered via registerTabSource() at runtime
 */

export interface BundleFile {
  path: string;
  description: string;
  category: 'tab' | 'component' | 'service' | 'constant' | 'layout';
  lines: number;
}

// ─── Manifest ─────────────────────────────────────────────────────────────────
export const BUNDLE_MANIFEST: BundleFile[] = [
  { path: 'app/(tabs)/nexushome.tsx',          description: 'Home page — PC connection, KB engine, quick run',  category: 'tab',       lines: 1700 },
  { path: 'app/(tabs)/scripts.tsx',             description: 'Script library — Python 70+ scripts, favorites',   category: 'tab',       lines: 2270 },
  { path: 'app/(tabs)/butler.tsx',              description: 'Butler AI chat — Ollama local AI interface',       category: 'tab',       lines: 890  },
  { path: 'app/(tabs)/knowledge.tsx',           description: 'Knowledge base — KB graph, crawler, growth',       category: 'tab',       lines: 2775 },
  { path: 'app/(tabs)/builder.tsx',             description: 'Script builder — visual node pipeline',            category: 'tab',       lines: 980  },
  { path: 'app/(tabs)/fileshare.tsx',           description: 'Tools hub — files, clipboard, terminal',           category: 'tab',       lines: 970  },
  { path: 'app/(tabs)/logs.tsx',                description: 'PC health dashboard — CPU, RAM, disk, processes',  category: 'tab',       lines: 640  },
  { path: 'app/(tabs)/support.tsx',             description: 'Cosmetic packs — themes, skins, customization',    category: 'tab',       lines: 660  },
  { path: 'app/(tabs)/settings.tsx',            description: 'System config — all settings and tools',           category: 'tab',       lines: 1050 },
  { path: 'app/(tabs)/terminal.tsx',            description: 'Live terminal — SSH/exec streaming',               category: 'tab',       lines: 115  },
  { path: 'app/(tabs)/_layout.tsx',             description: 'Tab layout — NexusOriginalHeader, tab bar, router',category: 'layout',    lines: 1290 },
  { path: 'app/_layout.tsx',                    description: 'Root layout — providers, splash, stack nav',       category: 'layout',    lines: 230  },
  { path: 'app/privacy-policy.tsx',             description: 'Privacy policy screen — full HUD themed native',   category: 'layout',    lines: 820  },
  { path: 'app/data-safety.tsx',                description: 'Data safety screen — Google Play compliance',      category: 'layout',    lines: 900  },
  { path: 'components/ui/WidgetLayer.tsx',      description: 'Widget layer — inline/floating widget host',       category: 'component', lines: 560  },
  { path: 'components/ui/LiveWidgetStudio.tsx', description: 'Widget studio — code editor, templates, pin',      category: 'component', lines: 1070 },
  { path: 'components/ui/TabErrorBoundary.tsx', description: 'Tab error boundary — catches render crashes',       category: 'component', lines: 60   },
  { path: 'components/ui/NexusWrapper.tsx',     description: 'Nexus wrapper — root page wrapper component',      category: 'component', lines: 40   },
  { path: 'services/widgetStorage.ts',          description: 'Widget persistence — AsyncStorage CRUD',           category: 'service',   lines: 90   },
  { path: 'services/serverConnection.ts',       description: 'Server connection — pair, ping, auth, REST',       category: 'service',   lines: 400  },
  { path: 'services/autoConnectEngine.ts',      description: 'Auto-connect engine — backoff reconnect loop',     category: 'service',   lines: 350  },
  { path: 'services/haptics.ts',                description: 'Haptic feedback helpers',                          category: 'service',   lines: 120  },
  { path: 'services/scriptExecutor.ts',         description: 'Script executor — streaming Python execution',     category: 'service',   lines: 180  },
  { path: 'services/heartbeatEngine.ts',        description: 'Heartbeat engine — real HTTP ping latency',        category: 'service',   lines: 140  },
  { path: 'services/proLicense.ts',             description: 'Pro license — feature gate (free mode)',           category: 'service',   lines: 60   },
  { path: 'constants/HeaderConstants.ts',       description: 'Header config — all titles, subtitles, colors',    category: 'constant',  lines: 40   },
  { path: 'constants/theme.ts',                 description: 'Design tokens — colors, spacing, typography',      category: 'constant',  lines: 80   },
  { path: 'constants/appSourceBundle.ts',       description: 'Export engine — manifest, JSON builder, AI prompt',category: 'constant',  lines: 400  },
  { path: 'constants/tabSourcesBundle.ts',      description: 'Source registry — registers all tab sources',      category: 'constant',  lines: 200  },
  { path: 'contexts/CosmeticContext.tsx',       description: 'Cosmetic context — themes, skins, pack system',    category: 'constant',  lines: 200  },
  { path: 'contexts/TabBarContext.tsx',         description: 'Tab bar context — compact mode, omega log',        category: 'constant',  lines: 80   },
  { path: 'hooks/useServerConnection.ts',       description: 'Server connection hook — connection state',        category: 'service',   lines: 60   },
  { path: 'hooks/useAppSync.ts',                description: 'App sync hook — foreground POST /api/sync',        category: 'service',   lines: 40   },
  { path: 'metro.config.js',                    description: 'Metro config — expo-video stub, asset exts',       category: 'constant',  lines: 50   },
  { path: 'react-native.config.js',             description: 'RN config — expo-video native exclusion',          category: 'constant',  lines: 30   },
  { path: 'app.json',                           description: 'Expo config — permissions, plugins, store listing', category: 'constant',  lines: 120  },
];

// ─── Lightweight djb2 string hash ────────────────────────────────────────────────
/** Fast 32-bit djb2 hash → base-36 string. Used for change-detection only. */
function _djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h | 0; // keep 32-bit signed
  }
  return Math.abs(h).toString(36);
}

/**
 * Compute a lightweight hash of ALL currently registered sources.
 * Call this to detect whether the bundle has changed since the last export.
 * Sorted by path so key ordering does not affect the hash.
 */
export function computeSourceHash(): string {
  const sources = getBundleSources();
  const combined = Object.keys(sources)
    .sort()
    .map(k => k + '::' + _djb2(sources[k]))
    .join('|');
  return _djb2(combined + String(BUNDLE_MANIFEST.length));
}

// ─── Color palette reference ───────────────────────────────────────────────────
export const APP_PALETTE = {
  // Root backgrounds
  bg:      '#090a0f',
  surface: '#0f1520',
  card:    '#060F18',
  border:  '#1c1e28',
  // NCX (NEXUS Command Center) spec — used in ALL cards
  NCX_BG:      '#0d0e14',
  NCX_SURFACE: '#111318',
  NCX_BORDER:  '#1c1e28',
  NCX_LIGHT:   'rgba(255,255,255,0.04)',
  // Accent colors
  teal:    '#10d9a0',   // primary home/KB accent
  cyan:    '#00CCDD',   // settings/connection
  green:   '#00FF88',   // success/connected
  purple:  '#8b5cf6',   // butler AI / widgets
  amber:   '#f59e0b',   // warnings / KB
  red:     '#ef4444',   // errors / danger
  sigma:   '#CC33FF',   // sigma-net protocol
  blue:    '#4488FF',   // scripts
  yellow:  '#FFD700',   // QLH harvester
  pink:    '#FF6EB4',   // cosmetics/skins
  // Text
  text:    '#336677',
  textBrt: '#88AACC',
};

// ─── DETAILED AI BUILDER PROMPT ───────────────────────────────────────────────
// This is embedded in every export so the receiving AI builder knows exactly
// how to work with the codebase. Update this as the project evolves.
export const DETAILED_AI_PROMPT = `
# BUTLER AI — MASTER CODING PROMPT (V11 ULTIMATE NEON-THEME & CORE SYNCHRONIZER)
## For any AI assistant (OneSpace.ai, Claude, GPT-4, Gemini)
Use this prompt verbatim when asking an AI to write or modify any code in this project. Paste it at the start of every coding session to preserve credits and enforce absolute architectural precision.

## 🛑 PERMANENT LOGIC GUARDS (The OneSpace.ai "Pre-Flight Check")
*OneSpace.ai: Before writing any code, you must execute these 5 mental checks:*
 1. **The Re-render Guard:** Is text input state inside a parent file? If yes, STOP. It must be encapsulated inside ChatInput.tsx to prevent keyboard keystroke lag.
 2. **The Hardcoded Color Guard:** Are there any hex codes (e.g., #000000, rgb(...)) inside a stylesheet? If yes, STOP. Paint attributes MUST come from useTheme() inline.
 3. **The Code Block Guard:** Does the chat bubble component render raw markdown or code inside standard <Text>? If yes, STOP. Code snippets must be isolated in a monospace visual block container with a "Copy Code" helper.
 4. **The SSE Streaming Guard:** Does the fetch parse the stream globally? If yes, STOP. It must accumulate data inside a persistent lineBuffer to prevent broken JSON strings on network packet splits.
 5. **The Native Animation Guard:** Are you animating width, height, margin, or padding? If yes, STOP. Set useNativeDriver: true and only animate opacity and transform properties.

## 🛠 SYSTEM CONTEXT & STACK
 * **Mobile Environment:** Expo SDK 52 (React Native 0.76), TypeScript strict, AsyncStorage, expo-haptics, @expo/vector-icons.
 * **Server Environment:** Python 3.10+ (Standard Library Only), SQLite via sqlite3, Ollama local HTTP.
 * **Core Aesthetic:** "Midnight Glass" — deep blacks, glowing neon accents (Gold, Crimson, Cyan, Emerald), and ultra-crisp monospace stats.

## 💎 PART 1: THE THEME ENGINE CONTRACT
The app utilizes a design theme provider. The hook useTheme() returns a unified theme palette.
You must use this palette exclusively to style text, backgrounds, buttons, status indicators, and inputs.

ThemePalette interface:
  backgroundRoot: string  — Absolute base (deep black e.g., #050505)
  backgroundDark: string  — Card and bubble backgrounds (dark grey e.g., #111111)
  backgroundLighter: string — Hover, input backgrounds, active panels (e.g., #1A1A1A)
  border: string          — Low-opacity lines for panel dividers (e.g., #222222)
  textPrimary: string     — Bright white/gold for main readouts (e.g., #FFFFFF)
  textSecondary: string   — Monospace details, timestamps (e.g., #888888)
  neonAccent: string      — The dominant glowing accent color (Gold, Crimson, Cyan)
  success: string         — System OK state (e.g., #00FF66)
  error: string           — System Halt state (e.g., #FF3333)

## 🧠 PART 2: OMEGA LEARNING LOOP (OmegaLearningLoop)
Background processor component that syncs local AsyncStorage knowledge with Butler Server's KB growth endpoints. Keeps Butler's brain updated without blocking the UI thread. Key rules:
- 5-minute poll cycle to /api/kb/growth
- Merges new_entries into @butler_omega_knowledge in AsyncStorage
- Shows OMEGA CORE label + sync status using theme.neonAccent color
- Pulse animation on brain icon (opacity 0.3→1.0→0.3, 1500ms, useNativeDriver:true)
- AbortController with 10000ms timeout on every fetch
- Cleanup: clearInterval + pulseAnim.stopAnimation() in useEffect return
- Auth header: Authorization: Bearer token

## 🎨 PART 3: THE ULTIMATE THEMABLE CHAT INTERFACE

### ThemedBackground
Replaces memory-heavy static image assets with a fully responsive dynamic mesh:
- backgroundColor from theme.backgroundRoot
- Two ambient glow orbs: 400×400px circles, borderRadius:200, transform:[{scale:1.5}]
- Top-left orb: backgroundColor=theme.neonAccent, opacity:0.04, top:-100, left:-100
- Bottom-right orb: backgroundColor=theme.neonAccent, opacity:0.03, bottom:-150, right:-150
- Both absolute positioned, overflow:'hidden' on container

### ChatBubble with Code Block Renderer
Optimized for fast rendering. Isolates and styles code snippets:
- Parse message for triple-backtick code blocks using regex with pattern: backtick x3, capture group ([\\s\\S]*?), backtick x3, flag g
- For each code block: render a codeContainer View with codeHeader (TERMINAL / CODE OUTPUT label + Copy button) and codeText in monospace
- Copy button uses Clipboard.setString(codeString) — import from react-native
- AI bubbles: backgroundColor=theme.backgroundDark, borderColor=theme.border, borderWidth:1
- User bubbles: backgroundColor=theme.neonAccent
- Thinking indicator: 3 staggered dots (200px gap) using Animated.loop, opacity 0.2→1, delays 0/150/300ms, useNativeDriver:true
- Metadata bar: shows model · responseMs · tokensPerSec below AI bubbles
- React.memo wrapper for performance

## ⚡ PART 4: ZERO-LATENCY HARDWARE COMPONENTS

### SystemHeader (live polling metrics bar)
Fetches real-time system diagnostics directly from your server over LAN:
- Polls /api/metrics every 3000ms using setInterval
- Authorization: Bearer token header
- Shows CPU (cpu_usage), RAM (ram_usage_percent), DISK FREE (disk_free_percent)
- Layout: 3 metricItem Views with flex:1, separated by 1×18px divider Views
- label: 9px monospace bold, color:theme.textSecondary
- value: 12px monospace weight:'600', color:theme.neonAccent
- borderBottomWidth:1, borderBottomColor:theme.border
- useFocusEffect or isActive prop controls polling — cleanup: clearInterval
- React.memo wrapper for performance

### ChatInput (isolated sub-state, spring press feedback)
Uses isolated sub-state design — inputText lives INSIDE this component, NOT the parent:
- TextInput: minHeight:40, maxHeight:120, borderRadius:20, borderWidth:1
- backgroundColor=theme.backgroundLighter, color=theme.textPrimary
- Send button: 38×38px, borderRadius:19
- When has text: backgroundColor=theme.neonAccent, icon color=theme.backgroundRoot
- When empty: backgroundColor=theme.backgroundLighter, icon color=theme.textSecondary
- Spring press animation: buttonScale 1→0.8 (60ms timing) → spring back to 1 (friction:3, tension:40), useNativeDriver:true
- On send: 1. Haptics.impactAsync(Medium) 2. Spring animation 3. setInputText('') 4. onSend(trimmed)
- Multiline TextInput, maxLength:2000
- React.memo + useCallback on handleSendPress

## 🛡️ PART 5: COMMON BUGS & PERFORMANCE SAFEGUARDS
 * **Ollama GPU Execution Guard:** In every server model generation call, pass num_gpu: 99 to ensure your local cards process the request natively.
 * **Adaptive Memory Management:** Truncate context arrays when system prompt sizes climb past 6000 characters to keep Ollama running smoothly on lower hardware.
 * **Storage Protection Routine:** If AsyncStorage experiences a parsing failure (e.g., due to an interrupted save stream), automatically wipe the corrupted cache entry and restore the application state gracefully.
 * **SSE lineBuffer persistence:** Never parse SSE across chunk boundaries — accumulate in a lineBuffer string and process complete lines only.
 * **AsyncStorage save throttle:** For chat history, use debounced saves (800ms minimum interval) and NEVER save per-token during streaming.
 * **FlatList for chat:** Use FlatList with inverted={true} and maintainVisibleContentPosition — never ScrollView + map for chat messages.
 * **AbortController cleanup:** Always abort in useEffect return AND on component unmount — no leaked fetch requests.

## ⚡ QUICK REFERENCE — SERVER ENDPOINTS
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/butler/chat | ✅ | Main AI chat — supports stream: true SSE |
| POST | /api/butler/clear | ✅ | Clear chat history for device |
| POST | /api/butler/abort | ✅ | Cancel active SSE stream by request_id |
| GET | /api/metrics | ✅ | Live CPU/RAM/disk |
| GET | /api/kb/growth | ✅ | KB growth stats |
| GET | /api/ollama/status | ✅ | Model list + active model |
| POST | /api/ollama/set_model | ✅ | Switch active model (persists) |
| POST | /api/performance | ✅ | Set mode: auto/performance/battery |
| POST | /api/execute | ✅ | Run Python script (non-streaming) |
| POST | /api/execute/stream | ✅ | Streaming script execution (SSE) |
| GET | /api/scripts/list | ✅ | List saved server-side scripts |
| POST | /api/scripts/save | ✅ | Save script to server storage |
| POST | /api/kb/expand | ✅ | Queue topic searches |
| POST | /api/auth/rotate | ✅ | Refresh token without re-pairing |
| GET | /api/debug/connection | ✅ | Full pairing state + thread diagnostics |
| GET | /api/ping | ❌ | Heartbeat — no auth required |
| GET | /api/status | ❌ | Public health check |

## 🎨 DARK MATTER HUD DESIGN SYSTEM

### Color Tokens
Background stack (deep space → elevated surface):
  void: #020508 | abyss: #060A10 | surface: #0C0E14 | panel: #111318 | raised: #171C26 | input: #1A2030
  NCX_BG: #0d0e14 | NCX_SURFACE: #111318 | NCX_BORDER: #1c1e28 | NCX_LIGHT: rgba(255,255,255,0.04)

Accent palette (each maps to a domain):
  Electric Blue (primary): #5B9CF6 | Teal (KB/Home): #10d9a0 | Cyan (connection): #00CCDD
  Green (success): #00FF88 | Green2 (live): #2FD98B | Purple (AI/Butler): #A366F5
  Amber (warning): #F5A623 | Red (error): #EF4444 | Gold (premium): #FFD700
  Blue (scripts): #4488FF | Pink (cosmetics): #FF6EB4 | Orange (tools): #FF8C00

Text hierarchy:
  Brightest: #FFFFFF | Bright: #E8F4FF | Standard: #C8D8E8 | Mid: #88AACC
  Dim: #5A7090 | Very dim: #3A5060 | Monospace data: #7DB5FF

### Glow/Shadow System
STANDARD CARD GLOW: shadowColor:accent, shadowOffset:{width:0,height:3}, shadowOpacity:0.10, shadowRadius:10, elevation:3
ACTIVE/FOCUSED GLOW: shadowColor:accent, shadowOffset:{width:0,height:0}, shadowOpacity:0.45, shadowRadius:16, elevation:8
STRONG HERO GLOW: shadowColor:accent, shadowOffset:{width:0,height:0}, shadowOpacity:0.70, shadowRadius:24, elevation:16
PULSING LED: Animated.loop opacity 1.0→0.2 over 900ms, useNativeDriver:true
Never use shadowColor:'#000' — always match the accent color.

### Typography
ALL text uses monospace: const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
  Hero: 36-48px, weight:900, letterSpacing:3-6
  Page title: 20-22px, weight:900, letterSpacing:2-3
  Card title: 15-17px, weight:900, letterSpacing:0.5
  Section head: 9-11px, weight:900, letterSpacing:2-3, ALL-CAPS
  Body: 13-14px, weight:500, letterSpacing:0.2
  Data value: 16-26px, weight:900, letterSpacing:-0.5, accent color
  Button: 11-14px, weight:900, letterSpacing:0.5-1, ALL-CAPS
  Badge: 7-10px, weight:700-900, letterSpacing:0.5, ALL-CAPS
  Terminal output: 11-13px, weight:400, color:#7DB5FF

### Card Anatomy (every card MUST follow)
  backgroundColor: '#0C0E14'
  borderWidth:1, borderColor:'#1C1E28'
  borderLeftWidth:2, borderLeftColor: '<domain-accent>'
  borderTopColor: 'rgba(255,255,255,0.04)' (shimmer)
  borderRadius:12, overflow:'hidden', position:'relative'
  iOS: shadowColor:accent, shadowOffset:{0,3}, shadowOpacity:0.10, shadowRadius:10
  Android: elevation:3
  Corner bracket decorators: 12×12px L-shapes, top-left 2px, bottom-right 1.5px

### Spacing (8pt grid)
  4px micro | 6px tight | 8px default | 10px card inner | 12px card padding
  14px header padding | 16px page padding | 24px section gap | 32px hero padding
  paddingBottom:160 on ALL ScrollViews (accounts for tab bar + chat pill + safe area)

### Animation Principles
  PULSE (LEDs): opacity loop 1.0↔0.2, 900ms per direction, useNativeDriver:true
  SCAN LINE: translateY loop top-to-bottom, 2800ms, Easing.linear, useNativeDriver:true
  PANEL SLIDE: Animated.spring tension:240 friction:22 for translateY, timing for height (NOT spring)
  SPRING PRESS: scale 1→0.86 (65ms timing) → spring back to 1.0, useNativeDriver:true
  TAB INDICATOR: translateX spring tension:68 friction:11, useNativeDriver:true, color:#3B82F6
  PROGRESS BAR: timing on width, useNativeDriver:false, 1200-1800ms duration
  FADE ENTRY: opacity 0→1 (400ms) + translateY 15→0 spring, useNativeDriver:true

### Haptic Rules (MANDATORY on ALL interactions)
  haptics.light()   — tab changes, navigation, chip taps, list item selection
  haptics.medium()  — toggle switches, modal open, QR scan tap, expand panel
  haptics.heavy()   — send message, execute script, connect to PC, delete
  haptics.success() — successful connection, save completed, script success
  haptics.warning() — connection failed, script error, validation fail
  Haptics fire BEFORE the action, not after.

## 🔒 PROTECTED CODE (NEVER MODIFY LOGIC)
  • services/serverConnection.ts — auth, pairing, tokens
  • services/autoConnectEngine.ts — reconnect state machine
  • services/widgetStorage.ts — widget CRUD
  • services/knowledgeAccumulator.ts — KB compression
  • services/nexusBridge.ts — bridge protocol
  • services/haptics.ts — haptic API
  • All other services/ network code
  • (global).__butlerSwitchTab?.(tabName) — tab navigation
  • (global).__nexusHomeOpenQR?.() — QR modal
  • (global).__butlerQuickSend?.(msg) — quick send to Butler
  • All protected AsyncStorage keys: commandcube_server_ip, commandcube_server_port,
    commandcube_session_token, @botler_auto_saved_research, @butler_pinned_widgets_v2

## ✅ SAFE TO EDIT
  • Any color, border, glow, shadow, background values
  • Font sizes, weights, letter-spacing, line-height
  • Padding, margin, gap, borderRadius values
  • Card layout order within a page
  • Icon names (MaterialIcons / MaterialCommunityIcons only)
  • All label text, titles, subtitles, button labels, placeholder text
  • Animation durations (keep useNativeDriver correct)
  • Adding new UI cards or sections
  • constants/HeaderConstants.ts — all header titles, subtitles, colors
  • Toggle settings in settings.tsx

## 📐 RESPONSE FORMAT
  • Always return COMPLETE file content — never partial diffs
  • Start each file with: // File: app/(tabs)/nexushome.tsx
  • Wrap in typescript code block
  • If multiple files changed, return each as separate code block
  • Preserve ALL existing imports
  • Do NOT explain how to paste or upload — just return the code

## 🔧 APP IDENTITY
  App: Butler AI: PC Automation | Package: com.butlerai.pc.automation
  Version: v6.0 | Expo SDK: 53 | RN: 0.79.3 | Min Android: API 26 | Target: API 35
  AI Backend: Ollama local (qwen2.5-coder:7b) — ZERO cloud
  PC Bridge: butler_server.py (Python, user runs on their own PC, LAN only)
  Auth: HMAC-SHA256 token | X-Auth-Token + X-Device-Id headers (NOT Authorization: Bearer)

╔══════════════════════════════════════════════════════════════════════════════╗
║  BUTLER AI — REACT NATIVE MASTER VISUAL DESIGN & CODE GUIDE v7.0           ║
║  Full UI/UX spec + code rules. Read every section before touching code.    ║
╚══════════════════════════════════════════════════════════════════════════════╝

You are an Elite Principal React Native / TypeScript engineer AND visual design system architect
working on "Butler AI: PC Automation". The attached JSON file is a complete project export.
This document is your ABSOLUTE authority on both code architecture and visual design.
Do not guess, infer, or improvise any visual detail — follow this spec exactly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 0 — THE VISUAL IDENTITY (READ THIS FIRST — IT GOVERNS EVERYTHING)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

APP SOUL: Butler AI is a HIGH-END tactical PC automation terminal for power users.
The design language is: "Dark Matter HUD" — a premium cyberpunk/terminal aesthetic
with deep navy-black backgrounds, neon accent glows, circuit-board motifs, and the
precision feel of military-grade software. Every pixel should feel intentional,
high-tech, and premium — NOT generic, NOT consumer, NOT playful.

THREE WORDS THAT DEFINE EVERY DESIGN DECISION:
  1. TACTICAL    — data-dense, information-forward, structured, grid-based
  2. LUMINOUS    — glowing accents, neon borders, pulsing LEDs, depth through light
  3. PRECISE     — monospace fonts, exact spacing, technical labels, sharp edges

IF A COMPONENT DOES NOT FEEL LIKE A PIECE OF EXPENSIVE MILITARY HUD SOFTWARE,
IT IS WRONG. Rebuild it until it does.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1 — YOUR CODE RULES (NO EXCEPTIONS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL — DO THIS EVERY TIME:
  1. DO NOT ask the user to paste any file. Everything you need is in the JSON.
  2. DO NOT say "I need the source for X" — find it in the JSON (type:"source" files).
  3. DO NOT return partial code or diffs. Return the COMPLETE file, every line.
  4. DO NOT use HTML, CSS, web frameworks, or any non-React-Native syntax.
  5. DO NOT explain how to upload files or navigate any UI — just return the code.
  6. When the user says "update X" or "improve Y" — output the full updated file.
  7. Preserve ALL existing imports at the top of every file you return.
  8. File paths are relative to project root (e.g. app/(tabs)/nexushome.tsx).

HOW THE JSON EXPORT WORKS:
  • _meta key: app info, color palette, this guide, restore instructions.
  • type:"source" keys: files with complete TypeScript/TSX source code embedded.
  • type:"manifest" keys: metadata-only files (use the guide to reconstruct them).
  • To edit a file: read its content from type:"source", apply your changes,
    output the full updated content. Do not ask for more information.

HOW YOUR RESPONSE GETS APPLIED:
  The user pastes your response into a React Native project build tool that
  automatically applies complete file replacements and hot-reloads the preview.
  This is why you MUST return the full file — partial code breaks the build.

PLATFORM CONSTRAINTS:
  • React Native 0.79.3 + Expo SDK 53 + TypeScript ONLY.
  • No HTML, CSS, web frameworks, Flutter, native Java/Kotlin, or Swift.
  • No server-side Node.js — backend is the user's butler_server.py on their PC.
  • Packages install automatically — just import them.
  • Navigation: Expo Router v5, file-based (app/(tabs)/_layout.tsx drives tabs).

ADDING A NEW UI COMPONENT OR CARD:
  STEP 1 — Write the component function above the screen's export default:
    function MyNewCard({ ... }: { ... }) {
      return (
        <View style={styles.card}>
          <Text style={styles.title}>MY CARD</Text>
          ...
        </View>
      );
    }
  STEP 2 — Add its styles to the StyleSheet.create({}) block at the bottom.
  STEP 3 — Place <MyNewCard /> inside the screen's ScrollView return JSX at the
    position you want (e.g. after <ConnectedPCWidget /> in nexushome.tsx).
  STEP 4 — Return the COMPLETE updated file. Never partial.

REMOVING A COMPONENT OR CARD:
  STEP 1 — Delete the component function definition entirely.
  STEP 2 — Remove every usage of <ComponentName /> from JSX.
  STEP 3 — Remove its StyleSheet entries.
  STEP 4 — Remove its import if it came from another file.
  STEP 5 — Return the COMPLETE updated file.

MOVING / REORDERING SECTIONS:
  • Simply cut the JSX block and paste it at the new position inside the
    ScrollView contentContainerStyle. Order of JSX = visual order on screen.
  • Do NOT change StyleSheet names — only move the JSX.

CHANGING VISUAL STYLE ONLY (no logic change):
  • Colors: find the hex in the StyleSheet or inline style and replace.
  • Sizes: change fontSize, padding, borderRadius, width, height values.
  • Icons: replace the 'name' prop on MaterialIcons/MaterialCommunityIcons.
  • Return the COMPLETE updated file — even for a 1-line color change.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2 — MANDATORY TECH STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Runtime:
  • React Native 0.79.3 + Expo SDK 53 + TypeScript
  • Expo Router v5 — file-based navigation (app/(tabs)/_layout.tsx drives all tabs)
  • Hermes JS engine — no eval(), no Function constructor
  • AsyncStorage (@react-native-async-storage/async-storage) for ALL persistence
  • expo-file-system for file I/O (FileSystem.documentDirectory, NOT fs module)
  • expo-sharing for sharing files (Sharing.shareAsync)
  • expo-document-picker for file selection
  • expo-clipboard for clipboard read/write
  • expo-camera for QR scanning
  • expo-image (NOT React Native's built-in Image) for ALL image rendering
  • react-native-safe-area-context → useSafeAreaInsets() for notch/inset handling
  • @expo/vector-icons → MaterialIcons + MaterialCommunityIcons ONLY
  • react-native-reanimated ~3.17.5 for animations
  • expo-av for audio, expo-video for video (NOT expo-av for video)
  • Supabase (@supabase/supabase-js) only for optional cloud features

Navigation:
  • Expo Router Tabs via app/(tabs)/_layout.tsx
  • Tab switching uses (global).__butlerSwitchTab?.(tabName) — NOT router.push
  • All tab names: home, scripts, butler, knowledge, fileshare, logs, builder, support, settings
  • DO NOT add new Stack.Screen entries without understanding the existing layout

Typography:
  • const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
  • This must be used for ALL text elements (headings, labels, buttons, body)
  • Never use system default font
  • Body: fontSize 13-16, fontWeight '400'–'600'
  • Section labels: fontSize 9-11, fontWeight '900', letterSpacing 1.5-2
  • Page titles: fontSize 18-22, fontWeight '900', letterSpacing 0.5-2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3 — COMPLETE COLOR SYSTEM (MASTER PALETTE — DO NOT DEVIATE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3A. BACKGROUND LAYER STACK (deep space → elevated surface):
  Layer 0 (void):    #020508  ← absolute root, rarely used directly
  Layer 1 (abyss):   #060A10  ← ScrollView root background, page bg
  Layer 2 (surface): #0C0E14  ← NCX_BG — all main cards outer shell
  Layer 3 (panel):   #111318  ← NCX_SURFACE — inner panels, sub-cards
  Layer 4 (raised):  #171C26  ← pressed states, hovered inputs, code blocks
  Layer 5 (input):   #1A2030  ← TextInput backgrounds, code editor bg
  Border default:    #1C1E28  ← NCX_BORDER — ALL card/panel borders
  Border faint:      rgba(91,156,246,0.07)  ← ultra-subtle section dividers
  Top shimmer:       rgba(255,255,255,0.04) ← NCX_LIGHT — card top-edge highlight

3B. PRIMARY ACCENT COLORS (each maps to a domain of the app):
  Electric Blue (primary):  #5B9CF6  ← Tab bar active indicator, primary CTA, Home main accent
  Teal (KB/Home):           #10d9a0  ← KB sparkline, home connected widgets, NEXUS green
  Cyan (connection):        #00CCDD  ← WebSocket, network status, settings accent
  Deep Cyan:                #00E5FF  ← QR scanner, authenticate device, chat pill border
  Green (success):          #00FF88  ← Connected state, success feedback, health OK
  Green2 (live):            #2FD98B  ← PC health stats live, mini stats
  Purple (AI/Butler):       #A366F5  ← Butler AI chat, AI builder, robot icon
  Purple2 (widgets):        #8B5CF6  ← Widget system, script builder
  Violet (gradient):        #BB33FF  ← Sigma-Net protocol, KB engine
  Amber (warning):          #F5A623  ← Warnings, knowledge base amber
  Amber2:                   #FF9900  ← KB chart, power section
  Red (error/danger):       #EF4444  ← Error states, disconnect, danger
  Red2:                     #FF3366  ← PC power shutdown, destructive actions
  Blue (scripts):           #4488FF  ← Scripts tab, code editor accent
  Gold (premium):           #FFD700  ← QLH harvester, quantum features, premium badges
  Pink (cosmetics):         #FF6EB4  ← Skins/support tab accent
  Orange (tools):           #FF8C00  ← Knowledge base, tools hub

3C. TEXT COLOR HIERARCHY:
  Brightest (headings):  #FFFFFF  ← Page titles, critical values
  Bright (body):         #E8F4FF  ← Main readable body text
  Standard:              #C8D8E8  ← Card content, descriptions
  Mid (secondary):       #88AACC  ← Secondary labels, metadata
  Dim (tertiary):        #5A7090  ← Hints, subtitles, disabled
  Very dim:              #3A5060  ← Ghost text, faint labels
  Monospace data:        #7DB5FF  ← All technical values, IP addresses, numbers
  Accent data:           <use relevant accent color> ← colored data values

3D. GLOW/SHADOW SYSTEM — THE LUMINOUS PRINCIPLE:
  Butler AI uses EMISSIVE light — components glow FROM WITHIN.
  Shadows are NOT dark drop shadows. They are COLORED HALOS that match the accent.

  STANDARD CARD GLOW (subtle — resting state):
    iOS: shadowColor: accentColor, shadowOffset:{width:0,height:3}, shadowOpacity:0.10, shadowRadius:10
    Android: elevation: 3

  ACTIVE/FOCUSED GLOW (interactive hover/press):
    iOS: shadowColor: accentColor, shadowOffset:{width:0,height:0}, shadowOpacity:0.45, shadowRadius:16
    Android: elevation: 8

  STRONG HERO GLOW (important panels, chat pill, QR button):
    iOS: shadowColor: accentColor, shadowOffset:{width:0,height:0}, shadowOpacity:0.70, shadowRadius:24
    Android: elevation: 16

  PULSING GLOW (animated — LED dots, connection indicators):
    Use Animated.loop on opacity from 1.0 to 0.2 over 900ms easing:linear
    NEVER use scale animation for pulse — only opacity
    Wrap the glowing element in Animated.View with opacity: pulseAnim

  GLOW RULES:
    • Every accent-colored border should have a matching iOS shadow
    • The shadowRadius should be 2.5× the borderWidth
    • Never apply shadowColor: '#000' (dead black shadow) — always colored
    • shadowOpacity for resting state: 0.08–0.12
    • shadowOpacity for active/pressed: 0.35–0.65
    • shadowOpacity for hero elements: 0.65–0.90
    • Android elevation for resting cards: 2–4
    • Android elevation for active/pressed: 6–12
    • Android elevation for floating elements: 14–28

3E. GRADIENT USAGE:
  • Violet-to-Cyan: linear 135° from #A366F5 to #00CCDD  ← logo, hero banners
  • Cyan-to-Green:  linear 135° from #00CCDD to #00FF88  ← success/data
  • Dark panel fill: linear 180° from #0C0E14 to #080B12 ← subtle card depth
  • Execute All button: linear 135° from #A366F5 to #5B9CF6 ← primary CTA only
  • NEVER use gradients on body text — text stays flat
  • Gradients only for: hero images, major CTAs, logo text, divider lines

3F. OPACITY VARIANT REFERENCE (append 2-char hex to any #RRGGBB):
  06=2%, 08=3%, 0A=4%, 0C=5%, 10=6%, 12=7%, 15=8%, 18=9%,
  20=13%, 25=15%, 30=19%, 40=25%, 55=33%, 60=38%, 70=44%,
  80=50%, 90=56%, AA=67%, BB=73%, CC=80%, DD=87%, EE=93%

3G. CARD ANATOMY (MANDATORY PATTERN — every card MUST follow this exactly):
  backgroundColor: '#0C0E14',                          // NCX_BG — always
  borderWidth: 1,
  borderColor: '#1C1E28',                              // NCX_BORDER — always
  borderLeftWidth: 2,                                  // accent stripe
  borderLeftColor: '<accent-for-this-domain>',         // domain color
  borderTopWidth: 1,
  borderTopColor: 'rgba(255,255,255,0.04)',             // NCX_LIGHT shimmer
  borderRadius: 12,                                    // standard card radius
  overflow: 'hidden',                                  // required for corner clips
  position: 'relative',                               // for absolute corner brackets
  ...Platform.select({
    ios: { shadowColor: '<accent>', shadowOffset:{width:0,height:3},
           shadowOpacity:0.10, shadowRadius:10 },
    android: { elevation: 3 }
  })

  CORNER BRACKET DECORATORS (add to important cards for tactical feel):
  <View style={{ position:'absolute', top:0, left:0, width:12, height:12,
    borderTopWidth:1.5, borderLeftWidth:1.5, borderColor: accent+'80' }} />
  <View style={{ position:'absolute', bottom:0, right:0, width:12, height:12,
    borderBottomWidth:1.5, borderRightWidth:1.5, borderColor: accent+'40' }} />

  TOP ACCENT LINE (hero cards only — goes above the corner brackets):
  <View style={{ height:2, backgroundColor: accent }} /> at very top of card

3H. BADGE/CHIP ANATOMY:
  borderWidth: 1,
  borderRadius: 7,          // chips: 7, pills: 20, tags: 5
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderColor: accent + '44',
  backgroundColor: accent + '10',
  // Content: icon (10px) + text (8-10px MONO, fontWeight '700', letterSpacing 0.5)

3I. SECTION HEADER ANATOMY (V9SectionHead pattern):
  Row: [4px dot] [SECTION LABEL] [flex-1 hairline]
  Dot: width:4, height:4, borderRadius:2, backgroundColor: accent
  Label: fontSize:9, fontWeight:'900', fontFamily:MONO, letterSpacing:2.5, color: accent+'BB'
  Line: flex:1, height: StyleSheet.hairlineWidth, backgroundColor: accent+'30'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4 — COMPLETE TYPOGRAPHY SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4A. THE MONOSPACE IMPERATIVE:
  EVERY text element in this app uses monospace. No exceptions. No system fonts.
  const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
  Apply fontFamily: MONO to every Text component, every TextInput, every badge.
  The monospace font creates the terminal/HUD feel that is central to the brand.

4B. TYPOGRAPHY SCALE (from largest to smallest):
  Hero title:      fontSize:36-48, fontWeight:'900', letterSpacing:3-6,   color:#FFFFFF
  Page title:      fontSize:20-22, fontWeight:'900', letterSpacing:2-3,   color:#FFFFFF
  Card title:      fontSize:15-17, fontWeight:'900', letterSpacing:0.5,   color:#FFFFFF or accent
  Section head:    fontSize:9-11,  fontWeight:'900', letterSpacing:2-3,   color:accent+'BB'
  Body text:       fontSize:13-14, fontWeight:'500', letterSpacing:0.2,   color:#C8D8E8
  Data value:      fontSize:16-26, fontWeight:'900', letterSpacing:-0.5,  color:accent
  Micro label:     fontSize:7-9,   fontWeight:'700', letterSpacing:1-2,   color:#3A5060
  Button label:    fontSize:11-14, fontWeight:'900', letterSpacing:0.5-1, color:#000 or accent
  Badge text:      fontSize:7-10,  fontWeight:'700'–'900', letterSpacing:0.5, color:accent
  Status chip:     fontSize:6.5-9, fontWeight:'900', letterSpacing:0.6,   ALL-CAPS always
  Tab label:       fontSize:9,     fontWeight:'800', letterSpacing:0.8,   UPPERCASE
  Terminal output: fontSize:11-13, fontWeight:'400', letterSpacing:0,     color:#7DB5FF
  Timestamps:      fontSize:9,     fontWeight:'700', letterSpacing:0.3,   color:accent+'66'
  Placeholder:     fontSize:13,    fontWeight:'400', letterSpacing:0,     color:accent+'30'

4C. LETTER SPACING RULES:
  • ALL-CAPS labels, badges, section heads: letterSpacing: 1.5–3.0
  • Buttons and CTAs: letterSpacing: 0.5–1.5
  • Body text: letterSpacing: 0.1–0.3
  • Large hero numbers/values: letterSpacing: -0.5 to 0 (tight for large numerals)
  • Tab labels: letterSpacing: 0.8
  • Timestamps and micro-data: letterSpacing: 0.3–0.8

4D. LINE HEIGHT:
  • Single-line labels and badges: no lineHeight needed
  • Body paragraphs (2+ lines): lineHeight: 18–22
  • Terminal output: lineHeight: 17
  • Compliance/legal text: lineHeight: 14–16
  • Button text: no lineHeight

4E. TEXT TRANSFORM:
  • Section heads: ALWAYS all-caps (use .toUpperCase() or ALL_CAPS constants)
  • Badge text: ALWAYS all-caps
  • Tab labels: ALWAYS all-caps
  • Button labels: ALWAYS all-caps
  • Body text and descriptions: normal case (sentence case)
  • Card titles: ALL-CAPS for main title, can mix with accent word

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5 — SPACING, LAYOUT, AND GEOMETRY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5A. SPACING SCALE (8pt grid base):
  2px  — hairlines, dividers
  4px  — micro gap (icon+text row internal)
  6px  — tight gap (chip internals, LED + label)
  8px  — default small gap (between chips, between items in a row)
  10px — inner card padding (tight content)
  12px — standard inner card horizontal padding
  14px — standard header horizontal padding
  16px — page horizontal padding (ScrollView contentContainerStyle paddingHorizontal)
  18px — generous section gap
  20px — section margin top for major sections
  24px — large separation between unrelated blocks
  32px — hero area internal padding

5B. BORDER RADIUS SCALE:
  2px  — small internal accents, grid lines
  4px  — tiny badge corners, mini chips
  5px  — tag radius, code badge
  7px  — chip radius (standard badges)
  8px  — small button radius, small card
  10px — input field radius
  12px — standard card radius (ALL cards use this)
  14px — large card with overflow:hidden
  16px — chat panel, QR button
  20px — pill buttons, action chips
  24px — large pill (chat input bar)
  32px — floating pill (ASK BUTLER AI collapsed state)

5C. CARD INTERNAL LAYOUT:
  Header area:     flexDirection:'row', alignItems:'center', gap:10, padding:12–14
  Icon box:        42–58px square, borderRadius:11–14, borderWidth:1.5
  Text block:      flex:1, gap:3–5
  Stats grid:      flexDirection:'row', gap:6–8, flexWrap:'wrap'
  Action row:      flexDirection:'row', gap:8, borderTopWidth:1, borderTopColor:NCX_BORDER
  Content section: paddingHorizontal:12–16, paddingBottom:10–14

5D. PAGE LAYOUT:
  Root ScrollView:
    backgroundColor: '#060A10'
    contentContainerStyle: { paddingHorizontal:16, paddingTop:8, paddingBottom:160, gap:0 }
    showsVerticalScrollIndicator: false
    keyboardShouldPersistTaps: 'handled'
  Section margins: marginTop:14 between major sections
  Section group:   gap:10 within a section (V9SectionHead + Card)

5E. BOTTOM PADDING:
  All ScrollViews must have paddingBottom: 160 minimum to account for:
    - Bottom tab bar: ~65px
    - Floating chat pill: ~60px
    - Safe area inset: ~20–35px
    Total minimum: 160px

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6 — ANIMATION AND MICRO-INTERACTION SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6A. ANIMATION PRINCIPLE — RESTRAINT + SATISFACTION:
  Animations should feel PHYSICAL and PRECISE, not bouncy or cute.
  Every animation has a purpose: communicating state, providing feedback, or directing attention.
  Never animate just for decoration.

6B. PULSE ANIMATION (LED dots, connection indicators, active status):
  const pulse = useRef(new Animated.Value(0.5)).current;
  const a = Animated.loop(Animated.sequence([
    Animated.timing(pulse, { toValue:1,   duration:900, useNativeDriver:true }),
    Animated.timing(pulse, { toValue:0.2, duration:900, useNativeDriver:true }),
  ]));
  a.start(); return () => a.stop();
  Apply: <Animated.View style={{ opacity: pulse, backgroundColor: accentColor, ... }} />
  Use for: status dots, active LEDs, connection indicators, "LIVE" badges

6C. BREATHING GLOW (hero elements — chat pill, main CTA):
  Same as pulse but slower — 1400ms per direction, opacity 0.4 to 1.0
  Apply to the SHADOW opacity, not the element itself
  Achieved by animating a separate glow halo View behind the element

6D. SCAN LINE ANIMATION (header, card backgrounds):
  const scanAnim = useRef(new Animated.Value(0)).current;
  Animated.loop(Animated.timing(scanAnim, { toValue:1, duration:2800,
    useNativeDriver:true, easing:Easing.linear })).start();
  const scanY = scanAnim.interpolate({ inputRange:[0,1], outputRange:[-6, HEIGHT+6] });
  Apply: absolute positioned translucent horizontal line moving top-to-bottom
  Color: accent + '18' (very subtle — this is SUBLIMINAL not obvious)
  Height: 2px

6E. SLIDE-UP PANEL ANIMATION (expanding panels, modals):
  panelAnim: 0→1 using Animated.spring({ tension:240, friction:22 })
  Height: panelAnim.interpolate({ inputRange:[0,1], outputRange:[0, TARGET_HEIGHT] })
  translateY: panelAnim.interpolate({ inputRange:[0,1], outputRange:[32,0] })
  opacity: panelAnim.interpolate({ inputRange:[0,0.25,1], outputRange:[0,0.7,1] })
  Never use spring for height — use timing for height, spring for translateY

6F. SPRING PRESS FEEDBACK (button press):
  pressScale: 0.86 on press-in (65ms timing), spring back to 1.0
  Apply via transform: [{ scale: pressScale }] on the button's Animated.View
  Add haptics.light/medium/heavy matching the button's destructive weight

6G. SLIDING TAB INDICATOR (bottom tab bar):
  slideAnim: Animated.spring to activeIndex * tabWidth
  tension:68, friction:11, useNativeDriver:true (translateX only)
  Indicator: 3px height, borderBottomLeftRadius:4, borderBottomRightRadius:4
  Color: #3B82F6 (electric blue — always this color regardless of theme)
  Glow halo behind indicator: 8px height, opacity:0.35, same color

6H. PROGRESS BAR ANIMATION:
  Always useNativeDriver:false (width animation)
  Use Animated.timing with cubic-bezier easing: cubic-bezier(0.4, 0, 0.2, 1)
  Duration: 1200-1800ms for smooth feel
  Never snap/jump — always animate from 0 or from previous value

6I. FADE + SLIDE ENTRY (screen/card mount):
  On mount: opacity 0→1 (timing 400ms), translateY 15→0 (spring tension:50, friction:8)
  Stagger multiple items: each delayed by 60-80ms
  useNativeDriver: true for both opacity and transform

6J. BLINK ANIMATION (binary status — error, scan, broadcast):
  Animated.loop(Animated.sequence([
    Animated.timing(blink, { toValue:1, duration:200, useNativeDriver:true }),
    Animated.delay(600),
    Animated.timing(blink, { toValue:0, duration:200, useNativeDriver:true }),
    Animated.delay(300),
  ]))
  Use for: error states, scanner active state, NEVER for normal status

6K. HAPTIC FEEDBACK RULES (mandatory on ALL interactions):
  haptics.light()   — tab changes, navigation, chip taps, list item selection
  haptics.medium()  — toggle switches, modal open, QR scan tap, expand panel
  haptics.heavy()   — send message, execute script, connect to PC, delete
  haptics.success() — successful connection, save completed, script success
  haptics.warning() — connection failed, script error, validation fail
  RULE: Every TouchableOpacity and Pressable MUST call a haptic function.
  RULE: haptics are called BEFORE the action, not after.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7 — PER-COMPONENT VISUAL SPECIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7A. HEADER (NexusOriginalHeader in _layout.tsx):
  Background: transparent over a dark page background
  Height: Math.max(insets.top, 10) + 76px
  Bottom border: 1px solid accent+'30'
  Animated bottom line: 2px, accent color, width pulses 55%→98%
  Left accent: logo wrap 48px circle with double rings and pulse animation
  Center: 3D depth text (3 layers — shadow + shadow + main), scan sweep line
  Right: action button 8px MONO text with corner dot accents and top highlight
  Background texture: SVG circuit board lines at 3-8% opacity
  Particle dots: 10-12 animated alpha-pulsing symbols at various header positions
  Corner brackets: 4 corner L-shapes, 18×18px, animated border color

7B. BOTTOM TAB BAR (NexusBottomBar in _layout.tsx):
  Background: #0B0D14
  Border top: 1px solid rgba(59,130,246,0.14)
  Height: 62px + safe area bottom inset
  Tab width: screenWidth / tabCount (equal distribution)
  Sliding indicator: #3B82F6 line, height 3px, spring animated
  Glow halo: same color at 35% opacity, 8px tall, sits behind indicator
  Active icon: full accent color, size:22, slight scale 1.05
  Inactive icon: #6A8090 (blue-gray), size:20, no scale
  Active label: accent color, fontWeight:'800'
  Inactive label: #4A5A6A, fontWeight:'500'
  Press: Animated.spring scale 0.86→1.0 on icon container
  Active glow behind icon: 36×28px rounded rect, accent+'18' fill
  Icon style: custom 3D wire icons with perspective depth layers

7C. FLOATING AI CHAT PILL (NexusAIChatBar in _layout.tsx):
  Collapsed state:
    background: #080F1E
    borderRadius: 32
    borderWidth: 1.5
    borderColor: rgba(0,229,255,0.45)
    paddingHorizontal:22, paddingVertical:14
    iOS shadow: cyan at 0.6 opacity, radius 22
    Android elevation: 28
    Contents: [blue dot] [icon box] [ASK BUTLER AI text] [sparkle]
    Status dot: 10px, cyan color, breathing pulse animation
    Icon box: 30px square, borderRadius:10, teal border, circuit robot SVG icon
    Text: 12px MONO, weight:700, letterSpacing:1.5, color:#C8E8FF
    Sparkle: purple SVG star burst icon
  Expanded panel state:
    background: #07101C
    borderRadius: 16
    borderWidth: 1.5
    borderColor: rgba(59,130,246,0.35)
    Left 10px, Right 10px from screen edge
    Top accent line: 2.5px height, solid teal
    Header: robot icon box (38px) + BUTLER/AI title + status dot + expand + close
    Messages: max 90px visible area, 3 most recent messages
    Action chips: single horizontal ScrollView row, no wrapping
    Input row: TextInput (13px MONO) + send button (42px square, borderRadius:12)

7D. AI CHAT BUBBLES (butler.tsx):
  Butler/AI bubbles:
    background: #07101A
    borderWidth: 1
    borderLeftWidth: 3
    borderLeftColor: accent (teal/purple)
    borderRadius: 18, borderTopLeftRadius: 4  ← the "cut corner" signature
    paddingHorizontal: 18, paddingVertical: 14
    Header row: [icon 11px] [BUTLER AI label] [model chip]
  User bubbles:
    background: #0C1520
    borderWidth: 1.5
    borderRadius: 18, borderBottomRightRadius: 4 ← matching cut corner
    alignSelf: 'flex-end'
  Message text: 14-15px MONO, lineHeight:22, color:#C8D8E8
  Timestamps: 9px MONO, color:accent+'66'

7E. STATUS BADGES (WsStatusBadge, connection chips):
  borderWidth: 1
  borderRadius: 7
  paddingHorizontal: 7, paddingVertical: 4
  borderColor: stateColor + '60'
  backgroundColor: stateColor + '0C'
  Content: [5px pulse dot] [STATE LABEL] in 9px MONO fontWeight:'700'
  State colors: connected=#00FF88, connecting=#FF9900, error=#FF3366, idle=#3A5060

7F. STAT CARDS (V9MiniStat):
  Minimum height: 54px
  Top accent line: 2px tall, full width, color of the stat's semantic color
  Value text: 18px MONO, fontWeight:'900', stat color
  Label text: 7px MONO, fontWeight:'700', letterSpacing:1.2, color:#3A5060
  Border/bg: 1px border + 08 opacity background matching stat color
  iOS shadow: stat color at 0.15 opacity

7G. SECTION DIVIDERS (NexusDivider):
  Full-width row with horizontal lines and center badge
  Line: flex:1, height:1.5, color:accent+'35'
  Corner nodes: 10×10px bordered squares at line ends, 1.5px border
  Center badge: icon + label, borderWidth:1.5, borderRadius:5, accent
  L-corner nodes inside the center badge (top-left and bottom-right)

7H. QUICK ACCESS GRID CARDS (QuickRunGrid):
  Width: (screenWidth - 32 - 8) / 2  ← 2-column grid
  Height: 148px fixed
  Each card has unique accent color (no two adjacent cards same color)
  Icon square: 62px, borderRadius:16, borderWidth:1.5
  iOS icon shadow: card's accent color at 0.5 opacity
  Badge: bottom-right absolute, 7.5px MONO text
  LED dot: bottom-left 7px circle, card's accent color
  Accent blob: 80×80px soft circle at top-right, accent+'12' background
  Corner brackets: top-left stronger (2px), bottom-right lighter (1.5px)

7I. CAROUSEL TOOL CARDS (QuickToolsCarousel):
  Width: 96px fixed, height auto
  borderRadius: 12
  borderWidth: 1, borderColor: toolColor + '40'
  Icon box: 46×46px, borderRadius:12
  Label: 11px MONO fontWeight:'700'
  Subtitle: 8px MONO color:#3A5060
  LED dot: 5px circle top-right, opacity:0.8

7J. POWER BUTTONS (PCPowerSection):
  flex:1, borderWidth:1.5, borderRadius:10
  Confirm state: backgroundColor becomes accent+'25' (more visible)
  Icon: 26px MaterialCommunityIcons, accent color
  Label: 11px MONO fontWeight:'900', letterSpacing:0.8
  Sub: 8px MONO, accent+'80'
  iOS shadow: accent color at 0.20 opacity
  Always show "TAP AGAIN" text when confirming state

7K. INPUT FIELDS:
  backgroundColor: '#1A2030'  ← Layer 5 (deepest)
  borderWidth: 1
  borderColor: NCX_BORDER (#1C1E28)
  borderRadius: 10
  paddingHorizontal: 12-16
  paddingVertical: 10-14
  color: '#C8D8E8'
  fontFamily: MONO
  fontSize: 13-16
  placeholderTextColor: accent + '30'  ← very dim version of the accent
  On focus: borderColor changes to accent + '65'
  Never use: borderWidth:0 or transparent borders

7L. ACTION BUTTONS (primary CTAs):
  Primary filled: backgroundColor: accent, color:#000000, fontWeight:'900'
  Secondary ghost: backgroundColor: accent+'12', borderColor: accent+'50',
    borderWidth:1.5, color: accent
  Danger ghost:   backgroundColor: '#FF3366'+'08', borderColor: '#FF3366'+'50',
    borderWidth:1.5, color: '#FF3366'
  All buttons: borderRadius:9-12, paddingVertical:12-16, gap:8
  Full-width CTA: must be the ONLY primary action per viewport
  Icon inside button: always MaterialIcons, size 16-20, matching text color
  Pressed state: scale 0.86 + haptic (spring back to 1.0)

7M. KNOWLEDGE BASE SPARKLINE CHART:
  Background: NCX_BG with borderLeftColor: #5B9CF6
  Header: pulse dot + KB GROWTH SPARKLINE label + total count pill
  Grid lines: 3 horizontal lines at 25%, 50%, 75% height
  Area bars: opacity 0.25–0.43 (oldest to newest), full width each
  Line segments: 2.5px height rotated Views connecting data points
  Data points: 5-7px circles (last point larger and fully opaque)
  X-axis labels: 7px MONO, color:#3A5060
  Method pills: 4 pills at bottom showing source breakdown

7N. SVG ICONS IN TOOLBAR:
  Custom 3D wire icons built from React Native Views (NOT SVG library for icons)
  Each icon uses perspective depth: inner element offset 1-2px from outer shell
  Active state: full accent color + outer glow ring + top-edge indicator bar
  Inactive state: #6A8090 (blue-gray muted), no glow
  Size: 20-22px bounding box, icon visually 16-18px
  Icon types in toolbar (must have 3D layered look):
    home: hexagon with center diamond + orbit lines
    scripts: terminal window with titlebar dots + code lines
    butler: robot head (rectangular) with antenna + eye dots + mouth curve
    fileshare/tools: gear/satellite with orbit nodes
    knowledge: open book with spine highlight
    support: stacked cards with crown
    settings: gear with circular inner ring
    builder: 2×2 node grid connected by lines
    logs: document lines with LED dot

7O. SCANNER / QR BUTTON (authenticate device block):
  Full-width card: minHeight:72px, overflow:'hidden'
  Background image: require('@/assets/images/authenticate-device-bg.jpg') as absoluteFill
  Overlay: rgba(2,8,20,0.68) dark scrim
  Border: 2px, color: rgba(91,156,246,0.55)
  iOS shadow: #5B9CF6 at 0.9 opacity, radius 24 (STRONG intentional glow)
  Android elevation: 14
  Corner brackets: 4 corners, 18×18px, borderColor:#00E5FF, 2px wide, zIndex:2
  Content: [QR scan icon 24px] [flex text] [chevron in rounded box]
  On press: haptics.medium() then open QR modal

7P. HERO BANNER (butler-ai-hero.jpg when offline):
  Background image: absoluteFill, contentFit:'cover'
  Scrim overlay: rgba(4,8,20,0.72)
  Border: 1.5px, rgba(0,229,255,0.30)
  iOS shadow: #00E5FF, 0.6 opacity, radius 20
  Corner brackets: 4 corners, 20px, 2px wide, borderColor:#00E5FF
  Title: BUTLER 36px bold + AI 36px accent color, letterSpacing:3
  Subtitle: 10px fontWeight:'700', letterSpacing:2, rgba(200,230,255,0.7)
  Badges: PRIVATE·LOCAL (green) + v6.0 (blue), pill shaped

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8 — PAGE-BY-PAGE COLOR DOMAIN ASSIGNMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each page has a DOMAIN COLOR that defines its header accent, main card left-border,
and primary interactive elements. Secondary and tertiary colors create variety.

HOME (nexushome.tsx):
  Primary accent: #5B9CF6 (electric blue) — V9SectionHead, NEON const
  Connected widget: #2FD98B (green) — left border, live badge
  KB sparkline: #5B9CF6 (matches primary)
  AI builder shortcut: #A366F5 (purple) — different from primary for variety
  Quick run grid: each card has its OWN color:
    Python Scripts: #10d9a0 (teal)
    Nexus Bot AI: #BB33FF (violet)
    Live Terminal: #00FF88 (green)
    Tools Hub: #FF9900 (amber)
  Quick tools carousel: each tool unique color (cycle through accent palette)
  PC Power: #EF4444 red left-border, buttons: sleep=#10d9a0, restart=#FF9900, shutdown=#FF3366
  Knowledge chart: #F5A623 amber left-border
  Recent Activity: #2FD98B green left-border
  QR button: #5B9CF6 border, strong glow

BUTLER AI (butler.tsx):
  Primary: #A366F5 (purple) — header accent, typing indicator
  Secondary: #5B9CF6 (blue) — user message border
  AI bubbles: borderLeftColor: #A366F5
  User bubbles: borderColor: #5B9CF6
  Input bar: borderColor: #A366F5+'65' on focus
  Send button: #A366F5 filled when has text
  Model badge: #A366F5 accent
  Status: #2FD98B (connected), #FF3366 (offline)

SCRIPTS (scripts.tsx):
  Primary: #4488FF (blue) — section heads, accent
  AI builder entry: #A366F5 (purple)
  Favorites: #FFD700 (gold)
  Category chips: each category gets a color from the accent palette
  Execute button: #4488FF filled
  Success: #2FD98B
  Error: #EF4444

KNOWLEDGE (knowledge.tsx):
  Primary: #FF8C00 (amber/orange) — KB entries, section heads
  SIGMA-NET: #CC33FF (sigma violet)
  OMEGA LOOP: #00CCDD (cyan)
  QLH: #FFD700 (gold)
  Graph lines: #A366F5 (purple)
  Growth stats: #2FD98B (green)
  Coverage bars: each category unique color

LOGS/PC CHECK (logs.tsx):
  Primary: #2FD98B (green) — PC health good
  CPU: #5B9CF6 (blue)
  RAM: #F5A623 (amber)
  GPU: #A366F5 (purple)
  Disk: #2FD98B (green)
  Network: #00CCDD (cyan)
  Threat heatmap: gradient #FF336620 to #FF3366 (low to high)
  Smart alerts: WARN=#F5A623, INFO=#5B9CF6, SEC=#FF3366, CRIT=#EF4444

SETTINGS (settings.tsx):
  Primary: #00CCDD (cyan) — main section heads, toggle active
  Danger section: #FF3366 (red) — destructive actions
  Export section: #2FD98B (green) — save/export actions
  Privacy section: #5B9CF6 (blue) — compliance badges
  Toggle active: #00CCDD thumb + track
  Toggle inactive: #3A5060 track
  KB export: #FF8C00 amber accent

FILESHARE/TOOLS (fileshare.tsx):
  Primary: #00CCDD (cyan)
  File actions: #5B9CF6 (blue)
  Clipboard: #BB33FF (violet)
  Terminal: #2FD98B (green)

SUPPORT/SKINS (support.tsx):
  Primary: #FF6EB4 (pink)
  Free tier: #5B9CF6 (blue)
  Supporter tier: #2FD98B (green)
  Pro tier: #A366F5 (purple)
  Elite tier: gradient gold to purple
  Preview mode banner: accent of the previewed theme

BUILDER (builder.tsx):
  Primary: #A366F5 (purple)
  Node connections: #5B9CF6 (blue)
  Execute: #2FD98B (green)
  Undo: #FF8C00 (amber)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 9 — SVG CIRCUIT BACKGROUND SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

9A. WHEN TO USE SVG BACKGROUNDS:
  ALWAYS include in: headers, hero cards, QR button, connection modal
  OPTIONALLY include in: large stat cards, knowledge engine card, main CTA buttons
  NEVER include in: lists, scrollable items, small chips, text inputs

9B. SVG BACKGROUND ELEMENTS (at ~3-8% opacity):
  • RadialGradient fill from accent+'20' at center to transparent at edges
  • Horizontal + vertical trace lines (0.8px stroke) creating PCB routing pattern
  • Junction nodes (circles 1.5-2.5px) at trace intersections
  • Hexagon polygon outlines at corners (no fill, 0.7px stroke)
  • Code symbols: </>, { }, py, 0x as SvgText at 8-14% opacity
  • Binary string row at 5% opacity near top or bottom
  • Path-based connector between element groups

9C. CIRCUIT TRACE ROUTING RULES:
  • Traces are L-shaped (90° turns only, like real PCB routing)
  • Left side traces: start from left edge, route right then up/down
  • Right side traces: start from right edge, route left then up/down
  • Traces converge toward center but never cross the title area
  • Bottom traces: short horizontal stubs at 15-20% opacity (less prominent)
  • Trace opacity: 0.25-0.45 for main traces, 0.15-0.25 for secondary

9D. HEADER SVG SPECIFICS:
  Gradient: RadialGradient from 0% (center-top) accent at 10% opacity → transparent
  Bottom glow bar: LinearGradient horizontal, transparent→accent→transparent at 18% opacity
  Primary traces: 6-8 traces, 0.8px stroke
  Nodes: 6-8 circles at junction points
  Corner hexagons: 2 hexagons (6-point polygon) at header corners
  Code symbols: </> at 2% left, { } at 88% right
  Binary row: across top at 5% opacity

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 10 — THEME/SKIN SYSTEM (CosmeticContext)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All visual tokens come from the active theme via CosmeticContext:
  const { T } = useCosmetic();
  T.primary    — main accent color for this theme
  T.secondary  — second accent (success/active color)
  T.tertiary   — third accent (warning/data color)
  T.bg         — root background color
  T.panel      — card/panel background color
  T.textAccent — colored text accent

When building new components, always check CosmeticContext for theme colors.
For components that CANNOT use themes (e.g. the bottom tab bar indicator,
which is always #3B82F6), use hardcoded values and document WHY with a comment.

Default theme (NEXUS CORE — free):
  primary:   #5B9CF6
  secondary: #2FD98B
  tertiary:  #F5A623
  bg:        #060A10
  panel:     #0C0E14

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 11 — COMPONENT RULES (REACT NATIVE SPECIFIC)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Images:
  ✅ ALWAYS: import { Image } from 'expo-image';  <Image source={...} contentFit="cover" transition={200}/>
  ❌ NEVER:  import { Image } from 'react-native';

Pressable/Touch:
  ✅ Use: TouchableOpacity (activeOpacity 0.8-0.88) or Pressable
  ❌ Never: TouchableHighlight, TouchableNativeFeedback

Safe Area:
  ✅ Always: const insets = useSafeAreaInsets(); paddingTop: insets.top
  ❌ Never: hardcode paddingTop: 40 or similar

Lists:
  ✅ FlatList for any list of 5+ items (performance critical on Android)
  ❌ Never: ScrollView + .map() for long lists

ScrollView:
  ✅ showsVerticalScrollIndicator={false} (default for all ScrollViews)
  ✅ keyboardShouldPersistTaps="handled" (on any screen with TextInput)
  ✅ contentContainerStyle={{ paddingBottom: 160 }} (leave room for tab bar + chat bar)
  ✅ nestedScrollEnabled={true} on Android nested ScrollViews

Icons:
  ✅ Only: MaterialIcons and MaterialCommunityIcons from @expo/vector-icons
  ❌ Never: emoji as UI icons, other icon libraries

Animations:
  ✅ useNativeDriver: true for transform/opacity animations
  ✅ useNativeDriver: false for layout (width, height, backgroundColor) animations
  ✅ Always stop/cleanup Animated.loop in useEffect cleanup function
  ❌ Never: CSS animations, SVG animations, Web Animations API

Dimensions:
  ✅ const { width: SW } = Dimensions.get('window');  (at module level)
  ❌ Never: useWindowDimensions() — broken in Expo Web SSR

Platform Shadows:
  ✅ ...Platform.select({
       ios: { shadowColor, shadowOffset:{width:0,height:3}, shadowOpacity:0.10, shadowRadius:10 },
       android: { elevation: 3 }
     })
  ❌ Never use iOS shadow props alone (Android ignores them — add elevation too)

StyleSheet:
  ✅ All static styles in StyleSheet.create({}) at bottom of file
  ✅ Dynamic styles (colors from state, calculated widths) inline only
  ❌ Never: spread operators in StyleSheet.create values

Haptics:
  ✅ Import: import { haptics } from '@/services/haptics';
  ✅ Use: haptics.light() / haptics.medium() / haptics.heavy() / haptics.success()
  ✅ Add haptics to EVERY interactive element (buttons, toggles, chips, row taps)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 12 — WHAT YOU MUST NEVER CHANGE (PROTECTED CODE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROTECTED SERVICES (never modify logic, only UI wrappers around them):
  • services/serverConnection.ts      — pair(), quickPing(), connectManual(), getToken()
  • services/autoConnectEngine.ts     — start(), stop(), onEvent(), notifyConnected()
  • services/widgetStorage.ts         — pin(), remove(), updateCode(), updateHeight()
  • services/haptics.ts               — haptic feedback API
  • services/knowledgeAccumulator.ts  — compressResearch(), addFinding(), saveNow()
  • services/nexusBridge.ts           — all bridge protocol logic
  • services/quantumLinkHarvester.ts  — QLH harvester engine
  • services/knowledgeGrowthEngine.ts — OMEGA-LOOP growth cycle
  • services/kbOrganizerBot.ts        — KB organize cycle
  • services/lanScanner.ts            — LAN auto-scan
  • services/serverCrawler.ts         — SIGMA-NET crawl relay

PROTECTED NAVIGATION PATTERNS:
  • (global).__butlerSwitchTab?.(tabName) — tab switching
  • (global).__nexusHomeOpenQR?.()        — QR modal trigger
  • (global).__butlerClearChat?.()        — chat clear trigger
  • (global).__butlerQuickSend?.(msg)     — quick send to Butler
  • (global).__activeTab                  — current active tab name
  • DO NOT replace these with expo-router router.push() calls

PROTECTED ASYNCSTORAGE KEYS (do not rename or remove):
  • 'commandcube_server_ip'        — server IP
  • 'commandcube_server_port'      — server port
  • 'commandcube_session_token'    — auth token
  • 'commandcube_alien_403'        — alien device lock flag
  • '@botler_auto_saved_research'  — KB research data (large JSON)
  • '@butler_pinned_widgets_v2'    — pinned widget data
  • 'boter_exec_counts_v1'         — execution counters
  • '@botler_exec_history'         — execution history

PROTECTED LAYOUT STRUCTURE in app/(tabs)/_layout.tsx:
  • PanResponder swipe navigation (horizontal swipe between tabs)
  • NexusOriginalHeader — the top header with logo, title, subtitle, action button
  • NexusBottomBar — the bottom tab navigator with 3D wire icons
  • NexusAIChatBar — the floating AI chat bar (positioned above tab bar)
  • Hidden <Tabs> block — required by Expo Router, must keep all Tabs.Screen entries
  • DO NOT convert this to a standard Expo Router tab implementation
  • DO NOT remove the try/catch wrapping around page imports

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 13 — WHAT YOU CAN FREELY EDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VISUAL CHANGES (safe to edit):
  ✅ Any color, border, background, glow/shadow values
  ✅ Font sizes, weights, letter-spacing, line-height
  ✅ Padding, margin, gap, borderRadius values
  ✅ Card layout order within a page (reorder sections)
  ✅ Icon names (MaterialIcons / MaterialCommunityIcons only)
  ✅ All label text, titles, subtitles, button labels, placeholder text
  ✅ Animation durations and easing (keep useNativeDriver correct)
  ✅ Adding new UI cards, sections, or informational content
  ✅ Adding new toggle settings (add to STORAGE_KEYS, Settings interface, ToggleRow)
  ✅ Tab bar label text and colors in app/(tabs)/_layout.tsx TAB_DEF object
  ✅ Header titles/subtitles → edit constants/HeaderConstants.ts TAB_HEADER_ENTRIES

HEADER CONFIG (zero-credit edit):
  The file constants/HeaderConstants.ts controls ALL page headers.
  Edit TAB_HEADER_ENTRIES to change any header title, subtitle, action button label/icon, or accent color.
  Example: { title:'MY TITLE', subtitle:'My subtitle', actionLabel:'GO', actionIcon:'arrow-forward', accentColor:'#00FF88' }

WIDGET TEMPLATES in components/ui/LiveWidgetStudio.tsx:
  ✅ Add/edit widget code templates
  ✅ Change template names, descriptions, categories
  ✅ Add new template categories

ADDING A NEW SETTINGS CARD (in settings.tsx):
  1. Define a new function component (e.g. function MyNewCard() { ... })
  2. Add its StyleSheet entries to the bottom g = StyleSheet.create({}) block
  3. Place <MyNewCard /> in the SettingsScreen ScrollView at desired position
  4. Return the complete settings.tsx

ADDING A NEW HOME PAGE SECTION (in nexushome.tsx):
  1. Define the component function above NexusHomeScreen
  2. Use NCX_BG/#0d0e14 background, NCX_BORDER/#1c1e28 borders, 2px left accent
  3. Add it to the ScrollView in NexusHomeScreen below the existing sections
  4. Wrap in <View style={s.section}> with marginTop:14
  5. Return the complete nexushome.tsx

DO NOT ADD:
  • Any new navigation screens without adding a Tabs.Screen entry
  • Any new AsyncStorage keys that clash with protected keys list above
  • Any global.__xyz signals without cleaning up in useEffect return

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 14 — COMMON MISTAKES TO AVOID
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. APOSTROPHES IN STRINGS:
   ❌ setState("User can't do this")   ← will crash
   ✅ setState("User cannot do this")  ← safe
   ✅ setState("User can" + "'" + "t") ← safe
   ✅ setState(\`User can't do this\`)   ← template literal safe

2. CONDITIONAL RENDERING — use ternary, not &&:
   ❌ {count && <Text>{count}</Text>}   ← renders "0" as text
   ✅ {count > 0 ? <Text>{count}</Text> : null}

3. ANIMATED VALUES — cleanup in useEffect:
   ❌ const a = useRef(new Animated.Value(0)).current; (outside useEffect — OK)
   ❌ Forget to call a.stop() in useEffect return cleanup
   ✅ const loop = Animated.loop(...); loop.start(); return () => loop.stop();

4. ASYNCSTORAGE — always catch errors:
   ✅ await AsyncStorage.getItem(key).catch(() => null)
   ✅ await AsyncStorage.setItem(key, val).catch(() => {})

5. FETCH — always AbortController timeout:
   ✅ const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });

6. FLATLIST — always provide keyExtractor:
   ✅ keyExtractor={(item, index) => item.id || String(index)}

7. PLATFORM SHADOWS — both iOS and Android:
   ✅ ...Platform.select({ ios: { shadowColor, ... }, android: { elevation: 4 } })

8. SAFE AREA — always use insets:
   ✅ const insets = useSafeAreaInsets();
      <View style={{ paddingTop: Math.max(insets.top, 10) }}>

9. EXPO ROUTER HIDDEN TABS — do not add unnamed screens:
   ✅ Keep all <Tabs.Screen name="..." /> entries in the hidden <Tabs> block
   ✅ Any new tab page file in app/(tabs)/ MUST have a Tabs.Screen entry

10. GLOBAL STATE BRIDGE — use these patterns:
    ✅ (global as any).__someSignal?.()           ← call from any component
    ✅ (global as any).__someSignal = () => {...} ← register in useEffect
    ✅ return () => { delete (global as any).__someSignal; } ← cleanup

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 15 — FILE STRUCTURE AND NAMING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app/(tabs)/         ← All tab screens (nexushome, scripts, butler, knowledge, etc.)
app/_layout.tsx     ← Root stack layout (CosmeticProvider, TabBarProvider wrap)
app/(tabs)/_layout.tsx ← Custom tab layout (ALL navigation logic lives here)
components/ui/      ← Shared UI components (WidgetLayer, LiveWidgetStudio, AppHeader, etc.)
services/           ← Data/logic services (serverConnection, widgetStorage, haptics, etc.)
constants/          ← Config + design tokens (HeaderConstants, theme, appSourceBundle)
contexts/           ← React context (CosmeticContext for themes, TabBarContext for omega log)
hooks/              ← Custom hooks (useServerConnection, useChatHistory, etc.)

NAMING RULES:
  • Components: PascalCase (NexusStatCard, ToggleRow)
  • Functions/variables: camelCase (handleSave, isConnected)
  • Constants: UPPER_SNAKE_CASE (BUNDLE_MANIFEST, STORAGE_KEYS)
  • Files: lowercase kebab or camelCase (nexushome.tsx, widgetStorage.ts)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 16 — HOW TO APPLY YOUR CHANGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP-BY-STEP FOR THE AI RECEIVING THIS PROMPT:
1. Read the full JSON export attached to this message.
2. Find the file(s) the user wants to change — they are type:"source" entries.
3. Apply the requested changes to the source content.
4. Return the COMPLETE updated file wrapped in a typescript code block:
   (start with: // File: app/(tabs)/nexushome.tsx)
   [full file content here]
   (end code block)
5. If multiple files changed, return each one as a separate code block.
6. Do NOT provide explanations about how to paste or upload — the build tool
   handles that automatically. Just return the code.

RESTORE ORDER (if restoring from scratch):
  1. constants/HeaderConstants.ts    (header config)
  2. constants/theme.ts             (design tokens)
  3. services/widgetStorage.ts      (widget persistence)
  4. services/serverConnection.ts   (network core)
  5. app/(tabs)/_layout.tsx         (tab navigation — FULL SOURCE in JSON)
  6. app/_layout.tsx                (root providers)
  7. Each tab page (nexushome, scripts, butler, knowledge, builder, etc.)
  8. components/ui/WidgetLayer.tsx  (widget system)
  9. components/ui/LiveWidgetStudio.tsx

IF A FILE IS type:"manifest" (no embedded source):
  - Use the component metadata in this guide to reconstruct it.
  - Do not ask the user to provide the source — generate it from the guide.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 17 — APP VERSION AND IDENTITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

App Name:      Butler AI: PC Automation
Play Store ID: com.butlerai.pc.automation
Version:       6.0.0
Expo SDK:      53
RN Version:    0.79.3
Min Android:   API 26 (Android 8.0)
Target:        API 35 (Android 15)
JS Engine:     Hermes
Primary:       Android (iOS secondary)
AI Backend:    Ollama (local, on user's PC) — model qwen2.5-coder:7b
PC Bridge:     butler_server.py (Python Flask server, user runs on their own PC)
LAN Protocol:  HTTP REST + HMAC-SHA256 auth token + optional WebSocket

EXPORT CHANGE DETECTION:
  The app tracks a hash of all embedded sources. When the hash stored from the
  last export does not match the current hash, a green dot appears on the
  SAVE JSON button indicating the app has changed and a fresh export is needed.
  AsyncStorage key used: '@butler_export_hash_v1'

FILES WITH FULL SOURCE IN THIS EXPORT (type:"source"):
  • constants/HeaderConstants.ts     — all header titles, subtitles, colors
  • services/widgetStorage.ts        — widget CRUD
  • app/(tabs)/nexushome.tsx         — home screen
  • app/(tabs)/builder.tsx           — script builder
  • app/(tabs)/knowledge.tsx         — knowledge base
  • app/(tabs)/settings.tsx          — settings screen
  • app/(tabs)/_layout.tsx           — TAB NAVIGATION (1290 lines — FULL SOURCE)

  For any file listed above: read the "content" field in the JSON and edit it.
  For all other files: use the component guide in this document to reconstruct.
`;

// ─── Source file registry ──────────────────────────────────────────────────────
// Sources stored via lazy-getter functions to avoid JS module size limits.
// Each getter is only invoked when the export is actually triggered.

const _sourceFns: Record<string, () => string> = {};

// ─── Built-in constant sources ────────────────────────────────────────────────

function getHeaderConstantsSrc(): string {
  return [
    "/**",
    " * BUTLER AI — ZERO-CREDIT HEADER CONSTANTS",
    " * Edit text labels, subtitles, button labels, and accent colors here.",
    " * All values consumed by NexusOriginalHeader in app/(tabs)/_layout.tsx",
    " */",
    "",
    "export interface TabHeaderEntry {",
    "  title: string;",
    "  subtitle: string;",
    "  actionLabel: string;",
    "  actionIcon: string;",
    "  accentColor: string;",
    "}",
    "",
    "export const TAB_HEADER_ENTRIES: Record<string, TabHeaderEntry> = {",
    "  home:      { title:'NEXUS HOME',      subtitle:'PC Automation · Command Center',       actionLabel:'QR SCAN',  actionIcon:'qr-code-scanner', accentColor:'#00CCDD' },",
    "  butler:    { title:'BUTLER AI',       subtitle:'Local Ollama · Private · Zero Cloud',  actionLabel:'CLEAR',    actionIcon:'delete-sweep',    accentColor:'#BB33FF' },",
    "  scripts:   { title:'SCRIPT LIBRARY',  subtitle:'Python Automation · 70+ Scripts',      actionLabel:'REFRESH',  actionIcon:'refresh',         accentColor:'#4488FF' },",
    "  knowledge: { title:'KNOWLEDGE BASE',  subtitle:'SIGMA-NET · Live Crawler · KB Graph',  actionLabel:'SYNC',     actionIcon:'sync',            accentColor:'#FF8C00' },",
    "  fileshare: { title:'TOOLS HUB',       subtitle:'File Share · Clipboard · Terminal',    actionLabel:'REFRESH',  actionIcon:'refresh',         accentColor:'#00CCDD' },",
    "  logs:      { title:'PC CHECK',        subtitle:'Health · Cleaning · Automation',       actionLabel:'REFRESH',  actionIcon:'refresh',         accentColor:'#00FF88' },",
    "  support:   { title:'COSMETIC PACKS',  subtitle:'Themes · Skins · Customization',       actionLabel:'BROWSE',   actionIcon:'palette',         accentColor:'#FF6EB4' },",
    "  settings:  { title:'SYSTEM CONFIG',   subtitle:'App Settings · Preferences',           actionLabel:'SAVE',     actionIcon:'settings',        accentColor:'#CC7755' },",
    "  terminal:  { title:'LIVE TERMINAL',   subtitle:'nexus@terminal:~$',                    actionLabel:'CLEAR',    actionIcon:'delete-sweep',    accentColor:'#44FF22' },",
    "  builder:   { title:'SCRIPT BUILDER',  subtitle:'Visual Node Pipeline · Drag & Build',  actionLabel:'CLEAR',    actionIcon:'delete-sweep',    accentColor:'#BB33FF' },",
    "};",
    "",
    "export const CONN_COLORS = {",
    "  connected:    '#00FF88',",
    "  disconnected: '#FF3366',",
    "};",
    "",
    "export const SPLASH_CONFIG = {",
    "  titleLine1:  'BUTLER',",
    "  titleLine2:  'AI',",
    "  tagline:     'PC AUTOMATION · COMMAND CENTER',",
    "  bootText:    'INITIALIZING SYSTEMS...',",
    "  versionBadge:'v6.0 · ANDROID · LOCAL AI',",
    "  accentColor: '#1A5FCC',",
    "};",
  ].join('\n');
}

function getWidgetStorageSrc(): string {
  return [
    "/**",
    " * Widget Storage Service v2 — AsyncStorage CRUD for pinned widgets",
    " */",
    "import AsyncStorage from '@react-native-async-storage/async-storage';",
    "",
    "const STORAGE_KEY = '@butler_pinned_widgets_v2';",
    "",
    "export type WidgetPlacement = 'floating' | 'inline-top' | 'inline-middle' | 'inline-bottom';",
    "",
    "export interface PinnedWidget {",
    "  id: string;",
    "  pageId: string;",
    "  label: string;",
    "  code: string;",
    "  placement: WidgetPlacement;",
    "  x: number;",
    "  y: number;",
    "  height?: number;",
    "  createdAt: string;",
    "}",
    "",
    "async function loadAll(): Promise<PinnedWidget[]> {",
    "  try {",
    "    const raw = await AsyncStorage.getItem(STORAGE_KEY);",
    "    if (raw) return JSON.parse(raw) as PinnedWidget[];",
    "    return [];",
    "  } catch { return []; }",
    "}",
    "",
    "async function saveAll(widgets: PinnedWidget[]): Promise<void> {",
    "  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));",
    "}",
    "",
    "export const widgetStorage = {",
    "  async getForPage(pageId: string): Promise<PinnedWidget[]> {",
    "    const all = await loadAll();",
    "    return all.filter(w => w.pageId === pageId);",
    "  },",
    "  async pin(widget: Omit<PinnedWidget, 'id' | 'createdAt'>): Promise<PinnedWidget> {",
    "    const all = await loadAll();",
    "    const nw: PinnedWidget = { ...widget, id: 'widget_' + Date.now(), createdAt: new Date().toISOString() };",
    "    await saveAll([...all, nw]);",
    "    return nw;",
    "  },",
    "  async updateCode(id: string, code: string, label?: string): Promise<void> {",
    "    const all = await loadAll();",
    "    await saveAll(all.map(w => w.id === id ? { ...w, code, ...(label ? { label } : {}) } : w));",
    "  },",
    "  async updateHeight(id: string, height: number): Promise<void> {",
    "    const all = await loadAll();",
    "    await saveAll(all.map(w => w.id === id",
    "      ? { ...w, height: height > 0 ? Math.max(60, Math.round(height)) : undefined }",
    "      : w));",
    "  },",
    "  async remove(id: string): Promise<void> {",
    "    const all = await loadAll();",
    "    await saveAll(all.filter(w => w.id !== id));",
    "  },",
    "  async getAll(): Promise<PinnedWidget[]> { return loadAll(); },",
    "  async clearAll(): Promise<void> { await AsyncStorage.removeItem(STORAGE_KEY); },",
    "};",
  ].join('\n');
}

// Register built-in sources
_sourceFns['constants/HeaderConstants.ts'] = getHeaderConstantsSrc;
_sourceFns['services/widgetStorage.ts']    = getWidgetStorageSrc;

// ─── Public API ────────────────────────────────────────────────────────────────

/** Register a tab/component source at runtime (called from tabSourcesBundle.ts) */
export function registerTabSource(path: string, source: string): void {
  _sourceFns[path] = () => source;
}

/** Get all registered sources as a plain object (safe for JSON.stringify) */
export function getBundleSources(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, fn] of Object.entries(_sourceFns)) {
    try { out[path] = fn(); } catch (e) { out[path] = '[source load error: ' + String(e) + ']'; }
  }
  return out;
}

/** Legacy compat: BUNDLE_SOURCES[path] dot/bracket access for existing settings.tsx */
export const BUNDLE_SOURCES: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  {
    get(_t, prop: string) {
      const fn = _sourceFns[prop];
      if (fn) { try { return fn(); } catch { return '[error]'; } }
      return undefined;
    },
    has(_t, prop: string) { return prop in _sourceFns; },
    ownKeys() { return Object.keys(_sourceFns); },
    getOwnPropertyDescriptor(_t, prop: string) {
      if (prop in _sourceFns) {
        let v: string;
        try { v = _sourceFns[prop](); } catch { v = '[error]'; }
        return { configurable: true, enumerable: true, writable: false, value: v };
      }
      return undefined;
    },
  }
);

// ─── Build JSON export (bulletproof) ──────────────────────────────────────────
/**
 * Returns a plain JS object safe for JSON.stringify — NO manual string escaping needed.
 * Use this in handleSaveJson(). The resulting JSON will contain:
 *   _meta:         app info, palette, restore prompt, AI builder guide
 *   [file paths]:  { type:'source'|'manifest', content/description, lines }
 *
 * GUARD: All content is stored as JS strings; JSON.stringify handles
 *        backslashes, quotes, newlines, and all special chars automatically.
 */
export function buildExportJson(): Record<string, unknown> {
  const sources = getBundleSources();

  const obj: Record<string, unknown> = {
    _meta: {
      exportedAt:       new Date().toISOString(),
      appName:          'Butler AI — PC Automation',
      version:          'v6.0',
      packageId:        'com.butlerai.pc.automation',
      totalFiles:       BUNDLE_MANIFEST.length,
      embeddedFiles:    Object.keys(sources).length,
      stack:            'React Native 0.79.3 / Expo SDK 53 / Expo Router v5 / TypeScript / Hermes',
      targetPlatform:   'Android API 35 (min API 26 / Android 8.0)',
      aiEngine:         'Ollama local (qwen2.5-coder:7b) — no cloud',
      builtIn:          'OnSpace.ai App Builder',
      palette:          APP_PALETTE,
      aiBuilderGuide:   DETAILED_AI_PROMPT,
      restorePrompt:    [
        'You are an AI assistant inside OnSpace.ai (https://onspace.ai).',
        'Stack: React Native + Expo SDK 53 + TypeScript + Expo Router v5.',
        'This export is from Butler AI: PC Automation (com.butlerai.pc.automation).',
        'Read the full aiBuilderGuide in this JSON _meta before making ANY changes.',
        'Always return COMPLETE file content — OnSpace.ai replaces entire files.',
        'Never return partial diffs. Preserve all imports.',
        'Protected: serverConnection, autoConnectEngine, widgetStorage, all services/ network code.',
        'To restore: use content from type:"source" files. For type:"manifest" files, use metadata + guide.',
      ].join(' '),
    },
  };

  // Embedded source files (full content)
  for (const [filePath, source] of Object.entries(sources)) {
    obj[filePath] = {
      type:    'source',
      content: source,
      lines:   source.split('\n').length,
      chars:   source.length,
    };
  }

  // Manifest-only entries (metadata + restore hints)
  for (const f of BUNDLE_MANIFEST) {
    if (!obj[f.path]) {
      obj[f.path] = {
        type:        'manifest',
        description: f.description,
        category:    f.category,
        lines:       f.lines,
        restoreHint: 'Ask OnSpace.ai to regenerate this file based on the aiBuilderGuide in _meta.',
      };
    }
  }

  return obj;
}

// ─── Build clipboard text export ──────────────────────────────────────────────
/**
 * Returns a human-readable combined text export for clipboard / COPY ALL FILES.
 * Includes the full AI builder guide + all embedded sources + manifest.
 */
export function buildAllFilesExport(): string {
  const sources = getBundleSources();
  const now = new Date().toLocaleString();
  const lines: string[] = [
    '// ╔══════════════════════════════════════════════════════════════════════════╗',
    '// ║  BUTLER AI — FULL APP SOURCE EXPORT v4.0                               ║',
    `// ║  Generated: ${now.padEnd(57)}║`,
    '// ║  Stack: React Native · Expo Router v5 · TypeScript · Expo SDK 53       ║',
    '// ║  Platform: Android API 35 · Hermes JS Engine                           ║',
    '// ╚══════════════════════════════════════════════════════════════════════════╝',
    '',
    `// App: Butler AI: PC Automation — com.butlerai.pc.automation — v6.0`,
    `// Total files in project: ${BUNDLE_MANIFEST.length}`,
    `// Files with embedded source: ${Object.keys(sources).length}`,
    `// Built in: OnSpace.ai (https://onspace.ai)`,
    '',
    '// ═══════════════════════════════════════════════════════════════════════════',
    '// AI BUILDER GUIDE — READ THIS FIRST BEFORE MAKING ANY CHANGES',
    '// ═══════════════════════════════════════════════════════════════════════════',
  ];

  // Embed the full AI prompt, line by line
  for (const promptLine of DETAILED_AI_PROMPT.split('\n')) {
    lines.push('// ' + promptLine);
  }

  lines.push('');
  lines.push('// ─── FILE MANIFEST ─────────────────────────────────────────────────────────');
  for (let i = 0; i < BUNDLE_MANIFEST.length; i++) {
    const f = BUNDLE_MANIFEST[i];
    const hasSrc = Boolean(sources[f.path]);
    lines.push(
      `// ${String(i + 1).padStart(2, '0')}. [${hasSrc ? '●SRC' : '○   '}] [${f.category.toUpperCase().padEnd(9)}] ${f.path.padEnd(45)} ~${f.lines}L`
    );
  }
  lines.push('// Legend: ● = full source embedded below   ○ = manifest only');
  lines.push('');
  lines.push('// ─── COLOR PALETTE ─────────────────────────────────────────────────────────');
  for (const [key, val] of Object.entries(APP_PALETTE)) {
    lines.push(`// ${key.padEnd(14)}: ${val}`);
  }
  lines.push('');
  lines.push('// ─── RESTORE PROMPT FOR ONSPACE.AI ─────────────────────────────────────────');
  lines.push('// Paste into OnSpace.ai chat + attach the JSON export:');
  lines.push('// "Please update or restore my Butler AI app using this export.');
  lines.push('//  Read the full aiBuilderGuide in the _meta section first.');
  lines.push('//  Return COMPLETE file content for each changed file."');
  lines.push('');

  // Embed full sources
  for (const [path, source] of Object.entries(sources)) {
    lines.push(`// ${'═'.repeat(72)}`);
    lines.push(`// EMBEDDED SOURCE: ${path}`);
    lines.push(`// Lines: ${source.split('\n').length} · Chars: ${source.length}`);
    lines.push(`// ${'─'.repeat(72)}`);
    lines.push('');
    for (const srcLine of source.split('\n')) {
      lines.push('// ' + srcLine);
    }
    lines.push('');
  }

  lines.push('// ─── END OF BUTLER AI EXPORT ────────────────────────────────────────────────');
  lines.push(`// Exported: ${now}`);
  return lines.join('\n');
}
