import 'server-only';

import { getSignals } from '../app/lib/signals';
import { recordSignalsAsync } from './signal-history';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from './signal-thresholds';

export async function getTrackedSignals(params: {
  symbol?: string;
  timeframe?: string;
  direction?: string;
  minConfidence?: number;
}) {
  const result = await getSignals(params);

  if (result.signals.length > 0) {
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
      }));

    // Record to PostgreSQL (or file fallback) — fire and forget
    recordSignalsAsync(toRecord).catch(() => {});
  }

  return result;
}
