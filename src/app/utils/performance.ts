/**
 * @file src/app/utils/performance.ts
 * @description YYC3 性能工具集，提供记忆化、防抖、节流和虚拟滚动等功能，优化应用性能
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags utils,typescript,performance,public
 */

/**
 * YYC-QATS Performance Utilities
 * ────────────────────────────────
 * Phase 13: Memoization, debounce, throttle, and virtual scrolling helpers.
 *
 * Usage:
 *   import { memoize, debounce, throttle, createVirtualScroller } from './performance';
 */

// ══════════════════════════════════════
// §1  Memoization
// ══════════════════════════════════════

interface MemoOptions {
  /** Max cache entries (LRU eviction). Default 100. */
  maxSize?: number;
  /** TTL in ms. Default: Infinity (never expires). */
  ttl?: number;
}

interface MemoEntry<T> {
  value: T;
  createdAt: number;
}

/**
 * Generic memoize with LRU eviction and optional TTL.
 * Works for functions with serializable arguments.
 */
export function memoize<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  options: MemoOptions = {},
): ((...args: TArgs) => TReturn) & { cache: Map<string, MemoEntry<TReturn>>; clear: () => void } {
  const { maxSize = 100, ttl = Infinity } = options;
  const cache = new Map<string, MemoEntry<TReturn>>();

  const memoized = (...args: TArgs): TReturn => {
    const key = JSON.stringify(args);
    const existing = cache.get(key);

    if (existing) {
      // Check TTL
      if (ttl !== Infinity && Date.now() - existing.createdAt > ttl) {
        cache.delete(key);
      } else {
        // Move to end for LRU
        cache.delete(key);
        cache.set(key, existing);
        return existing.value;
      }
    }

    const value = fn(...args);
    cache.set(key, { value, createdAt: Date.now() });

    // LRU eviction
    if (cache.size > maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }

    return value;
  };

  memoized.cache = cache;
  memoized.clear = () => cache.clear();

  return memoized;
}

// ═══════════════════════════════════════
// §2  Debounce
// ═══════════════════════════════════════

export interface DebouncedFn<TArgs extends unknown[]> {
  (...args: TArgs): void;
  cancel: () => void;
  flush: () => void;
  pending: () => boolean;
}

/**
 * Debounce: delays execution until `wait` ms of silence.
 * Supports leading and trailing edge options.
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): DebouncedFn<TArgs> {
  const { leading = false, trailing = true } = options;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;
  let isLeadingInvoked = false;

  const invoke = () => {
    if (lastArgs && trailing) {
      fn(...lastArgs);
    }
    lastArgs = null;
    isLeadingInvoked = false;
  };

  const debounced: DebouncedFn<TArgs> = (...args: TArgs) => {
    lastArgs = args;

    if (leading && !isLeadingInvoked) {
      fn(...args);
      isLeadingInvoked = true;
    }

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      invoke();
      timer = null;
    }, wait);
  };

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = null;
    isLeadingInvoked = false;
  };

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      invoke();
    }
  };

  debounced.pending = () => timer !== null;

  return debounced;
}

// ═══════════════════════════════════════
// §3  Throttle
// ═══════════════════════════════════════

export interface ThrottledFn<TArgs extends unknown[]> {
  (...args: TArgs): void;
  cancel: () => void;
}

/**
 * Throttle: ensures fn is called at most once per `interval` ms.
 */
export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  interval: number,
): ThrottledFn<TArgs> {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;

  const throttled: ThrottledFn<TArgs> = (...args: TArgs) => {
    const now = Date.now();
    const remaining = interval - (now - last);

    lastArgs = args;

    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
      last = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        if (lastArgs) fn(...lastArgs);
      }, remaining);
    }
  };

  throttled.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };

  return throttled;
}

// ═══════════════════════════════════════
// §4  Virtual Scroll Helper
// ═══════════════════════════════════════

export interface VirtualScrollState {
  startIndex: number;
  endIndex: number;
  visibleCount: number;
  totalHeight: number;
  offsetY: number;
}

/**
 * Calculate virtual scroll window given container height, item height, scroll position, and total count.
 * Use in combination with `useMemo` for high-performance list rendering.
 */
export function computeVirtualScroll(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 5,
): VirtualScrollState {
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + 2 * overscan);
  const totalHeight = totalItems * itemHeight;
  const offsetY = startIndex * itemHeight;

  return { startIndex, endIndex, visibleCount, totalHeight, offsetY };
}

// ═══════════════════════════════════════
// §5  Batch State Update Helper
// ═══════════════════════════════════════

/**
 * Batch multiple synchronous state updates into one microtask.
 * Useful for combining rapid-fire WS updates.
 */
export function createBatchUpdater<T>(
  applyBatch: (items: T[]) => void,
  interval: number = 16, // ~60fps
): { add: (item: T) => void; flush: () => void; destroy: () => void; size: () => number } {
  let queue: T[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (queue.length > 0) {
      const batch = queue;
      queue = [];
      applyBatch(batch);
    }
    timer = null;
  };

  return {
    add: (item: T) => {
      queue.push(item);
      if (!timer) {
        timer = setTimeout(flush, interval);
      }
    },
    flush: () => {
      if (timer) { clearTimeout(timer); timer = null; }
      flush();
    },
    destroy: () => {
      if (timer) { clearTimeout(timer); timer = null; }
      queue = [];
    },
    size: () => queue.length,
  };
}

// ═══════════════════════════════════════
// §6  Console Exposure
// ═══════════════════════════════════════

if (typeof globalThis !== 'undefined') {
  (globalThis as any).perfUtils = {
    memoize,
    debounce,
    throttle,
    computeVirtualScroll,
    createBatchUpdater,
  };
}
