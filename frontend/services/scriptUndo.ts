/**
 * ⚡ NEXUS SCRIPT UNDO SERVICE
 * Lightweight undo history for script edits — stores up to 20 snapshots per script
 * per session (in-memory only). No AsyncStorage = zero APK size impact.
 *
 * STORAGE ANALYSIS:
 *  • Average script: ~500 chars
 *  • 20 snapshots × 500 chars = 10KB per script being edited
 *  • Max 3 concurrent editors = 30KB RAM
 *  • AsyncStorage NOT used — completely disposable on app restart
 *  • Result: ZERO persistent storage cost, negligible RAM cost
 *
 * USAGE:
 *   const undo = scriptUndoManager.getStack('my-script-id');
 *   undo.push(code);          // auto-debounced 800ms
 *   const prev = undo.pop();  // get previous version
 *   const canUndo = undo.canUndo;
 *   const canRedo = undo.canRedo;
 *   const next = undo.redo(); // redo
 */

const MAX_STACK_SIZE = 20;  // 20 undo steps per script
const DEBOUNCE_MS    = 800; // Only snapshot after 800ms of no typing

interface UndoSnapshot {
  code: string;
  ts: number;
}

class ScriptUndoStack {
  private _past: UndoSnapshot[]   = [];
  private _future: UndoSnapshot[] = [];
  private _current: string        = '';
  private _timer: ReturnType<typeof setTimeout> | null = null;

  get canUndo() { return this._past.length > 0; }
  get canRedo() { return this._future.length > 0; }
  get size()    { return this._past.length; }
  get current() { return this._current; }

  /** Call whenever the code changes (debounced — safe to call on every keystroke) */
  push(code: string): void {
    if (code === this._current) return;
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      if (code === this._current) return;
      // Save current to past
      if (this._current) {
        this._past.push({ code: this._current, ts: Date.now() });
        if (this._past.length > MAX_STACK_SIZE) {
          this._past.shift(); // drop oldest
        }
      }
      this._current = code;
      this._future  = []; // clear redo on new edit
    }, DEBOUNCE_MS);
  }

  /** Undo: returns previous code string, or null if nothing to undo */
  pop(): string | null {
    if (!this.canUndo) return null;
    const prev = this._past.pop()!;
    // Push current to future (redo stack)
    if (this._current) {
      this._future.push({ code: this._current, ts: Date.now() });
    }
    this._current = prev.code;
    return prev.code;
  }

  /** Redo: returns next code string, or null if nothing to redo */
  redo(): string | null {
    if (!this.canRedo) return null;
    const next = this._future.pop()!;
    if (this._current) {
      this._past.push({ code: this._current, ts: Date.now() });
    }
    this._current = next.code;
    return next.code;
  }

  /** Force immediate snapshot (call before saving or running) */
  snapshotNow(code: string): void {
    if (this._timer) clearTimeout(this._timer);
    if (code === this._current) return;
    if (this._current) {
      this._past.push({ code: this._current, ts: Date.now() });
      if (this._past.length > MAX_STACK_SIZE) this._past.shift();
    }
    this._current = code;
    this._future  = [];
  }

  /** Clear all history for this script */
  clear(): void {
    if (this._timer) clearTimeout(this._timer);
    this._past    = [];
    this._future  = [];
    this._current = '';
  }

  /** Estimated memory usage in bytes */
  get memorySizeBytes(): number {
    const all = [...this._past, ...this._future];
    return all.reduce((sum, s) => sum + s.code.length * 2, 0); // UTF-16
  }
}

/** Global manager — one stack per script ID */
class ScriptUndoManager {
  private _stacks = new Map<string, ScriptUndoStack>();

  getStack(scriptId: string): ScriptUndoStack {
    if (!this._stacks.has(scriptId)) {
      // Evict oldest if we have too many open stacks (memory guard)
      if (this._stacks.size >= 5) {
        const oldest = this._stacks.keys().next().value;
        if (oldest) this._stacks.delete(oldest);
      }
      this._stacks.set(scriptId, new ScriptUndoStack());
    }
    return this._stacks.get(scriptId)!;
  }

  clearAll(): void {
    this._stacks.forEach(s => s.clear());
    this._stacks.clear();
  }

  /** Total memory across all stacks (for diagnostics) */
  get totalMemoryBytes(): number {
    let total = 0;
    this._stacks.forEach(s => { total += s.memorySizeBytes; });
    return total;
  }
}

export const scriptUndoManager = new ScriptUndoManager();
export type { ScriptUndoStack };
