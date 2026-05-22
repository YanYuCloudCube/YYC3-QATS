/**
 * @file src/app/constants/storage-keys.ts
 * @description YYC3 集中式 localStorage 键注册表，定义所有 localStorage 键，确保所有消费者统一导入
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags constants,typescript,storage,public
 */

/**
 * YYC-QATS Centralized localStorage Key Registry
 * ─────────────────────────────────────────────────
 * Phase 21: All localStorage keys in one place.
 * Every consumer MUST import from here — no inline strings allowed.
 */

export const STORAGE_KEYS = {
  // ── Environment & Config ──
  API_ENV:            'yyc_api_env',
  THEME:              'yyc_theme',
  LOCALE:             'yyc_locale',

  // ── User Data ──
  FAVORITES:          'yyc_favorites',
  ALERT_THRESHOLDS:   'yyc_alert_thresholds',
  USER_PREFS:         'yyc_user_prefs',
  CUSTOM_PANEL:       'yyc_custom_panel',

  // ── Backtest ──
  BT_LAST_CONFIG:     'yyc_bt_last_config',
  BT_HISTORY:         'yyc_bt_history',
  BT_PRESETS:         'yyc_bt_presets',

  // ── System ──
  CANARY_LAST:        'yyc_canary_last',
  OFFLINE_QUEUE:      'yyc_offline_queue',
  NOTIFICATIONS:      'yyc_notifications',

  // ── Runtime Config (Phase 21) ──
  RUNTIME_CONFIG:     'yyc_runtime_config',
} as const;

export type StorageKeyName = keyof typeof STORAGE_KEYS;
export type StorageKeyValue = (typeof STORAGE_KEYS)[StorageKeyName];

/** List all storage keys for admin panel display */
export function getAllStorageKeys(): { name: StorageKeyName; key: StorageKeyValue; description: string }[] {
  return [
    { name: 'API_ENV',          key: STORAGE_KEYS.API_ENV,          description: 'API 环境选择 (development/test/production)' },
    { name: 'THEME',            key: STORAGE_KEYS.THEME,            description: '主题模式 (dark/light)' },
    { name: 'LOCALE',           key: STORAGE_KEYS.LOCALE,           description: '界面语言 (zh-CN/en-US/ja-JP)' },
    { name: 'FAVORITES',        key: STORAGE_KEYS.FAVORITES,        description: '自选交易对列表' },
    { name: 'ALERT_THRESHOLDS', key: STORAGE_KEYS.ALERT_THRESHOLDS, description: '预警阈值配置' },
    { name: 'USER_PREFS',       key: STORAGE_KEYS.USER_PREFS,       description: '用户偏好设置 (侧边栏/布局等)' },
    { name: 'CUSTOM_PANEL',     key: STORAGE_KEYS.CUSTOM_PANEL,     description: '自定义看板布局' },
    { name: 'BT_LAST_CONFIG',   key: STORAGE_KEYS.BT_LAST_CONFIG,   description: '最近一次回测配置' },
    { name: 'BT_HISTORY',       key: STORAGE_KEYS.BT_HISTORY,       description: '回测历史记录' },
    { name: 'BT_PRESETS',       key: STORAGE_KEYS.BT_PRESETS,       description: '策略预设列表' },
    { name: 'CANARY_LAST',      key: STORAGE_KEYS.CANARY_LAST,      description: '金丝雀探测缓存报告' },
    { name: 'OFFLINE_QUEUE',    key: STORAGE_KEYS.OFFLINE_QUEUE,    description: '离线操作队列' },
    { name: 'NOTIFICATIONS',    key: STORAGE_KEYS.NOTIFICATIONS,    description: '通知中心消息存储' },
    { name: 'RUNTIME_CONFIG',   key: STORAGE_KEYS.RUNTIME_CONFIG,   description: '运行时可编辑配置' },
  ];
}
