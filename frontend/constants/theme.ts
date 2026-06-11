/**
 * BUTLER AI — DESIGN TOKENS v7.0
 * NexusMind Omega art style — dark blue-slate + electric blue
 * OKLCH → hex conversions for React Native compatibility
 *
 * Style guide reference:
 *   --bg   oklch(0.12 0.012 265) → #0C0E14
 *   --c    oklch(0.66 0.18 258)  → #5B9CF6  (electric blue primary)
 *   --g    oklch(0.74 0.18 162)  → #2FD98B  (green)
 *   --v    oklch(0.66 0.22 305)  → #A366F5  (violet)
 *   --a    oklch(0.78 0.17 70)   → #F5A623  (amber)
 *   --r    oklch(0.66 0.22 22)   → #EF4444  (red)
 */

import { Platform } from 'react-native';

// ─── Font tokens ─────────────────────────────────────────────────────────────
// Display font (Rajdhani equivalent) — React Native uses system sans-serif
export const FONT_DISPLAY: any = Platform.OS === 'ios' ? 'System' : 'sans-serif';
// Data / label / code font (JetBrains Mono equivalent)
export const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ─── Background layers — OKLCH dark blue-slate ────────────────────────────────
export const BG       = '#0C0E14';   // --bg  oklch(0.12 0.012 265)  root background
export const BG1      = '#111318';   // --bg1 oklch(0.15 0.014 265)
export const BG2      = '#14171E';   // --bg2 oklch(0.18 0.016 265)
export const SURFACE  = '#131620';   // --s0  oklch(0.17 0.015 265)  card surface
export const SURFACE1 = '#171A24';   // --s1  oklch(0.20 0.018 265)  input bg
export const SURFACE2 = '#1B1F28';   // --s2  oklch(0.23 0.020 265)

// ─── Legacy aliases ───────────────────────────────────────────────────────────
export const CARD     = SURFACE;
export const PANEL    = SURFACE1;
export const NCX_BG      = BG;
export const NCX_SURFACE = SURFACE;
export const NCX_BORDER  = '#222636';
export const NCX_LIGHT   = 'rgba(91,156,246,0.04)';

// ─── Primary — electric blue (#5B9CF6) ────────────────────────────────────────
// --c oklch(0.66 0.18 258) → electric blue, slightly cyan-shifted
export const BLUE_PRIMARY = '#5B9CF6';   // --c   primary accent
export const BLUE_BRIGHT  = '#7DB5FF';   // --c2  hover / bright
export const BLUE_DIM     = '#1E3A6E';   // --c4  scrollbar, progress track
export const BLUE_FAINT   = '#0E1E3A';   // --c5  progress track bg

// ─── Accent palette — all 7 colors ────────────────────────────────────────────
export const GREEN  = '#2FD98B';   // --g  oklch(0.74 0.18 162)  success, online
export const VIOLET = '#A366F5';   // --v  oklch(0.66 0.22 305)  AI, flows
export const AMBER  = '#F5A623';   // --a  oklch(0.78 0.17 70)   warnings
export const RED    = '#EF4444';   // --r  oklch(0.66 0.22 22)   danger
export const BLUE   = '#5B9CF6';   // --b  oklch(0.72 0.16 245)  (same as primary)
export const ORANGE = '#F07B3F';   // --o  oklch(0.72 0.18 40)   secondary warm
export const PINK   = '#F472B6';   // --pk oklch(0.72 0.20 350)  cosmetics

// ─── Legacy accent aliases ────────────────────────────────────────────────────
export const TEAL   = BLUE_PRIMARY;   // replaced by electric blue
export const CYAN   = '#66B8FF';      // lighter blue for some contexts
export const GREEN2 = '#50EDAA';
export const AMBER2 = ORANGE;
export const RED2   = '#FF3300';
export const SIGMA  = VIOLET;
export const YELLOW = '#FFD700';

// ─── Text — cool blue-white scale ─────────────────────────────────────────────
export const TEXT_HI  = '#EFF4FF';   // --tx3 oklch(0.96 0.012 260)  headings
export const TEXT_PRI = '#D0DFF0';   // --tx2 oklch(0.88 0.020 260)  primary body
export const TEXT     = '#B0C0D8';   // --tx  oklch(0.78 0.025 260)  default
export const TEXT_MID = '#7A8FA8';   // midpoint
export const TEXT_DIM = '#5A6880';   // --txd oklch(0.50 0.025 260)  muted
export const TEXT_BRT = TEXT_PRI;

// ─── Borders ──────────────────────────────────────────────────────────────────
export const BORDER      = 'rgba(91,156,246,0.18)';   // --bd  standard
export const BORDER2     = 'rgba(91,156,246,0.09)';   // --bd2 divider
export const BORDER3     = 'rgba(91,156,246,0.28)';   // --bd3 hover
export const BORDER_FAINT = '#1A1E2C';

// ─── Semantic shortcuts ────────────────────────────────────────────────────────
export const CONNECTED    = GREEN;
export const DISCONNECTED = RED;
export const WARNING_COL  = AMBER;

// ─── Full theme object (legacy compat) ────────────────────────────────────────
export const theme = {
  colors: {
    // Backgrounds
    background:    BG,
    backgroundDark:'#090A10',
    bg2:           BG1,
    bg3:           BG2,
    bg4:           SURFACE1,
    surface:       SURFACE,
    surfaceLight:  PANEL,

    // Primary / brand
    primary:       BLUE_PRIMARY,
    primaryBright: BLUE_BRIGHT,
    primaryDim:    BLUE_DIM,
    c:             GREEN,
    c2:            GREEN2,

    // Accents
    blue:          BLUE_PRIMARY,
    cyan:          CYAN,
    teal:          TEAL,
    red:           RED,
    amber:         AMBER,
    purple:        VIOLET,
    pink:          PINK,
    orange:        ORANGE,
    sigma:         SIGMA,
    yellow:        YELLOW,

    // Text
    text:      TEXT_PRI,
    textMuted: TEXT_DIM,
    textDim:   TEXT_DIM,

    // Borders
    border:       BORDER_FAINT,
    borderHover:  NCX_BORDER,
    borderAccent: BLUE_PRIMARY + '66',

    // Semantic
    success: GREEN,
    warning: AMBER,
    danger:  RED,
    info:    BLUE_PRIMARY,
    gold:    YELLOW,

    syntax: {
      comment:  TEXT_DIM,
      string:   '#FFE066',
      function: GREEN,
      keyword:  PINK,
      variable: BLUE_PRIMARY,
      number:   VIOLET,
      operator: PINK,
    },
  },

  fonts: {
    display: FONT_DISPLAY,
    mono:    MONO,
    code:    MONO,
  },

  spacing: {
    xs:  6,
    sm:  10,
    md:  14,
    lg:  18,
    xl:  22,
    xxl: 26,
  },

  borderRadius: {
    sm:  4,
    md:  8,
    lg:  12,
    xl:  16,
  },

  animations: {
    fast:   200,
    normal: 300,
    slow:   500,
  },

  typography: {
    xs:   10,
    sm:   12,
    md:   14,
    lg:   16,
    xl:   20,
    xxl:  24,
    weights: {
      normal:   '400',
      medium:   '500',
      semibold: '600',
      bold:     '700',
    },
  },
};

export type Theme = typeof theme;
