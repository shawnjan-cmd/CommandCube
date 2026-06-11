# Butler AI — PRD / Memory

## Original Problem Statement
Expo mobile app (React Native + expo-router) for connecting to a private self-hosted
Python PC server via QR code: launch scripts, chat with local Ollama AI, send
clipboard/text/files to the PC. Local-first, zero cloud, HMAC-SHA256 signed.
Goal: Play Store-ready, futuristic robot-script-themed UI.

## Architecture
- frontend: Expo (tabs router) — 8 visible tabs: HOME, SCRIPTS, AI, KB, PC, BUILD, SKINS, CONFIG
  (hidden routes: terminal, fileshare, support, index)
- backend: FastAPI + MongoDB (preview infra only; real runtime is the user's LAN python server)
- Onboarding = Modal overlay in app/_layout.tsx driven by AsyncStorage flag
  '@butler_onboarding_done_v2' — NEVER use router navigation for onboarding.
- Tab switching from anywhere: (global).__butlerSwitchTab(alias) — defined in
  components/ui/FuturisticTabBar.tsx (aliases: home→nexushome, ai→butler, kb→knowledge,
  pc→logs, build→builder, config→settings, tools→fileshare …)
- IMPORTANT (dev env): expo runs with CI=true → Metro file-watching is OFF.
  After editing frontend files run: sudo supervisorctl restart expo (wait ~20s).

## Implemented (Feb 11, 2026 — session: Homepage Overhaul v2 + App-Wide Theme Unification)
### Phase 2 (theme unification, tested iteration_3.json ALL PASS)
- Removed hero version pill; Quick Access pinned directly below the BUTLER AI hero
  (renderer pins hero+quick_access above config-driven cards in nexushome.tsx).
- MASS palette unification (~180 hex replacements, 24+ files): roots → #000003,
  panels → #02070D (Security-Protocols tone), raised → #071120. Applied to all tab pages,
  shared components, PageBackgrounds bases, uiConfig color defaults.
- Hero is a SPG-style panel: bg #02070D + tri-color top accent strip (cyan/green/purple).
- Tab bar rethemed like the AI chat frame: steel #5E7186 + neon #3EC8FF double top edge,
  center plateau notch, hazard dashes, labels 10.5px.
- New robot-themed tab icons: view-dashboard-variant / code-braces-box / robot-happy /
  head-cog-outline / desktop-tower-monitor / hammer-screwdriver / palette-swatch-outline / cog-box.
- Security grid icons → MCI (shield-key, eye-off-outline, robot-angry-outline,
  cloud-off-outline, server-security, account-cancel-outline).
- QuickButlerBar more compact (52px, badge r15); fonts bumped app-wide on home
  (titles 12.5+, stats 20, quick-access labels 13.5, SPG labels 11).
- Fixed stray syntax fragment at EOF of nexushome.tsx (was breaking tsc/eslint).

### Phase 1 (homepage overhaul)
- Pure-black homepage (#000) + HomeBackdrop (circuit grid, scanlines, drifting scan beam,
  ambient orbs) so user-uploaded black-background images blend seamlessly.
- Hero logo: replaced holographic core + text with user-supplied BUTLER AI SVG
  (assets/images/butler-logo.svg → components/ui/butlerLogoXml.ts, bg rect stripped,
  rendered HD via SvgXml in components/ui/ButlerWordmark.tsx). Hero compacted (~35% shorter).
- QuickButlerBar rebuilt: vector recreation of user's neon speech-bubble artwork
  (components/ui/NeonChatFrame.tsx — angular cyan frame, raised top plateau, hazard dashes,
  circuit traces, speech tail, chrome robot-head badge). Compact 64px, breathing halo.
  Send → writes '@butler_prefill_prompt' → navigates to butler tab which CONSUMES+DELETES key.
- NexusCard chrome upgraded: 3D bevels (top light-catch / bottom shade), sheen, segmented
  accent top bar, footer notch, HUD corners — upgrades ALL home cards automatically.
- Compaction pass: ConnectedPC rings 76→64, Security grid cells 76→52 badges,
  QuickSend tiles 78→58, content gap 14→10, hero stats 22→18.
- FIXED: __butlerSwitchTab was called app-wide but never defined → Quick Access tiles
  (and settings/logs/butler shortcuts) now actually navigate. testIDs: quick-access-{tab}.
- FIXED: uiConfig default card ids kb_graph / sigma_net / security_grid / kb_articles /
  omega_loop never matched the renderer switch → aliases + OmegaLearningLoop case added.
- Quick Send (clipboard/text/file → PC via /api/clipboard, /api/upload with HMAC) intact,
  shows friendly toast when unpaired.

## Earlier sessions (still true)
- Startup race + onboarding doom-loop fixed (Modal overlay + 5-channel safety net).
- Butler/Terminal tab crashes fixed; Terminal tab removed from nav (do NOT re-add).
- Skins tab + CosmeticContext theming; Play Store readiness pass done (perms, target SDK 35).
- Animated uploads (GIF/WebP) supported via expo-image.

## Testing Status
- iteration_3.json (Feb 11, 2026): ALL PASS — 8/8 tabs no-crash after palette change,
  quick access order + navigation, quickbar send, icons render, 0 console errors.
- iteration_2.json: ALL PASS — home render, navigations, QR modal, quick send toasts,
  onboarding regression.

## Backlog (P1→P3)
- P1: Extend new card chrome/theme to PC, KB, Scripts tab screens (visual parity with home).
- P1: Refactor nexushome.tsx (~1750 lines) into components/home/* sections.
- P2: BUILD-tab wizard logic and UI.
- P2: Butler chat bubbles using chat-bubble frame styling (NeonChatFrame reusable).
- P3: PC tab hero asset (butler-robot-logs.jpg).

## Credentials
No auth in app (local-first, no accounts). /app/memory/test_credentials.md n/a.
For web preview testing: seed localStorage '@butler_onboarding_done_v2'='1' (+ 6 consent
flags) to skip onboarding modal.
