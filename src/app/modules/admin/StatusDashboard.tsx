/**
 * @file src/app/modules/admin/StatusDashboard.tsx
 * @description YYC3 实时状态仪表板，提供 WebSocket/断路器/性能/离线状态概览，用于基础设施健康监控
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags admin,react,typescript,monitoring,public
 * @depends @/app/components,@/app/api,@/app/utils,@/app/contexts
 */

/**
 * YYC-QATS Real-Time Status Dashboard
 * ─────────────────────────────────────
 * Phase 14B: WS / Circuit Breaker / Performance / Offline status overview.
 * Admin module sub-page for infrastructure health monitoring.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { authManager, type AuthUser } from '@/app/api/auth';
import { getAllCircuitBreakerMetrics, resetAllCircuitBreakers, type CircuitBreakerMetrics, type CircuitState } from '@/app/api/circuit-breaker';
import { perfMonitor, type PerformanceSnapshot } from '@/app/api/performance-monitor';
import { wsChannelManager, type WSChannelStats } from '@/app/api/ws-channels';
import { Card } from '@/app/components/ui/card';
import { offlineManager, type OfflineStats } from '@/app/utils/offline-manager';


type IconProps = React.SVGProps<SVGSVGElement>;
const Wifi = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01" /></svg>;
const Zap = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const Activity = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
const WifiOff = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" /></svg>;
const Shield = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const RefreshCw = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M23 4v6h-6M1 20v-6h6" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>;
const Clock = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" /></svg>;

const CB_STATE_CONFIG: Record<CircuitState, { color: string; bg: string; label: string }> = {
  CLOSED: { color: 'text-[#38B2AC]', bg: 'bg-[#38B2AC]', label: '正常' },
  OPEN: { color: 'text-[#F56565]', bg: 'bg-[#F56565]', label: '断路' },
  HALF_OPEN: { color: 'text-[#ECC94B]', bg: 'bg-[#ECC94B]', label: '半开' },
};

const WS_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  connected: { color: 'text-[#38B2AC]', label: '已连接' },
  connecting: { color: 'text-[#ECC94B]', label: '连接中' },
  reconnecting: { color: 'text-[#ECC94B]', label: '重连中' },
  disconnected: { color: 'text-[#8892B0]', label: '未连接' },
};

export const StatusDashboard = () => {
  const [wsStats, setWsStats] = useState<WSChannelStats | null>(null);
  const [cbMetrics, setCbMetrics] = useState<CircuitBreakerMetrics[]>([]);
  const [perfSnap, setPerfSnap] = useState<PerformanceSnapshot | null>(null);
  const [offlineStats, setOfflineStats] = useState<OfflineStats | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(authManager.currentUser);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>(new Date().toLocaleTimeString('zh-CN'));

  const refreshAll = useCallback(() => {
    try {
      setWsStats(wsChannelManager.stats);
    } catch { setWsStats(null); }
    try {
      setCbMetrics(getAllCircuitBreakerMetrics());
    } catch { setCbMetrics([]); }
    try {
      setPerfSnap(perfMonitor.getSnapshot());
    } catch { setPerfSnap(null); }
    try {
      setOfflineStats(offlineManager.stats);
    } catch { setOfflineStats(null); }
    setAuthUser(authManager.currentUser);
    setLastRefresh(new Date().toLocaleTimeString('zh-CN'));
  }, []);

  useEffect(() => {
    refreshAll();
    if (!autoRefresh) return;
    const timer = setInterval(refreshAll, 3000);
    return () => clearInterval(timer);
  }, [autoRefresh, refreshAll]);

  const handleResetCB = () => {
    resetAllCircuitBreakers();
    toast.success('所有断路器已重置');
    refreshAll();
  };

  const formatUptime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  // Aggregate CB state
  const cbClosedCount = cbMetrics.filter(m => m.state === 'CLOSED').length;
  const cbOpenCount = cbMetrics.filter(m => m.state === 'OPEN').length;
  const cbHalfCount = cbMetrics.filter(m => m.state === 'HALF_OPEN').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4299E1] to-[#38B2AC] flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-white text-sm">实时状态总览仪表盘</h2>
            <p className="text-[10px] text-[#8892B0]">Phase 14B · WS / 断路器 / 性能 / 离线 · 3s 自动刷新</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#8892B0]">更新: {lastRefresh}</span>
          <button onClick={refreshAll} className="p-1.5 text-[#8892B0] hover:text-[#38B2AC] rounded hover:bg-[#112240] transition-colors" title="手动刷新">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`px-2 py-1 text-[10px] rounded border transition-colors ${autoRefresh ? 'bg-[#38B2AC]/10 border-[#38B2AC]/30 text-[#38B2AC]' : 'bg-[#233554]/50 border-[#233554] text-[#8892B0]'}`}
          >
            {autoRefresh ? 'AUTO' : 'PAUSE'}
          </button>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* WS Status */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wifi className="w-4 h-4 text-[#4299E1]" />
            <p className="text-[10px] text-[#8892B0] uppercase">WebSocket</p>
          </div>
          <p className={`text-lg font-mono mt-1 ${WS_STATUS_CONFIG[wsStats?.status || 'disconnected']?.color || 'text-[#8892B0]'}`}>
            {WS_STATUS_CONFIG[wsStats?.status || 'disconnected']?.label || '未知'}
          </p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-[#8892B0]">
            <span>频道: {wsStats?.activeSubscriptions || 0}</span>
            <span>收: {wsStats?.messagesReceived || 0}</span>
          </div>
        </Card>

        {/* Circuit Breaker Summary */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-[#38B2AC]" />
            <p className="text-[10px] text-[#8892B0] uppercase">断路器</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono text-[#38B2AC]">{cbClosedCount}</span>
            <span className="text-[10px] text-[#8892B0]">正常</span>
            {cbOpenCount > 0 && (
              <>
                <span className="text-[#233554]">|</span>
                <span className="text-lg font-mono text-[#F56565]">{cbOpenCount}</span>
                <span className="text-[10px] text-[#F56565]">断路</span>
              </>
            )}
            {cbHalfCount > 0 && (
              <>
                <span className="text-[#233554]">|</span>
                <span className="text-lg font-mono text-[#ECC94B]">{cbHalfCount}</span>
                <span className="text-[10px] text-[#ECC94B]">半开</span>
              </>
            )}
          </div>
          <p className="text-[10px] text-[#8892B0] mt-2">共 {cbMetrics.length} 个服务</p>
        </Card>

        {/* Performance */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[#ECC94B]" />
            <p className="text-[10px] text-[#8892B0] uppercase">性能</p>
          </div>
          <p className="text-lg font-mono text-white">{perfSnap ? `${perfSnap.avgLatency.toFixed(0)}ms` : '--'}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-[#8892B0]">
            <span>P95: {perfSnap?.p95Latency.toFixed(0) || '--'}ms</span>
            <span>成功率: {perfSnap ? `${perfSnap.successRate.toFixed(1)}%` : '--'}</span>
          </div>
        </Card>

        {/* Offline */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {offlineStats?.isOnline ? <Wifi className="w-4 h-4 text-[#38B2AC]" /> : <WifiOff className="w-4 h-4 text-[#F56565]" />}
            <p className="text-[10px] text-[#8892B0] uppercase">网络</p>
          </div>
          <p className={`text-lg font-mono ${offlineStats?.isOnline !== false ? 'text-[#38B2AC]' : 'text-[#F56565]'}`}>
            {offlineStats?.isOnline !== false ? 'ONLINE' : 'OFFLINE'}
          </p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-[#8892B0]">
            <span>待同步: {offlineStats?.pendingCount || 0}</span>
            <span>重连: {offlineStats?.totalReconnects || 0}</span>
          </div>
        </Card>
      </div>

      {/* Detail Panels Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* WS Channel Detail */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-sm flex items-center gap-2">
              <Wifi className="w-4 h-4 text-[#4299E1]" /> WebSocket 频道详情
            </h3>
            <span className="text-[10px] text-[#8892B0]">CB状态: <span className={CB_STATE_CONFIG[wsStats?.cbState || 'CLOSED']?.color}>{CB_STATE_CONFIG[wsStats?.cbState || 'CLOSED']?.label}</span></span>
          </div>
          <div className="space-y-2">
            {wsStats && wsStats.channelList.length > 0 ? (
              wsStats.channelList.map((ch) => (
                <div key={ch} className="flex items-center justify-between p-2 bg-[#0A192F] rounded border border-[#233554]/50">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38B2AC]" />
                    <span className="text-xs text-[#CCD6F6] font-mono">{ch}</span>
                  </div>
                  <span className="text-[10px] text-[#8892B0]">活跃</span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-[#8892B0] text-xs">
                暂无活跃频道
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#233554]">
              <div className="text-center">
                <p className="text-[10px] text-[#8892B0]">消息收到</p>
                <p className="text-xs font-mono text-[#CCD6F6]">{wsStats?.messagesReceived || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-[#8892B0]">消息发送</p>
                <p className="text-xs font-mono text-[#CCD6F6]">{wsStats?.messagesSent || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-[#8892B0]">重连次数</p>
                <p className="text-xs font-mono text-[#ECC94B]">{wsStats?.reconnectAttempts || 0}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Circuit Breaker Detail */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#38B2AC]" /> 断路器状态
            </h3>
            <button onClick={handleResetCB} className="px-2 py-1 text-[10px] text-[#F56565] border border-[#F56565]/30 rounded hover:bg-[#F56565]/10 transition-colors">
              全部重置
            </button>
          </div>
          <div className="space-y-2">
            {cbMetrics.length > 0 ? cbMetrics.map((m) => {
              const sc = CB_STATE_CONFIG[m.state];
              return (
                <div key={m.serviceName} className="flex items-center justify-between p-2 bg-[#0A192F] rounded border border-[#233554]/50">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.bg} ${m.state === 'OPEN' ? 'animate-pulse' : ''}`} />
                    <span className="text-xs text-[#CCD6F6]">{m.serviceName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className={sc.color}>{sc.label}</span>
                    <span className="text-[#8892B0]">失败: <span className="text-[#F56565] font-mono">{m.totalFailures}</span></span>
                    <span className="text-[#8892B0]">请求: <span className="text-[#38B2AC] font-mono">{m.totalRequests}</span></span>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-6 text-[#8892B0] text-xs">暂无断路器实例</div>
            )}
          </div>
        </Card>
      </div>

      {/* Performance + Offline Detail Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Performance Detail */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#ECC94B]" /> 性能快照
            </h3>
            <span className="text-[10px] text-[#8892B0]">运行: {perfSnap ? formatUptime(perfSnap.uptime) : '--'}</span>
          </div>
          {perfSnap ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2 bg-[#0A192F] rounded text-center">
                  <p className="text-[10px] text-[#8892B0]">总请求数</p>
                  <p className="text-sm font-mono text-white">{perfSnap.totalRequests}</p>
                </div>
                <div className="p-2 bg-[#0A192F] rounded text-center">
                  <p className="text-[10px] text-[#8892B0]">请求/分</p>
                  <p className="text-sm font-mono text-[#4299E1]">{perfSnap.requestsPerMinute}</p>
                </div>
                <div className="p-2 bg-[#0A192F] rounded text-center">
                  <p className="text-[10px] text-[#8892B0]">成功率</p>
                  <p className={`text-sm font-mono ${perfSnap.successRate >= 95 ? 'text-[#38B2AC]' : perfSnap.successRate >= 80 ? 'text-[#ECC94B]' : 'text-[#F56565]'}`}>{perfSnap.successRate.toFixed(1)}%</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2 bg-[#0A192F] rounded text-center">
                  <p className="text-[10px] text-[#8892B0]">平均延迟</p>
                  <p className="text-sm font-mono text-white">{perfSnap.avgLatency.toFixed(0)}ms</p>
                </div>
                <div className="p-2 bg-[#0A192F] rounded text-center">
                  <p className="text-[10px] text-[#8892B0]">P95</p>
                  <p className="text-sm font-mono text-[#ECC94B]">{perfSnap.p95Latency.toFixed(0)}ms</p>
                </div>
                <div className="p-2 bg-[#0A192F] rounded text-center">
                  <p className="text-[10px] text-[#8892B0]">P99</p>
                  <p className="text-sm font-mono text-[#F56565]">{perfSnap.p99Latency.toFixed(0)}ms</p>
                </div>
              </div>
              {/* Source breakdown */}
              <div className="flex items-center justify-between pt-2 border-t border-[#233554] text-[10px]">
                <span className="text-[#8892B0]">数据源分布:</span>
                <div className="flex items-center gap-3">
                  <span className="text-[#38B2AC]">Real: {perfSnap.realCount}</span>
                  <span className="text-[#ECC94B]">Mock: {perfSnap.mockCount}</span>
                  <span className="text-[#F56565]">CB Open: {perfSnap.circuitOpenCount}</span>
                </div>
              </div>
              {perfSnap.memoryUsedMB !== null && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#8892B0]">内存使用:</span>
                  <span className="text-[#CCD6F6] font-mono">{perfSnap.memoryUsedMB.toFixed(1)} MB</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-[#8892B0] text-xs">性能数据加载中...</div>
          )}
        </Card>

        {/* Offline & Auth Detail */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-sm flex items-center gap-2">
              {offlineStats?.isOnline !== false ? <Wifi className="w-4 h-4 text-[#38B2AC]" /> : <WifiOff className="w-4 h-4 text-[#F56565]" />}
              离线管理 & 认证状态
            </h3>
          </div>
          <div className="space-y-3">
            {/* Offline stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 bg-[#0A192F] rounded">
                <p className="text-[10px] text-[#8892B0]">网络状态</p>
                <p className={`text-sm font-mono ${offlineStats?.isOnline !== false ? 'text-[#38B2AC]' : 'text-[#F56565]'}`}>
                  {offlineStats?.isOnline !== false ? 'ONLINE' : 'OFFLINE'}
                </p>
              </div>
              <div className="p-2 bg-[#0A192F] rounded">
                <p className="text-[10px] text-[#8892B0]">待同步变更</p>
                <p className={`text-sm font-mono ${(offlineStats?.pendingCount || 0) > 0 ? 'text-[#ECC94B]' : 'text-[#38B2AC]'}`}>
                  {offlineStats?.pendingCount || 0}
                </p>
              </div>
              <div className="p-2 bg-[#0A192F] rounded">
                <p className="text-[10px] text-[#8892B0]">总重连次数</p>
                <p className="text-sm font-mono text-[#CCD6F6]">{offlineStats?.totalReconnects || 0}</p>
              </div>
              <div className="p-2 bg-[#0A192F] rounded">
                <p className="text-[10px] text-[#8892B0]">已排空数</p>
                <p className="text-sm font-mono text-[#38B2AC]">{offlineStats?.drainedCount || 0}</p>
              </div>
            </div>

            {/* Auth info */}
            <div className="pt-3 border-t border-[#233554]">
              <p className="text-[10px] text-[#8892B0] uppercase mb-2">认证状态</p>
              {authUser ? (
                <div className="flex items-center gap-3 p-2 bg-[#0A192F] rounded border border-[#233554]/50">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4299E1] to-[#9F7AEA] flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{authUser.displayName.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#CCD6F6]">{authUser.displayName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        {authUser.role}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#8892B0]">{authUser.email}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#0A192F] rounded border border-[#233554]/50 text-center text-xs text-[#8892B0]">
                  未登录 — 点击 Navbar 认证按钮登录
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="flex items-center gap-4 text-[10px] text-[#4A5568]">
              <Clock className="w-3 h-3" />
              {offlineStats?.lastOnlineAt && <span>最后在线: {new Date(offlineStats.lastOnlineAt).toLocaleTimeString('zh-CN')}</span>}
              {offlineStats?.lastOfflineAt && <span>最后离线: {new Date(offlineStats.lastOfflineAt).toLocaleTimeString('zh-CN')}</span>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
