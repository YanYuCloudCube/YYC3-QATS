/**
 * @file src/app/constants/symbols.ts
 * @description YYC3 集中式交易对注册表，定义默认交易对和符号列表，支持运行时覆盖
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags constants,typescript,symbols,public
 * @depends @/app/constants/runtime-config
 */

/**
 * YYC-QATS Centralized Trading Pair Registry
 * ────────────────────────────────────────────
 * Phase 21: Default trading pairs and symbol lists.
 * Supports runtime override via RuntimeConfig.
 */

import { runtimeConfig } from './runtime-config';

/** Primary tracked symbols (used in selectors, default favs, etc.) */
export const DEFAULT_SYMBOLS = [
  'BTC/USDT', 'ETH/USDT', 'SOL/USDT',
  'BNB/USDT', 'XRP/USDT', 'ADA/USDT',
] as const;

/** Extended symbol pool (including secondary coins) */
export const EXTENDED_SYMBOLS = [
  ...DEFAULT_SYMBOLS,
  'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT',
] as const;

/** Default symbol for chart, backtest, etc. */
export const DEFAULT_SYMBOL = 'BTC/USDT';

/** Default favorites (new user) */
export const DEFAULT_FAVORITES = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'] as const;

/** System metric pseudo-symbol */
export const SYSTEM_SYMBOL = '__system__' as const;

/**
 * Get current symbol list with runtime overrides.
 * Admin UI can add/remove symbols at runtime.
 */
export function getSymbols(): string[] {
  const override = runtimeConfig.get('symbols') as string[] | undefined;
  if (override && Array.isArray(override) && override.length > 0) return override;
  return [...DEFAULT_SYMBOLS];
}

/** Get extended symbols with runtime overrides */
export function getExtendedSymbols(): string[] {
  const override = runtimeConfig.get('extendedSymbols') as string[] | undefined;
  if (override && Array.isArray(override) && override.length > 0) return override;
  return [...EXTENDED_SYMBOLS];
}

/** Get default symbol (supports override) */
export function getDefaultSymbol(): string {
  const override = runtimeConfig.get('defaultSymbol') as string | undefined;
  return override || DEFAULT_SYMBOL;
}

/** Get default favorites (supports override) */
export function getDefaultFavorites(): string[] {
  const override = runtimeConfig.get('defaultFavorites') as string[] | undefined;
  if (override && Array.isArray(override) && override.length > 0) return override;
  return [...DEFAULT_FAVORITES];
}

/** Symbol option format for dropdowns */
export function getSymbolOptions(): { value: string; label: string }[] {
  return getSymbols().map(s => ({ value: s, label: s }));
}

/** Alert symbol options (includes system metrics) */
export function getAlertSymbolOptions(): { value: string; label: string }[] {
  return [
    ...getSymbolOptions(),
    { value: SYSTEM_SYMBOL, label: '系统指标' },
  ];
}
