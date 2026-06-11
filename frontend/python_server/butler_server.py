#!/usr/bin/env python3
"""
Butler AI Server v7.0 — Local PC automation bridge
Run: python butler_server.py
Requires: pip install flask psutil qrcode pillow requests
"""
import os, sys, json, time, hmac, hashlib, base64, socket, threading, subprocess
from datetime import datetime
from pathlib import Path

try:
    from flask import Flask, request, jsonify, Response
except ImportError:
    print("Installing Flask...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "flask", "psutil", "qrcode", "pillow", "requests"])
    from flask import Flask, request, jsonify, Response

try:
    import psutil
except ImportError:
    psutil = None

try:
    import qrcode
except ImportError:
    qrcode = None

app = Flask(__name__)

# ── Config ──────────────────────────────────────────────────────
SECRET_FILE = Path.home() / ".butler_secret"
STATE_FILE  = Path.home() / ".butler_state.json"

def get_secret():
    if SECRET_FILE.exists(): return SECRET_FILE.read_text().strip()
    s = base64.b64encode(os.urandom(32)).decode()
    SECRET_FILE.write_text(s); return s

SECRET   = get_secret()
STATE    = {"deviceId": None, "lockedAt": None}
PORT     = 8766
HOST     = "0.0.0.0"

# Load state
if STATE_FILE.exists():
    try: STATE.update(json.loads(STATE_FILE.read_text()))
    except: pass

def save_state():
    STATE_FILE.write_text(json.dumps(STATE))

def make_token(device_id):
    ts  = str(int(time.time()))
    msg = f"{device_id}:{ts}".encode()
    sig = hmac.new(SECRET.encode(), msg, hashlib.sha256).hexdigest()
    raw = f"{device_id}:{ts}:{sig}".encode()
    return base64.urlsafe_b64encode(raw).decode()

def verify_token(token):
    try:
        raw   = base64.urlsafe_b64decode(token + "==").decode()
        parts = raw.split(":")
        if len(parts) < 3: return None
        device_id, ts, sig = parts[0], parts[1], ":".join(parts[2:])
        msg      = f"{device_id}:{ts}".encode()
        expected = hmac.new(SECRET.encode(), msg, hashlib.sha256).hexdigest()
        if hmac.compare_digest(sig, expected): return device_id
    except: pass
    return None

def cors(r):
    r.headers["Access-Control-Allow-Origin"]  = "*"
    r.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Fallback-Token"
    r.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return r

def get_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80)); ip = s.getsockname()[0]; s.close(); return ip
    except: return "127.0.0.1"

@app.after_request
def add_cors(r): return cors(r)

@app.route("/", defaults={"path": ""}, methods=["OPTIONS"])
@app.route("/<path:path>", methods=["OPTIONS"])
def opts(path): return cors(jsonify({"ok": True}))

# ── Auth middleware ─────────────────────────────────────────────
def auth_device():
    hdr = request.headers.get("Authorization", "")
    tok = hdr.replace("Bearer ", "").strip() if hdr.startswith("Bearer ") else ""
    if not tok:
        tok = request.headers.get("X-Fallback-Token", "").strip()
    if not tok and request.is_json:
        try: tok = request.get_json(silent=True, force=True).get("token", "")
        except: pass
    return verify_token(tok) if tok else None

# ── Health ───────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
@app.route("/api/status", methods=["GET"])
def health():
    cpu = psutil.cpu_percent(0.1) if psutil else 0
    ram = psutil.virtual_memory().percent if psutil else 0
    return jsonify({
        "status": "ok", "ts": int(time.time()), "version": "7.0.0",
        "locked": bool(STATE["deviceId"]), "pairingCode": "", "port": str(PORT),
        "cpu": cpu, "ram": ram, "memory": ram, "alertCount": 0,
    })

@app.route("/health/detailed", methods=["GET"])
@app.route("/api/health", methods=["GET"])
def health_detailed():
    return health()

@app.route("/api/pair/status", methods=["GET"])
def pair_status():
    return jsonify({"paired": bool(STATE["deviceId"]), "pairingCode": "", "pairingReady": True})

# ── Pair ─────────────────────────────────────────────────────────
@app.route("/pair", methods=["POST"])
def pair():
    d = request.get_json(force=True) or {}
    device_id = d.get("deviceId", "")
    if not device_id or len(device_id) < 5:
        return jsonify({"error": "deviceId required"}), 400
    if STATE["deviceId"] and STATE["deviceId"] != device_id:
        # Check if old device timed out (5 min)
        locked_at = STATE.get("lockedAt", 0) or 0
        if time.time() - locked_at < 300:
            return jsonify({"error": "Server is locked to a different device.", "locked": True, "canReset": True}), 403
    STATE["deviceId"] = device_id
    STATE["lockedAt"] = time.time()
    save_state()
    token = make_token(device_id)
    return jsonify({
        "status": "ok", "sessionToken": token,
        "message": "Paired! Server locked to your device.", "serverVersion": "7.0.0",
        "reused": False,
    })

@app.route("/reconnect", methods=["POST"])
def reconnect():
    return pair()

@app.route("/api/reset_pair", methods=["POST"])
def reset_pair():
    STATE["deviceId"] = None
    STATE["lockedAt"] = None
    save_state()
    return jsonify({"status": "ok", "message": "Device unlinked. Server is open for new pairing."})

@app.route("/api/verify", methods=["POST"])
def verify():
    dev = auth_device()
    if not dev: return jsonify({"valid": False, "error": "Token invalid or expired"}), 401
    return jsonify({"valid": True, "deviceId": dev, "serverVersion": "7.0.0", "paired": True, "uptime": 0})

# ── Metrics ───────────────────────────────────────────────────────
@app.route("/api/metrics", methods=["GET", "POST"])
@app.route("/api/status/full", methods=["GET", "POST"])
def metrics():
    if psutil:
        cpu  = psutil.cpu_percent(0.2)
        mem  = psutil.virtual_memory()
        disk_path = "C:\\" if os.name == "nt" else "/"
        disk = psutil.disk_usage(disk_path)
        return jsonify({
            "status": "ok",
            "cpu": {"percent": cpu, "cores": psutil.cpu_count() or 1},
            "memory": {"percent": mem.percent, "used_gb": round(mem.used / 1e9, 1), "total_gb": round(mem.total / 1e9, 1)},
            "ram": {"percent": mem.percent},
            "disk": {"percent": disk.percent, "used_gb": round(disk.used / 1e9, 1), "total_gb": round(disk.total / 1e9, 1)},
            "system": {"hostname": socket.gethostname(), "os": sys.platform, "uptime_hrs": 0},
        })
    return jsonify({
        "status": "ok",
        "cpu": {"percent": 0, "cores": 1},
        "memory": {"percent": 0, "used_gb": 0, "total_gb": 8},
        "ram": {"percent": 0},
        "disk": {"percent": 0, "used_gb": 0, "total_gb": 100},
        "system": {"hostname": socket.gethostname(), "os": sys.platform, "uptime_hrs": 0},
    })

# ── Execute script ────────────────────────────────────────────────
@app.route("/api/execute", methods=["POST"])
def execute():
    if not auth_device(): return jsonify({"error": "Unauthorized"}), 401
    d = request.get_json(force=True) or {}
    script = d.get("script", "")
    language = d.get("language", "python").lower()
    if not script: return jsonify({"error": "No script"}), 400
    try:
        if language in ("python", "py"):
            proc = subprocess.run([sys.executable, "-c", script], capture_output=True, text=True, timeout=30)
        elif language in ("powershell", "ps1"):
            proc = subprocess.run(["powershell", "-Command", script], capture_output=True, text=True, timeout=30)
        elif language in ("bash", "sh"):
            proc = subprocess.run(["bash", "-c", script], capture_output=True, text=True, timeout=30)
        elif language in ("cmd", "bat"):
            proc = subprocess.run(["cmd", "/c", script], capture_output=True, text=True, timeout=30)
        else:
            proc = subprocess.run([sys.executable, "-c", script], capture_output=True, text=True, timeout=30)
        out = proc.stdout or proc.stderr or "(no output)"
        return jsonify({
            "status": "ok" if proc.returncode == 0 else "error",
            "output": out, "stdout": proc.stdout, "stderr": proc.stderr,
            "exitCode": proc.returncode, "exit_code": proc.returncode, "returncode": proc.returncode,
        })
    except subprocess.TimeoutExpired:
        return jsonify({"status": "error", "output": "Script timed out after 30 seconds", "exitCode": 1})
    except Exception as e:
        return jsonify({"status": "error", "output": str(e), "exitCode": 1})

# ── Butler chat (requires Ollama) ─────────────────────────────────
@app.route("/api/butler/chat", methods=["POST"])
def butler_chat():
    if not auth_device(): return jsonify({"error": "Unauthorized"}), 401
    d       = request.get_json(force=True) or {}
    msg     = d.get("message", "")
    hist    = d.get("conversation") or d.get("history") or []
    do_stream = d.get("stream", False)

    system = d.get("systemPrompt", "You are Butler, an expert Python automation AI. Help users automate their PC. Be direct and provide working Python scripts.")
    messages = [{"role": "system", "content": system}]
    for h in hist[-10:]:
        messages.append(h)
    messages.append({"role": "user", "content": msg})

    import urllib.request, urllib.error
    payload = json.dumps({"model": "qwen2.5-coder:7b", "messages": messages, "stream": True}).encode()
    t0 = time.time()
    try:
        req  = urllib.request.Request(
            "http://localhost:11434/api/chat",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        resp = urllib.request.urlopen(req, timeout=120)
        full = ""

        if do_stream:
            def gen():
                nonlocal full
                for line in resp:
                    try:
                        ev  = json.loads(line)
                        tok = ev.get("message", {}).get("content", "")
                        if tok:
                            full += tok
                            yield f"data: {json.dumps({'token': tok})}\n\n"
                        if ev.get("done"):
                            ms = int((time.time() - t0) * 1000)
                            yield f"data: {json.dumps({'done': True, 'response': full, 'reply': full, 'ollamaModel': 'qwen2.5-coder:7b', 'responseTimeMs': ms, 'kbArticlesUsed': 0, 'ai': 'ollama'})}\n\n"
                    except:
                        pass
            return Response(gen(), mimetype="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
        else:
            for line in resp:
                try:
                    ev = json.loads(line)
                    full += ev.get("message", {}).get("content", "")
                except:
                    pass
            ms = int((time.time() - t0) * 1000)
            return jsonify({
                "status": "ok", "response": full, "reply": full, "message": full,
                "ollamaModel": "qwen2.5-coder:7b", "ollamaError": False,
                "responseTimeMs": ms, "kbArticlesUsed": 0, "ai": "ollama",
            })

    except Exception as e:
        err = str(e)
        if "Connection refused" in err or "11434" in err:
            reply = "Ollama is not running on this PC.\n\nFix:\n1. Install Ollama: https://ollama.com/download\n2. Run: ollama pull qwen2.5-coder:7b\n3. Restart this server."
        else:
            reply = f"Ollama error: {err}"

        if do_stream:
            def err_gen():
                yield f"data: {json.dumps({'token': reply})}\n\n"
                yield f"data: {json.dumps({'done': True, 'response': reply, 'reply': reply, 'ollamaError': True, 'ai': 'local', 'responseTimeMs': 100})}\n\n"
            return Response(err_gen(), mimetype="text/event-stream")
        return jsonify({"status": "ok", "response": reply, "reply": reply, "ollamaError": True, "ai": "local", "responseTimeMs": 100})

@app.route("/api/butler/clear", methods=["POST"])
def butler_clear():
    return jsonify({"status": "ok"})

# ── Ollama status ─────────────────────────────────────────────────
@app.route("/api/ollama/status", methods=["GET", "POST"])
def ollama_status():
    import urllib.request, urllib.error
    try:
        r    = urllib.request.urlopen("http://localhost:11434/api/tags", timeout=3)
        data = json.loads(r.read())
        models = [m.get("name", "") for m in data.get("models", [])]
        return jsonify({"available": True, "models": models, "activeModel": models[0] if models else ""})
    except:
        return jsonify({"available": False, "models": [], "activeModel": ""})

@app.route("/api/ollama/pull", methods=["POST"])
def ollama_pull():
    d     = request.get_json(force=True) or {}
    model = d.get("model", "qwen2.5-coder:7b")
    def run():
        subprocess.Popen(["ollama", "pull", model])
    threading.Thread(target=run, daemon=True).start()
    return jsonify({"status": "ok", "message": f"Model download started: {model}"})

# ── Performance mode ──────────────────────────────────────────────
@app.route("/api/performance", methods=["POST"])
def performance():
    return jsonify({"status": "ok"})

# ── File receive ──────────────────────────────────────────────────
@app.route("/api/receive_file", methods=["POST"])
def receive_file():
    if not auth_device(): return jsonify({"error": "Unauthorized"}), 401
    d        = request.get_json(force=True) or {}
    filename = d.get("filename", "butler_file.txt")
    content  = d.get("content", "")
    dest     = Path.home() / "Desktop" / filename
    try:
        dest.write_text(content)
        return jsonify({"status": "ok", "path": str(dest)})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

# ── Pip install ───────────────────────────────────────────────────
@app.route("/api/pip/install", methods=["POST"])
def pip_install():
    if not auth_device(): return jsonify({"error": "Unauthorized"}), 401
    d    = request.get_json(force=True) or {}
    pkg  = d.get("package", "")
    pkgs = d.get("packages", [])
    if pkg: pkgs.append(pkg)
    if not pkgs: return jsonify({"error": "No package specified"}), 400
    try:
        proc = subprocess.run(
            [sys.executable, "-m", "pip", "install"] + pkgs,
            capture_output=True, text=True, timeout=120
        )
        return jsonify({"status": "ok" if proc.returncode == 0 else "error", "output": proc.stdout + proc.stderr})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route("/api/requirements/install", methods=["POST"])
def requirements_install():
    if not auth_device(): return jsonify({"error": "Unauthorized"}), 401
    reqs = ["psutil", "flask", "qrcode", "pillow", "requests", "beautifulsoup4"]
    try:
        proc = subprocess.run(
            [sys.executable, "-m", "pip", "install"] + reqs,
            capture_output=True, text=True, timeout=120
        )
        return jsonify({"status": "ok", "output": proc.stdout})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

# ── KB / Learn stubs ──────────────────────────────────────────────
@app.route("/api/kb/expand", methods=["POST"])
@app.route("/api/kb/search", methods=["POST"])
@app.route("/api/kb/log", methods=["POST"])
@app.route("/api/kb/stats", methods=["POST"])
@app.route("/api/kb/enrich", methods=["POST"])
@app.route("/api/search/scripts", methods=["POST"])
@app.route("/api/crawl", methods=["POST"])
@app.route("/api/learn/status", methods=["GET", "POST"])
@app.route("/api/alerts", methods=["POST"])
def stub():
    return jsonify({
        "ok": True, "status": "ok", "articles": [], "categories": {},
        "articlesTotal": 0, "queuePending": 0, "workersRunning": 0,
        "alerts": [], "alertCount": 0, "tasks": [], "count": 0,
    })

# ── Debug endpoint ────────────────────────────────────────────────
@app.route("/api/debug/connection", methods=["GET"])
def debug_connection():
    return jsonify({
        "status": "ok",
        "deviceId": STATE.get("deviceId"),
        "locked": bool(STATE.get("deviceId")),
        "lockedAt": STATE.get("lockedAt"),
        "serverIp": get_ip(),
        "port": PORT,
    })

# ── QR Code ────────────────────────────────────────────────────────
def show_qr():
    ip   = get_ip()
    data = json.dumps({"ip": ip, "port": PORT, "pairingCode": "", "version": "7.0.0"})
    print(f"\n{'='*60}")
    print(f"  BUTLER AI SERVER v7.0")
    print(f"  IP: {ip}   PORT: {PORT}")
    print(f"  Scan QR with Butler AI app or enter IP + port manually")
    print(f"{'='*60}\n")
    if qrcode:
        try:
            qr = qrcode.QRCode(box_size=2)
            qr.add_data(data)
            qr.make(fit=True)
            qr.print_ascii(invert=True)
        except:
            print(f"  QR DATA: {data}")
    else:
        print(f"  QR DATA (install qrcode for visual): {data}")
    print(f"\nServer running at http://{ip}:{PORT}")
    print("Press Ctrl+C to stop.\n")

# ── UDP beacon for LAN auto-discovery ─────────────────────────────
def udp_beacon():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    while True:
        try:
            payload = json.dumps({
                "service": "butler-ai", "ip": get_ip(),
                "port": PORT, "version": "7.0.0", "locked": bool(STATE.get("deviceId")),
            }).encode()
            sock.sendto(payload, ("<broadcast>", 8764))
        except:
            pass
        time.sleep(3)

if __name__ == "__main__":
    # Start UDP beacon for LAN auto-discovery
    threading.Thread(target=udp_beacon, daemon=True).start()

    # Try ports in order until one works
    for p in [8766, 8765, 5000, 8080, 8090, 9000]:
        try:
            PORT = p
            show_qr()
            app.run(host=HOST, port=p, debug=False, threaded=True)
            break
        except OSError:
            print(f"Port {p} in use, trying next...")
