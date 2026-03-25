'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  performance?: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    sharpeRatio: number;
    totalPnl: number;
    avgWin: number;
    avgLoss: number;
    bestTrade: number;
    worstTrade: number;
    period: string;
  };
}

function StatBox({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500 uppercase">{label}</div>
    </div>
  );
}

function StrategyCard({ strategy }: { strategy: Strategy }) {
  const [expanded, setExpanded] = useState(false);
  const perf = strategy.performance;

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
              {strategy.isActive ? '● ACTIVE' : '○ PAUSED'}
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

      {/* Performance */}
      {perf && (
        <div className="bg-black/30 rounded-lg p-3 mb-3">
          <div className="text-xs text-gray-500 mb-2">Performance ({perf.period})</div>
          <div className="grid grid-cols-5 gap-2">
            <StatBox label="Win Rate" value={`${perf.winRate}%`} color={perf.winRate >= 60 ? 'text-emerald-400' : perf.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'} />
            <StatBox label="PF" value={perf.profitFactor.toFixed(1)} color={perf.profitFactor >= 2 ? 'text-emerald-400' : 'text-yellow-400'} />
            <StatBox label="Sharpe" value={perf.sharpeRatio.toFixed(2)} color={perf.sharpeRatio >= 2 ? 'text-emerald-400' : 'text-yellow-400'} />
            <StatBox label="Max DD" value={`${perf.maxDrawdown}%`} color={perf.maxDrawdown <= 10 ? 'text-emerald-400' : 'text-red-400'} />
            <StatBox label="P&L" value={`$${perf.totalPnl.toLocaleString()}`} color={perf.totalPnl > 0 ? 'text-emerald-400' : 'text-red-400'} />
          </div>
        </div>
      )}

      {/* Risk Config (expandable) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-500 hover:text-emerald-400 transition-colors"
      >
        {expanded ? '▾ Hide risk config' : '▸ Risk management'}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-3 gap-3 text-xs">
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
            <div className="font-mono text-yellow-400">{strategy.riskManagement.fibLevels.join(', ')}</div>
          </div>
          {perf && (
            <>
              <div>
                <div className="text-gray-500">Avg Win</div>
                <div className="font-mono text-emerald-400">${perf.avgWin.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-500">Avg Loss</div>
                <div className="font-mono text-red-400">${perf.avgLoss.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-500">Total Trades</div>
                <div className="font-mono text-white">{perf.totalTrades}</div>
              </div>
            </>
          )}
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
      .then(r => r.json())
      .then(data => {
        setStrategies(data.strategies);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const active = strategies.filter(s => s.isActive).length;
  const totalPnl = strategies.reduce((sum, s) => sum + (s.performance?.totalPnl || 0), 0);

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              <span className="text-emerald-400">Trade</span>Claw
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link>
              <Link href="/strategies" className="text-emerald-400">Strategies</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Strategy Builder</h1>
            <p className="text-sm text-gray-500 mt-1">
              {active} active strategies • ${totalPnl.toLocaleString()} total P&L
            </p>
          </div>
          <button className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm hover:bg-emerald-500/30 transition-colors">
            + New Strategy
          </button>
        </div>

        {/* Strategy List */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">
            <div className="animate-pulse text-4xl mb-4">⚙️</div>
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
