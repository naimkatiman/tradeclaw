'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Star,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart2,
  Activity,
} from 'lucide-react';
import type { ProofResponse, ProofSignal, ProofStats } from '../api/proof/route';

function StatCard({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-1">
      <span className="text-xs text-zinc-400 uppercase tracking-wider">{label}</span>
      <span
        className={`text-2xl font-bold ${
          positive === true
            ? 'text-emerald-400'
            : positive === false
            ? 'text-rose-400'
            : 'text-white'
        }`}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-zinc-500">{sub}</span>}
    </div>
  );
}

function OutcomeBadge({
  resolved,
  hit,
  price,
  pnlPct,
}: {
  resolved: boolean;
  hit: boolean | null;
  price: number | null;
  pnlPct: number | null;
}) {
  if (!resolved) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400">
        <Clock className="w-3 h-3" />
        Open
      </span>
    );
  }
  if (hit) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-900/60 text-emerald-400 font-medium">
          <CheckCircle2 className="w-3 h-3" />
          WIN
        </span>
        {price !== null && (
          <span className="text-[10px] text-emerald-500/70">
            @ {price.toFixed(price > 100 ? 2 : 5)}
          </span>
        )}
        {pnlPct !== null && (
          <span className="text-[10px] text-emerald-400">+{pnlPct.toFixed(2)}%</span>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-rose-900/60 text-rose-400 font-medium">
        <AlertCircle className="w-3 h-3" />
        LOSS
      </span>
      {price !== null && (
        <span className="text-[10px] text-rose-500/70">
          @ {price.toFixed(price > 100 ? 2 : 5)}
        </span>
      )}
      {pnlPct !== null && (
        <span className="text-[10px] text-rose-400">{pnlPct.toFixed(2)}%</span>
      )}
    </div>
  );
}

function SignalRow({ signal }: { signal: ProofSignal }) {
  const date = new Date(signal.timestamp);
  const isBuy = signal.direction === 'BUY';

  return (
    <tr className="border-b border-white/5 hover:bg-white/3 transition-colors">
      <td className="py-3 px-4 text-sm font-medium text-white whitespace-nowrap">
        {signal.pair}
        <span className="ml-1 text-[10px] text-zinc-500">{signal.timeframe}</span>
      </td>
      <td className="py-3 px-4">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
            isBuy
              ? 'bg-emerald-900/60 text-emerald-400'
              : 'bg-rose-900/60 text-rose-400'
          }`}
        >
          {isBuy ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {signal.direction}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-zinc-300">
        {signal.entryPrice > 100
          ? signal.entryPrice.toFixed(2)
          : signal.entryPrice.toFixed(5)}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${signal.confidence}%` }}
            />
          </div>
          <span className="text-xs text-zinc-300">{signal.confidence}%</span>
        </div>
      </td>
      <td className="py-3 px-4 text-xs text-zinc-400 whitespace-nowrap">
        {date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </td>
      <td className="py-3 px-4">
        <OutcomeBadge {...signal.outcome4h} />
      </td>
      <td className="py-3 px-4">
        <OutcomeBadge {...signal.outcome24h} />
      </td>
      <td className="py-3 px-4">
        <Link
          href={`/signal/${signal.pair}-${signal.timeframe}-${signal.direction}`}
          className="text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </td>
    </tr>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
        <Clock className="w-8 h-8 text-zinc-500" />
      </div>
      <div>
        <p className="text-zinc-300 font-medium">No real signals tracked yet</p>
        <p className="text-sm text-zinc-500 mt-1 max-w-xs">
          Real signals are recorded as users visit the dashboard. Seeded demo data is
          excluded. Check back after the live instance runs for a few hours.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}

export default function ProofClient() {
  const [data, setData] = useState<ProofResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'BUY' | 'SELL' | 'resolved' | 'open'>('all');
  const [sort, setSort] = useState<'newest' | 'confidence' | 'pnl'>('newest');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/proof');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = (await res.json()) as ProofResponse;
      setData(json);
      setError(null);
    } catch {
      setError('Failed to load proof data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredSignals = (data?.signals ?? []).filter((s) => {
    if (filter === 'BUY') return s.direction === 'BUY';
    if (filter === 'SELL') return s.direction === 'SELL';
    if (filter === 'resolved') return s.outcome4h.resolved || s.outcome24h.resolved;
    if (filter === 'open') return !s.outcome4h.resolved && !s.outcome24h.resolved;
    return true;
  });

  const sortedSignals = [...filteredSignals].sort((a, b) => {
    if (sort === 'confidence') return b.confidence - a.confidence;
    if (sort === 'pnl') {
      const pa = a.outcome24h.pnlPct ?? a.outcome4h.pnlPct ?? 0;
      const pb = b.outcome24h.pnlPct ?? b.outcome4h.pnlPct ?? 0;
      return pb - pa;
    }
    return b.timestamp - a.timestamp;
  });

  const stats: ProofStats | null = data?.stats ?? null;
  const hasRealData = stats !== null && stats.realSignals > 0;

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white pb-20">
      {/* Hero */}
      <div className="relative border-b border-white/10 bg-gradient-to-b from-zinc-900 to-[#0a0a0f]">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-900/60 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs uppercase tracking-widest text-emerald-400 font-medium">
              Signal Proof
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            Real Signal Performance
            <br />
            <span className="text-emerald-400">No Simulation.</span>
          </h1>
          <p className="mt-4 text-zinc-400 max-w-xl leading-relaxed">
            This page shows only live-tracked signals — recorded the moment they were
            generated from real market data. Seeded demo data is excluded. Outcome
            verification is candle-based: price hit TP1 or SL.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-sm font-medium"
            >
              <Star className="w-3.5 h-3.5" />
              Star on GitHub
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <StatCard
              label="Real Signals Tracked"
              value={String(stats.realSignals)}
              sub={`of ${stats.totalSignals} total (excl. seeded)`}
            />
            <StatCard
              label="Win Rate (24h)"
              value={hasRealData ? `${stats.winRate24h}%` : '—'}
              sub={hasRealData ? `4h: ${stats.winRate4h}%` : 'No resolved signals yet'}
              positive={hasRealData ? stats.winRate24h >= 50 : undefined}
            />
            <StatCard
              label="Avg P&L (24h)"
              value={hasRealData ? `${stats.runningPnlPct > 0 ? '+' : ''}${stats.runningPnlPct}%` : '—'}
              sub={`${stats.totalWins}W / ${stats.totalLosses}L`}
              positive={hasRealData ? stats.runningPnlPct > 0 : undefined}
            />
            <StatCard
              label="Avg Confidence"
              value={stats.avgConfidence > 0 ? `${stats.avgConfidence}%` : '—'}
              sub={`${stats.openSignals} signal${stats.openSignals !== 1 ? 's' : ''} still open`}
            />
          </div>
        )}

        {/* Methodology note */}
        <div className="mb-8 rounded-xl border border-zinc-500/20 bg-zinc-500/5 p-4 flex gap-3">
          <AlertCircle className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
          <div className="text-sm text-zinc-400 leading-relaxed">
            <span className="text-zinc-400 font-medium">Transparency note:</span> Signals
            are generated from real market data (Binance/Yahoo Finance) but outcomes
            are resolved against simulated candle replay when live price history is
            unavailable. &quot;Win&quot; = price reached TP1 before SL. Past accuracy does
            not guarantee future results.
          </div>
        </div>

        {/* Filters + Sort */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'BUY', 'SELL', 'resolved', 'open'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'All Signals' : f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Sort:</span>
            {(['newest', 'confidence', 'pnl'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${
                  sort === s
                    ? 'bg-zinc-700 text-white'
                    : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading && !data ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-rose-400">{error}</div>
        ) : !hasRealData ? (
          <EmptyState />
        ) : (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Pair
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Dir
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Entry
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      4h Result
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      24h Result
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedSignals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-zinc-500">
                        No signals match this filter.
                      </td>
                    </tr>
                  ) : (
                    sortedSignals.map((s) => <SignalRow key={s.id} signal={s} />)
                  )}
                </tbody>
              </table>
            </div>
            {sortedSignals.length > 0 && (
              <div className="border-t border-white/10 px-4 py-3 flex items-center justify-between text-xs text-zinc-500">
                <span>
                  Showing {sortedSignals.length} signal
                  {sortedSignals.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Updated {stats ? new Date(stats.lastUpdated).toLocaleTimeString() : '—'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Summary proof chain */}
        {hasRealData && stats && (
          <div className="mt-10 rounded-xl border border-white/10 bg-white/3 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              <h2 className="font-semibold text-white">Proof Chain Summary</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-zinc-500">Real signals</p>
                <p className="text-white font-medium">{stats.realSignals}</p>
              </div>
              <div>
                <p className="text-zinc-500">Resolved</p>
                <p className="text-white font-medium">{stats.resolvedSignals}</p>
              </div>
              <div>
                <p className="text-zinc-500">Still open</p>
                <p className="text-white font-medium">{stats.openSignals}</p>
              </div>
              <div>
                <p className="text-zinc-500">Win / Loss</p>
                <p className="font-medium">
                  <span className="text-emerald-400">{stats.totalWins}W</span>
                  <span className="text-zinc-500"> / </span>
                  <span className="text-rose-400">{stats.totalLosses}L</span>
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-zinc-500 leading-relaxed">
              All records above are sourced from{' '}
              <code className="text-zinc-300 bg-zinc-800 px-1 rounded">
                data/signal-history.json
              </code>{' '}
              where <code className="text-zinc-300 bg-zinc-800 px-1 rounded">isSimulated: false</code>.
              Outcome resolution uses candle-close prices via Binance OHLCV API.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 rounded-xl border border-emerald-500/20 bg-emerald-900/10 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-white">Like what you see?</p>
            <p className="text-sm text-zinc-400 mt-0.5">
              Star TradeClaw on GitHub and help us reach 1,000 stars.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/accuracy"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm"
            >
              <Minus className="w-3.5 h-3.5" />
              Accuracy Stats
            </Link>
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-sm font-medium"
            >
              <Star className="w-3.5 h-3.5" />
              Star on GitHub
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
