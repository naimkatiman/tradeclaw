import { getResolvedSlice } from './signal-slice';

export type SocialSummaryPeriod = 'daily' | 'weekly';

export interface SocialSummaryStats {
  /** Resolved-signal count in the window (the win-rate denominator). */
  total: number;
  /** Resolved signals whose 24h outcome hit. */
  wins: number;
  /** Resolved signals whose 24h outcome did not hit. */
  losses: number;
  /** wins / total × 100, one decimal. 0 when total is 0. */
  winRatePct: number;
  /** Unsized sum of resolved per-signal 24h price moves, two decimals. */
  sumPriceMovePct: number;
  /** Pair with the highest summed resolved price move in the window. */
  highestSumSymbol: string | null;
  highestSumPriceMovePct: number | null;
  /** Pair with the lowest summed resolved price move in the window. */
  lowestSumSymbol: string | null;
  lowestSumPriceMovePct: number | null;
}

const DAY_MS = 86_400_000;

/**
 * Resolved-signal summary for the public social surfaces — the
 * /api/og/summary card image and the daily/weekly social-post crons.
 *
 * Computed through the SAME resolved population as /track-record
 * (getResolvedSlice + isCountedResolved), windowed to the post period, so the
 * win-rate / W-L / price-move sum on the social card and caption match the page they link
 * to. The prior raw SQL counted `outcome_24h IS NOT NULL`, which folded in
 * auto-expired and gate-blocked rows the page excludes — inflating the public
 * numbers and breaking the honesty / cross-surface-consistency contract that
 * the Phase 6a sweep established for every other track-record surface.
 *
 * Window (UTC, anchored on `dateStr` = YYYY-MM-DD):
 *   daily  → [date, date + 1d)        the given day
 *   weekly → [date - 6d, date + 1d)   seven UTC calendar days ending that day
 *
 * An unparseable `dateStr` (the OG route reads it from the public query string)
 * falls back to the current UTC day rather than throwing.
 */
export async function getSocialSummaryStats(
  period: SocialSummaryPeriod,
  dateStr: string,
): Promise<SocialSummaryStats> {
  const parsed = Date.parse(`${dateStr}T00:00:00.000Z`);
  const anchor = Number.isNaN(parsed)
    ? Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
    : parsed;
  const end = anchor + DAY_MS;
  const start = period === 'weekly' ? anchor - 6 * DAY_MS : anchor;

  const { resolved } = await getResolvedSlice({ scope: 'pro' });
  const windowed = resolved.filter(r => r.timestamp >= start && r.timestamp < end);

  const total = windowed.length;
  const wins = windowed.filter(r => r.outcomes['24h']!.hit).length;
  const losses = total - wins;
  const sumPriceMovePct = +windowed
    .reduce((sum, r) => sum + r.outcomes['24h']!.pnlPct, 0)
    .toFixed(2);
  const winRatePct = total > 0 ? +((wins / total) * 100).toFixed(1) : 0;

  // Highest / lowest pair by summed resolved price moves over the same window.
  // These are signal-study aggregates, not position-sized portfolio returns.
  const byPair = new Map<string, number>();
  for (const r of windowed) {
    byPair.set(r.pair, (byPair.get(r.pair) ?? 0) + r.outcomes['24h']!.pnlPct);
  }
  let highestSumSymbol: string | null = null;
  let highestSumPriceMovePct: number | null = null;
  let lowestSumSymbol: string | null = null;
  let lowestSumPriceMovePct: number | null = null;
  for (const [pair, priceMove] of byPair) {
    const rounded = +priceMove.toFixed(2);
    if (highestSumPriceMovePct === null || rounded > highestSumPriceMovePct) {
      highestSumPriceMovePct = rounded;
      highestSumSymbol = pair;
    }
    if (lowestSumPriceMovePct === null || rounded < lowestSumPriceMovePct) {
      lowestSumPriceMovePct = rounded;
      lowestSumSymbol = pair;
    }
  }

  return {
    total,
    wins,
    losses,
    winRatePct,
    sumPriceMovePct,
    highestSumSymbol,
    highestSumPriceMovePct,
    lowestSumSymbol,
    lowestSumPriceMovePct,
  };
}
