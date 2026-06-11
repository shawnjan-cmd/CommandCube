# Butler AI — Complete Google Play Store Submission Package

This document contains everything you need to successfully submit Butler AI to the Google Play Store, fully compliant with their 2025/2026 policies regarding remote access tools, local AI, and age ratings.

## 1. App Store Listing Metadata

**App Name (Max 30 chars):**
`Butler AI: PC Automation`

**Short Description (Max 80 chars):**
`Run scripts on your own PC from your phone. Local AI. No cloud, no accounts.`

**Full Description (Max 4000 chars):**
```
Butler AI turns your Android phone into a remote for the PC you already own.

Install the free, open-source Butler AI server (a single Python script) on your Windows, Mac, or Linux computer. Scan the QR code it shows on screen. From that moment, you can run Python scripts and terminal commands on that PC from your phone — over your own home Wi-Fi. Nothing goes to the cloud.

⚠ REMOTE PC CONTROL DISCLOSURE ⚠
This app remotely executes commands and Python scripts on YOUR OWN personal computer over YOUR OWN local Wi-Fi network. It is designed for developers and technical users who understand command-line automation. EVERY command requires a manual tap — nothing runs automatically, ever. The app cannot connect to any computer you have not physically paired by scanning a QR code shown on that computer's screen.

── WHAT MAKES IT DIFFERENT ──

✦ LOCAL-FIRST — Your phone talks directly to your PC over your own Wi-Fi. There is no Butler AI cloud server, no relay, no middleman.
✦ MANUAL ONLY — Every script and every terminal command requires you to tap Run. No scheduler, no auto-execution, no remote push.
✦ MALICIOUS SCRIPT BLOCKER — Before any script runs, Butler AI scans it for dangerous patterns. Dangerous scripts are blocked before execution.
✦ SCRIPT UNDO — Reverse the last execution with one tap. Undo log kept for 24 hours.
✦ ENCRYPTED — AES-256 + HMAC-SHA256 signed requests. Only your paired phone can send commands.
✦ ZERO TELEMETRY — No analytics, no crash reports, no usage data, no advertising IDs collected.
✦ OPEN SOURCE SERVER — The PC server (butler_server.py) is free, open-source, and auditable on GitHub.

── WHAT YOU CAN DO ──

• Run any Python script on your PC — one tap from your phone
• Chat with a local Ollama AI model (no API key, no subscription, no cloud)
• Monitor CPU, RAM, and disk usage in real time
• Scan a QR code for instant pairing — no IP address typing required
• 70+ built-in Python automation scripts
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

Requires: Python 3.10+ installed on your PC. Free server download at GitHub.
Requires: Users must be 18+ to use this remote administration tool.
```

**Tags:** remote pc control, python automation, local ai, ollama android, pc script runner
**Category:** Tools

---

## 2. Age Rating and Target Audience Compliance

Google Play has strict rules for remote administration tools.

1. **IARC Content Rating Questionnaire:**
   - Violence: No
   - Sexual content: No
   - Profanity: No
   - User-to-user communication: No (it only talks to your own PC)
   - *Resulting Rating:* **Mature (17+) or Adults Only (18+)** depending on region.

2. **Target Audience (Crucial Step):**
   - In the Play Console "Target audience and content" section, **select ONLY "18 and over"**.
   - Do NOT select any age group under 18.
   - Declare that the app is **NOT** primarily directed at children.
   - *Why?* Apps with remote execution capabilities must be restricted to legally responsible adults to comply with Google Play's Device and Network Abuse policies.

---

## 3. Data Safety Form Answers

Fill out the Data Safety section in Play Console exactly like this:

**Top-level questions:**
- Does your app collect or share any required user data types? **Yes**
- Is all user data encrypted in transit? **Yes**
- Do you provide a way for users to request data deletion? **Yes**
- Data deletion URL: `https://shawnjan-cmd.github.io/privacy-policy-/`

**Data types to declare:**
1. **Device or other IDs**
   - Collected? **Yes**
   - Shared? **No**
   - Processed ephemerally? **No**
   - Required or Optional? **Required**
   - Purpose: **App functionality** (Used for secure pairing with the user's PC)

2. **App activity (App interactions & Other actions)**
   - Collected? **Yes**
   - Shared? **No**
   - Processed ephemerally? **No**
   - Required or Optional? **Required**
   - Purpose: **App functionality** (Connection state, LAN discovery)

**Do NOT declare:** Location, Contacts, Photos/Videos (Camera is only used for live QR scanning, images are never saved or collected).

---

## 4. App Access Instructions for Reviewers

Google Play reviewers MUST be able to test the app. Since it requires a PC server, you must provide a demo server or clear instructions.

**Paste this into the App Access section in Play Console:**
```
Butler AI requires a paired PC server. For review without a real PC:

1. Open app → tap through 6 welcome screens → accept all 3 consent checkboxes
2. On Home screen → tap SCAN QR TO PAIR button
3. In QR modal → tap MANUAL IP tab
4. Tap the amber "DEMO SERVER — No PC Required" button for connection details
5. Enter the demo IP and port 5000 → tap CONNECT
6. App pairs and shows live metrics, scripts, and AI chat

REVIEWER NOTES:
- Camera = QR pairing ONLY. No photos stored or transmitted.
- Every script requires manual tap. Nothing auto-executes.
- MALICIOUS SCRIPT BLOCKER blocks dangerous commands before execution.
- Data deletion: Settings → Personal Files & Account → Delete All My Data
- LAN scan consent dialog shown before first scan
- All 3 consent checkboxes on Safety screen must be checked before continuing
```

---

## 5. Notes for Reviewer (Device and Network Abuse Policy)

**Paste this into the "Notes for reviewer" section to prevent rejection for Device and Network Abuse:**
```
Regarding Device and Network Abuse Policy compliance:
Butler AI is a local remote administration tool. It ONLY connects to a server the user installs on their OWN computer on their OWN local Wi-Fi.
- It is NOT a hacking tool. It cannot connect to unauthenticated PCs.
- Connection requires PHYSICAL presence at the PC to scan its QR code.
- EVERY command requires a manual user tap. There is no auto-execution or background execution.
- The app NEVER downloads or installs executable code from external sources.
- A built-in Malicious Script Blocker prevents destructive commands (like rm -rf or format) BEFORE execution.
- It does NOT use Accessibility Service, SYSTEM_ALERT_WINDOW, or REQUEST_INSTALL_PACKAGES.
- Target audience is strictly set to 18+ as this is a developer tool.
```
