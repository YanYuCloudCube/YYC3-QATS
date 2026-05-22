import { describe, expect, it, vi } from 'vitest';

import { debounce, memoize, throttle } from '@/app/utils/performance';

describe('performance utils', () => {
  describe('memoize', () => {
    it('should cache results for same arguments', () => {
      let calls = 0;
      const fn = (a: number, b: number) => {
        calls++;
        return a + b;
      };
      const memoized = memoize(fn);

      expect(memoized(1, 2)).toBe(3);
      expect(memoized(1, 2)).toBe(3);
      expect(calls).toBe(1);
    });

    it('should call again for different arguments', () => {
      let calls = 0;
      const fn = (a: number) => {
        calls++;
        return a * 2;
      };
      const memoized = memoize(fn);

      expect(memoized(1)).toBe(2);
      expect(memoized(2)).toBe(4);
      expect(calls).toBe(2);
    });

    it('should respect TTL expiration', () => {
      vi.useFakeTimers();
      let calls = 0;
      const fn = (x: number) => {
        calls++;
        return x;
      };
      const memoized = memoize(fn, { ttl: 100 });

      expect(memoized(1)).toBe(1);
      expect(calls).toBe(1);

      vi.advanceTimersByTime(101);
      expect(memoized(1)).toBe(1);
      expect(calls).toBe(2);

      vi.useRealTimers();
    });

    it('should evict entries when maxSize exceeded (LRU)', () => {
      const fn = (x: number) => x * 10;
      const memoized = memoize(fn, { maxSize: 2 });

      memoized(1);
      memoized(2);
      memoized(3);

      const cache = memoized.cache;
      expect(cache.size).toBeLessThanOrEqual(2);
    });

    it('should support clear()', () => {
      let calls = 0;
      const fn = (x: number) => { calls++; return x; };
      const memoized = memoize(fn);

      memoized(1);
      expect(calls).toBe(1);
      memoized.clear();
      memoized(1);
      expect(calls).toBe(2);
    });
  });

  describe('debounce', () => {
    it('should delay execution', () => {
      vi.useFakeTimers();
      let value = 0;
      const fn = debounce((x: number) => { value = x; }, 100);

      fn(1);
      fn(2);
      fn(3);

      expect(value).toBe(0);
      vi.advanceTimersByTime(100);
      expect(value).toBe(3);

      vi.useRealTimers();
    });

    it('should support cancel', () => {
      vi.useFakeTimers();
      let value = 0;
      const fn = debounce((x: number) => { value = x; }, 100);

      fn(1);
      fn.cancel();
      vi.advanceTimersByTime(200);
      expect(value).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('throttle', () => {
    it('should limit execution rate', () => {
      vi.useFakeTimers();
      const values: number[] = [];
      const fn = throttle((x: number) => { values.push(x); }, 100);

      fn(1);
      fn(2);
      fn(3);

      expect(values.length).toBeLessThanOrEqual(2);
      vi.useRealTimers();
    });
  });
});
