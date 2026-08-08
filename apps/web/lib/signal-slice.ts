import { getCachedHistory } from './signal-history-cache';
import {
  isCountedResolved,
  SIGNAL_HISTORY_READ_LIMIT,
  type SignalHistoryRecord,
} from './signal-history';

/**
 * Two row sets, and only one of them is a real distinction.
 *
 * 'pro' is the full row set. The name is a leftover from the paid tiers and is
 * kept because scope=pro links exist in the wild; `scope=full` is the honest
 * spelling and the one the docs advertise. Both resolve here, as does anything
 * unrecognised — there are no tier windows, everyone gets everything.
 *
 * 'broadcast' is the one honest segmentation: gate-approved rows only.
 */
export type SignalScope = 'pro' | 'broadcast';

const PERIOD_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '180d': 180,
  '1y': 365,
  '5y': 1825,
};

export interface ResolvedSlice {
  /** Rows loaded before scope filtering. Reads at the limit may omit older history. */
  sourceRecordsLoaded: number;
  sourceReadLimit: number;
  sourceWindowPotentiallyTruncated: boolean;
  /** Records after scope filter ('broadcast' narrows to gate-approved rows). */
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
  if (raw === 'broadcast') return 'broadcast';
  // 'full' is the documented spelling; 'pro' and anything else land here too.
  // Responses keep echoing 'pro' so the published open-data contract holds.
  return 'pro';
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

  // TradingView partner strategies stay dark pending partner sign-off (plan
  // open decision #4) — exclude any tv-* rows from every public slice
  // (history, equity, leaderboard, track-record stats) in one place.
  let scopedRecords = all.filter(r => !(r.strategyId ?? '').startsWith('tv-'));
  if (opts.scope === 'broadcast') {
    // Pro-broadcast subset: rows whose risk-pipeline decision ran at emission
    // AND approved. Strict === false — NULL
    // (pre-048 rows, or pipeline-outage fallbacks where the gate never ran)
    // is "decision not recorded" and must not be counted either way.
    scopedRecords = scopedRecords.filter(r => r.broadcastBlocked === false);
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

  return {
    sourceRecordsLoaded: all.length,
    sourceReadLimit: SIGNAL_HISTORY_READ_LIMIT,
    sourceWindowPotentiallyTruncated: all.length >= SIGNAL_HISTORY_READ_LIMIT,
    scopedRecords,
    periodFiltered,
    resolved,
    cutoffTs,
    earliestTimestamp,
  };
}
