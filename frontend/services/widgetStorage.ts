/**
 * Widget Storage Service v2
 * Persists user-created widgets per page.
 * Supports placement: 'floating' | 'inline-top' | 'inline-bottom'
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@butler_pinned_widgets_v2';

export type WidgetPlacement = 'floating' | 'inline-top' | 'inline-middle' | 'inline-bottom';

export interface PinnedWidget {
  id: string;
  pageId: string;
  label: string;
  code: string;
  placement: WidgetPlacement;
  x: number;
  y: number;
  height?: number;   // custom height for inline widgets (undefined = auto)
  createdAt: string;
}

async function loadAll(): Promise<PinnedWidget[]> {
  try {
    // Migrate v1 data
    const raw1 = await AsyncStorage.getItem('@butler_pinned_widgets_v1');
    const raw2 = await AsyncStorage.getItem(STORAGE_KEY);
    let widgets: PinnedWidget[] = [];
    if (raw2) {
      widgets = JSON.parse(raw2) as PinnedWidget[];
    } else if (raw1) {
      // Migrate from v1 (no placement field) → default to floating
      const v1 = JSON.parse(raw1) as any[];
      widgets = v1.map(w => ({ ...w, placement: 'floating' as WidgetPlacement }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    }
    return widgets;
  } catch {
    return [];
  }
}

async function saveAll(widgets: PinnedWidget[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

export const widgetStorage = {
  async getForPage(pageId: string): Promise<PinnedWidget[]> {
    const all = await loadAll();
    return all.filter(w => w.pageId === pageId);
  },

  async getForPageByPlacement(pageId: string, placement: WidgetPlacement): Promise<PinnedWidget[]> {
    const all = await loadAll();
    return all.filter(w => w.pageId === pageId && w.placement === placement);
  },

  async pin(widget: Omit<PinnedWidget, 'id' | 'createdAt'>): Promise<PinnedWidget> {
    const all = await loadAll();
    const newWidget: PinnedWidget = {
      ...widget,
      id: `widget_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    await saveAll([...all, newWidget]);
    return newWidget;
  },

  async updatePosition(id: string, x: number, y: number): Promise<void> {
    const all = await loadAll();
    const updated = all.map(w => w.id === id ? { ...w, x, y } : w);
    await saveAll(updated);
  },

  async updateCode(id: string, code: string, label?: string): Promise<void> {
    const all = await loadAll();
    const updated = all.map(w => w.id === id ? { ...w, code, ...(label ? { label } : {}) } : w);
    await saveAll(updated);
  },

  async updateHeight(id: string, height: number): Promise<void> {
    const all = await loadAll();
    const updated = all.map(w =>
      w.id === id
        ? { ...w, height: height > 0 ? Math.max(60, Math.round(height)) : undefined }
        : w
    );
    await saveAll(updated);
  },

  async updatePlacement(id: string, placement: WidgetPlacement): Promise<void> {
    const all = await loadAll();
    const updated = all.map(w => w.id === id ? { ...w, placement } : w);
    await saveAll(updated);
  },

  async remove(id: string): Promise<void> {
    const all = await loadAll();
    await saveAll(all.filter(w => w.id !== id));
  },

  async getAll(): Promise<PinnedWidget[]> {
    return loadAll();
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([STORAGE_KEY, '@butler_pinned_widgets_v1']);
  },
};
