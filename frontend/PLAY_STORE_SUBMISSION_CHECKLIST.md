# Butler AI — Play Store Submission Checklist

Follow every step in order. Items marked **[MANUAL]** require action in Play Console.

---

## PRE-SUBMISSION (Before Uploading APK/AAB)

### Technical Readiness
- [ ] Build signed release APK or AAB (use `eas build --platform android --profile production`)
- [ ] Test fresh install on a real Android device (not emulator)
- [ ] Confirm all 6 onboarding screens appear on first launch
- [ ] Confirm all 3 consent checkboxes on Safety screen must be checked before proceeding
- [ ] Confirm LAN consent dialog appears before any network scan
- [ ] Confirm camera disclosure dialog appears BEFORE the OS camera permission prompt
- [ ] Confirm "Delete All My Data" flow works: Settings → Personal Files & Account → Delete All My Data
- [ ] Confirm demo server mode works (for reviewers without a real PC)
- [ ] Confirm app does not crash on Android 10, 12, and 14

### URL Verification
- [ ] Open `https://shawnjan-cmd.github.io/privacy-policy-/` in incognito mode — must load without login
- [ ] Privacy policy mentions: data collected, how it's used, how to delete it
- [ ] Privacy policy is accessible from a mobile browser

---

## PLAY CONSOLE SETUP

### Step 1: Create App
- [ ] **[MANUAL]** Go to Play Console → Create app
- [ ] App name: `Butler AI: PC Automation`
- [ ] Default language: English (United States)
- [ ] App or game: App
- [ ] Free or paid: Free

### Step 2: Store Listing
- [ ] **[MANUAL]** App name: `Butler AI: PC Automation` (24 chars)
- [ ] **[MANUAL]** Short description: `Run scripts on your own PC from your phone. Local AI. No cloud, no accounts.` (77 chars)
- [ ] **[MANUAL]** Full description: Copy from `PlayStore_Submission_Package.md` Section 1
- [ ] **[MANUAL]** App icon: Upload `assets/playstore/app_icon_512x512.png` (512×512 PNG)
- [ ] **[MANUAL]** Feature graphic: Upload `assets/playstore/feature_graphic_1024x500.png` (1024×500 PNG/JPG)
- [ ] **[MANUAL]** Screenshots (phone): Upload all 5 from `assets/playstore/screenshot_*.png` (1080×1920)
- [ ] **[MANUAL]** Category: Tools
- [ ] **[MANUAL]** Tags: `remote pc control`, `python automation`, `local ai`, `ollama android`, `pc script runner`
- [ ] **[MANUAL]** Email: `andrejsladkovic1992@gmail.com`
- [ ] **[MANUAL]** Privacy Policy URL: `https://shawnjan-cmd.github.io/privacy-policy-/`

### Step 3: App Content
Navigate to **Play Console → App content** and complete each section:

#### 3a. Privacy Policy
- [ ] **[MANUAL]** Enter URL: `https://shawnjan-cmd.github.io/privacy-policy-/`

#### 3b. App Access
- [ ] **[MANUAL]** Select: "All or some functionality is restricted"
- [ ] **[MANUAL]** Add instructions: Copy from `PlayStore_Submission_Package.md` Section 4

#### 3c. Ads
- [ ] **[MANUAL]** Select: "No, my app does not contain ads"

#### 3d. Content Rating
- [ ] **[MANUAL]** Start the IARC questionnaire
- [ ] **[MANUAL]** Answer all questions as per `PlayStore_Submission_Package.md` Section 2
- [ ] **[MANUAL]** Expected result: **Mature (17+)** or **Adults Only (18+)**

#### 3e. Target Audience and Content
- [ ] **[MANUAL]** Target age group: Select **"Ages 18 and over"** ONLY
- [ ] **[MANUAL]** Is your app primarily directed at children? **No**
- [ ] **[MANUAL]** Does your app appeal to children? **No**

#### 3f. News App
- [ ] **[MANUAL]** Is your app a news app? **No**

#### 3g. COVID-19 Contact Tracing
- [ ] **[MANUAL]** Is your app a COVID-19 contact tracing app? **No**

#### 3h. Data Safety
- [ ] **[MANUAL]** Complete the form using answers from `DATA_SAFETY_FORM.md`
- [ ] **[MANUAL]** Data deletion URL: `https://shawnjan-cmd.github.io/privacy-policy-/`

#### 3i. Government App
- [ ] **[MANUAL]** Is your app a government app? **No**

#### 3j. Financial Features
- [ ] **[MANUAL]** Does your app provide financial services? **No**

### Step 4: Release
- [ ] **[MANUAL]** Upload signed APK or AAB to Internal Testing track first
- [ ] **[MANUAL]** Test on internal track, confirm all flows work
- [ ] **[MANUAL]** Promote to Production track
- [ ] **[MANUAL]** Add release notes (copy from `STORE_LISTING.md` What's New section)
- [ ] **[MANUAL]** Add reviewer notes: Copy from `PlayStore_Submission_Package.md` Section 5

---

## GRAPHIC ASSETS SUMMARY

All files are in `assets/playstore/`:

| File | Dimensions | Format | Used For |
|---|---|---|---|
| `app_icon_512x512.png` | 512×512 | PNG | App icon |
| `feature_graphic_1024x500.png` | 1024×500 | PNG | Feature graphic (required) |
| `screenshot_1_home.png` | 1080×1920 | PNG | Screenshot 1: Home/Dashboard |
| `screenshot_2_scripts.png` | 1080×1920 | PNG | Screenshot 2: Script Library |
| `screenshot_3_ai_chat.png` | 1080×1920 | PNG | Screenshot 3: Local AI Chat |
| `screenshot_4_security.png` | 1080×1920 | PNG | Screenshot 4: Security/Privacy |
| `screenshot_5_pairing.png` | 1080×1920 | PNG | Screenshot 5: QR Pairing |

---

## COMMON REJECTION REASONS AND FIXES

| Rejection Reason | Fix |
|---|---|
| "Remote code execution not disclosed" | Already in description with ⚠ warning. Reference `PROMINENT_DISCLOSURES.md`. |
| "No privacy policy" | URL is `https://shawnjan-cmd.github.io/privacy-policy-/` — verify it's live. |
| "App cannot be tested" | Use demo server instructions in App Access section. |
| "Inappropriate for age rating" | Target audience set to 18+. IARC rating is Mature (17+). |
| "Data safety form incomplete" | Use `DATA_SAFETY_FORM.md` for exact answers. |
| "Camera permission not justified" | Prominent disclosure shown before OS prompt. Explained in reviewer notes. |
| "Device and Network Abuse policy" | Reviewer notes explain local-only, manual-only, physical pairing requirement. |

---

## DOCUMENTS IN THIS PACKAGE

| File | Purpose |
|---|---|
| `PlayStore_Submission_Package.md` | Master metadata document (copy-paste ready) |
| `PLAY_STORE_SUBMISSION_CHECKLIST.md` | This file — step-by-step checklist |
| `PLAYSTORE_SUBMISSION_FINAL.md` | Detailed submission guide with Q&A |
| `PRIVACY_POLICY.md` | Full privacy policy (host at GitHub Pages) |
| `DATA_SAFETY_FORM.md` | Exact answers for Play Console Data Safety form |
| `PROMINENT_DISCLOSURES.md` | Verification that all disclosures are in place |
| `SECURITY_AND_PLAYSTORE_COMPLIANCE.md` | Security architecture and compliance guide |
| `assets/playstore/` | All promotional images (icon, feature graphic, 5 screenshots) |
| `app.json` | Updated with contentRating: Mature 17+, targetAudience: 18+, minimumAge: 18 |
