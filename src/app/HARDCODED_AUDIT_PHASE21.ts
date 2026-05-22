/**
 * @file src/app/HARDCODED_AUDIT_PHASE21.ts
 * @description YYC3 全局硬编码审计报告,记录代码中的硬编码模式和改进建议
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status deprecated
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags documentation,typescript,audit,private
 * @depends
 */

/**
 * ============================================================================
 *  YYC-QATS 全局硬编码审计报告 (Phase 21 前置分析)
 * ============================================================================
 *
 *  审计时间: 2026-03-07
 *  审计范围: /src/app/ 全目录 (排除 HANDOFF_*.ts 交接文档)
 *  审计维度: 12 类硬编码模式
 *  发现总数: 196 处硬编码实例，分布于 30+ 活跃源文件
 *
 * ============================================================================
 *  目录
 *  ──────────────────────────────────────────────────────────────────────────
 *  HC-01  API/WebSocket URL 端点         (24 处, 风险: 高)
 *  HC-02  第三方服务 URL                 (8 处, 风险: 中)
 *  HC-03  localStorage 存储键            (14 个唯一键, 风险: 高)
 *  HC-04  globalThis 单例键              (9 个唯一键, 风险: 中)
 *  HC-05  CustomEvent 事件名             (4 个唯一名, 风险: 中)
 *  HC-06  CSS 主题色 Hex 硬编码          (57+ 处, 风险: 高)
 *  HC-07  魔术数字 (超时/阈值/限制)      (40+ 处, 风险: 中)
 *  HC-08  交易对/符号                    (50+ 处, 风险: 低-中)
 *  HC-09  品牌/系统名称                  (15+ 处, 风险: 低)
 *  HC-10  版本号字符串                   (20+ 处, 风险: 低)
 *  HC-11  console 日志前缀               (30+ 处, 风险: 低)
 *  HC-12  端口号/域名检测                (5 处, 风险: 中)
 * ============================================================================
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HC-01: API / WebSocket URL 端点
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * 风险等级: 🔴 高
 * 影响范围: 环境切换、部署迁移、域名变更
 *
 * ┌─────────────────────────────────────────────────┬─────────────────────────────────────────────────┬───────┐
 * │ 硬编码值                                         │ 所在文件                                         │ 行号  │
 * ├─────────────────────────────────────────────────┼─────────────────────────────────────────────────┼───────┤
 * │ http://localhost:3200                           │ api/config.ts                                   │ 42-44 │
 * │ ws://localhost:3200/ws                          │ api/config.ts                                   │ 43    │
 * │ http://localhost:3200/health                    │ api/config.ts                                   │ 44    │
 * │ https://test-api.0379.world                     │ api/config.ts                                   │ 52    │
 * │ wss://test-api.0379.world/ws                    │ api/config.ts                                   │ 53    │
 * │ https://test-api.0379.world/health              │ api/config.ts                                   │ 54    │
 * │ https://api.0379.world                          │ api/config.ts                                   │ 62    │
 * │ wss://api.0379.world/ws                         │ api/config.ts                                   │ 63    │
 * │ https://api.0379.world/health                   │ api/config.ts                                   │ 64    │
 * │ wss://test-api.0379.world/ws/v1 (fallback)     │ api/ws-channels.ts                              │ 243   │
 * ├─────────────────────────────────────────────────┼─────────────────────────────────────────────────┼───────┤
 * │ 域名检测: api.0379 / 0379.world                │ api/config.ts                                   │ 108   │
 * └─────────────────────────────────────────────────┴─────────────────────────────────────────────────┴───────┘
 *
 * 分析:
 *   ✅ 合理集中: 核心端点均在 api/config.ts ENV_CONFIGS 中统一管理，是唯一权威源。
 *   ⚠️  ws-channels.ts:243 有一个独立的 fallback URL，未引用 config.ts 的配置。
 *   ⚠️  api/config.ts:108 域名检测逻辑使用字符串前缀匹配，域名变更时需同步。
 *   ⚠️  tests.ts 中 20+ 处重复断言 URL 值（预期行为，但维护成本高）。
 *
 * 建议:
 *   1. ws-channels.ts:243 的 fallback 应改为 `getActiveConfig().wsUrl`
 *   2. 考虑将域名检测规则抽为 config.ts 导出常量
 *   3. tests.ts 中 URL 断言可引用 config 导出值而非字面量
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HC-02: 第三方服务 URL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * 风险等级: 🟡 中
 * 影响范围: 第三方 API 变更、区域封锁、版本升级
 *
 * ┌─────────────────────────────────────────────────────┬────────────────────────────────────────┬───────┐
 * │ 硬编码值                                             │ 所在文件                                │ 行号  │
 * ├─────────────────────────────────────────────────────┼────────────────────────────────────────┼───────┤
 * │ https://api.binance.com                            │ services/ExchangeAggregator.ts          │ 147   │
 * │ wss://stream.binance.com:9443                      │ services/ExchangeAggregator.ts          │ 148   │
 * │ wss://stream.binance.com:9443/stream?streams=      │ services/BinanceService.ts              │ 53    │
 * │ wss://stream.binance.com:9443/ws/                  │ services/BinanceDepthService.ts         │ 55    │
 * │ https://api.binance.com/api/v3/klines              │ services/BinanceKLineService.ts         │ 140   │
 * │ https://www.okx.com                                │ services/ExchangeAggregator.ts          │ 219   │
 * │ wss://ws.okx.com:8443/ws/v5                        │ services/ExchangeAggregator.ts          │ 220   │
 * │ wss://ws.okx.com:8443/ws/v5/public                 │ services/BinanceDepthService.ts         │ 75    │
 * │ https://api.bybit.com                              │ services/ExchangeAggregator.ts          │ 288   │
 * │ wss://stream.bybit.com/v5                          │ services/ExchangeAggregator.ts          │ 289   │
 * │ wss://stream.bybit.com/v5/public/spot              │ services/BinanceDepthService.ts         │ 104   │
 * │ https://api.coingecko.com/api/v3/coins/markets     │ services/CoinGeckoService.ts            │ 163   │
 * └─────────────────────────────────────────────────────┴────────────────────────────────────────┴───────┘
 *
 * 分析:
 *   ⚠️  Binance URL 在 3 个不同文件中重复定义
 *   ⚠️  OKX/Bybit URL 在 ExchangeAggregator + BinanceDepthService 中重复
 *   ⚠️  CoinGecko URL 含内联查询参数（vs_currency=usd 硬编码）
 *
 * 建议:
 *   1. 创建 /src/app/services/exchange-endpoints.ts 统一管理所有交易所端点
 *   2. CoinGecko vs_currency 应参数化（支持多法币）
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HC-03: localStorage 存储键
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * 风险等级: 🔴 高
 * 影响范围: 数据丢失、键名冲突、迁移困难
 *
 * ┌────���────────────────────────┬────────────────────────────────────────────┬──────────────────────────┐
 * │ 键名                        │ 使用文件                                    │ 是否有常量定义           │
 * ├─────────────────────────────┼────────────────────────────────────────────┼──────────────────────────┤
 * │ yyc_api_env                 │ api/config.ts (×2)                         │ ❌ 内联字符串           │
 * │ yyc_theme                   │ contexts/SettingsContext.tsx                │ ✅ THEME_STORAGE_KEY    │
 * │ yyc_locale                  │ i18n/mock.ts                               │ ✅ STORAGE_KEY          │
 * │ yyc_favorites               │ contexts/GlobalDataContext.tsx, admin(×2)   │ ❌ 内联字符串           │
 * │ yyc_alert_thresholds        │ contexts/AlertContext.tsx (×2)              │ ❌ 内联字符串           │
 * │ yyc_bt_last_config          │ modules/strategy/StrategyModule.tsx (×2)    │ ❌ 内联字符串           │
 * │ yyc_bt_history              │ modules/strategy + admin (×3)              │ ✅ BT_HISTORY_KEY       │
 * │ yyc_bt_presets              │ modules/strategy + admin (×3)              │ ✅ BT_PRESETS_KEY       │
 * │ yyc_canary_last             │ api/canary-validator.ts, admin (×2)        │ ❌ 内联字符串           │
 * │ yyc_canary_test             │ utils/tests.ts (临时测试键)                │ ❌ 内联字符串           │
 * │ yyc_offline_queue           │ utils/offline-manager.ts                   │ ✅ STORAGE_KEY          │
 * │ yyc_custom_panel            │ modules/market/components/CustomPanel.tsx   │ ✅ STORAGE_KEY          │
 * │ yyc_user_preferences        │ utils/user-preferences.ts                  │ ✅ (内部常量)          │
 * │ yyc_notifications           │ components/NotificationCenter.tsx           │ ✅ (推测)              │
 * ├─────────────────────────────┼────────────────────────────────────────────┼──────────────────────────┤
 * │ 统计: 14 个唯一键           │ 跨文件引用同键但未共享常量: 5 例           │ 仅 6/14 有命名���量      │
 * └─────────────────────────────┴────────────────────────────────────────────┴──────────────────────────┘
 *
 * 严重问题:
 *   🔴 yyc_favorites — 在 GlobalDataContext.tsx 和 AdminModule.tsx 中各自硬编码相同字符串
 *   🔴 yyc_bt_history / yyc_bt_presets — Strategy 定义常量但 Admin 内联引用
 *   🔴 yyc_api_env — config.ts 内两处使用但无常量定义
 *   🔴 yyc_canary_last — canary-validator 和 AdminModule 各自硬编码
 *   🔴 yyc_bt_last_config — StrategyModule 内两处内联
 *   🔴 yyc_alert_thresholds — AlertContext 内两处内联
 *
 * 建议:
 *   1. 创建 /src/app/constants/storage-keys.ts 集中导出所有 localStorage 键名
 *   2. 所有消费方改为 import { STORAGE_KEYS } from '../constants/storage-keys'
 *   3. 便于未来整体迁移（如加前缀、加密存储等）
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HC-04: globalThis 单例键
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * 风险等级: 🟡 中
 * 影响范围: HMR 稳定性、全局命名空间污染
 *
 * ┌───────────────────────────────────┬──────────────────────────────────────┐
 * │ 键名                              │ 定义文件                              │
 * ├───────────────────────────────────┼──────────────────────────────────────┤
 * │ __YYC_GlobalDataContext__         │ contexts/GlobalDataContext.tsx        │
 * │ __YYC_GlobalErrorHandler__        │ utils/global-error-handler.ts        │
 * │ __YYC_RAFBatchQueue__            │ utils/perf-helpers.ts                │
 * │ __YYC_RenderProfiler__           │ utils/perf-helpers.ts                │
 * │ __YYC_PreferenceManager__        │ utils/user-preferences.ts            │
 * │ __YYC_SignalChainEngine__         │ services/signal-chain-engine.ts      │
 * │ __YYC_NotificationStore__         │ components/NotificationCenter.tsx    │
 * │ __YYC_WebSocket__                │ api/client.ts                        │
 * │ __YYC_GLOBAL_DATA_CONTEXT        │ modules/admin/DiagnosticsModule.tsx  │
 * └───────────────────────────────────┴──────────────────────────────────────┘
 *
 * 分析:
 *   ✅ 命名规范统一：__YYC_PascalCase__ 格式
 *   ✅ 每个键在定义文件中都有对应的 const KEY = '...' 声明
 *   ⚠️  DiagnosticsModule 中的键名与 GlobalDataContext 略有不一致
 *      (__YYC_GLOBAL_DATA_CONTEXT vs __YYC_GlobalDataContext__)
 *   ⚠️  tests.ts 中多处直接使用字符串字面量引用这些键
 *
 * 建议:
 *   1. 统一到 /src/app/constants/global-keys.ts
 *   2. DiagnosticsModule 中键名需修正为 __YYC_GlobalDataContext__
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HC-05: CustomEvent 事件名
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * 风险等级: 🟡 中
 * 影响范围: 跨组件通信可靠性
 *
 * ┌────────────────────────┬────────────────────────────────────────────┬────────────┐
 * │ 事件名                  │ 生产者文件                                  │ 消费者      │
 * ├────────────────────────┼────────────────────────────────────────────┼────────────┤
 * │ yyc_theme_change       │ contexts/SettingsContext.tsx               │ tests.ts   │
 * │ yyc_toggle_theme       │ components/CommandPalette.tsx              │ Settings?  │
 * │ yyc_locale_change      │ i18n/mock.ts                              │ tests.ts   │
 * │ yyc_navigate           │ (推测: CommandPalette 导航)                │ App.tsx?   │
 * └────────────────────────┴────────────────────────────────────────────┴────────────┘
 *
 * 建议: 集中到 /src/app/constants/events.ts
 */

// ━━━━��━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HC-06: CSS 主题色 Hex 硬编码
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * 风险等级: 🔴 高
 * 影响范围: 主题切换不完整（深色/浅色模式）、品牌色一致性
 *
 * 主要色值分布:
 *
 * │ 色值          │ 语义用途            │ 出现次数 │ 主要文件                                        │
 * ├──────────────┼────────────────────┼─────────┼────────────────────────────────────────────────┤
 * │ #0A192F      │ 深色背景 (primary)  │ 5+      │ App.tsx, StrategyModule, TradeModule            │
 * │ #112240      │ 次级背景            │ 3+      │ App.tsx                                        │
 * │ #233554      │ 边框/分割线         │ 5+      │ StrategyModule, TradeModule, D3Candlestick      │
 * │ #8892B0      │ 次要文字            │ 15+     │ 几乎所有模块, DataFlowMap, D3Candlestick        │
 * │ #CCD6F6      │ 主要文字            │ 3+      │ App.tsx, D3Candlestick                         │
 * │ #38B2AC      │ 品牌绿/上涨色       │ 15+     │ Navbar, DataFlowMap, D3Candlestick, tests      │
 * │ #4299E1      │ 信息蓝              │ 8+      │ DataFlowMap, D3Candlestick, MobileNav          │
 * │ #ECC94B      │ 警告黄              │ 8+      │ ErrorBoundary, DataFlowMap, D3Candlestick      │
 * │ #F56565      │ 错误红/下跌色       │ 8+      │ ErrorBoundary, Navbar, DataFlowMap, D3Chart    │
 * │ #9F7AEA      │ 紫色辅助            │ 2+      │ D3CandlestickChart                             │
 * │ #ED8936      │ 橙色辅助            │ 1       │ ErrorBoundary                                  │
 * │ #A0AEC0      │ 灰色辅助            │ 1       │ ErrorBoundary                                  │
 * │ #FFFFFF/#FFF │ 白色                │ 5+      │ D3CandlestickChart                             │
 *
 * 严重问题:
 *   🔴 57+ 处内联 Hex 色值，主题切换时 D3 图表、DataFlowMap 等完全不响应
 *   🔴 StrategyModule Recharts Tooltip contentStyle 中 backgroundColor/border 硬编码
 *   🔴 TradeModule 同理
 *   🔴 D3CandlestickChart 全部 30+ 处 D3 attr 色值不受 CSS 变量控制
 *   🔴 MobileNavigation.tsx 模块颜色映射完全硬编码
 *
 * 建议:
 *   1. 在 theme.css 中定义 CSS 变量: --yyc-bg-primary, --yyc-text-secondary 等
 *   2. JS 中通过 getComputedStyle 或 React context 注入主题色
 *   3. 创建 /src/app/constants/theme-colors.ts 导出色值常量
 *   4. D3 组件需通过 props 或 context 接收主题色
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HC-07: 魔术数字 (超时/阈值/限制)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * 风险等级: 🟡 中
 * 影响范围: 性能调优、不同网络环境适配
 *
 * ┌─────────────────────────────────────┬─────────────────────────────────┬─────────┐
 * │ 魔术数字                             │ 所在文件                         │ 说明    │
 * ├─────────────────────────────────────┼─────────────────────────────────┼─────────┤
 * │ timeout: 10_000 / 15_000           │ api/config.ts                   │ HTTP    │
 * │ wsHeartbeatInterval: 25_000/30_000 │ api/config.ts                   │ WS心跳  │
 * │ wsReconnectDelay: 3_000/5_000      │ api/config.ts                   │ WS重连  │
 * │ maxReconnectAttempts = 10          │ api/client.ts                   │ WS上限  │
 * │ HEARTBEAT_INTERVAL = 30_000        │ utils/offline-manager.ts        │ 离线心跳│
 * │ CACHE_TTL = 120_000                │ services/CoinGeckoService.ts    │ 缓存TTL │
 * │ FETCH_TIMEOUT = 8000               │ services/CoinGeckoService.ts    │ 请求超时│
 * │ maxSize = 100 (memoize)            │ utils/performance.ts            │ 缓存上限│
 * │ DEFAULT_TEST_TIMEOUT = 10_000      │ utils/tests.ts                  │ 测试超时│
 * │ bufferSize = 100 (WS)              │ api/useYYCWebSocket.ts          │ 缓冲区  │
 * │ failureThreshold: 5                │ api/ws-channels.ts              │ 熔断阈值│
 * │ resetTimeout: 15000                │ api/ws-channels.ts              │ 熔断恢复│
 * │ baseDelay: 1000, maxDelay: 30000   │ api/ws-channels.ts              │ WS重试  │
 * │ varDailyLimit: 15000               │ modules/trade/TradeModule.tsx    │ 风控限额│
 * │ threshold: 80/90/100000            │ services/ExchangeAggregator.ts  │ 风控线  │
 * ├─────────────────────────────────────┼─────────────────────────────────┼─────────┤
 * │ retry-cache.ts 整个文件              │ api/retry-cache.ts              │ 重试策略│
 * │ (SERVICE_RETRY_POLICIES + TTL_MAP) │ 8 个服务各自的 maxRetries/delay │ 分散配置│
 * └─────────────────────────────────────┴─────────────────────────────────┴─────────┘
 *
 * 分析:
 *   ✅ api/config.ts 中的超时已按环境分级，结构合理
 *   ✅ retry-cache.ts 按服务分策略，有注释说明原因
 *   ⚠️  CoinGeckoService 的 TTL 和 timeout 独立于 config.ts 管理
 *   ⚠️  ws-channels.ts 的熔断参数未纳入 config.ts 统一管理
 *   ⚠️  TradeModule 的 varDailyLimit=15000 应来自风控配置
 *
 * 建议:
 *   1. config.ts 扩展：增加 circuitBreaker、retryPolicy 分区
 *   2. 第三方服务参数统一到 exchange-endpoints.ts
 *   3. 风控阈值应由 RiskModule/服务端下发，不应在 UI 层硬编码
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HC-08: 交易对/符号硬编码
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * 风险等级: 🟢 低-中 (多为 Mock 数据与 UI 默认值)
 * 影响范围: 新增/删除交易对时需多文件同步
 *
 * 分布统计:
 *   - AlertCenter.tsx:        BTC/ETH/SOL/BNB/XRP/ADA (选项列表)
 *   - KLineAnalysis.tsx:      BTC/ETH/SOL/BNB/XRP/ADA (选项列表, 重复)
 *   - StrategyModule.tsx:     BTC/ETH/SOL/BNB/XRP/ADA (下拉选项, 重复)
 *   - MarketModule.tsx:       BTC/ETH/SOL + DOGE/ADA/AVAX/LINK/DOT (内联列表)
 *   - GlobalDataContext.tsx:  BTC/ETH/SOL (默认收藏)
 *   - RiskModule.tsx:         BTC/ETH/SOL/BNB/XRP (持仓数据)
 *   - ExportPanel.tsx:        BTC/ETH/SOL/BNB (Mock 数据)
 *   - CustomPanel.tsx:        BTC/ETH/SOL (默认面板)
 *   - D3CandlestickChart:     BTC/USDT (默认 prop)
 *   - DashboardWidgets.tsx:   BTC/USDT 24H (展示文本)
 *
 * 分析:
 *   🔴 至少 6 个文件独立维护交易对列表，完全不共享
 *   ⚠️  新增一个币种需改 6+ 个文件
 *
 * 建议:
 *   1. 创建 /src/app/constants/symbols.ts:
 *      export const DEFAULT_SYMBOLS = ['BTC/USDT', 'ETH/USDT', ...];
 *      export const DEFAULT_SYMBOL = 'BTC/USDT';
 *   2. 各组件从常量文件导入
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HC-09: 品牌/系统名称
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * 风险等级: 🟢 低
 * 影响范围: 品牌重命名（白标化场景）
 *
 * ┌──────────────────────────────┬──────────────────────────────────────┐
 * │ 硬编码文本                    │ 分布文件                              │
 * ├──────────────────────────────┼──────────────────────────────────────┤
 * │ "言语云量化分析交易系统"       │ App.tsx (×3), AdminModule, DocsModule│
 * │ "言语云量化"                  │ App.tsx, Navbar                      │
 * │ "言语云系统"                  │ App.tsx                              │
 * │ "言语云量化系统"              │ MobileNavigation                     │
 * │ "言语云 Logo"                │ Navbar, MobileNavigation             │
 * │ "YYC-QATS"                  │ 10+ 文件注释头部                      │
 * │ "YanYu Cloud"               │ FeasibilityReport                    │
 * └──────────────────────────────┴──────────────────────────────────────┘
 *
 * 建议: 如有白标需求，集中到 /src/app/constants/branding.ts
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HC-10: 版本号字符串
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * 风险等级: 🟢 低 (多为 Mock 数据)
 *
 * - AdminModule 更新日志: v2.8.5 ~ v2.9.6 (展示用, 合理)
 * - AdminModule 模块版本: v1.5 ~ v3.0 (Mock, 合理)
 * - ModelModule 模型版本: v1.0 ~ v5.0 (Mock, 合理)
 * - ExportPanel 策略版本: v1.0 ~ v3.2 (Mock, 合理)
 * - HANDOFF 文件: PHASE_VERSION 导出 (文档记录, 合理)
 *
 * 建议: 当前无需改动，Mock 数据中版本号硬编码是预期行为
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HC-11: console 日志前缀
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * 风险等级: 🟢 低
 *
 * 前缀列表:
 *   [HTTP], [WS], [ServiceBridge], [Offline], [DataExport],
 *   [GlobalErrorHandler], [i18n], [BinanceService], [BinanceKLine],
 *   [Canary], [YYC-QATS], [YYC-Perf], [UserPrefs], [RAFBatch]
 *
 * 分析: 前缀命名一致性良好（方括号+模块名），便于过滤。
 * 建议:
 *   1. 生产环境应考虑日志级别控制（当前所有 console.log 均活跃）
 *   2. 可创建轻量 logger 工具控制输出级别
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HC-12: CSS 类名 / DOM 标识
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * 风险等级: 🟢 低
 *
 * ┌────────────────────┬──────────────────────────────────────┐
 * │ 类名/标识           │ 使用文件                              │
 * ├────────────────────┼──────────────────────────────────────┤
 * │ yyc-light          │ contexts/SettingsContext.tsx, theme.css│
 * │ yyc-dark           │ contexts/SettingsContext.tsx, theme.css│
 * └────────────────────┴───────────────────────────────��──────┘
 *
 * 分析: 与 theme.css 中 .yyc-light 规则配套，结构合理。
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  影响分析总结
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 *
 * ┌────────────────────────┬──────────┬──────────────────────────────────────────────────────┐
 * │ 影响场景                │ 严重程度  │ 受影响的硬编码类别                                     │
 * ├────────────────────────┼──────────┼──────────────────────────────────────────────────────┤
 * │ 域名/服务器迁移         │ 🔴 高    │ HC-01 (需改 config + ws-channels + tests)            │
 * │ 深色↔浅色主��切换       │ 🔴 高    │ HC-06 (57+处 D3/Recharts/Canvas 色值不响应)          │
 * │ 新增交易对              │ 🟡 中    │ HC-08 (6+ 文件需同步)                                │
 * │ localStorage 键冲突     │ 🟡 中    │ HC-03 (5个键跨文件重复字符串)                         │
 * │ 第三方 API 迁移         │ 🟡 中    │ HC-02 (Binance URL 散布3文件)                        │
 * │ 网络环境差异调优         │ 🟡 中    │ HC-07 (超时/重试参数分散)                            │
 * │ 白标化/品牌重命名       │ 🟢 低    │ HC-09 (15+ 处品牌文本)                               │
 * │ 日志级别控制            │ 🟢 低    │ HC-11 (30+ 处 console 无级别控制)                    │
 * └────────────────────────┴──────────┴──────────────────────────────────────────────────────┘
 *
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  推荐修复优先级 (Phase 21 可纳入项)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  P0 — 必须修复 (影响正确性):
 *    1. 创建 /src/app/constants/storage-keys.ts，统一 14 个 localStorage 键
 *    2. ws-channels.ts:243 fallback URL 改引用 config.ts
 *    3. DiagnosticsModule globalThis 键名修正
 *
 *  P1 — 强烈建议 (影响主题一致性):
 *    4. 创建 /src/app/constants/theme-colors.ts，定义色值常量
 *    5. D3CandlestickChart 改为接收主题色 props
 *    6. Recharts Tooltip/Axis 样式改用 CSS 变量或 context
 *
 *  P2 — 建议改善 (影响维护效率):
 *    7. 创建 /src/app/constants/symbols.ts，统一默认交易对
 *    8. 创建 /src/app/constants/events.ts，统一 CustomEvent 名称
 *    9. 创建 /src/app/constants/global-keys.ts，统一 globalThis 键
 *    10. 第三方交易所 URL 集中到 exchange-endpoints.ts
 *
 *  P3 — 可选优化 (低风险):
 *    11. 生产环境日志级别控制（logger 工具）
 *    12. 品牌名称常量化（仅白标场景需要）
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━���
 *  文件创建计划 (如执行修复)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  /src/app/constants/
 *  ├── storage-keys.ts       — 14 个 localStorage 键常量
 *  ├── global-keys.ts        — 9 个 globalThis 单例键常量
 *  ├── events.ts             — 4 个 CustomEvent 名称常量
 *  ├── theme-colors.ts       — 12 个主题色常量 + 深浅色映射
 *  ├── symbols.ts            — 默认交易对列表 + 默认符号
 *  └── branding.ts           — 系统名称 + Logo 路径 (可选)
 *
 *  预计修改文件: 20+
 *  预计新增常量: 50+
 *  预计测试用例新增: 15-20 例
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

export const HARDCODED_AUDIT_VERSION = 'v1.0.0';
export const HARDCODED_AUDIT_DATE = '2026-03-07';
export const HARDCODED_TOTAL_INSTANCES = 196;
export const HARDCODED_CATEGORIES = 12;
export const HARDCODED_HIGH_RISK_COUNT = 3; // HC-01, HC-03, HC-06
export const HARDCODED_MEDIUM_RISK_COUNT = 5; // HC-02, HC-04, HC-05, HC-07, HC-12
export const HARDCODED_LOW_RISK_COUNT = 4; // HC-08(low-mid), HC-09, HC-10, HC-11
