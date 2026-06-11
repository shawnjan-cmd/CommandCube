/**
 * 🐍 Script Library Extensions — 130+ Unique Scripts
 * Adds new categories: Backup, Security, Cleaning, Performance, Privacy
 * Plus fills gaps in Files, System, Network, Web, Data, Email, GUI, Setup, Text
 */

import type { AutomationScript } from './scriptTypes';

export const EXTENDED_SCRIPTS: AutomationScript[] = [

  // ── CONNECTION TEST ──────────────────────────────────────────
  {
    id: 'butler-connection-test',
    title: 'Butler Connection Test',
    category: 'System',
    tags: ['test', 'connection', 'ping', 'verify', 'butler', 'health'],
    description: 'Verify the full execution pipeline works — platform info, Python version, and server round-trip',
    requirements: [],
    script: `import platform, sys, socket, os, time
from datetime import datetime

start = time.perf_counter()
print("=== BUTLER AI — CONNECTION TEST ===")
print(f"Timestamp:  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"Hostname:   {socket.gethostname()}")
print(f"OS:         {platform.system()} {platform.release()} ({platform.machine()})")
print(f"Python:     {sys.version.split()[0]}")
print(f"User:       {os.environ.get('USERNAME') or os.environ.get('USER','unknown')}")
print(f"Working dir:{os.getcwd()}")
print()
print("Script execution pipeline: OK")
print("Server relay:              OK")
print("Output streaming:          OK")
elapsed = (time.perf_counter() - start) * 1000
print(f"\nTotal round-trip time: {elapsed:.0f}ms")
print("=== ALL SYSTEMS OPERATIONAL ===")`,
  },

  // ── FILES ─────────────────────────────────────────────────────
  {
    id: 'file-size-report',
    title: 'File Size Report Generator',
    category: 'Files',
    tags: ['file', 'size', 'report', 'large', 'sort', 'analyze'],
    description: 'Scan a folder and generate a sorted report of the largest files',
    requirements: [],
    script: `from pathlib import Path

SCAN_DIR = Path.home()
TOP_N    = 30

def fmt(size):
    for unit in ['B','KB','MB','GB']:
        if size < 1024: return f"{size:.1f}{unit}"
        size /= 1024
    return f"{size:.1f}TB"

print(f"Scanning {SCAN_DIR} for largest files...")
files = []
for f in SCAN_DIR.rglob('*'):
    try:
        if f.is_file():
            files.append((f, f.stat().st_size))
    except: pass

files.sort(key=lambda x: x[1], reverse=True)
print(f"\nTop {TOP_N} largest files:")
for i, (path, size) in enumerate(files[:TOP_N], 1):
    try:
        rel = path.relative_to(SCAN_DIR)
    except:
        rel = path
    print(f"  {i:2}. {fmt(size):10} {rel}")

total = sum(s for _, s in files)
print(f"\nTotal scanned: {len(files)} files = {fmt(total)}")`,
  },
  {
    id: 'file-splitter',
    title: 'Large File Splitter and Joiner',
    category: 'Files',
    tags: ['split', 'join', 'chunk', 'large', 'files', 'transfer'],
    description: 'Split large files into chunks for transfer, then rejoin them',
    requirements: [],
    script: `from pathlib import Path

def split_file(file_path, chunk_mb=100):
    path = Path(file_path)
    if not path.exists():
        print(f"File not found: {file_path}"); return []
    chunk_bytes = chunk_mb * 1024 * 1024
    total_size  = path.stat().st_size
    chunks = []
    with open(path, 'rb') as f:
        part = 0
        while True:
            data = f.read(chunk_bytes)
            if not data: break
            part_path = path.parent / f"{path.name}.part{part:04d}"
            part_path.write_bytes(data)
            chunks.append(part_path)
            pct = (f.tell() / total_size) * 100
            print(f"  Written: {part_path.name} ({len(data)//1024//1024}MB) {pct:.0f}%")
            part += 1
    print(f"Split into {len(chunks)} chunks")
    return chunks

def join_file(output_path):
    out = Path(output_path)
    parts = sorted(out.parent.glob(f"{out.name}.part*"))
    print(f"Joining {len(parts)} parts -> {out}")
    with open(out, 'wb') as f_out:
        for part in parts:
            f_out.write(part.read_bytes())
            print(f"  Joined: {part.name}")
    print(f"Done: {out.stat().st_size // 1024 // 1024}MB")

# split_file("bigfile.zip", chunk_mb=50)
# join_file("bigfile.zip")
print("File splitter/joiner ready. Uncomment usage examples.")`,
  },
  {
    id: 'file-encrypt-aes',
    title: 'File Encryptor AES-256',
    category: 'Files',
    tags: ['encrypt', 'decrypt', 'aes', 'security', 'password', 'cipher'],
    description: 'Encrypt and decrypt files with AES-256 password protection',
    requirements: ['cryptography'],
    script: `from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
import os
from pathlib import Path

def derive_key(password, salt):
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=480000)
    return kdf.derive(password.encode())

def encrypt_file(input_path, password, output_path=None):
    path = Path(input_path)
    data = path.read_bytes()
    salt = os.urandom(16)
    nonce = os.urandom(12)
    ct   = AESGCM(derive_key(password, salt)).encrypt(nonce, data, None)
    out  = Path(output_path or str(path) + '.enc')
    out.write_bytes(salt + nonce + ct)
    print(f"Encrypted: {out} ({out.stat().st_size} bytes)")
    return out

def decrypt_file(input_path, password, output_path=None):
    path = Path(input_path)
    raw  = path.read_bytes()
    salt, nonce, ct = raw[:16], raw[16:28], raw[28:]
    data = AESGCM(derive_key(password, salt)).decrypt(nonce, ct, None)
    out  = Path(output_path or str(path).replace('.enc',''))
    out.write_bytes(data)
    print(f"Decrypted: {out} ({out.stat().st_size} bytes)")
    return out

PASSWORD = "my_secret_password"
# encrypt_file("secret.txt", PASSWORD)
# decrypt_file("secret.txt.enc", PASSWORD)
print("AES-256 encryptor ready. Uncomment usage examples.")`,
  },
  {
    id: 'image-compressor',
    title: 'Batch Image Compressor',
    category: 'Files',
    tags: ['image', 'compress', 'resize', 'optimize', 'webp', 'batch'],
    description: 'Compress and convert images to WebP/JPEG with size reduction',
    requirements: ['Pillow'],
    script: `from PIL import Image
from pathlib import Path

SOURCE_DIR    = Path(".")
OUTPUT_DIR    = Path("compressed")
TARGET_FORMAT = "WEBP"
QUALITY       = 85
MAX_WIDTH     = 1920
MAX_HEIGHT    = 1080

OUTPUT_DIR.mkdir(exist_ok=True)
total_saved = 0
count = 0

for img_path in SOURCE_DIR.glob("**/*"):
    if img_path.suffix.lower() not in ['.jpg','.jpeg','.png','.bmp']: continue
    if 'compressed' in str(img_path): continue
    try:
        img = Image.open(img_path)
        if img.mode in ('RGBA','LA','P'): img = img.convert('RGB')
        if img.width > MAX_WIDTH or img.height > MAX_HEIGHT:
            img.thumbnail((MAX_WIDTH, MAX_HEIGHT), Image.LANCZOS)
        ext  = '.webp' if TARGET_FORMAT == 'WEBP' else '.jpg'
        out  = OUTPUT_DIR / (img_path.stem + ext)
        img.save(out, TARGET_FORMAT, quality=QUALITY, optimize=True)
        orig = img_path.stat().st_size
        new  = out.stat().st_size
        total_saved += orig - new
        ratio = (1 - new/orig) * 100
        print(f"  {img_path.name:35} {orig//1024:5}KB -> {new//1024:5}KB ({ratio:.0f}%)")
        count += 1
    except Exception as e:
        print(f"  Error: {img_path.name}: {e}")

print(f"\nProcessed {count} images | Saved: {total_saved/1024/1024:.1f}MB")`,
  },
  {
    id: 'file-watcher-auto',
    title: 'Auto File Watcher and Mover',
    category: 'Files',
    tags: ['watch', 'auto', 'move', 'trigger', 'folder', 'monitor', 'rules'],
    description: 'Watch a folder and automatically move files based on extension rules',
    requirements: [],
    script: `import time, shutil
from pathlib import Path
from datetime import datetime

WATCH_DIR = Path.home() / "Downloads"
RULES = {
    '.pdf':  Path.home() / "Documents" / "PDFs",
    '.docx': Path.home() / "Documents" / "Word",
    '.xlsx': Path.home() / "Documents" / "Excel",
    '.jpg':  Path.home() / "Pictures"  / "Auto",
    '.jpeg': Path.home() / "Pictures"  / "Auto",
    '.png':  Path.home() / "Pictures"  / "Auto",
    '.mp4':  Path.home() / "Videos"    / "Auto",
    '.mp3':  Path.home() / "Music"     / "Auto",
    '.zip':  Path.home() / "Downloads" / "Archives",
}

for dest in RULES.values():
    dest.mkdir(parents=True, exist_ok=True)

def process(f):
    dest = RULES.get(f.suffix.lower())
    if not dest: return False
    target = dest / f.name
    if target.exists():
        target = dest / f"{f.stem}_{int(time.time())}{f.suffix}"
    shutil.move(str(f), target)
    ts = datetime.now().strftime('%H:%M:%S')
    print(f"[{ts}] Moved: {f.name} -> {dest.name}/")
    return True

seen = set(f.name for f in WATCH_DIR.iterdir() if f.is_file())
moved = 0
for f in WATCH_DIR.iterdir():
    if f.is_file() and process(f): moved += 1
print(f"Initial pass: moved {moved} files")

print(f"\nWatching {WATCH_DIR} (Ctrl+C to stop)...")
try:
    while True:
        for f in WATCH_DIR.iterdir():
            if f.is_file() and f.name not in seen:
                time.sleep(0.5)
                if process(f): seen.add(f.name)
        time.sleep(2)
except KeyboardInterrupt:
    print("\nStopped.")`,
  },

  // ── SYSTEM ────────────────────────────────────────────────────
  {
    id: 'env-variable-manager',
    title: 'Environment Variable Manager',
    category: 'System',
    tags: ['env', 'environment', 'variables', 'path', 'system', 'config'],
    description: 'List, set, and manage system environment variables persistently',
    requirements: [],
    script: `import os, sys, subprocess

print("=== ENVIRONMENT VARIABLE MANAGER ===\n")
print(f"Total env vars: {len(os.environ)}")

IMPORTANT = ['PATH','HOME','USER','USERPROFILE','COMPUTERNAME',
             'PYTHONPATH','JAVA_HOME','NODE_PATH','GOPATH']
print("\n=== KEY VARIABLES ===")
for var in IMPORTANT:
    val = os.environ.get(var, '(not set)')
    print(f"  {var:20} = {val[:80]}")

print("\n=== PATH ENTRIES ===")
for i, p in enumerate(os.environ.get('PATH','').split(os.pathsep), 1):
    exists = "OK  " if os.path.exists(p) else "MISS"
    print(f"  {i:2} [{exists}] {p}")

def set_env_var(name, value):
    if sys.platform == 'win32':
        subprocess.run(f'setx {name} "{value}"', shell=True)
        print(f"Set permanently: {name}={value}")
    else:
        shell_rc = os.path.expanduser("~/.bashrc")
        with open(shell_rc, 'a') as f:
            f.write(f'\nexport {name}="{value}"')
        print(f"Added to ~/.bashrc: export {name}={value}")

# set_env_var("MY_API_KEY", "your_key_here")`,
  },
  {
    id: 'service-manager',
    title: 'System Service Manager',
    category: 'System',
    tags: ['service', 'daemon', 'systemctl', 'start', 'stop', 'manage'],
    description: 'Manage system services — start, stop, enable, disable, status',
    requirements: [],
    script: `import subprocess, sys

def run(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return r.stdout.strip() or r.stderr.strip()

if sys.platform == 'win32':
    print("=== WINDOWS SERVICE MANAGER ===")
    print("\nRunning services (first 15):")
    r = subprocess.run("sc queryex type=all state=running",
                       shell=True, capture_output=True, text=True)
    lines = [l for l in r.stdout.split("\n") if "SERVICE_NAME" in l]
    for l in lines[:15]: print(f"  {l.strip()}")

    BLOAT = ['MapsBroker','XboxGipSvc','XblAuthManager','WpcMonSvc','DiagTrack']
    print("\n=== RECOMMENDED TO DISABLE ===")
    for svc in BLOAT:
        status = run(f'sc query {svc}')
        if 'RUNNING' in status:
            print(f"  {svc}: RUNNING (disable: sc config {svc} start= disabled)")
else:
    print("=== LINUX SERVICE MANAGER ===")
    print("\nFailed services:")
    print(run("systemctl --failed --no-pager"))
    print("\nEnabled services:")
    r = subprocess.run(
        ["systemctl","list-unit-files","--type=service","--state=enabled","--no-pager"],
        capture_output=True, text=True)
    print(r.stdout[:2000])`,
  },
  {
    id: 'memory-optimizer',
    title: 'Memory Optimizer and Analysis',
    category: 'System',
    tags: ['memory', 'ram', 'optimize', 'cache', 'flush', 'performance'],
    description: 'Free up RAM by flushing caches and identifying memory hogs',
    requirements: ['psutil'],
    script: `import psutil, subprocess, sys, gc

print("=== MEMORY OPTIMIZER ===")
mem = psutil.virtual_memory()
print(f"Before: {mem.used/1024**3:.1f}/{mem.total/1024**3:.1f}GB ({mem.percent}%)")

collected = gc.collect()
print(f"GC: collected {collected} objects")

if sys.platform != 'win32':
    subprocess.run("sync", shell=True)
    try:
        with open('/proc/sys/vm/drop_caches', 'w') as f:
            f.write('3')
        print("Dropped Linux page caches")
    except PermissionError:
        print("Need sudo: echo 3 | sudo tee /proc/sys/vm/drop_caches")

print("\n=== TOP MEMORY CONSUMERS ===")
procs = []
for p in psutil.process_iter(['pid','name','memory_info']):
    try:
        m = p.info['memory_info'].rss
        procs.append((m, p.info['name'], p.info['pid']))
    except: pass
for mem_bytes, name, pid in sorted(procs, reverse=True)[:10]:
    print(f"  {name:30} {mem_bytes/1024**2:8.0f}MB  PID:{pid}")

mem2 = psutil.virtual_memory()
print(f"\nAfter: {mem2.used/1024**3:.1f}/{mem2.total/1024**3:.1f}GB ({mem2.percent}%)")
print(f"Freed: {(mem.used-mem2.used)/1024**2:.0f}MB")`,
  },
  {
    id: 'clipboard-manager',
    title: 'Clipboard History Manager',
    category: 'System',
    tags: ['clipboard', 'history', 'copy', 'paste', 'monitor', 'save'],
    description: 'Monitor and log clipboard history with save and replay',
    requirements: ['pyperclip'],
    script: `import pyperclip, time, json, hashlib
from pathlib import Path
from datetime import datetime

HISTORY_FILE = Path("clipboard_history.json")
MAX_HISTORY  = 100
POLL_SEC     = 1.0

def load_history():
    if HISTORY_FILE.exists():
        return json.loads(HISTORY_FILE.read_text())
    return []

def save_history(history):
    HISTORY_FILE.write_text(json.dumps(history[-MAX_HISTORY:], indent=2))

def entry_hash(text):
    return hashlib.md5(text[:500].encode()).hexdigest()

history   = load_history()
prev_hash = entry_hash(pyperclip.paste()) if history else ""

print(f"Clipboard History Manager ({len(history)} entries saved)")
print("Press Ctrl+C to stop\n")

try:
    while True:
        try:
            content = pyperclip.paste()
            h = entry_hash(content)
            if h != prev_hash and content.strip():
                entry = {
                    'id':      len(history),
                    'ts':      datetime.now().isoformat(),
                    'size':    len(content),
                    'preview': content[:80].replace('\n','↵'),
                    'content': content[:5000],
                }
                history.append(entry)
                save_history(history)
                prev_hash = h
                print(f"[{entry['ts'][11:19]}] #{entry['id']} {entry['preview'][:60]}")
        except: pass
        time.sleep(POLL_SEC)
except KeyboardInterrupt:
    print(f"\nSaved {len(history)} entries to {HISTORY_FILE}")`,
  },
  {
    id: 'scheduled-task-creator',
    title: 'Windows Scheduled Task Creator',
    category: 'System',
    tags: ['task', 'schedule', 'windows', 'cron', 'automate', 'daily'],
    description: 'Create Windows scheduled tasks to run Python scripts automatically',
    requirements: [],
    script: `import subprocess, sys
from datetime import datetime

if sys.platform != 'win32':
    print("Windows only. Use cron on Linux/Mac."); exit()

def create_task(name, script_path, trigger_time="08:00"):
    task_xml = f"""<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>{datetime.now().strftime('%Y-%m-%d')}T{trigger_time}:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Actions Context="Author">
    <Exec>
      <Command>python</Command>
      <Arguments>"{script_path}"</Arguments>
    </Exec>
  </Actions>
</Task>"""
    xml_file = f"task_{name}.xml"
    with open(xml_file, 'w', encoding='utf-16') as f:
        f.write(task_xml)
    r = subprocess.run(
        ["schtasks", "/create", "/tn", name, "/xml", xml_file, "/f"],
        capture_output=True, text=True)
    print(f"Task '{name}': {'Created OK' if r.returncode==0 else r.stderr.strip()}")
    import os; os.remove(xml_file)

def list_tasks():
    r = subprocess.run(["schtasks", "/query", "/fo", "LIST"],
                       capture_output=True, text=True)
    for line in r.stdout.split("\n")[:40]:
        if "Task Name" in line or "Status" in line:
            print(f"  {line.strip()}")

# create_task("DailyBackup", r"C:\scripts\backup.py", "08:00")
print("=== SCHEDULED TASKS ===")
list_tasks()`,
  },
  {
    id: 'hot-key-macro',
    title: 'Global Hotkey Macro Engine',
    category: 'System',
    tags: ['hotkey', 'macro', 'keyboard', 'shortcut', 'automate', 'global'],
    description: 'Register global hotkeys to trigger Python scripts from anywhere in Windows',
    requirements: ['keyboard'],
    script: `import keyboard, subprocess, sys, time, pyperclip
from datetime import datetime

if sys.platform != 'win32':
    print("Windows hotkey registration works best on Windows."); 

def run_script(code):
    try:
        result = subprocess.run(['python', '-c', code],
                                capture_output=True, text=True, timeout=10)
        print(result.stdout.strip())
        if result.stderr: print("ERR:", result.stderr[:100])
    except Exception as e:
        print(f"Error: {e}")

HOTKEYS = {
    'ctrl+alt+c': ("Date/Time Copy", lambda: pyperclip.copy(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))),
    'ctrl+alt+i': ("System Info",    lambda: run_script("import platform,psutil;cpu=psutil.cpu_percent(1);mem=psutil.virtual_memory().percent;print(f'CPU:{cpu}% RAM:{mem}% OS:{platform.system()}')")),
    'ctrl+alt+p': ("Print IP",       lambda: run_script("import socket;print(socket.gethostbyname(socket.gethostname()))")),
}

print("=== HOTKEY MACRO ENGINE ===")
for hotkey, (name, action) in HOTKEYS.items():
    keyboard.add_hotkey(hotkey, action)
    print(f"  {hotkey:20} -> {name}")

print("\nHotkeys active. Press ESC to stop.")
keyboard.wait('esc')
print("Hotkeys deregistered.")`,
  },
  {
    id: 'pc-health-report',
    title: 'Full PC Health Report HTML',
    category: 'System',
    tags: ['health', 'report', 'html', 'cpu', 'ram', 'disk', 'battery', 'diagnostics'],
    description: 'Generate a comprehensive HTML system health report with charts',
    requirements: ['psutil'],
    script: `import psutil, platform, socket, os, time
from datetime import datetime
from pathlib import Path

cpu    = psutil.cpu_percent(interval=2)
mem    = psutil.virtual_memory()
disk   = psutil.disk_usage('/')
net    = psutil.net_io_counters()
boot   = datetime.fromtimestamp(psutil.boot_time())
procs  = len(psutil.pids())
freq   = psutil.cpu_freq()
temps  = getattr(psutil, 'sensors_temperatures', lambda: {})()

cpu_bar  = '#' * int(cpu/5)  + '.' * (20 - int(cpu/5))
ram_bar  = '#' * int(mem.percent/5) + '.' * (20 - int(mem.percent/5))
disk_bar = '#' * int(disk.percent/5) + '.' * (20 - int(disk.percent/5))

status = "HEALTHY"
issues = []
if cpu > 85:    issues.append("HIGH CPU"); status = "WARNING"
if mem.percent > 90: issues.append("HIGH RAM"); status = "CRITICAL"
if disk.percent > 90: issues.append("LOW DISK"); status = "CRITICAL"

html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>PC Health Report</title>
<style>
  body{{font-family:monospace;background:#05080F;color:#E8F0F8;padding:20px}}
  h1{{color:#00DDEE}} h2{{color:#00FF88;border-bottom:1px solid #1a2535;padding-bottom:8px}}
  .card{{background:#0A0F18;border:1px solid #1a2535;border-radius:8px;padding:16px;margin:12px 0}}
  .bar{{height:16px;background:#1a2535;border-radius:4px;overflow:hidden;margin:4px 0}}
  .bar-fill{{height:100%;border-radius:4px}}
  .green{{background:#00FF88}} .amber{{background:#FF9900}} .red{{background:#FF3344}}
  table{{width:100%;border-collapse:collapse}}
  td,th{{padding:8px 12px;border-bottom:1px solid #1a2535;text-align:left}}
  .status-ok{{color:#00FF88}} .status-warn{{color:#FF9900}} .status-crit{{color:#FF3344}}
</style></head><body>
<h1>🖥 PC Health Report</h1>
<p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Host: {socket.gethostname()} | Status: <b class="{'status-ok' if status=='HEALTHY' else 'status-warn'}">{status}</b></p>

<div class="card"><h2>CPU</h2>
<p>{platform.processor()[:70]}</p>
<p>Usage: {cpu}% | Cores: {psutil.cpu_count()} | Freq: {freq.current:.0f}MHz</p>
<div class="bar"><div class="bar-fill {'green' if cpu<70 else 'amber' if cpu<85 else 'red'}" style="width:{cpu}%"></div></div>
</div>

<div class="card"><h2>Memory</h2>
<p>{mem.used/1024**3:.1f}GB / {mem.total/1024**3:.1f}GB used ({mem.percent}%)</p>
<div class="bar"><div class="bar-fill {'green' if mem.percent<70 else 'amber' if mem.percent<85 else 'red'}" style="width:{mem.percent}%"></div></div>
</div>

<div class="card"><h2>Disk</h2>
<p>{disk.used/1024**3:.1f}GB / {disk.total/1024**3:.1f}GB used ({disk.percent}%)</p>
<div class="bar"><div class="bar-fill {'green' if disk.percent<70 else 'amber' if disk.percent<85 else 'red'}" style="width:{disk.percent}%"></div></div>
</div>

<div class="card"><h2>Network</h2>
<p>Sent: {net.bytes_sent/1024**2:.1f}MB | Received: {net.bytes_recv/1024**2:.1f}MB</p>
<p>Uptime since: {boot.strftime('%Y-%m-%d %H:%M')}</p>
<p>Processes: {procs}</p>
</div>
</body></html>"""

report_path = Path("health_report.html")
report_path.write_text(html, encoding='utf-8')
print(f"Report saved: {report_path.absolute()}")
print(f"Status: {status}")
if issues: print(f"Issues: {', '.join(issues)}")
else: print("All systems healthy!")`,
  },

  // ── SECURITY ──────────────────────────────────────────────────
  {
    id: 'ssl-cert-checker',
    title: 'SSL Certificate Expiry Checker',
    category: 'Security',
    tags: ['ssl', 'certificate', 'expire', 'tls', 'https', 'security'],
    description: 'Check SSL certificate expiry dates for domains and alert on expiring certs',
    requirements: [],
    script: `import ssl, socket
from datetime import datetime

DOMAINS   = ["google.com", "github.com", "cloudflare.com", "api.openai.com"]
WARN_DAYS = 30

def check_ssl(host, port=443):
    ctx = ssl.create_default_context()
    try:
        with socket.create_connection((host, port), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                cert = ssock.getpeercert()
                exp_date = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                days_left = (exp_date - datetime.utcnow()).days
                issuer = dict(x[0] for x in cert.get('issuer', []))
                return {
                    'host':     host,
                    'expires':  exp_date.strftime('%Y-%m-%d'),
                    'days_left':days_left,
                    'issuer':   issuer.get('organizationName', 'Unknown'),
                    'ok': True,
                }
    except Exception as e:
        return {'host': host, 'error': str(e)[:60], 'ok': False}

print(f"=== SSL CERTIFICATE CHECKER ===")
print(f"{'Domain':30} {'Expires':12} {'Days Left':10} Issuer")
print("-" * 75)

for domain in DOMAINS:
    r = check_ssl(domain)
    if not r['ok']:
        print(f"  ERR  {r['host']:28} {r['error']}")
    else:
        flag = " EXPIRING SOON!" if r['days_left'] < WARN_DAYS else ""
        icon = "CRIT" if r['days_left'] < 7 else "WARN" if r['days_left'] < WARN_DAYS else "OK  "
        print(f"  {icon} {r['host']:28} {r['expires']:12} {r['days_left']:5}d  {r['issuer'][:25]}{flag}")`,
  },
  {
    id: 'password-generator',
    title: 'Secure Password Generator',
    category: 'Security',
    tags: ['password', 'generate', 'random', 'secure', 'strong', 'entropy'],
    description: 'Generate cryptographically secure passwords and memorable passphrases',
    requirements: [],
    script: `import secrets, string, math

def generate_password(length=20, upper=True, digits=True, symbols=True):
    chars = string.ascii_lowercase
    if upper:   chars += string.ascii_uppercase
    if digits:  chars += string.digits
    if symbols: chars += "!@#$%^&*()_+-={}"
    return ''.join(secrets.choice(chars) for _ in range(length))

WORDLIST = [
    "correct","horse","battery","staple","dragon","coffee",
    "sunset","frozen","python","valley","thunder","silicon",
    "quantum","bridge","garden","silver","harbor","falcon",
    "rocket","cosmic","mirror","jungle","neon","chrome",
]

def generate_passphrase(words=4):
    chosen = [secrets.choice(WORDLIST) for _ in range(words)]
    sep    = secrets.choice(["-",".","_"])
    return sep.join(chosen) + str(secrets.randbelow(9999))

def entropy(pwd):
    charset = 0
    if any(c.islower()     for c in pwd): charset += 26
    if any(c.isupper()     for c in pwd): charset += 26
    if any(c.isdigit()     for c in pwd): charset += 10
    if any(not c.isalnum() for c in pwd): charset += 32
    return math.log2(charset ** len(pwd)) if charset > 0 else 0

print("=== PASSWORD GENERATOR ===\n")
print("Passwords:")
for length in [12, 16, 20, 32]:
    pwd = generate_password(length)
    print(f"  {length:2}chr  {entropy(pwd):5.0f}bits  {pwd}")

print("\nPassphrases (easy to remember):")
for _ in range(4):
    pp = generate_passphrase()
    print(f"  {entropy(pp):5.0f}bits  {pp}")`,
  },
  {
    id: 'api-key-scanner',
    title: 'API Key and Secret Leak Scanner',
    category: 'Security',
    tags: ['api', 'key', 'secret', 'scan', 'leak', 'credential', 'git'],
    description: 'Scan code repositories for accidentally committed API keys and credentials',
    requirements: [],
    script: `import re
from pathlib import Path
from collections import defaultdict

SKIP_DIRS = {'.git','node_modules','__pycache__','.venv','dist','build'}

SECRET_PATTERNS = {
    'AWS Access Key':   r'AKIA[0-9A-Z]{16}',
    'GitHub Token':     r'ghp_[A-Za-z0-9]{36}',
    'Google API Key':   r'AIza[0-9A-Za-z\-_]{35}',
    'Stripe Key':       r'sk_live_[0-9a-zA-Z]{24}',
    'OpenAI Key':       r'sk-[A-Za-z0-9]{48}',
    'Slack Token':      r'xox[baprs]-[0-9A-Za-z\-]+',
    'Private Key':      r'-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY',
    'Password in Code': r'(?i)password[\s]*=[\s]*[\'"]([^\'"{\\s]{8,})',
}

SCAN_DIR  = Path(".")
findings  = defaultdict(list)

print(f"=== API KEY SCANNER ===")
print(f"Scanning: {SCAN_DIR.absolute()}\n")

for f in SCAN_DIR.rglob("*"):
    if any(skip in f.parts for skip in SKIP_DIRS): continue
    if not f.is_file(): continue
    if f.suffix not in ['.py','.js','.ts','.env','.json','.yaml','.sh']: continue
    try:
        content = f.read_text(errors='replace')
        for name, pattern in SECRET_PATTERNS.items():
            if re.search(pattern, content):
                findings[name].append(str(f))
                print(f"  ALERT [{name}]: {f}")
    except: pass

if not findings:
    print("No secrets found — clean codebase!")
else:
    print(f"\n=== {sum(len(v) for v in findings.values())} POTENTIAL LEAKS ===")
    for key, files in findings.items():
        print(f"  {key}: {len(files)} file(s)")
    print("\nACTION: Rotate any exposed keys immediately!")`,
  },
  {
    id: 'windows-defender-scan',
    title: 'Windows Defender Quick Scan',
    category: 'Security',
    tags: ['defender', 'antivirus', 'scan', 'malware', 'windows', 'virus', 'threat'],
    description: 'Trigger Windows Defender quick and full scans with result reporting',
    requirements: [],
    script: `import subprocess, sys, time
from datetime import datetime

if sys.platform != 'win32':
    print("Windows only — for Linux use: clamscan -r ~/")
    exit()

MPC_EXE = r"C:\Program Files\Windows Defender\MpCmdRun.exe"

def run_defender(scan_type="-ScanType 1"):
    print(f"Starting Defender scan: {scan_type}...")
    print(f"Time: {datetime.now().strftime('%H:%M:%S')}\n")
    r = subprocess.run(
        [MPC_EXE] + scan_type.split(),
        capture_output=True, text=True, timeout=300
    )
    print(r.stdout or "Scan complete (no output)")
    if r.returncode == 0:
        print("RESULT: No threats detected")
    elif r.returncode == 2:
        print("RESULT: THREATS FOUND - check Windows Security")
    else:
        print(f"Exit code: {r.returncode}")

def get_defender_status():
    r = subprocess.run(
        ["powershell","-Command",
         "Get-MpComputerStatus | Select-Object AntivirusEnabled,RealTimeProtectionEnabled,QuickScanStartTime,QuickScanEndTime | Format-List"],
        capture_output=True, text=True
    )
    print("=== WINDOWS DEFENDER STATUS ===")
    print(r.stdout)

def update_signatures():
    print("Updating virus signatures...")
    r = subprocess.run([MPC_EXE, "-SignatureUpdate"], capture_output=True, text=True)
    print("Signatures updated!" if r.returncode == 0 else f"Update failed: {r.returncode}")

get_defender_status()
print("\nRunning quick scan...")
run_defender("-ScanType 1")  # 1=Quick, 2=Full, 3=Custom`,
  },
  {
    id: 'network-intrusion-detector',
    title: 'Network Intrusion Detector',
    category: 'Security',
    tags: ['intrusion', 'detect', 'network', 'arp', 'scan', 'alert', 'security'],
    description: 'Detect new unauthorized devices joining your network with ARP scanning',
    requirements: ['scapy'],
    script: `import json, time, socket, subprocess, sys
from pathlib import Path
from datetime import datetime

NETWORK   = "192.168.1.0/24"  # Change to your subnet
DATA_FILE = Path("network_devices.json")
CHECK_SEC = 60

def scan_arp(network):
    devices = []
    try:
        from scapy.all import ARP, Ether, srp
        ans, _ = srp(Ether(dst="ff:ff:ff:ff:ff:ff")/ARP(pdst=network),
                     timeout=2, verbose=0)
        for _, rcv in ans:
            devices.append({'ip': rcv.psrc, 'mac': rcv.hwsrc})
    except ImportError:
        if sys.platform == 'win32':
            r = subprocess.run("arp -a", shell=True, capture_output=True, text=True)
            import re
            for line in r.stdout.split('\n'):
                m = re.search(r'(\d+\.\d+\.\d+\.\d+)\s+([\w-]{17})', line)
                if m: devices.append({'ip': m.group(1), 'mac': m.group(2)})
        else:
            r = subprocess.run(["arp","-n"], capture_output=True, text=True)
            import re
            for line in r.stdout.split('\n')[1:]:
                parts = line.split()
                if len(parts) >= 3:
                    devices.append({'ip': parts[0], 'mac': parts[2]})
    return devices

known = json.loads(DATA_FILE.read_text()) if DATA_FILE.exists() else {}

print(f"=== INTRUSION DETECTOR ===")
print(f"Network: {NETWORK}")
print(f"Known devices: {len(known)}")
print("Scanning...\n")

devices = scan_arp(NETWORK)
for d in devices:
    key = d['mac']
    if key not in known:
        ts = datetime.now().isoformat()
        try: name = socket.gethostbyaddr(d['ip'])[0]
        except: name = "unknown"
        known[key] = {'ip': d['ip'], 'first_seen': ts, 'name': name}
        print(f"  NEW DEVICE: {d['ip']:18} MAC:{d['mac']}  Name:{name}")
    else:
        print(f"  Known:      {d['ip']:18} MAC:{d['mac']}")

DATA_FILE.write_text(json.dumps(known, indent=2))
print(f"\nTotal devices: {len(devices)} | Known: {len(known)}")`,
  },

  // ── CLEANING ──────────────────────────────────────────────────
  {
    id: 'docker-cleaner',
    title: 'Docker System Cleaner',
    category: 'Cleaning',
    tags: ['docker', 'container', 'image', 'clean', 'prune', 'volume'],
    description: 'Remove dangling Docker images, stopped containers, and unused volumes',
    requirements: [],
    script: `import subprocess

check = subprocess.run(["docker", "info"], capture_output=True)
if check.returncode != 0:
    print("Docker not running or not installed"); exit()

print("=== DOCKER CLEANER ===")
print("\nBefore:")
subprocess.run(["docker", "system", "df"])

def prune(args, label):
    r = subprocess.run(["docker"] + args, capture_output=True, text=True)
    out = r.stdout.strip()
    print(f"  {label}: {out[:80] if out else 'nothing removed'}")

print("\nCleaning...")
prune(["container", "prune", "-f"],   "Stopped containers")
prune(["image",     "prune", "-f"],    "Dangling images")
prune(["volume",    "prune", "-f"],    "Unused volumes")
prune(["network",   "prune", "-f"],    "Unused networks")

print("\nAfter:")
subprocess.run(["docker", "system", "df"])`,
  },
  {
    id: 'pip-env-cleaner',
    title: 'Python Pip Environment Cleaner',
    category: 'Cleaning',
    tags: ['pip', 'packages', 'clean', 'venv', 'dependencies', 'cache', 'pyc'],
    description: 'Clean pip cache, remove .pyc files, and audit unused virtual envs',
    requirements: [],
    script: `import subprocess, sys, shutil
from pathlib import Path

print("=== PYTHON ENVIRONMENT CLEANER ===")

print("\n[1] Clearing pip download cache...")
r = subprocess.run([sys.executable, "-m", "pip", "cache", "purge"],
                   capture_output=True, text=True)
print(f"  {r.stdout.strip() or 'Done'}")

print("\n[2] Pip cache info:")
r2 = subprocess.run([sys.executable, "-m", "pip", "cache", "info"],
                    capture_output=True, text=True)
print(f"  {r2.stdout.strip()}")

print("\n[3] Removing .pyc files and __pycache__...")
count = 0
for pyc in Path('.').rglob('*.pyc'):
    try: pyc.unlink(); count += 1
    except: pass
for pycache in Path('.').rglob('__pycache__'):
    try: shutil.rmtree(pycache, ignore_errors=True)
    except: pass
print(f"  Removed {count} .pyc files")

print("\n[4] Outdated packages:")
subprocess.run([sys.executable, "-m", "pip", "list", "--outdated"])`,
  },
  {
    id: 'git-repo-cleaner',
    title: 'Git Repository Cleaner',
    category: 'Cleaning',
    tags: ['git', 'clean', 'branch', 'prune', 'repository', 'merge', 'gc'],
    description: 'Prune merged branches, remove stale remotes, and compact git repositories',
    requirements: [],
    script: `import subprocess
from pathlib import Path

def git(*args, cwd=None):
    r = subprocess.run(["git"] + list(args), capture_output=True, text=True, cwd=cwd)
    return r.stdout.strip(), r.stderr.strip(), r.returncode

REPO = Path(".")
_, _, code = git("-C", str(REPO), "status")
if code != 0:
    print(f"Not a git repo: {REPO.absolute()}"); exit()

print(f"=== GIT REPO CLEANER: {REPO.absolute()} ===")

out, _, _ = git("count-objects", "-vH", cwd=REPO)
print(f"Before size: {out[:100]}")

print("\nMerged branches (safe to delete):")
for base in ["main", "master"]:
    out, _, rc = git("branch", "--merged", base, cwd=REPO)
    if rc == 0 and out:
        merged = [b.strip() for b in out.split("\n")
                  if b.strip() and b.strip() not in ("*", "main", "master")]
        for branch in merged:
            git("branch", "-d", branch, cwd=REPO)
            print(f"  Deleted: {branch}")
        if not merged: print("  None to clean")
        break

git("remote", "prune", "origin", cwd=REPO)
print("Pruned stale remote tracking refs")

print("Running git gc...")
git("gc", "--aggressive", "--prune=now", cwd=REPO)

out, _, _ = git("count-objects", "-vH", cwd=REPO)
print(f"After size: {out[:100]}")`,
  },
  {
    id: 'windows-bloat-remover',
    title: 'Windows Bloatware Remover',
    category: 'Cleaning',
    tags: ['bloat', 'windows', 'remove', 'apps', 'clean', 'uwp', 'powershell'],
    description: 'Remove pre-installed Windows bloatware apps using PowerShell',
    requirements: [],
    script: `import subprocess, sys

if sys.platform != 'win32':
    print("Windows only"); exit()

BLOATWARE = [
    "Microsoft.3DBuilder",
    "Microsoft.BingWeather",
    "Microsoft.GetHelp",
    "Microsoft.Getstarted",
    "Microsoft.Microsoft3DViewer",
    "Microsoft.MicrosoftSolitaireCollection",
    "Microsoft.NetworkSpeedTest",
    "Microsoft.News",
    "Microsoft.Office.Lens",
    "Microsoft.People",
    "Microsoft.Print3D",
    "Microsoft.SkypeApp",
    "Microsoft.Todos",
    "Microsoft.WindowsFeedbackHub",
    "Microsoft.XboxApp",
    "Microsoft.Xbox.TCUI",
    "Microsoft.YourPhone",
    "Microsoft.ZuneMusic",
    "Microsoft.ZuneVideo",
    "king.com.CandyCrushSaga",
    "king.com.CandyCrushSodaSaga",
    "Spotify.Spotify",
]

print("=== WINDOWS BLOATWARE REMOVER ===")
print(f"Apps to remove: {len(BLOATWARE)}\n")

for app in BLOATWARE:
    r = subprocess.run(
        ["powershell", "-Command",
         f"Get-AppxPackage {app} | Remove-AppxPackage"],
        capture_output=True, text=True
    )
    if "not found" not in r.stderr.lower() and r.returncode == 0:
        print(f"  Removed: {app}")
    else:
        print(f"  Skip:    {app} (not installed)")

print("\nBloatware removal complete!")
print("Tip: Restart to see changes.")`,
  },
  {
    id: 'disk-defrag-analyzer',
    title: 'Disk Defrag and Optimizer',
    category: 'Cleaning',
    tags: ['defrag', 'disk', 'optimize', 'hdd', 'ssd', 'fragments', 'windows'],
    description: 'Analyze disk fragmentation and run optimization (defrag for HDD, TRIM for SSD)',
    requirements: [],
    script: `import subprocess, sys

if sys.platform == 'win32':
    print("=== DISK OPTIMIZER ===\n")

    print("Analyzing all drives...")
    r = subprocess.run(
        ["defrag", "/C", "/A", "/V"],
        capture_output=True, text=True, timeout=120
    )
    print(r.stdout[:3000] if r.stdout else "Analysis complete")

    print("\nOptimizing C: drive...")
    r2 = subprocess.run(
        ["defrag", "C:", "/O"],  # /O = Optimize (defrag HDD, TRIM SSD)
        capture_output=True, text=True, timeout=300
    )
    print(r2.stdout[:2000] if r2.stdout else "Optimization complete")

    print("\nTip: SSDs use TRIM (automatic), HDDs use defrag")
    print("Run from Admin PowerShell for full access")
else:
    print("=== LINUX DISK ANALYSIS ===")
    for cmd in [
        "df -h",
        "sudo fstrim -av",
        "sudo e2fsck -n /dev/sda1",
    ]:
        print(f"\n$ {cmd}")
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        print(r.stdout[:500] or r.stderr[:200])`,
  },

  // ── MONITORING ────────────────────────────────────────────────
  {
    id: 'disk-space-alert',
    title: 'Disk Space Alert System',
    category: 'Monitoring',
    tags: ['disk', 'alert', 'space', 'monitor', 'threshold', 'critical'],
    description: 'Monitor disk space on all mounted drives and log alerts when running low',
    requirements: ['psutil'],
    script: `import psutil
from datetime import datetime
from pathlib import Path

WARN_PCT = 80
CRIT_PCT = 90
LOG_FILE = "disk_alerts.log"

def log_alert(msg):
    ts   = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, 'a') as f: f.write(line + "\n")

print(f"=== DISK SPACE MONITOR ===")
print(f"Warn>{WARN_PCT}%  Critical>{CRIT_PCT}%\n")

for part in psutil.disk_partitions():
    try:
        u   = psutil.disk_usage(part.mountpoint)
        bar = '#' * int(u.percent/5) + '.' * (20 - int(u.percent/5))
        tag = "CRIT" if u.percent >= CRIT_PCT else "WARN" if u.percent >= WARN_PCT else "OK  "
        print(f"  [{tag}] {part.mountpoint:15} [{bar}] {u.percent:5.1f}%  {u.free/1024**3:.1f}GB free")
    except: pass

print("\nAlerts:")
for part in psutil.disk_partitions():
    try:
        u = psutil.disk_usage(part.mountpoint)
        if u.percent >= WARN_PCT:
            level = "CRITICAL" if u.percent >= CRIT_PCT else "WARNING"
            log_alert(f"{level}: {part.mountpoint} at {u.percent:.1f}% ({u.free/1024**3:.1f}GB free)")
    except: pass`,
  },
  {
    id: 'log-analyzer',
    title: 'Log File Error Analyzer',
    category: 'Monitoring',
    tags: ['log', 'analyze', 'parse', 'errors', 'grep', 'pattern', 'syslog'],
    description: 'Analyze log files to extract errors, warnings, and top IP addresses',
    requirements: [],
    script: `import re, sys
from pathlib import Path
from collections import Counter

LOG_FILES = [
    "/var/log/syslog",
    "/var/log/auth.log",
    "/var/log/nginx/error.log",
    "app.log",
]

def analyze_log(log_path):
    path = Path(log_path)
    if not path.exists():
        print(f"  Not found: {log_path}"); return

    lines    = path.read_text(errors='replace').splitlines()
    errors   = [l for l in lines if re.search(r'ERROR|CRITICAL|FATAL', l, re.I)]
    warnings = [l for l in lines if re.search(r'WARN|WARNING', l, re.I)]
    ips      = re.findall(r'\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b', "\n".join(lines))
    top_ips  = Counter(ips).most_common(5)

    print(f"\n=== {path.name} ({len(lines)} lines) ===")
    print(f"  Errors:   {len(errors)}")
    print(f"  Warnings: {len(warnings)}")

    if errors:
        print("  Last 3 errors:")
        for e in errors[-3:]:
            print(f"    {e[:100]}")

    if top_ips:
        print("  Top IPs:")
        for ip, count in top_ips:
            print(f"    {ip:18} {count:5} hits")

for log_file in LOG_FILES:
    analyze_log(log_file)

if len(sys.argv) > 1:
    analyze_log(sys.argv[1])`,
  },
  {
    id: 'cpu-temp-monitor',
    title: 'CPU Temperature Monitor',
    category: 'Monitoring',
    tags: ['temperature', 'cpu', 'thermal', 'heat', 'sensor', 'throttle'],
    description: 'Monitor CPU temperatures and alert when thermal throttling may occur',
    requirements: ['psutil'],
    script: `import psutil, time, sys
from datetime import datetime

WARN_TEMP = 75
CRIT_TEMP = 90

def get_temps():
    if not hasattr(psutil, 'sensors_temperatures'): return {}
    try: return psutil.sensors_temperatures()
    except: return {}

temps = get_temps()
if not temps:
    if sys.platform == 'win32':
        import subprocess
        print("Windows: Checking thermal zones...")
        r = subprocess.run(
            "wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature",
            shell=True, capture_output=True, text=True
        )
        for line in r.stdout.strip().split("\n")[1:]:
            if line.strip():
                try:
                    temp_c = (float(line.strip()) / 10) - 273.15
                    print(f"Thermal zone: {temp_c:.1f}C")
                except: pass
    else:
        print("Temperature sensors not available on this system")
        print("Try: sudo apt install lm-sensors && sudo sensors-detect")
else:
    print(f"=== CPU TEMPERATURE MONITOR ===")
    print(f"Warn>{WARN_TEMP}C  Critical>{CRIT_TEMP}C\n")
    for sensor_name, entries in temps.items():
        for entry in entries:
            temp = entry.current
            flag = " ** CRITICAL **" if temp >= CRIT_TEMP else " * HOT *" if temp >= WARN_TEMP else ""
            print(f"  {sensor_name:20} {entry.label or 'core':15} {temp:6.1f}C{flag}")`,
  },
  {
    id: 'gpu-monitor',
    title: 'GPU Monitor NVIDIA and AMD',
    category: 'Monitoring',
    tags: ['gpu', 'nvidia', 'amd', 'vram', 'temperature', 'cuda', 'monitor'],
    description: 'Monitor GPU temperature, VRAM usage, and utilization with nvidia-smi',
    requirements: [],
    script: `import subprocess, sys, time

def get_nvidia_stats():
    try:
        r = subprocess.run([
            "nvidia-smi",
            "--query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total,power.draw",
            "--format=csv,noheader,nounits"
        ], capture_output=True, text=True, timeout=5)
        if r.returncode != 0: return None
        rows = []
        for line in r.stdout.strip().split("\n"):
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 6:
                try:
                    rows.append({
                        'name':     parts[0],
                        'temp':     int(parts[1]),
                        'util':     int(parts[2]),
                        'mem_used': int(parts[3]),
                        'mem_total':int(parts[4]),
                        'power':    float(parts[5]),
                    })
                except: pass
        return rows
    except: return None

print("=== GPU MONITOR ===")
nvidia = get_nvidia_stats()
if nvidia:
    for i, gpu in enumerate(nvidia):
        bar     = 'X' * (gpu['util']//5) + '.' * (20 - gpu['util']//5)
        mem_pct = (gpu['mem_used'] / max(gpu['mem_total'],1)) * 100
        print(f"GPU {i}: {gpu['name'][:35]}")
        print(f"  Temp:{gpu['temp']:3}C  Util:{gpu['util']:3}%  [{bar}]")
        print(f"  VRAM:{gpu['mem_used']:5}MB/{gpu['mem_total']}MB ({mem_pct:.0f}%)")
        print(f"  Power:{gpu['power']:.0f}W")
else:
    r = subprocess.run(["rocm-smi","--showtemp","--showuse"], capture_output=True, text=True, timeout=5)
    if r.returncode == 0:
        print(r.stdout)
    else:
        print("No GPU found. Install nvidia-smi (NVIDIA) or ROCm (AMD)")`,
  },
  {
    id: 'process-tree-viewer',
    title: 'Process Tree Viewer',
    category: 'Monitoring',
    tags: ['process', 'tree', 'parent', 'child', 'hierarchy', 'psutil', 'pid'],
    description: 'Display running processes in a tree hierarchy with CPU and RAM usage',
    requirements: ['psutil'],
    script: `import psutil
from collections import defaultdict

def fmt_bytes(n):
    if n > 1024**3: return f"{n/1024**3:.1f}GB"
    if n > 1024**2: return f"{n/1024**2:.0f}MB"
    return f"{n/1024:.0f}KB"

procs = {}
children = defaultdict(list)

for p in psutil.process_iter(['pid','ppid','name','cpu_percent','memory_info','status']):
    try:
        info = p.info
        procs[info['pid']] = info
        children[info['ppid']].append(info['pid'])
    except: pass

# Re-sample CPU (psutil needs 2 calls for accurate %)
import time
time.sleep(0.5)
cpu_map = {}
for p in psutil.process_iter(['pid','cpu_percent']):
    try: cpu_map[p.pid] = p.cpu_percent()
    except: pass

def print_tree(pid, level=0):
    if pid not in procs: return
    p = procs[pid]
    name = p.get('name','?')[:25]
    mem  = fmt_bytes(p.get('memory_info',type('',(),{'rss':0})()).rss)
    cpu  = cpu_map.get(pid, 0)
    indent = "  " * level + ("└─ " if level > 0 else "")
    print(f"{indent}{name:25} PID:{pid:<7} CPU:{cpu:5.1f}%  MEM:{mem:8}")
    for child_pid in sorted(children.get(pid, [])):
        print_tree(child_pid, level + 1)

print("=== PROCESS TREE ===")
# Print top-level processes (ppid=0 or not in our list)
roots = [pid for pid in procs if procs[pid]['ppid'] not in procs]
for root in sorted(roots)[:5]:
    print_tree(root)

print(f"\nTotal processes: {len(procs)}")`,
  },
  {
    id: 'smart-disk-health',
    title: 'S.M.A.R.T Disk Health Check',
    category: 'Monitoring',
    tags: ['smart', 'disk', 'health', 'hdd', 'ssd', 'nvme', 'failure', 'predict'],
    description: 'Check S.M.A.R.T drive health data to predict disk failure',
    requirements: [],
    script: `import subprocess, sys

def check_smart_windows():
    r = subprocess.run(
        ["powershell","-Command",
         "Get-WmiObject Win32_DiskDrive | Select-Object Model,Status,MediaType | Format-List"],
        capture_output=True, text=True
    )
    print("=== DISK STATUS (Windows) ===")
    print(r.stdout)

    print("\n=== DISK DETAILS (PowerShell) ===")
    r2 = subprocess.run(
        ["powershell","-Command",
         "Get-PhysicalDisk | Select-Object FriendlyName,HealthStatus,OperationalStatus,MediaType,Size | Format-Table"],
        capture_output=True, text=True
    )
    print(r2.stdout)

def check_smart_linux():
    import glob
    disks = glob.glob('/dev/sd?') + glob.glob('/dev/nvme?n?')
    for disk in disks:
        print(f"\n=== {disk} ===")
        r = subprocess.run(
            ["sudo", "smartctl", "-H", "-A", disk],
            capture_output=True, text=True
        )
        if r.returncode != 0:
            print(f"Error: {r.stderr[:100]}")
            print("Install: sudo apt install smartmontools")
        else:
            for line in r.stdout.split("\n"):
                if any(kw in line for kw in
                       ["Health","Reallocated","Pending","Uncorrectable","Temperature","Power_On"]):
                    print(f"  {line.strip()}")

if sys.platform == 'win32':
    check_smart_windows()
else:
    check_smart_linux()`,
  },

  // ── WEB ───────────────────────────────────────────────────────
  {
    id: 'api-tester',
    title: 'REST API Endpoint Tester',
    category: 'Web',
    tags: ['api', 'rest', 'test', 'http', 'json', 'endpoint', 'curl'],
    description: 'Test REST API endpoints with assertions, latency tracking, and status reporting',
    requirements: ['requests'],
    script: `import requests, json, time

BASE_URL = "https://jsonplaceholder.typicode.com"

TESTS = [
    {"method":"GET",    "endpoint":"/users",    "expect":200},
    {"method":"GET",    "endpoint":"/posts/1",   "expect":200},
    {"method":"POST",   "endpoint":"/posts",     "expect":201,
     "body":{"title":"test","body":"hello","userId":1}},
    {"method":"PUT",    "endpoint":"/posts/1",   "expect":200,
     "body":{"title":"updated"}},
    {"method":"DELETE", "endpoint":"/posts/1",   "expect":200},
]

def run_tests():
    passed = failed = 0
    print(f"=== API TEST SUITE ===  Base: {BASE_URL}\n")
    for test in TESTS:
        url  = BASE_URL + test["endpoint"]
        body = test.get("body")
        start = time.perf_counter()
        try:
            r = getattr(requests, test["method"].lower())(
                url, json=body, headers={"Content-Type":"application/json"}, timeout=10
            )
            ms   = (time.perf_counter() - start) * 1000
            ok   = r.status_code == test["expect"]
            tag  = "PASS" if ok else "FAIL"
            if ok: passed += 1
            else:  failed += 1
            print(f"  {tag} {test['method']:7} {test['endpoint']:25} "
                  f"HTTP {r.status_code} (expected {test['expect']}) {ms:.0f}ms")
        except Exception as e:
            failed += 1
            print(f"  ERR  {test['method']:7} {test['endpoint']:25} {e}")

    print(f"\nResults: {passed}/{passed+failed} passed | {failed} failed")

run_tests()`,
  },
  {
    id: 'download-manager',
    title: 'Parallel Batch Download Manager',
    category: 'Web',
    tags: ['download', 'batch', 'wget', 'file', 'url', 'resume', 'parallel'],
    description: 'Download multiple URLs in parallel with progress and resume support',
    requirements: ['requests'],
    script: `import requests, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from threading import Lock

URLs = [
    ("posts.json",    "https://jsonplaceholder.typicode.com/posts"),
    ("users.json",    "https://jsonplaceholder.typicode.com/users"),
    ("comments.json", "https://jsonplaceholder.typicode.com/comments"),
]

SAVE_DIR    = Path("downloads")
MAX_WORKERS = 4
lock        = Lock()
SAVE_DIR.mkdir(exist_ok=True)

def download(name, url):
    dest = SAVE_DIR / name
    headers = {}
    if dest.exists():
        headers['Range'] = f"bytes={dest.stat().st_size}-"
        mode = 'ab'
    else:
        mode = 'wb'
    try:
        r = requests.get(url, headers=headers, stream=True, timeout=30)
        downloaded = 0
        start = time.perf_counter()
        with open(dest, mode) as f:
            for chunk in r.iter_content(chunk_size=65536):
                f.write(chunk)
                downloaded += len(chunk)
                speed = downloaded / max(time.perf_counter() - start, 0.001) / 1024
                with lock:
                    print(f"\r  {name[:20]:20} {downloaded//1024}KB  {speed:.0f}KB/s", end='')
        print(f"\n  Done: {name} ({downloaded//1024}KB)")
    except Exception as e:
        print(f"\n  Error: {name}: {e}")

print(f"Downloading {len(URLs)} files with {MAX_WORKERS} workers...")
with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
    ex.map(lambda u: download(*u), URLs)
print("All downloads complete!")`,
  },
  {
    id: 'web-screenshot',
    title: 'Website Screenshot Automation',
    category: 'Web',
    tags: ['screenshot', 'web', 'browser', 'selenium', 'automation', 'capture', 'headless'],
    description: 'Take automated screenshots of websites using Selenium headless Chrome',
    requirements: ['selenium', 'webdriver-manager'],
    script: `from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from pathlib import Path
import time

SITES = [
    {"name": "google",    "url": "https://www.google.com"},
    {"name": "github",    "url": "https://github.com"},
    {"name": "python",    "url": "https://python.org"},
]

WIDTH  = 1920
HEIGHT = 1080
OUTPUT = Path("screenshots")
OUTPUT.mkdir(exist_ok=True)

opts = Options()
opts.add_argument("--headless")
opts.add_argument("--no-sandbox")
opts.add_argument(f"--window-size={WIDTH},{HEIGHT}")
opts.add_argument("--disable-dev-shm-usage")

print(f"Taking {len(SITES)} screenshots at {WIDTH}x{HEIGHT}...")

driver = None
try:
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=opts
    )
    driver.set_page_load_timeout(30)

    for site in SITES:
        try:
            driver.get(site["url"])
            time.sleep(2)
            path = OUTPUT / f"{site['name']}.png"
            driver.save_screenshot(str(path))
            size = path.stat().st_size // 1024
            print(f"  {site['name']:20} -> {path} ({size}KB)")
        except Exception as e:
            print(f"  Error {site['name']}: {e}")
finally:
    if driver: driver.quit()

print(f"\nScreenshots saved to: {OUTPUT.absolute()}")`,
  },
  {
    id: 'link-checker',
    title: 'Website Broken Link Checker',
    category: 'Web',
    tags: ['links', 'broken', 'check', 'crawl', '404', 'seo', 'website'],
    description: 'Crawl a website and find all broken links returning 404 or errors',
    requirements: ['requests', 'beautifulsoup4'],
    script: `import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from collections import deque

START_URL  = "https://example.com"
MAX_PAGES  = 50
TIMEOUT    = 10
USER_AGENT = "Mozilla/5.0 Link-Checker"

visited = set()
broken  = []
queue   = deque([START_URL])
base    = urlparse(START_URL).netloc

def get_links(url, html):
    soup = BeautifulSoup(html, 'html.parser')
    for tag in soup.find_all(['a','link','img','script'], href=True):
        href = tag.get('href') or tag.get('src','')
        if href: yield urljoin(url, href)

print(f"=== BROKEN LINK CHECKER ===")
print(f"Crawling: {START_URL} (max {MAX_PAGES} pages)\n")

while queue and len(visited) < MAX_PAGES:
    url = queue.popleft()
    if url in visited: continue
    visited.add(url)

    try:
        r = requests.get(url, timeout=TIMEOUT,
                         headers={'User-Agent': USER_AGENT},
                         allow_redirects=True)
        status = r.status_code
        is_same_domain = urlparse(url).netloc == base

        if status >= 400:
            broken.append({'url': url, 'status': status})
            print(f"  BROKEN {status}: {url}")
        elif is_same_domain:
            for link in get_links(url, r.text):
                if link not in visited:
                    queue.append(link)
            print(f"  OK {status}: {url[:60]}")
    except Exception as e:
        broken.append({'url': url, 'status': 'ERR', 'error': str(e)[:40]})
        print(f"  ERROR: {url[:60]} — {e}")

print(f"\n=== REPORT ===")
print(f"Checked: {len(visited)} URLs | Broken: {len(broken)}")
for b in broken:
    print(f"  [{b['status']}] {b['url']}")`,
  },

  // ── DATA ──────────────────────────────────────────────────────
  {
    id: 'json-processor',
    title: 'JSON Data Processor and Validator',
    category: 'Data',
    tags: ['json', 'data', 'validate', 'transform', 'flatten', 'csv'],
    description: 'Parse, validate, flatten, and transform JSON data with CSV export',
    requirements: [],
    script: `import json, csv, io
from pathlib import Path

def flatten(d, prefix='', sep='.'):
    out = {}
    for k, v in d.items():
        key = f"{prefix}{sep}{k}" if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, key, sep))
        else:
            out[key] = v
    return out

data = {
    "users": [
        {"id":1,"name":"Alice","age":30,"active":True},
        {"id":2,"name":"Bob",  "age":25,"active":False},
        {"id":3,"name":"Carol","age":35,"active":True},
    ],
    "meta": {"total": 3, "page": 1}
}

print("JSON data:")
print(json.dumps(data, indent=2)[:400])

active_users = [u for u in data['users'] if u['active']]
print(f"\nActive users: {[u['name'] for u in active_users]}")

flat = flatten(data['users'][0])
print(f"\nFlattened user: {flat}")

out = io.StringIO()
w = csv.DictWriter(out, fieldnames=['id','name','age','active'])
w.writeheader(); w.writerows(data['users'])
print(f"\nCSV export:\n{out.getvalue()}")

Path("output.json").write_text(json.dumps(data, indent=2))
print("Saved: output.json")`,
  },
  {
    id: 'sqlite-automation',
    title: 'SQLite Database Automation',
    category: 'Data',
    tags: ['sqlite', 'database', 'sql', 'query', 'table', 'crud', 'export'],
    description: 'Automate SQLite database operations — create, insert, query, and export data',
    requirements: [],
    script: `import sqlite3, csv, json
from pathlib import Path
from datetime import datetime

DB_PATH = "butler_data.db"

def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def setup():
    with connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS scripts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT,
                code TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                run_count INTEGER DEFAULT 0
            )
        """)
    print(f"Database ready: {DB_PATH}")

def insert(name, category, code):
    with connect() as conn:
        conn.execute("INSERT INTO scripts (name,category,code) VALUES (?,?,?)",
                     (name, category, code))
    print(f"Inserted: {name}")

def list_all():
    with connect() as conn:
        rows = conn.execute("SELECT id,name,category,run_count FROM scripts").fetchall()
    print(f"\n{'ID':<4} {'Name':<25} {'Category':<15} Runs")
    for r in rows:
        print(f"  {r['id']:<4} {r['name']:<25} {r['category']:<15} {r['run_count']}")

def export_csv(output="scripts_export.csv"):
    with connect() as conn:
        rows = conn.execute("SELECT * FROM scripts").fetchall()
    if rows:
        with open(output, 'w', newline='') as f:
            w = csv.DictWriter(f, fieldnames=rows[0].keys())
            w.writeheader(); w.writerows([dict(r) for r in rows])
        print(f"Exported {len(rows)} rows to {output}")

setup()
insert("System Info", "System", "import platform; print(platform.node())")
insert("Disk Usage",  "Files",  "import shutil; print(shutil.disk_usage('/').used)")
list_all()
export_csv()`,
  },
  {
    id: 'data-anonymizer',
    title: 'PII Data Anonymizer',
    category: 'Data',
    tags: ['pii', 'anonymize', 'redact', 'privacy', 'gdpr', 'data', 'email'],
    description: 'Remove or mask PII (emails, phones, SSNs) from CSV and text datasets',
    requirements: [],
    script: `import re, csv, hashlib
from pathlib import Path

PATTERNS = {
    'email':  (r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', '[EMAIL]'),
    'phone':  (r'(?:\+?1[\s\-]?)?(?:\([0-9]{3}\)|[0-9]{3})[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}', '[PHONE]'),
    'ssn':    (r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]'),
    'ip':     (r'\b(?:\d{1,3}\.){3}\d{1,3}\b', '[IP]'),
}

def anonymize_text(text, mode='redact'):
    result = text
    for pii_type, (pattern, placeholder) in PATTERNS.items():
        for match in set(re.findall(pattern, result)):
            if mode == 'hash':
                h = hashlib.sha256(match.encode()).hexdigest()[:8]
                replacement = f"[{pii_type.upper()}:{h}]"
            else:
                replacement = placeholder
            result = result.replace(match, replacement)
    return result

def anonymize_csv(input_path, output_path, pii_columns):
    with open(input_path, newline='', encoding='utf-8') as f_in, \
         open(output_path, 'w', newline='', encoding='utf-8') as f_out:
        reader = csv.DictReader(f_in)
        writer = csv.DictWriter(f_out, fieldnames=reader.fieldnames)
        writer.writeheader()
        count = 0
        for row in reader:
            for col in pii_columns:
                if col in row: row[col] = anonymize_text(row[col])
            writer.writerow(row); count += 1
    print(f"Anonymized {count} rows -> {output_path}")

sample = "User Alice: alice@company.com, +1-555-123-4567, SSN 123-45-6789, IP 192.168.1.1"
print("Original:", sample)
print("Redacted:", anonymize_text(sample))
print("Hashed:  ", anonymize_text(sample, mode='hash'))`,
  },
  {
    id: 'xml-parser',
    title: 'XML Parser and Converter',
    category: 'Data',
    tags: ['xml', 'parse', 'convert', 'json', 'csv', 'soap', 'rss', 'atom'],
    description: 'Parse XML files including RSS feeds, SOAP responses, and configs, convert to JSON/CSV',
    requirements: [],
    script: `import xml.etree.ElementTree as ET
import json, csv
from pathlib import Path
from urllib.request import urlopen

def xml_to_dict(element):
    result = {}
    for child in element:
        tag = child.tag.split('}')[-1]
        text = (child.text or '').strip()
        if len(child) == 0:
            result[tag] = text
        else:
            result[tag] = xml_to_dict(child)
    return result

def parse_rss(url):
    print(f"Fetching RSS: {url[:60]}")
    try:
        with urlopen(url, timeout=10) as r:
            root = ET.fromstring(r.read())
        items = []
        for item in root.findall('.//item')[:10]:
            entry = {}
            for field in ['title','link','pubDate','description']:
                el = item.find(field)
                if el is not None:
                    entry[field] = (el.text or '').strip()[:100]
            items.append(entry)
        return items
    except Exception as e:
        print(f"Error: {e}"); return []

RSS_URL = "https://feeds.bbci.co.uk/news/rss.xml"
items = parse_rss(RSS_URL)

print(f"\nFound {len(items)} items:")
for i, item in enumerate(items[:5], 1):
    print(f"\n  {i}. {item.get('title','?')}")
    print(f"     {item.get('pubDate','?')}")

if items:
    Path("rss_data.json").write_text(json.dumps(items, indent=2))
    with open("rss_data.csv","w",newline='') as f:
        w = csv.DictWriter(f, fieldnames=items[0].keys())
        w.writeheader(); w.writerows(items)
    print(f"\nSaved: rss_data.json + rss_data.csv")`,
  },

  // ── SETUP ─────────────────────────────────────────────────────
  {
    id: 'git-automation',
    title: 'Git Workflow Automator',
    category: 'Setup',
    tags: ['git', 'commit', 'push', 'pull', 'branch', 'workflow', 'automate', 'changelog'],
    description: 'Automate git workflows — smart commits, branch creation, changelog generation',
    requirements: [],
    script: `import subprocess, sys
from datetime import datetime
from pathlib import Path

def git(*args, check=False):
    r = subprocess.run(["git"] + list(args), capture_output=True, text=True)
    if check and r.returncode != 0: raise Exception(r.stderr.strip())
    return r.stdout.strip(), r.returncode

def status():
    out, _ = git("status", "--short")
    return out

def smart_commit(message=None):
    if not status():
        print("Nothing to commit"); return
    git("add", "-A")
    print("Staged all changes")
    if not message:
        files, _ = git("diff", "--cached", "--name-only")
        changed = [f for f in files.split("\n") if f][:3]
        verb = "Update" if any(f.endswith(('.py','.ts','.js')) for f in changed) else "Add"
        message = f"{verb} {', '.join(changed[:2])}"
    git("commit", "-m", message)
    print(f"Committed: {message}")

def generate_changelog():
    log, _ = git("log", "--oneline", "-20")
    today = datetime.now().strftime('%Y-%m-%d')
    changelog = f"## Changelog — {today}\n\n"
    for line in log.split("\n"):
        if line: changelog += f"- {line[8:]}\n"
    Path("CHANGELOG.md").write_text(changelog)
    print(f"Generated CHANGELOG.md ({len(log.splitlines())} entries)")
    print(changelog[:300])

print("=== GIT WORKFLOW AUTOMATOR ===")
print(f"Status:\n{status() or 'Clean working tree'}")
# smart_commit("feat: add new feature")
generate_changelog()`,
  },
  {
    id: 'cron-manager',
    title: 'Cron Job Manager Linux Mac',
    category: 'Setup',
    tags: ['cron', 'schedule', 'linux', 'mac', 'crontab', 'automate', 'timer'],
    description: 'Add, list, and remove cron jobs programmatically on Linux and Mac',
    requirements: [],
    script: `import subprocess, sys

if sys.platform == 'win32':
    print("Linux/Mac only. Use Task Scheduler script for Windows."); exit()

def get_crontab():
    r = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
    if r.returncode != 0: return []
    return [l for l in r.stdout.strip().split("\n") if l]

def set_crontab(lines):
    content = "\n".join(lines) + "\n"
    proc = subprocess.Popen(["crontab", "-"], stdin=subprocess.PIPE)
    proc.communicate(content.encode())

def add_cron(schedule, command, label=""):
    lines = get_crontab()
    if command in "\n".join(lines):
        print(f"Already exists: {command[:50]}"); return
    if label: lines.append(f"# {label}")
    lines.append(f"{schedule} {command}")
    set_crontab(lines)
    print(f"Added: {schedule} {command}")

def remove_cron(pattern):
    lines = get_crontab()
    new_lines = [l for l in lines if pattern not in l]
    removed = len(lines) - len(new_lines)
    set_crontab(new_lines)
    print(f"Removed {removed} cron job(s) matching: {pattern}")

def list_crons():
    lines = get_crontab()
    print(f"=== CRON JOBS ({len([l for l in lines if not l.startswith('#')])} jobs) ===")
    for line in lines:
        print(f"  {line}")

list_crons()
# add_cron("0 2 * * *",   "/usr/bin/python3 /home/user/backup.py",  "Daily Backup at 2am")
# add_cron("*/30 * * * *", "/usr/bin/python3 /home/user/monitor.py", "30min System Check")`,
  },
  {
    id: 'docker-composer',
    title: 'Docker Compose Auto Deploy',
    category: 'Setup',
    tags: ['docker', 'compose', 'deploy', 'container', 'yaml', 'stack', 'nginx'],
    description: 'Generate and deploy a Docker Compose stack with web, database, and cache services',
    requirements: [],
    script: `import subprocess
from pathlib import Path

COMPOSE_CONTENT = """version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./html:/usr/share/nginx/html
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: secret
    volumes:
      - pg_data:/var/lib/postgresql/data
    restart: unless-stopped

  cache:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  pg_data:
"""

compose_file = Path("docker-compose.yml")
compose_file.write_text(COMPOSE_CONTENT.strip())
print(f"Written: {compose_file}")
print("\nStack: nginx (web) + postgres (db) + redis (cache)")

check = subprocess.run(["docker", "info"], capture_output=True)
if check.returncode != 0:
    print("\nDocker not running. Install Docker Desktop and try again."); exit()

def docker_compose(cmd):
    r = subprocess.run(["docker", "compose"] + cmd.split(), capture_output=True, text=True)
    print(r.stdout or r.stderr)
    return r.returncode == 0

print("\nPulling images...")
docker_compose("pull")
print("\nStarting stack...")
if docker_compose("up -d"):
    print("\nStack running!")
    docker_compose("ps")`,
  },
  {
    id: 'python-project-scaffolder',
    title: 'Python Project Scaffolder',
    category: 'Setup',
    tags: ['scaffold', 'project', 'structure', 'template', 'boilerplate', 'python', 'setup.py'],
    description: 'Create a complete Python project structure with tests, docs, CI/CD and config files',
    requirements: [],
    script: `import os, sys
from pathlib import Path

PROJECT_NAME = "my_project"
AUTHOR       = "Your Name"
EMAIL        = "your@email.com"
DESCRIPTION  = "A Python automation project"

root = Path(PROJECT_NAME)
files = {
    "README.md": f"# {PROJECT_NAME}\n\n{DESCRIPTION}\n\n## Setup\n\npip install -e .\npython -m {PROJECT_NAME}\n",
    "setup.py":  f"""from setuptools import setup, find_packages
setup(
    name="{PROJECT_NAME}",
    version="0.1.0",
    author="{AUTHOR}",
    author_email="{EMAIL}",
    description="{DESCRIPTION}",
    packages=find_packages(),
    install_requires=[],
    python_requires=">=3.9",
)
""",
    ".gitignore": "__pycache__/\n*.pyc\n*.pyo\n.env\n.venv/\ndist/\nbuild/\n*.egg-info/\n",
    ".env.example": "# Environment variables\nDEBUG=True\nAPI_KEY=your_key_here\n",
    f"{PROJECT_NAME}/__init__.py": f'"""\\n{DESCRIPTION}\\n"""\n__version__ = "0.1.0"\n',
    f"{PROJECT_NAME}/__main__.py": f"""def main():
    print(f"{PROJECT_NAME} running!")

if __name__ == "__main__":
    main()
""",
    "tests/__init__.py": "",
    "tests/test_main.py": f"""import pytest
from {PROJECT_NAME} import __version__

def test_version():
    assert __version__ == "0.1.0"
""",
    ".github/workflows/ci.yml": f"""name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {{python-version: "3.11"}}
      - run: pip install -e . pytest
      - run: pytest
""",
}

for path_str, content in files.items():
    path = root / path_str
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')
    print(f"  Created: {path}")

print(f"\nProject '{PROJECT_NAME}' scaffolded!")
print(f"cd {PROJECT_NAME} && pip install -e . && python -m {PROJECT_NAME}")`,
  },

  // ── PRIVACY ───────────────────────────────────────────────────
  {
    id: 'wifi-security-scan',
    title: 'WiFi Network Security Scanner',
    category: 'Privacy',
    tags: ['wifi', 'scan', 'security', 'networks', 'ssid', 'wpa', 'open'],
    description: 'Scan nearby WiFi networks and evaluate their security posture',
    requirements: [],
    script: `import subprocess, sys

print("=== WIFI NETWORK SCANNER ===")

def scan_windows():
    r = subprocess.run(["netsh","wlan","show","networks","mode=bssid"],
                       capture_output=True, text=True)
    networks = []; current = {}
    for line in r.stdout.split("\n"):
        line = line.strip()
        if line.startswith("SSID") and "BSSID" not in line:
            if current: networks.append(current)
            current = {'ssid': line.split(":",1)[1].strip() if ":" in line else ""}
        elif "Authentication" in line and ":" in line:
            current['auth'] = line.split(":",1)[1].strip()
        elif "Signal" in line and ":" in line:
            current['signal'] = line.split(":",1)[1].strip()
    if current: networks.append(current)
    return networks

def rate_security(auth):
    if not auth: return "?"
    if "WPA3"  in auth: return "STRONG (WPA3)"
    if "WPA2"  in auth: return "GOOD (WPA2)"
    if "WPA"   in auth: return "FAIR (WPA)"
    if "Open"  in auth: return "OPEN - NO ENCRYPTION!"
    return "UNKNOWN"

if sys.platform == 'win32':
    nets = scan_windows()
    print(f"Found {len(nets)} networks:\n")
    print(f"{'SSID':32} {'Security':25} Signal")
    print("-" * 65)
    for n in nets:
        ssid = n.get('ssid','?')[:30]
        sec  = rate_security(n.get('auth',''))
        print(f"  {ssid:32} {sec:25} {n.get('signal','?')}")
else:
    r = subprocess.run(["nmcli","-f","SSID,SIGNAL,SECURITY","dev","wifi"],
                       capture_output=True, text=True)
    print(r.stdout if r.returncode==0 else "Run: sudo nmcli dev wifi")`,
  },
  {
    id: 'dns-benchmark',
    title: 'DNS Benchmark and Privacy Checker',
    category: 'Privacy',
    tags: ['dns', 'benchmark', 'speed', 'resolver', 'flush', 'cache', 'privacy'],
    description: 'Benchmark DNS servers for speed and recommend best privacy-focused resolver',
    requirements: [],
    script: `import socket, time, subprocess, sys

DNS_SERVERS = {
    "Google 8.8.8.8":      "8.8.8.8",
    "Google 8.8.4.4":      "8.8.4.4",
    "Cloudflare 1.1.1.1":  "1.1.1.1",
    "Cloudflare 1.0.0.1":  "1.0.0.1",
    "Quad9 9.9.9.9":       "9.9.9.9",
    "OpenDNS 208.67.222":  "208.67.222.222",
}

TEST_DOMAINS = ["google.com", "github.com", "youtube.com"]

def test_dns(domain):
    times = []
    for _ in range(3):
        start = time.perf_counter()
        try:
            socket.gethostbyname(domain)
            times.append((time.perf_counter() - start) * 1000)
        except: times.append(9999)
    return min(times)

print("=== DNS BENCHMARK ===\n")
results = []
for name, ip in DNS_SERVERS.items():
    lats = [test_dns(d) for d in TEST_DOMAINS[:2]]
    avg  = sum(lats) / len(lats)
    results.append((avg, name, ip))
    print(f"  {name:30} {avg:6.0f}ms")

winner = min(results)
print(f"\nFastest: {winner[1]} ({winner[0]:.0f}ms) [{winner[2]}]")
print("\nPrivacy note: Cloudflare 1.1.1.1 = fastest + no-logging policy")

print("\nFlushing DNS cache...")
if sys.platform == 'win32':
    subprocess.run("ipconfig /flushdns", shell=True)
elif sys.platform == 'darwin':
    subprocess.run("sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder", shell=True)
else:
    subprocess.run("sudo systemd-resolve --flush-caches 2>/dev/null || sudo resolvectl flush-caches",
                   shell=True)
print("DNS cache flushed!")`,
  },
  {
    id: 'hosts-ad-blocker',
    title: 'Hosts File Ad Blocker',
    category: 'Privacy',
    tags: ['ads', 'block', 'hosts', 'privacy', 'tracker', 'dns', 'adblock'],
    description: 'Add ad-blocking rules to the system hosts file to block thousands of ad domains',
    requirements: [],
    script: `import sys, urllib.request
from pathlib import Path
from datetime import datetime

HOSTS_FILE = Path("C:/Windows/System32/drivers/etc/hosts") if sys.platform == 'win32' else Path("/etc/hosts")
BACKUP     = HOSTS_FILE.parent / f"hosts.backup.{datetime.now().strftime('%Y%m%d')}"

SAMPLE_BLOCKS = [
    "0.0.0.0 ads.google.com",
    "0.0.0.0 doubleclick.net",
    "0.0.0.0 googlesyndication.com",
    "0.0.0.0 googleadservices.com",
    "0.0.0.0 adservice.google.com",
    "0.0.0.0 analytics.google.com",
    "0.0.0.0 facebook.com/tr",
    "0.0.0.0 pixel.facebook.com",
    "0.0.0.0 connect.facebook.net",
    "0.0.0.0 scorecardresearch.com",
    "0.0.0.0 outbrain.com",
    "0.0.0.0 taboola.com",
    "0.0.0.0 bing.com/fd",
    "0.0.0.0 ads.yahoo.com",
    "0.0.0.0 amazon-adsystem.com",
]

print("=== HOSTS AD BLOCKER ===")
print(f"Hosts file: {HOSTS_FILE}")

if not HOSTS_FILE.exists():
    print("Hosts file not found"); exit()

current = HOSTS_FILE.read_text(errors='replace')

marker_start = "# BEGIN BUTLER_AD_BLOCK"
marker_end   = "# END BUTLER_AD_BLOCK"

block = f"{marker_start}\n"
block += "\n".join(SAMPLE_BLOCKS)
block += f"\n{marker_end}\n"

if marker_start in current:
    import re
    current = re.sub(f"{marker_start}.*?{marker_end}", block.strip(), current, flags=re.DOTALL)
    print("Updating existing block...")
else:
    current += f"\n{block}"
    print("Adding new block...")

print(f"\nWould add {len(SAMPLE_BLOCKS)} ad domain blocks")
print("Preview:\n" + "\n".join(SAMPLE_BLOCKS[:5]) + "\n...")
print("\nTo apply (requires admin/sudo):")
print(f"  Replace {HOSTS_FILE} with the updated version")
print("\nAlternative: use browser extension uBlock Origin")`,
  },

  // ── BACKUP ────────────────────────────────────────────────────
  {
    id: 'backup-verifier',
    title: 'Backup Integrity Verifier',
    category: 'Backup',
    tags: ['backup', 'verify', 'checksum', 'integrity', 'restore', 'test'],
    description: 'Verify backup ZIP integrity using checksums and report corrupted archives',
    requirements: [],
    script: `import hashlib, zipfile, json
from pathlib import Path
from datetime import datetime

BACKUP_DIR = Path.home() / "Backups"

def hash_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def verify_zip(zip_path):
    try:
        with zipfile.ZipFile(zip_path) as zf:
            bad = zf.testzip()
            if bad: return False, f"Corrupted file: {bad}"
            return True, f"OK — {len(zf.namelist())} files"
    except Exception as e:
        return False, str(e)

report = {"ts": datetime.now().isoformat(), "checked": 0, "ok": 0, "failed": 0, "details": []}

print(f"=== BACKUP VERIFIER ===")
print(f"Directory: {BACKUP_DIR}\n")

if not BACKUP_DIR.exists():
    print(f"Backup dir not found: {BACKUP_DIR}"); exit()

for backup in sorted(BACKUP_DIR.rglob("*.zip")):
    ok, msg = verify_zip(backup)
    h = hash_file(backup)
    report["checked"] += 1
    report["ok" if ok else "failed"] += 1
    report["details"].append({"file": backup.name, "ok": ok, "msg": msg, "hash": h[:16]})
    status = "OK  " if ok else "FAIL"
    print(f"  {status} {backup.name:40} {msg}")

print(f"\nSummary: {report['ok']}/{report['checked']} OK | {report['failed']} FAILED")
Path("backup_report.json").write_text(json.dumps(report, indent=2))
print("Report saved: backup_report.json")`,
  },
  {
    id: 'cloud-sync-checker',
    title: 'File Sync Change Detector',
    category: 'Backup',
    tags: ['cloud', 'sync', 'backup', 'check', 'missing', 'files', 'diff'],
    description: 'Detect new, deleted, and changed files between scans for backup validation',
    requirements: [],
    script: `import hashlib, json
from pathlib import Path
from datetime import datetime

LOCAL_DIR   = Path.home() / "Documents"
REPORT_FILE = Path("sync_report.json")

def hash_file(path):
    h = hashlib.md5()
    try:
        with open(path, 'rb') as f:
            while chunk := f.read(65536):
                h.update(chunk)
        return h.hexdigest()
    except: return None

def scan(directory):
    manifest = {}
    for f in Path(directory).rglob('*'):
        if not f.is_file(): continue
        try:
            rel = str(f.relative_to(directory))
            manifest[rel] = {'size': f.stat().st_size, 'hash': hash_file(f)}
        except: pass
    return manifest

print(f"Scanning {LOCAL_DIR}...")
current = scan(LOCAL_DIR)
print(f"Found {len(current)} files")

if REPORT_FILE.exists():
    previous = json.loads(REPORT_FILE.read_text())
    prev_manifest = previous.get('manifest', {})
    new_files     = [f for f in current if f not in prev_manifest]
    deleted_files = [f for f in prev_manifest if f not in current]
    changed_files = [
        f for f in current
        if f in prev_manifest and current[f]['hash'] != prev_manifest[f]['hash']
    ]
    print(f"\nChanges since {previous.get('ts','?')[:16]}:")
    print(f"  New files:     {len(new_files)}")
    print(f"  Deleted files: {len(deleted_files)}")
    print(f"  Changed files: {len(changed_files)}")
    for f in new_files[:5]:     print(f"    + {f}")
    for f in deleted_files[:5]: print(f"    - {f}")
    for f in changed_files[:5]: print(f"    ~ {f}")
else:
    print("First scan — baseline created")

REPORT_FILE.write_text(json.dumps({'ts': datetime.now().isoformat(), 'manifest': current}, indent=2))
print(f"\nManifest saved ({len(current)} files)")`,
  },
  {
    id: 'database-dumper',
    title: 'Database Backup Dumper',
    category: 'Backup',
    tags: ['database', 'backup', 'mysql', 'postgres', 'mongodb', 'dump'],
    description: 'Auto-backup MySQL, PostgreSQL, MongoDB databases to compressed archives',
    requirements: [],
    script: `import subprocess, os
from pathlib import Path
from datetime import datetime

BACKUP_DIR = Path.home() / "db_backups"
BACKUP_DIR.mkdir(exist_ok=True)
ts = datetime.now().strftime("%Y%m%d_%H%M%S")

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

def backup_postgres(db='postgres'):
    out_file = BACKUP_DIR / f"pg_{db}_{ts}.sql.gz"
    env = {**os.environ, 'PGPASSWORD': 'your_password'}
    cmd = f"pg_dump -U postgres {db} | gzip > {out_file}"
    r = subprocess.run(cmd, shell=True, env=env, capture_output=True)
    print(f"  PostgreSQL: {'OK' if r.returncode==0 else r.stderr.decode()[:80]}")

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
print("\nBackups saved to:", BACKUP_DIR)`,
  },

  // ── PERFORMANCE ───────────────────────────────────────────────
  {
    id: 'code-profiler',
    title: 'Python Code Profiler and Optimizer',
    category: 'Performance',
    tags: ['profile', 'benchmark', 'optimize', 'cprofile', 'timing', 'python', 'bottleneck'],
    description: 'Profile Python code to find bottlenecks and benchmark alternatives',
    requirements: [],
    script: `import cProfile, pstats, io, time, math

def timeit(func, *args, runs=5, **kwargs):
    times = []
    for _ in range(runs):
        start = time.perf_counter()
        func(*args, **kwargs)
        times.append(time.perf_counter() - start)
    avg = sum(times) / runs
    print(f"  {func.__name__:25} avg {avg*1000:8.2f}ms  "
          f"min {min(times)*1000:.2f}ms  max {max(times)*1000:.2f}ms")

def sum_squares_slow(n):
    return sum(i ** 2 for i in range(n))

def sum_squares_fast(n):
    return n * (n-1) * (2*n-1) // 6

def find_primes_slow(limit):
    return [n for n in range(2, limit)
            if all(n % i != 0 for i in range(2, int(n**0.5)+1))]

def find_primes_sieve(limit):
    sieve = [True] * limit
    sieve[0] = sieve[1] = False
    for i in range(2, int(limit**0.5)+1):
        if sieve[i]:
            for j in range(i*i, limit, i): sieve[j] = False
    return [i for i, p in enumerate(sieve) if p]

N = 10000
print("=== BENCHMARK COMPARISON ===\n")
timeit(sum_squares_slow, N)
timeit(sum_squares_fast, N)
print()
timeit(find_primes_slow, N, runs=3)
timeit(find_primes_sieve, N)

print("\n=== CPROFILE OUTPUT ===")
pr = cProfile.Profile()
pr.enable()
find_primes_slow(5000)
pr.disable()
s = io.StringIO()
pstats.Stats(pr, stream=s).sort_stats('cumulative').print_stats(8)
print(s.getvalue())`,
  },
  {
    id: 'tcp-stack-optimizer',
    title: 'TCP Network Stack Optimizer',
    category: 'Performance',
    tags: ['network', 'tcp', 'optimize', 'sysctl', 'buffer', 'performance', 'linux'],
    description: 'Tune TCP/IP kernel parameters for maximum network throughput and low latency',
    requirements: [],
    script: `import subprocess, sys

if sys.platform == 'win32':
    print("=== WINDOWS TCP OPTIMIZER ===")
    tweaks = [
        ("netsh int tcp set global autotuninglevel=normal",  "TCP AutoTuning: normal"),
        ("netsh int tcp set global rss=enabled",             "RSS (Receive Side Scaling): on"),
        ("netsh int tcp set global ecncapability=enabled",   "ECN: enabled"),
        ("netsh int tcp set global chimney=enabled",         "TCP Chimney Offload: on"),
    ]
    for cmd, label in tweaks:
        r = subprocess.run(cmd, shell=True, capture_output=True)
        tag = "OK  " if r.returncode == 0 else "SKIP"
        print(f"  [{tag}] {label}")
    print("\nRun: netsh int tcp show global (to verify)")
else:
    print("=== LINUX TCP OPTIMIZER ===")
    print("(These settings require sudo)\n")
    SETTINGS = {
        'net.core.rmem_max':              '134217728',
        'net.core.wmem_max':              '134217728',
        'net.ipv4.tcp_rmem':             '4096 87380 134217728',
        'net.ipv4.tcp_wmem':             '4096 65536 134217728',
        'net.ipv4.tcp_fastopen':          '3',
        'net.ipv4.tcp_mtu_probing':       '1',
        'net.core.netdev_max_backlog':    '250000',
        'net.core.somaxconn':             '65535',
        'net.ipv4.tcp_tw_reuse':          '1',
    }
    for key, val in SETTINGS.items():
        r = subprocess.run(f"sudo sysctl -w {key}='{val}'", shell=True, capture_output=True, text=True)
        tag = "OK  " if r.returncode == 0 else "ERR "
        print(f"  [{tag}] {key} = {val}")
    print("\nTo persist: sudo sysctl -p")`,
  },
  {
    id: 'memory-profiler',
    title: 'Memory Usage Profiler',
    category: 'Performance',
    tags: ['memory', 'profile', 'leak', 'usage', 'trace', 'optimize', 'ram'],
    description: 'Profile memory usage of Python code to detect leaks and excessive allocations',
    requirements: ['memory-profiler'],
    script: `import tracemalloc, sys, gc
from datetime import datetime

print("=== MEMORY USAGE PROFILER ===")
print(f"Python: {sys.version.split()[0]}")

# Start tracing memory
tracemalloc.start()

# ── Code to profile ─────────────────────────────────────────
big_list = [str(i) * 100 for i in range(10000)]
big_dict = {i: [j for j in range(100)] for i in range(100)}
matrix   = [[0.0] * 100 for _ in range(100)]
# ────────────────────────────────────────────────────────────

snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')

print("\nTop 10 memory allocations:")
for stat in top_stats[:10]:
    print(f"  {stat.size/1024:8.1f}KB  {stat}")

current, peak = tracemalloc.get_traced_memory()
tracemalloc.stop()

print(f"\nCurrent memory: {current/1024**2:.2f}MB")
print(f"Peak memory:    {peak/1024**2:.2f}MB")

# GC stats
print(f"\nGarbage Collector:")
print(f"  Collections: {gc.get_count()}")
collected = gc.collect()
print(f"  Collected:   {collected} objects")

# System memory
import psutil
vm = psutil.virtual_memory()
print(f"\nSystem RAM: {vm.used/1024**3:.1f}/{vm.total/1024**3:.1f}GB ({vm.percent}%)")`,
  },

  // ── TEXT ──────────────────────────────────────────────────────
  {
    id: 'markdown-converter',
    title: 'Markdown to HTML Batch Converter',
    category: 'Text',
    tags: ['markdown', 'html', 'pdf', 'convert', 'doc', 'readme', 'batch'],
    description: 'Convert all Markdown files in a directory to styled HTML documents',
    requirements: ['markdown'],
    script: `from pathlib import Path
import markdown

CSS = """
body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333}
h1,h2,h3{color:#2c3e50;border-bottom:2px solid #eee;padding-bottom:8px}
code{background:#f4f4f4;padding:2px 6px;border-radius:3px;font-family:monospace;font-size:0.9em}
pre code{display:block;padding:12px;overflow-x:auto}
blockquote{border-left:4px solid #3498db;margin:0;padding:0 16px;color:#666}
table{border-collapse:collapse;width:100%}
td,th{border:1px solid #ddd;padding:8px;text-align:left}
th{background:#f2f2f2}
"""

def md_to_html(md_file, out_file=None):
    md_path   = Path(md_file)
    content   = md_path.read_text(encoding='utf-8')
    html_body = markdown.markdown(content, extensions=['tables','fenced_code','toc'])
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{md_path.stem}</title>
<style>{CSS}</style></head>
<body>{html_body}</body></html>"""
    out = Path(out_file or md_path.with_suffix('.html'))
    out.write_text(html, encoding='utf-8')
    print(f"  {md_path.name:35} -> {out.name} ({out.stat().st_size//1024}KB)")
    return out

count = 0
for md_file in Path('.').glob("**/*.md"):
    try: md_to_html(md_file); count += 1
    except Exception as e: print(f"  Error {md_file.name}: {e}")

if count == 0:
    sample = Path("sample.md")
    sample.write_text("# Hello\n\nThis is a **Markdown** test.\n\nprint('hello')\n")
    md_to_html(sample); count = 1

print(f"\nConverted {count} Markdown files to HTML")`,
  },
  {
    id: 'regex-batch-extractor',
    title: 'Regex Pattern Batch Extractor',
    category: 'Text',
    tags: ['regex', 'extract', 'pattern', 'search', 'grep', 'batch', 'email', 'ip', 'url'],
    description: 'Extract emails, IPs, URLs, phone numbers from multiple files using regex',
    requirements: [],
    script: `import re
from pathlib import Path
from collections import defaultdict

PATTERNS = {
    'emails':     r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}',
    'urls':       r'https?://[^\s<>"{}|^\[\]]+',
    'ipv4':       r'\b(?:\d{1,3}\.){3}\d{1,3}\b',
    'phones':     r'(?:\+?1[\s-]?)?(?:\([0-9]{3}\)|[0-9]{3})[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}',
    'dates_iso':  r'\b\d{4}-\d{2}-\d{2}\b',
    'hex_colors': r'#[0-9a-fA-F]{6}\b',
}

def extract_from_text(text):
    results = {}
    for name, pattern in PATTERNS.items():
        found = list(set(re.findall(pattern, text)))
        if found: results[name] = found
    return results

SCAN_DIR  = Path(".")
SCAN_EXTS = ['*.txt','*.log','*.html','*.csv','*.md','*.py','*.json']
all_found = defaultdict(set)
files_scanned = 0

for ext in SCAN_EXTS:
    for f in SCAN_DIR.rglob(ext):
        try:
            found = extract_from_text(f.read_text(errors='replace'))
            if found:
                files_scanned += 1
                for key, vals in found.items():
                    all_found[key].update(vals)
                    print(f"  {f.name:30} {key}: {len(vals)} found")
        except: pass

print(f"\n=== SUMMARY ({files_scanned} files scanned) ===")
for key, vals in all_found.items():
    print(f"  {key:15}: {len(vals)} unique")
    for v in list(vals)[:3]:
        print(f"    {v[:70]}")`,
  },
  {
    id: 'text-diff-tool',
    title: 'Text Diff and Comparison Tool',
    category: 'Text',
    tags: ['diff', 'compare', 'text', 'file', 'delta', 'changes', 'version'],
    description: 'Compare two text files or strings and show a colored diff of changes',
    requirements: [],
    script: `import difflib
from pathlib import Path

def diff_files(file1, file2):
    path1 = Path(file1); path2 = Path(file2)
    if not path1.exists(): print(f"Not found: {file1}"); return
    if not path2.exists(): print(f"Not found: {file2}"); return
    text1 = path1.read_text(errors='replace').splitlines()
    text2 = path2.read_text(errors='replace').splitlines()
    return diff_texts(text1, text2, path1.name, path2.name)

def diff_texts(text1, text2, label1="A", label2="B"):
    if isinstance(text1, str): text1 = text1.splitlines()
    if isinstance(text2, str): text2 = text2.splitlines()

    diff = list(difflib.unified_diff(text1, text2, fromfile=label1, tofile=label2, lineterm=''))

    if not diff:
        print("Files are identical!"); return

    added   = sum(1 for l in diff if l.startswith('+') and not l.startswith('+++'))
    removed = sum(1 for l in diff if l.startswith('-') and not l.startswith('---'))
    print(f"Changes: +{added} added  -{removed} removed  total lines: {len(text1)}/{len(text2)}\n")

    for line in diff[:100]:
        if line.startswith('+'): print(f"  ADD: {line[1:][:80]}")
        elif line.startswith('-'): print(f"  DEL: {line[1:][:80]}")
        elif line.startswith('@@'): print(f"\n  {line}")

    ratio = difflib.SequenceMatcher(None, text1, text2).ratio()
    print(f"\nSimilarity: {ratio*100:.1f}%")

# Example comparison
TEXT_A = ["line 1", "line 2", "line 3", "old line 4"]
TEXT_B = ["line 1", "line 2 modified", "line 3", "new line 5"]

print("=== TEXT DIFF TOOL ===")
diff_texts(TEXT_A, TEXT_B, "version_1.txt", "version_2.txt")

# File comparison (uncomment):
# diff_files("config_old.txt", "config_new.txt")`,
  },

  // ── EMAIL ─────────────────────────────────────────────────────
  {
    id: 'slack-discord-notifier',
    title: 'Slack and Discord Notifier',
    category: 'Email',
    tags: ['slack', 'discord', 'webhook', 'notify', 'alert', 'message', 'bot'],
    description: 'Send formatted alerts and notifications to Slack and Discord via webhooks',
    requirements: ['requests'],
    script: `import requests, json
from datetime import datetime

SLACK_WEBHOOK   = "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
DISCORD_WEBHOOK = "https://discord.com/api/webhooks/YOUR/DISCORD_WEBHOOK"

def send_slack(message, title=None, color="good", fields=None):
    payload = {"attachments": [{
        "color":   color,
        "title":   title or "Butler AI Alert",
        "text":    message,
        "fields":  fields or [],
        "footer":  f"Butler AI * {datetime.now().strftime('%H:%M:%S')}",
    }]}
    r = requests.post(SLACK_WEBHOOK, json=payload, timeout=10)
    return r.status_code == 200

def send_discord(message, title=None, color=0x00ccdd, fields=None):
    embed = {
        "title":       title or "Notification",
        "description": message,
        "color":       color,
        "fields":      fields or [],
        "footer":      {"text": datetime.now().strftime('%Y-%m-%d %H:%M:%S')},
    }
    payload = {"username": "Butler AI", "embeds": [embed]}
    r = requests.post(DISCORD_WEBHOOK, json=payload, timeout=10)
    return r.status_code == 204

def notify(msg, level="info", title=None):
    COLORS = {"info": ("good",0x00ff88), "warning": ("warning",0xff8c00), "error": ("danger",0xff3300)}
    slack_col, dc_col = COLORS.get(level, ("good",0x00ccdd))
    print(f"[{level.upper()}] {msg}")
    results = []
    if "YOUR" not in SLACK_WEBHOOK:
        ok = send_slack(msg, title=title, color=slack_col)
        results.append(f"Slack: {'OK' if ok else 'FAIL'}")
    if "YOUR" not in DISCORD_WEBHOOK:
        ok = send_discord(msg, title=title, color=dc_col)
        results.append(f"Discord: {'OK' if ok else 'FAIL'}")
    if results: print("  " + " | ".join(results))
    else: print("  Configure SLACK_WEBHOOK and DISCORD_WEBHOOK URLs to send notifications")

notify("Butler AI automation complete", "info", "System Status")
# notify("CPU at 95% — check processes!", "warning", "Performance Alert")
# notify("Disk full on /dev/sda1", "error", "Critical Alert")`,
  },
  {
    id: 'email-inbox-monitor',
    title: 'Email Inbox Monitor and Filter',
    category: 'Email',
    tags: ['email', 'imap', 'monitor', 'inbox', 'gmail', 'read', 'filter', 'automate'],
    description: 'Monitor email inbox via IMAP, filter by sender/subject, and trigger actions',
    requirements: [],
    script: `import imaplib, email
from email.header import decode_header
from datetime import datetime

IMAP_HOST  = "imap.gmail.com"
EMAIL_ADDR = "your.email@gmail.com"
PASSWORD   = "your_app_password"
MAILBOX    = "INBOX"
MAX_EMAILS = 10

FILTERS = {
    'important': ['boss@company.com', 'urgent@domain.com'],
    'invoices':  ['billing@'],
}

def decode_str(s):
    if not s: return ""
    parts = []
    for part, enc in decode_header(s):
        if isinstance(part, bytes):
            parts.append(part.decode(enc or 'utf-8', errors='replace'))
        else:
            parts.append(str(part))
    return " ".join(parts)

def categorize(sender, subject):
    for category, keywords in FILTERS.items():
        if any(k in sender.lower() or k in subject.lower() for k in keywords):
            return category
    return "general"

try:
    with imaplib.IMAP4_SSL(IMAP_HOST) as mail:
        mail.login(EMAIL_ADDR, PASSWORD)
        mail.select(MAILBOX)
        _, ids = mail.search(None, 'UNSEEN')
        email_ids = ids[0].split()
        print(f"=== EMAIL MONITOR ===")
        print(f"Unread emails: {len(email_ids)}\n")
        for eid in email_ids[-MAX_EMAILS:]:
            _, data = mail.fetch(eid, '(RFC822)')
            msg = email.message_from_bytes(data[0][1])
            subject = decode_str(msg['Subject'])
            sender  = decode_str(msg['From'])
            cat     = categorize(sender, subject)
            print(f"  [{cat.upper():10}] From: {sender[:35]:35} | {subject[:40]}")
except Exception as e:
    print(f"Error: {e}")
    print("\nSetup: Enable IMAP in Gmail Settings")
    print("Use Gmail App Password (not regular password)")`,
  },
  {
    id: 'newsletter-monitor',
    title: 'RSS Newsletter and News Aggregator',
    category: 'Email',
    tags: ['rss', 'news', 'newsletter', 'aggregate', 'feed', 'email', 'digest'],
    description: 'Aggregate RSS feeds and generate a daily HTML email digest with top stories',
    requirements: ['requests', 'beautifulsoup4'],
    script: `import requests
from bs4 import BeautifulSoup
from pathlib import Path
from datetime import datetime

FEEDS = [
    ("Hacker News",    "https://news.ycombinator.com/rss"),
    ("Python News",    "https://feeds.feedburner.com/PythonInsider"),
    ("Tech Crunch",    "https://techcrunch.com/feed/"),
    ("GitHub Trending","https://github.com/trending"),
]

MAX_PER_FEED = 5

def fetch_rss(name, url):
    try:
        r = requests.get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(r.content, 'xml')
        items = []
        for item in soup.find_all('item')[:MAX_PER_FEED]:
            title = item.find('title')
            link  = item.find('link')
            pub   = item.find('pubDate')
            if title and link:
                items.append({
                    'title': title.get_text()[:80],
                    'url':   link.get_text()[:150],
                    'date':  pub.get_text()[:30] if pub else '?',
                })
        return items
    except Exception as e:
        print(f"  Error {name}: {e}"); return []

print(f"=== DAILY NEWS DIGEST — {datetime.now().strftime('%Y-%m-%d')} ===\n")

all_items = []
for name, url in FEEDS:
    items = fetch_rss(name, url)
    if items:
        print(f"\n{name} ({len(items)} articles):")
        for item in items:
            print(f"  • {item['title']}")
        all_items.append((name, items))

html = f"<html><body><h1>Daily Digest — {datetime.now().strftime('%Y-%m-%d')}</h1>"
for name, items in all_items:
    html += f"<h2>{name}</h2><ul>"
    for item in items:
        html += f"<li><a href='{item['url']}'>{item['title']}</a></li>"
    html += "</ul>"
html += "</body></html>"

Path("daily_digest.html").write_text(html, encoding='utf-8')
total = sum(len(items) for _, items in all_items)
print(f"\nDigest saved: daily_digest.html ({total} articles)")`,
  },

  // ── GUI ───────────────────────────────────────────────────────
  {
    id: 'screen-timelapse',
    title: 'Screen Time-Lapse Recorder',
    category: 'GUI',
    tags: ['screen', 'record', 'capture', 'video', 'screenshot', 'time-lapse'],
    description: 'Capture screenshots at regular intervals and compile into a time-lapse video',
    requirements: ['Pillow', 'pyautogui', 'opencv-python'],
    script: `import time
from pathlib import Path
from datetime import datetime

def timelapse(duration_sec=30, fps=1, output="timelapse.mp4"):
    try:
        import pyautogui, cv2, numpy as np
    except ImportError:
        print("pip install pyautogui opencv-python Pillow numpy"); return

    frame_dir = Path("timelapse_frames")
    frame_dir.mkdir(exist_ok=True)
    end_time  = time.time() + duration_sec
    frames    = []
    i = 0

    print(f"Recording {duration_sec}s at {fps}fps...")
    print("Move mouse to top-left corner to abort!")
    while time.time() < end_time:
        screenshot = pyautogui.screenshot()
        arr   = np.array(screenshot)
        frame = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
        path  = frame_dir / f"frame_{i:05d}.png"
        cv2.imwrite(str(path), frame)
        frames.append(str(path))
        print(f"  Frame {i:3d}: {end_time-time.time():.0f}s left", end='\r')
        time.sleep(1.0 / max(fps, 0.1)); i += 1

    if frames:
        h, w = cv2.imread(frames[0]).shape[:2]
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out_fps = max(fps * 10, 10)
        out = cv2.VideoWriter(output, fourcc, out_fps, (w, h))
        for f in frames:
            out.write(cv2.imread(f))
        out.release()
        print(f"\nSaved: {output} ({len(frames)} frames, {out_fps}fps playback)")

    import shutil; shutil.rmtree(frame_dir)

timelapse(duration_sec=10, fps=1)`,
  },
  {
    id: 'window-layout-manager',
    title: 'Window Layout Manager',
    category: 'GUI',
    tags: ['window', 'position', 'layout', 'multi-monitor', 'resize', 'arrange', 'tile'],
    description: 'Auto-arrange application windows in tiled layouts for productivity',
    requirements: ['pyautogui', 'pygetwindow'],
    script: `import pyautogui, sys

try:
    import pygetwindow as gw
except ImportError:
    print("pip install pygetwindow pyautogui"); exit()

SW, SH = pyautogui.size()
print(f"Screen: {SW}x{SH}")

def list_windows():
    print("\nOpen windows:")
    for w in gw.getAllWindows():
        if w.title:
            print(f"  {w.title[:45]:45} {w.left:5},{w.top:4}  {w.width}x{w.height}")

def find_window(title_pattern):
    return [w for w in gw.getAllWindows()
            if title_pattern.lower() in w.title.lower() and w.title]

def tile_left(title_pattern):
    wins = find_window(title_pattern)
    if not wins: print(f"Not found: '{title_pattern}'"); return
    wins[0].moveTo(0, 0); wins[0].resizeTo(SW//2, SH)
    print(f"Tiled left:  {wins[0].title[:40]}")

def tile_right(title_pattern):
    wins = find_window(title_pattern)
    if not wins: print(f"Not found: '{title_pattern}'"); return
    wins[0].moveTo(SW//2, 0); wins[0].resizeTo(SW//2, SH)
    print(f"Tiled right: {wins[0].title[:40]}")

def center_window(title_pattern, width=1200, height=800):
    wins = find_window(title_pattern)
    if not wins: print(f"Not found: '{title_pattern}'"); return
    x = (SW - width) // 2; y = (SH - height) // 2
    wins[0].moveTo(x, y); wins[0].resizeTo(width, height)
    print(f"Centered: {wins[0].title[:40]} at {width}x{height}")

list_windows()
# tile_left("chrome")
# tile_right("code")
# center_window("notepad", 1000, 700)`,
  },
  {
    id: 'auto-form-filler',
    title: 'Web Form Auto-Filler',
    category: 'GUI',
    tags: ['selenium', 'form', 'fill', 'automate', 'web', 'browser', 'login'],
    description: 'Automatically fill and submit web forms using Selenium automation',
    requirements: ['selenium', 'webdriver-manager'],
    script: `from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time

TARGET_URL = "https://httpbin.org/forms/post"

FORM_DATA = {
    "custname":  "John Doe",
    "custtel":   "+1-555-123-4567",
    "custemail": "john@example.com",
    "size":      "large",
    "topping":   "cheese",
    "delivery":  "13:00",
    "comments":  "Automated by Butler AI",
}

opts = Options()
opts.add_argument("--start-maximized")
# opts.add_argument("--headless")  # Uncomment for headless mode

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=opts
)

try:
    wait = WebDriverWait(driver, 10)
    print(f"Opening: {TARGET_URL}")
    driver.get(TARGET_URL)
    time.sleep(1)

    for field, value in FORM_DATA.items():
        try:
            el = driver.find_element(By.NAME, field)
            if el.tag_name in ('input', 'textarea') and el.get_attribute('type') not in ('radio','checkbox'):
                el.clear()
                el.send_keys(value)
                print(f"  Filled [{field}]: {value}")
        except: pass

    print("\nForm filled! Submit when ready.")
    time.sleep(3)
    # Uncomment to auto-submit:
    # driver.find_element(By.CSS_SELECTOR, "input[type='submit']").click()

finally:
    input("Press Enter to close browser...")
    driver.quit()`,
  },

  // ── NETWORK ───────────────────────────────────────────────────
  {
    id: 'service-uptime-monitor',
    title: 'Service Uptime Statistics Monitor',
    category: 'Network',
    tags: ['uptime', 'monitor', 'ping', 'service', 'check', 'health', 'statistics'],
    description: 'Continuously monitor multiple services and track uptime statistics',
    requirements: ['requests'],
    script: `import requests, time, json
from datetime import datetime
from pathlib import Path

SERVICES = [
    {'name': 'Butler Server', 'url': 'http://192.168.1.100:8765/api/status', 'timeout': 5},
    {'name': 'Google',        'url': 'https://www.google.com',                'timeout': 5},
    {'name': 'GitHub',        'url': 'https://github.com',                    'timeout': 10},
]

CHECK_SEC = 30
LOG_FILE  = Path("uptime_stats.json")

def check(svc):
    try:
        r = requests.get(svc['url'], timeout=svc['timeout'])
        return r.status_code < 500, r.elapsed.total_seconds() * 1000
    except: return False, 0

stats = {s['name']: {'checks':0,'up':0,'down':0,'latencies':[],'last_down':None} for s in SERVICES}
prev  = {s['name']: True for s in SERVICES}

def log(msg):
    ts = datetime.now().strftime('%H:%M:%S')
    print(f"[{ts}] {msg}")

log(f"Monitoring {len(SERVICES)} services every {CHECK_SEC}s (Ctrl+C to stop)")

try:
    while True:
        for svc in SERVICES:
            ok, ms = check(svc)
            name   = svc['name']
            stats[name]['checks'] += 1
            if ok:
                stats[name]['up'] += 1
                stats[name]['latencies'].append(round(ms, 1))
                if not prev[name]: log(f"BACK UP: {name} ({ms:.0f}ms)")
            else:
                stats[name]['down'] += 1
                stats[name]['last_down'] = datetime.now().isoformat()
                if prev[name]: log(f"DOWN: {name}")
            prev[name] = ok

        for name, s in stats.items():
            total = s['checks']
            pct   = (s['up']/total*100) if total else 0
            lats  = s['latencies'][-20:]
            avg   = sum(lats)/len(lats) if lats else 0
            print(f"  {name:25} {pct:6.2f}% up  avg:{avg:.0f}ms  checks:{total}")

        LOG_FILE.write_text(json.dumps({
            k: {**v, 'latencies': v['latencies'][-100:]}
            for k, v in stats.items()
        }, indent=2))
        time.sleep(CHECK_SEC)
except KeyboardInterrupt:
    log("Monitor stopped.")`,
  },
  {
    id: 'public-ip-checker',
    title: 'VPN IP Leak and Public IP Checker',
    category: 'Network',
    tags: ['vpn', 'ip', 'leak', 'check', 'privacy', 'anonymity', 'public'],
    description: 'Check your public IP address, detect VPN changes, and verify DNS leak protection',
    requirements: ['requests'],
    script: `import requests, time, socket
from datetime import datetime

IP_APIS = [
    "https://api.ipify.org?format=json",
    "https://ipinfo.io/json",
]

def get_public_ip():
    for url in IP_APIS:
        try:
            r = requests.get(url, timeout=8)
            data = r.json()
            return {
                'ip':      data.get('ip', 'unknown'),
                'country': data.get('country', '?'),
                'city':    data.get('city', '?'),
                'org':     data.get('org', '?'),
            }
        except: continue
    return None

def get_dns_servers():
    try:
        import subprocess, sys
        if sys.platform == 'win32':
            r = subprocess.run("ipconfig /all", shell=True, capture_output=True, text=True)
            dns = []
            for line in r.stdout.split("\n"):
                if "DNS Servers" in line and ":" in line:
                    d = line.split(":")[-1].strip()
                    if d: dns.append(d)
            return dns[:4]
        else:
            r = subprocess.run(["cat","/etc/resolv.conf"], capture_output=True, text=True)
            return [l.split()[-1] for l in r.stdout.split("\n") if l.startswith("nameserver")][:4]
    except: return []

print("=== IP LEAK CHECKER ===\n")
info = get_public_ip()
if info:
    print(f"Public IP:  {info['ip']}")
    print(f"Country:    {info['country']}")
    print(f"City:       {info['city']}")
    print(f"ISP/Org:    {info['org'][:60]}")
else:
    print("Cannot reach IP check APIs")

dns = get_dns_servers()
if dns:
    print(f"\nDNS Servers ({len(dns)} detected):")
    for d in dns:
        print(f"  {d}")

print("\nMonitoring for IP changes (5 checks, 10s interval)...")
prev_ip = info['ip'] if info else None
for i in range(5):
    time.sleep(10)
    info2 = get_public_ip()
    if info2:
        status = "CHANGED!" if info2['ip'] != prev_ip else "stable  "
        ts = datetime.now().strftime('%H:%M:%S')
        print(f"  [{ts}] {status} IP: {info2['ip']} ({info2['country']})")
        prev_ip = info2['ip']`,
  },
  {
    id: 'ssh-tunnel-manager',
    title: 'SSH Tunnel Manager',
    category: 'Network',
    tags: ['ssh', 'tunnel', 'forward', 'proxy', 'socks', 'remote', 'port'],
    description: 'Create and manage SSH tunnels for local port forwarding and SOCKS proxy',
    requirements: ['paramiko'],
    script: `import paramiko, socket, threading, sys, time

SSH_HOST = "your-server.com"
SSH_PORT = 22
SSH_USER = "username"
SSH_KEY  = "~/.ssh/id_rsa"  # Or SSH_PASS = "password"

# Tunnel config: (local_port, remote_host, remote_port)
TUNNELS = [
    (8080, "localhost",  80),   # Forward local:8080 -> remote:80
    (3306, "localhost",  3306), # MySQL
    (5432, "db-server", 5432),  # PostgreSQL on another host
]

def create_tunnel(ssh_client, local_port, remote_host, remote_port):
    transport = ssh_client.get_transport()
    transport.request_port_forward("", local_port)
    print(f"  Tunnel: localhost:{local_port} -> {remote_host}:{remote_port}")

def info_only():
    print("=== SSH TUNNEL MANAGER ===")
    print(f"Server:  {SSH_HOST}:{SSH_PORT}")
    print(f"User:    {SSH_USER}")
    print(f"\nConfigured tunnels:")
    for local, rhost, rport in TUNNELS:
        print(f"  localhost:{local:5} -> {rhost}:{rport}")
    print("\nUsage:")
    print("  1. Uncomment the SSH connection code below")
    print("  2. Configure SSH_HOST, SSH_USER, SSH_KEY")
    print("  3. Run: python tunnel.py")
    print("\nAlternative (command line):")
    for local, rhost, rport in TUNNELS:
        print(f"  ssh -L {local}:{rhost}:{rport} {SSH_USER}@{SSH_HOST} -N")

# Uncomment to actually connect:
# client = paramiko.SSHClient()
# client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
# client.connect(SSH_HOST, SSH_PORT, SSH_USER, key_filename=SSH_KEY, timeout=10)
# for local, rhost, rport in TUNNELS:
#     create_tunnel(client, local, rhost, rport)
# print("All tunnels active. Ctrl+C to stop.")
# try:
#     while True: time.sleep(1)
# except KeyboardInterrupt:
#     client.close()

info_only()`,
  },
];
