/**
 * @file src/app/api/retry-cache.ts
 * @description YYC3 重试策略和请求缓存,提供指数退避重试和短期内存缓存
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags api,typescript,retry,cache,public
 * @depends
 */

/**
 * YYC-QATS Retry Policy & Request Cache
 * ──────────────────────────────────────
 * Phase 11 infrastructure:
 *   1. RetryPolicy — exponential backoff with jitter, per-service configurable
 *   2. RequestCache — short-lived in-memory cache for GET-like requests
 *      to prevent duplicate concurrent requests and reduce backend load
 *
 * Usage:
 *   import { retryWithBackoff, requestCache, getRetryPolicy } from './retry-cache';
 *
 *   // Direct retry
 *   const result = await retryWithBackoff(() => fetch(...), { maxRetries: 3 });
 *
 *   // Cache a request
 *   const data = await requestCache.getOrFetch('system.metrics', () => apiCall());
 */

// ═══════════════════════════════════════
// §1  Retry Policy
// ═══════════════════════════════════════

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 2, meaning up to 3 total tries) */
  maxRetries?: number;
  /** Base delay in ms before first retry (default: 500) */
  baseDelay?: number;
  /** Maximum delay in ms (cap) (default: 5000) */
  maxDelay?: number;
  /** Jitter factor (0–1, default: 0.3) — randomizes delay to avoid thundering herd */
  jitter?: number;
  /** Only retry on these error conditions (default: retry all) */
  retryOn?: (error: unknown) => boolean;
}

const DEFAULT_RETRY: Required<RetryOptions> = {
  maxRetries: 2,
  baseDelay: 500,
  maxDelay: 5000,
  jitter: 0.3,
  retryOn: () => true,
};

/**
 * Per-service retry configuration.
 * Services with higher risk (trade, arbitrage) get fewer retries.
 * Read-only services (market, risk) get more aggressive retry.
 */
const SERVICE_RETRY_POLICIES: Record<string, Partial<RetryOptions>> = {
  system:    { maxRetries: 2, baseDelay: 300 },
  trade:     { maxRetries: 1, baseDelay: 200, maxDelay: 2000 },   // lower retry — idempotency concern
  account:   { maxRetries: 2, baseDelay: 400 },
  strategy:  { maxRetries: 2, baseDelay: 400 },
  market:    { maxRetries: 3, baseDelay: 200, maxDelay: 3000 },   // high-frequency reads
  risk:      { maxRetries: 2, baseDelay: 300 },
  alert:     { maxRetries: 2, baseDelay: 400 },
  arbitrage: { maxRetries: 1, baseDelay: 200, maxDelay: 2000 },   // time-sensitive
};

/** Get the retry policy for a specific service */
export function getRetryPolicy(serviceName: string): Required<RetryOptions> {
  const custom = SERVICE_RETRY_POLICIES[serviceName] || {};
  return { ...DEFAULT_RETRY, ...custom };
}

/** Calculate delay with exponential backoff + jitter */
function calcDelay(attempt: number, opts: Required<RetryOptions>): number {
  const exponential = opts.baseDelay * Math.pow(2, attempt);
  const capped = Math.min(exponential, opts.maxDelay);
  const jitterRange = capped * opts.jitter;
  const jitterValue = Math.random() * jitterRange * 2 - jitterRange;
  return Math.max(0, capped + jitterValue);
}

/**
 * Execute a function with exponential backoff retries.
 * Returns the result on success, throws the last error on exhaustion.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts: Required<RetryOptions> = { ...DEFAULT_RETRY, ...options };

  let lastError: unknown;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= opts.maxRetries || !opts.retryOn(err)) {
        throw err;
      }
      const delay = calcDelay(attempt, opts);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// ═══════════════════════════════════════
// §2  Request Cache
// ═══════════════════════════════════════

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  /** Inflight promise for deduplication */
  inflight?: Promise<T>;
}

/** Default TTL for cached responses (10 seconds) */
const DEFAULT_CACHE_TTL = 10_000;

/** Per-service cache TTL overrides (ms) */
const SERVICE_CACHE_TTL: Record<string, number> = {
  system:   15_000,    // system metrics don't change rapidly
  market:   5_000,     // market data needs fresher reads
  risk:     10_000,
  alert:    8_000,
  account:  20_000,    // account info is relatively stable
  strategy: 15_000,
  arbitrage: 3_000,    // very time-sensitive
  trade:    5_000,
};

class RequestCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private inflightRequests = new Map<string, Promise<any>>();

  /**
   * Get cached data or fetch it.
   * Deduplicates concurrent requests for the same key.
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Check cache
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    // Check inflight — deduplicate concurrent identical requests
    const inflight = this.inflightRequests.get(key);
    if (inflight) {
      return inflight as Promise<T>;
    }

    // Execute and cache
    const effectiveTtl = ttl ?? this.getTtlForKey(key);
    const promise = fetcher().then(
      (data) => {
        this.cache.set(key, { data, expiresAt: Date.now() + effectiveTtl });
        this.inflightRequests.delete(key);
        return data;
      },
      (err) => {
        this.inflightRequests.delete(key);
        throw err;
      },
    );

    this.inflightRequests.set(key, promise);
    return promise;
  }

  /** Invalidate a specific cache entry */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /** Invalidate all entries matching a prefix (e.g., 'system.' clears all system cache) */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /** Clear entire cache */
  clear(): void {
    this.cache.clear();
    this.inflightRequests.clear();
  }

  /** Get cache stats for monitoring */
  getStats(): { size: number; keys: string[] } {
    // Clean expired
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key);
    }
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  private getTtlForKey(key: string): number {
    // Extract service name from key format "serviceName.method"
    const service = key.split('.')[0];
    return SERVICE_CACHE_TTL[service] ?? DEFAULT_CACHE_TTL;
  }
}

export const requestCache = new RequestCacheManager();

// ═══════════════════════════════════════
// §3  CB State Persistence (localStorage)
// ═══════════════════════════════════════

const CB_STATE_KEY = 'yyc_circuit_breaker_states';

export interface PersistedCBState {
  serviceName: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  consecutiveFailures: number;
  stateChangedAt: number;
}

/** Save all circuit breaker states to localStorage */
export function persistCBStates(states: PersistedCBState[]): void {
  try {
    localStorage.setItem(CB_STATE_KEY, JSON.stringify({
      timestamp: Date.now(),
      states,
    }));
  } catch { /* localStorage may be unavailable */ }
}

/** Restore circuit breaker states from localStorage */
export function restoreCBStates(): PersistedCBState[] | null {
  try {
    const raw = localStorage.getItem(CB_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Only restore if saved within last 5 minutes (after that, assume fresh start)
    if (Date.now() - parsed.timestamp > 5 * 60 * 1000) {
      localStorage.removeItem(CB_STATE_KEY);
      return null;
    }
    return parsed.states || null;
  } catch {
    return null;
  }
}

/** Clear persisted CB states */
export function clearPersistedCBStates(): void {
  try {
    localStorage.removeItem(CB_STATE_KEY);
  } catch { /* */ }
}

// ═══════════════════════════════════════
// §4  Expose to Console
// ═══════════════════════════════════════

if (typeof globalThis !== 'undefined') {
  (globalThis as any).requestCache = requestCache;
  (globalThis as any).getRetryPolicy = getRetryPolicy;
}
