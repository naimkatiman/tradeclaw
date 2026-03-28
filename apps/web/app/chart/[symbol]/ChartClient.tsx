'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FullChart } from '../../components/charts';
import { generateBars } from '../../lib/chart-utils';
import { SYMBOLS } from '../../lib/signals';

interface ChartClientProps {
  symbol: string;
}

export default function ChartClient({ symbol }: ChartClientProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(symbol);
  const symbolConfig = SYMBOLS.find((s) => s.symbol === selectedSymbol) ?? SYMBOLS[0];

  // Capture timestamp once per symbol change to keep useMemo pure
  const tsRef = useRef(Date.now());
  useEffect(() => {
    tsRef.current = Date.now();
  }, [symbolConfig.basePrice]);

  const bars = useMemo(
    () => generateBars(symbolConfig.basePrice, 'BUY', tsRef.current, 120),
    [symbolConfig.basePrice],
  );

  // Avoid hydration mismatch — start with fallback, update after mount
  const [chartHeight, setChartHeight] = useState(600);
  useEffect(() => {
    setChartHeight(window.innerHeight - 72);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5 shrink-0">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-emerald-400">
                <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M10 2v10M3 7l7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
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
        />
      </div>
    </div>
  );
}
