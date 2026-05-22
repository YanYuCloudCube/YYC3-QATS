/**
 * @file src/app/HANDOFF_PHASE22.ts
 * @description YYC3 阶段22交接文档,记录高级图表增强、主题色全面注入和策略可视化构建器的交接信息
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
 * ╔══════════════════════════════════════════════════════════╗
 * ║      YYC-QATS Phase 22A+22B — HANDOFF DOCUMENT          ║
 * ║  高级图表增强 · 主题色全面注入 · 策略可视化构建器        ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Phase 22 完成时间: 2026-03-07
 *
 * ═══════════════════════════════════════
 * Phase 22A: 高级图表增强 — 主题色全面注入
 * ═══════════════════════════════════════
 *
 * 1. theme-colors.ts 新增工具函数:
 *    - getRechartsGridStyle()     → CartesianGrid props
 *    - getRechartsLabelStyle()    → ReferenceLine label props
 *    - getCanvasChartColors()     → Canvas/D3 扁平色值对象
 *    - INDICATOR_COLORS           → MA/EMA/BOLL 指标色常量
 *    - COMPARISON_COLORS          → 策略对比色系列 (12 色)
 *
 * 2. KLineAnalysis.tsx (D3 Canvas 蜡烛图):
 *    - 全部 drawChart() 硬编码 hex → getCanvasChartColors() 注入
 *    - 背景色: cc.bgDark / cc.bg
 *    - 文字色: cc.textPrimary / cc.textSecondary
 *    - 网格色: cc.grid
 *    - 涨跌色: cc.up / cc.down
 *    - 指标色: INDICATOR_COLORS.ma10 / .ma30 / .ema12 / .ema26 / .bollUpper / .bollMiddle / .bollLower / .bollFill
 *    - 十字准星: cc.crosshair
 *    - 数据源 badge: cc.up / cc.blue / cc.yellow
 *    - SYMBOLS 列表: getSymbols() 动态获取（ConfigCenter 可编辑）
 *
 * 3. StrategyModule.tsx (Recharts 图表):
 *    - ComposedChart (收益曲线): CartesianGrid → getRechartsGridStyle()
 *    - XAxis/YAxis tick → getRechartsAxisStyle()
 *    - Tooltip contentStyle → getRechartsTooltipStyle()
 *    - ReferenceLine stroke → getThemeColors().chartGrid
 *    - Area stroke/fill → getThemeColors().brandGreen / .brandRed / .textSecondary
 *    - BuyMarker/SellMarker → getThemeColors().brandGreen / .brandRed / .bgPrimary
 *    - Comparison colors → COMPARISON_COLORS (12 色)
 *    - 回撤曲线: 同上主题色注入
 *    - 策略对比 LineChart: 同上主题色注入
 *
 * ═══════════════════════════════════════
 * Phase 22B: 策略可视化构建器
 * ═══════════════════════════════════════
 *
 * 新增文件:
 *   /src/app/modules/strategy/VisualBuilder.tsx
 *
 * 技术方案:
 *   - 纯 React + SVG 实现 (无 forwardRef、无 radix-ui、无 reactflow)
 *   - Canvas 风格 dotted grid 背景
 *   - SVG <g> 节点 + Bezier 曲线连接
 *   - 鼠标拖拽移动节点
 *   - 端口点击创建连接
 *   - 右侧属性面板参数编辑
 *   - 实时代码生成预览
 *
 * 节点类型 (19 种):
 *   数据源 (2): price_feed, volume_feed
 *   指标 (6):  sma, ema, rsi, macd, bollinger, atr
 *   条件 (5):  cross_above, cross_below, threshold, and_gate, or_gate
 *   交易 (2):  buy, sell
 *   风控 (3):  stop_loss, take_profit, trailing_stop
 *
 * 功能:
 *   - 左侧 5 分类面板 (数据源/指标/条件/交易/风控)
 *   - 点击即添加节点到画布
 *   - 拖拽节点移动位置
 *   - 输出端口 → 输入端口 连线
 *   - 右侧属性面板编辑参数
 *   - 连接列表 + 一键删除
 *   - 内置模板: 双均线交叉 (8 节点 + 8 连接)
 *   - 「查看代码」切换代码预览
 *   - 代码一键复制
 *   - 清空画布
 *
 * 集成:
 *   - StrategyEditor 的「图形编辑」模式 → <VisualBuilder />
 *   - 导航: 智能策略 → 策略编辑 → 图形编辑
 *
 * ═══════════════════════════════════════
 * 后续可选方向
 * ═══════════════════════════════════════
 *
 * - Phase 23A: 可视化构建器增强 — 撤销/重做、节点分组、缩放平移、自动布局
 * - Phase 23B: 构建器 → 回测引擎直连 — 点击「运行回测」直接用可视化图生成 BacktestConfig
 * - Phase 23C: 多时间框架策略 — 在可视化构建器中支持跨周期数据源节点
 * - Phase 23D: a11y 无障碍优化 — 键盘导航、屏幕阅读器、高对比度模式
 * - Phase 23E: 测试套件补充 — 主题色注入验证、VisualBuilder 节点/连接测试
 */

export const PHASE22_SUMMARY = {
  phase: '22A+22B',
  title: '高级图表增强 + 策略可视化构建器',
  phase22A: {
    title: '主题色全面注入',
    newHelpers: 5,
    modifiedFiles: 3,
    canvasColorsReplaced: 40,
    rechartsColorsReplaced: 25,
  },
  phase22B: {
    title: '策略可视化构建器',
    newFiles: 1,
    nodeTypes: 19,
    nodeCategories: 5,
    builtInTemplates: 1,
    features: ['拖拽节点', '端口连线', '参数编辑', '代码生成', '模板加载'],
  },
} as const;
