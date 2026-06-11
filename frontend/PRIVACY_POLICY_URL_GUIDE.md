# Privacy Policy URL — Play Store Fix

## The Problem
The Play Console requires a **publicly accessible** privacy policy URL for any app that uses the CAMERA permission.

## Your Privacy Policy URL Options (pick one)

### Option A — GitHub Gist (Fastest, Free, Google can index it)
1. Go to https://gist.github.com
2. Sign in with GitHub
3. Create a new Gist → paste the content from `PRIVACY_POLICY.md` in this project
4. Set filename to `privacy_policy.md`
5. Click "Create public gist"
6. Copy the URL (e.g. https://gist.github.com/yourusername/abc123)
7. Paste that URL in Play Console → Policy → App content → Privacy policy

### Option B — Google Sites (Free, Google trusts it)
1. Go to https://sites.google.com
2. Create a new site called "Butler AI Privacy Policy"
3. Add a page with the privacy policy text
4. Publish it
5. Use that URL in Play Console

### Option C — Use the Play Console URL field directly (no code change needed)
The warning in your screenshot is NOT blocking — the AAB uploaded fine.
Just click **Next** and proceed. Then separately go to:
  Play Console → Policy → App content → Privacy policy
  Enter: https://www.onspace.ai/share/9bednl (or your new URL)

## Play Console Steps to Fix the Warning
1. The camera warning is INFORMATIONAL only — click **Next** to proceed with the release
2. Go to Play Console sidebar → **Policy** → **App content**
3. Find **Privacy policy** section
4. Enter your public privacy policy URL
5. Save

## Privacy Policy Text
Use the content from `PRIVACY_POLICY.md` in this project — it covers all Play Store requirements:
- Data collected (none)
- Camera permission explanation (QR scan only)
- Contact email
- GDPR compliance

## In-App Privacy Policy
The app already has a full built-in privacy policy at `app/privacy-policy.tsx`
This shows correctly inside the app when users tap Settings → Privacy Policy.
