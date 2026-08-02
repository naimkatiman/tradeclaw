/**
 * Premium, evidence-first homepage hero.
 *
 * The product claim stays tied to the live cost-adjusted equity summary. The
 * visual language borrows the restraint of a premium trading terminal: bold
 * editorial type, crisp controls, quiet emerald brand cues, and data as imagery.
 */

import { Activity, ArrowRight, Code2, Database, Server, ShieldCheck } from 'lucide-react';
import { DesktopCostField } from './cost-field/DesktopCostField';
import { AnimatedNumber } from '../motion/animated-number';
import { Magnetic } from '../motion/magnetic';
import { ProductHeroBackdrop } from '../product-hero-backdrop';
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
        TradeClaw is an open-source BUY/SELL signal engine you can inspect or self-host.
        Across {trades.toLocaleString('en-US')} eligible sized signals, average modeled
        net expectancy was negative after stated fee and slippage assumptions. This is an
        OHLCV-resolved signal study, not a customer portfolio.
      </>
    );
  }
  if (ledgerState === 'nonnegative') {
    return (
      <>
        TradeClaw is an open-source engine that generates BUY and SELL signals you can
        inspect or self-host. This environment&apos;s {trades.toLocaleString('en-US')}{' '}
        eligible sized signals remain at or above zero after modeled fees and slippage.
        The underlying signal rows, cost assumptions, and code are public; no broker fills
        or customer returns are claimed.
      </>
    );
  }
  if (ledgerState === 'indeterminate') {
    return (
      <>
        TradeClaw is an open-source signal engine. This environment has{' '}
        {trades.toLocaleString('en-US')} eligible signals, but not enough risk data to
        measure the result after costs. No placeholder result is substituted.
      </>
    );
  }
  if (ledgerState === 'empty') {
    return (
      <>
        TradeClaw is an open-source signal engine. This environment does not yet have
        the OHLCV-resolved sized signals needed to repeat the public test. No placeholder result is
        substituted; the code and method remain public.
      </>
    );
  }
  return (
    <>
      TradeClaw is an open-source signal engine. Its public study found that modeled fees
      and slippage erased the observed gross expectancy. The dataset is temporarily unavailable,
      so no replacement numbers are shown.
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
      <div className="relative isolate grid items-center gap-10 overflow-hidden lg:grid-cols-[minmax(0,1.02fr)_minmax(430px,0.98fr)] lg:gap-12">
        <ProductHeroBackdrop
          src="/brand/hero/tradeclaw-market-field-panorama-v1.webp"
          testId="homepage-hero-art"
          className="product-hero-backdrop--home"
          priority
        />
        <div className="relative z-10 flex flex-col justify-center py-4 sm:py-8 lg:py-14">
          <p className="animate-fade-up flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            <span className="h-2 w-2 rounded-full bg-[var(--brand)] shadow-[0_0_18px_var(--brand)]" />
            Open-source trading test
            {hasMeasuredTrades ? ` · ${trades.toLocaleString('en-US')} eligible sized signals` : ''}
          </p>

          <h1 className="font-display mt-4 max-w-[720px] text-[2.05rem] font-[720] leading-[1.01] tracking-[-0.05em] sm:mt-5 sm:text-[clamp(3rem,4.6vw,4.35rem)] sm:leading-[0.98] sm:tracking-[-0.055em]">
            <span className="animate-fade-up fade-delay-1 block">Open-source trading signals.</span>
            <span className={`animate-fade-up fade-delay-3 mt-1 block ${outcomeColor}`}>
              {headline.outcome}
            </span>
          </h1>

          <p className="animate-fade-up fade-delay-3 mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:mt-5 sm:text-base sm:leading-7">
            <HeroDescription ledgerState={ledgerState} trades={trades} />
          </p>

          <div className="animate-fade-up fade-delay-4 mt-6 flex flex-wrap items-center gap-3">
            <Magnetic>
              <a href="/track-record" className="premium-button-primary group">
                Inspect signal rows
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            </Magnetic>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="premium-button-secondary"
            >
              <Code2 className="h-4 w-4" aria-hidden="true" />
              View the code
            </a>
          </div>

          <ul className="animate-fade-up fade-delay-4 mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--text-secondary)]">
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
                <p className="text-xs font-semibold">Cost-aware signal field</p>
                <p className="text-[10px] text-[var(--text-secondary)]">One dot per OHLCV-resolved sized signal</p>
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
              value={eq.expectancyR != null ? <AnimatedNumber value={eq.expectancyR} decimals={2} signed suffix="R" /> : '—'}
              negative={eq.expectancyR != null && eq.expectancyR < 0}
            />
            <LedgerItem
              label="− Modeled fees + slippage, per trade"
              value={displayedCostR != null ? <AnimatedNumber value={displayedCostR} decimals={2} suffix="R" /> : '—'}
              detail={eq.roundTripCostPct != null ? `≈ ${eq.roundTripCostPct}% of trade size` : undefined}
              negative={displayedCostR != null && displayedCostR > 0}
            />
            <LedgerItem
              label="= After modeled costs, per trade"
              value={eq.netExpectancyR != null ? <AnimatedNumber value={eq.netExpectancyR} decimals={2} signed suffix="R" /> : '—'}
              negative={eq.netExpectancyR != null && eq.netExpectancyR < 0}
            />
            <LedgerItem
              label="Separate simulation: compounded result (1% risk per trade)"
              value={<AnimatedNumber value={eq.totalReturn} decimals={fractionDigits(eq.totalReturn)} signed suffix="%" />}
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
