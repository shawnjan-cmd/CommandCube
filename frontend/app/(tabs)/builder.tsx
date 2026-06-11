/**
 * ⚡ NEXUS SCRIPT BUILDER — Visual Node Pipeline Editor
 * Build automated scripts by connecting trigger/action/output nodes
 * Execute the assembled pipeline directly on your paired PC
 * Long-press any node card to see its description and Python code
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {

  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, Animated, Alert, ActivityIndicator, TextInput, Modal, Dimensions,
} from 'react-native';

const { width: SW } = Dimensions.get('window');
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { haptics } from '@/services/haptics';
import { serverConnection } from '@/services/serverConnection';
import { autoConnectEngine, EngineEvent } from '@/services/autoConnectEngine';
import { useFocusEffect } from 'expo-router';
import { saveButlerScript } from '@/services/butlerScripts';
import { LiveWidgetStudio } from '@/components/ui/LiveWidgetStudio';
import { WidgetLayer } from '@/components/ui/WidgetLayer';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// ─── PALETTE ─────────────────────────────────────────────────
const C = {
  bg:         '#000003',
  surface:    '#02070D',
  surfaceHi:  '#071120',
  border:     'rgba(0,255,255,0.12)',
  text:       '#D8E8F4',
  textDim:    '#3A5068',
  textMid:    '#7A9AB8',
  teal:       '#00FFFF',
  tealDim:    'rgba(0,255,255,0.08)',
  green:      '#00FF88',
  greenDim:   '#00FF8815',
  purple:     '#BF00FF',
  purpleDim:  '#BF00FF15',
  amber:      '#F5A623',
  amberDim:   '#F5A62315',
  red:        '#FF3131',
  redDim:     '#FF313115',
  blue:       '#4A9EFF',
  blueDim:    '#4A9EFF15',
  cyan:       '#00FFFF',
};

// ─── NODE TYPES ──────────────────────────────────────────────
type NodeType = 'TRIGGER' | 'ACTION' | 'OUTPUT';

interface NodeDef {
  id: string;
  name: string;
  description: string;
  type: NodeType;
  icon: string;
  iconLib: 'material' | 'community';
  color: string;
  code: string;
}

const NODE_PALETTE: NodeDef[] = [
  // ── TRIGGERS ──────────────────────────────────────────────
  {
    id: 'trigger_notify',
    name: 'System Notification',
    description: 'Fires a Windows toast notification',
    type: 'TRIGGER', icon: 'notifications', iconLib: 'material', color: C.teal,
    code: `import subprocess\nsubprocess.run(['powershell','-command','Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show("NEXUS triggered!", "NEXUS", 0, 64)'], capture_output=True)\nprint("Notification sent")`,
  },
  {
    id: 'trigger_schedule',
    name: 'Scheduled Trigger',
    description: 'Timestamps current execution time',
    type: 'TRIGGER', icon: 'schedule', iconLib: 'material', color: C.teal,
    code: `import time\nprint(f"Triggered at: {time.strftime('%H:%M:%S on %Y-%m-%d')}")`,
  },
  {
    id: 'trigger_startup',
    name: 'On PC Startup',
    description: 'Register script to run on Windows boot',
    type: 'TRIGGER', icon: 'power-settings-new', iconLib: 'material', color: C.teal,
    code: `import subprocess\nprint("Boot trigger: PC started")\nsubprocess.run(["reg", "add", "HKCU\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run", "/v", "NexusScript", "/t", "REG_SZ", "/d", "python nexus_boot.py", "/f"])`,
  },
  {
    id: 'trigger_file_watch',
    name: 'File Change Watch',
    description: 'Detects new files in a folder',
    type: 'TRIGGER', icon: 'folder-open', iconLib: 'material', color: C.teal,
    code: `import os, time\nwatch_folder = os.path.expanduser('~/Desktop')\nbefore = set(os.listdir(watch_folder))\ntime.sleep(3)\nafter = set(os.listdir(watch_folder))\nnew_files = after - before\nprint(f"New files: {new_files or 'none detected'}")`,
  },
  {
    id: 'trigger_time_check',
    name: 'Time-Based Condition',
    description: 'Check if current time is within range',
    type: 'TRIGGER', icon: 'access-time', iconLib: 'material', color: C.teal,
    code: `from datetime import datetime\nnow = datetime.now()\nhour = now.hour\nif 9 <= hour < 18:\n    print(f"Business hours ({hour}:00) - automation enabled")\nelse:\n    print(f"Off hours ({hour}:00) - automation skipped")`,
  },
  {
    id: 'trigger_cpu_threshold',
    name: 'CPU Threshold Alert',
    description: 'Trigger when CPU exceeds 80%',
    type: 'TRIGGER', icon: 'memory', iconLib: 'material', color: C.teal,
    code: `import psutil\ncpu = psutil.cpu_percent(interval=2)\nprint(f"CPU: {cpu}%")\nif cpu > 80:\n    print(f"ALERT: CPU is high at {cpu}%")\nelse:\n    print("CPU normal")`,
  },
  {
    id: 'trigger_disk_full',
    name: 'Disk Space Alert',
    description: 'Trigger when disk is over 85% full',
    type: 'TRIGGER', icon: 'storage', iconLib: 'material', color: C.teal,
    code: `import psutil\nfor disk in psutil.disk_partitions():\n    try:\n        u = psutil.disk_usage(disk.mountpoint)\n        if u.percent > 85:\n            print(f"ALERT: {disk.mountpoint} is {u.percent}% full ({u.free/1024**3:.1f}GB free)")\n        else:\n            print(f"{disk.mountpoint}: {u.percent}% used - OK")\n    except: pass`,
  },
  {
    id: 'trigger_battery_low',
    name: 'Battery Low Alert',
    description: 'Trigger when battery drops below 20%',
    type: 'TRIGGER', icon: 'battery-alert', iconLib: 'material', color: C.teal,
    code: `import psutil\nbatt = psutil.sensors_battery()\nif batt:\n    if batt.percent < 20 and not batt.power_plugged:\n        print(f"ALERT: Battery low at {batt.percent:.1f}% - please plug in")\n    else:\n        print(f"Battery: {batt.percent:.1f}% {'(charging)' if batt.power_plugged else ''}")\nelse:\n    print("No battery - desktop PC")`,
  },
  // ── ACTIONS — Cleaning ────────────────────────────────────
  {
    id: 'action_clean_temp',
    name: 'Clean Temp Files',
    description: 'Delete Windows temp files and free space',
    type: 'ACTION', icon: 'cleaning-services', iconLib: 'material', color: C.green,
    code: `import os, shutil\nremoved = 0; freed = 0\nfor path in [os.environ.get('TEMP',''), r'C:\\Windows\\Temp']:\n    if not path or not os.path.exists(path): continue\n    for f in os.listdir(path):\n        try:\n            fp = os.path.join(path, f)\n            size = os.path.getsize(fp) if os.path.isfile(fp) else 0\n            if os.path.isfile(fp): os.remove(fp); removed += 1; freed += size\n            elif os.path.isdir(fp): shutil.rmtree(fp, ignore_errors=True); removed += 1\n        except: pass\nprint(f"Removed {removed} items - {freed/1024/1024:.1f}MB freed")`,
  },
  {
    id: 'action_clear_browser_cache',
    name: 'Clear Browser Cache',
    description: 'Delete Chrome and Edge cache files',
    type: 'ACTION', icon: 'language', iconLib: 'material', color: C.green,
    code: `import os, glob\nfreed = 0\ncache_dirs = [\n    os.path.expandvars(r'%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Cache'),\n    os.path.expandvars(r'%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\Cache'),\n]\nfor d in cache_dirs:\n    if os.path.exists(d):\n        for f in glob.glob(os.path.join(d, '**', '*'), recursive=True):\n            try:\n                if os.path.isfile(f): freed += os.path.getsize(f); os.remove(f)\n            except: pass\nprint(f"Browser cache cleared: {freed/1024/1024:.1f}MB freed")`,
  },
  {
    id: 'action_empty_recycle',
    name: 'Empty Recycle Bin',
    description: 'Permanently clear the Recycle Bin',
    type: 'ACTION', icon: 'delete-sweep', iconLib: 'material', color: C.green,
    code: `import subprocess\nresult = subprocess.run(['powershell','-command','Clear-RecycleBin -Confirm:$false -ErrorAction SilentlyContinue'], capture_output=True, text=True)\nprint("Recycle Bin emptied" if result.returncode == 0 else "Done")`,
  },
  {
    id: 'action_memory_clean',
    name: 'Memory Optimizer',
    description: 'Free RAM by killing idle processes',
    type: 'ACTION', icon: 'memory', iconLib: 'material', color: C.green,
    code: `import psutil\nbefore = psutil.virtual_memory().percent\nkilled = 0\nfor proc in psutil.process_iter(['pid','name','memory_percent']):\n    try:\n        if proc.info.get('memory_percent',0) and proc.info['memory_percent'] < 0.1 and proc.info['name'] not in ['System','svchost.exe','explorer.exe']:\n            proc.kill(); killed += 1\n    except: pass\nafter = psutil.virtual_memory().percent\nprint(f"RAM: {before:.1f}% -> {after:.1f}% - {killed} idle processes terminated")`,
  },
  {
    id: 'action_privacy_clean',
    name: 'Privacy Cleaner',
    description: 'Clear recent docs, clipboard, search history',
    type: 'ACTION', icon: 'security', iconLib: 'material', color: C.green,
    code: `import subprocess, os\nsubprocess.run(['powershell','-command','Set-Clipboard -Value ""'], capture_output=True)\nrecent = os.path.expandvars(r'%APPDATA%\\Microsoft\\Windows\\Recent')\nif os.path.exists(recent):\n    for f in os.listdir(recent):\n        try: os.remove(os.path.join(recent, f))\n        except: pass\nprint("Clipboard cleared - Recent docs cleared - Privacy cleaned")`,
  },
  {
    id: 'action_clear_dns_cache',
    name: 'Clear DNS Cache',
    description: 'Flush Windows DNS resolver cache',
    type: 'ACTION', icon: 'dns', iconLib: 'material', color: C.green,
    code: `import subprocess\nresult = subprocess.run(['ipconfig','/flushdns'], capture_output=True, text=True)\nprint("DNS cache flushed" if result.returncode == 0 else result.stdout)\nresult2 = subprocess.run(['ipconfig','/displaydns'], capture_output=True, text=True)\nlines = [l for l in result2.stdout.split('\\n') if 'Record Name' in l]\nprint(f"Remaining cached records: {len(lines)}")`,
  },
  {
    id: 'action_clear_event_log',
    name: 'Clear Event Logs',
    description: 'Clear Windows Application event log',
    type: 'ACTION', icon: 'event-note', iconLib: 'material', color: C.green,
    code: `import subprocess\nresult = subprocess.run(['powershell','-command','Clear-EventLog -LogName Application -ErrorAction SilentlyContinue'], capture_output=True, text=True)\nprint("Application event log cleared" if result.returncode == 0 else "Done (may need admin)")`,
  },
  // ── ACTIONS — Organization ────────────────────────────────
  {
    id: 'action_organize_desktop',
    name: 'Organize Desktop',
    description: 'Sort Desktop files into type folders',
    type: 'ACTION', icon: 'dashboard', iconLib: 'material', color: C.amber,
    code: `import os, shutil\ndesk = os.path.expanduser('~/Desktop')\ncategories = {'Documents':['.pdf','.doc','.docx','.txt','.xlsx','.pptx','.csv'],'Images':['.jpg','.jpeg','.png','.gif','.bmp','.webp','.svg'],'Videos':['.mp4','.avi','.mkv','.mov','.wmv'],'Archives':['.zip','.rar','.7z','.tar','.gz'],'Scripts':['.py','.ps1','.bat','.sh'],'Installers':['.exe','.msi','.dmg']}\nmoved = 0\nfor fname in os.listdir(desk):\n    fp = os.path.join(desk, fname)\n    if not os.path.isfile(fp): continue\n    ext = os.path.splitext(fname)[1].lower()\n    for folder, exts in categories.items():\n        if ext in exts:\n            dest = os.path.join(desk, folder)\n            os.makedirs(dest, exist_ok=True)\n            shutil.move(fp, os.path.join(dest, fname)); moved += 1; break\nprint(f"Desktop organized: {moved} files sorted")`,
  },
  {
    id: 'action_sort_downloads',
    name: 'Sort Downloads Folder',
    description: 'Organize Downloads by file type into subfolders',
    type: 'ACTION', icon: 'sort', iconLib: 'material', color: C.amber,
    code: `import os, shutil\ndownloads = os.path.expanduser('~/Downloads')\ncats = {'Images':['.jpg','.png','.gif','.webp','.svg','.jpeg','.bmp'],'Videos':['.mp4','.mkv','.avi','.mov','.wmv'],'Documents':['.pdf','.doc','.docx','.txt','.xlsx','.csv','.pptx'],'Archives':['.zip','.rar','.7z','.tar','.gz'],'Installers':['.exe','.msi'],'Code':['.py','.js','.ts','.html','.css','.json']}\nmoved = 0\nfor fname in os.listdir(downloads):\n    fp = os.path.join(downloads, fname)\n    if not os.path.isfile(fp): continue\n    ext = os.path.splitext(fname)[1].lower()\n    for cat, exts in cats.items():\n        if ext in exts:\n            os.makedirs(os.path.join(downloads, cat), exist_ok=True)\n            shutil.move(fp, os.path.join(downloads, cat, fname)); moved += 1; break\nprint(f"Downloads sorted: {moved} files organized")`,
  },
  {
    id: 'action_find_duplicates',
    name: 'Find Duplicate Files',
    description: 'Detect duplicate files by MD5 hash',
    type: 'ACTION', icon: 'find-in-page', iconLib: 'material', color: C.amber,
    code: `import os, hashlib\nfrom pathlib import Path\nfolder = Path.home() / 'Downloads'\nhashes = {}; dupes = []\nfor f in folder.rglob('*'):\n    if not f.is_file() or f.stat().st_size < 1024: continue\n    try:\n        h = hashlib.md5(f.read_bytes()[:65536]).hexdigest()\n        if h in hashes: dupes.append((str(f), str(hashes[h])))\n        else: hashes[h] = f\n    except: pass\nprint(f"Duplicates found: {len(dupes)}")\nfor d, orig in dupes[:5]: print(f"  DUPE: {Path(d).name}")`,
  },
  {
    id: 'action_find_old_files',
    name: 'Find Old Files',
    description: 'List files older than 90 days in Downloads',
    type: 'ACTION', icon: 'history', iconLib: 'material', color: C.amber,
    code: `import os, time\nfrom pathlib import Path\nfolder = Path.home() / 'Downloads'\ncutoff = time.time() - (90 * 86400)\nold = [(f, f.stat().st_size) for f in folder.iterdir() if f.is_file() and f.stat().st_mtime < cutoff]\nold.sort(key=lambda x: -x[1])\nprint(f"Files older than 90 days: {len(old)}")\nfor f, size in old[:10]: print(f"  {f.name} ({size/1024/1024:.1f}MB)")`,
  },
  {
    id: 'action_remove_empty_folders',
    name: 'Remove Empty Folders',
    description: 'Delete all empty directories from Downloads',
    type: 'ACTION', icon: 'folder-off', iconLib: 'material', color: C.amber,
    code: `import os\nfolder = os.path.expanduser('~/Downloads')\nremoved = 0\nfor dirpath, dirnames, filenames in os.walk(folder, topdown=False):\n    if dirpath == folder: continue\n    try:\n        if not os.listdir(dirpath): os.rmdir(dirpath); removed += 1\n    except: pass\nprint(f"Empty folders removed: {removed}")`,
  },
  {
    id: 'action_batch_rename',
    name: 'Batch Rename Files',
    description: 'Add timestamp prefix to Desktop files',
    type: 'ACTION', icon: 'edit', iconLib: 'material', color: C.amber,
    code: `import os, datetime\nfolder = os.path.expanduser('~/Desktop')\nts = datetime.datetime.now().strftime('%Y%m%d_')\nrenamed = 0\nfor fname in os.listdir(folder):\n    fp = os.path.join(folder, fname)\n    if os.path.isfile(fp) and not fname.startswith(ts):\n        try:\n            os.rename(fp, os.path.join(folder, ts + fname)); renamed += 1\n        except: pass\nprint(f"Renamed {renamed} files with timestamp prefix")`,
  },
  {
    id: 'action_compress_folder',
    name: 'Compress Folder to ZIP',
    description: 'Archive Documents folder as ZIP backup',
    type: 'ACTION', icon: 'archive', iconLib: 'material', color: C.amber,
    code: `import shutil, os, datetime\nsource = os.path.expanduser('~/Documents')\nts = datetime.datetime.now().strftime('%Y%m%d_%H%M')\noutput = os.path.expanduser(f'~/Desktop/Documents_backup_{ts}')\nshutil.make_archive(output, 'zip', source)\nsize = os.path.getsize(output + '.zip')\nprint(f"Compressed to: {output}.zip ({size/1024/1024:.1f}MB)")`,
  },
  // ── ACTIONS — System Info ─────────────────────────────────
  {
    id: 'action_fetch_api',
    name: 'Fetch API Data',
    description: 'GET request to any REST endpoint',
    type: 'ACTION', icon: 'cloud-download', iconLib: 'material', color: C.blue,
    code: `import requests\nurl = "https://api.github.com/repos/python/cpython"\nresponse = requests.get(url, timeout=10)\nif response.ok:\n    data = response.json()\n    print(f"GitHub CPython: {data.get('full_name','N/A')}")\n    print(f"Stars: {data.get('stargazers_count','?')} - Forks: {data.get('forks_count','?')}")\nelse:\n    print(f"HTTP {response.status_code}")`,
  },
  {
    id: 'action_check_storage',
    name: 'Check Storage',
    description: 'Show disk usage for all drives',
    type: 'ACTION', icon: 'storage', iconLib: 'material', color: C.blue,
    code: `import psutil\nfor disk in psutil.disk_partitions():\n    try:\n        usage = psutil.disk_usage(disk.mountpoint)\n        bar = '#' * int(usage.percent/5) + '.' * (20-int(usage.percent/5))\n        print(f"{disk.mountpoint} [{bar}] {usage.percent:.1f}%  {usage.free/1024**3:.1f}GB free")\n    except: pass`,
  },
  {
    id: 'action_battery',
    name: 'Battery Status',
    description: 'Laptop battery level and charge rate',
    type: 'ACTION', icon: 'battery-full', iconLib: 'material', color: C.amber,
    code: `import psutil\nbatt = psutil.sensors_battery()\nif batt:\n    status = 'Charging' if batt.power_plugged else 'Discharging'\n    mins = int(batt.secsleft/60) if batt.secsleft != psutil.POWER_TIME_UNLIMITED else None\n    print(f"Battery: {batt.percent:.1f}% - {status}")\n    if mins: print(f"Time remaining: {mins//60}h {mins%60}m")\nelse:\n    print("Desktop PC - no battery detected")`,
  },
  {
    id: 'action_network',
    name: 'Network Check',
    description: 'IP, ping, and bandwidth stats',
    type: 'ACTION', icon: 'wifi', iconLib: 'material', color: C.blue,
    code: `import socket, subprocess, psutil\nhostname = socket.gethostname()\nip = socket.gethostbyname(hostname)\nping = subprocess.run(['ping','-n','2','8.8.8.8'], capture_output=True, text=True)\nnet = psutil.net_io_counters()\nprint(f"Host: {hostname} | IP: {ip}")\nprint(f"Sent: {net.bytes_sent/1024/1024:.1f}MB | Recv: {net.bytes_recv/1024/1024:.1f}MB")\nlines = [l for l in ping.stdout.split('\\n') if 'Average' in l]\nif lines: print(f"Ping: {lines[0].strip()}")`,
  },
  {
    id: 'action_cpu',
    name: 'CPU Monitor',
    description: 'Sample CPU usage across all cores',
    type: 'ACTION', icon: 'memory', iconLib: 'material', color: C.blue,
    code: `import psutil, time\nreadings = [psutil.cpu_percent(interval=1) for _ in range(3)]\navg = sum(readings)/len(readings)\nprint(f"CPU Average: {avg:.1f}%")\nprint(f"Cores: {psutil.cpu_count(logical=False)} physical / {psutil.cpu_count()} logical")\ncpu_freq = psutil.cpu_freq()\nif cpu_freq: print(f"Freq: {cpu_freq.current:.0f}MHz (max {cpu_freq.max:.0f}MHz)")`,
  },
  {
    id: 'action_process',
    name: 'Top Processes',
    description: 'Show top CPU-using processes',
    type: 'ACTION', icon: 'apps', iconLib: 'material', color: C.purple,
    code: `import psutil\nprocs = sorted([p.info for p in psutil.process_iter(['pid','name','cpu_percent','memory_percent']) if p.info], key=lambda x: x.get('cpu_percent',0) or 0, reverse=True)\nprint("TOP 10 PROCESSES BY CPU:")\nfor p in procs[:10]:\n    print(f"  [{p['pid']}] {p['name']:<25} CPU:{p.get('cpu_percent',0):.1f}%  MEM:{p.get('memory_percent',0):.1f}%")`,
  },
  {
    id: 'action_system_info',
    name: 'Full System Info',
    description: 'OS, hardware, and uptime report',
    type: 'ACTION', icon: 'info', iconLib: 'material', color: C.blue,
    code: `import platform, psutil, datetime\nos_info = platform.uname()\nboot = datetime.datetime.fromtimestamp(psutil.boot_time())\nuptime = datetime.datetime.now() - boot\nram = psutil.virtual_memory()\nprint(f"OS: {os_info.system} {os_info.release}")\nprint(f"Host: {os_info.node} | CPU: {os_info.processor[:40]}")\nprint(f"RAM: {ram.total/1024**3:.1f}GB total | {ram.available/1024**3:.1f}GB free")\nprint(f"Uptime: {str(uptime).split('.')[0]}")`,
  },
  {
    id: 'action_startup_manager',
    name: 'Startup Manager',
    description: 'List all Windows startup programs',
    type: 'ACTION', icon: 'launch', iconLib: 'material', color: C.blue,
    code: `import subprocess\nresult = subprocess.run(['reg', 'query', r'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'], capture_output=True, text=True)\nlines = [l.strip() for l in result.stdout.split('\\n') if l.strip() and 'REG_SZ' in l]\nprint(f"Startup programs ({len(lines)} total):")\nfor l in lines:\n    parts = l.split('REG_SZ')\n    if len(parts) >= 2: print(f"  - {parts[0].strip()} -> {parts[1].strip()[:60]}")`,
  },
  {
    id: 'action_disk_report',
    name: 'Disk Space Report',
    description: 'Detailed disk usage breakdown per drive',
    type: 'ACTION', icon: 'pie-chart', iconLib: 'material', color: C.blue,
    code: `import psutil\nfrom pathlib import Path\nfor disk in psutil.disk_partitions():\n    try:\n        u = psutil.disk_usage(disk.mountpoint)\n        print(f"Drive {disk.mountpoint}: {disk.fstype}")\n        print(f"  Total: {u.total/1024**3:.1f}GB | Used: {u.used/1024**3:.1f}GB ({u.percent}%) | Free: {u.free/1024**3:.1f}GB")\n    except: pass`,
  },
  {
    id: 'action_list_large_files',
    name: 'Find Large Files',
    description: 'List files over 100MB in home folder',
    type: 'ACTION', icon: 'folder-special', iconLib: 'material', color: C.blue,
    code: `from pathlib import Path\nhome = Path.home()\nlarge = []\nfor f in home.rglob('*'):\n    try:\n        if f.is_file() and f.stat().st_size > 100*1024*1024:\n            large.append((f, f.stat().st_size))\n    except: pass\nlarge.sort(key=lambda x: -x[1])\nprint(f"Files over 100MB: {len(large)}")\nfor f, s in large[:10]:\n    print(f"  {f.name}: {s/1024/1024:.1f}MB")`,
  },
  {
    id: 'action_installed_programs',
    name: 'List Installed Programs',
    description: 'Show all installed Windows applications',
    type: 'ACTION', icon: 'apps', iconLib: 'material', color: C.blue,
    code: `import subprocess\nresult = subprocess.run(['powershell','-command','Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, DisplayVersion | Sort-Object DisplayName | Format-Table -AutoSize'], capture_output=True, text=True)\nlines = [l for l in result.stdout.split('\\n') if l.strip() and '---' not in l]\nprint(f"Installed programs ({len(lines)-2}):")\nfor line in lines[:20]: print(f"  {line.strip()}")`,
  },
  // ── ACTIONS — Performance ─────────────────────────────────
  {
    id: 'action_latency',
    name: 'Latency Check',
    description: 'Ping multiple servers for speed',
    type: 'ACTION', icon: 'speed', iconLib: 'material', color: C.cyan,
    code: `import subprocess, time\nfor target in ['8.8.8.8','1.1.1.1','google.com','github.com']:\n    t0 = time.time()\n    res = subprocess.run(['ping','-n','2',target], capture_output=True, text=True)\n    ms = (time.time()-t0)*1000/2\n    ok = 'OK' if res.returncode == 0 else 'FAIL'\n    print(f"  {ok} {target:<20} {ms:.0f}ms")`,
  },
  {
    id: 'action_boost_performance',
    name: 'Performance Boost',
    description: 'Set High Performance power plan',
    type: 'ACTION', icon: 'bolt', iconLib: 'material', color: C.cyan,
    code: `import subprocess\nresult = subprocess.run(['powercfg','-setactive','8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'], capture_output=True, text=True)\nprint("High Performance power plan activated" if result.returncode == 0 else f"Already set or error: {result.stderr.strip()}")`,
  },
  {
    id: 'action_network_reset',
    name: 'Network Stack Reset',
    description: 'Flush DNS, reset Winsock, renew IP',
    type: 'ACTION', icon: 'wifi-off', iconLib: 'material', color: C.cyan,
    code: `import subprocess\nprint("Flushing DNS cache...")\nsubprocess.run(['ipconfig','/flushdns'], capture_output=True)\nprint("Resetting Winsock...")\nsubprocess.run(['netsh','winsock','reset'], capture_output=True)\nprint("Releasing and renewing IP...")\nsubprocess.run(['ipconfig','/release'], capture_output=True)\nsubprocess.run(['ipconfig','/renew'], capture_output=True)\nprint("Network stack reset complete")`,
  },
  {
    id: 'action_windows_update',
    name: 'Check Windows Updates',
    description: 'List available Windows updates',
    type: 'ACTION', icon: 'system-update', iconLib: 'material', color: C.cyan,
    code: `import subprocess\nresult = subprocess.run(['powershell','-command','(New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher().Search("IsInstalled=0 and Type=\'Software\'").Updates | Select-Object -ExpandProperty Title'], capture_output=True, text=True)\nprint(result.stdout[:2000] or "No pending updates found")`,
  },
  {
    id: 'action_driver_check',
    name: 'Driver Status Check',
    description: 'Find outdated or failing drivers',
    type: 'ACTION', icon: 'devices', iconLib: 'material', color: C.cyan,
    code: `import subprocess\nresult = subprocess.run(['powershell','-command','Get-WmiObject Win32_PnPSignedDriver | Where-Object {$_.DriverDate -lt (Get-Date).AddYears(-3)} | Select-Object DeviceName, DriverDate, DriverVersion | Format-Table -AutoSize'], capture_output=True, text=True)\nprint(result.stdout[:2000] or "All drivers appear up to date")`,
  },
  {
    id: 'action_open_ports',
    name: 'Scan Open Ports',
    description: 'List all open TCP/UDP ports on the PC',
    type: 'ACTION', icon: 'router', iconLib: 'material', color: C.cyan,
    code: `import subprocess\nresult = subprocess.run(['powershell','-command','Get-NetTCPConnection -State Listen | Select-Object LocalPort, OwningProcess | Sort-Object LocalPort | Format-Table -AutoSize'], capture_output=True, text=True)\nprint(result.stdout[:2000] or "No open ports found")`,
  },
  {
    id: 'action_speed_test',
    name: 'Speed Test',
    description: 'Test download speed to major servers',
    type: 'ACTION', icon: 'network-check', iconLib: 'material', color: C.cyan,
    code: `import urllib.request, time\nurls = [('Cloudflare','https://speed.cloudflare.com/__down?bytes=1000000'),('Google','https://www.google.com')]\nfor name, url in urls:\n    try:\n        start = time.time()\n        with urllib.request.urlopen(url, timeout=10) as r: data = r.read()\n        elapsed = time.time() - start\n        mbps = (len(data) / 1024 / 1024) / elapsed\n        print(f"{name}: {mbps:.2f} MB/s ({elapsed*1000:.0f}ms)")\n    except Exception as e:\n        print(f"{name}: failed - {e}")`,
  },
  // ── ACTIONS — Security ────────────────────────────────────
  {
    id: 'action_security_scan',
    name: 'Security Quick Scan',
    description: 'Windows Defender status and suspicious processes',
    type: 'ACTION', icon: 'security', iconLib: 'material', color: C.red,
    code: `import subprocess, psutil\nresult = subprocess.run(['powershell','-command','Get-MpComputerStatus | Select-Object AntivirusEnabled,RealTimeProtectionEnabled,LastQuickScanAge | Format-List'], capture_output=True, text=True)\nprint(result.stdout or "Windows Defender status unavailable")\nfor proc in psutil.process_iter(['name','exe']):\n    try:\n        exe = proc.info.get('exe') or ''\n        if exe and 'AppData\\\\Roaming' in exe: print(f"[WARN] Suspicious: {proc.info['name']} - {exe}")\n    except: pass`,
  },
  {
    id: 'action_clipboard',
    name: 'Clipboard Reader',
    description: 'Read and display clipboard contents',
    type: 'ACTION', icon: 'content-paste', iconLib: 'material', color: C.green,
    code: `import subprocess\nresult = subprocess.run(['powershell','-command','Get-Clipboard'], capture_output=True, text=True)\nclip = result.stdout.strip()\nprint(f"Clipboard ({len(clip)} chars):")\nprint(clip[:1000] if clip else '(empty)')`,
  },
  {
    id: 'action_fix_permissions',
    name: 'Fix File Permissions',
    description: 'Reset permissions on Desktop files',
    type: 'ACTION', icon: 'lock-open', iconLib: 'material', color: C.red,
    code: `import os, subprocess, getpass\ndesktop = os.path.expanduser('~/Desktop')\nusername = getpass.getuser()\nresult = subprocess.run(['icacls', desktop, '/grant', f'{username}:(OI)(CI)F', '/T', '/Q'], capture_output=True, text=True)\nprint(f"Permissions fixed on Desktop: {result.returncode == 0}")`,
  },
  {
    id: 'action_firewall_rules',
    name: 'List Firewall Rules',
    description: 'Show active Windows Firewall rules',
    type: 'ACTION', icon: 'gavel', iconLib: 'material', color: C.red,
    code: `import subprocess\nresult = subprocess.run(['powershell','-command','Get-NetFirewallRule | Where-Object {$_.Enabled -eq "True" -and $_.Action -eq "Allow"} | Select-Object DisplayName, Direction | Format-Table -AutoSize'], capture_output=True, text=True)\nlines = result.stdout.split('\\n')[:25]\nprint('\\n'.join(lines))`,
  },
  {
    id: 'action_check_passwords',
    name: 'Check Saved Passwords',
    description: 'List credential manager entries (no values)',
    type: 'ACTION', icon: 'vpn-key', iconLib: 'material', color: C.red,
    code: `import subprocess\nresult = subprocess.run(['cmdkey','/list'], capture_output=True, text=True)\nentries = [l.strip() for l in result.stdout.split('\\n') if 'Target:' in l]\nprint(f"Saved credentials: {len(entries)}")\nfor e in entries:\n    print(f"  {e}")`,
  },
  // ── ACTIONS — Automation ──────────────────────────────────
  {
    id: 'action_git_push',
    name: 'Git Auto-Push',
    description: 'Stage all changes and push to remote',
    type: 'ACTION', icon: 'code', iconLib: 'material', color: C.amber,
    code: `import subprocess, os, datetime\nrepo_path = os.path.expanduser('~/Documents')\nos.chdir(repo_path)\ncommit_msg = f"Auto-commit: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}"\nsubprocess.run(['git', 'add', '-A'], capture_output=True, text=True)\nresult_commit = subprocess.run(['git', 'commit', '-m', commit_msg], capture_output=True, text=True)\nresult_push = subprocess.run(['git', 'push'], capture_output=True, text=True)\nprint(f"Git: {'Pushed OK' if result_push.returncode==0 else 'Failed'}")\nprint(result_push.stdout or result_push.stderr)`,
  },
  {
    id: 'action_screenshot',
    name: 'Screenshot Capture',
    description: 'Take a screenshot and save to Desktop',
    type: 'ACTION', icon: 'screenshot', iconLib: 'material', color: C.purple,
    code: `import subprocess, os, datetime\nts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')\ndesktop = os.path.expanduser(f'~/Desktop/screenshot_{ts}.png')\nresult = subprocess.run(['powershell','-command',f'Add-Type -AssemblyName System.Windows.Forms; $bmp = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen(0,0,0,0,$bmp.Size); $bmp.Save("{desktop}")'], capture_output=True, text=True)\nprint(f"Screenshot saved: {desktop}" if os.path.exists(desktop) else "Screenshot failed")`,
  },
  {
    id: 'action_backup_files',
    name: 'Backup Documents',
    description: 'Copy Documents folder to a backup on Desktop',
    type: 'ACTION', icon: 'backup', iconLib: 'material', color: C.blue,
    code: `import shutil, os, datetime\nsource = os.path.expanduser('~/Documents')\nts = datetime.datetime.now().strftime('%Y%m%d_%H%M')\ndest = os.path.expanduser(f'~/Desktop/Backup_Documents_{ts}')\nprint(f"Backing up to: {dest}")\nshutil.copytree(source, dest, ignore=shutil.ignore_patterns('*.tmp','~*','Thumbs.db'))\nsize = sum(f.stat().st_size for f in os.scandir(dest) if f.is_file())\nprint(f"Backup complete: {size/1024/1024:.1f}MB copied")`,
  },
  {
    id: 'action_kill_process',
    name: 'Kill Process by Name',
    description: 'Terminate all instances of a process',
    type: 'ACTION', icon: 'cancel', iconLib: 'material', color: C.red,
    code: `import psutil\nprocess_name = 'notepad.exe'  # Change to target\nkilled = 0\nfor proc in psutil.process_iter(['name','pid']):\n    try:\n        if proc.info['name'].lower() == process_name.lower():\n            proc.terminate(); killed += 1\n    except: pass\nprint(f"Killed {killed} instance(s) of {process_name}")`,
  },
  {
    id: 'action_monitor_folder',
    name: 'Folder Size Monitor',
    description: 'Calculate total size and count of a folder',
    type: 'ACTION', icon: 'folder', iconLib: 'material', color: C.amber,
    code: `from pathlib import Path\nfolder = Path.home() / 'Documents'\ntotal = sum(f.stat().st_size for f in folder.rglob('*') if f.is_file())\nfile_count = sum(1 for f in folder.rglob('*') if f.is_file())\ndir_count = sum(1 for f in folder.rglob('*') if f.is_dir())\nprint(f"Folder: {folder}")\nprint(f"Size: {total/1024/1024:.1f}MB | Files: {file_count} | Subfolders: {dir_count}")`,
  },
  {
    id: 'action_env_check',
    name: 'Python Environment Check',
    description: 'List Python version and installed packages',
    type: 'ACTION', icon: 'settings-applications', iconLib: 'material', color: C.cyan,
    code: `import sys, subprocess\nresult = subprocess.run([sys.executable,'-m','pip','list','--format=columns'], capture_output=True, text=True)\npackages = result.stdout.strip().split('\\n')\nprint(f"Python: {sys.version.split()[0]} | Packages: {len(packages)-2}")\nfor pkg in packages[:15]: print(f"  {pkg}")\nif len(packages) > 17: print(f"  ... +{len(packages)-17} more")`,
  },
  {
    id: 'action_auto_email',
    name: 'Send Email Report',
    description: 'Email system stats to yourself',
    type: 'ACTION', icon: 'email', iconLib: 'material', color: C.purple,
    code: `import smtplib, os, psutil, platform\nfrom email.mime.text import MIMEText\nto_addr = os.environ.get('NEXUS_EMAIL_TO', '')\nif not to_addr:\n    print("Set NEXUS_EMAIL_TO environment variable to enable email")\nelse:\n    ram = psutil.virtual_memory()\n    body = f"NEXUS Report\\nHost: {platform.node()}\\nCPU: {psutil.cpu_percent(1)}%\\nRAM: {ram.used/1024**3:.1f}/{ram.total/1024**3:.1f}GB"\n    msg = MIMEText(body)\n    msg['Subject'] = 'NEXUS Automation Report'\n    msg['To'] = to_addr\n    print(f"Email ready for: {to_addr}")`,
  },
  {
    id: 'action_web_scrape',
    name: 'Web Page Scraper',
    description: 'Fetch and extract text from a webpage',
    type: 'ACTION', icon: 'language', iconLib: 'material', color: C.purple,
    code: `import urllib.request\nurl = "https://docs.python.org/3/"\ntry:\n    with urllib.request.urlopen(url, timeout=10) as r:\n        html = r.read().decode('utf-8')\n    import re\n    text = re.sub('<[^>]+>', ' ', html)\n    text = ' '.join(text.split())[:500]\n    print(f"Fetched {len(html)} chars from {url}")\n    print(f"Text preview: {text}")\nexcept Exception as e:\n    print(f"Error: {e}")`,
  },
  {
    id: 'action_auto_type',
    name: 'Auto Type Text',
    description: 'Automatically type text using keyboard',
    type: 'ACTION', icon: 'keyboard', iconLib: 'material', color: C.purple,
    code: `import subprocess\ntext_to_type = "Hello from NEXUS Automation!"\ntry:\n    import pyautogui\n    import time\n    time.sleep(2)  # Give you time to click a text field\n    pyautogui.typewrite(text_to_type, interval=0.05)\n    print(f"Typed: {text_to_type}")\nexcept ImportError:\n    print("Run: pip install pyautogui\\nThen re-run this script")`,
  },
  {
    id: 'action_schedule_task',
    name: 'Create Scheduled Task',
    description: 'Register a Windows Task Scheduler entry',
    type: 'ACTION', icon: 'alarm', iconLib: 'material', color: C.cyan,
    code: `import subprocess\ntask_name = "NexusAutoTask"\nscript_path = r"C:\\Users\\Public\\nexus_auto.py"\ntrigger = '/sc DAILY /st 09:00'\nresult = subprocess.run(['schtasks','/create','/tn',task_name,'/tr',f'python "{script_path}"','/sc','DAILY','/st','09:00','/f'], capture_output=True, text=True)\nprint(f"Scheduled task '{task_name}': {'Created' if result.returncode==0 else 'Failed'}")\nprint(result.stdout or result.stderr)`,
  },
  {
    id: 'action_monitor_log',
    name: 'Monitor Log File',
    description: 'Read last 20 lines of a log file',
    type: 'ACTION', icon: 'list-alt', iconLib: 'material', color: C.teal,
    code: `import os\nfrom pathlib import Path\nlog_paths = list(Path.home().rglob('*.log'))[:3]\nfor lp in log_paths:\n    try:\n        with open(lp, 'r', errors='ignore') as f:\n            lines = f.readlines()\n        print(f"\\n=== {lp.name} (last 5 lines) ===")\n        for l in lines[-5:]: print(l.rstrip())\n    except: pass\nif not log_paths: print("No .log files found in home directory")`,
  },
  {
    id: 'action_cpu_history',
    name: 'CPU Load History',
    description: 'Sample CPU every second for 10 seconds',
    type: 'ACTION', icon: 'show-chart', iconLib: 'material', color: C.cyan,
    code: `import psutil, time\nprint("Sampling CPU for 10 seconds...")\nsamples = []\nfor i in range(10):\n    pct = psutil.cpu_percent(interval=1)\n    bar = '#' * int(pct/5) + '.' * (20-int(pct/5))\n    print(f"  [{i+1:2}s] [{bar}] {pct:.1f}%")\n    samples.append(pct)\nprint(f"\\nAvg: {sum(samples)/len(samples):.1f}% | Peak: {max(samples):.1f}% | Min: {min(samples):.1f}%")`,
  },
  // ── OUTPUTS ───────────────────────────────────────────────
  {
    id: 'output_log_console',
    name: 'Log to Console',
    description: 'Print pipeline completion to output',
    type: 'OUTPUT', icon: 'terminal', iconLib: 'material', color: C.purple,
    code: `import datetime\nprint("=" * 44)\nprint("NEXUS PIPELINE COMPLETE")\nprint(f"Time: {datetime.datetime.now().strftime('%H:%M:%S')}")\nprint("=" * 44)`,
  },
  {
    id: 'output_perf_snapshot',
    name: 'Performance Report',
    description: 'Print full system performance summary',
    type: 'OUTPUT', icon: 'bar-chart', iconLib: 'material', color: C.purple,
    code: `import psutil, datetime\nprint(f"NEXUS PERF SNAPSHOT @ {datetime.datetime.now().strftime('%H:%M:%S')}")\nprint(f"CPU: {psutil.cpu_percent(interval=1)}%")\nmem = psutil.virtual_memory()\nprint(f"RAM: {mem.used/1024**3:.1f}/{mem.total/1024**3:.1f}GB ({mem.percent}%)")\nfor disk in psutil.disk_partitions():\n    try:\n        d = psutil.disk_usage(disk.mountpoint)\n        print(f"Disk {disk.mountpoint}: {d.percent}% ({d.free/1024**3:.1f}GB free)")\n    except: pass`,
  },
  {
    id: 'output_save_file',
    name: 'Save Output to File',
    description: 'Write results to a text file on Desktop',
    type: 'OUTPUT', icon: 'save', iconLib: 'material', color: C.purple,
    code: `import os, datetime\ndesktop = os.path.expanduser('~/Desktop')\nts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')\nfp = os.path.join(desktop, f'nexus_output_{ts}.txt')\nwith open(fp, 'w') as f:\n    f.write(f"NEXUS Pipeline Output\\n")\n    f.write(f"Generated: {datetime.datetime.now().isoformat()}\\n")\n    f.write("Pipeline executed successfully.\\n")\nprint(f"Report saved: {fp}")`,
  },
  {
    id: 'output_notify_toast',
    name: 'Desktop Notification',
    description: 'Show Windows toast popup on completion',
    type: 'OUTPUT', icon: 'notifications-active', iconLib: 'material', color: C.teal,
    code: `import subprocess\nsubprocess.run(['powershell','-command','Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show("NEXUS Pipeline Complete!", "NEXUS Automation", 0, 64)'], capture_output=True)\nprint("Desktop notification sent")`,
  },
  {
    id: 'output_email_report',
    name: 'Email Report',
    description: 'Send completion email via SMTP',
    type: 'OUTPUT', icon: 'email', iconLib: 'material', color: C.teal,
    code: `import os\nto_addr = os.environ.get('NEXUS_EMAIL_TO', '')\nif not to_addr:\n    print("Set NEXUS_EMAIL_TO env var to enable email reports")\nelse:\n    print(f"Email report configured for: {to_addr}")\n    print("Pipeline complete - email would be sent here")`,
  },
  {
    id: 'output_csv_export',
    name: 'Export CSV Report',
    description: 'Save system data as CSV on Desktop',
    type: 'OUTPUT', icon: 'table-chart', iconLib: 'material', color: C.purple,
    code: `import csv, os, datetime, psutil\ndesktop = os.path.expanduser('~/Desktop')\nts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')\nfp = os.path.join(desktop, f'nexus_data_{ts}.csv')\nwith open(fp, 'w', newline='') as f:\n    w = csv.writer(f)\n    w.writerow(['Metric','Value','Timestamp'])\n    w.writerow(['CPU%', psutil.cpu_percent(interval=1), ts])\n    mem = psutil.virtual_memory()\n    w.writerow(['RAM%', mem.percent, ts])\n    w.writerow(['RAM_Free_GB', round(mem.available/1024**3,2), ts])\nprint(f"CSV exported: {fp}")`,
  },
  {
    id: 'output_open_folder',
    name: 'Open Results Folder',
    description: 'Open Desktop in Windows Explorer',
    type: 'OUTPUT', icon: 'folder-open', iconLib: 'material', color: C.teal,
    code: `import subprocess, os\ndesktop = os.path.expanduser('~/Desktop')\nsubprocess.Popen(['explorer', desktop])\nprint(f"Opened folder: {desktop}")`,
  },
  {
    id: 'output_play_sound',
    name: 'Play Completion Sound',
    description: 'Play a beep sound on pipeline completion',
    type: 'OUTPUT', icon: 'volume-up', iconLib: 'material', color: C.teal,
    code: `import subprocess\nsubprocess.run(['powershell','-command','[console]::beep(800,200); [console]::beep(1000,300)'], capture_output=True)\nprint("Completion sound played")`,
  },
];

// FIX 6 — validate generated Python before execution/save
function isValidPythonCode(code: string): boolean {
  if (!code || code.trim().length < 10) return false;
  return [
    /^import\s+\w/m, /^from\s+\w/m, /^def\s+\w/m, /^class\s+\w/m,
    /^print\s*\(/m, /#.*python/im,
  ].some(r => r.test(code));
}

const TYPE_CONFIG: Record<NodeType, { color: string; label: string; bg: string }> = {
  TRIGGER: { color: C.teal,   label: 'TRIGGER', bg: C.tealDim   },
  ACTION:  { color: C.green,  label: 'ACTION',  bg: C.greenDim  },
  OUTPUT:  { color: C.purple, label: 'OUTPUT',  bg: C.purpleDim },
};

// ─── CANVAS NODE ─────────────────────────────────────────────
interface CanvasNode {
  uid: string;
  def: NodeDef;
}

// ─── NODE DETAIL MODAL — shown on long-press ─────────────────
function NodeDetailModal({ node, onClose, onAdd }: {
  node: NodeDef | null;
  onClose: () => void;
  onAdd: (n: NodeDef) => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!node) setCopied(false);
  }, [node]);

  if (!node) return null;
  const cfg  = TYPE_CONFIG[node.type];
  const Icon = node.iconLib === 'community' ? MaterialCommunityIcons : MaterialIcons;
  const codeLines = node.code.split('\\n');

  const handleCopy = async () => {
    haptics.light();
    try {
      if (Platform.OS === 'web') {
        await (navigator as any).clipboard.writeText(node.code);
      } else {
        const { setStringAsync } = await import('expo-clipboard');
        await setStringAsync(node.code);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Simple syntax color for a line
  const lineColor = (line: string): string => {
    const t = line.trim();
    if (t.startsWith('#'))                             return '#667744';
    if (/^(import|from|as)\b/.test(t))                return '#4488FF';
    if (/^(def|class|return|if|else|elif|for|while|try|except|with|in)\b/.test(t)) return '#CC44FF';
    if (/^print\s*\(/.test(t))                        return '#88CC66';
    return '#D0DDE8';
  };

  return (
    <Modal visible={!!node} animationType="slide" transparent statusBarTranslucent
      onRequestClose={onClose}>
      <View style={ndm.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={ndm.sheet}>
          {/* Colored top bar */}
          <View style={[ndm.topBar, { backgroundColor: cfg.color }]} />

          {/* Corner NEXUS brackets */}
          {([
            { top: 0, left: 0, borderTopWidth: 2.5, borderLeftWidth: 2.5 },
            { top: 0, right: 0, borderTopWidth: 2.5, borderRightWidth: 2.5 },
            { bottom: 0, left: 0, borderBottomWidth: 2.5, borderLeftWidth: 2.5 },
            { bottom: 0, right: 0, borderBottomWidth: 2.5, borderRightWidth: 2.5 },
          ] as any[]).map((c, i) => (
            <View key={i} style={[
              { position: 'absolute', width: 14, height: 14, borderColor: cfg.color + 'CC' }, c,
            ]} />
          ))}

          {/* Drag handle */}
          <View style={ndm.handle} />

          {/* Header */}
          <View style={ndm.header}>
            <View style={[ndm.iconBox, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '50' }]}>
              <Icon name={node.icon as any} size={22} color={cfg.color} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[ndm.name, { color: cfg.color }]}>{node.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <View style={[ndm.typeBadge, { borderColor: cfg.color + '60', backgroundColor: cfg.color + '15' }]}>
                  <Text style={[ndm.typeTxt, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                <Text style={ndm.descTxt} numberOfLines={2}>{node.description}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={ndm.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="close" size={16} color={C.textDim} />
            </TouchableOpacity>
          </View>

          {/* Info row */}
          <View style={[ndm.infoRow, { borderColor: cfg.color + '25', backgroundColor: cfg.color + '06' }]}>
            {[
              { icon: 'code',         label: 'LINES', val: String(codeLines.length) },
              { icon: 'account-tree', label: 'TYPE',  val: node.type },
              { icon: 'language',     label: 'LANG',  val: 'PYTHON' },
            ].map((item, i) => (
              <React.Fragment key={item.label}>
                {i > 0 ? <View style={[ndm.infoDiv, { backgroundColor: cfg.color + '30' }]} /> : null}
                <View style={ndm.infoCell}>
                  <MaterialIcons name={item.icon as any} size={11} color={cfg.color} />
                  <Text style={[ndm.infoLabel, { color: C.textDim }]}>{item.label}</Text>
                  <Text style={[ndm.infoVal, { color: cfg.color }]}>{item.val}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* Code viewer */}
          <View style={[ndm.codeWrap, { borderColor: cfg.color + '30' }]}>
            {/* Mac-style title bar */}
            <View style={[ndm.codeHeader, { borderBottomColor: cfg.color + '25', backgroundColor: cfg.color + '06' }]}>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {['#FF5F57', '#FEBC2E', '#28C840'].map((col, i) => (
                  <View key={i} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: col }} />
                ))}
              </View>
              <Text style={[ndm.codeFilename, { color: cfg.color + 'AA' }]}>
                {node.id}.py
              </Text>
              <TouchableOpacity
                style={[ndm.copyBtn, {
                  borderColor: copied ? C.green + '80' : cfg.color + '50',
                  backgroundColor: copied ? C.green + '18' : cfg.color + '10',
                }]}
                onPress={handleCopy}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MaterialIcons name={copied ? 'check' : 'content-copy'} size={11}
                  color={copied ? C.green : cfg.color} />
                <Text style={[ndm.copyTxt, { color: copied ? C.green : cfg.color }]}>
                  {copied ? 'COPIED!' : 'COPY'}
                </Text>
              </TouchableOpacity>
            </View>
            {/* Numbered code lines */}
            <ScrollView style={{ maxHeight: 210 }} contentContainerStyle={{ padding: 10 }}
              showsVerticalScrollIndicator={false}>
              {codeLines.map((line, i) => (
                <View key={i} style={ndm.codeLine}>
                  <Text style={[ndm.lineNum, { color: cfg.color + '45' }]}>
                    {(i + 1).toString().padStart(2, ' ')}
                  </Text>
                  <Text style={[ndm.lineText, { color: lineColor(line) }]}>
                    {line || ' '}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Add to canvas CTA */}
          <TouchableOpacity
            style={[ndm.addBtn, {
              backgroundColor: cfg.color,
              ...Platform.select({
                ios: { shadowColor: cfg.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10 },
                android: { elevation: 6 },
              }),
            }]}
            onPress={() => { haptics.heavy(); onAdd(node); onClose(); }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={20} color="#000" />
            <Text style={ndm.addBtnTxt}>ADD TO CANVAS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const ndm = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  sheet:      {
    backgroundColor: '#02070D', borderTopLeftRadius: 18, borderTopRightRadius: 18,
    overflow: 'hidden', position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.6, shadowRadius: 20 },
      android: { elevation: 24 },
    }),
  },
  topBar:     { height: 3 },
  handle:     { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  iconBox:    { width: 48, height: 48, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  name:       { fontSize: 16, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.3 },
  typeBadge:  { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  typeTxt:    { fontSize: 8, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },
  descTxt:    { fontSize: 10, color: C.textMid, fontFamily: MONO, flex: 1 },
  closeBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceHi, alignItems: 'center', justifyContent: 'center' },
  infoRow:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  infoCell:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 10 },
  infoDiv:    { width: 1, height: 28 },
  infoLabel:  { fontSize: 7.5, fontWeight: '700', fontFamily: MONO, letterSpacing: 1, flexShrink: 0 },
  infoVal:    { fontSize: 10, fontWeight: '900', fontFamily: MONO },
  codeWrap:   { marginHorizontal: 16, marginBottom: 12, borderRadius: 10, overflow: 'hidden', borderWidth: 1, backgroundColor: '#000003' },
  codeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1 },
  codeFilename:{ flex: 1, fontSize: 9, fontFamily: MONO, textAlign: 'center', letterSpacing: 0.5 },
  copyBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  copyTxt:    { fontSize: 8, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.5 },
  codeLine:   { flexDirection: 'row', marginBottom: 1.5 },
  lineNum:    { fontSize: 10, fontFamily: MONO, minWidth: 22, textAlign: 'right', marginRight: 10, lineHeight: 17 },
  lineText:   { flex: 1, fontSize: 10.5, fontFamily: MONO, lineHeight: 17 },
  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 16, marginBottom: 20, borderRadius: 12, paddingVertical: 15 },
  addBtnTxt:  { fontSize: 14, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 0.8 },
});

// ─── NODE PALETTE CARD — 2-wide compact grid card ────────────────────────────
const CARD_W = (SW - 28 - 8) / 2; // 2 per row with 8px gap and 14px side padding

function PaletteCard({
  node, onAdd, isInCanvas, onLongPress,
}: {
  node: NodeDef;
  onAdd: (n: NodeDef) => void;
  isInCanvas: boolean;
  onLongPress: (n: NodeDef) => void;
}) {
  const cfg    = TYPE_CONFIG[node.type];
  const scale  = useRef(new Animated.Value(1)).current;
  const glowOp = useRef(new Animated.Value(0)).current;
  const Icon   = node.iconLib === 'community' ? MaterialCommunityIcons : MaterialIcons;

  const handlePress = () => {
    haptics.medium();
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 60, useNativeDriver: false }),
      Animated.spring(scale, { toValue: 1, tension: 300, friction: 8, useNativeDriver: false }),
    ]).start();
    Animated.sequence([
      Animated.timing(glowOp, { toValue: 0.5, duration: 80, useNativeDriver: false }),
      Animated.timing(glowOp, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start();
    onAdd(node);
  };

  const handleLongPress = () => {
    haptics.heavy();
    onLongPress(node);
  };

  return (
    <Animated.View style={{ transform: [{ scale }], width: CARD_W }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 12, backgroundColor: cfg.color, opacity: glowOp, zIndex: 10 }]} />
      <TouchableOpacity
        style={[pc.card, {
          borderTopColor: cfg.color,
          borderColor: isInCanvas ? cfg.color + '55' : C.border,
          backgroundColor: isInCanvas ? cfg.color + '0A' : C.surface,
        }]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}
        activeOpacity={0.88}
      >
        {/* Corner brackets */}
        <View style={[pc.cTL, { borderColor: cfg.color + '70' }]} />
        <View style={[pc.cBR, { borderColor: cfg.color + '40' }]} />
        <View style={[pc.iconBox, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '40' }]}>
          <Icon name={node.icon as any} size={18} color={cfg.color} />
        </View>
        <Text style={[pc.name, { color: isInCanvas ? cfg.color : C.text }]} numberOfLines={2}>
          {node.name}
        </Text>
        <Text style={pc.desc} numberOfLines={1}>{node.description}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <View style={[pc.typeBadge, { borderColor: cfg.color + '50', backgroundColor: cfg.bg }]}>
            <Text style={[pc.typeTxt, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={[pc.holdHint, { color: cfg.color + '55' }]}>hold</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const pc = StyleSheet.create({
  card:      { borderWidth: 1, borderTopWidth: 3, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 10, minHeight: 100, position: 'relative', overflow: 'hidden',
    ...Platform.select({ ios:{ shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.25, shadowRadius:6 }, android:{elevation:3} }) },
  cTL:       { position:'absolute', top:0, left:0, width:8, height:8, borderTopWidth:1.5, borderLeftWidth:1.5 },
  cBR:       { position:'absolute', bottom:0, right:0, width:8, height:8, borderBottomWidth:1.5, borderRightWidth:1.5 },
  iconBox:   { width: 34, height: 34, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  name:      { fontSize: 11, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.1, lineHeight: 15 },
  desc:      { fontSize: 9, color: C.textDim, fontFamily: MONO, lineHeight: 12 },
  typeBadge: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, flexShrink: 0 },
  typeTxt:   { fontSize: 7.5, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  holdHint:  { fontSize: 7, fontFamily: MONO, letterSpacing: 0.3 },
});

// ─── CANVAS NODE CARD ─────────────────────────────────────────
function CanvasNodeCard({ cnode, index, onRemove, total }: { cnode: CanvasNode; index: number; onRemove: () => void; total: number }) {
  const cfg  = TYPE_CONFIG[cnode.def.type];
  const Icon = cnode.def.iconLib === 'community' ? MaterialCommunityIcons : MaterialIcons;
  const slideIn = useRef(new Animated.Value(-20)).current;
  const fadeIn  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideIn, { toValue: 0, tension: 200, friction: 12, useNativeDriver: false }),
      Animated.timing(fadeIn, { toValue: 1, duration: 200, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeIn, transform: [{ translateX: slideIn }] }}>
      <View style={[cn.card, { borderColor: cfg.color + '50', backgroundColor: cfg.color + '08' }]}>
        <View style={[cn.topBar, { backgroundColor: cfg.color }]} />
        <View style={cn.row}>
          <View style={[cn.stepBadge, { borderColor: cfg.color + '60', backgroundColor: cfg.color + '15' }]}>
            <Text style={[cn.stepNum, { color: cfg.color }]}>{index + 1}</Text>
          </View>
          <View style={[cn.iconBox, { backgroundColor: cfg.color + '15', borderColor: cfg.color + '40' }]}>
            <Icon name={cnode.def.icon as any} size={16} color={cfg.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[cn.name, { color: cfg.color }]} numberOfLines={1}>{cnode.def.name}</Text>
            <Text style={cn.desc} numberOfLines={1}>{cnode.def.description}</Text>
          </View>
          <View style={[cn.typePill, { borderColor: cfg.color + '50', backgroundColor: cfg.color + '12' }]}>
            <Text style={[cn.typeTxt, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <TouchableOpacity onPress={() => { haptics.medium(); onRemove(); }} style={cn.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="close" size={14} color={C.textDim} />
          </TouchableOpacity>
        </View>
      </View>
      {index < total - 1 ? (
        <View style={cn.connector}>
          <View style={[cn.connLine, { backgroundColor: cfg.color + '40' }]} />
          <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: cfg.color + '50' }} />
        </View>
      ) : null}
    </Animated.View>
  );
}
const cn = StyleSheet.create({
  card:      { borderWidth: 1.5, borderRadius: 12, overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8 }, android: { elevation: 4 } }) },
  topBar:    { height: 2.5 },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingVertical: 11 },
  stepBadge: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNum:   { fontSize: 11, fontWeight: '900', fontFamily: MONO },
  iconBox:   { width: 34, height: 34, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  name:      { fontSize: 12, fontWeight: '700', fontFamily: MONO },
  desc:      { fontSize: 9, color: C.textDim, fontFamily: MONO, marginTop: 2 },
  typePill:  { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 0 },
  typeTxt:   { fontSize: 7.5, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  removeBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.surfaceHi, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  connector: { alignItems: 'center', paddingVertical: 5 },
  connLine:  { width: 2, height: 12 },
});

// ─── EXECUTE RESULT PANEL ────────────────────────────────────
function ExecuteResultPanel({ output, error, running, onClose }: { output: string; error: string; running: boolean; onClose: () => void }) {
  const slideY = useRef(new Animated.Value(50)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, tension: 200, friction: 14, useNativeDriver: false }),
      Animated.timing(fadeIn, { toValue: 1, duration: 200, useNativeDriver: false }),
    ]).start();
  }, []);
  const success = !error && !running;
  const col = running ? C.amber : success ? C.green : C.red;
  return (
    <Animated.View style={[erp.wrap, { opacity: fadeIn, transform: [{ translateY: slideY }] }]}>
      <View style={[erp.header, { borderBottomColor: col + '30' }]}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col }} />
        <Text style={[erp.headerTxt, { color: col }]}>{running ? 'EXECUTING PIPELINE...' : success ? 'PIPELINE COMPLETE' : 'PIPELINE FAILED'}</Text>
        {!running ? (
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="close" size={16} color={C.textDim} />
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView style={{ maxHeight: 200 }} contentContainerStyle={{ padding: 12 }} showsVerticalScrollIndicator={false}>
        {running ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={C.amber} size="small" />
            <Text style={{ fontSize: 12, color: C.amber, fontFamily: MONO }}>Running nodes...</Text>
          </View>
        ) : (
          <Text style={{ fontSize: 12, color: success ? '#88FF99' : '#FF8888', fontFamily: MONO, lineHeight: 18 }} selectable>
            {output || error || 'No output returned'}
          </Text>
        )}
      </ScrollView>
    </Animated.View>
  );
}
const erp = StyleSheet.create({
  wrap:      { backgroundColor: '#02070D', borderTopWidth: 1.5, borderTopColor: C.teal + '40' },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  headerTxt: { flex: 1, fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 },
});

// ─── FILTER PILL ─────────────────────────────────────────────
function FilterPill({ label, active, color, onPress }: { label: string; active: boolean; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[fp.pill, active ? { borderColor: color, backgroundColor: color + '22' } : { borderColor: C.border }]}
      onPress={() => { haptics.selection(); onPress(); }}
      activeOpacity={0.8}
    >
      <Text style={[fp.txt, { color: active ? color : C.textDim }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const fp = StyleSheet.create({
  pill: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  txt:  { fontSize: 10, fontWeight: '700', fontFamily: MONO, letterSpacing: 0.3 },
});

// ─── EMPTY CANVAS ────────────────────────────────────────────
function EmptyCanvas() {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useFocusEffect(useCallback(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.2, duration: 1200, useNativeDriver: false }),
    ]));
    a.start();
    return () => a.stop();
  }, []));
  return (
    <View style={ec.wrap}>
      <Animated.View style={{ opacity: pulse }}>
        <MaterialIcons name="account-tree" size={52} color={C.teal + '60'} />
      </Animated.View>
      <Text style={ec.title}>CANVAS EMPTY</Text>
      <Text style={ec.hint}>{'Tap any node on the left\nto build your pipeline\n\nHold a node to see its code'}</Text>
    </View>
  );
}
const ec = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 20 },
  title: { fontSize: 13, fontWeight: '900', color: C.textDim, fontFamily: MONO, letterSpacing: 1 },
  hint:  { fontSize: 11, color: C.textDim, fontFamily: MONO, textAlign: 'center', lineHeight: 17 },
});

// ─── MAIN SCREEN ─────────────────────────────────────────────
export default function BuilderScreen() {
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>([]);
  const [activePane,  setActivePane]  = useState<'palette' | 'canvas'>('palette');
  const [genStage, setGenStage] = useState<'idle'|'connecting'|'generating'|'validating'|'done'>('idle');
  const [filter,      setFilter]      = useState<'ALL' | NodeType>('ALL');
  const [search,      setSearch]      = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [executing,   setExecuting]   = useState(false);
  const [execOutput,  setExecOutput]  = useState('');
  const [execError,   setExecError]   = useState('');
  const [showResult,  setShowResult]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [scriptName,  setScriptName]  = useState('My Pipeline');
  const [detailNode,  setDetailNode]  = useState<NodeDef | null>(null);
  const canvasScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const seed = autoConnectEngine.getCurrentConnection();
    setIsConnected(seed.connected);
    const unsub = autoConnectEngine.onEvent((evt: EngineEvent) => {
      setIsConnected(evt.status === 'connected');
    });
    // Auto-trigger a connection attempt if we have saved credentials but aren't connected yet
    if (!seed.connected) {
      import('@/services/serverConnection').then(({ serverConnection: sc }) => {
        const ip = sc.getIP(); const port = sc.getPort();
        if (ip && port) {
          sc.quickPing(ip, port).then(ms => {
            if (ms !== null) autoConnectEngine.notifyConnected(ip, port, ms);
          }).catch(() => {});
        }
      }).catch(() => {});
    }
    return () => unsub();
  }, []);

  const filteredPalette = useMemo(() => {
    let nodes = NODE_PALETTE;
    if (filter !== 'ALL') nodes = nodes.filter(n => n.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      nodes = nodes.filter(n => n.name.toLowerCase().includes(q) || n.description.toLowerCase().includes(q));
    }
    return nodes;
  }, [filter, search]);

  const canvasNodeIds = useMemo(() => new Set(canvasNodes.map(cn => cn.def.id)), [canvasNodes]);

  const addNode = useCallback((def: NodeDef) => {
    const uid = `${def.id}_${Date.now()}`;
    setCanvasNodes(prev => [...prev, { uid, def }]);
    setTimeout(() => canvasScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const removeNode = useCallback((uid: string) => {
    haptics.medium();
    setCanvasNodes(prev => prev.filter(n => n.uid !== uid));
  }, []);

  const clearCanvas = () => {
    if (canvasNodes.length === 0) return;
    Alert.alert('Clear Pipeline', 'Remove all nodes from canvas?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => { haptics.heavy(); setCanvasNodes([]); setShowResult(false); } },
    ]);
  };

  const buildScript = useCallback(() => {
    if (canvasNodes.length === 0) return null;
    setGenStage('generating');
    const lines: string[] = [
      '# NEXUS SCRIPT BUILDER — AUTO-GENERATED PIPELINE',
      `# Nodes: ${canvasNodes.length} · Generated: ${new Date().toISOString()}`,
      '',
      'import sys',
      '',
    ];
    canvasNodes.forEach((cn, i) => {
      lines.push(`# ── STEP ${i + 1}: ${cn.def.name.toUpperCase()} ──`);
      lines.push(`print("Step ${i + 1}: ${cn.def.name}")`);
      lines.push(cn.def.code);
      lines.push('');
    });
    lines.push('print("Pipeline complete")');
    const script = lines.join('\n');
    setGenStage('validating');
    if (!isValidPythonCode(script)) {
      setGenStage('idle');
      Alert.alert('Invalid Code', 'The generated pipeline does not look like valid Python. Add more specific nodes.');
      return null;
    }
    setGenStage('done');
    setTimeout(() => setGenStage('idle'), 2000);
    return script;
  }, [canvasNodes]);

  const execute = async () => {
    if (canvasNodes.length === 0) { Alert.alert('Empty Pipeline', 'Add at least one node to execute.'); return; }
    if (!isConnected) { Alert.alert('Offline', 'Connect to your PC via the HOME tab first.'); return; }
    const script = buildScript();
    if (!script) return;
    haptics.heavy();
    setExecuting(true);
    setExecOutput('');
    setExecError('');
    setShowResult(true);
    try {
      const ip    = serverConnection.getIP()!;
      const port  = serverConnection.getPort()!;
      const token = serverConnection.getToken();
      const ctrl  = new AbortController();
      setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch(`http://${ip}:${port}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ script }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      const raw = (data.output || '').trim();
      if (raw.toLowerCase().includes('traceback') || raw.toLowerCase().includes('error:')) {
        setExecError(raw);
      } else {
        setExecOutput(raw || 'Pipeline executed successfully');
      }
      haptics.success();
    } catch (e: any) {
      setExecError(e?.message || 'Execution failed');
      haptics.warning();
    } finally {
      setExecuting(false);
    }
  };

  const saveToScripts = async () => {
    const script = buildScript();
    if (!script) { Alert.alert('Empty Pipeline', 'Add nodes first.'); return; }
    const name = scriptName.trim() || 'NEXUS Pipeline';
    setSaving(true);
    haptics.medium();
    try {
      await saveButlerScript(script, {
        title: name,
        description: `Built with NEXUS Script Builder · ${canvasNodes.length} nodes`,
        category: 'AI Generated',
      });
      haptics.success();
      Alert.alert('Saved!', `"${name}" added to your Scripts library.`);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message);
    } finally {
      setSaving(false);
    }
  };

  const connCol = isConnected ? C.green : C.red;
  const TRIGGER_COUNT = NODE_PALETTE.filter(n => n.type === 'TRIGGER').length;
  const ACTION_COUNT  = NODE_PALETTE.filter(n => n.type === 'ACTION').length;
  const OUTPUT_COUNT  = NODE_PALETTE.filter(n => n.type === 'OUTPUT').length;

  return (
    <View style={s.root}>

      {/* ── NODE DETAIL MODAL (long-press) ── */}
      <NodeDetailModal
        node={detailNode}
        onClose={() => setDetailNode(null)}
        onAdd={addNode}
      />

      {/* ── HEADER ── */}
      <View style={s.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.titleMain}>SCRIPT</Text>
            <Text style={[s.titleAccent, { color: C.purple }]}>BUILDER</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: connCol }} />
            <Text style={{ fontSize: 9, fontWeight: '700', color: connCol, fontFamily: MONO, letterSpacing: 0.5 }}>
              {isConnected ? 'PC CONNECTED' : 'OFFLINE'}
            </Text>
            <Text style={{ fontSize: 9, color: C.textDim, fontFamily: MONO }}>
              · {TRIGGER_COUNT}T/{ACTION_COUNT}A/{OUTPUT_COUNT}O · hold node for info
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.executeBtn, { opacity: (canvasNodes.length === 0 || executing) ? 0.45 : 1 }]}
          onPress={execute}
          disabled={canvasNodes.length === 0 || executing}
          activeOpacity={0.85}
        >
          {executing
            ? <ActivityIndicator size="small" color="#000" style={{ transform: [{ scale: 0.75 }] }} />
            : <MaterialIcons name="play-arrow" size={18} color="#000" />
          }
          <Text style={s.executeBtnTxt}>{executing ? 'RUNNING' : 'EXECUTE'}</Text>
          </TouchableOpacity>
          {genStage !== 'idle' ? (
            <Text style={{ color: '#00DDEE', fontSize: 11, fontFamily: MONO, marginTop: 4, textAlign: 'center' }}>
              {({'connecting':'Connecting to AI...','generating':'Building script...','validating':'Validating...','done':'Ready'} as Record<string,string>)[genStage] ?? ''}
            </Text>
          ) : null}
      </View>

      {/* ── LIVE WIDGET STUDIO (scrollable) ── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <WidgetLayer pageId="builder" />
        <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
          <LiveWidgetStudio />
        </View>

      {/* ── TABBED LAYOUT — full width palette + canvas tab ── */}
      {(() => {
        const handleSetPane = (p: 'palette' | 'canvas') => { haptics.selection(); setActivePane(p); };
        return (
          <View style={{ minHeight: 600 }}>
            {/* Tab bar */}
            <View style={s.tabBar}>
              {(['palette', 'canvas'] as const).map(pane => {
                const active = activePane === pane;
                const col    = pane === 'palette' ? C.teal : C.purple;
                return (
                  <TouchableOpacity key={pane} style={[s.tabBtn, active && { borderBottomColor: col, borderBottomWidth: 2.5 }]}
                    onPress={() => handleSetPane(pane)} activeOpacity={0.8}>
                    <MaterialIcons
                      name={pane === 'palette' ? 'view-module' : 'account-tree'}
                      size={14} color={active ? col : C.textDim} />
                    <Text style={[s.tabBtnTxt, { color: active ? col : C.textDim }]}>
                      {pane === 'palette' ? `NODES (${filteredPalette.length})` : `CANVAS (${canvasNodes.length})`}
                    </Text>
                    {pane === 'canvas' && canvasNodes.length > 0 ? (
                      <View style={[s.tabDot, { backgroundColor: C.purple }]} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ─ PALETTE PANE ─ */}
            {activePane === 'palette' ? (
              <View style={{ flex: 1 }}>
                {/* Filter pills */}
                <View style={s.filterRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
                    <FilterPill label="ALL"     active={filter === 'ALL'}     color={C.teal}   onPress={() => setFilter('ALL')}     />
                    <FilterPill label="TRIGGER" active={filter === 'TRIGGER'} color={C.teal}   onPress={() => setFilter('TRIGGER')} />
                    <FilterPill label="ACTION"  active={filter === 'ACTION'}  color={C.green}  onPress={() => setFilter('ACTION')}  />
                    <FilterPill label="OUTPUT"  active={filter === 'OUTPUT'}  color={C.purple} onPress={() => setFilter('OUTPUT')}  />
                  </ScrollView>
                </View>
                {/* Search */}
                <View style={s.searchBox}>
                  <MaterialIcons name="search" size={13} color={C.textDim} />
                  <TextInput
                    style={s.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search nodes..."
                    placeholderTextColor={C.textDim}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {search ? (
                    <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <MaterialIcons name="close" size={12} color={C.textDim} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={s.paletteGrid} showsVerticalScrollIndicator={false}>
                  {filteredPalette.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingTop: 40, gap: 10, width: '100%' }}>
                      <MaterialIcons name="search-off" size={36} color={C.textDim} />
                      <Text style={{ color: C.textDim, fontFamily: MONO, fontSize: 11 }}>No nodes match</Text>
                    </View>
                  ) : (
                    filteredPalette.map(node => (
                      <PaletteCard
                        key={node.id}
                        node={node}
                        onAdd={(n) => { addNode(n); handleSetPane('canvas'); }}
                        isInCanvas={canvasNodeIds.has(node.id)}
                        onLongPress={(n) => setDetailNode(n)}
                      />
                    ))
                  )}
                </ScrollView>
              </View>
            ) : null}

            {/* ─ CANVAS PANE ─ */}
            {activePane === 'canvas' ? (
              <View style={{ flex: 1 }}>
                <View style={[s.panelHeader, { justifyContent: 'space-between' }]}>
                  <Text style={s.panelTitle}>{canvasNodes.length} NODES IN PIPELINE</Text>
                  {canvasNodes.length > 0 ? (
                    <TouchableOpacity onPress={clearCanvas} style={[s.clearBtn, { borderColor: C.red + '50', backgroundColor: C.red + '0C' }]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialIcons name="delete-sweep" size={13} color={C.red} />
                      <Text style={{ fontSize: 9, fontWeight: '900', fontFamily: MONO, color: C.red }}>CLEAR</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {canvasNodes.length === 0 ? (
                  <EmptyCanvas />
                ) : (
                  <ScrollView ref={canvasScrollRef} contentContainerStyle={{ padding: 14, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                    {canvasNodes.map((cn, i) => (
                      <CanvasNodeCard
                        key={cn.uid}
                        cnode={cn}
                        index={i}
                        total={canvasNodes.length}
                        onRemove={() => removeNode(cn.uid)}
                      />
                    ))}
                    {canvasNodes.length > 0 ? (
                      <View style={s.saveRow}>
                        <TextInput
                          style={s.nameInput}
                          value={scriptName}
                          onChangeText={setScriptName}
                          placeholder="Pipeline name..."
                          placeholderTextColor={C.textDim}
                          maxLength={48}
                        />
                        <TouchableOpacity
                          style={[s.saveBtn, saving && { opacity: 0.5 }]}
                          onPress={saveToScripts}
                          disabled={saving}
                          activeOpacity={0.85}
                        >
                          {saving ? <ActivityIndicator size="small" color="#000" style={{ transform: [{ scale: 0.7 }] }} /> : <MaterialIcons name="save" size={13} color="#000" />}
                          <Text style={s.saveBtnTxt}>SAVE</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </ScrollView>
                )}
              </View>
            ) : null}
          </View>
        );
      })()}

      {/* ── EXECUTE RESULT ── */}
      {showResult ? (
        <ExecuteResultPanel
          output={execOutput}
          error={execError}
          running={executing}
          onClose={() => setShowResult(false)}
        />
      ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#000003' },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
  titleMain:    { fontSize: 22, fontWeight: '900', color: '#FFFFFF', fontFamily: MONO, letterSpacing: -0.5 },
  titleAccent:  { fontSize: 22, fontWeight: '900', fontFamily: MONO, letterSpacing: -0.5 },
  executeBtn:   { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.purple, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11,
    ...Platform.select({ ios: { shadowColor: C.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10 }, android: { elevation: 6 } }) },
  executeBtnTxt:{ fontSize: 13, fontWeight: '900', color: '#000', fontFamily: MONO, letterSpacing: 0.5 },
  tabBar:       { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surfaceHi },
  tabBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnTxt:    { fontSize: 11, fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 },
  tabDot:       { width: 6, height: 6, borderRadius: 3 },
  panelHeader:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surfaceHi },
  panelTitle:   { fontSize: 9, fontWeight: '900', color: C.textMid, fontFamily: MONO, letterSpacing: 2, flex: 1 },
  panelCount:   { fontSize: 9, fontWeight: '700', fontFamily: MONO },
  clearBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5 },
  paletteGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14, justifyContent: 'center' },
  filterRow:    { paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  searchBox:    { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 8, marginVertical: 6, backgroundColor: C.surfaceHi, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  searchInput:  { flex: 1, fontSize: 11, color: C.text, fontFamily: MONO },
  saveRow:      { flexDirection: 'row', gap: 8, marginTop: 12 },
  nameInput:    { flex: 1, backgroundColor: C.surfaceHi, borderWidth: 1.5, borderColor: C.purple + '50', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9, fontSize: 11, color: C.text, fontFamily: MONO },
  saveBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.purple, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  saveBtnTxt:   { fontSize: 10, fontWeight: '900', color: '#000', fontFamily: MONO },
});


// Expo Router per-route ErrorBoundary — isolates crashes to this tab
export { ErrorBoundary } from '@/components/ui/TabErrorBoundary';
