# BUTLER AI — PLAY STORE FINAL SUBMISSION GUIDE
**Package:** `com.butlerai.pc.automation` | **Version:** 7.1.0 (versionCode 71)
**Last updated:** May 2026

---

## ❓ ANSWERS TO YOUR QUESTIONS

### Q: Why does the app show 18+ for target audience?
**They are two different things:**

| | Play Store IARC Content Rating | App's Own Age Policy (ToS) |
|---|---|---|
| **What it means** | Describes the app's CONTENT (violence, sexual content, etc.) | Legal responsibility age for using the tool |
| **Butler AI value** | **Mature (17+) or Adults Only (18+)** — no mature content | **18+** — remote script execution is a technical/legal responsibility |
| **Where it appears** | Google Play store page | Terms of Service, consent screen checkbox |

**Fix applied:** The target audience has been updated to **18 and over** to reflect the nature of the app as a developer tool with remote script execution capabilities, which requires users to be legally responsible adults. The consent screen checkbox confirms this.

---

### Q: What is the account deletion for if we don't have account creation?
**Google Play's 2024 policy requires data deletion for ANY app that stores user data — not just apps with "accounts."**

Butler AI stores:
- Device UUID (for PC pairing authentication)
- Pair secret / HMAC key
- App settings (IP, port, preferences)
- Knowledge Base entries
- Execution history

Even without a login system, Play Store requires users to be able to erase all of this. The flow in Settings → Personal Files & Account → DELETE MY ACCOUNT & ALL DATA satisfies this requirement. Rename it "Delete All My Data" in your UI if "account" feels misleading — but the Play Console data deletion URL still needs to be filled in.

---

### Q: Is the Data Safety document done and in onboarding?
**In-app screen:** ✅ `app/data-safety.tsx` exists (226 lines, fully implemented)
**In onboarding:** ✅ Added to Screen6Ready (the "All Set" screen) as a document link button
**Play Console Data Safety form:** ❌ **You must fill this in manually in Play Console** — no code can do it for you. See Section 4 below for exact answers.

---

### Q: Is the Privacy Policy in onboarding?
**Screen 1 (Welcome):** ✅ Privacy Policy + Terms of Service links shown before any data collection
**Screen 6 (All Set / Ready):** ✅ Now added as a document link button grid (Privacy Policy, Data Safety, Terms, Delete My Data)
**Live URL:** https://shawnjan-cmd.github.io/privacy-policy-/ — make sure this page is live and accessible without login

---

## 1. PLAY STORE LISTING COPY (copy-paste ready)

### App Name (max 30 chars — EXACT)
```
Butler AI: PC Automation
```
(24 chars ✓)

### Short Description (max 80 chars — EXACT)
```
Run scripts on your own PC from your phone. Local AI. No cloud, no accounts.
```
(77 chars ✓)

### Full Description (max 4000 chars — paste as-is into Play Console)
```
Butler AI turns your Android phone into a remote for the PC you already own.

Install the free, open-source Butler AI server (a single Python script) on your Windows, Mac, or Linux computer. Scan the QR code it shows on screen. From that moment, you can run Python scripts and terminal commands on that PC from your phone — over your own home Wi-Fi. Nothing goes to the cloud.

⚠ REMOTE PC CONTROL DISCLOSURE ⚠
This app remotely executes commands and Python scripts on YOUR OWN personal computer over YOUR OWN local Wi-Fi network. It is designed for developers and technical users who understand command-line automation. EVERY command requires a manual tap — nothing runs automatically, ever. The app cannot connect to any computer you have not physically paired by scanning a QR code shown on that computer's screen.

── WHAT MAKES IT DIFFERENT ──

✦ LOCAL-FIRST — Your phone talks directly to your PC over your own Wi-Fi. There is no Butler AI cloud server, no relay, no middleman.

✦ MANUAL ONLY — Every script and every terminal command requires you to tap Run. No scheduler, no auto-execution, no remote push.

✦ MALICIOUS SCRIPT BLOCKER — Before any script runs, Butler AI scans it for dangerous patterns (rm -rf, disk format, registry wipes). Dangerous scripts are blocked before execution.

✦ SCRIPT UNDO — Reverse the last execution with one tap. Undo log kept for 24 hours.

✦ ENCRYPTED — AES-256 + HMAC-SHA256 signed requests. Only your paired phone can send commands.

✦ ZERO TELEMETRY — No analytics, no crash reports, no usage data, no advertising IDs collected.

✦ OPEN SOURCE SERVER — The PC server (butler_server.py) is free, open-source, and auditable on GitHub.

── WHAT YOU CAN DO ──

• Run any Python script on your PC — one tap from your phone
• Chat with a local Ollama AI model (no API key, no subscription, no cloud)
• Monitor CPU, RAM, and disk usage in real time
• Scan a QR code for instant pairing — no IP address typing required
• 70+ built-in Python automation scripts (disk cleaner, system info, process monitor, and more)
• Transfer files between phone and PC
• Knowledge Base that self-indexes Python documentation from your PC

── WHAT IT IS NOT ──

✗ Not a remote desktop or screen-sharing app
✗ Not a tool to control computers you don't own — works only with your physically paired PC
✗ Not a cloud service — your scripts and data never leave your home network

── PERMISSIONS EXPLAINED ──

• CAMERA — Used ONLY to scan the one-time pairing QR code shown on your PC. No photos taken. No images stored or transmitted anywhere.
• LOCAL NETWORK — Used to find your PC on your own Wi-Fi (one-time scan, shown before it runs, with your explicit consent). Never scans the public internet.
• INTERNET — Only used for the local connection to your PC server on your home network.
• VIBRATE — Tactile feedback on script completion.

NOT requested: contacts, microphone, location, photo library, SMS, call log, or any sensitive permissions.

── PRIVACY & DATA ──

Privacy Policy: https://shawnjan-cmd.github.io/privacy-policy-/
Data deletion: Settings → Personal Files & Account → Delete All My Data
Web deletion form: https://shawnjan-cmd.github.io/privacy-policy-/
Support: andrejsladkovic1992@gmail.com

Requires: Python 3.10+ installed on your PC. Free server download at GitHub (see our privacy policy page for the link).

Butler AI is designed for developers and technical users aged 18 and above. Remote PC automation requires understanding of command-line tools and responsibility for the scripts you choose to run.
```
(3,847 chars ✓ — under 4,000 limit)

---

## 2. CONTENT RATING (IARC Questionnaire)

Complete this in Play Console → App content → Content rating:

| Question | Answer |
|---|---|
| Violence | **No** |
| Sexual content | **No** |
| Profanity or crude humor | **No** |
| Controlled substances | **No** |
| Gambling | **No** |
| User-to-user communication | **No** (talks to user's own PC, not other people) |
| Shares user location with others | **No** |
| User-generated content visible to others | **No** |
| Purchases | **No** |

**Expected rating: Mature (17+) or Adults Only (18+)**
- This is the IARC content rating (describes the content, not who should use it)
- Your ToS requires 18+ — that is separate and both can coexist

**Target audience:** Select "Not primarily child-directed" and set age to **18 and over**

---

## 3. URLS YOU MUST HAVE LIVE BEFORE SUBMITTING

| Field | URL |
|---|---|
| Privacy Policy URL | `https://shawnjan-cmd.github.io/privacy-policy-/` |
| Data Deletion URL | `https://shawnjan-cmd.github.io/privacy-policy-/` |
| Support Email | `andrejsladkovic1992@gmail.com` |
| Developer Website | `https://shawnjan-cmd.github.io/privacy-policy-/` |

**To verify your privacy policy URL is acceptable:**
1. Open it in incognito mode — it must load without any login
2. It must mention: what data is collected, how it's used, how to delete it
3. It must be accessible from a mobile browser

---

## 4. DATA SAFETY FORM (Play Console → App content → Data safety)

**Fill in these exact answers:**

**Top-level questions:**
| Question | Answer |
|---|---|
| Does your app collect or share any required user data types? | **Yes** |
| Is all user data encrypted in transit? | **Yes** |
| Do you provide a way for users to request data deletion? | **Yes** |
| Data deletion URL | `https://shawnjan-cmd.github.io/privacy-policy-/` |

**Data types to declare:**

| Category | Type | Collected? | Shared? | Optional? | Purpose | How used |
|---|---|---|---|---|---|---|
| Device or other IDs | Device ID | ✅ Yes | ❌ No | ❌ No | App functionality | Device pairing with user's own PC |
| App activity | App interactions | ✅ Yes | ❌ No | ❌ No | App functionality | Connection state, settings |
| App activity | Other actions | ✅ Yes | ❌ No | ❌ No | App functionality | LAN discovery (one-time, consensual) |

**Do NOT declare:**
- Photos/videos: Camera QR scan is transient in-memory only, never persisted
- Location: Never accessed
- Contacts, SMS, Call log: Never requested

**Third-party sharing:** No
**Data sold:** No
**Collected from children:** No

---

## 5. APP ACCESS (for Play Reviewers — CRITICAL)

This is the most important section. Most pairing apps get rejected because **reviewers can't test them**.

In Play Console → App content → App access → select "All or some functionality is restricted"

**Add this instruction:**
```
Butler AI requires a paired PC server. For review without a real PC:

OPTION A — Demo server (easiest):
1. Open app → tap through 6 welcome screens → accept all 3 consent checkboxes
2. On Home screen → tap SCAN QR TO PAIR button
3. In QR modal → tap MANUAL IP tab
4. Tap the amber "DEMO SERVER — No PC Required" button for connection details
5. Enter the demo IP and port 5000 → tap CONNECT
6. App pairs and shows live metrics, scripts, and AI chat

OPTION B — Install server yourself (5 min):
1. Install Python 3.10+ on any PC
2. Download butler_server.py from: https://github.com/shawnjan-cmd/butler-server
3. Run: python butler_server.py
4. Scan the QR code shown on screen with the app

REVIEWER NOTES:
- Camera = QR pairing ONLY. No photos stored or transmitted.
- Every script requires manual tap. Nothing auto-executes.
- MALICIOUS SCRIPT BLOCKER blocks dangerous commands before execution.
- Script UNDO button reverses last execution.
- Data deletion: Settings → Personal Files & Account → Delete All My Data (3 taps from main screen)
- LAN scan consent dialog shown before first scan
- All 3 consent checkboxes on Safety screen must be checked before continuing
```

---

## 6. REVIEWER NOTES (paste into "Notes for reviewer" in Play Console)

```
Thank you for reviewing Butler AI: PC Automation.

WHAT THIS APP DOES:
Butler AI lets users run Python scripts and terminal commands on a server
THEY install on THEIR OWN computer, over THEIR OWN local Wi-Fi. There is
no cloud relay, no Butler AI-operated server, and the app CANNOT talk to
any computer the user has not physically paired by scanning a QR code
displayed on that computer's screen.

HOW TO TEST WITHOUT A REAL PC:
1. Launch app → tap through the 6-screen onboarding
2. Accept all 3 consent checkboxes on the Safety screen
3. On Home → tap SCAN QR TO PAIR → MANUAL IP tab
4. Tap the amber DEMO SERVER button → follow the instructions
   (Demo IP and port are shown in the App Access section above)
5. From Home, tap PYTHON SCRIPTS → select any script → tap RUN

WHY THIS IS NOT A REMOTE ACCESS TOOL UNDER §4.8:
- Connection requires PHYSICAL presence at PC to scan its QR code
- EVERY command requires a manual tap — no auto-execution, no scheduler
- App NEVER downloads or installs executable code
- Malicious Script Blocker blocks rm -rf, format, registry wipes BEFORE execution
- App does NOT use Accessibility Service, SYSTEM_ALERT_WINDOW,
  MANAGE_EXTERNAL_STORAGE, QUERY_ALL_PACKAGES, or REQUEST_INSTALL_PACKAGES
- All traffic is HMAC-SHA256 signed — only the paired phone can send commands

CAMERA: Used ONLY for one-shot QR pairing. Image processed in memory,
never stored or transmitted. Prominent disclosure shown before OS prompt.

LAN SCAN: Explicit consent dialog shown before first scan. Scoped to
user's own /24 subnet. Results never leave the device.

DATA DELETION: Settings → Personal Files & Account → Delete All My Data
(3 taps from any main screen). Also at: https://shawnjan-cmd.github.io/privacy-policy-/

Content rating: Mature (17+) or Adults Only (18+) — no violent, sexual, or mature content.
App's own Terms of Service require users to be 18+ for legal responsibility
purposes (remote script execution). These are separate per IARC guidelines.

Contact: andrejsladkovic1992@gmail.com
```

---

## 7. PERMISSIONS JUSTIFICATION (for Play Console)

| Permission | Justification |
|---|---|
| INTERNET | Required to reach the user's own PC server on their local Wi-Fi. No public internet endpoints used. |
| CAMERA | Used exclusively to scan the one-time pairing QR code shown on the user's PC. No photos taken, stored, or transmitted. |
| ACCESS_NETWORK_STATE | Detects Wi-Fi connection before initiating local network discovery. |
| ACCESS_WIFI_STATE | Confirms phone is on same Wi-Fi as the PC before scanning. |
| VIBRATE | Haptic feedback on script completion and button presses. |

**Permissions NOT requested (mention in reviewer notes):**
ACCESSIBILITY_SERVICE ❌ | SYSTEM_ALERT_WINDOW ❌ | MANAGE_EXTERNAL_STORAGE ❌
QUERY_ALL_PACKAGES ❌ | READ_EXTERNAL_STORAGE ❌ | RECORD_AUDIO ❌
READ_SMS ❌ | READ_CALL_LOG ❌ | ACCESS_BACKGROUND_LOCATION ❌
REQUEST_INSTALL_PACKAGES ❌

---

## 8. CATEGORY & TAGS

| Field | Value |
|---|---|
| Category | **Tools** (NOT Productivity) |
| Tags (5 max) | remote pc control, python automation, local ai, ollama android, pc script runner |

---

## 9. ABOUT "ACCOUNT DELETION" WITHOUT ACCOUNT CREATION

**Why it's still required:**
Google Play's 2024 policy requires a data deletion mechanism for ANY app that stores "personal information or sensitive data." Butler AI stores:
- Device UUID (generated at first launch, used for PC pairing)
- Pair secret / HMAC authentication key
- App settings and connection logs
- Knowledge Base entries (locally stored research)
- Script execution history

Even without a username/password login system, these data points exist and users have the right to delete them under GDPR, CCPA, and Google Play policy.

**Your deletion flow satisfies this requirement:**
- In-app: Settings → Personal Files & Account → DELETE MY ACCOUNT & ALL DATA
- Web: https://shawnjan-cmd.github.io/privacy-policy-/
- Both delete: device ID, pair secret, settings, KB entries, execution history

**Recommendation:** Rename the button to "Delete All My Data" or "Erase All App Data" in the UI to avoid confusion (no "account" exists). The Play Console data deletion URL stays the same.

---

## 10. PRE-SUBMISSION CHECKLIST

Run every item before uploading APK/AAB:

**Technical**
- [ ] Fresh install on real Android 18+ device
- [ ] All 6 onboarding screens appear on first launch
- [ ] All 3 consent checkboxes must be checked to proceed past Safety screen
- [ ] LAN consent screen appears before any network scanning
- [ ] Camera disclosure dialog appears BEFORE OS camera permission prompt
- [ ] Pairing works with DEMO SERVER button (or real PC QR)
- [ ] Pairing works with manual IP entry
- [ ] Data deletion in Settings → Personal Files & Account → Delete All My Data
- [ ] After deletion, onboarding re-appears on next launch (proves erase worked)
- [ ] Force-stop + relaunch: consent screens do NOT re-appear (stored correctly)
- [ ] Privacy Policy link opens live page from welcome screen
- [ ] Data Safety link opens live page from welcome/settings

**Store Listing**
- [ ] App name ≤ 30 chars: "Butler AI: PC Automation" ✓
- [ ] Short description ≤ 80 chars ✓
- [ ] Full description ≤ 4000 chars ✓
- [ ] ⚠ remote control warning paragraph present in description ✓
- [ ] At least 2 screenshots uploaded (we generated 5 in assets/screenshots/)
- [ ] Feature graphic 1024×500 uploaded
- [ ] App icon 512×512 PNG uploaded

**Compliance**
- [ ] Content rating = Mature (17+) or Adults Only (18+) via IARC questionnaire
- [ ] Data Safety form completed (Section 4 above)
- [ ] Privacy Policy URL live and accessible without login
- [ ] Data deletion URL live and accessible without login
- [ ] App Access notes filled with demo server instructions
- [ ] Reviewer notes filled in (Section 6 above)
- [ ] targetSdkVersion = 35 ✓ (in app.json expo-build-properties)

**Copyright scan (run on APK)**
```bash
# Check for infringing terms
strings app-release.apk | grep -iE 'terminator|skynet|t-800|cyberdyne|sarah.connor'
# Should return 0 results
```

---

## 11. PLAY CONSOLE SETTINGS SUMMARY

| Field | Value |
|---|---|
| App name | Butler AI: PC Automation |
| Package | com.butlerai.pc.automation |
| Category | Tools |
| Content rating | Mature (17+) or Adults Only (18+) |
| Target audience | 18+ (not child-directed) |
| Contains ads | No |
| In-app purchases | No |
| Privacy Policy URL | https://shawnjan-cmd.github.io/privacy-policy-/ |
| Data deletion URL | https://shawnjan-cmd.github.io/privacy-policy-/ |
| Support email | andrejsladkovic1992@gmail.com |
| Developer website | https://shawnjan-cmd.github.io/privacy-policy-/ |

---

## 12. THE #1 THING THAT WILL GET YOU APPROVED

**Fill in the App Access section with a working demo server.**

The most common rejection reason for pairing apps:
> "We could not test the app because it requires an external device."

A Google Play reviewer has a phone and a laptop in an office. They cannot set up your Python server in 5 minutes. The amber "DEMO SERVER" button in the QR modal is already in your app — you just need to run a real demo server somewhere and put its IP in the App Access notes.

**Easiest demo server options:**
1. Your home PC with ngrok (`ngrok http 5000`) — free, instant public URL
2. Any $4/month VPS (DigitalOcean, Vultr) running butler_server.py
3. GitHub Codespaces running butler_server.py with port forwarding

The demo server just needs to be reachable at an IP:port that reviewers can type in.

---

Last updated: May 2026 | Butler AI v7.1.0
