/**
 * NEXUS HUD ROTATING TIPS — Futuristic cable border animation
 * Informational page-specific tips, 3-second intervals, full sentences
 * (previously TerminatorTips.tsx — renamed to NexusTips.tsx)
 */

import React from 'react';
import {
  View, Text, StyleSheet, Platform, Dimensions,
} from 'react-native';

const { width: SW } = Dimensions.get('window');
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ─── Per-page tips ──────────────────────────────────────────────────────────

export const HOME_TIPS = [
  'Tap SCAN QR to pair with your PC server in under 3 seconds using the on-screen QR code',
  'LAN Auto-Discover scans all 255 hosts on your WiFi network to find your server automatically',
  'Butler AI uses your local Ollama model on your own PC — no cloud and no API key required',
  'Scripts tab lets you run Python automation scripts on your paired PC with a single tap',
  'The Knowledge Base grows automatically from every question you ask Butler AI in chat',
  'All script execution runs inside a sandboxed Python subprocess on your PC only',
  'File Share tab sends any file from your phone directly to your PC Desktop folder over WiFi',
  'qwen2.5-coder:7b is the recommended Ollama model for Python code generation tasks',
  'Health Check pings all 5 server API endpoints and reports individual response latency',
  'Script Only Mode in Settings hides AI tabs to create a focused remote execution interface',
  'Terminal tab streams live shell command output from your PC character by character in real time',
  'Auto-Connect in Settings makes the app link to your last paired server on every launch',
  'Execution history records every script run with its timestamp, result status, and error if any',
  'Butler AI reads your full Knowledge Base context before forming every single response',
  'LAN scan checks ports 8766, 8765, and 5000 across your entire WiFi subnet simultaneously',
  'Phi-DELTA and SIGMA bridge inject Knowledge Base context into every Butler AI response',
  'Reset Device Pairing in Settings instantly clears the server lock and re-opens QR scanner',
  'Cosmetics page lets you apply full color themes to every element in the entire app',
  'Network Map tool in the Tools tab pings all 255 LAN hosts in parallel from your PC',
  'psutil must be installed on your PC for live CPU percentage, RAM usage, and Disk metrics',
  'QR pairing tokens are HMAC-SHA256 hashed — your connection session is fully encrypted',
  'All app data stays entirely on-device and within your LAN — nothing is transmitted externally',
  'Compact Tab Bar in Settings reduces the navigation bar height by 18px on smaller phones',
  'Champion Holo cosmetic is unlocked exclusively by leaving a Play Store review for the app',
  'Task Memory in Tools provides Butler AI with context about your current automation project',
  'Error Logger captures the last 50 JavaScript errors with component name and timestamp',
  'Auto-Fix in Tools runs 8 sequential server repair steps with live animated status indicators',
  'OMEGA LOOP knowledge growth cycle runs automatically in the background every few minutes',
  'File transfers use base64 encoding to ensure all binary file types arrive without corruption',
  'Script execution has a 35-second timeout — use Python threading for longer running tasks',
  'Auto-reconnect engine retries the last server connection every 15 seconds silently',
  'Both devices must be on the same WiFi network for the server connection to work correctly',
  'LAN Auto-Scan shows real-time progress as it pings each host on the subnet in parallel',
  'QR code scanner locks on in under 0.5 seconds when held steady over the PC screen',
  'Default server port is 8766 — this can be changed inside butler_server.py if needed',
];

export const SCRIPTS_TIPS = [
  'Long-press any script card to instantly preview the full Python code without navigating away',
  'Tap the play button on any card to execute that script directly on your paired PC right now',
  'Star any script to pin it permanently to the top of your library above all other scripts',
  'The AI tab generates complete Python scripts from plain English descriptions using local Ollama',
  'CHAIN builder lets you sequence up to 20 scripts and run them all in order with one tap',
  'LAMBDA SCAN tab imports .py files directly from your PC Desktop filesystem into your library',
  'Search box matches against script names, descriptions, and tags across all 70 built-in scripts',
  'AI-generated scripts from Butler are saved permanently to your library for future re-use',
  'Filter chips narrow results to System, Network, Files, Web, Data, GUI, and Monitoring categories',
  'Execution output modal streams output lines from your PC in real time as the script runs',
  'Templates tab has 30 pre-built Python automation recipes ready to customize and use immediately',
  'Edit any saved AI script by tapping the pencil icon that appears on the card',
  'Execution history inside the History modal shows timestamp, duration, and success or fail status',
  'SYNTAX view toggles a Python color-highlighted code display for easier visual reading',
  'Quick-insert chips at the top add common Python import statements to your script with one tap',
  'Auto-Fix suggests the correct pip install command when a Python import fails on execution',
  'All scripts execute in a Python subprocess on your PC — your phone is only the remote control',
  'Script chains insert a 0.2 second pause between steps to ensure clean sequential output',
  'Library tab contains 70 scripts across 9 categories all runnable on your paired PC',
  'Run count badge on each card tracks total executions accumulated across all app sessions',
  'AI-generated scripts are auto-categorized by the Python topic detected in the generated code',
  'Library search results are ranked with exact name matches appearing at the top of results',
  'Pinned scripts are always displayed above all unpinned scripts in every list view',
  'Safety scanner checks every script for 15 threat patterns before allowing execution to proceed',
  'Critical threat level blocks execution entirely — tap OVERRIDE only if you trust the script source',
  'UNDO button in the editor steps back through your last 20 code edits without any confirmation',
  'Copy icon in the preview modal copies the full script text to your clipboard instantly',
  'Library category cards show the script count and a short description of each script domain',
  'All execution output can be selected within the result modal using long-press on Android',
  'Description field in the save dialog helps you remember what each of your saved scripts does',
  'Script timeout is 35 seconds per execution — use Python threading for any long-running jobs',
  'psutil must be installed on your PC for scripts that read CPU, RAM, or Disk usage data',
  'Web Scraper scripts use the requests and BeautifulSoup packages from your PC environment',
  'All scripts self-hosted and executed on your own PC — no cloud computing involved ever',
  'Transfer any file from your phone to your PC Desktop and run it via the Scripts tab immediately',
];

export const TERMINAL_TIPS = [
  'The terminal streams your PC shell output line by line in real time over WiFi',
  'Quick command chips at the top send common shell commands to your PC with one tap',
  'Tap any output line to copy it directly to your phone clipboard instantly',
  'The terminal polls for new output every 500ms so your PC response appears quickly',
  'Press the clear button to wipe the terminal display buffer without stopping your session',
  'Send any Python one-liner directly through the terminal input field to your PC',
  'help command lists all available built-in commands supported by your server version',
  'status command shows server uptime, version number, and connected device information',
  'scan command runs a quick LAN host discovery scan directly from the PC side',
  'battery command reads the battery percentage of your PC using psutil on your PC',
  'storage command shows a full disk usage breakdown for all mounted drives on your PC',
  'net command displays all network interfaces and their IP addresses on your PC',
  'The terminal display buffer stores the last 50 output lines even if you switch tabs',
  'Long shell commands wrap cleanly across multiple lines in the output display box',
  'Type pip install followed by a package name to install it directly from the terminal',
  'All shell commands you send are authenticated with your session HMAC token automatically',
  'The send button on the right submits your typed command to the PC server on tap',
  'Output from print() statements in background scripts appears in the terminal stream',
  'The CLEAR button wipes only the display buffer — your active PC shell session continues',
  'Latency shown in the status bar reflects the round-trip response time to your PC server',
  'Terminal session persists on the PC side even when you switch to a different app tab',
  'All terminal command history is visible in the scrollable output area above the input',
  'Type python followed by -c and a code string to run Python inline from the terminal',
  'Every command sent is rate-limited to prevent flooding your server with rapid requests',
  'Connection status dot at the top shows green when your PC terminal session is active',
  'All standard library Python modules are available without any additional installation',
  'psutil.cpu_percent() returns the current CPU utilization percentage from your PC',
  'psutil.virtual_memory().percent returns current RAM usage from your PC in real time',
  'psutil.disk_usage("/").percent returns disk usage for the root drive on your PC',
  'os.listdir(".") lists all files in the current working directory on your PC',
  'platform.system() returns the operating system name running on your paired PC',
  'socket.gethostname() returns the hostname of your paired PC server machine',
  'socket.gethostbyname(socket.gethostname()) returns the LAN IP of your PC',
  'subprocess.run() lets you execute any shell command from within a Python script',
  'threading.Thread() enables parallel task execution within any script you run',
];

export const BUTLER_TIPS = [
  'Ask Butler to write and immediately execute any Python script on your paired PC',
  'PC STATS command fetches live CPU percentage, RAM usage, and Disk percentage from psutil',
  'Butler uses your local Ollama model for all responses — fully private with no API key needed',
  'Quick command chips at the top of the screen run the most common Butler queries instantly',
  'Butler reads your entire Knowledge Base before generating every response you receive',
  'Copy any AI response with the clipboard icon that appears directly below each message bubble',
  'Python code blocks in Butler responses can be saved directly to your Scripts library',
  'ORG FILES command generates a complete Python file organizer script for your PC Desktop',
  'HEALTH CHK command tests all 5 server API endpoints and shows response time for each one',
  'Web Scrape command generates a working BeautifulSoup scraper for any URL you provide',
  'Butler tracks which script categories you request most often to improve context over time',
  'Clear chat history with the trash icon in the page header to start a fresh conversation',
  'Ollama model is downloaded once and runs permanently on your PC without reinstalling',
  'Ask Butler for cron expressions, scheduling logic, or any time-based Python automation code',
  'Butler can suggest which pip packages to install for any Python task you describe to it',
  'Chat history is stored on your device and persists automatically between every app restart',
  'Ask for pyautogui scripts if you need to automate mouse clicks and keyboard input on your PC',
  'Task Memory from the Tools tab gives Butler full context about your current automation project',
  'FIND SCRIPT command searches through your entire script library by name or by category',
  'Ask for complete working Python scripts rather than just code snippets or partial examples',
  'qwen2.5-coder:7b is the best performing Ollama model for Python and automation code tasks',
  'All conversations are stored entirely on your device — nothing is sent to any external server',
  'Knowledge Base grows more relevant with every question you ask in this chat tab',
  'Butler AI Data Safety disclosure appears on first launch as required by Google Play policy',
  'Response generation speed depends on the size and type of the Ollama model you have pulled',
  'Ask Butler to explain any error output from your last script execution in plain language',
  'Phi-DELTA plus SIGMA bridge enriches every Butler response with your Knowledge Base findings',
  'Butler can generate complete multi-step automation sequences in a single chat response',
  'Ask for Windows-specific or Mac-specific versions of any Python automation script you need',
  'Type EXECUTE followed by your Python code to run it on your PC without saving it first',
  'Ollama default model is qwen2.5-coder:7b — pull alternatives with ollama pull modelname',
  'Butler keeps the last 80 messages of context in memory before older entries are removed',
  'The Phi-NEXUS bridge injects up to 6 local and 4 relay KB findings into each response',
  'Butler offline fallback activates automatically when Ollama or the PC server is unreachable',
  'System prompt includes your PC metrics snapshot and full KB context before every query',
];

export const KNOWLEDGE_TIPS = [
  'SIGMA-NET relay crawls web pages through your paired PC server to bypass mobile restrictions',
  'The Knowledge Base grows automatically from every Butler AI conversation you have in chat',
  'OMEGA LOOP runs a background knowledge accumulation cycle automatically every few minutes',
  'BRAIN DB tab renders a live neural network graph of all your KB domain categories',
  'LAMBDA SCAN imports Python files directly from your PC Desktop into the KB engine',
  'Search the KB findings by topic, domain name, or any specific keyword phrase you need',
  'Manual entry tab lets you paste any text or notes directly into the Knowledge Base',
  'Growth chart shows your KB expansion activity plotted over the last 4 hours of sessions',
  'SIGMA-NET relay requires your PC server to be paired and online to function correctly',
  'KB Organizer Bot deduplicates and clusters semantically similar findings automatically',
  'Quick Targets list has pre-built Python documentation crawl URLs ready to add instantly',
  'System Activity chart tracks your paired PC CPU load percentage over the last hour',
  'Batch crawl mode adds 20 or more Python library documentation pages simultaneously',
  'Confidence score on each finding shows how reliably the KB data was extracted from source',
  'Tap any finding card to expand and read its full list of keywords and example phrases',
  'Export the Knowledge Base as a JSON file from Settings for backup before clearing data',
  'Quantum Link Harvester automatically discovers new Python resource URLs in the background',
  'The KB auto-seeds with 20 Python automation scripts when the app first installs and runs',
  'Growth sparkline shows the number of knowledge growth events per hour over time',
  'Domain and topic tags are automatically assigned to organize findings into clear categories',
  'Butler AI reads all KB context before forming every response in the Butler chat tab',
  'Clear the Knowledge Base from Settings if total storage usage grows too large on your device',
  'Direct crawl works well on simple HTML pages — use SIGMA-NET for complex or protected sites',
  'Phi-DELTA local index enables sub-millisecond Knowledge Base search directly on your device',
  'Coverage gaps section shows which Python domains still need more KB data to be added',
  'KB deduplication removes entries that are semantically equivalent to already stored ones',
  'QLH micro-harvest discovers new Python resource links every few accumulation cycles',
  'Each crawled web page is compressed and keyword-indexed before being stored locally',
  'All Knowledge Base data is stored entirely on your device — nothing is transmitted externally',
  'Manual crawl input accepts any URL that returns readable text or HTML page content',
  'Storage guard automatically prunes the oldest low-confidence entries when KB exceeds 2MB',
  'Rate limiting caps SIGMA-NET at 3 relay requests per minute to protect your PC server',
  'Inverted keyword index enables sub-millisecond search across all stored KB findings',
  'Jaccard similarity hash prevents the same fact or finding from being stored more than once',
  'PSI-RSS feed aggregation pulls from Python community RSS sources silently in background',
];

export const SETTINGS_TIPS_DATA = [
  'Script Only Mode hides AI, Knowledge, and Terminal tabs to simplify the navigation bar',
  'Compact Tab Bar reduces bar height by 18px which helps visibility on smaller screen devices',
  'Disable Haptics stops all vibration feedback which reduces CPU wakeup events on older phones',
  'Auto-Connect makes the app link to your last paired server every time it is opened',
  'Reset Device Pairing is the correct fix for the server locked to another device error',
  'Ollama models are downloaded once and run entirely on your PC with no internet required after',
  'qwen2.5-coder:7b is the recommended Ollama model for Python automation script generation',
  'Python Knowledge Base seeds 20 automation scripts automatically when the app first launches',
  'Phi-NEXUS Bridge enriches every Butler AI response with relevant Knowledge Base findings',
  'OMEGA LOOP automatically grows your knowledge base from every Butler AI conversation',
  'Cache TTL setting controls how long Knowledge Base relay results stay cached on your device',
  'Quantum Link Harvester continuously discovers new Python documentation resource links',
  'Force Omega button triggers a manual knowledge accumulation growth cycle immediately',
  'Export KB as a JSON file before clearing or reinstalling to preserve all your findings',
  'Auto-Upgrade Monitor self-heals app systems silently every 8 minutes in the background',
  'Health scan score of 90 or above means your app system is fully operational',
  'Privacy Policy text can be copied from this page and pasted into your Play Store listing',
  'Bare Minimum Mode disables all particle and glow effects for maximum performance on old devices',
  'Pause Animations stops all looping glow and pulse effects to reduce continuous CPU usage',
  'Keep Screen On prevents the display from sleeping while executing long-running scripts',
  'Nexus Engine port can be changed here if port 8767 is already occupied on your network',
  'Auto-Organize clusters Knowledge Base findings into categories after each growth cycle',
  'Local-Only Mode uses the on-device phi-DELTA index only — faster but with less context',
  'Max Relay Findings controls how many KB results are injected into each Butler AI response',
  'Data Safety Declaration section is required content for submitting to the Google Play Store',
  'Support Development via PayPal donation keeps feature updates coming every 2 days',
  'Save History records each executed script with its name, category, and result status',
  'Notifications show execution results as system-level alerts on Android after each run',
  'All app data is permanently removed from your device when you uninstall the application',
  'Contact the developer by email for feature requests — responses arrive within 8 hours',
  'Reset Phi-NEXUS settings button restores all bridge configuration values to defaults',
  'OMEGA auto-grow triggers a full knowledge accumulation cycle from every Butler conversation',
  'QLH EGT harvest mode discovers Python resource links by traversing linked graph nodes',
  'Bloom filter prevents the QLH harvester from re-visiting any URL within 72 hours',
  'NEXUS Engine at port 8767 on your PC runs continuous 24-hour knowledge accumulation cycles',
];

export const TERMINAL_PAGE_TIPS = TERMINAL_TIPS;

// ─── Static HUD Tips Component ─────────────────────────────────

interface HUDTipsProps {
  tips: string[];
  intervalMs?: number;
  color?: string;
  accentColor?: string;
  compact?: boolean;
}

export default function HUDTips({
  tips,
  color = '#FF2A1F',
  accentColor = '#00FF88',
  compact = false,
}: HUDTipsProps) {
  const tip = tips[0] || '';
  return (
    <View style={[styles.panel, { borderColor: color + '55', marginHorizontal: 8, marginVertical: 5 }]}>
      <View style={styles.contentRow}>
        <View style={[styles.led, { backgroundColor: color, opacity: 0.8 }]} />
        <View style={[styles.divWire, { backgroundColor: color + '50' }]} />
        <Text style={[styles.tipText, { color, fontSize: compact ? 9 : 10, flex: 1 }]} numberOfLines={2}>{tip}</Text>
        <View style={[styles.divWire, { backgroundColor: color + '50' }]} />
        <View style={[styles.accentDot, { backgroundColor: accentColor, opacity: 0.7 }]} />
      </View>
    </View>
  );
}

export function HUDTipsMini({ tips, color = '#FF2A1F' }: { tips: string[]; color?: string }) {
  return (
    <HUDTips tips={tips} color={color} accentColor="#00FF88" compact />
  );
}
// Named exports — new NEXUS names
export const NexusTips = HUDTips;
export const NexusTipsMini = HUDTipsMini;
// Legacy aliases for backward compatibility
export const TerminatorTips = HUDTips;
export const TerminatorTipsMini = HUDTipsMini;

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1.5,
    borderRadius: 0,
    backgroundColor: '#060E16',
    overflow: 'hidden',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 7,
  },
  led: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  divWire: {
    width: 1,
    height: 14,
  },
  tipText: {
    fontFamily: MONO,
    fontWeight: '700',
    letterSpacing: 0.4,
    lineHeight: 14,
  },
  accentDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    flexShrink: 0,
  },
});
