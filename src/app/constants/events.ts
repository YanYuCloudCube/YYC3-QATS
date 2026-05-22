/**
 * @file src/app/constants/events.ts
 * @description YYC3 集中式自定义事件名称注册表，定义所有 window.dispatchEvent/addEventListener 事件名称
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags constants,typescript,events,public
 */

/**
 * YYC-QATS Centralized CustomEvent Name Registry
 * ────────────────────────────────────────────────
 * Phase 21: All window.dispatchEvent / addEventListener event names.
 */

export const EVENTS = {
  THEME_CHANGE:   'yyc_theme_change',
  TOGGLE_THEME:   'yyc_toggle_theme',
  LOCALE_CHANGE:  'yyc_locale_change',
  NAVIGATE:       'yyc_navigate',
  CONFIG_CHANGE:  'yyc_config_change',   // Phase 21: runtime config changed
} as const;

export type EventName = keyof typeof EVENTS;
export type EventValue = (typeof EVENTS)[EventName];

/** List all events for admin panel display */
export function getAllEvents(): { name: EventName; event: EventValue; description: string }[] {
  return [
    { name: 'THEME_CHANGE',  event: EVENTS.THEME_CHANGE,  description: '主题切换事件 (detail: { theme })' },
    { name: 'TOGGLE_THEME',  event: EVENTS.TOGGLE_THEME,  description: '命令面板触发主题切换' },
    { name: 'LOCALE_CHANGE', event: EVENTS.LOCALE_CHANGE, description: '语言切换事件 (detail: { locale })' },
    { name: 'NAVIGATE',      event: EVENTS.NAVIGATE,      description: '导航跳转事件 (detail: { module, sub })' },
    { name: 'CONFIG_CHANGE', event: EVENTS.CONFIG_CHANGE,  description: '运行时配置变更事件' },
  ];
}
