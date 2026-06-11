/**
 * BUTLER AI — ZERO-CREDIT HEADER CONSTANTS
 * Edit text labels, subtitles, button labels, and accent colors here.
 * All values consumed by NexusOriginalHeader in app/(tabs)/_layout.tsx
 */

export interface TabHeaderEntry {
  title: string;
  subtitle: string;
  actionLabel: string;
  actionIcon: string;
  accentColor: string;
}

export const TAB_HEADER_ENTRIES: Record<string, TabHeaderEntry> = {
  home:      { title: 'COMMAND BASE',    subtitle: 'PC Automation · Command Center',      actionLabel: 'QR SCAN',  actionIcon: 'qr-code-scanner', accentColor: '#00FFFF' },
  butler:    { title: 'BUTLER AI',      subtitle: 'Local Ollama · Private · Zero Cloud', actionLabel: 'CLEAR',    actionIcon: 'delete-sweep',    accentColor: '#BF00FF' },
  scripts:   { title: 'SCRIPT LIBRARY', subtitle: 'Python Automation · 70+ Scripts',     actionLabel: 'REFRESH',  actionIcon: 'refresh',         accentColor: '#00FFFF' },
  knowledge: { title: 'KNOWLEDGE BASE', subtitle: 'SIGMA-NET · Live Crawler · KB Graph', actionLabel: 'SYNC',     actionIcon: 'sync',            accentColor: '#F5A623' },
  fileshare: { title: 'TOOLS HUB',      subtitle: 'File Share · Clipboard · Terminal',   actionLabel: 'REFRESH',  actionIcon: 'refresh',         accentColor: '#00FFFF' },
  logs:      { title: 'PC CHECK',       subtitle: 'Health · Cleaning · Automation',      actionLabel: 'REFRESH',  actionIcon: 'refresh',         accentColor: '#00FF88' },
  support:   { title: 'COSMETIC PACKS', subtitle: 'Themes · Skins · Customization',      actionLabel: 'BROWSE',   actionIcon: 'palette',         accentColor: '#FF6EB4' },
  settings:  { title: 'SYSTEM CONFIG',  subtitle: 'App Settings · Preferences',          actionLabel: 'SAVE',     actionIcon: 'settings',        accentColor: '#CC7755' },
  terminal:  { title: 'LIVE TERMINAL',  subtitle: 'butler@terminal:~$',                   actionLabel: 'CLEAR',    actionIcon: 'delete-sweep',    accentColor: '#00FF88' },
  builder:   { title: 'SCRIPT BUILDER', subtitle: 'Visual Node Pipeline · Drag & Build', actionLabel: 'CLEAR',    actionIcon: 'delete-sweep',    accentColor: '#BB33FF' },
};

export const CONN_COLORS = {
  connected:    '#00FF88',
  disconnected: '#FF3366',
};

export const SPLASH_CONFIG = {
  titleLine1:   'BUTLER',
  titleLine2:   'AI',
  tagline:      'PC AUTOMATION · COMMAND CENTER',
  bootText:     'INITIALIZING SYSTEMS...',
  versionBadge: 'v6.0 · ANDROID · LOCAL AI',
  accentColor:  '#1A5FCC',
};
