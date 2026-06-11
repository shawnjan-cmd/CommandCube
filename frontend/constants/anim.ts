/**
 * ⚡ GLOBAL ANIMATION HELPERS — constants/anim.ts
 *
 * RULES:
 *  - safeAnim*  → ALWAYS useNativeDriver: false  (colors, width, height, top, left, borderColor, backgroundColor, shadowOpacity)
 *  - nativeAnim* → ALWAYS useNativeDriver: true   (transform, opacity ONLY)
 *  - autoAnim*  → auto-detects based on property hint
 *
 * WHY: Hermes Android throws a hard crash when the same Animated.Value
 *      is driven by both native and JS drivers at any point in its lifetime.
 *      These wrappers eliminate that class of bug entirely.
 *
 * USAGE:
 *   import { safeAnimTiming, safeAnimLoop, nativeAnimSpring, makeAnim } from '@/constants/anim';
 *
 *   // Simple safe timing (JS driver, for colors/sizes/layout)
 *   safeAnimTiming(myValue, { toValue: 1, duration: 300 }).start();
 *
 *   // Native timing (transform/opacity only)
 *   nativeAnimTiming(myOpacity, { toValue: 1, duration: 300 }).start();
 *
 *   // Auto-looping glow (JS)
 *   safeAnimLoop(glowAnim, 0.3, 1, 1000).start();
 *
 *   // Auto-looping float (native)
 *   nativeAnimLoop(floatY, -8, 0, 2000).start();
 *
 *   // One-shot value factory
 *   const { value, start, stop, reset } = makeAnim(0);
 *
 *   // Convenience: animated border/color pulse
 *   const pulse = useGlowLoop(500);   // returns Animated.Value, starts automatically
 */

import { Animated, Easing } from 'react-native';

// ─────────────────────────────────────────────────────────────────
// JS-DRIVER WRAPPERS  (colors, layout, borderColor, shadowOpacity…)
// ─────────────────────────────────────────────────────────────────

/** Safe timing — always JS driver. Use for borderColor, backgroundColor, width, height, top, left, shadowOpacity, etc. */
export function safeAnimTiming(
  value: Animated.Value,
  config: Omit<Animated.TimingAnimationConfig, 'useNativeDriver'>
): Animated.CompositeAnimation {
  return Animated.timing(value, { ...config, useNativeDriver: false });
}

/** Safe spring — always JS driver. */
export function safeAnimSpring(
  value: Animated.Value,
  config: Omit<Animated.SpringAnimationConfig, 'useNativeDriver'>
): Animated.CompositeAnimation {
  return Animated.spring(value, { ...config, useNativeDriver: false });
}

/** Safe loop between two values. Returns a startable CompositeAnimation. */
export function safeAnimLoop(
  value: Animated.Value,
  min: number,
  max: number,
  duration: number,
  easing?: (t: number) => number
): Animated.CompositeAnimation {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, { toValue: max, duration, useNativeDriver: false, easing }),
      Animated.timing(value, { toValue: min, duration, useNativeDriver: false, easing }),
    ])
  );
}

/** Safe staggered glow loop with custom peak & valley (JS driver). */
export function safeGlowLoop(
  value: Animated.Value,
  options: { peak?: number; valley?: number; period?: number; delay?: number } = {}
): Animated.CompositeAnimation {
  const { peak = 1, valley = 0.3, period = 1200, delay = 0 } = options;
  const half = period / 2;
  return Animated.loop(
    Animated.sequence([
      ...(delay > 0 ? [Animated.delay(delay)] : []),
      Animated.timing(value, { toValue: peak,   duration: half, useNativeDriver: false }),
      Animated.timing(value, { toValue: valley, duration: half, useNativeDriver: false }),
    ])
  );
}

/** Safe scan / sweep: value goes from 0→1 repeatedly (JS). Good for top/left/width sweeps. */
export function safeScanLoop(
  value: Animated.Value,
  duration: number
): Animated.CompositeAnimation {
  return Animated.loop(Animated.timing(value, { toValue: 1, duration, useNativeDriver: false }));
}

// ─────────────────────────────────────────────────────────────────
// NATIVE-DRIVER WRAPPERS  (transform, opacity ONLY)
// ─────────────────────────────────────────────────────────────────

/** Native timing — always native driver. Use ONLY for transform and opacity. */
export function nativeAnimTiming(
  value: Animated.Value,
  config: Omit<Animated.TimingAnimationConfig, 'useNativeDriver'>
): Animated.CompositeAnimation {
  return Animated.timing(value, { ...config, useNativeDriver: true });
}

/** Native spring — always native driver. Use ONLY for transform/opacity. */
export function nativeAnimSpring(
  value: Animated.Value,
  config: Omit<Animated.SpringAnimationConfig, 'useNativeDriver'>
): Animated.CompositeAnimation {
  return Animated.spring(value, { ...config, useNativeDriver: true });
}

/** Native float loop (translateY up/down). Perfect for hovering effects. */
export function nativeAnimLoop(
  value: Animated.Value,
  min: number,
  max: number,
  duration: number
): Animated.CompositeAnimation {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, { toValue: min, duration, useNativeDriver: true }),
      Animated.timing(value, { toValue: max, duration, useNativeDriver: true }),
    ])
  );
}

/** Native opacity blink/pulse loop. */
export function nativeOpacityLoop(
  value: Animated.Value,
  peak: number,
  valley: number,
  period: number
): Animated.CompositeAnimation {
  const half = period / 2;
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, { toValue: peak,   duration: half, useNativeDriver: true }),
      Animated.timing(value, { toValue: valley, duration: half, useNativeDriver: true }),
    ])
  );
}

/** Native spin loop — drives rotation from 0→1 (use .interpolate for deg). */
export function nativeSpinLoop(value: Animated.Value, duration = 1200): Animated.CompositeAnimation {
  return Animated.loop(Animated.timing(value, { toValue: 1, duration, useNativeDriver: true }));
}

// ─────────────────────────────────────────────────────────────────
// COMBINATION HELPERS
// ─────────────────────────────────────────────────────────────────

/** Flicker sequence (rapid opacity dip) — native. Great for CRT/glitch effects. */
export function nativeFlickerSequence(value: Animated.Value, options: {
  dipValue?: number;
  dipDuration?: number;
  recoveryDuration?: number;
  extraDip?: boolean;
} = {}): Animated.CompositeAnimation {
  const { dipValue = 0.15, dipDuration = 45, recoveryDuration = 65, extraDip = true } = options;
  const steps: Animated.CompositeAnimation[] = [
    Animated.timing(value, { toValue: dipValue, duration: dipDuration,       useNativeDriver: true }),
    Animated.timing(value, { toValue: 1,        duration: recoveryDuration,  useNativeDriver: true }),
  ];
  if (extraDip) {
    steps.push(Animated.delay(50));
    steps.push(Animated.timing(value, { toValue: dipValue * 1.5, duration: dipDuration - 10, useNativeDriver: true }));
    steps.push(Animated.timing(value, { toValue: 1,              duration: recoveryDuration + 10, useNativeDriver: true }));
  }
  return Animated.sequence(steps);
}

/** Glitch X shake — native (translateX). Fires once and settles. */
export function nativeGlitchShake(value: Animated.Value, intensity = 5): Animated.CompositeAnimation {
  return Animated.sequence([
    Animated.timing(value, { toValue: -intensity,     duration: 28, useNativeDriver: true }),
    Animated.timing(value, { toValue:  intensity * 1.2, duration: 22, useNativeDriver: true }),
    Animated.timing(value, { toValue: -intensity * 0.4, duration: 18, useNativeDriver: true }),
    Animated.timing(value, { toValue:  0,              duration: 90, useNativeDriver: true }),
  ]);
}

/** Press scale micro-interaction — native. Call on press start. */
export function nativePressScale(
  value: Animated.Value,
  pressedScale = 0.95,
  releasedScale = 1
): { pressIn: Animated.CompositeAnimation; pressOut: Animated.CompositeAnimation } {
  return {
    pressIn:  Animated.timing(value, { toValue: pressedScale,  duration: 70,  useNativeDriver: true }),
    pressOut: Animated.timing(value, { toValue: releasedScale, duration: 110, useNativeDriver: true }),
  };
}

/** Ripple burst — scales up and fades out. Native. Returns an array of start-ready animations. */
export function nativeRippleBurst(
  scales: Animated.Value[],
  opacities: Animated.Value[],
  maxScale = 2.5,
  duration = 600,
  stagger = 120
): Animated.CompositeAnimation[] {
  return scales.map((scale, i) =>
    Animated.sequence([
      Animated.delay(i * stagger),
      Animated.parallel([
        Animated.timing(scale,       { toValue: maxScale, duration, useNativeDriver: true }),
        Animated.timing(opacities[i],{ toValue: 0,        duration, useNativeDriver: true }),
      ]),
    ])
  );
}

/** Data packet float-up animation. Native. */
export function nativePacketFloat(
  yValues: Animated.Value[],
  opacities: Animated.Value[],
  distance = 30,
  duration = 600,
  stagger = 100
): Animated.CompositeAnimation[] {
  return yValues.map((y, i) =>
    Animated.sequence([
      Animated.delay(i * stagger),
      Animated.parallel([
        Animated.timing(y,          { toValue: -distance, duration, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacities[i], { toValue: 1,  duration: duration * 0.25, useNativeDriver: true }),
          Animated.timing(opacities[i], { toValue: 0,  duration: duration * 0.75, useNativeDriver: true }),
        ]),
      ]),
    ])
  );
}

// ─────────────────────────────────────────────────────────────────
// FACTORY  — makeAnim
// ─────────────────────────────────────────────────────────────────

export interface AnimController {
  value: Animated.Value;
  start: (config?: Omit<Animated.TimingAnimationConfig, 'useNativeDriver'>) => void;
  stop:  () => void;
  reset: (toValue?: number) => void;
  loop:  (min: number, max: number, duration: number, native?: boolean) => void;
}

/**
 * Factory that bundles an Animated.Value with control methods.
 * @param initial  Starting value
 * @example
 *   const glow = makeAnim(0.4);
 *   glow.loop(0.3, 1, 1200, false);   // JS-driver glow loop
 *   // use glow.value in JSX
 */
export function makeAnim(initial: number): AnimController {
  const value = new Animated.Value(initial);
  let currentAnim: Animated.CompositeAnimation | null = null;

  return {
    value,
    start(config = { toValue: 1, duration: 300 }) {
      currentAnim?.stop();
      currentAnim = Animated.timing(value, { ...config, useNativeDriver: false });
      currentAnim.start();
    },
    stop() { currentAnim?.stop(); },
    reset(toValue = initial) { currentAnim?.stop(); value.setValue(toValue); },
    loop(min, max, duration, native = false) {
      currentAnim?.stop();
      currentAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: max, duration, useNativeDriver: native }),
          Animated.timing(value, { toValue: min, duration, useNativeDriver: native }),
        ])
      );
      currentAnim.start();
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// COMMON EASING PRESETS
// ─────────────────────────────────────────────────────────────────
export const EaseCyber = {
  in:      Easing.in(Easing.quad),
  out:     Easing.out(Easing.cubic),
  inOut:   Easing.inOut(Easing.quad),
  snap:    Easing.elastic(1.2),
  bounce:  Easing.bounce,
  linear:  Easing.linear,
  sharp:   Easing.bezier(0.4, 0, 0.6, 1),
  standard:Easing.bezier(0.4, 0, 0.2, 1),
};

// ─────────────────────────────────────────────────────────────────
// DURATION PRESETS
// ─────────────────────────────────────────────────────────────────
export const Dur = {
  instant:    80,
  fast:      150,
  normal:    300,
  slow:      600,
  verySlow:  900,
  scanSpeed: 2200,
  floatSpeed:1900,
  glowPulse: 1200,
} as const;

// ─────────────────────────────────────────────────────────────────
// INTERPOLATION SHORTCUTS
// ─────────────────────────────────────────────────────────────────

/**
 * Quick interpolate helper — saves typing Animated.Value.interpolate.
 * @example
 *   const deg = interp(spinAnim, [0,1], ['0deg','360deg']);
 */
export function interp(
  value: Animated.Value,
  inputRange: number[],
  outputRange: (string | number)[]
): Animated.AnimatedInterpolation<string | number> {
  return value.interpolate({ inputRange, outputRange, extrapolate: 'clamp' });
}

/** Opacity interpolation between two alpha values (0-1). */
export function interpOpacity(
  value: Animated.Value,
  fromAlpha: number,
  toAlpha: number
): Animated.AnimatedInterpolation<string | number> {
  return value.interpolate({ inputRange: [0, 1], outputRange: [fromAlpha, toAlpha], extrapolate: 'clamp' });
}

/** Color interpolation helper (JS driver only). */
export function interpColor(
  value: Animated.Value,
  fromColor: string,
  toColor: string,
  inputRange: number[] = [0, 1]
): Animated.AnimatedInterpolation<string | number> {
  return value.interpolate({ inputRange, outputRange: [fromColor, toColor], extrapolate: 'clamp' });
}

/** Translate Y interpolation. */
export function interpTranslateY(
  value: Animated.Value,
  from: number,
  to: number
): Animated.AnimatedInterpolation<string | number> {
  return value.interpolate({ inputRange: [0, 1], outputRange: [from, to], extrapolate: 'clamp' });
}

/** Scale interpolation between min and max scale values. */
export function interpScale(
  value: Animated.Value,
  fromScale: number,
  toScale: number
): Animated.AnimatedInterpolation<string | number> {
  return value.interpolate({ inputRange: [0, 1], outputRange: [fromScale, toScale], extrapolate: 'clamp' });
}

/** Rotation in degrees, 0→360. */
export function interpRotateDeg(
  value: Animated.Value,
  fromDeg = 0,
  toDeg = 360
): Animated.AnimatedInterpolation<string | number> {
  return value.interpolate({ inputRange: [0, 1], outputRange: [`${fromDeg}deg`, `${toDeg}deg`], extrapolate: 'clamp' });
}
