# Butler AI — PRD / Memory

## Original Problem Statement
Expo mobile app (React Native + expo-router) for connecting to a private self-hosted
Python PC server via QR code: launch scripts, chat with local Ollama AI, send
clipboard/text/files to the PC. Local-first, zero cloud, HMAC-SHA256 signed.
Goal: Play Store-ready. THEME (Feb 12, 2026 directive): entire app is
"TERMINATOR TERMINAL PROFESSIONAL" — endo-red #FF2A1F primary, plasma orange
#FF6A1F secondary, hazard amber #FFC400 tertiary, gunmetal blacks
(#050505 root / #0E0F12 panel / #1A1D24 raised), green #00FF88 ONLY for OK/status,
neutral steel text (#E6E9EF bright / #8C95A6 mid / #6A7384 dim), monospace labels.

## Architecture
- frontend: Expo (tabs router) — 8 visible tabs: HOME, SCRIPTS, AI, KB, PC, BUILD, SKINS, CONFIG
  (hidden routes: terminal, fileshare, support, index)
- backend: FastAPI + MongoDB (preview infra only; real runtime is the user's LAN python server)
- Onboarding = Modal overlay in app/_layout.tsx driven by AsyncStorage flag
  '@butler_onboarding_done_v2' — NEVER use router navigation for onboarding.
- Tab switching from anywhere: (global).__butlerSwitchTab(alias) — defined in
  components/ui/FuturisticTabBar.tsx (aliases: home→nexushome, ai→butler, kb→knowledge,
  pc→logs, build→builder, config→settings, tools→fileshare …)
- Default cosmetic skin: id 'nexus' renamed "ENDO CORE" (Terminator red) in
  contexts/CosmeticContext.tsx. Other purchasable skins keep their own palettes.
- IMPORTANT (dev env): expo runs with CI=true → Metro file-watching is OFF.
  After editing frontend files run: sudo supervisorctl restart expo (wait ~25s).

## Implemented (Feb 12, 2026 — session: Settings import removal + Terminator Terminal overhaul)
### Tested iteration_6.json — ALL PASS
- SETTINGS: removed ALL import functionality (~1300 lines: PowerhouseCard
  "ONE JSON POWERHOUSE" card, import-diff modal, handleImportJson, UIConfigCard
  import button, ImportSuccessToast, checkImportVersion; services/powerhouseImport.ts
  DELETED). Export kept intact: EXPORT ALL FILES (copy/preview/share/save json),
  UI VISUAL CONFIG (download + quick card toggles + RESET TO DEFAULTS).
  settings.tsx 4078 → ~2760 lines.
- MASS PALETTE MIGRATION (~95 files across app/components/services/hooks/constants):
  all cyans/blues/purples/pinks → Terminator red/plasma/amber; navy backgrounds →
  gunmetal; blue-tinted steel text → neutral, brightened for readability.
  Excluded: MechBay.tsx (already red), butlerLogoXml.ts, CosmeticContext non-default
  skins, appSourceBundle/tabSourcesBundle/butlerKnowledge constants.
- TAB BAR rebuilt (FuturisticTabBar.tsx): terminal command dock — gunmetal slab,
  steel border, 2px red signal line, sliding red "target lock" frame, ALL 8 labels
  always visible (8px mono), haptics + springs kept, removed BlurView/LinearGradient deps.
- QUICKBAR rebuilt (QuickButlerBar.tsx): terminal prompt — squared gunmetal slab,
  red left signal edge, '>' prompt glyph + blinking block cursor, "ASK BUTLER"
  mono placeholder, square red send button. Prefill handoff to AI tab verified e2e.
- AI CHAT (butler.tsx): terminal message blocks — 'BUTLER >' / 'USER >' role tags,
  squared radii (8px, side accent rails), red-tinted code blocks, composer
  placeholder "> Enter command for Butler AI…", typing indicator
  "BUTLER > processing...". Fixed stray syntax fragment at EOF (was breaking tsc).
- kbGrowthTracker web console warning now one-shot gated.
- Pre-existing TS type errors reduced 151 → 120 (all pre-existing, Metro bundles fine).

## Earlier sessions (still true)
- MECH BAY OS homepage (components/home/MechBay.tsx — MECH palette source of truth).
- EAS build pipeline bulletproofed (35 libs removed, 44MB assets removed, eas.json
  7 profiles, .easignore, plugins/with-lan-network-security.js for Android cleartext LAN).
- Backend K8s liveness endpoints GET / and GET /health return 200.
- Startup race + onboarding doom-loop fixed (Modal overlay + safety net).
- Terminal tab removed from nav (do NOT re-add). Play Store readiness pass done.
- Quick Send (clipboard/text/file → PC via /api/clipboard, /api/upload with HMAC) intact.
- Hero is BUTLER AI MECH BAY command deck; QuickButlerBar send writes
  '@butler_prefill_prompt' → butler tab consumes+deletes key.

## Testing Status
- iteration_6.json (Feb 12, 2026): ALL PASS — 8/8 tabs render Terminator theme,
  tab navigation + sliding indicator, quickbar e2e prefill handoff, settings has
  ZERO import UI, export cards intact, 0 console errors.
- iteration_2..5: earlier passes (tabs, palette, quick access, onboarding, EAS prep).

## Known LOW issues (carry-over, not blocking)
- LOCAL AI BEHAVIORAL NOTICE modal on /butler overlays bottom tab bar until
  dismissed via "ENTER BUTLER AI" (could lower z-index or auto-dismiss on tab switch).
- RN 0.81+ deprecation warnings (shadow*/textShadow*/resizeMode/pointerEvents) — cosmetic.

## Backlog (P1→P3)
- P1: USER VERIFICATION — push to GitHub ("Save to GitHub") then re-run EAS build /
  deployment to confirm cloud build passes (K8s probe fix + theme changes).
- P1: Refactor giant files: scripts.tsx 3645, knowledge.tsx 3403, settings.tsx 2760,
  nexushome.tsx 1616 → split into components/.
- P2: BUILD-tab wizard logic and UI.
- P2: Lower AI disclosure modal below tab bar or auto-dismiss on tab switch.
- P2: Re-enable ProGuard in app.json after first successful production build (~35% smaller AAB).

## Credentials
No auth in app (local-first, no accounts). /app/memory/test_credentials.md n/a.
