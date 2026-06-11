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

## Implemented (Feb 11, 2026 — this session: Homepage Overhaul v2)
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
- iteration_2.json (Feb 11, 2026): ALL PASS — home render, 4 Quick Access navigations,
  8 tabs no-crash, QR modal, QuickSend unpaired toasts, quickbar send→butler,
  onboarding regression. "Prefill null" finding = by-design consumption, manually verified.

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
