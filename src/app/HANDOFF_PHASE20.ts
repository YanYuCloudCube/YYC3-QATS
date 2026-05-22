/**
 * @file src/app/HANDOFF_PHASE20.ts
 * @description YYC3 阶段20交接文档,记录用户偏好、命令面板和仪表板小部件的交接信息
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
 * ║  YYC-QATS  PHASE 20  HANDOFF  DOCUMENT                     ║
 * ║  User Preferences + Command Palette + Dashboard Widgets     ║
 * ║  v4.1.0                                                      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Phase 20 — 四个子模块:
 *
 * ═══════════════════════════════════════════════════════════════
 * §20A  用户偏好持久化 (User Preferences)
 * ═══════════════════════════════════════════════════════════════
 *
 * 新建文件:
 *   /src/app/utils/user-preferences.ts
 *     - 集中式用户偏好管理: PreferenceManager 接口 + createPreferenceManager() 工厂
 *     - globalThis 单例缓存: __YYC_PreferenceManager__ (HMR 安全)
 *     - localStorage 持久化带版本迁移 (CURRENT_VERSION=1)
 *     - 防抖保存 (500ms debounce)
 *     - 类型系统:
 *       · UserPreferences: 完整偏好结构
 *       · FavoritePair: { symbol, name, addedAt }
 *       · RecentNavItem: { module, sub, tertiary?, timestamp, label }
 *       · WidgetLayout: { id, type, position, visible, config? }
 *     - 核心 API:
 *       · get/set/update: 通用键值操作
 *       · addFavoritePair / removeFavoritePair / isFavoritePair
 *       · toggleFavoriteModule / isFavoriteModule
 *       · addRecentNav (自动去重, 上限 20) / getRecentNav / clearRecentNav
 *       · updateWidgetLayout / toggleWidget / moveWidget
 *       · save / load / reset
 *       · exportJSON / importJSON: JSON 导入/导出
 *       · subscribe: 变更监听 (取消订阅回调)
 *     - 默认偏好 DEFAULT_PREFERENCES:
 *       · 6 个 widget: portfolio_summary, price_ticker, mini_chart, recent_signals, alerts_summary, open_positions
 *       · lastModule='market', compactMode=false, autoRefreshInterval=5, commandPaletteEnabled=true
 *     - React Hook: useUserPreferences() → { prefs, updatePref, manager }
 *     - globalThis 暴露: globalThis.preferenceManager
 *
 * ═══════════════════════════════════════════════════════════════
 * §20B  命令面板 (Command Palette)
 * ═══════════════════════════════════════════════════════════════
 *
 * 新建文件:
 *   /src/app/components/CommandPalette.tsx
 *     - Ctrl+K / Cmd+K 快捷键唤起 (via useCommandPaletteShortcut hook)
 *     - 四类命令项:
 *       · navigation: 所有模块+子菜单+三级页面 (来自 MODULES/MENUS)
 *       · recent: 最近导航记录 (来自 preferenceManager.getRecentNav)
 *       · favorite: 收藏交易对 (来自 preferenceManager.prefs.favoritePairs)
 *       · action: 功能操作 (切换主题/打开设置/打开导出/打开通知/打开AI)
 *     - 模糊搜索: fuzzyMatch() + matchScore() 评分排序
 *     - 键盘导航: ArrowUp/ArrowDown 选择, Enter 执行, Escape 关闭
 *     - 分组显示: 最近 / 收藏 / 导航 / 操作
 *     - 自动聚焦输入框, 内容提示, 类别图标
 *     - Props: { isOpen, onClose, onNavigate(module, sub?, tertiary?) }
 *     - Exports: CommandPalette, useCommandPaletteShortcut, CommandItem
 *
 * ═══════════════════════════════════════════════════════════════
 * §20C  仪表盘小部件系统 (Dashboard Widgets)
 * ═══════════════════════════════════════════════════════════════
 *
 * 新建文件:
 *   /src/app/components/DashboardWidgets.tsx
 *     - 6 种 widget 类型:
 *       · portfolio_summary: 总资产/可用余额/今日盈亏/持仓数 (from GlobalData)
 *       · price_ticker: Top 5 行情 (from tickerCoins)
 *       · mini_chart: SVG sparkline (BTC/USDT 24H)
 *       · recent_signals: 最新信号链事件 (mock + signalChainEngine)
 *       · alerts_summary: 风险信号计数 by severity (from riskSignals)
 *       · open_positions: 前 4 个持仓 (from positions)
 *     - WIDGET_TYPE_LABELS: 中文标签映射
 *     - WIDGET_COMPONENTS: React 组件映射
 *     - WidgetConfigPanel: 可视化配置面板 (显示/隐藏 + 上移/下移)
 *     - DashboardWidgets: 主组件 (响应式网格 1/2/3 列)
 *     - 布局持久化: 联动 preferenceManager.updateWidgetLayout/toggleWidget/moveWidget
 *     - 订阅 preferenceManager 变更以同步外部修改
 *
 * ═══════════════════════════════════════════════════════════════
 * §20D  App.tsx 集成
 * ═══════════════════════════════════════════════════════════════
 *
 * 变更文件:
 *   /src/app/App.tsx
 *     - import: preferenceManager, CommandPalette, useCommandPaletteShortcut, DashboardWidgets
 *     - 状态: isCommandPaletteOpen
 *     - useCommandPaletteShortcut(() => setIsCommandPaletteOpen(true))
 *     - useEffect: 导航状态变更时自动保存到 preferenceManager
 *       · preferenceManager.update({ lastModule, lastSub, lastTertiary })
 *       · preferenceManager.addRecentNav({ module, sub, tertiary, label })
 *     - handleCommandNavigate: 命令面板导航回调
 *     - 事件监听: toggleCommandPalette CustomEvent
 *     - JSX: <CommandPalette isOpen onClose onNavigate />
 *
 * ═══════════════════════════════════════════════════════════════
 * §20E  测试套件 (25 new cases, 499 total)
 * ═══════════════════════════════════════════════════════════════
 *
 * 变更文件:
 *   /src/app/utils/tests.ts
 *     - 新增 phase20Tests[] (TC-P20-001 ~ TC-P20-025)
 *     - 修复: phase19Tests 加入 AllTestCases 数组
 *     - 更新注释头: 499 test cases
 *     - 测试分布:
 *       · 20A: 10 tests (TC-P20-001~010) — preferences CRUD/export/import/reset/version
 *       · 20B: 8 tests (TC-P20-011~018) — command palette import/fuzzy/shortcuts/events
 *       · 20C: 5 tests (TC-P20-019~023) — widget labels/components/import/layout/format
 *       · 20D: 2 tests (TC-P20-024~025) — E2E chain + self-count validation
 *
 * ═══════════════════════════════════════════════════════════════
 * Bug Fix in This Session
 * ═══════════════════════════════════════════════════════════════
 *
 *   DashboardWidgets.tsx AlertsSummaryWidget:
 *     - Fixed: `s.level` → `s.severity` to match RiskSignal type definition
 *     - RiskSignalSeverity is 'info' | 'warning' | 'critical', not 'critical' | 'high' | 'medium' | 'low'
 *     - Mapped: severity='critical' → critical count, severity='warning' → high count, severity='info' → low count
 *
 * ═══════════════════════════════════════════════════════════════
 * Phase 21 Plan (Proposed)
 * ═══════════════════════════════════════════════════════════════
 *
 * Phase 21 — 高级图表 + 策略构建器 + 可访问性:
 *
 *   21A  高级图表增强 (Advanced Chart Enhancements)
 *        - D3CandlestickChart 新增技术指标叠加层: MA(5/10/20/60), EMA, BOLL
 *        - 多时间框架切换 (1m/5m/15m/1h/4h/1D)
 *        - 成交量柱状图子面板
 *        - 绘图工具: 趋势线、水平线、斐波那契回撤
 *
 *   21B  策略可视化构建器 (Strategy Visual Builder)
 *        - 拖拽式策略节点编辑器
 *        - 条件节点 (指标条件、价格条件、时间条件)
 *        - 动作节点 (买入/卖出/止损/止盈)
 *        - 连线逻辑 (AND/OR/THEN)
 *        - 实时策略预览 + 一键回测
 *
 *   21C  可访问性改善 (Accessibility / a11y)
 *        - ARIA 标签完善 (role, aria-label, aria-describedby)
 *        - 键盘焦点管理 (focus trap for modals, tab order)
 *        - 高对比度模式
 *        - 屏幕阅读器友好的数据表格
 *
 *   21D  测试用例 (25+ new cases, 524+ total)
 *        - TC-P21-001~025+: 覆盖图表指标、策略节点、a11y 审计
 */

export const PHASE20_HANDOFF = {
  version: '4.1.0',
  phase: 20,
  subModules: ['20A-UserPreferences', '20B-CommandPalette', '20C-DashboardWidgets', '20D-AppIntegration', '20E-Tests'],
  newFiles: [
    '/src/app/utils/user-preferences.ts',
    '/src/app/components/CommandPalette.tsx',
    '/src/app/components/DashboardWidgets.tsx',
    '/src/app/HANDOFF_PHASE20.ts',
  ],
  modifiedFiles: [
    '/src/app/App.tsx',
    '/src/app/utils/tests.ts',
  ],
  bugFixes: [
    'DashboardWidgets AlertsSummaryWidget: s.level → s.severity (matching RiskSignal type)',
  ],
  testCases: { phase20: 25, total: 499 },
  status: 'COMPLETE',
} as const;
