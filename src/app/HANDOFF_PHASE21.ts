/**
 * @file src/app/HANDOFF_PHASE21.ts
 * @description YYC3 阶段21交接文档,记录常量提取、环境变量保护、UI可编辑和主题色注入的交接信息
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
 * ╔══════════════════════════════════════════════╗
 * ║         YYC-QATS Phase 21 — HANDOFF DOCUMENT            ║
 * ║    常量提取 · env()保护 · UI可编辑 · 主题色注入          ║
 * ╚══════════════════════════════════════════════╝
 *
 * Phase 21 完成时间: 2026-03-07
 * 测试用例: 待更新 (需在浏览器执行 runAllTests() 验证)
 *
 * ═══════════════════════════════════════
 * 1. 新增文件 (6 个常量文件 + 1 个 UI 组件)
 * ═══════════════════════════════════════
 *
 * /src/app/constants/
 *   ├── storage-keys.ts      — 14 个 localStorage 键名注册表
 *   ├── global-keys.ts       — 8 个 globalThis 单例键注册表
 *   ├── events.ts            — 5 个 CustomEvent 事件名注册表
 *   ├── theme-colors.ts      — 20+ 主题色常量 (dark/light) + runtime override
 *   ├── symbols.ts           — 交易对符号注册表 + runtime override
 *   └── runtime-config.ts    — 运行时配置管理器 + env() 保护 + Magic Numbers
 *
 * /src/app/modules/admin/
 *   └── ConfigCenter.tsx     — 7 标签页 UI 面板 (Admin → 配置中心)
 *
 * ═══════════════════════════════════════
 * 2. 改造文件 (20+ 消费方)
 * ═══════════════════════════════════════
 *
 * P0 — localStorage 键名消除 (跨文件重复 → 统一引用):
 *   - api/config.ts            → STORAGE_KEYS.API_ENV + env() 包装 URL/超时
 *   - api/canary-validator.ts  → STORAGE_KEYS.CANARY_LAST
 *   - api/ws-channels.ts       → apiConfig.wsUrl (不再硬编码 wss:// 地址)
 *   - contexts/GlobalDataContext.tsx → STORAGE_KEYS.FAVORITES + GLOBAL_KEYS.GLOBAL_DATA_CONTEXT
 *   - contexts/AlertContext.tsx      → STORAGE_KEYS.ALERT_THRESHOLDS
 *   - contexts/SettingsContext.tsx    → STORAGE_KEYS.THEME + EVENTS.THEME_CHANGE + getThemeColors()
 *   - i18n/mock.ts                   → STORAGE_KEYS.LOCALE + EVENTS.LOCALE_CHANGE
 *   - utils/offline-manager.ts       → STORAGE_KEYS.OFFLINE_QUEUE
 *   - utils/user-preferences.ts      → STORAGE_KEYS.USER_PREFS + GLOBAL_KEYS.PREFERENCE_MANAGER
 *   - modules/strategy/StrategyModule.tsx → STORAGE_KEYS.BT_*
 *   - modules/admin/AdminModule.tsx       → STORAGE_KEYS.BT_* + FAVORITES + CANARY_LAST
 *   - modules/market/components/CustomPanel.tsx → STORAGE_KEYS.CUSTOM_PANEL
 *   - components/CommandPalette.tsx    → EVENTS.TOGGLE_THEME
 *   - components/NotificationCenter.tsx → GLOBAL_KEYS.NOTIFICATION_STORE
 *
 * P1 — 主题色常量化:
 *   - contexts/SettingsContext.tsx → getThemeColors() 驱动涨跌色、meta theme-color
 *   - theme-colors.ts 提供 getRechartsTooltipStyle() / getRechartsAxisStyle()
 *     供 D3/Recharts 图表注入色值 (策略模块已引入但尚未全面替换内联色值)
 *
 * ═══════════════════════════════════════
 * 3. env() 保护设计
 * ═══════════════════════════════════════
 *
 * 优先级链: import.meta.env.VITE_YYC_* > runtimeConfig > fallback
 *
 * 不可逆内容 (API URL / 域名 / 端口):
 *   env('api.test.base', 'https://test-api.0379.world')
 *   env('api.prod.base', 'https://api.0379.world')
 *   env('api.prod.domain', '0379.world')
 *
 * 可逆内容 (超时 / 间隔 / 阈值):
 *   envNum('http.timeout.test', 15000)
 *   envNum('ws.heartbeat.prod', 25000)
 *
 * ═══════════════════════════════════════
 * 4. Admin UI 配置中心
 * ═══════════════════════════════════════
 *
 * 导航: 管理后台 → 配置中心
 *
 * 7 个标签页:
 *   1. 存储键名 — 查看/清除 localStorage 数据
 *   2. globalThis — 查看单例挂载状态
 *   3. 事件名 — 查看所有 CustomEvent 注册
 *   4. 主题色 — 颜色选择器 + 覆盖保存/恢复
 *   5. 交易对 — 添加/删除/恢复默认
 *   6. 魔术数字 — 分类浏览/编辑/保存超时/间隔/阈值等
 *   7. 运行时配置 — 原始 JSON 编辑器 + 导入/导出/全部清除
 *
 * ═══════════════════════════════════════
 * 5. 导航更新
 * ═══════════════════════════════════════
 *
 * navigation.tsx admin 增加:
 *   { id: 'config_center', name: '配置中心', sub: [...7 个三级页] }
 *
 * AdminModule.tsx switch 增加:
 *   case 'config_center': return <ConfigCenter />
 *
 * ═══════════════════════════════════════
 * 6. 后续可选方向
 * ═══════════════════════════════════════
 *
 * - Phase 22A: 高级图表增强 — D3 蜡烛图 + Recharts 全面接入 getThemeColors()
 * - Phase 22B: 策略可视化构建器 (拖拽节点编辑策略逻辑)
 * - Phase 22C: a11y 无障碍优化 (ARIA labels, keyboard nav, contrast)
 * - Phase 22D: 测试套件 Phase 21 用例补充 (常量引用验证, env() 覆盖测试)
 */

export const PHASE21_SUMMARY = {
  phase: 21,
  title: '常量提取 · env()保护 · UI可编辑配置中心',
  newFiles: 7,
  modifiedFiles: 15,
  constantFiles: 6,
  storageKeys: 14,
  globalKeys: 8,
  events: 5,
  themeColors: 20,
  magicNumbers: 22,
  uiTabs: 7,
} as const;
