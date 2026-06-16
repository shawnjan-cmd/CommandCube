/**
 * Safe Dimensions Shim — global cold-start protection
 * ────────────────────────────────────────────────────────────────────
 *
 * THE PROBLEM
 * On Android cold start, before the React Native bridge has fully
 * initialized, `Dimensions.get('window')` can return `{ width: 0,
 * height: 0 }` (or even `undefined` on rare devices). 20+ files in
 * this codebase read these values at MODULE-LOAD time:
 *
 *     const { width: SW } = Dimensions.get('window');
 *
 * When SW is 0 and any downstream code:
 *   • divides by it → Infinity / NaN
 *   • feeds it into `Animated.interpolate` outputRange → NaN
 *   • multiplies it into an SVG path "d=" → invalid path → crash
 *
 * …the native screen never paints → splash screen stays up forever →
 * the user sees the "blue splash" cold-start crash that has shipped
 * in 20+ EAS builds.
 *
 * THE FIX (this file)
 * One-time monkey-patch of `Dimensions.get` at app boot. If the real
 * call returns zero/undefined for `width` or `height`, we substitute
 * sensible fallback values (414 × 896 — iPhone 14 Pro Max-ish, the
 * most common modern flagship form factor). This guarantees that NO
 * downstream file can ever see a zero dimension, no matter how
 * fragile the cold-start bridge timing is on the user's device.
 *
 * Effect on accurate dimensions
 * NONE. Once the bridge is alive (within milliseconds), `Dimensions.
 * get` returns the real values and the shim passes them through
 * unchanged. The fallback only activates during the tiny pre-bridge
 * window where the values would otherwise be 0.
 *
 * IMPORT FROM `_layout.tsx` AT THE VERY TOP — BEFORE ANY OTHER
 * IMPORT THAT MIGHT EVALUATE A `Dimensions.get` AT MODULE LOAD.
 */
import { Dimensions } from 'react-native';

// Sensible fallback for any device-class — modern phone screen.
const FALLBACK = { width: 414, height: 896, scale: 2, fontScale: 1 };

let _installed = false;

export function installSafeDimensions(): void {
  if (_installed) return;
  _installed = true;

  try {
    const original = Dimensions.get.bind(Dimensions);

    (Dimensions as any).get = function safeGet(dim: 'window' | 'screen') {
      let v: any;
      try {
        v = original(dim);
      } catch {
        v = undefined;
      }
      // Guard against undefined, null, or zero values.
      const width  = v && typeof v.width  === 'number' && v.width  > 0 ? v.width  : FALLBACK.width;
      const height = v && typeof v.height === 'number' && v.height > 0 ? v.height : FALLBACK.height;
      const scale  = v && typeof v.scale  === 'number' && v.scale  > 0 ? v.scale  : FALLBACK.scale;
      const fontScale = v && typeof v.fontScale === 'number' && v.fontScale > 0 ? v.fontScale : FALLBACK.fontScale;
      return { width, height, scale, fontScale };
    };
  } catch {
    // If patching fails for any reason, we just leave the original
    // behaviour intact — better than crashing at install time.
  }
}

// Auto-install on import, exactly once. The export above is kept for
// explicit/testable use, but a side-effect install means we're safe
// even if `_layout.tsx` only does `import './services/safeDimensionsShim';`
installSafeDimensions();
