'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Settings, Trophy } from 'lucide-react';
import { PageNavBar } from '../../components/PageNavBar';
import { BackgroundDecor } from '../../components/background/BackgroundDecor';

interface Strategy {
  id: string;
  name: string;
  description: string;
  indicators: { name: string; params: Record<string, number>; condition: string; weight: number }[];
  symbols: string[];
  timeframes: string[];
  riskManagement: {
    maxRiskPercent: number;
    leverage: number;
    maxOpenTrades: number;
    tpMode: string;
    slMode: string;
    fibLevels: number[];
  };
  isActive: boolean;
  createdAt: string;
}

function StrategyCard({ strategy }: { strategy: Strategy }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-gray-900/80 border rounded-xl p-5 transition-all ${
      strategy.isActive ? 'border-emerald-500/30 hover:border-emerald-500/50' : 'border-gray-800 hover:border-gray-700'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-white">{strategy.name}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              strategy.isActive
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gray-700/50 text-gray-500 border border-gray-700'
            }`}>
              {strategy.isActive ? '● EXAMPLE ON' : '○ EXAMPLE OFF'}
            </span>
          </div>
          <p className="text-sm text-gray-400">{strategy.description}</p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {strategy.symbols.map(s => (
          <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">{s}</span>
        ))}
        {strategy.timeframes.map(tf => (
          <span key={tf} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">{tf}</span>
        ))}
      </div>

      {/* Indicators */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-2">Indicators</div>
        <div className="space-y-1.5">
          {strategy.indicators.map((ind, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className="w-16 text-right">
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/60 rounded-full"
                    style={{ width: `${ind.weight * 100}%` }}
                  />
                </div>
              </div>
              <span className="font-mono text-emerald-400 w-24">{ind.name}</span>
              <span className="text-gray-500 truncate">{ind.condition}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Config (expandable) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-500 hover:text-emerald-400 transition-colors"
      >
        {expanded ? '▾ Hide risk config' : '▸ Risk management'}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-gray-500">Risk/Trade</div>
            <div className="font-mono text-white">{strategy.riskManagement.maxRiskPercent}%</div>
          </div>
          <div>
            <div className="text-gray-500">Leverage</div>
            <div className="font-mono text-white">1:{strategy.riskManagement.leverage}</div>
          </div>
          <div>
            <div className="text-gray-500">Max Trades</div>
            <div className="font-mono text-white">{strategy.riskManagement.maxOpenTrades}</div>
          </div>
          <div>
            <div className="text-gray-500">TP Mode</div>
            <div className="font-mono text-emerald-400">{strategy.riskManagement.tpMode}</div>
          </div>
          <div>
            <div className="text-gray-500">SL Mode</div>
            <div className="font-mono text-red-400">{strategy.riskManagement.slMode}</div>
          </div>
          <div>
            <div className="text-gray-500">Fib Levels</div>
            <div className="font-mono text-zinc-400">{strategy.riskManagement.fibLevels.join(', ')}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/strategies')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        setStrategies(data?.strategies ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const active = strategies.filter(s => s.isActive).length;

  return (
    <div className="relative isolate min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <BackgroundDecor variant="dashboard" />
      <PageNavBar />

      <div className="relative max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Strategy Definitions</h1>
            <p className="text-sm text-gray-500 mt-1">
              {strategies.length} preset definitions; {active} marked active in their example configuration
            </p>
          </div>
          <Link
            href="/strategy-builder"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm hover:bg-emerald-500/30 transition-colors"
          >
            Open Builder
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/15 text-emerald-400">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">See the public leaderboard</div>
                <p className="text-xs text-gray-400">
                  No measured backtest or live-execution results are connected yet, so no performance ranking is published.
                </p>
              </div>
            </div>
            <Link
              href="/strategies/leaderboard"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/30"
            >
              View leaderboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Strategy List */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">
            <Settings className="w-10 h-10 mx-auto mb-4 animate-pulse text-gray-500" />
            <div>Loading strategies...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {strategies.map(strat => (
              <StrategyCard key={strat.id} strategy={strat} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
