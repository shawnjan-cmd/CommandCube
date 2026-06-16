/**
 * Butler AI — Tutorial (10 Pages) · CLEAN REWRITE v1.0
 * ──────────────────────────────────────────────────────────────────
 *
 * GOAL
 *   • 100% self-contained — no imports of OnboardingOverlay,
 *     OnboardingErrorBoundary, contexts, services, or anything
 *     heavy from the codebase.
 *   • No SVG. No Animated. No native modules. No async work in render.
 *   • Just React state + RN primitives + @expo/vector-icons.
 *   • Cannot black-screen the app — every action is wrapped in
 *     try/catch and persistence is fire-and-forget.
 *
 * NAVIGATION CONTRACT
 *   • Page 1/10 → has NEXT only (no BACK).
 *   • Page 2..9 → BACK + NEXT.
 *   • Page 10/10 → BACK + FINISH (goes to home).
 *   • EVERY page has a persistent "✕ SKIP TO HOME" button top-right.
 *     Tapping it always lands the user on home immediately.
 *
 * EXIT TO HOME (triple fallback)
 *   1. router.replace('/(tabs)/nexushome')
 *   2. router.push('/(tabs)/nexushome')
 *   3. router.navigate('/(tabs)/nexushome')
 *   4. (last-ditch) router.replace('/')
 *   Each wrapped in try/catch. Persistence is fire-and-forget and
 *   never blocks the redirect.
 *
 * VISUAL THEME
 *   NEXUS v5 — black background, blue (#3b82f6) primary, neon green
 *   (#00FF88) status accents, monospace headings. Matches the rest
 *   of the app and the Safe-Mode home screen.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── PALETTE ──────────────────────────────────────────────────────────
const C = {
  bg:        '#000000',
  card:      '#0b1220',
  cardEdge:  '#1f2937',
  text:      '#e5e7eb',
  textDim:   '#9ca3af',
  textVeryDim: '#6b7280',
  brand:     '#3b82f6',   // NEXUS blue
  brandSoft: '#3b82f655',
  good:      '#00FF88',
  warn:      '#FFC400',
  danger:    '#ef4444',
  amber:     '#fb923c',
  purple:    '#a78bfa',
  cyan:      '#22d3ee',
};
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ── DESTINATION + STORAGE KEYS (string literals so we don't import) ──
const HOME_ROUTE                   = '/(tabs)/nexushome' as const;
const ONBOARDING_DONE_KEY          = '@butler_onboarding_done_v2';
const WELCOME_COMPLETE_KEY         = '@butler_welcome_complete_v1';
const TERMS_ACCEPTED_KEY           = '@butler_terms_accepted_v1';
const PRIVACY_ACCEPTED_KEY         = '@butler_privacy_accepted_v1';
const AGE_CONFIRMED_KEY            = '@butler_age_confirmed_v1';
const CONSENT_KEY                  = '@butler_consent_version';

// ── PAGE DATA (10 pages) ─────────────────────────────────────────────
// Each page is pure data — no JSX in here. The renderer below maps
// these into views. This guarantees no rendering bug can come from a
// content typo.
type Bullet = { icon: any; color: string; title: string; body: string };
type Page   = {
  num:      number;
  label:    string;       // toolbar label
  title:    string;       // big screen title
  subtitle: string;
  accent:   string;       // accent color for icons/borders on this page
  bullets:  Bullet[];
  link?:    { label: string; url: string };
};

const PAGES: Page[] = [
  {
    num: 1, label: 'WELCOME', title: 'WELCOME TO NEXUS', accent: C.brand,
    subtitle: 'Butler AI is a 100% self-hosted PC automation system. No cloud. No accounts. Your PC, your rules.',
    bullets: [
      { icon: 'wifi-off',      color: C.good,   title: 'LAN-Only · Zero Cloud',     body: 'Connects directly to a server you run on your own PC. Nothing leaves your home Wi-Fi.' },
      { icon: 'lock',          color: C.brand,  title: 'Encrypted + Signed',        body: 'Every command is HMAC-SHA256 signed. Replay-attack protected. Tampered requests are rejected.' },
      { icon: 'block',         color: C.danger, title: 'Zero Auto-Execute',         body: 'No scheduler, no cron, no background runs. Every action requires your deliberate tap.' },
      { icon: 'visibility-off',color: C.amber,  title: 'Zero Telemetry',            body: 'No analytics, no ads, no tracking IDs. Random device UUID stays on your phone.' },
    ],
  },
  {
    num: 2, label: 'APP TOUR', title: 'APP TOUR', accent: C.cyan,
    subtitle: 'Nine powerful tabs · Everything you need to automate your PC from your phone.',
    bullets: [
      { icon: 'home',           color: C.brand,  title: 'HOME',       body: 'Live dashboard. CPU/RAM/Disk metrics. QR-code pairing. Auto-discovery of your PC on the LAN.' },
      { icon: 'code',           color: C.amber,  title: 'SCRIPTS',    body: '70+ built-in Python automation scripts. Search, run, undo. Malicious-script shield always on.' },
      { icon: 'memory',         color: C.purple, title: 'AI',         body: 'Chat with a local LLM running on your own PC via Ollama. qwen2.5-coder, Mistral, Llama 3 — no API key.' },
      { icon: 'menu-book',      color: C.warn,   title: 'KB',         body: 'Self-learning knowledge base. SIGMA-NET crawls Python docs and automation guides for Butler AI.' },
      { icon: 'monitor',        color: C.good,   title: 'PC',         body: 'Real-time PC telemetry. Process list. Health score. Server event log.' },
      { icon: 'build',          color: C.cyan,   title: 'BUILD',      body: 'Visual node pipeline. Drag-and-drop Python automations. Export and run instantly.' },
      { icon: 'palette',        color: C.brand,  title: 'SKINS',      body: 'Twelve theme packs. Color palettes, icon sets, accents. Personalise every pixel.' },
      { icon: 'settings',       color: C.textDim,title: 'CONFIG',     body: 'Server settings, security keys, license, language, notifications, delete-all-my-data.' },
      { icon: 'school',         color: C.purple, title: 'INTRO',      body: 'This tutorial. Always available — re-read any page any time, no auto-redirect, no doom loops.' },
    ],
  },
  {
    num: 3, label: 'SAFETY', title: 'SAFETY CONSENT', accent: C.warn,
    subtitle: 'These rules protect you and others. Read carefully — they are not legalese, they are the actual contract.',
    bullets: [
      { icon: 'event-busy',  color: C.danger, title: '18+ ONLY',                       body: 'Butler AI is a developer tool for adults. By continuing you confirm you are at least 18.' },
      { icon: 'verified',    color: C.warn,   title: 'TERMS OF SERVICE',               body: 'You will only use Butler AI on PCs you own or are authorised to access.' },
      { icon: 'security',    color: C.good,   title: 'PRIVACY POLICY',                 body: 'Device UUID stored locally only. No personal data ever leaves your device.' },
      { icon: 'router',      color: C.brand,  title: 'LAN-ONLY OPERATION',             body: 'Butler runs on your PC. No cloud relay, no proxy server. Direct Wi-Fi only.' },
      { icon: 'qr-code-scanner', color: C.purple, title: 'CAMERA — QR PAIRING ONLY',  body: 'Camera is used exclusively to scan pairing QR codes. Nothing is ever recorded.' },
      { icon: 'terminal',    color: C.amber,  title: 'YOU CONTROL EXECUTION',          body: 'Scripts run on YOUR PC with YOUR permissions. You decide what to execute.' },
    ],
  },
  {
    num: 4, label: 'PLEDGE', title: 'SAFETY PLEDGE', accent: C.danger,
    subtitle: 'A short pledge to use Butler AI responsibly. Tap NEXT to acknowledge.',
    bullets: [
      { icon: 'block',     color: C.danger, title: 'NO UNAUTHORISED ACCESS',  body: 'I will not attempt to use Butler AI to access computers I do not own or am not authorised to control.' },
      { icon: 'bug-report',color: C.danger, title: 'NO MALWARE',              body: 'I will not deploy malware, ransomware, crypto-miners, or destructive scripts.' },
      { icon: 'group-off', color: C.amber,  title: 'NO PRIVACY VIOLATIONS',   body: 'I will not use Butler AI to spy on, surveil, or violate the privacy of others.' },
      { icon: 'gavel',     color: C.warn,   title: 'LAWFUL USE ONLY',         body: 'I will use Butler AI only for lawful personal automation on hardware I own.' },
      { icon: 'shield',    color: C.good,   title: 'PERSONAL RESPONSIBILITY', body: 'Butler AI includes safety guards but I remain personally responsible for what I execute.' },
    ],
  },
  {
    num: 5, label: 'LEGAL', title: 'LEGAL DOCUMENTS', accent: C.cyan,
    subtitle: 'Full text available online. Tap any item below to open it in your browser.',
    bullets: [
      { icon: 'visibility',     color: C.cyan,   title: 'Privacy Policy',           body: 'Device UUID only. No scripts, contacts, location, or telemetry collected. LAN-only. Delete anytime.' },
      { icon: 'gavel',          color: C.warn,   title: 'Terms of Service',         body: '18+ only. Personal PCs only. No unauthorised access. No malware. Comply with local laws.' },
      { icon: 'security',       color: C.good,   title: 'Data Safety Declaration', body: 'Camera for QR only, never stored. No analytics. No ads. SQLite local. Open-source audit ready.' },
      { icon: 'delete-forever', color: C.danger, title: 'Data Deletion Policy',     body: 'Settings → DELETE ALL MY DATA · 3 taps. Immediate, permanent, irreversible. No cloud backup.' },
    ],
    link: { label: 'OPEN FULL DOCUMENTS', url: 'https://shawnjan-cmd.github.io/privacy-policy-/' },
  },
  {
    num: 6, label: 'PERMISSIONS', title: 'PERMISSIONS', accent: C.brand,
    subtitle: 'Butler AI asks for the absolute minimum. Each permission has a specific purpose — nothing else.',
    bullets: [
      { icon: 'wifi',       color: C.brand,  title: 'LOCAL NETWORK · REQUIRED', body: 'Discover your PC server on Wi-Fi and send/receive commands. No internet permission requested.' },
      { icon: 'photo-camera',color: C.purple, title: 'CAMERA · OPTIONAL',       body: 'Scan QR codes displayed on your PC for one-tap pairing. Nothing is photographed or stored.' },
      { icon: 'folder',     color: C.amber,  title: 'STORAGE · OPTIONAL',       body: 'Send a file from your phone to your PC. Used only when you tap "Send File" — never in background.' },
      { icon: 'fingerprint',color: C.good,   title: 'BIOMETRICS · OPTIONAL',    body: 'Lock the app with FaceID / fingerprint. Disabled by default. Configure in Settings.' },
    ],
  },
  {
    num: 7, label: 'Q & A', title: 'QUESTIONS & ANSWERS', accent: C.amber,
    subtitle: 'The most common questions, answered up front. No fine print.',
    bullets: [
      { icon: 'help',       color: C.cyan,   title: 'What does Butler AI actually do?',         body: 'It sends signed Python commands over your home Wi-Fi to a server you run on your PC. PC executes → result returns to your phone. 100% local.' },
      { icon: 'schedule',   color: C.danger, title: 'Will it run scripts on a schedule?',       body: 'No. There is no scheduler, no cron, no background auto-execution. Every action requires a manual tap. Enforced server-side, not just in the UI.' },
      { icon: 'undo',       color: C.warn,   title: 'Can I undo a script I ran by accident?',   body: 'Yes. The 1-Tap Undo log tracks every reversible operation. Open PC → Undo Log → tap any entry → Undo.' },
      { icon: 'lock',       color: C.good,   title: 'Is the LAN connection encrypted?',         body: 'Every request is HMAC-SHA256 signed with a secret you set during setup. Replay attacks are blocked by timestamp validation.' },
      { icon: 'cloud-off',  color: C.brand,  title: 'What data is collected about me?',         body: 'None. A random device UUID lives only on your phone. No scripts, outputs, file names, contacts, or analytics are ever transmitted off-device.' },
      { icon: 'delete',     color: C.danger, title: 'How do I delete all my data?',             body: 'Settings → DELETE ALL MY DATA — three taps. Wipes phone storage, KB, history, UUID. The PC SQLite file is deleted via the PC uninstaller separately.' },
    ],
  },
  {
    num: 8, label: 'SERVER', title: 'SERVER PRIVACY', accent: C.good,
    subtitle: 'butler_server.py runs entirely on YOUR PC. Here is exactly what it does and what it does NOT do.',
    bullets: [
      { icon: 'computer',  color: C.brand,  title: 'Runs on YOUR PC',            body: 'A small Flask server bound to your LAN interface only. Never exposed to the public internet. Never accepts cloud connections.' },
      { icon: 'storage',   color: C.good,   title: 'Local SQLite Database',      body: 'Scripts, logs, KB entries, execution history — all stored in a single .db file on your PC. Nothing is uploaded anywhere.' },
      { icon: 'code',      color: C.amber,  title: 'Executes Python Only',       body: 'The server accepts only signed Python payloads and executes them via your system Python. No shell, no other execution modes.' },
      { icon: 'verified-user', color: C.purple, title: 'HMAC-SHA256 Signed',     body: 'Every request is signed with a shared secret. Unsigned or tampered requests are rejected. Replay-protected.' },
      { icon: 'block',     color: C.danger, title: 'Malicious-Script Shield',    body: 'Hard-coded blocklist: rm -rf /, format/diskpart, registry wipes, shutdown commands, miner patterns. Blocked before execution.' },
    ],
  },
  {
    num: 9, label: 'SETUP',  title: 'PC SETUP', accent: C.purple,
    subtitle: 'Three steps to get butler_server.py running on your PC. Total time: about 5 minutes.',
    bullets: [
      { icon: 'looks-one',  color: C.cyan,   title: 'INSTALL REQUIREMENTS', body: 'One installer silently sets up Python 3.12+, all pip packages, Ollama, and the qwen2.5-coder:7b model on your PC.' },
      { icon: 'looks-two',  color: C.warn,   title: 'DOWNLOAD BUTLER SERVER', body: 'butler_server.py runs on your PC, displays a QR code, and starts a signed LAN bridge ready for your phone.' },
      { icon: 'looks-3',    color: C.good,   title: 'CONNECT & CONTROL',     body: 'Scan the QR code shown on your PC, or enter the IP address manually. Pairing is one-time — auto-reconnects on future launches.' },
    ],
    link: { label: 'SETUP DOCS', url: 'https://shawnjan-cmd.github.io/privacy-policy-/' },
  },
  {
    num: 10, label: 'LAUNCH', title: 'YOU ARE READY', accent: C.good,
    subtitle: 'That is everything. Tap FINISH to head to the home dashboard and start automating your PC.',
    bullets: [
      { icon: 'check-circle', color: C.good,  title: 'No accounts. No cloud.',        body: 'You are not signing up for anything. Butler AI runs entirely on hardware you own.' },
      { icon: 'speed',        color: C.brand, title: 'Fast.',                         body: 'Direct Wi-Fi means commands execute in milliseconds. No round-trip through a cloud relay.' },
      { icon: 'all-inclusive',color: C.amber, title: 'Yours forever.',                body: 'No subscriptions. The full app is free. Pro license is one-time and optional.' },
      { icon: 'favorite',     color: C.danger,title: 'Open and auditable.',           body: 'Privacy policy mirrors the actual code. If you ever doubt that, read the source.' },
    ],
  },
];

const TOTAL = PAGES.length;

// ── EXIT-TO-HOME (triple-fallback, never throws) ─────────────────────
function persistOnboardingComplete() {
  // Fire-and-forget — never blocks the redirect. If storage fails for
  // any reason, the user still gets sent home.
  try {
    AsyncStorage.multiSet([
      [ONBOARDING_DONE_KEY,           'true'],
      [WELCOME_COMPLETE_KEY,          'true'],
      [TERMS_ACCEPTED_KEY,            'true'],
      [PRIVACY_ACCEPTED_KEY,          'true'],
      [CONSENT_KEY,                   '1.0.0'],
      [AGE_CONFIRMED_KEY,             'true'],
      ['@butler_stable_state',        'onboarded'],
    ]).catch(() => {});
  } catch {}
}

function navigateHome(router: ReturnType<typeof useRouter>) {
  try { router.replace(HOME_ROUTE as any);  return; } catch (e1) { console.warn('[tutorial] replace failed:', e1); }
  try { router.push(HOME_ROUTE as any);     return; } catch (e2) { console.warn('[tutorial] push failed:',    e2); }
  try { (router as any).navigate?.(HOME_ROUTE); return; } catch (e3) { console.warn('[tutorial] navigate failed:', e3); }
  // Last ditch — try the root index which itself routes to home.
  try { router.replace('/' as any); } catch {}
}

// ── COMPONENT ────────────────────────────────────────────────────────
export default function OnboardingTab() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);

  const page    = PAGES[idx];
  const isFirst = idx === 0;
  const isLast  = idx === TOTAL - 1;

  // ── Handlers (all swallowed try/catch — none can crash the screen) ─
  const goNext = useCallback(() => {
    try {
      if (isLast) {
        persistOnboardingComplete();
        navigateHome(router);
      } else {
        setIdx(i => Math.min(i + 1, TOTAL - 1));
      }
    } catch (e) { console.warn('[tutorial] goNext failed:', e); }
  }, [isLast, router]);

  const goBack = useCallback(() => {
    try { setIdx(i => Math.max(0, i - 1)); } catch {}
  }, []);

  const skipHome = useCallback(() => {
    try {
      persistOnboardingComplete();
      navigateHome(router);
    } catch (e) { console.warn('[tutorial] skipHome failed:', e); }
  }, [router]);

  const openLink = useCallback((url: string) => {
    try { Linking.openURL(url).catch(() => {}); } catch {}
  }, []);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* TOP BAR — page indicator + skip */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.topBarStep}>{String(page.num).padStart(2, '0')} / {String(TOTAL).padStart(2, '0')}</Text>
          <Text style={[styles.topBarLabel, { color: page.accent }]}>{page.label}</Text>
        </View>
        <TouchableOpacity
          onPress={skipHome}
          activeOpacity={0.7}
          style={styles.skipBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.skipBtnTxt}>SKIP TO HOME ✕</Text>
        </TouchableOpacity>
      </View>

      {/* PROGRESS BAR */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${((idx + 1) / TOTAL) * 100}%`, backgroundColor: page.accent },
          ]}
        />
      </View>

      {/* CONTENT */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title block */}
        <View style={styles.titleBlock}>
          <View style={[styles.titleIcon, { borderColor: page.accent + '55', backgroundColor: page.accent + '12' }]}>
            <Text style={[styles.titleIconNum, { color: page.accent }]}>{page.num}</Text>
          </View>
          <Text style={[styles.title, { color: page.accent }]}>{page.title}</Text>
          <Text style={styles.subtitle}>{page.subtitle}</Text>
        </View>

        {/* Bullets — pure data → views, can't crash */}
        {page.bullets.map((b, i) => (
          <View
            key={`${page.num}-${i}`}
            style={[styles.card, { borderColor: b.color + '40' }]}
          >
            <View style={[styles.cardIconWrap, { borderColor: b.color + '55', backgroundColor: b.color + '12' }]}>
              <MaterialIcons name={b.icon as any} size={20} color={b.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: b.color }]}>{b.title}</Text>
              <Text style={styles.cardBody}>{b.body}</Text>
            </View>
          </View>
        ))}

        {/* Optional link button */}
        {page.link ? (
          <TouchableOpacity
            onPress={() => openLink(page.link!.url)}
            style={[styles.linkBtn, { borderColor: page.accent + '66' }]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="open-in-new" size={14} color={page.accent} />
            <Text style={[styles.linkBtnTxt, { color: page.accent }]}>{page.link.label}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* BOTTOM NAV — always visible */}
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        {!isFirst ? (
          <TouchableOpacity
            onPress={goBack}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={16} color={C.textDim} />
            <Text style={styles.backBtnTxt}>BACK</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 96 }} />
        )}

        <TouchableOpacity
          onPress={goNext}
          style={[styles.nextBtn, { backgroundColor: page.accent }]}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnTxt}>
            {isLast ? 'FINISH · GO HOME' : 'NEXT'}
          </Text>
          <MaterialIcons
            name={isLast ? 'check' : 'arrow-forward'}
            size={18}
            color="#000000"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── STYLES ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // TOP BAR
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topBarStep: {
    fontSize: 11, fontWeight: '900', color: C.textVeryDim,
    fontFamily: MONO, letterSpacing: 1.5,
  },
  topBarLabel: {
    fontSize: 11, fontWeight: '900',
    fontFamily: MONO, letterSpacing: 2,
  },
  skipBtn: {
    borderWidth: 1, borderColor: C.cardEdge,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
  },
  skipBtnTxt: {
    fontSize: 10, fontWeight: '900', color: C.textDim,
    fontFamily: MONO, letterSpacing: 1.5,
  },

  // PROGRESS BAR
  progressTrack: {
    height: 3, backgroundColor: '#0f1219', marginHorizontal: 16, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },

  // SCROLL
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  // TITLE
  titleBlock: { alignItems: 'center', marginBottom: 24 },
  titleIcon: {
    width: 56, height: 56, borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  titleIconNum: {
    fontSize: 22, fontWeight: '900',
    fontFamily: MONO, letterSpacing: 1,
  },
  title: {
    fontSize: 24, fontWeight: '900',
    fontFamily: MONO, letterSpacing: 3,
    marginBottom: 10, textAlign: 'center',
  },
  subtitle: {
    fontSize: 13, color: C.textDim, lineHeight: 20,
    textAlign: 'center', paddingHorizontal: 8,
  },

  // BULLET CARD
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: C.card,
    padding: 14,
    marginBottom: 10,
  },
  cardIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 13, fontWeight: '900',
    fontFamily: MONO, letterSpacing: 1,
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 13, color: C.text, lineHeight: 18,
  },

  // LINK BUTTON
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderRadius: 8,
    paddingVertical: 11, marginTop: 6, marginBottom: 4,
  },
  linkBtnTxt: {
    fontSize: 11, fontWeight: '900',
    fontFamily: MONO, letterSpacing: 1.5,
  },

  // BOTTOM NAV
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.cardEdge,
    backgroundColor: '#050709',
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 1, borderColor: C.cardEdge,
    borderRadius: 8, minWidth: 96, justifyContent: 'center',
  },
  backBtnTxt: {
    fontSize: 11, fontWeight: '900', color: C.textDim,
    fontFamily: MONO, letterSpacing: 1.5,
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 8,
  },
  nextBtnTxt: {
    fontSize: 13, fontWeight: '900', color: '#000',
    fontFamily: MONO, letterSpacing: 2,
  },
});
