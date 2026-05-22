/**
 * @file src/app/constants/global-keys.ts
 * @description YYC3 集中式 globalThis 单例键注册表，定义所有 globalThis.__YYC_*__ 键
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags constants,typescript,global,public
 */

/**
 * YYC-QATS Centralized globalThis Singleton Key Registry
 * ───────────────────────────────────────────────────────
 * Phase 21: All globalThis.__YYC_*__ keys in one place.
 * Used for HMR-safe singleton caching on globalThis.
 */

export const GLOBAL_KEYS = {
  GLOBAL_DATA_CONTEXT:  '__YYC_GlobalDataContext__',
  GLOBAL_ERROR_HANDLER: '__YYC_GlobalErrorHandler__',
  RAF_BATCH_QUEUE:      '__YYC_RAFBatchQueue__',
  RENDER_PROFILER:      '__YYC_RenderProfiler__',
  PREFERENCE_MANAGER:   '__YYC_PreferenceManager__',
  SIGNAL_CHAIN_ENGINE:  '__YYC_SignalChainEngine__',
  NOTIFICATION_STORE:   '__YYC_NotificationStore__',
  WEBSOCKET:            '__YYC_WebSocket__',
} as const;

export type GlobalKeyName = keyof typeof GLOBAL_KEYS;
export type GlobalKeyValue = (typeof GLOBAL_KEYS)[GlobalKeyName];

/** List all globalThis keys for admin panel display */
export function getAllGlobalKeys(): { name: GlobalKeyName; key: GlobalKeyValue; description: string }[] {
  return [
    { name: 'GLOBAL_DATA_CONTEXT',  key: GLOBAL_KEYS.GLOBAL_DATA_CONTEXT,  description: 'React Context 跨 HMR 持久化' },
    { name: 'GLOBAL_ERROR_HANDLER', key: GLOBAL_KEYS.GLOBAL_ERROR_HANDLER, description: '全局错误处理器单例' },
    { name: 'RAF_BATCH_QUEUE',      key: GLOBAL_KEYS.RAF_BATCH_QUEUE,      description: 'requestAnimationFrame 批处理队列' },
    { name: 'RENDER_PROFILER',      key: GLOBAL_KEYS.RENDER_PROFILER,      description: '渲染性能分析器' },
    { name: 'PREFERENCE_MANAGER',   key: GLOBAL_KEYS.PREFERENCE_MANAGER,   description: '用户偏好管理器' },
    { name: 'SIGNAL_CHAIN_ENGINE',  key: GLOBAL_KEYS.SIGNAL_CHAIN_ENGINE,  description: '信号链引擎单例' },
    { name: 'NOTIFICATION_STORE',   key: GLOBAL_KEYS.NOTIFICATION_STORE,   description: '通知中心存储' },
    { name: 'WEBSOCKET',            key: GLOBAL_KEYS.WEBSOCKET,            description: 'WebSocket 客户端单例' },
  ];
}
