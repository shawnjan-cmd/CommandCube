'use strict';
// DevSettings stub — prevents Metro web bundler from pulling in
// react-native/Libraries/Utilities/DevSettings.js which imports
// ../Utilities/Platform without a .web.js variant, causing a bundling error.
module.exports = {
  reload: function() {},
  onFastRefresh: function() {},
  setIsDebuggingRemotely: function() {},
  setProfilingEnabled: function() {},
  setHotLoadingEnabled: function() {},
  addMenuItem: function() {},
  setTimeToPingServer: function() {},
  default: {
    reload: function() {},
    onFastRefresh: function() {},
  },
};
module.exports.default = module.exports;
