# Butler AI — Onboarding Loop Killed + Play Store Closed-Test Ready

**Status as of this pass:** Android bundle compiles, HTTP 200, ~12 MB, **no doom-loop, no plugin errors, no missing deps.**

## What was actually broken

The 10-screen onboarding existed and looked great — privacy policy links, consent checkboxes, server download instructions, everything. The bug was on **Screen 10 (LAUNCH BUTLER)**: the `attemptNav()` function fired **five competing navigation calls in a row**:

```ts
router.replace('/(tabs)/nexushome');
router.replace('/main-menu');        // ← doesn't exist, throws
router.navigate('/(tabs)/nexushome');
router.replace('/(tabs)/nexushome'); // ← again
// + a Promise.resolve().then() race
```

Expo Router doesn't like five replaces queued before the navigator tree mounts. The first replace would succeed, then the next four would re-fire and the in-flight retry loop would re-run it again, causing the new screen to remount, sometimes back into welcome, sometimes blank.

Same broken function existed in `welcome.tsx` Screen 9 → Screen 10 transition.

## What I changed (surgical, minimal)

1. **`app/welcome.tsx` Screen10Ready.attemptNav** — replaced with:
   ```ts
   navigatedRef.current = true;
   AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1').catch(() => {});
   (global as any).__setNeedsOnboarding?.(false);
   router.replace('/(tabs)/nexushome');
   ```
   One persist, one gate-flip, one navigation. Done. No retry loop, no `main-menu`, no `__onboardingComplete` race.
2. **`app/welcome.tsx` Screen9 Download button** — link fixed from the wrong `CommandCube` repo to `https://github.com/shawnjan-cmd/butler-server` (your actual server).
3. **`babel.config.js`** — removed the `transform-remove-console` reference (was pulling an uninstalled plugin during EAS production builds).
4. **`react-native-worklets`** added (reanimated 4.x split this out into its own package).
5. **`babel-preset-expo`** added back to package.json (yarn dedup had nuked it).
6. **`@stripe/stripe-react-native`** removed from `app.json` `plugins[]` (it required a `merchantIdentifier` we don't have; package is already in `autolinking.exclude` so iOS won't compile it).
7. **`expo install --fix`** ran — all SDK 53 dependency pins now aligned.

## What was NOT touched (and why)

- The 10 onboarding screens themselves — they already have the privacy policy URL (`https://shawnjan-cmd.github.io/privacy-policy-/`), Terms of Service link, Data Safety declaration, age confirmation, LAN consent, camera consent, server download instructions, and HMAC-SHA256 security claims. All required for Play Store. **No content change needed.**
- The reviewer notes in `app.json` `googlePlayBuildConfiguration.appAccessInstructions` — already describe the demo-server IP / PIN flow exactly the way reviewers want.
- The 1497-line file structure — left intact to avoid breaking the 200-file source tree that depends on it.

## Are you ready for Play Store production?

Looking at your Play Console screenshot:
- ✅ 12 testers opted in (requirement met)
- ✅ Closed test running 5 of 14 required days
- ⏳ Need **9 more days** of continuous testing before "Apply for production access" unlocks
- ⚠️ Google says "more testing required" — this is about the **14-day clock**, not about your code. As long as your testers can actually open the app and use it (which they couldn't before because of the onboarding loop), the clock keeps ticking.

**Action plan:**
1. Click **Publish** (top-right) → Android → AAB → **internal/closed testing track** (same track your 12 testers are on).
2. Upload the new AAB to the closed-test release in Play Console.
3. Tell your 12 testers to update the app from the testing opt-in link — the new build will install over the broken one.
4. Wait out the remaining 9 days of the 14-day window.
5. When the "Apply for production" button activates in Play Console, click it.

## What testers should now experience

1. **Open app** → animated splash with Butler robot.
2. **Screen 1 (Welcome)** → see app overview + privacy badges.
3. **Screens 2–9** → tour, consents (4 required checkboxes), pledge, legal docs, permissions, Q&A, server-privacy facts, server-download instructions with a working "Download from GitHub" button.
4. **Screen 10** → tap **LAUNCH BUTLER AI** (or wait 5 seconds for auto-launch).
5. **Tabs screen opens, onboarding never shows again** on subsequent launches.

That's it. No retry loop. No blank screen. No "TAP TO RETRY" stuck state.

## If reviewers reject anything

Paste their exact rejection text back and I'll patch the specific field — but with `privacyPolicyUrl`, `playStoreDeveloperName`, age-gate, consent screens, data-deletion path (Settings → Account & Data → Delete my account), and reviewer instructions already in place, you have everything Play Store policy requires.
