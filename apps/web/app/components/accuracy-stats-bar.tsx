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
        const res = await fetch('/api/signals/history?limit=1');
        if (!res.ok) return;
        const data = await res.json();
        setStats(data.stats ?? null);
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
          No verified signals yet — signals are recorded and verified against real market data every hour.
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
