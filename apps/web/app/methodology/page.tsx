/**
 * /methodology — how the public numbers are made.
 *
 * A lay-readable recipe for every performance figure TradeClaw publishes:
 * what an R-multiple is, which signals count, the modeled execution cost applied
 * to every sized signal, how the sequential equity simulation compounds, and
 * where the raw data lives. No live results render here — this page explains
 * the machine; /track-record shows what it produced.
 *
 * The per-asset cost table is computed in this server component from the same
 * CostModel constants the engine records at signal time (imported from
 * @tradeclaw/strategies), so it can never drift from what the curve deducts.
 *
 * Impeccable makeover 2026-07-11. See PRODUCT.md, DESIGN.md, and
 * docs/plans/2026-07-11-impeccable-3d-makeover-and-research-value.md.
 */

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Navbar } from '../components/navbar';
import {
  CRYPTO_PERP_COSTS,
  METALS_COSTS,
  FX_COSTS,
  type CostModel,
} from '@tradeclaw/strategies';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Methodology | TradeClaw',
  description:
    'How TradeClaw builds its public signal study: counted OHLCV outcomes, modeled per-asset costs, R-multiples, and the hypothetical sequential equity simulation.',
  openGraph: {
    title: 'Methodology | TradeClaw',
    description:
      'The recipe behind the public signal study: R-multiples, counted OHLCV-resolved signals, per-asset cost assumptions, and modeled net expectancy.',
    url: 'https://tradeclaw.win/methodology',
    siteName: 'TradeClaw',
    type: 'website',
    images: [{ url: '/api/og', width: 1200, height: 630, alt: 'TradeClaw methodology' }],
  },
  alternates: { canonical: 'https://tradeclaw.win/methodology' },
};

const GITHUB_BLOB = 'https://github.com/naimkatiman/tradeclaw/blob/main';

/** Format a percent value from the cost model to two decimals. */
const pct = (n: number): string => `${n.toFixed(2)}%`;

/** Round-trip cost = pay entering, pay exiting: 2 x (fee + slippage) per side. */
const roundTrip = (c: CostModel): number => 2 * (c.feePctPerSide + c.slippagePctPerSide);

interface CostRow {
  label: string;
  /** Symbols this class matches under @tradeclaw/strategies costModelFor. */
  symbols: string;
  model: CostModel;
}

// Rows mirror costModelFor's classification order (crypto, then metals, then
  // FX/fallback last). Every displayed number is derived from `model` below —
// nothing in this table is hardcoded.
const COST_ROWS: CostRow[] = [
  {
    label: 'Crypto perps',
    symbols: 'BTC, ETH, SOL, BNB, XRP, ADA, DOGE, DOT, LINK, AVAX, or any pair ending in USDT',
    model: CRYPTO_PERP_COSTS,
  },
  {
    label: 'Metals',
    symbols: 'XAU, XAG (gold and silver)',
    model: METALS_COSTS,
  },
  {
    label: 'FX / fallback',
    symbols: 'Every other pair, including unsupported or unclassified symbols',
    model: FX_COSTS,
  },
];

interface SourceFile {
  label: string;
  path: string;
}

const SOURCE_FILES: SourceFile[] = [
  { label: 'Equity route: sizing, cost deduction, expectancy', path: 'apps/web/app/api/signals/equity/route.ts' },
  { label: 'Signal history: which trades count', path: 'apps/web/lib/signal-history.ts' },
  { label: 'Modeled cost helper: stored estimate and fallback', path: 'apps/web/lib/modeled-trade-cost.ts' },
  { label: 'Cost model: the per-asset constants', path: 'packages/strategies/src/backtest-options.ts' },
  { label: 'Cost-field route: the per-trade dataset', path: 'apps/web/app/api/research/cost-field/route.ts' },
];

function Section({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="reveal mt-16 scroll-mt-28 border-t border-[var(--border)] pt-10">
      <h2 className="font-display flex items-baseline gap-3 text-[clamp(1.5rem,3.4vw,2.15rem)] font-bold uppercase leading-[1.02] tracking-tight text-[var(--foreground)]">
        <span className="font-mono text-sm font-medium tabular-nums text-[var(--text-secondary)]">{n}</span>
        <span>{title}</span>
      </h2>
      <div className="mt-5 max-w-prose space-y-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
        {children}
      </div>
    </section>
  );
}

function Formula({ children }: { children: ReactNode }) {
  return (
    <p className="my-3 overflow-x-auto whitespace-pre-wrap rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 font-mono text-[13px] leading-relaxed tabular-nums text-[var(--foreground)]">
      {children}
    </p>
  );
}

function DataLink({ href, code, children }: { href: string; code: string; children: ReactNode }) {
  return (
    <li className="border-t border-[var(--border)] pt-4 first:border-0 first:pt-0">
      <a
        href={href}
        className="font-mono text-[13px] text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4 transition-colors duration-200 hover:decoration-[var(--foreground)]"
      >
        {code}
      </a>
      <p className="mt-1 text-[14px] leading-relaxed text-[var(--text-secondary)]">{children}</p>
    </li>
  );
}

export default function MethodologyPage() {
  const cryptoFunding = pct(CRYPTO_PERP_COSTS.fundingPctPer8h);

  return (
    <>
      <Navbar />
      <main className="pt-28">
        <article className="mx-auto max-w-5xl px-4 pb-24">
          {/* Header */}
          <header>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Methodology
            </p>
            <h1 className="font-display mt-4 text-[clamp(2.25rem,5vw,3.75rem)] font-bold uppercase leading-[0.95] tracking-tight text-[var(--foreground)]">
              How the public
              <br />
              numbers are made
            </h1>
            <div className="mt-6 max-w-prose space-y-4 text-[15px] leading-relaxed">
              <p className="text-[var(--foreground)]">
                This page documents the public signal study. Read the steps below and you can
                rebuild its OHLCV-resolved outcomes, modeled costs, and sequential equity simulation
                from the published signal data.
              </p>
              <p className="text-[var(--text-secondary)]">
                No live broker or customer-account results appear here. This page explains the
                research calculation, and the{' '}
                <a href="/track-record" className="text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4 hover:decoration-[var(--foreground)]">
                  track record
                </a>{' '}
                shows the recorded-signal study it produced.
              </p>
            </div>

            <div className="mt-8 rounded-[var(--radius-card)] border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-[12px] leading-relaxed text-amber-700 dark:text-amber-200/90">
              <strong className="font-semibold">Informational only.</strong> This study combines
              recorded signals, outcomes resolved from provider OHLCV, and modeled cost/sizing
              assumptions. It is not a broker-fill record, customer portfolio, financial advice, or
              profit claim. Historical signal outcomes do not predict future results.
            </div>
          </header>

          {/* 1. R-multiple */}
          <Section id="r-multiple" n="01" title="What an R-multiple is">
            <p>
              An R-multiple states a trade result as a multiple of the risk that trade took, not as
              a raw percentage move. Risk is the distance from the entry price to the stop-loss: the
              amount the trade was set up to lose if it went wrong. One unit of that risk is 1R.
            </p>
            <Formula>
              R = pnl% ÷ risk%     risk% = |entry − stop| ÷ entry × 100
            </Formula>
            <p>
              Worked example, plain arithmetic. Entry at 100, stop at 98: the risk is 2%. If price
              reaches 104, a 4% move, the result is 4 ÷ 2 = +2R. A clean stop-out lands near −1R.
            </p>
            <p>
              R is used instead of raw percent because it makes trades with different stop distances
              comparable. A wide-stop trade and a tight-stop trade each risk the same 1R, so their
              outcomes can be averaged together honestly. A high win rate at small R can still lose
              money, and a low win rate at large R can still make it. R keeps that visible.
            </p>
          </Section>

          {/* 2. Which trades count */}
          <Section id="counted" n="02" title="Which trades count">
            <p>
              There are two populations, and they are not the same. Keeping them separate is what
              stops the win rate and the equity curve from telling different stories.
            </p>
            <p>
              <span className="font-medium text-[var(--foreground)]">Counted resolved</span> is the
              win-rate population. A signal counts when the resolver has a usable 24-hour OHLCV
              outcome: a take-profit hit, stop-loss hit, or nonzero 24-hour close after neither was
              hit. That last case remains a counted miss rather than disappearing. Excluded rows are
              simulated, gate-blocked (the engine emitted a signal but its full-risk gate refused
              entry), still pending, or zero/missing force-expiry placeholders with no usable market
              outcome. A single predicate, isCountedResolved, enforces this definition.
            </p>
            <p>
              <span className="font-medium text-[var(--foreground)]">Sized</span> is the stricter
              equity population. A trade enters the curve only if it has a recorded stop-loss.
              Without a stop there is no defined risk, and without defined risk there is no position
              size, so the trade cannot be sized onto the curve. Older rows missing a stop still
              count toward the win rate, but not toward the equity curve or the R-statistics. The
              sized set is the subset that carries a stop.
            </p>
            <p>
              One caveat the counts do not flatter away: the engine fires across many symbols and
              timeframes at once, and the default population is the eligible engine stream. It does
              not establish which signals any subscriber received or executed. The raw count
              describes recorded signal rows, not a tradable account.
            </p>
            <p>
              Public history reads are capped at 10,000 source rows. The cost-field endpoint reports
              the loaded count, read limit, and a potential-truncation flag. Unless completeness is
              independently established, this documentation calls the result the current archive,
              not all historical signals.
            </p>
          </Section>

          {/* 3. What every trade is charged */}
          <Section id="cost" n="03" title="The modeled cost deduction">
            <p>
              Every eligible sized signal receives a modeled cost deduction before it enters the
              simulation. The value is selected per asset class from static fee and slippage
              assumptions and stored on the signal row; it is not measured from a broker fill.
              Round-trip cost is modeled as 2 times the assumed fee plus slippage per side.
            </p>

            <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border)]">
              <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Modeled round-trip cost deducted from each eligible sized signal, by asset class,
                  computed from the cost model constants.
                </caption>
                <thead>
                  <tr className="border-b border-[var(--border)] text-[13px] text-[var(--text-secondary)]">
                    <th scope="col" className="px-4 py-3 font-medium">Asset class</th>
                    <th scope="col" className="px-4 py-3 font-medium">Matched symbols</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Fee assumption / side</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Slippage assumption / side</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Modeled round trip</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Funding assumption / 8h (excluded)</th>
                  </tr>
                </thead>
                <tbody>
                  {COST_ROWS.map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-[var(--border)] align-top last:border-0"
                    >
                      <td className="px-4 py-4 font-medium text-[var(--foreground)]">{row.label}</td>
                      <td className="px-4 py-4 text-[13px] text-[var(--text-secondary)]">{row.symbols}</td>
                      <td className="px-4 py-4 text-right font-mono tabular-nums text-[var(--foreground)]">
                        {pct(row.model.feePctPerSide)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono tabular-nums text-[var(--foreground)]">
                        {pct(row.model.slippagePctPerSide)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-semibold tabular-nums text-[var(--color-down)]">
                        {pct(roundTrip(row.model))}
                      </td>
                      <td className="px-4 py-4 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                        {pct(row.model.fundingPctPer8h)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-6">
              The model assigns crypto the largest deduction, roughly ten times its FX assumption,
              based on the stated taker-fee and slippage constants. This assumption materially
              affects the result and should be replaced when venue-specific fill evidence exists.
            </p>
            <p>
              The model also defines perp funding, {cryptoFunding} of notional per 8 hours held,
              shown in the last column. It is not added to the per-trade charge, because when a
              signal fires the engine does not yet know how long the position will be held. Funding
              is therefore excluded, which makes the cost model incomplete and can move a real
              result in either direction. Each newer row stores the selected cost estimate; rows
              written before that field existed fall back to the same asset-class model.
            </p>
          </Section>

          {/* 4. How the equity curve compounds */}
          <Section id="compounding" n="04" title="How the sequential simulation compounds">
            <p>
              The hypothetical curve starts from 10,000, orders eligible sized signals by timestamp,
              and risks 1% of current modeled equity on every signal. This is a fixed-fractional
              research rule, not evidence that an account placed those trades.
            </p>
            <p>
              At 1% modeled risk, one signal moves simulated equity by about its R-multiple times
              1%, minus the modeled cost in R. A +2R outcome adds roughly 2%; a −1R outcome removes
              roughly 1%, with the modeled deduction applied to both.
            </p>
            <Formula>
              equity change per trade ≈ ( capped R − cost R ) × 1%     cost R = cost% ÷ risk%
            </Formula>
            <p>
              The simulation processes every eligible signal sequentially. It does not model
              overlapping positions, correlated exposure, account margin, leverage limits, order
              rejection, latency, broker fills, or subscriber selection. Its return and drawdown
              are hypothetical model outputs, not observed portfolio performance.
            </p>
            <p>
              For the money path only, each trade R is capped at 8R, the parameter named
              HARD_R_CAP. That cap sits just above the 99th percentile of the recorded
              OHLCV-resolved absolute-R distribution and clips roughly 1% of modeled outcomes. A
              different cap changes the simulated path. The cap applies only to that path; average
              winning R and expectancy use the uncapped OHLCV-resolved R values.
            </p>
            <p>
              The curve also reports the simulation&apos;s worst peak-to-trough drop. This maximum
              drawdown describes the hypothetical sequential path, not a broker or customer account.
            </p>
          </Section>

          {/* 5. Net expectancy and break-even win rate */}
          <Section id="expectancy" n="05" title="Net expectancy and break-even win rate">
            <p>
              Expectancy is the average result of one trade, measured in R. Gross expectancy weighs
              the average winning R and the average losing R by how often each happens. It measures
              engine quality before costs.
            </p>
            <Formula>
              gross R = winRate × avgRWin + lossRate × avgRLoss
              {'\n'}net R   = gross R − avgCostR
            </Formula>
            <p>
              Net expectancy subtracts the average modeled cost in R. It is the value used by the
              sequential simulation and can be negative when observed gross expectancy is positive.
              In the current counted sample, the stated cost assumptions exceed the observed gross
              expectancy. This conclusion is conditional on the published population and model.
            </p>
            <p>
              The break-even win rate is the win rate that would make expectancy exactly zero, given
              the observed average win and loss sizes.
            </p>
            <Formula>
              break-even win rate = −avgRLoss ÷ ( avgRWin − avgRLoss )
            </Formula>
            <p>
              If the observed OHLCV-resolved win rate sits above this line, the study has positive
              modeled expectancy, even below 50%. If it sits below the line, it does not under the
              same assumptions. The signal record shows the observed rate next to this modeled
              break-even line.
            </p>
          </Section>

          {/* 6. Where the data lives */}
          <Section id="data" n="06" title="Where the data lives">
            <p>
              A finding is only as good as its inputs, so the study data and assumptions are public
              and machine-readable. The figures above can be recomputed from these endpoints and files.
            </p>
            <ul className="mt-5 space-y-4">
              <DataLink href="/api/research/cost-field" code="/api/research/cost-field">
                The unaggregated sized-signal dataset: identifiers, timestamp, OHLCV-resolved gross
                R, modeled cost R, and asset class. Add include=provenance for outcome inputs,
                modeled-cost source, and broadcast decision. The response flags potential truncation.
              </DataLink>
              <DataLink href="/api/signals/equity" code="/api/signals/equity">
                The hypothetical sequential equity simulation and its summary: observed win rate,
                gross and modeled net expectancy, break-even win rate, modeled average cost, and
                simulated drawdown.
              </DataLink>
              <DataLink href="/track-record" code="/track-record">
                The rendered results, shown with sample size and date range next to every number.
              </DataLink>
            </ul>

            <h3 className="mt-8 font-mono text-[13px] font-medium text-[var(--foreground)]">
              Source code for each step
            </h3>
            <ul className="mt-3 space-y-3">
              {SOURCE_FILES.map((file) => (
                <li key={file.path} className="text-[14px] leading-relaxed">
                  <a
                    href={`${GITHUB_BLOB}/${file.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4 transition-colors duration-200 hover:decoration-[var(--foreground)]"
                  >
                    {file.label}
                  </a>
                  <span className="ml-2 font-mono text-[12px] text-[var(--text-secondary)]">
                    {file.path}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-[14px]">
              Every public number here obeys a written honesty contract: a provenance label, the
              sample size and window it covers, the cost disclosed next to the figure, and the win
              rate shown against its break-even line. You can read the contract in full on{' '}
              <a
                href={`${GITHUB_BLOB}/docs/operators/honesty-contract.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4 hover:decoration-[var(--foreground)]"
              >
                GitHub
              </a>
              .
            </p>
          </Section>
        </article>
      </main>
    </>
  );
}
