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
import { AnimatedNumber } from '../motion/animated-number';
import { Magnetic } from '../motion/magnetic';

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

/** Fraction digits of an API-rounded value, so count-ups land exactly on it. */
function fractionDigits(value: number): number {
  const decimals = String(value).split('.')[1];
  return Math.min(decimals?.length ?? 0, 4);
}

function LedgerItem({
  label,
  value,
  detail,
  negative = false,
}: {
  label: string;
  value: React.ReactNode;
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
  const trades = eq?.sizedTrades ?? eq?.totalSignals ?? 0;
  const hasMeasuredTrades = trades > 0;
  const ledgerState = !eq
    ? 'unavailable'
    : !hasMeasuredTrades
      ? 'empty'
      : eq.netExpectancyR == null
        ? 'indeterminate'
        : eq.netExpectancyR < 0
          ? 'negative'
          : 'nonnegative';

  return (
    <section data-testid="proof-hero" className="mx-auto max-w-6xl px-4 pt-6">
      <div className="grid items-stretch gap-10 lg:grid-cols-12">
        {/* The claim */}
        <div className="flex flex-col justify-center lg:col-span-5">
          <p className="animate-fade-up font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            Public reference finding · open-source transparency
          </p>
          {/* The page's one orchestrated load entrance (DESIGN.md Motion):
              headline lands line by line, the finding last. */}
          <h1 className="font-display mt-4 text-[clamp(2.75rem,6.5vw,5rem)] font-bold uppercase leading-[0.92] tracking-tight">
            <span className="animate-fade-up fade-delay-1 block">We measured</span>
            <span className="animate-fade-up fade-delay-2 block">the edge.</span>
            <span className="animate-fade-up fade-delay-3 block">
              There isn&apos;t one.
            </span>
          </h1>
          <p className="animate-fade-up fade-delay-3 mt-5 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
            {ledgerState === 'negative' ? (
              <>
                TradeClaw runs a real signal engine and charges every sized trade
                its real execution cost. After costs, this environment&apos;s net
                expectancy is negative: short-term timing loses what it costs to
                trade. The engine, its {trades.toLocaleString('en-US')} recorded
                position-sized trades, and this measured finding are free for
                anyone to check, fork, and reuse.
              </>
            ) : ledgerState === 'nonnegative' ? (
              <>
                TradeClaw runs a real signal engine and charges every sized trade
                its real execution cost. This environment&apos;s{' '}
                {trades.toLocaleString('en-US')} recorded trades currently report
                non-negative net expectancy after cost. The ledger shows that
                result as-is; it does not substitute the public reference result.
                The engine, cost model, and reported result are free for anyone to
                check, fork, and reuse.
              </>
            ) : ledgerState === 'indeterminate' ? (
              <>
                This environment has {trades.toLocaleString('en-US')} recorded
                trades, but not enough sized win/loss evidence to compute net
                expectancy after cost. The ledger reports the available evidence
                as-is; no reference or placeholder values are substituted. The
                engine and cost model remain free for anyone to check, fork, and
                reuse.
              </>
            ) : ledgerState === 'empty' ? (
              <>
                The headline states TradeClaw&apos;s public reference finding. This
                environment does not yet have the resolved, position-sized trades
                needed to recompute it. The engine, cost model, and methodology
                remain free for anyone to check, fork, and reuse.
              </>
            ) : (
              <>
                The headline states TradeClaw&apos;s public reference finding. This
                environment&apos;s live ledger is temporarily unavailable, so it
                cannot recompute the result right now. The engine, cost model, and
                methodology remain free for anyone to check, fork, and reuse.
              </>
            )}
          </p>

          {eq && hasMeasuredTrades ? (
            <dl className="animate-fade-up fade-delay-4 mt-7 grid grid-cols-2 gap-x-2 divide-y divide-[var(--border)] border-y border-[var(--border)] sm:grid-cols-2">
              <LedgerItem
                label="net expectancy / trade, after cost"
                value={
                  eq.netExpectancyR != null ? (
                    <AnimatedNumber
                      value={eq.netExpectancyR}
                      decimals={fractionDigits(eq.netExpectancyR)}
                      signed
                      suffix="R"
                    />
                  ) : (
                    '—'
                  )
                }
                negative={eq.netExpectancyR != null && eq.netExpectancyR < 0}
              />
              <LedgerItem
                label="total return, 1% risk compounded"
                value={
                  <AnimatedNumber
                    value={eq.totalReturn}
                    decimals={fractionDigits(eq.totalReturn)}
                    signed
                    suffix="%"
                  />
                }
                negative={eq.totalReturn < 0}
              />
              <LedgerItem
                label="avg round-trip cost / trade"
                value={
                  eq.avgCostR != null ? (
                    <AnimatedNumber
                      value={eq.avgCostR}
                      decimals={fractionDigits(eq.avgCostR)}
                      suffix="R"
                    />
                  ) : (
                    '—'
                  )
                }
                detail={eq.roundTripCostPct != null ? `≈ ${eq.roundTripCostPct}% of notional` : undefined}
              />
              <LedgerItem
                label="win rate vs break-even needed"
                value={
                  eq.breakEvenWinRate != null ? (
                    <>
                      <AnimatedNumber
                        value={eq.winRate}
                        decimals={fractionDigits(eq.winRate)}
                        suffix="%"
                      />
                      {' / '}
                      <AnimatedNumber
                        value={eq.breakEvenWinRate}
                        decimals={fractionDigits(eq.breakEvenWinRate)}
                        suffix="%"
                      />
                    </>
                  ) : (
                    <AnimatedNumber
                      value={eq.winRate}
                      decimals={fractionDigits(eq.winRate)}
                      suffix="%"
                    />
                  )
                }
              />
            </dl>
          ) : (
            <p
              className="animate-fade-up fade-delay-4 mt-7 border-y border-[var(--border)] py-3 text-sm text-[var(--text-secondary)]"
              data-testid="proof-ledger-empty"
            >
              {eq
                ? 'No resolved, position-sized trades are available in this environment yet. '
                : 'The live cost-adjusted ledger is temporarily unavailable. '}
              Inspect the{' '}
              <a href="/track-record" className="underline hover:text-[var(--foreground)]">
                full track record
              </a>
              {' '}or the{' '}
              <a
                href="/api/signals/equity?summaryOnly=1&scope=pro"
                className="underline hover:text-[var(--foreground)]"
              >
                raw summary
              </a>{' '}
              instead of placeholder results.
            </p>
          )}

          <div className="animate-fade-up fade-delay-4 mt-7 flex flex-wrap items-center gap-3">
            <Magnetic>
              <a
                href="/track-record"
                className="group flex items-center gap-2.5 rounded-[var(--radius-pill)] bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]"
              >
                See the full track record
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                  <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </Magnetic>
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

        {/* The evidence — imagery layer gets scroll depth (decor-only
            parallax per DESIGN.md; static without scroll-timeline support) */}
        <div className="parallax-drift-slow relative min-h-[340px] lg:col-span-7 lg:min-h-[520px]">
          <CostFieldHero />
        </div>
      </div>
    </section>
  );
}
