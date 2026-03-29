import { useState, useEffect, useRef } from 'react';

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

export function usePriceStream(pairs: string[]): {
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
<<<<<<< HEAD
  }, [pairsKey]); // eslint-disable-line react-hooks/exhaustive-deps
=======
  }, [pairsKey]);
>>>>>>> origin/main

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
<<<<<<< HEAD
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
=======
  }, []);
>>>>>>> origin/main

  return { signals, state };
}
