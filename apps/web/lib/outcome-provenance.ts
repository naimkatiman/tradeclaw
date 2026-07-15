export const OBSERVED_OHLCV_OUTCOME_SOURCES = [
  'market-data-hub',
  'binance',
  'stooq',
  'kraken',
  'cryptocompare',
] as const;

export type ObservedOHLCVOutcomeSource = typeof OBSERVED_OHLCV_OUTCOME_SOURCES[number];

const observedSources = new Set<string>(OBSERVED_OHLCV_OUTCOME_SOURCES);

export function isObservedOHLCVOutcomeSource(
  source: unknown,
): source is ObservedOHLCVOutcomeSource {
  return typeof source === 'string' && observedSources.has(source);
}
