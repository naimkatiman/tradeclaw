export const HOUR_MS = 60 * 60 * 1000;
export const FOUR_HOURS_MS = 4 * HOUR_MS;
export const TWENTY_FOUR_HOURS_MS = 24 * HOUR_MS;

export interface HistoricalOutcomeLike {
  hit: boolean;
  pnlPct: number;
}

export interface HistoricalSignalLike {
  timestamp: number;
  isSimulated?: boolean;
  gateBlocked?: boolean;
  outcomes: {
    '4h': HistoricalOutcomeLike | null;
    '24h': HistoricalOutcomeLike | null;
  };
}

function isWithinWindow(timestamp: number, windowMs: number, now: number): boolean {
  return now - timestamp < windowMs;
}

/**
 * True while a historical outcome is still inside its resolution window and
 * therefore legitimately unresolved.
 */
export function isHistoricalOutcomePending(
  outcome: HistoricalOutcomeLike | null | undefined,
  timestamp: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  return outcome == null && isWithinWindow(timestamp, windowMs, now);
}

/** Backwards-friendly alias for callers that read more naturally. */
export const isPendingHistoricalOutcome = isHistoricalOutcomePending;

/**
 * True once a historical outcome has crossed its resolution window without
 * a TP/SL hit. This keeps stale unresolved rows from reading as "pending".
 */
export function isHistoricalOutcomeExpired(
  outcome: HistoricalOutcomeLike | null | undefined,
  timestamp: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  return outcome == null && !isWithinWindow(timestamp, windowMs, now);
}

/** Backwards-friendly alias for callers that read more naturally. */
export const isExpiredHistoricalOutcome = isHistoricalOutcomeExpired;

/**
 * 24h window helper used by the history + dashboard surfaces.
 */
export function isPendingHistoricalSignal(
  record: Pick<HistoricalSignalLike, 'timestamp' | 'isSimulated' | 'gateBlocked' | 'outcomes'>,
  now = Date.now(),
): boolean {
  if (record.isSimulated || record.gateBlocked) return false;
  return isHistoricalOutcomePending(record.outcomes['24h'], record.timestamp, TWENTY_FOUR_HOURS_MS, now);
}

export function isExpiredHistoricalSignal(
  record: Pick<HistoricalSignalLike, 'timestamp' | 'isSimulated' | 'gateBlocked' | 'outcomes'>,
  now = Date.now(),
): boolean {
  if (record.isSimulated || record.gateBlocked) return false;
  return isHistoricalOutcomeExpired(record.outcomes['24h'], record.timestamp, TWENTY_FOUR_HOURS_MS, now);
}

export type HistoricalOutcomeDisplayStatus = 'pending' | 'expired' | 'win' | 'loss';

/**
 * Canonical display state for the recent-outcomes carousel and similar UI.
 * Distinguishes genuine pending rows from stale unresolved rows and the
 * auto-expire sentinel outcome (`pnlPct === 0 && hit === false`).
 */
export function getHistoricalOutcomeDisplayStatus(
  record: Pick<HistoricalSignalLike, 'timestamp' | 'outcomes'>,
  now = Date.now(),
): HistoricalOutcomeDisplayStatus {
  const outcome = record.outcomes['24h'];
  if (outcome == null) {
    return isPendingHistoricalOutcome(outcome, record.timestamp, TWENTY_FOUR_HOURS_MS, now)
      ? 'pending'
      : 'expired';
  }

  if (outcome.pnlPct === 0 && !outcome.hit) {
    return 'expired';
  }

  return outcome.hit ? 'win' : 'loss';
}
