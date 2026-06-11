/**
 * react-native.config.js — Native auto-link exclusions
 *
 * expo-video registers VideoModule (VideoCache / media3 SimpleCache) at Android
 * native init time. When the app hot-reloads or the process restarts without
 * releasing the native cache lock, Android throws:
 *
 *   IllegalStateException: Another SimpleCache instance uses the folder
 *
 * This crash occurs inside NativeUnimoduleProxy.getConstants() BEFORE any JS
 * runs, so JS-layer patches cannot intercept it.
 *
 * Since this app never uses video playback, we exclude expo-video from React
 * Native auto-linking entirely so Gradle never compiles or registers the
 * VideoModule native code.
 *
 * Metro-layer: metro.config.js already redirects require('expo-video') to
 * stubs/expo-video-stub.js (JS no-ops).
 * Native-layer: THIS FILE prevents the Gradle module from being linked.
 */
module.exports = {
  dependencies: {
    'expo-video': {
      platforms: {
        android: null, // Exclude from Android auto-linking — prevents SimpleCache crash
        ios: null,     // Exclude from iOS auto-linking as well (unused)
      },
    },
    // expo-av is kept — used for audio playback throughout the app
  },
};
