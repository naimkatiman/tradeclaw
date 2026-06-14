'use client';

import { useEffect, useState } from 'react';
import { InfoHint } from '@/components/InfoHint';
import { classifyBandComparison } from '@/lib/band-comparison';

interface BandSummary {
  totalReturn: number;
  winRate: number;
  totalSignals: number;
  expectancyR: number | null;
  avgRWin: number | null;
  avgRLoss: number | null;
  breakEvenWinRate: number | null;
}

interface BandResponse {
  summary: BandSummary | null;
}

interface BandPair {
  all: BandSummary | null;
  premium: BandSummary | null;
}

interface Loaded {
  sevenDay: BandPair;
  allTime: BandPair | null;
}

/**
 * Trailing-7d callout: premium-band vs full-firehose side-by-side over the last
 * week, with an all-time context line so a single chop week can't stand in for
 * the long run. The filter only "pays its rent" when premium beats all-signals
 * on per-trade quality (win rate AND expectancy), not merely by trading less —
 * see classifyBandComparison.
 *
 * Four parallel summary-only GETs to /api/signals/equity (7d + all-time, each
 * band=all / band=premium). summaryOnly=1 skips the point payload.
 */
export function TrailingWeekBandCallout() {
  const [data, setData] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchSummary(period: string, band: string): Promise<BandSummary | null> {
      try {
        const res = await fetch(`/api/signals/equity?period=${period}&scope=pro&band=${band}&summaryOnly=1`);
        if (!res.ok) return null;
        const json = (await res.json()) as BandResponse;
        return json.summary;
      } catch {
        return null;
      }
    }
    async function load(): Promise<void> {
      try {
        const [all7, prem7, allAll, premAll] = await Promise.all([
          fetchSummary('7d', 'all'),
          fetchSummary('7d', 'premium'),
          fetchSummary('all', 'all'),
          fetchSummary('all', 'premium'),
        ]);
        if (cancelled) return;
        setData({
          sevenDay: { all: all7, premium: prem7 },
          allTime: allAll && premAll ? { all: allAll, premium: premAll } : null,
        });
      } finally {
        // Always clear loading (unless unmounted) so an unexpected throw can't
        // leave the callout stuck hidden with no recovery path.
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (!data?.sevenDay.all || !data.sevenDay.premium) return null;

  const a = data.sevenDay.all;
  const p = data.sevenDay.premium;
  const cmp = classifyBandComparison(a, p);
  const badgeTone =
    cmp.tone === 'positive'
      ? 'bg-emerald-500/15 text-emerald-400'
      : cmp.tone === 'neutral'
        ? 'bg-amber-500/15 text-amber-300'
        : 'bg-red-500/15 text-red-400';

  const allTime = data.allTime;
  const allTimeCmp = allTime?.all && allTime.premium
    ? classifyBandComparison(allTime.all, allTime.premium)
    : null;

  return (
    <section
      className="glass-card mb-4 rounded-2xl border-l-2 border-emerald-500/50 p-5"
      aria-label="Trailing 7-day premium vs all-signals comparison"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
            Last 7 Days — Premium Filter vs Full Firehose
            <InfoHint
              text="Side-by-side return of the premium band (confidence ≥ 85) versus all signals over the last 7 days. Premium only beats all when it picks better trades (higher win rate AND expectancy) — not when it merely trades less during a losing week."
              label="What this comparison shows"
            />
          </h3>
          <p className="mt-0.5 text-[11px] text-zinc-600">
            Same window, same sizing. A smaller loss from fewer trades is not the same as higher accuracy.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${badgeTone}`}
        >
          {cmp.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BandCard label="All signals" data={a} accent="zinc" />
        <BandCard label="Premium only (conf ≥ 85)" data={p} accent="emerald" />
      </div>

      {/* All-time context — the 7-day gap is regime-dependent; show the full
         record so a single chop week can't stand in for the long run. */}
      {allTime?.all && allTime.premium && allTimeCmp && (
        <p className="mt-3 text-[11px] font-mono text-zinc-500">
          <span className="uppercase tracking-wider text-zinc-600">All-time</span>{' '}
          All {allTime.all.totalReturn >= 0 ? '+' : ''}{allTime.all.totalReturn.toFixed(2)}%{' '}
          ({allTime.all.totalSignals.toLocaleString()} trades)
          {' · '}
          Premium {allTime.premium.totalReturn >= 0 ? '+' : ''}{allTime.premium.totalReturn.toFixed(2)}%{' '}
          ({allTime.premium.totalSignals.toLocaleString()} trades)
          {' — '}
          <span className={
            allTimeCmp.tone === 'positive' ? 'text-emerald-400'
            : allTimeCmp.tone === 'negative' ? 'text-red-400'
            : 'text-amber-300'
          }>
            {allTimeCmp.verdict === 'premium_better' ? 'filter ahead over the full record'
              : allTimeCmp.verdict === 'premium_fewer_trades' ? 'filter only ahead by trading less'
              : 'filter behind over the full record'}
          </span>
        </p>
      )}
    </section>
  );
}

interface BandCardProps {
  label: string;
  data: BandSummary;
  accent: 'zinc' | 'emerald';
}

function BandCard({ label, data, accent }: BandCardProps) {
  const border = accent === 'emerald' ? 'border-emerald-500/20' : 'border-white/[0.06]';
  const tone =
    data.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400';
  return (
    <div className={`rounded-lg border bg-white/[0.02] p-3 ${border}`}>
      <div className="mb-1 text-[9px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className={`font-mono text-2xl font-bold tabular-nums ${tone}`}>
        {data.totalReturn >= 0 ? '+' : ''}
        {data.totalReturn.toFixed(2)}%
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-2 text-[10px] font-mono text-zinc-500">
        <div>
          <div className="text-[8px] uppercase tracking-wider text-zinc-600">Win</div>
          <div
            className={
              data.breakEvenWinRate !== null
                ? data.winRate >= data.breakEvenWinRate
                  ? 'text-emerald-400'
                  : 'text-red-400'
                : 'text-zinc-300'
            }
          >
            {data.winRate.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-[8px] uppercase tracking-wider text-zinc-600">Trades</div>
          <div className="text-zinc-300">{data.totalSignals.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[8px] uppercase tracking-wider text-zinc-600">Exp.</div>
          <div className="text-zinc-300">
            {data.expectancyR !== null
              ? `${data.expectancyR >= 0 ? '+' : ''}${data.expectancyR.toFixed(2)}R`
              : '—'}
          </div>
        </div>
      </div>
      {/* Break-even context: a sub-50% win-rate with asymmetric R:R can still
         be profitable. Show the bar the win-rate is being judged against. */}
      <div className="mt-1.5 text-[9px] font-mono text-zinc-600">
        {data.breakEvenWinRate !== null
          ? `break-even ${data.breakEvenWinRate}% · 7d window`
          : 'break-even n/a · 7d window'}
      </div>
    </div>
  );
}
