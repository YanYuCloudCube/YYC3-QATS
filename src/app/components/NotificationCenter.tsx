/**
 * @file src/app/components/NotificationCenter.tsx
 * @description YYC3 通知中心组件,聚合风险警报、信号链事件、系统消息等通知
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags component,react,typescript,notification,public
 * @depends react,@/app/components/ui/Card,@/app/services/signal-chain-engine,@/app/constants/global-keys
 */

/**
 * YYC-QATS Notification Center
 * ─────────────────────────────
 * Phase 19A: Unified notification panel
 *
 * Aggregates:
 *   - Risk alerts (from SignalChainEngine)
 *   - Signal chain events (APPROVE/REJECT/MODIFY/ESCALATE)
 *   - System messages (WS status changes, errors)
 *   - User toast notifications
 *
 * Features:
 *   - Filter by type & severity
 *   - Read/Unread tracking
 *   - Mark all read / Clear all
 *   - Auto-scroll to latest
 *   - Badge count on toggle button
 *   - Mobile-friendly slide-over panel
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';

import { GLOBAL_KEYS } from '@/app/constants/global-keys';
import { signalChainEngine, type ChainEvent } from '@/app/services/signal-chain-engine';

// ── Types ──

export type NotificationType = 'risk_alert' | 'signal_chain' | 'system' | 'trade' | 'info';
export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  source?: string;
  meta?: Record<string, unknown>;
}

type IconProps = React.SVGProps<SVGSVGElement>;

const BellIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const XIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const CheckIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
const TrashIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const FilterIcon = (props: IconProps) => <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>;

// ── Notification Store (globalThis singleton) ──

const STORE_KEY = GLOBAL_KEYS.NOTIFICATION_STORE;

export interface NotificationStore {
  notifications: NotificationItem[];
  addNotification: (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
  getUnreadCount: () => number;
  subscribe: (listener: () => void) => () => void;
}

function createNotificationStore(): NotificationStore {
  let notifications: NotificationItem[] = [];
  const listeners: Set<() => void> = new Set();

  const notify = () => { for (const l of listeners) { try { l(); } catch { /* noop */ } } };

  return {
    get notifications() { return notifications; },
    addNotification(item) {
      const newItem: NotificationItem = {
        ...item,
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        read: false,
      };
      notifications = [newItem, ...notifications].slice(0, 200);
      notify();
    },
    markRead(id) {
      notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
      notify();
    },
    markAllRead() {
      notifications = notifications.map(n => ({ ...n, read: true }));
      notify();
    },
    clearAll() {
      notifications = [];
      notify();
    },
    removeNotification(id) {
      notifications = notifications.filter(n => n.id !== id);
      notify();
    },
    getUnreadCount() {
      return notifications.filter(n => !n.read).length;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

export const notificationStore: NotificationStore =
  (globalThis as any)[STORE_KEY] || ((globalThis as any)[STORE_KEY] = createNotificationStore());

// ── Hook to use notification store ──

export function useNotificationStore() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return notificationStore.subscribe(() => forceUpdate(v => v + 1));
  }, []);

  return notificationStore;
}

// ── Auto-bridge: Signal chain events → Notification store ──

let _bridgeInitialized = false;
export function initNotificationBridge() {
  if (_bridgeInitialized) return;
  _bridgeInitialized = true;

  signalChainEngine.onChainEvent((event: ChainEvent) => {
    const decision = event.riskEval?.decision || 'UNKNOWN';
    let severity: NotificationSeverity = 'info';
    if (decision === 'REJECT') severity = 'critical';
    else if (decision === 'ESCALATE') severity = 'warning';
    else if (decision === 'APPROVE') severity = 'success';
    else if (decision === 'MODIFY') severity = 'warning';

    notificationStore.addNotification({
      type: 'signal_chain',
      severity,
      title: `信号链路: ${decision}`,
      message: `${event.signal.strategyName} → ${event.signal.symbol} ${event.signal.action} | ${event.riskEval?.reason || ''}`,
      source: 'SignalChainEngine',
      meta: { chainEventId: event.id, stage: event.stage },
    });
  });
}

// ── Severity & Type Helpers ──

const SEVERITY_COLORS: Record<NotificationSeverity, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
  warning:  { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', dot: 'bg-yellow-500' },
  info:     { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  success:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
};

const TYPE_LABELS: Record<NotificationType, string> = {
  risk_alert: '风控警报',
  signal_chain: '信号链路',
  system: '系统消息',
  trade: '交易通知',
  info: '信息提示',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}小时前`;
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// ── NotificationCenter Component ──

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const store = useNotificationStore();
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<NotificationSeverity | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return store.notifications.filter(n => {
      if (typeFilter !== 'all' && n.type !== typeFilter) return false;
      if (severityFilter !== 'all' && n.severity !== severityFilter) return false;
      return true;
    });
  }, [store.notifications, typeFilter, severityFilter]);

  const unreadCount = store.getUnreadCount();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-[#0B1929] border-l border-[#233554] h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#233554]">
          <div className="flex items-center gap-3">
            <BellIcon className="w-5 h-5 text-[#38B2AC]" />
            <h2 className="text-[#CCD6F6]">通知中心</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
                {unreadCount} 未读
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-md transition-colors ${showFilters ? 'bg-[#38B2AC]/20 text-[#38B2AC]' : 'text-[#8892B0] hover:text-[#CCD6F6]'}`}
              title="筛选"
            >
              <FilterIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => store.markAllRead()}
              className="p-1.5 rounded-md text-[#8892B0] hover:text-[#38B2AC] transition-colors"
              title="全部已读"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => store.clearAll()}
              className="p-1.5 rounded-md text-[#8892B0] hover:text-red-400 transition-colors"
              title="清空全部"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-[#8892B0] hover:text-[#CCD6F6] transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="p-3 border-b border-[#233554] space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-[#8892B0] self-center mr-1">类型:</span>
              {(['all', 'risk_alert', 'signal_chain', 'system', 'trade', 'info'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${typeFilter === t ? 'bg-[#38B2AC]/20 text-[#38B2AC]' : 'bg-[#112240] text-[#8892B0] hover:text-[#CCD6F6]'}`}
                >
                  {t === 'all' ? '全部' : TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-[#8892B0] self-center mr-1">级别:</span>
              {(['all', 'critical', 'warning', 'info', 'success'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors ${severityFilter === s ? 'bg-[#38B2AC]/20 text-[#38B2AC]' : 'bg-[#112240] text-[#8892B0] hover:text-[#CCD6F6]'}`}
                >
                  {s === 'all' ? '全部' : s === 'critical' ? '严重' : s === 'warning' ? '警告' : s === 'info' ? '信息' : '成功'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notification List */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-[#8892B0]">
              <BellIcon className="w-10 h-10 opacity-20 mb-3" />
              <p className="text-sm">暂无通知</p>
            </div>
          ) : (
            <div className="divide-y divide-[#233554]/50">
              {filtered.map(n => {
                const colors = SEVERITY_COLORS[n.severity];
                return (
                  <div
                    key={n.id}
                    className={`p-3 hover:bg-[#112240]/50 transition-colors cursor-pointer ${!n.read ? 'bg-[#112240]/30' : ''}`}
                    onClick={() => store.markRead(n.id)}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Unread dot */}
                      <div className="mt-1.5 flex-shrink-0">
                        {!n.read ? (
                          <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                        ) : (
                          <div className="w-2 h-2" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] ${colors.bg} ${colors.text} border ${colors.border}`}>
                            {TYPE_LABELS[n.type]}
                          </span>
                          <span className="text-[10px] text-[#8892B0] ml-auto flex-shrink-0">
                            {formatTime(n.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-[#CCD6F6] truncate">{n.title}</p>
                        <p className="text-[11px] text-[#8892B0] mt-0.5 line-clamp-2">{n.message}</p>
                        {n.source && (
                          <span className="text-[9px] text-[#4A5568] mt-1 inline-block">来源: {n.source}</span>
                        )}
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); store.removeNotification(n.id); }}
                        className="flex-shrink-0 p-1 text-[#4A5568] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        style={{ opacity: 0.5 }}
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="px-4 py-2 border-t border-[#233554] flex items-center justify-between text-[10px] text-[#8892B0]">
          <span>共 {store.notifications.length} 条通知</span>
          <span>{unreadCount} 条未读 | {filtered.length} 条显示</span>
        </div>
      </div>
    </div>
  );
};

// ── NotificationBadge: A button to toggle the panel ──

export const NotificationBadge: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const store = useNotificationStore();
  const unread = store.getUnreadCount();

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-[#8892B0] hover:text-[#38B2AC] transition-colors"
      title="通知中心"
    >
      <BellIcon className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
};