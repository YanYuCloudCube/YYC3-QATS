import { describe, expect, it, vi } from 'vitest';

import { eventBus, EventTypes } from '@/app/services/EventBus';

describe('EventBus', () => {
  it('should emit and receive events', () => {
    const handler = vi.fn();
    eventBus.on('test:event', handler);

    const evt = eventBus.emit('test:event', 'market', { price: 50000 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test:event',
        source: 'market',
        payload: { price: 50000 },
      }),
    );
    expect(evt.id).toMatch(/^evt_/);
    expect(evt.timestamp).toBeGreaterThan(0);
  });

  it('should support wildcard handler', () => {
    const handler = vi.fn();
    eventBus.on('*', handler);

    eventBus.emit('any:type', 'strategy', { signal: 'BUY' });
    eventBus.emit('another:type', 'risk', { level: 'high' });

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should unsubscribe via returned function', () => {
    const handler = vi.fn();
    const unsub = eventBus.on('test:unsub', handler);

    eventBus.emit('test:unsub', 'trade', {});
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();
    eventBus.emit('test:unsub', 'trade', {});
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should handle once subscriptions', () => {
    const handler = vi.fn();
    eventBus.once('test:once', handler);

    eventBus.emit('test:once', 'model', {});
    eventBus.emit('test:once', 'model', {});

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should record event history', () => {
    eventBus.clearHistory();
    eventBus.emit('history:test', 'bigdata', { a: 1 });
    eventBus.emit('history:test', 'quantum', { b: 2 });

    const history = eventBus.getHistory('history:test');
    expect(history).toHaveLength(2);
    expect(history[0].source).toBe('bigdata');
    expect(history[1].source).toBe('quantum');
  });

  it('should filter history by source', () => {
    eventBus.clearHistory();
    eventBus.emit('filter:test', 'market', {});
    eventBus.emit('filter:test', 'strategy', {});

    const marketEvents = eventBus.getHistory('filter:test', 'market');
    expect(marketEvents).toHaveLength(1);
    expect(marketEvents[0].source).toBe('market');
  });

  it('should limit history to 200 events', () => {
    eventBus.clearHistory();
    for (let i = 0; i < 250; i++) {
      eventBus.emit('overflow:test', 'admin', { i });
    }
    const history = eventBus.getHistory('overflow:test');
    expect(history.length).toBeLessThanOrEqual(200);
  });

  it('should track handler count', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    const unsub1 = eventBus.on('count:test', h1);
    eventBus.on('count:test', h2);

    expect(eventBus.handlerCount('count:test')).toBe(2);
    unsub1();
    expect(eventBus.handlerCount('count:test')).toBe(1);
  });

  it('should not break when handler throws', () => {
    const badHandler = () => { throw new Error('oops'); };
    const goodHandler = vi.fn();

    eventBus.on('error:test', badHandler);
    eventBus.on('error:test', goodHandler);

    eventBus.emit('error:test', 'trade', {});
    expect(goodHandler).toHaveBeenCalled();
  });

  it('should have correct EventTypes constants', () => {
    expect(EventTypes.MARKET_TICK).toBe('market:tick');
    expect(EventTypes.SIGNAL_GENERATED).toBe('strategy:signal-generated');
    expect(EventTypes.RISK_SIGNAL).toBe('risk:signal');
    expect(EventTypes.TRADE_EXECUTED).toBe('trade:executed');
    expect(EventTypes.MODEL_PREDICTION).toBe('model:prediction');
    expect(Object.keys(EventTypes)).toHaveLength(13);
  });
});
