# Butler AI — Prominent Disclosures Compliance

This document verifies that all required prominent disclosures are properly displayed in the app, as required by Google Play's User Data policy and Device and Network Abuse policy.

---

## 1. Remote PC Control Disclosure

**Policy requirement:** Apps that remotely execute commands on user devices must prominently disclose this functionality before any execution occurs.

**Status: COMPLIANT**

| Disclosure Location | Content | Status |
|---|---|---|
| Play Store full description | "⚠ REMOTE PC CONTROL DISCLOSURE ⚠ This app remotely executes commands and Python scripts on YOUR OWN personal computer..." | ✅ Present |
| Onboarding Screen 3 (Safety) | Three mandatory consent checkboxes — must all be checked before proceeding | ✅ Present |
| Script execution screen | "Every command requires a manual tap — nothing runs automatically" | ✅ Present |
| App Store short description | "Run scripts on your own PC from your phone. Local AI. No cloud, no accounts." | ✅ Present |

---

## 2. Camera Permission Disclosure

**Policy requirement:** Apps that use the camera must show a prominent in-app disclosure before requesting the OS camera permission, explaining why the camera is needed.

**Status: COMPLIANT**

| Disclosure Location | Content | Status |
|---|---|---|
| Pre-permission dialog | "Butler AI uses your camera ONLY to scan the QR code displayed on your PC screen. No photos are taken, stored, or transmitted." | ✅ Present (shown before OS prompt) |
| Play Store description | "CAMERA — Used ONLY to scan the one-time pairing QR code shown on your PC. No photos taken. No images stored or transmitted anywhere." | ✅ Present |
| Privacy Policy Section 3 | Full explanation of camera use | ✅ Present |

---

## 3. Local Network Scan Disclosure

**Policy requirement:** Apps that scan local networks must disclose this and obtain user consent before performing the scan.

**Status: COMPLIANT**

| Disclosure Location | Content | Status |
|---|---|---|
| Pre-scan consent dialog | Explicit consent dialog shown before any LAN discovery scan is initiated | ✅ Present |
| Play Store description | "LOCAL NETWORK — Used to find your PC on your own Wi-Fi (one-time scan, shown before it runs, with your explicit consent). Never scans the public internet." | ✅ Present |
| Privacy Policy Section 3 | Full explanation of network access | ✅ Present |

---

## 4. Age Restriction Disclosure (18+)

**Policy requirement:** Apps with 18+ target audience must clearly communicate the age restriction.

**Status: COMPLIANT**

| Disclosure Location | Content | Status |
|---|---|---|
| Onboarding Screen 3 (Safety) | Consent checkbox: "I confirm I am 18 years or older and understand this is a remote administration tool" | ✅ Present |
| Play Store full description | "Requires: Users must be 18+ to use this remote administration tool" | ✅ Present |
| Privacy Policy Section 1 | "Butler AI is designed exclusively for users 18 years of age and older" | ✅ Present |
| Terms of Service | Age confirmation requirement | ✅ Present |
| Play Console Target Audience | Set to "Ages 18 and over" | ✅ Required action |

---

## 5. Data Deletion Disclosure

**Policy requirement:** Apps that collect user data must provide a way for users to delete their data and disclose this mechanism.

**Status: COMPLIANT**

| Disclosure Location | Content | Status |
|---|---|---|
| In-app (Settings) | Settings → Personal Files & Account → Delete All My Data | ✅ Present |
| Onboarding Screen 6 (All Set) | Link to Data Safety and Delete My Data | ✅ Present |
| Privacy Policy Section 10 | Full data retention and deletion instructions | ✅ Present |
| Play Console Data Safety form | Data deletion URL provided | ✅ Required action |
| Play Store description | "Data deletion: Settings → Personal Files & Account → Delete All My Data" | ✅ Present |

---

## 6. Data Safety Section Disclosure

**Policy requirement:** All developers must complete the Data Safety form in Play Console and the information must accurately reflect the app's data practices.

**Status: ACTION REQUIRED**

The `DATA_SAFETY_FORM.md` file in this package contains the exact answers to enter. You must complete this form manually in Play Console.

---

## 7. Privacy Policy Disclosure

**Policy requirement:** All apps must have a privacy policy URL provided in Play Console and the policy must be accessible without login.

**Status: COMPLIANT (verify URL is live)**

| Item | Value | Status |
|---|---|---|
| Privacy Policy URL | `https://shawnjan-cmd.github.io/privacy-policy-/` | ✅ Must be live and accessible |
| Shown in onboarding | Screen 1 (Welcome) and Screen 6 (All Set) | ✅ Present |
| Shown in app settings | Settings screen | ✅ Present |

**Verification checklist:**
- [ ] Open `https://shawnjan-cmd.github.io/privacy-policy-/` in incognito mode
- [ ] Confirm it loads without login
- [ ] Confirm it mentions: data collected, how it's used, how to delete it
- [ ] Confirm it is accessible from a mobile browser

---

## Summary Checklist

| Disclosure | In-App | Play Store | Policy Doc | Status |
|---|---|---|---|---|
| Remote PC control | ✅ | ✅ | ✅ | COMPLIANT |
| Camera use | ✅ | ✅ | ✅ | COMPLIANT |
| LAN scan | ✅ | ✅ | ✅ | COMPLIANT |
| 18+ age restriction | ✅ | ✅ | ✅ | COMPLIANT |
| Data deletion | ✅ | ✅ | ✅ | COMPLIANT |
| Data safety form | — | — | — | ACTION REQUIRED in Play Console |
| Privacy policy URL | ✅ | ✅ | ✅ | Verify URL is live |
