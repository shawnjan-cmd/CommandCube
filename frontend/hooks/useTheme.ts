/**
 * hooks/useTheme.ts
 * ──────────────────────────────────────────────────────────────────
 * V11 ThemePalette bridge → maps CosmeticContext's AppTheme to the
 * standardised token names used by OmegaLearningLoop, SystemHeader,
 * ChatBubble, ChatInput, and ThemedBackground.
 *
 * Import: import { useTheme } from '@/hooks/useTheme'
 * Usage:  const { theme } = useTheme();
 *         style={{ color: theme.neonAccent }}
 *
 * All values are derived from the active CosmeticContext theme so they
 * automatically update when the user switches cosmetic packs.
 */

import { useContext } from 'react';
import { CosmeticContext } from '@/contexts/CosmeticContext';

// ── V11 standardised ThemePalette ────────────────────────────────
export interface ThemePalette {
  /** Absolute root background — deepest dark layer */
  backgroundRoot: string;
  /** Card and bubble backgrounds */
  backgroundDark: string;
  /** Hover / input / active panel backgrounds */
  backgroundLighter: string;
  /** Panel divider lines (low opacity) */
  border: string;
  /** Main readable headings and critical values */
  textPrimary: string;
  /** Secondary labels, timestamps, monospace data */
  textSecondary: string;
  /** Dominant glowing accent colour (tabs, CTAs, LEDs) */
  neonAccent: string;
  /** System OK / success state */
  success: string;
  /** System Halt / error state */
  error: string;
}

// ── Hook ──────────────────────────────────────────────────────────
export function useTheme(): { theme: ThemePalette } {
  const { effectiveTheme } = useContext(CosmeticContext);

  const theme: ThemePalette = {
    backgroundRoot:    effectiveTheme.bg,
    backgroundDark:    effectiveTheme.panel,
    backgroundLighter: effectiveTheme.panelBrt,
    border:            effectiveTheme.borderColor,
    textPrimary:       effectiveTheme.textHi,
    textSecondary:     effectiveTheme.textDim,
    neonAccent:        effectiveTheme.primary,
    success:           effectiveTheme.secondary,
    error:             '#EF4444',
  };

  return { theme };
}

export default useTheme;
