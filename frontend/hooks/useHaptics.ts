/**
 * useHaptics.ts
 * ──────────────────────────────────────────────────────────────────
 * Typed, centralised haptic-feedback hook. Wrap every Haptics.* call
 * here so you can toggle the whole app's haptic feedback by editing
 * one file. All methods are safe to call repeatedly and silently
 * no-op on platforms / devices that don't support haptics.
 *
 * Usage:
 *   const haptics = useHaptics();
 *   haptics.medium();    // for primary action buttons
 *   haptics.success();   // when a task completes
 */
import * as Haptics from 'expo-haptics';

const safe = (fn: () => Promise<void> | void) => {
  try { Promise.resolve(fn()).catch(() => {}); } catch {}
};

export function useHaptics() {
  return {
    /** Tab press, list item select, toggle. */
    light:     () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
    /** Button press, action tile, send. */
    medium:    () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
    /** Destructive action, hard error. */
    heavy:     () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
    /** Successful operation completed. */
    success:   () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
    /** Operation failed. */
    error:     () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
    /** Warning / partial success. */
    warning:   () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
    /** Selection changed (model picker, theme, segmented). */
    selection: () => safe(() => Haptics.selectionAsync()),
  };
}
