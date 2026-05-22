/**
 * @file src/app/modules/risk/RiskModule.tsx
 * @description YYC3 风险管理模块，提供实时风险监控、VaR计算、压力测试、风险预警等功能，支持多维度风险分析
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags risk,react,typescript,critical,public
 * @depends react,@/app/components,@/app/contexts,@/app/services
 */

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { serviceBridge } from '@/app/api/service-bridge';
import { Card } from '@/app/components/ui/card';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import { useGlobalData } from '@/app/contexts/GlobalDataContext';
import { getLiquidationEngine, type LiquidationEvent } from '@/app/services/ExchangeAggregator';
import {
  signalChainEngine,
  type ChainEvent,
  type SignalChainStage,
  type StrategySignalInput,
} from '@/app/services/signal-chain-engine';

type IconProps = React.SVGProps<SVGSVGElement>;

// Inline icons
const Shield = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
const AlertTriangle = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const Activity = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const Bell = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const CheckCircle = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const RefreshCw = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
const Download = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" strokeWidth={2} /><line x1="12" y1="15" x2="12" y2="3" strokeWidth={2} /></svg>;
const Eye = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" strokeWidth={2} /></svg>;

const PORTFOLIO_ASSETS = [
  { name: 'BTC/USDT', weight: 35, var95: -4250, var99: -6120, beta: 1.0, correlation: 1.0 },
  { name: 'ETH/USDT', weight: 25, var95: -1850, var99: -2680, beta: 1.25, correlation: 0.85 },
  { name: 'SOL/USDT', weight: 15, var95: -1120, var99: -1890, beta: 1.8, correlation: 0.72 },
  { name: 'BNB/USDT', weight: 10, var95: -520, var99: -780, beta: 0.9, correlation: 0.68 },
  { name: 'ADA/USDT', weight: 8, var95: -380, var99: -590, beta: 1.4, correlation: 0.65 },
  { name: 'USDT (现金)', weight: 7, var95: 0, var99: 0, beta: 0, correlation: 0 },
];

const RISK_ALERTS_INIT = [
  { id: 1, time: '14:32:15', level: 'critical', msg: 'BTC/USDT 5分钟内下跌 2.5%，触发一级风控', status: 'active' },
  { id: 2, time: '14:28:05', level: 'warning', msg: 'SOL/USDT 波动率突然增加 150%', status: 'active' },
  { id: 3, time: '14:15:22', level: 'info', msg: '组合VaR接近95%置信区间阈值', status: 'acknowledged' },
  { id: 4, time: '13:58:40', level: 'warning', msg: 'ETH/USDT 杠杆率超过设定上限', status: 'resolved' },
  { id: 5, time: '13:42:18', level: 'info', msg: '市场相关性矩阵发生显著变化', status: 'acknowledged' },
];

const STRESS_SCENARIOS = [
  { name: '2020年3月黑天鹅', impact: -28500, severity: 'extreme', probability: '5%' },
  { name: '美联储加息100bp', impact: -15200, severity: 'high', probability: '15%' },
  { name: '交易所暂停提款', impact: -22100, severity: 'extreme', probability: '3%' },
  { name: '监管政策收紧', impact: -12800, severity: 'high', probability: '20%' },
  { name: '流动性危机', impact: -18900, severity: 'extreme', probability: '8%' },
  { name: '技术性回调 20%', impact: -8500, severity: 'medium', probability: '35%' },
];

// Quantum Risk Module
const QuantumRiskModule = () => {
  const isMobile = useIsMobile();
  const [computing, setComputing] = useState(false);
  const { riskMetrics, formatUSD, navigateTo } = useGlobalData();

  const handleQuantumRecalc = useCallback(() => {
    if (computing) return;
    setComputing(true);
    toast.info('量子风险引擎重算启动...', { description: '预计耗时 3-5 秒' });
    setTimeout(() => {
      setComputing(false);
      toast.success('量子重算完成', { description: `VaR(95%) 更新为 ${formatUSD(riskMetrics.portfolioVaR95)}，组合Beta ${riskMetrics.betaToMarket.toFixed(2)}` });
    }, 3500);
  }, [computing, riskMetrics, formatUSD]);

  return (
    <div className="space-y-6">
      <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-4`}>
        {[
          { label: '组合VaR (95%)', value: formatUSD(riskMetrics.portfolioVaR95), sub: '日度', color: 'text-[#F56565]' },
          { label: '组合VaR (99%)', value: formatUSD(riskMetrics.portfolioVaR99), sub: '日度', color: 'text-[#F56565]' },
          { label: '总敞口', value: `$${riskMetrics.totalExposure.toLocaleString(undefined, {maximumFractionDigits: 0})}`, sub: `杠杆 ${riskMetrics.leverageRatio}x`, color: 'text-[#ECC94B]' },
          { label: '组合Beta', value: riskMetrics.betaToMarket.toFixed(2), sub: `BTC相关 ${riskMetrics.correlationBTC}`, color: 'text-[#4299E1]' },
        ].map((s, i) => (
          <Card key={i} className="p-4">
            <p className="text-[10px] text-[#8892B0] uppercase mb-1">{s.label}</p>
            <p className={`text-xl font-mono ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[#8892B0] mt-1">{s.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'} mb-4`}>
          <h3 className="text-white text-sm">资产风险分解</h3>
          <div className={`flex ${isMobile ? 'flex-wrap' : ''} items-center gap-2`}>
            <button onClick={() => navigateTo('trade', 'real', '资产监控')} className="flex items-center gap-2 px-3 py-1.5 bg-[#112240] border border-[#233554] text-[#4299E1] text-xs rounded hover:bg-[#1A2B47]">
              资产详情
            </button>
            <button onClick={() => navigateTo('strategy', 'manage')} className="flex items-center gap-2 px-3 py-1.5 bg-[#112240] border border-[#233554] text-[#ECC94B] text-xs rounded hover:bg-[#1A2B47]">
              策略联动
            </button>
            <button
              onClick={handleQuantumRecalc}
              disabled={computing}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#38B2AC] text-white text-xs rounded hover:brightness-110 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${computing ? 'animate-spin' : ''}`} /> {computing ? '计算中...' : '量子重算'}
            </button>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead className="text-[#8892B0] uppercase border-b border-[#233554]">
              <tr>
                <th className="py-2 px-3 text-left">资产</th>
                <th className="py-2 px-3 text-right">权重</th>
                {!isMobile && <th className="py-2 px-3 text-right">VaR(95%)</th>}
                {!isMobile && <th className="py-2 px-3 text-right">VaR(99%)</th>}
                <th className="py-2 px-3 text-right">Beta</th>
                {!isMobile && <th className="py-2 px-3 text-right">相关系数</th>}
                <th className="py-2 px-3 text-left">风险贡献</th>
              </tr>
            </thead>
            <tbody>
              {PORTFOLIO_ASSETS.map((a, i) => (
                <tr key={i} className="border-b border-[#233554]/30 hover:bg-[#112240]">
                  <td className="py-2 px-3 text-white">{a.name}</td>
                  <td className="py-2 px-3 text-right font-mono text-[#CCD6F6]">{a.weight}%</td>
                  {!isMobile && <td className="py-2 px-3 text-right font-mono text-[#F56565]">${a.var95.toLocaleString()}</td>}
                  {!isMobile && <td className="py-2 px-3 text-right font-mono text-[#F56565]">${a.var99.toLocaleString()}</td>}
                  <td className="py-2 px-3 text-right font-mono text-[#CCD6F6]">{a.beta.toFixed(2)}</td>
                  {!isMobile && <td className="py-2 px-3 text-right font-mono text-[#CCD6F6]">{a.correlation.toFixed(2)}</td>}
                  <td className="py-2 px-3">
                    <div className="w-full h-2 bg-[#071425] rounded overflow-hidden">
                      <div className="h-full bg-[#F56565]/70 rounded" style={{ width: `${a.weight * 1.5}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// BigData Risk
const BigDataRiskModule = () => {
  const isMobile = useIsMobile();
  const { navigateTo } = useGlobalData();

  const [stressResults, setStressResults] = useState<Record<string, { impact: number; details: string }>>({});

  const handleRunStressTest = useCallback(async (scenarioName: string) => {
    toast.info(`正在运行压力测试: ${scenarioName}`);
    try {
      const resp = await serviceBridge.risk.runStressTest(scenarioName);
      if (resp.code === 200 && resp.data) {
        setStressResults(prev => ({ ...prev, [scenarioName]: { impact: resp.data.impact, details: resp.data.details } }));
        toast.success(`压力测试完成: ${scenarioName}`, { description: `影响: $${resp.data.impact.toLocaleString()} - ${resp.data.details}` });
      } else {
        toast.error(`压力测试执行失败: ${scenarioName}`);
      }
    } catch {
      toast.error(`压力测试执行失败: ${scenarioName}`);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Stress Test Scenarios */}
      <Card className="p-4">
        <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'} mb-4`}>
          <h3 className="text-white text-sm">压力测试情景分析</h3>
          <button
            onClick={() => {
              toast.info('批量压力测试已排入队列', { description: '6 个情景预计耗时 30 秒' });
              STRESS_SCENARIOS.forEach((s, i) => setTimeout(() => handleRunStressTest(s.name), i * 500));
            }}
            className="px-3 py-1.5 bg-[#38B2AC] text-white text-xs rounded hover:brightness-110"
          >
            全部运行
          </button>
        </div>
        <div className="grid gap-3">
          {STRESS_SCENARIOS.map((s, i) => (
            <div key={i} className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'} p-3 bg-[#0A192F] rounded border border-[#233554]/50 hover:border-[#233554] transition-colors`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  s.severity === 'extreme' ? 'bg-[#F56565]' : s.severity === 'high' ? 'bg-[#ECC94B]' : 'bg-[#4299E1]'
                }`} />
                <div>
                  <span className="text-[#CCD6F6] text-xs">{s.name}</span>
                  <span className="text-[10px] text-[#8892B0] block">发生概率: {s.probability}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[#F56565] text-sm font-mono">${(stressResults[s.name]?.impact ?? s.impact).toLocaleString()}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  s.severity === 'extreme' ? 'bg-[#F56565]/20 text-[#F56565]' :
                  s.severity === 'high' ? 'bg-[#ECC94B]/20 text-[#ECC94B]' :
                  'bg-[#4299E1]/20 text-[#4299E1]'
                }`}>{s.severity}</span>
                {stressResults[s.name] && (
                  <span className="text-[9px] text-[#38B2AC]" title={stressResults[s.name].details}>Bridge</span>
                )}
                <button
                  onClick={() => handleRunStressTest(s.name)}
                  className="text-[10px] px-2 py-1 bg-[#112240] border border-[#233554] text-[#4299E1] rounded hover:bg-[#1A2B47]"
                >
                  运行
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Correlation Heat Map (text-based) */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-sm">相关性矩阵</h3>
          <button
            onClick={() => navigateTo('risk', 'quantum_risk')}
            className="text-[10px] text-[#4299E1] hover:underline"
          >
            量子风控详情 &rarr;
          </button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th className="py-2 px-2 text-left text-[#8892B0]"></th>
                {['BTC', 'ETH', 'SOL', 'BNB', 'ADA'].map(s => (
                  <th key={s} className="py-2 px-2 text-center text-[#8892B0]">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'BTC', values: [1.00, 0.85, 0.72, 0.68, 0.65] },
                { name: 'ETH', values: [0.85, 1.00, 0.78, 0.71, 0.69] },
                { name: 'SOL', values: [0.72, 0.78, 1.00, 0.62, 0.58] },
                { name: 'BNB', values: [0.68, 0.71, 0.62, 1.00, 0.55] },
                { name: 'ADA', values: [0.65, 0.69, 0.58, 0.55, 1.00] },
              ].map((row, i) => (
                <tr key={i}>
                  <td className="py-2 px-2 text-[#8892B0]">{row.name}</td>
                  {row.values.map((v, j) => {
                    const bg = v === 1 ? 'bg-[#38B2AC]/40' : v > 0.7 ? 'bg-[#F56565]/30' : v > 0.5 ? 'bg-[#ECC94B]/20' : 'bg-[#233554]/30';
                    return (
                      <td key={j} className={`py-2 px-2 text-center font-mono text-[#CCD6F6] ${bg}`}>
                        {v.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// Live Risk Monitoring — reads real positions + cross-module risk signals
const LiveRiskModule = () => {
  const isMobile = useIsMobile();
  const [riskLevel, setRiskLevel] = useState(42);
  const { navigateTo, positions, account, riskMetrics, formatPrice, riskSignals, acknowledgeSignal, clearResolvedSignals } = useGlobalData();
  const [liqEvents, setLiqEvents] = useState<LiquidationEvent[]>([]);

  // Subscribe to liquidation engine events for this view
  useEffect(() => {
    const engine = getLiquidationEngine();
    const prev = engine.getEvents();
    if (prev.length > 0) setLiqEvents(prev.slice(0, 10));
    const iv = setInterval(() => {
      const events = engine.getEvents();
      setLiqEvents(events.slice(0, 10));
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const leverageFactor = riskMetrics.leverageRatio * 40;
      const drawdownFactor = Math.abs(riskMetrics.maxDrawdown) * 2;
      const pnlFactor = account.todayPnlPercent < 0 ? Math.abs(account.todayPnlPercent) * 5 : 0;
      const base = leverageFactor + drawdownFactor + pnlFactor;
      setRiskLevel(prev => {
        const target = Math.max(10, Math.min(95, base + (Math.random() - 0.5) * 8));
        return prev + (target - prev) * 0.3;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [riskMetrics, account]);

  const riskColor = riskLevel > 70 ? '#F56565' : riskLevel > 40 ? '#ECC94B' : '#38B2AC';
  const riskLabel = riskLevel > 70 ? '高风险' : riskLevel > 40 ? '中风险' : '低风险';
  const activeSignals = riskSignals.filter(s => !s.acknowledged);
  const marginUsage = account.totalAssets > 0 ? ((account.positionValue / account.totalAssets) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
        {/* Risk Gauge */}
        <Card className="p-6 flex flex-col items-center justify-center">
          <p className="text-[10px] text-[#8892B0] uppercase mb-3">综合风险指数</p>
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#233554" strokeWidth="8" strokeDasharray="200" strokeDashoffset="50" transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="40" fill="none" stroke={riskColor} strokeWidth="8"
                strokeDasharray={`${riskLevel * 2} ${200 - riskLevel * 2}`} strokeDashoffset="50"
                transform="rotate(-90 50 50)" strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-mono text-white">{Math.round(riskLevel)}</span>
              <span className="text-[10px]" style={{ color: riskColor }}>{riskLabel}</span>
            </div>
          </div>
          <button onClick={() => toast.success('实时风控快照已导出', { description: `风险指数 ${Math.round(riskLevel)}` })}
            className="mt-3 px-3 py-1 text-[10px] bg-[#112240] border border-[#233554] text-[#4299E1] rounded hover:bg-[#1A2B47]">导出快照</button>
        </Card>

        {/* Live Metrics from GlobalDataContext */}
        <Card className={`p-4 ${isMobile ? '' : 'col-span-2'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-sm">实时监控指标 <span className="text-[9px] text-[#38B2AC] ml-2">● LIVE</span></h3>
            <button onClick={() => navigateTo('trade', 'real')} className="text-[10px] text-[#4299E1] hover:underline">交易详情 &rarr;</button>
          </div>
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-3`}>
            {[
              { label: '持仓总值', value: `$${account.positionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: `${account.todayPnlPercent >= 0 ? '+' : ''}${account.todayPnlPercent.toFixed(2)}%`, up: account.todayPnlPercent >= 0 },
              { label: '未实现盈亏', value: `$${account.todayPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: `${positions.length} 个持仓`, up: account.todayPnl >= 0 },
              { label: '保证金使用率', value: `${marginUsage}%`, change: `VaR95: $${Math.abs(riskMetrics.portfolioVaR95).toLocaleString()}`, up: parseFloat(marginUsage) < 60 },
              { label: '可用余额', value: `$${account.availableBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, change: `总资产 $${account.totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, up: true },
              { label: '杠杆率', value: `${riskMetrics.leverageRatio}x`, change: '限制: 10x', up: riskMetrics.leverageRatio < 5 },
              { label: 'BTC 相关性', value: riskMetrics.correlationBTC.toFixed(2), change: `Beta: ${riskMetrics.betaToMarket.toFixed(2)}`, up: riskMetrics.correlationBTC < 0.9 },
            ].map((m, i) => (
              <div key={i} className="p-3 bg-[#0A192F] rounded border border-[#233554]/50">
                <p className="text-[10px] text-[#8892B0] uppercase">{m.label}</p>
                <p className="text-sm font-mono text-white mt-1">{m.value}</p>
                <p className={`text-[10px] mt-0.5 ${m.up ? 'text-[#38B2AC]' : 'text-[#ECC94B]'}`}>{m.change}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Real Position Risk Table from GlobalDataContext */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-sm">实时持仓风险监控 <span className="text-[9px] text-[#38B2AC] ml-1">● LIVE · {positions.length} 仓</span></h3>
          <div className="flex items-center gap-2">
            <button onClick={() => navigateTo('strategy', 'manage')} className="text-[10px] text-[#ECC94B] hover:underline">策略联动 &rarr;</button>
            <button onClick={() => navigateTo('risk', 'hedging')} className="text-[10px] text-[#38B2AC] hover:underline">对冲工具 &rarr;</button>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead className="text-[#8892B0] uppercase border-b border-[#233554]">
              <tr>
                <th className="py-2 px-3 text-left">品种</th>
                <th className="py-2 px-3 text-left">策略</th>
                <th className="py-2 px-3 text-right">方向</th>
                <th className="py-2 px-3 text-right">数量</th>
                <th className="py-2 px-3 text-right">入场价</th>
                <th className="py-2 px-3 text-right">现价</th>
                <th className="py-2 px-3 text-right">盈亏</th>
                <th className="py-2 px-3 text-right">盈亏%</th>
                <th className="py-2 px-3 text-left">风险</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, i) => {
                const riskLvl = Math.abs(pos.pnlPercent) > 5 ? 'high' : Math.abs(pos.pnlPercent) > 2 ? 'medium' : 'low';
                return (
                  <tr key={i} className="border-b border-[#233554]/30 hover:bg-[#112240]">
                    <td className="py-2 px-3 text-white">{pos.symbol}</td>
                    <td className="py-2 px-3 text-[#8892B0] text-[10px]">{pos.strategy}</td>
                    <td className="py-2 px-3 text-right"><span className={`px-2 py-0.5 rounded text-[10px] ${pos.side === 'LONG' ? 'bg-[#38B2AC]/20 text-[#38B2AC]' : 'bg-[#F56565]/20 text-[#F56565]'}`}>{pos.side}</span></td>
                    <td className="py-2 px-3 text-right font-mono text-[#CCD6F6]">{pos.quantity}</td>
                    <td className="py-2 px-3 text-right font-mono text-[#8892B0]">{formatPrice(pos.entryPrice)}</td>
                    <td className="py-2 px-3 text-right font-mono text-[#CCD6F6]">{formatPrice(pos.currentPrice)}</td>
                    <td className={`py-2 px-3 text-right font-mono ${pos.unrealizedPnl >= 0 ? 'text-[#38B2AC]' : 'text-[#F56565]'}`}>{pos.unrealizedPnl >= 0 ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}</td>
                    <td className={`py-2 px-3 text-right font-mono ${pos.pnlPercent >= 0 ? 'text-[#38B2AC]' : 'text-[#F56565]'}`}>{pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%</td>
                    <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded text-[10px] ${riskLvl === 'high' ? 'bg-[#F56565]/20 text-[#F56565]' : riskLvl === 'medium' ? 'bg-[#ECC94B]/20 text-[#ECC94B]' : 'bg-[#38B2AC]/20 text-[#38B2AC]'}`}>{riskLvl === 'high' ? '高' : riskLvl === 'medium' ? '中' : '低'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cross-Module Risk Signal Feed */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-sm">跨模块风险信号 <span className="text-[9px] text-[#F56565] ml-1">{activeSignals.length > 0 ? `● ${activeSignals.length} 活跃` : ''}</span></h3>
          <div className="flex items-center gap-2">
            {activeSignals.length > 0 && (
              <button onClick={() => activeSignals.forEach(s => acknowledgeSignal(s.id))} className="text-[10px] px-2 py-1 bg-[#112240] border border-[#233554] text-[#ECC94B] rounded hover:bg-[#1A2B47]">全部确认</button>
            )}
            <button onClick={clearResolvedSignals} className="text-[10px] px-2 py-1 bg-[#112240] border border-[#233554] text-[#8892B0] rounded hover:bg-[#1A2B47]">清除已确认</button>
          </div>
        </div>
        <div className="space-y-2 max-h-[250px] overflow-auto">
          {riskSignals.length === 0 ? (
            <p className="text-[10px] text-[#8892B0] text-center py-4">暂无跨模块风险信号</p>
          ) : riskSignals.map(sig => (
            <div key={sig.id} className={`flex items-center justify-between p-3 rounded border transition-colors ${
              sig.severity === 'critical' ? 'bg-[#F56565]/5 border-[#F56565]/30' :
              sig.severity === 'warning' ? 'bg-[#ECC94B]/5 border-[#ECC94B]/30' :
              'bg-[#0A192F] border-[#233554]/50'
            } ${sig.acknowledged ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3">
                {sig.severity === 'critical' ? <AlertTriangle className="w-4 h-4 text-[#F56565] shrink-0" /> :
                 sig.severity === 'warning' ? <AlertTriangle className="w-4 h-4 text-[#ECC94B] shrink-0" /> :
                 <Bell className="w-4 h-4 text-[#4299E1] shrink-0" />}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#CCD6F6] text-xs">{sig.title}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded ${
                      sig.source === 'strategy' ? 'bg-[#4299E1]/20 text-[#4299E1]' :
                      sig.source === 'risk' ? 'bg-[#F56565]/20 text-[#F56565]' :
                      sig.source === 'trade' ? 'bg-[#38B2AC]/20 text-[#38B2AC]' :
                      'bg-[#8892B0]/20 text-[#8892B0]'
                    }`}>{sig.source}</span>
                  </div>
                  <span className="text-[10px] text-[#8892B0] block mt-0.5">{sig.detail}</span>
                  <span className="text-[9px] text-[#233554]">{new Date(sig.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
              {!sig.acknowledged && (
                <button onClick={() => acknowledgeSignal(sig.id)} className="text-[10px] px-2 py-0.5 bg-[#112240] border border-[#233554] text-[#4299E1] rounded hover:bg-[#1A2B47] shrink-0">确认</button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Auto-Liquidation Status Widget */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#F56565]" />
            <h3 className="text-white text-sm">自动平仓引擎状态</h3>
            <span className="text-[9px] px-2 py-0.5 bg-[#38B2AC]/20 text-[#38B2AC] rounded">Phase 2</span>
          </div>
          <button onClick={() => navigateTo('trade', 'config')} className="text-[10px] text-[#4299E1] hover:underline">配置规则 &rarr;</button>
        </div>
        {liqEvents.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle className="w-6 h-6 text-[#38B2AC] mx-auto mb-2" />
            <p className="text-[10px] text-[#8892B0]">自动平仓引擎运行中，当前无触发事件</p>
            <p className="text-[9px] text-[#233554] mt-1">6 条规则监控中 | 评估间隔 10s</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[180px] overflow-auto">
            {liqEvents.map(ev => (
              <div key={ev.id} className="p-2 bg-[#0A192F] rounded border-l-2 border-[#F56565]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#F56565]">{ev.ruleName}</span>
                  <span className="text-[9px] text-[#8892B0]">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-[10px] text-[#CCD6F6] mt-1">{ev.reason}</p>
                <div className="flex items-center gap-3 mt-1 text-[9px]">
                  <span className="text-[#8892B0]">{ev.symbols.join(', ')}</span>
                  <span className="text-[#ECC94B]">{ev.action}</span>
                  <span className="text-[#F56565]">${ev.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// Warning Module
const WarningModule = () => {
  const isMobile = useIsMobile();
  const [alerts, setAlerts] = useState(RISK_ALERTS_INIT);
  const [rules, setRules] = useState([
    { name: '单笔亏损限制', value: '2%', status: true },
    { name: '日内最大亏损', value: '5%', status: true },
    { name: '杠杆率上限', value: '10x', status: true },
    { name: '仓位集中度', value: '40%', status: false },
    { name: '波动率突增', value: '150%', status: true },
  ]);

  // ── ServiceBridge integration: load alerts from alert service ──
  useEffect(() => {
    let cancelled = false;
    serviceBridge.alert.getAlerts().then(resp => {
      if (cancelled) return;
      if (resp.code === 200 && Array.isArray(resp.data) && resp.data.length > 0) {
        const mapped = resp.data.map((a: any, idx: number) => ({
          id: a.id ?? idx + 100,
          time: a.time ?? new Date(a.timestamp ?? Date.now()).toLocaleTimeString(),
          level: a.level ?? a.severity ?? 'info',
          msg: a.msg ?? a.message ?? a.title ?? 'ServiceBridge Alert',
          status: a.status ?? (a.read ? 'acknowledged' : 'active'),
        }));
        setAlerts(prev => [...mapped, ...prev].slice(0, 20));
      }
    }).catch(() => { /* fallback to local RISK_ALERTS_INIT */ });
    return () => { cancelled = true; };
  }, []);

  const handleAlertAction = (alertId: number) => {
    setAlerts(prev => prev.map(a => {
      if (a.id !== alertId) return a;
      if (a.status === 'active') {
        toast.info(`已确认预警 #${alertId}`, { description: a.msg });
        // Bridge: mark as read
        serviceBridge.alert.markAsRead(String(alertId)).catch(() => { /* best-effort */ });
        return { ...a, status: 'acknowledged' };
      }
      if (a.status === 'acknowledged') {
        toast.success(`已解决预警 #${alertId}`);
        return { ...a, status: 'resolved' };
      }
      return a;
    }));
  };

  const handleToggleRule = (index: number) => {
    setRules(prev => prev.map((r, i) => {
      if (i !== index) return r;
      const newStatus = !r.status;
      toast(newStatus ? `已启用规则: ${r.name}` : `已禁用规则: ${r.name}`, {
        description: `阈值: ${r.value}`,
      });
      return { ...r, status: newStatus };
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'} mb-4`}>
          <h3 className="text-white text-sm">风险预警中心</h3>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#F56565] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F56565] animate-pulse" /> {alerts.filter(a => a.status === 'active').length}个活跃预警
            </span>
            <button
              onClick={() => {
                setAlerts(prev => prev.map(a => a.status === 'active' ? { ...a, status: 'acknowledged' } : a));
                serviceBridge.alert.markAllAsRead().catch(() => { /* best-effort bridge sync */ });
                toast.success('所有活跃预警已批量确认');
              }}
              className="px-2 py-1 text-[10px] bg-[#112240] border border-[#233554] text-[#ECC94B] rounded hover:bg-[#1A2B47]"
            >
              全部确认
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'} p-3 rounded border transition-colors ${
              alert.level === 'critical' ? 'bg-[#F56565]/5 border-[#F56565]/30' :
              alert.level === 'warning' ? 'bg-[#ECC94B]/5 border-[#ECC94B]/30' :
              'bg-[#0A192F] border-[#233554]/50'
            }`}>
              <div className="flex items-center gap-3">
                {alert.level === 'critical' ? (
                  <AlertTriangle className="w-4 h-4 text-[#F56565] shrink-0" />
                ) : alert.level === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-[#ECC94B] shrink-0" />
                ) : (
                  <Bell className="w-4 h-4 text-[#4299E1] shrink-0" />
                )}
                <div>
                  <span className="text-[#CCD6F6] text-xs">{alert.msg}</span>
                  <span className="text-[10px] text-[#8892B0] block mt-0.5">{alert.time}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 ${
                  alert.status === 'active' ? 'bg-[#F56565]/20 text-[#F56565]' :
                  alert.status === 'acknowledged' ? 'bg-[#ECC94B]/20 text-[#ECC94B]' :
                  'bg-[#38B2AC]/20 text-[#38B2AC]'
                }`}>
                  {alert.status === 'active' ? '活跃' : alert.status === 'acknowledged' ? '已确认' : '已解决'}
                </span>
                {alert.status !== 'resolved' && (
                  <button
                    onClick={() => handleAlertAction(alert.id)}
                    className="text-[10px] px-2 py-0.5 bg-[#112240] border border-[#233554] text-[#4299E1] rounded hover:bg-[#1A2B47]"
                  >
                    {alert.status === 'active' ? '确认' : '解决'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Alert Settings */}
      <Card className="p-4">
        <h3 className="text-white text-sm mb-4">预警规则配置</h3>
        <div className="space-y-3">
          {rules.map((rule, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-[#0A192F] rounded border border-[#233554]/50">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${rule.status ? 'bg-[#38B2AC]' : 'bg-[#8892B0]'}`} />
                <span className="text-[#CCD6F6] text-xs">{rule.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#8892B0] text-xs font-mono">{rule.value}</span>
                <button
                  onClick={() => handleToggleRule(i)}
                  className={`w-8 h-4 rounded-full relative transition-colors ${rule.status ? 'bg-[#38B2AC]' : 'bg-[#233554]'}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${rule.status ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// Risk Reports
const ReportModule = () => {
  const isMobile = useIsMobile();

  const handleViewReport = (title: string) => {
    toast.info(`正在打开: ${title}`, { description: '报告将在新窗口中加载' });
  };

  const handleExportReport = (title: string, size: string) => {
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1500)),
      {
        loading: `正在导出 ${title} (${size})...`,
        success: `${title} 导出成功`,
        error: '导出失败，请重试',
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
        {[
          { title: '日度风控报告', date: '2026-02-15', status: '已生成', size: '2.4MB' },
          { title: '周度风控报告', date: '2026-02-09 ~ 02-15', status: '已生成', size: '8.1MB' },
          { title: '月度风控报告', date: '2026-01', status: '已生成', size: '15.2MB' },
          { title: '季度风控报告', date: '2025-Q4', status: '已生成', size: '32.5MB' },
        ].map((r, i) => (
          <Card key={i} className="p-4 hover:border-[#38B2AC]/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white text-sm">{r.title}</h4>
              <span className="text-[10px] text-[#38B2AC] px-2 py-0.5 bg-[#38B2AC]/10 rounded">{r.status}</span>
            </div>
            <p className="text-[#8892B0] text-xs mb-3">报告期间: {r.date}</p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#8892B0]">{r.size}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewReport(r.title)}
                  className="text-[#4299E1] text-xs hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" /> 查看
                </button>
                <button
                  onClick={() => handleExportReport(r.title, r.size)}
                  className="text-[#38B2AC] text-xs hover:underline flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> 导出
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Hedging
const HedgingModule = () => {
  const isMobile = useIsMobile();
  const { navigateTo } = useGlobalData();

  const handleHedgeAction = (cardName: string) => {
    toast.info(`正在进入: ${cardName}`, { description: '加载对冲策略配置界面' });
  };

  const handleCloseHedge = (tool: string) => {
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1500)),
      {
        loading: `正在平仓: ${tool}...`,
        success: `${tool} 对冲头寸已平仓`,
        error: '平仓失败，请重试',
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
        <Card className="p-4 hover:border-[#38B2AC]/50 transition-colors cursor-pointer" onClick={() => handleHedgeAction('传统对冲')}>
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-5 h-5 text-[#4299E1]" />
            <h4 className="text-white text-sm">传统对冲</h4>
          </div>
          <p className="text-[#8892B0] text-xs mb-3">期货、期权等传统对冲工具配置</p>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#8892B0]">3个活跃对冲</span>
            <span className="text-[#38B2AC]">覆盖率 65%</span>
          </div>
        </Card>
        <Card className="p-4 hover:border-[#38B2AC]/50 transition-colors cursor-pointer" onClick={() => handleHedgeAction('AI 自动对冲')}>
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-5 h-5 text-[#38B2AC]" />
            <h4 className="text-white text-sm">AI 自动对冲</h4>
          </div>
          <p className="text-[#8892B0] text-xs mb-3">机器学习驱动的动态对冲策略</p>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#8892B0]">模型: v2.3</span>
            <span className="text-[#38B2AC]">运行中</span>
          </div>
        </Card>
        <Card className="p-4 hover:border-[#38B2AC]/50 transition-colors cursor-pointer" onClick={() => navigateTo('risk', 'live_risk')}>
          <div className="flex items-center gap-3 mb-3">
            <Eye className="w-5 h-5 text-[#ECC94B]" />
            <h4 className="text-white text-sm">效果监控</h4>
          </div>
          <p className="text-[#8892B0] text-xs mb-3">实时跟踪对冲效果和成本分析</p>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#8892B0]">节约成本</span>
            <span className="text-[#38B2AC]">+$12,450</span>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-white text-sm mb-3">活跃对冲头寸</h3>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead className="text-[#8892B0] uppercase border-b border-[#233554]">
              <tr>
                <th className="py-2 px-3 text-left">对冲工具</th>
                {!isMobile && <th className="py-2 px-3 text-left">标的</th>}
                <th className="py-2 px-3 text-right">名义金额</th>
                {!isMobile && <th className="py-2 px-3 text-right">对冲比例</th>}
                {!isMobile && <th className="py-2 px-3 text-right">成本</th>}
                <th className="py-2 px-3 text-right">效果</th>
                <th className="py-2 px-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {[
                { tool: 'BTC永续空单', target: 'BTC现货', notional: '$24,900', ratio: '50%', cost: '-$45/d', effect: '+$1,250' },
                { tool: 'ETH看跌期权', target: 'ETH现货', notional: '$17,800', ratio: '50%', cost: '-$120', effect: '+$580' },
                { tool: 'SOL反向ETF', target: 'SOL现货', notional: '$10,650', ratio: '50%', cost: '-$32/d', effect: '-$210' },
              ].map((h, i) => (
                <tr key={i} className="border-b border-[#233554]/30 hover:bg-[#112240]">
                  <td className="py-2 px-3 text-[#CCD6F6]">{h.tool}</td>
                  {!isMobile && <td className="py-2 px-3 text-[#8892B0]">{h.target}</td>}
                  <td className="py-2 px-3 text-right font-mono text-[#CCD6F6]">{h.notional}</td>
                  {!isMobile && <td className="py-2 px-3 text-right font-mono text-[#4299E1]">{h.ratio}</td>}
                  {!isMobile && <td className="py-2 px-3 text-right font-mono text-[#8892B0]">{h.cost}</td>}
                  <td className={`py-2 px-3 text-right font-mono ${h.effect.startsWith('+') ? 'text-[#38B2AC]' : 'text-[#F56565]'}`}>{h.effect}</td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => handleCloseHedge(h.tool)}
                      className="text-[10px] px-2 py-0.5 bg-[#F56565]/10 text-[#F56565] rounded hover:bg-[#F56565]/20"
                    >
                      平仓
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════
// Phase 18A: Signal Chain Dashboard
// ═══════════════════════════════════════
const SignalChainModule = () => {
  const isMobile = useIsMobile();
  const { positions, account, riskMetrics, strategies, emitRiskSignal, navigateTo } = useGlobalData();
  const [chainEvents, setChainEvents] = useState<ChainEvent[]>([]);
  const [stats, setStats] = useState(signalChainEngine.getChainStats());
  const [isPaused, setIsPaused] = useState(signalChainEngine.paused);
  const [riskRules] = useState(signalChainEngine.getRiskRules());
  const [equityCurve, setEquityCurve] = useState<Array<{ time: string; equity: number; risk: number }>>([]);

  // Subscribe to chain events
  useEffect(() => {
    const unsub = signalChainEngine.onChainEvent((event) => {
      setChainEvents(prev => [event, ...prev].slice(0, 50));
      setStats(signalChainEngine.getChainStats());

      // Auto-emit risk signal for critical events
      if (event.riskEval && event.riskEval.decision === 'REJECT') {
        emitRiskSignal({
          source: 'risk',
          severity: 'warning',
          title: `信号链路拒绝: ${event.signal.symbol}`,
          detail: event.riskEval.reason,
          symbol: event.signal.symbol,
          value: event.riskEval.riskScore,
        });
      } else if (event.riskEval && event.riskEval.decision === 'ESCALATE') {
        emitRiskSignal({
          source: 'risk',
          severity: 'critical',
          title: `信号链路升级: ${event.signal.symbol}`,
          detail: event.riskEval.reason,
          symbol: event.signal.symbol,
          value: event.riskEval.riskScore,
        });
      }
    });
    setChainEvents(signalChainEngine.getChainHistory());
    return unsub;
  }, [emitRiskSignal]);

  // Keep signal chain engine updated with portfolio context
  useEffect(() => {
    signalChainEngine.updatePortfolioContext({
      portfolioValue: account.totalAssets,
      openPositions: positions.length,
      dailyDrawdown: account.todayPnlPercent < 0 ? Math.abs(account.todayPnlPercent) : 0,
      currentLeverage: riskMetrics.leverageRatio,
    });
  }, [account, positions, riskMetrics]);

  // Simulate equity curve data
  useEffect(() => {
    const now = Date.now();
    const curve = Array.from({ length: 24 }, (_, i) => {
      const t = now - (23 - i) * 3600_000;
      const base = account.totalAssets - account.todayPnl;
      const progress = (i + 1) / 24;
      const equity = base + account.todayPnl * progress + (Math.random() - 0.5) * 500;
      const risk = 30 + Math.sin(i * 0.3) * 15 + (Math.random() - 0.5) * 10;
      return {
        time: new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        equity: Math.round(equity),
        risk: Math.max(5, Math.min(95, Math.round(risk))),
      };
    });
    setEquityCurve(curve);
  }, [account]);

  // Demo: send a test signal
  const handleSendTestSignal = useCallback(() => {
    const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT'];
    const actions: Array<'BUY' | 'SELL'> = ['BUY', 'SELL'];
    const strats = strategies.filter(s => s.status === 'active');
    const strat = strats[Math.floor(Math.random() * strats.length)] || strategies[0];
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];

    const signal: StrategySignalInput = {
      strategyId: strat.id,
      strategyName: strat.name,
      symbol: sym,
      action,
      confidence: 30 + Math.floor(Math.random() * 60),
      suggestedQuantity: +(Math.random() * 5 + 0.1).toFixed(2),
      suggestedPrice: sym === 'BTC/USDT' ? 96000 + Math.random() * 1000 : sym === 'ETH/USDT' ? 2400 + Math.random() * 100 : 100 + Math.random() * 50,
      reason: `${strat.name} ${action === 'BUY' ? '买入' : '卖出'}信号`,
      indicators: { rsi: +(30 + Math.random() * 40).toFixed(1), macd: +((Math.random() - 0.5) * 2).toFixed(3) },
    };

    const event = signalChainEngine.ingestStrategySignal(signal);
    const decisionLabel = event.riskEval?.decision === 'APPROVE' ? '通过' :
                          event.riskEval?.decision === 'MODIFY' ? '调整' :
                          event.riskEval?.decision === 'ESCALATE' ? '升级' : '拒绝';
    toast.info(`信号链路: ${sym} ${action}`, {
      description: `${strat.name} -> 风控决策: ${decisionLabel} (${event.duration.toFixed(1)}ms)`,
    });
  }, [strategies]);

  const handleTogglePause = useCallback(() => {
    const newPaused = !isPaused;
    signalChainEngine.setPaused(newPaused);
    setIsPaused(newPaused);
    toast(newPaused ? '信号链路已暂停' : '信号链路已恢复', { description: newPaused ? '所有信号将被拒绝' : '信号处理恢复正常' });
  }, [isPaused]);

  const stageColor = (stage: SignalChainStage) => {
    switch (stage) {
      case 'SIGNAL': return '#4299E1';
      case 'RISK_EVAL': return '#ECC94B';
      case 'EXECUTION': return '#38B2AC';
    }
  };

  const decisionColor = (decision: string) => {
    switch (decision) {
      case 'APPROVE': return '#38B2AC';
      case 'MODIFY': return '#ECC94B';
      case 'ESCALATE': return '#F6AD55';
      case 'REJECT': return '#F56565';
      default: return '#8892B0';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-6'} gap-3`}>
        {[
          { label: '总信号', value: stats.totalSignals, color: 'text-[#4299E1]' },
          { label: '通过', value: stats.approved, color: 'text-[#38B2AC]' },
          { label: '调整', value: stats.modified, color: 'text-[#ECC94B]' },
          { label: '升级', value: stats.escalated, color: 'text-[#F6AD55]' },
          { label: '拒绝', value: stats.rejected, color: 'text-[#F56565]' },
          { label: '平均耗时', value: `${stats.avgDuration.toFixed(1)}ms`, color: 'text-[#CCD6F6]' },
        ].map((s, i) => (
          <Card key={i} className="p-3 text-center">
            <p className="text-[10px] text-[#8892B0] uppercase">{s.label}</p>
            <p className={`text-lg font-mono ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Equity Curve + Risk Index (inline SVG) */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-sm">实时权益曲线 + 风险指数 <span className="text-[9px] text-[#38B2AC] ml-2">LIVE 24H</span></h3>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#38B2AC] inline-block" /> 权益</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#F56565] inline-block" /> 风险</span>
          </div>
        </div>
        <div className="h-[180px] w-full overflow-hidden">
          {equityCurve.length > 0 && (
            <svg viewBox={`0 0 ${equityCurve.length * 32} 160`} className="w-full h-full" preserveAspectRatio="none">
              {[0, 40, 80, 120, 160].map(y => (
                <line key={y} x1="0" y1={y} x2={equityCurve.length * 32} y2={y} stroke="#233554" strokeWidth="0.5" strokeDasharray="4 4" />
              ))}
              <polyline
                fill="none" stroke="#38B2AC" strokeWidth="2"
                points={equityCurve.map((d, i) => {
                  const minE = Math.min(...equityCurve.map(e => e.equity));
                  const maxE = Math.max(...equityCurve.map(e => e.equity));
                  const range = maxE - minE || 1;
                  const y = 150 - ((d.equity - minE) / range) * 140;
                  return `${i * 32 + 16},${y}`;
                }).join(' ')}
              />
              <polyline
                fill="none" stroke="#F56565" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.7"
                points={equityCurve.map((d, i) => {
                  const y = 150 - (d.risk / 100) * 140;
                  return `${i * 32 + 16},${y}`;
                }).join(' ')}
              />
              {equityCurve.filter((_, i) => i % 4 === 0).map((d, idx) => (
                <text key={idx} x={idx * 4 * 32 + 16} y="158" fill="#8892B0" fontSize="8" textAnchor="middle">{d.time}</text>
              ))}
            </svg>
          )}
        </div>
      </Card>

      {/* Chain Pipeline Visualization */}
      <Card className="p-4">
        <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center justify-between'} mb-4`}>
          <h3 className="text-white text-sm">信号处理链路 <span className="text-[9px] ml-1" style={{ color: isPaused ? '#F56565' : '#38B2AC' }}>{isPaused ? 'PAUSED' : 'ACTIVE'}</span></h3>
          <div className="flex items-center gap-2">
            <button onClick={handleSendTestSignal} className="px-3 py-1.5 bg-[#4299E1] text-white text-xs rounded hover:brightness-110">发送测试信号</button>
            <button onClick={handleTogglePause} className={`px-3 py-1.5 text-xs rounded ${isPaused ? 'bg-[#38B2AC] text-white' : 'bg-[#F56565]/20 text-[#F56565] border border-[#F56565]/30'}`}>
              {isPaused ? '恢复' : '暂停'}
            </button>
            <button onClick={() => { signalChainEngine.clearHistory(); setChainEvents([]); setStats(signalChainEngine.getChainStats()); toast.success('链路历史已清除'); }}
              className="px-3 py-1.5 bg-[#112240] border border-[#233554] text-[#8892B0] text-xs rounded hover:bg-[#1A2B47]">清除</button>
          </div>
        </div>

        {/* 3-Stage Pipeline */}
        <div className={`flex ${isMobile ? 'flex-col' : 'items-center'} gap-2 mb-4 p-3 bg-[#0A192F] rounded`}>
          {(['SIGNAL', 'RISK_EVAL', 'EXECUTION'] as SignalChainStage[]).map((stage, i) => (
            <React.Fragment key={stage}>
              <div className="flex items-center gap-2 px-3 py-2 rounded border" style={{ borderColor: stageColor(stage) + '40', background: stageColor(stage) + '10' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: stageColor(stage) }} />
                <span className="text-xs" style={{ color: stageColor(stage) }}>
                  {stage === 'SIGNAL' ? '策略信号' : stage === 'RISK_EVAL' ? '风控评估' : '交易执行'}
                </span>
              </div>
              {i < 2 && !isMobile && (
                <svg width="24" height="12" viewBox="0 0 24 12"><path d="M0 6h18l-4-4M18 6l-4 4" fill="none" stroke="#233554" strokeWidth="1.5" /></svg>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Event Log */}
        <div className="space-y-2 max-h-[300px] overflow-auto">
          {chainEvents.length === 0 ? (
            <p className="text-[10px] text-[#8892B0] text-center py-6">暂无信号链路事件</p>
          ) : chainEvents.map(ev => (
            <div key={ev.id} className="p-3 bg-[#0A192F] rounded border border-[#233554]/50 hover:border-[#233554] transition-colors">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: stageColor(ev.stage) + '20', color: stageColor(ev.stage) }}>{ev.stage}</span>
                  <span className="text-xs text-white">{ev.signal.symbol}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${ev.signal.action === 'BUY' ? 'bg-[#38B2AC]/20 text-[#38B2AC]' : 'bg-[#F56565]/20 text-[#F56565]'}`}>{ev.signal.action}</span>
                  <span className="text-[10px] text-[#8892B0]">{ev.signal.strategyName}</span>
                </div>
                <span className="text-[9px] text-[#233554]">{ev.duration.toFixed(1)}ms</span>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-[#8892B0]">置信度: {ev.signal.confidence}%</span>
                {ev.riskEval && (
                  <>
                    <span style={{ color: decisionColor(ev.riskEval.decision) }}>
                      {ev.riskEval.decision === 'APPROVE' ? '通过' : ev.riskEval.decision === 'MODIFY' ? '调整' : ev.riskEval.decision === 'ESCALATE' ? '升级' : '拒绝'}
                    </span>
                    <span className="text-[#8892B0]">风险分: {ev.riskEval.riskScore}</span>
                  </>
                )}
                {ev.tradeRec && (
                  <span className="text-[#38B2AC]">{ev.tradeRec.executionMode === 'auto' ? '自动' : '手动'}</span>
                )}
              </div>
              {ev.riskEval && (
                <p className="text-[9px] text-[#8892B0] mt-1">{ev.riskEval.reason}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Risk Rules Config */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-sm">风控规则配置</h3>
          <button onClick={() => navigateTo('risk', 'warning')} className="text-[10px] text-[#4299E1] hover:underline">高级预警 &rarr;</button>
        </div>
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-3`}>
          {[
            { key: 'maxPositionPercent', label: '最大单仓比例', value: `${riskRules.maxPositionPercent}%`, desc: '单个仓位占总资产的最大百分比' },
            { key: 'maxDailyDrawdown', label: '日内最大回撤', value: `${riskRules.maxDailyDrawdown}%`, desc: '日内回撤超过此值将拒绝新信号' },
            { key: 'maxLeverage', label: '最大杠杆率', value: `${riskRules.maxLeverage}x`, desc: '总杠杆率限制' },
            { key: 'minConfidence', label: '最低置信度', value: `${riskRules.minConfidence}%`, desc: '策略信号最低要求置信度' },
            { key: 'maxOpenPositions', label: '最大持仓数', value: `${riskRules.maxOpenPositions}`, desc: '最大同时持有仓位数量' },
            { key: 'cooldownMs', label: '冷却时间', value: `${riskRules.cooldownMs / 1000}s`, desc: '同一品种交易最短间隔' },
          ].map((rule) => (
            <div key={rule.key} className="p-3 bg-[#0A192F] rounded border border-[#233554]/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#CCD6F6]">{rule.label}</span>
                <span className="text-sm font-mono text-[#4299E1]">{rule.value}</span>
              </div>
              <p className="text-[9px] text-[#8892B0]">{rule.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export const RiskModule = ({ activeSub }: { activeSub: string }) => {
  const renderContent = () => {
    switch (activeSub) {
      case 'quantum_risk': return <QuantumRiskModule />;
      case 'bigdata_risk': return <BigDataRiskModule />;
      case 'live_risk': return <LiveRiskModule />;
      case 'signal_chain': return <SignalChainModule />;
      case 'warning': return <WarningModule />;
      case 'report': return <ReportModule />;
      case 'hedging': return <HedgingModule />;
      default: return <QuantumRiskModule />;
    }
  };

  return <div className="space-y-4">{renderContent()}</div>;
};