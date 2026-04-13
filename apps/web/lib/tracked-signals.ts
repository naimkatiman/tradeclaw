import 'server-only';

import { getSignals } from '../app/lib/signals';
import { recordSignalsAsync } from './signal-history';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from './signal-thresholds';
import { getActivePreset } from '../app/api/cron/signals/preset-dispatch';

export async function getTrackedSignals(params: {
  symbol?: string;
  timeframe?: string;
  direction?: string;
  minConfidence?: number;
}) {
  const result = await getSignals(params);

  if (result.signals.length > 0) {
    // This is the actual production write path for signal_history (the
    // /api/cron/signals route reads from live_signals which is empty in
    // production, so it never inserts anything). Tag with the active
    // preset so /track-record's per-strategy breakdown reflects reality.
    const strategyId = getActivePreset().id;
    const toRecord = result.signals
      .filter(
        (signal) =>
          signal.dataQuality === 'real' &&
          signal.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE,
      )
      .map(signal => ({
        id: signal.id,
        symbol: signal.symbol,
        timeframe: signal.timeframe,
        direction: signal.direction,
        confidence: signal.confidence,
        entry: signal.entry,
        timestamp: signal.timestamp,
        takeProfit1: signal.takeProfit1,
        stopLoss: signal.stopLoss,
        strategyId,
      }));

    // Record to PostgreSQL (or file fallback) — fire and forget
    recordSignalsAsync(toRecord).catch(() => {});
  }

  return result;
}
