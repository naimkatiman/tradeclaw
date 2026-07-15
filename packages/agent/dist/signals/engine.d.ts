import type { TradingSignal, IndicatorSummary, Direction, Timeframe, SymbolConfig } from '@tradeclaw/signals';
export declare const SIGNAL_SCAN_AVAILABILITY: Readonly<{
    available: false;
    dataQuality: "unavailable";
    reason: "observed-ohlcv-provider-not-configured";
}>;
/**
 * Compute full indicator summary from price data.
 * Exported for unit testing of the indicator-to-signal threshold mapping.
 */
export declare function computeIndicators(prices: {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
}, symbol: SymbolConfig): IndicatorSummary;
/**
 * Determine signal direction and confidence from indicators.
 * Exported for unit testing of the vote aggregator and confidence calculation.
 */
export declare function evaluateSignal(indicators: IndicatorSummary): {
    direction: Direction;
    confidence: number;
} | null;
/**
 * Signal generation is disabled until an observed OHLCV provider is wired in.
 * A spot quote is not a candle series and must not be expanded into synthetic
 * history. The legacy function remains for API compatibility and fails closed.
 */
export declare function generateSignalsAsync(symbolName: string, timeframes: Timeframe[], livePrices: Map<string, number>, skillName?: string): Promise<TradingSignal[]>;
/**
 * Synchronous legacy entry point. Without observed OHLCV it fails closed.
 */
export declare function generateSignals(symbolName: string, timeframes: Timeframe[], skillName?: string): TradingSignal[];
/**
 * Run a full scan. Disabled until observed OHLCV is configured.
 */
export declare function runScanAsync(symbols: string[], timeframes: Timeframe[], minConfidence?: number, skillName?: string): Promise<TradingSignal[]>;
/**
 * Synchronous legacy scan. Disabled until observed OHLCV is configured.
 */
export declare function runScan(symbols: string[], timeframes: Timeframe[], minConfidence?: number, skillName?: string): TradingSignal[];
/**
 * Get all available symbol names.
 */
export declare function getAvailableSymbols(): string[];
//# sourceMappingURL=engine.d.ts.map