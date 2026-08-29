/**
 * Premium, evidence-first homepage hero.
 *
 * The product claim stays tied to the live cost-adjusted equity summary. The
 * visual language borrows the restraint of a premium trading terminal: bold
 * editorial type, crisp controls, quiet emerald brand cues, and data as imagery.
 */

import { Activity, ArrowRight, Database, Server, ShieldCheck } from 'lucide-react';
import { NextRequest } from 'next/server';
import { DesktopCostField } from './cost-field/DesktopCostField';
import { getProofHeadline, type ProofLedgerState } from './proof-hero-copy';
import {
  GET as getEquitySummaryResponse,
  type EquitySummary,
} from '../../app/api/signals/equity/route';

async function fetchEquitySummary(): Promise<EquitySummary | null> {
  try {
    // Invoke the shared route in-process. A server component fetching its own
    // public URL can fail behind proxies or when the runtime port differs,
    // even while the underlying evidence store is healthy.
    const request = new NextRequest(
      'http://tradeclaw.internal/api/signals/equity?summaryOnly=1&scope=pro',
    );
    const res = await getEquitySummaryResponse(request);
    if (!res.ok) return null;
    const data = (await res.json()) as { summary?: EquitySummary };
    return (data?.summary ?? null) as EquitySummary | null;
  } catch {
    return null;
  }
}

function fractionDigits(value: number): number {
  const decimals = String(value).split('.')[1];
  return Math.min(decimals?.length ?? 0, 4);
}

function formatMetric(
  value: number,
  { decimals = 2, signed = false, suffix = '' }: {
    decimals?: number;
    signed?: boolean;
    suffix?: string;
  } = {},
): string {
  const normalized = Object.is(value, -0) ? 0 : value;
  return `${signed && normalized > 0 ? '+' : ''}${normalized.toFixed(decimals)}${suffix}`;
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
    <div className="flex min-w-0 flex-col gap-2 border-b border-[var(--border)] p-4 last:border-b-0 sm:p-5 sm:[&:nth-child(3)]:border-b-0 sm:[&:nth-child(4)]:border-b-0 lg:border-b-0">
      <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">
        {label}
      </dt>
      <dd
        className={`font-mono text-xl font-semibold tabular-nums leading-none sm:text-2xl ${
          negative ? 'text-[var(--color-down)]' : 'text-[var(--foreground)]'
        }`}
      >
        {value}
      </dd>
      {detail && <dd className="text-[11px] leading-snug text-[var(--text-secondary)]">{detail}</dd>}
    </div>
  );
}

function HeroDescription({
  ledgerState,
  trades,
}: {
  ledgerState: ProofLedgerState;
  trades: number;
}) {
  if (ledgerState === 'negative') {
    return (
      <>
        TradeClaw is an open trading research lab. Across{' '}
        {trades.toLocaleString('en-US')} eligible sized candidates, average modeled net
        expectancy was negative after stated fee and slippage assumptions. Inspect every
        result, test your own idea, or self-host the complete evidence trail.
      </>
    );
  }
  if (ledgerState === 'nonnegative') {
    return (
      <>
        TradeClaw is an open trading research lab. This environment&apos;s{' '}
        {trades.toLocaleString('en-US')} eligible sized candidates remain at or above zero
        after modeled fees and slippage. The rows, cost assumptions, and code are public;
        no broker fills or customer returns are claimed.
      </>
    );
  }
  if (ledgerState === 'indeterminate') {
    return (
      <>
        TradeClaw is an open trading research lab. This environment has{' '}
        {trades.toLocaleString('en-US')} eligible candidates, but not enough risk data to
        measure the result after costs. No placeholder result is substituted.
      </>
    );
  }
  if (ledgerState === 'empty') {
    return (
      <>
        TradeClaw is an open trading research lab. This environment does not yet have the
        OHLCV-resolved sized candidates needed to repeat the public test. No placeholder
        result is substituted; the code and method remain public.
      </>
    );
  }
  return (
    <>
      TradeClaw is an open trading research lab. Its public study found that modeled fees
      and slippage erased the observed gross expectancy. The dataset is temporarily
      unavailable, so no replacement numbers are shown.
    </>
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
  const displayedCostR = eq?.avgCostR != null ? +eq.avgCostR.toFixed(2) : null;
  const headline = getProofHeadline(ledgerState);
  const outcomeColor =
    headline.direction === 'down'
      ? 'text-[var(--color-down)]'
      : headline.direction === 'up'
        ? 'text-[var(--color-up)]'
        : 'text-[var(--foreground)]';

  return (
    <section
      data-testid="proof-hero"
      className="relative mx-auto max-w-[1280px] overflow-hidden px-4 pb-6 pt-2 sm:px-6 sm:pt-8 lg:px-10"
    >
      <div className="premium-grid-bg pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] opacity-45" />
      <div className="pointer-events-none absolute left-[18%] top-8 -z-10 h-64 w-64 rounded-full bg-[var(--brand-glow)] blur-[110px]" />

      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(430px,0.98fr)] lg:gap-12">
        <div className="relative z-10 flex flex-col justify-center py-4 sm:py-8 lg:py-14">
          <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            <span className="h-2 w-2 rounded-full bg-[var(--brand)] shadow-[0_0_18px_var(--brand)]" />
            Open trading research lab
            {hasMeasuredTrades ? ` · ${trades.toLocaleString('en-US')} eligible sized candidates` : ''}
          </p>

          <h1 className="font-display mt-4 max-w-[720px] text-[2.05rem] font-[720] leading-[1.01] tracking-[-0.05em] sm:mt-5 sm:text-[clamp(3rem,4.6vw,4.35rem)] sm:leading-[0.98] sm:tracking-[-0.055em]">
            <span className="block">Test trading ideas.</span>
            <span className="mt-1 block text-[var(--text-secondary)]">
              See where they fail after costs.
            </span>
          </h1>

          <p className={`mt-4 text-sm font-semibold ${outcomeColor}`}>
            Current finding: {headline.outcome}
          </p>

          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base sm:leading-7">
            <HeroDescription ledgerState={ledgerState} trades={trades} />
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="/track-record" className="premium-button-primary group">
              Explore the evidence
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
            <a
              href="/start"
              className="premium-button-secondary"
            >
              <Server className="h-4 w-4" aria-hidden="true" />
              Self-host TradeClaw
            </a>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--text-secondary)]">
            <li className="flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden="true" />
              Self-hosted
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden="true" />
              MIT licensed
            </li>
            <li className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden="true" />
              Open data
            </li>
          </ul>
        </div>

        <div className="premium-terminal parallax-drift-slow relative z-10 hidden min-h-[470px] md:block lg:min-h-[540px]">
          <div className="relative z-10 flex h-14 items-center justify-between border-b border-[var(--border)] px-4 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--brand-soft)] text-[var(--brand)]">
                <Activity className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold">Cost-aware evidence field</p>
                <p className="text-[10px] text-[var(--text-secondary)]">One dot per OHLCV-resolved sized candidate</p>
              </div>
            </div>
            <a
              href="/api/signals/equity?summaryOnly=1&scope=pro"
              className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--brand)]"
            >
              Raw data <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
          <div className="relative z-10 h-[414px] lg:h-[484px]">
            <DesktopCostField />
          </div>
        </div>
      </div>

      {eq && hasMeasuredTrades ? (
        <div className="mt-4 sm:mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
            <p>
              <span className="font-mono text-[var(--foreground)]">R</span> = the amount planned to risk on one trade.
            </p>
            <a href="/methodology" className="inline-flex items-center gap-1 transition-colors hover:text-[var(--brand)]">
              Calculation methodology <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
          <dl
            aria-label="Before modeled costs minus modeled fees and slippage equals after modeled costs"
            className="grid overflow-hidden rounded-[1.125rem] border border-[var(--border-strong)] bg-[var(--bg-card)] sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-[var(--border)]"
          >
            <LedgerItem
              label="Before modeled costs, per trade"
              value={eq.expectancyR != null ? formatMetric(eq.expectancyR, { signed: true, suffix: 'R' }) : '—'}
              negative={eq.expectancyR != null && eq.expectancyR < 0}
            />
            <LedgerItem
              label="− Modeled fees + slippage, per trade"
              value={displayedCostR != null ? formatMetric(displayedCostR, { suffix: 'R' }) : '—'}
              detail={eq.roundTripCostPct != null ? `≈ ${eq.roundTripCostPct}% of trade size` : undefined}
              negative={displayedCostR != null && displayedCostR > 0}
            />
            <LedgerItem
              label="= After modeled costs, per trade"
              value={eq.netExpectancyR != null ? formatMetric(eq.netExpectancyR, { signed: true, suffix: 'R' }) : '—'}
              negative={eq.netExpectancyR != null && eq.netExpectancyR < 0}
            />
            <LedgerItem
              label="Separate simulation: compounded result (1% risk per trade)"
              value={formatMetric(eq.totalReturn, {
                decimals: fractionDigits(eq.totalReturn),
                signed: true,
                suffix: '%',
              })}
              negative={eq.totalReturn < 0}
            />
          </dl>
        </div>
      ) : (
        <p
          className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-4 text-sm text-[var(--text-secondary)]"
          data-testid="proof-ledger-empty"
        >
          {eq
            ? 'No resolved, position-sized trades are available in this environment yet. '
            : 'The public modeled-cost dataset is temporarily unavailable. '}
          Inspect the <a href="/track-record" className="underline hover:text-[var(--foreground)]">eligible signal record</a>{' '}
          or the <a href="/api/signals/equity?summaryOnly=1&scope=pro" className="underline hover:text-[var(--foreground)]">raw summary</a>{' '}
          instead of placeholder results.
        </p>
      )}
    </section>
  );
}
