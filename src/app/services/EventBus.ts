/**
 * @file src/app/services/EventBus.ts
 * @description YYC3 全局事件总线 — 8大模块闭环数据流的统一调度中心
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-05-22
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags service, event-bus, pub-sub, cross-module, data-flow
 */

export type ModuleId = 'market' | 'strategy' | 'risk' | 'quantum' | 'bigdata' | 'model' | 'trade' | 'admin';

export interface YYC3Event {
  id: string;
  type: string;
  source: ModuleId;
  target?: ModuleId | '*';
  payload: unknown;
  timestamp: number;
}

type EventHandler = (event: YYC3Event) => void;

class YYC3EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private history: YYC3Event[] = [];
  private maxHistory = 200;

  private generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  on(type: string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  once(type: string, handler: EventHandler): () => void {
    const wrapper: EventHandler = (e) => {
      handler(e);
      this.handlers.get(type)?.delete(wrapper);
    };
    return this.on(type, wrapper);
  }

  emit(type: string, source: ModuleId, payload: unknown, target?: ModuleId): YYC3Event {
    const event: YYC3Event = {
      id: this.generateId(),
      type,
      source,
      target: target ?? '*',
      payload,
      timestamp: Date.now(),
    };

    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try { handler(event); } catch { /* swallow event handler errors */ }
      }
    }

    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try { handler(event); } catch { /* swallow */ }
      }
    }

    return event;
  }

  getHistory(type?: string, source?: ModuleId): YYC3Event[] {
    let events = this.history;
    if (type) events = events.filter(e => e.type === type);
    if (source) events = events.filter(e => e.source === source);
    return events;
  }

  clearHistory(): void {
    this.history = [];
  }

  handlerCount(type?: string): number {
    if (!type) {
      let total = 0;
      for (const set of this.handlers.values()) total += set.size;
      return total;
    }
    return this.handlers.get(type)?.size ?? 0;
  }
}

export const eventBus = new YYC3EventBus();

export const EventTypes = {
  MARKET_TICK: 'market:tick',
  MARKET_ALERT: 'market:alert',
  SIGNAL_GENERATED: 'strategy:signal-generated',
  BACKTEST_COMPLETE: 'strategy:backtest-complete',
  RISK_THRESHOLD: 'risk:threshold-exceeded',
  RISK_SIGNAL: 'risk:signal',
  TRADE_RECOMMENDATION: 'trade:recommendation',
  TRADE_EXECUTED: 'trade:executed',
  MODEL_PREDICTION: 'model:prediction',
  MODEL_DEPLOYED: 'model:deployed',
  DATA_PIPELINE: 'bigdata:pipeline-event',
  QUANTUM_RESULT: 'quantum:computation-result',
  SYSTEM_CONFIG: 'admin:config-changed',
} as const;
