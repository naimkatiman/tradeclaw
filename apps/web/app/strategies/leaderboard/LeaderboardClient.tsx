'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Copy, Share2, Trophy, TrendingUp } from 'lucide-react';
import { BackgroundDecor } from '../../../components/background/BackgroundDecor';
import { PageNavBar } from '../../../components/PageNavBar';

interface StrategyPerformance {
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
}

interface Strategy {
  id: string;
  name: string;
  description: string;
  timeframes: string[];
  symbols: string[];
  isActive: boolean;
  performance?: StrategyPerformance;
}

function formatPnl(value: number) {
  return `${value >= 0 ? '+' : '-'}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function rankStrategies(strategies: Strategy[]) {
  return [...strategies]
    .filter((strategy) => strategy.performance)
    .sort((a, b) => {
      const ap = a.performance!;
      const bp = b.performance!;
      return (
        bp.sharpeRatio - ap.sharpeRatio ||
        bp.profitFactor - ap.profitFactor ||
        bp.winRate - ap.winRate ||
        bp.totalPnl - ap.totalPnl ||
        bp.totalTrades - ap.totalTrades
      );
    });
}

export function LeaderboardClient() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/strategies')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data) => setStrategies(data?.strategies ?? []))
      .catch(() => setStrategies([]))
      .finally(() => setLoading(false));
  }, []);

  const ranked = useMemo(() => rankStrategies(strategies), [strategies]);
  const unrankedCount = Math.max(0, strategies.length - ranked.length);

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((current) => (current === id ? null : current)), 1800);
    } catch {
      // no-op fallback
    }
  };

  const shareLeaderboard = async () => {
    const top = ranked[0];
    const text = top && top.performance
      ? `TradeClaw Strategy Leaderboard: #1 ${top.name} with a ${top.performance.sharpeRatio.toFixed(2)} Sharpe, ${top.performance.profitFactor.toFixed(1)} PF, and ${top.performance.winRate}% win rate. ${window.location.origin}/strategies/leaderboard`
      : `TradeClaw Strategy Leaderboard: public backtest rankings and community proof. ${window.location.origin}/strategies/leaderboard`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'TradeClaw Strategy Leaderboard',
          text,
          url: window.location.href,
        });
        return;
      }
    } catch {
      // fall through to copy
    }

    await copyText(text, 'leaderboard');
  };

  const shareStrategy = async (strategy: Strategy, rank: number) => {
    const perf = strategy.performance;
    if (!perf) return;

    const text = `#${rank} ${strategy.name} on TradeClaw — Sharpe ${perf.sharpeRatio.toFixed(2)}, PF ${perf.profitFactor.toFixed(1)}, Win Rate ${perf.winRate}%, P&L ${formatPnl(perf.totalPnl)}. ${window.location.origin}/strategies/leaderboard`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${strategy.name} — TradeClaw Leaderboard`,
          text,
          url: window.location.href,
        });
        return;
      }
    } catch {
      // fall through to copy
    }

    await copyText(text, strategy.id);
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
                <Trophy className="h-3.5 w-3.5" />
                Public proof board
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Strategy <span className="text-emerald-400">Leaderboard</span>
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                  Community-facing backtest rankings for the strongest TradeClaw strategies. We sort by Sharpe ratio first, then profit factor, win rate, and total P&L so the board stays risk-aware and easy to share.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/strategies"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/25"
              >
                Open Builder
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/strategies/marketplace"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)]/40 px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
              >
                Browse Marketplace
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
              >
                See Pro pricing
              </Link>
              <button
                onClick={shareLeaderboard}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)]/40 px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
              >
                {copied === 'leaderboard' ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
                {copied === 'leaderboard' ? 'Copied' : 'Share leaderboard'}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Ranking rule</div>
              <div className="mt-2 text-sm font-medium">Sharpe → PF → Win rate → P&L</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Shareability</div>
              <div className="mt-2 text-sm font-medium">One-click copy or native share for any strategy.</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">Conversion</div>
              <div className="mt-2 text-sm font-medium">Send winners straight into Builder or Marketplace.</div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="py-20 text-center text-sm text-[var(--text-secondary)]">
            <TrendingUp className="mx-auto mb-3 h-10 w-10 animate-pulse text-emerald-400/70" />
            Loading leaderboard...
          </div>
        ) : ranked.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-8 text-center text-sm text-[var(--text-secondary)]">
            No backtest results are available yet.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {unrankedCount > 0 && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--glass-bg)] px-4 py-3 text-xs text-[var(--text-secondary)]">
                {unrankedCount} strategy{unrankedCount === 1 ? '' : 'ies'} without backtest stats are excluded from the leaderboard.
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Ranked strategies</div>
                  <div className="text-sm font-semibold">Best risk-adjusted backtests on TradeClaw</div>
                </div>
                <div className="text-xs text-[var(--text-secondary)]">Sharpe-first sorting</div>
              </div>

              <div className="divide-y divide-[var(--border)]">
                {ranked.map((strategy, index) => {
                  const perf = strategy.performance!;
                  const rank = index + 1;
                  return (
                    <div key={strategy.id} className="grid gap-4 px-4 py-4 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-sm font-bold text-emerald-400">
                          #{rank}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold">{strategy.name}</h3>
                            {rank <= 3 && (
                              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                                Top {rank}
                              </span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${strategy.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-400'}`}>
                              {strategy.isActive ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          <p className="mt-1 max-w-xl text-sm text-[var(--text-secondary)]">{strategy.description}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-[var(--text-secondary)]">
                            {strategy.symbols.slice(0, 4).map((symbol) => (
                              <span key={symbol} className="rounded-full border border-[var(--border)] bg-[var(--background)]/40 px-2 py-0.5 font-mono">
                                {symbol}
                              </span>
                            ))}
                            {strategy.timeframes.map((timeframe) => (
                              <span key={timeframe} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-emerald-400">
                                {timeframe}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-5 md:text-left">
                        <div className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">Sharpe</div>
                          <div className="mt-1 font-mono text-sm font-semibold text-emerald-400">{perf.sharpeRatio.toFixed(2)}</div>
                        </div>
                        <div className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">PF</div>
                          <div className="mt-1 font-mono text-sm font-semibold">{perf.profitFactor.toFixed(2)}</div>
                        </div>
                        <div className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">Win Rate</div>
                          <div className="mt-1 font-mono text-sm font-semibold">{perf.winRate.toFixed(1)}%</div>
                        </div>
                        <div className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">P&L</div>
                          <div className="mt-1 font-mono text-sm font-semibold">{formatPnl(perf.totalPnl)}</div>
                        </div>
                        <div className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">Trades</div>
                          <div className="mt-1 font-mono text-sm font-semibold">{perf.totalTrades}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => shareStrategy(strategy, rank)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)]/40 px-4 py-2 text-sm font-semibold transition-colors hover:border-emerald-500/30 hover:text-emerald-400 md:justify-self-end"
                      >
                        {copied === strategy.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        {copied === strategy.id ? 'Copied' : 'Share'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
