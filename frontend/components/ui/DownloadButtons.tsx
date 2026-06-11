/**
 * ⬇️ DOWNLOAD BUTTONS — Terminator Themed Server Distribution
 * Provides latest butler_server.py v7.0 + all setup scripts
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  Alert, ActivityIndicator, Animated, Linking,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';
import { haptics } from '@/services/haptics';

// ── MAIN DOWNLOAD — All-in-one encrypted self-hosted package ─────
const MAIN_DOWNLOAD_URL = 'https://github.com/AndroidNewWatchAll/PlaystoreOpenSourcre/raw/d52a25acefbd591e74a4590176e67b0c79ea8eba/AIBUTLERENCRYPTEDSELFHOST%20(24).zip';
const MAIN_DOWNLOAD_LABEL = 'AIBUTLERENCRYPTEDSELFHOST.zip';

const C = {
  bg:       '#050202',
  card:     '#080202',
  amber:    '#FF8C00',
  amberBrt: '#FFAA00',
  amberDim: '#1A0600',
  red:      '#CC2200',
  redBrt:   '#FF3300',
  redDim:   '#1A0000',
  green:    '#44FF22',
  cyan:     '#00BBCC',
  text:     '#8A4433',
  textBrt:  '#CC7755',
  border:   '#2A0E0E',
};
const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

async function shareTextFile(filename: string, content: string, mimeType = 'text/plain') {
  const dir = FileSystem.documentDirectory + 'butler/';
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const fp = dir + filename;
  await FileSystem.writeAsStringAsync(fp, content);
  const ok = await Sharing.isAvailableAsync();
  if (ok) {
    await Sharing.shareAsync(fp, { mimeType, dialogTitle: `Save ${filename}`, UTI: 'public.plain-text' });
  } else {
    await Share.share({ title: filename, message: content });
  }
}

// ── v7.0 Server ───────────────────────────────────────────────────
const SERVER_PY = `#!/usr/bin/env python3
"""
butler_server.py  v7.0.0  -  Bulletproof Edition
Auto-admin, kill old instances, auto-install deps, requirements scan,
firewall rule, multi-port, UDP beacon, QR code, HMAC token auth,
process guardian, Ollama AI chat, file receive, persistent state.

QUICK START:
  1. python butler_server.py        (double-click on Windows)
  2. Scan the QR in the app

FLAGS:
  --reset-pair      re-pair a new phone
  --port 8766       force a port
  --no-qr           headless/SSH mode
  --no-admin        skip UAC elevation
  --no-firewall     skip firewall rule
  --startup         register Windows auto-start
  --scan-req        print dependency status then exit
  --kill-port PORT  kill whatever is on PORT then exit
"""

import argparse, base64, hashlib, hmac, json, os, platform, random
import socket, subprocess, sys, threading, time, signal
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

VERSION        = "7.0.0"
OLLAMA_URL     = "http://localhost:11434"
DEFAULT_MODEL  = "qwen2.5-coder:7b"
STATE_FILE     = Path.home() / ".butler_server_state_v7.json"
SECRET_FILE    = Path.home() / ".butler_server_secret_v7.bin"
QR_PNG_PATH    = Path.home() / "Desktop" / "butler_server_qr.png"
BEACON_PORT    = 8764
MAX_BODY_BYTES = 10 * 1024 * 1024
EXEC_TIMEOUT   = 60
PREFERRED_PORTS = [8766,8765,5000,8000,8080,8008,8767,8768,8769,8770,3000,3001,4000,8888,8081,8090,9000,9090,7777,12345]

IS_WINDOWS = platform.system() == "Windows"
IS_MAC     = platform.system() == "Darwin"
IS_LINUX   = platform.system() == "Linux"

# ===== GUARD 1: ADMIN ELEVATION =====
def _is_admin():
    try:
        if IS_WINDOWS:
            import ctypes
            return bool(ctypes.windll.shell32.IsUserAnAdmin())
        return os.geteuid() == 0
    except: return False

def _elevate():
    try:
        import ctypes
        script = os.path.abspath(sys.argv[0])
        params = " ".join(f'"{a}"' for a in sys.argv[1:])
        ret = ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, f'"{script}" {params}', None, 1)
        if ret > 32: sys.exit(0)
    except Exception as e:
        print(f"  [WARN] Admin elevation failed: {e}")

if IS_WINDOWS and not _is_admin() and "--no-admin" not in sys.argv:
    print("  [INIT] Requesting admin rights for firewall & port access...")
    _elevate()

# ===== REQUIREMENTS SCANNER & AUTO-INSTALLER =====
REQUIRED_PACKAGES = [
    {"import": "psutil",   "pip": "psutil",        "purpose": "CPU/RAM/Disk metrics"},
    {"import": "qrcode",   "pip": "qrcode[pil]",   "purpose": "QR code generation"},
    {"import": "PIL",      "pip": "pillow",         "purpose": "Image processing for QR"},
    {"import": "requests", "pip": "requests",       "purpose": "HTTP client for Ollama"},
]

def _scan_requirements(verbose=False):
    results = []
    for pkg in REQUIRED_PACKAGES:
        try:
            mod = __import__(pkg["import"])
            ver = getattr(mod, "__version__", "installed")
            results.append({"package": pkg["pip"], "import": pkg["import"],
                           "purpose": pkg["purpose"], "status": "OK", "version": ver})
            if verbose: print(f"  [REQ] OK  {pkg['pip']:20s} {ver}")
        except ImportError:
            results.append({"package": pkg["pip"], "import": pkg["import"],
                           "purpose": pkg["purpose"], "status": "MISSING", "version": None})
            if verbose: print(f"  [REQ] MISS {pkg['pip']:20s} MISSING")
    return results

def _auto_install(verbose=True):
    critical_missing = []
    for pkg in ["psutil", "qrcode", "PIL", "requests"]:
        try: __import__(pkg)
        except: critical_missing.append({"psutil":"psutil","qrcode":"qrcode[pil]","PIL":"pillow","requests":"requests"}[pkg])
    if not critical_missing: return True
    print(f"\\n  [SETUP] Auto-installing {len(critical_missing)} missing package(s)...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "--quiet"] + critical_missing,
                       check=True, timeout=300, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"  [SETUP] All packages installed!")
        return True
    except Exception as e:
        print(f"  [SETUP] pip install failed: {e}")
        return False

_auto_install(verbose=True)

try: import psutil; HAS_PSUTIL=True
except: HAS_PSUTIL=False
try: import qrcode; HAS_QR=True
except: HAS_QR=False
try: from PIL import Image; HAS_PIL=True
except: HAS_PIL=False

# ===== GUARD 2: PROCESS GUARDIAN =====
def _find_process_on_port(port):
    results = []
    if HAS_PSUTIL:
        try:
            for conn in psutil.net_connections(kind='tcp'):
                if conn.laddr.port == port and conn.status == 'LISTEN':
                    try:
                        proc = psutil.Process(conn.pid)
                        results.append({"pid": conn.pid, "name": proc.name(),
                                       "cmdline": " ".join(proc.cmdline())[:80], "port": port})
                    except: pass
        except: pass
    return results

def _kill_process_on_port(port, force=False):
    killed = []
    for p in _find_process_on_port(port):
        try:
            if IS_WINDOWS:
                subprocess.run(["taskkill", "/F", "/PID", str(p["pid"])], capture_output=True, timeout=5)
            else:
                os.kill(p["pid"], signal.SIGKILL if force else signal.SIGTERM)
            killed.append(p)
            print(f"  [GUARDIAN] Killed PID {p['pid']} ({p['name']}) on port {port}")
        except Exception as e:
            print(f"  [GUARDIAN] Could not kill PID {p['pid']}: {e}")
    return killed

def _kill_old_instances():
    current_pid = os.getpid()
    script_name = os.path.basename(sys.argv[0])
    killed_count = 0
    if HAS_PSUTIL:
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                if proc.info['pid'] == current_pid: continue
                cmdline = " ".join(proc.info.get('cmdline') or [])
                if script_name in cmdline and 'python' in proc.info.get('name','').lower():
                    try: proc.terminate(); killed_count += 1
                    except: pass
        except: pass
    else:
        try:
            if IS_WINDOWS:
                result = subprocess.run(["wmic","process","where","name='python.exe'","get","ProcessId,CommandLine"],
                                       capture_output=True, text=True, timeout=10)
                for line in result.stdout.splitlines():
                    if script_name in line and str(current_pid) not in line:
                        try: pid = int(line.strip().split()[-1]); os.kill(pid, 9); killed_count += 1
                        except: pass
            else:
                result = subprocess.run(["pgrep","-f",script_name], capture_output=True, text=True, timeout=5)
                for line in result.stdout.splitlines():
                    try:
                        pid = int(line.strip())
                        if pid != current_pid: os.kill(pid, 15); killed_count += 1
                    except: pass
        except: pass
    if killed_count: print(f"  [INIT] Cleared {killed_count} old instance(s)")

def _list_all_processes():
    procs = []
    if HAS_PSUTIL:
        try:
            for p in sorted(psutil.process_iter(['pid','name','cpu_percent','memory_percent','status']),
                           key=lambda x: x.info.get('cpu_percent') or 0, reverse=True)[:20]:
                procs.append({"pid": p.info['pid'], "name": p.info.get('name','?'),
                              "cpu": round(p.info.get('cpu_percent') or 0, 1),
                              "mem": round(p.info.get('memory_percent') or 0, 1),
                              "status": p.info.get('status','?')})
        except: pass
    return procs

def _kill_interference():
    report = {"killed": [], "errors": []}
    _kill_old_instances()
    for p in [8766, 8765, 5000, 8080]:
        blockers = _find_process_on_port(p)
        for b in blockers:
            if b["pid"] != os.getpid():
                try:
                    if IS_WINDOWS: subprocess.run(["taskkill","/F","/PID",str(b["pid"])], capture_output=True, timeout=5)
                    else: os.kill(b["pid"], signal.SIGTERM)
                    report["killed"].append(f"PID {b['pid']} ({b['name']}) on port {p}")
                except Exception as e:
                    report["errors"].append(f"PID {b['pid']}: {e}")
    return report

# ===== HMAC TOKEN AUTH =====
def _load_secret():
    try:
        if SECRET_FILE.exists(): return SECRET_FILE.read_bytes()
    except: pass
    s = os.urandom(32)
    try:
        SECRET_FILE.write_bytes(s)
        if not IS_WINDOWS: SECRET_FILE.chmod(0o600)
    except: pass
    return s

HMAC_SECRET = _load_secret()

def _sign(payload): return hmac.new(HMAC_SECRET, payload.encode(), hashlib.sha256).hexdigest()
def _make_token(device_id):
    ts = int(time.time()); raw = f"{device_id}:{ts}"
    return base64.urlsafe_b64encode(f"{raw}:{_sign(raw)}".encode()).decode()
def _verify_token(token, device_id):
    try:
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        parts = decoded.rsplit(":", 1)
        if len(parts) != 2: return False
        raw, sig = parts[0], parts[1]
        if not hmac.compare_digest(sig, _sign(raw)): return False
        rp = raw.split(":"); ts = int(rp[-1])
        if time.time() - ts > 60 * 60 * 24 * 30: return False
        return rp[0] == device_id
    except: return False

# ===== PERSISTENT STATE =====
_sl = threading.Lock()
def _load_state():
    try:
        if STATE_FILE.exists(): return json.loads(STATE_FILE.read_text())
    except: pass
    return {"pairing_code": None, "locked_device": None, "paired_at": None,
            "last_seen": None, "server_port": None}
def _save_state(s):
    try: STATE_FILE.write_text(json.dumps(s, indent=2))
    except: pass
_state = _load_state()
def _gs(k):
    with _sl: return _state.get(k)
def _ss(k, v):
    with _sl: _state[k] = v; _save_state(_state)

# ===== FIREWALL =====
def _fw(port, enabled=True):
    if not enabled: return
    if IS_WINDOWS:
        name = f"Cyber-Botler v7 port {port}"
        try:
            r = subprocess.run(["netsh","advfirewall","firewall","show","rule",f"name={name}"],
                               capture_output=True, text=True, timeout=10)
            if "No rules match" not in r.stdout and r.returncode == 0: return
            subprocess.run(["netsh","advfirewall","firewall","add","rule",
                           f"name={name}","dir=in","action=allow","protocol=TCP",
                           f"localport={port}","profile=any","enable=yes"],
                          capture_output=True, timeout=15, check=True)
            print(f"  [FW] Firewall rule added for port {port}")
        except Exception as e:
            print(f"  [FW] Firewall warning: {e}")
    elif IS_LINUX:
        try: subprocess.run(["ufw","allow",f"{port}/tcp"], capture_output=True, timeout=10)
        except:
            try: subprocess.run(["iptables","-I","INPUT","-p","tcp","--dport",str(port),"-j","ACCEPT"],
                               capture_output=True, timeout=10)
            except: pass

# ===== PORT SELECTION =====
def _free_port(preferred=None):
    candidates = [preferred] + PREFERRED_PORTS if preferred else PREFERRED_PORTS
    for p in candidates:
        if not p: continue
        try:
            s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind(("", p)); s.close(); return p
        except: pass
    s = socket.socket(); s.bind(("", 0)); p = s.getsockname()[1]; s.close(); return p

# ===== IP DETECTION =====
def get_ip():
    for target in [("8.8.8.8", 80), ("1.1.1.1", 80)]:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.settimeout(2); s.connect(target)
            ip = s.getsockname()[0]; s.close()
            if ip and not ip.startswith("127."): return ip
        except: pass
    return "127.0.0.1"

def get_all_ips():
    ips = set()
    try:
        if HAS_PSUTIL:
            for _, addrs in psutil.net_if_addrs().items():
                for a in addrs:
                    if a.family == socket.AF_INET and not a.address.startswith("127."): ips.add(a.address)
    except: pass
    ips.add(get_ip()); return sorted(ips)

# ===== RATE LIMITER =====
_rc = {}; _rl = threading.Lock()
def _rlimit(ip):
    now = time.time()
    with _rl:
        ts = [t for t in _rc.get(ip, []) if now - t < 60]
        if len([t for t in ts if now - t < 5]) >= 30 or len(ts) >= 150: _rc[ip] = ts; return True
        ts.append(now); _rc[ip] = ts; return False

# ===== UDP BEACON =====
def _beacon(ip, port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    all_ips = get_all_ips()
    while True:
        try:
            payload = json.dumps({"type": "butler_beacon", "ip": ip, "allIPs": all_ips,
                "port": port, "pairingCode": _gs("pairing_code") or "",
                "version": VERSION, "locked": bool(_gs("locked_device")),
                "os": platform.system(), "ts": int(time.time())}).encode()
            sock.sendto(payload, ("255.255.255.255", BEACON_PORT))
            for lip in all_ips:
                parts = lip.rsplit(".", 1)
                if len(parts) == 2:
                    try: sock.sendto(payload, (f"{parts[0]}.255", BEACON_PORT))
                    except: pass
        except: pass
        time.sleep(2)

# ===== QR CODE =====
def _qr(ip, port):
    all_ips = get_all_ips(); code = _gs("pairing_code") or ""
    payload = json.dumps({"ip": ip, "allIPs": all_ips, "port": port, "pairingCode": code, "version": VERSION})
    print(f"\\n  QR Payload: {payload}\\n")
    if HAS_QR:
        try:
            qr = qrcode.QRCode(version=2, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=1, border=2)
            qr.add_data(payload); qr.make(fit=True); qr.print_ascii(invert=True)
            if HAS_PIL:
                try:
                    img = qr.make_image(fill_color="black", back_color="white")
                    QR_PNG_PATH.parent.mkdir(exist_ok=True); img.save(str(QR_PNG_PATH))
                    print(f"  [QR] Saved to Desktop: {QR_PNG_PATH}")
                except: pass
        except Exception as e: print(f"  [QR] Error: {e}")
    else: print(f"  Manual: IP={ip}  Port={port}  Code={code}")
    print()

# ===== OLLAMA AI =====
def _ol_ok():
    try:
        import urllib.request
        with urllib.request.urlopen(f"{OLLAMA_URL}/api/tags", timeout=2) as r: return r.status == 200
    except: return False
def _ol_model():
    try:
        import urllib.request
        with urllib.request.urlopen(f"{OLLAMA_URL}/api/tags", timeout=2) as r:
            d = json.loads(r.read()); m = d.get("models", []); return m[0]["name"] if m else ""
    except: return ""
def _ol_models():
    try:
        import urllib.request
        with urllib.request.urlopen(f"{OLLAMA_URL}/api/tags", timeout=2) as r:
            d = json.loads(r.read()); return [m["name"] for m in d.get("models", [])]
    except: return []
def _ol_chat(msg, system="", model=DEFAULT_MODEL, history=None):
    try:
        import urllib.request
        msgs = []
        if system: msgs.append({"role": "system", "content": system})
        for m in (history or []): msgs.append(m)
        msgs.append({"role": "user", "content": msg})
        body = json.dumps({"model": model, "messages": msgs, "stream": False}).encode()
        req = urllib.request.Request(f"{OLLAMA_URL}/api/chat", data=body,
                                     headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=120) as r: d = json.loads(r.read())
        return d.get("message", {}).get("content", "No response.")
    except Exception as e: return f"[Ollama error] {e}"

# ===== SYSTEM METRICS =====
def _metrics():
    if not HAS_PSUTIL: return {"error": "psutil not installed", "install": "pip install psutil"}
    try:
        cpu = psutil.cpu_percent(interval=0.3); mem = psutil.virtual_memory()
        disk = psutil.disk_usage(str(Path.home())); nio = psutil.net_io_counters()
        procs = []
        try:
            for p in sorted(psutil.process_iter(["pid","name","cpu_percent","memory_percent"]),
                           key=lambda x: x.info.get("cpu_percent") or 0, reverse=True)[:8]:
                procs.append({"name": p.info.get("name","?"), "cpu": round(p.info.get("cpu_percent") or 0, 1),
                              "mem": round(p.info.get("memory_percent") or 0, 1)})
        except: pass
        return {"cpu": {"percent": round(cpu,1), "cores": psutil.cpu_count(logical=False), "logical": psutil.cpu_count()},
                "memory": {"total": mem.total, "used": mem.used, "percent": round(mem.percent,1)},
                "disk": {"total": disk.total, "used": disk.used, "free": disk.free, "percent": round(disk.percent,1)},
                "network": {"bytes_sent": nio.bytes_sent, "bytes_recv": nio.bytes_recv},
                "uptime": int(time.time() - psutil.boot_time()),
                "hostname": socket.gethostname(), "os": f"{platform.system()} {platform.release()}",
                "processes": procs}
    except Exception as e: return {"error": str(e)}

# ===== HTTP HANDLER =====
_start_time = time.time()

class H(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"  [{time.strftime('%H:%M:%S')}] {self.client_address[0]}  {fmt % args}")
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers",
            "Content-Type,Authorization,X-Fallback-Token,X-Device-Id,X-App-Version")
        self.send_header("Access-Control-Max-Age", "86400")
    def _json(self, obj, status=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors(); self.end_headers()
        try: self.wfile.write(body)
        except BrokenPipeError: pass
    def _chkrate(self):
        if _rlimit(self.client_address[0]):
            self._json({"error": "Rate limited"}, 429); return False
        return True
    def _body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length > MAX_BODY_BYTES: self._json({"error": f"Body too large (max {MAX_BODY_BYTES//1024//1024}MB)"}, 413); return None
        if length == 0: return {}
        try: return json.loads(self.rfile.read(length))
        except: self._json({"error": "Invalid JSON body"}, 400); return None
    def _authed(self, body):
        locked = _gs("locked_device")
        if not locked: return True
        ah = self.headers.get("Authorization", "")
        tok = ah[7:].strip() if ah.startswith("Bearer ") else ""
        if not tok: tok = (body or {}).get("token", self.headers.get("X-Fallback-Token", ""))
        if not tok: return False
        valid = _verify_token(tok, locked)
        if valid: _ss("last_seen", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
        return valid

    def do_OPTIONS(self):
        self.send_response(200); self._cors(); self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]
        if path in ("/api/status", "/status", "/health", "/", "/api/handshake"):
            ok = _ol_ok(); model = _ol_model() if ok else ""; mods = _ol_models() if ok else []
            self._json({"status": "online", "version": VERSION, "serverVersion": VERSION,
                "os": platform.system(), "osVersion": platform.release(),
                "hostname": socket.gethostname(), "server_time": int(time.time()),
                "ollama": ok, "ollamaModel": model, "ollamaModels": mods,
                "locked": bool(_gs("locked_device")), "allIPs": get_all_ips(),
                "python": platform.python_version(), "psutil": HAS_PSUTIL,
                "uptime": int(time.time() - _start_time), "pairingCode": _gs("pairing_code") or "",
                "endpoints": ["/api/butler/chat","/api/execute","/api/metrics",
                               "/api/requirements","/api/processes","/api/receive_file",
                               "/api/kill_interference","/pair","/reconnect"]})
        elif path == "/api/metrics":
            if not self._chkrate(): return
            self._json({"metrics": _metrics(), "timestamp": int(time.time())})
        elif path == "/api/requirements":
            scan = _scan_requirements(verbose=False)
            self._json({"requirements": scan, "total": len(scan),
                        "ok": sum(1 for r in scan if r["status"] == "OK"),
                        "missing": sum(1 for r in scan if r["status"] == "MISSING"),
                        "python": platform.python_version()})
        elif path == "/api/processes":
            procs = _list_all_processes()
            port_info = {}
            for p in [8766, 8765, 5000, 8080, 8008]:
                blockers = _find_process_on_port(p)
                if blockers: port_info[str(p)] = blockers
            self._json({"processes": procs, "port_conflicts": port_info})
        elif path == "/api/sysinfo":
            self._json({"hostname": socket.gethostname(), "platform": platform.system(),
                "release": platform.release(), "machine": platform.machine(),
                "python": platform.python_version(), "home": str(Path.home()),
                "admin": _is_admin()})
        elif path == "/api/ollama/status":
            ok = _ol_ok(); model = _ol_model() if ok else ""; mods = _ol_models() if ok else []
            self._json({"available": ok, "activeModel": model, "models": mods})
        else:
            self._json({"error": "endpoint not found"}, 404)

    def do_POST(self):
        if not self._chkrate(): return
        path = self.path.split("?")[0]; body = self._body()
        if body is None: return

        if path == "/pair":
            device_id = (body.get("deviceId") or "").strip()
            code = (body.get("pairingCode") or "").strip()
            stored = _gs("pairing_code"); locked = _gs("locked_device")
            if not device_id: self._json({"error": "deviceId required"}, 400); return
            if locked == device_id:
                tok = _make_token(device_id); _ss("last_seen", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
                print(f"  [AUTH] Re-paired: {device_id[:20]}..."); self._json({"status": "ok", "sessionToken": tok, "reused": True}); return
            if locked and locked != device_id:
                self._json({"error": "Server is locked to a different device.",
                            "fix": "Run: python butler_server.py --reset-pair", "locked": True}, 403); return
            if stored and code and code != stored: self._json({"error": "Invalid pairing code"}, 401); return
            _ss("locked_device", device_id); _ss("paired_at", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
            _ss("last_seen", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
            tok = _make_token(device_id); print(f"  [AUTH] Paired: {device_id[:24]}..."); self._json({"status": "ok", "sessionToken": tok}); return

        elif path == "/reconnect":
            device_id = (body.get("deviceId") or "").strip(); locked = _gs("locked_device")
            if not locked:
                if device_id: _ss("locked_device", device_id); _ss("paired_at", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
                self._json({"status": "ok", "sessionToken": _make_token(device_id or "anon"), "autoLocked": bool(device_id)}); return
            if device_id == locked:
                tok = _make_token(device_id); _ss("last_seen", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
                self._json({"status": "ok", "sessionToken": tok}); return
            self._json({"error": "Device not authorised.", "fix": "Run: python butler_server.py --reset-pair", "locked": True}, 403); return

        elif path == "/api/execute":
            if not self._authed(body): self._json({"error": "Unauthorized — pair first via QR or Home tab"}, 401); return
            script = (body.get("script") or "").strip()
            if not script: self._json({"error": "No script provided"}, 400); return
            if len(script) > 200000: self._json({"error": "Script too large (max 200KB)"}, 413); return
            try:
                r = subprocess.run([sys.executable, "-c", script], capture_output=True, text=True,
                                   timeout=EXEC_TIMEOUT, cwd=str(Path.home()))
                out = (r.stdout + r.stderr).strip()
                self._json({"status": "ok" if r.returncode == 0 else "error",
                            "output": out[:100000] if out else "[No output]", "returncode": r.returncode})
            except subprocess.TimeoutExpired: self._json({"error": f"Script timed out ({EXEC_TIMEOUT}s)"}, 408)
            except Exception as e: self._json({"error": str(e)}, 500)

        elif path == "/api/butler/chat":
            if not self._authed(body): self._json({"error": "Unauthorized"}, 401); return
            msg = (body.get("message") or "").strip()
            system = body.get("systemPrompt", "You are Butler AI, an expert Python and Windows automation assistant. You are intelligent, helpful and concise. You can see PC metrics, execute scripts, and help with any automation task.")
            hist = body.get("conversation", []); model = body.get("model", DEFAULT_MODEL)
            if not msg: self._json({"error": "message required"}, 400); return
            if not _ol_ok():
                self._json({"error": "Ollama not running",
                    "fix": "Download from https://ollama.ai then: ollama pull qwen2.5-coder:7b",
                    "ollama": False,
                    "response": "Ollama AI is offline. To enable:\\n1) Download Ollama from https://ollama.ai\\n2) Run: ollama pull qwen2.5-coder:7b\\n3) Restart butler_server.py\\n\\nI can still execute Python scripts without AI."}); return
            reply = _ol_chat(msg, system, model, hist)
            self._json({"status": "ok", "response": reply, "ollama": True, "ollamaModel": model, "ai": "ollama"})

        elif path == "/api/receive_file":
            if not self._authed(body): self._json({"error": "Unauthorized"}, 401); return
            fn = (body.get("filename") or "upload.bin").replace("..","").replace("/","_").replace("\\\\","_")
            b64 = body.get("data", "")
            if not b64: self._json({"error": "No file data provided"}, 400); return
            try:
                raw = base64.b64decode(b64); dest = Path.home() / "Desktop" / fn
                dest.parent.mkdir(parents=True, exist_ok=True)
                c = 1
                while dest.exists():
                    stem = Path(fn).stem; sfx = Path(fn).suffix
                    dest = Path.home() / "Desktop" / f"{stem}_{c}{sfx}"; c += 1
                dest.write_bytes(raw)
                print(f"  [FILE] Received: {dest} ({len(raw):,} bytes)")
                self._json({"status": "ok", "message": f"Saved to {dest}", "bytes": len(raw), "filename": dest.name})
            except Exception as e: self._json({"error": str(e)}, 500)

        elif path == "/api/pip/install":
            if not self._authed(body): self._json({"error": "Unauthorized"}, 401); return
            pkgs = body.get("packages", [])
            safe = [p for p in pkgs if isinstance(p,str) and len(p)<80 and
                    p.replace("-","").replace("_","").replace("[","").replace("]","").replace(".","").replace("~","").replace(">=","").replace("<=","").replace("==","").isalnum()]
            if not safe: self._json({"error": "No valid package names"}, 400); return
            try:
                r = subprocess.run([sys.executable, "-m", "pip", "install"] + safe,
                                   capture_output=True, text=True, timeout=180)
                self._json({"status": "ok" if r.returncode == 0 else "error",
                            "output": (r.stdout + r.stderr).strip()[-3000:],
                            "installed": safe if r.returncode == 0 else []})
            except Exception as e: self._json({"error": str(e)}, 500)

        elif path == "/api/requirements/install":
            if not self._authed(body): self._json({"error": "Unauthorized"}, 401); return
            ok = _auto_install(verbose=False)
            scan = _scan_requirements(verbose=False)
            self._json({"status": "ok" if ok else "partial", "packages": scan,
                        "allOk": all(r["status"] == "OK" for r in scan)})

        elif path == "/api/kill_interference":
            if not self._authed(body): self._json({"error": "Unauthorized"}, 401); return
            target_port = body.get("port"); target_pid = body.get("pid")
            report = {"killed": [], "errors": [], "action": "none"}
            if target_pid:
                try:
                    if IS_WINDOWS: subprocess.run(["taskkill","/F","/PID",str(target_pid)], capture_output=True, timeout=5)
                    else: os.kill(int(target_pid), signal.SIGTERM)
                    report["killed"].append(f"PID {target_pid}"); report["action"] = "pid_killed"
                except Exception as e: report["errors"].append(str(e))
            elif target_port:
                killed = _kill_process_on_port(int(target_port))
                report["killed"] = [f"PID {p['pid']} ({p['name']}) on port {target_port}" for p in killed]
                report["action"] = "port_cleared"
            else:
                report = _kill_interference(); report["action"] = "full_cleanup"
            self._json({"status": "ok", "report": report})

        elif path == "/api/ollama/pull":
            if not self._authed(body): self._json({"error": "Unauthorized"}, 401); return
            model = (body.get("model") or "").strip()
            if not model: self._json({"error": "model required"}, 400); return
            try:
                subprocess.Popen(["ollama", "pull", model], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                self._json({"ok": True, "message": f"Pull started for {model} in background"})
            except Exception as e: self._json({"ok": False, "error": str(e)})

        elif path == "/api/reset_pair":
            nc = _gen_code()
            _ss("locked_device", None); _ss("pairing_code", nc); _ss("paired_at", None)
            print(f"  [AUTH] Pair reset. New code: {nc}")
            self._json({"status": "ok", "newCode": nc})

        else:
            self._json({"error": "endpoint not found", "available": [
                "GET /api/status", "GET /api/metrics", "GET /api/requirements",
                "GET /api/processes", "POST /api/execute", "POST /api/butler/chat",
                "POST /api/receive_file", "POST /api/kill_interference",
                "POST /api/requirements/install", "POST /pair", "POST /reconnect"
            ]}, 404)

# ===== HELPERS =====
def _gen_code():
    return "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", k=8))

def _register_startup():
    if not IS_WINDOWS:
        print("  [STARTUP] Only supported on Windows"); return
    try:
        import winreg
        key = winreg.HKEY_CURRENT_USER; path = r"Software\\Microsoft\\Windows\\CurrentVersion\\Run"
        val = f'"{sys.executable}" "{os.path.abspath(sys.argv[0])}"'
        with winreg.OpenKey(key, path, 0, winreg.KEY_WRITE) as rk:
            winreg.SetValueEx(rk, "CyberButlerServerV7", 0, winreg.REG_SZ, val)
        print("  [STARTUP] Registered as Windows startup program")
    except Exception as e: print(f"  [STARTUP] Failed: {e}")

# ===== MAIN =====
def main():
    global _start_time; _start_time = time.time()
    parser = argparse.ArgumentParser(description="Cyber-Botler Desktop Server v7.0")
    parser.add_argument("--port", type=int, default=None)
    parser.add_argument("--no-qr", action="store_true")
    parser.add_argument("--reset-pair", action="store_true")
    parser.add_argument("--no-admin", action="store_true")
    parser.add_argument("--no-firewall", action="store_true")
    parser.add_argument("--startup", action="store_true")
    parser.add_argument("--scan-req", action="store_true")
    parser.add_argument("--kill-port", type=int, default=None)
    args = parser.parse_args()

    if args.startup: _register_startup(); return
    if args.reset_pair:
        nc = _gen_code(); _ss("locked_device", None); _ss("pairing_code", nc); _ss("paired_at", None)
        print(f"\\n  RESET COMPLETE. New code: {nc}\\n  Restart to show new QR.\\n"); return
    if args.scan_req:
        print("\\n  === REQUIREMENTS SCAN ===")
        scan = _scan_requirements(verbose=True)
        missing = [r for r in scan if r["status"] == "MISSING"]
        print(f"\\n  {len(scan)-len(missing)}/{len(scan)} packages OK")
        if missing: print(f"  Fix: pip install {' '.join(r['pip'] for r in missing)}")
        print(); return
    if args.kill_port:
        print(f"\\n  Killing processes on port {args.kill_port}...")
        killed = _kill_process_on_port(args.kill_port, force=True)
        for k in killed: print(f"  Killed PID {k['pid']} ({k['name']})")
        if not killed: print(f"  No process found on port {args.kill_port}")
        return

    _kill_old_instances()
    if not _gs("pairing_code"): _ss("pairing_code", _gen_code())
    saved_port = _gs("server_port")
    prefer = args.port or (int(saved_port) if saved_port else None)
    port = _free_port(prefer); _ss("server_port", port)
    ip = get_ip(); all_ips = get_all_ips(); code = _gs("pairing_code"); locked = _gs("locked_device")
    ol_ok = _ol_ok(); model = _ol_model() if ol_ok else ""
    _fw(port, enabled=not args.no_firewall)

    print(f"\\n  CYBER-BOTLER v{VERSION}  IP={ip}  Port={port}  Code={code}")
    print(f"  Ollama: {'ONLINE - '+model if ol_ok else 'OFFLINE - get from https://ollama.ai'}")
    print(f"  Device: {'LOCKED to '+locked[:24]+'...' if locked else 'OPEN - scan QR to pair'}\\n")

    if not args.no_qr: _qr(ip, port)
    threading.Thread(target=_beacon, args=(ip, port), daemon=True).start()
    print(f"  HTTP: http://{ip}:{port}   Beacon: :{BEACON_PORT}   Ctrl+C to stop\\n")

    try:
        httpd = HTTPServer(("0.0.0.0", port), H); httpd.serve_forever()
    except PermissionError:
        print(f"\\n  ERROR: Cannot bind port {port} - run as Administrator")
    except OSError as e:
        if "10048" in str(e) or "Address already in use" in str(e):
            print(f"\\n  Port {port} in use. Killing blocker...")
            _kill_process_on_port(port, force=True); time.sleep(1)
            try:
                httpd = HTTPServer(("0.0.0.0", port), H); httpd.serve_forever()
            except:
                new_port = _free_port(port + 1)
                print(f"  Trying port {new_port}...")
                httpd = HTTPServer(("0.0.0.0", new_port), H); httpd.serve_forever()
        else: print(f"\\n  ERROR: {e}")
    except KeyboardInterrupt: print("\\n\\n  Server stopped. Goodbye!")

if __name__ == "__main__":
    main()
`;

const REQUIREMENTS_TXT = `# CYBER-BOTLER Server v7.0 Requirements
# Run: pip install -r requirements.txt

psutil>=5.9.0
qrcode[pil]>=7.4.0
pillow>=10.0.0
requests>=2.31.0

# Ollama AI - install separately:
# 1. Download from https://ollama.ai/download
# 2. Run: ollama pull qwen2.5-coder:7b
`;

const INSTALL_PY = `#!/usr/bin/env python3
"""CYBER-BOTLER One-Click Installer v7.0
Run: python install.py
"""
import subprocess, sys, shutil, platform

pkgs = ["psutil", "qrcode[pil]", "pillow", "requests"]

print("\\n  CYBER-BOTLER Installer v7.0")
print("  " + "=" * 38)
failed = []
for pkg in pkgs:
    print(f"  Installing {pkg}...", end=" ", flush=True)
    r = subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", pkg], capture_output=True, text=True)
    if r.returncode == 0: print("OK")
    else: print("FAILED"); failed.append(pkg)

print("\\n  Done!")
if failed:
    print(f"  Failed: {', '.join(failed)}")
    print("  Try manually: pip install " + " ".join(failed))
else:
    print("  All packages installed.")

if shutil.which("ollama"): print("  Ollama: FOUND")
else:
    print("  Ollama: NOT FOUND")
    print("  Install from: https://ollama.ai/download")
    print("  Then run: ollama pull qwen2.5-coder:7b")

print("\\n  Run: python butler_server.py")
print("  Scan the QR code in the Cyber-Botler app.\\n")
`;

const WIN_PS1 = `# CYBER-BOTLER Windows Setup v7.0
# Right-click -> Run with PowerShell as Administrator
Write-Host ""
Write-Host "============================================" -ForegroundColor DarkRed
Write-Host "  CYBER-BOTLER Windows Installer v7.0" -ForegroundColor Red
Write-Host "============================================" -ForegroundColor DarkRed
Write-Host ""
Write-Host "Installing Python packages..." -ForegroundColor Yellow
pip install psutil "qrcode[pil]" pillow requests
Write-Host ""
Write-Host "Checking Ollama..." -ForegroundColor Yellow
if (Get-Command ollama -ErrorAction SilentlyContinue) {
    Write-Host "  Ollama: FOUND" -ForegroundColor Green
} else {
    Write-Host "  Ollama: NOT FOUND" -ForegroundColor Red
    Write-Host "  Download from: https://ollama.ai/download" -ForegroundColor Yellow
    Write-Host "  After install run: ollama pull qwen2.5-coder:7b" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "============================================" -ForegroundColor DarkRed
Write-Host "  Run: python butler_server.py" -ForegroundColor Green
Write-Host "  Scan the QR code in the Botler app." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor DarkRed
Write-Host ""
Read-Host "Press Enter to exit"
`;

const MAC_SH = `#!/bin/bash
# CYBER-BOTLER Mac/Linux Setup v7.0
echo ""
echo "============================================"
echo "  CYBER-BOTLER Mac/Linux Installer v7.0"
echo "============================================"
echo ""
echo "Installing Python packages..."
pip3 install psutil "qrcode[pil]" pillow requests
echo ""
echo "Checking Ollama..."
if command -v ollama &> /dev/null; then
    echo "  Ollama: FOUND"
else
    echo "  Ollama: NOT FOUND"
    echo "  Download from: https://ollama.ai/download"
    echo "  After install run: ollama pull qwen2.5-coder:7b"
fi
echo ""
echo "============================================"
echo "  Run: python3 butler_server.py"
echo "  Scan the QR code in the Botler app."
echo "============================================"
echo ""
`;

// ── Animated Download Button ─────────────────────────────────────
interface ButtonConfig {
  id:      string;
  icon:    string;
  label:   string;
  sub:     string;
  tag:     string;
  color:   string;
  badge?:  string;
  onPress: () => Promise<void>;
}

function TermBtnItem({ btn, isLoading, onPress }: { btn: ButtonConfig; isLoading: boolean; onPress: () => void }) {
  const glowAnim  = useRef(new Animated.Value(0.5)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 1400, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0.3, duration: 1400, useNativeDriver: false }),
    ])).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: false }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: false }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[bs.btn, { borderColor: isLoading ? btn.color + 'BB' : btn.color + '60' }, isLoading && { opacity: 0.65 }]}
        onPress={handlePress}
        disabled={isLoading}
        activeOpacity={0.82}
      >
        <View style={[bs.corner, { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2, borderColor: btn.color }]} />
        <View style={[bs.corner, { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2, borderColor: btn.color }]} />
        <Animated.View style={[bs.iconBox, { borderColor: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [btn.color + '40', btn.color + 'BB'] }), backgroundColor: btn.color + '15' }]}>
          {isLoading
            ? <ActivityIndicator size="small" color={btn.color} style={{ transform: [{ scale: 0.75 }] }} />
            : <MaterialIcons name={btn.icon as any} size={16} color={btn.color} />}
        </Animated.View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Animated.Text style={[bs.label, { color: btn.color, opacity: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.7, 1] }) }]}>
              {btn.label}
            </Animated.Text>
            {btn.badge ? (
              <View style={[bs.badge, { borderColor: C.green + '70', backgroundColor: C.green + '18' }]}>
                <Text style={[bs.badgeTxt, { color: C.green }]}>{btn.badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={bs.sub}>{btn.sub}</Text>
        </View>
        <View style={[bs.tag, { borderColor: btn.color + '60', backgroundColor: btn.color + '18' }]}>
          <View style={[bs.tagDot, { backgroundColor: btn.color }]} />
          <Text style={[bs.tagTxt, { color: btn.color }]}>{btn.tag}</Text>
        </View>
        <Animated.View pointerEvents="none" style={[bs.glowBorder, {
          borderColor: btn.color,
          opacity: glowAnim.interpolate({ inputRange: [0.3, 1], outputRange: [0.04, 0.2] }),
        }]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

interface Props {
  accentColor?: string;
}

export default function DownloadButtons({ accentColor = C.amber }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const headerGlow = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(headerGlow, { toValue: 1,   duration: 1200, useNativeDriver: false }),
      Animated.timing(headerGlow, { toValue: 0.3, duration: 1200, useNativeDriver: false }),
    ])).start();
  }, []);

  const dl = async (id: string, fn: () => Promise<void>) => {
    if (loadingId) return;
    haptics.medium();
    setLoadingId(id);
    try { await fn(); } catch (e: any) { Alert.alert('Share Failed', e?.message || 'Could not share file'); }
    finally { setLoadingId(null); }
  };

  const openMainDownload = async () => {
    haptics.medium();
    try {
      await Linking.openURL(MAIN_DOWNLOAD_URL);
    } catch (e: any) {
      Alert.alert('Open Failed', 'Could not open download link. Visit: github.com/AndroidNewWatchAll/PlaystoreOpenSourcre');
    }
  };

  const sendToEmail = async () => {
    haptics.medium();
    const subject = encodeURIComponent('Butler AI PC Server — Setup Package');
    const body = encodeURIComponent(
`Butler AI: PC Automation — Server Setup
========================================

STEP 1 — Download the all-in-one package:
${MAIN_DOWNLOAD_URL}

STEP 2 — Extract the ZIP anywhere on your PC

STEP 3 — Double-click INSTALL_REQUIREMENTS.bat
  • Auto-detects Python & Ollama — skips if already installed
  • Downloads and installs everything silently (no prompts)
  • Works on Windows 10/11

STEP 4 — Double-click butler_server.py
  • Server starts automatically
  • QR code appears on screen

STEP 5 — Scan QR in Butler AI app
  • Home tab → tap SCAN QR
  • Paired instantly — HMAC-encrypted session
  • App reconnects automatically every time

----------------------------------------
What you get:
  - Full Python script execution from your phone
  - Local Ollama AI (Qwen 2.5 Coder) — 100% private
  - Script library with save/import/export
  - Real-time PC metrics (CPU, RAM, disk)
  - File transfer phone ↔ PC
  - Zero cloud — everything runs on YOUR machine
----------------------------------------
Butler AI: PC Automation
com.butlerai.pc.automation`
    );
    try {
      await Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
    } catch {
      Alert.alert('Email Failed', 'Could not open email app. Copy the download link manually.');
    }
  };

  const buttons: ButtonConfig[] = [
    {
      id:    'server_py',
      icon:  'terminal',
      label: 'butler_server.py',
      sub:   'v7.0 Auto-admin · process guardian · requirements scan · butler/chat · kill_interference',
      tag:   'v7.0',
      badge: 'LATEST',
      color: '#FF8800',
      onPress: () => shareTextFile('butler_server.py', SERVER_PY, 'text/x-python'),
    },
    {
      id:    'requirements',
      icon:  'list-alt',
      label: 'requirements.txt',
      sub:   'psutil · qrcode · pillow · requests — pip install -r requirements.txt',
      tag:   'PIP',
      color: C.cyan,
      onPress: () => shareTextFile('requirements.txt', REQUIREMENTS_TXT),
    },
    {
      id:    'install_py',
      icon:  'download',
      label: 'install.py',
      sub:   'One-click installer — python install.py — checks everything',
      tag:   'INSTALLER',
      color: C.green,
      onPress: () => shareTextFile('install.py', INSTALL_PY, 'text/x-python'),
    },
    {
      id:    'win_ps1',
      icon:  'computer',
      label: 'boter_setup.ps1',
      sub:   'Windows PowerShell · right-click → Run as Administrator',
      tag:   'WINDOWS',
      color: '#00A8FF',
      onPress: () => shareTextFile('boter_setup.ps1', WIN_PS1, 'application/octet-stream'),
    },
    {
      id:    'mac_sh',
      icon:  'laptop-mac',
      label: 'boter_setup.sh',
      sub:   'Mac / Linux bash · chmod +x boter_setup.sh && ./boter_setup.sh',
      tag:   'MAC/LINUX',
      color: '#FF4400',
      onPress: () => shareTextFile('boter_setup.sh', MAC_SH, 'text/x-sh'),
    },
  ];

  return (
    <View style={bs.wrap}>
      {/* ══ MAIN DOWNLOAD — Primary hero button ══ */}
      <View style={bs.hdr}>
        <View style={bs.hdrLine} />
        <Animated.View style={[bs.hdrBox, { borderColor: headerGlow.interpolate({ inputRange:[0.3,1], outputRange:[C.amber+'50', C.amber+'CC'] }) }]}>
          <Animated.View style={[bs.hdrDot, { backgroundColor: C.amber, opacity: headerGlow }]} />
          <Text style={bs.hdrTxt}>{'[ SERVER PACKAGE · v7.0 ]'}</Text>
          <Animated.View style={[bs.hdrDot, { backgroundColor: C.redBrt, opacity: headerGlow }]} />
        </Animated.View>
        <View style={bs.hdrLine} />
      </View>

      {/* Hero download card */}
      <TouchableOpacity style={bs.heroDl} onPress={openMainDownload} activeOpacity={0.82}>
        {/* Corner brackets */}
        <View style={[bs.corner, { top:-1, left:-1, borderTopWidth:2.5, borderLeftWidth:2.5, borderColor:C.amber }]} />
        <View style={[bs.corner, { top:-1, right:-1, borderTopWidth:2.5, borderRightWidth:2.5, borderColor:C.amber }]} />
        <View style={[bs.corner, { bottom:-1, left:-1, borderBottomWidth:2.5, borderLeftWidth:2.5, borderColor:C.amber }]} />
        <View style={[bs.corner, { bottom:-1, right:-1, borderBottomWidth:2.5, borderRightWidth:2.5, borderColor:C.amber }]} />
        {/* Icon */}
        <Animated.View style={[bs.heroIconBox, {
          borderColor: headerGlow.interpolate({ inputRange:[0.3,1], outputRange:[C.amber+'55', C.amber+'FF'] }),
          ...Platform.select({ ios:{ shadowColor:C.amber, shadowOpacity:0.7, shadowRadius:10, shadowOffset:{width:0,height:0} }, android:{} }),
        }]}>
          <MaterialCommunityIcons name="package-down" size={28} color={C.amber} />
        </Animated.View>
        {/* Labels */}
        <View style={{ flex:1, gap:4 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Animated.Text style={[bs.heroTitle, {
              color: C.amber,
              opacity: headerGlow.interpolate({ inputRange:[0.3,1], outputRange:[0.75,1] }),
              ...Platform.select({ ios:{ textShadowColor:C.amber, textShadowOffset:{width:0,height:0}, textShadowRadius:10 }, android:{} }),
            }]}>DOWNLOAD SERVER</Animated.Text>
            <View style={bs.heroBadge}>
              <Text style={bs.heroBadgeTxt}>v7.0</Text>
            </View>
            <View style={[bs.heroBadge, { borderColor: C.green+'70', backgroundColor:C.green+'18' }]}>
              <Text style={[bs.heroBadgeTxt, { color:C.green }]}>ALL-IN-ONE</Text>
            </View>
          </View>
          <Text style={bs.heroFilename}>{MAIN_DOWNLOAD_LABEL}</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:4, marginTop:2 }}>
            {['AUTO-INSTALL','ENCRYPTED','SELF-HOSTED','QR PAIR','PROCESS GUARDIAN',
              'UDP BEACON','HMAC AUTH','OLLAMA AI','FILE TRANSFER','INSTALLERS INCLUDED'].map(tag => (
              <View key={tag} style={bs.heroTag}>
                <View style={[bs.heroTagDot, { backgroundColor:C.amber }]} />
                <Text style={bs.heroTagTxt}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
        <MaterialIcons name="open-in-new" size={18} color={C.amber+'99'} />
      </TouchableOpacity>

      {/* ── EMAIL TO PC — Send setup to yourself ── */}
      <TouchableOpacity style={bs.emailCard} onPress={sendToEmail} activeOpacity={0.82}>
        {/* HUD corners */}
        <View style={[bs.corner, { top:-1, left:-1, borderTopWidth:2, borderLeftWidth:2, borderColor:'#FF44AA' }]} />
        <View style={[bs.corner, { bottom:-1, right:-1, borderBottomWidth:2, borderRightWidth:2, borderColor:'#FF44AA' }]} />
        <View style={[bs.emailIconBox]}>
          <MaterialIcons name="email" size={22} color="#FF44AA" />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Text style={[bs.emailTitle]}>SEND TO YOUR EMAIL</Text>
            <View style={[bs.heroBadge, { borderColor:'#FF44AA60', backgroundColor:'#FF44AA15' }]}>
              <Text style={[bs.heroBadgeTxt, { color:'#FF44AA' }]}>FASTEST</Text>
            </View>
          </View>
          <Text style={bs.emailSub}>{'Opens your email app · Pre-filled with download link + full setup guide · Open on PC → click → extract → run'}</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:4, marginTop:2 }}>
            {['1-CLICK SETUP','PRE-FILLED','FULL GUIDE','NO COPY-PASTE'].map(tag => (
              <View key={tag} style={[bs.heroTag, { borderColor:'#FF44AA30', backgroundColor:'#FF44AA08' }]}>
                <View style={[bs.heroTagDot, { backgroundColor:'#FF44AA' }]} />
                <Text style={[bs.heroTagTxt, { color:'#FF44AACC' }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
        <MaterialIcons name="send" size={16} color="#FF44AA99" />
      </TouchableOpacity>

      {/* Steps */}
      <View style={bs.stepsBox}>
        {[
          { n:'1', t:'Download ZIP above → Unzip anywhere on your PC' },
          { n:'2', t:'Double-click INSTALL_REQUIREMENTS.bat (Windows) — auto-installs Python + Ollama + all deps, skips what is already installed' },
          { n:'3', t:'Double-click butler_server.py — everything starts automatically, QR appears on screen' },
          { n:'4', t:'Scan QR in app → Home tab → paired & connected instantly' },
        ].map(({ n, t }) => (
          <View key={n} style={bs.stepRow}>
            <View style={bs.stepNum}><Text style={bs.stepNumTxt}>{n}</Text></View>
            <Text style={bs.stepTxt}>{t}</Text>
          </View>
        ))}
      </View>

      {/* Feature grid */}
      <View style={bs.featureGrid}>
        {[
          { icon:'security',      label:'Encrypted',      col:'#00CCDD' },
          { icon:'cloud-off',     label:'No Cloud',       col:C.green },
          { icon:'store',         label:'Not on Store',   col:C.amber },
          { icon:'admin-panel-settings', label:'Auto Admin', col:C.redBrt },
          { icon:'settings-suggest', label:'Auto Install', col:'#9B59B6' },
          { icon:'qr-code-scanner',  label:'QR Pair',     col:'#00CCDD' },
        ].map(({ icon, label, col }) => (
          <View key={label} style={[bs.featureChip, { borderColor:col+'40', backgroundColor:col+'0F' }]}>
            <MaterialIcons name={icon as any} size={12} color={col} />
            <Text style={[bs.featureChipTxt, { color:col }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Auto-installer quick links */}
      <View style={[bs.hdr, { marginTop: 6 }]}>
        <View style={bs.hdrLine} />
        <View style={[bs.hdrBox, { borderColor: C.green + '60', backgroundColor: C.green + '08' }]}>
          <View style={[bs.hdrDot, { backgroundColor: C.green }]} />
          <Text style={[bs.hdrTxt, { color: C.green }]}>[ ONE-CLICK AUTO-INSTALLER ]</Text>
          <View style={[bs.hdrDot, { backgroundColor: C.green }]} />
        </View>
        <View style={bs.hdrLine} />
      </View>

      {/* BAT installer card */}
      <TouchableOpacity
        style={[bs.installerCard, { borderColor: '#00A8FF60', backgroundColor: '#00A8FF08' }]}
        onPress={() => { haptics.medium(); Linking.openURL('https://github.com/AndroidNewWatchAll/PlaystoreOpenSourcre/blob/main/INSTALL_REQUIREMENTS.bat').catch(() => {}); }}
        activeOpacity={0.8}
      >
        <View style={[bs.installerIconBox, { borderColor: '#00A8FF80', backgroundColor: '#00A8FF18' }]}>
          <MaterialIcons name="computer" size={22} color="#00A8FF" />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[bs.installerTitle, { color: '#00A8FF' }]}>INSTALL_REQUIREMENTS.bat</Text>
            <View style={[bs.heroBadge, { borderColor: '#00A8FF60' }]}><Text style={[bs.heroBadgeTxt, { color: '#00A8FF' }]}>WINDOWS</Text></View>
          </View>
          <Text style={bs.installerSub}>{'Double-click → auto-detects & installs Python + Ollama + all deps · Skips what is already installed · Zero prompts'}</Text>
        </View>
        <MaterialIcons name="open-in-new" size={16} color="#00A8FF60" />
      </TouchableOpacity>

      {/* PS1 installer card */}
      <TouchableOpacity
        style={[bs.installerCard, { borderColor: '#9B59B660', backgroundColor: '#9B59B608' }]}
        onPress={() => { haptics.medium(); Linking.openURL('https://github.com/AndroidNewWatchAll/PlaystoreOpenSourcre/blob/main/INSTALL_REQUIREMENTS.ps1').catch(() => {}); }}
        activeOpacity={0.8}
      >
        <View style={[bs.installerIconBox, { borderColor: '#9B59B680', backgroundColor: '#9B59B618' }]}>
          <MaterialCommunityIcons name="powershell" size={22} color="#9B59B6" />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[bs.installerTitle, { color: '#9B59B6' }]}>INSTALL_REQUIREMENTS.ps1</Text>
            <View style={[bs.heroBadge, { borderColor: '#9B59B660' }]}><Text style={[bs.heroBadgeTxt, { color: '#9B59B6' }]}>POWERSHELL</Text></View>
          </View>
          <Text style={bs.installerSub}>{'Right-click → Run with PowerShell · Same auto-detect logic · Preferred for corporate/IT environments'}</Text>
        </View>
        <MaterialIcons name="open-in-new" size={16} color="#9B59B660" />
      </TouchableOpacity>

      <View style={[bs.autoNote, { borderColor: C.green + '40', backgroundColor: C.green + '08' }]}>
        <MaterialIcons name="auto-fix-high" size={12} color={C.green} />
        <Text style={[bs.noteTxt, { color: C.green + 'CC' }]}>
          {'Both scripts check if Python & Ollama are already installed — skips if yes, downloads silently if no. No questions, no account, no manual steps.'}
        </Text>
      </View>

      {/* Divider — individual files */}
      <View style={[bs.hdr, { marginTop:6 }]}>
        <View style={bs.hdrLine} />
        <View style={[bs.hdrBox, { borderColor:C.cyan+'50', backgroundColor:'transparent' }]}>
          <Text style={[bs.hdrTxt, { color:C.cyan }]}>[ INDIVIDUAL FILES · INCLUDED IN ZIP ]</Text>
        </View>
        <View style={bs.hdrLine} />
      </View>

      <View style={bs.versionRow}>
        <MaterialIcons name="info-outline" size={11} color={C.cyan} />
        <Text style={[bs.versionTxt, { color:C.cyan+'BB' }]}>All files below are already inside the ZIP above. Share individually if needed.</Text>
      </View>

      {buttons.map(btn => (
        <TermBtnItem
          key={btn.id}
          btn={btn}
          isLoading={loadingId === btn.id}
          onPress={() => dl(btn.id, btn.onPress)}
        />
      ))}

      <View style={bs.noteBox}>
        <View style={[bs.corner, { top:-1, left:-1, borderTopWidth:1.5, borderLeftWidth:1.5, borderColor:C.amber }]} />
        <View style={[bs.corner, { bottom:-1, right:-1, borderBottomWidth:1.5, borderRightWidth:1.5, borderColor:C.amber }]} />
        <MaterialIcons name="info" size={11} color={C.amber} />
        <Text style={bs.noteTxt}>
          {'Build APK \u2014 the live preview is HTTPS and blocks local HTTP connections. The APK connects directly to your server with no restrictions.'}
        </Text>
      </View>
    </View>
  );
}

const bs = StyleSheet.create({
  wrap:     { gap: 7, marginHorizontal: 10, marginBottom: 12 },
  // Hero download card
  heroDl: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0D0500', borderWidth: 2, borderColor: C.amber + '70',
    borderRadius: 0, padding: 16, position: 'relative', overflow: 'hidden',
    ...Platform.select({ ios:{ shadowColor:C.amber, shadowOffset:{width:0,height:3}, shadowOpacity:0.4, shadowRadius:16 }, android:{elevation:8} }),
  },
  heroIconBox: {
    width: 54, height: 54, borderWidth: 2, borderRadius: 0,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    backgroundColor: C.amber + '14',
  },
  heroTitle: {
    fontSize: 16, fontWeight: '900', fontFamily: MONO, letterSpacing: 2,
  },
  heroFilename: {
    fontSize: 9, color: C.textBrt, fontFamily: MONO, letterSpacing: 0.5,
  },
  heroBadge: {
    borderWidth: 1, borderColor: C.amber + '70', borderRadius: 3,
    backgroundColor: C.amber + '18', paddingHorizontal: 6, paddingVertical: 2,
  },
  heroBadgeTxt: { fontSize: 7, fontWeight: '900', fontFamily: MONO, color: C.amber, letterSpacing: 1 },
  heroTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: C.amber + '35',
    backgroundColor: C.amber + '0A', borderRadius: 2,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  heroTagDot: { width: 3, height: 3, borderRadius: 2 },
  heroTagTxt: { fontSize: 6, color: C.amber + 'CC', fontFamily: MONO, letterSpacing: 0.5 },
  // Feature chips
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 2 },
  featureChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 5,
  },
  featureChipTxt: { fontSize: 9, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.3 },
  hdr:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  hdrLine:  { flex: 1, height: 1, backgroundColor: C.amber + '35' },
  hdrBox:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: C.amberDim },
  hdrDot:   { width: 5, height: 5, borderRadius: 3, flexShrink: 0 },
  hdrTxt:   { fontSize: 8, fontWeight: '900', color: C.amber, fontFamily: MONO, letterSpacing: 1.5 },
  versionRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4, paddingHorizontal: 2 },
  versionTxt: { fontSize: 8, color: C.green, fontFamily: MONO, flex: 1 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.card, borderRadius: 0, borderWidth: 1.5,
    paddingHorizontal: 12, paddingVertical: 11,
    position: 'relative', overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#FF8800', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 8 }, android: { elevation: 3 } }),
  },
  corner:     { position: 'absolute', width: 9, height: 9, zIndex: 5 },
  iconBox:    { width: 38, height: 38, borderWidth: 1.5, borderRadius: 0, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  label:      { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  sub:        { fontSize: 8, color: C.text, fontFamily: MONO, marginTop: 2, lineHeight: 12 },
  tag:        { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 0, paddingHorizontal: 6, paddingVertical: 3, flexShrink: 0 },
  tagDot:     { width: 4, height: 4, borderRadius: 2 },
  tagTxt:     { fontSize: 6.5, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },
  badge:      { borderWidth: 1, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  badgeTxt:   { fontSize: 6, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },
  glowBorder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 1 },
  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: C.amberDim + 'CC', borderRadius: 0, padding: 9,
    borderWidth: 1.5, borderColor: C.amber + '40',
    position: 'relative', overflow: 'hidden', marginTop: 2,
  },
  noteTxt:   { flex: 1, fontSize: 8, color: C.textBrt, fontFamily: MONO, lineHeight: 13 },
  installerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 0, padding: 13,
    marginBottom: 6, position: 'relative',
    ...Platform.select({ ios:{ shadowColor:'#00FF88', shadowOffset:{width:0,height:1}, shadowOpacity:0.2, shadowRadius:6 }, android:{elevation:3} }),
  },
  installerIconBox: { width: 44, height: 44, borderWidth: 1.5, borderRadius: 0, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  installerTitle: { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  installerSub: { fontSize: 8, color: C.text, fontFamily: MONO, lineHeight: 12 },
  autoNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, borderWidth: 1, borderRadius: 0, padding: 9, marginBottom: 6, position: 'relative', overflow: 'hidden' },
  emailCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#120008', borderWidth: 1.5, borderColor: '#FF44AA55',
    borderRadius: 0, padding: 13, position: 'relative', overflow: 'hidden', marginTop: 4,
    ...Platform.select({ ios:{ shadowColor:'#FF44AA', shadowOffset:{width:0,height:2}, shadowOpacity:0.35, shadowRadius:10 }, android:{elevation:5} }),
  },
  emailIconBox: {
    width: 44, height: 44, borderWidth: 1.5, borderRadius: 0,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    borderColor: '#FF44AA80', backgroundColor: '#FF44AA18',
  },
  emailTitle: { fontSize: 12, fontWeight: '900', fontFamily: MONO, letterSpacing: 1, color: '#FF44AA' },
  emailSub:   { fontSize: 8, color: C.text, fontFamily: MONO, lineHeight: 12 },
  stepsBox:  { backgroundColor: C.redDim + 'AA', borderWidth: 1, borderColor: C.red + '40', padding: 10, gap: 6, marginTop: 2 },
  stepRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepNum:   { width: 18, height: 18, borderRadius: 0, backgroundColor: C.redBrt, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumTxt:{ fontSize: 9, fontWeight: '900', color: '#000', fontFamily: MONO },
  stepTxt:   { fontSize: 9, color: C.textBrt, fontFamily: MONO },
});
