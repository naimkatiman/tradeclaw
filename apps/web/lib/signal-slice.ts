import { getCachedHistory } from './signal-history-cache';
import { isCountedResolved, type SignalHistoryRecord } from './signal-history';
import { TIER_SYMBOLS, TIER_HISTORY_DAYS } from './tier';

export type SignalScope = 'pro' | 'free';

const PERIOD_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '180d': 180,
  '1y': 365,
  '5y': 1825,
};

export interface ResolvedSlice {
  /** Records after scope filter (free narrows to free symbols + 24h window). */
  scopedRecords: SignalHistoryRecord[];
  /** Records after scope + period filter. The shared row set both endpoints stat from. */
  periodFiltered: SignalHistoryRecord[];
  /** Subset of periodFiltered that counts toward win-rate / equity / breakdown. */
  resolved: SignalHistoryRecord[];
  /** Period cutoff used (null when period === 'all' or unrecognised). */
  cutoffTs: number | null;
  /** Earliest record in scopedRecords (pre-period); used by UI to disable
   * period buttons whose window pre-dates any data we have. */
  earliestTimestamp: number | null;
}

export function parseScope(raw: string | null | undefined): SignalScope {
  return raw === 'free' ? 'free' : 'pro';
}

/**
 * Single source of truth for "what rows count for this {scope, period}".
 *
 * Both /api/signals/history and /api/signals/equity (and any future surface
 * showing aggregate stats) must consume this so a stat panel and an equity
 * curve on the same page never disagree on the underlying row set.
 *
 * Reads through the shared cache, snapshots `Date.now()` once, and applies
 * scope + period filters in a fixed order.
 */
export async function getResolvedSlice(opts: {
  scope: SignalScope;
  period?: string | null;
}): Promise<ResolvedSlice> {
  const all = await getCachedHistory();
  const now = Date.now();

  let scopedRecords = all;
  if (opts.scope === 'free') {
    const allowed = TIER_SYMBOLS.free;
    const days = TIER_HISTORY_DAYS.free;
    scopedRecords = scopedRecords.filter(r => allowed.includes(r.pair));
    if (days !== null) {
      const cutoff = now - days * 86_400_000;
      scopedRecords = scopedRecords.filter(r => r.timestamp >= cutoff);
    }
  }

  const earliestTimestamp = scopedRecords.length > 0
    ? scopedRecords.reduce(
        (min, r) => (r.timestamp < min ? r.timestamp : min),
        scopedRecords[0].timestamp,
      )
    : null;

  let cutoffTs: number | null = null;
  let periodFiltered = scopedRecords;
  if (opts.period && opts.period in PERIOD_DAYS) {
    cutoffTs = now - PERIOD_DAYS[opts.period] * 86_400_000;
    periodFiltered = scopedRecords.filter(r => r.timestamp >= cutoffTs!);
  }

  const resolved = periodFiltered.filter(isCountedResolved);

  return { scopedRecords, periodFiltered, resolved, cutoffTs, earliestTimestamp };
}
