/**
 * 🔍 ERROR PATTERN DETECTOR — Φ-NEXUS Error Intelligence
 *
 * Parses Python execution error output and returns:
 *  - Error type (ModuleNotFoundError, SyntaxError, etc.)
 *  - Human-readable explanation
 *  - Exact fix command(s) to run
 *  - Severity level
 *  - Optional docs link
 */

export type ErrorSeverity = 'critical' | 'warning' | 'info';

export interface ErrorPattern {
  type: string;           // e.g. "ModuleNotFoundError"
  title: string;          // Short human label
  explanation: string;    // Why this happened
  fixes: FixCommand[];    // Ordered list of fix steps
  severity: ErrorSeverity;
  docsUrl?: string;
  color: string;          // For UI accent
}

export interface FixCommand {
  label: string;          // e.g. "Install missing package"
  command: string;        // The exact command to copy/run
  icon: string;           // MaterialIcons name
}

// ─── Error Pattern Library ────────────────────────────────────────
const PATTERNS: Array<{
  regex: RegExp;
  build: (match: RegExpMatchArray, fullError: string) => ErrorPattern;
}> = [

  // ── ModuleNotFoundError / ImportError ──────────────────────────
  {
    regex: /(?:ModuleNotFoundError|ImportError)[^\n]*No module named '([^']+)'/,
    build: (m) => {
      const pkg = m[1].replace(/\./g, '-'); // numpy.core → numpy
      const rootPkg = pkg.split('.')[0];
      const PACKAGE_MAP: Record<string, string> = {
        'cv2': 'opencv-python',
        'PIL': 'Pillow',
        'sklearn': 'scikit-learn',
        'bs4': 'beautifulsoup4',
        'yaml': 'pyyaml',
        'dotenv': 'python-dotenv',
        'gi': 'PyGObject',
        'win32api': 'pywin32',
        'win32com': 'pywin32',
        'pynput': 'pynput',
        'pyautogui': 'pyautogui',
        'selenium': 'selenium',
        'playwright': 'playwright',
        'psutil': 'psutil',
        'requests': 'requests',
        'aiohttp': 'aiohttp',
        'httpx': 'httpx',
        'pandas': 'pandas',
        'numpy': 'numpy',
        'matplotlib': 'matplotlib',
        'openpyxl': 'openpyxl',
        'sqlalchemy': 'sqlalchemy',
        'pymongo': 'pymongo',
        'redis': 'redis',
        'celery': 'celery',
        'flask': 'Flask',
        'fastapi': 'fastapi',
        'pydantic': 'pydantic',
        'jwt': 'PyJWT',
        'cryptography': 'cryptography',
        'paramiko': 'paramiko',
        'fabric': 'fabric',
        'schedule': 'schedule',
        'apscheduler': 'APScheduler',
        'watchdog': 'watchdog',
        'rich': 'rich',
        'typer': 'typer',
        'click': 'click',
        'tqdm': 'tqdm',
        'loguru': 'loguru',
        'pyperclip': 'pyperclip',
        'mss': 'mss',
        'plyer': 'plyer',
        'keyboard': 'keyboard',
      };
      const installPkg = PACKAGE_MAP[rootPkg] || PACKAGE_MAP[pkg] || rootPkg;
      const fixes: FixCommand[] = [
        { label: 'Install missing package', command: `pip install ${installPkg}`, icon: 'download' },
        { label: 'Install with pip3 (if multiple Python versions)', command: `pip3 install ${installPkg}`, icon: 'download' },
      ];
      if (installPkg === 'playwright') {
        fixes.push({ label: 'Install browser binaries', command: 'playwright install chromium', icon: 'web' });
      }
      if (installPkg === 'pywin32') {
        fixes.push({ label: 'Run post-install script', command: 'python -m pywin32_postinstall -install', icon: 'build' });
      }
      return {
        type: 'ModuleNotFoundError',
        title: `Missing Package: ${installPkg}`,
        explanation: `The Python module "${m[1]}" is not installed. Install it with pip to run this script.`,
        fixes,
        severity: 'critical',
        docsUrl: `https://pypi.org/project/${installPkg}/`,
        color: '#FF6A1F',
      };
    },
  },

  // ── SyntaxError ────────────────────────────────────────────────
  {
    regex: /SyntaxError:\s*(.+)/,
    build: (m, full) => {
      const lineMatch = full.match(/line (\d+)/);
      const lineNum = lineMatch ? ` (line ${lineMatch[1]})` : '';
      return {
        type: 'SyntaxError',
        title: `Syntax Error${lineNum}`,
        explanation: `Python could not parse the script. The code has a syntax mistake: "${m[1].trim()}". Check for missing colons, parentheses, or incorrect indentation.`,
        fixes: [
          { label: 'Check indentation (use 4 spaces, not tabs)', command: 'python -m py_compile script.py', icon: 'code' },
          { label: 'Validate with pylint', command: 'pip install pylint && pylint script.py', icon: 'check-circle' },
        ],
        severity: 'critical',
        color: '#FF3C5A',
      };
    },
  },

  // ── IndentationError ───────────────────────────────────────────
  {
    regex: /IndentationError:\s*(.+)/,
    build: (m) => ({
      type: 'IndentationError',
      title: 'Indentation Error',
      explanation: `Inconsistent indentation: "${m[1].trim()}". Python requires exactly 4 spaces (or consistent tabs) per level. Never mix tabs and spaces.`,
      fixes: [
        { label: 'Auto-fix indentation with autopep8', command: 'pip install autopep8 && autopep8 --in-place script.py', icon: 'auto-fix-high' },
        { label: 'Expand tabs to spaces', command: 'python -c "import sys; open(sys.argv[1],\'w\').write(open(sys.argv[1]).read().expandtabs(4))" script.py', icon: 'code' },
      ],
      severity: 'critical',
      color: '#FF3C5A',
    }),
  },

  // ── PermissionError ────────────────────────────────────────────
  {
    regex: /PermissionError[^\n]*\[Errno 13\][^\n]*/,
    build: (m, full) => {
      const pathMatch = full.match(/'([^']+)'/g);
      const filePath = pathMatch ? pathMatch[pathMatch.length - 1]?.replace(/'/g, '') : 'the file';
      return {
        type: 'PermissionError',
        title: 'Permission Denied',
        explanation: `Access denied to ${filePath}. The script does not have read/write permission. Try running as administrator or changing file permissions.`,
        fixes: [
          { label: 'Run server as Administrator (Windows)', command: 'Right-click butler_server.py → Run as Administrator', icon: 'admin-panel-settings' },
          { label: 'Fix file permissions (Windows)', command: `icacls "${filePath}" /grant %USERNAME%:F`, icon: 'security' },
          { label: 'Fix permissions (macOS/Linux)', command: `chmod 755 "${filePath}"`, icon: 'lock-open' },
        ],
        severity: 'critical',
        color: '#FF3C5A',
      };
    },
  },

  // ── FileNotFoundError ─────────────────────────────────────────
  {
    regex: /FileNotFoundError[^\n]*\[Errno 2\][^\n]*/,
    build: (m, full) => {
      const pathMatch = full.match(/'([^']+)'/g);
      const filePath = pathMatch ? pathMatch[pathMatch.length - 1]?.replace(/'/g, '') : 'the path';
      return {
        type: 'FileNotFoundError',
        title: 'File Not Found',
        explanation: `The path "${filePath}" does not exist. Check the file path, use os.path.abspath() to debug, or create the directory first.`,
        fixes: [
          { label: 'Create missing directory', command: `python -c "import os; os.makedirs('${filePath}', exist_ok=True)"`, icon: 'create-new-folder' },
          { label: 'List files in parent directory', command: `python -c "import os; print(os.listdir('.'))"`, icon: 'folder-open' },
        ],
        severity: 'critical',
        color: '#FFC400',
      };
    },
  },

  // ── TimeoutError / timeout ─────────────────────────────────────
  {
    regex: /Timeout \(35s\)|TimeoutError|timeout exceeded/i,
    build: () => ({
      type: 'TimeoutError',
      title: 'Script Timeout (35s)',
      explanation: 'The script ran for more than 35 seconds. It may be stuck in an infinite loop, waiting for user input, or doing heavy computation.',
      fixes: [
        { label: 'Add timeout to long operations', command: 'import signal; signal.alarm(30)  # Add at top of script', icon: 'timer' },
        { label: 'Check for infinite loops', command: 'Add print() debug statements to find where it hangs', icon: 'bug-report' },
        { label: 'Use threading with timeout', command: 'from concurrent.futures import ThreadPoolExecutor; ex.submit(fn).result(timeout=30)', icon: 'schedule' },
      ],
      severity: 'warning',
      color: '#FFC400',
    }),
  },

  // ── ConnectionRefusedError / Network ──────────────────────────
  {
    regex: /ConnectionRefusedError|ConnectionError|cannot connect/i,
    build: (m, full) => {
      const portMatch = full.match(/:(\d{4,5})/);
      const port = portMatch ? portMatch[1] : '';
      return {
        type: 'ConnectionRefusedError',
        title: `Connection Refused${port ? ` (port ${port})` : ''}`,
        explanation: `Nothing is listening on ${port ? `port ${port}` : 'the target port'}. The service may be down, the port wrong, or firewall blocking.`,
        fixes: [
          { label: 'Check if service is running', command: `netstat -ano | findstr :${port || '80'}`, icon: 'network-check' },
          { label: 'Test port manually', command: `python -c "import socket; s=socket.socket(); s.connect(('localhost', ${port || 80})); print('OK')"`, icon: 'wifi' },
          { label: 'Check firewall', command: 'Windows Firewall → Allow app through firewall', icon: 'security' },
        ],
        severity: 'critical',
        color: '#FF3C5A',
      };
    },
  },

  // ── AttributeError ─────────────────────────────────────────────
  {
    regex: /AttributeError:\s*(.+)/,
    build: (m) => ({
      type: 'AttributeError',
      title: 'Attribute Error',
      explanation: `${m[1].trim()}. An object does not have the method or property you called. Check the variable type and API version.`,
      fixes: [
        { label: 'Inspect object type', command: `python -c "import YOUR_MODULE; obj = YOUR_MODULE.X(); print(dir(obj))"`, icon: 'search' },
        { label: 'Check installed version', command: 'pip show PACKAGE_NAME', icon: 'info' },
        { label: 'Update package', command: 'pip install --upgrade PACKAGE_NAME', icon: 'upgrade' },
      ],
      severity: 'warning',
      color: '#FFC400',
    }),
  },

  // ── TypeError ─────────────────────────────────────────────────
  {
    regex: /TypeError:\s*(.+)/,
    build: (m) => ({
      type: 'TypeError',
      title: 'Type Error',
      explanation: `Wrong data type: "${m[1].trim()}". You may be passing a string where an int is expected, or calling a non-callable.`,
      fixes: [
        { label: 'Check types with print(type(var))', command: 'Add: print(type(your_variable)) before the error line', icon: 'bug-report' },
        { label: 'Convert to correct type', command: 'int(x)  # or str(x) or float(x)', icon: 'code' },
      ],
      severity: 'warning',
      color: '#FFC400',
    }),
  },

  // ── NameError ─────────────────────────────────────────────────
  {
    regex: /NameError:\s*name '([^']+)' is not defined/,
    build: (m) => ({
      type: 'NameError',
      title: `Undefined Name: ${m[1]}`,
      explanation: `The variable or function "${m[1]}" is used before being defined. Check spelling, imports, and variable scope.`,
      fixes: [
        { label: 'Check if import is missing', command: `# Add at top: import ${m[1]}  or  from MODULE import ${m[1]}`, icon: 'download' },
        { label: 'Check variable scope', command: `# Ensure "${m[1]}" is defined before use`, icon: 'code' },
      ],
      severity: 'critical',
      color: '#FF3C5A',
    }),
  },

  // ── ValueError ─────────────────────────────────────────────────
  {
    regex: /ValueError:\s*(.+)/,
    build: (m) => ({
      type: 'ValueError',
      title: 'Value Error',
      explanation: `Invalid value: "${m[1].trim()}". The data format or range is wrong for the operation.`,
      fixes: [
        { label: 'Validate input before use', command: 'if isinstance(value, expected_type): ...', icon: 'check' },
        { label: 'Add try/except for safety', command: 'try:\n    result = operation(value)\nexcept ValueError as e:\n    print(f"Bad value: {e}")', icon: 'security' },
      ],
      severity: 'warning',
      color: '#FFC400',
    }),
  },

  // ── KeyboardInterrupt / No server ─────────────────────────────
  {
    regex: /No server connected|Cannot reach server|Go to CONNECT tab/i,
    build: () => ({
      type: 'ConnectionError',
      title: 'PC Server Not Connected',
      explanation: 'Butler Server is not running or not paired. Scripts run on your PC, so the server must be running first.',
      fixes: [
        { label: 'Start butler_server.py on your PC', command: 'python butler_server.py', icon: 'computer' },
        { label: 'Go to CONNECT tab and pair', command: 'Open CONNECT tab → Scan QR or enter IP manually', icon: 'link' },
      ],
      severity: 'critical',
      color: '#FF3C5A',
    }),
  },

  // ── RecursionError ────────────────────────────────────────────
  {
    regex: /RecursionError:\s*(.+)/,
    build: () => ({
      type: 'RecursionError',
      title: 'Infinite Recursion',
      explanation: 'A function calls itself too many times. Add a base case or increase the recursion limit.',
      fixes: [
        { label: 'Increase recursion limit', command: 'import sys; sys.setrecursionlimit(5000)  # Add at top', icon: 'settings' },
        { label: 'Refactor to iterative approach', command: '# Convert recursive function to use a loop + stack', icon: 'loop' },
      ],
      severity: 'warning',
      color: '#FFC400',
    }),
  },

  // ── MemoryError ───────────────────────────────────────────────
  {
    regex: /MemoryError/,
    build: () => ({
      type: 'MemoryError',
      title: 'Out of Memory',
      explanation: 'The script used too much RAM. Process data in smaller chunks or free unused variables.',
      fixes: [
        { label: 'Process in chunks', command: 'for chunk in pd.read_csv("file.csv", chunksize=1000):\n    process(chunk)', icon: 'memory' },
        { label: 'Free unused variables', command: 'import gc; del large_var; gc.collect()', icon: 'delete' },
      ],
      severity: 'critical',
      color: '#FF3C5A',
    }),
  },

  // ── Generic Traceback (fallback) ──────────────────────────────
  {
    regex: /Traceback \(most recent call last\)/,
    build: (m, full) => {
      const lastLine = full.split('\n').filter(l => l.trim()).pop() || '';
      return {
        type: 'RuntimeError',
        title: 'Script Crashed',
        explanation: `An unhandled exception occurred. Last error: "${lastLine.trim()}"`,
        fixes: [
          { label: 'Wrap in try/except to debug', command: 'try:\n    your_code_here()\nexcept Exception as e:\n    print(f"Error: {type(e).__name__}: {e}")', icon: 'bug-report' },
          { label: 'Run with verbose output', command: 'python -v script.py 2>&1', icon: 'terminal' },
        ],
        severity: 'warning',
        color: '#FF6A1F',
      };
    },
  },
];

// ─── Main Detector Function ────────────────────────────────────────
export function detectErrorPattern(errorOutput: string): ErrorPattern | null {
  if (!errorOutput || !errorOutput.trim()) return null;

  for (const { regex, build } of PATTERNS) {
    const match = errorOutput.match(regex);
    if (match) {
      try {
        return build(match, errorOutput);
      } catch {
        // Pattern builder failed — skip
      }
    }
  }

  return null;
}

// ─── Quick helpers ─────────────────────────────────────────────────
export function getErrorType(errorOutput: string): string {
  const pattern = detectErrorPattern(errorOutput);
  return pattern?.type || 'RuntimeError';
}

export function getQuickFix(errorOutput: string): string | null {
  const pattern = detectErrorPattern(errorOutput);
  return pattern?.fixes[0]?.command || null;
}
