// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Android optimization: Reduce module resolution overhead
// Add .mjs support for Supabase web compatibility
config.resolver.sourceExts = ['mjs', 'tsx', 'ts', 'jsx', 'js', 'json'];

// Ensure .mjs files are treated as source files, not assets
config.resolver.assetExts = [
  ...config.resolver.assetExts.filter(ext => ext !== 'mjs'),
  'svg',
];

// Proper module resolution for Supabase packages (web + native)
config.resolver.resolverMainFields = ['react-native', 'browser', 'module', 'main'];

// ── expo-video Android SimpleCache crash fix ──────────────────────────────────
// expo-video is a transitive dependency that auto-links its VideoModule native
// code on Android. VideoCache (a media3 SimpleCache) throws
// IllegalStateException: "Another SimpleCache instance uses the folder" when
// the app is hot-reloaded or the process restarts without clearing native state.
// This crash occurs at Java layer BEFORE JS runs, preventing AppRegistry from
// registering 'main' → causes the "main has not been registered" error.
//
// Since this app never uses expo-video, we redirect all require('expo-video')
// calls to a safe stub so the JS bundle never initialises VideoModule.
//
// We also stub expo-video's internal sub-paths that may be independently required
// by other packages in the dependency graph.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  // Stub expo-video (Android SimpleCache crash fix)
  'expo-video': path.resolve(__dirname, './stubs/expo-video-stub.js'),
  'expo-video/build/VideoView': path.resolve(__dirname, './stubs/expo-video-stub.js'),
  'expo-video/build/VideoPlayer': path.resolve(__dirname, './stubs/expo-video-stub.js'),
  // Stub DevSettings for web bundling — DevSettings.js imports Platform via
  // a relative path that has no .web.js variant, causing Metro web to fail.
  'react-native/Libraries/Utilities/DevSettings': path.resolve(__dirname, './stubs/dev-settings-stub.js'),
};

// ── expo-asset subpath alias (web bundle fix) ────────────────────────────────
// expo-asset@v12+ ships with a strict `exports` map that omits the
// `./build/resolveAssetSource` subpath. react-native's Image internals try to
// import it on web, causing a Metro 500 with:
//   Missing "./build/resolveAssetSource" specifier in "expo-asset" package
// The JS file exists at the path — Metro's strict ESM resolver just refuses
// to expose it. We add a resolveRequest hook to rewrite that specific request.
//
// We also stub expo-image entirely on web (its compiled web code imports
// react-native internals not exposed by react-native-web in SDK 54).
const _origResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Web-only fixes
  if (platform === 'web') {
    if (moduleName === 'expo-image' || moduleName.startsWith('expo-image/')) {
      return {
        filePath: path.resolve(__dirname, './stubs/expo-image-web-stub.js'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'expo-asset/build/resolveAssetSource') {
      return {
        filePath: path.resolve(__dirname, 'node_modules/expo-asset/build/resolveAssetSource.js'),
        type: 'sourceFile',
      };
    }
  } else if (moduleName === 'expo-asset/build/resolveAssetSource') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/expo-asset/build/resolveAssetSource.native.js'),
      type: 'sourceFile',
    };
  }
  if (_origResolveRequest) return _origResolveRequest(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

// ── Butler AI Export: auto-register source stubs ────────────────────────────
// When constants/tabSourcesBundle.ts is imported, it calls registerTabSource()
// with line-array sources. No extra Metro config needed for this approach.
// The sources are embedded as plain string arrays at module level — safe for
// all Android versions, Hermes engine, and Metro bundler.

config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
