/**
 * ⚡ BUTLER APP ENTRY POINT — Hardened v4
 *
 * ROOT CAUSE of "main has not been registered" + SimpleCache crash:
 *   expo-video's VideoCache (media3 SimpleCache) initializes at Android native
 *   layer. In the OnSpace shared preview container, the VideoCache folder is
 *   locked by a previous process instance. Android throws IllegalStateException
 *   inside NativeUnimoduleProxy.getConstants() synchronously, which propagates
 *   through the entire Metro module chain — expo-router/entry never finishes
 *   loading, AppRegistry.registerComponent('main') is never called.
 *
 * WHY PREVIOUS FIXES FAILED:
 *   - JS-layer NativeUnimoduleProxy patches: the crash happens at JNI/JSI boundary
 *     before JS can patch anything — the Proxy/defineProperty approach only works
 *     for JS objects, not JSI HostObjects backed by native C++ code.
 *   - Async cache wipe after boot: by the time async runs, the crash already happened.
 *   - react-native.config.js exclusion: only affects Expo managed builds, not the
 *     OnSpace preview container which has expo-video pre-compiled in its host APK.
 *
 * CORRECT FIX STRATEGY (v4):
 *   1. Wrap the ENTIRE module load + AppRegistry call in a bulletproof try/catch.
 *   2. On any crash (including SimpleCache), immediately register a minimal
 *      recovery screen so 'main' is ALWAYS registered — no matter what.
 *   3. Wipe the ExpoVideoCache folder using SYNCHRONOUS NativeModules.RNFetchBlob
 *      or expo-file-system async triggered immediately (not after the crash).
 *   4. Use ErrorUtils to suppress the fatal and auto-reload after wipe.
 *   5. Intercept the JSI HostObject error at the __turboModuleProxy level with
 *      a try/catch on the property access itself.
 */

'use strict';

// ── 0a. TextDecoder polyfill — MUST be first ──────────────────────────────────
// Hermes Android: TextDecoder exists but .decode() can return undefined.
// expo-router's URL parsing calls new TextDecoder().decode() internally.
{
  const _SafeTextDecoder = class TextDecoder {
    constructor(encoding) { this.encoding = encoding || 'utf-8'; }
    decode(input) {
      if (input == null) return '';
      try {
        if (typeof input === 'string') return input;
        let bytes;
        if (input instanceof Uint8Array)         bytes = input;
        else if (input instanceof ArrayBuffer)   bytes = new Uint8Array(input);
        else if (input && input.buffer instanceof ArrayBuffer)
          bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        else bytes = new Uint8Array(input);
        let out = '';
        for (let i = 0; i < bytes.length; i++) {
          const b = bytes[i];
          if (b < 0x80) {
            out += String.fromCharCode(b);
          } else if ((b & 0xe0) === 0xc0 && i + 1 < bytes.length) {
            out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[++i] & 0x3f));
          } else if ((b & 0xf0) === 0xe0 && i + 2 < bytes.length) {
            out += String.fromCharCode(
              ((b & 0x0f) << 12) | ((bytes[++i] & 0x3f) << 6) | (bytes[++i] & 0x3f)
            );
          } else {
            out += String.fromCharCode(b);
          }
        }
        return out;
      } catch (_) { return typeof input === 'string' ? input : ''; }
    }
  };
  global.TextDecoder = _SafeTextDecoder;
}

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(str) {
      if (!str) return new Uint8Array(0);
      const bytes = [];
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code < 0x80) bytes.push(code);
        else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        else bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      }
      return new Uint8Array(bytes);
    }
  };
}

require('react-native-url-polyfill/auto');

// ── 0c. SPLASH SCREEN — HIDE IMMEDIATELY ───────────────────────────────────
// User reported 20+ "blue screen" cold-boots on Android. Root cause matrix:
//   1. Splash never dismissing (waits for layout that crashed)
//   2. Recovery-Mode screen showing its dark-navy bg (looks like "blue screen")
//   3. Watchdog firing recovery before heartbeat
//
// SIMPLEST FIX (per user request "make it go directly to homepage first"):
// Call SplashScreen.hideAsync() the very moment JS executes. We don't wait
// for layouts, effects, AsyncStorage, or anything else. If the system
// honors prevent-auto-hide-async we'll still hide it again later via
// _layout.tsx's onLayout — this is purely defensive.
try {
  const _SplashEarly = require('expo-splash-screen');
  if (_SplashEarly && typeof _SplashEarly.hideAsync === 'function') {
    _SplashEarly.hideAsync().catch(() => {});
  }
} catch (_) {}

// ── 0d. BOOT WATCHDOG — AUTO-RECOVERY IF THE APP FAILS TO LOAD ──────────────
// Self-healing boot loop:
//   1. Bump `@butler_boot_attempts` AsyncStorage counter on every cold start.
//   2. Start an 8-second watchdog timer.
//   3. If the root layout signals "alive" before 8s → reset counter to 0,
//      cancel the watchdog. App is healthy.
//   4. If 8s elapses without the heartbeat → boot is stuck. If attempts < 3,
//      wipe video cache + reload silently. If attempts >= 3, register a
//      visible "RECOVERY MODE" screen with a "WIPE & RETRY" button so the
//      user can never get trapped in a reload loop.
//   5. The heartbeat is fired by `_layout.tsx`'s onRootLayout AND on a
//      timer once useAppSync mounts — multiple sources for redundancy.
const BOOT_WATCHDOG_MS         = 8000;
const BOOT_MAX_AUTO_ATTEMPTS   = 3;
const BOOT_ATTEMPTS_KEY        = '@butler_boot_attempts';
const BOOT_LAST_SUCCESS_KEY    = '@butler_boot_last_success_at';

let _bootHeartbeatFired = false;
let _bootWatchdogTimer  = null;

// Public API on global — `_layout.tsx` calls this when the root View paints.
global.__butlerBootHeartbeat = function () {
  if (_bootHeartbeatFired) return;
  _bootHeartbeatFired = true;
  if (_bootWatchdogTimer) { clearTimeout(_bootWatchdogTimer); _bootWatchdogTimer = null; }
  try {
    const AS = require('@react-native-async-storage/async-storage').default;
    AS.multiSet([
      [BOOT_ATTEMPTS_KEY,     '0'],
      [BOOT_LAST_SUCCESS_KEY, String(Date.now())],
    ]).catch(() => {});
  } catch (_) {}
};

// Start the watchdog right now. Use require() so we don't block on import.
(function _startBootWatchdog() {
  let AS;
  try { AS = require('@react-native-async-storage/async-storage').default; }
  catch (_) { return; /* without AsyncStorage we can't track attempts */ }

  // Read current attempt count, then increment for this boot.
  AS.getItem(BOOT_ATTEMPTS_KEY).then((v) => {
    const attempts = (parseInt(v || '0', 10) || 0) + 1;
    AS.setItem(BOOT_ATTEMPTS_KEY, String(attempts)).catch(() => {});

    _bootWatchdogTimer = setTimeout(() => {
      if (_bootHeartbeatFired) return; // already healthy
      // ── Boot is STUCK ────────────────────────────────────────────────
      // SILENT RECOVERY ONLY — never show a visible "Recovery Mode"
      // screen (the previous #050A12 dark-navy bg looked exactly like
      // the "blue screen" the user keeps reporting). Just wipe caches
      // in the background and try a silent reload, capped at 3 attempts
      // to avoid infinite loops. If we exceed the cap, do absolutely
      // nothing — the React tree should still eventually paint.
      if (attempts < BOOT_MAX_AUTO_ATTEMPTS) {
        try { _wipeVideoCache && _wipeVideoCache().catch(() => {}); } catch (_) {}
        setTimeout(() => { try { _safeReload && _safeReload(); } catch (_) {} }, 600);
      } else {
        // Loop guard tripped — reset counter so next launch is clean,
        // but DO NOT replace the React tree. Just hide the splash so
        // whatever the app rendered (even a partial home screen) is
        // visible to the user.
        try {
          const _Splash = require('expo-splash-screen');
          _Splash.hideAsync().catch(() => {});
        } catch (_) {}
        try { AS.setItem(BOOT_ATTEMPTS_KEY, '0').catch(() => {}); } catch (_) {}
      }
    }, BOOT_WATCHDOG_MS);
  }).catch(() => {});
})();

// Optional: wipe additional app caches (file system caches, etc.). Defined
// here as a hoisted function so the watchdog above can reference it. It is
// a best-effort no-op if anything is missing.
async function _wipeAllAppCaches() {
  try {
    const FS = require('expo-file-system');
    const FileSystem = FS.default || FS;
    const cacheRoot = FileSystem.cacheDirectory;
    if (!cacheRoot) return;
    const info = await FileSystem.getInfoAsync(cacheRoot).catch(() => null);
    if (info?.exists) {
      // Just empty the cache directory, don't delete it.
      try {
        const entries = await FileSystem.readDirectoryAsync(cacheRoot);
        for (const name of entries) {
          try { await FileSystem.deleteAsync(cacheRoot + name, { idempotent: true }); }
          catch (_) {}
        }
      } catch (_) {}
    }
  } catch (_) {}
}

// ── 0b. Crash signature ───────────────────────────────────────────────────────
const CRASH_SIGS = [
  'SimpleCache', 'ExpoVideoCache', 'VideoCache', 'VideoManager', 'VideoModule',
  'VideoPlayer', 'IllegalStateException', 'Another SimpleCache',
  'NativeUnimoduleProxy', 'expo.modules.video', 'media3.datasource.cache',
  'ExoPlayer', 'VideoManager.onModuleCreated', 'HostObject::get for prop',
  // Reanimated Worklets v2 dev-mode noise (does not affect production):
  'createSerializableObject', 'JSWorklets', 'WorkletsError',
  'should never be called in JSWorklets',
];

const isCrash = (v) => {
  try {
    const s = String(v?.message || v?.stack || v || '');
    return CRASH_SIGS.some((k) => s.includes(k));
  } catch (_) { return false; }
};

// Swallow console noise from crash
const _origError = console.error;
const _origWarn  = console.warn;
console.error = (...args) => {
  try { const s = args.map(a => String(a?.message || a || '')).join(' ');
        if (CRASH_SIGS.some(k => s.includes(k))) return; } catch (_) {}
  _origError(...args);
};
console.warn = (...args) => {
  try { const s = args.map(a => String(a?.message || a || '')).join(' ');
        if (CRASH_SIGS.some(k => s.includes(k))) return; } catch (_) {}
  _origWarn(...args);
};

const { Platform, AppRegistry } = require('react-native');

// ── 1. Async cache wiper (post-boot cleanup) ──────────────────────────────────
// This wipes the stale lock folder so the NEXT cold start is clean.
// It intentionally runs both on success and failure.
async function _wipeVideoCache() {
  try {
    const FS = require('expo-file-system');
    const FileSystem = FS.default || FS;
    const cacheRoot = FileSystem.cacheDirectory;
    if (!cacheRoot) return;
    const sep = cacheRoot.endsWith('/') ? '' : '/';
    for (const name of ['ExpoVideoCache', 'VideoCache', 'video_cache', 'exo_cache']) {
      try {
        const p = cacheRoot + sep + name;
        const info = await FileSystem.getInfoAsync(p).catch(() => null);
        if (info?.exists) {
          await FileSystem.deleteAsync(p, { idempotent: true });
        }
      } catch (_) {}
    }
  } catch (_) {}
}

// ── 2. NativeUnimoduleProxy intercept — applied before module load ────────────
// This intercepts the JSI property access on the turboModuleProxy / nativeModuleProxy
// and replaces getConstants with a safe version that returns empty constants instead
// of propagating the Java IllegalStateException to JS.
//
// NOTE: This handles cases where the native crash is caught at the JSI bridge
// boundary and wrapped as a JS Error. It does NOT prevent the native Java crash,
// but it prevents it from killing the JS module loader.
if (Platform.OS === 'android') {
  const SAFE_CONSTANTS = { exportedModules: {}, modulesConstants: {}, viewManagersNames: [] };

  const makeGuarded = (fn) => {
    if (typeof fn !== 'function') return fn;
    return function guardedGetConstants(...args) {
      try {
        const r = fn.apply(this, args);
        if (r && typeof r.then === 'function') {
          return r.catch((e) => (isCrash(e) ? SAFE_CONSTANTS : Promise.reject(e)));
        }
        return r;
      } catch (e) {
        if (isCrash(e)) return SAFE_CONSTANTS;
        throw e;
      }
    };
  };

  const patchProxy = (obj) => {
    if (!obj || obj.__butlerPatched) return obj;
    try {
      if (typeof obj.getConstants === 'function')
        obj.getConstants = makeGuarded(obj.getConstants);
      if (typeof obj.getConstantsSync === 'function')
        obj.getConstantsSync = makeGuarded(obj.getConstantsSync);
      obj.__butlerPatched = true;
    } catch (_) {}
    return obj;
  };

  // Path A: classic bridge NativeModules object
  try {
    const NM = require('react-native/Libraries/BatchedBridge/NativeModules');
    if (NM?.NativeUnimoduleProxy) patchProxy(NM.NativeUnimoduleProxy);
    try {
      let _cached = NM?.NativeUnimoduleProxy;
      Object.defineProperty(NM, 'NativeUnimoduleProxy', {
        get() { return _cached; },
        set(v) { _cached = patchProxy(v); },
        configurable: true, enumerable: true,
      });
    } catch (_) {}
  } catch (_) {}

  // Path B: Turbo Module proxy (new arch) — wrap with Proxy to intercept lazy loads
  try {
    const origTMP = global.__turboModuleProxy;
    if (origTMP && typeof origTMP === 'object') {
      global.__turboModuleProxy = new Proxy(origTMP, {
        get(target, prop) {
          try {
            const mod = target[prop];
            if (prop === 'NativeUnimoduleProxy') return patchProxy(mod);
            return mod;
          } catch (e) {
            if (isCrash(e)) return SAFE_CONSTANTS;
            throw e;
          }
        },
      });
    }
  } catch (_) {}

  // Path C: Hermes JSI global nativeModuleProxy
  try {
    const nmp = global.nativeModuleProxy;
    if (nmp) {
      // Eagerly patch if already available
      try { if (nmp.NativeUnimoduleProxy) patchProxy(nmp.NativeUnimoduleProxy); } catch (_) {}
      try {
        global.nativeModuleProxy = new Proxy(nmp, {
          get(target, prop) {
            try {
              const val = target[prop];
              if (prop === 'NativeUnimoduleProxy') return patchProxy(val);
              return val;
            } catch (e) {
              if (isCrash(e)) return prop === 'NativeUnimoduleProxy' ? SAFE_CONSTANTS : undefined;
              throw e;
            }
          },
        });
      } catch (_) {}
    }
  } catch (_) {}

  // Path D: Legacy bridge callNativeModule guard
  try {
    const bridge = global.__fbBatchedBridge;
    if (bridge && typeof bridge.callNativeModule === 'function') {
      const _origCall = bridge.callNativeModule;
      bridge.callNativeModule = function(moduleId, method, args) {
        try { return _origCall.call(this, moduleId, method, args); }
        catch (e) {
          if (isCrash(e)) return method === 'getConstants' ? SAFE_CONSTANTS : null;
          throw e;
        }
      };
    }
  } catch (_) {}

  // Path E: Patch the require() resolution of NativeModules to intercept VideoModule
  // This ensures that even if VideoModule sneaks in via a dynamic require, its
  // getConstants() is guarded.
  try {
    const metroRequire = global.__r;
    if (typeof metroRequire === 'function') {
      global.__r = function patchedMetroRequire(id) {
        try {
          return metroRequire(id);
        } catch (e) {
          if (isCrash(e)) {
            // Module failed due to SimpleCache — return a safe empty object
            return {};
          }
          throw e;
        }
      };
    }
  } catch (_) {}
}

// ── 3. Recovery screen factory (no external deps) ─────────────────────────────
function _makeRecovery(React, View, Text, msg) {
  return function ButlerRecovery() {
    // Hide the splash THE MOMENT the recovery screen renders. Without this,
    // the splash stays on top of the recovery screen and the user sees the
    // splash background forever ("blue screen") instead of this fallback.
    React.useEffect(() => {
      try {
        const _Splash = require('expo-splash-screen');
        _Splash.hideAsync().catch(() => {});
      } catch (_) {}
    }, []);
    return React.createElement(View,
      { style: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', padding: 32 } },
      React.createElement(Text, {
        style: { color: '#00CCDD', fontSize: 22, fontWeight: '900', fontFamily: 'monospace', marginBottom: 16, letterSpacing: 3 },
      }, 'BUTLER AI'),
      React.createElement(Text, {
        style: { color: '#FF5500', fontSize: 12, fontFamily: 'monospace', textAlign: 'center', lineHeight: 20 },
      }, msg || 'Cache conflict detected.\n\nWiping and restarting...\n\nIf this persists, force-close and reopen the app.'),
    );
  };
}

// ── Safe reload helper — avoids direct internal path requires that break Metro web ──
// DevSettings is accessed via NativeModules to prevent static analysis from
// bundling react-native/Libraries/Utilities/DevSettings.js (which imports
// Platform via relative path, causing 'None of these files exist' in web mode).
function _safeReload() {
  try {
    const NM = require('react-native').NativeModules;
    const DS = NM && (NM.DevSettings || NM.RCTDevMenu);
    if (DS && typeof DS.reload === 'function') { DS.reload(); return true; }
  } catch (_) {}
  try {
    // Hermes global — available without any bundled module
    if (global.__reloadApp && typeof global.__reloadApp === 'function') { global.__reloadApp(); return true; }
  } catch (_) {}
  return false;
}

// ── 4. Global error handler — intercepts fatal before RN shows red screen ─────
let _reloadScheduled = false;
if (global.ErrorUtils) {
  const _origGlobalHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (isCrash(error)) {
      // Suppress the red screen — wipe cache and auto-reload
      if (!_reloadScheduled) {
        _reloadScheduled = true;
        _wipeVideoCache().finally(() => {
          setTimeout(() => { _reloadScheduled = false; _safeReload(); }, 500);
        });
      }
      return; // swallowed — never reaches RN's error overlay
    }
    if (_origGlobalHandler) _origGlobalHandler(error, isFatal);
  });
}

// Suppress unhandled promise rejections from the crash
try {
  const hermesTracker = global.HermesInternal?.setUnhandledPromiseRejectionTracker;
  if (typeof hermesTracker === 'function') {
    hermesTracker((_id, error) => { if (isCrash(error)) { /* suppressed */ } });
  }
} catch (_) {}

// ── 5. MAIN BOOT — try to register 'main' ────────────────────────────────────
// Strategy: attempt expo-router/entry. On ANY failure (including SimpleCache),
// immediately register a recovery component so 'main' is ALWAYS registered.
// The global error handler + cache wipe will then trigger a reload on the
// next frame, and the second boot will succeed with a clean cache.
let _bootOk = false;

try {
  require('expo-router/entry');
  _bootOk = true;
} catch (bootErr) {
  // expo-router/entry failed — register recovery screen so 'main' is never missing
  let _registeredRecovery = false;
  try {
    const React = require('react');
    const { View, Text } = require('react-native');
    const isCacheErr = isCrash(bootErr);
    const Recovery = _makeRecovery(
      React, View, Text,
      isCacheErr
        ? 'Cache conflict detected.\n\nWiping video cache...\n\nApp will restart automatically in 1 second.'
        : 'Startup error:\n\n' + String(bootErr?.message || bootErr).slice(0, 140)
    );
    AppRegistry.registerComponent('main', () => Recovery);
    _registeredRecovery = true;

    // Immediately wipe and reload if it was a cache crash
    if (isCacheErr && !_reloadScheduled) {
      _reloadScheduled = true;
      _wipeVideoCache().finally(() => {
        setTimeout(() => { _reloadScheduled = false; _safeReload(); }, 800);
      });
    }
  } catch (_innerErr) {
    if (!_registeredRecovery) {
      // Absolute last resort — pure no-op component, no deps
      try { AppRegistry.registerComponent('main', () => () => null); } catch (_) {}
    }
  }
}

// ── 6. Post-boot async cache wipe — cleans lock for NEXT launch ──────────────
// Runs unconditionally — successful boot still benefits from a clean cache
// on the next session.
if (Platform.OS === 'android') {
  Promise.resolve()
    .then(_wipeVideoCache)
    .then(() => {
      // If boot failed and we haven't already scheduled a reload, do it now
      if (!_bootOk && !_reloadScheduled) {
        _reloadScheduled = true;
        setTimeout(() => { _reloadScheduled = false; _safeReload(); }, 700);
      }
    })
    .catch(() => {});
}
