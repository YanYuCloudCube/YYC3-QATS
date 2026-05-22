/**
 * @file src/app/api/interfaces.ts
 * @description YYC3 API路由接口和模拟服务定义,为8个业务模块提供统一的服务接口
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags api,typescript,interfaces,public
 * @depends
 */

/**
 * YYC-QATS API Route Interfaces & Mock Services
 * ─────────────────────────────────────────────
 * Defines all service interfaces used by the 8 business modules.
 * Each interface has a matching mock implementation that returns
 * realistic data for frontend development & testing without a backend.
 *
 * Architecture:
 *   App  →  interfaces.ts (contract)
 *        →  MockApiService  (sandbox data)
 *        →  Real services when backend is ready
 */

import type {
  MarketAsset,
  StrategyItem,
  Position,
  AccountInfo,
  RiskMetrics,
  SystemMetrics,
  ModelMetrics,
  DataPipelineMetrics,
  TradeRecord,
  Alert,
  AlertThreshold,
  CrossModuleSummary,
  BacktestConfig,
  BacktestResult,
  CandleData,
  KLineInterval,
  AggregatedQuote,
  ArbitrageSignal,
  MultiAccountSummary,
  OrderBookSnapshot,
} from '../types/global';

// ═══════════════════════════════════════
// Generic API Response Envelope
// ═══════════════════════════════════════

export interface ApiResponse<T> {
  code: number;           // HTTP-like status code
  data: T;
  message: string;
  timestamp: number;
  requestId?: string;     // for traceability
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ═══════════════════════════════════════
// §1  Market Service
// ═══════════════════════════════════════

export interface IMarketService {
  /** Get all market assets (or filter by category) */
  getAssets(category?: string): Promise<ApiResponse<MarketAsset[]>>;
  /** Get single ticker for a symbol */
  getTicker(symbol: string): Promise<ApiResponse<MarketAsset>>;
  /** Get historical K-line data */
  getKlines(symbol: string, interval: KLineInterval, limit?: number): Promise<ApiResponse<CandleData[]>>;
  /** Get order book depth */
  getDepth(symbol: string): Promise<ApiResponse<OrderBookSnapshot>>;
  /** Get aggregated multi-exchange quote */
  getAggregatedQuote(symbol: string): Promise<ApiResponse<AggregatedQuote>>;
}

// ═══════════════════════════════════════
// §2  Strategy Service
// ═══════════════════════════════════════

export interface IStrategyService {
  listStrategies(): Promise<ApiResponse<StrategyItem[]>>;
  getStrategy(id: number): Promise<ApiResponse<StrategyItem>>;
  createStrategy(data: Omit<StrategyItem, 'id'>): Promise<ApiResponse<StrategyItem>>;
  updateStrategy(id: number, updates: Partial<StrategyItem>): Promise<ApiResponse<StrategyItem>>;
  deleteStrategy(id: number): Promise<ApiResponse<boolean>>;
  startStrategy(id: number): Promise<ApiResponse<boolean>>;
  pauseStrategy(id: number): Promise<ApiResponse<boolean>>;
  runBacktest(config: BacktestConfig): Promise<ApiResponse<BacktestResult>>;
}

// ═══════════════════════════════════════
// §3  Trade Service
// ═══════════════════════════════════════

export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'limit' | 'market' | 'stop_limit' | 'oco' | 'trailing_stop';
  price?: number;
  stopPrice?: number;
  quantity: number;
  leverage?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
}

export interface OrderResult {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  status: 'NEW' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'REJECTED';
  price: number;
  quantity: number;
  filledQuantity: number;
  avgFillPrice: number;
  timestamp: number;
}

export interface ITradeService {
  placeOrder(order: OrderRequest): Promise<ApiResponse<OrderResult>>;
  cancelOrder(orderId: string): Promise<ApiResponse<boolean>>;
  getOpenOrders(): Promise<ApiResponse<OrderResult[]>>;
  getPositions(): Promise<ApiResponse<Position[]>>;
  closePosition(symbol: string, side: 'LONG' | 'SHORT'): Promise<ApiResponse<boolean>>;
  getTradeHistory(page?: number, pageSize?: number): Promise<PaginatedResponse<TradeRecord>>;
}

// ═══════════════════════════════════════
// §4  Account Service
// ═══════════════════════════════════════

export interface IAccountService {
  getAccountInfo(): Promise<ApiResponse<AccountInfo>>;
  getMultiAccountSummary(): Promise<ApiResponse<MultiAccountSummary>>;
}

// ═══════════════════════════════════════
// §5  Risk Service
// ═══════════════════════════════════════

export interface IRiskService {
  getRiskMetrics(): Promise<ApiResponse<RiskMetrics>>;
  runStressTest(scenario: string): Promise<ApiResponse<{ scenarioName: string; impact: number; details: string }>>;
  getVaRHistory(days?: number): Promise<ApiResponse<Array<{ date: string; var95: number; var99: number }>>>;
}

// ═══════════════════════════════════════
// §6  System / Admin Service
// ═══════════════════════════════════════

export interface ISystemService {
  getSystemMetrics(): Promise<ApiResponse<SystemMetrics>>;
  getCrossModuleSummary(): Promise<ApiResponse<CrossModuleSummary>>;
  getModelMetrics(): Promise<ApiResponse<ModelMetrics>>;
  getPipelineMetrics(): Promise<ApiResponse<DataPipelineMetrics>>;
}

// ═══════════════════════════════════════
// §7  Alert Service
// ═══════════════════════════════════════

export interface IAlertService {
  getAlerts(unreadOnly?: boolean): Promise<ApiResponse<Alert[]>>;
  getThresholds(): Promise<ApiResponse<AlertThreshold[]>>;
  addThreshold(threshold: Omit<AlertThreshold, 'id'>): Promise<ApiResponse<AlertThreshold>>;
  removeThreshold(id: string): Promise<ApiResponse<boolean>>;
  markAsRead(id: string): Promise<ApiResponse<boolean>>;
  markAllAsRead(): Promise<ApiResponse<boolean>>;
}

// ═══════════════════════════════════════
// §8  Arbitrage Service
// ═══════════════════════════════════════

export interface IArbitrageService {
  getSignals(): Promise<ApiResponse<ArbitrageSignal[]>>;
  executeArbitrage(signalId: string): Promise<ApiResponse<{ executed: boolean; pnl: number }>>;
}

// ═══════════════════════════════════════
// Mock Implementation
// ═══════════════════════════════════════

function ok<T>(data: T, message = 'success'): ApiResponse<T> {
  return { code: 200, data, message, timestamp: Date.now(), requestId: `req_${Date.now()}` };
}

const MOCK_ASSET: MarketAsset = {
  symbol: 'BTC/USDT',
  name: 'Bitcoin',
  price: 96231.50,
  change: 2.45,
  volume: '28.5B',
  high24h: 96580,
  low24h: 94920,
  marketCap: '1.91T',
  category: '加密货币',
};

const MOCK_STRATEGIES: StrategyItem[] = [
  {
    id: 1,
    name: '双均线交叉策略',
    type: '趋势跟踪',
    status: 'active',
    winRate: 62.5,
    pnl: '+18.4%',
    sharpe: 1.85,
    maxDD: '-8.2%',
    trades: 156,
    version: 'v3.2',
    linkedModel: 'LSTM价格预测',
  },
  {
    id: 2,
    name: '动量策略',
    type: '动量',
    status: 'paused',
    winRate: 55.0,
    pnl: '+15.2%',
    sharpe: 1.65,
    maxDD: '-7.5%',
    trades: 120,
    version: 'v2.1',
    linkedModel: 'ARIMA预测',
  },
  {
    id: 3,
    name: 'RSI反弹策略',
    type: '均值回归',
    status: 'active',
    winRate: 58.3,
    pnl: '+12.6%',
    sharpe: 1.52,
    maxDD: '-6.8%',
    trades: 89,
    version: 'v1.8',
  },
  {
    id: 4,
    name: '布林带突破策略',
    type: '波动率',
    status: 'testing',
    winRate: 51.2,
    pnl: '+8.1%',
    sharpe: 1.28,
    maxDD: '-11.5%',
    trades: 45,
    version: 'v1.0',
    linkedModel: 'GBM波动率',
  },
];

const MOCK_POSITIONS: Position[] = [
  {
    symbol: 'BTC/USDT',
    side: 'LONG',
    quantity: 0.52,
    entryPrice: 94580,
    currentPrice: 96231.50,
    unrealizedPnl: 858.78,
    pnlPercent: 1.75,
    strategy: '双均线交叉策略',
  },
  {
    symbol: 'ETH/USDT',
    side: 'SHORT',
    quantity: 1.2,
    entryPrice: 3000,
    currentPrice: 2950,
    unrealizedPnl: 60,
    pnlPercent: -1.67,
    strategy: '动量策略',
  },
];

const MOCK_ACCOUNT: AccountInfo = {
  totalAssets: 142580.50,
  availableBalance: 78120.30,
  positionValue: 64460.20,
  todayPnl: 2850.80,
  todayPnlPercent: 1.8,
  totalPnl: 26360,
};

const MOCK_MULTI_ACCOUNT: MultiAccountSummary = {
  accounts: [
    {
      exchange: 'Binance',
      totalBalance: 142580.50,
      availableBalance: 78120.30,
      unrealizedPnl: 2850.80,
      marginUsage: 45.2,
      positions: 3,
    },
    {
      exchange: 'OKX',
      totalBalance: 85420.00,
      availableBalance: 52300.00,
      unrealizedPnl: 1200.50,
      marginUsage: 38.7,
      positions: 2,
    },
    {
      exchange: 'Bybit',
      totalBalance: 36200.00,
      availableBalance: 28500.00,
      unrealizedPnl: -320.40,
      marginUsage: 21.3,
      positions: 1,
    },
  ],
  totalValue: 264200.50,
  totalPnl: 3730.90,
};

const MOCK_RISK: RiskMetrics = {
  portfolioVaR95: -8120,
  portfolioVaR99: -12060,
  totalExposure: 64460.20,
  maxDrawdown: -8.2,
  sharpeRatio: 1.85,
  betaToMarket: 1.12,
  correlationBTC: 0.85,
  leverageRatio: 1.0,
};

const MOCK_SYSTEM: SystemMetrics = {
  cpuUsage: 42,
  memoryUsage: 68,
  networkLatency: 12,
  activeConnections: 3,
  dataFreshness: 0,
  quantumQubits: 72,
  quantumFidelity: 99.2,
  quantumTasks: 5,
};

const MOCK_OPEN_ORDERS: OrderResult[] = [
  {
    orderId: 'ord_1',
    symbol: 'BTC/USDT',
    side: 'BUY',
    type: 'limit',
    status: 'NEW',
    price: 96000,
    quantity: 0.1,
    filledQuantity: 0,
    avgFillPrice: 0,
    timestamp: Date.now(),
  },
  {
    orderId: 'ord_2',
    symbol: 'ETH/USDT',
    side: 'SELL',
    type: 'market',
    status: 'NEW',
    price: 0,
    quantity: 1.0,
    filledQuantity: 0,
    avgFillPrice: 0,
    timestamp: Date.now(),
  },
];

const MOCK_TRADE_HISTORY: TradeRecord[] = [
  {
    id: 'trade_1',
    time: '2026-03-02 14:30:00',
    symbol: 'BTC/USDT',
    side: 'BUY',
    price: '94,000.00',
    quantity: '0.10',
    pnl: '+$1,000.00',
    strategy: '双均线交叉策略',
  },
  {
    id: 'trade_2',
    time: '2026-03-02 10:15:00',
    symbol: 'ETH/USDT',
    side: 'SELL',
    price: '3,000.00',
    quantity: '1.00',
    pnl: '-$50.00',
    strategy: '动量策略',
  },
  {
    id: 'trade_3',
    time: '2026-03-01 22:45:00',
    symbol: 'SOL/USDT',
    side: 'BUY',
    price: '142.80',
    quantity: '5.00',
    pnl: '+$36.50',
    strategy: 'RSI反弹策略',
  },
];

export const MockApiService = {
  market: {
    getAssets: async (category?: string): Promise<ApiResponse<MarketAsset[]>> => {
      const allAssets: MarketAsset[] = [
        MOCK_ASSET,
        { symbol: 'ETH/USDT', name: 'Ethereum', price: 2950.00, change: -1.2, volume: '15.3B', high24h: 3020, low24h: 2880, marketCap: '355B', category: '加密货币' },
        { symbol: 'SOL/USDT', name: 'Solana', price: 142.80, change: 5.1, volume: '4.8B', high24h: 148.50, low24h: 138.20, marketCap: '65.2B', category: '加密货币' },
        { symbol: 'BNB/USDT', name: 'BNB', price: 620.50, change: 0.8, volume: '2.1B', high24h: 628.00, low24h: 612.00, marketCap: '95.8B', category: '加密货币' },
        { symbol: 'ADA/USDT', name: 'Cardano', price: 0.68, change: -2.3, volume: '1.2B', high24h: 0.72, low24h: 0.65, marketCap: '24.1B', category: '加密货币' },
        { symbol: 'XRP/USDT', name: 'Ripple', price: 2.35, change: 3.8, volume: '3.5B', high24h: 2.42, low24h: 2.25, marketCap: '135B', category: '加密货币' },
        { symbol: 'DOGE/USDT', name: 'Dogecoin', price: 0.182, change: -0.5, volume: '890M', high24h: 0.188, low24h: 0.178, marketCap: '26.5B', category: '加密货币' },
        { symbol: 'AVAX/USDT', name: 'Avalanche', price: 38.50, change: 4.2, volume: '1.5B', high24h: 39.80, low24h: 36.90, marketCap: '15.2B', category: '加密货币' },
      ];
      const filtered = category ? allAssets.filter(a => a.category === category) : allAssets;
      return ok(filtered);
    },
    getTicker: async (symbol: string): Promise<ApiResponse<MarketAsset>> =>
      ok({ ...MOCK_ASSET, symbol }),
    getKlines: async (_symbol?: string, _interval?: KLineInterval, _limit?: number): Promise<ApiResponse<CandleData[]>> =>
      ok(Array.from({ length: 100 }, (_, i) => ({
        time: Date.now() - (100 - i) * 3600000,
        open: 95000 + Math.random() * 2000,
        high: 96000 + Math.random() * 1500,
        low: 94000 + Math.random() * 1500,
        close: 95500 + Math.random() * 2000,
        volume: 100 + Math.random() * 500,
        quoteVolume: 10000000 + Math.random() * 50000000,
      }))),
    getDepth: async (_symbol?: string): Promise<ApiResponse<OrderBookSnapshot>> =>
      ok({
        symbol: 'BTC/USDT',
        exchange: 'binance',
        asks: Array.from({ length: 20 }, (_, i) => ({ price: 96300 + i * 10, size: Math.random() * 5, total: 0 })),
        bids: Array.from({ length: 20 }, (_, i) => ({ price: 96200 - i * 10, size: Math.random() * 5, total: 0 })),
        lastUpdateId: Date.now(),
        timestamp: Date.now(),
        mode: 'simulated',
      }),
    getAggregatedQuote: async (symbol: string): Promise<ApiResponse<AggregatedQuote>> =>
      ok({
        symbol,
        bestBid: { price: 96200, exchange: 'Binance', size: 1.5 },
        bestAsk: { price: 96210, exchange: 'OKX', size: 2.0 },
        spread: 10,
        spreadBps: 1.04,
        exchanges: [
          { exchange: 'Binance', bestBid: 96200, bestAsk: 96215, bidSize: 1.5, askSize: 2.1, latency: 15, status: 'online' as const, lastUpdate: Date.now(), fee: 0.001 },
          { exchange: 'OKX', bestBid: 96195, bestAsk: 96210, bidSize: 1.2, askSize: 2.0, latency: 22, status: 'online' as const, lastUpdate: Date.now(), fee: 0.0008 },
          { exchange: 'Bybit', bestBid: 96190, bestAsk: 96220, bidSize: 0.8, askSize: 1.5, latency: 28, status: 'online' as const, lastUpdate: Date.now(), fee: 0.001 },
        ],
      }),
  } satisfies IMarketService,

  strategy: {
    listStrategies: async (): Promise<ApiResponse<StrategyItem[]>> => ok(MOCK_STRATEGIES),
    getStrategy: async (id: number): Promise<ApiResponse<StrategyItem>> => {
      const found = MOCK_STRATEGIES.find(s => s.id === id);
      return ok(found || MOCK_STRATEGIES[0]);
    },
    createStrategy: async (data: Omit<StrategyItem, 'id'>): Promise<ApiResponse<StrategyItem>> =>
      ok({ ...data, id: Date.now() }),
    updateStrategy: async (id: number, updates: Partial<StrategyItem>): Promise<ApiResponse<StrategyItem>> => {
      const found = MOCK_STRATEGIES.find(s => s.id === id) || MOCK_STRATEGIES[0];
      return ok({ ...found, ...updates });
    },
    deleteStrategy: async (_id: number): Promise<ApiResponse<boolean>> => ok(true),
    startStrategy: async (_id: number): Promise<ApiResponse<boolean>> => ok(true),
    pauseStrategy: async (_id: number): Promise<ApiResponse<boolean>> => ok(true),
    runBacktest: async (config: BacktestConfig): Promise<ApiResponse<BacktestResult>> =>
      ok({
        config,
        trades: Array.from({ length: 12 }, (_, i) => ({
          entryTime: Date.now() - (12 - i) * 86400000,
          exitTime: Date.now() - (11 - i) * 86400000,
          side: (i % 2 === 0 ? 'LONG' : 'SHORT') as 'LONG' | 'SHORT',
          entryPrice: 94000 + Math.random() * 3000,
          exitPrice: 94500 + Math.random() * 3000,
          quantity: 0.1 + Math.random() * 0.5,
          pnl: -200 + Math.random() * 800,
          pnlPercent: -2 + Math.random() * 8,
          reason: i % 3 === 0 ? 'stop_loss' : i % 3 === 1 ? 'take_profit' : 'signal_exit',
        })),
        equityCurve: Array.from({ length: 30 }, (_, i) => ({
          time: Date.now() - (30 - i) * 86400000,
          equity: config.initialCapital * (1 + (i * 0.008) + (Math.random() - 0.3) * 0.02),
        })),
        stats: {
          totalReturn: 18.4,
          annualizedReturn: 36.8,
          sharpeRatio: 1.85,
          maxDrawdown: -8.2,
          winRate: 62.5,
          profitFactor: 1.92,
          totalTrades: 12,
          avgWin: 420.5,
          avgLoss: -185.3,
          bestTrade: 1280.6,
          worstTrade: -480.2,
          avgHoldingPeriod: '18.5小时',
        },
      }),
  } satisfies IStrategyService,

  trade: {
    placeOrder: async (order: OrderRequest): Promise<ApiResponse<OrderResult>> =>
      ok({
        orderId: `ord_${Date.now()}`,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        status: 'FILLED',
        price: order.price || 96200,
        quantity: order.quantity,
        filledQuantity: order.quantity,
        avgFillPrice: order.price || 96200,
        timestamp: Date.now(),
      }),
    cancelOrder: async (orderId: string): Promise<ApiResponse<boolean>> => {
      void orderId;
      return ok(true);
    },
    getOpenOrders: async (): Promise<ApiResponse<OrderResult[]>> =>
      ok(MOCK_OPEN_ORDERS),
    getPositions: async (): Promise<ApiResponse<Position[]>> =>
      ok(MOCK_POSITIONS),
    closePosition: async (symbol: string, side: 'LONG' | 'SHORT'): Promise<ApiResponse<boolean>> => {
      void symbol; void side;
      return ok(true);
    },
    getTradeHistory: async (page = 1, pageSize = 20): Promise<PaginatedResponse<TradeRecord>> => ({
      code: 200,
      data: MOCK_TRADE_HISTORY,
      message: 'success',
      timestamp: Date.now(),
      requestId: `req_${Date.now()}`,
      total: MOCK_TRADE_HISTORY.length,
      page,
      pageSize,
      hasMore: false,
    }),
  } satisfies ITradeService,

  account: {
    getAccountInfo: async (): Promise<ApiResponse<AccountInfo>> => ok(MOCK_ACCOUNT),
    getMultiAccountSummary: async (): Promise<ApiResponse<MultiAccountSummary>> =>
      ok(MOCK_MULTI_ACCOUNT),
  } satisfies IAccountService,

  risk: {
    getRiskMetrics: async (): Promise<ApiResponse<RiskMetrics>> => ok(MOCK_RISK),
    runStressTest: async (scenario: string): Promise<ApiResponse<{ scenarioName: string; impact: number; details: string }>> =>
      ok({
        scenarioName: scenario,
        impact: -15200 - Math.random() * 10000,
        details: `模拟场景「${scenario}」完成：组合预计最大回撤 ${(-8 - Math.random() * 15).toFixed(1)}%，VaR突破阈值概率 ${(10 + Math.random() * 25).toFixed(1)}%`,
      }),
    getVaRHistory: async (days = 30): Promise<ApiResponse<Array<{ date: string; var95: number; var99: number }>>> => {
      const data = Array.from({ length: days }, (_, i) => {
        const d = new Date(Date.now() - (days - i) * 86400000);
        return {
          date: d.toISOString().slice(0, 10),
          var95: -6000 - Math.random() * 4000,
          var99: -9000 - Math.random() * 6000,
        };
      });
      return ok(data);
    },
  } satisfies IRiskService,

  alert: {
    getAlerts: async (unreadOnly = false): Promise<ApiResponse<Alert[]>> => {
      const allAlerts: Alert[] = [
        { id: 'alert_1', type: 'price', symbol: 'BTC/USDT', message: 'BTC价格突破 $96,000 阻力位', timestamp: new Date(Date.now() - 300000), severity: 'warning', read: false, source: 'market' },
        { id: 'alert_2', type: 'risk', symbol: 'ETH/USDT', message: 'ETH持仓浮亏超过3%', timestamp: new Date(Date.now() - 600000), severity: 'critical', read: false, source: 'risk' },
        { id: 'alert_3', type: 'volume', symbol: 'SOL/USDT', message: 'SOL成交量异常放大 250%', timestamp: new Date(Date.now() - 1200000), severity: 'info', read: true, source: 'market' },
        { id: 'alert_4', type: 'system', symbol: '', message: '系统CPU使用率达到85%', timestamp: new Date(Date.now() - 1800000), severity: 'warning', read: true, source: 'system' },
        { id: 'alert_5', type: 'technical', symbol: 'BTC/USDT', message: 'BTC RSI(14)进入超买区域 (>70)', timestamp: new Date(Date.now() - 2400000), severity: 'info', read: false, source: 'strategy' },
        { id: 'alert_6', type: 'risk', symbol: 'BNB/USDT', message: 'BNB 5分钟波动率激增', timestamp: new Date(Date.now() - 3600000), severity: 'warning', read: true, source: 'risk' },
      ];
      const filtered = unreadOnly ? allAlerts.filter(a => !a.read) : allAlerts;
      return ok(filtered);
    },
    getThresholds: async (): Promise<ApiResponse<AlertThreshold[]>> =>
      ok([
        { id: 'th_1', symbol: 'BTC/USDT', metric: 'price' as const, condition: 'above' as const, value: 100000, enabled: true, cooldownMs: 300000 },
        { id: 'th_2', symbol: 'BTC/USDT', metric: 'price' as const, condition: 'below' as const, value: 90000, enabled: true, cooldownMs: 300000 },
        { id: 'th_3', symbol: 'ETH/USDT', metric: 'change' as const, condition: 'below' as const, value: -5, enabled: true, cooldownMs: 600000 },
        { id: 'th_4', symbol: '', metric: 'drawdown' as const, condition: 'below' as const, value: -10, enabled: true, cooldownMs: 900000 },
        { id: 'th_5', symbol: '', metric: 'var' as const, condition: 'below' as const, value: -15000, enabled: false, cooldownMs: 1800000 },
      ]),
    addThreshold: async (threshold: Omit<AlertThreshold, 'id'>): Promise<ApiResponse<AlertThreshold>> =>
      ok({ ...threshold, id: `th_${Date.now()}` }),
    removeThreshold: async (_id: string): Promise<ApiResponse<boolean>> => ok(true),
    markAsRead: async (_id: string): Promise<ApiResponse<boolean>> => ok(true),
    markAllAsRead: async (): Promise<ApiResponse<boolean>> => ok(true),
  } satisfies IAlertService,

  arbitrage: {
    getSignals: async (): Promise<ApiResponse<ArbitrageSignal[]>> =>
      ok([
        {
          id: 'arb_1', timestamp: Date.now() - 5000, symbol: 'BTC/USDT',
          buyExchange: 'Binance', sellExchange: 'OKX',
          buyPrice: 96180, sellPrice: 96250, spreadBps: 7.3,
          estimatedProfit: 36.4, status: 'detected' as const,
        },
        {
          id: 'arb_2', timestamp: Date.now() - 15000, symbol: 'ETH/USDT',
          buyExchange: 'Bybit', sellExchange: 'Binance',
          buyPrice: 2945, sellPrice: 2952, spreadBps: 23.8,
          estimatedProfit: 8.4, status: 'detected' as const,
        },
        {
          id: 'arb_3', timestamp: Date.now() - 60000, symbol: 'SOL/USDT',
          buyExchange: 'OKX', sellExchange: 'Bybit',
          buyPrice: 142.20, sellPrice: 142.85, spreadBps: 45.7,
          estimatedProfit: 3.25, status: 'completed' as const,
        },
        {
          id: 'arb_4', timestamp: Date.now() - 120000, symbol: 'BNB/USDT',
          buyExchange: 'Binance', sellExchange: 'OKX',
          buyPrice: 619.80, sellPrice: 620.50, spreadBps: 11.3,
          estimatedProfit: 1.4, status: 'expired' as const,
        },
      ]),
    executeArbitrage: async (_signalId: string): Promise<ApiResponse<{ executed: boolean; pnl: number }>> =>
      ok({ executed: true, pnl: 15 + Math.random() * 50 }),
  } satisfies IArbitrageService,

  system: {
    getSystemMetrics: async (): Promise<ApiResponse<SystemMetrics>> => ok(MOCK_SYSTEM),
  } satisfies Partial<ISystemService>,
};