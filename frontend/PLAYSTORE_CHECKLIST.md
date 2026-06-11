# BOTER — Google Play Store Submission Checklist

## ✅ Technical Requirements (All Complete)

| Requirement | Status | Details |
|---|---|---|
| Target SDK | ✅ API 34 (Android 14) | Set in app.json via expo-build-properties |
| Min SDK | ✅ API 26 (Android 8.0) | Covers ~97% of Android devices |
| 64-bit support | ✅ Hermes engine | Expo/React Native handles this |
| App Bundle (AAB) | ✅ Ready | Use `eas build --platform android` |
| Adaptive Icon | ✅ Set | assets/adaptive-icon.png |
| No legacy storage perms | ✅ Blocked | READ/WRITE_EXTERNAL_STORAGE blocked |
| No background recording | ✅ None | RECORD_AUDIO blocked |
| Privacy Policy URL | ✅ Required | See STORE_LISTING.md |

## ✅ Play Console Required Items

| Item | Status | Action Needed |
|---|---|---|
| Privacy Policy URL | ✅ In-app + needed online | Host PRIVACY_POLICY.md publicly |
| Data Safety Form | ✅ Template below | Fill in Play Console |
| Content Rating | ✅ Everyone | IARC questionnaire in Play Console |
| Store Listing | ✅ See STORE_LISTING.md | Copy-paste content |
| APK/AAB Upload | 🔄 Build needed | Run EAS build |
| Screenshots | 🔄 Capture needed | Use app on device |
| Feature Graphic | 🔄 Design needed | 1024x500px banner |

## ✅ Policy Compliance

| Policy | Status |
|---|---|
| No unauthorized data collection | ✅ No data collected |
| Camera permission justified | ✅ QR scan only |
| Network permission justified | ✅ Local LAN only |
| No misleading functionality | ✅ App does what it says |
| No malware/spyware | ✅ Self-hosted LAN tool |
| Privacy Policy accessible | ✅ In-app (Settings) |
| Content rating appropriate | ✅ Everyone |
| No ads | ✅ Ad-free |

## 📋 Data Safety Form Answers

In Play Console → App content → Data safety, select:

**Does your app collect or share any of the required user data types?**
- Select: **No**

**Is all of the user data collected by your app encrypted in transit?**
- Select: **Yes**

**Do you provide a way for users to request that their data is deleted?**
- Select: **Yes** (uninstall the app)

If you use optional Gemini AI:
- Data type: **App activity** → Messages
- Shared with: Google (third party)
- Purpose: App functionality
- Encrypted: Yes
- Users can delete: Yes (clear chat)

## 🏪 Content Rating

IARC questionnaire answers:
- Violence: **None**
- Sexual content: **None**
- Language: **None**
- Controlled substances: **None**
- Gambling: **None**

Expected rating: **Everyone (E)** / **PEGI 3**

## 📸 Screenshot Requirements

Capture these screens for Play Store:
1. Home screen with robot banner and connection panel
2. Scripts page with T-800 skull banner and script cards
3. Butler AI chat interface
4. Script execution modal with output
5. Settings page with compliance section
6. Knowledge Base / Brain tab

Resolution requirements:
- Phone: 1080x1920 minimum (portrait)
- Tablet (optional): 1200x1600 minimum
- Feature graphic: 1024x500px

## 🔗 Required URLs to Set Up

1. **Privacy Policy URL** (required): 
   - Host PRIVACY_POLICY.md on GitHub Pages or any static host
   - Example: `https://yourusername.github.io/boter-privacy`
   
2. **Support Email** (required):
   - Set to: contact@onspace.ai or your email

3. **Website URL** (optional but recommended):
   - Your app's landing page
