import type { TradingSignal } from '../app/lib/signals';

export interface SignalTeaser {
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  timestamp: number;
}

/**
 * Strip every field that would give away a tradable edge (entry price,
 * stops, targets, indicator internals, stable id) and return a display-
 * safe teaser. Used for public/anonymous payloads.
 *
 * Timeframe is included because it's public knowledge (TradeClaw runs
 * standard multi-timeframe) and the landing links route to a tier-gated
 * detail page at /signal/[symbol]-[timeframe]-[direction].
 */
export function toTeaser(signal: TradingSignal): SignalTeaser {
  return {
    symbol: signal.symbol,
    timeframe: signal.timeframe,
    direction: signal.direction,
    confidence: Math.round(signal.confidence),
    timestamp:
      typeof signal.timestamp === 'number'
        ? signal.timestamp
        : new Date(signal.timestamp).getTime(),
  };
}
