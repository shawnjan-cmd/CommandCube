# 🚀 BUTLER AI — COMPLETE PLAY STORE AUTOMATION GUIDE
## Do This Once → Never Touch It Again

---

## PART 1: HOST YOUR PRIVACY POLICY (5 MINUTES, FREE, PERMANENT)

### Using GitHub Pages (Recommended — Google trusts it)

**Step 1 — Create GitHub Pages repo:**
1. Go to https://github.com/shawnjan-cmd
2. Click "+" → "New repository"
3. Name it: `butler-ai-privacy` (or any name)
4. Set visibility: **Public**
5. Check "Add a README file"
6. Click **Create repository**

**Step 2 — Upload the privacy policy HTML:**
1. In your new repo, click "Add file" → "Upload files"
2. Upload the file: `docs/privacy-policy.html` from this project
3. Rename it to `index.html` when uploading
4. Commit changes

**Step 3 — Enable GitHub Pages:**
1. Go to Settings → Pages (left sidebar)
2. Source: **Deploy from a branch**
3. Branch: **main**, folder: **/ (root)**
4. Click **Save**
5. Wait ~60 seconds → your URL is live:
   `https://shawnjan-cmd.github.io/butler-ai-privacy/`

**Step 4 — Paste URL in Play Console:**
- Play Console → Policy → App content → Privacy policy
- Paste: `https://shawnjan-cmd.github.io/butler-ai-privacy/`
- Save ✓

---

## PART 2: COMPLETE PLAY CONSOLE CHECKLIST (DO ONCE)

### A. App Content (Required for Camera permission)
- [ ] Policy → App content → Privacy policy → paste your GitHub Pages URL
- [ ] Policy → App content → Ads → "No, my app does not contain ads"
- [ ] Policy → App content → App access → "All functionality is available without special access"
- [ ] Policy → App content → Content ratings → Complete questionnaire:
  - Violence: NO | Adult content: NO | Gambling: NO | Language: NO
  - Result: **Everyone** rating
- [ ] Policy → App content → Target audience → "Adults (18+)" or "Everyone"
- [ ] Policy → App content → News app → "No, not a news app"
- [ ] Policy → App content → COVID-19 apps → "No"
- [ ] Policy → App content → Data safety → See Section D below

### B. Store Listing (Required for public release, optional for internal testing)
**App name (30 chars max):**
```
Butler AI Automation
```

**Short description (80 chars max):**
```
Run Python scripts on your PC from your phone. Local AI, no cloud, no accounts.
```

**Full description (copy this exactly):**
```
Butler AI connects your Android phone to your PC over home Wi-Fi. Run any Python script, chat with local Ollama AI, monitor CPU/RAM/Disk, and transfer files — all without cloud, accounts, or subscriptions.

⚡ WHAT IT DOES
• Run Python scripts on your PC — one tap from your phone
• Chat with local Ollama AI (Qwen, Mistral, Llama) — no API key
• Monitor CPU, RAM, Disk in real time
• Scan QR code for instant PC pairing
• 70+ built-in automation scripts (system info, file ops, network, etc.)
• Schedule and automate Python workflows
• File transfer between phone and PC
• Knowledge Base that learns from your usage

🔒 PRIVACY FIRST
• 100% self-hosted — runs on YOUR PC over YOUR WiFi
• Zero data collection — nothing leaves your local network
• No cloud, no accounts, no subscriptions required
• No analytics, no tracking, no data collection
• Camera used only for QR pairing — nothing stored or transmitted

📖 OPEN SOURCE SERVER
• butler_server.py is plain Python — readable and auditable
• MIT licensed — fork and modify freely
• Auto-installs all dependencies on first run

Requires Python 3.10+ on your PC. Free forever.
```

### C. Graphics (Required for production)
Upload from `assets/images/` folder in this project:

| Field | File | Size |
|-------|------|------|
| App icon (512×512) | `playstore-icon-512.png` | 512×512 PNG |
| Feature graphic | `play-store-feature-graphic.png` | 1024×500 PNG |
| Phone screenshot 1 | `playstore-screenshot-1-home.png` | 1080×1920 |
| Phone screenshot 2 | `playstore-screenshot-2-scripts.png` | 1080×1920 |
| Phone screenshot 3 | `playstore-screenshot-3-chat.png` | 1080×1920 |
| Phone screenshot 4 | `playstore-screenshot-4-terminal.png` | 1080×1920 |

### D. Data Safety (Copy these answers into Play Console)

**Data collection and security:**
- Does your app collect or share any of the required user data types? → **YES** (device/app IDs for pairing)
- Is all data in transit encrypted? → **YES**
- Do you provide a way for users to request data deletion? → **YES**

**Data types to declare:**
- Device or other IDs → Collected, not shared, not used for tracking
  - Purpose: App functionality (device pairing)
  - Optional/Required: Required
  - Encrypted in transit: Yes
  - Users can request deletion: Yes

**Everything else → NOT collected:**
- Location: NOT collected
- Personal info: NOT collected
- Financial info: NOT collected
- Health info: NOT collected
- Messages: NOT collected
- Photos and videos: NOT collected (camera used for QR only — no photos stored)
- Audio: NOT collected
- Files: NOT collected
- Calendar: NOT collected
- Contacts: NOT collected
- App activity: NOT collected
- Web browsing: NOT collected
- App info and performance: NOT collected

### E. Release Notes (Paste in Release Notes field)
```
<en-US>
Butler AI v5.0 — Φ-NEXUS Edition

• New: Φ-NEXUS Bridge — local AI knowledge engine with auto-growth
• New: OMEGA Scanner — self-healing knowledge base with auto-fix
• New: Quantum Link Harvester — auto-discovers Python resources
• New: Script Only Mode — hide AI tabs for pure automation focus
• New: File Share tab — transfer files between phone and PC
• New: Knowledge Base auto-seeded with 70+ Python automation scripts
• Improved: Auto-connect engine — never loses connection
• Improved: Butler AI chat with local Ollama model support
• Fixed: TextDecoder crash on Android/Hermes devices
• Fixed: Device pairing "locked to another device" error
• Security: HMAC-SHA256 session authentication with 30-day expiry
• Privacy: Zero data collection confirmed — all data stays on-device
</en-US>
```

### F. Advertising ID Declaration
- Play Console → Policy → App content → Advertising ID
- Answer: **"This app does not use advertising ID"**
- Save ✓

---

## PART 3: AUTOMATE FUTURE UPLOADS WITH EAS SUBMIT

### One-Time Setup (Never repeat this)

**Step 1 — Install EAS CLI:**
```bash
npm install -g eas-cli
eas login
```

**Step 2 — Create Google Service Account (one-time):**
1. Go to: https://console.cloud.google.com
2. Select your project (or create one)
3. APIs & Services → Credentials → Create Credentials → Service Account
4. Name: "butler-ai-play-store"
5. Role: "Service Account User"
6. Click Done → then click the service account → Keys → Add Key → JSON
7. Download the JSON file → save as `google-service-account.json`

**Step 3 — Link Service Account to Play Console:**
1. Play Console → Setup → API access
2. "Link to Google Cloud Project" → select your project
3. Grant access to your service account
4. Permission: **Release manager** (minimum required)
5. Save

**Step 4 — Configure EAS Submit:**
```bash
eas submit:configure --platform android
```
Or paste into `eas.json` (already created in this project):
```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### Future Uploads (ONE COMMAND)
After completing the one-time setup above, every future upload is:
```bash
eas submit --platform android --path ./Butler_AI_Automation.aab --profile production
```
Or to build AND submit in one step:
```bash
eas build --platform android --profile production --auto-submit
```

**IMPORTANT:** Google requires you to upload the FIRST AAB manually (which you've already done). All future uploads can use EAS Submit automatically.

---

## PART 4: INTERNAL TESTING CHECKLIST (RIGHT NOW)

To get past your current screen and install on your phone:

- [ ] **1.** Fix Advertising ID: Policy → App content → Advertising ID → "Does not use" → Save
- [ ] **2.** Add testers: Internal testing → Testers → Create email list → add your Gmail → Save
- [ ] **3.** Set Privacy Policy: Policy → App content → Privacy Policy → paste GitHub Pages URL → Save
- [ ] **4.** Re-upload AAB in release: Internal testing → Create new release → Upload `.aab`
- [ ] **5.** Fill release notes (copy from Section E above)
- [ ] **6.** Click Next → Review → Start rollout to Internal testing
- [ ] **7.** Share install link with yourself → Install on phone via Play Store

---

## PART 5: PRODUCTION LAUNCH CHECKLIST

When ready for public release:

- [ ] All store listing fields filled (Section B above)
- [ ] All 5 graphics uploaded (Section C above)
- [ ] Data Safety section complete (Section D above)
- [ ] Content rating completed (Everyone)
- [ ] Privacy policy URL set
- [ ] Advertising ID declared
- [ ] At least 20 internal test installs done (recommended)
- [ ] Production release created → "Roll out to Production"

---

## QUICK REFERENCE — PLAY CONSOLE URLS

| Section | URL |
|---------|-----|
| App content | https://play.google.com/console → Policy → App content |
| Data safety | https://play.google.com/console → Policy → App content → Data safety |
| Store listing | https://play.google.com/console → Grow → Store presence → Main store listing |
| Internal testing | https://play.google.com/console → Release → Testing → Internal testing |
| Advertising ID | https://play.google.com/console → Policy → App content → Advertising ID |

---

## TROUBLESHOOTING

| Error | Fix |
|-------|-----|
| "Requires privacy policy (CAMERA)" | Set privacy policy URL in Policy → App content → Privacy policy |
| "Advertising ID declaration required" | Policy → App content → Advertising ID → "Does not use" |
| "No testers configured" | Internal testing → Testers → Create email list |
| "No app bundles" | Upload AAB in Internal testing → Create new release |
| "Package name already taken" | Your package `com.butlerai.pc.automation` is already registered ✓ |
| EAS Submit "first upload manually" | Already done ✓ — future uploads can use EAS |

