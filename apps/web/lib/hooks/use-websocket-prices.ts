'use client';

import { useState, useEffect } from 'react';
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
  const pairsKey = [...pairs].sort().join(',');

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const sessionMap = new Map<string, { open: number; high: number; low: number }>();

    function connect() {
      if (!mounted) return;

      ws?.close();
      setState('connecting');

      const baseUrl = getWsUrl();
      ws = new WebSocket(`${baseUrl}/ws`);

      ws.onopen = () => {
        if (!mounted) { ws?.close(); return; }
        setState('connected');
        retryCount = 0;

        const symbols = pairsKey.split(',').filter(Boolean);
        if (symbols.length > 0) {
          ws!.send(JSON.stringify({ action: 'subscribe', symbols }));
        }
      };

      ws.onmessage = (event) => {
        if (!mounted) return;

        let msg: WsServerMessage;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        if (msg.type === 'tick') {
          const { symbol, mid, timestamp } = msg.data;

          let session = sessionMap.get(symbol);
          if (!session) {
            session = { open: mid, high: mid, low: mid };
            sessionMap.set(symbol, session);
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
        if (!mounted) return;
        setState('disconnected');
        const delay = BACKOFF_DELAYS[Math.min(retryCount, BACKOFF_DELAYS.length - 1)];
        retryCount++;
        retryTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose will fire after onerror, reconnect handled there
      };
    }

    connect();

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, [pairsKey]);

  return { prices, state };
}
