/**
 * NEXUS SCRIPT TEMPLATES — Categorized Python automation scripts
 * Research-backed, battle-tested, Terminator-themed
 */

export interface ScriptTemplate {
  id: string;
  cat: string;
  icon: string;
  color: string;
  title: string;
  desc: string;
  code: string;
  difficulty?: 'basic' | 'intermediate' | 'advanced';
  requires?: string[];
}

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  // ─── SYSTEM ──────────────────────────────────────────────────────
  {
    id: 't1', cat: 'System', icon: 'computer', color: '#FF6A1F', difficulty: 'basic',
    title: 'System Snapshot', desc: 'Full OS/CPU/RAM/disk report',
    code: `import platform, psutil, socket
print(f"HOST: {socket.gethostname()}")
print(f"OS: {platform.system()} {platform.release()} {platform.machine()}")
print(f"CPU: {psutil.cpu_count()} cores @ {psutil.cpu_freq().current:.0f}MHz")
mem = psutil.virtual_memory()
print(f"RAM: {mem.total//1024**3}GB total, {mem.percent}% used, {mem.available//1024**2}MB free")
disk = psutil.disk_usage('/')
print(f"DISK: {disk.used//1024**3}GB used / {disk.total//1024**3}GB ({disk.percent}%)")
print(f"PYTHON: {platform.python_version()}")`,
  },
  {
    id: 't2', cat: 'System', icon: 'memory', color: '#FF6A1F', difficulty: 'intermediate',
    title: 'Process Monitor', desc: 'Top 10 CPU-hungry processes',
    code: `import psutil
procs = []
for p in psutil.process_iter(['pid','name','cpu_percent','memory_percent']):
    try:
        p.cpu_percent()
    except: pass
import time; time.sleep(0.5)
for p in psutil.process_iter(['pid','name','cpu_percent','memory_percent']):
    try:
        procs.append(p.info)
    except: pass
procs.sort(key=lambda x: x.get('cpu_percent') or 0, reverse=True)
print(f"{'PID':>6}  {'CPU%':>6}  {'MEM%':>6}  NAME")
print("-" * 50)
for p in procs[:12]:
    print(f"{p['pid']:>6}  {p.get('cpu_percent') or 0:>6.1f}  {p.get('memory_percent') or 0:>6.1f}  {(p['name'] or 'unknown')[:28]}")`,
  },
  {
    id: 't3', cat: 'System', icon: 'power-settings-new', color: '#FF6A1F', difficulty: 'basic',
    title: 'CPU Heat Map', desc: 'Sample CPU load for 10s with bar graph',
    code: `import psutil, time
samples = []
print("Sampling CPU for 10 seconds...")
for i in range(10):
    pct = psutil.cpu_percent(interval=1)
    filled = int(pct / 5)
    bar = "\u2588" * filled + "\u2591" * (20 - filled)
    samples.append(pct)
    status = "HOT" if pct > 80 else "WARM" if pct > 50 else "COOL"
    print(f"  {i+1:2d}s [{bar}] {pct:5.1f}%  [{status}]")
print(f"\\nAvg: {sum(samples)/len(samples):.1f}%  |  Peak: {max(samples):.1f}%  |  Min: {min(samples):.1f}%")`,
  },
  {
    id: 't4', cat: 'System', icon: 'cleaning-services', color: '#FF6A1F', difficulty: 'basic',
    title: 'Temp File Cleaner', desc: 'Delete Windows/Linux temp files',
    code: `import os, glob, shutil, platform
tmp = os.environ.get('TEMP', os.environ.get('TMPDIR', '/tmp'))
print(f"Cleaning: {tmp}")
removed = 0
freed_bytes = 0
for f in glob.glob(os.path.join(tmp, '*')):
    try:
        size = os.path.getsize(f) if os.path.isfile(f) else 0
        if os.path.isfile(f):
            os.remove(f)
        elif os.path.isdir(f):
            shutil.rmtree(f, ignore_errors=True)
        removed += 1
        freed_bytes += size
    except: pass
print(f"Removed {removed} items | Freed: {freed_bytes/1024/1024:.1f}MB")`,
  },
  {
    id: 't5', cat: 'System', icon: 'security', color: '#FF6A1F', difficulty: 'intermediate',
    title: 'Password Generator', desc: 'Cryptographically secure passwords',
    code: `import secrets, string
chars = string.ascii_letters + string.digits + "!@#$%^&*-_+=?"
print("[ NEXUS PASSWORD GENERATOR ]")
for length in [12, 16, 24, 32, 64]:
    pwd = ''.join(secrets.choice(chars) for _ in range(length))
    strength = "WEAK" if length < 12 else "OK" if length < 16 else "STRONG" if length < 24 else "ULTRA"
    print(f"  {length:2d} chars [{strength:6s}]: {pwd}")
# Passphrase option
import random
words = ["nexus","titan","omega","cyber","steel","delta","nova","pulse","grid","code"]
passphrase = '-'.join(random.choices(words, k=5)) + '-' + str(secrets.randbelow(9999))
print(f"\\nPassphrase: {passphrase}")`,
  },
  // ─── FILES ───────────────────────────────────────────────────────
  {
    id: 't6', cat: 'Files', icon: 'folder', color: '#FF6600', difficulty: 'intermediate',
    title: 'File Organizer', desc: 'Sort Desktop files by extension',
    code: `import os, shutil
from pathlib import Path
dtop = Path.home() / 'Desktop'
moved = {}
for f in dtop.iterdir():
    if f.is_file() and not f.name.startswith('.'):
        ext = f.suffix[1:].upper() if f.suffix else 'OTHER'
        folder = dtop / ext
        folder.mkdir(exist_ok=True)
        try:
            shutil.move(str(f), str(folder / f.name))
            moved[ext] = moved.get(ext, 0) + 1
        except Exception as e:
            print(f"SKIP: {f.name} ({e})")
print("[ FILE ORGANIZER COMPLETE ]")
for ext, count in sorted(moved.items()):
    print(f"  {ext:10s}: {count} files moved")
print(f"  Total: {sum(moved.values())} files organized")`,
  },
  {
    id: 't7', cat: 'Files', icon: 'find-replace', color: '#FF6600', difficulty: 'intermediate',
    title: 'Duplicate Finder', desc: 'MD5 hash scan for duplicates',
    code: `import os, hashlib
from pathlib import Path
hashes = {}
dups = []
total = 0
print("Scanning home directory for duplicates...")
for f in Path.home().rglob('*'):
    if f.is_file() and f.stat().st_size > 0:
        try:
            h = hashlib.md5(f.read_bytes()).hexdigest()
            total += 1
            if h in hashes:
                dups.append((str(f), hashes[h], f.stat().st_size))
            else:
                hashes[h] = str(f)
        except: pass
print(f"Scanned {total} files. Found {len(dups)} duplicates:")
wasted = sum(s for _,_,s in dups)
for dup, orig, size in dups[:10]:
    print(f"  DUP: {Path(dup).name} ({size//1024}KB)")
    print(f"  ORG: {Path(orig).name}")
print(f"\\nWasted space: {wasted/1024/1024:.1f}MB")`,
  },
  {
    id: 't8', cat: 'Files', icon: 'backup', color: '#FF6600', difficulty: 'basic',
    title: 'Auto Backup', desc: 'Zip Documents and save to Desktop',
    code: `import shutil, os
from datetime import datetime
from pathlib import Path
src = str(Path.home() / 'Documents')
ts = datetime.now().strftime('%Y%m%d_%H%M')
dst = str(Path.home() / 'Desktop' / f'backup_{ts}')
print(f"Backing up: {src}")
print("Compressing...")
shutil.make_archive(dst, 'zip', src)
size = os.path.getsize(dst + '.zip') / 1024 / 1024
print(f"Backup created: {dst}.zip ({size:.1f}MB)")
print("[ BACKUP COMPLETE ]")`,
  },
  {
    id: 't9', cat: 'Files', icon: 'search', color: '#FF6600', difficulty: 'basic',
    title: 'File Search', desc: 'Find files by name or extension',
    code: `import os
from pathlib import Path
keyword = 'report'  # Change this
results = []
print(f"Searching for: *{keyword}*")
for f in Path.home().rglob(f'*{keyword}*'):
    if f.is_file():
        size = f.stat().st_size / 1024
        results.append((str(f), size))
print(f"Found {len(results)} files:")
for path, size in sorted(results, key=lambda x: x[1], reverse=True)[:20]:
    print(f"  {size:8.1f}KB  {Path(path).name}")`,
  },
  // ─── NETWORK ─────────────────────────────────────────────────────
  {
    id: 't10', cat: 'Network', icon: 'wifi', color: '#00FF88', difficulty: 'advanced',
    title: 'LAN Device Scanner', desc: 'Find all devices on your network',
    code: `import subprocess, socket, concurrent.futures
import ipaddress
local_ip = socket.gethostbyname(socket.gethostname())
net = str(ipaddress.IPv4Network(local_ip + '/24', strict=False))
print(f"Scanning {net}...")
def ping(ip):
    try:
        r = subprocess.run(['ping','-n','1','-w','300',ip], capture_output=True, timeout=2)
        if r.returncode == 0:
            try:
                name = socket.gethostbyaddr(ip)[0]
            except: name = '?'
            return (ip, name)
    except: pass
    return None
with concurrent.futures.ThreadPoolExecutor(50) as e:
    results = list(filter(None, e.map(ping, [str(h) for h in ipaddress.IPv4Network(net).hosts()])))
print(f"\\n[ {len(results)} DEVICES ONLINE ]")
for ip, name in sorted(results):
    print(f"  {ip:16s}  {name}")`,
  },
  {
    id: 't11', cat: 'Network', icon: 'speed', color: '#00FF88', difficulty: 'basic',
    title: 'Ping Monitor', desc: 'Latency test to key servers',
    code: `import subprocess, time
hosts = [('Google DNS', '8.8.8.8'), ('Cloudflare', '1.1.1.1'), ('Google', 'google.com'), ('GitHub', 'github.com')]
print("[ PING MONITOR ]")
for name, host in hosts:
    try:
        r = subprocess.run(['ping','-n','3',host], capture_output=True, text=True, timeout=8)
        lines = r.stdout.split('\\n')
        avg_line = next((l for l in lines if 'Average' in l or 'avg' in l), '')
        ms = avg_line.split('=')[-1].strip().replace('ms','') if avg_line else '??'
        status = "\u25c6 OK" if r.returncode == 0 else "\u25c7 FAIL"
        print(f"  {status} {name:15s}: {ms.strip()}ms")
    except Exception as e:
        print(f"  \u25c7 {name}: {e}")`,
  },
  {
    id: 't12', cat: 'Network', icon: 'security', color: '#00FF88', difficulty: 'intermediate',
    title: 'Port Scanner', desc: 'Check common open ports',
    code: `import socket, concurrent.futures
host = '127.0.0.1'  # Change to any IP
ports = [21,22,23,25,53,80,110,143,443,445,3306,3389,5432,8080,8765,27017,6379]
def check(port):
    try:
        s = socket.socket()
        s.settimeout(0.5)
        s.connect((host, port))
        s.close()
        return port
    except: return None
print(f"Scanning {host}...")
with concurrent.futures.ThreadPoolExecutor(30) as e:
    open_ports = list(filter(None, e.map(check, ports)))
print(f"[ {len(open_ports)} OPEN PORTS ]")
services = {22:'SSH',80:'HTTP',443:'HTTPS',3306:'MySQL',5432:'PostgreSQL',3389:'RDP',27017:'MongoDB',6379:'Redis',8765:'Butler'}
for p in sorted(open_ports):
    svc = services.get(p, 'unknown')
    print(f"  :{p:5d}  [{svc}]")`,
  },
  // ─── WEB ─────────────────────────────────────────────────────────
  {
    id: 't13', cat: 'Web', icon: 'language', color: '#00FF41', difficulty: 'intermediate',
    title: 'Web Scraper', desc: 'Fetch page titles and links',
    code: `import urllib.request, html.parser
class Parser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""; self.in_title = False; self.links = []; self.texts = []
    def handle_starttag(self, tag, attrs):
        if tag == "title": self.in_title = True
        if tag == "a":
            for k,v in attrs:
                if k == "href" and v and v.startswith("http"): self.links.append(v)
    def handle_data(self, data):
        if self.in_title: self.title = data.strip(); self.in_title = False
urls = ['https://news.ycombinator.com', 'https://httpbin.org/html']
for url in urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as r:
            p = Parser(); p.feed(r.read().decode('utf-8', errors='ignore'))
        print(f"URL: {url}")
        print(f"Title: {p.title}")
        print(f"Links: {len(p.links)}")
        for l in p.links[:3]: print(f"  {l}")
    except Exception as e: print(f"Error: {e}")`,
  },
  {
    id: 't14', cat: 'Web', icon: 'api', color: '#00FF41', difficulty: 'basic',
    title: 'Public API Sampler', desc: 'Pull data from free public APIs',
    code: `import urllib.request, json
apis = [
    ('Dog Image', 'https://dog.ceo/api/breeds/image/random'),
    ('Chuck Norris Joke', 'https://api.chucknorris.io/jokes/random'),
    ('Random User', 'https://randomuser.me/api/?inc=name,location&nat=us'),
    ('IP Info', 'https://httpbin.org/ip'),
]
for name, url in apis:
    try:
        req = urllib.request.Request(url, headers={'User-Agent':'NexusBot/1.0'})
        with urllib.request.urlopen(req, timeout=5) as r:
            data = json.load(r)
        print(f"[ {name} ]")
        print(json.dumps(data, indent=2)[:200])
        print()
    except Exception as e:
        print(f"{name}: ERROR {e}")`,
  },
  // ─── DATA ────────────────────────────────────────────────────────
  {
    id: 't15', cat: 'Data', icon: 'bar-chart', color: '#CC8800', difficulty: 'intermediate',
    title: 'Disk Usage Report', desc: 'Largest folders in home dir',
    code: `import os
from pathlib import Path
def folder_size(p):
    total = 0
    try:
        for entry in p.rglob('*'):
            if entry.is_file():
                try: total += entry.stat().st_size
                except: pass
    except: pass
    return total
home = Path.home()
folders = []
for d in home.iterdir():
    if d.is_dir():
        size = folder_size(d)
        folders.append((size, d.name))
folders.sort(reverse=True)
print(f"DISK USAGE REPORT — {home}")
print("-" * 40)
total = sum(s for s,_ in folders)
for size, name in folders[:15]:
    pct = (size / total * 100) if total > 0 else 0
    bar = "\u2588" * int(pct / 2)
    print(f"  {size/1024/1024:8.1f}MB  {pct:5.1f}%  {bar}  {name}")`,
  },
  {
    id: 't16', cat: 'Data', icon: 'table-chart', color: '#CC8800', difficulty: 'basic',
    title: 'CSV Analyzer', desc: 'Stats on any CSV file found',
    code: `import csv
from pathlib import Path
csv_files = list(Path.home().rglob('*.csv'))[:5]
if not csv_files:
    print("No CSV files found in home directory")
for f in csv_files:
    try:
        with open(f, encoding='utf-8', errors='ignore') as fh:
            reader = csv.reader(fh)
            rows = list(reader)
        headers = rows[0] if rows else []
        data_rows = rows[1:] if len(rows) > 1 else []
        print(f"FILE: {f.name}")
        print(f"  Rows: {len(data_rows)} | Columns: {len(headers)}")
        print(f"  Headers: {', '.join(headers[:6])}")
        print()
    except Exception as e:
        print(f"{f.name}: {e}")`,
  },
  // ─── GUI / AUTOMATION ────────────────────────────────────────────
  {
    id: 't17', cat: 'GUI', icon: 'mouse', color: '#FFC400', difficulty: 'intermediate',
    requires: ['pyautogui'],
    title: 'Mouse Jiggler', desc: 'Prevents screensaver/sleep',
    code: `import time
try:
    import pyautogui
    pyautogui.FAILSAFE = True
    print("Mouse jiggler active (10 moves, Ctrl+C to stop)")
    for i in range(10):
        x, y = pyautogui.position()
        pyautogui.moveRel(5, 0, duration=0.2)
        time.sleep(0.3)
        pyautogui.moveRel(-5, 0, duration=0.2)
        print(f"  Move {i+1}/10 at ({x},{y})")
        time.sleep(55)
    print("Done")
except ImportError:
    print("Install: pip install pyautogui")`,
  },
  {
    id: 't18', cat: 'GUI', icon: 'screenshot', color: '#FFC400', difficulty: 'intermediate',
    requires: ['pillow'],
    title: 'Screenshot Capture', desc: 'Take and save screenshot',
    code: `try:
    from PIL import ImageGrab
    import os
    from datetime import datetime
    from pathlib import Path
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    out = str(Path.home() / 'Desktop' / f'screenshot_{ts}.png')
    img = ImageGrab.grab()
    img.save(out)
    size = os.path.getsize(out) / 1024
    print(f"Screenshot saved: {out}")
    print(f"Size: {img.size[0]}x{img.size[1]}px ({size:.1f}KB)")
except ImportError:
    print("Install: pip install pillow")
except Exception as e:
    print(f"Error: {e}")`,
  },
  // ─── UNIQUE / EXCLUSIVE ──────────────────────────────────────────
  {
    id: 't19', cat: 'System', icon: 'bolt', color: '#FF2200', difficulty: 'advanced',
    title: '[ \u03a9 ] Script Sequencer', desc: 'Chain 3 scripts in order — exclusive feature',
    code: `# NEXUS SEQUENCER v1.0 — Run scripts in sequence
# This is CommandCube's exclusive multi-script orchestrator
import platform, psutil, socket, time, json

SEQUENCE = [
    ("STEP 1: SYSTEM ID", lambda: {
        'host': socket.gethostname(),
        'os': platform.system() + ' ' + platform.release(),
    }),
    ("STEP 2: RESOURCES", lambda: {
        'cpu': f"{psutil.cpu_percent(1):.1f}%",
        'ram': f"{psutil.virtual_memory().percent:.1f}%",
        'disk': f"{psutil.disk_usage('/').percent:.1f}%",
    }),
    ("STEP 3: NETWORK", lambda: {
        'ip': socket.gethostbyname(socket.gethostname()),
        'hostname': socket.getfqdn(),
    }),
]

results = {}
for name, fn in SEQUENCE:
    print(f"\\n=== {name} ===")
    try:
        r = fn()
        results[name] = r
        for k,v in r.items(): print(f"  {k}: {v}")
    except Exception as e:
        print(f"  ERROR: {e}")
    time.sleep(0.2)

print("\\n[\u25c6 SEQUENCE COMPLETE]")
print(json.dumps(results, indent=2))`,
  },
  {
    id: 't20', cat: 'System', icon: 'timeline', color: '#FF2200', difficulty: 'advanced',
    title: '[ \u03a6 ] DELTA Observer', desc: 'Watch for file system changes in real-time',
    code: `# NEXUS DELTA OBSERVER — File system change detector
# Proprietary: watches directory and reports changes in real-time
import os, time, hashlib
from pathlib import Path

watch_dir = str(Path.home() / 'Desktop')
snapshot = {}

def hash_dir(path):
    state = {}
    try:
        for entry in Path(path).iterdir():
            if entry.is_file():
                try:
                    state[str(entry)] = (entry.stat().st_mtime, entry.stat().st_size)
                except: pass
    except: pass
    return state

print(f"DELTA OBSERVER: Watching {watch_dir}")
print("Will report changes for 30 seconds...")
snapshot = hash_dir(watch_dir)
print(f"Baseline: {len(snapshot)} files")

for i in range(30):
    time.sleep(1)
    current = hash_dir(watch_dir)
    added = set(current) - set(snapshot)
    removed = set(snapshot) - set(current)
    changed = {f for f in set(current) & set(snapshot) if current[f] != snapshot[f]}
    if added: print(f"  [+] NEW: {', '.join(Path(f).name for f in added)}")
    if removed: print(f"  [-] DEL: {', '.join(Path(f).name for f in removed)}")
    if changed: print(f"  [~] CHG: {', '.join(Path(f).name for f in changed)}")
    snapshot = current

print("[ OBSERVATION COMPLETE ]")`,
  },
];

export const TEMPLATE_CATEGORIES = ['All', 'System', 'Files', 'Network', 'GUI', 'Web', 'Data'];
