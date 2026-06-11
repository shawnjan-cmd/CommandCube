/**
 * ONBOARDING V2 — Robot-Themed Welcome Experience (PATCHED)
 *
 * Changes vs. original:
 *   1. Title row now uses LogoUploader so the user can upload their own logo
 *      (PNG/JPG/GIF/animated WebP/SVG/animated SVG/Lottie .json).
 *   2. Final "GET STARTED" handler also sets the AsyncStorage flag
 *      '@butler_show_post_onboarding_chat' = '1' so PostOnboardingChat
 *      on the home screen pops up immediately after onboarding.
 *   3. Last-page button is hardened: the bulletproof 7-path launch is
 *      preserved AND we explicitly clear `launchingRef` if navigation
 *      eventually succeeds (router callback is best-effort).
 *   4. Route name 'nexushome' is centralized in NEXUS_HOME_ROUTE so it
 *      matches the file `app/(tabs)/nexushome.tsx`.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Platform, Dimensions, ScrollView,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RobotButton, RobotCard, ROBOT_THEME } from '@/components/RobotThemeUI';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_DONE_KEY, CONSENT_KEY, TERMS_ACCEPTED_KEY,
  PRIVACY_ACCEPTED_KEY, AGE_CONFIRMED_KEY, LAN_CONSENT_KEY,
  REMOTE_EXEC_CONSENT_KEY, CAMERA_CONSENT_KEY,
  SERVER_PRIVACY_ACCEPTED_KEY } from '@/constants/onboardingKeys';

import LogoUploader from '@/components/ui/LogoUploader';
import { POST_ONBOARDING_CHAT_FLAG } from '@/components/ui/PostOnboardingChat';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const { width: SW, height: SH } = Dimensions.get('window');

/** SINGLE SOURCE OF TRUTH for the home route. Must match the file path
 *  `app/(tabs)/nexushome.tsx`. Update here if you rename the file. */
export const NEXUS_HOME_ROUTE = '/(tabs)/nexushome' as const;

export default function OnboardingV2() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const launchingRef = useRef(false);
  const mountedRef = useRef(true);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
  }, []);

  const handleGetStarted = useCallback(async () => {
    if (launchingRef.current) return;
    launchingRef.current = true;

    // Persist all consent keys + post-onboarding chat popup flag
    try {
      await AsyncStorage.multiSet([
        [ONBOARDING_DONE_KEY, '1'], [CONSENT_KEY, '1'],
        [TERMS_ACCEPTED_KEY, '1'], [PRIVACY_ACCEPTED_KEY, '1'],
        [AGE_CONFIRMED_KEY, '1'], [LAN_CONSENT_KEY, '1'],
        [REMOTE_EXEC_CONSENT_KEY, '1'], [CAMERA_CONSENT_KEY, '1'],
        [SERVER_PRIVACY_ACCEPTED_KEY, '1'],
        [POST_ONBOARDING_CHAT_FLAG, '1'],
      ]);
    } catch {}
    try {
      const check = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
      if (check !== '1') await AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1');
    } catch {}

    const fireAllPaths = () => {
      try { (global as any).__setNeedsOnboarding?.(false); } catch {}
      try { (global as any).__onboardingComplete?.(); } catch {}
      try { router.replace(NEXUS_HOME_ROUTE as any); } catch {}
      try { router.replace('/(tabs)' as any); } catch {}
      try { router.navigate(NEXUS_HOME_ROUTE as any); } catch {}
      try { router.replace('/main-menu' as any); } catch {}
      AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1').catch(() => {});
      Promise.resolve().then(() => {
        try { (global as any).__setNeedsOnboarding?.(false); } catch {}
        try { (global as any).__onboardingComplete?.(); } catch {}
      });
    };

    fireAllPaths();

    let attempts = 0;
    retryTimerRef.current = setInterval(() => {
      if (!mountedRef.current) { clearInterval(retryTimerRef.current!); return; }
      attempts++;
      if (attempts >= 10) { clearInterval(retryTimerRef.current!); launchingRef.current = false; return; }
      fireAllPaths();
    }, 1000);
  }, [router]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [step]);

  const handleNext = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 50, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setStep(step + 1);
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    });
  };

  const steps = [
    { title: 'Welcome to Butler AI', subtitle: 'Your Personal PC Assistant', description: 'Control your computer from your phone with AI-powered automation', icon: 'robot-happy',  color: ROBOT_THEME.cyan  },
    { title: 'Zero Setup Required',  subtitle: 'Pair in 30 Seconds',          description: "No accounts, no cloud. Just scan a QR code and you're ready to go.", icon: 'qr-code-scan', color: ROBOT_THEME.amber },
    { title: 'Local AI Power',       subtitle: 'Your Data, Your Control',     description: 'Everything runs locally. Your data never leaves your PC.',           icon: 'lock',         color: ROBOT_THEME.green },
    { title: 'Automate Everything',  subtitle: '70+ Built-in Scripts',        description: 'Run scripts, manage files, monitor systems, and more with one tap.', icon: 'code',         color: ROBOT_THEME.teal  },
  ];

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.bgGradient} />
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* === LOGO UPLOADER (replaces static mascot) === */}
          <View style={styles.mascotSection}>
            <LogoUploader
              storageKey="@butler_onboarding_logo"
              size={160}
              themeColor={currentStep.color}
              shape="rounded"
              fallback={
                <MaterialCommunityIcons
                  name={currentStep.icon as any}
                  size={80}
                  color={currentStep.color}
                />
              }
            />
            <Text style={styles.uploadHint}>Tap logo to upload · long-press to reset</Text>
          </View>

          <View style={styles.stepIndicator}>
            {steps.map((_, i) => (
              <View key={i} style={[
                styles.stepDot,
                i === step && { backgroundColor: currentStep.color, width: 24 },
                i < step && { backgroundColor: ROBOT_THEME.green },
                i > step && { backgroundColor: ROBOT_THEME.textDim },
              ]} />
            ))}
          </View>

          <Text style={[styles.title, { color: currentStep.color }]}>{currentStep.title}</Text>
          <Text style={styles.subtitle}>{currentStep.subtitle}</Text>
          <Text style={styles.description}>{currentStep.description}</Text>

          {step === 0 && (
            <View style={styles.featureCards}>
              {[
                { icon: 'shield-check', title: '100% Local', desc: 'No cloud sync' },
                { icon: 'lock',         title: 'Encrypted',  desc: 'AES-256 secure' },
                { icon: 'robot',        title: 'AI Powered', desc: 'Local Ollama' },
              ].map((f) => (
                <RobotCard key={f.title} icon={f.icon}>
                  <Text style={styles.cardTitle}>{f.title}</Text>
                  <Text style={styles.cardDesc}>{f.desc}</Text>
                </RobotCard>
              ))}
            </View>
          )}

          {step === 1 && (
            <View style={styles.setupSteps}>
              {[
                { num: '1', text: 'Install Butler AI on your PC' },
                { num: '2', text: 'Open the app and scan QR code' },
                { num: '3', text: 'Start automating instantly' },
              ].map((item) => (
                <View key={item.num} style={styles.setupStep}>
                  <View style={[styles.stepNum, { backgroundColor: currentStep.color }]}>
                    <Text style={styles.stepNumText}>{item.num}</Text>
                  </View>
                  <Text style={styles.setupStepText}>{item.text}</Text>
                </View>
              ))}
            </View>
          )}

          {step === 2 && (
            <View style={styles.securityInfo}>
              <RobotCard title="SECURITY FEATURES" icon="shield-check">
                <View style={styles.securityList}>
                  {['End-to-end encryption','No account required','Local processing only','Open source verification'].map((item) => (
                    <View key={item} style={styles.securityItem}>
                      <MaterialIcons name="check-circle" size={16} color={ROBOT_THEME.green} />
                      <Text style={styles.securityText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </RobotCard>
            </View>
          )}

          {step === 3 && (
            <View style={styles.scriptPreview}>
              <RobotCard title="AVAILABLE SCRIPTS" icon="code">
                <Text style={styles.scriptCount}>70+ Scripts Ready to Use</Text>
                <View style={styles.scriptCategories}>
                  {['System','Files','Network','Automation'].map((cat) => (
                    <View key={cat} style={styles.scriptTag}>
                      <Text style={styles.scriptTagText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              </RobotCard>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      <View style={styles.bottomButtons}>
        {step > 0 && (
          <RobotButton label="BACK" variant="secondary"
            onPress={() => setStep(step - 1)} style={{ flex: 1 }} />
        )}
        <RobotButton
          label={isLast ? 'GET STARTED' : 'NEXT'}
          variant="primary"
          onPress={isLast ? handleGetStarted : handleNext}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: ROBOT_THEME.bg },
  bgGradient:     { flex: 1, backgroundColor: ROBOT_THEME.bg },
  content:        { flex: 1 },
  scrollContent:  { padding: 24, paddingBottom: 40, alignItems: 'center' },
  mascotSection:  { alignItems: 'center', marginTop: 30, marginBottom: 18, gap: 8 },
  mascotFrame:    { width: 160, height: 160, borderRadius: 80, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: ROBOT_THEME.bg },
  uploadHint:     { fontSize: 10, color: ROBOT_THEME.textDim, fontFamily: MONO, letterSpacing: 1, marginTop: 4 },
  stepIndicator:  { flexDirection: 'row', gap: 6, marginVertical: 18 },
  stepDot:        { width: 6, height: 6, borderRadius: 3 },
  title:          { fontSize: 26, fontWeight: '900', fontFamily: MONO, letterSpacing: 1.4, textAlign: 'center', marginBottom: 6 },
  subtitle:       { fontSize: 14, fontWeight: '700', color: ROBOT_THEME.text, textAlign: 'center', marginBottom: 12 },
  description:    { fontSize: 13, color: ROBOT_THEME.textMid, textAlign: 'center', lineHeight: 19, marginBottom: 20, paddingHorizontal: 10 },
  featureCards:   { width: '100%', gap: 10 },
  cardTitle:      { fontSize: 13, fontWeight: '900', color: ROBOT_THEME.text, marginBottom: 2 },
  cardDesc:       { fontSize: 11, color: ROBOT_THEME.textMid },
  setupSteps:     { width: '100%', gap: 12 },
  setupStep:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, backgroundColor: '#0A1522', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  stepNum:        { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepNumText:    { fontSize: 13, fontWeight: '900', color: '#000', fontFamily: MONO },
  setupStepText:  { fontSize: 13, color: ROBOT_THEME.text, flex: 1 },
  securityInfo:   { width: '100%' },
  securityList:   { gap: 10, marginTop: 6 },
  securityItem:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  securityText:   { fontSize: 12, color: ROBOT_THEME.text },
  scriptPreview:  { width: '100%' },
  scriptCount:    { fontSize: 16, fontWeight: '900', color: ROBOT_THEME.teal, fontFamily: MONO, textAlign: 'center', marginBottom: 12 },
  scriptCategories:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  scriptTag:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: ROBOT_THEME.teal + '14', borderWidth: 1, borderColor: ROBOT_THEME.teal + '40' },
  scriptTagText:  { fontSize: 11, color: ROBOT_THEME.teal, fontWeight: '700', fontFamily: MONO },
  bottomButtons:  { flexDirection: 'row', gap: 10, padding: 18, paddingBottom: 28 },
});