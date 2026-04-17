'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageNavBar } from '@/components/PageNavBar';
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Calendar,
  BarChart3,
  Target,
  ArrowRight,
  Share2,
} from 'lucide-react';
import type { WeeklyDigest, RankedSignal, WeeklyStats } from '@/lib/weekly-digest';

// ── helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function PnlBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-mono font-semibold tabular-nums ${
        positive ? 'text-emerald-400' : 'text-red-400'
      }`}
    >
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? '+' : ''}
      {value.toFixed(2)}%
    </span>
  );
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-500/15 text-zinc-400 text-xs font-bold">
        1
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-400/10 text-[var(--foreground)] text-xs font-bold">
        2
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-700/15 text-zinc-600 text-xs font-bold">
        3
      </span>
    );
  return (
    <span className="text-xs text-[var(--text-secondary)] font-mono w-7 text-center inline-block">
      {rank}
    </span>
  );
}

function DailyWinChart({ rates }: { rates: WeeklyStats['dailyWinRates'] }) {
  const max = Math.max(...rates, 1);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {rates.map((rate, i) => {
        const height = max > 0 ? (rate / 100) * 100 : 0;
        const color = rate >= 60 ? 'bg-emerald-500' : rate >= 50 ? 'bg-zinc-500' : rate > 0 ? 'bg-red-500' : 'bg-zinc-700';
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[9px] font-mono text-[var(--text-secondary)] tabular-nums">
              {rate > 0 ? `${rate}%` : '—'}
            </span>
            <div className="relative w-full h-16 rounded-sm bg-white/[0.03]">
              <div
                className={`absolute bottom-0 w-full rounded-sm ${color} transition-all duration-700`}
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="text-[9px] text-[var(--text-secondary)]">{DAY_LABELS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--glass-bg)] p-4">
      <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-2">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{sub}</div>}
    </div>
  );
}

function SignalRow({ signal }: { signal: RankedSignal }) {
  const dirColor = signal.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400';
  const dirBg = signal.direction === 'BUY' ? 'bg-emerald-400/10' : 'bg-red-400/10';
  const outcomeHit = signal.outcomes['24h']?.hit;

  return (
    <div className="flex items-center gap-3 py-3 px-4 border-b border-[var(--border)] last:border-b-0 hover:bg-white/[0.02] transition-colors">
      <RankMedal rank={signal.rank} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{signal.pair}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${dirBg} ${dirColor}`}>
            {signal.direction}
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] font-mono">{signal.timeframe}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--text-secondary)]">
          <span>Entry: {signal.entryPrice}</span>
          <span>Conf: {signal.confidence}%</span>
          <span>{formatDate(signal.timestamp)}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <PnlBadge value={signal.pnlPercent} />
          <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-mono tabular-nums">
            {signal.pnlPips > 0 ? '+' : ''}{signal.pnlPips} pips
          </div>
        </div>
        {outcomeHit !== undefined && (
          <div
            className={`w-2 h-2 rounded-full ${
              outcomeHit ? 'bg-emerald-400' : 'bg-red-400'
            }`}
          />
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-white/[0.04]" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-white/[0.04]" />
      <div className="h-40 rounded-lg bg-white/[0.04]" />
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

export default function WeeklyClient() {
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/weekly')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: WeeklyDigest) => setDigest(data))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load digest'))
      .finally(() => setLoading(false));
  }, []);

  const handleShare = async () => {
    if (!digest) return;
    const text = `Signal of the Week on TradeClaw\n\nWin Rate: ${digest.stats.winRate}%\nBest Pair: ${digest.stats.bestPair}\nTop Signal: ${digest.topSignals[0]?.pair} (${digest.topSignals[0]?.pnlPercent > 0 ? '+' : ''}${digest.topSignals[0]?.pnlPercent}%)\n\nhttps://tradeclaw.win/weekly`;
    if (navigator.share) {
      await navigator.share({ title: 'Signal of the Week', text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PageNavBar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-zinc-400" />
              Signal of the Week
            </h1>
            {digest && (
              <p className="text-sm text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(digest.weekStart)} — {formatDate(digest.weekEnd)}
              </p>
            )}
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-md px-3 py-1.5 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>

        {loading && <Skeleton />}

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            Failed to load weekly digest: {error}
          </div>
        )}

        {digest && !loading && (
          <div className="space-y-6">
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={BarChart3}
                label="Total Signals"
                value={String(digest.stats.totalSignals)}
              />
              <StatCard
                icon={Target}
                label="Win Rate"
                value={`${digest.stats.winRate}%`}
                sub={digest.stats.winRate >= 55 ? 'Above average' : 'Below average'}
              />
              <StatCard
                icon={TrendingUp}
                label="Best Pair"
                value={digest.stats.bestPair}
              />
              <StatCard
                icon={TrendingDown}
                label="Worst Pair"
                value={digest.stats.worstPair}
              />
            </div>

            {/* Daily win rate chart */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--glass-bg)] p-4">
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[var(--text-secondary)]" />
                Daily Win Rates
              </h2>
              <DailyWinChart rates={digest.stats.dailyWinRates} />
            </div>

            {/* Top 5 signals */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--glass-bg)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-zinc-400" />
                  Top 5 Signals
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Ranked by hit rate, then confidence
                </p>
              </div>
              {digest.topSignals.map(signal => (
                <SignalRow key={signal.id} signal={signal} />
              ))}
            </div>

            {/* CTA */}
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--glass-bg)] p-4">
              <div>
                <p className="text-sm font-semibold">Want real-time signals?</p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Avg confidence this week: {digest.stats.avgConfidence}%
                </p>
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Live Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
