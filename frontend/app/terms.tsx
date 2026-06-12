/**
 * ⚖️ TERMS OF SERVICE — Teal HUD Theme
 * MIT License · Acceptable Use · Liability Disclaimer
 * Accessible from Settings → Legal section
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Linking, Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { haptics } from '@/services/haptics';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ─── Teal HUD Palette ────────────────────────────────────────────
const C = {
  bg:      '#0A0B0D',
  panel:   '#131418',
  teal:    '#FF2A1F',
  tealBrt: '#FF2A1F',
  tealDim: '#55201A',
  tealMid: '#8A2A20',
  cyan:    '#FF2A1F',
  green:   '#44FF88',
  amber:   '#FF6A1F',
  red:     '#FF6A1F',
  purple:  '#FFC400',
  text:    '#5A626E',
  textBrt: '#9AA3B2',
  textHi:  '#E6E9EF',
  border:  '#1A1D24',
  borderHi:'#1A3344',
};

// ─── Circuit trace background ─────────────────────────────────────
function CircuitBg() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[40,90,150,210,280,360,440,530,620,720,820,920].map((top, i) => (
        <View key={`h${i}`} style={{ position:'absolute', top, left:0, right:0, height:1, backgroundColor:C.teal+'10' }} />
      ))}
      {[30,90,150,220,300,370].map((left, i) => (
        <View key={`v${i}`} style={{ position:'absolute', left, top:0, bottom:0, width:1, backgroundColor:C.teal+'08' }} />
      ))}
    </View>
  );
}

// ─── HUD Corner brackets ─────────────────────────────────────────
function HUDCorners({ sz=10, col=C.teal, w=2 }: { sz?:number; col?:string; w?:number }) {
  return (
    <>
      <View style={{ position:'absolute', top:0, left:0, width:sz, height:sz, borderTopWidth:w, borderLeftWidth:w, borderColor:col }} />
      <View style={{ position:'absolute', top:0, right:0, width:sz, height:sz, borderTopWidth:w, borderRightWidth:w, borderColor:col }} />
      <View style={{ position:'absolute', bottom:0, left:0, width:sz, height:sz, borderBottomWidth:w, borderLeftWidth:w, borderColor:col }} />
      <View style={{ position:'absolute', bottom:0, right:0, width:sz, height:sz, borderBottomWidth:w, borderRightWidth:w, borderColor:col }} />
    </>
  );
}

// ─── Section header ───────────────────────────────────────────────
function SectionHeader({ label, color = C.teal, icon }: { label: string; color?: string; icon?: string }) {
  return (
    <View style={[sh.wrap, { borderLeftColor: color }]}>
      {icon ? <MaterialIcons name={icon as any} size={12} color={color} /> : null}
      <Text style={[sh.txt, { color }]}>{label}</Text>
      <View style={[sh.line, { backgroundColor: color + '35' }]} />
    </View>
  );
}
const sh = StyleSheet.create({
  wrap: { flexDirection:'row', alignItems:'center', gap:8, borderLeftWidth:3, paddingLeft:10, marginTop:20, marginBottom:10 },
  txt:  { fontSize:9, fontWeight:'900', fontFamily:MONO, letterSpacing:1.8 },
  line: { flex:1, height:1 },
});

// ─── Collapsible section ──────────────────────────────────────────
function CollapseSection({ title, icon, color = C.teal, children, defaultOpen = false }: {
  title: string; icon: string; color?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const rotAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    haptics.light();
    Animated.spring(rotAnim, { toValue: open ? 0 : 1, tension: 180, friction: 10, useNativeDriver: false }).start();
    setOpen(v => !v);
  };

  return (
    <View style={[cs.wrap, { borderColor: open ? color + '50' : C.border }]}>
      <HUDCorners sz={8} col={open ? color : C.tealDim} w={1.5} />
      <TouchableOpacity style={cs.hdr} onPress={toggle} activeOpacity={0.8}>
        <View style={[cs.iconBox, { borderColor: color + '60', backgroundColor: color + '15' }]}>
          <MaterialIcons name={icon as any} size={14} color={color} />
        </View>
        <Text style={[cs.title, { color: open ? color : C.textBrt }]}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate: rotAnim.interpolate({ inputRange:[0,1], outputRange:['0deg','180deg'] }) }] }}>
          <MaterialIcons name="keyboard-arrow-down" size={18} color={open ? color : C.text} />
        </Animated.View>
      </TouchableOpacity>
      {open ? (
        <View style={[cs.body, { borderTopColor: color + '25' }]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}
const cs = StyleSheet.create({
  wrap:   { borderWidth:1.5, borderRadius:8, backgroundColor:C.panel, marginBottom:10, overflow:'hidden', position:'relative' },
  hdr:    { flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:14, paddingVertical:13 },
  iconBox:{ width:32, height:32, borderWidth:1.5, borderRadius:6, alignItems:'center', justifyContent:'center' },
  title:  { flex:1, fontSize:11, fontWeight:'900', fontFamily:MONO, letterSpacing:0.6 },
  body:   { paddingHorizontal:14, paddingTop:12, paddingBottom:14, borderTopWidth:1 },
});

// ─── Body text ────────────────────────────────────────────────────
function Body({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontSize:11, color:C.textBrt, fontFamily:MONO, lineHeight:19 }}>{children}</Text>;
}

// ─── Bullet item ──────────────────────────────────────────────────
function Bullet({ text, ok = true, color }: { text: string; ok?: boolean; color?: string }) {
  const col = color || (ok ? C.green : C.red);
  return (
    <View style={{ flexDirection:'row', alignItems:'flex-start', gap:8, marginBottom:6 }}>
      <MaterialIcons name={ok ? 'check-circle' : 'cancel'} size={13} color={col} style={{ marginTop:2 }} />
      <Text style={{ flex:1, fontSize:11, color:C.textBrt, fontFamily:MONO, lineHeight:17 }}>{text}</Text>
    </View>
  );
}

// ─── Info row ─────────────────────────────────────────────────────
function InfoRow({ label, value, color = C.teal }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection:'row', alignItems:'flex-start', gap:10, paddingVertical:8, borderBottomWidth:1, borderBottomColor:C.border }}>
      <Text style={{ fontSize:9, fontWeight:'700', color:C.text, fontFamily:MONO, width:90 }}>{label}</Text>
      <Text style={{ flex:1, fontSize:10, color, fontFamily:MONO, lineHeight:15 }}>{value}</Text>
    </View>
  );
}

// ─── Badge pill ───────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ borderWidth:1, borderColor:color+'60', borderRadius:4, paddingHorizontal:8, paddingVertical:4, backgroundColor:color+'14' }}>
      <Text style={{ fontSize:8, fontWeight:'900', color, fontFamily:MONO, letterSpacing:0.6 }}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────
export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue:1,   duration:1400, useNativeDriver:false }),
      Animated.timing(glowAnim, { toValue:0.3, duration:1400, useNativeDriver:false }),
    ])).start();
  }, []);

  const handleBack = () => {
    haptics.light();
    router.back();
  };

  const handleEmail = () => {
    haptics.medium();
    Linking.openURL('mailto:andrejsladkovic1992@gmail.com');
  };

  return (
    <View style={[t.root, { paddingTop: insets.top }]}>
      <CircuitBg />

      {/* ── HEADER ── */}
      <View style={t.header}>
        {/* HUD top accent */}
        <View style={{ position:'absolute', top:0, left:0, right:0, height:2, backgroundColor:C.teal }} pointerEvents="none" />
        <View style={{ position:'absolute', bottom:0, left:0, right:0, height:1, backgroundColor:C.teal+'40' }} pointerEvents="none" />

        <TouchableOpacity
          style={t.backBtn}
          onPress={handleBack}
          activeOpacity={0.8}
          hitSlop={{ top:12, bottom:12, left:12, right:12 }}
        >
          <MaterialIcons name="arrow-back" size={18} color={C.teal} />
        </TouchableOpacity>

        {/* Gavel icon + title */}
        <View style={t.titleBlock}>
          <Animated.View style={[t.gavelBox, { borderColor: glowAnim.interpolate({ inputRange:[0.3,1], outputRange:[C.tealDim, C.teal+'AA'] }) }]}>
            <MaterialIcons name="gavel" size={20} color={C.teal} />
          </Animated.View>
          <View>
            <Text style={t.headerTitle}>TERMS OF SERVICE</Text>
            <Text style={t.headerSub}>Butler AI · v5.0 · Effective April 1, 2026</Text>
          </View>
        </View>

        {/* Status badge */}
        <Animated.View style={[t.activeBadge, { borderColor: glowAnim.interpolate({ inputRange:[0.3,1], outputRange:['#003322','#22FF4488'] }) }]}>
          <Animated.View style={{ width:6, height:6, borderRadius:3, backgroundColor:C.green, opacity:glowAnim }} />
          <Text style={t.activeTxt}>ACTIVE</Text>
        </Animated.View>
      </View>

      {/* ── QUICK NAV ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={t.navBar} contentContainerStyle={{ paddingHorizontal:14, gap:8, paddingVertical:8 }}>
        {[
          { label:'Overview',    anchor:0,   icon:'info' },
          { label:'MIT License', anchor:600, icon:'code' },
          { label:'Acceptable Use', anchor:1100, icon:'verified-user' },
          { label:'Liability',   anchor:1800, icon:'shield' },
          { label:'Contact',     anchor:2600, icon:'email' },
        ].map(({ label, anchor, icon }) => (
          <TouchableOpacity
            key={label}
            style={t.navChip}
            onPress={() => { haptics.light(); scrollRef.current?.scrollTo({ y: anchor, animated: true }); }}
            activeOpacity={0.75}
          >
            <MaterialIcons name={icon as any} size={10} color={C.teal} />
            <Text style={t.navChipTxt}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── CONTENT ── */}
      <ScrollView
        ref={scrollRef}
        style={{ flex:1 }}
        contentContainerStyle={{ padding:14, paddingBottom: Math.max(insets.bottom + 40, 60) }}
        showsVerticalScrollIndicator={false}
      >

        {/* Hero intro card */}
        <View style={t.heroCard}>
          <HUDCorners sz={12} col={C.tealBrt} w={2} />
          <View style={{ flexDirection:'row', gap:10 }}>
            <View style={{ width:4, backgroundColor:C.teal, borderRadius:2 }} />
            <View style={{ flex:1, gap:6 }}>
              <Text style={t.heroTitle}>BUTLER AI AUTOMATION SYSTEM</Text>
              <Text style={t.heroBody}>
                By downloading or using Butler AI, you agree to these Terms of Service. This app is a self-hosted remote PC automation tool designed for power users and developers.
              </Text>
              <View style={{ flexDirection:'row', gap:6, flexWrap:'wrap', marginTop:4 }}>
                <Badge label="SELF-HOSTED" color={C.teal} />
                <Badge label="MIT SERVER CODE" color={C.green} />
                <Badge label="NO CLOUD" color={C.amber} />
                <Badge label="PLAY STORE COMPLIANT" color={C.purple} />
              </View>
            </View>
          </View>
        </View>

        {/* 1. What Butler AI Does */}
        <SectionHeader label="1. WHAT BUTLER AI DOES" icon="info-outline" />
        <CollapseSection title="App Overview & Purpose" icon="home" defaultOpen>
          <Body>
            Butler AI connects your Android device to a Python server (butler_server.py) running on your own personal computer over your local Wi-Fi network. You can send Python scripts to your PC, chat with a local AI model, monitor system resources, and transfer files — all entirely within your own private network.
            {'\n\n'}Butler AI is built for power users and developers who want to automate tasks on their own computers. It is NOT intended for unauthorized remote access.
          </Body>
          <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap', marginTop:12 }}>
            {['Script Execution','Local AI Chat','System Monitoring','File Transfer','Knowledge Base'].map(f => (
              <View key={f} style={{ borderWidth:1, borderColor:C.teal+'50', borderRadius:4, paddingHorizontal:8, paddingVertical:4, backgroundColor:C.teal+'10' }}>
                <Text style={{ fontSize:8, color:C.teal, fontFamily:MONO, fontWeight:'700' }}>{f}</Text>
              </View>
            ))}
          </View>
        </CollapseSection>

        {/* 2. MIT License */}
        <SectionHeader label="2. MIT LICENSE" icon="code" color={C.green} />
        <CollapseSection title="Open Source Server Code (MIT)" icon="code" color={C.green} defaultOpen>
          <View style={t.mitBox}>
            <Text style={t.mitTitle}>MIT License</Text>
            <Text style={t.mitYear}>Copyright (c) 2026 Butler AI</Text>
            <Text style={t.mitBody}>
              Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
            </Text>
            <View style={t.mitCondBox}>
              <Text style={t.mitCond}>The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.</Text>
            </View>
            <Text style={[t.mitBody, { marginTop:10 }]}>
              THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
            </Text>
          </View>

          <View style={{ gap:6, marginTop:12 }}>
            <Text style={{ fontSize:9, fontWeight:'900', color:C.green, fontFamily:MONO, letterSpacing:1, marginBottom:4 }}>APPLIES TO:</Text>
            {[
              { item:'butler_server.py — Python PC server',         ok:true },
              { item:'All Python scripts in the built-in library',  ok:true },
              { item:'Python automation knowledge base content',    ok:true },
              { item:'butler_server.py setup and install scripts',  ok:true },
            ].map(({ item, ok }) => <Bullet key={item} text={item} ok={ok} color={C.green} />)}
            <Text style={{ fontSize:9, fontWeight:'900', color:C.amber, fontFamily:MONO, letterSpacing:1, marginTop:8, marginBottom:4 }}>PROPRIETARY (NOT MIT):</Text>
            {[
              { item:'Butler AI mobile app UI and design system', col:C.amber },
              { item:'Φ-NEXUS Bridge Protocol algorithms',        col:C.amber },
              { item:'SIGMA-NET relay crawler implementation',    col:C.amber },
            ].map(({ item, col }) => <Bullet key={item} text={item} ok={false} color={col} />)}
          </View>

          <View style={t.ossRow}>
            {[
              { name:'React Native', lic:'MIT', url:'https://github.com/facebook/react-native' },
              { name:'Expo',         lic:'MIT', url:'https://github.com/expo/expo' },
              { name:'Ollama',       lic:'MIT', url:'https://github.com/ollama/ollama' },
              { name:'expo/vector-icons', lic:'MIT', url:'https://github.com/expo/vector-icons' },
            ].map(({ name, lic, url }) => (
              <TouchableOpacity key={name} style={t.ossCard} onPress={() => { haptics.light(); Linking.openURL(url); }} activeOpacity={0.8}>
                <Text style={t.ossName} numberOfLines={1}>{name}</Text>
                <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
                  <Text style={t.ossLic}>{lic}</Text>
                  <MaterialIcons name="open-in-new" size={9} color={C.tealMid} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </CollapseSection>

        {/* 3. Acceptable Use */}
        <SectionHeader label="3. ACCEPTABLE USE POLICY" icon="verified-user" color={C.teal} />
        <CollapseSection title="What You May Do" icon="check-circle" color={C.green} defaultOpen>
          {[
            'Automate repetitive tasks on your own computer',
            'Run Python scripts on your own PC and devices',
            'Monitor CPU, RAM, Disk resources on your own system',
            'Transfer files between your own phone and PC',
            'Use Butler AI for personal productivity and development',
            'Share butler_server.py with others under MIT license',
            'Modify the server code for personal use',
            'Use the built-in script library for legitimate automation',
          ].map(item => <Bullet key={item} text={item} ok color={C.green} />)}
        </CollapseSection>

        <CollapseSection title="What You May NOT Do" icon="block" color={C.red}>
          {[
            'Access computers you do not own or have explicit written permission to access',
            'Execute malicious code, malware, ransomware, or spyware',
            'Use Butler AI to circumvent security systems or DRM',
            'Conduct unauthorized network scanning or port scanning',
            'Violate any applicable local, national, or international laws',
            'Harass, harm, monitor, or stalk other persons without consent',
            'Use the app to commit fraud or identity theft',
            'Attempt to reverse-engineer proprietary components',
            'Resell or sublicense proprietary components of Butler AI',
          ].map(item => <Bullet key={item} text={item} ok={false} color={C.red} />)}
        </CollapseSection>

        {/* 4. Script Execution */}
        <SectionHeader label="4. SCRIPT EXECUTION" icon="terminal" color={C.amber} />
        <CollapseSection title="Your Responsibility for Scripts" icon="warning" color={C.amber}>
          <Body>
            Butler AI executes Python scripts on YOUR PC. You are solely and entirely responsible for:
          </Body>
          <View style={{ gap:6, marginTop:10 }}>
            {[
              'The content and safety of all scripts you run',
              'Any effects those scripts have on your system or data',
              'Reviewing scripts from the AI generator before running',
              'Ensuring scripts do not harm your system or data',
            ].map(item => <Bullet key={item} text={item} ok={false} color={C.amber} />)}
          </View>
          <View style={[t.warningBox, { borderColor:C.amber+'50', backgroundColor:C.amber+'0E' }]}>
            <MaterialIcons name="warning" size={14} color={C.amber} />
            <Text style={[t.warningTxt, { color:C.amber }]}>
              Butler AI includes a Safety Guard that scans scripts for dangerous patterns. This is a convenience feature, NOT a security guarantee. Always review scripts before running them.
            </Text>
          </View>
        </CollapseSection>

        {/* 5. AI Disclaimer */}
        <SectionHeader label="5. AI FEATURES" icon="smart-toy" color={C.purple} />
        <CollapseSection title="Artificial Intelligence Disclaimer" icon="psychology" color={C.purple}>
          <Body>
            Butler AI integrates with Ollama (local AI running on your PC) and optionally Google Gemini API. Important limitations:
          </Body>
          <View style={{ gap:8, marginTop:10 }}>
            {[
              { t:'AI responses may be inaccurate, incomplete, or outdated', col:C.amber },
              { t:'Do not use AI output for medical, legal, or financial decisions', col:C.red },
              { t:'AI-generated scripts must be reviewed before execution', col:C.amber },
              { t:'Ollama runs 100% locally — no data sent to third parties', col:C.green },
              { t:'Gemini API (if configured): messages sent to Google servers', col:C.amber },
            ].map(({ t, col }) => (
              <View key={t} style={{ flexDirection:'row', alignItems:'flex-start', gap:8 }}>
                <MaterialIcons name="info" size={12} color={col} style={{ marginTop:3 }} />
                <Text style={{ flex:1, fontSize:11, color:C.textBrt, fontFamily:MONO, lineHeight:17 }}>{t}</Text>
              </View>
            ))}
          </View>
        </CollapseSection>

        {/* 6. Liability */}
        <SectionHeader label="6. LIABILITY & WARRANTY" icon="shield" color={C.red} />
        <CollapseSection title="No Warranty — Provided As-Is" icon="gavel" color={C.red}>
          <View style={[t.warningBox, { borderColor:C.red+'50', backgroundColor:C.red+'0C' }]}>
            <MaterialIcons name="error-outline" size={14} color={C.red} />
            <Text style={[t.warningTxt, { color:C.red + 'CC' }]}>
              BUTLER AI IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
            </Text>
          </View>
          <View style={{ gap:6, marginTop:12 }}>
            <Body>We do not warrant that:</Body>
            {[
              'The app will be uninterrupted or error-free at all times',
              'All defects or bugs will be corrected promptly',
              'The app is free from security vulnerabilities',
              'Server scripts will work on all PC configurations',
            ].map(item => <Bullet key={item} text={item} ok={false} color={C.red} />)}
          </View>
        </CollapseSection>

        <CollapseSection title="Limitation of Liability" icon="balance" color={C.red}>
          <Body>
            To the maximum extent permitted by applicable law, the developers of Butler AI shall NOT be liable for any:
          </Body>
          <View style={{ gap:6, marginTop:10 }}>
            {[
              'Indirect, incidental, or consequential damages',
              'Loss of data, profits, or business opportunities',
              'System damage caused by executing scripts',
              'Security incidents resulting from misconfiguration',
              'Third-party service outages (Google Gemini, Ollama)',
            ].map(item => <Bullet key={item} text={item} ok={false} color={C.red} />)}
          </View>
          <View style={[t.warningBox, { borderColor:C.teal+'50', backgroundColor:C.teal+'0C', marginTop:12 }]}>
            <MaterialIcons name="info" size={14} color={C.teal} />
            <Text style={[t.warningTxt, { color:C.teal }]}>
              You assume full responsibility for any scripts you execute on your computer. Butler AI is a tool — how you use it is your responsibility.
            </Text>
          </View>
        </CollapseSection>

        {/* 7. Privacy */}
        <SectionHeader label="7. PRIVACY" icon="privacy-tip" color={C.green} />
        <CollapseSection title="Data & Privacy Summary" icon="lock" color={C.green} defaultOpen>
          <Body>Butler AI collects NO personal data. Full details in our Privacy Policy.</Body>
          <View style={{ gap:6, marginTop:10 }}>
            <InfoRow label="Data Sent"    value="Nothing — all compute stays on your LAN" color={C.green} />
            <InfoRow label="Cloud"        value="None — 100% self-hosted architecture" color={C.green} />
            <InfoRow label="Analytics"    value="No tracking, no telemetry, no SDKs" color={C.green} />
            <InfoRow label="Account"      value="No signup or login required" color={C.green} />
            <InfoRow label="Camera"       value="QR pairing only — nothing stored" color={C.green} />
            <InfoRow label="Local Storage"value="IP, token, scripts, KB — on device only" color={C.teal} />
          </View>
          <TouchableOpacity
            style={[t.linkBtn, { borderColor:C.green+'60', backgroundColor:C.green+'10' }]}
            onPress={() => { haptics.light(); try { router.push('/privacy-policy' as any); } catch { Linking.openURL('https://shawnjan-cmd.github.io/butler-ai/'); } }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="open-in-new" size={13} color={C.green} />
            <Text style={[t.linkTxt, { color:C.green }]}>Read Full Privacy Policy</Text>
            <MaterialIcons name="arrow-forward-ios" size={11} color={C.green} />
          </TouchableOpacity>
        </CollapseSection>

        {/* 8. Intellectual Property */}
        <SectionHeader label="8. INTELLECTUAL PROPERTY" icon="workspace-premium" color={C.amber} />
        <CollapseSection title="Copyright & Ownership" icon="copyright" color={C.amber}>
          <View style={{ gap:0 }}>
            <InfoRow label="App UI"       value="Proprietary — copyright 2026 Butler AI" color={C.amber} />
            <InfoRow label="Server Code"  value="MIT License — open source, fork freely" color={C.green} />
            <InfoRow label="Script Library" value="MIT License — use and share freely" color={C.green} />
            <InfoRow label="Φ-NEXUS Bridge" value="Proprietary — trade secret algorithms" color={C.amber} />
            <InfoRow label="Trademarks"   value='"Butler AI" brand and logo are reserved' color={C.amber} />
          </View>
          <View style={[t.warningBox, { borderColor:C.amber+'50', backgroundColor:C.amber+'0C', marginTop:12 }]}>
            <MaterialIcons name="info" size={14} color={C.amber} />
            <Text style={[t.warningTxt, { color:C.amber }]}>
              Third-party software (Ollama, React Native, Expo) are owned by their respective companies and governed by their own licenses.
            </Text>
          </View>
        </CollapseSection>

        {/* 9. Changes */}
        <SectionHeader label="9. CHANGES TO TERMS" icon="update" color={C.teal} />
        <CollapseSection title="Terms Updates & Notification" icon="notifications" color={C.teal}>
          <Body>
            We may update these Terms from time to time. When we do:
            {'\n\n'}• The "Effective" date in the header will be updated
            {'\n'}• Material changes will be noted in the app update changelog
            {'\n'}• Continued use after changes constitutes acceptance
            {'\n\n'}We recommend reviewing these Terms periodically, especially after app updates.
          </Body>
        </CollapseSection>

        {/* 10. Governing Law */}
        <SectionHeader label="10. GOVERNING LAW" icon="account-balance" color={C.tealMid} />
        <CollapseSection title="Legal Jurisdiction" icon="gavel" color={C.tealMid}>
          <Body>
            These Terms shall be governed by and construed in accordance with applicable law. Any disputes arising from the use of Butler AI shall be resolved through good-faith negotiation before any formal proceedings.
            {'\n\n'}If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain in full force and effect.
          </Body>
        </CollapseSection>

        {/* Contact */}
        <SectionHeader label="CONTACT & SUPPORT" icon="email" color={C.cyan} />
        <View style={t.contactCard}>
          <HUDCorners sz={12} col={C.cyan} w={2} />
          <View style={{ flexDirection:'row', gap:12, alignItems:'center', marginBottom:14 }}>
            <View style={{ width:48, height:48, borderRadius:10, backgroundColor:C.cyan+'18', borderWidth:1.5, borderColor:C.cyan+'60', alignItems:'center', justifyContent:'center' }}>
              <MaterialIcons name="support-agent" size={24} color={C.cyan} />
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:11, fontWeight:'900', color:C.cyan, fontFamily:MONO, letterSpacing:0.6 }}>Questions About These Terms?</Text>
              <Text style={{ fontSize:9, color:C.text, fontFamily:MONO, marginTop:3 }}>We respond within 48 hours</Text>
            </View>
          </View>

          <TouchableOpacity style={t.emailBtn} onPress={handleEmail} activeOpacity={0.85}>
            <MaterialIcons name="email" size={16} color="#000" />
            <Text style={t.emailBtnTxt}>andrejsladkovic1992@gmail.com</Text>
            <MaterialIcons name="arrow-forward" size={14} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[t.linkBtn, { borderColor:C.purple+'60', backgroundColor:C.purple+'10', marginTop:10 }]}
            onPress={() => { haptics.light(); try { router.push('/data-safety' as any); } catch { Linking.openURL('https://shawnjan-cmd.github.io/butler-ai/'); } }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="security" size={13} color={C.purple} />
            <Text style={[t.linkTxt, { color:C.purple }]}>View Data Safety Report</Text>
            <MaterialIcons name="arrow-forward-ios" size={11} color={C.purple} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={t.footer}>
          <View style={t.footerLine} />
          <View style={{ alignItems:'center', gap:4 }}>
            <Text style={t.footerTxt}>BUTLER AI v5.0 · Terms of Service v1.1</Text>
            <Text style={t.footerTxt}>Effective April 1, 2026 · All rights reserved</Text>
          </View>
          <View style={t.footerLine} />
        </View>
      </ScrollView>
    </View>
  );
}

const t = StyleSheet.create({
  root: { flex:1, backgroundColor:C.bg },

  // Header
  header: { flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:14, paddingVertical:12, backgroundColor:'#0E0F12', borderBottomWidth:2, borderBottomColor:C.teal+'60', position:'relative', overflow:'hidden' },
  backBtn: { width:38, height:38, backgroundColor:C.tealDim, borderWidth:1.5, borderColor:C.teal+'70', borderRadius:8, alignItems:'center', justifyContent:'center',
    ...Platform.select({ ios:{shadowColor:C.teal,shadowOffset:{width:0,height:0},shadowOpacity:0.5,shadowRadius:8}, android:{elevation:4} }),
  },
  titleBlock: { flex:1, flexDirection:'row', alignItems:'center', gap:10 },
  gavelBox: { width:40, height:40, borderWidth:1.5, borderRadius:8, alignItems:'center', justifyContent:'center', backgroundColor:C.tealDim+'80' },
  headerTitle: { fontSize:12, fontWeight:'900', color:C.tealBrt, fontFamily:MONO, letterSpacing:1.2,
    ...Platform.select({ ios:{textShadowColor:C.teal,textShadowOffset:{width:0,height:0},textShadowRadius:8}, android:{} }),
  },
  headerSub: { fontSize:7.5, color:C.text, fontFamily:MONO, marginTop:2 },
  activeBadge: { flexDirection:'row', alignItems:'center', gap:5, borderWidth:1.5, borderRadius:6, paddingHorizontal:8, paddingVertical:6, backgroundColor:C.green+'10' },
  activeTxt: { fontSize:7.5, fontWeight:'900', color:C.green, fontFamily:MONO, letterSpacing:1 },

  // Nav bar
  navBar: { maxHeight:44, backgroundColor:'#0E0F12', borderBottomWidth:1, borderBottomColor:C.border },
  navChip: { flexDirection:'row', alignItems:'center', gap:5, borderWidth:1, borderColor:C.teal+'50', borderRadius:6, paddingHorizontal:10, paddingVertical:6, backgroundColor:C.teal+'10' },
  navChipTxt: { fontSize:9, fontWeight:'700', color:C.teal, fontFamily:MONO, letterSpacing:0.4 },

  // Hero card
  heroCard: { borderWidth:1.5, borderColor:C.teal+'60', borderRadius:10, backgroundColor:C.panel, padding:14, marginBottom:6, position:'relative', overflow:'hidden',
    ...Platform.select({ ios:{shadowColor:C.teal,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:12}, android:{elevation:6} }),
  },
  heroTitle: { fontSize:10, fontWeight:'900', color:C.tealBrt, fontFamily:MONO, letterSpacing:1 },
  heroBody:  { fontSize:11, color:C.textBrt, fontFamily:MONO, lineHeight:18, marginTop:4 },

  // MIT box
  mitBox: { backgroundColor:'#030E08', borderWidth:1, borderColor:C.green+'40', borderRadius:8, padding:12 },
  mitTitle: { fontSize:12, fontWeight:'900', color:C.green, fontFamily:MONO, letterSpacing:1, marginBottom:4 },
  mitYear: { fontSize:9, color:C.green+'AA', fontFamily:MONO, marginBottom:10 },
  mitBody: { fontSize:10, color:C.textBrt, fontFamily:MONO, lineHeight:16 },
  mitCondBox: { marginVertical:10, borderLeftWidth:2, borderLeftColor:C.green+'60', paddingLeft:10 },
  mitCond: { fontSize:10, color:C.green+'BB', fontFamily:MONO, lineHeight:16, fontStyle:'italic' },

  // OSS cards
  ossRow: { flexDirection:'row', flexWrap:'wrap', gap:6, marginTop:12 },
  ossCard: { borderWidth:1, borderColor:C.teal+'50', borderRadius:6, paddingHorizontal:10, paddingVertical:7, backgroundColor:C.teal+'0C', alignItems:'flex-start', minWidth:120 },
  ossName: { fontSize:9, fontWeight:'700', color:C.textHi, fontFamily:MONO, marginBottom:3 },
  ossLic:  { fontSize:8, color:C.tealMid, fontFamily:MONO },

  // Warning box
  warningBox: { flexDirection:'row', alignItems:'flex-start', gap:8, borderWidth:1, borderRadius:6, padding:10, marginTop:10 },
  warningTxt: { flex:1, fontSize:10, fontFamily:MONO, lineHeight:15 },

  // Link button
  linkBtn: { flexDirection:'row', alignItems:'center', gap:8, borderWidth:1.5, borderRadius:7, paddingVertical:11, paddingHorizontal:14, marginTop:12 },
  linkTxt: { flex:1, fontSize:10, fontWeight:'700', fontFamily:MONO, letterSpacing:0.4 },

  // Contact card
  contactCard: { borderWidth:1.5, borderColor:C.cyan+'60', borderRadius:10, backgroundColor:C.panel, padding:14, position:'relative', overflow:'hidden',
    ...Platform.select({ ios:{shadowColor:C.cyan,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:12}, android:{elevation:6} }),
  },
  emailBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, backgroundColor:C.cyan, borderRadius:8, paddingVertical:14,
    ...Platform.select({ ios:{shadowColor:C.cyan,shadowOffset:{width:0,height:4},shadowOpacity:0.6,shadowRadius:10}, android:{elevation:6} }),
  },
  emailBtnTxt: { fontSize:13, fontWeight:'900', color:'#000', fontFamily:MONO, letterSpacing:0.6 },

  // Footer
  footer: { flexDirection:'row', alignItems:'center', gap:10, marginTop:24, marginBottom:8 },
  footerLine: { flex:1, height:1, backgroundColor:C.border },
  footerTxt: { fontSize:7.5, color:C.text, fontFamily:MONO, letterSpacing:0.8 },

  // Info row
  tealMid: { color:C.tealMid },
});
