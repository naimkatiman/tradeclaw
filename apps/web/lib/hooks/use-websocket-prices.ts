'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PriceTick, ConnectionState, PricesMap } from './use-price-stream';

interface NormalizedTick {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  timestamp: number;
  provider: string;
}

type WsServerMessage =
  | { type: 'tick'; data: NormalizedTick }
  | { type: 'subscribed'; symbols: string[] }
  | { type: 'unsubscribed'; symbols: string[] }
  | { type: 'error'; message: string };

const BACKOFF_DELAYS = [1000, 2000, 5000, 10000, 30000];

/**
 * Resolves the WebSocket server URL.
 * Priority: NEXT_PUBLIC_WS_URL env → auto-detect from window.location → localhost default.
 */
function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.hostname}:4000`;
  }
  return 'ws://localhost:4000';
}

/**
 * Connect to the TradeClaw ws-server for real-time price streaming.
 * Maps NormalizedTick (bid/ask/mid) → PriceTick (price/change24h/high24h/low24h)
 * by tracking session high/low/open client-side.
 */
export function useWebSocketPrices(pairs: string[]): {
  prices: PricesMap;
  state: ConnectionState;
} {
  const [prices, setPrices] = useState<PricesMap>(new Map());
  const [state, setState] = useState<ConnectionState>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const mountedRef = useRef(true);
  const pairsKey = [...pairs].sort().join(',');

  // Track session open/high/low per symbol for change calculation
  const sessionRef = useRef<Map<string, { open: number; high: number; low: number }>>(new Map());

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    wsRef.current?.close();
    setState('connecting');

    const baseUrl = getWsUrl();
    const ws = new WebSocket(`${baseUrl}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      setState('connected');
      retryRef.current = 0;

      // Subscribe to requested pairs
      const symbols = pairsKey.split(',').filter(Boolean);
      if (symbols.length > 0) {
        ws.send(JSON.stringify({ action: 'subscribe', symbols }));
      }
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;

      let msg: WsServerMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === 'tick') {
        const { symbol, mid, timestamp } = msg.data;

        // Update session tracking
        let session = sessionRef.current.get(symbol);
        if (!session) {
          session = { open: mid, high: mid, low: mid };
          sessionRef.current.set(symbol, session);
        }
        if (mid > session.high) session.high = mid;
        if (mid < session.low) session.low = mid;

        const change24h = session.open > 0
          ? ((mid - session.open) / session.open) * 100
          : 0;

        const tick: PriceTick = {
          pair: symbol,
          price: mid,
          change24h,
          high24h: session.high,
          low24h: session.low,
          timestamp,
        };

        setPrices(prev => new Map(prev).set(symbol, tick));
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setState('disconnected');
      const delay = BACKOFF_DELAYS[Math.min(retryRef.current, BACKOFF_DELAYS.length - 1)];
      retryRef.current++;
      setTimeout(connect, delay);
    };

    ws.onerror = () => {
      // onclose will fire after onerror, reconnect handled there
    };
  }, [pairsKey]);

  useEffect(() => {
    mountedRef.current = true;
    retryRef.current = 0;
    sessionRef.current.clear();
    connect();

    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
    };
  }, [connect]);

  return { prices, state };
}
