/**
 * 🔒 PRIVACY POLICY — Full inline native screen
 * Comprehensive Play Store-compliant policy + Copy button
 * Teal HUD theme · April 13, 2026
 */

import React, { useRef, useEffect, useState, Component } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Animated, Linking, Alert,
} from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { haptics } from '@/services/haptics';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ─── Teal HUD Palette ─────────────────────────────────────────────
const C = {
  bg:      '#040C14',
  panel:   '#071018',
  card:    '#060F18',
  teal:    '#00CCDD',
  tealBrt: '#00EEFF',
  tealDim: '#004455',
  tealMid: '#007788',
  green:   '#44FF88',
  greenDim:'#003322',
  amber:   '#FF8C00',
  red:     '#FF3300',
  purple:  '#8844CC',
  cyan:    '#00DDFF',
  text:    '#336677',
  textBrt: '#88AACC',
  textHi:  '#CCEEFF',
  border:  '#0D1A24',
};

const FALLBACK_URL = 'https://shawnjan-cmd.github.io/privacy-policy-/';

// ─── Full Policy Plain Text (for Copy button) ─────────────────────
const FULL_POLICY_TEXT = `PRIVACY POLICY — Butler AI: PC Automation

Last Updated: April 13, 2026
Effective Date: April 13, 2026
App Name: Butler AI: PC Automation
Package ID: com.butlerai.pc.automation
Developer: Butler AI Dev
Contact: andrejsladkovic1992@gmail.com
Privacy Policy URL: https://shawnjan-cmd.github.io/privacy-policy-/

---

1. INTRODUCTION

Butler AI: PC Automation ("the App", "we", "our") is a self-hosted remote PC automation tool that allows you to run Python scripts, monitor system resources, transfer files, and interact with a locally-hosted AI model — all over your home WiFi network. This Privacy Policy explains what data the App accesses, how it is used, and your rights as a user.

By installing or using this App, you agree to the terms described in this Privacy Policy.

---

2. SUMMARY — OUR CORE COMMITMENT

• We collect zero personal data.
• We transmit zero data to external servers.
• We have no cloud backend, no analytics, no advertising.
• All processing happens on your device and your own PC.
• This App functions entirely within your local network (LAN).

---

3. DATA WE DO NOT COLLECT

We explicitly do NOT collect, store, transmit, or share any of the following:
• Your name, email address, or any identifying information
• Location data (GPS or network-based)
• Contacts, call logs, or SMS messages
• Browsing history or web activity
• Device identifiers (IMEI, advertising ID, etc.)
• Analytics or usage statistics
• Crash reports sent to external servers
• In-app behavior tracking or profiling data
• Audio, microphone data, or ambient recordings
• Financial or payment information

---

4. DATA STORED LOCALLY ON YOUR DEVICE

The App stores the following data EXCLUSIVELY on your device using Android's local storage (AsyncStorage). This data never leaves your phone and is never transmitted to any external server:

• PC server IP address and port — Connect to your home PC
• QR pairing token (hashed) — Authenticate your PC session
• Python scripts you write — Script library
• Script execution history — Recent runs log
• AI Knowledge Base entries — Local AI context
• App preferences and settings — User experience
• Connection state — Auto-reconnect
• Butler AI chat history — Conversation memory

All locally stored data can be deleted at any time from Settings → Data & Storage → Clear App Cache or by uninstalling the App.

---

5. LOCAL NETWORK COMMUNICATION

The App communicates ONLY with your own PC on your local network (LAN/WiFi). No data is routed through any external server, cloud service, or third-party API.

• What is sent: Python script content, execution commands, file transfer requests
• Where it goes: Your own PC running butler_server.py on your local network
• Who can see it: Only devices on your own local WiFi network
• Is it encrypted: Sessions are authenticated using hashed pairing tokens

We strongly recommend using the App only on trusted private networks (your home WiFi). Do NOT expose your butler_server.py to the public internet.

---

6. ANDROID PERMISSIONS

CAMERA
• Why: Used exclusively to scan QR codes for pairing with your PC
• What we do: Nothing is stored, recorded, or transmitted. The camera is opened only when you tap "Scan QR Code" and closes immediately after scanning.
• Access: Foreground only. Never used in the background.

INTERNET
• Why: Required to communicate with your PC server over your local WiFi network
• What we do: All network requests go to your own PC's local IP address only. No external internet connections are made.

ACCESS_NETWORK_STATE / ACCESS_WIFI_STATE
• Why: Used to detect if you are connected to WiFi before attempting to connect to your PC
• What we do: Network state is checked locally. No data is transmitted.

READ_MEDIA_IMAGES
• Why: Used for the File Share feature to allow you to select images to transfer to your PC
• What we do: Selected files are sent directly to your PC over your local network. Nothing is uploaded to any cloud or external server.

PERMISSIONS WE DO NOT REQUEST:
Location (GPS), Microphone, Contacts, Phone state, SMS, Bluetooth, Body sensors, Activity recognition, Advertising ID (blocked in manifest)

---

7. AI FEATURES DISCLOSURE

LOCAL OLLAMA AI (Butler AI Chat)
The Butler AI Chat feature connects to an Ollama AI model running on YOUR OWN PC. This is a locally-hosted large language model (LLM).
• No data is sent to OpenAI, Google, Anthropic, or any AI cloud service
• All AI conversations stay within your local network
• Conversation history may be stored locally on your device for context
• The AI model runs entirely on your own PC hardware

KNOWLEDGE BASE
The App includes a local Knowledge Base that stores Python automation summaries and script findings on your device. This data is:
• Generated locally from your script activity
• Stored only on your device
• Never transmitted externally
• Fully deletable from Settings

AI BEHAVIORAL CONTEXT
The App's Knowledge Base passively tracks which script categories you use most frequently to improve AI chat relevance. This profiling data:
• Exists only in local device storage
• Is never transmitted to any server
• Can be cleared at any time in Settings → Knowledge Base → Clear

This feature operates entirely on-device with no external data sharing.

---

8. THIRD-PARTY SERVICES

The App does NOT integrate with any third-party analytics, advertising, crash reporting, or data processing services.

• Google Analytics / Firebase: NO
• Facebook SDK: NO
• Crashlytics / Sentry: NO
• AdMob or any advertising SDK: NO
• Any cloud AI API (OpenAI, etc.): NO
• Any cloud storage (AWS S3, etc.): NO

The App is built with React Native / Expo. Expo's bundler is used only for building the App binary — it is not active at runtime and transmits no data.

---

9. CHILDREN'S PRIVACY

This App is not directed at children under the age of 13. We do not knowingly collect any data from children. The App requires technical knowledge of home networking and Python programming, making it unsuitable for children as an audience.

If you believe a child has used this App in a way that raises privacy concerns, contact us at andrejsladkovic1992@gmail.com.

---

10. DATA SECURITY

Since no user data leaves your device or local network, the primary security responsibility lies with your own home network configuration.

We recommend:
• Use a strong, private WiFi password
• Do not expose port 8766 (butler_server) to the public internet
• Run butler_server.py only while actively using the App
• Use the QR pairing reset feature if you switch devices

---

11. DATA RETENTION AND DELETION

All data the App stores is held locally on your device.

To delete all App data:
• Go to Settings → Data & Storage → Clear App Cache within the App, OR
• Go to Android Settings → Apps → Butler AI → Storage → Clear Data, OR
• Uninstall the App

Uninstalling the App permanently removes all locally stored data.

---

12. YOUR RIGHTS

You have full control over all data associated with this App because everything is stored locally on your device.

• Right to Access: View all stored data via the Settings screen
• Right to Deletion: Clear all data at any time
• Right to Portability: Export your Knowledge Base as JSON from Settings
• Right to Correction: Edit or delete any script or stored content
• Right to Object: Disable any feature (Knowledge Base, AI, scheduling) from Settings

Since we collect no personal data and operate no servers, there is no data held by us to request, correct, or delete on our end.

---

13. CHANGES TO THIS PRIVACY POLICY

We may update this Privacy Policy to reflect changes in the App's features. When we do:
• The "Last Updated" date at the top will be revised
• Significant changes will be noted in the Play Store release notes
• Continued use of the App after changes constitutes acceptance

---

14. CONTACT US

Email: andrejsladkovic1992@gmail.com
App Package: com.butlerai.pc.automation
Play Store: https://play.google.com/store/apps/details?id=com.butlerai.pc.automation

We respond to all inquiries within 8 hours.

---

15. GOVERNING LAW

This Privacy Policy is governed by applicable data protection laws. As the App collects no personal data and operates no servers, it does not fall under the data processing obligations of GDPR, CCPA, or similar regulations. However, we are committed to transparency and will cooperate with any reasonable regulatory inquiry.

---

Butler AI: PC Automation — 100% self-hosted. Your data stays on your hardware, always.`;

// ─── Error Boundary ────────────────────────────────────────────────
interface EBState { hasError: boolean; }
class PrivacyPolicyErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(): EBState { return { hasError: true }; }
  componentDidCatch(error: any) {
    try { console.warn('[PrivacyPolicy] Render error:', error?.message); } catch {}
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ─── Circuit background ────────────────────────────────────────────
function CircuitBg() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[50, 110, 180, 260, 360, 460, 580, 700, 840, 980, 1130, 1280, 1430, 1600].map((top, i) => (
        <View key={`h${i}`} style={{ position: 'absolute', top, left: 0, right: 0, height: 1, backgroundColor: C.teal + '0C' }} />
      ))}
      {[28, 88, 150, 220, 300, 380].map((left, i) => (
        <View key={`v${i}`} style={{ position: 'absolute', left, top: 0, bottom: 0, width: 1, backgroundColor: C.teal + '07' }} />
      ))}
    </View>
  );
}

// ─── HUD corner brackets ───────────────────────────────────────────
function HUDCorners({ sz = 10, col = C.teal, w = 2 }: { sz?: number; col?: string; w?: number }) {
  return (
    <>
      <View style={{ position: 'absolute', top: 0, left: 0, width: sz, height: sz, borderTopWidth: w, borderLeftWidth: w, borderColor: col }} />
      <View style={{ position: 'absolute', top: 0, right: 0, width: sz, height: sz, borderTopWidth: w, borderRightWidth: w, borderColor: col }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, width: sz, height: sz, borderBottomWidth: w, borderLeftWidth: w, borderColor: col }} />
      <View style={{ position: 'absolute', bottom: 0, right: 0, width: sz, height: sz, borderBottomWidth: w, borderRightWidth: w, borderColor: col }} />
    </>
  );
}

// ─── Section header ────────────────────────────────────────────────
function SectionHeader({ label, icon, color = C.teal }: { label: string; icon: string; color?: string }) {
  return (
    <View style={[sec.wrap, { borderLeftColor: color }]}>
      <MaterialIcons name={icon as any} size={12} color={color} />
      <Text style={[sec.txt, { color }]}>{label}</Text>
      <View style={[sec.line, { backgroundColor: color + '30' }]} />
    </View>
  );
}
const sec = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderLeftWidth: 3, paddingLeft: 10, marginTop: 22, marginBottom: 10 },
  txt:  { fontSize: 9, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.8 },
  line: { flex: 1, height: 1 },
});

// ─── Collapsible card ──────────────────────────────────────────────
function CollapseCard({
  title, icon, color = C.teal, children, defaultOpen = false, badge,
}: {
  title: string; icon: string; color?: string; children: React.ReactNode;
  defaultOpen?: boolean; badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const rotAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;
  const toggle = () => {
    haptics.selection();
    Animated.spring(rotAnim, { toValue: open ? 0 : 1, tension: 180, friction: 10, useNativeDriver: false }).start();
    setOpen(v => !v);
  };
  return (
    <View style={[cc.wrap, { borderColor: open ? color + '55' : C.border }]}>
      <HUDCorners sz={8} col={open ? color : C.tealDim} w={1.5} />
      <TouchableOpacity style={cc.hdr} onPress={toggle} activeOpacity={0.8}>
        <View style={[cc.iconBox, { borderColor: color + '55', backgroundColor: color + '12' }]}>
          <MaterialIcons name={icon as any} size={14} color={color} />
        </View>
        <Text style={[cc.title, { color: open ? color : C.textBrt }]} numberOfLines={2}>{title}</Text>
        {badge ? (
          <View style={[cc.badge, { borderColor: color + '55', backgroundColor: color + '15' }]}>
            <Text style={[cc.badgeTxt, { color }]}>{badge}</Text>
          </View>
        ) : null}
        <Animated.View style={{ transform: [{ rotate: rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
          <MaterialIcons name="keyboard-arrow-down" size={18} color={open ? color : C.text} />
        </Animated.View>
      </TouchableOpacity>
      {open ? <View style={[cc.body, { borderTopColor: color + '20' }]}>{children}</View> : null}
    </View>
  );
}
const cc = StyleSheet.create({
  wrap:     { borderWidth: 1.5, borderRadius: 8, backgroundColor: C.card, marginBottom: 8, overflow: 'hidden', position: 'relative' },
  hdr:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  iconBox:  { width: 32, height: 32, borderWidth: 1.5, borderRadius: 6, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title:    { flex: 1, fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  badge:    { borderWidth: 1, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  badgeTxt: { fontSize: 7, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  body:     { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, borderTopWidth: 1 },
});

// ─── Bullet ────────────────────────────────────────────────────────
function Bullet({ text, ok = true, color }: { text: string; ok?: boolean; color?: string }) {
  const col = color || (ok ? C.green : C.red);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 7 }}>
      <MaterialIcons name={ok ? 'check-circle' : 'cancel'} size={13} color={col} style={{ marginTop: 2 }} />
      <Text style={{ flex: 1, fontSize: 11, color: C.textBrt, fontFamily: MONO, lineHeight: 17 }}>{text}</Text>
    </View>
  );
}

// ─── Info row ──────────────────────────────────────────────────────
function InfoRow({ icon, label, value, color = C.teal }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <MaterialIcons name={icon as any} size={15} color={color} style={{ marginTop: 1, flexShrink: 0 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color, fontFamily: MONO, marginBottom: 3 }}>{label}</Text>
        <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15 }}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Permission row ────────────────────────────────────────────────
function PermRow({ perm, icon, purpose, note, notRequested, color = C.amber }: {
  perm: string; icon: string; purpose: string; note: string; notRequested?: boolean; color?: string;
}) {
  return (
    <View style={{ paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 30, height: 30, borderRadius: 6, borderWidth: 1.5, borderColor: color + '55', backgroundColor: color + '12', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MaterialIcons name={icon as any} size={14} color={color} />
        </View>
        <Text style={{ flex: 1, fontSize: 11, fontWeight: '900', color, fontFamily: MONO, letterSpacing: 0.4 }}>{perm}</Text>
        <View style={{ borderWidth: 1, borderColor: (notRequested ? C.red : C.green) + '55', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: (notRequested ? C.red : C.green) + '10' }}>
          <Text style={{ fontSize: 7, fontWeight: '900', color: notRequested ? C.red : C.green, fontFamily: MONO, letterSpacing: 0.5 }}>{notRequested ? 'NOT USED' : 'REQUIRED'}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15, paddingLeft: 38 }}>{purpose}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingLeft: 38 }}>
        <MaterialIcons name="info-outline" size={11} color={C.tealMid} style={{ marginTop: 2 }} />
        <Text style={{ flex: 1, fontSize: 9, color: C.text, fontFamily: MONO, lineHeight: 14 }}>{note}</Text>
      </View>
    </View>
  );
}

// ─── Table row ────────────────────────────────────────────────────
function TableRow({ service, used }: { service: string; used: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <MaterialIcons name={used ? 'check' : 'close'} size={13} color={used ? C.amber : C.green} />
      <Text style={{ flex: 1, fontSize: 10, color: C.textBrt, fontFamily: MONO }}>{service}</Text>
      <View style={{ borderWidth: 1, borderColor: (used ? C.amber : C.green) + '55', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: (used ? C.amber : C.green) + '10' }}>
        <Text style={{ fontSize: 7, fontWeight: '900', color: used ? C.amber : C.green, fontFamily: MONO }}>{'NO'}</Text>
      </View>
    </View>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────
function CopyPolicyButton() {
  const [copied, setCopied] = useState(false);
  const flashOp = useRef(new Animated.Value(0)).current;

  const handleCopy = async () => {
    haptics.medium();
    try {
      if (Platform.OS === 'web') {
        await (navigator as any).clipboard?.writeText(FULL_POLICY_TEXT);
      } else {
        await ExpoClipboard.setStringAsync(FULL_POLICY_TEXT);
      }
      setCopied(true);
      Animated.sequence([
        Animated.timing(flashOp, { toValue: 1, duration: 80, useNativeDriver: false }),
        Animated.timing(flashOp, { toValue: 0, duration: 800, useNativeDriver: false }),
      ]).start(() => setCopied(false));
      haptics.success();
    } catch {
      Alert.alert('Copy failed', 'Could not copy to clipboard on this device.');
    }
  };

  return (
    <TouchableOpacity
      style={cpb.btn}
      onPress={handleCopy}
      activeOpacity={0.82}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: C.green, opacity: flashOp, borderRadius: 8 }]} />
      <MaterialIcons name={copied ? 'check' : 'content-copy'} size={15} color={copied ? '#000' : C.green} />
      <View style={{ flex: 1 }}>
        <Text style={[cpb.title, { color: copied ? '#000' : C.green }]}>
          {copied ? 'COPIED TO CLIPBOARD' : 'COPY FULL PRIVACY POLICY'}
        </Text>
        <Text style={[cpb.sub, { color: copied ? '#000' : C.tealMid }]}>
          {copied ? 'Paste into your website editor' : 'Copies plain text — paste into website / GitHub Pages'}
        </Text>
      </View>
      <View style={[cpb.badge, { borderColor: (copied ? '#000' : C.green) + '60', backgroundColor: (copied ? '#000' : C.green) + '15' }]}>
        <Text style={[cpb.badgeTxt, { color: copied ? '#000' : C.green }]}>~3.8KB</Text>
      </View>
    </TouchableOpacity>
  );
}
const cpb = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 2, borderColor: C.green + '70', borderRadius: 8,
    backgroundColor: C.green + '0E', paddingHorizontal: 14, paddingVertical: 12,
    marginHorizontal: 14, marginBottom: 8, position: 'relative', overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: C.green, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10 }, android: { elevation: 4 } }),
  },
  title:    { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },
  sub:      { fontSize: 8, fontFamily: MONO, marginTop: 2, letterSpacing: 0.3 },
  badge:    { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  badgeTxt: { fontSize: 7, fontWeight: '900', fontFamily: MONO },
});

// ─── Main Screen ──────────────────────────────────────────────────
export default function PrivacyPolicyScreen() {
  return (
    <PrivacyPolicyErrorBoundary>
      <PrivacyPolicyContent />
    </PrivacyPolicyErrorBoundary>
  );
}

function PrivacyPolicyContent() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 1400, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0.3, duration: 1400, useNativeDriver: false }),
    ])).start();
  }, []);

  return (
    <View style={[t.root, { paddingTop: insets.top }]}>
      <CircuitBg />

      {/* ── HEADER ── */}
      <View style={t.header}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: C.teal }} pointerEvents="none" />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: C.teal + '40' }} pointerEvents="none" />
        <TouchableOpacity style={t.backBtn} onPress={() => { haptics.medium(); router.back(); }} activeOpacity={0.8} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialIcons name="arrow-back" size={18} color={C.teal} />
        </TouchableOpacity>
        <View style={t.titleBlock}>
          <Animated.View style={[t.lockBox, { borderColor: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [C.tealDim, C.teal + 'AA'] }) }]}>
            <MaterialIcons name="privacy-tip" size={20} color={C.teal} />
          </Animated.View>
          <View>
            <Text style={t.headerTitle}>PRIVACY POLICY</Text>
            <Text style={t.headerSub}>Butler AI v6.0 · April 13, 2026</Text>
          </View>
        </View>
        <Animated.View style={[t.activeBadge, { borderColor: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: ['#003322', '#22FF4488'] }) }]}>
          <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green, opacity: glowAnim }} />
          <Text style={t.activeTxt}>COMPLIANT</Text>
        </Animated.View>
      </View>

      {/* ── COPY POLICY BUTTON ── */}
      <CopyPolicyButton />

      {/* ── QUICK NAV ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={t.navBar} contentContainerStyle={{ paddingHorizontal: 14, gap: 8, paddingVertical: 8 }}>
        {[
          { label: 'Summary',    anchor: 0,    icon: 'dashboard' },
          { label: 'Stored',     anchor: 420,  icon: 'storage' },
          { label: 'Not Collected', anchor: 820, icon: 'block' },
          { label: 'LAN',        anchor: 1180, icon: 'wifi-lock' },
          { label: 'Permissions', anchor: 1540, icon: 'admin-panel-settings' },
          { label: 'AI Profiling', anchor: 1940, icon: 'psychology' },
          { label: '3rd Party',  anchor: 2280, icon: 'hub' },
          { label: 'Children',   anchor: 2620, icon: 'child-care' },
          { label: 'Security',   anchor: 2960, icon: 'lock' },
          { label: 'Rights',     anchor: 3300, icon: 'gavel' },
          { label: 'Contact',    anchor: 3700, icon: 'email' },
        ].map(({ label, anchor, icon }) => (
          <TouchableOpacity key={label} style={t.navChip} onPress={() => { haptics.selection(); scrollRef.current?.scrollTo({ y: anchor, animated: true }); }} activeOpacity={0.75}>
            <MaterialIcons name={icon as any} size={10} color={C.teal} />
            <Text style={t.navChipTxt}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── CONTENT ── */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: Math.max(insets.bottom + 60, 80) }} showsVerticalScrollIndicator={false}>

        {/* ── HERO CARD ── */}
        <View style={t.heroCard}>
          <HUDCorners sz={14} col={C.tealBrt} w={2} />
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: C.greenDim, borderWidth: 2, borderColor: C.green + '70', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="shield-check" size={28} color={C.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={t.heroTitle}>ZERO DATA COLLECTION</Text>
              <Text style={t.heroBody}>Butler AI is 100% self-hosted. It connects your phone to a Python server on YOUR PC over local Wi-Fi. No cloud, no accounts, no tracking — ever.</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[
              { l: 'NO ANALYTICS',    c: C.green, i: 'analytics' },
              { l: 'NO CLOUD',        c: C.teal,  i: 'cloud-off' },
              { l: 'NO ACCOUNTS',     c: C.green, i: 'person-off' },
              { l: 'LAN ONLY',        c: C.amber, i: 'wifi-lock' },
              { l: 'SELF-HOSTED',     c: C.teal,  i: 'home' },
              { l: 'CAMERA: QR ONLY', c: C.amber, i: 'qr-code-scanner' },
            ].map(({ l, c, i }) => (
              <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: c + '55', borderRadius: 5, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: c + '10' }}>
                <MaterialIcons name={i as any} size={10} color={c} />
                <Text style={{ fontSize: 8, fontWeight: '900', color: c, fontFamily: MONO, letterSpacing: 0.5 }}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── META INFO ── */}
        <View style={{ backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, marginBottom: 6, gap: 4 }}>
          {[
            ['App Name',       'Butler AI: PC Automation'],
            ['Package',        'com.butlerai.pc.automation'],
            ['Version',        '6.0.0 (Build 60)'],
            ['Last Updated',   'April 13, 2026'],
            ['Effective Date', 'April 13, 2026'],
            ['Developer',      'Andrej Sladkovic'],
            ['Contact',        'andrejsladkovic1992@gmail.com'],
            ['Policy URL',     'shawnjan-cmd.github.io/privacy-policy-/'],
          ].map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={{ fontSize: 9, color: C.text, fontFamily: MONO, width: 90 }}>{k}</Text>
              <Text style={{ flex: 1, fontSize: 9, color: C.textBrt, fontFamily: MONO }}>{v}</Text>
            </View>
          ))}
        </View>

        {/* 1. INTRODUCTION */}
        <SectionHeader label="1. INTRODUCTION" icon="info" color={C.teal} />
        <CollapseCard title="What is Butler AI?" icon="phone-android" color={C.teal} defaultOpen>
          <Text style={{ fontSize: 11, color: C.textBrt, fontFamily: MONO, lineHeight: 18 }}>
            Butler AI: PC Automation is a self-hosted remote PC automation tool that allows you to run Python scripts, monitor system resources, transfer files, and interact with a locally-hosted AI model — all over your home WiFi network.{'\n\n'}This Privacy Policy explains what data the App accesses, how it is used, and your rights as a user. By installing or using this App, you agree to the terms described below.
          </Text>
        </CollapseCard>

        {/* 2. CORE COMMITMENT */}
        <SectionHeader label="2. OUR CORE COMMITMENT" icon="verified-user" color={C.green} />
        <CollapseCard title="Zero Data Collection — Guaranteed" icon="shield" color={C.green} defaultOpen badge="CORE PROMISE">
          <Bullet text="We collect zero personal data." ok color={C.green} />
          <Bullet text="We transmit zero data to external servers." ok color={C.green} />
          <Bullet text="We have no cloud backend, no analytics, no advertising." ok color={C.green} />
          <Bullet text="All processing happens on your device and your own PC." ok color={C.green} />
          <Bullet text="This App functions entirely within your local network (LAN)." ok color={C.green} />
        </CollapseCard>

        {/* 3. DATA STORED LOCALLY */}
        <SectionHeader label="3. DATA STORED ON YOUR DEVICE" icon="storage" color={C.teal} />
        <CollapseCard title="What Butler AI Stores Locally" icon="phone-android" color={C.teal} defaultOpen badge="LOCAL ONLY">
          <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 16, marginBottom: 12 }}>
            The following data lives exclusively in your phone's private AsyncStorage. It is never uploaded, shared, or transmitted to any cloud server or third party.
          </Text>
          {[
            { icon: 'wifi',        label: 'PC IP Address & Port',  value: 'Your PC local network address — stored on-device only', col: C.teal },
            { icon: 'vpn-key',     label: 'Session Pairing Token', value: 'HMAC-SHA256 cryptographic token — never plain-text', col: C.teal },
            { icon: 'settings',    label: 'App Settings & Prefs',  value: 'Your configuration choices — local only', col: C.tealMid },
            { icon: 'code',        label: 'Script Library',        value: 'Python scripts you write or import — your data', col: C.tealMid },
            { icon: 'history',     label: 'Execution History',     value: 'Command logs stored on-device only', col: C.tealMid },
            { icon: 'psychology',  label: 'Knowledge Base (KB)',   value: 'Auto-generated Python reference notes — local only', col: C.tealMid },
            { icon: 'chat-bubble', label: 'Chat History',          value: 'Butler AI conversations — stored locally, never uploaded', col: C.tealMid },
            { icon: 'schedule',    label: 'Schedules & Automation',value: 'Task schedules run on YOUR PC — no cloud sync', col: C.tealMid },
          ].map(({ icon, label, value, col }) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <MaterialIcons name={icon as any} size={14} color={col} style={{ marginTop: 2, flexShrink: 0 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: col, fontFamily: MONO }}>{label}</Text>
                <Text style={{ fontSize: 9, color: C.text, fontFamily: MONO, lineHeight: 13, marginTop: 2 }}>{value}</Text>
              </View>
              <MaterialIcons name="check-circle" size={13} color={C.green} style={{ marginTop: 2 }} />
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: C.greenDim, borderRadius: 6, borderWidth: 1, borderColor: C.green + '40', padding: 9, marginTop: 10 }}>
            <MaterialIcons name="info" size={12} color={C.green} />
            <Text style={{ flex: 1, fontSize: 9, color: C.green + 'BB', fontFamily: MONO, lineHeight: 14 }}>All locally stored data is permanently deleted when you uninstall the app.</Text>
          </View>
        </CollapseCard>

        {/* 4. DATA NOT COLLECTED */}
        <SectionHeader label="4. DATA WE NEVER COLLECT" icon="block" color={C.red} />
        <CollapseCard title="Explicitly Not Collected — Ever" icon="cancel" color={C.red} defaultOpen badge="NEVER">
          {[
            'Name, email address, phone number, or any personal identity',
            'GPS or network-based location data',
            'Device contacts, calendar, or call logs',
            'Photos, camera images, or gallery content',
            'Microphone audio or voice recordings',
            'SMS messages or notification content',
            'Advertising IDs (GAID) or device fingerprints',
            'Browser history, cookies, or web tracking',
            'Health, financial, or biometric data',
            'Crash reports or diagnostic telemetry to external servers',
            'Usage analytics, heatmaps, or session recordings',
            'Third-party account credentials',
          ].map(item => <Bullet key={item} text={item} ok={false} />)}
        </CollapseCard>
        <CollapseCard title="No Analytics or Tracking SDKs" icon="analytics" color={C.red}>
          <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15, marginBottom: 10 }}>Butler AI contains ZERO third-party analytics or tracking SDKs:</Text>
          {['No Google Analytics / Firebase Analytics', 'No Google Crashlytics or Firebase Crashlytics', 'No Facebook / Meta SDK', 'No Amplitude, Mixpanel, or Segment', 'No Sentry crash reporting', 'No AppsFlyer or Adjust attribution', 'No HotJar, FullStory, or session recording', 'No in-app advertising network of any kind'].map(item => (
            <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 }}>
              <MaterialIcons name="do-not-disturb" size={12} color={C.red} />
              <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO }}>{item}</Text>
            </View>
          ))}
        </CollapseCard>

        {/* 5. LOCAL NETWORK COMMUNICATION */}
        <SectionHeader label="5. LOCAL NETWORK COMMUNICATION" icon="wifi-lock" color={C.teal} />
        <CollapseCard title="LAN Only — No Internet Routing" icon="router" color={C.teal} defaultOpen>
          <InfoRow icon="home" color={C.teal} label="Local Network Only" value="All communication occurs exclusively between your Android phone and your personal PC over your local home or office Wi-Fi (192.168.x.x, 10.x.x.x). No data is routed through the internet, our servers, or any third-party relay during standard operation." />
          <InfoRow icon="send" color={C.teal} label="What Is Sent" value="Python script content, execution commands, file transfer requests — all going directly to your own PC server only." />
          <InfoRow icon="lock" color={C.green} label="No Man-in-the-Middle Risk" value="Traffic stays within your private home network. No DNS lookups to external servers. No cloud relay. No VPN required." />
          <InfoRow icon="warning" color={C.amber} label="Security Recommendation" value="We strongly recommend using the App only on trusted private networks. Do NOT expose your butler_server.py port to the public internet." />
        </CollapseCard>

        {/* 6. ANDROID PERMISSIONS */}
        <SectionHeader label="6. ANDROID PERMISSIONS" icon="admin-panel-settings" color={C.amber} />
        <CollapseCard title="Permissions Used (4 total)" icon="security" color={C.amber} defaultOpen badge="4 USED">
          <PermRow perm="INTERNET" icon="wifi" color={C.teal} purpose="Communicates with butler_server.py on your PC over your local Wi-Fi. This is the core function of the app. No internet endpoints are contacted during normal use." note="Without this permission, the app cannot connect to your PC at all." />
          <PermRow perm="CAMERA" icon="qr-code-scanner" color={C.amber} purpose="Used exclusively when you tap the QR SCAN button on the Home tab to pair with your PC. Camera is never activated in background. Nothing is photographed or stored." note="Without this, QR pairing is unavailable. You can still connect using manual IP entry." />
          <PermRow perm="ACCESS_NETWORK_STATE" icon="network-check" color={C.cyan} purpose="Checks whether your device is connected to a Wi-Fi network before attempting to reach your PC server. Prevents unnecessary connection attempts." note="Without this, the auto-connect engine cannot detect when you join a new Wi-Fi network." />
          <PermRow perm="READ_MEDIA_IMAGES" icon="photo-library" color={C.purple} purpose="Used for the File Share feature to allow you to select images to transfer to your PC. Selected files go directly to your PC over local network only." note="Without this, image file transfer from phone to PC is unavailable." />
          <View style={{ marginTop: 12, backgroundColor: C.greenDim, borderWidth: 1, borderColor: C.green + '40', borderRadius: 6, padding: 10 }}>
            <Text style={{ fontSize: 9, fontWeight: '900', color: C.green, fontFamily: MONO, letterSpacing: 0.8, marginBottom: 6 }}>EXPLICITLY NOT REQUESTED</Text>
            <Text style={{ fontSize: 9, color: C.green + 'BB', fontFamily: MONO, lineHeight: 16 }}>{'READ_CONTACTS · WRITE_CONTACTS · ACCESS_FINE_LOCATION · ACCESS_COARSE_LOCATION · RECORD_AUDIO · READ_SMS · SEND_SMS · READ_CALL_LOG · GET_ACCOUNTS · READ_PHONE_STATE · WRITE_EXTERNAL_STORAGE · READ_MEDIA_VIDEO · READ_MEDIA_AUDIO · com.google.android.gms.permission.AD_ID · ACTIVITY_RECOGNITION · BODY_SENSORS'}</Text>
          </View>
        </CollapseCard>

        {/* 7. AI BEHAVIORAL PROFILING */}
        <SectionHeader label="7. AI BEHAVIORAL PROFILING DISCLOSURE" icon="psychology" color={C.amber} />
        <CollapseCard title="Local AI Behavioral Context (Google Play Required)" icon="auto-awesome" color={C.amber} defaultOpen badge="REQUIRED NOTICE">
          <View style={{ backgroundColor: C.amber + '0E', borderWidth: 1.5, borderColor: C.amber + '60', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <MaterialIcons name="warning" size={14} color={C.amber} />
              <Text style={{ fontSize: 10, fontWeight: '900', color: C.amber, fontFamily: MONO, letterSpacing: 0.8 }}>GOOGLE PLAY PROMINENT DISCLOSURE</Text>
            </View>
            <Text style={{ fontSize: 10, color: C.amber + 'CC', fontFamily: MONO, lineHeight: 15 }}>This section satisfies Google Play's requirement for a separate, prominent disclosure of AI behavioral data processing outside the privacy policy body.</Text>
          </View>
          <InfoRow icon="psychology" color={C.amber} label="Behavioral Tracking (Local Only)" value="Butler AI passively tracks which script categories and automation topics you query most frequently. This behavioral profile is used only to improve AI chat relevance. It is stored ONLY on your device — never transmitted externally." />
          <InfoRow icon="auto-awesome" color={C.teal} label="Knowledge Base Auto-Growth" value="Your queries automatically grow the on-device Knowledge Base. Butler uses this accumulated context to improve responses across sessions. This process runs 100% locally on your device." />
          <InfoRow icon="lock" color={C.green} label="Zero Cloud Transmission" value="All behavioral data, AI conversations, and Knowledge Base entries remain entirely within your local network (LAN). No data is sent to OpenAI, Google, Anthropic, or any external server." />
          <InfoRow icon="delete-sweep" color={C.red} label="Your Full Control" value="View, export, or permanently delete all behavioral data at any time in Settings → Butler AI Knowledge Base. Uninstalling the app removes all data permanently." />
        </CollapseCard>

        {/* 8. THIRD-PARTY SERVICES */}
        <SectionHeader label="8. THIRD-PARTY SERVICES" icon="hub" color={C.purple} />
        <CollapseCard title="Third-Party Service Integration Status" icon="share" color={C.purple} defaultOpen>
          <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15, marginBottom: 12 }}>The App does NOT integrate with any third-party analytics, advertising, crash reporting, or data processing services:</Text>
          {['Google Analytics / Firebase', 'Facebook SDK', 'Crashlytics / Sentry', 'AdMob or any advertising SDK', 'Any cloud AI API (OpenAI, etc.)', 'Any cloud storage (AWS S3, etc.)', 'AppsFlyer / Adjust attribution', 'HotJar / FullStory / session recording'].map(s => <TableRow key={s} service={s} used={false} />)}
        </CollapseCard>
        <CollapseCard title="Ollama Local AI — On Your PC" icon="computer" color={C.green} badge="100% LOCAL">
          <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15, marginBottom: 10 }}>If you choose to set up Ollama on your PC, Butler AI connects to it over your local network. All AI processing happens on your own hardware. No data is sent to any external AI service.</Text>
          <Bullet text="No API key required — runs on your hardware" ok color={C.green} />
          <Bullet text="No data sent to OpenAI, Google, Anthropic, or any AI cloud" ok color={C.green} />
          <Bullet text="Conversations stay within your local network only" ok color={C.green} />
          <Bullet text="You choose the model — all run locally" ok color={C.green} />
          <TouchableOpacity onPress={() => { haptics.light(); Linking.openURL('https://ollama.com/privacy'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
            <MaterialIcons name="open-in-new" size={11} color={C.green + '88'} />
            <Text style={{ fontSize: 9, color: C.green + '88', fontFamily: MONO, textDecorationLine: 'underline' }}>Ollama Privacy Policy</Text>
          </TouchableOpacity>
        </CollapseCard>

        {/* 9. CHILDREN'S PRIVACY */}
        <SectionHeader label="9. CHILDREN'S PRIVACY" icon="child-care" color={C.tealMid} />
        <CollapseCard title="Not Directed at Children Under 13" icon="family-restroom" color={C.tealMid}>
          <Text style={{ fontSize: 11, color: C.textBrt, fontFamily: MONO, lineHeight: 18 }}>
            Butler AI is a developer productivity tool and is not directed at children under 13 years of age. We do not knowingly collect any personal information from children. Since we collect no personal information from anyone, this policy applies uniformly to all users.{'\n\n'}If you believe a child has used this App in a way that raises privacy concerns, contact us at andrejsladkovic1992@gmail.com.
          </Text>
        </CollapseCard>

        {/* 10. DATA SECURITY */}
        <SectionHeader label="10. DATA SECURITY" icon="lock" color={C.green} />
        <CollapseCard title="Security Architecture" icon="verified-user" color={C.green} defaultOpen>
          <InfoRow icon="vpn-key" color={C.tealBrt} label="HMAC-SHA256 Token Authentication" value="Device pairing uses cryptographic HMAC signatures with a 64-character secret. Constant-time comparison prevents timing attacks. No plain-text passwords are ever used." />
          <InfoRow icon="devices" color={C.teal} label="Single-Device Lock" value="Your PC server can only be paired to ONE phone at a time. A new pairing automatically revokes the previous one. Prevents unauthorized access." />
          <InfoRow icon="timer-off" color={C.amber} label="Session Token Expiry" value="Pairing tokens expire automatically after 30 days. After expiry, you must re-scan the QR code to re-authenticate. This limits the window for token misuse." />
          <InfoRow icon="timer" color={C.amber} label="Script Execution Timeout" value="All Python scripts have a 30-second timeout. Scripts run in isolated subprocess with no elevated privileges. Output is capped at 64KB." />
          <InfoRow icon="shield" color={C.green} label="Safety Guard Scanner" value="All scripts are scanned for dangerous patterns (os.system, eval, exec, subprocess with shell=True, etc.) before execution. Dangerous scripts are flagged and blocked." />
          <InfoRow icon="storage" color={C.tealMid} label="App-Private Storage" value="AsyncStorage uses Android's app-private storage sandbox. Other apps on your device cannot read Butler AI's data. Data is automatically wiped on uninstall." />
          <View style={{ backgroundColor: C.amber + '0E', borderWidth: 1, borderColor: C.amber + '40', borderRadius: 6, padding: 10, marginTop: 8 }}>
            <Text style={{ fontSize: 9, color: C.amber, fontFamily: MONO, lineHeight: 14 }}>{'Security recommendation: Use a strong private WiFi password. Do not expose port 8766 (butler_server) to the public internet. Run butler_server.py only while actively using the App.'}</Text>
          </View>
        </CollapseCard>

        {/* 11. DATA RETENTION */}
        <SectionHeader label="11. DATA RETENTION & DELETION" icon="delete-forever" color={C.red} />
        <CollapseCard title="How to Delete All App Data" icon="delete-sweep" color={C.red} defaultOpen>
          <Text style={{ fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 16, marginBottom: 12 }}>All data the App stores is held locally on your device. You have multiple ways to delete everything:</Text>
          {[
            { method: 'In-App Wipe', desc: 'Settings → Data & Storage → Clear App Cache', icon: 'phone-android' },
            { method: 'Android System', desc: 'Android Settings → Apps → Butler AI → Storage → Clear Data', icon: 'settings' },
            { method: 'Uninstall', desc: 'Uninstalling the App permanently removes all locally stored data', icon: 'delete-forever' },
            { method: 'KB Only', desc: 'Settings → Butler AI Knowledge Base → Clear Knowledge Base', icon: 'psychology' },
          ].map(({ method, desc, icon }) => (
            <View key={method} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <MaterialIcons name={icon as any} size={14} color={C.red} style={{ marginTop: 1, flexShrink: 0 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: C.red, fontFamily: MONO }}>{method}</Text>
                <Text style={{ fontSize: 9, color: C.text, fontFamily: MONO, lineHeight: 13, marginTop: 2 }}>{desc}</Text>
              </View>
            </View>
          ))}
        </CollapseCard>

        {/* 12. YOUR RIGHTS */}
        <SectionHeader label="12. YOUR RIGHTS & DATA CONTROL" icon="gavel" color={C.green} />
        <CollapseCard title="User Rights & Deletion Options" icon="manage-accounts" color={C.green} defaultOpen>
          <InfoRow icon="search" color={C.green} label="Right to Access" value="All data is on YOUR device. View stored knowledge via the Knowledge Base tab, execution history in the Scripts tab, and settings in the Settings tab." />
          <InfoRow icon="delete-forever" color={C.green} label="Right to Deletion" value="Settings → Data & Storage → Clear App Cache to erase connection data, history, and cache. Settings → Knowledge Base → Clear Knowledge Base. Or simply uninstall the app." />
          <InfoRow icon="file-download" color={C.teal} label="Right to Portability" value="Export your Knowledge Base at any time via Settings → Butler AI Knowledge Base → Export Knowledge Base. Data is saved as a JSON file you can read and share." />
          <InfoRow icon="edit-off" color={C.amber} label="Right to Correction" value="All data is user-generated. Edit scripts directly in the Scripts tab, clear and re-add knowledge entries, or modify settings at any time." />
          <InfoRow icon="person-remove" color={C.green} label="No Account to Delete" value="Butler AI requires no signup, no email, no account of any kind. There is no account to delete — we have no user database whatsoever." />
          <InfoRow icon="person-off" color={C.tealMid} label="GDPR / CCPA" value="As the App collects no personal data and operates no servers, it does not fall under the data processing obligations of GDPR, CCPA, or similar regulations. We cooperate with any reasonable regulatory inquiry." />
        </CollapseCard>

        {/* 13. POLICY CHANGES */}
        <SectionHeader label="13. CHANGES TO THIS POLICY" icon="update" color={C.teal} />
        <CollapseCard title="Policy Updates & Notification" icon="notifications" color={C.teal}>
          <Text style={{ fontSize: 11, color: C.textBrt, fontFamily: MONO, lineHeight: 19 }}>
            {'We may update this Privacy Policy when we add new features. When we do:\n\n• The "Last Updated" date at the top will be revised\n• Significant changes will be noted in the Play Store release notes\n• Continued use of the App after changes constitutes acceptance\n\nWe recommend reviewing this policy periodically, especially after app updates.'}
          </Text>
        </CollapseCard>

        {/* 14. GOVERNING LAW */}
        <SectionHeader label="14. GOVERNING LAW" icon="account-balance" color={C.tealMid} />
        <CollapseCard title="Legal Jurisdiction" icon="gavel" color={C.tealMid}>
          <Text style={{ fontSize: 11, color: C.textBrt, fontFamily: MONO, lineHeight: 19 }}>
            {'This Privacy Policy is governed by applicable data protection laws. As the App collects no personal data and operates no servers, it does not fall under the data processing obligations of GDPR, CCPA, or similar regulations. However, we are committed to transparency and will cooperate with any reasonable regulatory inquiry.\n\nAll disputes shall be governed by applicable law.'}
          </Text>
        </CollapseCard>

        {/* CONTACT */}
        <SectionHeader label="CONTACT & SUPPORT" icon="email" color={C.cyan} />
        <View style={t.contactCard}>
          <HUDCorners sz={12} col={C.cyan} w={2} />
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: C.tealDim + '80', borderWidth: 1.5, borderColor: C.cyan + '60', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="support-agent" size={24} color={C.cyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: C.cyan, fontFamily: MONO, letterSpacing: 0.6 }}>Questions About Privacy?</Text>
              <Text style={{ fontSize: 9, color: C.text, fontFamily: MONO, marginTop: 3 }}>Privacy requests and data questions — we respond within 8 hours</Text>
            </View>
          </View>
          <TouchableOpacity style={t.emailBtn} onPress={() => { haptics.medium(); Linking.openURL('mailto:andrejsladkovic1992@gmail.com?subject=Privacy%20Policy%20-%20Butler%20AI'); }} activeOpacity={0.85}>
            <MaterialIcons name="email" size={16} color="#000" />
            <Text style={t.emailBtnTxt}>andrejsladkovic1992@gmail.com</Text>
            <MaterialIcons name="arrow-forward" size={14} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={[t.linkBtn, { borderColor: C.teal + '50', backgroundColor: C.teal + '0C', marginTop: 10 }]} onPress={() => { haptics.light(); Linking.openURL(FALLBACK_URL); }} activeOpacity={0.85}>
            <MaterialIcons name="open-in-new" size={13} color={C.teal} />
            <Text style={[t.linkTxt, { color: C.teal }]}>View Hosted Version (GitHub Pages)</Text>
            <MaterialIcons name="arrow-forward-ios" size={11} color={C.teal} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TouchableOpacity style={[t.linkBtn, { flex: 1, borderColor: C.green + '60', backgroundColor: C.green + '10', marginTop: 0 }]} onPress={() => { haptics.light(); try { router.push('/data-safety' as any); } catch { Linking.openURL(FALLBACK_URL); } }} activeOpacity={0.85}>
              <MaterialCommunityIcons name="shield-check" size={13} color={C.green} />
              <Text style={[t.linkTxt, { color: C.green, flex: 1 }]}>Data Safety</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[t.linkBtn, { flex: 1, borderColor: C.amber + '60', backgroundColor: C.amber + '10', marginTop: 0 }]} onPress={() => { haptics.light(); try { router.push('/terms' as any); } catch { Linking.openURL(FALLBACK_URL); } }} activeOpacity={0.85}>
              <MaterialIcons name="gavel" size={13} color={C.amber} />
              <Text style={[t.linkTxt, { color: C.amber, flex: 1 }]}>Terms</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={t.footer}>
          <View style={t.footerLine} />
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={t.footerTxt}>PRIVACY POLICY v2.0 · BUTLER AI v6.0</Text>
            <Text style={t.footerTxt}>Effective April 13, 2026 · Zero Data Collection</Text>
            <Text style={t.footerTxt}>com.butlerai.pc.automation</Text>
          </View>
          <View style={t.footerLine} />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const t = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#050E18', borderBottomWidth: 2, borderBottomColor: C.teal + '60',
    position: 'relative', overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: C.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 }, android: { elevation: 8 } }),
  },
  backBtn: {
    width: 38, height: 38, backgroundColor: C.tealDim, borderWidth: 1.5, borderColor: C.teal + '70',
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ ios: { shadowColor: C.teal, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8 }, android: { elevation: 4 } }),
  },
  titleBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  lockBox: { width: 40, height: 40, borderWidth: 1.5, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.tealDim + '80' },
  headerTitle: {
    fontSize: 12, fontWeight: '900', color: C.tealBrt, fontFamily: MONO, letterSpacing: 1.2,
    ...Platform.select({ ios: { textShadowColor: C.teal, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }, android: {} }),
  },
  headerSub: { fontSize: 7.5, color: C.text, fontFamily: MONO, marginTop: 2 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: C.green + '10' },
  activeTxt: { fontSize: 7.5, fontWeight: '900', color: C.green, fontFamily: MONO, letterSpacing: 1 },
  navBar: { maxHeight: 44, backgroundColor: '#060E18', borderBottomWidth: 1, borderBottomColor: C.border },
  navChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: C.teal + '50', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.teal + '10' },
  navChipTxt: { fontSize: 9, fontWeight: '700', color: C.teal, fontFamily: MONO, letterSpacing: 0.4 },
  heroCard: {
    borderWidth: 1.5, borderColor: C.teal + '60', borderRadius: 10,
    backgroundColor: C.panel, padding: 14, marginBottom: 6,
    position: 'relative', overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: C.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }, android: { elevation: 6 } }),
  },
  heroTitle: { fontSize: 15, fontWeight: '900', color: C.green, fontFamily: MONO, letterSpacing: 0.8 },
  heroBody:  { fontSize: 10, color: C.textBrt, fontFamily: MONO, lineHeight: 15, marginTop: 4 },
  contactCard: {
    borderWidth: 1.5, borderColor: C.cyan + '60', borderRadius: 10,
    backgroundColor: C.panel, padding: 14,
    position: 'relative', overflow: 'hidden', marginTop: 8,
    ...Platform.select({ ios: { shadowColor: C.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }, android: { elevation: 6 } }),
  },
  emailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.cyan, borderRadius: 8, paddingVertical: 14,
    ...Platform.select({ ios: { shadowColor: C.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 10 }, android: { elevation: 6 } }),
  },
  emailBtnTxt: { fontSize: 13, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 0.6 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 7, paddingVertical: 11, paddingHorizontal: 14, marginTop: 12 },
  linkTxt: { fontSize: 10, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 8 },
  footerLine: { flex: 1, height: 1, backgroundColor: C.border },
  footerTxt:  { fontSize: 7.5, color: C.text, fontFamily: MONO, letterSpacing: 0.8 },
});
