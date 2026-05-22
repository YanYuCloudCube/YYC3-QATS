/**
 * @file src/app/utils/data-export.ts
 * @description YYC3 数据导出工具，提供 CSV 和 JSON 格式导出，支持市场数据、持仓、交易历史等主要数据类型
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags utils,typescript,export,public
 */

/**
 * YYC-QATS Data Export Utility (Phase 15C)
 * ─────────────────────────────────────────
 * Provides CSV and JSON export for all major data types:
 *   - Market data (assets, tickers)
 *   - Positions (portfolio holdings)
 *   - Trade history
 *   - Strategy list
 *   - Risk metrics snapshot
 *   - Error log
 *
 * Features:
 *   - Client-side file generation (no server needed)
 *   - BOM-prefixed CSV for Excel CJK compatibility
 *   - Customizable column selection
 *   - Timestamp-based filenames
 *   - Export event tracking
 */

// ═══════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════

export type ExportFormat = 'csv' | 'json';
export type ExportDataType = 'market' | 'positions' | 'trades' | 'strategies' | 'risk' | 'errors' | 'custom';

export interface ExportOptions {
  /** File format */
  format: ExportFormat;
  /** Custom filename (without extension) */
  filename?: string;
  /** For CSV: specific columns to include (default: all) */
  columns?: string[];
  /** For CSV: column header labels (mapped from key) */
  columnLabels?: Record<string, string>;
  /** Pretty-print JSON (default: true) */
  prettyJson?: boolean;
  /** Include BOM for Excel CJK support (default: true for CSV) */
  includeBOM?: boolean;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  format: ExportFormat;
  rowCount: number;
  byteSize: number;
  timestamp: number;
  error?: string;
}

// ═══════════════════════════════════════
// §2  CSV Generator
// ═══════════════════════════════════════

function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape if contains comma, quote, newline, or CJK characters
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r') || /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV(data: Record<string, unknown>[], options: ExportOptions): string {
  if (data.length === 0) return '';

  // Determine columns
  const columns = options.columns ?? Object.keys(data[0]);
  const labels = options.columnLabels ?? {};

  // Header row
  const header = columns.map(col => escapeCSVField(labels[col] ?? col)).join(',');

  // Data rows
  const rows = data.map(row =>
    columns.map(col => escapeCSVField(row[col])).join(',')
  );

  return [header, ...rows].join('\r\n');
}

// ═══════════════════════════════════════
// §3  File Download
// ═══════════════════════════════════════

function downloadFile(content: string, filename: string, mimeType: string): number {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  }, 100);

  return blob.size;
}

function getTimestamp(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

// ═══════════════════════════════════════
// §4  Core Export Function
// ═══════════════════════════════════════

export function exportData(
  data: Record<string, unknown>[],
  dataType: ExportDataType,
  options: ExportOptions
): ExportResult {
  const timestamp = Date.now();
  const ts = getTimestamp();
  const filename = `${options.filename ?? `yyc_${dataType}_${ts}`}.${options.format}`;

  try {
    if (data.length === 0) {
      return {
        success: false,
        filename,
        format: options.format,
        rowCount: 0,
        byteSize: 0,
        timestamp,
        error: 'No data to export',
      };
    }

    let content: string;
    let mimeType: string;

    if (options.format === 'csv') {
      const csv = generateCSV(data, options);
      // Add BOM for Excel CJK compatibility
      const bom = (options.includeBOM !== false) ? '\uFEFF' : '';
      content = bom + csv;
      mimeType = 'text/csv;charset=utf-8';
    } else {
      content = JSON.stringify(
        { exportedAt: new Date().toISOString(), type: dataType, count: data.length, data },
        null,
        options.prettyJson !== false ? 2 : 0
      );
      mimeType = 'application/json;charset=utf-8';
    }

    const byteSize = downloadFile(content, filename, mimeType);

    console.info(`[DataExport] Exported ${data.length} rows as ${options.format.toUpperCase()} → ${filename} (${(byteSize / 1024).toFixed(1)} KB)`);

    return {
      success: true,
      filename,
      format: options.format,
      rowCount: data.length,
      byteSize,
      timestamp,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[DataExport] Export failed:`, errorMsg);
    return {
      success: false,
      filename,
      format: options.format,
      rowCount: data.length,
      byteSize: 0,
      timestamp,
      error: errorMsg,
    };
  }
}

// ═══════════════════════════════════════
// §5  Preset Export Functions
// ═══════════════════════════════════════

/** Default column labels for market data */
const MARKET_LABELS: Record<string, string> = {
  symbol: '代码', name: '名称', price: '最新价', change: '涨跌幅(%)',
  volume: '成交量', high24h: '24H最高', low24h: '24H最低',
  marketCap: '市值', category: '分类',
};

/** Default column labels for positions */
const POSITION_LABELS: Record<string, string> = {
  symbol: '代码', side: '方向', quantity: '数量', entryPrice: '开仓价',
  currentPrice: '当前价', unrealizedPnl: '未实现盈亏', pnlPercent: '盈亏比例(%)',
  strategy: '策略', exchange: '交易所',
};

/** Default column labels for trades */
const TRADE_LABELS: Record<string, string> = {
  id: 'ID', time: '时间', symbol: '代码', side: '方向',
  price: '价格', quantity: '数量', pnl: '盈亏', strategy: '策略',
};

/** Default column labels for strategies */
const STRATEGY_LABELS: Record<string, string> = {
  id: 'ID', name: '策略名称', type: '类型', status: '状态',
  winRate: '胜率(%)', pnl: '收益', sharpe: '夏普比率',
  maxDD: '最大回撤', trades: '交易次数', version: '版本',
};

export function exportMarketData(data: Record<string, unknown>[], format: ExportFormat = 'csv'): ExportResult {
  return exportData(data, 'market', {
    format,
    columns: ['symbol', 'name', 'price', 'change', 'volume', 'high24h', 'low24h', 'marketCap', 'category'],
    columnLabels: MARKET_LABELS,
  });
}

export function exportPositions(data: Record<string, unknown>[], format: ExportFormat = 'csv'): ExportResult {
  return exportData(data, 'positions', {
    format,
    columns: ['symbol', 'side', 'quantity', 'entryPrice', 'currentPrice', 'unrealizedPnl', 'pnlPercent', 'strategy'],
    columnLabels: POSITION_LABELS,
  });
}

export function exportTrades(data: Record<string, unknown>[], format: ExportFormat = 'csv'): ExportResult {
  return exportData(data, 'trades', {
    format,
    columns: ['id', 'time', 'symbol', 'side', 'price', 'quantity', 'pnl', 'strategy'],
    columnLabels: TRADE_LABELS,
  });
}

export function exportStrategies(data: Record<string, unknown>[], format: ExportFormat = 'csv'): ExportResult {
  return exportData(data, 'strategies', {
    format,
    columns: ['id', 'name', 'type', 'status', 'winRate', 'pnl', 'sharpe', 'maxDD', 'trades', 'version'],
    columnLabels: STRATEGY_LABELS,
  });
}

/** Export risk metrics as a single-row snapshot */
export function exportRiskSnapshot(metrics: Record<string, unknown>, format: ExportFormat = 'json'): ExportResult {
  return exportData([{ ...metrics, exportedAt: new Date().toISOString() }], 'risk', {
    format,
    filename: `yyc_risk_snapshot_${getTimestamp()}`,
  });
}

// ═══════════════════════════════════════
// §6  globalThis Exposure
// ═══════════════════════════════════════

if (typeof globalThis !== 'undefined') {
  (globalThis as any).exportData = exportData;
  (globalThis as any).exportMarketData = exportMarketData;
  (globalThis as any).exportPositions = exportPositions;
  (globalThis as any).exportTrades = exportTrades;
  (globalThis as any).exportStrategies = exportStrategies;
}
