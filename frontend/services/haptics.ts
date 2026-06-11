/**
 * 🎯 HAPTICS HELPER — v2.0 Enhanced tactile feedback patterns
 * Consistent, page-aware vibration across all interactions
 * Wraps expo-haptics with safe fallbacks for web/simulator
 */

import { Platform } from 'react-native';

let Haptics: any = null;

// Lazy-load so it doesn't crash on web
const getHaptics = () => {
  if (!Haptics && Platform.OS !== 'web') {
    try {
      Haptics = require('expo-haptics');
    } catch {}
  }
  return Haptics;
};

const imp = (style: string) => {
  try { getHaptics()?.impactAsync(getHaptics()?.ImpactFeedbackStyle?.[style]); } catch {}
};
const notif = (type: string) => {
  try { getHaptics()?.notificationAsync(getHaptics()?.NotificationFeedbackType?.[type]); } catch {}
};

export const haptics = {
  /** Light tap — navigation, toggle, minor interactions */
  light: () => imp('Light'),

  /** Medium tap — primary buttons, confirm, QR scan */
  medium: () => imp('Medium'),

  /** Heavy tap — destructive, force, heavy confirm */
  heavy: () => imp('Heavy'),

  /** Rigid — sharp click for precision actions (iOS 13+) */
  rigid: () => {
    try { getHaptics()?.impactAsync(getHaptics()?.ImpactFeedbackStyle?.Rigid ?? getHaptics()?.ImpactFeedbackStyle?.Heavy); } catch {}
  },

  /** Soft — gentle touch for informational reveals */
  soft: () => {
    try { getHaptics()?.impactAsync(getHaptics()?.ImpactFeedbackStyle?.Soft ?? getHaptics()?.ImpactFeedbackStyle?.Light); } catch {}
  },

  /** Success — connection established, script done, saved */
  success: () => notif('Success'),

  /** Warning — server offline, validation error */
  warning: () => notif('Warning'),

  /** Error — critical failure */
  error: () => notif('Error'),

  /** Selection — tab switch, chip selection, list scroll */
  selection: () => {
    try { getHaptics()?.selectionAsync(); } catch {}
  },

  // ─── PATTERN SEQUENCES ─────────────────────────────────────────

  /** Double pulse — connection confirmed */
  doublePulse: () => {
    imp('Medium');
    setTimeout(() => imp('Light'), 100);
  },

  /** Triple tap — major achievement, unlock */
  tripleSuccess: () => {
    imp('Light');
    setTimeout(() => imp('Medium'), 100);
    setTimeout(() => imp('Heavy'), 200);
  },

  /** Heartbeat — script running, active process */
  heartbeat: () => {
    imp('Light');
    setTimeout(() => imp('Heavy'), 80);
  },

  /** Stutter — error confirmation */
  stutter: () => {
    imp('Heavy');
    setTimeout(() => imp('Heavy'), 60);
    setTimeout(() => imp('Heavy'), 120);
  },

  /** Swipe confirm — long swipe gesture confirm */
  swipeConfirm: () => {
    imp('Light');
    setTimeout(() => imp('Light'), 50);
    setTimeout(() => imp('Medium'), 150);
  },

  /** Page transition — switching between tabs */
  pageTransition: () => {
    try { getHaptics()?.selectionAsync(); } catch {}
  },

  /** Save success — data saved to storage */
  saveSuccess: () => {
    imp('Light');
    setTimeout(() => notif('Success'), 120);
  },

  /** Copy flash — content copied to clipboard */
  copyFlash: () => {
    imp('Rigid');
  },

  /** Script execute — running a Python script */
  scriptExecute: () => {
    imp('Medium');
    setTimeout(() => imp('Light'), 80);
    setTimeout(() => imp('Light'), 180);
  },

  /** Script complete — script finished executing */
  scriptComplete: () => {
    notif('Success');
    setTimeout(() => imp('Light'), 150);
  },

  /** Connection success — server paired */
  connectionSuccess: () => {
    imp('Light');
    setTimeout(() => imp('Medium'), 100);
    setTimeout(() => notif('Success'), 250);
  },

  /** Unlock/purchase — cosmetic unlocked */
  unlockCelebration: () => {
    imp('Heavy');
    setTimeout(() => imp('Medium'), 100);
    setTimeout(() => imp('Light'), 200);
    setTimeout(() => notif('Success'), 350);
  },

  /** Long press — contextual menu reveal */
  longPress: () => imp('Heavy'),

  /** Refresh — pull-to-refresh or reload */
  refresh: () => {
    imp('Light');
    setTimeout(() => imp('Rigid'), 100);
  },
};
