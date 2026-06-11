module.exports = function (api) {
  api.cache(true);
  const isProd =
    process.env.NODE_ENV === 'production' ||
    process.env.EXPO_PUBLIC_APP_ENV === 'production';
  const plugins = ['react-native-reanimated/plugin'];
  if (isProd) {
    plugins.unshift(['transform-remove-console', { exclude: [] }]);
  }
  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
