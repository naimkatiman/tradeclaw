/**
 * ProofHero — the finding, stated and rendered.
 *
 * Left: the claim in display type with the live cost-adjusted numbers pulled
 * from /api/signals/equity?summaryOnly=1 (the same source of truth as the
 * track-record page — nothing here is hardcoded or can drift). Right: the
 * Cost Field, a WebGL rendering of every resolved sized trade before and after
 * modeled fees and slippage, relative to zero.
 *
 * Impeccable makeover 2026-07-11. See PRODUCT.md ("data is the imagery",
 * "the finding is the brand") and docs/plans/2026-07-11-impeccable-3d-
 * makeover-and-research-value.md.
 */

import { CostFieldHero } from './cost-field/CostFieldHero';
import { AnimatedNumber } from '../motion/animated-number';
import { Magnetic } from '../motion/magnetic';
import { getProofHeadline, type ProofLedgerState } from './proof-hero-copy';

const GITHUB_URL = 'https://github.com/naimkatiman/tradeclaw';

interface EquitySummary {
  totalReturn: number;
  totalSignals: number;
  sizedTrades?: number;
  expectancyR: number | null;
  netExpectancyR?: number | null;
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
    <div className="flex min-w-0 flex-col gap-1 py-3 pr-4">
      <dt className="text-xs leading-snug text-[var(--text-secondary)]">{label}</dt>
      <dd
        className={`font-mono text-lg font-semibold tabular-nums leading-none ${
          negative ? 'text-[var(--color-down)]' : 'text-[var(--foreground)]'
        }`}
      >
        {value}
      </dd>
      {detail && (
        <dd className="text-xs leading-snug text-[var(--text-secondary)]">{detail}</dd>
      )}
    </div>
  );
}

export async function ProofHero() {
  const eq = await fetchEquitySummary();
  const trades = eq?.sizedTrades ?? eq?.totalSignals ?? 0;
  const hasMeasuredTrades = trades > 0;
  const ledgerState: ProofLedgerState = !eq
    ? 'unavailable'
    : !hasMeasuredTrades
      ? 'empty'
      : eq.netExpectancyR == null
        ? 'indeterminate'
        : eq.netExpectancyR < 0
          ? 'negative'
          : 'nonnegative';
  // The API deliberately computes net expectancy from the same 2dp cost
  // shown in its public breakdown. Keep all three equation terms at that
  // precision so a newcomer can reconcile gross - cost = net by inspection.
  const displayedCostR = eq?.avgCostR != null ? +eq.avgCostR.toFixed(2) : null;
  const headline = getProofHeadline(ledgerState);
  const outcomeColor =
    headline.direction === 'down'
      ? 'text-[var(--color-down)]'
      : headline.direction === 'up'
        ? 'text-[var(--color-up)]'
        : 'text-[var(--foreground)]';

  return (
    <section data-testid="proof-hero" className="mx-auto max-w-6xl px-4 pt-2 sm:pt-6">
      <div className="grid items-stretch gap-10 lg:grid-cols-12">
        {/* The claim */}
        <div className="flex flex-col justify-center lg:col-span-6">
          <p className="animate-fade-up font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Open-source trading test
            {hasMeasuredTrades ? ` · ${trades.toLocaleString('en-US')} recorded trades` : ''}
          </p>
          {/* The page's one orchestrated load entrance (DESIGN.md Motion):
              headline lands line by line, the finding last. */}
          <h1 className="font-display mt-3 text-[2.15rem] font-bold uppercase leading-[0.95] tracking-tight sm:mt-4 sm:text-[clamp(2.4rem,4.2vw,3.6rem)] sm:leading-none">
            <span className="animate-fade-up fade-delay-1 block">Open-source trading signals.</span>
            <span className={`animate-fade-up fade-delay-3 block ${outcomeColor}`}>
              {headline.outcome}
            </span>
          </h1>
          <p className="animate-fade-up fade-delay-3 mt-4 max-w-lg text-base leading-relaxed text-[var(--text-secondary)] sm:mt-5">
            {ledgerState === 'negative' ? (
              <>
                TradeClaw is an open-source BUY/SELL signal engine you can inspect
                or self-host. Across {trades.toLocaleString('en-US')} recorded
                trades, the average trade lost after modeled fees and slippage.
                Every trade and line of code is public.
              </>
            ) : ledgerState === 'nonnegative' ? (
              <>
                TradeClaw is an open-source engine that generates BUY and SELL
                signals you can inspect or self-host. This environment&apos;s{' '}
                {trades.toLocaleString('en-US')} recorded trades remain at or
                above zero after modeled fees and slippage. Every trade, cost
                assumption, and line of code is public.
              </>
            ) : ledgerState === 'indeterminate' ? (
              <>
                TradeClaw is an open-source signal engine. This environment has{' '}
                {trades.toLocaleString('en-US')} recorded trades, but not enough
                risk data to measure the result after costs. No placeholder result
                is substituted; the code and available evidence remain public.
              </>
            ) : ledgerState === 'empty' ? (
              <>
                TradeClaw is an open-source signal engine. This environment does
                not yet have the resolved trades needed to repeat the public test.
                No placeholder result is substituted; the code and method remain
                public.
              </>
            ) : (
              <>
                TradeClaw is an open-source signal engine. Its public test found
                that modeled fees and slippage erased the measured result. The live
                ledger is temporarily unavailable, so no replacement numbers are
                shown.
              </>
            )}
          </p>

          <div className="animate-fade-up fade-delay-4 mt-5 flex flex-wrap items-center gap-3 sm:mt-6">
            <Magnetic>
              <a
                href="/track-record"
                className="group flex items-center gap-2.5 rounded-[var(--radius-pill)] bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition-all duration-200 hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]"
              >
                Inspect every trade
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
              View the code
            </a>
          </div>

          {eq && hasMeasuredTrades && (
            <p className="animate-fade-up fade-delay-4 mt-5 text-xs leading-relaxed text-[var(--text-secondary)]">
              <span className="font-mono text-[var(--foreground)]">R</span> = the amount planned to risk on one trade.
            </p>
          )}

          {eq && hasMeasuredTrades ? (
            <dl
              aria-label="Before modeled costs minus modeled fees and slippage equals after modeled costs"
              className="animate-fade-up fade-delay-4 mt-2 grid grid-cols-2 gap-x-2 divide-y divide-[var(--border)] border-y border-[var(--border)] sm:grid-cols-2"
            >
              <LedgerItem
                label="Before modeled costs, per trade"
                value={
                  eq.expectancyR != null ? (
                    <AnimatedNumber
                      value={eq.expectancyR}
                      decimals={2}
                      signed
                      suffix="R"
                    />
                  ) : (
                    '—'
                  )
                }
                negative={eq.expectancyR != null && eq.expectancyR < 0}
              />
              <LedgerItem
                label="− Modeled fees + slippage, per trade"
                value={
                  displayedCostR != null ? (
                    <AnimatedNumber
                      value={displayedCostR}
                      decimals={2}
                      suffix="R"
                    />
                  ) : (
                    '—'
                  )
                }
                detail={eq.roundTripCostPct != null ? `≈ ${eq.roundTripCostPct}% of trade size` : undefined}
                negative={displayedCostR != null && displayedCostR > 0}
              />
              <LedgerItem
                label="= After modeled costs, per trade"
                value={
                  eq.netExpectancyR != null ? (
                    <AnimatedNumber
                      value={eq.netExpectancyR}
                      decimals={2}
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
                label="Separate simulation: compounded result (1% risk per trade)"
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

        </div>

        {/* The evidence — imagery layer gets scroll depth (decor-only
            parallax per DESIGN.md; static without scroll-timeline support) */}
        <div className="parallax-drift-slow relative min-h-[340px] lg:col-span-6 lg:min-h-[520px]">
          <CostFieldHero />
        </div>
      </div>
    </section>
  );
}
