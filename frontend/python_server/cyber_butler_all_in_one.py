#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║  CYBER-BOTLER  ·  All-In-One  v5.0                             ║
║  Single file.  Does everything.                                 ║
╠══════════════════════════════════════════════════════════════════╣
║  NORMAL USE:    python cyber_butler_all_in_one.py               ║
║  BUILD EXE:     python cyber_butler_all_in_one.py --build-exe   ║
║  RESET PAIR:    python cyber_butler_all_in_one.py --reset-pair  ║
╚══════════════════════════════════════════════════════════════════╝
"""

import argparse
import base64
import hashlib
import hmac
import json
import os
import platform
import socket
import subprocess
import sys
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

# ── Optional / graceful imports ───────────────────────────────────
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

try:
    import qrcode
    HAS_QR = True
except ImportError:
    HAS_QR = False

# ─────────────────────────────────────────────────────────────────
#  CONFIG
# ─────────────────────────────────────────────────────────────────
DEFAULT_PORT     = 8765
OLLAMA_URL       = "http://localhost:11434"
DEFAULT_MODEL    = "qwen2.5-coder:7b"
STATE_FILE       = Path.home() / ".butler_server_state.json"
SECRET_FILE      = Path.home() / ".butler_server_secret.bin"
MAX_BODY_BYTES   = 5 * 1024 * 1024
RATE_LIMIT_RPM   = 120
RATE_LIMIT_BURST = 20
EXEC_TIMEOUT_SEC = 60

# ─────────────────────────────────────────────────────────────────
#  HMAC SECRET
# ─────────────────────────────────────────────────────────────────
def _load_or_create_secret() -> bytes:
    if SECRET_FILE.exists():
        return SECRET_FILE.read_bytes()
    secret = os.urandom(32)
    SECRET_FILE.write_bytes(secret)
    SECRET_FILE.chmod(0o600)
    return secret

HMAC_SECRET = _load_or_create_secret()

def _sign_token(payload: str) -> str:
    return hmac.new(HMAC_SECRET, payload.encode(), hashlib.sha256).hexdigest()

def _make_token(device_id: str) -> str:
    ts  = int(time.time())
    raw = f"{device_id}:{ts}"
    sig = _sign_token(raw)
    return base64.urlsafe_b64encode(f"{raw}:{sig}".encode()).decode()

def _verify_token(token: str, device_id: str) -> bool:
    try:
        decoded   = base64.urlsafe_b64decode(token.encode()).decode()
        parts     = decoded.rsplit(":", 1)
        if len(parts) != 2:
            return False
        raw, sig  = parts[0], parts[1]
        if not hmac.compare_digest(sig, _sign_token(raw)):
            return False
        raw_parts = raw.split(":")
        ts        = int(raw_parts[-1])
        if time.time() - ts > 60 * 60 * 24 * 30:
            return False
        return raw_parts[0] == device_id
    except Exception:
        return False

# ─────────────────────────────────────────────────────────────────
#  PERSISTENT STATE
# ─────────────────────────────────────────────────────────────────
_state_lock   = threading.Lock()
_server_state = {}

def _load_state():
    global _server_state
    if STATE_FILE.exists():
        try:
            _server_state = json.loads(STATE_FILE.read_text())
            return
        except Exception:
            pass
    _server_state = {"pairing_code": None, "locked_device": None, "paired_at": None}

def _save_state(state: dict):
    STATE_FILE.write_text(json.dumps(state, indent=2))
    STATE_FILE.chmod(0o600)

_load_state()

def _get_state(key: str):
    with _state_lock:
        return _server_state.get(key)

def _set_state(key: str, value):
    with _state_lock:
        _server_state[key] = value
        _save_state(_server_state)

# ─────────────────────────────────────────────────────────────────
#  RATE LIMITER
# ─────────────────────────────────────────────────────────────────
_rate_counts: dict = {}
_rate_lock   = threading.Lock()

def _is_rate_limited(ip: str) -> bool:
    now = time.time()
    with _rate_lock:
        times  = _rate_counts.get(ip, [])
        times  = [t for t in times if now - t < 60]
        recent = [t for t in times if now - t < 5]
        if len(recent) >= RATE_LIMIT_BURST or len(times) >= RATE_LIMIT_RPM:
            _rate_counts[ip] = times
            return True
        times.append(now)
        _rate_counts[ip] = times
        return False

# ─────────────────────────────────────────────────────────────────
#  IP DETECTION
# ─────────────────────────────────────────────────────────────────
def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

# ─────────────────────────────────────────────────────────────────
#  UDP BEACON
# ─────────────────────────────────────────────────────────────────
BEACON_PORT = 8764

def _beacon_thread(local_ip: str, port: int):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    while True:
        try:
            payload = json.dumps({
                "type":        "butler_beacon",
                "ip":          local_ip,
                "port":        port,
                "pairingCode": _get_state("pairing_code") or "",
                "version":     "5.0.0",
                "locked":      bool(_get_state("locked_device")),
            }).encode()
            sock.sendto(payload, ("255.255.255.255", BEACON_PORT))
        except Exception:
            pass
        time.sleep(2)

# ─────────────────────────────────────────────────────────────────
#  OLLAMA HELPERS
# ─────────────────────────────────────────────────────────────────
def _ollama_online() -> bool:
    try:
        import urllib.request
        with urllib.request.urlopen(f"{OLLAMA_URL}/api/tags", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False

def _ollama_chat(message: str, system: str = "", model: str = DEFAULT_MODEL, history=None) -> str:
    try:
        import urllib.request, json as _json
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        for m in (history or []):
            messages.append(m)
        messages.append({"role": "user", "content": message})
        body = _json.dumps({"model": model, "messages": messages, "stream": False}).encode()
        req  = urllib.request.Request(
            f"{OLLAMA_URL}/api/chat", data=body,
            headers={"Content-Type": "application/json"}, method="POST"
        )
        with urllib.request.urlopen(req, timeout=120) as r:
            data = _json.loads(r.read())
        return data.get("message", {}).get("content", "No response.")
    except Exception as e:
        return f"[Ollama error] {e}"

def _ollama_active_model() -> str:
    try:
        import urllib.request, json as _json
        with urllib.request.urlopen(f"{OLLAMA_URL}/api/tags", timeout=2) as r:
            data   = _json.loads(r.read())
        models = data.get("models", [])
        return models[0]["name"] if models else ""
    except Exception:
        return ""

# ─────────────────────────────────────────────────────────────────
#  QR CODE
# ─────────────────────────────────────────────────────────────────
def _show_qr(local_ip: str, port: int):
    code    = _get_state("pairing_code") or ""
    payload = json.dumps({"ip": local_ip, "port": port, "pairingCode": code})
    print()
    if HAS_QR:
        try:
            qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=1, border=1)
            qr.add_data(payload)
            qr.make(fit=True)
            qr.print_ascii(invert=True)
            print()
            return
        except Exception:
            pass
    print(f"  Scan in the app  →  {payload}")
    print()

# ─────────────────────────────────────────────────────────────────
#  SYSTEM METRICS
# ─────────────────────────────────────────────────────────────────
def _get_metrics() -> dict:
    if not HAS_PSUTIL:
        return {"error": "pip install psutil"}
    try:
        cpu  = psutil.cpu_percent(interval=0.2)
        mem  = psutil.virtual_memory()
        disk = psutil.disk_usage(str(Path.home()))
        net  = psutil.net_io_counters()
        return {
            "cpu":    {"percent": cpu, "cores": psutil.cpu_count(logical=False)},
            "memory": {"total": mem.total, "used": mem.used, "percent": mem.percent},
            "disk":   {"total": disk.total, "used": disk.used, "free": disk.free, "percent": disk.percent},
            "network":{"bytes_sent": net.bytes_sent, "bytes_recv": net.bytes_recv},
            "uptime": int(time.time() - psutil.boot_time()),
        }
    except Exception as e:
        return {"error": str(e)}

# ─────────────────────────────────────────────────────────────────
#  REQUEST HANDLER
# ─────────────────────────────────────────────────────────────────
class Handler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        print(f"  [{time.strftime('%H:%M:%S')}] {self.client_address[0]}  {fmt % args}")

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers",
                         "Content-Type, Authorization, X-Fallback-Token, X-Device-Id")

    def _json(self, obj: dict, status: int = 200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type",   "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _check_rate(self) -> bool:
        if _is_rate_limited(self.client_address[0]):
            self._json({"error": "Rate limit exceeded."}, 429)
            return False
        return True

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length > MAX_BODY_BYTES:
            self._json({"error": "Request body too large"}, 413)
            return None
        if length == 0:
            return {}
        try:
            return json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            self._json({"error": "Invalid JSON body"}, 400)
            return None

    def _authed(self, body: dict) -> bool:
        locked_device = _get_state("locked_device")
        if not locked_device:
            return True
        auth_hdr = self.headers.get("Authorization", "")
        token    = ""
        if auth_hdr.startswith("Bearer "):
            token = auth_hdr[7:].strip()
        if not token:
            token = body.get("token", self.headers.get("X-Fallback-Token", ""))
        if not token:
            return False
        return _verify_token(token, locked_device)

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]

        if path == "/api/status":
            ok2  = _ollama_online()
            am   = _ollama_active_model() if ok2 else ""
            self._json({
                "status":      "online",
                "version":     "5.0.0",
                "os":          platform.system(),
                "server_time": int(time.time()),
                "ollama":      ok2,
                "ollamaModel": am,
                "locked":      bool(_get_state("locked_device")),
                "python":      platform.python_version(),
            })
            return

        if path == "/api/metrics":
            if not self._check_rate(): return
            self._json({"metrics": _get_metrics(), "timestamp": int(time.time())})
            return

        if path == "/api/handshake":
            self._json({"status": "SUCCESS", "version": "5.0.0"})
            return

        self._json({"error": "not found"}, 404)

    def do_POST(self):
        if not self._check_rate(): return
        path = self.path.split("?")[0]
        body = self._read_body()
        if body is None: return

        if path == "/pair":
            pc  = body.get("pairingCode", "")
            did = body.get("deviceId", "")
            sc  = _get_state("pairing_code")
            ld  = _get_state("locked_device")
            if not did:
                self._json({"error": "deviceId required"}, 400); return
            if ld and ld != did:
                self._json({"error": "Server locked to a different device. Run: python cyber_butler_all_in_one.py --reset-pair"}, 403); return
            if ld == did:
                self._json({"status": "ok", "sessionToken": _make_token(did), "reused": True}); return
            if sc and pc != sc:
                self._json({"error": "Invalid pairing code"}, 401); return
            _set_state("locked_device", did)
            _set_state("paired_at", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
            print(f"  [AUTH] Paired: {did[:20]}...")
            self._json({"status": "ok", "sessionToken": _make_token(did)})
            return

        if path == "/reconnect":
            did = body.get("deviceId", "")
            ld  = _get_state("locked_device")
            if not ld:
                if did: _set_state("locked_device", did)
                self._json({"status": "ok", "sessionToken": _make_token(did or "anon")}); return
            if did != ld:
                self._json({"error": "Device not authorised. Run --reset-pair on the PC."}, 403); return
            self._json({"status": "ok", "sessionToken": _make_token(did)})
            return

        if path == "/api/execute":
            if not self._authed(body):
                self._json({"error": "Unauthorized"}, 401); return
            script = body.get("script", "").strip()
            if not script:
                self._json({"error": "No script provided"}, 400); return
            try:
                result = subprocess.run(
                    [sys.executable, "-c", script],
                    capture_output=True, text=True, timeout=EXEC_TIMEOUT_SEC,
                )
                output = (result.stdout + result.stderr).strip() or "[No output]"
                self._json({"status": "ok", "output": output[:100_000]})
            except subprocess.TimeoutExpired:
                self._json({"error": f"Timeout ({EXEC_TIMEOUT_SEC}s)"}, 408)
            except Exception as e:
                self._json({"error": str(e)}, 500)
            return

        if path == "/api/butler/chat":
            if not self._authed(body):
                self._json({"error": "Unauthorized"}, 401); return
            message = body.get("message", "").strip()
            if not message:
                self._json({"error": "message required"}, 400); return
            if not _ollama_online():
                self._json({"error": "Ollama not running", "response": "Start with: ollama serve", "ollama": False}); return
            reply = _ollama_chat(message, body.get("systemPrompt", ""), body.get("model", DEFAULT_MODEL), body.get("conversation", []))
            self._json({"status": "ok", "response": reply, "ollama": True, "ollamaModel": body.get("model", DEFAULT_MODEL)})
            return

        if path == "/api/receive_file":
            if not self._authed(body):
                self._json({"error": "Unauthorized"}, 401); return
            fn  = body.get("filename", "upload.bin")
            b64 = body.get("data", "")
            if not b64:
                self._json({"error": "No data"}, 400); return
            try:
                raw  = base64.b64decode(b64)
                dest = Path.home() / "Desktop"
                dest.mkdir(exist_ok=True)
                (dest / fn).write_bytes(raw)
                self._json({"status": "ok", "message": f"Saved to {dest / fn}", "bytes": len(raw)})
            except Exception as e:
                self._json({"error": str(e)}, 500)
            return

        self._json({"error": "not found"}, 404)

# ─────────────────────────────────────────────────────────────────
#  EXE BUILDER  (--build-exe mode)
# ─────────────────────────────────────────────────────────────────
def build_exe_mode():
    import importlib, shutil

    def g(t): return f"\033[92m{t}\033[0m"
    def r(t): return f"\033[91m{t}\033[0m"
    def y(t): return f"\033[93m{t}\033[0m"
    def c(t): return f"\033[96m{t}\033[0m"
    def b(t): return f"\033[1m{t}\033[0m"
    def ok(m):   print(f"  {g('OK')}  {m}")
    def err(m):  print(f"  {r('ERR')} {m}")
    def info(m): print(f"  {c('...')} {m}")

    print("\n" + "="*60)
    print(b(c("  CYBER-BOTLER  EXE Builder  v5.0")))
    print("="*60 + "\n")

    # Python version check
    maj, minor = sys.version_info[:2]
    if maj < 3 or (maj == 3 and minor < 10):
        err(f"Python 3.10+ required (found {maj}.{minor})")
        sys.exit(1)
    ok(f"Python {maj}.{minor}")

    # Auto-install dependencies
    REQUIRED = {
        "psutil":       "psutil",
        "qrcode":       "qrcode[pil]",
        "PIL":          "pillow",
        "PyInstaller":  "pyinstaller",
    }
    for imp_name, pip_name in REQUIRED.items():
        try:
            importlib.import_module(imp_name)
            ok(f"{pip_name} installed")
        except ImportError:
            info(f"Installing {pip_name}...")
            res = subprocess.run(
                [sys.executable, "-m", "pip", "install", pip_name, "--quiet"],
                capture_output=True, text=True
            )
            if res.returncode == 0:
                ok(f"{pip_name} installed")
            else:
                err(f"Failed: {pip_name}\n{res.stderr[:200]}")
                sys.exit(1)

    here     = Path(__file__).parent
    this     = Path(__file__).resolve()
    exe_name = "CyberButler-Server"
    dist_dir = here / "dist"
    build_dir= here / "build_tmp"

    if dist_dir.exists():
        shutil.rmtree(dist_dir)

    cmd = [
        sys.executable, "-m", "PyInstaller",
        str(this),
        f"--name={exe_name}",
        "--onefile", "--console", "--clean", "--noconfirm",
        f"--distpath={dist_dir}",
        f"--workpath={build_dir}",
        f"--specpath={here}",
        "--hidden-import=psutil",
        "--hidden-import=qrcode",
        "--hidden-import=qrcode.image.pil",
        "--hidden-import=PIL",
        "--hidden-import=requests",
        "--hidden-import=urllib.request",
        "--hidden-import=http.server",
        "--hidden-import=threading",
        "--hidden-import=hashlib",
        "--hidden-import=hmac",
        "--hidden-import=json",
        "--hidden-import=socket",
        "--hidden-import=subprocess",
        "--exclude-module=tkinter",
        "--exclude-module=matplotlib",
        "--exclude-module=numpy",
        "--noupx",
    ]

    info("Running PyInstaller (30–90 seconds)...\n")
    t0     = time.time()
    result = subprocess.run(cmd, cwd=here)
    if result.returncode != 0:
        err("PyInstaller failed — check output above")
        sys.exit(1)

    suffix = ".exe" if sys.platform == "win32" else ""
    exe    = dist_dir / (exe_name + suffix)
    if not exe.exists():
        err(f"Output not found: {exe}")
        sys.exit(1)

    size  = exe.stat().st_size / 1024 / 1024
    spec  = here / f"{exe_name}.spec"
    if spec.exists():       spec.unlink()
    if build_dir.exists():  shutil.rmtree(build_dir)

    print("\n" + "="*60)
    print(b(g("  BUILD COMPLETE")))
    print(f"  File : {exe}")
    print(f"  Size : {size:.1f} MB  |  Built in {int(time.time()-t0)}s")
    print(f"  Run  : {'double-click' if sys.platform=='win32' else './' + exe_name}")
    print(f"  Reset: {exe_name}{suffix} --reset-pair")
    print("="*60 + "\n")

# ─────────────────────────────────────────────────────────────────
#  GENERATE PAIRING CODE
# ─────────────────────────────────────────────────────────────────
def _generate_pairing_code() -> str:
    import random
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choices(chars, k=8))

# ─────────────────────────────────────────────────────────────────
#  ENTRY POINT
# ─────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Cyber-Botler All-In-One v5.0")
    parser.add_argument("--port",       type=int,         default=DEFAULT_PORT)
    parser.add_argument("--no-qr",      action="store_true")
    parser.add_argument("--reset-pair", action="store_true")
    parser.add_argument("--build-exe",  action="store_true", help="Bundle this file into a standalone exe")
    args = parser.parse_args()

    # ── Build exe mode ───────────────────────────────────────────
    if args.build_exe:
        build_exe_mode()
        return

    # ── Reset pair ───────────────────────────────────────────────
    if args.reset_pair:
        code = _generate_pairing_code()
        _set_state("locked_device", None)
        _set_state("pairing_code",  code)
        _set_state("paired_at",     None)
        print(f"\n  PAIR RESET — new code: {code}")
        print("  Restart the server to broadcast the new QR code.\n")
        return

    # ── First run: generate pairing code ─────────────────────────
    if not _get_state("pairing_code"):
        _set_state("pairing_code", _generate_pairing_code())

    local_ip     = get_local_ip()
    port         = args.port
    pairing_code = _get_state("pairing_code")
    locked       = _get_state("locked_device")
    ollama_ok    = _ollama_online()
    W            = 62

    print()
    print("╔" + "═" * W + "╗")
    print("║" + " CYBER-BOTLER  All-In-One  v5.0 ".center(W) + "║")
    print("╠" + "═" * W + "╣")
    print(f"║  URL          : http://{local_ip}:{port:<{W-24-len(local_ip)}}║")
    print(f"║  Pairing Code : {pairing_code:<{W-16}}║")
    print(f"║  Locked To    : {(locked[:36]+'...' if locked else 'UNLOCKED — scan QR'):<{W-16}}║")
    print(f"║  Ollama AI    : {'ONLINE — '+_ollama_active_model() if ollama_ok else 'OFFLINE — run: ollama serve':<{W-16}}║")
    print(f"║  psutil       : {'installed' if HAS_PSUTIL else 'MISSING — pip install psutil':<{W-16}}║")
    print("╠" + "═" * W + "╣")
    print(f"║  Build EXE    : python cyber_butler_all_in_one.py --build-exe{'':<{W-59}}║")
    print(f"║  Reset pair   : python cyber_butler_all_in_one.py --reset-pair{'':<{W-60}}║")
    print("╚" + "═" * W + "╝")

    if not args.no_qr:
        _show_qr(local_ip, port)

    threading.Thread(target=_beacon_thread, args=(local_ip, port), daemon=True).start()
    print(f"  UDP beacon on port {BEACON_PORT}")
    print(f"  HTTP server on 0.0.0.0:{port}  — Ctrl+C to stop\n")

    try:
        HTTPServer(("0.0.0.0", port), Handler).serve_forever()
    except PermissionError:
        print(f"\n  Cannot bind to port {port} — try --port XXXX")
    except OSError:
        print(f"\n  Port {port} already in use — use --port XXXX")
    except KeyboardInterrupt:
        print("\n\n  Server stopped.")

if __name__ == "__main__":
    main()
