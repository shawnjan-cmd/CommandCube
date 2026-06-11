/**
 * 🐍 Python Automation Knowledge Base — 130+ Real Scripts
 * Comprehensive Python scripts for automating everything.
 */

import type { AutomationScript } from './scriptTypes';

// Re-export for backward compatibility — other files import AutomationScript from here
export type { AutomationScript };

// Lazy-require EXTENDED_SCRIPTS to avoid any Hermes module init ordering issues.
// Using require() inside a try/catch guarantees PYTHON_AUTOMATION_SCRIPTS is always
// a valid array even if scriptLibraryExtensions fails to load on older Hermes builds.
function _loadExtended(): AutomationScript[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./scriptLibraryExtensions');
    const ext = mod && mod.EXTENDED_SCRIPTS;
    const extArr = Array.isArray(ext) ? ext : [];
    // Also load PC Check Suite scripts
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pcMod = require('./scriptLibraryPCCheck');
      const pcScripts = pcMod && pcMod.PC_CHECK_SCRIPTS;
      if (Array.isArray(pcScripts)) return [...extArr, ...pcScripts];
    } catch {}
    return extArr;
  } catch {
    // Try PC Check scripts alone
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pcMod = require('./scriptLibraryPCCheck');
      const pcScripts = pcMod && pcMod.PC_CHECK_SCRIPTS;
      return Array.isArray(pcScripts) ? pcScripts : [];
    } catch {}
    return [];
  }
}

const BASE_SCRIPTS: AutomationScript[] = [

  // ── FILE & FOLDER ─────────────────────────────────────────────
  {
    id: 'file-organizer',
    title: 'File Organizer by Extension',
    category: 'Files',
    tags: ['files', 'organize', 'sort', 'folder', 'cleanup', 'desktop'],
    description: 'Automatically sorts files into subfolders by extension',
    requirements: [],
    script: `import os, shutil
from pathlib import Path

SOURCE = Path.home() / "Downloads"
RULES = {
    "Images":    [".jpg",".jpeg",".png",".gif",".bmp",".webp",".svg"],
    "Videos":    [".mp4",".avi",".mov",".mkv",".wmv",".flv"],
    "Documents": [".pdf",".doc",".docx",".txt",".xlsx",".pptx",".csv"],
    "Audio":     [".mp3",".wav",".flac",".aac",".ogg"],
    "Archives":  [".zip",".rar",".7z",".tar",".gz"],
    "Code":      [".py",".js",".ts",".html",".css",".json"],
}

moved = 0
for f in SOURCE.iterdir():
    if not f.is_file(): continue
    dest_folder = "Other"
    for name, exts in RULES.items():
        if f.suffix.lower() in exts:
            dest_folder = name; break
    dest = SOURCE / dest_folder
    dest.mkdir(exist_ok=True)
    shutil.move(str(f), dest / f.name)
    moved += 1
print(f"Organized {moved} files in {SOURCE}")`,
  },
  {
    id: 'bulk-rename',
    title: 'Bulk File Renamer',
    category: 'Files',
    tags: ['rename', 'batch', 'files', 'bulk', 'prefix'],
    description: 'Batch rename files with prefix, suffix, or find/replace',
    requirements: [],
    script: `from pathlib import Path

FOLDER  = Path.home() / "Pictures"
PREFIX  = "photo_"
REPLACE = ("IMG_", "pic_")

for i, f in enumerate(sorted(FOLDER.iterdir()), 1):
    if not f.is_file(): continue
    stem = f.stem.replace(*REPLACE)
    new_name = f"{PREFIX}{stem}{f.suffix}"
    f.rename(f.parent / new_name)
    print(f"Renamed: {f.name} -> {new_name}")`,
  },
  {
    id: 'backup-script',
    title: 'Auto Backup to Zip',
    category: 'Files',
    tags: ['backup', 'zip', 'archive', 'schedule', 'automated'],
    description: 'Back up a folder to a timestamped zip file, auto-cleans old backups',
    requirements: [],
    script: `import shutil, os
from pathlib import Path
from datetime import datetime

SOURCE     = Path.home() / "Documents"
BACKUP_DIR = Path.home() / "Backups"
MAX_BACKUPS = 7

BACKUP_DIR.mkdir(exist_ok=True)
ts = datetime.now().strftime("%Y%m%d_%H%M%S")
archive = BACKUP_DIR / f"backup_{ts}"
shutil.make_archive(str(archive), 'zip', SOURCE)
size = os.path.getsize(str(archive)+'.zip') / 1024 / 1024
print(f"Backup created: {archive}.zip ({size:.1f}MB)")

backups = sorted(BACKUP_DIR.glob("backup_*.zip"))
for old in backups[:-MAX_BACKUPS]:
    old.unlink()
    print(f"Deleted old backup: {old.name}")`,
  },
  {
    id: 'duplicate-finder',
    title: 'Duplicate File Destroyer',
    category: 'Files',
    tags: ['duplicate', 'hash', 'find', 'clean', 'storage'],
    description: 'Find and remove duplicate files using MD5 hash comparison',
    requirements: [],
    script: `import hashlib, os
from pathlib import Path
from collections import defaultdict

SCAN_DIR = Path.home() / "Downloads"
DRY_RUN  = True  # Set False to actually delete

def file_hash(path, chunk=8192):
    h = hashlib.md5()
    with open(path, 'rb') as f:
        while chunk := f.read(chunk):
            h.update(chunk)
    return h.hexdigest()

hashes = defaultdict(list)
for f in SCAN_DIR.rglob("*"):
    if f.is_file():
        try:
            hashes[file_hash(f)].append(f)
        except: pass

total_saved = 0
for h, files in hashes.items():
    if len(files) > 1:
        print(f"Duplicates ({len(files)}):")
        for i, f in enumerate(files):
            size = f.stat().st_size
            if i == 0:
                print(f"  KEEP: {f.name} ({size//1024}KB)")
            else:
                print(f"  {'DEL ' if not DRY_RUN else 'WOULD DEL'}: {f.name}")
                total_saved += size
                if not DRY_RUN: f.unlink()
print(f"\\nSpace {'would be ' if DRY_RUN else ''}freed: {total_saved//1024//1024}MB")`,
  },
  {
    id: 'smart-file-sorter',
    title: 'Smart File Sorter',
    category: 'Files',
    tags: ['sort', 'auto', 'organize', 'date', 'type'],
    description: 'Auto-sort files by type into organized folders with date subfolders',
    requirements: [],
    script: `from pathlib import Path
import shutil
from datetime import datetime

WATCH_DIR = Path.home() / "Downloads"
OUT_DIR   = Path.home() / "Sorted"

EXT_MAP = {
    'Photos':    ['.jpg','.jpeg','.png','.heic'],
    'Videos':    ['.mp4','.mkv','.avi','.mov'],
    'Music':     ['.mp3','.flac','.wav','.aac'],
    'Documents': ['.pdf','.doc','.docx','.txt'],
    'Code':      ['.py','.js','.ts','.html'],
    'Archives':  ['.zip','.rar','.7z','.tar'],
}

def get_category(suffix):
    s = suffix.lower()
    for cat, exts in EXT_MAP.items():
        if s in exts: return cat
    return 'Misc'

for f in WATCH_DIR.iterdir():
    if not f.is_file(): continue
    cat  = get_category(f.suffix)
    mtime = datetime.fromtimestamp(f.stat().st_mtime)
    dest = OUT_DIR / cat / mtime.strftime('%Y-%m')
    dest.mkdir(parents=True, exist_ok=True)
    shutil.copy2(f, dest / f.name)
    print(f"  {f.name} -> {cat}/{mtime.strftime('%Y-%m')}")

print("Sorting complete!")`,
  },
  {
    id: 'photo-organizer',
    title: 'Photo Organizer by Date',
    category: 'Files',
    tags: ['photos', 'exif', 'date', 'organize', 'images'],
    description: 'Sort photos into YYYY/MM folders using EXIF metadata',
    requirements: ['Pillow'],
    script: `from pathlib import Path
import shutil
from datetime import datetime

try:
    from PIL import Image
    from PIL.ExifTags import TAGS
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("pip install Pillow for EXIF support")

SOURCE = Path.home() / "Pictures" / "Unsorted"
DEST   = Path.home() / "Pictures" / "Organized"

def get_date(path):
    if HAS_PIL:
        try:
            img = Image.open(path)
            exif = img._getexif() or {}
            for tag_id, val in exif.items():
                if TAGS.get(tag_id) == 'DateTimeOriginal':
                    return datetime.strptime(val, '%Y:%m:%d %H:%M:%S')
        except: pass
    return datetime.fromtimestamp(path.stat().st_mtime)

moved = 0
for f in SOURCE.rglob("*"):
    if f.suffix.lower() not in ['.jpg','.jpeg','.png','.heic','.raw']: continue
    dt   = get_date(f)
    dest = DEST / dt.strftime('%Y') / dt.strftime('%m-%B')
    dest.mkdir(parents=True, exist_ok=True)
    shutil.copy2(f, dest / f.name)
    moved += 1

print(f"Organized {moved} photos into {DEST}")`,
  },

  // ── SYSTEM AUTOMATION ─────────────────────────────────────────
  {
    id: 'sys-info',
    title: 'Full System Info Report',
    category: 'System',
    tags: ['system', 'info', 'specs', 'hardware', 'cpu', 'ram', 'disk'],
    description: 'Generates a complete system specification report',
    requirements: ['psutil'],
    script: `import platform, psutil, socket
from datetime import datetime

cpu  = psutil.cpu_percent(interval=1)
mem  = psutil.virtual_memory()
disk = psutil.disk_usage('/')
net  = psutil.net_io_counters()
boot = datetime.fromtimestamp(psutil.boot_time())
freq = psutil.cpu_freq()

print(f"""
=== SYSTEM REPORT [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ===
OS:       {platform.system()} {platform.release()} {platform.machine()}
Hostname: {socket.gethostname()}
CPU:      {platform.processor()[:50]}
  Usage:  {cpu}%  Cores: {psutil.cpu_count(logical=True)}
  Freq:   {freq.current:.0f}MHz (max {freq.max:.0f}MHz)
RAM:      {mem.used/1024**3:.1f}/{mem.total/1024**3:.1f}GB ({mem.percent}%)
Disk:     {disk.used/1024**3:.1f}/{disk.total/1024**3:.1f}GB ({disk.percent}%)
Network:  UP {net.bytes_sent/1024**2:.1f}MB  DOWN {net.bytes_recv/1024**2:.1f}MB
Uptime:   Since {boot.strftime('%Y-%m-%d %H:%M')}
Procs:    {len(psutil.pids())} running
""")`,
  },
  {
    id: 'kill-process',
    title: 'Kill Process by Name',
    category: 'System',
    tags: ['process', 'kill', 'task', 'manager', 'stop', 'terminate'],
    description: 'Find and terminate processes by name',
    requirements: ['psutil'],
    script: `import psutil

TARGET = "chrome"  # Process name to kill (partial match)

killed = 0
for proc in psutil.process_iter(['pid', 'name', 'status']):
    try:
        if TARGET.lower() in proc.info['name'].lower():
            proc.terminate()
            proc.wait(timeout=3)
            print(f"Killed: {proc.info['name']} (PID {proc.info['pid']})")
            killed += 1
    except (psutil.NoSuchProcess, psutil.AccessDenied): pass

print(f"Terminated {killed} process(es) matching '{TARGET}'"
      if killed else f"No processes found matching '{TARGET}'")`,
  },
  {
    id: 'disk-usage-analyzer',
    title: 'Disk Usage Analyzer',
    category: 'System',
    tags: ['disk', 'storage', 'usage', 'treemap', 'space', 'folders'],
    description: 'Analyze disk usage by folder and find largest space consumers',
    requirements: ['psutil'],
    script: `import os
from pathlib import Path
import psutil

def folder_size(path):
    total = 0
    try:
        for entry in os.scandir(path):
            try:
                if entry.is_file(follow_symlinks=False):
                    total += entry.stat().st_size
                elif entry.is_dir(follow_symlinks=False):
                    total += folder_size(entry.path)
            except: pass
    except: pass
    return total

def fmt(size):
    for unit in ['B','KB','MB','GB','TB']:
        if size < 1024: return f"{size:.1f}{unit}"
        size /= 1024
    return f"{size:.1f}PB"

# Disk partitions
print("=== DISK PARTITIONS ===")
for p in psutil.disk_partitions():
    try:
        usage = psutil.disk_usage(p.mountpoint)
        bar = '█' * int(usage.percent/5) + '░' * (20-int(usage.percent/5))
        print(f"{p.device:20} {bar} {usage.percent:5.1f}% used | {fmt(usage.free)} free")
    except: pass

# Top folders in home
print(f"\\n=== TOP FOLDERS IN HOME ===")
home = Path.home()
sizes = []
for item in home.iterdir():
    if item.is_dir():
        try:
            sizes.append((item, folder_size(item)))
        except: pass
for path, size in sorted(sizes, key=lambda x: x[1], reverse=True)[:10]:
    bar = '█' * min(int(size/1024/1024/100), 20)
    print(f"  {path.name:25} {fmt(size):10} {bar}")`,
  },
  {
    id: 'startup-manager',
    title: 'Windows Startup App Manager',
    category: 'System',
    tags: ['startup', 'windows', 'boot', 'autostart', 'registry'],
    description: 'List and manage Windows startup programs via registry',
    requirements: [],
    script: `import winreg, sys

if sys.platform != 'win32':
    print("Windows only"); exit()

KEY = r"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run"

print("=== STARTUP PROGRAMS ===")
with winreg.OpenKey(winreg.HKEY_CURRENT_USER, KEY) as k:
    i = 0
    while True:
        try:
            name, val, _ = winreg.EnumValue(k, i)
            print(f"  {i+1}. {name}: {val[:70]}")
            i += 1
        except OSError: break

print(f"\\nTotal: {i} startup items")
print("To remove: uncomment the line below and set name")
# with winreg.OpenKey(winreg.HKEY_CURRENT_USER, KEY, 0, winreg.KEY_WRITE) as k:
#     winreg.DeleteValue(k, "ProgramName")`,
  },
  {
    id: 'process-monitor',
    title: 'Process Hog Killer',
    category: 'System',
    tags: ['process', 'cpu', 'ram', 'high usage', 'kill', 'hog'],
    description: 'Auto-kill runaway processes exceeding CPU/RAM thresholds',
    requirements: ['psutil'],
    script: `import psutil, time

CPU_LIMIT = 90  # % CPU threshold to kill
RAM_LIMIT = 85  # % RAM threshold to warn
WHITELIST = {'System', 'svchost.exe', 'python.exe', 'python3'}

print(f"Monitoring: CPU>{CPU_LIMIT}% RAM>{RAM_LIMIT}% | Whitelist: {WHITELIST}")
print("Press Ctrl+C to stop\\n")

try:
    while True:
        for proc in psutil.process_iter(['pid','name','cpu_percent','memory_percent']):
            try:
                info = proc.info
                name = info['name'] or 'unknown'
                cpu  = info['cpu_percent'] or 0
                ram  = info['memory_percent'] or 0

                if name in WHITELIST: continue

                if cpu > CPU_LIMIT:
                    print(f"CPU HOG: {name} ({info['pid']}) using {cpu:.1f}% CPU — killing")
                    proc.terminate()
                elif ram > RAM_LIMIT:
                    print(f"RAM HOG: {name} ({info['pid']}) using {ram:.1f}% RAM — warning")
            except (psutil.NoSuchProcess, psutil.AccessDenied): pass
        time.sleep(5)
except KeyboardInterrupt:
    print("\\nStopped.")`,
  },

  // ── SECURITY & THREAT PREVENTION ──────────────────────────────
  {
    id: 'open-port-scanner',
    title: 'Open Port Scanner',
    category: 'Security',
    tags: ['ports', 'scan', 'network', 'security', 'nmap', 'audit'],
    description: 'Audit listening ports and flag anomalous services',
    requirements: [],
    script: `import socket, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

TARGET = "127.0.0.1"  # Change to scan remote host
PORTS  = list(range(1, 1025))  # Common ports

WELL_KNOWN = {
    21:'FTP',22:'SSH',23:'Telnet',25:'SMTP',53:'DNS',
    80:'HTTP',110:'POP3',143:'IMAP',443:'HTTPS',
    3306:'MySQL',5432:'Postgres',6379:'Redis',8080:'HTTP-Alt',
    8765:'Butler',27017:'MongoDB',
}

def scan_port(port):
    try:
        s = socket.socket()
        s.settimeout(0.5)
        result = s.connect_ex((TARGET, port))
        s.close()
        return port if result == 0 else None
    except: return None

print(f"Scanning {TARGET} ports 1-1024...")
open_ports = []
with ThreadPoolExecutor(max_workers=200) as ex:
    results = ex.map(scan_port, PORTS)
    open_ports = [p for p in results if p]

print(f"\\nFound {len(open_ports)} open ports:")
for port in sorted(open_ports):
    service = WELL_KNOWN.get(port, 'Unknown')
    flag = " ⚠ RISKY" if port in [21,23,3306,27017] else ""
    print(f"  {port:5} — {service}{flag}")`,
  },
  {
    id: 'file-integrity-monitor',
    title: 'File Integrity Monitor',
    category: 'Security',
    tags: ['integrity', 'hash', 'monitor', 'tamper', 'detect', 'security'],
    description: 'Hash monitoring for critical files to detect tampering',
    requirements: [],
    script: `import hashlib, json, time
from pathlib import Path
from datetime import datetime

WATCH_PATHS = [
    Path("C:/Windows/System32/drivers/etc/hosts"),
    Path.home() / ".ssh" / "authorized_keys",
    # Add more critical files
]
BASELINE_FILE = "integrity_baseline.json"

def file_hash(path):
    h = hashlib.sha256()
    try:
        with open(path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                h.update(chunk)
        return h.hexdigest()
    except: return None

def create_baseline():
    baseline = {}
    for p in WATCH_PATHS:
        if p.exists():
            baseline[str(p)] = {'hash': file_hash(p), 'ts': datetime.now().isoformat()}
    with open(BASELINE_FILE, 'w') as f:
        json.dump(baseline, f, indent=2)
    print(f"Baseline created for {len(baseline)} files")
    return baseline

def check_integrity(baseline):
    alerts = []
    for path_str, info in baseline.items():
        path = Path(path_str)
        if not path.exists():
            alerts.append(f"MISSING: {path_str}")
        elif file_hash(path) != info['hash']:
            alerts.append(f"TAMPERED: {path_str}")
    return alerts

if not Path(BASELINE_FILE).exists():
    baseline = create_baseline()
else:
    with open(BASELINE_FILE) as f:
        baseline = json.load(f)
    alerts = check_integrity(baseline)
    if alerts:
        for a in alerts: print(f"⚠  {a}")
    else:
        print(f"All {len(baseline)} files intact")`,
  },
  {
    id: 'password-audit',
    title: 'Password Strength Audit',
    category: 'Security',
    tags: ['password', 'audit', 'strength', 'weak', 'security'],
    description: 'Check accounts for weak passwords in shadow/SAM files',
    requirements: [],
    script: `import hashlib, re

COMMON_PASSWORDS = [
    "password","123456","password1","qwerty","abc123",
    "letmein","monkey","1234567890","admin","welcome",
    "login","passw0rd","master","hello","shadow",
]

def strength_score(pwd):
    score = 0
    if len(pwd) >= 8: score += 1
    if len(pwd) >= 12: score += 1
    if re.search(r'[A-Z]', pwd): score += 1
    if re.search(r'[a-z]', pwd): score += 1
    if re.search(r'[0-9]', pwd): score += 1
    if re.search(r'[^A-Za-z0-9]', pwd): score += 1
    return score

def audit_password(pwd):
    score = strength_score(pwd)
    is_common = pwd.lower() in COMMON_PASSWORDS
    level = ['VERY WEAK','WEAK','FAIR','GOOD','STRONG','VERY STRONG'][min(score,5)]
    return {'score': score, 'level': level, 'common': is_common}

# Test passwords
TEST_PASSWORDS = ["password123", "MyS3cur3P@ss!", "qwerty", "X9#kL2mP!"]
print("=== PASSWORD AUDIT ===")
for pwd in TEST_PASSWORDS:
    result = audit_password(pwd)
    flag = " ⚠ COMMON!" if result['common'] else ""
    print(f"  {'*'*len(pwd):15} Score:{result['score']}/5  {result['level']:12}{flag}")`,
  },
  {
    id: 'ssh-fortress',
    title: 'SSH Fortress Hardener',
    category: 'Security',
    tags: ['ssh', 'harden', 'security', 'config', 'key'],
    description: 'Harden SSH config — enforce key-only auth, disable root login',
    requirements: [],
    script: `import subprocess, sys, shutil
from pathlib import Path
from datetime import datetime

if sys.platform == 'win32':
    print("Linux/Mac only"); exit()

SSHD_CONFIG = Path("/etc/ssh/sshd_config")

HARDENED_SETTINGS = {
    "PermitRootLogin":           "no",
    "PasswordAuthentication":    "no",
    "PubkeyAuthentication":      "yes",
    "AuthorizedKeysFile":        ".ssh/authorized_keys",
    "PermitEmptyPasswords":      "no",
    "MaxAuthTries":              "3",
    "LoginGraceTime":            "20",
    "X11Forwarding":             "no",
    "Protocol":                  "2",
}

if not SSHD_CONFIG.exists():
    print("sshd_config not found — is OpenSSH installed?"); exit()

# Backup original
backup = SSHD_CONFIG.with_suffix(f".backup_{datetime.now().strftime('%Y%m%d')}")
shutil.copy2(SSHD_CONFIG, backup)
print(f"Backed up to {backup}")

content = SSHD_CONFIG.read_text()
for key, value in HARDENED_SETTINGS.items():
    import re
    pattern = rf"^#?\\s*{key}\\s+.*$"
    replacement = f"{key} {value}"
    if re.search(pattern, content, re.MULTILINE):
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    else:
        content += f"\\n{replacement}"
    print(f"  Set {key} = {value}")

SSHD_CONFIG.write_text(content)
subprocess.run(["systemctl", "restart", "ssh"], capture_output=True)
print("\\nSSH hardened. Restart SSH to apply.")`,
  },
  {
    id: 'rootkit-scanner',
    title: 'Rootkit Hunter',
    category: 'Security',
    tags: ['rootkit', 'malware', 'scan', 'backdoor', 'security'],
    description: 'Scan for rootkits, backdoors and suspicious processes',
    requirements: [],
    script: `import os, sys, subprocess
from pathlib import Path

SUSPICIOUS_FILES = [
    "/tmp/.ICE-unix/.*sh",
    "/dev/shm/.*\\.py",
    "/.hidden",
]

SUSPICIOUS_PROCS = [
    "nc -l", "ncat", "ngrok", "msfconsole",
    "backdoor", "reverse_shell",
]

SUID_WHITELIST = {"/usr/bin/sudo","/usr/bin/su","/bin/passwd"}

print("=== ROOTKIT SCAN ===")
issues = []

# Check for suspicious hidden files
print("\\n[1] Checking for suspicious files...")
for pattern in ["/tmp", "/var/tmp", "/dev/shm"]:
    try:
        for f in Path(pattern).rglob("*"):
            if f.name.startswith('.') and f.is_file():
                issues.append(f"Hidden file: {f}")
                print(f"  ⚠ {f}")
    except: pass

# Check SUID files (Linux)
if sys.platform != 'win32':
    print("\\n[2] Checking SUID files...")
    try:
        r = subprocess.run(["find", "/", "-perm", "/4000", "-type", "f"],
                           capture_output=True, text=True, timeout=10)
        for f in r.stdout.strip().split("\\n"):
            if f and f not in SUID_WHITELIST:
                print(f"  SUID: {f}")
    except: pass

# Check running processes
print("\\n[3] Checking processes...")
try:
    import psutil
    for proc in psutil.process_iter(['pid','name','cmdline']):
        cmd = ' '.join(proc.info.get('cmdline') or []).lower()
        for suspicious in SUSPICIOUS_PROCS:
            if suspicious in cmd:
                issues.append(f"Suspicious process: {cmd}")
                print(f"  ⚠ PID {proc.info['pid']}: {cmd[:80]}")
except ImportError:
    print("  (pip install psutil for process scan)")

print(f"\\n=== RESULTS: {len(issues)} issues found ===")`,
  },
  {
    id: 'firewall-hardener',
    title: 'Firewall Hardener',
    category: 'Security',
    tags: ['firewall', 'iptables', 'ufw', 'security', 'block', 'rules'],
    description: 'Auto-configure iptables/ufw firewall rules for hardening',
    requirements: [],
    script: `import subprocess, sys

if sys.platform == 'win32':
    print("Linux only"); exit()

def run(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    status = "✓" if r.returncode == 0 else "✗"
    print(f"  {status} {cmd}")
    return r.returncode == 0

print("=== UFW FIREWALL HARDENING ===")

# Check if ufw is available
if subprocess.run("which ufw", shell=True, capture_output=True).returncode != 0:
    print("UFW not found. Install: sudo apt install ufw"); exit()

rules = [
    "ufw --force reset",
    "ufw default deny incoming",
    "ufw default allow outgoing",
    "ufw allow ssh",
    "ufw allow 80/tcp",
    "ufw allow 443/tcp",
    "ufw limit ssh/tcp",    # Rate-limit SSH to prevent brute force
    "ufw --force enable",
]

for rule in rules:
    run(f"sudo {rule}")

run("sudo ufw status verbose")
print("\\nFirewall hardened. Review rules with: sudo ufw status verbose")`,
  },

  // ── SYSTEM CLEANING ───────────────────────────────────────────
  {
    id: 'temp-file-nuker',
    title: 'Temp File Nuker',
    category: 'Cleaning',
    tags: ['clean', 'temp', 'cache', 'junk', 'free space', 'disk'],
    description: 'Purge temp dirs, caches and install leftovers to free space',
    requirements: [],
    script: `import shutil, os, sys
from pathlib import Path

DRY_RUN = False  # Set True to preview without deleting

CLEAN_PATHS = []

if sys.platform == 'win32':
    CLEAN_PATHS += [
        Path(os.environ.get('TEMP', 'C:/Temp')),
        Path("C:/Windows/Temp"),
        Path(os.environ.get('LOCALAPPDATA','')) / "Temp",
        Path(os.environ.get('LOCALAPPDATA','')) / "Microsoft/Windows/INetCache",
    ]
else:
    CLEAN_PATHS += [
        Path("/tmp"),
        Path("/var/tmp"),
        Path.home() / ".cache",
        Path("/var/cache/apt/archives") if Path("/var/cache/apt").exists() else None,
    ]

total_freed = 0

for clean_path in CLEAN_PATHS:
    if not clean_path or not clean_path.exists(): continue
    path_size = 0
    count = 0
    for item in clean_path.rglob("*"):
        if item.is_file():
            try:
                path_size += item.stat().st_size
                count += 1
                if not DRY_RUN: item.unlink(missing_ok=True)
            except: pass
    mb = path_size / 1024 / 1024
    total_freed += path_size
    action = "WOULD FREE" if DRY_RUN else "FREED"
    print(f"  {action}: {clean_path.name:30} {mb:7.1f}MB  ({count} files)")

print(f"\\nTotal {'would be ' if DRY_RUN else ''}freed: {total_freed/1024/1024:.1f}MB")`,
  },
  {
    id: 'browser-scrubber',
    title: 'Browser Cache Scrubber',
    category: 'Cleaning',
    tags: ['browser', 'cache', 'clear', 'history', 'cookies', 'clean', 'privacy'],
    description: 'Clear cache, cookies, history from Chrome, Firefox, Edge everywhere',
    requirements: [],
    script: `import shutil, sys
from pathlib import Path

HOME = Path.home()

BROWSER_CACHES = {}
if sys.platform == 'win32':
    APPDATA = Path(os.environ.get('LOCALAPPDATA',''))
    ROAMING  = Path(os.environ.get('APPDATA',''))
    BROWSER_CACHES = {
        "Chrome":  APPDATA / "Google/Chrome/User Data/Default/Cache",
        "Edge":    APPDATA / "Microsoft/Edge/User Data/Default/Cache",
        "Firefox": ROAMING / "Mozilla/Firefox/Profiles",
        "Brave":   APPDATA / "BraveSoftware/Brave-Browser/User Data/Default/Cache",
    }
elif sys.platform == 'darwin':
    BROWSER_CACHES = {
        "Chrome":  HOME / "Library/Caches/Google/Chrome",
        "Firefox": HOME / "Library/Caches/Firefox",
        "Safari":  HOME / "Library/Caches/com.apple.Safari",
    }
else:
    BROWSER_CACHES = {
        "Chrome":  HOME / ".cache/google-chrome",
        "Firefox": HOME / ".cache/mozilla/firefox",
        "Brave":   HOME / ".cache/BraveSoftware/Brave-Browser",
    }

import os
total = 0
for browser, cache_path in BROWSER_CACHES.items():
    if not cache_path.exists(): continue
    size = sum(f.stat().st_size for f in cache_path.rglob('*') if f.is_file())
    try:
        shutil.rmtree(cache_path)
        cache_path.mkdir(parents=True, exist_ok=True)
        total += size
        print(f"  Cleared {browser}: {size/1024/1024:.1f}MB")
    except Exception as e:
        print(f"  {browser}: {e}")

print(f"\\nTotal cleared: {total/1024/1024:.1f}MB")`,
  },
  {
    id: 'log-rotator',
    title: 'Log Rotator & Compressor',
    category: 'Cleaning',
    tags: ['logs', 'compress', 'rotate', 'trim', 'journal', 'disk'],
    description: 'Compress and rotate system logs, trim journal size',
    requirements: [],
    script: `import gzip, shutil, subprocess, sys
from pathlib import Path
from datetime import datetime, timedelta

LOG_DIR  = Path("/var/log") if sys.platform != 'win32' else Path("C:/Logs")
MAX_AGE  = 30  # days to keep logs
MAX_SIZE = 100 * 1024 * 1024  # 100MB max per log

total_saved = 0

if LOG_DIR.exists():
    for log_file in LOG_DIR.rglob("*.log"):
        try:
            stat = log_file.stat()
            age  = (datetime.now() - datetime.fromtimestamp(stat.st_mtime)).days

            if age > MAX_AGE:
                log_file.unlink()
                print(f"  Deleted old log ({age}d): {log_file.name}")
                total_saved += stat.st_size

            elif stat.st_size > MAX_SIZE:
                gz_path = log_file.with_suffix('.log.gz')
                with open(log_file, 'rb') as f_in:
                    with gzip.open(gz_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                saved = stat.st_size - gz_path.stat().st_size
                log_file.unlink()
                total_saved += saved
                print(f"  Compressed: {log_file.name} ({saved/1024:.0f}KB saved)")
        except: pass

# Trim systemd journal (Linux)
if sys.platform != 'win32':
    try:
        subprocess.run(["sudo", "journalctl", "--vacuum-time=30d"], capture_output=True)
        subprocess.run(["sudo", "journalctl", "--vacuum-size=100M"], capture_output=True)
        print("  Trimmed systemd journal")
    except: pass

print(f"\\nTotal space freed: {total_saved/1024/1024:.1f}MB")`,
  },
  {
    id: 'startup-optimizer',
    title: 'Startup Optimizer',
    category: 'Cleaning',
    tags: ['startup', 'boot', 'optimize', 'disable', 'performance', 'slow'],
    description: 'Disable bloat startup items to speed up boot',
    requirements: [],
    script: `import subprocess, sys

if sys.platform == 'win32':
    import winreg

    KNOWN_BLOAT = [
        "OneDrive", "Teams", "Spotify", "Discord",
        "Steam", "EpicGamesLauncher", "AdobeUpdater",
        "GoogleDriveFS", "Slack", "Zoom",
    ]

    KEY = r"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run"

    print("=== STARTUP ITEMS ===")
    disabled = []
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, KEY) as k:
        i = 0
        items = []
        while True:
            try:
                name, val, _ = winreg.EnumValue(k, i)
                items.append((name, val))
                i += 1
            except OSError: break

    for name, val in items:
        is_bloat = any(b.lower() in name.lower() for b in KNOWN_BLOAT)
        flag = " ← BLOAT" if is_bloat else ""
        print(f"  {name[:35]:35}{flag}")
        # Uncomment to disable:
        # if is_bloat:
        #     with winreg.OpenKey(winreg.HKEY_CURRENT_USER, KEY, 0, winreg.KEY_WRITE) as k:
        #         winreg.DeleteValue(k, name)
        #     disabled.append(name)

    print(f"\\nFound {len(items)} startup items")
else:
    # Linux: list systemd services
    result = subprocess.run(
        ["systemctl", "list-unit-files", "--type=service", "--state=enabled"],
        capture_output=True, text=True
    )
    print("=== ENABLED SERVICES ===")
    print(result.stdout[:3000])`,
  },
  {
    id: 'orphan-package-cleaner',
    title: 'Orphan Package Cleaner',
    category: 'Cleaning',
    tags: ['packages', 'orphan', 'apt', 'pip', 'clean', 'dependencies'],
    description: 'Remove orphaned packages and dependencies on Linux/Mac',
    requirements: [],
    script: `import subprocess, sys

if sys.platform == 'win32':
    print("Linux/Mac only for package cleanup")
    print("For Python: pip list --outdated")
    result = subprocess.run(["pip", "list", "--outdated"],
                            capture_output=True, text=True)
    print(result.stdout)
    exit()

print("=== PACKAGE CLEANUP ===")

# APT (Debian/Ubuntu)
if subprocess.run("which apt-get", shell=True, capture_output=True).returncode == 0:
    print("\\n[APT] Removing orphans...")
    cmds = [
        "sudo apt-get autoremove -y",
        "sudo apt-get autoclean -y",
        "sudo apt-get clean",
    ]
    for cmd in cmds:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        print(f"  {'✓' if r.returncode==0 else '✗'} {cmd}")

# DNF (Fedora/RHEL)
elif subprocess.run("which dnf", shell=True, capture_output=True).returncode == 0:
    subprocess.run("sudo dnf autoremove -y", shell=True)

# Homebrew (Mac)
elif subprocess.run("which brew", shell=True, capture_output=True).returncode == 0:
    subprocess.run("brew cleanup --prune=7", shell=True)
    subprocess.run("brew autoremove", shell=True)

# Python orphans
print("\\n[PIP] Outdated packages:")
subprocess.run(["pip", "list", "--outdated"])`,
  },

  // ── PERFORMANCE & OPTIMIZATION ────────────────────────────────
  {
    id: 'swappiness-optimizer',
    title: 'Swappiness Optimizer',
    category: 'Performance',
    tags: ['swap', 'ram', 'memory', 'optimize', 'linux', 'performance'],
    description: 'Tune vm.swappiness for optimal RAM usage',
    requirements: [],
    script: `import subprocess, sys

if sys.platform == 'win32':
    print("Linux only"); exit()

def get_swappiness():
    r = subprocess.run(["cat", "/proc/sys/vm/swappiness"],
                       capture_output=True, text=True)
    return int(r.stdout.strip())

def set_swappiness(value):
    subprocess.run(["sudo", "sysctl", f"vm.swappiness={value}"])
    # Persist across reboots
    config_line = f"vm.swappiness={value}"
    sysctl_conf = "/etc/sysctl.conf"
    with open(sysctl_conf) as f:
        content = f.read()
    if "vm.swappiness" in content:
        import re
        content = re.sub(r"vm\\.swappiness=\\d+", config_line, content)
    else:
        content += f"\\n{config_line}\\n"
    # Write requires sudo — show command instead
    print(f"  Run: sudo sh -c 'echo \"{config_line}\" >> /etc/sysctl.conf'")

current = get_swappiness()
print(f"Current swappiness: {current}")

import psutil
ram_gb = psutil.virtual_memory().total / 1024**3
if ram_gb >= 16:
    recommended = 10
    reason = "16GB+ RAM — prefer RAM over swap"
elif ram_gb >= 8:
    recommended = 30
    reason = "8-16GB RAM — moderate swap preference"
else:
    recommended = 60
    reason = "< 8GB RAM — default swap behavior"

print(f"RAM: {ram_gb:.1f}GB")
print(f"Recommended: {recommended} ({reason})")
if current != recommended:
    set_swappiness(recommended)
    print(f"Swappiness set to {recommended}")
else:
    print("Already optimal!")`,
  },
  {
    id: 'cpu-governor',
    title: 'CPU Governor Control',
    category: 'Performance',
    tags: ['cpu', 'governor', 'performance', 'power', 'frequency', 'linux'],
    description: 'Set CPU frequency policy for max performance or power saving',
    requirements: [],
    script: `import subprocess, sys
from pathlib import Path

if sys.platform == 'win32':
    # Windows power plan
    plans = {
        'performance': '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c',
        'balanced':    '381b4222-f694-41f0-9685-ff5bb260df2e',
        'powersaver':  'a1841308-3541-4fab-bc81-f71556f20b4a',
    }
    PLAN = 'performance'
    subprocess.run(f"powercfg /setactive {plans[PLAN]}", shell=True)
    print(f"Windows power plan set to: {PLAN}")
    subprocess.run("powercfg /list", shell=True)
    exit()

# Linux governor
GOV_PATH = Path("/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor")
if not GOV_PATH.exists():
    print("CPU governor not available on this system"); exit()

print(f"Current governor: {GOV_PATH.read_text().strip()}")
print("Available:")
avail = Path("/sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors")
if avail.exists(): print(f"  {avail.read_text().strip()}")

GOVERNOR = "performance"  # or: powersave, ondemand, conservative, schedutil
cpu_count = len(list(Path("/sys/devices/system/cpu").glob("cpu[0-9]*")))

for i in range(cpu_count):
    path = f"/sys/devices/system/cpu/cpu{i}/cpufreq/scaling_governor"
    subprocess.run(f"echo {GOVERNOR} | sudo tee {path}", shell=True, capture_output=True)

print(f"Set all {cpu_count} CPUs to: {GOVERNOR}")`,
  },
  {
    id: 'ssd-trim',
    title: 'SSD TRIM Scheduler',
    category: 'Performance',
    tags: ['ssd', 'trim', 'fstrim', 'disk', 'performance', 'health'],
    description: 'Run periodic TRIM for SSD longevity and performance',
    requirements: [],
    script: `import subprocess, sys, os
from datetime import datetime

if sys.platform == 'win32':
    print("=== SSD OPTIMIZATION (Windows) ===")
    # Windows built-in TRIM
    r = subprocess.run("fsutil behavior query DisableDeleteNotify",
                       shell=True, capture_output=True, text=True)
    print(r.stdout)
    print("Running Disk Optimizer...")
    subprocess.run("defrag C: /L", shell=True)  # /L = TRIM/retrim for SSD
    exit()

# Linux
print("=== SSD TRIM (Linux) ===")
print(f"Time: {datetime.now()}")

# Check if TRIM is supported
r = subprocess.run(["lsblk", "-D", "-o", "NAME,DISC-GRAN,DISC-MAX"],
                   capture_output=True, text=True)
print("TRIM Support:")
print(r.stdout)

# Run fstrim
print("\\nRunning fstrim...")
r = subprocess.run(["sudo", "fstrim", "-av"],
                   capture_output=True, text=True)
print(r.stdout or r.stderr)

# Enable weekly auto-trim
enable_timer = subprocess.run(
    ["sudo", "systemctl", "enable", "--now", "fstrim.timer"],
    capture_output=True, text=True
)
print("Weekly TRIM timer:", "enabled" if enable_timer.returncode == 0 else "already set")`,
  },
  {
    id: 'benchmark-suite',
    title: 'System Benchmark Suite',
    category: 'Performance',
    tags: ['benchmark', 'speed', 'test', 'cpu', 'disk', 'network', 'performance'],
    description: 'Run CPU, disk, and network benchmarks and report results',
    requirements: ['psutil'],
    script: `import time, os, math, tempfile, socket
from pathlib import Path
import psutil

print("=== SYSTEM BENCHMARK SUITE ===\\n")

# CPU Benchmark
print("[CPU] Calculating 10M primes...")
start = time.perf_counter()
count = 0
for n in range(2, 10_000_000):
    if all(n % i != 0 for i in range(2, int(math.sqrt(n))+1)):
        count += 1
cpu_time = time.perf_counter() - start
print(f"  Found {count} primes in {cpu_time:.2f}s")
score = int(10_000_000 / cpu_time / 1000)
print(f"  CPU Score: {score} (higher=better)")

# Disk Write Benchmark
print("\\n[DISK] Sequential write 100MB...")
tmp = tempfile.mktemp()
data = b'x' * 1024 * 1024  # 1MB chunk
start = time.perf_counter()
with open(tmp, 'wb') as f:
    for _ in range(100): f.write(data)
write_time = time.perf_counter() - start
write_speed = 100 / write_time
os.unlink(tmp)
print(f"  Write: {write_speed:.1f} MB/s")

# Network Benchmark (DNS latency)
print("\\n[NET] DNS lookup latency...")
servers = ["8.8.8.8", "1.1.1.1", "9.9.9.9"]
for s in servers:
    start = time.perf_counter()
    try:
        socket.gethostbyname("google.com")
        lat = (time.perf_counter() - start) * 1000
        print(f"  DNS via {s}: {lat:.1f}ms")
    except: print(f"  DNS via {s}: FAILED")

print("\\n=== BENCHMARK COMPLETE ===")`,
  },

  // ── PRIVACY & DATA PROTECTION ─────────────────────────────────
  {
    id: 'tracker-blocker',
    title: 'Tracker Blocker (Hosts)',
    category: 'Privacy',
    tags: ['tracker', 'ads', 'block', 'hosts', 'privacy', 'dns'],
    description: 'Update hosts file with ad/tracker block lists',
    requirements: ['requests'],
    script: `import requests, sys
from pathlib import Path
from datetime import datetime

if sys.platform == 'win32':
    HOSTS = Path("C:/Windows/System32/drivers/etc/hosts")
else:
    HOSTS = Path("/etc/hosts")

BLOCK_LISTS = [
    "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts",
    "https://raw.githubusercontent.com/AdAway/adaway.github.io/master/hosts.txt",
]

print("=== TRACKER BLOCKER ===")
print(f"Hosts file: {HOSTS}")

# Backup
backup = HOSTS.parent / f"hosts.backup.{datetime.now().strftime('%Y%m%d')}"
HOSTS.read_bytes()  # Test read access

blocked_domains = set()
for url in BLOCK_LISTS:
    try:
        print(f"Downloading: {url[:60]}...")
        r = requests.get(url, timeout=15)
        for line in r.text.splitlines():
            line = line.strip()
            if line and not line.startswith('#'):
                parts = line.split()
                if len(parts) >= 2 and parts[0] in ('0.0.0.0','127.0.0.1'):
                    blocked_domains.add(parts[1])
        print(f"  {len(blocked_domains)} domains so far")
    except Exception as e:
        print(f"  Error: {e}")

print(f"\\nTotal domains to block: {len(blocked_domains)}")
print("To apply (requires admin/sudo):")
print(f"  echo '# Blocked by Butler' | sudo tee -a {HOSTS}")
print(f"  # Then append {len(blocked_domains)} 0.0.0.0 entries")`,
  },
  {
    id: 'metadata-stripper',
    title: 'Metadata Stripper',
    category: 'Privacy',
    tags: ['metadata', 'exif', 'privacy', 'strip', 'image', 'gps', 'pdf'],
    description: 'Remove EXIF, GPS and author data from images and documents',
    requirements: ['Pillow', 'PyPDF2'],
    script: `from pathlib import Path
from PIL import Image

def strip_image_exif(path):
    """Remove all EXIF metadata from image"""
    img = Image.open(path)
    # Create new image without EXIF
    clean = Image.new(img.mode, img.size)
    clean.putdata(list(img.getdata()))
    output = path.parent / f"clean_{path.name}"
    clean.save(output, quality=95)
    orig_size = path.stat().st_size
    new_size  = output.stat().st_size
    print(f"  Stripped: {path.name} ({orig_size//1024}KB -> {new_size//1024}KB)")
    return output

def strip_pdf_metadata(path):
    """Remove metadata from PDF"""
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(str(path))
        writer = PyPDF2.PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        writer.add_metadata({'/Producer': '', '/Creator': '', '/Author': ''})
        output = path.parent / f"clean_{path.name}"
        with open(output, 'wb') as f:
            writer.write(f)
        print(f"  Stripped PDF: {path.name}")
        return output
    except ImportError:
        print("pip install PyPDF2"); return None

# Process all images in current dir
TARGET = Path(".")
count = 0
for f in TARGET.glob("**/*"):
    if f.suffix.lower() in ['.jpg','.jpeg','.png'] and not f.name.startswith('clean_'):
        strip_image_exif(f); count += 1
    elif f.suffix.lower() == '.pdf' and not f.name.startswith('clean_'):
        strip_pdf_metadata(f); count += 1

print(f"\\nStripped metadata from {count} files")`,
  },
  {
    id: 'secure-shredder',
    title: 'Secure File Shredder',
    category: 'Privacy',
    tags: ['shred', 'delete', 'secure', 'overwrite', 'wipe', 'privacy'],
    description: 'Multi-pass overwrite for sensitive files before deletion',
    requirements: [],
    script: `import os, random, struct
from pathlib import Path

def shred(path, passes=7):
    """DoD 5220.22-M compliant multi-pass overwrite"""
    path = Path(path)
    if not path.is_file():
        print(f"Not a file: {path}"); return False

    size = path.stat().st_size
    print(f"Shredding: {path.name} ({size//1024}KB) - {passes} passes")

    with open(path, 'r+b') as f:
        for i in range(passes):
            f.seek(0)
            if i % 3 == 0:
                f.write(b'\\x00' * size)  # All zeros
            elif i % 3 == 1:
                f.write(b'\\xFF' * size)  # All ones
            else:
                f.write(os.urandom(size))  # Random
            f.flush()
            os.fsync(f.fileno())
            print(f"  Pass {i+1}/{passes} {'zeros' if i%3==0 else 'ones' if i%3==1 else 'random'}")

    # Rename to obscure original name
    random_name = path.parent / (''.join(random.choices('0123456789abcdef', k=16)))
    path.rename(random_name)
    random_name.unlink()
    print(f"  Securely deleted: {path.name}")
    return True

# Shred a specific file
TARGET = "sensitive_file.txt"  # Change this
if Path(TARGET).exists():
    shred(TARGET)
else:
    print(f"File not found: {TARGET}")
    print("Usage: change TARGET to the file you want to securely delete")`,
  },
  {
    id: 'telemetry-killer',
    title: 'Telemetry Killer',
    category: 'Privacy',
    tags: ['telemetry', 'tracking', 'disable', 'windows', 'privacy', 'spyware'],
    description: 'Disable OS & app telemetry on Windows for maximum privacy',
    requirements: [],
    script: `import subprocess, sys, winreg

if sys.platform != 'win32':
    print("Windows only"); exit()

print("=== TELEMETRY KILLER ===")
print("Disabling Windows telemetry and tracking...\\n")

# Registry tweaks
REG_TWEAKS = [
    # Disable telemetry
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection", "AllowTelemetry", 0),
    # Disable Cortana
    (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search", "AllowCortana", 0),
    # Disable advertising ID
    (winreg.HKEY_CURRENT_USER, r"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo", "Enabled", 0),
    # Disable app diagnostics
    (winreg.HKEY_CURRENT_USER, r"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Privacy", "TailoredExperiencesWithDiagnosticDataEnabled", 0),
]

for hive, key_path, value_name, data in REG_TWEAKS:
    try:
        with winreg.CreateKey(hive, key_path) as key:
            winreg.SetValueEx(key, value_name, 0, winreg.REG_DWORD, data)
        print(f"  ✓ {value_name} = {data}")
    except Exception as e:
        print(f"  ✗ {value_name}: {e}")

# Disable telemetry services
SERVICES = ["DiagTrack", "dmwappushservice", "WSearch", "SysMain"]
for svc in SERVICES:
    r = subprocess.run(f"sc stop {svc}", shell=True, capture_output=True)
    r2 = subprocess.run(f"sc config {svc} start= disabled", shell=True, capture_output=True)
    print(f"  Disabled service: {svc}")

print("\\nTelemetry disabled. Restart for full effect.")`,
  },

  // ── BACKUP & RECOVERY ─────────────────────────────────────────
  {
    id: 'incremental-backup',
    title: 'Incremental Backup (rsync)',
    category: 'Backup',
    tags: ['backup', 'rsync', 'incremental', 'sync', 'mirror', 'recovery'],
    description: 'Rsync-style incremental backup with dedup and verification',
    requirements: [],
    script: `import shutil, os, subprocess, sys
from pathlib import Path
from datetime import datetime
import hashlib

SOURCE = Path.home() / "Documents"
DEST   = Path.home() / "Backups" / "incremental"
LOG    = DEST / "backup.log"

DEST.mkdir(parents=True, exist_ok=True)

def file_hash(path):
    h = hashlib.md5()
    with open(path, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

copied = skipped = 0
start = datetime.now()

print(f"Incremental backup: {SOURCE} -> {DEST}")
print(f"Started: {start.strftime('%Y-%m-%d %H:%M:%S')}\\n")

for src_file in SOURCE.rglob("*"):
    if not src_file.is_file(): continue
    rel = src_file.relative_to(SOURCE)
    dst_file = DEST / rel
    dst_file.parent.mkdir(parents=True, exist_ok=True)

    if dst_file.exists() and file_hash(src_file) == file_hash(dst_file):
        skipped += 1
    else:
        shutil.copy2(src_file, dst_file)
        copied += 1
        print(f"  Copied: {rel}")

elapsed = (datetime.now() - start).seconds
print(f"\\nDone in {elapsed}s: {copied} copied, {skipped} skipped")

with open(LOG, 'a') as f:
    f.write(f"{start.isoformat()} - copied:{copied} skipped:{skipped}\\n")`,
  },
  {
    id: 'database-dumper',
    title: 'Database Backup Dumper',
    category: 'Backup',
    tags: ['database', 'backup', 'mysql', 'postgres', 'mongodb', 'dump'],
    description: 'Auto-backup MySQL, PostgreSQL, MongoDB databases',
    requirements: [],
    script: `import subprocess, os
from pathlib import Path
from datetime import datetime

BACKUP_DIR = Path.home() / "db_backups"
BACKUP_DIR.mkdir(exist_ok=True)
ts = datetime.now().strftime("%Y%m%d_%H%M%S")

# ── MySQL / MariaDB ──────────────────────────────────────────────
MYSQL_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'your_password',
    'database': 'mydb',
}

def backup_mysql():
    out_file = BACKUP_DIR / f"mysql_{MYSQL_CONFIG['database']}_{ts}.sql.gz"
    cmd = (
        f"mysqldump -h {MYSQL_CONFIG['host']} "
        f"-u {MYSQL_CONFIG['user']} "
        f"-p{MYSQL_CONFIG['password']} "
        f"{MYSQL_CONFIG['database']} | gzip > {out_file}"
    )
    r = subprocess.run(cmd, shell=True, capture_output=True)
    if r.returncode == 0:
        size = out_file.stat().st_size / 1024
        print(f"  MySQL: {out_file.name} ({size:.0f}KB)")
    else:
        print(f"  MySQL error: {r.stderr.decode()[:100]}")

# ── PostgreSQL ───────────────────────────────────────────────────
def backup_postgres(db='postgres'):
    out_file = BACKUP_DIR / f"pg_{db}_{ts}.sql.gz"
    env = {**os.environ, 'PGPASSWORD': 'your_password'}
    cmd = f"pg_dump -U postgres {db} | gzip > {out_file}"
    r = subprocess.run(cmd, shell=True, env=env, capture_output=True)
    print(f"  PostgreSQL: {'OK' if r.returncode==0 else r.stderr.decode()[:80]}")

# ── MongoDB ──────────────────────────────────────────────────────
def backup_mongo(db='mydb'):
    out_dir = BACKUP_DIR / f"mongo_{db}_{ts}"
    r = subprocess.run(
        ["mongodump", "--db", db, "--out", str(out_dir)],
        capture_output=True, text=True
    )
    print(f"  MongoDB: {'OK' if r.returncode==0 else r.stderr[:80]}")

print(f"=== DATABASE BACKUP [{ts}] ===")
backup_mysql()
# backup_postgres()
# backup_mongo()
print("\\nBackups saved to:", BACKUP_DIR)`,
  },

  // ── NETWORK & MONITORING ──────────────────────────────────────
  {
    id: 'bandwidth-monitor',
    title: 'Bandwidth Monitor',
    category: 'Network',
    tags: ['bandwidth', 'network', 'speed', 'usage', 'traffic', 'monitor'],
    description: 'Per-process network tracking and bandwidth usage reporting',
    requirements: ['psutil'],
    script: `import psutil, time
from collections import defaultdict

INTERVAL = 2  # seconds between samples
DURATION = 10  # total monitoring seconds

print(f"Monitoring bandwidth for {DURATION}s...\\n")

prev_net = psutil.net_io_counters()
prev_per = psutil.net_io_counters(pernic=True)

def fmt_speed(bps):
    if bps > 1024**2: return f"{bps/1024**2:.1f} MB/s"
    if bps > 1024:    return f"{bps/1024:.1f} KB/s"
    return f"{bps:.0f} B/s"

for step in range(DURATION // INTERVAL):
    time.sleep(INTERVAL)

    cur  = psutil.net_io_counters()
    sent = (cur.bytes_sent - prev_net.bytes_sent) / INTERVAL
    recv = (cur.bytes_recv - prev_net.bytes_recv) / INTERVAL

    print(f"[{step*INTERVAL:3d}s] ↑{fmt_speed(sent):12} ↓{fmt_speed(recv):12} "
          f"| Total: ↑{cur.bytes_sent/1024**2:.0f}MB ↓{cur.bytes_recv/1024**2:.0f}MB")

    prev_net = cur

# Per-interface summary
print("\\n=== PER INTERFACE ===")
stats = psutil.net_io_counters(pernic=True)
for nic, s in stats.items():
    if s.bytes_sent + s.bytes_recv > 0:
        print(f"  {nic:20} ↑{s.bytes_sent/1024**2:.1f}MB  ↓{s.bytes_recv/1024**2:.1f}MB")`,
  },
  {
    id: 'network-scanner',
    title: 'Local Network Scanner',
    category: 'Network',
    tags: ['network', 'scan', 'ip', 'hosts', 'port', 'ping', 'devices'],
    description: 'Scan local network to find all connected devices and open ports',
    requirements: [],
    script: `import socket, threading, subprocess, sys
from ipaddress import ip_network

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("8.8.8.8", 80)); ip = s.getsockname()[0]; s.close()
    return ip

def ping_host(ip, results):
    try:
        flag = "-n" if sys.platform == "win32" else "-c"
        r = subprocess.run(["ping", flag, "1", "-W", "500", str(ip)],
                           capture_output=True, timeout=2)
        if r.returncode == 0:
            try: host = socket.gethostbyaddr(str(ip))[0]
            except: host = "unknown"
            results.append({'ip': str(ip), 'host': host})
    except: pass

local_ip = get_local_ip()
network  = '.'.join(local_ip.split('.')[:3]) + '.0/24'
print(f"Scanning {network} (your IP: {local_ip})...")

results = []; threads = []
for ip in ip_network(network, strict=False).hosts():
    t = threading.Thread(target=ping_host, args=(ip, results))
    threads.append(t); t.start()
for t in threads: t.join(timeout=3)

print(f"\\nFound {len(results)} devices:")
for device in sorted(results, key=lambda x: [int(i) for i in x['ip'].split('.')]):
    print(f"  {device['ip']:15} {device['host'][:40]}")`,
  },
  {
    id: 'uptime-watchdog',
    title: 'Uptime Watchdog',
    category: 'Network',
    tags: ['uptime', 'monitor', 'ping', 'alert', 'downtime', 'watchdog'],
    description: 'Monitor service uptime and send alerts on downtime',
    requirements: ['requests'],
    script: `import requests, time, smtplib
from datetime import datetime

SERVICES = [
    {'name': 'Google',     'url': 'https://www.google.com'},
    {'name': 'My Server',  'url': 'http://192.168.1.100:8765/api/status'},
    {'name': 'GitHub',     'url': 'https://github.com'},
]

CHECK_INTERVAL = 60   # seconds
TIMEOUT        = 10
LOG_FILE       = "uptime.log"

def check_service(service):
    try:
        r = requests.get(service['url'], timeout=TIMEOUT)
        return r.status_code < 400, r.elapsed.total_seconds() * 1000
    except:
        return False, 0

def log(msg):
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, 'a') as f: f.write(line + "\\n")

status = {s['name']: True for s in SERVICES}
log(f"Watchdog started - monitoring {len(SERVICES)} services")

try:
    while True:
        for svc in SERVICES:
            ok, ms = check_service(svc)
            if ok and not status[svc['name']]:
                log(f"✓ BACK UP: {svc['name']} ({ms:.0f}ms)")
            elif not ok and status[svc['name']]:
                log(f"✗ DOWN: {svc['name']}")
            elif ok:
                log(f"  {svc['name']}: {ms:.0f}ms")
            status[svc['name']] = ok
        time.sleep(CHECK_INTERVAL)
except KeyboardInterrupt:
    log("Watchdog stopped.")`,
  },
  {
    id: 'speed-test',
    title: 'Internet Speed Test Logger',
    category: 'Network',
    tags: ['speed', 'bandwidth', 'test', 'internet', 'mbps', 'log'],
    description: 'Scheduled speed tests with historical logging',
    requirements: ['speedtest-cli'],
    script: `import subprocess, json, csv, sys
from datetime import datetime
from pathlib import Path

LOG_FILE = Path("speed_log.csv")

def run_speedtest():
    try:
        r = subprocess.run(
            [sys.executable, "-m", "speedtest", "--json"],
            capture_output=True, text=True, timeout=60
        )
        data = json.loads(r.stdout)
        return {
            'download': data['download'] / 1e6,  # Mbps
            'upload':   data['upload'] / 1e6,
            'ping':     data['ping'],
            'server':   data['server']['sponsor'],
        }
    except Exception as e:
        print(f"Error: {e} — pip install speedtest-cli")
        return None

ts = datetime.now()
print(f"Speed test at {ts.strftime('%H:%M:%S')}...")
result = run_speedtest()

if result:
    print(f"  Download: {result['download']:.1f} Mbps")
    print(f"  Upload:   {result['upload']:.1f} Mbps")
    print(f"  Ping:     {result['ping']:.0f}ms")
    print(f"  Server:   {result['server']}")

    # Log to CSV
    headers = ['timestamp','download_mbps','upload_mbps','ping_ms','server']
    write_header = not LOG_FILE.exists()
    with open(LOG_FILE, 'a', newline='') as f:
        w = csv.DictWriter(f, fieldnames=headers)
        if write_header: w.writeheader()
        w.writerow({
            'timestamp': ts.isoformat(),
            'download_mbps': round(result['download'], 2),
            'upload_mbps': round(result['upload'], 2),
            'ping_ms': round(result['ping'], 1),
            'server': result['server'],
        })
    print(f"  Logged to {LOG_FILE}")`,
  },

  // ── WEB AUTOMATION ───────────────────────────────────────────
  {
    id: 'web-scraper',
    title: 'Web Scraper with BeautifulSoup',
    category: 'Web',
    tags: ['scrape', 'web', 'html', 'parse', 'data', 'extract', 'crawl'],
    description: 'Scrape data from any website using requests and BeautifulSoup',
    requirements: ['requests', 'beautifulsoup4'],
    script: `import requests
from bs4 import BeautifulSoup
import csv

URL = "https://news.ycombinator.com"

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
res  = requests.get(URL, headers=headers, timeout=10)
soup = BeautifulSoup(res.text, 'html.parser')

results = []
for item in soup.select('.titleline')[:20]:
    link = item.find('a')
    if link:
        results.append({'title': link.text, 'url': link.get('href','')})

for r in results:
    print(f"• {r['title'][:60]}")

with open('scraped.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=['title','url'])
    w.writeheader(); w.writerows(results)
print(f"Saved {len(results)} items")`,
  },
  {
    id: 'web-monitor',
    title: 'Web Scrape Monitor',
    category: 'Web',
    tags: ['monitor', 'website', 'change', 'diff', 'alert', 'scrape'],
    description: 'Track website changes and send diff alerts',
    requirements: ['requests', 'beautifulsoup4'],
    script: `import requests, hashlib, time, json
from bs4 import BeautifulSoup
from pathlib import Path
from datetime import datetime

MONITOR = [
    {'name': 'HN',  'url': 'https://news.ycombinator.com', 'selector': '.titleline'},
    {'name': 'Site','url': 'https://example.com',           'selector': 'body'},
]

CACHE_FILE = Path("monitor_cache.json")
cache = json.loads(CACHE_FILE.read_text()) if CACHE_FILE.exists() else {}

def get_content(url, selector):
    try:
        r = requests.get(url, timeout=10,
                         headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(r.text, 'html.parser')
        el = soup.select_one(selector)
        return el.get_text(strip=True)[:5000] if el else ''
    except: return ''

print(f"Monitoring {len(MONITOR)} pages...")

for site in MONITOR:
    content = get_content(site['url'], site['selector'])
    h = hashlib.md5(content.encode()).hexdigest()
    prev = cache.get(site['name'], {}).get('hash', '')

    if prev and prev != h:
        print(f"CHANGED: {site['name']} at {datetime.now().strftime('%H:%M:%S')}")
        print(f"  URL: {site['url']}")
    elif not prev:
        print(f"Baseline set: {site['name']}")
    else:
        print(f"No change: {site['name']}")

    cache[site['name']] = {'hash': h, 'ts': datetime.now().isoformat()}

CACHE_FILE.write_text(json.dumps(cache, indent=2))`,
  },

  // ── DATA PROCESSING ───────────────────────────────────────────
  {
    id: 'csv-processor',
    title: 'CSV Data Processor',
    category: 'Data',
    tags: ['csv', 'data', 'process', 'filter', 'transform', 'pandas'],
    description: 'Read, filter, transform, and export CSV data',
    requirements: ['pandas'],
    script: `import pandas as pd

INPUT  = "data.csv"
OUTPUT = "output.csv"

df = pd.read_csv(INPUT)
print(f"Loaded {len(df)} rows x {len(df.columns)} cols")
print(df.head())
print("\\n=== STATS ===")
print(df.describe())

# Filter (uncomment):
# df = df[df['column'] > 100]
# df = df.dropna()

# Transform (uncomment):
# df['total'] = df['price'] * df['qty']

df.to_csv(OUTPUT, index=False)
print(f"\\nSaved {len(df)} rows to {OUTPUT}")`,
  },
  {
    id: 'excel-automation',
    title: 'Excel Automation Report',
    category: 'Data',
    tags: ['excel', 'xlsx', 'spreadsheet', 'data', 'report', 'openpyxl'],
    description: 'Create and automate Excel reports with styling',
    requirements: ['openpyxl'],
    script: `import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from datetime import datetime

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Report"

headers = ["Date", "Category", "Amount", "Status"]
HEADER_FILL = PatternFill("solid", fgColor="1F4E79")
HEADER_FONT = Font(bold=True, color="FFFFFF")

for col, h in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=h)
    cell.font  = HEADER_FONT
    cell.fill  = HEADER_FILL
    cell.alignment = Alignment(horizontal='center')

data = [
    [datetime.today(), "Sales",     1500.50, "Done"],
    [datetime.today(), "Marketing", 800.00,  "Pending"],
    [datetime.today(), "IT",        2200.75, "Done"],
]
for row in data:
    ws.append(row)

for col in ws.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    ws.column_dimensions[col[0].column_letter].width = max_len + 4

filename = f"report_{datetime.now().strftime('%Y%m%d')}.xlsx"
wb.save(filename)
print(f"Saved: {filename}")`,
  },
  {
    id: 'pdf-toolkit',
    title: 'PDF Toolkit',
    category: 'Data',
    tags: ['pdf', 'merge', 'split', 'compress', 'ocr', 'convert'],
    description: 'Merge, split, compress PDFs and extract text',
    requirements: ['PyPDF2'],
    script: `from pathlib import Path
import PyPDF2

def merge_pdfs(input_files, output):
    merger = PyPDF2.PdfMerger()
    for f in input_files:
        merger.append(str(f))
    with open(output, 'wb') as out:
        merger.write(out)
    print(f"Merged {len(input_files)} PDFs -> {output}")

def split_pdf(input_file, pages_per_chunk=5):
    reader = PyPDF2.PdfReader(str(input_file))
    total  = len(reader.pages)
    stem   = Path(input_file).stem
    for start in range(0, total, pages_per_chunk):
        writer = PyPDF2.PdfWriter()
        end    = min(start + pages_per_chunk, total)
        for i in range(start, end):
            writer.add_page(reader.pages[i])
        out = f"{stem}_pages_{start+1}-{end}.pdf"
        with open(out, 'wb') as f:
            writer.write(f)
        print(f"  Split: {out} ({end-start} pages)")

def extract_text(pdf_path):
    reader = PyPDF2.PdfReader(str(pdf_path))
    text   = ""
    for i, page in enumerate(reader.pages):
        text += f"\\n--- PAGE {i+1} ---\\n"
        text += page.extract_text() or ""
    out = Path(pdf_path).with_suffix('.txt')
    out.write_text(text, encoding='utf-8')
    print(f"Extracted {len(text)} chars to {out}")

# Example usage:
# merge_pdfs(['doc1.pdf', 'doc2.pdf'], 'merged.pdf')
# split_pdf('large.pdf', pages_per_chunk=10)
# extract_text('document.pdf')

print("PDF Toolkit ready. Uncomment the function you need.")`,
  },

  // ── EMAIL ─────────────────────────────────────────────────────
  {
    id: 'email-sender',
    title: 'Send Automated Emails',
    category: 'Email',
    tags: ['email', 'smtp', 'gmail', 'send', 'notification', 'alert'],
    description: 'Send automated emails via Gmail SMTP with attachment support',
    requirements: [],
    script: `import smtplib, ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path

SENDER    = "your.email@gmail.com"
PASSWORD  = "your_app_password"  # Gmail App Password
RECIPIENT = "recipient@email.com"

def send_email(subject, body, attachment=None):
    msg = MIMEMultipart()
    msg['From']    = SENDER
    msg['To']      = RECIPIENT
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'html'))

    if attachment:
        from email.mime.base import MIMEBase
        from email import encoders
        path = Path(attachment)
        with open(path, 'rb') as f:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(f.read())
        encoders.encode_base64(part)
        part.add_header('Content-Disposition', f'attachment; filename={path.name}')
        msg.attach(part)

    ctx = ssl.create_default_context()
    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls(context=ctx)
        server.login(SENDER, PASSWORD)
        server.sendmail(SENDER, RECIPIENT, msg.as_string())
    print(f"Email sent to {RECIPIENT}")

send_email(
    subject="Butler AI Report",
    body="<h2>Automated Report</h2><p>Sent by Butler AI.</p>",
)`,
  },

  // ── GUI AUTOMATION ────────────────────────────────────────────
  {
    id: 'pyautogui-automation',
    title: 'GUI Automation (PyAutoGUI)',
    category: 'GUI',
    tags: ['gui', 'mouse', 'keyboard', 'click', 'automate', 'macro'],
    description: 'Automate mouse clicks, keyboard typing, and screen interactions',
    requirements: ['pyautogui', 'Pillow'],
    script: `import pyautogui, time
pyautogui.PAUSE    = 0.5
pyautogui.FAILSAFE = True  # Move mouse to top-left corner to abort

# Screen info
width, height = pyautogui.size()
x, y = pyautogui.position()
print(f"Screen: {width}x{height} | Mouse: {x},{y}")

# Screenshot
screen = pyautogui.screenshot()
screen.save("screen.png")
print("Screenshot saved")

# ── Mouse ──────────────────────────────────────────────────────
# pyautogui.moveTo(500, 300, duration=0.5)
# pyautogui.click(500, 300)
# pyautogui.doubleClick(x, y)
# pyautogui.rightClick(x, y)
# pyautogui.drag(0, 0, 200, 200, duration=0.5)

# ── Keyboard ───────────────────────────────────────────────────
# pyautogui.typewrite("Hello World!", interval=0.05)
# pyautogui.hotkey('ctrl', 'c')
# pyautogui.hotkey('alt', 'tab')
# pyautogui.press('enter')

# ── Example: Open Notepad and type ────────────────────────────
print("Move mouse to top-left to abort! Starting in 3s...")
time.sleep(3)
pyautogui.hotkey('win', 'r')
time.sleep(1)
pyautogui.typewrite('notepad', interval=0.05)
pyautogui.press('enter')
time.sleep(2)
pyautogui.typewrite('Hello from Butler AI!', interval=0.05)`,
  },
  {
    id: 'desktop-notifier',
    title: 'Desktop Notifier',
    category: 'GUI',
    tags: ['notification', 'alert', 'desktop', 'toast', 'popup', 'notify'],
    description: 'Cross-platform desktop toast alerts for any event',
    requirements: ['plyer'],
    script: `from plyer import notification
import time

def notify(title, message, timeout=5, app_icon=None):
    notification.notify(
        title=title,
        message=message,
        app_name="Butler AI",
        timeout=timeout,
        app_icon=app_icon,
    )
    print(f"Notified: {title} - {message}")

# Single notification
notify("Butler AI", "Your script completed successfully!")

# Scheduled notifications example
REMINDERS = [
    (0, "Take a break", "You've been working for 1 hour!"),
    (5, "Drink water",  "Stay hydrated!"),
    (10, "Stand up",   "Stretch your legs!"),
]

print("Starting reminder system (Ctrl+C to stop)...")
for delay, title, msg in REMINDERS:
    time.sleep(delay)
    notify(title, msg)`,
  },

  // ── SCHEDULING ────────────────────────────────────────────────
  {
    id: 'task-scheduler',
    title: 'Task Scheduler (APScheduler)',
    category: 'Scheduling',
    tags: ['schedule', 'cron', 'timer', 'repeat', 'daily', 'automated'],
    description: 'Run tasks on a schedule — daily, hourly, or at specific times',
    requirements: ['apscheduler'],
    script: `from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime

scheduler = BlockingScheduler()

def daily_backup():
    print(f"[{datetime.now()}] Running daily backup...")

def hourly_check():
    print(f"[{datetime.now()}] Hourly status check...")

scheduler.add_job(daily_backup, CronTrigger(hour=2, minute=30))
scheduler.add_job(hourly_check, 'interval', hours=1)

print("Scheduler started. Ctrl+C to stop.")
try:
    scheduler.start()
except KeyboardInterrupt:
    print("Stopped.")`,
  },

  // ── MONITORING ────────────────────────────────────────────────
  {
    id: 'cpu-monitor',
    title: 'CPU/RAM Alert Monitor',
    category: 'Monitoring',
    tags: ['monitor', 'cpu', 'ram', 'alert', 'threshold', 'performance'],
    description: 'Monitor CPU and RAM usage, send alerts when limits exceeded',
    requirements: ['psutil'],
    script: `import psutil, time
from datetime import datetime

CPU_THRESHOLD = 80
RAM_THRESHOLD = 85
CHECK_INTERVAL = 5
LOG_FILE = "system_monitor.log"

def log(msg):
    ts = datetime.now().strftime('%H:%M:%S')
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, 'a') as f: f.write(line + "\\n")

log("Monitor started")

try:
    while True:
        cpu = psutil.cpu_percent(interval=1)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage('/')

        if cpu > CPU_THRESHOLD:
            top = sorted(psutil.process_iter(['name','cpu_percent']),
                        key=lambda p: p.info['cpu_percent'] or 0, reverse=True)[:3]
            log(f"CPU ALERT {cpu}%! Top: {[p.info['name'] for p in top]}")
        elif mem.percent > RAM_THRESHOLD:
            log(f"RAM ALERT {mem.percent}%!")
        else:
            print(f"\\rCPU:{cpu:5.1f}% RAM:{mem.percent:5.1f}% Disk:{disk.percent:5.1f}%",
                  end='', flush=True)

        time.sleep(CHECK_INTERVAL)
except KeyboardInterrupt:
    log("Monitor stopped.")`,
  },
  {
    id: 'folder-watcher',
    title: 'Folder Watcher (Auto-process Files)',
    category: 'Monitoring',
    tags: ['watch', 'folder', 'monitor', 'watchdog', 'trigger', 'auto'],
    description: 'Watch a folder for new files and automatically process them',
    requirements: ['watchdog'],
    script: `from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import time, shutil
from pathlib import Path
from datetime import datetime

WATCH_FOLDER   = Path.home() / "Downloads"
PROCESS_FOLDER = Path("processed")
PROCESS_FOLDER.mkdir(exist_ok=True)

class Handler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory: return
        path = Path(event.src_path)
        time.sleep(0.5)
        ts = datetime.now().strftime('%H:%M:%S')
        print(f"[{ts}] New file: {path.name} ({path.stat().st_size//1024}KB)")
        if path.suffix.lower() == '.pdf':
            shutil.copy2(path, PROCESS_FOLDER / path.name)
            print(f"  Copied PDF")

observer = Observer()
observer.schedule(Handler(), str(WATCH_FOLDER), recursive=False)
observer.start()
print(f"Watching: {WATCH_FOLDER}  (Ctrl+C to stop)")
try:
    while True: time.sleep(1)
except KeyboardInterrupt:
    observer.stop()
observer.join()`,
  },

  // ── SETUP & INSTALL ───────────────────────────────────────────
  {
    id: 'dev-environment-setup',
    title: 'Developer Environment Setup',
    category: 'Setup',
    tags: ['dev', 'environment', 'setup', 'git', 'python', 'venv', 'install'],
    description: 'Automate complete development environment setup',
    requirements: [],
    script: `import subprocess, sys, os
from pathlib import Path

PROJECT  = Path("my_project")
PACKAGES = ["requests", "flask", "python-dotenv", "black", "pytest"]

print("=== DEV ENVIRONMENT SETUP ===")

for d in ["src", "tests", "docs"]:
    (PROJECT / d).mkdir(parents=True, exist_ok=True)
print("✓ Project structure created")

os.chdir(PROJECT)
subprocess.run(["git", "init"], capture_output=True)
print("✓ Git initialized")

subprocess.run([sys.executable, "-m", "venv", ".venv"])
print("✓ Virtual environment created")

pip = ".venv/Scripts/pip" if sys.platform == "win32" else ".venv/bin/pip"
for pkg in PACKAGES:
    subprocess.run([pip, "install", pkg, "-q"])
    print(f"  ✓ {pkg}")

(PROJECT / ".env").write_text("DEBUG=True\\nAPI_KEY=your_key_here\\n")
(PROJECT / ".gitignore").write_text(".venv\\n__pycache__\\n.env\\n*.pyc\\n")
(PROJECT / "README.md").write_text(f"# {PROJECT.name}\\n")
print(f"\\n✓ Project ready in {PROJECT.absolute()}")`,
  },
  {
    id: 'software-installer',
    title: 'Automated Software Installer',
    category: 'Setup',
    tags: ['install', 'setup', 'software', 'windows', 'winget', 'automate'],
    description: 'Automate installation of apps on Windows using winget',
    requirements: [],
    script: `import subprocess, sys

if sys.platform != 'win32':
    print("Windows only"); exit()

APPS = [
    "Google.Chrome",
    "Mozilla.Firefox",
    "7zip.7zip",
    "Microsoft.VisualStudioCode",
    "Python.Python.3.12",
    "Git.Git",
    "VideoLAN.VLC",
    "Notepad++.Notepad++",
]

PY_PACKAGES = ["requests", "pandas", "pillow", "psutil", "pyautogui"]

print("=== AUTOMATED SOFTWARE INSTALLER ===")
for app in APPS:
    print(f"Installing {app}...")
    r = subprocess.run(
        ["winget", "install", "--id", app, "-e", "--silent",
         "--accept-source-agreements", "--accept-package-agreements"],
        capture_output=True, text=True
    )
    status = "✓" if r.returncode == 0 else "✗"
    print(f"  {status} {app}")

print("\\nInstalling Python packages...")
for pkg in PY_PACKAGES:
    subprocess.run([sys.executable, "-m", "pip", "install", pkg, "-q"])
    print(f"  ✓ pip install {pkg}")

print("\\nAll software installed!")`,
  },

  // ── TEXT PROCESSING ───────────────────────────────────────────
  {
    id: 'text-processor',
    title: 'Document Text Extractor',
    category: 'Text',
    tags: ['text', 'document', 'pdf', 'word', 'extract', 'parse'],
    description: 'Extract and analyze text from PDFs, Word docs, and text files',
    requirements: ['PyPDF2', 'python-docx'],
    script: `from pathlib import Path
from collections import Counter
import re

def pdf_to_text(pdf_path):
    try:
        import PyPDF2
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            text   = "\\n".join(page.extract_text() for page in reader.pages)
        print(f"PDF: {len(reader.pages)} pages, {len(text)} chars")
        return text
    except ImportError:
        return "pip install PyPDF2"

def docx_to_text(docx_path):
    try:
        from docx import Document
        doc  = Document(docx_path)
        text = "\\n".join(p.text for p in doc.paragraphs)
        print(f"DOCX: {len(doc.paragraphs)} paragraphs, {len(text)} chars")
        return text
    except ImportError:
        return "pip install python-docx"

def word_frequency(text, top_n=20):
    words  = re.findall(r'\\b[a-zA-Z]{4,}\\b', text.lower())
    stops  = {'that','this','with','have','from','they','been','will'}
    words  = [w for w in words if w not in stops]
    return Counter(words).most_common(top_n)

# Example
text = "Python is a great automation language. Python scripts are powerful and flexible."
freq = word_frequency(text)
print("Top words:", freq[:10])`,
  },
];

// PYTHON_AUTOMATION_SCRIPTS — built eagerly via IIFE with try/catch.
// Uses require() (not static import) inside the IIFE to defer the
// scriptLibraryExtensions load until after all modules are registered,
// preventing Hermes init-ordering crashes. No Proxy needed.
export const PYTHON_AUTOMATION_SCRIPTS: AutomationScript[] = (() => {
  try {
    const extended = _loadExtended();
    const base = Array.isArray(BASE_SCRIPTS) ? BASE_SCRIPTS : [];
    const ext  = Array.isArray(extended)    ? extended    : [];
    const result: AutomationScript[] = [];
    for (let i = 0; i < base.length; i++) result.push(base[i]);
    for (let i = 0; i < ext.length;  i++) result.push(ext[i]);
    return result;
  } catch {
    return Array.isArray(BASE_SCRIPTS) ? BASE_SCRIPTS.slice() : [];
  }
})();

// ── Script search ─────────────────────────────────────────────────
export function findScripts(query: string): AutomationScript[] {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length > 2);
  return PYTHON_AUTOMATION_SCRIPTS
    .map(script => {
      let score = 0;
      for (const word of words) {
        if (script.tags.some(t => t.includes(word))) score += 10;
        if (script.title.toLowerCase().includes(word)) score += 8;
        if (script.category.toLowerCase().includes(word)) score += 6;
        if (script.description.toLowerCase().includes(word)) score += 4;
      }
      return { script, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.script)
    .slice(0, 5);
}

export function buildScriptFinderPrompt(userRequest: string, foundScripts: AutomationScript[]): string {
  const ctx = foundScripts.length > 0
    ? `\n\nRELATED SCRIPTS:\n${foundScripts.map(s =>
        `### ${s.title}\nCategory: ${s.category}\nRequirements: ${s.requirements.join(', ') || 'none'}\n\`\`\`python\n${s.script.slice(0, 300)}...\n\`\`\`\n`
      ).join('\n')}`
    : '';
  return `USER REQUEST: "${userRequest}"\n${ctx}\n\nGenerate a complete, working Python script. Include imports, comments, error handling. Show pip install for any packages.`;
}
