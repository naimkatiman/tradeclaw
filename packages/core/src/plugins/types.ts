/**
 * OHLCV candle data — the standard input for all indicator plugins.
 */
export interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

/**
 * The result returned by an indicator plugin after computation.
 */
export interface IndicatorResult {
  /** Directional signal produced by the indicator. */
  signal: 'BUY' | 'SELL' | 'HOLD';
  /** Confidence score from 0 (no confidence) to 100 (maximum confidence). */
  confidence: number;
  /** Optional metadata — indicator-specific values, debug info, etc. */
  meta?: Record<string, unknown>;
}

/**
 * The interface every indicator plugin must implement.
 *
 * @example
 * ```ts
 * const myPlugin: IndicatorPlugin = {
 *   name: 'my-indicator',
 *   version: '1.0.0',
 *   compute(candles) {
 *     // ... your logic
 *     return { signal: 'BUY', confidence: 75 };
 *   },
 * };
 * ```
 */
export interface IndicatorPlugin {
  /** Unique human-readable name for the plugin. */
  name: string;
  /** Semver version string. */
  version: string;
  /** Run the indicator computation against the provided candle data. */
  compute(candles: OHLCV[]): IndicatorResult;
}
