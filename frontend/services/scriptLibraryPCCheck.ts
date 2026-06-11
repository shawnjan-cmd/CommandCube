/**
 * 🖥️ PC CHECK SUITE — Scripts for the PC Check Dashboard
 * Appears as "PC CHECK SUITE" category in the Script Library
 * Tailored for health, cleaning, security, and diagnostics
 */

import type { AutomationScript } from './scriptTypes';

export const PC_CHECK_SCRIPTS: AutomationScript[] = [
  {
    id: 'pccheck-full-diagnosis',
    title: 'Full PC Diagnosis Report',
    category: 'PCCheck',
    tags: ['diagnosis', 'health', 'report', 'cpu', 'ram', 'disk', 'full', 'pccheck'],
    description: 'Complete PC health: CPU, RAM, disk, network, uptime, top processes in one report',
    requirements: ['psutil'],
    script: `import psutil, platform, socket, datetime, os
print("=" * 52)
print("  NEXUS PC DIAGNOSIS REPORT")
print(f"  {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 52)
print(f"\nOS:       {platform.system()} {platform.release()}")
print(f"Hostname: {socket.gethostname()}")
print(f"User:     {os.environ.get('USERNAME') or os.environ.get('USER','?')}")
boot = datetime.datetime.fromtimestamp(psutil.boot_time())
up = datetime.datetime.now() - boot
print(f"Uptime:   {up.days}d {up.seconds//3600}h {(up.seconds%3600)//60}m")
cpu = psutil.cpu_percent(interval=1)
freq = psutil.cpu_freq()
print(f"\n[CPU]  {cpu}% | Cores:{psutil.cpu_count()} | {freq.current:.0f}MHz")
mem = psutil.virtual_memory()
print(f"[RAM]  {mem.percent}% | {mem.used//1024**3:.1f}GB / {mem.total//1024**3:.1f}GB")
for p in psutil.disk_partitions():
    try:
        u = psutil.disk_usage(p.mountpoint)
        bar = chr(9608) * int(u.percent // 10) + '.' * (10 - int(u.percent // 10))
        print(f"[DISK] {p.mountpoint:10} [{bar}] {u.percent}% ({u.free//1024**3:.1f}GB free)")
    except: pass
net = psutil.net_io_counters()
print(f"[NET]  Up:{net.bytes_sent//1024**2}MB Dn:{net.bytes_recv//1024**2}MB")
print("\n[TOP 5 PROCESSES]")
procs = sorted(psutil.process_iter(['name','cpu_percent','memory_percent']),
               key=lambda p: p.info['cpu_percent'] or 0, reverse=True)
for p in procs[:5]:
    i = p.info
    print(f"  {i['name'][:28]:28} CPU:{i['cpu_percent']:5.1f}% MEM:{i['memory_percent']:.1f}%")
print("\n" + "=" * 52)
print("  DIAGNOSIS COMPLETE")
print("=" * 52)`,
  },
  {
    id: 'pccheck-disk-health',
    title: 'Disk S.M.A.R.T Health Report',
    category: 'PCCheck',
    tags: ['disk', 'smart', 'health', 'nvme', 'hdd', 'ssd', 'check', 'pccheck'],
    description: 'Check all drive health, partition usage, and detect failing drives',
    requirements: ['psutil'],
    script: `import psutil, subprocess, sys
print("=== DISK HEALTH CHECK ===")
print("\n[PARTITIONS]")
for p in psutil.disk_partitions():
    try:
        u = psutil.disk_usage(p.mountpoint)
        pct = u.percent
        flag = " CRITICAL" if pct > 90 else " WARNING" if pct > 80 else " OK"
        bar = chr(9608) * int(pct // 5) + '.' * (20 - int(pct // 5))
        print(f"  {p.mountpoint:12} [{bar}] {pct:5.1f}%  {u.free//1024**3:.1f}GB free{flag}")
    except: pass
if sys.platform == 'win32':
    print("\n[SMART STATUS]")
    r = subprocess.run(["powershell","-Command",
        "Get-PhysicalDisk | Select-Object FriendlyName,HealthStatus,MediaType | Format-Table"],
        capture_output=True, text=True)
    print(r.stdout[:1500] or "  (run as admin for full data)")
else:
    import glob
    for disk in glob.glob('/dev/sd?') + glob.glob('/dev/nvme?n?'):
        r = subprocess.run(["smartctl","-H",disk], capture_output=True, text=True, timeout=8)
        for line in r.stdout.split('\n'):
            if 'Health' in line or 'PASSED' in line or 'FAILED' in line:
                print(f"  {disk}: {line.strip()}")
print("\nDisk check complete.")`,
  },
  {
    id: 'pccheck-ram-analysis',
    title: 'RAM Analysis and Memory Health',
    category: 'PCCheck',
    tags: ['ram', 'memory', 'analysis', 'health', 'swap', 'virtual', 'pccheck'],
    description: 'Detailed RAM breakdown, swap usage, top memory consumers, health status',
    requirements: ['psutil'],
    script: `import psutil
print("=== RAM & MEMORY ANALYSIS ===")
mem = psutil.virtual_memory()
swap = psutil.swap_memory()
print(f"\n[PHYSICAL RAM]")
print(f"  Total:     {mem.total//1024**3:.2f} GB")
print(f"  Used:      {mem.used//1024**3:.2f} GB  ({mem.percent}%)")
print(f"  Available: {mem.available//1024**3:.2f} GB")
bar = chr(9608) * int(mem.percent // 5) + '.' * (20 - int(mem.percent // 5))
status = 'OK' if mem.percent < 70 else 'HIGH' if mem.percent < 85 else 'CRITICAL'
print(f"\n  [{bar}] {status}")
print(f"\n[SWAP / VIRTUAL]")
print(f"  Total: {swap.total//1024**3:.1f} GB  Used: {swap.used//1024**2:.0f} MB ({swap.percent}%)")
if swap.percent > 50: print("  WARNING: High swap — add more RAM")
print("\n[TOP 10 MEMORY CONSUMERS]")
procs = sorted(psutil.process_iter(['pid','name','memory_info']),
               key=lambda p: p.info['memory_info'].rss if p.info['memory_info'] else 0, reverse=True)
for p in procs[:10]:
    mb = (p.info['memory_info'].rss or 0) // 1024**2
    print(f"  {p.info['name'][:30]:30} {mb:6} MB  PID:{p.info['pid']}")`,
  },
  {
    id: 'pccheck-network-audit',
    title: 'Network Connections Audit',
    category: 'PCCheck',
    tags: ['network', 'connections', 'ports', 'audit', 'sockets', 'listen', 'pccheck'],
    description: 'Audit active network connections, listening ports, flag suspicious activity',
    requirements: ['psutil'],
    script: `import psutil, socket
print("=== NETWORK CONNECTION AUDIT ===")
print("\n[NETWORK INTERFACES]")
try:
    for iface, addr_list in psutil.net_if_addrs().items():
        for addr in addr_list:
            if addr.family == socket.AF_INET:
                print(f"  {iface:15} {addr.address}")
except: pass
print("\n[ACTIVE CONNECTIONS]")
SUSPICIOUS = {4444, 31337, 6666, 1337, 9999}
try:
    conns = psutil.net_connections(kind='inet')
    est = [c for c in conns if c.status == 'ESTABLISHED']
    for c in est[:20]:
        flag = " *** SUSPICIOUS" if c.raddr and c.raddr.port in SUSPICIOUS else ""
        print(f"  {str(c.laddr):28} -> {str(c.raddr):28}{flag}")
    print(f"  Total: {len(est)} established")
except Exception as e:
    print(f"  (run as admin): {e}")
print("\n[LISTENING PORTS]")
try:
    listening = [c for c in psutil.net_connections() if c.status == 'LISTEN']
    SVCMAP = {80:'HTTP',443:'HTTPS',22:'SSH',3306:'MySQL',5432:'PG',6379:'Redis',8080:'HTTP-Alt'}
    for c in sorted(listening, key=lambda x: x.laddr.port if x.laddr else 0):
        port = c.laddr.port if c.laddr else 0
        print(f"  :{port:<6} {SVCMAP.get(port,'')}")
except: pass
print("\nAudit complete.")`,
  },
  {
    id: 'pccheck-startup-audit',
    title: 'Startup and Services Audit',
    category: 'PCCheck',
    tags: ['startup', 'services', 'boot', 'autorun', 'audit', 'performance', 'pccheck'],
    description: 'List all startup programs and running services, flag performance impact',
    requirements: [],
    script: `import subprocess, sys
print("=== STARTUP & SERVICES AUDIT ===")
if sys.platform == 'win32':
    import winreg
    print("\n[STARTUP PROGRAMS]")
    for hive, name in [(winreg.HKEY_CURRENT_USER,"HKCU"),(winreg.HKEY_LOCAL_MACHINE,"HKLM")]:
        try:
            with winreg.OpenKey(hive, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run") as k:
                i = 0
                while True:
                    try:
                        n,v,_ = winreg.EnumValue(k,i)
                        print(f"  [{name}] {n[:35]:35} {v[:50]}")
                        i += 1
                    except OSError: break
        except: pass
    print("\n[RUNNING SERVICES (first 20)]")
    r = subprocess.run(["sc","queryex","state=running"],capture_output=True,text=True,shell=True)
    lines = [l for l in r.stdout.split('\n') if 'SERVICE_NAME' in l][:20]
    for l in lines: print(f"  {l.strip()}")
else:
    print("\n[SYSTEMD ENABLED SERVICES]")
    r = subprocess.run(["systemctl","list-unit-files","--type=service","--state=enabled","--no-pager"],capture_output=True,text=True)
    print(r.stdout[:2000])
    print("\n[FAILED SERVICES]")
    r2 = subprocess.run(["systemctl","--failed","--no-pager"],capture_output=True,text=True)
    print(r2.stdout[:1000] or "None — system is clean")
print("\nAudit complete.")`,
  },
  {
    id: 'pccheck-event-log-errors',
    title: 'Event Log Error Scanner',
    category: 'PCCheck',
    tags: ['events', 'errors', 'logs', 'windows', 'critical', 'warnings', 'pccheck'],
    description: 'Scan Windows Event Log or systemd journal for critical errors in last 24h',
    requirements: [],
    script: `import subprocess, sys
from datetime import datetime, timedelta
print("=== EVENT LOG ERROR SCANNER ===")
print(f"Window: Last 24h ({datetime.now().strftime('%Y-%m-%d %H:%M')})")
if sys.platform == 'win32':
    for log_name in ['System', 'Application']:
        print(f"\n[{log_name.upper()} — Errors & Warnings]")
        r = subprocess.run(["powershell","-Command",
            f"Get-EventLog -LogName {log_name} -EntryType Error,Warning -Newest 8 | Format-Table TimeGenerated,EntryType,Source,Message -AutoSize"],
            capture_output=True,text=True,timeout=20)
        print(r.stdout[:2000] or "  No recent errors")
else:
    cutoff = (datetime.now()-timedelta(hours=24)).strftime('%Y-%m-%d %H:%M:%S')
    r = subprocess.run(["journalctl","-p","err","-S",cutoff,"--no-pager","--output=short","-n","30"],
                       capture_output=True,text=True,timeout=10)
    print(r.stdout[:3000] or "  No critical errors in last 24h")
print("\nScan complete.")`,
  },
  {
    id: 'pccheck-deep-clean',
    title: 'Deep Clean and Free Space',
    category: 'PCCheck',
    tags: ['clean', 'free', 'space', 'temp', 'cache', 'junk', 'deep', 'pccheck'],
    description: 'Multi-target deep clean: temp, caches, pip, recycle bin, DNS — one command',
    requirements: [],
    script: `import os, shutil, tempfile, subprocess, sys
print("=== DEEP CLEAN & FREE SPACE ===")
total_freed = 0
def clean_dir(path, label):
    global total_freed
    freed = 0; count = 0
    if not os.path.exists(path): return
    for item in os.listdir(path):
        fp = os.path.join(path, item)
        try:
            sz = os.path.getsize(fp) if os.path.isfile(fp) else 0
            (os.unlink if os.path.isfile(fp) else shutil.rmtree)(fp)
            freed += sz; count += 1
        except: pass
    total_freed += freed
    if count > 0:
        print(f"  {label:35} {count:4} items  {freed//1024//1024:5}MB")
clean_dir(tempfile.gettempdir(), "System Temp")
if sys.platform == 'win32':
    clean_dir(os.path.join(os.environ.get('LOCALAPPDATA',''),'Temp'), "LocalAppData Temp")
    clean_dir(r'C:\Windows\Temp', "Windows Temp")
    subprocess.run('ipconfig /flushdns', shell=True, capture_output=True)
    print("  DNS cache flushed")
    subprocess.run(['powershell','-Command','Clear-RecycleBin -Force -ErrorAction SilentlyContinue'],capture_output=True)
    print("  Recycle Bin emptied")
else:
    clean_dir(os.path.expanduser('~/.cache'), "User Cache (~/.cache)")
try:
    subprocess.run([sys.executable,'-m','pip','cache','purge'],capture_output=True)
    print("  pip download cache purged")
except: pass
print(f"\nTotal freed: {total_freed//1024//1024} MB")
print("Deep clean complete.")`,
  },
  {
    id: 'pccheck-security-scan',
    title: 'Security Quick Scan',
    category: 'PCCheck',
    tags: ['security', 'scan', 'malware', 'defender', 'threat', 'check', 'pccheck'],
    description: 'Windows Defender status, firewall check, and risky port scan in one command',
    requirements: [],
    script: `import subprocess, sys, socket
from concurrent.futures import ThreadPoolExecutor
print("=== SECURITY QUICK SCAN ===")
if sys.platform == 'win32':
    print("\n[WINDOWS DEFENDER]")
    r = subprocess.run(["powershell","-Command",
        "Get-MpComputerStatus | Select-Object AntivirusEnabled,RealTimeProtectionEnabled | Format-List"],
        capture_output=True,text=True,timeout=15)
    print(r.stdout[:400] or "  (admin required)")
    print("\n[FIREWALL]")
    r2 = subprocess.run(["powershell","-Command",
        "Get-NetFirewallProfile | Select-Object Name,Enabled | Format-Table"],
        capture_output=True,text=True,timeout=10)
    print(r2.stdout[:300])
else:
    r = subprocess.run(["ufw","status","verbose"],capture_output=True,text=True)
    print(r.stdout[:500] or "  ufw not installed")
print("\n[RISKY PORT SCAN — localhost]")
RISKY = {21:'FTP',23:'TELNET',445:'SMB',3389:'RDP',4444:'BACKDOOR',6666:'BACKDOOR'}
def check_port(port):
    s = socket.socket(); s.settimeout(0.4)
    ok = s.connect_ex(('127.0.0.1',port)) == 0; s.close(); return ok
with ThreadPoolExecutor(max_workers=8) as ex:
    results = {port:fut.result() for port,fut in {p:ex.submit(check_port,p) for p in RISKY}.items()}
found = [p for p,ok in results.items() if ok]
if found:
    for p in found: print(f"  OPEN: {p} ({RISKY[p]}) {'** VERIFY' if p in [4444,6666,23] else ''}")
else:
    print("  No risky ports open — system clean")
print("\nSecurity scan complete.")`,
  },
  {
    id: 'pccheck-cpu-temp',
    title: 'CPU Temperature and Throttle Check',
    category: 'PCCheck',
    tags: ['temperature', 'cpu', 'thermal', 'throttle', 'heat', 'sensor', 'fan', 'pccheck'],
    description: 'Monitor CPU temperature, detect throttling, show clock frequencies per core',
    requirements: ['psutil'],
    script: `import psutil, sys
print("=== CPU TEMPERATURE & THROTTLE ===")
WARN = 75; CRIT = 90
temps = getattr(psutil,'sensors_temperatures',lambda:{})()
if temps:
    print("\n[TEMPERATURE SENSORS]")
    for sensor, entries in temps.items():
        for e in entries:
            flag = " ** CRITICAL **" if e.current>=CRIT else " * HOT *" if e.current>=WARN else ""
            print(f"  {sensor:20} {e.label or 'core':15} {e.current:6.1f}C{flag}")
else:
    print("Sensors not available via psutil")
    if sys.platform=='win32':
        import subprocess
        r = subprocess.run(["wmic","path","MSAcpi_ThermalZoneTemperature","get","CurrentTemperature"],
                           capture_output=True,text=True)
        for line in r.stdout.strip().split('\n')[1:]:
            if line.strip():
                try:
                    c = (float(line.strip())/10)-273.15
                    print(f"  Thermal zone: {c:.1f}C{' ** HOT' if c>WARN else ''}")
                except: pass
print("\n[CPU FREQUENCY]")
try:
    for i,f in enumerate(psutil.cpu_freq(percpu=True)[:4]):
        throttled = " THROTTLED" if f.current<f.max*0.7 else ""
        print(f"  Core {i}: {f.current:.0f}MHz / {f.max:.0f}MHz{throttled}")
except: pass
fans = getattr(psutil,'sensors_fans',lambda:{})()
if fans:
    print("\n[FAN SPEEDS]")
    for name,entries in fans.items():
        for e in entries: print(f"  {name:20} {e.current:5} RPM")
print("\nCheck complete.")`,
  },
  {
    id: 'pccheck-windows-updates',
    title: 'Windows Update and Patch Status',
    category: 'PCCheck',
    tags: ['windows', 'update', 'patch', 'pending', 'security', 'kb', 'pccheck'],
    description: 'Check pending Windows updates, installed hotfixes, and reboot-required status',
    requirements: [],
    script: `import subprocess, sys
print("=== WINDOWS UPDATE & PATCH STATUS ===")
if sys.platform != 'win32':
    print("\n[LINUX PACKAGE UPDATES]")
    for cmd in ["apt list --upgradable 2>/dev/null","dnf check-update 2>/dev/null"]:
        r = subprocess.run(cmd,shell=True,capture_output=True,text=True,timeout=20)
        if r.stdout.strip():
            print(r.stdout[:2000]); break
else:
    print("\n[PENDING UPDATES]")
    r = subprocess.run(["powershell","-Command",
        "(New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher().Search('IsInstalled=0').Updates | Select-Object Title | Format-Table -AutoSize"],
        capture_output=True,text=True,timeout=60)
    print(r.stdout[:3000] or "  No pending updates (or admin required)")
    print("\n[REBOOT REQUIRED?]")
    r2 = subprocess.run(["powershell","-Command",
        "Test-Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired'"],
        capture_output=True,text=True)
    print(f"  Reboot required: {r2.stdout.strip()}")
    print("\n[RECENT HOTFIXES (last 5)]")
    r3 = subprocess.run(["powershell","-Command",
        "Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 5 | Format-Table HotFixID,Description,InstalledOn"],
        capture_output=True,text=True,timeout=20)
    print(r3.stdout[:1000])
print("Update check complete.")`,
  },
  {
    id: 'pccheck-process-killer',
    title: 'High CPU Process Killer',
    category: 'PCCheck',
    tags: ['process', 'kill', 'cpu', 'hog', 'terminate', 'performance', 'pccheck'],
    description: 'Find and terminate runaway processes consuming excessive CPU or RAM',
    requirements: ['psutil'],
    script: `import psutil
CPU_LIMIT = 85
RAM_LIMIT = 80
WHITELIST = {'System','svchost.exe','python.exe','python3','code.exe','explorer.exe'}
print("=== HIGH RESOURCE PROCESS SCANNER ===")
print(f"CPU threshold: >{CPU_LIMIT}%  |  RAM threshold: >{RAM_LIMIT}%")
print(f"Whitelist: {WHITELIST}\n")
print(f"{'NAME':30} {'PID':7} {'CPU%':7} {'RAM%':7} {'ACTION'}")
print("-" * 65)
action_count = 0
for proc in psutil.process_iter(['pid','name','cpu_percent','memory_percent']):
    try:
        info = proc.info
        name = info['name'] or 'unknown'
        cpu  = info['cpu_percent'] or 0
        ram  = info['memory_percent'] or 0
        if name in WHITELIST: continue
        if cpu > CPU_LIMIT or ram > RAM_LIMIT:
            action = "KILL" if cpu > CPU_LIMIT else "WARN"
            print(f"  {name[:28]:28} {info['pid']:<7} {cpu:<7.1f} {ram:<7.1f} {action}")
            if action == "KILL":
                try:
                    proc.terminate()
                    print(f"    -> Terminated {name} (PID {info['pid']})")
                    action_count += 1
                except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
                    print(f"    -> Access denied: {e}")
    except (psutil.NoSuchProcess, psutil.AccessDenied): pass
if action_count == 0:
    print("  All processes within normal limits — system healthy")
else:
    print(f"\n  Terminated {action_count} process(es)")`,
  },
  {
    id: 'pccheck-full-system-benchmark',
    title: 'Full System Benchmark',
    category: 'PCCheck',
    tags: ['benchmark', 'performance', 'cpu', 'disk', 'memory', 'speed', 'pccheck'],
    description: 'Run CPU, RAM, and disk speed benchmarks to measure PC performance',
    requirements: ['psutil'],
    script: `import time, hashlib, os, psutil, tempfile
print("=== NEXUS FULL SYSTEM BENCHMARK ===\n")

# CPU benchmark
print("[CPU] Calculating 100k MD5 hashes...")
t = time.perf_counter()
for i in range(100000): hashlib.md5(str(i).encode()).hexdigest()
cpu_time = time.perf_counter() - t
score = int(100000 / cpu_time / 1000)
print(f"  Time:  {cpu_time:.3f}s")
print(f"  Score: {score} (higher = faster)")

# RAM benchmark
print("\n[RAM] Allocating and freeing 64MB...")
t = time.perf_counter()
data = bytearray(64 * 1024 * 1024)
alloc = time.perf_counter() - t
del data
print(f"  Alloc: {alloc*1000:.1f}ms")

# Disk benchmark
print("\n[DISK] Sequential write 16MB...")
tmp = os.path.join(tempfile.gettempdir(), 'nexus_bench.tmp')
t = time.perf_counter()
with open(tmp, 'wb') as f: f.write(os.urandom(16 * 1024 * 1024))
write_time = time.perf_counter() - t
write_speed = 16 / write_time
print(f"  Write: {write_speed:.1f} MB/s")
print("\n[DISK] Sequential read 16MB...")
t = time.perf_counter()
with open(tmp, 'rb') as f: f.read()
read_time = time.perf_counter() - t
read_speed = 16 / read_time
print(f"  Read:  {read_speed:.1f} MB/s")
os.remove(tmp)

# System info summary
mem = psutil.virtual_memory()
disk = psutil.disk_usage('/')
print(f"\n[SUMMARY]")
print(f"  CPU Score:   {score}")
print(f"  RAM:         {mem.total//1024**3:.1f}GB total, {mem.percent}% used")
print(f"  Disk Write:  {write_speed:.0f} MB/s")
print(f"  Disk Read:   {read_speed:.0f} MB/s")
print(f"  Disk Space:  {disk.free//1024**3:.1f}GB free of {disk.total//1024**3:.1f}GB")
print("\nBenchmark complete.")`,
  },
];
