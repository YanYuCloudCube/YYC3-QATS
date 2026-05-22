/**
 * @file src/app/components/ExportPanel.tsx
 * @description YYC3 数据导出面板组件,提供数据格式选择和导出功能
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags component,react,typescript,export,public
 * @depends react,@/app/i18n/mock,@/app/utils/data-export,sonner
 */

/**
 * YYC-QATS Export Panel (Phase 16D)
 * ──────────────────────────────────
 * Modal dialog for data export with format + data type selection.
 * Connects to data-export.ts preset functions.
 * No forwardRef, no radix-ui.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { useTranslation } from '@/app/i18n/mock';
import { exportMarketData, exportPositions, exportTrades, exportStrategies, exportRiskSnapshot, type ExportFormat, type ExportResult } from '@/app/utils/data-export';

type IconProps = React.SVGProps<SVGSVGElement>;
const X = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const Download = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" strokeWidth={2} /><line x1="12" y1="15" x2="12" y2="3" strokeWidth={2} /></svg>;
const Check = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} points="20 6 9 17 4 12" /></svg>;
const FileText = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} points="14 2 14 8 20 8" /></svg>;
const Loader = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4m-7-7H1m22 0h-4m-2.636-7.364L14.828 5.1m-5.656 13.8l-1.536 1.536m13.8-5.656l1.536-1.536M5.1 9.172L3.564 7.636" /></svg>;

type ExportDataType = 'market' | 'positions' | 'trades' | 'strategies' | 'risk';

interface ExportPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DATA_TYPE_OPTIONS: { type: ExportDataType; icon: string; key: string }[] = [
  { type: 'market',     icon: '📊', key: 'export.market_data' },
  { type: 'positions',  icon: '💼', key: 'export.positions' },
  { type: 'trades',     icon: '📈', key: 'export.trades' },
  { type: 'strategies', icon: '🧠', key: 'export.strategies' },
  { type: 'risk',       icon: '🛡️', key: 'export.risk_report' },
];

// Mock data generators for export
function getMockMarketData(): Record<string, unknown>[] {
  return [
    { symbol: 'BTC/USDT', name: 'Bitcoin', price: 96231.50, change: 2.45, volume: 28500000000, high24h: 97250, low24h: 94920, marketCap: 1890000000000, category: 'Crypto' },
    { symbol: 'ETH/USDT', name: 'Ethereum', price: 2451.20, change: -0.12, volume: 15200000000, high24h: 2520, low24h: 2410, marketCap: 295000000000, category: 'Crypto' },
    { symbol: 'SOL/USDT', name: 'Solana', price: 142.85, change: 5.10, volume: 4800000000, high24h: 148.50, low24h: 135.20, marketCap: 68000000000, category: 'Crypto' },
    { symbol: 'BNB/USDT', name: 'BNB', price: 612.40, change: 1.25, volume: 2100000000, high24h: 625, low24h: 602, marketCap: 92000000000, category: 'Crypto' },
    { symbol: 'AAPL', name: 'Apple Inc.', price: 185.92, change: 1.25, volume: 85000000, high24h: 187.50, low24h: 183.20, marketCap: 2850000000000, category: 'Stock' },
  ];
}

function getMockPositions(): Record<string, unknown>[] {
  return [
    { symbol: 'BTC/USDT', side: 'Long', quantity: 0.5, entryPrice: 94000, currentPrice: 96231.50, unrealizedPnl: 1115.75, pnlPercent: 2.37, strategy: 'Trend Follow' },
    { symbol: 'ETH/USDT', side: 'Short', quantity: 5, entryPrice: 2500, currentPrice: 2451.20, unrealizedPnl: 244, pnlPercent: 1.95, strategy: 'Mean Reversion' },
  ];
}

function getMockTrades(): Record<string, unknown>[] {
  return [
    { id: 'T001', time: '2026-03-06 10:30:00', symbol: 'BTC/USDT', side: 'Buy', price: 95800, quantity: 0.5, pnl: 0, strategy: 'Trend Follow' },
    { id: 'T002', time: '2026-03-06 09:15:00', symbol: 'ETH/USDT', side: 'Sell', price: 2500, quantity: 5, pnl: 244, strategy: 'Mean Reversion' },
    { id: 'T003', time: '2026-03-05 16:45:00', symbol: 'SOL/USDT', side: 'Buy', price: 138, quantity: 50, pnl: 242.5, strategy: 'Breakout' },
  ];
}

function getMockStrategies(): Record<string, unknown>[] {
  return [
    { id: 'S001', name: 'Trend Follow v3', type: 'Trend', status: 'Active', winRate: 62.5, pnl: 45820, sharpe: 1.85, maxDD: -8.2, trades: 156, version: 'v3.2' },
    { id: 'S002', name: 'Mean Reversion', type: 'MeanRev', status: 'Active', winRate: 58.3, pnl: 22340, sharpe: 1.42, maxDD: -12.5, trades: 89, version: 'v2.1' },
    { id: 'S003', name: 'ML Ensemble', type: 'ML', status: 'Testing', winRate: 71.2, pnl: 8900, sharpe: 2.15, maxDD: -5.1, trades: 34, version: 'v1.0' },
  ];
}

function getMockRisk(): Record<string, unknown> {
  return {
    totalExposure: 185000, var95: 12500, var99: 18200, maxDrawdown: -8.2,
    leverage: 2.1, correlationBTC: 0.85, sharpe: 1.65, sortino: 2.1,
    activePositions: 3, riskLevel: 'Medium',
  };
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [selectedTypes, setSelectedTypes] = useState<Set<ExportDataType>>(new Set(['market']));
  const [exporting, setExporting] = useState(false);
  const [lastResult, setLastResult] = useState<ExportResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const toggleType = useCallback((type: ExportDataType) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleExport = useCallback(async () => {
    if (selectedTypes.size === 0) {
      toast.warning(t('export.select_data'));
      return;
    }

    setExporting(true);
    setLastResult(null);

    // Small delay for UI feedback
    await new Promise(r => setTimeout(r, 300));

    let result: ExportResult | null = null;

    for (const type of selectedTypes) {
      switch (type) {
        case 'market':
          result = exportMarketData(getMockMarketData(), format);
          break;
        case 'positions':
          result = exportPositions(getMockPositions(), format);
          break;
        case 'trades':
          result = exportTrades(getMockTrades(), format);
          break;
        case 'strategies':
          result = exportStrategies(getMockStrategies(), format);
          break;
        case 'risk':
          result = exportRiskSnapshot(getMockRisk(), format);
          break;
      }
    }

    setExporting(false);
    if (result) {
      setLastResult(result);
      if (result.success) {
        toast.success(t('export.export_success'), {
          description: `${result.filename} (${(result.byteSize / 1024).toFixed(1)} KB)`,
        });
      } else {
        toast.error(t('export.export_failed'), { description: result.error });
      }
    }
  }, [selectedTypes, format, t]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" style={{ animation: 'fadeIn 0.2s ease-out' }} />

      <div className="relative w-full max-w-[480px] bg-[#0A192F] border border-[#233554] rounded-2xl shadow-2xl overflow-hidden" style={{ animation: 'dialogIn 0.25s ease-out' }}>
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes dialogIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        `}</style>

        {/* Header */}
        <div className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-[#38B2AC]" />
              {t('export.title')}
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-[#1A2B47] rounded-full text-[#8892B0] hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 pt-0 space-y-5">
          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-xs text-[#8892B0] uppercase tracking-wider">{t('common.export')} {t('common.settings') === '设置' ? '格式' : 'Format'}</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('csv')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm transition-all ${
                  format === 'csv' ? 'border-[#38B2AC] bg-[#38B2AC]/10 text-[#38B2AC]' : 'border-[#233554] text-[#8892B0] hover:bg-[#112240]'
                }`}
              >
                <FileText className="w-4 h-4" /> {t('export.format_csv')}
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm transition-all ${
                  format === 'json' ? 'border-[#4299E1] bg-[#4299E1]/10 text-[#4299E1]' : 'border-[#233554] text-[#8892B0] hover:bg-[#112240]'
                }`}
              >
                {'{ }'} {t('export.format_json')}
              </button>
            </div>
          </div>

          {/* Data Type Selection */}
          <div className="space-y-2">
            <label className="text-xs text-[#8892B0] uppercase tracking-wider">{t('export.select_data')}</label>
            <div className="space-y-2">
              {DATA_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.type}
                  onClick={() => toggleType(opt.type)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    selectedTypes.has(opt.type) ? 'border-[#38B2AC] bg-[#38B2AC]/5' : 'border-[#233554] hover:bg-[#112240]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selectedTypes.has(opt.type) ? 'border-[#38B2AC] bg-[#38B2AC]' : 'border-[#8892B0]'
                  }`}>
                    {selectedTypes.has(opt.type) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-base">{opt.icon}</span>
                  <span className="text-sm text-[#CCD6F6]">{t(opt.key)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Last Result */}
          {lastResult && (
            <div className={`p-3 rounded-lg border text-xs ${
              lastResult.success ? 'border-[#38B2AC]/30 bg-[#38B2AC]/5 text-[#38B2AC]' : 'border-[#F56565]/30 bg-[#F56565]/5 text-[#F56565]'
            }`}>
              {lastResult.success
                ? `${lastResult.filename} · ${lastResult.rowCount} ${t('common.settings') === '设置' ? '行' : 'rows'} · ${(lastResult.byteSize / 1024).toFixed(1)} KB`
                : lastResult.error
              }
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[#233554] text-[#8892B0] text-sm hover:bg-[#112240] transition-all">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || selectedTypes.size === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#38B2AC] text-white text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50"
          >
            {exporting ? (
              <><Loader className="w-4 h-4 animate-spin" /> {t('export.exporting')}</>
            ) : (
              <><Download className="w-4 h-4" /> {t('common.export')}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;