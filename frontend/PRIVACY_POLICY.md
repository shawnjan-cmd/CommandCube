# Butler AI: PC Automation — Privacy Policy

**App Name:** Butler AI: PC Automation
**Developer:** Andrej Sladkovic
**Contact:** andrejsladkovic1992@gmail.com
**App Version:** 6.0
**Last Updated:** May 18, 2026
**Effective Date:** May 18, 2026

> **Privacy Policy URL (use this in Play Console):**
> `https://shawnjan-cmd.github.io/privacy-policy-/`

---

## 1. Overview

Butler AI: PC Automation (v6.0), also referred to as "Nexus Command Center" or "CommandCube", is a **local-network, self-hosted** PC automation app. It connects your Android device to a Python server (`butler_server.py`) running on your own PC over your home or office Wi-Fi network.

**Our privacy philosophy is simple: Your data is your own.** The App is built on a local-first, privacy-centric architecture.

**We do not collect, store, transmit, or sell any personal data.**
No data ever leaves your local network or reaches any third party unless you explicitly configure optional AI features — see Section 4.

---

## 2. Information We Do NOT Collect

We do not operate remote servers to collect your data. Specifically, we do not collect, store, or transmit:

- Personal Identifiable Information (PII) such as names, emails, or phone numbers
- Device identifiers, IP addresses, or location data sent to our servers
- Usage analytics, crash logs, or telemetry data
- Chat histories or command logs

## 3. Device Permissions and Usage

All data processed via these permissions remains strictly local to your device.

- **Camera Permission:** Used solely for scanning QR codes to pair your mobile device with your local desktop server. The camera feed is processed locally and discarded immediately. No images or videos are captured, stored, or transmitted.
- **Local Network (LAN) Access:** The App communicates directly over your Local Area Network to interface with your own PC (to fetch system vitals, execute scripts, and send commands). This traffic is routed directly between your mobile device and your computer — it never passes through our servers.
- **Local Storage:** The App uses your device's secure local storage to save user preferences, scripts, and pairing configurations (such as your local IP and port). This data never leaves your device and is permanently deleted if you uninstall the App.

## 4. Data We Collect

### 4.1 Data Collected by Butler AI: NONE

| Data Type | Collected? | Notes |
|-----------|-----------|-------|
| Name or identity | ❌ No | Never requested |
| Email address | ❌ No | No account required |
| Phone number | ❌ No | Never requested |
| Location (GPS) | ❌ No | Not accessed |
| Contacts | ❌ No | Not accessed |
| Camera | ⚠️ QR only | Only for QR code scanning to pair with your PC. Images processed locally, never stored or transmitted. |
| Microphone | ❌ No | Not accessed |
| Files / Storage | ❌ No | App reads no external files |
| Device identifiers | ⚠️ Local only | A random UUID is generated on first launch, stored locally, sent only to your own PC server on your local network. |
| Usage analytics | ❌ No | No analytics SDK included |
| Crash reports | ❌ No | No crash reporting SDK included |
| Payment info | ❌ No | App is free, no purchases |

### 4.2 Data Stored Locally on Your Device

The following data is stored in your device's private `AsyncStorage` (never accessible to other apps or any server):

- **Server IP / Port** — IP address of your PC server on your local network
- **Session Token** — Cryptographic bearer token for authenticating with your PC server
- **Device ID** — Random UUID string for device-lock pairing with your PC
- **Knowledge Base** — Python automation knowledge you crawl or manually enter (your data, stored locally)
- **Script Library** — Python scripts you create or import (your data, stored locally)
- **Chat History** — Butler AI conversation history (your data, stored locally)
- **Settings** — App configuration preferences

**All locally stored data is deleted automatically when you uninstall the app.**

No data is ever transmitted to the developer, to any analytics service, or to any third party without explicit user action.

---

## 5. Data Sharing

### We share NO data with any third parties.

| Recipient | Data Shared | Purpose |
|-----------|-------------|---------|
| Third-party analytics | ❌ None | N/A |
| Advertising networks | ❌ None | N/A |
| Data brokers | ❌ None | N/A |
| Cloud databases | ❌ None | N/A |
| Your PC server (butler_server.py) | Device ID + Session Token | Authentication only — on your local network |

The only "server" Butler AI communicates with is `butler_server.py` running on your own personal computer. You control this server entirely. No data passes through any infrastructure we own or operate.

---

## 6. Optional Third-Party Services

### 4.1 Local Ollama AI (Default — Fully Private)

By default, Butler AI uses a local Ollama AI model running on your own PC. No data leaves your network.

- **What is sent:** Your chat message is sent over your local WiFi to your own PC server
- **What is NOT sent:** Nothing goes to any external server
- **Privacy:** Completely private — all processing on your hardware

### 4.2 Google Gemini AI (Optional — User-Configured)

If you configure a Gemini API key in Settings, Butler AI can optionally send chat messages to Google's Gemini API.

- **What is sent:** Your typed messages and conversation context only
- **What is NOT sent:** Your name, email, device ID, location, or any personal identifiers
- **Google's Privacy Policy:** https://policies.google.com/privacy
- **You can disable this** by removing the Gemini API key in Settings
- **Default state:** Disabled — Ollama local AI is used by default

---

## 7. Security Practices

### 5.1 Network Security
- All communication between the app and your PC occurs on your **local network only** (LAN — 192.168.x.x, 10.x.x.x)
- Authentication uses **64-character cryptographic Bearer tokens** generated with `secrets.token_urlsafe(64)`
- Token comparison uses **constant-time comparison** (`secrets.compare_digest`) to prevent timing attacks
- Optional **TLS/HTTPS encryption** via self-signed certificate (generated by `butler_server.py`)
- The PC server implements **rate limiting** (60 requests/IP/minute) to prevent abuse
- **Single-device lock**: the PC server can only be paired to ONE device at a time

### 5.2 Script Execution Safety
- All Python scripts are scanned for dangerous patterns before execution
- **Banned patterns:** `os.system`, `eval`, `exec`, `shell=True`, reading `/etc` paths
- Scripts run with a **30-second timeout** and a **64KB size limit**
- Scripts run as the user who launched `butler_server.py` — with the same permissions they already have

### 5.3 Data Protection
- All local data is stored in Android's private `AsyncStorage` — inaccessible to other apps
- No data is encrypted at rest beyond Android's standard storage encryption
- No backups of app data are created to external services
- All data is permanently deleted on app uninstall

---

## 8. Permissions Used

| Permission | Why It Is Used |
|-----------|---------------|
| `CAMERA` | Scanning QR codes displayed by `butler_server.py` on your PC to pair. The camera is only activated when you tap "SCAN QR CODE". No images are stored. |
| `INTERNET` | Communicating with your local PC server. Optionally used with Google Gemini API if you enable that feature in Settings. |

**No other permissions are requested.**

Butler AI does NOT use:
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `READ_CONTACTS` / `WRITE_CONTACTS`
- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE`
- `READ_PHONE_STATE`
- `RECORD_AUDIO`
- Any background location or activity recognition permissions

---

## 9. Children's Privacy

Butler AI is not directed at children under 18 years of age. This App is a developer tool intended for adults only. We do not knowingly collect any personal information from minors. If you believe a child under 18 has used the app, please contact us at andrejsladkovic1992@gmail.com — there is no personal data to delete as none is collected, but we will confirm this promptly.

---

## 10. Data Retention and Deletion

| Data | Retention | Deletion |
|------|----------|---------|
| Local KB / Scripts / Settings | Until you clear the app or uninstall | Clear via Settings → Clear Knowledge Base, or uninstall app |
| Chat History | Until you tap "Clear Chat" | Tap Clear Chat in Butler AI tab |
| Session Token | Until you disconnect or server resets | Tap DISCONNECT in Connect tab |
| Gemini request data | Not retained by Butler AI | See Google's privacy policy |

**To delete all your data:** Uninstall Butler AI: PC Automation from your device. All `AsyncStorage` data is deleted automatically by Android.

---

## 11. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of material changes by updating the "Last Updated" date above. Continued use of the app after changes constitutes acceptance of the updated policy.

---

## 12. Contact

If you have questions about this Privacy Policy, please contact:

**Developer:** Andrej Sladkovic
**Email:** andrejsladkovic1992@gmail.com
**GitHub:** https://github.com/shawnjan-cmd/butler-ai

---

## 13. Google Play Data Safety Summary

| Question | Answer |
|---------|--------|
| Does your app collect or share user data? | No personal data is collected or shared |
| Is data collected encrypted in transit? | Yes — HTTPS to Gemini (if enabled); optional TLS to local PC |
| Do you provide a way for users to request data deletion? | Yes — uninstall the app (all data permanently deleted by Android) |
| Does the app share data with third parties? | Only anonymized chat text with Gemini, opt-in only, no PII |

---

*This privacy policy was last reviewed for compliance with Google Play Developer Programme Policies, GDPR, CCPA, and COPPA on May 18, 2026. App Version: 7.1.0. Target audience: 18+ only.*
