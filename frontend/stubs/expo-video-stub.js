/**
 * expo-video STUB — Butler AI Android SimpleCache crash fix (v2)
 *
 * expo-video registers a VideoModule on Android (media3 SimpleCache). In the
 * OnSpace shared preview container the cache folder is locked by the host APK,
 * causing IllegalStateException inside NativeUnimoduleProxy.getConstants()
 * BEFORE JS runs — "main has not been registered" error.
 *
 * This stub replaces the entire expo-video JS surface with safe no-ops so
 * Metro never bundles any real expo-video code that might trigger the native
 * module initialization path.
 */

'use strict';

const React = require('react');
const { View } = require('react-native');

// Safe no-op VideoView component
const VideoView = React.forwardRef(function VideoView(props, _ref) {
  return React.createElement(View, { style: props.style });
});
VideoView.displayName = 'VideoView';

// Safe no-op player object
const NOOP_PLAYER = {
  play: function() {},
  pause: function() {},
  replace: function() {},
  seekBy: function() {},
  seekTo: function() {},
  generateThumbnailsAsync: function() { return Promise.resolve([]); },
  addListener: function() { return { remove: function() {} }; },
  removeAllListeners: function() {},
  currentTime: 0,
  duration: 0,
  playing: false,
  muted: false,
  volume: 1,
  loop: false,
  playbackRate: 1,
  status: 'idle',
  error: null,
  bufferedPosition: 0,
  currentLiveTimestamp: null,
  currentOffsetFromLive: null,
  targetOffsetFromLive: 5,
  staysActiveInBackground: false,
  allowsExternalPlayback: false,
  showNowPlayingNotification: false,
};

// Safe no-op hook
function useVideoPlayer(_source, _setup) {
  return NOOP_PLAYER;
}

// Named exports for sub-path imports
module.exports = {
  VideoView: VideoView,
  useVideoPlayer: useVideoPlayer,
  VideoPlayer: NOOP_PLAYER,
  VideoSource: {},
  // Re-export common named exports that might be tree-shaken differently
  default: {
    VideoView: VideoView,
    useVideoPlayer: useVideoPlayer,
  },
};

// Support both require() and ES module default import patterns
module.exports.default = module.exports;
