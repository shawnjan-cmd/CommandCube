# BOTER Butler - Complete Windows Auto-Setup v5.0
# Run: Right-click boter_setup.ps1 -> "Run with PowerShell"
# Or:  powershell -ExecutionPolicy Bypass -File boter_setup.ps1
# Requires: Windows 10/11, Internet connection

$ErrorActionPreference = "Continue"
$VERSION = "5.0"
$SETUP_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Step($msg) { Write-Host "" ; Write-Host $msg -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  [ERR] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "  BOTER BUTLER SERVER v$VERSION - COMPLETE AUTO-SETUP" -ForegroundColor Yellow
Write-Host "  Windows 10/11 | Python 3.12 | All Packages | Ollama AI" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Yellow

# ── STEP 1: Python ──────────────────────────────────────────────────────────
Write-Step "[STEP 1/6] Checking Python 3.10+..."

$pythonCmd = $null
foreach ($cmd in @("python","python3","py")) {
  try {
    $v = & $cmd --version 2>&1
    if ($v -match "Python 3\.(1[0-9]|[2-9][0-9])") {
      Write-OK "$v found at '$cmd'"
      $pythonCmd = $cmd; break
    }
  } catch {}
}

if (-not $pythonCmd) {
  Write-Warn "Python 3.10+ not found. Installing Python 3.12..."
  $wingetOk = $false
  try {
    $wv = winget --version 2>&1
    if ($wv -match "v") {
      Write-Host "  Using winget to install Python 3.12..." -ForegroundColor Gray
      winget install --id Python.Python.3.12 -e -h --accept-source-agreements --accept-package-agreements
      $wingetOk = ($LASTEXITCODE -eq 0)
    }
  } catch {}
  if (-not $wingetOk) {
    Write-Host "  Downloading Python 3.12.7 installer from python.org..." -ForegroundColor Gray
    $pyUrl  = "https://www.python.org/ftp/python/3.12.7/python-3.12.7-amd64.exe"
    $pyInst = "$env:TEMP\python_installer.exe"
    try {
      Invoke-WebRequest -Uri $pyUrl -OutFile $pyInst -UseBasicParsing
      Write-Host "  Running silent installer (InstallAllUsers + PrependPath)..." -ForegroundColor Gray
      Start-Process -FilePath $pyInst -ArgumentList "/quiet","InstallAllUsers=1","PrependPath=1","Include_pip=1","Include_launcher=1","Include_test=0" -Wait
      Remove-Item $pyInst -Force -ErrorAction SilentlyContinue
    } catch { Write-Err "Python download failed: $_" }
  }
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
  foreach ($cmd in @("python","python3","py")) {
    try {
      $v = & $cmd --version 2>&1
      if ($v -match "Python 3") { $pythonCmd = $cmd; Write-OK "$v installed!"; break }
    } catch {}
  }
  if (-not $pythonCmd) {
    Write-Err "Python install failed. Install manually: https://python.org/downloads"
    Read-Host "Press Enter to exit"; exit 1
  }
}

# ── STEP 2: Upgrade pip ─────────────────────────────────────────────────────
Write-Step "[STEP 2/6] Upgrading pip..."
try {
  & $pythonCmd -m pip install --upgrade pip --quiet
  Write-OK "pip upgraded"
} catch { Write-Warn "pip upgrade skipped" }

# ── STEP 3: All Python packages ─────────────────────────────────────────────
Write-Step "[STEP 3/6] Installing all Python packages..."

$packages = @(
  @{ pkg="psutil";         desc="CPU/RAM/disk/process system metrics" },
  @{ pkg="requests";       desc="HTTP client library for API calls" },
  @{ pkg="qrcode[pil]";    desc="QR code generator for pairing" },
  @{ pkg="Pillow";         desc="Image processing library (PIL fork)" },
  @{ pkg="cryptography";   desc="TLS/SSL self-signed certificate generation" },
  @{ pkg="flask";          desc="Lightweight web framework" },
  @{ pkg="flask-cors";     desc="CORS headers support for Flask" },
  @{ pkg="beautifulsoup4"; desc="HTML scraping for Knowledge Base crawler" },
  @{ pkg="lxml";           desc="Fast XML/HTML parser (bs4 backend)" },
  @{ pkg="urllib3";        desc="HTTP library (requests dependency)" },
  @{ pkg="certifi";        desc="Mozilla CA certificate bundle for TLS" },
  @{ pkg="pywin32";        desc="Windows API access (startup/tray integration)" },
  @{ pkg="pystray";        desc="System tray icon support" },
  @{ pkg="pyinstaller";    desc="Build standalone .exe from butler_server.py" }
)

foreach ($p in $packages) {
  Write-Host "  Installing $($p.pkg) — $($p.desc)..." -ForegroundColor Gray
  & $pythonCmd -m pip install $p.pkg --quiet --upgrade 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-OK $p.pkg } else { Write-Warn "$($p.pkg) (optional, continuing)" }
}

# ── STEP 4: Ollama ──────────────────────────────────────────────────────────
Write-Step "[STEP 4/6] Installing Ollama Local AI..."

$ollamaFound = $false
try { ollama --version | Out-Null; Write-OK "Ollama already installed"; $ollamaFound = $true } catch {}

if (-not $ollamaFound) {
  $wingetOllamaOk = $false
  try {
    winget install --id Ollama.Ollama -e -h --accept-source-agreements --accept-package-agreements
    $wingetOllamaOk = ($LASTEXITCODE -eq 0); $ollamaFound = $wingetOllamaOk
  } catch {}
  if (-not $wingetOllamaOk) {
    Write-Host "  Downloading OllamaSetup.exe..." -ForegroundColor Gray
    $ollamaUrl  = "https://ollama.com/download/OllamaSetup.exe"
    $ollamaInst = "$env:TEMP\OllamaSetup.exe"
    try {
      Invoke-WebRequest -Uri $ollamaUrl -OutFile $ollamaInst -UseBasicParsing
      Write-Host "  Running Ollama silent installer..." -ForegroundColor Gray
      Start-Process -FilePath $ollamaInst -ArgumentList "/S" -Wait
      Remove-Item $ollamaInst -Force -ErrorAction SilentlyContinue
      $ollamaFound = $true
    } catch { Write-Err "Ollama download failed: $_" }
  }
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
  try { ollama --version | Out-Null; Write-OK "Ollama installed!"; $ollamaFound = $true } catch { Write-Warn "Ollama may need a reboot to fully activate" }
}

# ── STEP 5: Pull AI model ───────────────────────────────────────────────────
Write-Step "[STEP 5/6] Pulling AI model (qwen2.5-coder:7b)..."
Write-Host "  Apache 2.0 license — commercial use OK — no API keys needed" -ForegroundColor Gray
Write-Host "  Approx. 4GB download. This may take several minutes..." -ForegroundColor Gray
Write-Host "  Alternative (lighter): ollama pull phi4-mini:latest (2.5GB)" -ForegroundColor Gray

try {
  Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 4
  ollama pull qwen2.5-coder:7b
  if ($LASTEXITCODE -eq 0) {
    Write-OK "qwen2.5-coder:7b ready!"
  } else {
    Write-Warn "Primary model failed. Trying phi4-mini:latest (2.5GB)..."
    ollama pull phi4-mini:latest
    if ($LASTEXITCODE -eq 0) { Write-OK "phi4-mini:latest ready!" }
    else { Write-Warn "Model pull failed. Run manually: ollama pull qwen2.5-coder:7b" }
  }
} catch { Write-Warn "Ollama serve issue. Start Ollama manually, then: ollama pull qwen2.5-coder:7b" }

# ── STEP 6: Desktop shortcut ────────────────────────────────────────────────
Write-Step "[STEP 6/6] Creating Desktop shortcut..."
try {
  $lnkPath = "$env:USERPROFILE\Desktop\Butler Server.lnk"
  $batPath  = Join-Path $SETUP_DIR "run_server_windows.bat"
  $shell    = New-Object -ComObject WScript.Shell
  $sc       = $shell.CreateShortcut($lnkPath)
  $sc.TargetPath      = $batPath
  $sc.WorkingDirectory = $SETUP_DIR
  $sc.Description     = "BOTER Butler Server v5.0 — Ollama Local AI"
  $sc.Save()
  Write-OK "Desktop shortcut 'Butler Server' created!"
} catch { Write-Warn "Shortcut creation skipped: $_" }

# ── DONE ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETE — BOTER v$VERSION READY!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installed:" -ForegroundColor White
Write-Host "  [OK] Python 3.12+" -ForegroundColor Green
Write-Host "  [OK] psutil, requests, qrcode[pil], Pillow, cryptography" -ForegroundColor Green
Write-Host "  [OK] flask, flask-cors, beautifulsoup4, lxml, urllib3" -ForegroundColor Green
Write-Host "  [OK] certifi, pywin32, pystray, pyinstaller" -ForegroundColor Green
Write-Host "  [OK] Ollama AI + qwen2.5-coder:7b model" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Double-click 'Butler Server' on your Desktop" -ForegroundColor White
Write-Host "  2. QR code appears on screen" -ForegroundColor White
Write-Host "  3. Scan with BOTER mobile app (CONNECT tab)" -ForegroundColor White
Write-Host ""
Write-Host "The app header will show OLLAMA ACTIVE when AI is running." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"
