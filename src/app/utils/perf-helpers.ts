/**
 * @file src/app/utils/perf-helpers.ts
 * @description YYC3 性能优化辅助工具，提供稳定引用、浅比较、数字格式化、RAF 批处理、懒加载和渲染测量等功能
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
 * YYC-QATS Performance Helpers
 * ────────────────────────────
 * Phase 19C: Utility functions for performance optimization
 *
 * Provides:
 *   1. createStableRef: Stable callback ref that never changes identity
 *   2. shallowEqual: Efficient shallow comparison for memo
 *   3. formatNumber / formatCurrency: Memoized formatters
 *   4. batchRAF: RequestAnimationFrame batch queue
 *   5. LazyComponent: Intersection-observer-based lazy mount
 *   6. measureRender: Render performance measurement
 */

// ── Memoized Number Formatters ──

const numberFormatCache = new Map<string, Intl.NumberFormat>();

function getNumberFormat(locale: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options || {})}`;
  let fmt = numberFormatCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, options);
    numberFormatCache.set(key, fmt);
    // Prevent unbounded growth
    if (numberFormatCache.size > 50) {
      const first = numberFormatCache.keys().next().value;
      if (first !== undefined) numberFormatCache.delete(first);
    }
  }
  return fmt;
}

export function formatNumber(value: number, decimals = 2, locale = 'zh-CN'): string {
  return getNumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCurrency(value: number, currency = 'USD', locale = 'en-US'): string {
  return getNumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatCompact(value: number, locale = 'zh-CN'): string {
  return getNumberFormat(locale, { notation: 'compact' }).format(value);
}

// ── Shallow Equality Comparison ──

export function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

// ── Deep Freeze (for immutable data) ──

export function deepFreeze<T extends object>(obj: T): Readonly<T> {
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (typeof val === 'object' && val !== null && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

// ── RequestAnimationFrame Batch Queue ──

type RAFCallback = () => void;

class RAFBatchQueue {
  private queue: RAFCallback[] = [];
  private scheduled = false;

  add(callback: RAFCallback) {
    this.queue.push(callback);
    if (!this.scheduled) {
      this.scheduled = true;
      requestAnimationFrame(() => this.flush());
    }
  }

  private flush() {
    this.scheduled = false;
    const batch = this.queue.splice(0);
    for (const cb of batch) {
      try { cb(); } catch (_e) { console.error('[RAFBatch] Error:', _e); }
    }
  }

  get pending() { return this.queue.length; }
}

const RAF_QUEUE_KEY = '__YYC_RAFBatchQueue__';
export const rafBatchQueue: RAFBatchQueue =
  (globalThis as any)[RAF_QUEUE_KEY] || ((globalThis as any)[RAF_QUEUE_KEY] = new RAFBatchQueue());

// ── Render Performance Measurement ──

export interface RenderMetric {
  component: string;
  renderCount: number;
  totalTime: number;
  avgTime: number;
  lastTime: number;
  maxTime: number;
}

class RenderProfiler {
  private metrics = new Map<string, RenderMetric>();

  record(component: string, duration: number) {
    const existing = this.metrics.get(component);
    if (existing) {
      existing.renderCount++;
      existing.totalTime += duration;
      existing.avgTime = existing.totalTime / existing.renderCount;
      existing.lastTime = duration;
      existing.maxTime = Math.max(existing.maxTime, duration);
    } else {
      this.metrics.set(component, {
        component,
        renderCount: 1,
        totalTime: duration,
        avgTime: duration,
        lastTime: duration,
        maxTime: duration,
      });
    }
  }

  getMetrics(): RenderMetric[] {
    return Array.from(this.metrics.values()).sort((a, b) => b.totalTime - a.totalTime);
  }

  getSlowest(count = 5): RenderMetric[] {
    return this.getMetrics().slice(0, count);
  }

  reset() { this.metrics.clear(); }

  /** Print a summary to console */
  printSummary() {
    const metrics = this.getMetrics();
    console.group('%c[YYC-Perf] Render Profiler Summary', 'color: #38B2AC; font-weight: bold');
    console.table(metrics.map(m => ({
      Component: m.component,
      Renders: m.renderCount,
      'Total (ms)': +m.totalTime.toFixed(2),
      'Avg (ms)': +m.avgTime.toFixed(2),
      'Max (ms)': +m.maxTime.toFixed(2),
    })));
    console.groupEnd();
  }
}

const PROFILER_KEY = '__YYC_RenderProfiler__';
export const renderProfiler: RenderProfiler =
  (globalThis as any)[PROFILER_KEY] || ((globalThis as any)[PROFILER_KEY] = new RenderProfiler());

/**
 * Wrap a component's render body to measure time.
 * Usage: const measured = measureRender('MyComponent', () => { ... return jsx; });
 */
export function measureRender<T>(component: string, renderFn: () => T): T {
  const start = performance.now();
  const result = renderFn();
  renderProfiler.record(component, performance.now() - start);
  return result;
}

// ── Stable Interval Hook Helper ──

export function createStableInterval(callback: () => void, ms: number): () => void {
  const id = setInterval(callback, ms);
  return () => clearInterval(id);
}

// ── Array Diff Helper (for list updates) ──

export function arrayDiff<T>(
  oldArr: T[],
  newArr: T[],
  keyFn: (item: T) => string
): { added: T[]; removed: T[]; unchanged: T[] } {
  const oldMap = new Map(oldArr.map(item => [keyFn(item), item]));
  const newMap = new Map(newArr.map(item => [keyFn(item), item]));

  const added: T[] = [];
  const removed: T[] = [];
  const unchanged: T[] = [];

  for (const [key, item] of newMap) {
    if (oldMap.has(key)) {
      unchanged.push(item);
    } else {
      added.push(item);
    }
  }

  for (const [key, item] of oldMap) {
    if (!newMap.has(key)) {
      removed.push(item);
    }
  }

  return { added, removed, unchanged };
}

// Expose to console
if (typeof globalThis !== 'undefined') {
  (globalThis as any).renderProfiler = renderProfiler;
  (globalThis as any).rafBatchQueue = rafBatchQueue;
}
