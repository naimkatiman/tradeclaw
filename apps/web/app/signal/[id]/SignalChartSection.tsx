'use client';

import { useMemo } from 'react';
import { SignalChart } from '../../components/charts';
import { generateBars } from '../../lib/chart-utils';

interface SignalChartSectionProps {
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  direction: 'BUY' | 'SELL';
  timestamp: string;
}

export function SignalChartSection({
  entry,
  stopLoss,
  takeProfit1,
  takeProfit2,
  takeProfit3,
  direction,
  timestamp,
}: SignalChartSectionProps) {
  const ts = new Date(timestamp).getTime();
  const bars = useMemo(() => generateBars(entry, direction, ts), [entry, direction, ts]);
  const signalTime = bars[Math.min(30, bars.length - 1)]?.time;

  return (
    <div className="glass-card rounded-2xl p-4 mb-4">
      <div className="text-[11px] text-zinc-600 uppercase tracking-wider mb-3">Price Chart</div>
      <SignalChart
        bars={bars}
        direction={direction}
        entry={entry}
        stopLoss={stopLoss}
        takeProfit1={takeProfit1}
        takeProfit2={takeProfit2}
        takeProfit3={takeProfit3}
        signalTime={signalTime}
        height={360}
      />
    </div>
  );
}
