'use client';

import { useState, useEffect, useRef } from 'react';

// Minimal shape matching DashboardClient's signal type
interface SampleSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  timeframe: string;
  timestamp: string;
  source: string;
  _isSample: true;
}

/**
 * Returns sample demo signals after `timeoutMs` if `hasRealData` is still false.
 * Once real data arrives, clears the sample data automatically.
 */
export function useSampleData(hasRealData: boolean, timeoutMs = 2000): SampleSignal[] {
  const [samples, setSamples] = useState<SampleSignal[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hasRealData) {
      setSamples([]);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/demo/signals');
        if (!res.ok) return;
        const data = await res.json();
        const tagged = (data.signals ?? []).map((s: object) => ({
          ...s,
          _isSample: true as const,
        }));
        setSamples(tagged);
      } catch {
        // silent
      }
    }, timeoutMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasRealData, timeoutMs]);

  return samples;
}
