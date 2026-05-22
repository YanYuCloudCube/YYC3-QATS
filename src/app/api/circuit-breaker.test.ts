import { describe, expect, it } from 'vitest';

import { CircuitBreaker } from '@/app/api/circuit-breaker';

describe('CircuitBreaker', () => {
  it('should start in CLOSED state', () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 3 });
    const metrics = cb.metrics;
    expect(metrics.state).toBe('CLOSED');
    expect(metrics.consecutiveFailures).toBe(0);
  });

  it('should transition to OPEN after failureThreshold', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 2, resetTimeout: 1000 });

    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(
          () => Promise.reject(new Error('fail')),
          () => Promise.resolve('fallback'),
        );
      } catch { /* expected */ }
    }

    expect(cb.metrics.state).toBe('OPEN');
  });

  it('should call fallback when circuit is OPEN', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 1, resetTimeout: 5000 });

    try {
      await cb.execute(
        () => Promise.reject(new Error('fail')),
        () => Promise.resolve('fallback'),
      );
    } catch { /* first failure triggers OPEN */ }

    const result = await cb.execute(
      () => Promise.resolve('primary'),
      () => Promise.resolve('fallback'),
    );

    expect(result).toBe('fallback');
  });

  it('should reset to CLOSED after success in HALF_OPEN', async () => {
    const cb = new CircuitBreaker('test', { failureThreshold: 1, resetTimeout: 50 });

    try {
      await cb.execute(
        () => Promise.reject(new Error('fail')),
        () => Promise.resolve('fb'),
      );
    } catch { /* */ }

    expect(cb.metrics.state).toBe('OPEN');

    await new Promise(r => setTimeout(r, 60));

    await cb.execute(
      () => Promise.resolve('ok'),
      () => Promise.resolve('fb'),
    );

    expect(cb.metrics.state).toBe('CLOSED');
  });

  it('should track metrics correctly', async () => {
    const cb = new CircuitBreaker('metrics-test', { failureThreshold: 5 });

    await cb.execute(
      () => Promise.resolve('ok'),
      () => Promise.resolve('fb'),
    );

    const metrics = cb.metrics;
    expect(metrics.totalRequests).toBe(1);
    expect(metrics.lastSuccessTime).not.toBeNull();
    expect(metrics.serviceName).toBe('metrics-test');
  });
});
