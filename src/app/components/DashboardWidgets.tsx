/**
 * @file src/app/components/DashboardWidgets.tsx
 * @description YYC3 仪表板组件系统,提供可配置的小组件网格,包括投资组合摘要、价格行情、迷你图表、最新信号、警报摘要、当前持仓
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags component,react,typescript,dashboard,public
 * @depends react
 */

/**
 * YYC-QATS Dashboard Widgets System
 * ──────────────────────────────────
 * Phase 20C: Configurable widget grid for module overview panels
 *
 * Widget Types:
 *   1. portfolio_summary  - Account balance, PnL, positions count
 *   2. price_ticker       - Top movers with real-time prices
 *   3. mini_chart         - Compact sparkline chart
 *   4. recent_signals     - Latest signal chain events
 *   5. alerts_summary     - Active alerts count by severity
 *   6. open_positions     - Current open positions
 *
 * Features:
 *   - Drag-to-reorder via up/down buttons (no react-dnd dependency)
 *   - Show/hide widgets with toggle
 *   - Persist layout in user preferences
 *   - Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Card } from '@/app/components/ui/card';
import { useGlobalData } from '@/app/contexts/GlobalDataContext';
import { formatNumber, formatCurrency, formatPercent } from '@/app/utils/perf-helpers';
import { preferenceManager, type WidgetLayout } from '@/app/utils/user-preferences';

type IconProps = React.SVGProps<SVGSVGElement>;

const ChevronUp = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 15l-6-6-6 6" /></svg>;
const ChevronDown = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" /></svg>;
const EyeIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" strokeWidth={2} /></svg>;
const EyeOff = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" strokeWidth={2} /></svg>;
const GridIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" strokeWidth={2} rx="1" /><rect x="14" y="3" width="7" height="7" strokeWidth={2} rx="1" /><rect x="3" y="14" width="7" height="7" strokeWidth={2} rx="1" /><rect x="14" y="14" width="7" height="7" strokeWidth={2} rx="1" /></svg>;

// ── Widget Type Definitions ──

const WIDGET_TYPE_LABELS: Record<string, string> = {
  portfolio_summary: '投资组合概览',
  price_ticker: '热门行情',
  mini_chart: '迷你图表',
  recent_signals: '最新信号',
  alerts_summary: '告警汇总',
  open_positions: '持仓概览',
};

// ── Individual Widget Components ──

const PortfolioSummaryWidget: React.FC = () => {
  const { account, positions } = useGlobalData();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] text-[#8892B0]">总资产</div>
          <div className="text-sm text-[#CCD6F6] font-mono">{formatCurrency(account.totalAssets)}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#8892B0]">可用余额</div>
          <div className="text-sm text-[#CCD6F6] font-mono">{formatCurrency(account.availableBalance)}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#8892B0]">今日盈亏</div>
          <div className={`text-sm font-mono ${account.todayPnl >= 0 ? 'text-[#48BB78]' : 'text-[#F56565]'}`}>
            {account.todayPnl >= 0 ? '+' : ''}{formatCurrency(account.todayPnl)}
            <span className="text-[10px] ml-1">({formatPercent(account.todayPnlPercent)})</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#8892B0]">持仓数</div>
          <div className="text-sm text-[#CCD6F6] font-mono">{positions.length}</div>
        </div>
      </div>
    </div>
  );
};

const PriceTickerWidget: React.FC = () => {
  const { tickerCoins } = useGlobalData();
  const top5 = tickerCoins.slice(0, 5);
  return (
    <div className="space-y-1.5">
      {top5.map((coin, i) => (
        <div key={`${coin.label}-${i}`} className="flex items-center justify-between text-xs">
          <span className="text-[#8892B0] font-medium">{coin.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-[#CCD6F6] font-mono">{coin.price}</span>
            <span className={`text-[10px] font-mono ${
              coin.change.startsWith('+') ? 'text-[#48BB78]' : coin.change.startsWith('-') ? 'text-[#F56565]' : 'text-[#8892B0]'
            }`}>{coin.change}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const MiniChartWidget: React.FC = () => {
  // Generate a simple sparkline SVG
  const data = useMemo(() => {
    const points: number[] = [];
    let v = 50;
    for (let i = 0; i < 30; i++) {
      v += (Math.random() - 0.48) * 5;
      v = Math.max(10, Math.min(90, v));
      points.push(v);
    }
    return points;
  }, []);

  const pathD = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / 29) * 200},${100 - v}`).join(' ');
  const isUp = data[data.length - 1] > data[0];

  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-[#8892B0] mb-1">BTC/USDT 24H</div>
      <svg viewBox="0 0 200 100" className="w-full h-16">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? '#48BB78' : '#F56565'} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isUp ? '#48BB78' : '#F56565'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L200,100 L0,100 Z`} fill="url(#sparkGrad)" />
        <path d={pathD} fill="none" stroke={isUp ? '#48BB78' : '#F56565'} strokeWidth="1.5" />
      </svg>
    </div>
  );
};

const RecentSignalsWidget: React.FC = () => {
  const [events, setEvents] = useState<Array<{ id: string; signal: string; decision: string; time: number }>>([]);

  useEffect(() => {
    // Use mock events since we can't easily get history
    const mockEvents = [
      { id: '1', signal: 'MA_CROSS BTC', decision: 'APPROVE', time: Date.now() - 120000 },
      { id: '2', signal: 'RSI_OVERSOLD ETH', decision: 'MODIFY', time: Date.now() - 300000 },
      { id: '3', signal: 'VOLUME_SPIKE SOL', decision: 'REJECT', time: Date.now() - 600000 },
      { id: '4', signal: 'BREAKOUT BNB', decision: 'APPROVE', time: Date.now() - 900000 },
    ];
    setEvents(mockEvents);
  }, []);

  const decisionColors: Record<string, string> = {
    APPROVE: 'text-[#48BB78]',
    MODIFY: 'text-[#ECC94B]',
    REJECT: 'text-[#F56565]',
    ESCALATE: 'text-[#ED8936]',
  };

  return (
    <div className="space-y-1.5">
      {events.map(evt => (
        <div key={evt.id} className="flex items-center justify-between text-xs">
          <span className="text-[#8892B0] truncate max-w-[60%]">{evt.signal}</span>
          <span className={`${decisionColors[evt.decision] || 'text-[#8892B0]'} text-[10px] font-mono`}>{evt.decision}</span>
        </div>
      ))}
    </div>
  );
};

const AlertsSummaryWidget: React.FC = () => {
  const { riskSignals } = useGlobalData();
  const counts = useMemo(() => {
    const map = { critical: 0, high: 0, medium: 0, low: 0 };
    riskSignals.forEach(s => {
      if (s.severity === 'critical') map.critical++;
      else if (s.severity === 'warning') map.high++;
      else map.low++;
    });
    return map;
  }, [riskSignals]);

  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: '严重', count: counts.critical, color: 'text-[#F56565] bg-[#F56565]/10' },
        { label: '高风险', count: counts.high, color: 'text-[#ED8936] bg-[#ED8936]/10' },
        { label: '中等', count: counts.medium, color: 'text-[#ECC94B] bg-[#ECC94B]/10' },
        { label: '低风险', count: counts.low, color: 'text-[#48BB78] bg-[#48BB78]/10' },
      ].map(item => (
        <div key={item.label} className={`px-2 py-1.5 rounded text-center ${item.color}`}>
          <div className="text-lg font-mono">{item.count}</div>
          <div className="text-[10px]">{item.label}</div>
        </div>
      ))}
    </div>
  );
};

const OpenPositionsWidget: React.FC = () => {
  const { positions } = useGlobalData();
  const top4 = positions.slice(0, 4);

  return (
    <div className="space-y-1.5">
      {top4.length === 0 ? (
        <div className="text-xs text-[#8892B0] text-center py-2">暂无持仓</div>
      ) : (
        top4.map((pos, i) => (
          <div key={`${pos.symbol}-${i}`} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] px-1 rounded ${pos.side === 'LONG' ? 'bg-[#48BB78]/20 text-[#48BB78]' : 'bg-[#F56565]/20 text-[#F56565]'}`}>
                {pos.side === 'LONG' ? '多' : '空'}
              </span>
              <span className="text-[#CCD6F6]">{pos.symbol}</span>
            </div>
            <span className={`font-mono ${pos.unrealizedPnl >= 0 ? 'text-[#48BB78]' : 'text-[#F56565]'}`}>
              {pos.unrealizedPnl >= 0 ? '+' : ''}{formatNumber(pos.unrealizedPnl)}
            </span>
          </div>
        ))
      )}
    </div>
  );
};

// ── Widget Renderer ──

const WIDGET_COMPONENTS: Record<string, React.FC> = {
  portfolio_summary: PortfolioSummaryWidget,
  price_ticker: PriceTickerWidget,
  mini_chart: MiniChartWidget,
  recent_signals: RecentSignalsWidget,
  alerts_summary: AlertsSummaryWidget,
  open_positions: OpenPositionsWidget,
};

// ── Widget Config Panel ──

interface WidgetConfigPanelProps {
  layouts: WidgetLayout[];
  onToggle: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onClose: () => void;
}

const WidgetConfigPanel: React.FC<WidgetConfigPanelProps> = ({ layouts, onToggle, onMove, onClose }) => {
  return (
    <div className="bg-[#0D1B2A] border border-[#233554] rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm text-[#CCD6F6] font-medium flex items-center gap-2">
          <GridIcon className="w-4 h-4 text-[#4299E1]" />
          小部件配置
        </h3>
        <button onClick={onClose} className="text-xs text-[#8892B0] hover:text-[#CCD6F6] transition-colors">
          完成
        </button>
      </div>
      <div className="space-y-1">
        {layouts.map((layout, idx) => (
          <div key={layout.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-[#112240]">
            <button onClick={() => onToggle(layout.id)} className="shrink-0">
              {layout.visible ? (
                <EyeIcon className="w-4 h-4 text-[#48BB78]" />
              ) : (
                <EyeOff className="w-4 h-4 text-[#8892B0]" />
              )}
            </button>
            <span className={`flex-1 text-xs ${layout.visible ? 'text-[#CCD6F6]' : 'text-[#8892B0] line-through'}`}>
              {WIDGET_TYPE_LABELS[layout.type] || layout.type}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onMove(layout.id, 'up')}
                disabled={idx === 0}
                className="p-0.5 rounded hover:bg-[#233554] disabled:opacity-30 transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5 text-[#8892B0]" />
              </button>
              <button
                onClick={() => onMove(layout.id, 'down')}
                disabled={idx === layouts.length - 1}
                className="p-0.5 rounded hover:bg-[#233554] disabled:opacity-30 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5 text-[#8892B0]" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Dashboard Widgets Component ──

interface DashboardWidgetsProps {
  className?: string;
}

export const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({ className = '' }) => {
  const [layouts, setLayouts] = useState<WidgetLayout[]>(preferenceManager.prefs.widgetLayouts);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Sync from preferences on external change
  useEffect(() => {
    const unsub = preferenceManager.subscribe(newPrefs => {
      setLayouts([...newPrefs.widgetLayouts]);
    });
    return unsub;
  }, []);

  const handleToggle = useCallback((id: string) => {
    preferenceManager.toggleWidget(id);
    setLayouts([...preferenceManager.prefs.widgetLayouts]);
  }, []);

  const handleMove = useCallback((id: string, direction: 'up' | 'down') => {
    const idx = layouts.findIndex(w => w.id === id);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= layouts.length) return;
    preferenceManager.moveWidget(id, newIdx);
    setLayouts([...preferenceManager.prefs.widgetLayouts]);
  }, [layouts]);

  const visibleWidgets = layouts.filter(l => l.visible);

  return (
    <div className={className}>
      {/* Config toggle */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm text-[#8892B0]">仪表板</h2>
        <button
          onClick={() => setIsConfigOpen(prev => !prev)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#8892B0] hover:text-[#CCD6F6] bg-[#112240] border border-[#233554] rounded hover:bg-[#1A2B47] transition-colors"
        >
          <GridIcon className="w-3 h-3" />
          {isConfigOpen ? '完成' : '配置'}
        </button>
      </div>

      {/* Config panel */}
      {isConfigOpen && (
        <WidgetConfigPanel
          layouts={layouts}
          onToggle={handleToggle}
          onMove={handleMove}
          onClose={() => setIsConfigOpen(false)}
        />
      )}

      {/* Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {visibleWidgets.map(widget => {
          const Comp = WIDGET_COMPONENTS[widget.type];
          if (!Comp) return null;
          return (
            <Card key={widget.id} className="bg-[#0D1B2A] border-[#233554] p-3">
              <div className="text-[10px] text-[#4299E1] mb-2 uppercase tracking-wider">
                {WIDGET_TYPE_LABELS[widget.type] || widget.type}
              </div>
              <Comp />
            </Card>
          );
        })}
      </div>

      {visibleWidgets.length === 0 && (
        <div className="text-center text-[#8892B0] text-xs py-8">
          没有可见的小部件。点击&quot;配置&quot;以启用小部件。
        </div>
      )}
    </div>
  );
};

// Export types and constants for testing
export { WIDGET_TYPE_LABELS, WIDGET_COMPONENTS };