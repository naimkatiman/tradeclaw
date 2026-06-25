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
  /** Sum of resolved 24h pnlPct over the window, two decimals. */
  totalPnlPct: number;
  /** Pair with the highest summed resolved P&L in the window (weekly recap). */
  bestSymbol: string | null;
  bestPnlPct: number | null;
  /** Pair with the lowest summed resolved P&L in the window (weekly recap). */
  worstSymbol: string | null;
  worstPnlPct: number | null;
}

const DAY_MS = 86_400_000;

/**
 * Resolved-signal summary for the public social surfaces — the
 * /api/og/summary card image and the daily/weekly social-post crons.
 *
 * Computed through the SAME resolved population as /track-record
 * (getResolvedSlice + isCountedResolved), windowed to the post period, so the
 * win-rate / W-L / P&L on the social card and caption match the page they link
 * to. The prior raw SQL counted `outcome_24h IS NOT NULL`, which folded in
 * auto-expired and gate-blocked rows the page excludes — inflating the public
 * numbers and breaking the honesty / cross-surface-consistency contract that
 * the Phase 6a sweep established for every other track-record surface.
 *
 * Window (UTC, anchored on `dateStr` = YYYY-MM-DD):
 *   daily  → [date, date + 1d)        the given day
 *   weekly → [date - 7d, date + 1d)   the trailing week ending that day
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
  const start = period === 'weekly' ? anchor - 7 * DAY_MS : anchor;

  const { resolved } = await getResolvedSlice({ scope: 'pro' });
  const windowed = resolved.filter(r => r.timestamp >= start && r.timestamp < end);

  const total = windowed.length;
  const wins = windowed.filter(r => r.outcomes['24h']!.hit).length;
  const losses = total - wins;
  const totalPnlPct = +windowed
    .reduce((sum, r) => sum + r.outcomes['24h']!.pnlPct, 0)
    .toFixed(2);
  const winRatePct = total > 0 ? +((wins / total) * 100).toFixed(1) : 0;

  // Best / worst symbol by summed resolved P&L over the same window — used by
  // the weekly recap, computed off the same resolved set so it can't disagree.
  const byPair = new Map<string, number>();
  for (const r of windowed) {
    byPair.set(r.pair, (byPair.get(r.pair) ?? 0) + r.outcomes['24h']!.pnlPct);
  }
  let bestSymbol: string | null = null;
  let bestPnlPct: number | null = null;
  let worstSymbol: string | null = null;
  let worstPnlPct: number | null = null;
  for (const [pair, pnl] of byPair) {
    const rounded = +pnl.toFixed(2);
    if (bestPnlPct === null || rounded > bestPnlPct) {
      bestPnlPct = rounded;
      bestSymbol = pair;
    }
    if (worstPnlPct === null || rounded < worstPnlPct) {
      worstPnlPct = rounded;
      worstSymbol = pair;
    }
  }

  return {
    total,
    wins,
    losses,
    winRatePct,
    totalPnlPct,
    bestSymbol,
    bestPnlPct,
    worstSymbol,
    worstPnlPct,
  };
}
