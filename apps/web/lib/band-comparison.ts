/**
 * Honest premium-vs-all comparison for the track-record band callout.
 *
 * The paid value proposition is that the high-confidence ("premium", conf ≥ 85)
 * filter selects BETTER trades. A naive "premium total return > all total return"
 * test credits the filter even when premium merely traded LESS during a losing
 * window — accumulating a smaller loss is not the same as higher accuracy. This
 * classifier only calls the filter a winner when premium beats all-signals on
 * per-trade quality (win rate AND expectancy) as well as total return; otherwise
 * it states the honest mechanism (fewer trades) or that premium underperformed.
 */

export interface BandSummaryLite {
  /** Compounded total return for the window, in percent. */
  totalReturn: number;
  /** Win rate for the window, in percent. */
  winRate: number;
  /** Sized/resolved trade count for the window. */
  totalSignals: number;
  /** Expectancy in R per trade. Null when no sized trades (R undefined). */
  expectancyR: number | null;
}

export type BandVerdict = 'premium_better' | 'premium_fewer_trades' | 'premium_worse';

export interface BandComparison {
  verdict: BandVerdict;
  /** premium.totalReturn − all.totalReturn, 2 dp. */
  returnDelta: number;
  tone: 'positive' | 'neutral' | 'negative';
  /** Short, honest badge label. */
  label: string;
}

function pct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function classifyBandComparison(
  all: BandSummaryLite,
  premium: BandSummaryLite,
): BandComparison {
  const returnDelta = +(premium.totalReturn - all.totalReturn).toFixed(2);

  const higherWinRate = premium.winRate >= all.winRate;
  // Expectancy is the per-trade edge. Require premium ≥ all when both are
  // defined; if either is unknowable (a band with no sized trades — R is
  // undefined), fall back to win rate so "unknown" is never read as "better".
  const higherExpectancy =
    premium.expectancyR !== null && all.expectancyR !== null
      ? premium.expectancyR >= all.expectancyR
      : higherWinRate;

  const genuinelyBetter = higherWinRate && higherExpectancy;

  if (genuinelyBetter && returnDelta >= 0) {
    return {
      verdict: 'premium_better',
      returnDelta,
      tone: 'positive',
      label: `Premium outperformed ${pct(returnDelta)} vs All`,
    };
  }

  if (returnDelta > 0) {
    // Premium's total beats all, but not on per-trade quality — it just traded
    // less. Don't credit the filter for accuracy it didn't provide.
    return {
      verdict: 'premium_fewer_trades',
      returnDelta,
      tone: 'neutral',
      label: `Premium ${pct(returnDelta)} vs All — fewer trades, not higher accuracy`,
    };
  }

  if (returnDelta === 0) {
    // Identical return with no per-trade edge (we'd have returned premium_better
    // above otherwise). "Underperformed +0.00%" would be self-contradictory.
    return {
      verdict: 'premium_worse',
      returnDelta,
      tone: 'neutral',
      label: 'Premium matched All — no per-trade edge',
    };
  }

  return {
    verdict: 'premium_worse',
    returnDelta,
    tone: 'negative',
    label: `Premium underperformed ${pct(returnDelta)} vs All`,
  };
}
