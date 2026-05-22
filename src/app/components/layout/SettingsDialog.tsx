/**
 * @file src/app/components/layout/SettingsDialog.tsx
 * @description YYC3 设置对话框组件,提供语言、主题等系统设置功能
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags component,react,typescript,settings,public
 * @depends react,@/app/contexts/SettingsContext,@/app/i18n/mock
 */

import React, { useEffect, useState } from 'react';

import { useSettings, type ThemeMode } from '@/app/contexts/SettingsContext';
import { useTranslation } from '@/app/i18n/mock';
import { SUPPORTED_LOCALES } from '@/app/i18n/mock';

// Inline icons - pure function components, no forwardRef
type IconProps = React.SVGProps<SVGSVGElement>;

const Languages = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>;
const Palette = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" strokeWidth={2}/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" strokeWidth={2}/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" strokeWidth={2}/><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" strokeWidth={2}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></svg>;
const X = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const Check = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} points="20 6 9 17 4 12" /></svg>;
const Sun = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>;
const Moon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>;

export const SettingsDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { language, setLanguage, colorScheme, setColorScheme, theme, setTheme } = useSettings();
  const { t } = useTranslation();
  const [pendingLang, setPendingLang] = useState(language);
  const [pendingTheme, setPendingTheme] = useState<ThemeMode>(theme);

  // Sync pending state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPendingLang(language);
      setPendingTheme(theme);
    }
  }, [isOpen, language, theme]);

  // Lock body scroll and handle Escape
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    setLanguage(pendingLang);
    setTheme(pendingTheme);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-[460px] bg-[#0A192F] border border-[#233554] rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: 'dialogIn 0.25s ease-out' }}
      >
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes dialogIn {
            from { opacity: 0; transform: scale(0.95) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Header */}
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {t('settings.title')}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#1A2B47] rounded-full text-[#8892B0] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-[#8892B0] mt-1">
            {t('settings.title') === '系统设置' ? '自定义您的量化交易系统偏好' : 
             t('settings.title') === 'Settings' ? 'Customize your trading system preferences' :
             'トレーディングシステムの設定をカスタマイズ'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 pt-2 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">

          {/* §1 Theme Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[#CCD6F6]">
              {pendingTheme === 'dark' ? <Moon className="w-4 h-4 text-[#4299E1]" /> : <Sun className="w-4 h-4 text-[#ECC94B]" />}
              {t('common.theme')}
            </div>
            <div className="flex gap-2">
              {/* Dark */}
              <button
                onClick={() => setPendingTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer transition-all ${
                  pendingTheme === 'dark'
                    ? 'border-[#4299E1] bg-[#4299E1]/10'
                    : 'border-[#233554] hover:bg-[#112240]'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span className="text-sm text-[#CCD6F6]">{t('settings.theme_dark')}</span>
                {pendingTheme === 'dark' && <Check className="w-3 h-3 text-[#4299E1]" />}
              </button>
              {/* Light */}
              <button
                onClick={() => setPendingTheme('light')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer transition-all ${
                  pendingTheme === 'light'
                    ? 'border-[#ECC94B] bg-[#ECC94B]/10'
                    : 'border-[#233554] hover:bg-[#112240]'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span className="text-sm text-[#CCD6F6]">{t('settings.theme_light')}</span>
                {pendingTheme === 'light' && <Check className="w-3 h-3 text-[#ECC94B]" />}
              </button>
            </div>
          </div>

          {/* §2 Language Selection — Full 3-language support */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[#CCD6F6]">
              <Languages className="w-4 h-4 text-[#38B2AC]" />
              {t('settings.language')}
            </div>
            <div className="space-y-2">
              {SUPPORTED_LOCALES.map((loc) => (
                <button
                  key={loc.code}
                  onClick={() => setPendingLang(loc.code)}
                  className={`w-full flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                    pendingLang === loc.code
                      ? 'border-[#38B2AC] bg-[#38B2AC]/5'
                      : 'border-[#233554] hover:bg-[#112240]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    pendingLang === loc.code
                      ? 'border-[#38B2AC] bg-[#38B2AC]'
                      : 'border-[#8892B0]'
                  }`}>
                    {pendingLang === loc.code && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <span className="text-sm text-[#CCD6F6]">{loc.nativeLabel}</span>
                      <span className="text-[10px] text-[#8892B0] ml-2">{loc.label}</span>
                    </div>
                    <span className="text-base">{loc.flag}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* §3 Color Scheme Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[#CCD6F6]">
              <Palette className="w-4 h-4 text-[#38B2AC]" />
              {t('settings.market_colors')}
            </div>
            <div className="space-y-2">
              {/* China scheme */}
              <button
                className={`w-full flex items-center gap-3 rounded-lg border p-3.5 cursor-pointer transition-all ${
                  colorScheme === 'china'
                    ? 'border-[#38B2AC] bg-[#38B2AC]/5'
                    : 'border-[#233554] hover:bg-[#112240]'
                }`}
                onClick={() => setColorScheme('china')}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  colorScheme === 'china' 
                    ? 'border-[#38B2AC] bg-[#38B2AC]' 
                    : 'border-[#8892B0]'
                }`}>
                  {colorScheme === 'china' && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <span className="text-sm text-[#CCD6F6]">{t('settings.china')}</span>
                  <div className="flex gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#F56565] border border-[#F56565]/30" title="Up"></span>
                    <span className="w-4 h-4 rounded-full bg-[#38B2AC] border border-[#38B2AC]/30" title="Down"></span>
                  </div>
                </div>
              </button>

              {/* Standard scheme */}
              <button
                className={`w-full flex items-center gap-3 rounded-lg border p-3.5 cursor-pointer transition-all ${
                  colorScheme === 'standard'
                    ? 'border-[#38B2AC] bg-[#38B2AC]/5'
                    : 'border-[#233554] hover:bg-[#112240]'
                }`}
                onClick={() => setColorScheme('standard')}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  colorScheme === 'standard' 
                    ? 'border-[#38B2AC] bg-[#38B2AC]' 
                    : 'border-[#8892B0]'
                }`}>
                  {colorScheme === 'standard' && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <span className="text-sm text-[#CCD6F6]">{t('settings.standard')}</span>
                  <div className="flex gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#38B2AC] border border-[#38B2AC]/30" title="Up"></span>
                    <span className="w-4 h-4 rounded-full bg-[#F56565] border border-[#F56565]/30" title="Down"></span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleSave}
            className="w-full bg-[#4299E1] text-white py-2.5 rounded-lg font-bold hover:brightness-110 transition-all text-sm"
          >
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
