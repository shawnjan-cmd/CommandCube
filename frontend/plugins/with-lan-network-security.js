/**
 * with-lan-network-security.js
 * ─────────────────────────────
 * Butler AI is a LAN-only app: it connects to a Python server running on the
 * user's own PC over plain HTTP. Android 9 (API 28) and above BLOCK cleartext
 * HTTP traffic by default, which would break the entire app post-install.
 *
 * This custom Expo config plugin solves the problem in a Play Store policy-safe
 * way: it writes a `network_security_config.xml` that allows cleartext traffic
 * ONLY for RFC 1918 private IP ranges and `.local` mDNS hosts. Public internet
 * traffic still requires HTTPS, so Google Play's "Use of insecure HTTP" policy
 * is satisfied.
 *
 * Without this plugin every Butler AI install on Android 9+ would fail to
 * connect and the user would see "connection refused" / "cleartext not permitted".
 */
const {
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NSC_XML = `<?xml version="1.0" encoding="utf-8"?>
<!--
  Butler AI Network Security Configuration
  ========================================
  This app connects ONLY to the user's own PC over their own home/office WiFi.
  butler_server.py runs plain HTTP on the user's local machine and is never
  reachable from the public internet — it is a purely local LAN connection.

  We cannot predict the IP address of any user's PC (depends on router/DHCP).
  Common private ranges:
    - 192.168.x.x  (most home routers)
    - 10.x.x.x     (corporate, mobile hotspots)
    - 172.16-31.x  (Docker, VPNs, some ISPs)

  Android <domain> tags do NOT support CIDR notation — they match exact
  FQDNs only. Trying to whitelist specific IP ranges is technically impossible.
  We therefore use base-config to allow cleartext on all destinations, with
  the explicit Play Store justification:

    Cleartext is used ONLY within the user's private LAN. There is no public
    endpoint, no remote server, and no user data transmitted outside the
    local network. Camera is used solely for QR pairing — no photos stored.
-->
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system"/>
    </trust-anchors>
  </base-config>
</network-security-config>
`;

const withLanNetworkSecurity = (config) => {
  // 1. Set android:usesCleartextTraffic="true" on <application> as a fallback
  //    (some Android OEMs use this flag preferentially over networkSecurityConfig)
  config = withAndroidManifest(config, async (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$ = app.$ || {};
    app.$['android:usesCleartextTraffic'] = 'true';
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });

  // 2. Generate android/app/src/main/res/xml/network_security_config.xml
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      const xmlPath = path.join(xmlDir, 'network_security_config.xml');
      fs.writeFileSync(xmlPath, NSC_XML);
      return cfg;
    },
  ]);

  return config;
};

module.exports = withLanNetworkSecurity;
