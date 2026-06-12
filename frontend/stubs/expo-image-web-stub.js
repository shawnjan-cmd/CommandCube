/**
 * expo-image web stub
 * SDK 54's expo-image imports `react-native/Libraries/Image/resolveAssetSource`
 * which isn't exposed on web. Since this app's web bundle is only used for
 * the in-environment preview (not shipped), we substitute the RN Image.
 */
const { Image: RNImage } = require('react-native');

// Map expo-image's API surface onto RN Image as best we can
const Image = RNImage;

// Stub the named exports expo-image provides
const useImage = () => null;
const ImageBackground = RNImage;
const ImageRef = RNImage;

module.exports = {
  __esModule: true,
  default: Image,
  Image,
  ImageBackground,
  ImageRef,
  useImage,
  // No-ops for the rest of expo-image's API
  ContentFit: { contain: 'contain', cover: 'cover', fill: 'stretch', none: 'center', 'scale-down': 'contain' },
  ContentPosition: { center: 'center' },
  blurhash: '',
  loadAsync: async () => null,
  prefetch: async () => null,
  clearMemoryCache: async () => null,
  clearDiskCache: async () => null,
};
