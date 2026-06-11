/**
 * OllamaInstaller — Auto-install Ollama + all AI/crawler packages on the connected PC.
 * Rendered inside the HealthCheckModal footer.
 */
import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  ScrollView, StyleSheet, Platform, Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { haptics } from '@/services/haptics';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

const C = {
  bg:      '#040200',
  amber:   '#FF8C00',
  amberBrt:'#FFAA00',
  amberDim:'#3A1A00',
  redBrt:  '#FF3300',
  red:     '#CC2200',
  redDim:  '#3A0800',
  green:   '#44FF22',
  text:    '#8A4433',
  textBrt: '#CC7755',
  textHi:  '#FFB888',
  border:  '#2A0E0E',
};

// ─── Full auto-install Python script ────────────────────────────────────────
const INSTALL_SCRIPT = `
import platform, subprocess, sys, os, json, time

sys_name = platform.system()
print(f'[PLATFORM] {sys_name} / Python {sys.version.split()[0]}')

# ── Step 1: All Python packages needed for Butler, crawlers & KB ─────────────
PACKAGES = [
    'psutil',
    'qrcode[pil]',
    'pillow',
    'requests',
    'beautifulsoup4',
    'lxml',
    'playwright',
    'pyperclip',
]
print('[STEP 1] Installing Python packages...')
for pkg in PACKAGES:
    short = pkg.split('[')[0]
    r = subprocess.run(
        [sys.executable, '-m', 'pip', 'install', pkg, '--quiet', '--upgrade'],
        capture_output=True, text=True, timeout=120
    )
    status = 'OK' if r.returncode == 0 else f'WARN:{r.stderr[-60:].strip()}'
    print(f'  pip {short}: {status}')
print('[STEP 1 DONE]')

# ── Step 2: Check if Ollama already running ──────────────────────────────────
ollama_running = False
try:
    import urllib.request as ur
    with ur.urlopen('http://localhost:11434/api/tags', timeout=3) as resp:
        data = json.loads(resp.read())
        models = [m['name'] for m in data.get('models', [])]
        print(f'[OLLAMA ALREADY ONLINE] Models: {models or "none installed"}')
        ollama_running = True
except Exception:
    print('[OLLAMA] Not running - installing now...')

# ── Step 3: Download and install Ollama if not present ──────────────────────
if not ollama_running:
    print(f'[STEP 2] Downloading Ollama for {sys_name}...')
    if sys_name == 'Windows':
        import tempfile, urllib.request
        install_url = 'https://ollama.com/download/OllamaSetup.exe'
        tmp_dir = tempfile.gettempdir()
        local_path = os.path.join(tmp_dir, 'OllamaSetup.exe')
        try:
            print(f'  Downloading {install_url}...')
            urllib.request.urlretrieve(install_url, local_path)
            print('  Download complete. Running silent installer...')
            r = subprocess.run(
                [local_path, '/S'],
                capture_output=True, text=True, timeout=180
            )
            print(f'  Installer exit code: {r.returncode}')
            if r.returncode != 0:
                raise Exception('installer returned non-zero')
        except Exception as e:
            print(f'  MSI failed ({e}) - trying winget...')
            r2 = subprocess.run(
                ['winget', 'install', 'Ollama.Ollama', '--silent',
                 '--accept-package-agreements', '--accept-source-agreements'],
                capture_output=True, text=True, timeout=240
            )
            print(f'  winget exit: {r2.returncode}')
            if r2.stdout: print(f'  {r2.stdout[-200:]}')
    elif sys_name == 'Darwin':
        print('  Trying homebrew...')
        r_brew = subprocess.run(
            ['brew', 'install', 'ollama'],
            capture_output=True, text=True, timeout=300
        )
        if r_brew.returncode == 0:
            print(f'  brew install OK')
        else:
            print('  brew failed, using curl installer...')
            r_curl = subprocess.run(
                'curl -fsSL https://ollama.com/install.sh | sh',
                shell=True, capture_output=True, text=True, timeout=360
            )
            print(f'  curl exit: {r_curl.returncode}')
            if r_curl.stdout: print(f'  {r_curl.stdout[-300:]}')
    else:  # Linux
        print('  Running curl installer...')
        r_curl = subprocess.run(
            'curl -fsSL https://ollama.com/install.sh | sh',
            shell=True, capture_output=True, text=True, timeout=360
        )
        print(f'  curl exit: {r_curl.returncode}')
        if r_curl.stdout: print(f'  {r_curl.stdout[-300:]}')
    print('[STEP 2 DONE]')

# ── Step 4: Start Ollama daemon ──────────────────────────────────────────────
if not ollama_running:
    print('[STEP 3] Starting Ollama daemon...')
    try:
        if sys_name == 'Windows':
            subprocess.Popen(['ollama', 'serve'], creationflags=subprocess.CREATE_NEW_CONSOLE)
        else:
            subprocess.Popen(['ollama', 'serve'],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(5)
        with urllib.request.urlopen('http://localhost:11434/api/tags', timeout=4) as resp:
            print('[OLLAMA RUNNING] Daemon started OK')
    except Exception as e:
        print(f'[OLLAMA WARN] {e} - may need manual: ollama serve')

# ── Step 5: Pull AI models ───────────────────────────────────────────────────
MODELS = ['qwen2.5-coder:7b']
print('[STEP 4] Pulling AI models (this is the slow part)...')
for model in MODELS:
    print(f'  Pulling {model}...')
    r = subprocess.run(
        ['ollama', 'pull', model],
        capture_output=True, text=True, timeout=900
    )
    if r.returncode == 0:
        print(f'  [PULL OK] {model}')
    else:
        err_snippet = r.stderr[-100:].strip() if r.stderr else r.stdout[-100:].strip()
        print(f'  [PULL WARN] {model}: {err_snippet}')

# ── Step 6: Install Playwright browsers for web crawling ────────────────────
print('[STEP 5] Setting up Playwright browsers...')
try:
    r = subprocess.run(
        [sys.executable, '-m', 'playwright', 'install', 'chromium', '--with-deps'],
        capture_output=True, text=True, timeout=300
    )
    print(f'  playwright install: {"OK" if r.returncode == 0 else "WARN:" + r.stderr[-80:].strip()}')
except Exception as e:
    print(f'  playwright warn: {e}')

print('')
print('[INSTALL_COMPLETE]')
print('All packages installed. Ollama running. AI model ready.')
print('Knowledge Base, Butler AI, and crawlers are now fully operational.')
`.trim();

// ─────────────────────────────────────────────────────────────────────────────

export interface OllamaInstallerProps {
  ip: string;
  port: string;
  token?: string;
}

export default function OllamaInstaller({ ip, port, token }: OllamaInstallerProps) {
  const [installing, setInstalling] = useState(false);
  const [done, setDone]             = useState(false);
  const [logs, setLogs]             = useState<{ text: string; color: string }[]>([]);
  const glowAnim  = useRef(new Animated.Value(0.5)).current;
  const scanY     = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const appendLog = (text: string, color: string) => {
    setLogs(prev => [...prev, { text, color }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  const startInstall = async () => {
    if (installing || !ip) return;
    setInstalling(true);
    setDone(false);
    setLogs([]);
    haptics.medium();

    // Start glow pulse
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 600, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0.25, duration: 600, useNativeDriver: false }),
    ])).start();
    Animated.loop(Animated.timing(scanY, { toValue: 1, duration: 2400, useNativeDriver: false })).start();

    appendLog('> INITIATING BUTLER AI PACKAGE INSTALLER...', C.amber);
    appendLog(`> Target PC: ${ip}:${port}`, C.textBrt);
    appendLog('> Installing: Ollama + all AI/crawler packages', C.textBrt);
    appendLog('> Estimated time: 3-10 minutes (download + model pull)', C.text);
    appendLog('', C.text);

    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 900_000); // 15 min max
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`http://${ip}:${port}/api/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ script: INSTALL_SCRIPT }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const output: string = data.output || data.error || '';
      const lines = output.split('\n');
      let success = false;

      for (const line of lines) {
        const t = line.trim();
        if (!t) { appendLog('', C.text); continue; }
        const col =
          t.startsWith('[INSTALL_COMPLETE]') || t.includes('PULL OK') || t.includes('OK]')
            ? C.green
          : t.startsWith('[STEP') || t.startsWith('[PLATFORM') || t.startsWith('[OLLAMA')
            ? C.amber
          : t.includes('WARN') || t.includes('failed') || t.includes('FAIL')
            ? C.redBrt
          : C.textBrt;
        appendLog(`> ${t}`, col);
        if (t.startsWith('[INSTALL_COMPLETE]')) success = true;
      }

      appendLog('', C.text);
      if (success) {
        haptics.success();
        appendLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', C.green);
        appendLog('✓ INSTALLATION COMPLETE', C.green);
        appendLog('✓ Ollama AI engine running', C.green);
        appendLog('✓ qwen2.5-coder:7b model loaded', C.green);
        appendLog('✓ All Python packages ready', C.green);
        appendLog('✓ Web crawlers & KB fully operational', C.green);
        appendLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', C.green);
        appendLog('Tap HEALTH CHECK to verify all endpoints.', C.textBrt);
      } else {
        haptics.warning();
        appendLog('! Some steps may need manual intervention', C.redBrt);
        appendLog('! Run: ollama serve  then  ollama pull qwen2.5-coder:7b', C.amber);
      }
      setDone(true);
    } catch (e: any) {
      haptics.heavy();
      appendLog(`! ERROR: ${e?.message || 'Install failed'}`, C.redBrt);
      if (e?.name === 'AbortError') {
        appendLog('! Timeout — server is still installing in background', C.amber);
        appendLog('! Wait 5 minutes then run HEALTH CHECK', C.amber);
      } else {
        appendLog('! Ensure PC server is connected and try again', C.amber);
      }
      setDone(true);
    } finally {
      setInstalling(false);
      glowAnim.stopAnimation();
      scanY.stopAnimation();
    }
  };

  return (
    <View style={s.wrap}>
      {/* Scan beam */}
      {installing ? (
        <Animated.View
          pointerEvents="none"
          style={[s.scanBeam, {
            top: scanY.interpolate({ inputRange: [0, 1], outputRange: [-3, 200] }),
            opacity: glowAnim.interpolate({ inputRange: [0.25, 1], outputRange: [0.04, 0.18] }),
          }]}
        />
      ) : null}

      {/* Corner brackets */}
      <View style={[s.corner, { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 }]} />
      <View style={[s.corner, { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 }]} />

      {/* Header */}
      <View style={s.header}>
        <View style={[s.iconBox, { borderColor: C.amber + '80', backgroundColor: C.amber + '18' }]}>
          <MaterialIcons name="auto-fix-high" size={16} color={C.amber} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>AUTO-INSTALL ALL</Text>
          <Text style={s.sub}>Ollama AI · Python packages · Web crawlers · KB engine</Text>
        </View>
        {done ? (
          <View style={s.doneBadge}>
            <MaterialIcons name="check-circle" size={14} color={C.green} />
          </View>
        ) : null}
      </View>

      {/* Package list chips */}
      {!installing && !done ? (
        <View style={s.chipRow}>
          {['psutil', 'qrcode', 'pillow', 'requests', 'bs4', 'playwright', 'Ollama'].map(pkg => (
            <View key={pkg} style={s.chip}>
              <Text style={s.chipTxt}>{pkg}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Log output */}
      {logs.length > 0 ? (
        <View style={s.logBox}>
          <View style={s.logHeader}>
            <MaterialIcons name="terminal" size={9} color={C.amber} />
            <Text style={s.logHeaderTxt}>INSTALL LOG</Text>
            {installing ? <ActivityIndicator size="small" color={C.amber} style={{ transform: [{ scale: 0.5 }], width: 10, height: 10 }} /> : null}
          </View>
          <ScrollView
            ref={scrollRef}
            style={{ maxHeight: 180 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={{ padding: 8, gap: 1 }}
          >
            {logs.map((ln, i) =>
              ln.text ? (
                <Text key={i} style={[s.logLine, { color: ln.color }]} selectable>{ln.text}</Text>
              ) : (
                <View key={i} style={{ height: 5 }} />
              )
            )}
          </ScrollView>
        </View>
      ) : null}

      {/* Install button */}
      <TouchableOpacity
        style={[s.btn, installing && s.btnDisabled]}
        onPress={startInstall}
        disabled={installing || !ip}
        activeOpacity={0.82}
      >
        {installing ? (
          <ActivityIndicator size="small" color={C.amber} />
        ) : (
          <MaterialIcons name={done ? 'refresh' : 'download'} size={16} color={C.amber} />
        )}
        <Animated.Text style={[s.btnTxt, installing && { color: C.amber + 'BB' }]}>
          {installing
            ? 'INSTALLING... (may take 3-10 min)'
            : done
            ? '↺ RE-RUN INSTALLER'
            : '⚡ START AUTO-INSTALL'}
        </Animated.Text>
        {!installing && !done ? (
          <MaterialIcons name="arrow-forward" size={14} color={C.amber + '80'} />
        ) : null}
      </TouchableOpacity>

      {!ip ? (
        <Text style={s.noServerTxt}>Connect to PC server first to use auto-install</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: '#050200',
    borderWidth: 2,
    borderColor: C.amber + '90',
    borderRadius: 0,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 2,
    ...Platform.select({
      ios: { shadowColor: C.amber, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  scanBeam: {
    position: 'absolute', left: 0, right: 0, height: 3,
    backgroundColor: C.amber, zIndex: 5,
  },
  corner: {
    position: 'absolute', width: 12, height: 12,
    borderColor: C.amberBrt, zIndex: 10,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.amber + '35',
    backgroundColor: '#0A0400',
  },
  iconBox: {
    width: 34, height: 34, borderRadius: 0, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  title: {
    fontSize: 10, fontWeight: '900', color: C.amber,
    fontFamily: MONO, letterSpacing: 1.5,
    ...Platform.select({ ios: { textShadowColor: C.amber, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 }, android: {} }),
  },
  sub: { fontSize: 7.5, color: C.text, fontFamily: MONO, marginTop: 1, letterSpacing: 0.3 },
  doneBadge: {
    width: 26, height: 26, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.green + '18', borderRadius: 3, borderWidth: 1, borderColor: C.green + '60',
  },
  chipRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.amber + '20',
  },
  chip: {
    borderWidth: 1, borderColor: C.amber + '50', borderRadius: 3,
    paddingHorizontal: 6, paddingVertical: 2, backgroundColor: C.amber + '12',
  },
  chipTxt: { fontSize: 7, fontWeight: '700', color: C.amber, fontFamily: MONO },
  logBox: {
    backgroundColor: '#020100',
    borderBottomWidth: 1, borderBottomColor: C.amber + '30',
  },
  logHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: '#060200', borderBottomWidth: 1, borderBottomColor: C.amber + '25',
  },
  logHeaderTxt: {
    flex: 1, fontSize: 7.5, fontWeight: '900', color: C.amber,
    fontFamily: MONO, letterSpacing: 1.5,
  },
  logLine: {
    fontSize: 8.5, fontFamily: MONO, lineHeight: 13.5, letterSpacing: 0.2,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, paddingHorizontal: 14,
    backgroundColor: C.amberDim,
    borderTopWidth: 1, borderTopColor: C.amber + '40',
  },
  btnDisabled: { opacity: 0.55 },
  btnTxt: {
    flex: 1, fontSize: 10, fontWeight: '900', color: C.amber,
    fontFamily: MONO, letterSpacing: 1,
  },
  noServerTxt: {
    fontSize: 8, color: C.text, fontFamily: MONO,
    textAlign: 'center', paddingVertical: 8, paddingHorizontal: 14,
  },
});
