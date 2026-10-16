'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DataProvenanceBadge } from '@/components/data-provenance-badge';
import { InfoHint } from '@/components/InfoHint';
import { useLocale } from './locale-provider';
import { formatMessage } from '@/lib/product-i18n/format';
import {
  getDashboardEvidenceTranslations,
  type DashboardEvidenceTranslations,
} from '@/lib/product-i18n/dashboard-evidence';


interface AccuracyStats {
  totalSignals: number;
  resolved: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnlPct: number;
  avgPnlPct: number | null;
  avgConfidence: number;
  bestSignal: { pair: string; value: number; metric: 'winRate' | 'return' } | null;
  streak: number | null;
}

function formatStreak(streak: number, copy: DashboardEvidenceTranslations['accuracy']): string {
  if (streak === 0) return '0';
  if (streak > 0) return formatMessage(copy.streakWin, { count: streak });
  return formatMessage(copy.streakLoss, { count: Math.abs(streak) });
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
  const { locale } = useLocale();
  const copy = getDashboardEvidenceTranslations(locale).accuracy;
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
              avgPnlPct: null,
              avgConfidence: 0,
              bestSignal: data.win_rates?.[0]
                ? { pair: data.win_rates[0].symbol, value: data.win_rates[0].win_rate, metric: 'winRate' }
                : null,
              streak: null,
            });
            return;
          }
        }
        // Fallback to old history API
        const res2 = await fetch('/api/signals/history?limit=1');
        if (!res2.ok) return;
        const data2 = await res2.json();
        const legacyStats = data2.stats as (Omit<AccuracyStats, 'bestSignal'> & {
          bestSignal?: { pair: string; pnlPct: number } | null;
        }) | null | undefined;
        setStats(legacyStats
          ? {
              ...legacyStats,
              bestSignal: legacyStats.bestSignal
                ? { pair: legacyStats.bestSignal.pair, value: legacyStats.bestSignal.pnlPct, metric: 'return' }
                : null,
            }
          : null);
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
          {copy.noResolved}
        </p>
      </div>
    );
  }

  const content = (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-px bg-white/[0.03]">
      {/* OHLCV-resolved count */}
      <div className="bg-[#0a0a0a] px-4 py-3 text-center">
        <bdi dir="ltr" className="text-lg font-bold font-mono tabular-nums text-white tracking-tight">
          {stats.resolved}
        </bdi>
        <div className="text-[10px] text-zinc-600 uppercase tracking-wider rtl:normal-case rtl:tracking-normal mt-0.5 inline-flex items-center justify-center gap-1">
          {copy.resolved}
          <InfoHint text={copy.hints.resolved} label={copy.aria.resolvedHint} />
        </div>
      </div>

      {/* Win Rate */}
      <div className="bg-[#0a0a0a] px-4 py-3 text-center">
        <bdi dir="ltr" className={`text-lg font-bold font-mono tabular-nums tracking-tight ${
          stats.winRate >= 55 ? 'text-emerald-400' : stats.winRate >= 45 ? 'text-zinc-400' : 'text-red-400'
        }`}>
          {stats.winRate}%
        </bdi>
        <div className="text-[10px] text-zinc-600 uppercase tracking-wider rtl:normal-case rtl:tracking-normal mt-0.5 inline-flex items-center justify-center gap-1">
          {copy.winRate}
          <InfoHint text={copy.hints.winRate} label={copy.aria.winRateHint} />
        </div>
      </div>

      {/* Avg Return */}
      <div className="bg-[#0a0a0a] px-4 py-3 text-center">
        {stats.avgPnlPct == null ? (
          <div className="text-lg font-bold font-mono text-zinc-500 tracking-tight">—</div>
        ) : (
          <bdi dir="ltr" className={`text-lg font-bold font-mono tabular-nums tracking-tight ${
            stats.avgPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {stats.avgPnlPct >= 0 ? '+' : ''}{stats.avgPnlPct}%
          </bdi>
        )}
        <div className="text-[10px] text-zinc-600 uppercase tracking-wider rtl:normal-case rtl:tracking-normal mt-0.5 inline-flex items-center justify-center gap-1">
          {copy.averageReturn}
          <InfoHint text={copy.hints.averageReturn} label={copy.aria.averageReturnHint} />
        </div>
      </div>

      {/* Best Signal */}
      <div className="bg-[#0a0a0a] px-4 py-3 text-center">
        {stats.bestSignal ? (
          <>
            <bdi dir="ltr" className={`text-lg font-bold font-mono tabular-nums tracking-tight ${
              stats.bestSignal.metric === 'winRate'
                ? stats.bestSignal.value >= 55
                  ? 'text-emerald-400'
                  : stats.bestSignal.value >= 45
                    ? 'text-zinc-400'
                    : 'text-red-400'
                : stats.bestSignal.value >= 0
                  ? 'text-emerald-400'
                  : 'text-red-400'
            }`}>
              {stats.bestSignal.metric === 'return' && stats.bestSignal.value >= 0 ? '+' : ''}{stats.bestSignal.value}%
            </bdi>
            <bdi dir="auto" className="text-[10px] text-zinc-600 uppercase tracking-wider rtl:normal-case rtl:tracking-normal mt-0.5">
              {formatMessage(
                stats.bestSignal.metric === 'winRate' ? copy.bestWinRate : copy.bestReturn,
                { pair: stats.bestSignal.pair },
              )}
            </bdi>
          </>
        ) : (
          <>
            <div className="text-lg font-bold font-mono tabular-nums text-zinc-500 tracking-tight">—</div>
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider rtl:normal-case rtl:tracking-normal mt-0.5">{copy.bestSignal}</div>
          </>
        )}
      </div>

      {/* Streak */}
      <div className="bg-[#0a0a0a] px-4 py-3 text-center">
        {stats.streak == null ? (
          <div className="text-lg font-bold font-mono text-zinc-500 tracking-tight">—</div>
        ) : (
          <bdi dir="auto" className={`text-lg font-bold font-mono tabular-nums tracking-tight ${streakColor(stats.streak)}`}>
            {formatStreak(stats.streak, copy)}
          </bdi>
        )}
        <div className="text-[10px] text-zinc-600 uppercase tracking-wider rtl:normal-case rtl:tracking-normal mt-0.5 inline-flex items-center justify-center gap-1">
          {copy.streak}
          <InfoHint text={copy.hints.streak} label={copy.aria.streakHint} />
        </div>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden">
        <div className="flex justify-end px-3 pt-2">
          <DataProvenanceBadge source="win-rates" />
        </div>
        {content}
      </div>
    );
  }

  return (
    <section className="bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={expanded ? copy.aria.collapse : copy.aria.expand}
        className="w-full flex items-center justify-between px-5 py-3 text-start hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider rtl:normal-case rtl:tracking-normal font-mono font-medium flex items-center gap-2">
          {copy.title}
          <DataProvenanceBadge source="win-rates" />
        </span>
        {expanded ? (
          <ChevronUp aria-hidden="true" className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
        ) : (
          <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
        )}
      </button>
      {expanded && content}
    </section>
  );
}
