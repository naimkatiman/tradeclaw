import 'server-only';

import { getSignals } from '../app/lib/signals';
import { recordSignals } from './signal-history';

export async function getTrackedSignals(params: {
  symbol?: string;
  timeframe?: string;
  direction?: string;
  minConfidence?: number;
}) {
  const result = await getSignals(params);

  if (result.signals.length > 0) {
    recordSignals(
      result.signals
        .filter(signal => signal.dataQuality === 'real')
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
        })),
    );
  }

  return result;
}
