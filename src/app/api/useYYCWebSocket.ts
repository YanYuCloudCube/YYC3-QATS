/**
 * @file src/app/api/useYYCWebSocket.ts
 * @description YYC3 WebSocket React Hook,连接YYCWebSocket单例与React组件生命周期
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags api,react,typescript,websocket,public
 * @depends react,./client
 */

/**
 * useYYCWebSocket — React Hook for YYCWebSocket ↔ UI Bridging
 * ─────────────────────────────────────────────────────────────
 * Connects the YYCWebSocket singleton to React component lifecycle.
 * Provides:
 *   - Real-time WS status tracking
 *   - Channel subscription/unsubscription (auto-cleanup on unmount)
 *   - Typed message handler registration
 *   - Market stream integration (ticker, depth, kline)
 *   - Connection control (connect/disconnect)
 *
 * Usage:
 *   const { status, lastMessage, subscribe, connect, disconnect } = useYYCWebSocket();
 *   // or with auto-subscribe:
 *   const { messages } = useYYCWebSocket({ channels: ['market:BTC/USDT'], autoConnect: true });
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { getWebSocket, type WSStatus, type WSMessage } from './client';

// ═══════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════

export interface UseYYCWebSocketOptions {
  /** Channels to auto-subscribe on mount */
  channels?: string[];
  /** Auto-connect on mount (default: false) */
  autoConnect?: boolean;
  /** Message filter — only emit messages matching this type */
  messageFilter?: string | string[];
  /** Max messages to retain in buffer (default: 100) */
  bufferSize?: number;
}

export interface UseYYCWebSocketReturn {
  /** Current WebSocket connection status */
  status: WSStatus;
  /** Whether the WebSocket is currently connected */
  isConnected: boolean;
  /** Last received message (any channel) */
  lastMessage: WSMessage | null;
  /** Buffered messages (most recent first) */
  messages: WSMessage[];
  /** Total messages received since connection */
  messageCount: number;
  /** Currently subscribed channels */
  subscribedChannels: string[];
  /** Subscribe to a channel */
  subscribe: (channel: string) => void;
  /** Unsubscribe from a channel */
  unsubscribe: (channel: string) => void;
  /** Send a message */
  send: (msg: WSMessage) => void;
  /** Connect to WebSocket server */
  connect: () => void;
  /** Disconnect from WebSocket server */
  disconnect: () => void;
}

// ═══════════════════════════════════════
// §2  Market Stream Types
// ═══════════════════════════════════════

export interface WSTickerUpdate {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export interface WSDepthUpdate {
  symbol: string;
  bids: Array<[number, number]>;
  asks: Array<[number, number]>;
  timestamp: number;
}

export interface WSKLineUpdate {
  symbol: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  isClosed: boolean;
}

export interface WSTradeUpdate {
  symbol: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: number;
  tradeId: string;
}

// ═══════════════════════════════════════
// §3  Hook Implementation
// ═══════════════════════════════════════

export function useYYCWebSocket(options: UseYYCWebSocketOptions = {}): UseYYCWebSocketReturn {
  const {
    channels = [],
    autoConnect = false,
    messageFilter,
    bufferSize = 100,
  } = options;

  const [status, setStatus] = useState<WSStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>([]);

  const wsRef = useRef(getWebSocket());
  const filterRef = useRef(messageFilter);
  filterRef.current = messageFilter;

  // Status tracking
  useEffect(() => {
    const ws = wsRef.current;
    // Sync initial status
    setStatus(ws.status);
    setSubscribedChannels(ws.subscribedChannels);

    const unsubStatus = ws.onStatus((newStatus) => {
      setStatus(newStatus);
    });

    return () => { unsubStatus(); };
  }, []);

  // Message handling
  useEffect(() => {
    const ws = wsRef.current;

    const unsubMsg = ws.onMessage((msg) => {
      // Apply filter if specified
      const filter = filterRef.current;
      if (filter) {
        const allowed = Array.isArray(filter) ? filter : [filter];
        if (!allowed.includes(msg.type)) return;
      }

      setLastMessage(msg);
      setMessageCount(prev => prev + 1);
      setMessages(prev => {
        const next = [msg, ...prev];
        return next.length > bufferSize ? next.slice(0, bufferSize) : next;
      });
    });

    return () => { unsubMsg(); };
  }, [bufferSize]);

  // Auto-connect
  useEffect(() => {
    if (autoConnect) {
      wsRef.current.connect();
    }
  }, [autoConnect]);

  // Auto-subscribe channels
  useEffect(() => {
    const ws = wsRef.current;
    const toSubscribe = channels.filter(ch => !ws.subscribedChannels.includes(ch));

    for (const ch of toSubscribe) {
      ws.subscribe(ch);
    }

    setSubscribedChannels(ws.subscribedChannels);

    // Cleanup: unsubscribe channels that were added by this hook instance
    return () => {
      for (const ch of toSubscribe) {
        ws.unsubscribe(ch);
      }
    };
  }, [channels.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Callbacks
  const subscribe = useCallback((channel: string) => {
    wsRef.current.subscribe(channel);
    setSubscribedChannels(wsRef.current.subscribedChannels);
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    wsRef.current.unsubscribe(channel);
    setSubscribedChannels(wsRef.current.subscribedChannels);
  }, []);

  const send = useCallback((msg: WSMessage) => {
    wsRef.current.send(msg);
  }, []);

  const connect = useCallback(() => {
    wsRef.current.connect();
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current.disconnect();
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    lastMessage,
    messages,
    messageCount,
    subscribedChannels,
    subscribe,
    unsubscribe,
    send,
    connect,
    disconnect,
  };
}

// ═══════════════════════════════════════
// §4  Specialized Market Stream Hook
// ═══════════════════════════════════════

export interface UseMarketStreamOptions {
  /** Symbols to subscribe (e.g., ['BTC/USDT', 'ETH/USDT']) */
  symbols: string[];
  /** Stream types to subscribe (default: ['ticker']) */
  streams?: Array<'ticker' | 'depth' | 'kline' | 'trade'>;
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
}

export interface UseMarketStreamReturn {
  /** Current WS status */
  status: WSStatus;
  /** Latest ticker updates keyed by symbol */
  tickers: Record<string, WSTickerUpdate>;
  /** Latest depth snapshots keyed by symbol */
  depths: Record<string, WSDepthUpdate>;
  /** Latest kline updates keyed by symbol */
  klines: Record<string, WSKLineUpdate>;
  /** Recent trades (most recent first, max 50) */
  recentTrades: WSTradeUpdate[];
  /** Connection controls */
  connect: () => void;
  disconnect: () => void;
}

export function useMarketStream(options: UseMarketStreamOptions): UseMarketStreamReturn {
  const { symbols, streams = ['ticker'], autoConnect = true } = options;

  const [tickers, setTickers] = useState<Record<string, WSTickerUpdate>>({});
  const [depths, setDepths] = useState<Record<string, WSDepthUpdate>>({});
  const [klines, setKlines] = useState<Record<string, WSKLineUpdate>>({});
  const [recentTrades, setRecentTrades] = useState<WSTradeUpdate[]>([]);

  // Build channel names
  const channels = symbols.flatMap(sym =>
    streams.map(stream => `market:${stream}:${sym}`)
  );

  const { status, lastMessage, connect, disconnect } = useYYCWebSocket({
    channels,
    autoConnect,
    messageFilter: ['ticker', 'depth', 'kline', 'trade'],
  });

  // Route incoming messages to appropriate state
  useEffect(() => {
    if (!lastMessage) return;

    const { type, data } = lastMessage;
    if (!data || typeof data !== 'object') return;

    switch (type) {
      case 'ticker': {
        const ticker = data as WSTickerUpdate;
        if (ticker.symbol) {
          setTickers(prev => ({ ...prev, [ticker.symbol]: ticker }));
        }
        break;
      }
      case 'depth': {
        const depth = data as WSDepthUpdate;
        if (depth.symbol) {
          setDepths(prev => ({ ...prev, [depth.symbol]: depth }));
        }
        break;
      }
      case 'kline': {
        const kline = data as WSKLineUpdate;
        if (kline.symbol) {
          setKlines(prev => ({ ...prev, [kline.symbol]: kline }));
        }
        break;
      }
      case 'trade': {
        const trade = data as WSTradeUpdate;
        setRecentTrades(prev => {
          const next = [trade, ...prev];
          return next.length > 50 ? next.slice(0, 50) : next;
        });
        break;
      }
    }
  }, [lastMessage]);

  return { status, tickers, depths, klines, recentTrades, connect, disconnect };
}
