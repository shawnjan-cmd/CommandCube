# Butler AI (CommandCube) — Play Store Readiness Pass

**Source repo:** https://github.com/shawnjan-cmd/CommandCube
**Scope:** Critical + High fixes from `butler_ai_complete_fix.md` and `playstore_readiness_fixes.md`.

## Fixes applied

### Critical — startup / tabs / store metadata
- `app/(tabs)/_layout.tsx` — renamed from `tabs_layout`, full cyan tab bar (Home, Scripts, Butler, Terminal, KB, Settings) with hidden routes for `index`, `builder`, `fileshare`, `logs`, `support`.
- `app/_layout.tsx` — `SplashScreen.preventAutoHideAsync()` hoisted to module scope, `SplashScreen.hideAsync()` called after gate decision, `appInitRef` guard against double-init.
- `app/welcome.tsx` — added `navigatedRef` dedup guard inside `attemptNav` so the retry loop fires the first successful navigation only once.
- `app/index.tsx` — created (renders `null`) so expo-router has a proper initial route.
- `app.json` — top-level `privacyPolicyUrl` added; cleaned root-level junk (`contentRating`, etc); kept all blocked permissions.
- `eas.json` — removed iOS `contact@onspace.ai` block, added `base` profile with `NODE_ENV=production`, dev/preview/production extend it.
- `package.json` — `"main"` set to `./index.js` so the hardened entry (TextDecoder polyfill + VideoCache wipe + global error boundary) actually runs.

### High — runtime crashes & build size
- `services/kbGrowthTracker.ts` — `FileSystem.documentDirectory` now lazily resolved via `getTimelineFile()`; load/persist/clear all null-guarded.
- `app.json` Android autolinking exclude expanded to `@stripe/stripe-react-native`, `react-native-webrtc`, `react-native-maps`, `@shopify/react-native-skia`, `@apollo/client` (on top of existing `expo-video`, `expo-gl`, `expo-sensors`, `lottie-react-native`, `expo-three`).
- `android/proguard-rules.pro` — created (keeps RN, Hermes, Expo, AsyncStorage, Reanimated, GestureHandler, CameraX, OkHttp); referenced via `expo.android.proguardRules` in `app.json`.
- `babel.config.js` — added `react-native-reanimated/plugin`; `transform-remove-console` only when `NODE_ENV=production`.
- `metro.config.js` — resolver order changed to `['react-native', 'browser', 'module', 'main']`, `inlineRequires: true` enabled (existing expo-video stub preserved).
- `app.json` iOS `deploymentTarget` bumped to `16.4` (expo-build-properties minimum).

### Environment
- `yarn expo install --fix` ran cleanly — all SDK 53 pins aligned.
- `metro-cache-key@0.82.5` pinned to match metro 0.82.5 (workspace had a stray 0.84.4 breaking the transformer).
- Android bundle compiles: **1477 modules, ~13 MB, HTTP 200**.

## What was NOT done (intentional — too risky for unverified codebase)
- Did not delete bloat packages (`react-native-webrtc`, `skia`, `stripe`, etc.) from `package.json`. The autolinking excludes in `app.json` prevent their native code from being compiled into the AAB, which is the actual size win. Removing them from `package.json` could break unused imports somewhere in the 200-file source tree.
- Did not add `android/settings.gradle` exclusions — Expo manages Android natively via `expo prebuild`; the `autolinking.exclude` array is the supported path.
- Did not rewrite Screen10 in `onboarding_v2.tsx` — the existing `handleGetStarted` already does `AsyncStorage.multiSet` → verify → `__onboardingComplete` → multi-path replace → retry loop, which matches the guide's intent.
- LOW-priority deprecation cleanups (`expo-image` prop renames, `canGoBack()` during render, `UNSAFE_componentWill*`, detent sort) skipped — they are warnings, not blockers.

## Next step for the user

The APK/AAB **must be built via the Emergent "Publish" button (top-right of the editor)**. This environment cannot produce a signed Play Store binary. Once you click Publish:
1. Choose Android → AAB (app-bundle) → production track for Play Store, or APK → preview track for sideload testing.
2. Provide the Play Console upload credentials when prompted (or download the AAB and upload manually).
3. Play Store-required metadata is already in `app.json` (`privacyPolicyUrl`, `playStoreDeveloperName`, `appAccessInstructions`, etc.).
