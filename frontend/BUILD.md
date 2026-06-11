# 🛡️ Butler AI – Bulletproof Build Guide

## What changed (the “why your builds kept failing”)
1. **47 MB → 3.2 MB assets.** Unused Playstore screenshots, mascots, chat-bubble PNGs, and `.bak` files were being bundled into every APK. This is the **#1 cause** of the “Gradle daemon disappeared” / `bundleReleaseJsAndAssets FAILED` error on EAS. → Moved to `/app/memory/playstore_assets/` and `/app/memory/unused_images/` (not deleted, just out of the build).
2. **35 heavy native packages purged** (130 → 95). `react-native-webrtc`, `@shopify/react-native-skia`, `@stripe/stripe-react-native`, `react-native-maps`, `lottie-react-native`, `expo-av`, `expo-gl`, `expo-media-library`, etc. — all unused in code, all silently auto-linking into Gradle, all bloating compile.
3. **10 files fixed** — `expo-file-system` v19 broke the legacy API (`readAsStringAsync`, `documentDirectory`, `EncodingType` → all throw at runtime in v19). Migrated to `expo-file-system/legacy`.
4. **ProGuard / R8 temporarily disabled** in `app.json`. These are the #2 cause of release-only crashes. Re-enable AFTER you get one successful build.
5. **`.easignore`** added — skips `test_reports/`, `.git/`, `docs/`, `*.md`, `playstore_assets/`, `*.bak`, etc. from EAS upload. Smaller tarball = faster + more reliable builds.
6. **Belt-and-suspenders expo-video defense** kept (autolinking exclude + metro stub + react-native.config.js).

## Build profiles (in `eas.json`)

Pick which one to use from the Emergent Publish UI (or rename the active profile):

| Profile | What you get | When to use |
|---|---|---|
| `preview` | APK, ProGuard off, JVM 6GB, `--stacktrace` | **Use this first** — fast install on your phone |
| `preview-safe` | APK, ProGuard off, **arm64-v8a only** (1 arch = 4× faster, smaller) | Fallback if `preview` fails |
| `preview-debug` | APK + `--info` ultra-verbose logs | When something fails and you need the real Gradle error |
| `production` | AAB for Play Store | **Use only after `preview` works** |
| `production-safe` | AAB with extra guards | Fallback for production |
| `development` | Debug APK with dev client | Only if doing live JS reload on device |

## Recommended sequence
1. Hit **Publish → Android** in Emergent → choose `preview`. APK installs to your phone. Test it.
2. If `preview` succeeds → try `production` for the AAB you upload to Play Console.
3. If anything fails → switch to `preview-safe` (single architecture = much less to go wrong) or `preview-debug` (real error logs).

## Environment hardening (already applied to every profile via `base`)
- `NODE_OPTIONS=--max-old-space-size=8192` — prevents Metro OOM during bundle
- `GRADLE_OPTS=-Xmx6g -Xms2g …` — gives Gradle plenty of JVM heap
- `EXPO_NO_TELEMETRY=1`, `EAS_NO_VCS=1`
- `--no-daemon` — prevents the “daemon disappeared” class of errors

## Things to do AFTER your first green build
- Flip `enableProguardInReleaseBuilds` back to `true` in `app.json` → 30–40 % smaller AAB.
- Flip `enableShrinkResourcesInReleaseBuilds` back to `true`.
- Re-test on device (ProGuard sometimes breaks reflection — that’s why we disabled it first).

## Things to NEVER touch
- `babel.config.js` — uses `react-native-worklets/plugin` (correct for Reanimated 4 + SDK 54). Plugin order is fragile.
- `metro.config.js` — has the expo-video stub fix that prevents the SimpleCache crash.
- `react-native.config.js` — second layer of expo-video defense.
- `assets/icon.png` / `assets/adaptive-icon.png` — Play Store requires 1024×1024 PNG. The 1.5 MB is unavoidable.

## Health checklist (verified ✅ at end of this session)
- `curl localhost:3000/index.bundle?platform=android&dev=false` → **HTTP 200, 4.3 MB**
- `curl localhost:3000/index.bundle?platform=ios&dev=false` → **HTTP 200, 4.3 MB**
- `yarn expo install --check` → “Dependencies are up to date”
- Asset folder: **3.2 MB** (was 47 MB)
- Dependency count: **95** (was 130)
- 7 EAS build profiles with fallback safety
