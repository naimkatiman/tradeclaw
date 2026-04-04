import { useState, useEffect, useRef } from 'react';
import { useWebSocketPrices } from './use-websocket-prices';

export interface PriceTick {
  pair: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export interface StreamSignal {
  id: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  timestamp: number;
  reason: string;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';
export type PricesMap = Map<string, PriceTick>;

const BACKOFF_DELAYS = [1000, 2000, 5000, 10000, 30000];

/**
 * Live price stream with automatic WebSocket → SSE fallback.
 *
 * 1. Tries the ws-server (port 4000) for sub-second updates
 * 2. If WS fails to connect within 5s, falls back to SSE polling
 * 3. If WS disconnects later, SSE takes over seamlessly
 */
export function usePriceStream(pairs: string[]): {
  prices: PricesMap;
  state: ConnectionState;
} {
  const ws = useWebSocketPrices(pairs);
  const sse = useSsePriceStream(pairs);

  // WS is primary — use it when connected or still attempting first connect
  if (ws.state === 'connected') {
    return ws;
  }

  // While WS is connecting and SSE has data, show SSE data
  if (ws.state === 'connecting' && sse.prices.size > 0) {
    return sse;
  }

  // WS disconnected — fall back to SSE
  if (ws.state === 'disconnected') {
    return sse;
  }

  // Both connecting, no data yet
  return ws;
}

/**
 * SSE-based price stream (original implementation, now used as fallback).
 */
function useSsePriceStream(pairs: string[]): {
  prices: PricesMap;
  state: ConnectionState;
} {
  const [prices, setPrices] = useState<PricesMap>(new Map());
  const [state, setState] = useState<ConnectionState>('connecting');
  const retryRef = useRef(0);
  const esRef = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);
  const pairsKey = [...pairs].sort().join(',');

  useEffect(() => {
    mountedRef.current = true;
    retryRef.current = 0;

    function connect() {
      if (!mountedRef.current) return;

      esRef.current?.close();
      const url = `/api/prices/stream?pairs=${pairsKey}`;
      const es = new EventSource(url);
      esRef.current = es;
      setState('connecting');

      es.addEventListener('connected', () => {
        if (!mountedRef.current) { es.close(); return; }
        setState('connected');
        retryRef.current = 0;
      });

      es.addEventListener('price', (event: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const tick = JSON.parse(event.data) as PriceTick;
          setPrices(prev => new Map(prev).set(tick.pair, tick));
        } catch { /* ignore malformed events */ }
      });

      es.addEventListener('heartbeat', () => {
        if (!mountedRef.current) return;
        setState('connected');
      });

      es.onerror = () => {
        if (!mountedRef.current) { es.close(); return; }
        es.close();
        setState('disconnected');
        const delay = BACKOFF_DELAYS[Math.min(retryRef.current, BACKOFF_DELAYS.length - 1)];
        retryRef.current++;
        setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      esRef.current?.close();
    };
  }, [pairsKey]);

  return { prices, state };
}

export function useSignalStream(): {
  signals: StreamSignal[];
  state: ConnectionState;
} {
  const [signals, setSignals] = useState<StreamSignal[]>([]);
  const [state, setState] = useState<ConnectionState>('connecting');
  const retryRef = useRef(0);
  const esRef = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    retryRef.current = 0;

    function connect() {
      if (!mountedRef.current) return;

      esRef.current?.close();
      const es = new EventSource('/api/prices/stream');
      esRef.current = es;

      es.addEventListener('connected', () => {
        if (!mountedRef.current) { es.close(); return; }
        setState('connected');
        retryRef.current = 0;
      });

      es.addEventListener('signal', (event: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const sig = JSON.parse(event.data) as StreamSignal;
          setSignals(prev => [sig, ...prev].slice(0, 10));
        } catch { /* ignore */ }
      });

      es.addEventListener('heartbeat', () => {
        if (!mountedRef.current) return;
        setState('connected');
      });

      es.onerror = () => {
        if (!mountedRef.current) { es.close(); return; }
        es.close();
        setState('disconnected');
        const delay = BACKOFF_DELAYS[Math.min(retryRef.current, BACKOFF_DELAYS.length - 1)];
        retryRef.current++;
        setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      esRef.current?.close();
    };
  }, []);

  return { signals, state };
}
