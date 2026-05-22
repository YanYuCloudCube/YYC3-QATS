/**
 * @file src/app/components/ErrorBoundary.tsx
 * @description YYC3 增强错误边界组件,提供错误捕获、分类、重试和降级渲染功能
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags component,react,typescript,error-handling,public
 * @depends react,@/app/utils/global-error-handler
 */

/**
 * YYC-QATS Enhanced Error Boundary
 * ─────────────────────────────────
 * Phase 7 upgrade: 
 *   - Retry counter with configurable max retries
 *   - Module-level isolation with graceful degradation
 *   - Fallback rendering mode (compact/full)
 *   - Error categorization (render/network/data)
 *   - Auto-recovery after cooldown period
 *   - Error telemetry logging
 */
import React from 'react';

import { globalErrorHandler } from '@/app/utils/global-error-handler';

// ═══════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════

export type ErrorCategory = 'render' | 'network' | 'data' | 'unknown';
export type FallbackMode = 'full' | 'compact' | 'inline' | 'silent';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Module name for error context (e.g., 'market', 'trade') */
  moduleName?: string;
  /** Fallback display mode */
  fallbackMode?: FallbackMode;
  /** Maximum auto-retry attempts (default: 3) */
  maxRetries?: number;
  /** Auto-recover cooldown in ms (default: 0 = no auto-recover) */
  autoRecoverMs?: number;
  /** Custom fallback component */
  fallback?: React.ReactNode;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorCategory: ErrorCategory;
  retryCount: number;
  lastErrorTime: number;
}

// ═══════════════════════════════════════
// §2  Error Categorization
// ═══════════════════════════════════════

function categorizeError(error: Error): ErrorCategory {
  const msg = error.message.toLowerCase();
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('http')) {
    return 'network';
  }
  if (msg.includes('undefined') || msg.includes('null') || msg.includes('cannot read') || msg.includes('json')) {
    return 'data';
  }
  if (msg.includes('render') || msg.includes('component') || msg.includes('hook')) {
    return 'render';
  }
  return 'unknown';
}

const ERROR_CATEGORY_LABELS: Record<ErrorCategory, { icon: string; label: string; color: string }> = {
  render: { icon: '🖥️', label: '渲染错误', color: '#F56565' },
  network: { icon: '🌐', label: '网络异常', color: '#ED8936' },
  data: { icon: '📊', label: '数据异常', color: '#ECC94B' },
  unknown: { icon: '⚠️', label: '未知错误', color: '#A0AEC0' },
};

// ═══════════════════════════════════════
// §3  ErrorBoundary Component
// ═══════════════════════════════════════

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private autoRecoverTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorCategory: 'unknown',
      retryCount: 0,
      lastErrorTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorCategory: categorizeError(error),
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { moduleName, onError } = this.props;
    const { retryCount } = this.state;

    // Log error with module context
    console.error(
      `[ErrorBoundary${moduleName ? `:${moduleName}` : ''}] Caught error (retry #${retryCount}):`,
      error,
      errorInfo
    );

    // Phase 15: Forward to global error handler for centralized telemetry
    globalErrorHandler.emitReactError(error, moduleName);

    // Error telemetry (logged to console in dev, could be sent to backend)
    if (typeof window !== 'undefined') {
      const telemetry = {
        module: moduleName || 'unknown',
        category: categorizeError(error),
        message: error.message,
        retryCount,
        timestamp: Date.now(),
        stack: error.stack?.slice(0, 500),
      };
      console.info('[ErrorBoundary] Telemetry:', telemetry);
    }

    // Call custom error handler
    onError?.(error, errorInfo);

    // Setup auto-recovery if configured
    this.setupAutoRecover();
  }

  componentWillUnmount() {
    if (this.autoRecoverTimer) {
      clearTimeout(this.autoRecoverTimer);
    }
  }

  private setupAutoRecover() {
    const { autoRecoverMs, maxRetries = 3 } = this.props;
    if (!autoRecoverMs || autoRecoverMs <= 0) return;
    if (this.state.retryCount >= maxRetries) return;

    if (this.autoRecoverTimer) {
      clearTimeout(this.autoRecoverTimer);
    }

    this.autoRecoverTimer = setTimeout(() => {
      this.handleRetry();
    }, autoRecoverMs);
  }

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    if (this.state.retryCount >= maxRetries) return;

    this.setState(prev => ({
      hasError: false,
      error: undefined,
      retryCount: prev.retryCount + 1,
    }));
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorCategory: 'unknown',
      retryCount: 0,
      lastErrorTime: 0,
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { fallbackMode = 'full', fallback, moduleName, maxRetries = 3 } = this.props;
    const { error, errorCategory, retryCount } = this.state;
    const canRetry = retryCount < maxRetries;
    const catInfo = ERROR_CATEGORY_LABELS[errorCategory];

    // Custom fallback
    if (fallback) return fallback;

    // Silent mode — render nothing
    if (fallbackMode === 'silent') return null;

    // Inline mode — minimal inline indicator
    if (fallbackMode === 'inline') {
      return (
        <span
          className="inline-flex items-center gap-1 text-xs text-[#8892B0] bg-[#112240] px-2 py-1 rounded cursor-pointer"
          onClick={canRetry ? this.handleRetry : this.handleReset}
          title={error?.message}
        >
          <span>{catInfo.icon}</span>
          <span>{catInfo.label}</span>
          {canRetry && <span className="text-[#38B2AC]">[重试]</span>}
        </span>
      );
    }

    // Compact mode — small card
    if (fallbackMode === 'compact') {
      return (
        <div className="bg-[#112240] p-3 rounded border border-[#233554] text-center">
          <div className="text-sm mb-1">
            <span>{catInfo.icon}</span>{' '}
            <span style={{ color: catInfo.color }}>{catInfo.label}</span>
            {moduleName && <span className="text-[#8892B0] ml-1">({moduleName})</span>}
          </div>
          <div className="text-xs text-[#8892B0] mb-2 truncate" title={error?.message}>
            {error?.message || '未知错误'}
          </div>
          <div className="flex gap-2 justify-center">
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="px-3 py-1 bg-[#38B2AC] text-white rounded text-xs hover:brightness-110 transition-all"
              >
                重试 ({retryCount}/{maxRetries})
              </button>
            )}
            <button
              onClick={this.handleReset}
              className="px-3 py-1 bg-[#233554] text-[#CCD6F6] rounded text-xs hover:bg-[#2d4a6f] transition-all"
            >
              重置
            </button>
          </div>
        </div>
      );
    }

    // Full mode — default large card
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#071425] text-[#CCD6F6] p-4">
        <div className="bg-[#112240] p-6 rounded-lg border border-[#233554] max-w-md w-full text-center">
          {/* Error category badge */}
          <div className="flex justify-center mb-3">
            <span
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs"
              style={{ backgroundColor: catInfo.color + '20', color: catInfo.color, border: `1px solid ${catInfo.color}40` }}
            >
              <span>{catInfo.icon}</span>
              <span>{catInfo.label}</span>
            </span>
          </div>

          <h2 className="text-xl text-red-400 mb-2">
            组件渲染错误
            {moduleName && <span className="text-sm text-[#8892B0] ml-2">({moduleName})</span>}
          </h2>

          <p className="text-sm text-[#8892B0] mb-4">
            系统检测到局部组件异常，为了保护您的数据安全，已自动隔离该区域。
            {errorCategory === 'network' && '（可能是网络连接问题，请检查后端服务状态）'}
            {errorCategory === 'data' && '（可能是数据格式异常，将自动降级到 Mock 数据）'}
          </p>

          <div className="bg-[#0A192F] p-2 rounded text-xs text-left overflow-auto max-h-32 mb-4 font-mono">
            {error?.message || 'Unknown Error'}
          </div>

          {/* Retry info */}
          {retryCount > 0 && (
            <div className="text-xs text-[#8892B0] mb-3">
              已尝试恢复 {retryCount}/{maxRetries} 次
              {retryCount >= maxRetries && ' — 已达最大重试次数'}
            </div>
          )}

          <div className="flex gap-3 justify-center">
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-[#38B2AC] text-white rounded hover:brightness-110 transition-all text-sm"
              >
                尝试恢复 ({retryCount + 1}/{maxRetries})
              </button>
            )}
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-[#233554] text-[#CCD6F6] rounded hover:bg-[#2d4a6f] transition-all text-sm"
            >
              {canRetry ? '完全重置' : '尝试恢复'}
            </button>
          </div>

          {/* Degradation hint */}
          <p className="text-xs text-[#4A5568] mt-4">
            提示：系统已自动降级到安全模式，核心交易功能不受影响
          </p>
        </div>
      </div>
    );
  }
}

// ═══════════════════════════════════════
// §4  Module Error Boundary Wrapper
// ═══════════════════════════════════════

/**
 * Convenience wrapper for module-level error boundaries.
 * Uses compact mode by default with 3 retries and 30s auto-recover.
 */
export function ModuleErrorBoundary({
  moduleName,
  children,
}: {
  moduleName: string;
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      moduleName={moduleName}
      fallbackMode="compact"
      maxRetries={3}
      autoRecoverMs={30_000}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Convenience wrapper for widget-level error boundaries.
 * Uses inline mode, silent degradation.
 */
export function WidgetErrorBoundary({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      moduleName={name}
      fallbackMode="inline"
      maxRetries={2}
    >
      {children}
    </ErrorBoundary>
  );
}