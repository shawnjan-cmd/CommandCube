# Butler AI — Data Safety Form (Play Console)

This document provides the exact answers to enter in the Google Play Console Data Safety section.
Navigate to: **Play Console → App content → Data safety**

---

## Section 1: Data Collection and Security

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Do you provide a way for users to request that their data is deleted? | **Yes** |
| Data deletion URL | `https://shawnjan-cmd.github.io/privacy-policy-/` |

---

## Section 2: Data Types to Declare

### Device or Other IDs

| Field | Value |
|---|---|
| Data type | **Device or other IDs** |
| Collected? | **Yes** |
| Shared with third parties? | **No** |
| Is this data processed ephemerally? | **No** |
| Is collection of this data required, or can users opt out? | **Required** |
| Why is this data collected? | **App functionality** |
| Description | A random UUID generated at first launch, stored locally, and sent only to the user's own PC server on their local network for device-lock pairing authentication. |

### App Activity

| Field | Value |
|---|---|
| Data type | **App interactions** |
| Collected? | **Yes** |
| Shared with third parties? | **No** |
| Is this data processed ephemerally? | **No** |
| Is collection of this data required, or can users opt out? | **Required** |
| Why is this data collected? | **App functionality** |
| Description | Connection state, server IP/port settings, and script execution history stored locally on the user's device. Used for reconnection and undo functionality. |

---

## Section 3: Data Types NOT to Declare

The following data types should **NOT** be declared, as they are not collected:

| Data Type | Reason Not Declared |
|---|---|
| Photos and videos | Camera is used only for live QR code scanning. No images are captured, stored, or transmitted. |
| Location | Never accessed. |
| Contacts | Never accessed. |
| SMS or MMS | Never accessed. |
| Microphone | Never accessed. |
| Precise location | Never accessed. |
| Approximate location | Never accessed. |
| Financial info | Never accessed. |
| Health and fitness | Never accessed. |
| Messages | Never accessed. |
| Web browsing | Never accessed. |
| Crash logs | No crash reporting SDK is included. |
| Diagnostics | No analytics SDK is included. |

---

## Section 4: Other Declarations

| Question | Answer |
|---|---|
| Is your app primarily directed at children? | **No** |
| Target audience | **Ages 18 and over only** |
| Does your app contain ads? | **No** |
| Does your app include in-app purchases? | **No** |
| Does your app use the Families Self-Certified Ads SDK? | **No** |

---

## Section 5: Independent Security Review

This app has not undergone a formal MASA (Mobile Application Security Assessment) review. If you wish to add the "Independent security review" badge to your listing, you can submit the app for OWASP MASVS review at a later stage. This is optional and not required for submission.

---

## Notes for Reviewer (Device and Network Abuse)

Paste the following into the **Notes for reviewer** field in Play Console to proactively address Device and Network Abuse policy concerns:

```
Butler AI: PC Automation is a local-network remote administration tool.

KEY COMPLIANCE POINTS:
1. The app ONLY connects to a server the user installs on their OWN computer.
2. Connection requires PHYSICAL presence at the PC to scan its QR code.
3. EVERY command requires a manual user tap — no auto-execution, no scheduler.
4. The app NEVER downloads or installs executable code from external sources.
5. A built-in Malicious Script Blocker prevents destructive commands before execution.
6. The app does NOT use Accessibility Service, SYSTEM_ALERT_WINDOW, or REQUEST_INSTALL_PACKAGES.
7. Target audience is strictly 18+ — this is a developer tool for technically proficient adults.
8. All traffic is AES-256 encrypted and HMAC-SHA256 signed.

HOW TO TEST (Demo Mode):
1. Launch app → complete 6-screen onboarding → accept all 3 consent checkboxes
2. Home → SCAN QR TO PAIR → MANUAL IP tab → tap amber DEMO SERVER button
3. Follow the demo connection instructions shown on screen

DATA DELETION: Settings → Personal Files & Account → Delete All My Data
```
