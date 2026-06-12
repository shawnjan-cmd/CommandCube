/**
 * NEXUS SCRIPT SAFETY GUARD v3.0
 * Client-side Python static analysis — runs BEFORE sending to server.
 * No AI credits used. Pure pattern matching + AST-inspired heuristics.
 *
 * DETECTED THREATS:
 *  • Credential theft / Browser data theft / Hardcoded secrets
 *  • Data exfiltration (requests.post to external URLs, webhooks)
 *  • Crypto-mining patterns
 *  • Ransomware signatures
 *  • Obfuscation (base64 exec, hex decode + exec)
 *  • Destructive ops (rmdir root, format disk)
 *  • Keylogger imports, Screenshot capture
 *  • Reverse shell patterns, Process injection, Fileless malware
 *  • Privilege escalation, Boot persistence, AV evasion
 *  • Environment tampering, SQL injection builders
 *  • Timing attack evasion, Fork bombs
 */

export type ThreatLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export interface ThreatFinding {
  rule: string;
  level: ThreatLevel;
  line: number;
  excerpt: string;
  description: string;
  fix?: string;
}

export interface SafetyReport {
  safe: boolean;
  level: ThreatLevel;
  findings: ThreatFinding[];
  linesChecked: number;
  executionBlocked: boolean;
  summary: string;
}

interface Rule {
  id: string;
  level: ThreatLevel;
  description: string;
  fix?: string;
  patterns: RegExp[];
  safeContexts?: RegExp[];
}

const RULES: Rule[] = [
  // ── CRITICAL THREATS ─────────────────────────────────────────
  {
    id: 'OBFUSCATED_EXEC',
    level: 'critical',
    description: 'Obfuscated code execution — classic malware hiding technique',
    fix: 'Do not execute code that decodes and runs base64/hex strings dynamically.',
    patterns: [
      /exec\s*\(\s*base64\.b64decode/i,
      /eval\s*\(\s*base64\.b64decode/i,
      /exec\s*\(\s*bytes\.fromhex/i,
      /eval\s*\(\s*bytes\.fromhex/i,
      /exec\s*\(\s*codecs\.decode/i,
      /__import__\s*\(\s*['"]builtins['"]\s*\)\s*\.eval/i,
    ],
  },
  {
    id: 'REVERSE_SHELL',
    level: 'critical',
    description: 'Reverse shell pattern — opens backdoor to attacker machine',
    fix: 'This script connects a socket to a remote server and pipes commands through it.',
    patterns: [
      /socket\.connect.*subprocess/s,
      /subprocess\.Popen.*socket/s,
      /bash\s+-i\s+>&\s+\/dev\/tcp/i,
      /nc\s+-e\s+\/bin\/bash/i,
    ],
  },
  {
    id: 'RANSOMWARE_SIGNATURE',
    level: 'critical',
    description: 'Ransomware-like pattern — encrypts files and deletes originals',
    fix: 'Mass file encryption combined with deletion is classic ransomware behaviour.',
    patterns: [
      /Fernet|AES.*encrypt.*os\.remove/si,
      /cryptography.*encrypt.*\.rename.*\.(locked|enc|crypt)/si,
    ],
  },
  {
    id: 'DISK_DESTRUCTION',
    level: 'critical',
    description: 'Disk destruction command detected',
    fix: 'Remove format/wipe commands. These permanently destroy data.',
    patterns: [
      /format\s+[a-z]:\s*\/Q\s*\/Y/i,
      /dd\s+if=\/dev\/zero\s+of=\/dev\//i,
      /shutil\.rmtree\s*\(\s*['"]\/['"]\s*\)/,
      /rmdir\s+\/S\s+\/Q\s+[Cc]:\\/i,
      /mkfs\.\w+\s+\/dev\/(sd|hd|nvme)/i,
    ],
  },
  {
    id: 'FILELESS_MALWARE',
    level: 'critical',
    description: 'Fileless execution — runs code entirely in memory without touching disk',
    fix: 'Loading PE files from memory is a fileless malware technique.',
    patterns: [
      /ctypes\.memmove.*VirtualAlloc.*cast.*CFUNCTYPE/si,
      /mmap.*PROT_EXEC/i,
    ],
  },
  // ── HIGH THREATS ─────────────────────────────────────────────
  {
    id: 'CRYPTO_MINER',
    level: 'high',
    description: 'Cryptocurrency miner signature detected',
    patterns: [
      /stratum\+tcp/i,
      /xmrig|cryptonight|minergate|nicehash/i,
      /miner\.start|start_mining/i,
    ],
  },
  {
    id: 'KEYLOGGER',
    level: 'high',
    description: 'Keylogger — records keystrokes without consent',
    fix: 'pynput/keyboard hooks capture all keystrokes silently.',
    patterns: [
      /from\s+pynput\s+import.*keyboard.*Listener/i,
      /keyboard\.on_press\s*\(/i,
      /pyHook.*HookManager.*KeyDown/i,
      /GetAsyncKeyState|SetWindowsHookEx/i,
    ],
  },
  {
    id: 'CREDENTIAL_THEFT',
    level: 'high',
    description: 'Credential/secret harvesting from environment or password managers',
    patterns: [
      /os\.environ.*(?:PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY)/i,
      /keyring\.get_password/i,
      /win32crypt\.CryptUnprotectData/i,
      /\.aws\/credentials/i,
      /\.ssh\/id_rsa/i,
    ],
  },
  {
    id: 'BROWSER_DATA_THEFT',
    level: 'high',
    description: 'Reads browser saved passwords or cookies database',
    fix: 'Accessing browser login data is a credential-theft technique.',
    patterns: [
      /Chrome.*Login\s*Data|Cookies.*sqlite/i,
      /AppData.*Chrome.*User\s*Data.*Default/i,
      /Firefox.*logins\.json/i,
    ],
  },
  {
    id: 'DATA_EXFILTRATION',
    level: 'high',
    description: 'Possible data exfiltration — sends data to external server',
    fix: 'Ensure target URL is your own server, not a 3rd party.',
    patterns: [
      /requests\.post\s*\(\s*['"]https?:\/\/(?!192\.168|10\.|172\.(1[6-9]|2\d|3[01])\.)/i,
      /webhook\.site|discord\.com\/api\/webhooks|t\.me\//i,
      /pastebin\.com.*post|hastebin\.com/i,
    ],
    safeContexts: [/# safe_exfil_ok/i],
  },
  {
    id: 'PRIVILEGE_ESCALATION',
    level: 'high',
    description: 'Writes to protected registry keys or attempts UAC bypass',
    patterns: [
      /winreg.*HKEY_LOCAL_MACHINE.*SetValueEx/i,
      /bypassUAC|fodhelper|eventvwr/i,
      /runas\s+\/user:Administrator/i,
    ],
  },
  {
    id: 'PROCESS_INJECTION',
    level: 'high',
    description: 'Process injection or DLL injection pattern detected',
    fix: 'Injecting code into other processes is a common malware technique.',
    patterns: [
      /ctypes\.windll\.kernel32\.VirtualAllocEx/i,
      /WriteProcessMemory.*CreateRemoteThread/si,
      /NtCreateThreadEx|RtlCreateUserThread/i,
    ],
  },
  {
    id: 'ANTIVIRUS_EVASION',
    level: 'high',
    description: 'Attempts to disable security software or Windows Defender',
    patterns: [
      /Set-MpPreference.*-DisableRealtimeMonitoring/i,
      /net\s+stop.*windefend|sc\s+stop.*mssec/i,
      /taskkill.*avp\.exe|taskkill.*MsMpEng/i,
    ],
  },
  {
    id: 'BOOT_PERSISTENCE',
    level: 'high',
    description: 'Modifies boot sector or MBR for persistence',
    fix: 'Writing to boot sectors is a rootkit technique for extreme persistence.',
    patterns: [
      /open.*\/dev\/sda.*wb.*MBR/si,
      /bcdedit.*\/set.*bootstatuspolicy/i,
    ],
  },
  // ── MEDIUM THREATS ───────────────────────────────────────────
  {
    id: 'CLIPBOARD_THEFT',
    level: 'medium',
    description: 'Reads clipboard — may capture passwords or sensitive text',
    patterns: [
      /pyperclip\.paste\(\)/i,
      /win32clipboard.*GetClipboardData/i,
    ],
  },
  {
    id: 'SUSPICIOUS_DOWNLOAD',
    level: 'medium',
    description: 'Downloads and executes external binary or script',
    fix: 'Only download from trusted sources. Do not run downloaded executables.',
    patterns: [
      /urllib\.request\.urlretrieve.*\.(exe|bat|ps1|sh|cmd)/i,
      /subprocess.*curl.*-fsSL.*|sh/i,
    ],
  },
  {
    id: 'FORK_BOMB',
    level: 'medium',
    description: 'Fork bomb pattern — crashes system by exhausting processes',
    patterns: [
      /while\s+True\s*:.*subprocess/s,
      /os\.fork\(\).*os\.fork\(\)/s,
    ],
  },
  {
    id: 'SYSTEM_STARTUP_PERSISTENCE',
    level: 'medium',
    description: 'Writes to startup folder or registry run key for persistence',
    patterns: [
      /\\AppData\\Roaming\\Microsoft\\Windows\\Start\s*Menu\\Programs\\Startup/i,
      /HKEY_CURRENT_USER.*Run.*SetValueEx/i,
      /crontab\s+-e\s*\|.*echo.*@reboot/i,
    ],
  },
  {
    id: 'SCREENSHOT_CAPTURE',
    level: 'medium',
    description: 'Silent screenshot capture — may be used for surveillance',
    fix: 'Ensure user is aware of screenshot functionality.',
    patterns: [
      /ImageGrab\.grab\(\)|mss\(\)\.shot/i,
      /pyautogui\.screenshot\(\)/i,
    ],
  },
  {
    id: 'HARDCODED_SECRETS',
    level: 'medium',
    description: 'Hardcoded credentials or API keys detected in script',
    fix: 'Use environment variables or a secrets manager instead of hardcoding credentials.',
    patterns: [
      /password\s*=\s*['"][^'"]{6,}['"]/i,
      /api_key\s*=\s*['"][A-Za-z0-9_\-]{16,}['"]/i,
      /token\s*=\s*['"](?:ghp_|sk-|xox[baprs]-)[A-Za-z0-9]+['"]/i,
    ],
  },
  {
    id: 'ENVIRONMENT_TAMPERING',
    level: 'medium',
    description: 'Modifies critical system environment variables or PATH',
    fix: 'Modifying PATH or LD_PRELOAD can redirect system commands to malicious binaries.',
    patterns: [
      /LD_PRELOAD|LD_LIBRARY_PATH.*=.*\/tmp/i,
      /DYLD_INSERT_LIBRARIES/i,
    ],
  },
  {
    id: 'SQL_INJECTION_BUILDER',
    level: 'medium',
    description: 'Builds SQL queries using string concatenation — injection risk',
    fix: 'Use parameterized queries (cursor.execute(query, params)) instead.',
    patterns: [
      /cursor\.execute\s*\(\s*f['""].*\bWHERE\b/i,
      /execute\s*\(\s*['""].*SELECT.*\+.*input/i,
    ],
  },
  // ── LOW ──────────────────────────────────────────────────────
  {
    id: 'LARGE_FILE_DELETION',
    level: 'low',
    description: 'Mass file deletion without confirmation',
    fix: 'Add a dry-run mode or confirmation prompt before mass deletion.',
    patterns: [
      /for.*in.*glob\.glob\(.*\)\s*:\s*os\.remove/s,
      /for.*in.*Path\.rglob\(.*\)\s*:\s*f\.unlink/s,
    ],
  },
  {
    id: 'NETWORK_SCAN',
    level: 'low',
    description: 'Network port scan — may trigger firewall alerts',
    patterns: [
      /concurrent\.futures.*socket\.connect.*range\(1,\s*65536\)/s,
    ],
  },
  {
    id: 'TIMING_EVASION',
    level: 'low',
    description: 'Very long sleep() may indicate sandbox evasion technique',
    fix: 'Long sleeps are sometimes used to evade sandboxes with time limits.',
    patterns: [
      /time\.sleep\s*\(\s*(?:[6-9]\d{2,}|\d{4,})\s*\)/i,
    ],
  },
];

// ─── Strip Python comments before scanning ───────────────────────
// Prevents false positives where a comment contains a threat pattern
// as an example or explanation (e.g. "# don't use exec(base64...)").
function stripPythonComments(code: string): string {
  return code
    .split('\n')
    .map(line => {
      const ci = line.indexOf('#');
      if (ci < 0) return line;
      const before = line.slice(0, ci);
      const quoteCount = (before.match(/["']/g) || []).length;
      return quoteCount % 2 === 0 ? line.slice(0, ci) : line;
    })
    .join('\n');
}

// ─── Cross-line combo detector ────────────────────────────────────
function checkCrossLinePatterns(code: string, findings: ThreatFinding[]): void {
  const lower = code.toLowerCase();
  if (lower.includes('socket.connect') && lower.includes('subprocess.popen')) {
    findings.push({ rule: 'REVERSE_SHELL_SPLIT', level: 'critical', line: 0, excerpt: 'socket.connect + subprocess.Popen (multi-line)', description: 'Reverse shell pattern split across lines', fix: 'These two together create a reverse shell regardless of line placement.' });
  }
  if (/iex.*downloadstring|invoke-expression.*wget|invoke-webrequest.*iex/i.test(code)) {
    findings.push({ rule: 'POWERSHELL_DOWNLOAD_EXEC', level: 'critical', line: 0, excerpt: 'IEX + DownloadString', description: 'PowerShell remote code download and execute pattern', fix: 'Do not download and execute code in a single command.' });
  }
  if (/__import__.*\.system\(/i.test(code)) {
    findings.push({ rule: 'DYNAMIC_IMPORT_EXEC', level: 'high', line: 0, excerpt: '__import__(...).system(', description: 'Dynamic import used to call system commands — obfuscation technique' });
  }
  if (/marshal\.loads\s*\(/i.test(code)) {
    findings.push({ rule: 'MARSHAL_DESERIALIZATION', level: 'critical', line: 0, excerpt: 'marshal.loads(', description: 'marshal.loads() can execute arbitrary code', fix: 'Never deserialize untrusted data with marshal.' });
  }
  if (/ctypes\.cdll\s*\(/i.test(code)) {
    findings.push({ rule: 'CTYPES_DLL_LOAD', level: 'high', line: 0, excerpt: 'ctypes.CDLL(', description: 'Loads arbitrary DLL/shared library via ctypes — potential code injection' });
  }
  if (/exec\s*\(\s*compile\s*\(/i.test(code)) {
    findings.push({ rule: 'EXEC_COMPILE_OBFUSCATION', level: 'high', line: 0, excerpt: 'exec(compile(', description: 'exec(compile()) obfuscation technique — defeats static analysis' });
  }
}

// ─── Main analyzer ────────────────────────────────────────────────
export function analyzeScript(code: string): SafetyReport {
  if (!code || code.trim().length < 5) {
    return { safe: true, level: 'safe', findings: [], linesChecked: 0, executionBlocked: false, summary: 'Empty script — nothing to analyze.' };
  }

  const cleanCode = stripPythonComments(code);
  const lines = code.split('\n');
  const findings: ThreatFinding[] = [];

  checkCrossLinePatterns(cleanCode, findings);

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const fullMatch = cleanCode.match(pattern);
      if (!fullMatch) continue;
      if (rule.safeContexts?.some(sc => sc.test(code))) continue;

      let lineNum = 1;
      let charPos = 0;
      // Map match position back to original code lines for accurate line numbers
      const origMatch = code.match(pattern);
      const matchIndex = origMatch ? (origMatch.index ?? 0) : (fullMatch.index ?? 0);
      for (let i = 0; i < lines.length; i++) {
        charPos += lines[i].length + 1;
        if (charPos >= matchIndex) {
          lineNum = i + 1;
          break;
        }
      }

      const excerpt = lines[lineNum - 1]?.trim().slice(0, 80) || fullMatch[0].slice(0, 80);
      findings.push({ rule: rule.id, level: rule.level, line: lineNum, excerpt, description: rule.description, fix: rule.fix });
      break;
    }
  }

  const LEVELS: ThreatLevel[] = ['safe', 'low', 'medium', 'high', 'critical'];
  const worst = findings.reduce<ThreatLevel>((acc, f) => {
    return LEVELS.indexOf(f.level) > LEVELS.indexOf(acc) ? f.level : acc;
  }, 'safe');

  const executionBlocked = worst === 'high' || worst === 'critical';

  const summary = findings.length === 0
    ? 'Script passed all safety checks — clear to execute.'
    : `${findings.length} issue(s) detected: ${findings.map(f => f.rule).join(', ')}`;

  return { safe: findings.length === 0 || worst === 'low', level: worst, findings, linesChecked: lines.length, executionBlocked, summary };
}

export function formatSafetyReport(report: SafetyReport): string {
  if (report.safe) return `✓ ${report.summary}`;
  const icons: Record<ThreatLevel, string> = { safe: '✓', low: '⚠', medium: '⚠⚠', high: '✗', critical: '☠' };
  const lines = [`${icons[report.level]} ${report.summary}`];
  for (const f of report.findings) {
    lines.push(`  [${icons[f.level]} ${f.rule}] L${f.line}: ${f.excerpt}`);
    if (f.fix) lines.push(`    Fix: ${f.fix}`);
  }
  return lines.join('\n');
}

// ─── Threat level metadata for UI ────────────────────────────────
export const THREAT_META: Record<ThreatLevel, { label: string; color: string; icon: string; bgColor: string }> = {
  safe:     { label: 'SAFE',     color: '#00FF88', icon: 'verified',       bgColor: '#00FF8812' },
  low:      { label: 'LOW',      color: '#FFC400', icon: 'info',           bgColor: '#FFC40012' },
  medium:   { label: 'MEDIUM',   color: '#FF6A1F', icon: 'warning',        bgColor: '#FF6A1F15' },
  high:     { label: 'HIGH',     color: '#FF4444', icon: 'error',          bgColor: '#FF444420' },
  critical: { label: 'CRITICAL', color: '#FF0044', icon: 'dangerous',      bgColor: '#FF004430' },
};
