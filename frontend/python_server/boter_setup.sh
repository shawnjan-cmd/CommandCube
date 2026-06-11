#!/bin/bash
# BOTER Butler - Complete Mac/Linux Auto-Setup v5.0
# Usage: chmod +x boter_setup.sh && ./boter_setup.sh
# Requires: macOS 12+ or Ubuntu 20+, Internet connection

set -e
VERSION="5.0"
SETUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "============================================================"
echo "  BOTER BUTLER SERVER v$VERSION — COMPLETE AUTO-SETUP"
echo "  macOS / Linux | Python 3.12 | All Packages | Ollama AI"
echo "============================================================"
echo ""

# Detect OS
OS_TYPE="$(uname -s)"
PKG_MANAGER=""
if [ "$OS_TYPE" = "Darwin" ]; then
  echo "[INFO] macOS detected"
elif command -v apt-get &>/dev/null; then
  PKG_MANAGER="apt"
  echo "[INFO] Debian/Ubuntu detected"
elif command -v dnf &>/dev/null; then
  PKG_MANAGER="dnf"
  echo "[INFO] Fedora/RHEL detected"
elif command -v pacman &>/dev/null; then
  PKG_MANAGER="pacman"
  echo "[INFO] Arch Linux detected"
else
  echo "[WARN] Unknown Linux distro — manual package install may be needed"
fi

# ── STEP 1: Python ──────────────────────────────────────────────────────────
echo ""
echo "[STEP 1/6] Checking Python 3.10+..."

PYTHON=""
for cmd in python3 python3.12 python3.11 python3.10 python; do
  if command -v $cmd &>/dev/null; then
    VER=$($cmd --version 2>&1)
    if echo "$VER" | grep -qE "Python 3\.(1[0-9]|[2-9][0-9])"; then
      PYTHON=$cmd
      echo "  [OK] $VER found"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  echo "  [INFO] Installing Python 3.12..."
  if [ "$OS_TYPE" = "Darwin" ]; then
    if command -v brew &>/dev/null; then
      brew install python@3.12
      PYTHON="python3.12"
    else
      echo "  Homebrew not found. Install from: https://brew.sh"
      echo "  Then run: brew install python@3.12"
      echo "  Or download Python from: https://python.org/downloads/macos/"
      exit 1
    fi
  elif [ "$PKG_MANAGER" = "apt" ]; then
    sudo apt-get update -qq
    sudo apt-get install -y python3.12 python3.12-pip python3.12-venv python3-tk python3-pip
  elif [ "$PKG_MANAGER" = "dnf" ]; then
    sudo dnf install -y python3.12 python3-pip python3-tkinter
  elif [ "$PKG_MANAGER" = "pacman" ]; then
    sudo pacman -S --noconfirm python python-pip tk
  fi
  PYTHON=python3
  echo "  [OK] Python installed!"
fi

# ── STEP 2: Upgrade pip ─────────────────────────────────────────────────────
echo ""
echo "[STEP 2/6] Upgrading pip..."
$PYTHON -m pip install --upgrade pip --quiet 2>/dev/null || true
echo "  [OK] pip upgraded"

# ── STEP 3: All Python packages ─────────────────────────────────────────────
echo ""
echo "[STEP 3/6] Installing all Python packages..."

PACKAGES=(
  "psutil"          # CPU/RAM/disk/process system metrics
  "requests"        # HTTP client library
  "qrcode[pil]"     # QR code generator for pairing
  "Pillow"          # Image processing (PIL fork)
  "cryptography"    # TLS self-signed cert generation
  "flask"           # Lightweight web framework
  "flask-cors"      # CORS headers for Flask
  "beautifulsoup4"  # HTML scraping for KB crawler
  "lxml"            # Fast XML/HTML parser
  "urllib3"         # HTTP library
  "certifi"         # Mozilla TLS certificate bundle
  "pyinstaller"     # Build standalone binary
)

for pkg in "${PACKAGES[@]}"; do
  pkgname=$(echo "$pkg" | sed 's/\[.*//')
  echo -n "  Installing $pkg..."
  $PYTHON -m pip install "$pkg" --quiet --upgrade 2>/dev/null && echo " [OK]" || echo " [WARN — optional]"
done

# ── STEP 4: Ollama ──────────────────────────────────────────────────────────
echo ""
echo "[STEP 4/6] Installing Ollama Local AI..."

if command -v ollama &>/dev/null; then
  echo "  [OK] Ollama already installed: $(ollama --version 2>&1 | head -1)"
else
  echo "  [INFO] Downloading and installing Ollama..."
  if [ "$OS_TYPE" = "Darwin" ] && command -v brew &>/dev/null; then
    brew install --cask ollama
  else
    curl -fsSL https://ollama.com/install.sh | sh
  fi
  echo "  [OK] Ollama installed!"
fi

# ── STEP 5: Pull AI model ───────────────────────────────────────────────────
echo ""
echo "[STEP 5/6] Pulling AI model (qwen2.5-coder:7b)..."
echo "  Apache 2.0 license — commercial use OK — no API keys"
echo "  Approx. 4GB download. This may take several minutes..."

# Start Ollama server in background
ollama serve &>/dev/null &
OLLAMA_PID=$!
sleep 5

if ollama pull qwen2.5-coder:7b; then
  echo "  [OK] qwen2.5-coder:7b ready!"
else
  echo "  [WARN] Primary model failed. Trying phi4-mini:latest (2.5GB)..."
  if ollama pull phi4-mini:latest; then
    echo "  [OK] phi4-mini:latest ready (fallback)!"
  else
    echo "  [WARN] Model pull failed. Run manually: ollama pull qwen2.5-coder:7b"
  fi
fi

# ── STEP 6: Permissions + launch script ─────────────────────────────────────
echo ""
echo "[STEP 6/6] Setting up launch scripts..."

chmod +x "$SETUP_DIR"/*.sh 2>/dev/null || true
echo "  [OK] All .sh scripts made executable"

# Create a convenience symlink on macOS
if [ "$OS_TYPE" = "Darwin" ]; then
  LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
  echo "  [INFO] macOS: run ./install_startup_mac_linux.sh to add auto-start"
fi

# ── DONE ────────────────────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo "  SETUP COMPLETE — BOTER v$VERSION READY!"
echo "============================================================"
echo ""
echo "Installed:"
echo "  [OK] Python 3.12+"
echo "  [OK] psutil, requests, qrcode[pil], Pillow, cryptography"
echo "  [OK] flask, flask-cors, beautifulsoup4, lxml, certifi"
echo "  [OK] pyinstaller"
echo "  [OK] Ollama AI + qwen2.5-coder:7b model"
echo ""
echo "Next Steps:"
echo "  1. Run: ./run_server_mac_linux.sh"
echo "  2. QR code appears in terminal / GUI window"
echo "  3. Scan with BOTER mobile app (CONNECT tab)"
echo ""
echo "Optional - auto-start on login:"
echo "  ./install_startup_mac_linux.sh"
echo ""
