'use client';

import { useEffect, useState } from 'react';
import { InfoHint } from '@/components/InfoHint';

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

interface Loaded {
  all: BandSummary | null;
  premium: BandSummary | null;
}

/**
 * Trailing-7d callout: shows premium-band vs full-firehose side-by-side over
 * the last week. The whole point of the paid filter is the gap between these
 * two columns during chop. When premium ≥ all, the filter is paying its rent.
 *
 * Two parallel GETs to /api/signals/equity?period=7d with band=all and
 * band=premium. Lightweight enough to render above the main equity card.
 */
export function TrailingWeekBandCallout() {
  const [data, setData] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const [allRes, premRes] = await Promise.all([
          fetch('/api/signals/equity?period=7d&scope=pro&band=all'),
          fetch('/api/signals/equity?period=7d&scope=pro&band=premium'),
        ]);
        if (!allRes.ok || !premRes.ok) return;
        const allJson = (await allRes.json()) as BandResponse;
        const premJson = (await premRes.json()) as BandResponse;
        if (cancelled) return;
        setData({ all: allJson.summary, premium: premJson.summary });
      } catch {
        // silent — callout just hides
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (!data?.all || !data?.premium) return null;

  const a = data.all;
  const p = data.premium;
  const delta = +(p.totalReturn - a.totalReturn).toFixed(2);
  const filterPaidRent = delta > 0;

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
              text="Side-by-side return of the premium band (confidence ≥ 85) versus all signals over the last 7 days. The gap is what the paid filter is doing for you in the current market regime."
              label="What this comparison shows"
            />
          </h3>
          <p className="mt-0.5 text-[11px] text-zinc-600">
            Same window, same sizing. The gap shows what the high-confidence filter caught (or missed) this week.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${
            filterPaidRent
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-zinc-500/15 text-zinc-400'
          }`}
        >
          Premium {delta >= 0 ? '+' : ''}
          {delta.toFixed(2)}% vs All
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BandCard label="All signals" data={a} accent="zinc" />
        <BandCard label="Premium only (conf ≥ 85)" data={p} accent="emerald" />
      </div>
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
