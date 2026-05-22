/**
 * @file src/app/HANDOFF_PHASE15.ts
 * @description YYC3 阶段15交接文档,记录错误处理、国际化和数据导出的交接信息
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status deprecated
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags documentation,typescript,handoff,private
 * @depends
 */

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  YYC-QATS  PHASE 15  HANDOFF  DOCUMENT                     ║
 * ║  Error Handler + i18n + Data Export · v3.6.0                ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Phase 15 — 三个子阶段 + 前置修复:
 *
 * ═══════════════════════════════════════════════════════════════
 * §前置修复  WSDeviceUpdate / WSAIResponse 类型断链
 * ═══════════════════════════════════════════════════════════════
 *
 * 问题:
 *   GlobalDataContext.tsx 第 8 行导入了 service-bridge.ts 中
 *   不存在的 WSDeviceUpdate / WSAIResponse 类型，导致 Vite
 *   模块解析失败，进而 React.lazy 报 "Failed to fetch
 *   dynamically imported module" 错误。
 *
 * 修复:
 *   /src/app/api/service-bridge.ts
 *     - 新增 §0 "WS Message Types (Device / AI)" 区块
 *     - export interface WSDeviceUpdate { deviceId, status, cpu?, mem?, lastHeartbeat, firmware?, region? }
 *     - export interface WSAIResponse { requestId, model, prediction, confidence, latencyMs, timestamp, metadata? }
 *     - 放置在 §1 Helper 之前，确保 GlobalDataContext 的 type-only import 可解析
 *
 * ═══════════════════════════════════════════════════════════════
 * §15A  Global Error Handler (全局错误处理)
 * ═══════════════════════════════════════════════════════════════
 *
 * 新建文件:
 *   /src/app/utils/global-error-handler.ts
 *     - GlobalErrorHandler class (ring buffer 200 entries)
 *     - 捕获: window.onerror, onunhandledrejection
 *     - 分类: ErrorSeverity (low/medium/high/critical)
 *     - 来源: ErrorSource (runtime/promise/react/network/api/manual)
 *     - 去重: 同一消息 2s 内不重复记录
 *     - API: logError(), emitReactError(), emitNetworkError(), emitApiError()
 *     - 统计: getStats(), getEntries(), getEntriesBySeverity(), getEntriesBySource()
 *     - HMR 安全: globalThis.__YYC_GlobalErrorHandler__ 缓存
 *     - Console 暴露: globalThis.globalErrorHandler, getErrorLog, getErrorStats, clearErrorLog
 *
 * 变更文件:
 *   /src/app/components/ErrorBoundary.tsx
 *     - 新增 import { globalErrorHandler }
 *     - componentDidCatch 新增 globalErrorHandler.emitReactError(error, moduleName)
 *
 *   /src/app/App.tsx
 *     - 新增 import { globalErrorHandler }
 *     - 新增 import '@/app/utils/data-export' (Phase 15C)
 *
 * ═══════════════════════════════════════════════════════════════
 * §15B  i18n 国际化基础框架
 * ═══════════════════════════════════════════════════════════════
 *
 * 重写文件:
 *   /src/app/i18n/mock.ts
 *     - 3 种语言: zh-CN / en-US / ja-JP
 *     - 11 个命名空间: nav/market/strategy/risk/quantum/bigdata/model/trade/admin/common/settings/export/errors/auth
 *     - 每种语言 120+ 翻译键
 *     - SupportedLocale 类型 + SUPPORTED_LOCALES 常量
 *     - translate(key, params?) — 支持 dot-notation + {{interpolation}}
 *     - changeLanguage(locale) — localStorage 持久化 + CustomEvent 事件
 *     - useTranslation() hook — 响应式语言切换 (useState + useEffect 监听事件)
 *     - hasKey(), countKeys(), getNamespaceKeys() 工具方法
 *     - 缺失键自动回退到 zh-CN
 *     - Console 暴露: globalThis.i18n, globalThis.changeLanguage
 *
 * ═══════════════════════════════════════════════════════════════
 * §15C  数据导出功能
 * ═══════════════════════════════════════════════════════════════
 *
 * 新建文件:
 *   /src/app/utils/data-export.ts
 *     - exportData(data, type, options) — 通用导出核心
 *     - 支持 CSV (BOM + CJK Excel 兼容) 和 JSON (pretty-print)
 *     - 预置导出: exportMarketData, exportPositions, exportTrades, exportStrategies, exportRiskSnapshot
 *     - 默认列标签 (中文): MARKET_LABELS, POSITION_LABELS, TRADE_LABELS, STRATEGY_LABELS
 *     - ExportResult 返回: success, filename, format, rowCount, byteSize, timestamp, error?
 *     - Blob URL + link.click() 下载
 *     - Console 暴露: globalThis.exportData, exportMarketData, exportPositions, exportTrades, exportStrategies
 *
 * ═══════════════════════════════════════════════════════════════
 * 测试套件
 * ═══════════════════════════════════════════════════════════════
 *
 *   /src/app/utils/tests.ts
 *     - 新增 phase15Tests: 25 例 (TC-P15-001 ~ TC-P15-025)
 *     - TC-P15-001~008: 15A globalErrorHandler 单元测试
 *     - TC-P15-009~017: 15B i18n 框架测试 (3语言/命名空间/hasKey/countKeys/fallback)
 *     - TC-P15-018~022: 15C 数据导出单元测试
 *     - TC-P15-023: WSDeviceUpdate/WSAIResponse 类型断链修复验证
 *     - TC-P15-024: ErrorBoundary ↔ globalErrorHandler 集成
 *     - TC-P15-025: 自计数验证 (25例, 总计374)
 *     - AllTestCases 合并 phase15Tests
 *     - Phase 14 TC-P14-020 修改为仅验证自身 20 例 (不再断言 total=349)
 *     - 新增 imports: globalErrorHandler, exportData, SUPPORTED_LOCALES, WSDeviceUpdate, WSAIResponse
 *
 *   总测试数: 374 例
 *
 * ═══════════════════════════════════════════════════════════════
 * 下阶段建议 (Phase 16)
 * ═══════════════════════════════════════════════════════════════
 *
 *   1. 深色/浅色主题切换 (CSS Variables + SettingsContext)
 *   2. MarketModule K线分析页面集成 D3.js 蜡烛图实时渲染
 *   3. StrategyModule 回测引擎 Web Worker 化 (避免主线程阻塞)
 *   4. 端到端集成测试: AuthPanel 登录 → Navbar 头像更新 → StatusDashboard 反映认证态
 *   5. 国际化 UI 组件集成: SettingsDialog 语言切换 → 全局 UI 刷新
 *   6. 导出功能 UI 面板: 在各模块页面添加导出按钮 + 格式选择对话框
 */
export const PHASE15_VERSION = 'v3.6.0';
export const PHASE15_TEST_COUNT = 25;
export const PHASE15_TOTAL_TESTS = 374;
