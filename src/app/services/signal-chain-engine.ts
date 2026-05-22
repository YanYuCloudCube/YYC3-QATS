/**
 * @file src/app/services/signal-chain-engine.ts
 * @description YYC3 信号链引擎，提供跨模块链接引擎，支持策略信号→风险预警→交易执行的链式处理
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags service,typescript,signal,public
 */

/**
 * YYC-QATS Signal Chain Engine
 * ────────────────────────────
 * Phase 18A: Cross-module linkage engine
 *
 * Chain: Strategy Signal → Risk Alert → Trade Execution
 *
 * Features:
 *   1. Typed signal pipeline with 3 stages (SIGNAL → ALERT → EXECUTION)
 *   2. Configurable risk rules per signal type (stop-loss, max drawdown, position limit)
 *   3. Auto-escalation: strategy signals → risk evaluation → trade recommendation
 *   4. Event-driven architecture with subscriber callbacks
 *   5. Chain history + audit trail
 *   6. Integration with GlobalDataContext emitRiskSignal
 *
 * Usage:
 *   import { signalChainEngine, SignalChainStage } from './signal-chain-engine';
 *   signalChainEngine.ingestStrategySignal({ ... });
 *   signalChainEngine.onChainEvent((event) => { ... });
 *   signalChainEngine.getChainHistory();
 */

// ═══════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════

export type SignalChainStage = 'SIGNAL' | 'RISK_EVAL' | 'EXECUTION';
export type SignalAction = 'BUY' | 'SELL' | 'HOLD' | 'CLOSE' | 'REDUCE';
export type RiskDecision = 'APPROVE' | 'REJECT' | 'MODIFY' | 'ESCALATE';
export type ExecutionStatus = 'PENDING' | 'SUBMITTED' | 'FILLED' | 'CANCELLED' | 'REJECTED';

export interface StrategySignalInput {
  strategyId: number;
  strategyName: string;
  symbol: string;
  action: SignalAction;
  confidence: number;         // 0-100
  suggestedQuantity: number;
  suggestedPrice: number;
  reason: string;
  indicators?: Record<string, number>; // e.g. { rsi: 32, macd: -0.5 }
}

export interface RiskEvaluation {
  decision: RiskDecision;
  riskScore: number;           // 0-100 (0=safe, 100=max risk)
  checks: RiskCheck[];
  modifiedQuantity?: number;   // if MODIFY, adjusted quantity
  modifiedPrice?: number;
  reason: string;
  maxDrawdownImpact: number;   // estimated impact on portfolio drawdown
  varImpact: number;           // estimated impact on VaR
}

export interface RiskCheck {
  rule: string;
  passed: boolean;
  detail: string;
  severity: 'low' | 'medium' | 'high';
}

export interface TradeRecommendation {
  status: ExecutionStatus;
  orderId?: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  executionMode: 'auto' | 'manual' | 'blocked';
  reason: string;
}

export interface ChainEvent {
  id: string;
  timestamp: number;
  stage: SignalChainStage;
  signal: StrategySignalInput;
  riskEval?: RiskEvaluation;
  tradeRec?: TradeRecommendation;
  duration: number;            // total chain processing time ms
}

export type ChainEventListener = (event: ChainEvent) => void;

// ═══════════════════════════════════════
// §2  Risk Rule Configurations
// ═══════════════════════════════════════

export interface RiskRuleConfig {
  maxPositionPercent: number;    // max single position as % of portfolio
  maxDailyDrawdown: number;      // max daily drawdown % before blocking
  maxLeverage: number;           // max leverage ratio
  minConfidence: number;         // min strategy confidence to proceed
  maxOpenPositions: number;      // max concurrent positions
  cooldownMs: number;            // min time between same-symbol trades
}

const DEFAULT_RISK_RULES: RiskRuleConfig = {
  maxPositionPercent: 25,
  maxDailyDrawdown: 5,
  maxLeverage: 10,
  minConfidence: 40,
  maxOpenPositions: 15,
  cooldownMs: 30_000,
};

// ═══════════════════════════════════════
// §3  Signal Chain Engine
// ═══════════════════════════════════════

class SignalChainEngine {
  private listeners: ChainEventListener[] = [];
  private history: ChainEvent[] = [];
  private riskRules: RiskRuleConfig;
  private lastTradeTime: Map<string, number> = new Map();
  private _paused = false;

  // Injected context references (set by GlobalDataContext)
  private _portfolioValue = 100_000;
  private _openPositions = 3;
  private _dailyDrawdown = 0;
  private _currentLeverage = 1.0;

  constructor(rules?: Partial<RiskRuleConfig>) {
    this.riskRules = { ...DEFAULT_RISK_RULES, ...rules };
  }

  // ── Public API ──

  /** Update portfolio context for risk evaluation */
  updatePortfolioContext(ctx: {
    portfolioValue?: number;
    openPositions?: number;
    dailyDrawdown?: number;
    currentLeverage?: number;
  }) {
    if (ctx.portfolioValue !== undefined) this._portfolioValue = ctx.portfolioValue;
    if (ctx.openPositions !== undefined) this._openPositions = ctx.openPositions;
    if (ctx.dailyDrawdown !== undefined) this._dailyDrawdown = ctx.dailyDrawdown;
    if (ctx.currentLeverage !== undefined) this._currentLeverage = ctx.currentLeverage;
  }

  /** Update risk rules */
  updateRiskRules(rules: Partial<RiskRuleConfig>) {
    this.riskRules = { ...this.riskRules, ...rules };
  }

  /** Get current risk rules */
  getRiskRules(): Readonly<RiskRuleConfig> {
    return { ...this.riskRules };
  }

  /** Pause/Resume signal chain processing */
  setPaused(paused: boolean) {
    this._paused = paused;
  }

  get paused() { return this._paused; }

  /** Ingest a strategy signal and run through the full chain */
  ingestStrategySignal(input: StrategySignalInput): ChainEvent {
    const start = performance.now();
    const id = `chain_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Stage 1: SIGNAL received
    const event: ChainEvent = {
      id,
      timestamp: Date.now(),
      stage: 'SIGNAL',
      signal: { ...input },
      duration: 0,
    };

    if (this._paused) {
      event.riskEval = {
        decision: 'REJECT',
        riskScore: 0,
        checks: [{ rule: 'system_paused', passed: false, detail: 'Signal chain is paused', severity: 'high' }],
        reason: 'Signal chain engine is paused',
        maxDrawdownImpact: 0,
        varImpact: 0,
      };
      event.stage = 'RISK_EVAL';
      event.duration = performance.now() - start;
      this._recordAndEmit(event);
      return event;
    }

    // Stage 2: RISK_EVAL
    const riskEval = this._evaluateRisk(input);
    event.riskEval = riskEval;
    event.stage = 'RISK_EVAL';

    // Stage 3: EXECUTION recommendation
    if (riskEval.decision === 'APPROVE' || riskEval.decision === 'MODIFY') {
      const quantity = riskEval.modifiedQuantity ?? input.suggestedQuantity;
      const price = riskEval.modifiedPrice ?? input.suggestedPrice;
      const side: 'BUY' | 'SELL' = input.action === 'BUY' ? 'BUY' : 'SELL';

      event.tradeRec = {
        status: 'PENDING',
        symbol: input.symbol,
        side,
        quantity,
        price,
        executionMode: riskEval.decision === 'APPROVE' ? 'auto' : 'manual',
        reason: riskEval.decision === 'MODIFY'
          ? `Risk-adjusted: ${riskEval.reason}`
          : `Approved: ${input.reason}`,
      };
      event.stage = 'EXECUTION';

      // Update cooldown
      this.lastTradeTime.set(input.symbol, Date.now());
    } else if (riskEval.decision === 'ESCALATE') {
      event.tradeRec = {
        status: 'PENDING',
        symbol: input.symbol,
        side: input.action === 'BUY' ? 'BUY' : 'SELL',
        quantity: input.suggestedQuantity,
        price: input.suggestedPrice,
        executionMode: 'manual',
        reason: `Escalated for manual review: ${riskEval.reason}`,
      };
      event.stage = 'EXECUTION';
    }
    // REJECT → no trade recommendation, stage stays at RISK_EVAL

    event.duration = performance.now() - start;
    this._recordAndEmit(event);
    return event;
  }

  /** Subscribe to chain events */
  onChainEvent(listener: ChainEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /** Get chain history */
  getChainHistory(limit = 50): ChainEvent[] {
    return this.history.slice(-limit);
  }

  /** Get chain statistics */
  getChainStats(): {
    totalSignals: number;
    approved: number;
    rejected: number;
    modified: number;
    escalated: number;
    avgDuration: number;
  } {
    const total = this.history.length;
    let approved = 0, rejected = 0, modified = 0, escalated = 0, totalDuration = 0;
    for (const e of this.history) {
      if (e.riskEval) {
        switch (e.riskEval.decision) {
          case 'APPROVE': approved++; break;
          case 'REJECT': rejected++; break;
          case 'MODIFY': modified++; break;
          case 'ESCALATE': escalated++; break;
        }
      }
      totalDuration += e.duration;
    }
    return {
      totalSignals: total,
      approved,
      rejected,
      modified,
      escalated,
      avgDuration: total > 0 ? totalDuration / total : 0,
    };
  }

  /** Clear chain history */
  clearHistory() {
    this.history = [];
  }

  // ── Private ──

  private _evaluateRisk(signal: StrategySignalInput): RiskEvaluation {
    const checks: RiskCheck[] = [];
    let riskScore = 0;

    // Check 1: Confidence threshold
    const confPassed = signal.confidence >= this.riskRules.minConfidence;
    checks.push({
      rule: 'min_confidence',
      passed: confPassed,
      detail: `Confidence ${signal.confidence}% vs threshold ${this.riskRules.minConfidence}%`,
      severity: confPassed ? 'low' : 'high',
    });
    if (!confPassed) riskScore += 30;

    // Check 2: Position size limit
    const positionValue = signal.suggestedQuantity * signal.suggestedPrice;
    const positionPercent = (positionValue / this._portfolioValue) * 100;
    const posPassed = positionPercent <= this.riskRules.maxPositionPercent;
    checks.push({
      rule: 'max_position_percent',
      passed: posPassed,
      detail: `Position ${positionPercent.toFixed(1)}% vs limit ${this.riskRules.maxPositionPercent}%`,
      severity: posPassed ? 'low' : 'medium',
    });
    if (!posPassed) riskScore += 20;

    // Check 3: Daily drawdown
    const ddPassed = Math.abs(this._dailyDrawdown) < this.riskRules.maxDailyDrawdown;
    checks.push({
      rule: 'max_daily_drawdown',
      passed: ddPassed,
      detail: `Daily DD ${this._dailyDrawdown.toFixed(2)}% vs limit ${this.riskRules.maxDailyDrawdown}%`,
      severity: ddPassed ? 'low' : 'high',
    });
    if (!ddPassed) riskScore += 30;

    // Check 4: Leverage
    const levPassed = this._currentLeverage < this.riskRules.maxLeverage;
    checks.push({
      rule: 'max_leverage',
      passed: levPassed,
      detail: `Leverage ${this._currentLeverage.toFixed(1)}x vs limit ${this.riskRules.maxLeverage}x`,
      severity: levPassed ? 'low' : 'high',
    });
    if (!levPassed) riskScore += 15;

    // Check 5: Open positions
    const openPassed = this._openPositions < this.riskRules.maxOpenPositions;
    checks.push({
      rule: 'max_open_positions',
      passed: openPassed,
      detail: `Open ${this._openPositions} vs limit ${this.riskRules.maxOpenPositions}`,
      severity: openPassed ? 'low' : 'medium',
    });
    if (!openPassed) riskScore += 10;

    // Check 6: Cooldown
    const lastTrade = this.lastTradeTime.get(signal.symbol) ?? 0;
    const cooldownPassed = (Date.now() - lastTrade) >= this.riskRules.cooldownMs;
    checks.push({
      rule: 'cooldown',
      passed: cooldownPassed,
      detail: cooldownPassed
        ? 'Cooldown period elapsed'
        : `Cooldown active, ${((this.riskRules.cooldownMs - (Date.now() - lastTrade)) / 1000).toFixed(0)}s remaining`,
      severity: cooldownPassed ? 'low' : 'medium',
    });
    if (!cooldownPassed) riskScore += 10;

    // Estimate impacts
    const maxDrawdownImpact = positionPercent * 0.05; // rough 5% adverse move
    const varImpact = positionValue * 0.056; // 95% VaR factor

    // Decision logic
    const failedChecks = checks.filter(c => !c.passed);
    const criticalFails = failedChecks.filter(c => c.severity === 'high');

    let decision: RiskDecision;
    let reason: string;
    let modifiedQuantity: number | undefined;

    if (criticalFails.length >= 2 || riskScore >= 60) {
      decision = 'REJECT';
      reason = `High risk (score ${riskScore}): ${criticalFails.map(c => c.rule).join(', ')}`;
    } else if (criticalFails.length === 1) {
      decision = 'ESCALATE';
      reason = `Critical check failed: ${criticalFails[0].rule} — requires manual review`;
    } else if (failedChecks.length > 0 && !posPassed) {
      // Position too large → modify down
      decision = 'MODIFY';
      const maxValue = this._portfolioValue * (this.riskRules.maxPositionPercent / 100);
      modifiedQuantity = Math.floor(maxValue / signal.suggestedPrice * 100) / 100;
      reason = `Position reduced from ${signal.suggestedQuantity} to ${modifiedQuantity} (${this.riskRules.maxPositionPercent}% limit)`;
    } else if (failedChecks.length > 0) {
      decision = 'ESCALATE';
      reason = `Minor checks failed: ${failedChecks.map(c => c.rule).join(', ')}`;
    } else {
      decision = 'APPROVE';
      reason = 'All risk checks passed';
    }

    return {
      decision,
      riskScore: Math.min(100, riskScore),
      checks,
      modifiedQuantity,
      reason,
      maxDrawdownImpact,
      varImpact,
    };
  }

  private _recordAndEmit(event: ChainEvent) {
    this.history.push(event);
    if (this.history.length > 200) {
      this.history = this.history.slice(-100);
    }
    for (const listener of this.listeners) {
      try { listener(event); } catch { /* ignore listener errors */ }
    }
  }
}

// ═══════════════════════════════════════
// §4  Singleton
// ═══════════════════════════════════════

const CHAIN_KEY = '__YYC_SignalChainEngine__';
export const signalChainEngine: SignalChainEngine =
  (globalThis as any)[CHAIN_KEY] || ((globalThis as any)[CHAIN_KEY] = new SignalChainEngine());

/** Get a fresh engine instance (for testing) */
export function createSignalChainEngine(rules?: Partial<RiskRuleConfig>): SignalChainEngine {
  return new SignalChainEngine(rules);
}
