import type { TradingSignal } from '../app/lib/signals';

export interface SignalTeaser {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  timestamp: number;
}

/**
 * Strip every field that would give away a tradable edge (entry price,
 * stops, targets, indicator internals, stable id) and return a display-
 * safe teaser. Used for public/anonymous payloads.
 */
export function toTeaser(signal: TradingSignal): SignalTeaser {
  return {
    symbol: signal.symbol,
    direction: signal.direction,
    confidence: Math.round(signal.confidence),
    timestamp:
      typeof signal.timestamp === 'number'
        ? signal.timestamp
        : new Date(signal.timestamp).getTime(),
  };
}
