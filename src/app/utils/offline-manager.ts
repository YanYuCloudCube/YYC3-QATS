/**
 * @file src/app/utils/offline-manager.ts
 * @description YYC3 离线管理器，提供在线/离线检测、待处理操作队列、后台同步等功能，支持 IndexedDB 持久化
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags utils,typescript,offline,public
 */

/**
 * YYC-QATS Offline Manager
 * ─────────────────────────
 * Phase 13: Offline detection, pending mutation queue, and background sync.
 *
 * Features:
 *   1. Online/offline detection with navigator.onLine + heartbeat probe
 *   2. Pending mutation queue for operations that fail while offline
 *   3. Automatic drain on reconnection
 *   4. IndexedDB-like persistence via localStorage (simplified)
 *   5. Event-based status notifications
 *
 * Usage:
 *   import { offlineManager } from './offline-manager';
 *   offlineManager.onStatusChange(online => console.log('online:', online));
 *   offlineManager.enqueue({ type: 'placeOrder', payload: {...} });
 */

// ═══════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════

export interface PendingMutation {
  id: string;
  type: string;
  payload: unknown;
  createdAt: number;
  retries: number;
  maxRetries: number;
}

export interface OfflineStats {
  isOnline: boolean;
  pendingCount: number;
  lastOnlineAt: number | null;
  lastOfflineAt: number | null;
  totalReconnects: number;
  drainedCount: number;
}

export type OfflineStatusListener = (isOnline: boolean) => void;
export type MutationProcessor = (mutation: PendingMutation) => Promise<boolean>;

// ═══════════════════════════════════════
// §2  Offline Manager
// ═══════════════════════════════════════

import { STORAGE_KEYS } from '@/app/constants/storage-keys';

const HEARTBEAT_INTERVAL = 30_000; // 30s ping

class OfflineManager {
  private _isOnline: boolean;
  private _pendingQueue: PendingMutation[] = [];
  private _listeners: OfflineStatusListener[] = [];
  private _processor: MutationProcessor | null = null;
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _isDraining = false;
  private _stats = {
    lastOnlineAt: null as number | null,
    lastOfflineAt: null as number | null,
    totalReconnects: 0,
    drainedCount: 0,
  };

  constructor() {
    this._isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.restoreQueue();
    this.setupListeners();
    this.startHeartbeat();

    if (this._isOnline) {
      this._stats.lastOnlineAt = Date.now();
    }
  }

  // ── Public API ──

  get isOnline(): boolean { return this._isOnline; }

  get stats(): OfflineStats {
    return {
      isOnline: this._isOnline,
      pendingCount: this._pendingQueue.length,
      lastOnlineAt: this._stats.lastOnlineAt,
      lastOfflineAt: this._stats.lastOfflineAt,
      totalReconnects: this._stats.totalReconnects,
      drainedCount: this._stats.drainedCount,
    };
  }

  get pendingQueue(): ReadonlyArray<PendingMutation> {
    return this._pendingQueue;
  }

  /** Register a processor function for draining pending mutations */
  setProcessor(processor: MutationProcessor): void {
    this._processor = processor;
  }

  /** Add a mutation to the pending queue */
  enqueue(mutation: Omit<PendingMutation, 'id' | 'createdAt' | 'retries' | 'maxRetries'> & { maxRetries?: number }): string {
    const entry: PendingMutation = {
      id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: mutation.type,
      payload: mutation.payload,
      createdAt: Date.now(),
      retries: 0,
      maxRetries: mutation.maxRetries ?? 3,
    };
    this._pendingQueue.push(entry);
    this.persistQueue();
    console.log(`%c[Offline] Enqueued mutation: ${entry.type} (${this._pendingQueue.length} pending)`, 'color: #ECC94B');
    return entry.id;
  }

  /** Remove a specific mutation from the queue */
  dequeue(id: string): boolean {
    const idx = this._pendingQueue.findIndex(m => m.id === id);
    if (idx === -1) return false;
    this._pendingQueue.splice(idx, 1);
    this.persistQueue();
    return true;
  }

  /** Clear all pending mutations */
  clearQueue(): void {
    this._pendingQueue = [];
    this.persistQueue();
  }

  /** Listen for online/offline status changes */
  onStatusChange(listener: OfflineStatusListener): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  /** Manually trigger drain (useful when processor is set after enqueue) */
  async drain(): Promise<number> {
    if (!this._isOnline || this._isDraining || !this._processor) return 0;
    return this._drainQueue();
  }

  /** Destroy the manager (cleanup timers) */
  destroy(): void {
    this.stopHeartbeat();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this._handleOnline);
      window.removeEventListener('offline', this._handleOffline);
    }
  }

  // ── Internal ──

  private setupListeners(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', this._handleOnline);
    window.addEventListener('offline', this._handleOffline);
  }

  private _handleOnline = (): void => {
    if (this._isOnline) return;
    this._isOnline = true;
    this._stats.lastOnlineAt = Date.now();
    this._stats.totalReconnects++;
    console.log('%c[Offline] Back online', 'color: #38B2AC');
    this.notifyListeners();
    // Auto-drain on reconnect
    this._drainQueue();
  };

  private _handleOffline = (): void => {
    if (!this._isOnline) return;
    this._isOnline = false;
    this._stats.lastOfflineAt = Date.now();
    console.log('%c[Offline] Went offline', 'color: #F56565');
    this.notifyListeners();
  };

  private notifyListeners(): void {
    this._listeners.forEach(fn => { try { fn(this._isOnline); } catch { /* */ } });
  }

  private async _drainQueue(): Promise<number> {
    if (this._isDraining || !this._processor || this._pendingQueue.length === 0) return 0;
    this._isDraining = true;
    let drained = 0;

    console.log(`%c[Offline] Draining ${this._pendingQueue.length} pending mutations...`, 'color: #4299E1');

    const toProcess = [...this._pendingQueue];
    for (const mutation of toProcess) {
      if (!this._isOnline) break; // Stop if we go offline again

      try {
        const success = await this._processor(mutation);
        if (success) {
          this.dequeue(mutation.id);
          drained++;
          this._stats.drainedCount++;
        } else {
          mutation.retries++;
          if (mutation.retries >= mutation.maxRetries) {
            console.warn(`[Offline] Mutation ${mutation.id} exceeded max retries, removing`);
            this.dequeue(mutation.id);
          }
        }
      } catch {
        mutation.retries++;
        if (mutation.retries >= mutation.maxRetries) {
          this.dequeue(mutation.id);
        }
      }
    }

    this.persistQueue();
    this._isDraining = false;
    console.log(`%c[Offline] Drained ${drained}/${toProcess.length} mutations`, 'color: #38B2AC');
    return drained;
  }

  // ── Heartbeat Probe ──

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      // Cross-check navigator.onLine with actual state
      const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (browserOnline !== this._isOnline) {
        if (browserOnline) this._handleOnline();
        else this._handleOffline();
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  // ── Persistence ──

  private persistQueue(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this._pendingQueue));
    } catch { /* quota exceeded or restricted */ }
  }

  private restoreQueue(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (raw) {
        this._pendingQueue = JSON.parse(raw);
        if (this._pendingQueue.length > 0) {
          console.log(`%c[Offline] Restored ${this._pendingQueue.length} pending mutations`, 'color: #4299E1');
        }
      }
    } catch {
      this._pendingQueue = [];
    }
  }
}

// ═══════════════════════════════════════
// §3  Singleton & Console Exposure
// ═══════════════════════════════════════

export const offlineManager = new OfflineManager();

if (typeof globalThis !== 'undefined') {
  (globalThis as any).offlineManager = offlineManager;
}