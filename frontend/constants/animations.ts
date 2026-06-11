/**
 * WAVE 1: Global Animation System
 * Reusable animation presets for buttons, cards, and interactions
 * 60fps optimized with shared values
 */

/**
 * RE-EXPORT: safeAnim / nativeAnim helpers from constants/anim.ts
 * Import from either place:
 *   import { safeAnimTiming } from '@/constants/anim';       ← preferred
 *   import { safeAnimTiming } from '@/constants/animations'; ← also works
 */
export * from './anim';

import { withSpring, withTiming, withSequence, withRepeat, Easing } from 'react-native-reanimated';

// ════════════════════════════════════════════════════════════════
// 🎭 BUTTON PRESS ANIMATIONS
// ════════════════════════════════════════════════════════════════

export const ButtonAnimations = {
  /**
   * 3D Press - Mechanical feel with depth
   */
  press3D: {
    onPressIn: () => ({
      scale: withSpring(0.95, { damping: 15, stiffness: 400 }),
      translateY: withSpring(2, { damping: 15, stiffness: 400 }),
    }),
    onPressOut: () => ({
      scale: withSpring(1, { damping: 12, stiffness: 400 }),
      translateY: withSpring(0, { damping: 12, stiffness: 400 }),
    }),
  },

  /**
   * Bounce - Playful elastic feedback
   */
  bounce: {
    onPress: () =>
      withSequence(
        withSpring(1.15, { damping: 10, stiffness: 300 }),
        withSpring(0.95, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 400 })
      ),
  },

  /**
   * Ripple - Material design style
   */
  ripple: {
    trigger: () =>
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(1.5, { duration: 300, easing: Easing.out(Easing.cubic) })
      ),
    opacity: () =>
      withSequence(
        withTiming(0.8, { duration: 0 }),
        withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
      ),
  },

  /**
   * Jelly - Physics-based deformation
   */
  jelly: {
    onPress: () =>
      withSequence(
        withSpring(1.2, { damping: 5, stiffness: 300, mass: 0.5 }),
        withSpring(0.9, { damping: 7, stiffness: 200, mass: 0.8 }),
        withSpring(1.05, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 12, stiffness: 400 })
      ),
  },

  /**
   * Pulse - Attention-grabbing throb
   */
  pulse: {
    continuous: () =>
      withRepeat(
        withSequence(
          withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      ),
  },

  /**
   * Shimmer - Loading state indicator
   */
  shimmer: {
    continuous: () =>
      withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.linear }),
        -1,
        false
      ),
  },

  /**
   * Lift - Elevation change on press
   */
  lift: {
    onPressIn: () => ({
      scale: withSpring(1.02, { damping: 15, stiffness: 400 }),
      elevation: withSpring(16, { damping: 20, stiffness: 300 }),
    }),
    onPressOut: () => ({
      scale: withSpring(1, { damping: 12, stiffness: 400 }),
      elevation: withSpring(8, { damping: 20, stiffness: 300 }),
    }),
  },
};

// ════════════════════════════════════════════════════════════════
// ✨ GLOW EFFECTS
// ════════════════════════════════════════════════════════════════

export const GlowAnimations = {
  /**
   * Pulsing glow - Breathing effect
   */
  pulse: {
    continuous: () =>
      withRepeat(
        withSequence(
          withTiming(1.5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.8, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      ),
  },

  /**
   * Radar sweep - Scanning effect
   */
  radar: {
    continuous: () =>
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1.8, { duration: 1500, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 500, easing: Easing.in(Easing.cubic) })
        ),
        -1,
        false
      ),
  },

  /**
   * Shimmer sweep - Light passing over surface
   */
  shimmer: {
    continuous: () =>
      withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      ),
  },

  /**
   * Flicker - Error/warning state
   */
  flicker: {
    continuous: () =>
      withRepeat(
        withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(0.3, { duration: 80 }),
          withTiming(1, { duration: 120 }),
          withTiming(0.5, { duration: 90 }),
          withTiming(1, { duration: 150 })
        ),
        -1,
        false
      ),
  },
};

// ════════════════════════════════════════════════════════════════
// 🌊 BACKGROUND ANIMATIONS
// ════════════════════════════════════════════════════════════════

export const BackgroundAnimations = {
  /**
   * Parallax scroll - Depth effect
   */
  parallax: {
    slow: (scrollY: number) => scrollY * 0.3,
    medium: (scrollY: number) => scrollY * 0.5,
    fast: (scrollY: number) => scrollY * 0.7,
  },

  /**
   * Floating elements - Drift animation
   */
  float: {
    continuous: (delay: number = 0) =>
      withRepeat(
        withSequence(
          withTiming(20, { duration: 3000 + delay, easing: Easing.inOut(Easing.ease) }),
          withTiming(-20, { duration: 3000 + delay, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      ),
  },

  /**
   * Rotation - Slow spin
   */
  rotate: {
    continuous: (duration: number = 4000) =>
      withRepeat(
        withTiming(360, { duration, easing: Easing.linear }),
        -1,
        false
      ),
  },

  /**
   * Matrix rain - Code falling effect
   */
  matrixRain: {
    continuous: (duration: number = 10000) =>
      withRepeat(
        withTiming(1, { duration, easing: Easing.linear }),
        -1,
        false
      ),
  },

  /**
   * Wave motion - Sine wave oscillation
   */
  wave: {
    continuous: (amplitude: number = 10, frequency: number = 2000) =>
      withRepeat(
        withSequence(
          withTiming(amplitude, { duration: frequency, easing: Easing.inOut(Easing.sine) }),
          withTiming(-amplitude, { duration: frequency, easing: Easing.inOut(Easing.sine) })
        ),
        -1,
        false
      ),
  },
};

// ════════════════════════════════════════════════════════════════
// 🎯 MICRO-INTERACTIONS
// ════════════════════════════════════════════════════════════════

export const MicroAnimations = {
  /**
   * Success checkmark - Morphing check
   */
  successCheck: {
    trigger: () =>
      withSequence(
        withTiming(0, { duration: 0 }),
        withSpring(1.2, { damping: 10, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 300 })
      ),
  },

  /**
   * Error shake - Rejection feedback
   */
  errorShake: {
    trigger: () =>
      withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      ),
  },

  /**
   * Loading spinner - Rotation
   */
  spinner: {
    continuous: () =>
      withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      ),
  },

  /**
   * Notification badge - Pop in
   */
  badgePop: {
    trigger: () =>
      withSequence(
        withTiming(0, { duration: 0 }),
        withSpring(1.3, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 400 })
      ),
  },

  /**
   * Swipe away - Dismiss gesture
   */
  swipeAway: {
    trigger: (direction: 'left' | 'right') =>
      withSpring(direction === 'left' ? -500 : 500, {
        damping: 20,
        stiffness: 300,
      }),
  },
};

// ════════════════════════════════════════════════════════════════
// 🎨 COLOR TRANSITIONS
// ════════════════════════════════════════════════════════════════

export const ColorAnimations = {
  /**
   * Smooth color fade
   */
  fade: (duration: number = 300) =>
    withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),

  /**
   * Quick color pop
   */
  pop: () =>
    withSequence(
      withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 150, easing: Easing.in(Easing.cubic) })
    ),

  /**
   * Pulsing color intensity
   */
  pulse: () =>
    withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    ),
};

// ════════════════════════════════════════════════════════════════
// ⚡ PERFORMANCE PRESETS
// ════════════════════════════════════════════════════════════════

export const PerformanceConfigs = {
  /**
   * 60fps guaranteed - Fast springs
   */
  fast: {
    damping: 20,
    stiffness: 400,
    mass: 0.5,
  },

  /**
   * Smooth - Balanced feel
   */
  smooth: {
    damping: 15,
    stiffness: 300,
    mass: 1,
  },

  /**
   * Bouncy - Playful physics
   */
  bouncy: {
    damping: 8,
    stiffness: 200,
    mass: 0.8,
  },

  /**
   * Sluggish - Heavy feel
   */
  heavy: {
    damping: 25,
    stiffness: 150,
    mass: 2,
  },
};

// ════════════════════════════════════════════════════════════════
// 🎪 ENTRANCE ANIMATIONS
// ════════════════════════════════════════════════════════════════

export const EntranceAnimations = {
  /**
   * Fade in from transparent
   */
  fadeIn: {
    from: { opacity: 0 },
    to: () => withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
  },

  /**
   * Slide in from bottom
   */
  slideUp: {
    from: { translateY: 100, opacity: 0 },
    to: () => ({
      translateY: withSpring(0, PerformanceConfigs.smooth),
      opacity: withTiming(1, { duration: 300 }),
    }),
  },

  /**
   * Scale from zero
   */
  scaleIn: {
    from: { scale: 0, opacity: 0 },
    to: () => ({
      scale: withSpring(1, PerformanceConfigs.bouncy),
      opacity: withTiming(1, { duration: 200 }),
    }),
  },

  /**
   * Flip in 3D
   */
  flipIn: {
    from: { rotateY: '90deg', opacity: 0 },
    to: () => ({
      rotateY: withSpring('0deg', PerformanceConfigs.smooth),
      opacity: withTiming(1, { duration: 300 }),
    }),
  },
};
