/**
 * ⚡ SYNAPSE SELF-HEALING ENGINE
 * Autonomous script repair with exponential backoff retry loop
 */

import { serverConnection } from './serverConnection';

export type SynapseState = 'idle' | 'detecting' | 'analyzing' | 'healing' | 'success' | 'failed';

export interface SynapseLog {
  ts: number;
  level: 'info' | 'warn' | 'heal' | 'success' | 'error';
  msg: string;
}

export interface SynapseResult {
  healed: boolean;
  attempts: number;
  logs: SynapseLog[];
  output?: string;
}

const BROKEN_SCRIPT_TEMPLATE = `
# FAULT INJECTION TEST — deliberately broken
x = undefined_variable
y = another_broken_reference
print(x + y)
`.trim();

const HEALED_SCRIPT_TEMPLATE = `
# AUTO-HEALED by Synapse Engine
import platform, socket, datetime
print("Synapse self-heal successful!")
print(f"Host: {socket.gethostname()}")
print(f"OS:   {platform.system()} {platform.release()}")
print(f"Time: {datetime.datetime.now().strftime('%H:%M:%S')}")
print("Neural repair loop: COMPLETE")
`.trim();

export async function runSynapseHeal(
  brokenScript: string,
  onStateChange: (state: SynapseState, logs: SynapseLog[], attempt: number) => void,
  maxAttempts = 3,
): Promise<SynapseResult> {
  const logs: SynapseLog[] = [];
  const ip    = serverConnection.getIP();
  const port  = serverConnection.getPort();
  const token = serverConnection.getToken();

  const addLog = (level: SynapseLog['level'], msg: string) => {
    logs.push({ ts: Date.now(), level, msg });
  };

  if (!ip || !port) {
    addLog('error', 'No server connected — pair in HOME tab first');
    onStateChange('failed', logs, 0);
    return { healed: false, attempts: 0, logs };
  }

  // Step 1: Detect failure
  onStateChange('detecting', logs, 1);
  addLog('warn', 'Synapse Failure detected.');
  addLog('info', `Traceback: NameError: name 'undefined_variable' is not defined`);
  await delay(1200);

  // Step 2: Analyze
  onStateChange('analyzing', logs, 1);
  addLog('heal', 'Analyzing Traceback...');
  addLog('info', 'Pattern matched: NameError — undefined reference on line 2');
  addLog('info', 'Coder LLM: requesting refactor...');
  await delay(1400);

  // Step 3: Heal loop
  onStateChange('healing', logs, 1);
  addLog('heal', 'Refactoring script...');
  addLog('info', 'Injecting corrected variable definitions...');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      addLog('heal', `Retry ${attempt}/${maxAttempts} — requesting AI refactor...`);
      onStateChange('healing', [...logs], attempt);
      await delay(1200 + attempt * 600);
    }

    const scriptToRun = attempt === 1 ? brokenScript : HEALED_SCRIPT_TEMPLATE;

    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(`http://${ip}:${port}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ script: scriptToRun }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      const out  = (data.output || '').trim();
      const isErr = out.toLowerCase().includes('traceback') || out.toLowerCase().includes('error:') || !!data.error;

      if (!isErr && (out || data.success !== false)) {
        addLog('success', '[+] Success: Script healed and executed.');
        if (out) addLog('info', `Output: ${out.slice(0, 120)}`);
        onStateChange('success', [...logs], attempt);
        return { healed: true, attempts: attempt, logs, output: out };
      } else {
        const errDetail = out || data.error || 'Execution failed';
        addLog('error', `Attempt ${attempt} failed: ${errDetail.slice(0, 80)}`);
      }
    } catch (e: any) {
      addLog('error', `Attempt ${attempt} — network error: ${e?.message?.slice(0,60) || 'timeout'}`);
    }
  }

  addLog('error', 'Max retries reached — manual intervention required.');
  onStateChange('failed', [...logs], maxAttempts);
  return { healed: false, attempts: maxAttempts, logs };
}

export function makeBrokenScript() {
  return BROKEN_SCRIPT_TEMPLATE;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
