/**
 * 🎨 COSMETIC CONTEXT — Full App Theme Provider v8.0
 * True app-wide color theming: every page, every component, every accent.
 * 12 theme packs, real applyPack, preview mode, persisted across restarts.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated } from 'react-native';

// ─── PACK EXTRAS ────────────────────────────────────────────────
export interface PackExtras {
  notifSound:  'none' | 'chime' | 'pulse' | 'blip' | 'synth';
  bubbleAnim:  'none' | 'slide' | 'pop' | 'fade' | 'glow';
  sendEffect:  'none' | 'ripple' | 'flash' | 'pulse';
  headerGlow:  boolean;
  tabPulse:    boolean;
  typingStyle: 'dots' | 'wave' | 'pulse' | 'scan';
  chatShimmer: boolean;
}

const DEFAULT_EXTRAS: PackExtras = {
  notifSound:  'chime',
  bubbleAnim:  'slide',
  sendEffect:  'ripple',
  headerGlow:  true,
  tabPulse:    true,
  typingStyle: 'dots',
  chatShimmer: false,
};

// ─── FULL THEME DEFINITION ───────────────────────────────────────
export interface AppTheme {
  id: string;
  name: string;
  // Core palette
  primary: string;
  secondary: string;
  tertiary: string;
  // Backgrounds
  bg: string;
  panel: string;
  panelBrt: string;
  // Text
  textAccent: string;
  textDim: string;
  textHi: string;
  textMid?: string;
  // Glows & borders
  glowColor: string;
  borderColor: string;
  borderBrt: string;
  // Chat
  userBubble: string;
  aiBubble: string;
  aiBorder: string;
  chatBarBg: string;
  chatBarTopGlow: string;
  chatBarBorderTop: string;
  promptGlyph: string;
  // Meta
  isDefault: boolean;
  tagline?: string;
  category?: string;
  icon?: string;
  badge?: string;
  defaultExtras?: Partial<PackExtras>;
  // Tier info
  tier?: 'free' | 'supporter' | 'pro' | 'elite';
}

// ─── THEME PACKS ────────────────────────────────────────────────
export const PACK_THEMES: Record<string, AppTheme> = {

  nexus: {
    id: 'nexus', name: 'ENDO CORE', isDefault: true, tier: 'free',
    tagline: 'Terminator endoskeleton — gunmetal · endo red', category: 'SYSTEM',
    icon: 'robot-angry-outline', badge: 'DEFAULT',
    // Terminator T-800 endoskeleton palette — endo-red eyes on brushed gunmetal
    primary: '#FF2A1F', secondary: '#FF6A1F', tertiary: '#FFC400',
    bg: '#050505', panel: '#0E0F12', panelBrt: '#1A1D24',
    textAccent: '#FFB3AD', textDim: '#4A5366', textHi: '#F4F6F9', textMid: '#8C95A6',
    glowColor: '#FF2A1F', borderColor: '#3C424D', borderBrt: '#FF2A1F',
    userBubble: '#241312', aiBubble: '#0C0D10', aiBorder: 'rgba(255,42,31,0.22)',
    chatBarBg: '#0A0B0E', chatBarTopGlow: '#FF2A1F', chatBarBorderTop: 'rgba(255,42,31,0.32)',
    promptGlyph: '#FF2A1F',
    defaultExtras: { notifSound: 'chime', bubbleAnim: 'slide', sendEffect: 'ripple', headerGlow: true, tabPulse: true, typingStyle: 'dots', chatShimmer: false },
  },

  cobalt: {
    id: 'cobalt', name: 'COBALT DEPTH', isDefault: false, tier: 'supporter',
    tagline: 'Deep ocean intelligence system', category: 'DARK',
    icon: 'waves',
    primary: '#4488FF', secondary: '#2255CC', tertiary: '#88BBFF',
    bg: '#020814', panel: '#060E1E', panelBrt: '#0C1830',
    textAccent: '#88BBFF', textDim: '#223366', textHi: '#E8F0FF', textMid: '#5577AA',
    glowColor: '#4488FF', borderColor: '#2255BB', borderBrt: '#66AAFF',
    userBubble: '#112266', aiBubble: '#050A16', aiBorder: 'rgba(68,136,255,0.22)',
    chatBarBg: '#040A14', chatBarTopGlow: '#4488FF', chatBarBorderTop: 'rgba(68,136,255,0.30)',
    promptGlyph: '#4488FF',
    defaultExtras: { notifSound: 'chime', bubbleAnim: 'slide', sendEffect: 'ripple', headerGlow: true, tabPulse: true, typingStyle: 'dots', chatShimmer: false },
  },

  titanium: {
    id: 'titanium', name: 'TITANIUM GREY', isDefault: false, tier: 'supporter',
    tagline: 'Monochrome precision control', category: 'DARK',
    icon: 'shield-half-full',
    primary: '#AABBCC', secondary: '#778899', tertiary: '#DDEEFF',
    bg: '#080a0c', panel: '#101416', panelBrt: '#1A1E22',
    textAccent: '#CCDDE8', textDim: '#3A4A55', textHi: '#F0F4F8', textMid: '#6A7A88',
    glowColor: '#AABBCC', borderColor: '#667788', borderBrt: '#CCDDEE',
    userBubble: '#2A3A44', aiBubble: '#080C10', aiBorder: 'rgba(170,187,204,0.22)',
    chatBarBg: '#070A0C', chatBarTopGlow: '#AABBCC', chatBarBorderTop: 'rgba(170,187,204,0.28)',
    promptGlyph: '#AABBCC',
    defaultExtras: { notifSound: 'none', bubbleAnim: 'fade', sendEffect: 'none', headerGlow: false, tabPulse: false, typingStyle: 'dots', chatShimmer: false },
  },

  void: {
    id: 'void', name: 'VOID PROTOCOL', isDefault: false, tier: 'supporter',
    tagline: 'Absolute dark minimal system', category: 'SYSTEM',
    icon: 'circle-outline',
    primary: '#EEEEEE', secondary: '#888888', tertiary: '#CCCCCC',
    bg: '#000000', panel: '#0A0A0A', panelBrt: '#141414',
    textAccent: '#FFFFFF', textDim: '#333333', textHi: '#FFFFFF', textMid: '#666666',
    glowColor: '#FFFFFF', borderColor: '#555555', borderBrt: '#AAAAAA',
    userBubble: '#1A1A1A', aiBubble: '#080808', aiBorder: 'rgba(255,255,255,0.15)',
    chatBarBg: '#060606', chatBarTopGlow: '#EEEEEE', chatBarBorderTop: 'rgba(255,255,255,0.18)',
    promptGlyph: '#EEEEEE',
    defaultExtras: { notifSound: 'none', bubbleAnim: 'none', sendEffect: 'none', headerGlow: false, tabPulse: false, typingStyle: 'dots', chatShimmer: false },
  },

  solar: {
    id: 'solar', name: 'SOLAR FLARE', isDefault: false, tier: 'pro',
    tagline: 'Amber-gold power interface', category: 'WARM',
    icon: 'white-balance-sunny',
    primary: '#FF8C00', secondary: '#FFD700', tertiary: '#FF4400',
    bg: '#0c0800', panel: '#18100a', panelBrt: '#241800',
    textAccent: '#FFD088', textDim: '#5A3800', textHi: '#FFF8E8', textMid: '#AA7733',
    glowColor: '#FF8C00', borderColor: '#AA5500', borderBrt: '#FFAA33',
    userBubble: '#663300', aiBubble: '#0E0800', aiBorder: 'rgba(255,140,0,0.30)',
    chatBarBg: '#0A0700', chatBarTopGlow: '#FF8C00', chatBarBorderTop: 'rgba(255,140,0,0.35)',
    promptGlyph: '#FF8C00',
    defaultExtras: { notifSound: 'blip', bubbleAnim: 'pop', sendEffect: 'flash', headerGlow: true, tabPulse: true, typingStyle: 'dots', chatShimmer: false },
  },

  sakura: {
    id: 'sakura', name: 'SAKURA NEON', isDefault: false, tier: 'pro',
    tagline: 'Pink blossom cyber aesthetic', category: 'WARM',
    icon: 'flower', badge: 'HOT',
    primary: '#FF6EB4', secondary: '#CC3388', tertiary: '#FFAACC',
    bg: '#0d0509', panel: '#180a12', panelBrt: '#24101c',
    textAccent: '#FFAAD4', textDim: '#5A2040', textHi: '#FFE8F4', textMid: '#AA6688',
    glowColor: '#FF6EB4', borderColor: '#CC3366', borderBrt: '#FF88CC',
    userBubble: '#881144', aiBubble: '#0D0609', aiBorder: 'rgba(255,110,180,0.25)',
    chatBarBg: '#0C0508', chatBarTopGlow: '#FF6EB4', chatBarBorderTop: 'rgba(255,110,180,0.32)',
    promptGlyph: '#FF6EB4',
    defaultExtras: { notifSound: 'chime', bubbleAnim: 'pop', sendEffect: 'ripple', headerGlow: true, tabPulse: true, typingStyle: 'wave', chatShimmer: true },
  },

  matrix: {
    id: 'matrix', name: 'MATRIX GREEN', isDefault: false, tier: 'pro',
    tagline: 'Classic terminal hacker mode', category: 'SYSTEM',
    icon: 'code-brackets',
    primary: '#00FF44', secondary: '#00CC33', tertiary: '#44FF88',
    bg: '#020d04', panel: '#061208', panelBrt: '#0c1e0e',
    textAccent: '#88FF99', textDim: '#1A5028', textHi: '#E8FFE8', textMid: '#44AA55',
    glowColor: '#00FF44', borderColor: '#00AA22', borderBrt: '#44FF66',
    userBubble: '#004410', aiBubble: '#040E06', aiBorder: 'rgba(0,255,68,0.22)',
    chatBarBg: '#030D05', chatBarTopGlow: '#00FF44', chatBarBorderTop: 'rgba(0,255,68,0.30)',
    promptGlyph: '#00FF44',
    defaultExtras: { notifSound: 'blip', bubbleAnim: 'slide', sendEffect: 'ripple', headerGlow: true, tabPulse: false, typingStyle: 'scan', chatShimmer: false },
  },

  aurora: {
    id: 'aurora', name: 'AURORA BOREALIS', isDefault: false, tier: 'pro',
    tagline: 'Northern lights gradient system', category: 'NEON',
    icon: 'weather-night', badge: 'POPULAR',
    primary: '#00FFB2', secondary: '#BB33FF', tertiary: '#33AAFF',
    bg: '#040c0f', panel: '#071218', panelBrt: '#0e1e24',
    textAccent: '#88FFDD', textDim: '#2A4A40', textHi: '#E8FFF8', textMid: '#55AA88',
    glowColor: '#00FFB2', borderColor: '#00AA77', borderBrt: '#44FFCC',
    userBubble: '#004433', aiBubble: '#050F0D', aiBorder: 'rgba(0,255,178,0.22)',
    chatBarBg: '#040E0C', chatBarTopGlow: '#00FFB2', chatBarBorderTop: 'rgba(0,255,178,0.30)',
    promptGlyph: '#00FFB2',
    defaultExtras: { notifSound: 'chime', bubbleAnim: 'fade', sendEffect: 'ripple', headerGlow: true, tabPulse: true, typingStyle: 'wave', chatShimmer: true },
  },

  phantom: {
    id: 'phantom', name: 'PHANTOM RED', isDefault: false, tier: 'elite',
    tagline: 'Blood-dark stealth ops palette', category: 'DARK',
    icon: 'ghost',
    primary: '#FF3355', secondary: '#CC1133', tertiary: '#FF6680',
    bg: '#0a0508', panel: '#14060a', panelBrt: '#1e0a10',
    textAccent: '#FF9999', textDim: '#5A2030', textHi: '#FFE8EE', textMid: '#AA7788',
    glowColor: '#FF3355', borderColor: '#AA1133', borderBrt: '#FF5566',
    userBubble: '#AA0022', aiBubble: '#110008', aiBorder: 'rgba(255,51,85,0.30)',
    chatBarBg: '#09000A', chatBarTopGlow: '#FF3355', chatBarBorderTop: 'rgba(255,51,85,0.35)',
    promptGlyph: '#FF3355',
    defaultExtras: { notifSound: 'pulse', bubbleAnim: 'glow', sendEffect: 'pulse', headerGlow: true, tabPulse: true, typingStyle: 'scan', chatShimmer: false },
  },

  sigma: {
    id: 'sigma', name: 'SIGMA-NET', isDefault: false, tier: 'elite',
    tagline: 'Protocol purple crawler mode', category: 'NEON',
    icon: 'network', badge: 'NEW',
    primary: '#CC33FF', secondary: '#8800CC', tertiary: '#FF33CC',
    bg: '#08040d', panel: '#110818', panelBrt: '#1c0e28',
    textAccent: '#DD99FF', textDim: '#4A2060', textHi: '#F5E8FF', textMid: '#9966BB',
    glowColor: '#CC33FF', borderColor: '#8811BB', borderBrt: '#EE66FF',
    userBubble: '#551188', aiBubble: '#080010', aiBorder: 'rgba(204,51,255,0.30)',
    chatBarBg: '#080010', chatBarTopGlow: '#CC33FF', chatBarBorderTop: 'rgba(204,51,255,0.35)',
    promptGlyph: '#CC33FF',
    defaultExtras: { notifSound: 'synth', bubbleAnim: 'fade', sendEffect: 'flash', headerGlow: true, tabPulse: true, typingStyle: 'pulse', chatShimmer: true },
  },

  quantum: {
    id: 'quantum', name: 'QUANTUM GOLD', isDefault: false, tier: 'elite',
    tagline: 'Luxury frequency intelligence', category: 'WARM',
    icon: 'atom', badge: 'ELITE',
    primary: '#FFD700', secondary: '#CC9900', tertiary: '#FFF0AA',
    bg: '#0a0900', panel: '#161200', panelBrt: '#221C00',
    textAccent: '#FFE866', textDim: '#5A4800', textHi: '#FFF8E0', textMid: '#AA8855',
    glowColor: '#FFD700', borderColor: '#AA8800', borderBrt: '#FFE044',
    userBubble: '#664400', aiBubble: '#0A0800', aiBorder: 'rgba(255,215,0,0.28)',
    chatBarBg: '#090800', chatBarTopGlow: '#FFD700', chatBarBorderTop: 'rgba(255,215,0,0.35)',
    promptGlyph: '#FFD700',
    defaultExtras: { notifSound: 'synth', bubbleAnim: 'pop', sendEffect: 'flash', headerGlow: true, tabPulse: true, typingStyle: 'wave', chatShimmer: true },
  },

  hologram: {
    id: 'hologram', name: 'HOLOGRAM', isDefault: false, tier: 'elite',
    tagline: 'Iridescent projection interface', category: 'NEON',
    icon: 'cube-scan', badge: 'NEW',
    primary: '#00FFFF', secondary: '#FF00FF', tertiary: '#FFFF00',
    bg: '#040812', panel: '#080E1E', panelBrt: '#10162A',
    textAccent: '#88FFFF', textDim: '#1A4466', textHi: '#E8FFFF', textMid: '#44AACC',
    glowColor: '#00FFFF', borderColor: '#0099AA', borderBrt: '#44FFFF',
    userBubble: '#004466', aiBubble: '#050C16', aiBorder: 'rgba(0,255,255,0.22)',
    chatBarBg: '#040C14', chatBarTopGlow: '#00FFFF', chatBarBorderTop: 'rgba(0,255,255,0.30)',
    promptGlyph: '#00FFFF',
    defaultExtras: { notifSound: 'synth', bubbleAnim: 'glow', sendEffect: 'flash', headerGlow: true, tabPulse: true, typingStyle: 'scan', chatShimmer: true },
  },

  // ── REVIEW REWARD — Earned by leaving a Play Store review ──
  champion_holo: {
    id: 'champion_holo', name: 'CHAMPION HOLO', isDefault: false, tier: 'free',
    tagline: 'The rarest theme — earned, not bought. Iridescent panels shift between every color.',
    category: 'NEON',
    icon: 'star-shooting', badge: 'RARE',
    primary: '#EE44FF', secondary: '#00FFEE', tertiary: '#FFEE00',
    bg: '#08040e', panel: '#120818', panelBrt: '#1c1028',
    textAccent: '#EECCFF', textDim: '#4A2866', textHi: '#F8F0FF', textMid: '#9966CC',
    glowColor: '#CC44FF', borderColor: '#8822AA', borderBrt: '#EE88FF',
    userBubble: '#220044', aiBubble: '#0A0412', aiBorder: 'rgba(238,68,255,0.30)',
    chatBarBg: '#070010', chatBarTopGlow: '#EE44FF', chatBarBorderTop: 'rgba(238,68,255,0.35)',
    promptGlyph: '#EE44FF',
    defaultExtras: { notifSound: 'synth', bubbleAnim: 'glow', sendEffect: 'flash', headerGlow: true, tabPulse: true, typingStyle: 'scan', chatShimmer: true },
  },
};

// ─── TIER CONFIG ────────────────────────────────────────────────
export const TIER_CONFIG = {
  free: {
    name: 'NEXUS CORE',
    price: 'FREE',
    color: '#00CCDD',
    icon: 'hexagon-outline' as const,
    themeIds: ['nexus'],
    features: [
      'Default NEXUS CORE theme',
      'Full app functionality forever',
      'All automation features',
      'Local AI chat with Ollama',
    ],
  },
  supporter: {
    name: 'SUPPORTER',
    price: '$2.99',
    color: '#4488FF',
    icon: 'heart-outline' as const,
    themeIds: ['cobalt', 'titanium', 'void'],
    features: [
      '3 exclusive themes: Cobalt Depth, Titanium Grey, Void Protocol',
      'Priority bug fixes',
      'Supporter badge (coming soon)',
      "Dev's eternal gratitude",
    ],
  },
  pro: {
    name: 'PRO PATRON',
    price: '$9.99',
    color: '#FF6EB4',
    icon: 'star-outline' as const,
    isPopular: true,
    themeIds: ['cobalt', 'titanium', 'void', 'solar', 'sakura', 'matrix', 'aurora'],
    features: [
      'All Supporter themes included',
      '4 extra themes: Solar Flare, Sakura Neon, Matrix Green, Aurora Borealis',
      'Name in credits (next release)',
      'Direct feature request channel',
      '10 bonus automation scripts',
    ],
  },
  elite: {
    name: 'ELITE BACKER',
    price: '$24.99',
    color: '#FFD700',
    icon: 'diamond-outline' as const,
    themeIds: ['cobalt', 'titanium', 'void', 'solar', 'sakura', 'matrix', 'aurora', 'phantom', 'sigma', 'quantum', 'hologram'],
    features: [
      'ALL 11 premium themes included',
      'Vote on next major feature',
      'Listed as Elite Backer in-app',
      '30+ curated script pack',
      'Lifetime supporter status',
      'Early access to beta builds',
    ],
  },
  review: {
    name: 'REVIEW REWARD',
    price: 'FREE',
    color: '#EE44FF',
    icon: 'star-shooting' as const,
    isReviewReward: true,
    themeIds: ['champion_holo'],
    features: [
      'Exclusive CHAMPION HOLO theme',
      'Holographic iridescent panels shift color',
      'Rarest Butler AI theme — earned, not bought',
      'Community badge · Play Store reviewer',
    ],
  },
} as const;

export type TierId = keyof typeof TIER_CONFIG;
export type ReviewUnlockStatus = 'locked' | 'verifying' | 'unlocked';
const REVIEW_UNLOCK_KEY = '@butler_review_reward_v1';
export async function checkReviewUnlock(): Promise<boolean> {
  try { const v = await AsyncStorage.getItem(REVIEW_UNLOCK_KEY); return v === 'unlocked'; } catch { return false; }
}
export async function grantReviewReward(): Promise<void> {
  await AsyncStorage.setItem(REVIEW_UNLOCK_KEY, 'unlocked');
}

// ─── CONTEXT TYPE ────────────────────────────────────────────────
interface CosmeticContextType {
  // Active theme
  activePackId: string;
  currentPackId: string;
  activeTheme: AppTheme;
  T: AppTheme;
  // Preview mode — theme used for rendering without committing
  previewPackId: string | null;
  previewTheme: AppTheme | null;
  effectiveTheme: AppTheme; // previewTheme if active, else activeTheme
  isPreviewMode: boolean;
  // Fade animation value — opacity transitions when theme switches
  fadeAnim: Animated.Value;
  // Actions
  applyPack: (packId: string) => void;
  setActivePack: (packId: string) => Promise<void>;
  startPreview: (packId: string) => void;
  endPreview: () => void;
  confirmPreview: () => void;
  // Unlock
  isUnlocked: (packId: string) => boolean;
  unlockedIds: Set<string>;
  addUnlocked: (packId: string) => Promise<void>;
  reviewRewardUnlocked: boolean;
  setReviewRewardUnlocked: (v: boolean) => void;
  // Legacy
  isPrimeActive: boolean;
  getColor: (key: keyof Pick<AppTheme, 'primary' | 'secondary' | 'tertiary' | 'glowColor' | 'borderColor' | 'textAccent'>) => string;
  extras: PackExtras;
  updateExtras: (updates: Partial<PackExtras>) => Promise<void>;
}

const STORAGE_ACTIVE   = '@butler_packs_active_v5';
const STORAGE_UNLOCKED = '@butler_packs_unlocked_v5';
const STORAGE_EXTRAS   = '@butler_packs_extras_v5';

export const CosmeticContext = createContext<CosmeticContextType>({
  activePackId:  'nexus',
  currentPackId: 'nexus',
  activeTheme:   PACK_THEMES.nexus,
  T:             PACK_THEMES.nexus,
  previewPackId: null,
  previewTheme:  null,
  effectiveTheme: PACK_THEMES.nexus,
  isPreviewMode: false,
  fadeAnim:      new Animated.Value(1),
  applyPack:     () => {},
  setActivePack: async () => {},
  startPreview:  () => {},
  endPreview:    () => {},
  confirmPreview: () => {},
  isUnlocked:    () => true,
  unlockedIds:   new Set(Object.keys(PACK_THEMES)),
  addUnlocked:   async () => {},
  reviewRewardUnlocked: false,
  setReviewRewardUnlocked: () => {},
  isPrimeActive: false,
  getColor:      () => '#00CCDD',
  extras:        DEFAULT_EXTRAS,
  updateExtras:  async () => {},
});

// ─── PROVIDER ────────────────────────────────────────────────────
export function CosmeticProvider({ children }: { children: React.ReactNode }) {
  const [activePackId,  setActivePackId]  = useState('nexus');
  const [previewPackId, setPreviewPackId] = useState<string | null>(null);
  const [unlockedIds,   setUnlockedIds]   = useState<Set<string>>(new Set(Object.keys(PACK_THEMES)));
  const [extras,        setExtras]        = useState<PackExtras>(DEFAULT_EXTRAS);
  const [packExtrasMap, setPackExtrasMap] = useState<Record<string, Partial<PackExtras>>>({});
  const [reviewRewardUnlocked, setReviewRewardUnlockedState] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Load persisted state
  useEffect(() => {
    (async () => {
      try {
        const [activeRaw, unlockedRaw, extrasRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_ACTIVE),
          AsyncStorage.getItem(STORAGE_UNLOCKED),
          AsyncStorage.getItem(STORAGE_EXTRAS),
        ]);
        const resolvedPackId = (activeRaw && PACK_THEMES[activeRaw]) ? activeRaw : 'nexus';
        if (resolvedPackId !== 'nexus') setActivePackId(resolvedPackId);
        // Load review reward status
        const reviewStatus = await AsyncStorage.getItem(REVIEW_UNLOCK_KEY).catch(() => null);
        if (reviewStatus === 'unlocked') {
          setReviewRewardUnlockedState(true);
          setUnlockedIds(prev => new Set([...prev, 'champion_holo']));
        }

        if (unlockedRaw) {
          try {
            const saved = JSON.parse(unlockedRaw) as string[];
            setUnlockedIds(new Set([...saved, ...Object.keys(PACK_THEMES)]));
          } catch {}
        }
        let map: Record<string, Partial<PackExtras>> = {};
        if (extrasRaw) { try { map = JSON.parse(extrasRaw); setPackExtrasMap(map); } catch {} }
        const packDefaults = PACK_THEMES[resolvedPackId]?.defaultExtras ?? {};
        const userOverrides = map[resolvedPackId] ?? {};
        setExtras({ ...DEFAULT_EXTRAS, ...packDefaults, ...userOverrides });
      } catch {}
    })();
  }, []);

  // Fade animation whenever effective theme changes
  const animateTransition = useCallback((callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.3, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1,   duration: 200, useNativeDriver: true }),
    ]).start();
    callback();
  }, [fadeAnim]);

  const setActivePack = useCallback(async (packId: string) => {
    const theme = PACK_THEMES[packId] || PACK_THEMES.nexus;
    animateTransition(() => { setActivePackId(theme.id); setPreviewPackId(null); });
    try { await AsyncStorage.setItem(STORAGE_ACTIVE, theme.id); } catch {}
    const packDefaults = theme.defaultExtras ?? {};
    const userOverrides = packExtrasMap[theme.id] ?? {};
    setExtras({ ...DEFAULT_EXTRAS, ...packDefaults, ...userOverrides });
  }, [packExtrasMap, animateTransition]);

  const applyPack = useCallback((packId: string) => {
    const theme = PACK_THEMES[packId] || PACK_THEMES.nexus;
    // Expose to global for logger verification
    (global as any).__cosmeticPreviewId = null;
    console.log('[BUTLER_SKINS] ✅ APPLY PACK —', theme.id, '|', theme.name);
    animateTransition(() => { setActivePackId(theme.id); setPreviewPackId(null); });
    AsyncStorage.setItem(STORAGE_ACTIVE, theme.id).catch(() => {});
    const packDefaults = theme.defaultExtras ?? {};
    const userOverrides = packExtrasMap[theme.id] ?? {};
    setExtras({ ...DEFAULT_EXTRAS, ...packDefaults, ...userOverrides });
  }, [packExtrasMap, animateTransition]);

  const startPreview = useCallback((packId: string) => {
    // Expose preview ID globally so PreviewModeBanner + logger can verify
    (global as any).__cosmeticPreviewId = packId;
    console.log('[BUTLER_SKINS] 🔴 startPreview called:', packId);
    animateTransition(() => setPreviewPackId(packId));
  }, [animateTransition]);

  const endPreview = useCallback(() => {
    animateTransition(() => setPreviewPackId(null));
  }, [animateTransition]);

  const confirmPreview = useCallback(() => {
    if (previewPackId) applyPack(previewPackId);
  }, [previewPackId, applyPack]);

  const addUnlocked = useCallback(async (packId: string) => {
    setUnlockedIds(prev => {
      const next = new Set([...prev, packId, ...Object.keys(PACK_THEMES)]);
      AsyncStorage.setItem(STORAGE_UNLOCKED, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const isUnlocked = useCallback((packId: string) => {
    if (packId === 'champion_holo') return reviewRewardUnlocked;
    return true; // all paid packs free during early access
  }, [reviewRewardUnlocked]);

  const setReviewRewardUnlocked = useCallback((v: boolean) => {
    setReviewRewardUnlockedState(v);
    if (v) {
      setUnlockedIds(prev => new Set([...prev, 'champion_holo']));
      AsyncStorage.setItem(REVIEW_UNLOCK_KEY, 'unlocked').catch(() => {});
    }
  }, []);

  const getColor = useCallback((key: keyof Pick<AppTheme, 'primary' | 'secondary' | 'tertiary' | 'glowColor' | 'borderColor' | 'textAccent'>) => {
    return (PACK_THEMES[activePackId] || PACK_THEMES.nexus)[key] as string;
  }, [activePackId]);

  const updateExtras = useCallback(async (updates: Partial<PackExtras>) => {
    const newExtras = { ...extras, ...updates };
    setExtras(newExtras);
    const newMap = { ...packExtrasMap, [activePackId]: { ...(packExtrasMap[activePackId] ?? {}), ...updates } };
    setPackExtrasMap(newMap);
    try { await AsyncStorage.setItem(STORAGE_EXTRAS, JSON.stringify(newMap)); } catch {}
  }, [extras, packExtrasMap, activePackId]);

  const activeTheme   = useMemo(() => PACK_THEMES[activePackId]   || PACK_THEMES.nexus, [activePackId]);
  const previewTheme  = useMemo(() => previewPackId ? (PACK_THEMES[previewPackId] || null) : null, [previewPackId]);
  const effectiveTheme = previewTheme || activeTheme;
  const isPrimeActive = activePackId !== 'nexus';

  const contextValue = useMemo(() => ({
    activePackId, currentPackId: activePackId,
    activeTheme, T: effectiveTheme,
    previewPackId, previewTheme, effectiveTheme,
    isPreviewMode: !!previewPackId,
    fadeAnim,
    applyPack, setActivePack,
    startPreview, endPreview, confirmPreview,
    unlockedIds, isUnlocked, addUnlocked,
    reviewRewardUnlocked, setReviewRewardUnlocked,
    isPrimeActive,
    getColor, extras, updateExtras,
  }), [
    activePackId, activeTheme, effectiveTheme,
    previewPackId, previewTheme,
    fadeAnim,
    applyPack, setActivePack, startPreview, endPreview, confirmPreview,
    unlockedIds, isUnlocked, addUnlocked,
    reviewRewardUnlocked, setReviewRewardUnlocked,
    isPrimeActive, getColor, extras, updateExtras,
  ]);

  return (
    <CosmeticContext.Provider value={contextValue}>
      {children}
    </CosmeticContext.Provider>
  );
}

export function useCosmetic() { return useContext(CosmeticContext); }
export function useTheme(): AppTheme { return useContext(CosmeticContext).effectiveTheme; }
