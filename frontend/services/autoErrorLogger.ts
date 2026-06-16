/**
 * Auto Error Logger — lightweight error capture service
 * Stores errors in AsyncStorage for debugging without crashing the app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_LOGS = 100;
const STORAGE_KEY = '@butler_auto_error_logs_v1';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface ErrorLogEntry {
  id: string;
  level: LogLevel;
  source: string;
  message: string;
  stack?: string;
  timestamp: number;
  meta?: Record<string, any>;
}

class AutoErrorLogger {
  private _buffer: ErrorLogEntry[] = [];
  private _loaded = false;
  private _saveTimer: ReturnType<typeof setTimeout> | null = null;

  /** Log an error or message */
  log(level: LogLevel, source: string, message: string, meta?: Record<string, any>): void {
    const entry: ErrorLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      level,
      source,
      message: String(message).slice(0, 500),
      timestamp: Date.now(),
      meta,
    };

    this._buffer.push(entry);
    if (this._buffer.length > MAX_LOGS) {
      this._buffer = this._buffer.slice(-MAX_LOGS);
    }

    // Debounced persist
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._persist(), 1500);

    // Console mirror
    const prefix = `[AutoErrorLogger:${source}]`;
    if (level === 'error') console.error(prefix, message, meta || '');
    else if (level === 'warn') console.warn(prefix, message, meta || '');
    else console.log(prefix, `[${level.toUpperCase()}]`, message, meta || '');
  }

  /** Convenience wrappers */
  error(source: string, message: string, meta?: Record<string, any>): void {
    this.log('error', source, message, meta);
  }

  warn(source: string, message: string, meta?: Record<string, any>): void {
    this.log('warn', source, message, meta);
  }

  /**
   * Backward-compat alias used by older callers (serverMetrics, etc).
   * @deprecated use warn() instead.
   */
  logWarning(source: string, message: string, meta?: Record<string, any>): void {
    this.log('warn', source, message, meta);
  }

  /**
   * Quick statistics about the in-memory log buffer.
   * Returns both the legacy shape (errorCount/warningCount/totalLogs) used
   * by services like appScanner, AND the new (total/byLevel) shape.
   */
  getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    totalLogs: number;
  } {
    const byLevel: Record<LogLevel, number> = { error: 0, warn: 0, info: 0, debug: 0 };
    for (const entry of this._buffer) {
      if (entry && entry.level && byLevel[entry.level] !== undefined) {
        byLevel[entry.level]++;
      }
    }
    return {
      total: this._buffer.length,
      byLevel,
      errorCount:   byLevel.error,
      warningCount: byLevel.warn,
      infoCount:    byLevel.info,
      totalLogs:    this._buffer.length,
    };
  }

  info(source: string, message: string, meta?: Record<string, any>): void {
    this.log('info', source, message, meta);
  }

  /** Load persisted logs from storage */
  async load(): Promise<ErrorLogEntry[]> {
    if (this._loaded) return this._buffer;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: ErrorLogEntry[] = JSON.parse(raw);
        this._buffer = Array.isArray(parsed) ? parsed.slice(-MAX_LOGS) : [];
      }
    } catch {}
    this._loaded = true;
    return this._buffer;
  }

  /** Get all logs (most recent first) */
  getLogs(level?: LogLevel): ErrorLogEntry[] {
    const logs = [...this._buffer].reverse();
    return level ? logs.filter(l => l.level === level) : logs;
  }

  /** Clear all logs */
  async clear(): Promise<void> {
    this._buffer = [];
    try { await AsyncStorage.removeItem(STORAGE_KEY); } catch {}
  }

  private async _persist(): Promise<void> {
    this._saveTimer = null;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this._buffer));
    } catch {}
  }
}

export const autoErrorLogger = new AutoErrorLogger();
