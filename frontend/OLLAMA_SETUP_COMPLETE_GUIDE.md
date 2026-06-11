# 🤖 OLLAMA SETUP - COMPLETE SELF-HOSTING GUIDE

**100% FREE, OFFLINE AI for BOTLER - Privacy + Unlimited Usage**

---

## 📋 TABLE OF CONTENTS
1. [What is Ollama?](#what-is-ollama)
2. [System Requirements](#system-requirements)
3. [Installation](#installation)
4. [Model Setup](#model-setup)
5. [Mobile App Connection](#mobile-app-connection)
6. [Advanced Configuration](#advanced-configuration)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 WHAT IS OLLAMA?

**Ollama** is a self-hosted AI engine that runs Large Language Models (LLMs) on YOUR PC — completely offline, free, and private.

### Why Ollama > Cloud AI (Groq/OpenAI)?

| Feature | Ollama (Local) | Groq (Cloud) |
|---------|----------------|--------------|
| **Privacy** | ✅ 100% Local | ❌ Cloud servers |
| **Cost** | ✅ FREE unlimited | ⚠️ Free tier limits |
| **Internet** | ✅ Offline works | ❌ Requires connection |
| **Speed** | ⚡ Fast (GPU) | ⚡ Very fast (cloud) |
| **Setup** | ⚠️ Installation needed | ✅ Just API key |
| **Best For** | Privacy, unlimited use | Mobile/car/instant access |

**HYBRID STRATEGY** (What BOTLER uses):
- **Primary**: Ollama (privacy + unlimited)
- **Fallback**: Groq (works when away from PC)

---

## 💻 SYSTEM REQUIREMENTS

### Minimum (Basic AI)
- **CPU**: 4-core modern processor (Intel i5/Ryzen 5 or better)
- **RAM**: 8 GB
- **Disk**: 5 GB free space
- **OS**: Windows 10/11, macOS 11+, or Linux (Ubuntu 20.04+)

### Recommended (Fast AI)
- **CPU**: 8-core (Intel i7/Ryzen 7 or better)
- **RAM**: 16 GB
- **GPU**: NVIDIA RTX 3060+ / AMD RX 6700+ (for GPU acceleration)
- **Disk**: 20 GB SSD

### Models & RAM Requirements
| Model | RAM | VRAM (GPU) | Speed | Quality |
|-------|-----|------------|-------|---------|
| **llama3.2:1b** | 2 GB | 1 GB | ⚡⚡⚡ | Good |
| **llama3.2:3b** ⭐ | 4 GB | 3 GB | ⚡⚡ | Better |
| **llama3.1:8b** | 8 GB | 6 GB | ⚡ | Best |
| **llama3.1:70b** | 48 GB | 40 GB | 🐌 | Excellent |

**⭐ RECOMMENDED FOR BOTLER**: `llama3.2:3b` (best balance)

---

## 🚀 INSTALLATION

### Windows

**1. Download Ollama**
```
https://ollama.ai/download/windows
```
- Download `OllamaSetup.exe`
- Run installer (requires admin)
- Installation path: `C:\Users\YourName\AppData\Local\Programs\Ollama`

**2. Verify Installation**
```cmd
ollama --version
```
Should show: `ollama version 0.x.x`

**3. Start Ollama Service**
Ollama auto-starts on boot. If not running:
```cmd
ollama serve
```

---

### macOS

**1. Install via Homebrew** (recommended)
```bash
brew install ollama
```

**OR Download DMG:**
```
https://ollama.ai/download/mac
```

**2. Start Ollama**
```bash
ollama serve
```

**3. Auto-start on Login**
```bash
brew services start ollama
```

---

### Linux (Ubuntu/Debian)

**1. Install Script**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**2. Start Service**
```bash
sudo systemctl start ollama
sudo systemctl enable ollama  # Auto-start on boot
```

**3. Verify**
```bash
ollama --version
systemctl status ollama
```

---

## 📥 MODEL SETUP

### Step 1: Download Recommended Model

**For BOTLER (Recommended):**
```bash
ollama pull llama3.2:3b
```

**Other Options:**
```bash
# Fastest (lower quality)
ollama pull llama3.2:1b

# Best quality (needs 8GB+ RAM)
ollama pull llama3.1:8b

# Coding specialist
ollama pull deepseek-coder:6.7b

# Python expert
ollama pull codellama:7b
```

### Step 2: Test Model
```bash
ollama run llama3.2:3b
```

Try asking:
```
>>> Write a Python script to check disk space
```

Press `Ctrl+D` to exit.

### Step 3: List Installed Models
```bash
ollama list
```

Output:
```
NAME                SIZE    MODIFIED
llama3.2:3b        2.0 GB  2 hours ago
```

---

## 📱 MOBILE APP CONNECTION

### Default Setup (Same Network)

**1. Find Your PC's IP Address**

Windows:
```cmd
ipconfig
```
Look for: `IPv4 Address: 192.168.1.XXX`

Mac/Linux:
```bash
ifconfig
```
Look for: `inet 192.168.1.XXX`

**2. Configure BOTLER App**

In your mobile app:
- Open **Settings** → **AI Configuration**
- **Ollama URL**: `http://192.168.1.XXX:11434`
- Tap **Test Connection**
- Should show: ✅ CONNECTED

**3. Use Butler AI**
- Go to **Butler** tab
- Ask anything: "Monitor CPU usage in Python"
- Should see: 🔒 LOCAL AI indicator

---

### Remote Access (Away from Home)

**Option 1: Tailscale VPN** (Recommended)

1. Install Tailscale on PC and phone:
   ```
   https://tailscale.com/download
   ```

2. Connect both devices to Tailscale network

3. Use Tailscale IP in app:
   ```
   http://100.x.x.x:11434
   ```

**Option 2: Ngrok Tunnel** (Quick & Easy)

1. Install ngrok:
   ```bash
   # Windows
   choco install ngrok

   # Mac
   brew install ngrok

   # Linux
   sudo snap install ngrok
   ```

2. Start tunnel:
   ```bash
   ngrok http 11434
   ```

3. Use public URL in app:
   ```
   https://abc123.ngrok-free.app
   ```

⚠️ **SECURITY WARNING**: Only use for testing. Exposes your AI to internet.

---

## ⚙️ ADVANCED CONFIGURATION

### GPU Acceleration (NVIDIA)

**1. Check GPU Support**
```bash
nvidia-smi
```

**2. Ollama Auto-Detects GPU**
No configuration needed! Ollama automatically uses NVIDIA GPU if available.

**3. Verify GPU Usage**
```bash
# Run model
ollama run llama3.2:3b

# In another terminal
nvidia-smi
```
Should show `ollama` process using GPU.

---

### Custom Ollama Port

**Default**: `11434`

**Change Port (if conflicting with other services):**

Windows:
```cmd
set OLLAMA_HOST=0.0.0.0:8080
ollama serve
```

Mac/Linux:
```bash
export OLLAMA_HOST=0.0.0.0:8080
ollama serve
```

Permanent (Linux systemd):
```bash
sudo systemctl edit ollama
```

Add:
```ini
[Service]
Environment="OLLAMA_HOST=0.0.0.0:8080"
```

---

### Network Access (Allow Other Devices)

**Default**: Ollama only listens on `localhost` (127.0.0.1)

**Enable Network Access:**

Windows:
```cmd
set OLLAMA_HOST=0.0.0.0:11434
ollama serve
```

Mac/Linux:
```bash
export OLLAMA_HOST=0.0.0.0:11434
ollama serve
```

**Firewall (Windows):**
```cmd
netsh advfirewall firewall add rule name="Ollama Server" dir=in action=allow protocol=TCP localport=11434
```

---

### Model Management

**Delete Model:**
```bash
ollama rm llama3.2:3b
```

**Show Model Info:**
```bash
ollama show llama3.2:3b
```

**Update Model:**
```bash
ollama pull llama3.2:3b
```

---

## 🔧 TROUBLESHOOTING

### ❌ "Connection Refused" Error

**1. Check if Ollama is running:**
```bash
# Windows
tasklist | findstr ollama

# Mac/Linux
ps aux | grep ollama
```

**2. Restart Ollama:**
```bash
# Stop
pkill ollama

# Start
ollama serve
```

**3. Check firewall:**
```bash
# Test from PC browser
http://localhost:11434/api/tags
```
Should show JSON with installed models.

---

### ❌ "Out of Memory" Error

**Solution 1: Use smaller model**
```bash
ollama rm llama3.2:3b
ollama pull llama3.2:1b
```

**Solution 2: Increase swap (Linux)**
```bash
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**Solution 3: Close other apps**
Close Chrome, games, video editors before using AI.

---

### ❌ Slow Generation (No GPU)

**Check GPU Detection:**
```bash
ollama run llama3.2:3b --verbose
```

Look for: `Using GPU: true` or `Using GPU: false`

**If GPU not detected:**
1. Update NVIDIA drivers:
   ```
   https://www.nvidia.com/Download/index.aspx
   ```

2. Reinstall Ollama (latest version has better GPU support)

---

### ❌ Mobile App Can't Connect

**1. Verify PC IP:**
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

**2. Test from phone browser:**
```
http://YOUR_PC_IP:11434/api/tags
```
Should show installed models.

**3. Check same WiFi network:**
- PC and phone must be on **same network**
- Disable VPN on phone

**4. Firewall:**
```bash
# Temporarily disable firewall
# Windows: Windows Security → Firewall → Turn off
# Test connection
# Re-enable firewall and add exception
```

---

### ❌ Model Not Downloading

**1. Check disk space:**
```bash
# Windows
dir C:\

# Mac/Linux
df -h
```

**2. Clear cache and retry:**
```bash
# Windows
del /q %LOCALAPPDATA%\Ollama\models\*

# Mac/Linux
rm -rf ~/.ollama/models/*

# Re-download
ollama pull llama3.2:3b
```

---

## 🎓 PYTHON SCRIPTING TRAINING FOR BUTLER

See: `BUTLER_PYTHON_TRAINING.md` (created separately)

---

## 📊 PERFORMANCE OPTIMIZATION

### Faster Generation

**1. Use GPU (10x faster)**
- Install NVIDIA GPU with 6GB+ VRAM
- Update drivers

**2. Reduce context window**
In Butler app settings:
- Context: 2048 → 1024 tokens

**3. Use smaller model for simple tasks**
- Chat: `llama3.2:1b`
- Code: `llama3.2:3b`
- Complex: `llama3.1:8b`

---

## 🆘 GETTING HELP

### Official Resources
- **Ollama Docs**: https://github.com/ollama/ollama/tree/main/docs
- **Model Library**: https://ollama.ai/library
- **Discord**: https://discord.gg/ollama

### Check Logs

**Windows:**
```cmd
%LOCALAPPDATA%\Ollama\logs\server.log
```

**Mac:**
```bash
~/Library/Logs/Ollama/server.log
```

**Linux:**
```bash
journalctl -u ollama -f
```

---

## ✅ SUCCESS CHECKLIST

- [ ] Ollama installed and running (`ollama --version`)
- [ ] Model downloaded (`ollama list` shows llama3.2:3b)
- [ ] Test chat works (`ollama run llama3.2:3b`)
- [ ] PC IP address found (`ipconfig`/`ifconfig`)
- [ ] Firewall allows port 11434
- [ ] Mobile app shows ✅ CONNECTED (Ollama URL configured)
- [ ] Butler AI shows 🔒 LOCAL AI indicator
- [ ] Test script generation works

**Congratulations! You now have FREE, PRIVATE, UNLIMITED AI! 🎉**

---

## 🚀 NEXT STEPS

1. **Train Butler on Python**: See `BUTLER_PYTHON_TRAINING.md`
2. **Create custom models**: Use Ollama Modelfile
3. **Optimize performance**: Enable GPU, tune settings
4. **Backup models**: Export for other PCs

Enjoy your self-hosted AI! 🤖
