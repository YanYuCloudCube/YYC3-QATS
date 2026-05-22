/**
 * @file src/app/i18n/mock.ts
 * @description YYC3 国际化模拟框架，提供完整的多语言支持（zh-CN/en-US/ja-JP），支持嵌套键和插值
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags i18n,typescript,localization,public
 */

/**
 * YYC-QATS i18n Framework (Phase 15B)
 * ────────────────────────────────────
 * Comprehensive multi-language support: zh-CN / en-US / ja-JP
 * Replaces the earlier minimal mock with full coverage of all 8 modules.
 *
 * Design:
 *   - No external dependencies (avoids fginspector ForwardRef errors)
 *   - HMR-safe via globalThis caching
 *   - Supports nested dot-notation keys: t('nav.market')
 *   - Supports interpolation: t('trade.pnl_value', { value: '+$245' })
 *   - Language persisted to localStorage
 *   - Event-based reactivity for language changes
 */

// ═══════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════

export type SupportedLocale = 'zh-CN' | 'en-US' | 'ja-JP';

export interface LocaleInfo {
  code: SupportedLocale;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'zh-CN', label: 'Chinese (Simplified)', nativeLabel: '简体中文', flag: '🇨🇳' },
  { code: 'en-US', label: 'English (US)', nativeLabel: 'English', flag: '🇺🇸' },
  { code: 'ja-JP', label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵' },
];

interface TranslationMap {
  [key: string]: string | TranslationMap;
}

// ═══════════════════════════════════════
// §2  Translation Dictionaries
// ═══════════════════════════════════════

const translations: Record<SupportedLocale, TranslationMap> = {
  'zh-CN': {
    nav: {
      market: '市场数据',
      strategy: '智能策略',
      risk: '风险管控',
      quantum: '量子计算',
      bigdata: '数据管理',
      model: '量化工坊',
      trade: '交易中心',
      admin: '管理后台',
    },
    market: {
      overview: '市场概览',
      stocks: '股票',
      futures: '期货',
      forex: '外汇',
      crypto: '加密货币',
      favorites: '自选',
      symbol: '代码',
      name: '名称',
      price: '最新价',
      change: '涨跌幅',
      volume: '成交量',
      high: '最高价',
      low: '最低价',
      marketCap: '市值',
      action: '操作',
      trade: '交易',
      realtime: '实时',
      global_quotes: '全球行情',
      kline_analysis: 'K线分析',
      depth: '深度图',
      orderbook: '订单簿',
      search_placeholder: '搜索资产...',
      no_data: '暂无数据',
      loading: '加载中...',
    },
    strategy: {
      list: '策略列表',
      backtest: '回测中心',
      optimization: '参数优化',
      create: '创建策略',
      edit: '编辑策略',
      delete: '删除策略',
      start: '启动',
      pause: '暂停',
      status_active: '运行中',
      status_paused: '已暂停',
      status_testing: '测试中',
      win_rate: '胜率',
      pnl: '收益',
      sharpe: '夏普比率',
      max_dd: '最大回撤',
      trades: '交易次数',
      version: '版本',
    },
    risk: {
      overview: '风险概览',
      var: '在险价值',
      stress_test: '压力测试',
      exposure: '敞口',
      drawdown: '回撤',
      leverage: '杠杆率',
      correlation: '相关性',
      risk_level: '风险等级',
      risk_low: '低风险',
      risk_medium: '中等风险',
      risk_high: '高风险',
      alerts: '风险预警',
    },
    quantum: {
      overview: '量子概览',
      qubits: '量子比特',
      fidelity: '保真度',
      tasks: '任务数',
      circuit: '量子电路',
      optimization: '量子优化',
    },
    bigdata: {
      overview: '数据概览',
      sources: '数据源',
      pipeline: '数据管道',
      quality: '数据质量',
      storage: '存储容量',
      latency: '延迟',
      records: '日记录数',
    },
    model: {
      overview: '模型概览',
      training: '模型训练',
      deployed: '已部署',
      accuracy: '准确率',
      workshop: '实验室',
      total: '总模型数',
    },
    trade: {
      buy: '买入',
      sell: '卖出',
      orderbook: '订单簿',
      amount: '数量',
      total: '总计',
      last_price: '最新价',
      place_order: '下单',
      cancel_order: '撤单',
      positions: '持仓',
      history: '历史',
      pnl: '盈亏',
      unrealized_pnl: '未实现盈亏',
      close_position: '平仓',
      reduce_position: '减仓',
      side_long: '做多',
      side_short: '做空',
      entry_price: '开仓价',
      current_price: '当前价',
      leverage: '杠杆',
    },
    admin: {
      overview: '系统概览',
      status: '状态总览',
      performance: '性能监控',
      logs: '日志',
      users: '用户管理',
      cpu: 'CPU 使用率',
      memory: '内存使用率',
      network: '网络延迟',
      connections: '活跃连接',
      uptime: '运行时间',
    },
    common: {
      confirm: '确认',
      cancel: '取消',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      create: '创建',
      search: '搜索',
      filter: '筛选',
      export: '导出',
      import: '导入',
      refresh: '刷新',
      loading: '加载中...',
      no_data: '暂无数据',
      error: '发生错误',
      success: '操作成功',
      warning: '警告',
      info: '提示',
      close: '关闭',
      back: '返回',
      next: '下一步',
      previous: '上一步',
      submit: '提交',
      reset: '重置',
      retry: '重试',
      copy: '复制',
      download: '下载',
      upload: '上传',
      settings: '设置',
      language: '语言',
      theme: '主题',
      logout: '退出登录',
      login: '登录',
      register: '注册',
      profile: '个人信息',
    },
    settings: {
      title: '系统设置',
      language: '语言切换',
      market_colors: '行情配色方案',
      standard: '国际标准 (绿涨红跌)',
      china: '中国习惯 (红涨绿跌)',
      save: '保存设置',
      theme_dark: '深色主题',
      theme_light: '浅色主题',
      data_refresh: '数据刷新间隔',
      notifications: '通知设置',
    },
    export: {
      title: '数据导出',
      format_csv: 'CSV 格式',
      format_json: 'JSON 格式',
      select_data: '选择数据',
      market_data: '市场数据',
      positions: '持仓数据',
      trades: '交易记录',
      strategies: '策略列表',
      risk_report: '风险报告',
      exporting: '导出中...',
      export_success: '导出成功',
      export_failed: '导出失败',
    },
    errors: {
      global_title: '系统异常',
      global_desc: '系统检测到异常，已自动记录并通知运维团队。',
      network_error: '网络连接异常',
      api_error: 'API 请求失败',
      render_error: '页面渲染异常',
      data_error: '数据加载异常',
      auth_error: '认证失败',
      retry_hint: '点击重试',
      contact_support: '如问题持续，请联系技术支持',
    },
    auth: {
      login: '登录',
      logout: '退出',
      username: '用户名',
      password: '密码',
      role_admin: '管理员',
      role_trader: '交易员',
      role_analyst: '分析师',
      role_viewer: '观察者',
      logged_in_as: '已登录',
      session_expired: '会话已过期',
    },
  },

  'en-US': {
    nav: {
      market: 'Market Data',
      strategy: 'Smart Strategy',
      risk: 'Risk Control',
      quantum: 'Quantum Computing',
      bigdata: 'Data Management',
      model: 'Quant Workshop',
      trade: 'Trading Center',
      admin: 'Admin Panel',
    },
    market: {
      overview: 'Market Overview',
      stocks: 'Stocks',
      futures: 'Futures',
      forex: 'Forex',
      crypto: 'Crypto',
      favorites: 'Favorites',
      symbol: 'Symbol',
      name: 'Name',
      price: 'Price',
      change: 'Change',
      volume: 'Volume',
      high: 'High',
      low: 'Low',
      marketCap: 'Market Cap',
      action: 'Action',
      trade: 'Trade',
      realtime: 'Real-time',
      global_quotes: 'Global Quotes',
      kline_analysis: 'K-Line Analysis',
      depth: 'Depth Chart',
      orderbook: 'Order Book',
      search_placeholder: 'Search assets...',
      no_data: 'No data available',
      loading: 'Loading...',
    },
    strategy: {
      list: 'Strategy List',
      backtest: 'Backtest Center',
      optimization: 'Parameter Optimization',
      create: 'Create Strategy',
      edit: 'Edit Strategy',
      delete: 'Delete Strategy',
      start: 'Start',
      pause: 'Pause',
      status_active: 'Active',
      status_paused: 'Paused',
      status_testing: 'Testing',
      win_rate: 'Win Rate',
      pnl: 'PnL',
      sharpe: 'Sharpe Ratio',
      max_dd: 'Max Drawdown',
      trades: 'Trades',
      version: 'Version',
    },
    risk: {
      overview: 'Risk Overview',
      var: 'Value at Risk',
      stress_test: 'Stress Test',
      exposure: 'Exposure',
      drawdown: 'Drawdown',
      leverage: 'Leverage',
      correlation: 'Correlation',
      risk_level: 'Risk Level',
      risk_low: 'Low Risk',
      risk_medium: 'Medium Risk',
      risk_high: 'High Risk',
      alerts: 'Risk Alerts',
    },
    quantum: {
      overview: 'Quantum Overview',
      qubits: 'Qubits',
      fidelity: 'Fidelity',
      tasks: 'Tasks',
      circuit: 'Quantum Circuit',
      optimization: 'Quantum Optimization',
    },
    bigdata: {
      overview: 'Data Overview',
      sources: 'Data Sources',
      pipeline: 'Data Pipeline',
      quality: 'Data Quality',
      storage: 'Storage',
      latency: 'Latency',
      records: 'Daily Records',
    },
    model: {
      overview: 'Model Overview',
      training: 'Training',
      deployed: 'Deployed',
      accuracy: 'Accuracy',
      workshop: 'Workshop',
      total: 'Total Models',
    },
    trade: {
      buy: 'Buy',
      sell: 'Sell',
      orderbook: 'Order Book',
      amount: 'Amount',
      total: 'Total',
      last_price: 'Last Price',
      place_order: 'Place Order',
      cancel_order: 'Cancel Order',
      positions: 'Positions',
      history: 'History',
      pnl: 'PnL',
      unrealized_pnl: 'Unrealized PnL',
      close_position: 'Close Position',
      reduce_position: 'Reduce Position',
      side_long: 'Long',
      side_short: 'Short',
      entry_price: 'Entry Price',
      current_price: 'Current Price',
      leverage: 'Leverage',
    },
    admin: {
      overview: 'System Overview',
      status: 'Status Dashboard',
      performance: 'Performance',
      logs: 'Logs',
      users: 'User Management',
      cpu: 'CPU Usage',
      memory: 'Memory Usage',
      network: 'Network Latency',
      connections: 'Active Connections',
      uptime: 'Uptime',
    },
    common: {
      confirm: 'Confirm',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      refresh: 'Refresh',
      loading: 'Loading...',
      no_data: 'No data available',
      error: 'An error occurred',
      success: 'Operation successful',
      warning: 'Warning',
      info: 'Info',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      reset: 'Reset',
      retry: 'Retry',
      copy: 'Copy',
      download: 'Download',
      upload: 'Upload',
      settings: 'Settings',
      language: 'Language',
      theme: 'Theme',
      logout: 'Logout',
      login: 'Login',
      register: 'Register',
      profile: 'Profile',
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      market_colors: 'Market Color Scheme',
      standard: 'Standard (Green Up)',
      china: 'China (Red Up)',
      save: 'Save Settings',
      theme_dark: 'Dark Theme',
      theme_light: 'Light Theme',
      data_refresh: 'Data Refresh Interval',
      notifications: 'Notification Settings',
    },
    export: {
      title: 'Data Export',
      format_csv: 'CSV Format',
      format_json: 'JSON Format',
      select_data: 'Select Data',
      market_data: 'Market Data',
      positions: 'Positions',
      trades: 'Trade History',
      strategies: 'Strategy List',
      risk_report: 'Risk Report',
      exporting: 'Exporting...',
      export_success: 'Export successful',
      export_failed: 'Export failed',
    },
    errors: {
      global_title: 'System Error',
      global_desc: 'An error has been detected and automatically logged.',
      network_error: 'Network connection error',
      api_error: 'API request failed',
      render_error: 'Page rendering error',
      data_error: 'Data loading error',
      auth_error: 'Authentication failed',
      retry_hint: 'Click to retry',
      contact_support: 'If the problem persists, please contact support',
    },
    auth: {
      login: 'Login',
      logout: 'Logout',
      username: 'Username',
      password: 'Password',
      role_admin: 'Admin',
      role_trader: 'Trader',
      role_analyst: 'Analyst',
      role_viewer: 'Viewer',
      logged_in_as: 'Logged in as',
      session_expired: 'Session expired',
    },
  },

  'ja-JP': {
    nav: {
      market: '市場データ',
      strategy: 'スマート戦略',
      risk: 'リスク管理',
      quantum: '量子計算',
      bigdata: 'データ管理',
      model: '量子工房',
      trade: '取引センター',
      admin: '管理パネル',
    },
    market: {
      overview: '市場概要',
      stocks: '株式',
      futures: '先物',
      forex: '外為',
      crypto: '暗号通貨',
      favorites: 'お気に入り',
      symbol: 'シンボル',
      name: '名前',
      price: '価格',
      change: '変動率',
      volume: '出来高',
      high: '高値',
      low: '安値',
      marketCap: '時価総額',
      action: '操作',
      trade: '取引',
      realtime: 'リアルタイム',
      global_quotes: 'グローバル相場',
      kline_analysis: 'K線分析',
      depth: '板情報',
      orderbook: '注文板',
      search_placeholder: '資産を検索...',
      no_data: 'データなし',
      loading: '読み込み中...',
    },
    strategy: {
      list: '戦略一覧',
      backtest: 'バックテスト',
      optimization: 'パラメータ最適化',
      create: '戦略作成',
      edit: '戦略編集',
      delete: '戦略削除',
      start: '開始',
      pause: '一時停止',
      status_active: '稼働中',
      status_paused: '停止中',
      status_testing: 'テスト中',
      win_rate: '勝率',
      pnl: '損益',
      sharpe: 'シャープレシオ',
      max_dd: '最大ドローダウン',
      trades: '取引回数',
      version: 'バージョン',
    },
    risk: {
      overview: 'リスク概要',
      var: 'バリューアットリスク',
      stress_test: 'ストレステスト',
      exposure: 'エクスポージャー',
      drawdown: 'ドローダウン',
      leverage: 'レバレッジ',
      correlation: '相関性',
      risk_level: 'リスクレベル',
      risk_low: '低リスク',
      risk_medium: '中リスク',
      risk_high: '高リスク',
      alerts: 'リスクアラート',
    },
    quantum: {
      overview: '量子概要',
      qubits: '量子ビット',
      fidelity: 'フィデリティ',
      tasks: 'タスク数',
      circuit: '量子回路',
      optimization: '量子最適化',
    },
    bigdata: {
      overview: 'データ概要',
      sources: 'データソース',
      pipeline: 'データパイプライン',
      quality: 'データ品質',
      storage: 'ストレージ',
      latency: 'レイテンシ',
      records: '日次レコード数',
    },
    model: {
      overview: 'モデル概要',
      training: 'トレーニング',
      deployed: 'デプロイ済',
      accuracy: '精度',
      workshop: 'ワークショップ',
      total: 'モデル総数',
    },
    trade: {
      buy: '買い',
      sell: '売り',
      orderbook: '注文板',
      amount: '数量',
      total: '合計',
      last_price: '最終価格',
      place_order: '注文',
      cancel_order: 'キャンセル',
      positions: 'ポジション',
      history: '履歴',
      pnl: '損益',
      unrealized_pnl: '含み損益',
      close_position: 'ポジション決済',
      reduce_position: 'ポジション縮小',
      side_long: 'ロング',
      side_short: 'ショート',
      entry_price: 'エントリー価格',
      current_price: '現在価格',
      leverage: 'レバレッジ',
    },
    admin: {
      overview: 'システム概要',
      status: 'ステータス',
      performance: 'パフォーマンス',
      logs: 'ログ',
      users: 'ユーザー管理',
      cpu: 'CPU使用率',
      memory: 'メモリ使用率',
      network: 'ネットワーク遅延',
      connections: 'アクティブ接続',
      uptime: '稼働時間',
    },
    common: {
      confirm: '確認',
      cancel: 'キャンセル',
      save: '保存',
      delete: '削除',
      edit: '編集',
      create: '作成',
      search: '検索',
      filter: 'フィルター',
      export: 'エクスポート',
      import: 'インポート',
      refresh: '更新',
      loading: '読み込み中...',
      no_data: 'データなし',
      error: 'エラーが発生しました',
      success: '操作成功',
      warning: '警告',
      info: '情報',
      close: '閉じる',
      back: '戻る',
      next: '次へ',
      previous: '前へ',
      submit: '送信',
      reset: 'リセット',
      retry: '再試行',
      copy: 'コピー',
      download: 'ダウンロード',
      upload: 'アップロード',
      settings: '設定',
      language: '言語',
      theme: 'テーマ',
      logout: 'ログアウト',
      login: 'ログイン',
      register: '登録',
      profile: 'プロフィール',
    },
    settings: {
      title: '設定',
      language: '言語設定',
      market_colors: '相場カラースキーム',
      standard: '国際標準 (緑＝上昇)',
      china: '中国式 (赤＝上昇)',
      save: '設定を保存',
      theme_dark: 'ダークテーマ',
      theme_light: 'ライトテーマ',
      data_refresh: 'データ更新間隔',
      notifications: '通知設定',
    },
    export: {
      title: 'データエクスポート',
      format_csv: 'CSV形式',
      format_json: 'JSON形式',
      select_data: 'データ選択',
      market_data: '市場データ',
      positions: 'ポジション',
      trades: '取引履歴',
      strategies: '戦略一覧',
      risk_report: 'リスクレポート',
      exporting: 'エクスポート中...',
      export_success: 'エクスポート成功',
      export_failed: 'エクスポート失敗',
    },
    errors: {
      global_title: 'システムエラー',
      global_desc: 'エラーが検出され、自動的に記録されました。',
      network_error: 'ネットワーク接続エラー',
      api_error: 'APIリクエスト失敗',
      render_error: 'ページレンダリングエラー',
      data_error: 'データ読み込みエラー',
      auth_error: '認証失敗',
      retry_hint: 'クリックして再試行',
      contact_support: '問題が続く場合はサポートにお問い合わせください',
    },
    auth: {
      login: 'ログイン',
      logout: 'ログアウト',
      username: 'ユーザー名',
      password: 'パスワード',
      role_admin: '管理者',
      role_trader: 'トレーダー',
      role_analyst: 'アナリスト',
      role_viewer: '閲覧者',
      logged_in_as: 'ログイン中',
      session_expired: 'セッション期限切れ',
    },
  },
};

// ═══════════════════════════════════════
// §3  i18n Core Engine
// ═══════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';

import { EVENTS } from '@/app/constants/events';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';

/** Resolve stored language or detect from browser */
function resolveInitialLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LOCALE);
    if (stored && stored in translations) return stored as SupportedLocale;
  } catch { /* */ }

  // Browser detection
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language || '';
    if (lang.startsWith('ja')) return 'ja-JP';
    if (lang.startsWith('en')) return 'en-US';
  }
  return 'zh-CN';
}

let currentLocale: SupportedLocale = resolveInitialLocale();

/** Translate a dot-notation key, with optional interpolation */
function translate(key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: string | TranslationMap | undefined = translations[currentLocale];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to zh-CN if key missing in current locale
      if (currentLocale !== 'zh-CN') {
        let fallback: string | TranslationMap | undefined = translations['zh-CN'];
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object' && fk in fallback) {
            fallback = fallback[fk];
          } else {
            return key; // not found even in fallback
          }
        }
        if (typeof fallback === 'string') {
          return interpolate(fallback, params);
        }
      }
      return key;
    }
  }

  if (typeof value === 'string') {
    return interpolate(value, params);
  }
  return key;
}

/** Simple interpolation: replace {{key}} with params[key] */
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return key in params ? String(params[key]) : `{{${key}}}`;
  });
}

function changeLanguage(locale: SupportedLocale): Promise<void> {
  if (!(locale in translations)) {
    console.warn(`[i18n] Unknown locale: ${locale}`);
    return Promise.resolve();
  }

  currentLocale = locale;
  try { localStorage.setItem(STORAGE_KEYS.LOCALE, locale); } catch { /* */ }

  // Dispatch event for reactive components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTS.LOCALE_CHANGE, { detail: { locale } }));
  }

  console.info(`[i18n] Language changed to: ${locale}`);
  return Promise.resolve();
}

function getCurrentLocale(): SupportedLocale {
  return currentLocale;
}

/** Get all keys for a given namespace (e.g., 'nav') */
function getNamespaceKeys(namespace: string): string[] {
  const ns = translations[currentLocale]?.[namespace];
  if (ns && typeof ns === 'object') {
    return Object.keys(ns);
  }
  return [];
}

/** Check if a key exists */
function hasKey(key: string): boolean {
  const keys = key.split('.');
  let value: string | TranslationMap | undefined = translations[currentLocale];
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return false;
    }
  }
  return typeof value === 'string';
}

/** Count total translation keys for a locale */
function countKeys(locale?: SupportedLocale): number {
  const dict = translations[locale ?? currentLocale];
  let count = 0;
  function walk(obj: TranslationMap) {
    for (const v of Object.values(obj)) {
      if (typeof v === 'string') count++;
      else if (typeof v === 'object') walk(v);
    }
  }
  walk(dict);
  return count;
}

// ═══════════════════════════════════════
// §4  React Hook (useTranslation)
// ═══════════════════════════════════════


export function useTranslation() {
  const [locale, setLocale] = useState<SupportedLocale>(currentLocale);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.locale) {
        setLocale(detail.locale);
      }
    };
    window.addEventListener(EVENTS.LOCALE_CHANGE, handler);
    return () => window.removeEventListener(EVENTS.LOCALE_CHANGE, handler);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return translate(key, params);
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    t,
    i18n: {
      language: locale,
      locale,
      changeLanguage,
      getCurrentLocale,
      supportedLocales: SUPPORTED_LOCALES,
      hasKey,
      countKeys,
      getNamespaceKeys,
    },
    ready: true,
  };
}

// ═══════════════════════════════════════
// §5  Default Export & globalThis
// ═══════════════════════════════════════

const i18nInstance = {
  language: currentLocale,
  locale: currentLocale,
  changeLanguage,
  getCurrentLocale,
  translate,
  hasKey,
  countKeys,
  getNamespaceKeys,
  supportedLocales: SUPPORTED_LOCALES,
};

// Expose to console
if (typeof globalThis !== 'undefined') {
  (globalThis as any).i18n = i18nInstance;
  (globalThis as any).changeLanguage = changeLanguage;
}

// Named exports for direct import
export { changeLanguage, getCurrentLocale, translate };

export default i18nInstance;