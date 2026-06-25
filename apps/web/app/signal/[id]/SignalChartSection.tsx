'use client';

import { useMemo, useState } from 'react';
import { SignalChart } from '../../components/charts';
import { generateBars } from '../../lib/chart-utils';
import { TradingViewWidget } from '../../../components/tradingview-widget';

interface SignalChartSectionProps {
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number | null;
  takeProfit3: number | null;
  direction: 'BUY' | 'SELL';
  timestamp: string;
  pip?: number;
  symbol?: string;
}

export function SignalChartSection({
  entry,
  stopLoss,
  takeProfit1,
  takeProfit2,
  takeProfit3,
  direction,
  timestamp,
  pip = 0.01,
  symbol,
}: SignalChartSectionProps) {
  const ts = new Date(timestamp).getTime();
  const bars = useMemo(() => generateBars(entry, direction, ts), [entry, direction, ts]);
  const signalTime = bars[Math.min(30, bars.length - 1)]?.time;
  const [view, setView] = useState<'native' | 'tradingview'>('native');

  return (
    <div className="glass-card rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] text-zinc-600 uppercase tracking-wider">Price Chart</div>
        {symbol && (
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-[10px]">
            <button
              onClick={() => setView('native')}
              className={`rounded-full px-2.5 py-0.5 transition-colors ${
                view === 'native' ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Signal lines
            </button>
            <button
              onClick={() => setView('tradingview')}
              className={`rounded-full px-2.5 py-0.5 transition-colors ${
                view === 'tradingview' ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              TradingView
            </button>
          </div>
        )}
      </div>

      {view === 'native' || !symbol ? (
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
          pip={pip}
        />
      ) : (
        <TradingViewWidget symbol={symbol} interval="60" theme="dark" height={420} />
      )}
    </div>
  );
}
