/**
 * NEXUS COMMAND CENTER Design System
 * "Cyber-Grid Dark Mode" — exact visual language from NEXUSCommandCenter
 *
 * NON-NEGOTIABLE RULES:
 * - Background: #0a0b0f  Card surface: #0f1520  borderRadius: 14
 * - Primary accent: #00d4ff (Cyan)  Secondary: #00e87a (Emerald)
 * - Tertiary: #ff8c00 (Amber)  Quaternary: #a855f7 (Purple)
 * - Danger: #ff3b30 (Crimson)  Border: #1a2235
 * - Body text: #c8d8f0  Muted: #4a607a
 * - fontFamily: 'monospace' on ALL text, no exceptions
 * - Cards: 3px solid accent line on LEFT edge only (no full glow borders)
 * - Stat cards: dark surface, small uppercase label, HUGE colored number, 3px accent bar at bottom
 * - DO NOT USE: white/light backgrounds, pill buttons (borderRadius max 10),
 *   colored filled card backgrounds, serif/sans-serif fonts, shadows wider than 12px,
 *   gradient backgrounds
 * - 3D: elevation 8 + shadowColor accentColor, shadowOpacity 0.25, shadowRadius 12, shadowOffset {0,4}
 *   Stat card top edge: borderTopColor 'rgba(255,255,255,0.06)', borderTopWidth 1 (3D light source)
 */

import { Platform } from 'react-native';

// ─── NEXUS COMMAND CENTER PALETTE ────────────────────────────────
export const NCX = {
  // Backgrounds — solid dark only, NO gradients
  bg:          '#0a0b0f',     // deepest background
  surface:     '#0f1520',     // card surface
  surfaceHi:   '#141d2e',     // elevated surface
  surfaceMid:  '#111828',     // mid-level surface
  overlay:     'rgba(10,11,15,0.96)',

  // Accent colors
  cyan:        '#00d4ff',     // primary accent
  cyanDim:     '#00d4ff22',
  cyanBorder:  '#00d4ff40',
  emerald:     '#00e87a',     // secondary
  emeraldDim:  '#00e87a18',
  amber:       '#ff8c00',     // tertiary
  amberDim:    '#ff8c0018',
  purple:      '#a855f7',     // quaternary
  purpleDim:   '#a855f718',
  crimson:     '#ff3b30',     // danger
  crimsonDim:  '#ff3b3018',

  // Semantic
  green:       '#00e87a',     // success / connected
  red:         '#ff3b30',     // error / offline
  yellow:      '#ffd700',     // warning / special

  // Borders
  border:      '#1a2235',     // standard border
  borderFaint: 'rgba(26,34,53,0.8)',

  // Text
  text:        '#c8d8f0',     // body text
  textMuted:   '#4a607a',     // muted text
  textDim:     '#2a3a4a',     // very dim

  // 3D light source effect on stat cards
  lightEdge:   'rgba(255,255,255,0.06)',
} as const;

// ─── MONOSPACE FONT (everywhere, no exceptions) ──────────────────
export const MONO = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ─── TYPOGRAPHY ──────────────────────────────────────────────────
export const NCX_TYPE = {
  // Page titles: fontSize 20, fontWeight '800', letterSpacing 3, uppercase
  title:    { fontSize: 20, fontWeight: '800' as const, letterSpacing: 3, fontFamily: MONO },
  // Section: bracket format "[ SECTION ]" + colored dot
  section:  { fontSize: 12, fontWeight: '700' as const, letterSpacing: 2, fontFamily: MONO },
  // Stat labels: fontSize 9, letterSpacing 2.5, uppercase, muted
  statLabel:{ fontSize: 9,  fontWeight: '700' as const, letterSpacing: 2.5, fontFamily: MONO },
  // Large metrics: fontSize 36-48, fontWeight '800', semantic color
  metric:   { fontSize: 42, fontWeight: '800' as const, fontFamily: MONO },
  // Buttons: fontWeight '800', letterSpacing 2, uppercase
  button:   { fontSize: 12, fontWeight: '800' as const, letterSpacing: 2, fontFamily: MONO },
  // Body: fontSize 14
  body:     { fontSize: 14, fontWeight: '500' as const, fontFamily: MONO },
  // Small
  small:    { fontSize: 11, fontWeight: '500' as const, fontFamily: MONO },
  // Tiny
  tiny:     { fontSize: 9,  fontWeight: '600' as const, fontFamily: MONO },
} as const;

// ─── 3D CARD SHADOW ──────────────────────────────────────────────
export const ncxCardShadow = (accentColor: string) => Platform.select({
  ios: {
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  android: { elevation: 8 },
  default: {},
});

export const ncxCTAShadow = (accentColor: string) => Platform.select({
  ios: {
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  android: { elevation: 10 },
  default: {},
});

// ─── CARD BASE STYLES ────────────────────────────────────────────
// Cards: 3px left accent line, #0f1520 bg, borderRadius 14
// Active cards: 1px full border at accent color + 40% opacity
export const ncxCard = (accentColor?: string, active?: boolean) => ({
  backgroundColor: NCX.surface,
  borderRadius: 14,
  borderLeftWidth: 3,
  borderLeftColor: accentColor || NCX.cyan,
  borderWidth: active ? 1 : 0,
  borderColor: active ? (accentColor || NCX.cyan) + '66' : 'transparent',
  // 3D light source
  borderTopWidth: 1,
  borderTopColor: NCX.lightEdge,
});

// ─── STAT CARD ────────────────────────────────────────────────────
// Dark surface, small uppercase label, HUGE colored number, 3px accent bar at bottom
export const ncxStatCard = (accentColor: string) => ({
  backgroundColor: NCX.surfaceHi,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingTop: 14,
  paddingBottom: 14,
  borderTopWidth: 1,
  borderTopColor: NCX.lightEdge,  // 3D light source
  borderBottomWidth: 3,
  borderBottomColor: accentColor,
  borderWidth: 1,
  borderColor: NCX.border,
  ...Platform.select({
    ios: {
      shadowColor: accentColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
    },
    android: { elevation: 8 },
  }),
});

// ─── SPACING / LAYOUT ─────────────────────────────────────────────
export const NCX_SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, huge: 32,
} as const;

// ─── BOTTOM TAB BAR ──────────────────────────────────────────────
// Background: #08090e, borderTopWidth 1, borderTopColor #1a2235
// Active: 3px top border line in tab's accent color + accent-colored icon + label
// Inactive: muted gray, no border
export const NCX_TAB = {
  bg:           '#08090e',
  borderTop:    '#1a2235',
  inactiveIcon: '#4a607a',
  inactiveLabel:'#4a607a',
} as const;

// ─── STATUS BANNER STYLE ─────────────────────────────────────────
// 4px left border: red=offline, green=connected
// Animated pulse dot + uppercase text
export const ncxStatusBanner = (online: boolean) => ({
  backgroundColor: NCX.surfaceHi,
  borderLeftWidth: 4,
  borderLeftColor: online ? NCX.green : NCX.red,
  borderRadius: 8,
  padding: 12,
});

// ─── ANIMATION CONSTANTS ─────────────────────────────────────────
// Numbers count up from 0 via Animated.timing over 1200ms on mount
// Status dots: opacity pulse 1.0→0.3→1.0 loop over 1400ms
// Cards: ScrollReveal fade+slide up 20px, 60ms stagger
export const NCX_ANIM = {
  counterDuration: 1200,
  dotPulseDuration: 1400,
  cardRevealDuration: 350,
  cardStagger: 60,
  slideUpDistance: 20,
} as const;

// ─── LEGACY COMPAT EXPORT (so existing imports don't break) ──────
export const COLORS = {
  void: NCX.bg,
  surface: NCX.surface,
  surfaceElevated: NCX.surfaceHi,
  overlay: NCX.overlay,
  gold: NCX.amber,
  goldDark: NCX.amber + '80',
  goldLight: NCX.amber,
  goldGlow: NCX.amber + '40',
  terminalGreen: NCX.emerald,
  cyberRed: NCX.crimson,
  cyan: NCX.cyan,
  textPrimary: NCX.text,
  textSecondary: NCX.textMuted,
  textDim: NCX.textDim,
  borderGold: NCX.cyanBorder,
  borderGlow: NCX.cyan,
  borderSubtle: NCX.cyanDim,
  codeBackground: NCX.bg,
  codeText: NCX.emerald,
  success: NCX.emerald,
  warning: NCX.amber,
  error: NCX.crimson,
  info: NCX.cyan,
} as const;

export const FONTS = {
  ui:       MONO,
  code:     MONO,
  regular:  '400',
  medium:   '500',
  semiBold: '600',
  bold:     '700',
} as const;

export const FONT_SIZES = {
  xxs: 10, xs: 11, sm: 12, md: 14, lg: 16, xl: 18, xxl: 20, xxxl: 24, title: 28,
} as const;

export const SPACING = NCX_SPACING;
export const RADIUS = { none: 0, sm: 6, md: 10, lg: 12, xl: 16, full: 9999 } as const;

export const ANIMATION = {
  instant: 100, fast: 150, normal: 200, slow: 300,
  easeIn: 'ease-in', easeOut: 'ease-out', easeInOut: 'ease-in-out', spring: 'spring',
} as const;

export const Z_INDEX = {
  background: -1, base: 0, elevated: 10, dropdown: 100, sticky: 200,
  modal: 500, modalBackdrop: 499, toast: 1000, tooltip: 1100,
} as const;

export const SHADOWS = {
  goldGlowSm: ncxCardShadow(NCX.cyan),
  goldGlowMd: ncxCardShadow(NCX.cyan),
  goldGlowLg: ncxCTAShadow(NCX.cyan),
  cyberElevation: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 12 },
    android: { elevation: 6 },
  }),
} as const;

export const LAYOUT = {
  screenPadding: 16,
  cardPadding: 12,
  inputHeight: 48,
  buttonHeight: 48,
  iconSize: { sm: 16, md: 20, lg: 24, xl: 32 },
  minTouchTarget: Platform.select({ ios: 44, android: 48, default: 44 }),
} as const;

export const BREAKPOINTS = { phone: 0, tablet: 600, desktop: 1024 } as const;

export const DesignSystem = {
  colors: COLORS, fonts: FONTS, fontSizes: FONT_SIZES, spacing: SPACING,
  radius: RADIUS, shadows: SHADOWS, animation: ANIMATION, zIndex: Z_INDEX,
  layout: LAYOUT, breakpoints: BREAKPOINTS,
} as const;

export type ColorKey = keyof typeof COLORS;
export type FontSizeKey = keyof typeof FONT_SIZES;
export type SpacingKey = keyof typeof SPACING;
export type RadiusKey = keyof typeof RADIUS;
