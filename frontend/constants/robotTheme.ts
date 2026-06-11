/**
 * BUTLER AI — ADVANCED ROBOT THEME v2.0
 * Ultra-dark, mechanical, AI-focused aesthetic with breathing animations
 * Optimized for performance with efficient animations
 */

import { Platform, StyleSheet } from 'react-native';

// ─── ULTRA-DARK ROBOT PALETTE ─────────────────────────────────────
export const ROBOT = {
  // Absolute void backgrounds (darker than before)
  void:               '#000000',     // Pure black
  voidDeep:           '#0A0A0A',     // Deep void
  voidDarker:         '#050505',     // Darker void
  
  // Mechanical surfaces with metallic tint
  surface:            '#0F0F15',     // Primary surface (very dark blue-black)
  surfaceMetal:       '#1A1A24',     // Metallic surface
  surfaceActive:      '#252535',     // Active/hover state
  surfaceDim:         '#0D0D12',     // Dimmed surface
  
  // Primary neon accents (robot/AI themed)
  cyan:               '#00F0FF',     // Bright cyan (robot eyes)
  cyanDim:            '#006B7F',     // Dimmed cyan
  cyanGlow:           '#00F0FF40',   // Glow layer
  
  // Secondary accents
  magenta:            '#FF00FF',     // Magenta (AI energy)
  magentaDim:         '#7F007F',     // Dimmed magenta
  
  // Tertiary (robot/mechanical)
  plasma:             '#00FF99',     // Neon green (energy flow)
  plasmaDim:          '#007F4C',     // Dimmed plasma
  
  // Quaternary (circuit/tech)
  purple:             '#9D00FF',     // Electric purple (circuits)
  purpleDim:          '#4D007F',     // Dimmed purple
  
  // Danger/Alert (robot warning)
  alert:              '#FF0055',     // Neon red (danger)
  alertDim:           '#7F002A',     // Dimmed alert
  
  // Warning (robot caution)
  warning:            '#FFB000',     // Neon amber (caution)
  warningDim:         '#7F5800',     // Dimmed warning
  
  // Success (robot operational)
  success:            '#00FF66',     // Neon green (operational)
  successDim:         '#007F33',     // Dimmed success
  
  // Text layers (robot display)
  textBright:         '#E0F7FF',     // Brightest (headings)
  textPrimary:        '#A8D8FF',     // Primary body text
  textSecondary:      '#6A9FCC',     // Secondary text
  textMuted:          '#3A5A7A',     // Muted text
  textDim:            '#1A2A3A',     // Very dim text
  
  // Borders (robot circuits)
  borderBright:       '#00F0FF80',   // Bright border
  borderStandard:     '#00F0FF40',   // Standard border
  borderFaint:        '#00F0FF20',   // Faint border
  borderDark:         '#0A1A2A',     // Dark border
  
  // Mechanical/metallic
  metal:              '#2A2A3A',     // Metallic gray
  metalDark:          '#1A1A2A',     // Dark metallic
  
  // Robot indicators
  robotEye:           '#00F0FF',     // Robot eye color (cyan)
  robotCircuit:       '#9D00FF',     // Circuit color (purple)
  robotEnergy:        '#00FF99',     // Energy flow (plasma)
  
  // Breathing effect colors
  breatheLight:       '#00F0FF20',   // Light breathing
  breatheMedium:      '#00F0FF40',   // Medium breathing
  breatheIntense:     '#00F0FF60',   // Intense breathing
} as const;

// ─── MONOSPACE FONT (robot display) ────────────────────────────────
export const ROBOT_FONT = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ─── ROBOT TYPOGRAPHY WITH MECHANICAL FEEL ────────────────────────
export const ROBOT_TYPE = {
  // Page titles: mechanical, uppercase, wide spacing
  title: {
    fontSize: 28,
    fontWeight: '900' as const,
    letterSpacing: 5,
    fontFamily: ROBOT_FONT,
    color: ROBOT.textBright,
  },
  
  // Section headers: bracketed format with robot accent
  section: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 3.5,
    fontFamily: ROBOT_FONT,
    color: ROBOT.cyan,
  },
  
  // Stat labels: tiny, uppercase, robot display
  statLabel: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 2.5,
    fontFamily: ROBOT_FONT,
    color: ROBOT.textMuted,
  },
  
  // Large metrics: huge, bold, robot numbers
  metric: {
    fontSize: 48,
    fontWeight: '900' as const,
    fontFamily: ROBOT_FONT,
    color: ROBOT.cyan,
  },
  
  // Button text: uppercase, wide spacing, mechanical
  button: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 2.5,
    fontFamily: ROBOT_FONT,
    color: ROBOT.textBright,
  },
  
  // Body text: readable, monospace, robot
  body: {
    fontSize: 14,
    fontWeight: '500' as const,
    fontFamily: ROBOT_FONT,
    color: ROBOT.textPrimary,
  },
  
  // Small text
  small: {
    fontSize: 12,
    fontWeight: '500' as const,
    fontFamily: ROBOT_FONT,
    color: ROBOT.textSecondary,
  },
  
  // Tiny text
  tiny: {
    fontSize: 10,
    fontWeight: '600' as const,
    fontFamily: ROBOT_FONT,
    color: ROBOT.textMuted,
  },
} as const;

// ─── BREATHING ANIMATION EFFECT ───────────────────────────────────
export const breathingAnimation = (
  color: string = ROBOT.cyan,
  intensity: 'subtle' | 'medium' | 'intense' = 'medium',
  duration: number = 3000
) => {
  const intensities = {
    subtle: { minOpacity: 0.1, maxOpacity: 0.3 },
    medium: { minOpacity: 0.2, maxOpacity: 0.5 },
    intense: { minOpacity: 0.3, maxOpacity: 0.8 },
  };
  
  const { minOpacity, maxOpacity } = intensities[intensity];
  
  return {
    color,
    minOpacity,
    maxOpacity,
    duration,
    easing: 'ease-in-out',
  };
};

// ─── ROBOT GLOW SHADOW (optimized) ────────────────────────────────
export const robotGlowShadow = (
  color: string = ROBOT.cyan,
  intensity: 'low' | 'medium' | 'high' = 'medium'
) => {
  const opacities = { low: 0.12, medium: 0.25, high: 0.4 };
  const radii = { low: 6, medium: 10, high: 14 };
  
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: opacities[intensity],
      shadowRadius: radii[intensity],
    },
    android: { elevation: intensity === 'high' ? 10 : intensity === 'medium' ? 6 : 3 },
    default: {},
  });
};

// ─── ROBOT BORDER STYLE ───────────────────────────────────────────
export const robotBorder = (color: string = ROBOT.cyan, thickness: number = 2) => ({
  borderWidth: thickness,
  borderColor: color,
  borderRadius: 10,
  ...robotGlowShadow(color, 'medium'),
});

// ─── ROBOT CARD STYLE ─────────────────────────────────────────────
export const robotCard = (accentColor: string = ROBOT.cyan, active: boolean = false) => ({
  backgroundColor: ROBOT.surface,
  borderRadius: 12,
  borderLeftWidth: 3,
  borderLeftColor: accentColor,
  borderWidth: active ? 2 : 1,
  borderColor: active ? accentColor + 'AA' : ROBOT.borderStandard,
  borderTopWidth: 1,
  borderTopColor: 'rgba(0,240,255,0.08)',
  ...robotGlowShadow(accentColor, active ? 'high' : 'medium'),
});

// ─── ROBOT STAT CARD ──────────────────────────────────────────────
export const robotStatCard = (accentColor: string = ROBOT.cyan) => ({
  backgroundColor: ROBOT.surfaceMetal,
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 16,
  borderTopWidth: 2,
  borderTopColor: 'rgba(0,240,255,0.1)',
  borderBottomWidth: 3,
  borderBottomColor: accentColor,
  borderLeftWidth: 3,
  borderLeftColor: accentColor + '80',
  borderRightWidth: 1,
  borderRightColor: ROBOT.borderFaint,
  ...robotGlowShadow(accentColor, 'high'),
});

// ─── ROBOT BUTTON STYLE ───────────────────────────────────────────
export const robotButton = (accentColor: string = ROBOT.cyan, pressed: boolean = false) => ({
  backgroundColor: pressed ? accentColor + '25' : ROBOT.surfaceActive,
  borderRadius: 8,
  borderWidth: 2,
  borderColor: accentColor,
  paddingHorizontal: 16,
  paddingVertical: 12,
  ...robotGlowShadow(accentColor, pressed ? 'high' : 'medium'),
});

// ─── ROBOT BREATHING EFFECT ───────────────────────────────────────
export const robotBreathingOverlay = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,240,255,0.02)',
    pointerEvents: 'none',
  },
});

// ─── ROBOT TEXT GLOW ──────────────────────────────────────────────
export const robotTextGlow = (color: string = ROBOT.cyan) => ({
  textShadowColor: color,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 6,
});

// ─── ROBOT SPACING ────────────────────────────────────────────────
export const ROBOT_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  huge: 32,
  massive: 40,
} as const;

// ─── ROBOT RADIUS ─────────────────────────────────────────────────
export const ROBOT_RADIUS = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// ─── OPTIMIZED ANIMATION TIMINGS ──────────────────────────────────
export const ROBOT_ANIM = {
  instant: 100,
  fast: 120,
  normal: 200,
  slow: 300,
  verySlow: 500,
  robotBreathing: 3000,    // Breathing animation (optimized)
  robotPulse: 1500,        // Robot pulse
  robotScan: 2500,         // Scan animation
  robotGlitch: 150,        // Glitch effect
} as const;

// ─── ROBOT THEME OBJECT ───────────────────────────────────────────
export const robotTheme = {
  colors: ROBOT,
  typography: ROBOT_TYPE,
  spacing: ROBOT_SPACING,
  radius: ROBOT_RADIUS,
  animations: ROBOT_ANIM,
  shadows: {
    robotGlow: robotGlowShadow(),
    robotGlowHigh: robotGlowShadow(ROBOT.cyan, 'high'),
    robotGlowLow: robotGlowShadow(ROBOT.cyan, 'low'),
  },
  utilities: {
    robotCard,
    robotStatCard,
    robotButton,
    robotBorder,
    robotTextGlow,
    breathingAnimation,
  },
};

export type RobotTheme = typeof robotTheme;
