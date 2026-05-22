/**
 * @file src/app/api/config.ts
 * @description YYC3 API环境配置,支持开发/测试/生产环境,采用一主二备架构,提供集中式配置管理
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags api,typescript,config,critical,public
 * @depends @/app/constants
 */

/**
 * YYC-QATS API Environment Configuration
 * ───────────────────────────────────────
 * Centralized config for dev / test / production environments.
 * The active environment is auto-detected from window.location,
 * but can be overridden via localStorage key `yyc_api_env`.
 *
 * Architecture:  1 Primary + 2 Standby (一主二备)
 *   Primary  : yyc3-33  (8.152.195.33)
 *   Standby-1: yyc3-125 (123.56.43.125)
 *   Standby-2: nas-45   (192.168.3.45) — LAN only
 */

import { env, envNum } from '@/app/constants/runtime-config';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';

// ═══════════════════════════════════════
// Environment Definitions
// ═══════════════════════════════════════

export type ApiEnv = 'development' | 'test' | 'production';

export interface EnvConfig {
  /** Human-readable label */
  label: string;
  /** REST API base URL (no trailing slash) */
  apiBase: string;
  /** WebSocket endpoint */
  wsUrl: string;
  /** Health-check endpoint */
  healthUrl: string;
  /** Request timeout in ms */
  timeout: number;
  /** Max retry attempts for failed requests */
  maxRetries: number;
  /** WebSocket heartbeat interval in ms */
  wsHeartbeatInterval: number;
  /** WebSocket reconnect delay in ms */
  wsReconnectDelay: number;
}

const ENV_CONFIGS: Record<ApiEnv, EnvConfig> = {
  development: {
    label: '开发环境 (localhost)',
    apiBase: env('api.dev.base', 'http://localhost:3200'),
    wsUrl: env('ws.dev.url', 'ws://localhost:3200/ws'),
    healthUrl: env('api.dev.health', 'http://localhost:3200/health'),
    timeout: envNum('http.timeout.dev', 10_000),
    maxRetries: 2,
    wsHeartbeatInterval: envNum('ws.heartbeat.dev', 30_000),
    wsReconnectDelay: envNum('ws.reconnect.delay.dev', 3_000),
  },
  test: {
    label: '测试环境 (0379.world)',
    apiBase: env('api.test.base', 'https://test-api.0379.world'),
    wsUrl: env('ws.test.url', 'wss://test-api.0379.world/ws'),
    healthUrl: env('api.test.health', 'https://test-api.0379.world/health'),
    timeout: envNum('http.timeout.test', 15_000),
    maxRetries: 3,
    wsHeartbeatInterval: envNum('ws.heartbeat.test', 30_000),
    wsReconnectDelay: envNum('ws.reconnect.delay.test', 5_000),
  },
  production: {
    label: '生产环境 (0379.world)',
    apiBase: env('api.prod.base', 'https://api.0379.world'),
    wsUrl: env('ws.prod.url', 'wss://api.0379.world/ws'),
    healthUrl: env('api.prod.health', 'https://api.0379.world/health'),
    timeout: envNum('http.timeout.prod', 15_000),
    maxRetries: 3,
    wsHeartbeatInterval: envNum('ws.heartbeat.prod', 25_000),
    wsReconnectDelay: envNum('ws.reconnect.delay.test', 5_000),
  },
};

// ═══════════════════════════════════════
// Server Node Registry (一主二备)
// ═══════════════════════════════════════

export interface ServerNode {
  id: string;
  name: string;
  role: 'primary' | 'standby';
  host: string;
  port: number;
  type: 'compute' | 'storage';
}

export const SERVER_NODES: ServerNode[] = [
  { id: 'yyc3-33', name: 'Aliyun ECS-33 (主)', role: 'primary', host: '8.152.195.33', port: 22, type: 'compute' },
  { id: 'yyc3-125', name: 'Aliyun ECS-125 (备)', role: 'standby', host: '123.56.43.125', port: 22, type: 'compute' },
  { id: 'nas-45', name: 'YanYuCloud NAS (备)', role: 'standby', host: '192.168.3.45', port: 9557, type: 'storage' },
];

// ═══════════════════════════════════════
// Auto-detect & Override
// ═══════════════════════════════════════

function detectEnv(): ApiEnv {
  // Allow manual override via localStorage
  try {
    const override = localStorage.getItem(STORAGE_KEYS.API_ENV) as ApiEnv | null;
    if (override && override in ENV_CONFIGS) return override;
  } catch { /* SSR or blocked */ }

  // Auto-detect from hostname
  // Phase 9: Default to 'test' for all non-production hosts.
  // The dev environment (localhost:3200) is intentionally deprioritized
  // because all API services are deployed on cloud ECS.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const prodDomain = env('api.prod.domain', '0379.world');
    if (host.startsWith('api.' + prodDomain.split('.')[0]) || host === prodDomain) return 'production';
    if (host.startsWith('test')) return 'test';
  }
  // Default: use test environment (cloud ECS) instead of localhost
  return 'test';
}

// ═══════════════════════════════════════
// Exports
// ═══════════════════════════════════════

/** Current active environment */
export const currentEnv: ApiEnv = detectEnv();

/** Current environment configuration */
export const apiConfig: EnvConfig = ENV_CONFIGS[currentEnv];

/** Get config for a specific environment */
export function getEnvConfig(env: ApiEnv): EnvConfig {
  return ENV_CONFIGS[env];
}

/** All environment configs (for admin panel) */
export const allEnvConfigs = ENV_CONFIGS;

/** Switch environment (persists to localStorage, requires reload) */
export function switchEnv(env: ApiEnv): void {
  try {
    localStorage.setItem(STORAGE_KEYS.API_ENV, env);
    window.location.reload();
  } catch { /* */ }
}

/** Contact email */
export const ADMIN_EMAIL = 'admin@0379.email';

/** System service name */
export const SERVICE_NAME = 'yyc3_aify';