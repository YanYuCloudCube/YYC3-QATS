/**
 * @file src/app/contexts/SettingsContext.tsx
 * @description YYC3 设置上下文，提供语言、颜色方案、主题模式和颜色辅助函数的集中管理
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags context,react,typescript,settings,public
 * @depends react,@/app/i18n,@/app/constants
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { EVENTS } from '@/app/constants/events';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import { getThemeColors } from '@/app/constants/theme-colors';
import { changeLanguage, getCurrentLocale, type SupportedLocale } from '@/app/i18n/mock';

type ColorScheme = 'standard' | 'china';
export type ThemeMode = 'dark' | 'light';

interface SettingsContextType {
  language: string;
  setLanguage: (lang: string) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  getUpColor: () => string;
  getDownColor: () => string;
  getChangeColorClass: (change: number | string) => string;
  getChangeBgClass: (change: number | string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function resolveInitialTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* */ }
  return 'dark';
}

/** Apply theme class to document root + meta theme-color */
function applyThemeToDOM(theme: ThemeMode) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('yyc-light');
    root.classList.remove('yyc-dark');
  } else {
    root.classList.add('yyc-dark');
    root.classList.remove('yyc-light');
  }
  // Update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const colors = getThemeColors(theme);
    meta.setAttribute('content', colors.bgPrimary);
  }
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState(getCurrentLocale());
  const [colorScheme, setColorScheme] = useState<ColorScheme>('china');
  const [theme, setThemeState] = useState<ThemeMode>(resolveInitialTheme);

  // Apply theme on mount and changes
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  const setLanguage = useCallback((lang: string) => {
    // Map short codes to full locale codes
    const localeMap: Record<string, SupportedLocale> = {
      'zh': 'zh-CN', 'zh-CN': 'zh-CN',
      'en': 'en-US', 'en-US': 'en-US',
      'ja': 'ja-JP', 'ja-JP': 'ja-JP',
    };
    const locale = localeMap[lang] || 'zh-CN';
    setLangState(locale);
    changeLanguage(locale);
    document.documentElement.lang = locale;
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try { localStorage.setItem(STORAGE_KEYS.THEME, newTheme); } catch { /* */ }
    // Dispatch event for external listeners
    window.dispatchEvent(new CustomEvent(EVENTS.THEME_CHANGE, { detail: { theme: newTheme } }));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const getUpColor = () => {
    const colors = getThemeColors();
    return colorScheme === 'china' ? colors.brandRed : colors.brandGreen;
  };
  const getDownColor = () => {
    const colors = getThemeColors();
    return colorScheme === 'china' ? colors.brandGreen : colors.brandRed;
  };

  const getChangeColorClass = (change: number | string) => {
    const val = typeof change === 'string' ? parseFloat(change) : change;
    const colors = getThemeColors();
    if (val > 0) return colorScheme === 'china' ? `text-[${colors.brandRed}]` : `text-[${colors.brandGreen}]`;
    if (val < 0) return colorScheme === 'china' ? `text-[${colors.brandGreen}]` : `text-[${colors.brandRed}]`;
    return `text-[${colors.textSecondary}]`;
  };

  const getChangeBgClass = (change: number | string) => {
    const val = typeof change === 'string' ? parseFloat(change) : change;
    const colors = getThemeColors();
    if (val > 0) return colorScheme === 'china' ? `bg-[${colors.brandRed}]/20 text-[${colors.brandRed}]` : `bg-[${colors.brandGreen}]/20 text-[${colors.brandGreen}]`;
    if (val < 0) return colorScheme === 'china' ? `bg-[${colors.brandGreen}]/20 text-[${colors.brandGreen}]` : `bg-[${colors.brandRed}]/20 text-[${colors.brandRed}]`;
    return `bg-[${colors.border}]/20 text-[${colors.textSecondary}]`;
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        language, 
        setLanguage, 
        colorScheme, 
        setColorScheme,
        theme,
        setTheme,
        toggleTheme,
        getUpColor,
        getDownColor,
        getChangeColorClass,
        getChangeBgClass
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};