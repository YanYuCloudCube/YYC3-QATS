/**
 * @file src/app/api/client.ts
 * @description YYC3 HTTP客户端和WebSocket管理器,提供统一的网络请求接口,支持超时、重试、心跳和自动重连
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags api,typescript,network,critical,public
 * @depends @/app/api/config
 */

/**
 * YYC-QATS HTTP Client & WebSocket Manager
 * ──────────────────────────────────────────
 * Provides:
 *   1. `httpClient` — fetch wrapper with timeout, retries, JSON envelope
 *   2. `YYCWebSocket` — managed WS with heartbeat, auto-reconnect, channel subscriptions
 *
 * All network calls go through this layer so we get:
 *   - Centralized error handling
 *   - Request/response logging (dev mode)
 *   - Automatic retry with exponential back-off
 *   - Request ID tracing
 */

import { apiConfig, currentEnv } from './config';

// ═══════════════════════════════════════
// §1  HTTP Client
// ═══════════════════════════════════════

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  /** If true, don't prepend apiBase */
  absoluteUrl?: boolean;
}

export interface HttpResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  headers: Headers;
  requestId: string;
  latency: number;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
    public requestId: string,
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
  }
}

let _requestCounter = 0;

function generateRequestId(): string {
  return `req_${Date.now()}_${(++_requestCounter).toString(36)}`;
}

/**
 * Core HTTP request function with retry & timeout.
 */
export async function httpRequest<T = unknown>(
  path: string,
  options: HttpRequestOptions = {},
): Promise<HttpResponse<T>> {
  const {
    method = 'GET',
    body,
    headers: extraHeaders = {},
    timeout = apiConfig.timeout,
    retries = apiConfig.maxRetries,
    absoluteUrl = false,
  } = options;

  const url = absoluteUrl ? path : `${apiConfig.apiBase}${path}`;
  const requestId = generateRequestId();
  const startTime = performance.now();

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-Id': requestId,
    'X-Client': 'yyc-qats-frontend',
    'X-Env': currentEnv,
  };

  const finalHeaders = { ...baseHeaders, ...extraHeaders };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      if (currentEnv === 'development' && attempt > 0) {
        console.log(`[HTTP] Retry #${attempt} for ${method} ${path}`);
      }

      const response = await fetch(url, {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Math.round(performance.now() - startTime);

      let data: T;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      if (!response.ok) {
        throw new HttpError(response.status, response.statusText, data, requestId);
      }

      if (currentEnv === 'development') {
        console.log(`[HTTP] ${method} ${path} → ${response.status} (${latency}ms)`);
      }

      return {
        ok: true,
        status: response.status,
        data,
        headers: response.headers,
        requestId,
        latency,
      };
    } catch (err: any) {
      lastError = err;

      // Don't retry on 4xx client errors (except 429 rate-limit)
      if (err instanceof HttpError && err.status >= 400 && err.status < 500 && err.status !== 429) {
        throw err;
      }

      // Don't retry on abort (user-initiated)
      if (err?.name === 'AbortError') {
        throw new HttpError(0, 'Request timeout', null, requestId);
      }

      // Wait before retry (exponential back-off)
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 10_000)));
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error('Unknown HTTP error');
}

/** Convenience GET */
export async function httpGet<T = unknown>(path: string, opts?: Omit<HttpRequestOptions, 'method' | 'body'>) {
  return httpRequest<T>(path, { ...opts, method: 'GET' });
}

/** Convenience POST */
export async function httpPost<T = unknown>(path: string, body?: unknown, opts?: Omit<HttpRequestOptions, 'method' | 'body'>) {
  return httpRequest<T>(path, { ...opts, method: 'POST', body });
}

// ═══════════════════════════════════════
// §2  WebSocket Manager
// ═══════════════════════════════════════

export type WSStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface WSMessage {
  type: string;
  channel?: string;
  data?: unknown;
  timestamp?: number;
}

export type WSMessageHandler = (msg: WSMessage) => void;
export type WSStatusHandler = (status: WSStatus) => void;

export class YYCWebSocket {
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private channels = new Set<string>();
  private messageHandlers = new Set<WSMessageHandler>();
  private statusHandlers = new Set<WSStatusHandler>();
  private _status: WSStatus = 'disconnected';
  private _lastPong: number = 0;
  private _messageCount: number = 0;
  private _isDestroyed = false;

  get status(): WSStatus { return this._status; }
  get lastPong(): number { return this._lastPong; }
  get messageCount(): number { return this._messageCount; }
  get subscribedChannels(): string[] { return [...this.channels]; }
  get isConnected(): boolean { return this._status === 'connected'; }

  constructor(private url: string = apiConfig.wsUrl) {}

  /** Connect to WebSocket server */
  connect(): void {
    if (this._isDestroyed) return;
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        this.startHeartbeat();

        // Re-subscribe to channels after reconnect
        this.channels.forEach(ch => {
          this.send({ type: 'subscribe', channel: ch });
        });

        if (currentEnv === 'development') {
          console.log(`[WS] Connected to ${this.url}`);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          this._messageCount++;

          if (msg.type === 'pong') {
            this._lastPong = Date.now();
            return;
          }

          this.messageHandlers.forEach(handler => {
            try { handler(msg); } catch (_e) { console.error('[WS] Handler error:', _e); }
          });
        } catch {
          // Non-JSON message, ignore
        }
      };

      this.ws.onclose = (event) => {
        this.stopHeartbeat();
        if (!this._isDestroyed) {
          if (currentEnv === 'development') {
            console.log(`[WS] Closed (code: ${event.code}, reason: ${event.reason})`);
          }
          this.attemptReconnect();
        } else {
          this.setStatus('disconnected');
        }
      };

      this.ws.onerror = () => {
        this.setStatus('error');
      };
    } catch (_err) {
      this.setStatus('error');
      this.attemptReconnect();
    }
  }

  /** Disconnect and clean up */
  disconnect(): void {
    this._isDestroyed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  /** Subscribe to a channel */
  subscribe(channel: string): void {
    this.channels.add(channel);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', channel });
    }
  }

  /** Unsubscribe from a channel */
  unsubscribe(channel: string): void {
    this.channels.delete(channel);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'unsubscribe', channel });
    }
  }

  /** Send a message */
  send(msg: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  /** Register message handler */
  onMessage(handler: WSMessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => { this.messageHandlers.delete(handler); };
  }

  /** Register status handler */
  onStatus(handler: WSStatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => { this.statusHandlers.delete(handler); };
  }

  private setStatus(s: WSStatus) {
    this._status = s;
    this.statusHandlers.forEach(h => {
      try { h(s); } catch { /* */ }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, apiConfig.wsHeartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private attemptReconnect() {
    if (this._isDestroyed || this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('error');
      return;
    }
    this.setStatus('reconnecting');
    this.reconnectAttempts++;
    const delay = Math.min(apiConfig.wsReconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30_000);
    if (currentEnv === 'development') {
      console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);
    }
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

// ═══════════════════════════════════════
// §3  Singleton WS Instance
// ═══════════════════════════════════════

const WS_KEY = '__YYC_WebSocket__';

export function getWebSocket(): YYCWebSocket {
  if (!(globalThis as any)[WS_KEY]) {
    (globalThis as any)[WS_KEY] = new YYCWebSocket();
  }
  return (globalThis as any)[WS_KEY];
}

export function destroyWebSocket(): void {
  const ws = (globalThis as any)[WS_KEY] as YYCWebSocket | undefined;
  if (ws) {
    ws.disconnect();
    delete (globalThis as any)[WS_KEY];
  }
}
