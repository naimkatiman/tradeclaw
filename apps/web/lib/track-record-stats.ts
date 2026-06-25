import { isCountedResolved } from './signal-history';
import { getResolvedSlice } from './signal-slice';
import { PRO_PREMIUM_MIN_CONFIDENCE } from './tier';

export type TrackRecordBand = 'all' | 'premium' | 'standard';

export interface TrackRecordStats {
  /** Resolved-signal count (the denominator). */
  total: number;
  /** Resolved signals whose 24h outcome hit. */
  wins: number;
  /** wins / total × 100, one decimal. 0 when total is 0. */
  winRate: number;
  /** Sum of resolved 24h pnlPct, two decimals. */
  totalPnl: number;
}

export function parseBand(raw: string | null | undefined): TrackRecordBand {
  if (raw === 'premium' || raw === 'standard' || raw === 'all') return raw;
  return 'all';
}

/**
 * 30-day resolved-signal stats for the public track-record SHARE surfaces
 * (OG social card + embed). Computed through the SAME resolved-signal logic
 * the page body and /api/signals/equity use — getResolvedSlice +
 * isCountedResolved — so the social card, the embed, and the page never
 * disagree on win-rate / P&L under the same banner (honesty contract,
 * cross-surface consistency). The prior raw SQL counted `outcome_24h IS NOT
 * NULL`, which folded in auto-expired and gate-blocked rows the page excludes.
 *
 * Scope is fixed to 'pro' (the full track record, same as the page default)
 * and period to '30d' (the advertised window). Band narrows by confidence,
 * matching the embed's premium/standard split.
 */
export async function computeTrackRecordStats(band: TrackRecordBand): Promise<TrackRecordStats> {
  const slice = await getResolvedSlice({ scope: 'pro', period: '30d' });

  let resolved = slice.resolved;
  if (band === 'premium') {
    resolved = resolved.filter(r => r.confidence >= PRO_PREMIUM_MIN_CONFIDENCE);
  } else if (band === 'standard') {
    resolved = resolved.filter(r => r.confidence < PRO_PREMIUM_MIN_CONFIDENCE);
  }
  // Re-apply the canonical resolved predicate after the band filter so the
  // denominator stays identical to the page body's definition.
  resolved = resolved.filter(isCountedResolved);

  const total = resolved.length;
  const wins = resolved.filter(r => r.outcomes['24h']!.hit).length;
  const totalPnl = +resolved
    .reduce((sum, r) => sum + r.outcomes['24h']!.pnlPct, 0)
    .toFixed(2);
  const winRate = total > 0 ? +((wins / total) * 100).toFixed(1) : 0;

  return { total, wins, winRate, totalPnl };
}
