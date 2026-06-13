/**
 * 🐍 BUTLER SERVER v6.0 — Reference constants
 * Self-hosted Python server. Source code lives on GitHub —
 * users download and run it on their own PC. Nothing about the
 * server is bundled into this mobile app.
 */

export const SERVER_GITHUB_URL  = 'https://github.com/AndroidNewWatchAll/PlaystoreOpenSourcre';
export const SERVER_DOWNLOAD_URL = 'https://github.com/AndroidNewWatchAll/PlaystoreOpenSourcre/raw/d52a25acefbd591e74a4590176e67b0c79ea8eba/AIBUTLERENCRYPTEDSELFHOST%20(24).zip';

export const SERVER_VERSION  = '6.0.0';
export const SERVER_FILENAME = 'butler_server.py';
export const SERVER_FEATURES = [
  'Auto admin elevation (Windows UAC)',
  'Auto dependency install (psutil, qrcode, pillow, requests)',
  'Auto firewall rule (Windows netsh / Mac ufw / Linux iptables)',
  'Adaptive port selection (tries 8766, 8765, 5000, 8000...)',
  'UDP beacon broadcasting (app auto-discovers, no IP needed)',
  'QR code display (terminal + PNG saved to Desktop)',
  'HMAC-SHA256 30-day token auth',
  'Auto-reconnect (re-issues tokens to paired devices)',
  'Ollama AI chat (local LLM, falls back gracefully)',
  'Persistent state (survives restarts)',
  'Windows startup registration (--startup flag)',
  'Process guardian (kill any interfering process)',
  'Requirements scanner (checks all dependencies)',
  'Auto-install missing packages on startup',
  'Kill interference endpoint (/api/kill_interference)',
  'File receive from phone (/api/receive_file)',
  'Process list endpoint (/api/processes)',
] as const;

export const SUPPORTED_PLATFORMS = ['Windows 10/11', 'macOS 12+', 'Ubuntu/Debian Linux'] as const;
export const PYTHON_MIN_VERSION  = '3.10';
export const BEACON_PORT         = 8764;
export const DEFAULT_PORTS       = [8766, 8765, 5000, 8000, 8080] as const;
