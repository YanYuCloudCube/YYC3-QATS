import { describe, expect, it } from 'vitest';

import { DARK_THEME, LIGHT_THEME, getThemeColors } from '@/app/constants/theme-colors';

describe('theme-colors', () => {
  describe('getThemeColors', () => {
    it('should return dark theme by default', () => {
      const colors = getThemeColors('dark');
      expect(colors).toStrictEqual(DARK_THEME);
      expect(colors.bgPrimary).toBe('#0A192F');
      expect(colors.brandGreen).toBe('#38B2AC');
    });

    it('should return light theme when specified', () => {
      const colors = getThemeColors('light');
      expect(colors).toStrictEqual(LIGHT_THEME);
      expect(colors.bgPrimary).toBe('#F0F4F8');
    });
  });

  describe('DARK_THEME', () => {
    it('should have all required color keys', () => {
      const requiredKeys = [
        'bgPrimary', 'bgSecondary', 'bgTertiary', 'bgDark',
        'border', 'borderLight',
        'textPrimary', 'textSecondary', 'textTertiary',
        'brandGreen', 'brandBlue', 'brandYellow', 'brandRed', 'brandPurple', 'brandOrange',
        'chartBg', 'chartGrid', 'chartCrosshair', 'chartTooltipBg', 'chartTooltipBorder',
      ];

      for (const key of requiredKeys) {
        expect(DARK_THEME).toHaveProperty(key);
        expect(typeof (DARK_THEME as unknown as Record<string, string>)[key]).toBe('string');
      }
    });

    it('should use valid hex color format', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6,8}$/;
      const entries = Object.entries(DARK_THEME) as [string, string][];
      for (const [, value] of entries) {
        expect(value).toMatch(hexRegex);
      }
    });
  });

  describe('LIGHT_THEME', () => {
    it('should have all required color keys', () => {
      const requiredKeys = [
        'bgPrimary', 'bgSecondary', 'bgTertiary', 'bgDark',
        'border', 'borderLight',
        'textPrimary', 'textSecondary', 'textTertiary',
        'brandGreen', 'brandBlue', 'brandYellow', 'brandRed', 'brandPurple', 'brandOrange',
      ];

      for (const key of requiredKeys) {
        expect(LIGHT_THEME).toHaveProperty(key);
      }
    });
  });
});
