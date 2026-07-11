/**
 * ProofHero — the finding, stated and rendered.
 *
 * Left: the claim in display type with the live cost-adjusted numbers pulled
 * from /api/signals/equity?summaryOnly=1 (the same source of truth as the
 * track-record page — nothing here is hardcoded or can drift). Right: the
 * Cost Field, a WebGL rendering of every resolved sized trade where applying
 * each trade's real recorded cost sinks the cloud below zero.
 *
 * Impeccable makeover 2026-07-11. See PRODUCT.md ("data is the imagery",
 * "the finding is the brand") and docs/plans/2026-07-11-impeccable-3d-
 * makeover-and-research-value.md.
 */

import { CostFieldHero } from './cost-field/CostFieldHero';

const GITHUB_URL = 'https://github.com/naimkatiman/tradeclaw';

interface EquitySummary {
  totalReturn: number;
  maxDrawdown: number;
  winRate: number;
  totalSignals: number;
  sizedTrades?: number;
  expectancyR: number | null;
  netExpectancyR?: number | null;
  breakEvenWinRate: number | null;
  roundTripCostPct?: number;
  avgCostR?: number | null;
}

async function fetchEquitySummary(): Promise<EquitySummary | null> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${base}/api/signals/equity?summaryOnly=1&scope=pro`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.summary ?? null) as EquitySummary | null;
  } catch {
    return null;
  }
}

function signed(value: number, unit: string): string {
  return `${value >= 0 ? '+' : '−'}${Math.abs(value)}${unit}`;
}

function LedgerItem({
  label,
  value,
  detail,
  negative = false,
}: {
  label: string;
  value: string;
  detail?: string;
  negative?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 py-3 pr-5">
      <dt className="text-[11px] leading-tight text-[var(--text-secondary)]">{label}</dt>
      <dd
        className={`font-mono text-base font-semibold tabular-nums leading-none ${
          negative ? 'text-[var(--color-down)]' : 'text-[var(--foreground)]'
        }`}
      >
        {value}
      </dd>
      {detail && (
        <dd className="text-[11px] leading-tight text-[var(--text-secondary)]">{detail}</dd>
      )}
    </div>
  );
}

export async function ProofHero() {
  const eq = await fetchEquitySummary();
  const trades = eq?.sizedTrades ?? eq?.totalSignals;

  return (
    <section data-testid="proof-hero" className="mx-auto max-w-6xl px-4 pt-6">
      <div className="grid items-stretch gap-10 lg:grid-cols-12">
        {/* The claim */}
        <div className="flex flex-col justify-center lg:col-span-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Open-source trading transparency
          </p>
          <h1 className="font-display mt-4 text-[clamp(2.75rem,6.5vw,5rem)] font-bold uppercase leading-[0.92] tracking-tight">
            We measured
            <br />
            the edge.
            <br />
            <span className="text-[var(--color-down)]">There isn&apos;t one.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
            TradeClaw runs a real signal engine and charges every sized trade its
            real execution cost. After costs, net expectancy is negative:
            short-term timing loses what it costs to trade. The engine, the
            {' '}{trades ? trades.toLocaleString('en-US') : ''} recorded trades, and
            this conclusion are free for anyone to check, fork, and reuse.
          </p>

          {eq ? (
            <dl className="mt-7 grid grid-cols-2 gap-x-2 divide-y divide-[var(--border)] border-y border-[var(--border)] sm:grid-cols-2">
              <LedgerItem
                label="net expectancy / trade, after cost"
                value={eq.netExpectancyR != null ? signed(eq.netExpectancyR, 'R') : '—'}
                negative={eq.netExpectancyR != null && eq.netExpectancyR < 0}
              />
              <LedgerItem
                label="total return, 1% risk compounded"
                value={signed(eq.totalReturn, '%')}
                negative={eq.totalReturn < 0}
              />
              <LedgerItem
                label="avg round-trip cost / trade"
                value={eq.avgCostR != null ? `${eq.avgCostR}R` : '—'}
                detail={eq.roundTripCostPct != null ? `≈ ${eq.roundTripCostPct}% of notional` : undefined}
              />
              <LedgerItem
                label="win rate vs break-even needed"
                value={
                  eq.breakEvenWinRate != null
                    ? `${eq.winRate}% / ${eq.breakEvenWinRate}%`
                    : `${eq.winRate}%`
                }
              />
            </dl>
          ) : (
            <p className="mt-7 border-y border-[var(--border)] py-3 text-sm text-[var(--text-secondary)]">
              The live cost-adjusted result loads on the{' '}
              <a href="/track-record" className="underline hover:text-[var(--foreground)]">
                track record
              </a>
              .
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="/track-record"
              className="group flex items-center gap-2.5 rounded-[var(--radius-pill)] bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]"
            >
              See the full track record
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a
              href="/research"
              className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border)] px-6 py-3 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--glass-border-accent)] hover:text-[var(--foreground)]"
            >
              What we tested and killed
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[var(--text-secondary)] underline decoration-[var(--border)] underline-offset-4 transition-colors duration-200 hover:text-[var(--foreground)]"
            >
              Source on GitHub
            </a>
          </div>
        </div>

        {/* The evidence */}
        <div className="relative min-h-[340px] lg:col-span-7 lg:min-h-[520px]">
          <CostFieldHero />
        </div>
      </div>
    </section>
  );
}
