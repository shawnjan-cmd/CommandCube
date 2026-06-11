# Butler AI — Onboarding Exit Fix + Developer Toolkit

> **Version:** 2.0.0  
> **Status:** Production-ready  
> **Affects:** `app/welcome.tsx`, `app/_layout.tsx`, `services/onboardingExit.ts`, `services/devOnboarding.ts`

---

## Table of Contents

1. [The Problem](#the-problem)
2. [Root Cause Analysis](#root-cause-analysis)
3. [The Solution](#the-solution)
4. [File Reference](#file-reference)
5. [How to Apply](#how-to-apply)
6. [Architecture: Before vs. After](#architecture-before-vs-after)
7. [Developer & QA Toolkit](#developer--qa-toolkit)
8. [Upgrade Notes (v1 → v2)](#upgrade-notes-v1--v2)
9. [Testing Checklist](#testing-checklist)
10. [FAQ](#faq)

---

## The Problem

The "Open Butler AI" button on the final onboarding screen (`Screen10Ready`) worked
unreliably — especially after any visual edit to `welcome.tsx`. Users would tap the
button and:

- Get sent back to `/welcome` immediately after reaching `/(tabs)`, or
- Have the button lock into a permanent `LAUNCHING…` state with no recovery, or
- See a flash of the tabs screen before bouncing back.

This was a **regression trap**: the bug seemed fixed, but any change to `welcome.tsx`
that altered render timing caused it to reappear.

---

## Root Cause Analysis

The original codebase had **five concurrent exit mechanisms** for the same navigation:

| # | Mechanism | Where |
|---|-----------|-------|
| 1 | `global.__onboardingComplete()` | Called from Screen10Ready |
| 2 | `setNeedsOnboarding(false)` | Triggered re-run of `initApp` effect |
| 3 | `router.replace('/(tabs)')` | Called directly in Screen10Ready |
| 4 | `router.navigate('/(tabs)')` | Fallback in Screen10Ready |
| 5 | `postOnboardingRef` | Dedup guard in _layout.tsx |

### Why this was unstable

The `initApp` effect in `_layout.tsx` was subscribed to `[needsOnboarding]`. Every
time `setNeedsOnboarding(false)` was called by Screen10Ready (mechanism 2), it
triggered a re-run of `initApp`. The timing between:

```
Screen10Ready calls router.replace('/(tabs)')
   ↓  (milliseconds later)
_layout initApp re-runs due to needsOnboarding flip
   ↓
initApp sees needsOnboarding === false → router.replace('/(tabs)') ← safe
         OR sees stale state → router.replace('/welcome') ← bug!
```

The race window was narrow enough to pass tests but wide enough to fail on device —
and it collapsed whenever `welcome.tsx` render timing changed (e.g., a new animation,
a state variable, a conditional render).

---

## The Solution

### Core principle

> **One exit. One owner. No shared state.**

Navigation out of onboarding is now owned by a single function in a single file.
`_layout.tsx` never touches routing after its one-time init.

### Three changes, one invariant

```
services/onboardingExit.ts   ← new: the only place that calls router.replace
welcome.tsx (Screen10Ready)  ← simplified: calls exitOnboarding, nothing else
_layout.tsx (RootLayout)     ← simplified: initApp runs once, never again
```

The invariant:

> After `didInitRef.current = true` is set in `_layout.tsx`, no code in
> `_layout.tsx` will ever call `router.replace` again. All navigation is
> Screen10Ready's responsibility — delegated to `exitOnboarding`.

---

## File Reference

### `services/onboardingExit.ts` ← **NEW**

Single source of truth for leaving onboarding.

```ts
// Returns OnboardingExitResult — never throws.
export async function exitOnboarding(router): Promise<OnboardingExitResult>

// Convenience boolean wrapper (legacy callers).
export async function exitOnboardingBool(router): Promise<boolean>
```

**What it does:**
1. Calls `AsyncStorage.multiSet` with all 9 consent keys.
2. Retries the gate key (`ONBOARDING_DONE_KEY`) individually for resilience.
3. Attempts `router.replace` on each of `['/(tabs)', '/main-menu', '/']` in order.
4. Returns a result object — never throws, never hangs.

### `services/devOnboarding.ts` ← **NEW**

Dev & QA utilities. Never import in production paths.

| Function | Description |
|----------|-------------|
| `devResetOnboarding()` | Clears all 9 keys. Restart app to see welcome. |
| `devCompleteOnboarding()` | Marks all 9 keys as `'1'`. Skips welcome on next boot. |
| `devOnboardingStatus()` | Returns `Record<string, string \| null>` snapshot. |
| `devPrintOnboardingStatus()` | Pretty-prints snapshot to console with ✅/❌ icons. |
| `devSetOnboardingKey(key, value)` | Granular: set or clear one key by name. |

### `welcome.Screen10Ready.tsx` ← **PATCHED**

Drop-in replacement for `Screen10Ready` (lines ~948–1166 of `welcome.tsx`).

Changes:
- `doLaunch` calls `await exitOnboarding(router)` — nothing else.
- On navigation failure, resets `launchingRef` and `launching` state so the user can retry.
- `handleBack` extracted to `useCallback` for performance and readability.
- Full `accessibilityHint` added to the CTA and Back button.
- Ellipsis (`…`) used instead of `...` in UI strings.

### `_layout.RootLayout.tsx` ← **PATCHED**

Drop-in replacement for `RootLayout` (lines ~340–461 of `_layout.tsx`).

Changes:
- `didInitRef` added — `initApp` effect body runs **exactly once per mount**.
- `global.__onboardingComplete` removed entirely.
- `postOnboardingRef` removed entirely.
- `setNeedsOnboarding` no longer re-triggers routing logic.
- Bootstrap effect has a `cancelled` flag to prevent setState-after-unmount in tests.
- Inline comments explain *why* each pattern is used.

---

## How to Apply

### Step 1 — Drop in the new service files

```
services/onboardingExit.ts   → new file (create it)
services/devOnboarding.ts    → new file (create it)
```

### Step 2 — Add the import to `welcome.tsx`

At the top of `welcome.tsx`, alongside your other service imports:

```ts
import { exitOnboarding } from '@/services/onboardingExit';
```

### Step 3 — Replace Screen10Ready in `welcome.tsx`

Replace lines **~948 to ~1166** (the entire `Screen10Ready` function and its closing
brace) with the contents of `welcome.Screen10Ready.tsx` from this folder.

> **Tip:** Search for `function Screen10Ready` to find the start, and count braces to
> find the end. Nothing outside this function block needs to change.

### Step 4 — Replace RootLayout in `_layout.tsx`

Replace lines **~340 to ~461** (the entire `RootLayout` function) with the contents of
`_layout.RootLayout.tsx` from this folder.

Also add this import near the top of `_layout.tsx` (if not already present):

```ts
import { ONBOARDING_DONE_KEY } from '@/constants/onboardingKeys';
```

### Step 5 — Verify

Run your dev build and confirm:

- [ ] Tapping "OPEN BUTLER AI" navigates to `/(tabs)` without bouncing back.
- [ ] The 5-second auto-launch also works.
- [ ] Tapping "BACK" from Screen10 returns to Screen9 with no stuck state.
- [ ] A cold boot (no onboarding done) routes to `/welcome`.
- [ ] A warm boot (onboarding done) routes to `/(tabs)`.

---

## Architecture: Before vs. After

### Before

```
Screen10Ready
  ├── global.__onboardingComplete()   ─┐
  ├── setNeedsOnboarding(false)        │  all competing,
  ├── router.replace('/(tabs)')        │  all racing
  └── router.navigate('/(tabs)')      ─┘
           ↕  (race condition)
_layout initApp effect
  └── [needsOnboarding] dep → re-runs on every flip
        └── may call router.replace('/welcome') ← bug
```

### After

```
Screen10Ready
  └── doLaunch()
        └── exitOnboarding(router)   ← single function, single path
              ├── AsyncStorage.multiSet(ALL_CONSENT_KEYS)
              └── router.replace('/(tabs)')   ← only navigation call

_layout initApp effect
  └── didInitRef guard → runs ONCE, never again after first mount
        └── router.replace('/welcome' or '/(tabs)')  ← first-boot only
```

---

## Developer & QA Toolkit

### Reset onboarding during development

Paste into your React Native dev REPL, or wire to a hidden long-press:

```ts
import { devResetOnboarding } from '@/services/devOnboarding';
await devResetOnboarding();
// Then reload the app
```

### Skip onboarding in E2E tests

```ts
import { devCompleteOnboarding } from '@/services/devOnboarding';

beforeEach(async () => {
  await devCompleteOnboarding();
});
```

### Inspect key state

```ts
import { devPrintOnboardingStatus } from '@/services/devOnboarding';
await devPrintOnboardingStatus();
// Console output:
//   ✅  @butler_onboarding_done_v1              → 1
//   ✅  @butler_consent_v1                      → 1
//   ❌  @butler_camera_consent_v1               → null
//   …
```

### Test a specific mid-flow screen

```ts
import { devResetOnboarding, devSetOnboardingKey } from '@/services/devOnboarding';
import { TERMS_ACCEPTED_KEY } from '@/constants/onboardingKeys';

await devResetOnboarding();
// Simulate user who has accepted terms but not yet camera consent:
await devSetOnboardingKey(TERMS_ACCEPTED_KEY, '1');
```

---

## Upgrade Notes (v1 → v2)

| v1 | v2 | Action |
|----|----|--------|
| `exitOnboarding` returns `boolean` | Returns `OnboardingExitResult` | Update callers that check `if (!ok)` → `if (!result.navigated)` |
| No `devPrintOnboardingStatus` | Added | Optional — use for debugging |
| No `devSetOnboardingKey` | Added | Optional — for granular test setup |
| `global.__onboardingComplete` | Removed | Delete any remaining call sites |

If you have callers that used the old `boolean` return:

```ts
// Old (v1)
const ok = await exitOnboarding(router);
if (!ok) { /* ... */ }

// New (v2) — preferred
const { navigated } = await exitOnboarding(router);
if (!navigated) { /* ... */ }

// New (v2) — drop-in compat shim
import { exitOnboardingBool } from '@/services/onboardingExit';
const ok = await exitOnboardingBool(router);
```

---

## Testing Checklist

Copy this into your PR description or QA ticket:

```
Onboarding Exit — Regression Checklist

Cold boot (no storage)
  [ ] Routes to /welcome
  [ ] Welcome flow completes all 10 screens
  [ ] Screen10 "OPEN BUTLER AI" tap → navigates to /(tabs), stays there
  [ ] Screen10 5-second auto-launch → navigates to /(tabs), stays there
  [ ] Screen10 "BACK" → returns to Screen9, countdown stops

Warm boot (onboarding complete)
  [ ] Routes directly to /(tabs), no flash of /welcome

Mid-flow edge cases
  [ ] Double-tap "OPEN BUTLER AI" (should be idempotent, no crash)
  [ ] Tap "BACK" during countdown, then complete flow on second try
  [ ] Kill app during Screen10 countdown, reopen → resumes correctly

Dev utilities (__DEV__ only)
  [ ] devResetOnboarding() clears all keys
  [ ] devCompleteOnboarding() sets all keys to '1'
  [ ] devOnboardingStatus() returns correct snapshot
  [ ] devPrintOnboardingStatus() logs ✅/❌ per key
```

---

## FAQ

**Q: Do I need to change any other screen in welcome.tsx?**  
A: No. Only `Screen10Ready` (lines ~948–1166) needs to be replaced. Screens 1–9 are untouched.

**Q: Why is `exitOnboarding` in its own service file?**  
A: Isolation. It can be imported by Screen10, tested in unit tests, and future screens without any dependency on the layout tree.

**Q: What happens if `AsyncStorage.multiSet` fails?**  
A: `exitOnboarding` retries the single gate key (`ONBOARDING_DONE_KEY`) individually. If that also fails, the function still attempts navigation. The user reaches the app; on next cold boot, the missing key might trigger welcome again — but that's better than a stuck button.

**Q: Is `devOnboarding.ts` safe to ship in production?**  
A: All logging is guarded by `__DEV__`, and no UI imports this file. But for maximum safety, add it to your metro config's `blockList` or a tree-shaking alias for production builds.

**Q: The `didInitRef` pattern — why not `useState` instead?**  
A: State updates are asynchronous — there's a window between the state write and the next render where a second trigger could slip through. Refs are synchronous; `didInitRef.current = true` is visible immediately to the same effect, closing the race entirely.

---

*Butler AI — Onboarding Exit Fix v2.0.0*