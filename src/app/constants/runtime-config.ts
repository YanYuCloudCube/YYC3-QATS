/**
 * @file src/app/constants/runtime-config.ts
 * @description YYC3 运行时配置管理器，提供集中式可覆盖配置，支持环境变量和运行时修改
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags constants,typescript,config,public
 * @depends @/app/constants/storage-keys
 */

/**
 * YYC-QATS Runtime Configuration Manager
 * ───────────────────────────────────────────────
 * Phase 21: Centralized runtime-overridable configuration.
 *
 * Design:
 *   1. env(key, fallback) — reads import.meta.env → localStorage override → fallback
 *   2. Non-reversible values (API URLs, domains) are env()-protected
 *   3. All values editable via Admin ConfigCenter UI
 *   4. Changes dispatch EVENTS.CONFIG_CHANGE for reactive consumers
 */

import { STORAGE_KEYS } from './storage-keys';

// ═══════════════════════════════════════
// §1  env() — Environment Variable Reader
// ═══════════════════════════════════════

/**
 * Read a configuration value with cascading priority:
 *   1. import.meta.env.VITE_YYC_<KEY> (compile-time, highest priority)
 *   2. runtimeConfig override (user-set via UI)
 *   3. fallback default
 *
 * Non-reversible items (e.g., production API URL) should always
 * use env() so that compile-time overrides take precedence.
 */
export function env(key: string, fallback: string): string {
  // 1. Compile-time env var (Vite injects VITE_ prefixed vars)
  try {
    const envKey = `VITE_YYC_${key.toUpperCase().replace(/\./g, '_')}`;
    const envVal = (import.meta as any).env?.[envKey];
    if (envVal !== undefined && envVal !== '') return String(envVal);
  } catch { /* not in Vite context */ }

  // 2. Runtime override from localStorage config store
  try {
    const stored = _getConfigStore();
    if (stored && key in stored && stored[key] !== undefined && stored[key] !== '') {
      return String(stored[key]);
    }
  } catch { /* */ }

  // 3. Fallback
  return fallback;
}

/** Typed env() for numbers */
export function envNum(key: string, fallback: number): number {
  const val = env(key, String(fallback));
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}

/** Typed env() for booleans */
export function envBool(key: string, fallback: boolean): boolean {
  const val = env(key, String(fallback));
  return val === 'true' || val === '1';
}

// ═══════════════════════════════════════
// §2  Runtime Config Store
// ═══════════════════════════════════════

type ConfigValue = string | number | boolean | string[] | Record<string, unknown> | null;
type ConfigStore = Record<string, ConfigValue>;
type ConfigListener = (config: ConfigStore) => void;

let _cache: ConfigStore | null = null;
const _listeners = new Set<ConfigListener>();

function _getConfigStore(): ConfigStore {
  if (_cache) return _cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RUNTIME_CONFIG);
    _cache = raw ? JSON.parse(raw) : {};
  } catch {
    _cache = {};
  }
  return _cache!;
}

function _saveConfigStore(store: ConfigStore): void {
  _cache = store;
  try {
    localStorage.setItem(STORAGE_KEYS.RUNTIME_CONFIG, JSON.stringify(store));
  } catch { /* quota */ }
  _notifyListeners();
}

function _notifyListeners(): void {
  const store = _getConfigStore();
  _listeners.forEach(fn => { try { fn(store); } catch { /* */ } });
  // Dispatch global event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('yyc_config_change', { detail: store }));
  }
}

/**
 * The runtime config singleton.
 * Used by constants files (theme-colors, symbols, etc.) to check overrides,
 * and by the ConfigCenter UI to set values.
 */
export const runtimeConfig = {
  /** Get a config value */
  get(key: string): ConfigValue | undefined {
    return _getConfigStore()[key];
  },

  /** Set a config value */
  set(key: string, value: ConfigValue): void {
    const store = { ..._getConfigStore(), [key]: value };
    _saveConfigStore(store);
  },

  /** Remove a config value (revert to default) */
  remove(key: string): void {
    const store = { ..._getConfigStore() };
    delete store[key];
    _saveConfigStore(store);
  },

  /** Get all config */
  getAll(): ConfigStore {
    return { ..._getConfigStore() };
  },

  /** Replace all config */
  setAll(store: ConfigStore): void {
    _saveConfigStore({ ...store });
  },

  /** Reset all runtime overrides */
  reset(): void {
    _cache = null;
    try { localStorage.removeItem(STORAGE_KEYS.RUNTIME_CONFIG); } catch { /* */ }
    _notifyListeners();
  },

  /** Subscribe to config changes */
  subscribe(listener: ConfigListener): () => void {
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  },

  /** Export as JSON */
  exportJSON(): string {
    return JSON.stringify(_getConfigStore(), null, 2);
  },

  /** Import from JSON */
  importJSON(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed !== 'object' || !parsed) return false;
      _saveConfigStore(parsed);
      return true;
    } catch { return false; }
  },
};

// ═══════════════════════════════════════
// §3  Magic Numbers Registry
// ═══════════════════════════════════════

/** All tunable numeric constants with metadata */
export interface MagicNumber {
  key: string;
  label: string;
  category: 'timeout' | 'retry' | 'cache' | 'threshold' | 'limit' | 'interval';
  defaultValue: number;
  unit: string;
  min?: number;
  max?: number;
  description: string;
}

export const MAGIC_NUMBERS: MagicNumber[] = [
  // ── Timeouts ──
  { key: 'http.timeout.dev',        label: 'HTTP超时(开发)',     category: 'timeout',  defaultValue: 10000,  unit: 'ms', min: 1000, max: 60000, description: '开发环境 HTTP 请求超时' },
  { key: 'http.timeout.test',       label: 'HTTP超时(测试)',     category: 'timeout',  defaultValue: 15000,  unit: 'ms', min: 1000, max: 60000, description: '测试环境 HTTP 请求超时' },
  { key: 'http.timeout.prod',       label: 'HTTP超时(生产)',     category: 'timeout',  defaultValue: 15000,  unit: 'ms', min: 1000, max: 60000, description: '生产环境 HTTP 请求超时' },
  { key: 'fetch.timeout.coingecko', label: 'CoinGecko超时',     category: 'timeout',  defaultValue: 8000,   unit: 'ms', min: 1000, max: 30000, description: 'CoinGecko API 请求超时' },
  { key: 'test.timeout',            label: '测试套件超时',       category: 'timeout',  defaultValue: 10000,  unit: 'ms', min: 3000, max: 60000, description: '单个测试用例超时' },

  // ── Intervals ──
  { key: 'ws.heartbeat.dev',        label: 'WS心跳(开发)',      category: 'interval', defaultValue: 30000,  unit: 'ms', min: 5000, max: 120000, description: 'WebSocket 心跳间隔' },
  { key: 'ws.heartbeat.test',       label: 'WS心跳(测试)',      category: 'interval', defaultValue: 30000,  unit: 'ms', min: 5000, max: 120000, description: 'WebSocket 心跳间隔' },
  { key: 'ws.heartbeat.prod',       label: 'WS心跳(生产)',      category: 'interval', defaultValue: 25000,  unit: 'ms', min: 5000, max: 120000, description: 'WebSocket 心跳间隔' },
  { key: 'offline.heartbeat',       label: '离线心跳',           category: 'interval', defaultValue: 30000,  unit: 'ms', min: 5000, max: 120000, description: '离线检测心跳间隔' },

  // ── Retries ──
  { key: 'ws.reconnect.delay.dev',  label: 'WS重连延迟(开发)',  category: 'retry',    defaultValue: 3000,   unit: 'ms', min: 500,  max: 30000, description: 'WebSocket 初始重连延迟' },
  { key: 'ws.reconnect.delay.test', label: 'WS重连延迟(测试)',  category: 'retry',    defaultValue: 5000,   unit: 'ms', min: 500,  max: 30000, description: 'WebSocket 初始重连延迟' },
  { key: 'ws.reconnect.max',        label: 'WS最大重连次数',     category: 'retry',    defaultValue: 10,     unit: '次', min: 1,    max: 50,    description: 'WebSocket 最大重连尝试次数' },
  { key: 'ws.channel.base_delay',   label: '频道重连基础延迟',   category: 'retry',    defaultValue: 1000,   unit: 'ms', min: 100,  max: 10000, description: 'WSChannelManager 指数退避基础延迟' },
  { key: 'ws.channel.max_delay',    label: '频道重连最大延迟',   category: 'retry',    defaultValue: 30000,  unit: 'ms', min: 1000, max: 120000,description: 'WSChannelManager 指数退避上限' },

  // ── Cache ──
  { key: 'cache.coingecko.ttl',     label: 'CoinGecko缓存TTL', category: 'cache',    defaultValue: 120000, unit: 'ms', min: 10000, max: 600000, description: 'CoinGecko 内存缓存存活时间' },
  { key: 'cache.memoize.maxSize',   label: '缓存记忆化上限',    category: 'cache',    defaultValue: 100,    unit: '条', min: 10,   max: 10000, description: 'memoize 函数 LRU 缓存上限' },

  // ── Thresholds ──
  { key: 'cb.failure_threshold',    label: '熔断失败阈值',       category: 'threshold',defaultValue: 5,      unit: '次', min: 1,    max: 50,    description: 'WS频道断路器触发阈值' },
  { key: 'cb.reset_timeout',        label: '熔断恢复超时',       category: 'threshold',defaultValue: 15000,  unit: 'ms', min: 1000, max: 120000,description: '断路器从 OPEN→HALF_OPEN 恢复时间' },
  { key: 'risk.var_daily_limit',    label: 'VaR日度限额',       category: 'threshold',defaultValue: 15000,  unit: 'USD',min: 1000, max: 1000000,description: '交易模块每日 VaR 上限' },

  // ── Limits ──
  { key: 'ws.buffer_size',          label: 'WS消息缓冲区',      category: 'limit',    defaultValue: 100,    unit: '条', min: 10,   max: 5000,  description: 'WS Hook 消息缓冲上限' },
  { key: 'risk.max_signals',        label: '风控信号上限',       category: 'limit',    defaultValue: 50,     unit: '条', min: 10,   max: 500,   description: '风控信号保留上限' },
  { key: 'bt.history.max',          label: '回测历史上限',       category: 'limit',    defaultValue: 20,     unit: '条', min: 5,    max: 200,   description: '回测历史保留条数' },
];

/** Get a magic number value (with runtime override) */
export function getMagicNumber(key: string): number {
  const def = MAGIC_NUMBERS.find(m => m.key === key);
  return envNum(key, def?.defaultValue ?? 0);
}

// ═══════════════════════════════════════
// §4  Console Exposure
// ═══════════════════════════════════════

if (typeof globalThis !== 'undefined') {
  (globalThis as any).runtimeConfig = runtimeConfig;
  (globalThis as any).env = env;
  (globalThis as any).getMagicNumber = getMagicNumber;
}
