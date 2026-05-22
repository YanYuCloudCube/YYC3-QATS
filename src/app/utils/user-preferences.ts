/**
 * @file src/app/utils/user-preferences.ts
 * @description YYC3 用户偏好持久化管理，提供版本化 localStorage 持久化、迁移支持和自动保存功能
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags utils,typescript,preferences,public
 */

/**
 * YYC-QATS User Preferences Persistence
 * ──────────────────────────────────────
 * Phase 20A: Centralized user preference management
 *
 * Features:
 *   1. Versioned localStorage persistence with migration support
 *   2. Tracks: sidebar state, active module/sub, favorites, recent nav, widget layout
 *   3. Auto-save on change via subscribe() pattern
 *   4. Export/import preferences as JSON
 *   5. Debounced save to avoid excessive writes
 *   6. globalThis singleton cache for HMR safety
 */

// ── Types ──

export interface FavoritePair {
  symbol: string;
  name: string;
  addedAt: number;
}

export interface RecentNavItem {
  module: string;
  sub: string;
  tertiary?: string;
  timestamp: number;
  label: string;
}

export interface WidgetLayout {
  id: string;
  type: string;
  position: number;
  visible: boolean;
  config?: Record<string, unknown>;
}

export interface UserPreferences {
  version: number;
  // Navigation state
  lastModule: string;
  lastSub: string;
  lastTertiary: string;
  sidebarCollapsed: boolean;
  // Favorites
  favoritePairs: FavoritePair[];
  favoriteModules: string[];
  // Recent navigation (last 20)
  recentNav: RecentNavItem[];
  // Widget layout
  widgetLayouts: WidgetLayout[];
  // UI preferences
  compactMode: boolean;
  tickerBarVisible: boolean;
  autoRefreshInterval: number; // seconds, 0 = disabled
  // Keyboard shortcuts enabled
  commandPaletteEnabled: boolean;
  // Custom watchlist columns
  watchlistColumns: string[];
}

import { useState, useEffect, useCallback } from 'react';

import { GLOBAL_KEYS } from '@/app/constants/global-keys';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';

const CURRENT_VERSION = 1;
const MAX_RECENT_NAV = 20;
const MAX_FAVORITES = 50;
const SAVE_DEBOUNCE_MS = 500;

// ── Default Preferences ──

export const DEFAULT_PREFERENCES: UserPreferences = {
  version: CURRENT_VERSION,
  lastModule: 'market',
  lastSub: 'live',
  lastTertiary: '',
  sidebarCollapsed: false,
  favoritePairs: [],
  favoriteModules: [],
  recentNav: [],
  widgetLayouts: [
    { id: 'w-portfolio', type: 'portfolio_summary', position: 0, visible: true },
    { id: 'w-price-ticker', type: 'price_ticker', position: 1, visible: true },
    { id: 'w-mini-chart', type: 'mini_chart', position: 2, visible: true, config: { symbol: 'BTCUSDT' } },
    { id: 'w-signals', type: 'recent_signals', position: 3, visible: true },
    { id: 'w-alerts', type: 'alerts_summary', position: 4, visible: true },
    { id: 'w-positions', type: 'open_positions', position: 5, visible: true },
  ],
  compactMode: false,
  tickerBarVisible: true,
  autoRefreshInterval: 5,
  commandPaletteEnabled: true,
  watchlistColumns: ['price', 'change', 'volume', 'high24h', 'low24h'],
};

// ── Preference Manager ──

type PrefsListener = (prefs: UserPreferences) => void;

export interface PreferenceManager {
  prefs: UserPreferences;
  // Getters
  get<K extends keyof UserPreferences>(key: K): UserPreferences[K];
  // Setters
  set<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): void;
  update(partial: Partial<UserPreferences>): void;
  // Favorites
  addFavoritePair(pair: Omit<FavoritePair, 'addedAt'>): void;
  removeFavoritePair(symbol: string): void;
  isFavoritePair(symbol: string): boolean;
  toggleFavoriteModule(moduleId: string): void;
  isFavoriteModule(moduleId: string): boolean;
  // Recent navigation
  addRecentNav(item: Omit<RecentNavItem, 'timestamp'>): void;
  getRecentNav(limit?: number): RecentNavItem[];
  clearRecentNav(): void;
  // Widget layout
  updateWidgetLayout(layouts: WidgetLayout[]): void;
  toggleWidget(widgetId: string): void;
  moveWidget(widgetId: string, newPosition: number): void;
  // Persistence
  save(): void;
  load(): UserPreferences;
  reset(): void;
  exportJSON(): string;
  importJSON(json: string): boolean;
  // Subscription
  subscribe(listener: PrefsListener): () => void;
}

function createPreferenceManager(): PreferenceManager {
  let prefs: UserPreferences = { ...DEFAULT_PREFERENCES };
  const listeners = new Set<PrefsListener>();
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  // Load from localStorage
  function load(): UserPreferences {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER_PREFS);
      if (!raw) return prefs;
      const parsed = JSON.parse(raw);
      // Version migration
      if (!parsed.version || parsed.version < CURRENT_VERSION) {
        // Merge with defaults for any new fields
        prefs = { ...DEFAULT_PREFERENCES, ...parsed, version: CURRENT_VERSION };
      } else {
        prefs = { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch {
      // Corrupted data, use defaults
      prefs = { ...DEFAULT_PREFERENCES };
    }
    return prefs;
  }

  // Save to localStorage (debounced)
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEYS.USER_PREFS, JSON.stringify(prefs));
      } catch {
        // Storage full or unavailable
        console.warn('[UserPrefs] Failed to save preferences');
      }
    }, SAVE_DEBOUNCE_MS);
  }

  function notify() {
    listeners.forEach(fn => {
      try { fn(prefs); } catch { /* */ }
    });
  }

  // Initialize
  load();

  const manager: PreferenceManager = {
    get prefs() { return prefs; },

    get<K extends keyof UserPreferences>(key: K): UserPreferences[K] {
      return prefs[key];
    },

    set<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
      (prefs as any)[key] = value;
      scheduleSave();
      notify();
    },

    update(partial: Partial<UserPreferences>) {
      Object.assign(prefs, partial);
      scheduleSave();
      notify();
    },

    addFavoritePair(pair) {
      if (prefs.favoritePairs.some(p => p.symbol === pair.symbol)) return;
      if (prefs.favoritePairs.length >= MAX_FAVORITES) {
        prefs.favoritePairs.pop();
      }
      prefs.favoritePairs.unshift({ ...pair, addedAt: Date.now() });
      scheduleSave();
      notify();
    },

    removeFavoritePair(symbol) {
      prefs.favoritePairs = prefs.favoritePairs.filter(p => p.symbol !== symbol);
      scheduleSave();
      notify();
    },

    isFavoritePair(symbol) {
      return prefs.favoritePairs.some(p => p.symbol === symbol);
    },

    toggleFavoriteModule(moduleId) {
      const idx = prefs.favoriteModules.indexOf(moduleId);
      if (idx >= 0) {
        prefs.favoriteModules.splice(idx, 1);
      } else {
        prefs.favoriteModules.push(moduleId);
      }
      scheduleSave();
      notify();
    },

    isFavoriteModule(moduleId) {
      return prefs.favoriteModules.includes(moduleId);
    },

    addRecentNav(item) {
      // Deduplicate by module+sub+tertiary
      const key = `${item.module}:${item.sub}:${item.tertiary || ''}`;
      prefs.recentNav = prefs.recentNav.filter(
        r => `${r.module}:${r.sub}:${r.tertiary || ''}` !== key
      );
      prefs.recentNav.unshift({ ...item, timestamp: Date.now() });
      if (prefs.recentNav.length > MAX_RECENT_NAV) {
        prefs.recentNav = prefs.recentNav.slice(0, MAX_RECENT_NAV);
      }
      scheduleSave();
      notify();
    },

    getRecentNav(limit = 10) {
      return prefs.recentNav.slice(0, limit);
    },

    clearRecentNav() {
      prefs.recentNav = [];
      scheduleSave();
      notify();
    },

    updateWidgetLayout(layouts) {
      prefs.widgetLayouts = layouts;
      scheduleSave();
      notify();
    },

    toggleWidget(widgetId) {
      const widget = prefs.widgetLayouts.find(w => w.id === widgetId);
      if (widget) {
        widget.visible = !widget.visible;
        scheduleSave();
        notify();
      }
    },

    moveWidget(widgetId, newPosition) {
      const idx = prefs.widgetLayouts.findIndex(w => w.id === widgetId);
      if (idx < 0) return;
      const [widget] = prefs.widgetLayouts.splice(idx, 1);
      widget.position = newPosition;
      prefs.widgetLayouts.splice(newPosition, 0, widget);
      // Reindex positions
      prefs.widgetLayouts.forEach((w, i) => { w.position = i; });
      scheduleSave();
      notify();
    },

    save() {
      if (saveTimer) clearTimeout(saveTimer);
      try {
        localStorage.setItem(STORAGE_KEYS.USER_PREFS, JSON.stringify(prefs));
      } catch { /* */ }
    },

    load,

    reset() {
      prefs = { ...DEFAULT_PREFERENCES };
      try { localStorage.removeItem(STORAGE_KEYS.USER_PREFS); } catch { /* */ }
      notify();
    },

    exportJSON() {
      return JSON.stringify(prefs, null, 2);
    },

    importJSON(json: string) {
      try {
        const parsed = JSON.parse(json);
        if (typeof parsed !== 'object' || !parsed) return false;
        prefs = { ...DEFAULT_PREFERENCES, ...parsed, version: CURRENT_VERSION };
        manager.save();
        notify();
        return true;
      } catch {
        return false;
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };

  return manager;
}

// ── Singleton (globalThis cached for HMR safety) ──

export const preferenceManager: PreferenceManager =
  (globalThis as any)[GLOBAL_KEYS.PREFERENCE_MANAGER] ||
  ((globalThis as any)[GLOBAL_KEYS.PREFERENCE_MANAGER] = createPreferenceManager());

// ── React Hook ──


export function useUserPreferences() {
  const [prefs, setPrefs] = useState<UserPreferences>(preferenceManager.prefs);

  useEffect(() => {
    const unsub = preferenceManager.subscribe(newPrefs => {
      setPrefs({ ...newPrefs });
    });
    return unsub;
  }, []);

  const updatePref = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    preferenceManager.set(key, value);
  }, []);

  return { prefs, updatePref, manager: preferenceManager };
}

// Expose to globalThis for console access
if (typeof globalThis !== 'undefined') {
  (globalThis as any).preferenceManager = preferenceManager;
}