/**
 * @file src/app/constants/theme-colors.ts
 * @description YYC3 集中式主题颜色注册表，定义所有硬编码的十六进制颜色，支持运行时覆盖
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags constants,typescript,theme,public
 * @depends @/app/constants/runtime-config
 */

/**
 * YYC-QATS Centralized Theme Color Registry
 * ────────────────────────────────────────────
 * Phase 21: All hardcoded hex colors in one place.
 * Supports runtime override via RuntimeConfig.
 *
 * Usage:
 *   import { getThemeColors } from '@/app/constants/theme-colors';
 *   const colors = getThemeColors(); // reads runtime overrides
 *   // In D3: .attr('fill', colors.textSecondary)
 */

import { runtimeConfig } from './runtime-config';

/** Full theme color palette */
export interface ThemeColorPalette {
  // ── Backgrounds ──
  bgPrimary: string;       // Main app background
  bgSecondary: string;     // Card/panel backgrounds
  bgTertiary: string;      // Elevated surfaces
  bgDark: string;          // Deepest background

  // ── Borders ──
  border: string;          // Default border
  borderLight: string;     // Subtle border

  // ── Text ──
  textPrimary: string;     // Primary text
  textSecondary: string;   // Secondary/muted text
  textTertiary: string;    // Disabled text

  // ── Brand / Semantic ──
  brandGreen: string;      // Success, up, online
  brandBlue: string;       // Info, links, primary actions
  brandYellow: string;     // Warning, caution
  brandRed: string;        // Error, down, danger
  brandPurple: string;     // Auxiliary accent
  brandOrange: string;     // Secondary warning

  // ── Chart-specific ──
  chartBg: string;         // Chart background
  chartGrid: string;       // Grid lines
  chartCrosshair: string;  // Crosshair lines
  chartTooltipBg: string;  // Tooltip background
  chartTooltipBorder: string;
}

/** Default dark theme (matches original hardcoded values) */
export const DARK_THEME: ThemeColorPalette = {
  bgPrimary:    '#0A192F',
  bgSecondary:  '#112240',
  bgTertiary:   '#1A2D4D',
  bgDark:       '#071425',

  border:       '#233554',
  borderLight:  '#1E3048',

  textPrimary:  '#CCD6F6',
  textSecondary:'#8892B0',
  textTertiary: '#5A6A8A',

  brandGreen:   '#38B2AC',
  brandBlue:    '#4299E1',
  brandYellow:  '#ECC94B',
  brandRed:     '#F56565',
  brandPurple:  '#9F7AEA',
  brandOrange:  '#ED8936',

  chartBg:      '#0A192F',
  chartGrid:    '#233554',
  chartCrosshair: '#8892B050',
  chartTooltipBg: '#0A192F',
  chartTooltipBorder: '#233554',
};

/** Light theme */
export const LIGHT_THEME: ThemeColorPalette = {
  bgPrimary:    '#F0F4F8',
  bgSecondary:  '#FFFFFF',
  bgTertiary:   '#EDF2F7',
  bgDark:       '#E2E8F0',

  border:       '#CBD5E0',
  borderLight:  '#E2E8F0',

  textPrimary:  '#1A202C',
  textSecondary:'#4A5568',
  textTertiary: '#A0AEC0',

  brandGreen:   '#2F855A',
  brandBlue:    '#2B6CB0',
  brandYellow:  '#D69E2E',
  brandRed:     '#C53030',
  brandPurple:  '#6B46C1',
  brandOrange:  '#C05621',

  chartBg:      '#FFFFFF',
  chartGrid:    '#E2E8F0',
  chartCrosshair: '#A0AEC070',
  chartTooltipBg: '#FFFFFF',
  chartTooltipBorder: '#CBD5E0',
};

/** All color key names with descriptions for the admin UI */
export const COLOR_DESCRIPTIONS: Record<keyof ThemeColorPalette, string> = {
  bgPrimary:        '主背景色',
  bgSecondary:      '卡片/面板背景',
  bgTertiary:       '浮层背景',
  bgDark:           '最深背景',
  border:           '默认边框',
  borderLight:      '细微边框',
  textPrimary:      '主要文字',
  textSecondary:    '次要文字',
  textTertiary:     '禁用文字',
  brandGreen:       '品牌绿 (上涨/成功)',
  brandBlue:        '信息蓝 (链接/主操作)',
  brandYellow:      '警告黄',
  brandRed:         '错误红 (下跌/危险)',
  brandPurple:      '辅助紫',
  brandOrange:      '次级警告橙',
  chartBg:          '图表背景',
  chartGrid:        '图表网格线',
  chartCrosshair:   '十字准星',
  chartTooltipBg:   'Tooltip 背景',
  chartTooltipBorder: 'Tooltip 边框',
};

/**
 * Get current theme colors with runtime overrides applied.
 * Priority: runtimeConfig overrides > base theme
 */
export function getThemeColors(mode?: 'dark' | 'light'): ThemeColorPalette {
  const base = (mode ?? getCurrentThemeMode()) === 'light' ? LIGHT_THEME : DARK_THEME;

  // Apply runtime overrides
  const overrides = runtimeConfig.get('themeOverrides') as Partial<ThemeColorPalette> | undefined;
  if (overrides && typeof overrides === 'object') {
    return { ...base, ...overrides };
  }
  return { ...base };
}

/** Get current theme mode from DOM */
function getCurrentThemeMode(): 'dark' | 'light' {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('yyc-light') ? 'light' : 'dark';
  }
  return 'dark';
}

/** Get Recharts-compatible tooltip style */
export function getRechartsTooltipStyle(colors?: ThemeColorPalette): React.CSSProperties {
  const c = colors ?? getThemeColors();
  return {
    backgroundColor: c.chartTooltipBg,
    border: `1px solid ${c.chartTooltipBorder}`,
    borderRadius: 8,
    fontSize: 11,
  };
}

/** Get Recharts axis tick style */
export function getRechartsAxisStyle(colors?: ThemeColorPalette): Record<string, string | number> {
  const c = colors ?? getThemeColors();
  return { fill: c.textSecondary, fontSize: 9 };
}

/** Get Recharts CartesianGrid props */
export function getRechartsGridStyle(colors?: ThemeColorPalette): { strokeDasharray: string; stroke: string } {
  const c = colors ?? getThemeColors();
  return { strokeDasharray: '3 3', stroke: c.chartGrid };
}

/** Get Recharts label style for ReferenceLine etc. */
export function getRechartsLabelStyle(colors?: ThemeColorPalette): Record<string, string | number> {
  const c = colors ?? getThemeColors();
  return { fill: c.textSecondary, fontSize: 10 };
}

/**
 * Canvas / D3 chart color accessor.
 * Returns a flat object of all chart-relevant colors for imperative drawing.
 */
export function getCanvasChartColors(colors?: ThemeColorPalette) {
  const c = colors ?? getThemeColors();
  return {
    bg:           c.chartBg,
    bgDark:       c.bgDark,
    grid:         c.chartGrid,
    crosshair:    c.chartCrosshair,
    textPrimary:  c.textPrimary,
    textSecondary: c.textSecondary,
    textTertiary: c.textTertiary,
    border:       c.border,
    up:           c.brandGreen,
    down:         c.brandRed,
    blue:         c.brandBlue,
    yellow:       c.brandYellow,
    purple:       c.brandPurple,
    orange:       c.brandOrange,
    tooltipBg:    c.chartTooltipBg,
    tooltipBorder: c.chartTooltipBorder,
  };
}

/** Indicator color presets (for MA/EMA/BOLL overlays) */
export const INDICATOR_COLORS = {
  ma10:       '#ECC94B',
  ma30:       '#4299E1',
  ema12:      '#9F7AEA',
  ema26:      '#F56565',
  bollUpper:  '#38B2AC',
  bollMiddle: '#ECC94B',
  bollLower:  '#F56565',
  bollFill:   '#38B2AC08',
} as const;

/** Strategy comparison color series */
export const COMPARISON_COLORS = [
  '#38B2AC', '#4299E1', '#ECC94B', '#F56565', '#9F7AEA', '#ED8936',
  '#63B3ED', '#68D391', '#FC8181', '#B794F4', '#F6AD55', '#76E4F7',
] as const;