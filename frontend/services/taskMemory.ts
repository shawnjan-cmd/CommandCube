/**
 * 🧠 TASK MEMORY SERVICE
 * Persistent task list for OnSpace AI coding assistant.
 * Survives app restarts — never forgets what to build/delete/fix/research.
 * Stored in AsyncStorage with full CRUD + categorization.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@butler_task_memory_v2';

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';
export type TaskCategory =
  | 'build'
  | 'fix'
  | 'delete'
  | 'research'
  | 'upgrade'
  | 'learn'
  | 'design'
  | 'test';

export interface Task {
  id: string;
  category: TaskCategory;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
  notes?: string;
  /** context hints that help OnSpace AI act on this task automatically */
  aiContext?: string;
}

const CATEGORY_ICONS: Record<TaskCategory, string> = {
  build: '🔨',
  fix: '🔧',
  delete: '🗑️',
  research: '🔍',
  upgrade: '⬆️',
  learn: '📚',
  design: '🎨',
  test: '🧪',
};

const PRIORITY_ORDER: Record<Task['priority'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

class TaskMemoryService {
  private tasks: Task[] = [];
  private loaded = false;
  private listeners: Set<() => void> = new Set();

  // ── Load from AsyncStorage ──────────────────────────────────
  async load(): Promise<Task[]> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      this.tasks = raw ? JSON.parse(raw) : [];
      this.loaded = true;
      return this.tasks;
    } catch {
      this.tasks = [];
      this.loaded = true;
      return [];
    }
  }

  // ── Ensure loaded ───────────────────────────────────────────
  private async ensure(): Promise<void> {
    if (!this.loaded) await this.load();
  }

  // ── Persist ─────────────────────────────────────────────────
  private async save(): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(this.tasks));
    this.listeners.forEach(cb => cb());
  }

  // ── Subscribe ────────────────────────────────────────────────
  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  // ── Create ──────────────────────────────────────────────────
  async add(params: {
    category: TaskCategory;
    title: string;
    description?: string;
    priority?: Task['priority'];
    aiContext?: string;
  }): Promise<Task> {
    await this.ensure();
    const now = new Date().toISOString();
    const task: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category: params.category,
      title: params.title,
      description: params.description || '',
      status: 'pending',
      priority: params.priority || 'medium',
      createdAt: now,
      updatedAt: now,
      aiContext: params.aiContext,
    };
    this.tasks.unshift(task);
    await this.save();
    return task;
  }

  // ── Update ──────────────────────────────────────────────────
  async update(id: string, changes: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'notes' | 'aiContext'>>): Promise<void> {
    await this.ensure();
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    this.tasks[idx] = {
      ...this.tasks[idx],
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    await this.save();
  }

  // ── Delete ──────────────────────────────────────────────────
  async remove(id: string): Promise<void> {
    await this.ensure();
    this.tasks = this.tasks.filter(t => t.id !== id);
    await this.save();
  }

  // ── Get all (sorted) ────────────────────────────────────────
  async getAll(): Promise<Task[]> {
    await this.ensure();
    return [...this.tasks].sort((a, b) => {
      // Pending first, then by priority desc, then by date
      if (a.status !== b.status) {
        if (a.status === 'pending') return -1;
        if (b.status === 'pending') return 1;
      }
      const pd = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      if (pd !== 0) return pd;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // ── Get pending ──────────────────────────────────────────────
  async getPending(): Promise<Task[]> {
    const all = await this.getAll();
    return all.filter(t => t.status === 'pending' || t.status === 'in_progress');
  }

  // ── Category icon helper ─────────────────────────────────────
  icon(category: TaskCategory): string {
    return CATEGORY_ICONS[category];
  }

  // ── Export summary for AI context ────────────────────────────
  async exportSummary(): Promise<string> {
    const pending = await this.getPending();
    if (!pending.length) return 'No pending tasks.';
    return pending
      .map(t => `[${this.icon(t.category)} ${t.category.toUpperCase()}] ${t.title} (${t.priority})${t.aiContext ? '\n  Context: ' + t.aiContext : ''}`)
      .join('\n');
  }

  // ── Clear completed ──────────────────────────────────────────
  async clearDone(): Promise<void> {
    await this.ensure();
    this.tasks = this.tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
    await this.save();
  }
}

export const taskMemory = new TaskMemoryService();
