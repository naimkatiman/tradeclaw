/**
 * /methodology — how the public numbers are made.
 *
 * A lay-readable recipe for every performance figure TradeClaw publishes:
 * what an R-multiple is, which trades count, the real execution cost charged
 * to every sized trade, how the cost-adjusted equity curve compounds, and
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
    'Exactly how TradeClaw builds its public numbers: what an R-multiple is, which trades count, the real execution cost charged to every trade, and how the cost-adjusted equity curve is computed. Every figure is reproducible from open data.',
  openGraph: {
    title: 'Methodology | TradeClaw',
    description:
      'The full recipe behind the public track record: R-multiples, counted trades, per-asset execution cost, and net expectancy. No hidden steps.',
    url: 'https://tradeclaw.win/methodology',
    siteName: 'TradeClaw',
    type: 'website',
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
// FX as the fallback). Every displayed number is derived from `model` below —
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
    label: 'FX',
    symbols: 'Every other pair, the major and minor currencies',
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
                This page is the recipe. Every performance figure on TradeClaw comes out of the
                steps below, in order, from the same code that runs in production. Read it and you
                can rebuild the public track record from the raw trade data yourself.
              </p>
              <p className="text-[var(--text-secondary)]">
                Nothing here is rounded in our favor. Where a number has an unfavorable direction,
                that direction is shown too. No live results appear on this page: it explains the
                machine, and the{' '}
                <a href="/track-record" className="text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4 hover:decoration-[var(--foreground)]">
                  track record
                </a>{' '}
                shows what the machine produced.
              </p>
            </div>

            <div className="mt-8 rounded-[var(--radius-card)] border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-[12px] leading-relaxed text-amber-700 dark:text-amber-200/90">
              <strong className="font-semibold">Informational only.</strong> This is a record of
              what a signal engine did after costs, published as evidence. It is not financial
              advice and not a profit claim. Recorded past outcomes do not predict future results.
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
              win-rate population. A trade counts only if it has a real 24-hour outcome, meaning
              price actually reached the take-profit or the stop-loss. Excluded from this set are
              simulated rows, gate-blocked rows (the engine emitted a signal but its full-risk gate
              refused entry, for example because the spread was too wide or a news lockout was
              active), and auto-expired rows (the 24-hour window elapsed without hitting either
              target). A single predicate, isCountedResolved, enforces this everywhere, so the win
              rate, the equity curve, and the counts all use one definition.
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
              timeframes at once, and the counted set is the full stream. A real person filtering
              for only the strongest setups would execute a small fraction of these trades. The raw
              count describes the firehose, not a tradable account.
            </p>
          </Section>

          {/* 3. What every trade is charged */}
          <Section id="cost" n="03" title="What every trade is charged">
            <p>
              Every sized trade is charged its real execution cost before it touches the curve. The
              charge is not a flat blended guess. It is set per asset class from the same cost model
              the engine records at signal time. Round-trip means one full trade: you pay the cost
              entering and pay it again exiting, so the charge is 2 times the sum of fee and
              slippage per side.
            </p>

            <div className="mt-6 overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border)]">
              <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Round-trip execution cost charged to each sized trade, by asset class, computed
                  from the cost model constants.
                </caption>
                <thead>
                  <tr className="border-b border-[var(--border)] text-[13px] text-[var(--text-secondary)]">
                    <th scope="col" className="px-4 py-3 font-medium">Asset class</th>
                    <th scope="col" className="px-4 py-3 font-medium">Matched symbols</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Fee / side</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Slippage / side</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Round-trip charged</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Funding / 8h (not charged)</th>
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
              Crypto costs the most to trade, roughly ten times the FX charge, because taker fees
              and slippage on perps are wider. That gap is a large part of the finding: the assets
              that move the most also cost the most to churn.
            </p>
            <p>
              The model also defines perp funding, {cryptoFunding} of notional per 8 hours held,
              shown in the last column. It is not added to the per-trade charge, because when a
              signal fires the engine does not yet know how long the position will be held. Leaving
              funding out makes the recorded cost conservative: holding a crypto position through
              funding windows costs more than the curve deducts, not less. Each trade carries its
              own recorded cost. Only rows written before that field existed fall back to the model
              cost for their asset class.
            </p>
          </Section>

          {/* 4. How the equity curve compounds */}
          <Section id="compounding" n="04" title="How the equity curve compounds">
            <p>
              The curve starts from a fixed 10,000 and risks a fixed 1% of current equity on every
              trade. This is textbook fixed-fractional sizing. It replaced an earlier method that
              staked the whole bankroll per signal and produced unrunnable spikes followed by
              drawdowns no real account would survive.
            </p>
            <p>
              At 1% risk, one trade moves equity by about its R-multiple times 1%, minus that
              trade cost in R. A +2R winner adds roughly 2%; a −1R loser removes roughly 1%, with
              cost on top of both.
            </p>
            <Formula>
              equity change per trade ≈ ( capped R − cost R ) × 1%     cost R = cost% ÷ risk%
            </Formula>
            <p>
              For the money path only, each trade R is capped at 8R, the parameter named
              HARD_R_CAP. That cap sits just above the 99th percentile of the live absolute-R
              distribution, so it clips only the most extreme roughly 1% of trades: single-trade
              outliers that no one scales out of cleanly. It is deliberately not tighter. A 3R cap
              would remove the thin right tail the engine edge depends on and would report the
              result as more negative than it really was. The cap touches only the equity path. The
              R-statistics, average winning R and expectancy, always use the raw uncapped R, so the
              cap never flatters the engine quality.
            </p>
            <p>
              The curve also reports its worst peak-to-trough drop, the maximum drawdown, because a
              positive endpoint can hide a deep hole in the middle of the run. The path is reported,
              not just the destination.
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
              Net expectancy subtracts the real average cost in R. Net is the number that actually
              compounds the curve, and it can be negative even when gross is positive. That gap is
              the entire finding: the engine clears a small gross edge, the cost of trading is
              larger than that edge, and the curve falls even though the gross figure still looks
              fine.
            </p>
            <p>
              The break-even win rate is the win rate that would make expectancy exactly zero, given
              the observed average win and loss sizes.
            </p>
            <Formula>
              break-even win rate = −avgRLoss ÷ ( avgRWin − avgRLoss )
            </Formula>
            <p>
              If the actual win rate sits above this line, the system has positive expectancy, even
              if that win rate is below 50%. If it sits below the line, it does not, even if it wins
              more often than it loses. The track record always shows the actual win rate next to
              this break-even line, so above or below is explicit rather than implied.
            </p>
          </Section>

          {/* 6. Where the data lives */}
          <Section id="data" n="06" title="Where the data lives">
            <p>
              A finding is only as good as the data under it, so all of it is public and
              machine-readable. Every figure above can be recomputed from these endpoints and files.
            </p>
            <ul className="mt-5 space-y-4">
              <DataLink href="/api/research/cost-field" code="/api/research/cost-field">
                The raw per-trade dataset. One entry per sized trade: timestamp, gross R, cost R, and
                asset class. Net R per trade is gross R minus cost R, with nothing aggregated away.
              </DataLink>
              <DataLink href="/api/signals/equity" code="/api/signals/equity">
                The compounded equity curve and every summary figure described on this page: win
                rate, gross and net expectancy, break-even win rate, average cost, drawdown.
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
