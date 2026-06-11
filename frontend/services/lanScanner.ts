/**
 * LAN Scanner Service v4.0 — Adaptive Global Discovery
 * ──────────────────────────────────────────────────────────────────
 * Fully adaptive: no hardcoded port assumptions.
 * Works in any country, any network, any server configuration.
 *
 * Strategy (auto-adapts based on what it finds):
 *  1. Try last-known-good port first (from storage)
 *  2. Then probe all common server ports in parallel
 *  3. Then brute-force scan subnets that cover every major
 *     private IP range used globally (RFC 1918 + common ISP ranges)
 *
 * Key principle: The "correct" port is whatever the server is running on.
 * We discover it — we never assume it.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const BEACON_PORT = 8764;

export interface FoundServer {
  ip:        string;
  port:      number;
  latencyMs: number;
  info?:     { status?: string; version?: string; ollama?: boolean; locked?: boolean };
}

export interface ScanProgress {
  scanned:       number;
  total:         number;
  found:         FoundServer[];
  currentSubnet: string;
  done:          boolean;
  phase?:        'beacon' | 'fast' | 'full';
}

// ── Adaptive port list ──────────────────────────────────────────
// These are the most commonly used ports for Python/Node/Flask servers.
// Ordered by global probability — no single port is "correct".
// The app reads the last-used port from storage and prepends it.
const COMMON_SERVER_PORTS = [
  // Python Flask/FastAPI defaults
  5000, 8000, 8080, 8008,
  // Common alternative Python server ports
  8765, 8766, 8767, 8768, 8769, 8770,
  // Node.js common
  3000, 3001, 3002, 4000,
  // Other common server ports
  8888, 8081, 8082, 8443, 8090,
  9000, 9001, 9090, 9999,
  // Less common but valid dev ports
  1337, 4321, 7000, 7777, 7070,
  8500, 8600, 8700, 8800, 8900,
  // Some routers/ISPs in Asia/Europe use higher ports
  10000, 10001, 12345,
];

const HOST_TIMEOUT_MS = 700;  // generous timeout per probe
// Capped at 20 — prevents JS event loop starvation from 7,620 parallel requests
const BATCH_SIZE      = 20;   // max concurrent probes per wave

// ── Global subnet coverage ──────────────────────────────────────
// Covers all RFC 1918 private ranges used globally:
// - 192.168.x.x  (most home routers worldwide)
// - 10.x.x.x     (corporate, mobile hotspots, VMs)
// - 172.16-31.x  (Docker, VPNs, some ISPs in Asia/Europe)
// Ordered by global probability
const SUBNETS = [
  // 192.168.x.x — most common worldwide (home routers)
  '192.168.1',   // Most common globally
  '192.168.0',   // Very common (Netgear, TP-Link defaults)
  '192.168.2',
  '192.168.100', // Common in Asia (Huawei, ZTE)
  '192.168.178', // Common in Germany (FritzBox)
  '192.168.11',  // Common in Japan (NEC, Buffalo)
  '192.168.50',  // Some ISPs in Europe
  '192.168.10',
  '192.168.3',
  '192.168.4',
  '192.168.5',
  '192.168.254', // Some router admin subnets
  '192.168.20',
  '192.168.88',  // MikroTik default (Eastern Europe)
  // 10.x.x.x — corporate, mobile hotspots, cloud VMs
  '10.0.0',
  '10.0.1',
  '10.0.2',      // VirtualBox default NAT
  '10.1.1',
  '10.1.0',
  '10.10.0',
  '10.10.1',
  '10.100.0',    // Some corporate ranges
  '10.200.0',
  '10.8.0',      // OpenVPN default
  // 172.16-31.x — Docker, VPNs, some ISPs
  '172.16.0',
  '172.16.1',
  '172.17.0',    // Docker default bridge
  '172.18.0',
  '172.20.0',
  '172.20.10',   // iPhone hotspot default
];

// Most-likely host octets (ordered by global probability)
// Covers static leases + DHCP ranges across all router brands
const PRIORITY_HOST_OCTETS = [
  // Common static/gateway neighbours
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
  // Mid DHCP range (most routers assign here)
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  50, 51, 52, 53, 54, 55,
  111, 120, 130, 150,
  // High range
  200, 201, 202, 203, 204, 205, 210, 220, 230, 240, 250, 251, 252, 253, 254,
];

// ── Build adaptive port list ─────────────────────────────────────
// Reads last-used port from storage and puts it first.
// The "right" port is always whatever worked before.
async function buildAdaptivePortList(): Promise<number[]> {
  try {
    const savedPort = await AsyncStorage.getItem('commandcube_server_port');
    if (savedPort) {
      const p = parseInt(savedPort, 10);
      if (!isNaN(p) && p > 0 && p < 65536) {
        // Put last-used port first, then the common list (deduped)
        return [p, ...COMMON_SERVER_PORTS.filter(x => x !== p)];
      }
    }
  } catch {}
  return [...COMMON_SERVER_PORTS];
}

// ── Core HTTP probe ──────────────────────────────────────────────
// Tries multiple endpoint paths — works with any HTTP server,
// not just butler_server.py.
const PROBE_PATHS = ['/api/status', '/status', '/health', '/', '/api/health'];

async function probeHost(ip: string, port: number): Promise<FoundServer | null> {
  const t0 = Date.now();
  for (const path of PROBE_PATHS) {
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), HOST_TIMEOUT_MS);
      const res  = await fetch(`http://${ip}:${port}${path}`, {
        signal:  ctrl.signal,
        headers: { 'Cache-Control': 'no-cache' },
      });
      clearTimeout(tid);
      // Any HTTP response (even 4xx) means something is listening
      if (res.status < 500) {
        const latencyMs = Date.now() - t0;
        let info: FoundServer['info'] = {};
        try { info = await res.json(); } catch {}
        return { ip, port, latencyMs, info };
      }
    } catch (e: any) {
      // AbortError = timeout = nothing on this port, skip remaining paths
      if (e?.name === 'AbortError') break;
      // Network error = try next path
    }
  }
  return null;
}

async function probeBatch(pairs: { ip: string; port: number }[]): Promise<FoundServer[]> {
  const results = await Promise.all(pairs.map(({ ip, port }) => probeHost(ip, port)));
  return results.filter((r): r is FoundServer => r !== null);
}

// ── Phase 0: Blazing-fast last-known-good probe ─────────────────
// Probes: last saved IP + same-subnet neighbours (±5 hosts) + common gateway IPs.
// Completes in < 1.5s for the 95% case where server is on the same device DHCP lease.
// No full scan needed if this hits.
export async function fastProbeLastKnown(
  onFound: (server: FoundServer) => void,
): Promise<FoundServer | null> {
  let savedIp: string | null = null;
  let savedPort: number | null = null;
  try {
    savedIp   = await AsyncStorage.getItem('commandcube_server_ip');
    const sp  = await AsyncStorage.getItem('commandcube_server_port');
    savedPort = sp ? parseInt(sp, 10) : null;
  } catch {}

  if (!savedIp) return null;

  const parts   = savedIp.split('.');
  if (parts.length !== 4) return null;
  const subnet  = parts.slice(0, 3).join('.');
  const lastOct = parseInt(parts[3], 10);
  const port    = savedPort && !isNaN(savedPort) ? savedPort : 0;

  // Build probe list: exact IP first, then nearby hosts (DHCP lease drift is usually ±5),
  // then common gateway addresses (.1, .254, .100)
  const hostOcts = new Set<number>([lastOct]);
  for (let d = 1; d <= 5; d++) {
    if (lastOct - d > 0) hostOcts.add(lastOct - d);
    if (lastOct + d < 255) hostOcts.add(lastOct + d);
  }
  [1, 2, 100, 254].forEach(h => hostOcts.add(h));

  const ports = await buildAdaptivePortList();
  const topPorts = ports.slice(0, 4).map(Number).filter(p => !isNaN(p));
  if (!topPorts.includes(port)) topPorts.unshift(port);

  const pairs: { ip: string; port: number }[] = [];
  for (const h of hostOcts) {
    for (const p of topPorts) {
      pairs.push({ ip: `${subnet}.${h}`, port: p });
    }
  }

  // Probe all in parallel — tight 1.5s budget
  const results = await Promise.allSettled(
    pairs.map(async ({ ip, port: p }) => {
      const t0 = Date.now();
      try {
        const ctrl = new AbortController();
        const tid  = setTimeout(() => ctrl.abort(), 1500);
        const res  = await fetch(`http://${ip}:${p}/api/status`, { signal: ctrl.signal });
        clearTimeout(tid);
        if (res.status < 500) {
          let info: FoundServer['info'] = {};
          try { info = await res.json(); } catch {}
          return { ip, port: p, latencyMs: Date.now() - t0, info } as FoundServer;
        }
      } catch {}
      return null;
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      onFound(r.value);
      return r.value;
    }
  }
  return null;
}

// ── Phase 1: Fast beacon-style scan ──────────────────────────────
// Tries last-used port + most common ports across top subnets
// This handles the 95% case where user has connected before.
export async function listenForBeacon(
  onFound: (server: FoundServer) => void,
  timeoutMs = 5000,
): Promise<FoundServer | null> {
  const ports = await buildAdaptivePortList();
  const topPorts = ports.slice(0, 6); // Try top 6 most likely ports
  const topSubnets = SUBNETS.slice(0, 4);
  const quickPairs: { ip: string; port: number }[] = [];

  for (const subnet of topSubnets) {
    for (const h of PRIORITY_HOST_OCTETS.slice(0, 12)) {
      for (const port of topPorts) {
        quickPairs.push({ ip: `${subnet}.${h}`, port });
      }
    }
  }

  const deadline = Date.now() + timeoutMs;
  for (let i = 0; i < quickPairs.length; i += BATCH_SIZE) {
    if (Date.now() > deadline) break;
    const batch   = quickPairs.slice(i, i + BATCH_SIZE);
    const results = await probeBatch(batch);
    if (results.length > 0) {
      onFound(results[0]);
      return results[0];
    }
  }
  return null;
}

// ── Phase 2: Quick scan — adaptive ports, priority hosts ─────────
export async function quickScan(
  onProgress: (p: ScanProgress) => void,
  abortSignal?: { aborted: boolean },
): Promise<FoundServer[]> {
  const ports    = await buildAdaptivePortList();
  const topPorts = ports.slice(0, 8); // Top 8 adaptive ports
  const allFound: FoundServer[] = [];
  const seenKeys = new Set<string>();

  // Priority-first pairs: top subnets × priority hosts × top ports
  const pairs: { ip: string; port: number; subnet: string }[] = [];
  for (const subnet of SUBNETS.slice(0, 10)) {
    for (const host of PRIORITY_HOST_OCTETS) {
      for (const port of topPorts) {
        pairs.push({ ip: `${subnet}.${host}`, port, subnet });
      }
    }
  }

  // Remaining hosts
  const prioritySet = new Set(PRIORITY_HOST_OCTETS);
  for (let h = 1; h <= 254; h++) {
    if (!prioritySet.has(h)) {
      for (const subnet of SUBNETS.slice(0, 6)) {
        for (const port of topPorts.slice(0, 4)) {
          pairs.push({ ip: `${subnet}.${h}`, port, subnet });
        }
      }
    }
  }

  const total = pairs.length;
  let scanned = 0;
  let currentSubnet = SUBNETS[0];

  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    if (abortSignal?.aborted) break;
    const batch    = pairs.slice(i, i + BATCH_SIZE);
    currentSubnet  = batch[0]?.subnet ?? currentSubnet;
    const results  = await probeBatch(batch.map(({ ip, port }) => ({ ip, port })));

    for (const srv of results) {
      const key = `${srv.ip}:${srv.port}`;
      if (!seenKeys.has(key)) { seenKeys.add(key); allFound.push(srv); }
    }

    scanned = Math.min(scanned + batch.length, total);
    onProgress({ scanned, total, found: [...allFound], currentSubnet, done: false, phase: 'fast' });

    // Early exit once we've found something and covered priority hosts
    if (allFound.length > 0 && scanned > PRIORITY_HOST_OCTETS.length * topPorts.length * SUBNETS.slice(0, 10).length) {
      onProgress({ scanned: total, total, found: allFound, currentSubnet, done: true, phase: 'fast' });
      return allFound;
    }
  }

  onProgress({ scanned: total, total, found: allFound, currentSubnet, done: true, phase: 'fast' });
  return allFound;
}

// ── Phase 3: Full scan (all subnets, all common ports) ───────────
export async function scanLAN(
  onProgress: (p: ScanProgress) => void,
  abortSignal?: { aborted: boolean },
): Promise<FoundServer[]> {
  const ports    = await buildAdaptivePortList();
  const topPorts = ports.slice(0, 6);
  const allFound: FoundServer[] = [];
  const seenKeys = new Set<string>();

  const pairs: { ip: string; port: number; subnet: string }[] = [];
  for (const subnet of SUBNETS) {
    for (let h = 1; h <= 254; h++) {
      for (const port of topPorts) {
        pairs.push({ ip: `${subnet}.${h}`, port, subnet });
      }
    }
  }

  const total = pairs.length;
  let scanned = 0;
  let currentSubnet = SUBNETS[0];

  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    if (abortSignal?.aborted) break;
    const batch   = pairs.slice(i, i + BATCH_SIZE);
    currentSubnet = batch[0]?.subnet ?? currentSubnet;
    const results = await probeBatch(batch.map(({ ip, port }) => ({ ip, port })));
    for (const srv of results) {
      const key = `${srv.ip}:${srv.port}`;
      if (!seenKeys.has(key)) { seenKeys.add(key); allFound.push(srv); }
    }
    scanned = Math.min(scanned + batch.length, total);
    onProgress({ scanned, total, found: [...allFound], currentSubnet, done: false, phase: 'full' });
  }
  onProgress({ scanned: total, total, found: allFound, currentSubnet, done: true, phase: 'full' });
  return allFound;
}

// ── Diagnostics ──────────────────────────────────────────────────
export type ConnDiagResult =
  | { ok: true;  latencyMs: number; info: Record<string, any> }
  | { ok: false; type: 'TIMEOUT' | 'REFUSED' | 'UNREACHABLE' | 'BADRESPONSE' | 'UNKNOWN'; message: string; latencyMs: number };

export async function diagnosePeer(ip: string, port: number): Promise<ConnDiagResult> {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 6000);
    let res: Response;
    try {
      res = await fetch(`http://${ip}:${port}/api/status`, { signal: ctrl.signal });
    } catch (e: any) {
      clearTimeout(tid);
      const ms  = Date.now() - t0;
      const msg = (e?.message ?? '').toLowerCase();
      if (e?.name === 'AbortError' || msg.includes('timeout'))
        return { ok: false, type: 'TIMEOUT',     message: `Timed out connecting to ${ip}:${port} — check firewall`, latencyMs: ms };
      if (msg.includes('refused') || msg.includes('econnrefused'))
        return { ok: false, type: 'REFUSED',     message: `Nothing listening on ${ip}:${port} — is the server running?`, latencyMs: ms };
      if (msg.includes('network') || msg.includes('unreachable'))
        return { ok: false, type: 'UNREACHABLE', message: 'Network unreachable — ensure phone and PC are on the same WiFi', latencyMs: ms };
      return { ok: false, type: 'UNKNOWN', message: e?.message ?? 'Unknown network error', latencyMs: ms };
    }
    clearTimeout(tid);
    const ms = Date.now() - t0;
    if (!res.ok) return { ok: false, type: 'BADRESPONSE', message: `Server returned HTTP ${res.status}`, latencyMs: ms };
    let info: Record<string, any> = {};
    try { info = await res.json(); } catch {}
    return { ok: true, latencyMs: ms, info };
  } catch (e: any) {
    return { ok: false, type: 'UNKNOWN', message: e?.message ?? 'Unknown error', latencyMs: Date.now() - t0 };
  }
}
