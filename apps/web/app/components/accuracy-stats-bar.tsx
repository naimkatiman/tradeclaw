'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AccuracyStats {
  totalSignals: number;
  resolved: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnlPct: number;
  avgPnlPct: number;
  avgConfidence: number;
  bestSignal: { pair: string; pnlPct: number } | null;
  streak: number;
}

function formatStreak(streak: number): string {
  if (streak === 0) return '0';
  if (streak > 0) return `${streak}W`;
  return `${Math.abs(streak)}L`;
}

function streakColor(streak: number): string {
  if (streak > 0) return 'text-emerald-400';
  if (streak < 0) return 'text-red-400';
  return 'text-zinc-400';
}

interface AccuracyStatsBarProps {
  /** If true, renders without the collapse toggle (for landing page use) */
  inline?: boolean;
}

export function AccuracyStatsBar({ inline = false }: AccuracyStatsBarProps) {
  const [stats, setStats] = useState<AccuracyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Try real win-rates API first (from signals.db outcome tracker)
        const res = await fetch('/api/v1/win-rates');
        if (res.ok) {
          const data = await res.json();
          if (data.overall && data.overall.total > 0) {
            setStats({
              totalSignals: data.overall.total,
              resolved: data.overall.total - (data.pending_signals ?? 0),
              wins: data.overall.wins ?? 0,
              losses: (data.overall.total ?? 0) - (data.overall.wins ?? 0),
              winRate: data.overall.win_rate ?? 0,
              totalPnlPct: 0,
              avgPnlPct: 0,
              avgConfidence: 0,
              bestSignal: data.win_rates?.[0]
                ? { pair: data.win_rates[0].symbol, pnlPct: data.win_rates[0].win_rate }
                : null,
              streak: 0,
            });
            return;
          }
        }
        // Fallback to old history API
        const res2 = await fetch('/api/signals/history?limit=1');
        if (!res2.ok) return;
        const data2 = await res2.json();
        setStats(data2.stats ?? null);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-white/[0.03] rounded w-full" />
      </div>
    );
  }

  if (!stats || stats.totalSignals === 0) {
    return (
      <div className="bg-[#0a0a0a] border border-white/5 rounded-xl px-5 py-4">
        <p className="text-xs text-zinc-600 font-mono text-center">
          No resolved signals yet — published 70%+ signals are checked against live market candles every hour.
        </p>
      </div>
    );
  }

  const content = (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-px bg-white/[0.03]">
      {/* Total Verified */}
      <div className="bg-[#0a0a0a] px-4 py-3 text-center">
        <div className="text-lg font-bold font-mono tabular-nums text-white tracking-tight">
          {stats.resolved}
        </div>
        <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">
          Signals Verified
        </div>
      </div>

      {/* Win Rate */}
      <div className="bg-[#0a0a0a] px-4 py-3 text-center">
        <div className={`text-lg font-bold font-mono tabular-nums tracking-tight ${
          stats.winRate >= 55 ? 'text-emerald-400' : stats.winRate >= 45 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {stats.winRate}%
        </div>
        <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">
          Win Rate
        </div>
      </div>

      {/* Avg Return */}
      <div className="bg-[#0a0a0a] px-4 py-3 text-center">
        <div className={`text-lg font-bold font-mono tabular-nums tracking-tight ${
          stats.avgPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {stats.avgPnlPct >= 0 ? '+' : ''}{stats.avgPnlPct}%
        </div>
        <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">
          Avg Return
        </div>
      </div>

      {/* Best Signal */}
      <div className="bg-[#0a0a0a] px-4 py-3 text-center">
        {stats.bestSignal ? (
          <>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-400 tracking-tight">
              {stats.bestSignal.pnlPct >= 0 ? '+' : ''}{stats.bestSignal.pnlPct}%
            </div>
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">
              Best · {stats.bestSignal.pair}
            </div>
          </>
        ) : (
          <>
            <div className="text-lg font-bold font-mono tabular-nums text-zinc-500 tracking-tight">—</div>
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">Best Signal</div>
          </>
        )}
      </div>

      {/* Streak */}
      <div className="bg-[#0a0a0a] px-4 py-3 text-center">
        <div className={`text-lg font-bold font-mono tabular-nums tracking-tight ${streakColor(stats.streak)}`}>
          {formatStreak(stats.streak)}
        </div>
        <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">
          Streak
        </div>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden">
        {content}
      </div>
    );
  }

  return (
    <section className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono font-medium">
          Accuracy Stats
        </span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
        )}
      </button>
      {expanded && content}
    </section>
  );
}
