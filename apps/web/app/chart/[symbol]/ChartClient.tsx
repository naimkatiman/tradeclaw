'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { TradeClawLogo } from '../../../components/tradeclaw-logo';
import { FullChart } from '../../components/charts';
import { generateBars } from '../../lib/chart-utils';
import { SYMBOLS } from '../../lib/signals';

interface ChartClientProps {
  symbol: string;
}

export default function ChartClient({ symbol }: ChartClientProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(symbol);
  const symbolConfig = SYMBOLS.find((s) => s.symbol === selectedSymbol) ?? SYMBOLS[0];

  // Generate bars with a stable timestamp per symbol change
  const [ts, setTs] = useState(0);
  useEffect(() => {
    setTimeout(() => setTs(Date.now()), 0);
  }, [symbolConfig.basePrice]);

  const bars = useMemo(
    () => generateBars(symbolConfig.basePrice, 'BUY', ts, 120),
    [symbolConfig.basePrice, ts],
  );

  // Avoid hydration mismatch — start with fallback, update after mount
  const [chartHeight, setChartHeight] = useState(600);
  useEffect(() => {
    setTimeout(() => setChartHeight(window.innerHeight - 72), 0);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5 shrink-0">
              <TradeClawLogo className="h-4 w-4 shrink-0" id="chart" />
              <span className="text-sm font-semibold">Trade<span className="text-emerald-400">Claw</span></span>
            </Link>

            {/* Symbol selector */}
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            >
              {SYMBOLS.map((s) => (
                <option key={s.symbol} value={s.symbol} className="bg-zinc-900">
                  {s.symbol} — {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 font-mono">
              {symbolConfig.name}
            </span>
            <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Signals →
            </Link>
          </div>
        </div>
      </nav>

      {/* Chart */}
      <div className="flex-1 px-2 py-2">
        <FullChart
          symbol={selectedSymbol}
          bars={bars}
          height={chartHeight}
          pip={symbolConfig.pip}
        />
      </div>
    </div>
  );
}
