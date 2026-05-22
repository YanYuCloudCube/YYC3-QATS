/**
 * @file src/app/components/OfflineIndicator.tsx
 * @description YYC3 离线状态指示器组件,显示网络连接状态和待同步操作数量
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags component,react,typescript,offline,public
 * @depends react,../utils/offline-manager
 */

/**
 * YYC-QATS Offline Indicator
 * ───────────────────────────
 * Phase 13: Shows offline status bar + pending mutation count.
 * Pure function component — no forwardRef, no radix-ui.
 */

import { useState, useEffect } from 'react';

import { offlineManager } from '../utils/offline-manager';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(offlineManager.isOnline);
  const [pendingCount, setPendingCount] = useState(offlineManager.stats.pendingCount);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const unsub = offlineManager.onStatusChange((online) => {
      setIsOnline(online);
      setPendingCount(offlineManager.stats.pendingCount);
      if (!online) {
        setShow(true);
      } else {
        // Show "back online" briefly, then auto-hide
        setShow(true);
        const timer = setTimeout(() => setShow(false), 3000);
        return () => clearTimeout(timer);
      }
    });

    // Check periodically for pending count updates
    const interval = setInterval(() => {
      setPendingCount(offlineManager.stats.pendingCount);
    }, 5000);

    // Show immediately if offline
    if (!offlineManager.isOnline) {
      setShow(true);
    }

    return () => { unsub(); clearInterval(interval); };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed top-12 left-0 right-0 z-50 flex items-center justify-center py-1.5 px-4 text-xs transition-all duration-300 ${
        isOnline
          ? 'bg-[#38B2AC]/90 text-white'
          : 'bg-[#F56565]/90 text-white'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-300 animate-pulse' : 'bg-red-300 animate-pulse'
          }`}
        />
        <span>
          {isOnline
            ? '网络已恢复 — 同步中...'
            : `离线模式${pendingCount > 0 ? ` — ${pendingCount} 个待同步操作` : ''}`}
        </span>
        {!isOnline && pendingCount > 0 && (
          <button
            onClick={() => offlineManager.clearQueue()}
            className="ml-2 px-2 py-0.5 bg-white/20 rounded text-[10px] hover:bg-white/30 transition-colors"
          >
            清空队列
          </button>
        )}
        {isOnline && (
          <button
            onClick={() => setShow(false)}
            className="ml-2 px-2 py-0.5 bg-white/20 rounded text-[10px] hover:bg-white/30 transition-colors"
          >
            关闭
          </button>
        )}
      </div>
    </div>
  );
}
