#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════╗
║   CYBER-BOTLER  ·  EXE Builder  v5.0                ║
║   Run this file — it auto-installs everything        ║
║   and produces a single .exe you can ship            ║
╚═══════════════════════════════════════════════════════╝

USAGE:
  python build_exe.py

OUTPUT:
  dist/CyberButler-Server.exe   (Windows)
  dist/CyberButler-Server       (Mac / Linux)

HOW IT WORKS:
  1. Auto-installs all required pip packages
  2. Reads butler_server.py from the same folder
  3. Bundles everything into one portable executable
  4. The exe starts instantly — no Python needed on target PC
"""

import os
import sys
import subprocess
import importlib
import shutil
from pathlib import Path
import time

# ─── Colour helpers for terminal output ──────────────────────────
def r(t): return f"\033[91m{t}\033[0m"   # red
def g(t): return f"\033[92m{t}\033[0m"   # green
def y(t): return f"\033[93m{t}\033[0m"   # yellow
def c(t): return f"\033[96m{t}\033[0m"   # cyan
def b(t): return f"\033[1m{t}\033[0m"    # bold

def sep(char="═", width=60):
    print(char * width)

def banner():
    sep()
    print(b(c("  CYBER-BOTLER  ·  EXE Builder  v5.0")))
    sep()
    print(f"  Python : {sys.version.split()[0]}")
    print(f"  Folder : {Path(__file__).parent}")
    sep()
    print()

def step(n, label):
    print(f"\n{b(f'[{n}/5]')} {y(label)}")

def ok(msg):  print(f"  {g('✓')}  {msg}")
def err(msg): print(f"  {r('✗')}  {msg}")
def info(msg):print(f"  {c('·')}  {msg}")

# ─────────────────────────────────────────────────────────────────
#  STEP 1 — check Python version
# ─────────────────────────────────────────────────────────────────
def check_python():
    step(1, "Checking Python version")
    major, minor = sys.version_info[:2]
    if major < 3 or (major == 3 and minor < 10):
        err(f"Python 3.10+ required (found {major}.{minor})")
        sys.exit(1)
    ok(f"Python {major}.{minor} — compatible")

# ─────────────────────────────────────────────────────────────────
#  STEP 2 — auto-install dependencies
# ─────────────────────────────────────────────────────────────────
REQUIRED_PACKAGES = {
    # import_name   : pip_name
    "psutil"        : "psutil",
    "qrcode"        : "qrcode[pil]",
    "PIL"           : "pillow",
    "requests"      : "requests",
    "PyInstaller"   : "pyinstaller",
}

def install_packages():
    step(2, "Installing/verifying dependencies")
    failed = []
    for import_name, pip_name in REQUIRED_PACKAGES.items():
        try:
            importlib.import_module(import_name)
            ok(f"{pip_name} — already installed")
        except ImportError:
            info(f"Installing {pip_name}...")
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", pip_name, "--quiet"],
                capture_output=True, text=True
            )
            if result.returncode == 0:
                ok(f"{pip_name} — installed")
            else:
                err(f"Failed to install {pip_name}")
                print(f"     {result.stderr.strip()[:200]}")
                failed.append(pip_name)
    if failed:
        err(f"Could not install: {', '.join(failed)}")
        print(f"\n  Run manually: {sys.executable} -m pip install {' '.join(failed)}")
        sys.exit(1)

# ─────────────────────────────────────────────────────────────────
#  STEP 3 — locate butler_server.py
# ─────────────────────────────────────────────────────────────────
def find_server():
    step(3, "Locating butler_server.py")
    here = Path(__file__).parent
    server = here / "butler_server.py"
    if not server.exists():
        err("butler_server.py not found in the same folder as this script")
        err(f"Expected: {server}")
        sys.exit(1)
    size_kb = server.stat().st_size // 1024
    ok(f"Found butler_server.py ({size_kb} KB)")
    return server

# ─────────────────────────────────────────────────────────────────
#  STEP 4 — generate PyInstaller spec and build
# ─────────────────────────────────────────────────────────────────
def build_exe(server_path: Path):
    step(4, "Building standalone executable")

    here        = server_path.parent
    dist_dir    = here / "dist"
    build_dir   = here / "build_tmp"
    exe_name    = "CyberButler-Server"
    is_win      = sys.platform == "win32"
    is_mac      = sys.platform == "darwin"

    # Clean previous build artefacts
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
        info("Cleaned previous dist/ folder")

    # ── Build PyInstaller command ────────────────────────────────
    cmd = [
        sys.executable, "-m", "PyInstaller",
        str(server_path),
        f"--name={exe_name}",
        "--onefile",               # Single portable file
        "--console",               # Keep console window (server log)
        "--clean",                 # Remove stale build artefacts
        "--noconfirm",             # Overwrite without prompt
        f"--distpath={dist_dir}",
        f"--workpath={build_dir}",
        f"--specpath={here}",
        # Hidden imports not always auto-detected
        "--hidden-import=psutil",
        "--hidden-import=qrcode",
        "--hidden-import=qrcode.image.pil",
        "--hidden-import=PIL",
        "--hidden-import=PIL.Image",
        "--hidden-import=requests",
        "--hidden-import=urllib.request",
        "--hidden-import=http.server",
        "--hidden-import=socketserver",
        "--hidden-import=threading",
        "--hidden-import=hashlib",
        "--hidden-import=hmac",
        "--hidden-import=base64",
        "--hidden-import=json",
        "--hidden-import=socket",
        "--hidden-import=subprocess",
        # Exclude heavy unused modules to keep size down
        "--exclude-module=tkinter",
        "--exclude-module=matplotlib",
        "--exclude-module=numpy",
        "--exclude-module=pandas",
        "--exclude-module=scipy",
        "--exclude-module=IPython",
        "--exclude-module=jupyter",
        "--exclude-module=notebook",
        "--noupx",                 # Skip UPX — faster startup
    ]

    # Platform extras
    if is_win:
        cmd.append("--win-private-assemblies")
    if not is_win and not is_mac:
        cmd.append("--strip")

    info(f"Running PyInstaller... (this takes 30-90 seconds)")
    print()

    t0 = time.time()
    result = subprocess.run(cmd, cwd=here)
    elapsed = int(time.time() - t0)

    if result.returncode != 0:
        err(f"PyInstaller failed (exit code {result.returncode})")
        print(f"\n  Check output above for details.")
        sys.exit(1)

    # Determine output path
    suffix = ".exe" if is_win else ""
    exe    = dist_dir / (exe_name + suffix)

    if not exe.exists():
        err(f"Expected output not found: {exe}")
        sys.exit(1)

    size_mb = exe.stat().st_size / (1024 * 1024)
    ok(f"Build complete in {elapsed}s — {size_mb:.1f} MB")

    # Clean spec + build_tmp
    spec = here / f"{exe_name}.spec"
    if spec.exists():      spec.unlink()
    if build_dir.exists(): shutil.rmtree(build_dir)

    return exe

# ─────────────────────────────────────────────────────────────────
#  STEP 5 — print usage instructions
# ─────────────────────────────────────────────────────────────────
def print_usage(exe: Path):
    step(5, "Done!")
    print()
    sep("═")
    print(b(g("  BUILD SUCCESSFUL")))
    sep("═")
    print(f"\n  {b('Executable:')}")
    print(f"    {c(str(exe))}")
    print(f"    Size: {exe.stat().st_size / 1024 / 1024:.1f} MB")
    print()
    print(f"  {b('How to use:')}")
    if sys.platform == "win32":
        print(f"    1. Copy  CyberButler-Server.exe  to any PC")
        print(f"    2. Double-click to run (no Python needed)")
        print(f"    3. Scan the QR code in the mobile app")
        print()
        print(f"  {b('Firewall prompt:')} Allow port 8765 when Windows asks")
    else:
        print(f"    1. Copy  CyberButler-Server  to any PC")
        print(f"    2. chmod +x CyberButler-Server && ./CyberButler-Server")
        print(f"    3. Scan the QR code in the mobile app")
    print()
    print(f"  {b('Reset pairing:')}")
    if sys.platform == "win32":
        print(f"    CyberButler-Server.exe --reset-pair")
    else:
        print(f"    ./CyberButler-Server --reset-pair")
    print()
    sep("═")
    print()

# ─────────────────────────────────────────────────────────────────
#  Entry point
# ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    try:
        banner()
        check_python()
        install_packages()
        server_path = find_server()
        exe         = build_exe(server_path)
        print_usage(exe)
    except KeyboardInterrupt:
        print(f"\n{y('Build cancelled.')}")
        sys.exit(0)
    except SystemExit:
        raise
    except Exception as e:
        print(f"\n{r('Unexpected error:')} {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
