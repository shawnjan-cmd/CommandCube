/**
 * Butler AI — Minimal Entry Point (v5.0 — Nuclear Cleanup)
 * ──────────────────────────────────────────────────────────────────────
 * After 20+ blue-screen reports we are removing ALL the defensive boot
 * machinery (watchdog, recovery mode, splash race fixes, cache wipes).
 * Anything that adds code paths adds risk. Keep this file tiny.
 *
 *   1. TextDecoder/TextEncoder polyfills (Hermes Android)
 *   2. URL polyfill (required by expo-router)
 *   3. require('expo-router/entry')
 *
 * Nothing else. The splash screen is configured in app.json with the same
 * pure-black background as the root layout, so it dismisses cleanly when
 * the first React frame paints. No preventAutoHideAsync = no race = no
 * possibility of a stuck splash ("blue screen").
 */

'use strict';

// ── 1. TextDecoder polyfill (Hermes can return undefined from .decode()) ──
{
  const _SafeTextDecoder = class TextDecoder {
    constructor(encoding) { this.encoding = encoding || 'utf-8'; }
    decode(input) {
      if (input == null) return '';
      try {
        if (typeof input === 'string') return input;
        let bytes;
        if (input instanceof Uint8Array)       bytes = input;
        else if (input instanceof ArrayBuffer) bytes = new Uint8Array(input);
        else if (input && input.buffer instanceof ArrayBuffer)
          bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
        else bytes = new Uint8Array(input);
        let out = '';
        for (let i = 0; i < bytes.length; i++) {
          const b = bytes[i];
          if (b < 0x80) out += String.fromCharCode(b);
          else if ((b & 0xe0) === 0xc0 && i + 1 < bytes.length)
            out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[++i] & 0x3f));
          else if ((b & 0xf0) === 0xe0 && i + 2 < bytes.length)
            out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[++i] & 0x3f) << 6) | (bytes[++i] & 0x3f));
          else out += String.fromCharCode(b);
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

// ── 2. URL polyfill (expo-router internals) ──────────────────────────────
require('react-native-url-polyfill/auto');

// ── 3. Hand control to expo-router. That's it. ───────────────────────────
require('expo-router/entry');
