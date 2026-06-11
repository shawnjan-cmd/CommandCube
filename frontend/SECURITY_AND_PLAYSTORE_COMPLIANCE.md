# 🔒 BOTLER SECURITY & PLAY STORE COMPLIANCE GUIDE

## Overview
Botler is a **remote PC automation app** that allows users to execute scripts on their own computers from their phone. This guide explains security requirements and Play Store compliance for publishing your app.

---

## ⚠️ CRITICAL: Play Store Policy for Remote Automation Apps

### What Google Requires

1. **Clear User Disclosure**
   - App description MUST clearly state: "This app allows remote script execution on your own PC"
   - Privacy Policy MUST explain data handling and remote execution
   - First-time setup MUST show warning/consent dialog

2. **Security Requirements**
   - Authentication MUST be enabled (no anonymous access)
   - Encryption STRONGLY recommended (HTTPS/TLS)
   - User consent required before each script execution (or setting to enable)
   - Audit logging of all executed scripts

3. **Prohibited Activities**
   - ❌ Executing arbitrary malicious code from third parties
   - ❌ Allowing unauthorized access to user's PC
   - ❌ Hiding remote execution functionality
   - ❌ Bypassing system security

4. **Age Rating**
   - Set to **18+ (Target Audience)** and IARC rating accordingly
   - Include content warning: "Remote system administration tools"

---

## 🛡️ SECURITY CHECKLIST FOR YOUR SERVER

### ✅ LEVEL 1: MINIMUM REQUIRED (Play Store Acceptance)

#### 1. **Authentication**
```python
# In your Python server (botler_server.py)

USERNAME = "your_secure_username"
PASSWORD = "your_strong_password_here"  # Min 12 characters

@app.before_request
def require_auth():
    auth = request.authorization
    if not auth or auth.username != USERNAME or auth.password != PASSWORD:
        return Response('Authentication required', 401, 
                      {'WWW-Authenticate': 'Basic realm="Botler"'})
```

**Mobile App Side:**
```typescript
// When connecting to server
const headers = {
  'Authorization': `Basic ${btoa(`${username}:${password}`)}`
};
```

#### 2. **User Consent Dialog**
- Show warning on first connection:
  - "You are about to connect to your PC remotely"
  - "Scripts will execute with your PC's permissions"
  - "Only connect to trusted networks"
- Store user's consent decision
- Add checkbox: "I understand and consent to remote script execution"

#### 3. **Privacy Policy** (Required by Google)
Create a simple privacy policy at `yourwebsite.com/privacy.html`:

```markdown
# Privacy Policy for Botler

**What data we collect:**
- None. Botler connects directly to YOUR server.
- No cloud storage, no third-party analytics.

**What the app does:**
- Sends scripts to YOUR Python server on YOUR PC
- Displays output back to your phone
- Stores connection settings locally on your device

**Your responsibility:**
- You control what scripts run on your PC
- You are responsible for securing your PC and network
- Use strong passwords and secure networks

**Age requirement:** 18+ (remote administration tools)
```

Link this in:
- Google Play Console → Store Listing → Privacy Policy URL
- App Settings screen

---

### ✅ LEVEL 2: RECOMMENDED (Better Security)

#### 4. **HTTPS/TLS Encryption**
Prevent eavesdropping on your local network.

**Option A: Self-Signed Certificate (Free, Local Network Only)**
```bash
# Generate SSL certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Run Python server with HTTPS
python botler_server.py --ssl --cert cert.pem --key key.pem
```

**Option B: Let's Encrypt (Free, If Exposing to Internet)**
```bash
# Install certbot
sudo apt install certbot

# Get certificate (requires domain name)
sudo certbot certonly --standalone -d yourdomain.com
```

**Update Mobile App:**
```typescript
const SERVER_URL = 'https://192.168.1.100:8443'; // HTTPS
```

#### 5. **Device Pairing / Whitelist**
Only allow specific devices to connect.

```python
# In Python server
ALLOWED_DEVICES = [
    "device_id_from_phone_1",
    "device_id_from_phone_2"
]

@app.before_request
def check_device():
    device_id = request.headers.get('X-Device-ID')
    if device_id not in ALLOWED_DEVICES:
        return Response('Device not authorized', 403)
```

**Mobile App Side:**
```typescript
// Generate unique device ID on first launch
import * as Application from 'expo-application';

const deviceId = Application.androidId; // Android
// or Application.getIosIdForVendorAsync() for iOS

// Send with every request
headers['X-Device-ID'] = deviceId;
```

---

### ✅ LEVEL 3: ADVANCED (Production-Grade)

#### 6. **Code Sandbox / Execution Limits**
Prevent dangerous commands.

```python
# Blocklist dangerous commands
BLOCKED_COMMANDS = ['rm -rf /', 'del /F /S /Q C:\\', 'format', 'shutdown /r', 'reboot']

def validate_script(script_content):
    for blocked in BLOCKED_COMMANDS:
        if blocked.lower() in script_content.lower():
            return False, f"Blocked command detected: {blocked}"
    return True, ""

@app.post('/api/execute')
def execute_script():
    script = request.json.get('script')
    is_safe, error = validate_script(script)
    if not is_safe:
        return jsonify({'error': error}), 400
    
    # Execute script...
```

#### 7. **Audit Logging**
Track all executed scripts.

```python
import logging
from datetime import datetime

logging.basicConfig(
    filename='botler_audit.log',
    level=logging.INFO,
    format='%(asctime)s | %(message)s'
)

@app.post('/api/execute')
def execute_script():
    user = request.authorization.username
    script = request.json.get('script')
    
    logging.info(f"USER={user} | SCRIPT={script[:100]}... | IP={request.remote_addr}")
    
    # Execute script...
```

#### 8. **Rate Limiting**
Prevent abuse.

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["100 per hour", "10 per minute"]
)

@app.post('/api/execute')
@limiter.limit("5 per minute")  # Max 5 script executions per minute
def execute_script():
    # Execute script...
```

---

## 📱 MOBILE APP SECURITY FEATURES

### Implement These in Your React Native App

#### 1. **First-Launch Security Warning**
```typescript
// On first app launch
const showSecurityWarning = async () => {
  Alert.alert(
    '⚠️ Security Notice',
    'Botler allows remote script execution on your PC.\n\n' +
    '• Only connect on trusted networks\n' +
    '• Use strong passwords\n' +
    '• Review scripts before running\n' +
    '• Scripts run with YOUR PC permissions\n\n' +
    'Do you understand and consent?',
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'I Understand', 
        onPress: () => {
          AsyncStorage.setItem('security_consent', 'true');
        }
      }
    ]
  );
};
```

#### 2. **Script Preview Before Execution**
```typescript
// Before executing any script
const confirmExecution = (scriptName: string, scriptContent: string) => {
  Alert.alert(
    `Execute ${scriptName}?`,
    `Preview:\n${scriptContent.slice(0, 200)}...\n\n` +
    'This script will run on your PC with full permissions.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Execute', onPress: () => executeScript(scriptContent) }
    ]
  );
};
```

#### 3. **Secure Credential Storage**
```typescript
import * as SecureStore from 'expo-secure-store';

// Save credentials securely (not AsyncStorage!)
await SecureStore.setItemAsync('server_password', password);

// Retrieve
const password = await SecureStore.getItemAsync('server_password');
```

#### 4. **Network Security**
```typescript
// Only allow connections on local network (not public internet)
const isLocalNetwork = (ip: string) => {
  return ip.startsWith('192.168.') || 
         ip.startsWith('10.') || 
         ip.startsWith('172.16.');
};

if (!isLocalNetwork(serverIP)) {
  Alert.alert(
    'Warning',
    'Connecting to a public IP is not recommended. Use a VPN for remote access.'
  );
}
```

---

## 🚀 PLAY STORE SUBMISSION CHECKLIST

### Before Submitting

- [ ] Privacy Policy published and linked
- [ ] App description clearly states "Remote PC Automation"
- [ ] Screenshots show security/consent dialogs
- [ ] Content rating set to **Teen (13+)** or higher
- [ ] Authentication enabled in Python server
- [ ] User consent dialog implemented
- [ ] Audit logging enabled
- [ ] Age restriction warning in description

### App Description Template

```
Botler - Remote PC Script Automation

⚠️ IMPORTANT: This app allows remote script execution on YOUR OWN PC. 

Features:
• Run PowerShell, Python, Bash scripts from your phone
• Monitor system health remotely
• Automate routine tasks on your PC
• Secure authentication & encryption support

Requirements:
• Python server running on your PC (included)
• Both devices on same network (or VPN for remote)
• Admin privileges on your PC for certain scripts

Security:
• User authentication required
• Encrypted connections supported
• Audit logging of all actions
• You control what runs on your PC

Age Rating: Mature (17+) or Adults Only (18+) - System administration tools
Privacy: No cloud storage. Direct connection to YOUR server only.

[Privacy Policy Link]
[Support/Documentation Link]
```

---

## 🔍 SECURITY TESTING

### Before Publishing

1. **Test Authentication**
   - Try connecting without credentials → Should fail
   - Try wrong password → Should fail
   - Try correct credentials → Should succeed

2. **Test Dangerous Commands**
   - Try `rm -rf /` → Should be blocked
   - Try `shutdown` → Should be blocked (or show warning)

3. **Test on Public WiFi**
   - Connect phone to public WiFi
   - Try connecting to home PC → Should fail (correct behavior)
   - Explain in app: "Only works on same network"

4. **Test HTTPS Certificate**
   - If using self-signed cert, app should show warning
   - User should be able to trust cert manually

---

## ❓ COMMON PLAY STORE REJECTIONS & FIXES

### Rejection Reason #1: "Remote Code Execution Not Disclosed"
**Fix:** Update app description with clear warning (see template above)

### Rejection Reason #2: "No Privacy Policy"
**Fix:** Create and link privacy policy (see template above)

### Rejection Reason #3: "Security Concerns"
**Fix:** 
- Add screenshots showing authentication screen
- Add consent dialog
- Document security features in description

### Rejection Reason #4: "Inappropriate for Age Rating"
**Fix:** Change to Mature (17+) or Adults Only (18+)

---

## 📞 IF YOUR APP GETS REJECTED

1. **Appeal with Documentation**
   - Send this security guide
   - Explain: "User-controlled automation of THEIR OWN PC"
   - Compare to similar apps: Microsoft Remote Desktop, TeamViewer

2. **Add More Security Warnings**
   - Splash screen: "For Advanced Users Only"
   - In-app tutorial explaining risks
   - Setting to disable dangerous commands

3. **Consider Alternative Distribution**
   - Direct APK download from your website
   - F-Droid (open source app store)
   - Samsung Galaxy Store
   - Amazon Appstore

---

## 🎯 BEST PRACTICES SUMMARY

| Feature | Priority | Difficulty | Impact |
|---------|----------|-----------|---------|
| Authentication | **CRITICAL** | Easy | Blocks unauthorized access |
| User Consent Dialog | **CRITICAL** | Easy | Play Store requirement |
| Privacy Policy | **CRITICAL** | Easy | Play Store requirement |
| HTTPS Encryption | High | Medium | Prevents eavesdropping |
| Device Pairing | High | Medium | Restricts access |
| Audit Logging | Medium | Easy | Tracks activity |
| Command Blocklist | Medium | Medium | Prevents accidents |
| Rate Limiting | Low | Medium | Prevents abuse |

---

## 🆘 NEED HELP?

- **Security Issues:** Review this guide first
- **Play Store Rejection:** Appeal with documentation from this guide
- **Server Setup:** Follow `python_server/SETUP_GUIDE.md`
- **App Issues:** Check `ANDROID_CRASH_FIX.md`

---

## 📚 ADDITIONAL RESOURCES

- [Google Play Policy: Remote Admin Apps](https://support.google.com/googleplay/android-developer/answer/9888379)
- [Android Security Best Practices](https://developer.android.com/privacy-and-security/security-tips)
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [Flask Security Guide](https://flask.palletsprojects.com/en/2.3.x/security/)

---

**Last Updated:** 2026-03-27
**Version:** 1.0
**Botler Version:** v4.0
