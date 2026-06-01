'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Crown, Share2, TrendingUp, Medal, ArrowRight, BarChart3 } from 'lucide-react';
import { BackgroundDecor } from '../../../components/background/BackgroundDecor';
import { PageNavBar } from '../../../components/PageNavBar';
import {
  getStrategyDisplayName,
  getStrategyDescription,
  computeCategoryWinners,
} from '../../../lib/strategy-comparison';

interface BreakdownRow {
  strategyId: string;
  totalSignals: number;
  resolvedSignals: number;
  hitRate24h: number;
  avgConfidence: number;
  avgPnl: number;
  avgRiskReward: number;
  sharpeRatio: number;
}

interface ApiResponse {
  period: string;
  rows: BreakdownRow[];
  generatedAt: string;
}

const PERIODS: { key: '7d' | '30d' | 'all'; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'all', label: 'All Time' },
];

function formatPnl(value: number) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function ComparisonClient() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Reset the spinner whenever the selected period changes before refetching.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/strategy-breakdown?period=${period}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  const winners = useMemo(() => {
    if (!data?.rows.length) return null;
    return computeCategoryWinners(data.rows);
  }, [data]);

  const share = async () => {
    const text = `TradeClaw Strategy Comparison — see which algorithm has the best win rate, risk:reward, and Sharpe ratio. ${window.location.origin}/strategies/comparison`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'TradeClaw Strategy Comparison', text, url: window.location.href });
        return;
      }
    } catch {
      // fall through
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // no-op
    }
  };

  const isWinner = (strategyId: string, category: keyof NonNullable<typeof winners>) => {
    return winners?.[category]?.strategyId === strategyId;
  };

  return (
    <div className="relative isolate min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <BackgroundDecor variant="dashboard" />
      <PageNavBar />

      <div className="relative mx-auto max-w-7xl px-4 py-6">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-6 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                <BarChart3 className="h-3.5 w-3.5" />
                Live performance comparison
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Strategy <span className="text-emerald-400">Comparison</span>
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                  Which TradeClaw strategy wins? Real tracked signals ranked by win rate, risk:reward ratio, and Sharpe ratio. Only resolved outcomes count.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/strategies/leaderboard"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/25"
              >
                Community Leaderboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={share}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)]/40 px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
                {copied ? 'Copied' : 'Share'}
              </button>
            </div>
          </div>

          {/* Period tabs */}
          <div className="mt-8 flex gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  period === p.key
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-emerald-500/20'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl bg-[var(--border)]/30" />
              ))}
            </div>
          )}

          {!loading && (!data || data.rows.length === 0) && (
            <div className="mt-12 text-center">
              <p className="text-[var(--text-secondary)]">No strategy data available yet.</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Outcomes are resolved as signals hit TP/SL or expire. Check back soon.
              </p>
            </div>
          )}

          {!loading && data && data.rows.length > 0 && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.rows.map((row) => {
                const name = getStrategyDisplayName(row.strategyId);
                const desc = getStrategyDescription(row.strategyId);
                const winRateColor =
                  row.hitRate24h >= 60 ? 'text-emerald-400' : row.hitRate24h >= 45 ? 'text-amber-400' : 'text-rose-400';
                const pnlColor = row.avgPnl >= 0 ? 'text-emerald-400' : 'text-rose-400';

                return (
                  <div
                    key={row.strategyId}
                    className="relative rounded-xl border border-[var(--border)] bg-[var(--background)]/60 p-5 transition-colors hover:border-emerald-500/20"
                  >
                    {/* Winner badges */}
                    <div className="absolute right-3 top-3 flex gap-1">
                      {isWinner(row.strategyId, 'winRate') && (
                        <span title="Best Win Rate" className="rounded-full bg-emerald-500/15 p-1 text-emerald-400">
                          <Crown className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {isWinner(row.strategyId, 'sharpe') && (
                        <span title="Best Sharpe" className="rounded-full bg-purple-500/15 p-1 text-purple-400">
                          <Medal className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {isWinner(row.strategyId, 'riskReward') && (
                        <span title="Best R:R" className="rounded-full bg-amber-500/15 p-1 text-amber-400">
                          <TrendingUp className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>

                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">{name}</h3>
                      {desc && (
                        <p className="mt-1 text-xs leading-4 text-[var(--text-secondary)]">{desc}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-[var(--glass-bg)] p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                          Signals
                        </p>
                        <p className="mt-1 text-xl font-bold">{row.totalSignals}</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          {row.resolvedSignals} resolved
                        </p>
                      </div>

                      <div className="rounded-lg bg-[var(--glass-bg)] p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                          Win Rate
                        </p>
                        <p className={`mt-1 text-xl font-bold ${winRateColor}`}>{row.hitRate24h}%</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">24h window</p>
                      </div>

                      <div className="rounded-lg bg-[var(--glass-bg)] p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                          Avg R:R
                        </p>
                        <p className="mt-1 text-xl font-bold text-[var(--foreground)]">
                          {row.avgRiskReward > 0 ? `${row.avgRiskReward}:1` : '—'}
                        </p>
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          risk:reward
                        </p>
                      </div>

                      <div className="rounded-lg bg-[var(--glass-bg)] p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                          Sharpe
                        </p>
                        <p className="mt-1 text-xl font-bold text-[var(--foreground)]">
                          {row.sharpeRatio !== 0 ? row.sharpeRatio : '—'}
                        </p>
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          mean / std dev
                        </p>
                      </div>

                      <div className="rounded-lg bg-[var(--glass-bg)] p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                          Avg P&L
                        </p>
                        <p className={`mt-1 text-xl font-bold ${pnlColor}`}>
                          {row.avgPnl !== 0 ? formatPnl(row.avgPnl) : '—'}
                        </p>
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          per resolved signal
                        </p>
                      </div>

                      <div className="rounded-lg bg-[var(--glass-bg)] p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                          Confidence
                        </p>
                        <p className="mt-1 text-xl font-bold text-[var(--foreground)]">
                          {row.avgConfidence}%
                        </p>
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          average
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
