/**
 * @file src/app/utils/global-error-handler.ts
 * @description YYC3 全局错误处理器，提供集中式错误捕获和遥测，支持运行时错误、Promise 拒绝和 React 错误边界
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags utils,typescript,error,public
 */

/**
 * YYC-QATS Global Error Handler
 * ─────────────────────────────
 * Phase 15A: Centralized error capture & telemetry.
 *
 * Captures:
 *   - window.onerror (synchronous runtime errors)
 *   - window.onunhandledrejection (unhandled promise rejections)
 *   - React ErrorBoundary telemetry (via emitError())
 *   - Manual error logging (via logError())
 *
 * Features:
 *   - In-memory error ring buffer (max 200 entries)
 *   - Error deduplication (same message within 2s window)
 *   - Error severity classification
 *   - Console-accessible error log (globalThis.errorLog)
 *   - Optional onError callback for external integrations
 *   - Error statistics snapshot
 */

// ═══════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorSource = 'runtime' | 'promise' | 'react' | 'network' | 'api' | 'manual';

export interface ErrorEntry {
  id: string;
  timestamp: number;
  severity: ErrorSeverity;
  source: ErrorSource;
  message: string;
  stack?: string;
  module?: string;
  metadata?: Record<string, unknown>;
  /** Whether the error was a duplicate of a recent error */
  deduplicated: boolean;
}

export interface ErrorStats {
  totalErrors: number;
  bySeverity: Record<ErrorSeverity, number>;
  bySource: Record<ErrorSource, number>;
  recentErrors: ErrorEntry[];
  deduplicatedCount: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
}

export interface GlobalErrorHandlerConfig {
  /** Max entries in ring buffer (default: 200) */
  maxEntries?: number;
  /** Deduplication window in ms (default: 2000) */
  dedupeWindowMs?: number;
  /** External callback on each error */
  onError?: (entry: ErrorEntry) => void;
  /** Whether to install global window handlers (default: true) */
  installGlobalHandlers?: boolean;
}

// ═══════════════════════════════════════
// §2  Severity Classification
// ═══════════════════════════════════════

function classifySeverity(message: string, source: ErrorSource): ErrorSeverity {
  const msg = message.toLowerCase();

  // Critical: data corruption, auth failures, trade execution errors
  if (msg.includes('trade') && (msg.includes('fail') || msg.includes('error'))) return 'critical';
  if (msg.includes('auth') && msg.includes('fail')) return 'critical';
  if (msg.includes('data corruption') || msg.includes('data loss')) return 'critical';

  // High: network failures, API errors, unhandled rejections
  if (source === 'promise') return 'high';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) return 'high';
  if (msg.includes('api') && msg.includes('error')) return 'high';

  // Medium: React render errors, data parsing errors
  if (source === 'react') return 'medium';
  if (msg.includes('parse') || msg.includes('json') || msg.includes('undefined')) return 'medium';

  // Low: everything else
  return 'low';
}

// ═══════════════════════════════════════
// §3  Global Error Handler
// ═══════════════════════════════════════

class GlobalErrorHandler {
  private entries: ErrorEntry[] = [];
  private maxEntries: number;
  private dedupeWindowMs: number;
  private onErrorCallback?: (entry: ErrorEntry) => void;
  private deduplicatedCount = 0;
  private installed = false;
  private originalOnError: OnErrorEventHandler = null;
  private originalOnUnhandledRejection: ((ev: PromiseRejectionEvent) => void) | null = null;

  constructor(config: GlobalErrorHandlerConfig = {}) {
    this.maxEntries = config.maxEntries ?? 200;
    this.dedupeWindowMs = config.dedupeWindowMs ?? 2000;
    this.onErrorCallback = config.onError;

    if (config.installGlobalHandlers !== false) {
      this.install();
    }
  }

  // ── Install global handlers ──

  install(): void {
    if (this.installed || typeof window === 'undefined') return;

    // window.onerror
    this.originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      this.captureError({
        source: 'runtime',
        message: typeof message === 'string' ? message : String(message),
        stack: error?.stack,
        metadata: { source: source || '', lineno, colno },
      });
      // Call original handler if exists
      if (typeof this.originalOnError === 'function') {
        this.originalOnError(message, source, lineno, colno, error);
      }
    };

    // window.onunhandledrejection
    this.originalOnUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      this.captureError({
        source: 'promise',
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        metadata: { type: 'unhandledrejection' },
      });
      if (typeof this.originalOnUnhandledRejection === 'function') {
        this.originalOnUnhandledRejection(event);
      }
    };

    this.installed = true;
    console.info('[GlobalErrorHandler] Installed global error handlers');
  }

  uninstall(): void {
    if (!this.installed || typeof window === 'undefined') return;

    window.onerror = this.originalOnError;
    if (this.originalOnUnhandledRejection) {
      window.onunhandledrejection = this.originalOnUnhandledRejection;
    }

    this.installed = false;
    console.info('[GlobalErrorHandler] Uninstalled global error handlers');
  }

  // ── Core capture method ──

  private captureError(params: {
    source: ErrorSource;
    message: string;
    stack?: string;
    module?: string;
    metadata?: Record<string, unknown>;
    severity?: ErrorSeverity;
  }): ErrorEntry {
    const { source, message, stack, module, metadata, severity } = params;

    // Deduplication check
    const now = Date.now();
    const isDuplicate = this.entries.some(
      e => e.message === message && (now - e.timestamp) < this.dedupeWindowMs
    );

    if (isDuplicate) {
      this.deduplicatedCount++;
    }

    const entry: ErrorEntry = {
      id: `err_${now}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: now,
      severity: severity ?? classifySeverity(message, source),
      source,
      message: message.slice(0, 1000), // cap message length
      stack: stack?.slice(0, 2000),
      module,
      metadata,
      deduplicated: isDuplicate,
    };

    // Add to ring buffer
    this.entries.unshift(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }

    // Console output for non-deduplicated errors
    if (!isDuplicate) {
      const severityColors: Record<ErrorSeverity, string> = {
        low: '#8892B0',
        medium: '#ECC94B',
        high: '#ED8936',
        critical: '#F56565',
      };
      console.warn(
        `%c[ErrorHandler] [${entry.severity.toUpperCase()}] ${entry.source}: ${entry.message}`,
        `color: ${severityColors[entry.severity]}; font-weight: bold`
      );
    }

    // Callback
    this.onErrorCallback?.(entry);

    return entry;
  }

  // ── Public API ──

  /** Log an error from React ErrorBoundary */
  emitReactError(error: Error, moduleName?: string): ErrorEntry {
    return this.captureError({
      source: 'react',
      message: error.message,
      stack: error.stack,
      module: moduleName,
    });
  }

  /** Log a network/API error */
  emitNetworkError(message: string, metadata?: Record<string, unknown>): ErrorEntry {
    return this.captureError({
      source: 'network',
      message,
      metadata,
    });
  }

  /** Log an API error */
  emitApiError(service: string, method: string, error: string): ErrorEntry {
    return this.captureError({
      source: 'api',
      message: `${service}.${method}: ${error}`,
      module: service,
      metadata: { method },
    });
  }

  /** Manual error logging */
  logError(message: string, options?: {
    severity?: ErrorSeverity;
    source?: ErrorSource;
    module?: string;
    metadata?: Record<string, unknown>;
  }): ErrorEntry {
    return this.captureError({
      source: options?.source ?? 'manual',
      message,
      severity: options?.severity,
      module: options?.module,
      metadata: options?.metadata,
    });
  }

  /** Get error statistics */
  getStats(): ErrorStats {
    const bySeverity: Record<ErrorSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const bySource: Record<ErrorSource, number> = { runtime: 0, promise: 0, react: 0, network: 0, api: 0, manual: 0 };

    for (const e of this.entries) {
      bySeverity[e.severity]++;
      bySource[e.source]++;
    }

    return {
      totalErrors: this.entries.length,
      bySeverity,
      bySource,
      recentErrors: this.entries.slice(0, 20),
      deduplicatedCount: this.deduplicatedCount,
      oldestTimestamp: this.entries.length > 0 ? this.entries[this.entries.length - 1].timestamp : null,
      newestTimestamp: this.entries.length > 0 ? this.entries[0].timestamp : null,
    };
  }

  /** Get all error entries */
  getEntries(limit?: number): ErrorEntry[] {
    return limit ? this.entries.slice(0, limit) : [...this.entries];
  }

  /** Get entries filtered by severity */
  getEntriesBySeverity(severity: ErrorSeverity): ErrorEntry[] {
    return this.entries.filter(e => e.severity === severity);
  }

  /** Get entries filtered by source */
  getEntriesBySource(source: ErrorSource): ErrorEntry[] {
    return this.entries.filter(e => e.source === source);
  }

  /** Clear all entries */
  clear(): void {
    this.entries = [];
    this.deduplicatedCount = 0;
  }

  /** Check if handler is installed */
  get isInstalled(): boolean {
    return this.installed;
  }

  /** Total error count */
  get errorCount(): number {
    return this.entries.length;
  }
}

// ═══════════════════════════════════════
// §4  Singleton & globalThis Exposure
// ═══════════════════════════════════════

const HMR_KEY = '__YYC_GlobalErrorHandler__';
export const globalErrorHandler: GlobalErrorHandler =
  (globalThis as any)[HMR_KEY] ||
  ((globalThis as any)[HMR_KEY] = new GlobalErrorHandler());

// Expose to console
if (typeof globalThis !== 'undefined') {
  (globalThis as any).globalErrorHandler = globalErrorHandler;
  (globalThis as any).getErrorLog = (limit?: number) => globalErrorHandler.getEntries(limit);
  (globalThis as any).getErrorStats = () => globalErrorHandler.getStats();
  (globalThis as any).clearErrorLog = () => globalErrorHandler.clear();
}
