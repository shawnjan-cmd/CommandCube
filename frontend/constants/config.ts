/**
 * App Configuration
 * Centralized configuration for Botler app.
 * NO hardcoded IPs — all server addresses come from AsyncStorage (user-entered or QR-paired).
 */

export const config = {
  // PC Server — no defaults, always read from AsyncStorage via serverConnection
  pcServer: {
    ip:   process.env.EXPO_PUBLIC_PC_SERVER_IP   || '',
    port: process.env.EXPO_PUBLIC_PC_SERVER_PORT || '8765',
  },

  // HMAC Security — secret is exchanged during QR pairing, NEVER via env vars.
  // EXPO_PUBLIC_ prefix bakes values into the APK bundle (visible to anyone who
  // decompiles the APK). The server uses its own HMAC_SECRET loaded from a local
  // file; the app derives auth tokens via the /pair handshake, not a shared secret.
  hmacSecret: '', // intentionally empty — NEVER set EXPO_PUBLIC_HMAC_SECRET

  // Ollama — runs on the SAME PC as the server, URL is derived at runtime
  ollama: {
    // Ollama listens on localhost relative to the PC; the mobile app talks to it
    // through the butler_server.py proxy at /api/butler/chat — no direct URL needed here.
    defaultModel: process.env.EXPO_PUBLIC_OLLAMA_MODEL      || 'qwen2.5-coder:7b',
    codeModel:    process.env.EXPO_PUBLIC_OLLAMA_CODE_MODEL || 'qwen2.5-coder:7b',
    temperature:  0.7,
    maxTokens:    2048,
  },

  // App Environment
  appEnv:      process.env.EXPO_PUBLIC_APP_ENV         || 'development',
  enableDebug: process.env.EXPO_PUBLIC_ENABLE_DEBUG === 'true',
};
