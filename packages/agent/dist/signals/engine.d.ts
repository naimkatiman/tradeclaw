import type { TradingSignal, Timeframe } from '@tradeclaw/signals';
/**
 * Generate trading signals for a symbol across given timeframes.
 * Uses live prices when available (async version).
 */
export declare function generateSignalsAsync(symbolName: string, timeframes: Timeframe[], livePrices: Map<string, number>, skillName?: string): Promise<TradingSignal[]>;
/**
 * Synchronous version (backwards compatible) — uses fallback/static prices.
 */
export declare function generateSignals(symbolName: string, timeframes: Timeframe[], skillName?: string): TradingSignal[];
/**
 * Run a full scan across all configured symbols and timeframes.
 */
export declare function runScanAsync(symbols: string[], timeframes: Timeframe[], minConfidence?: number, skillName?: string): Promise<TradingSignal[]>;
/**
 * Synchronous runScan (backwards compatible).
 */
export declare function runScan(symbols: string[], timeframes: Timeframe[], minConfidence?: number, skillName?: string): TradingSignal[];
/**
 * Get all available symbol names.
 */
export declare function getAvailableSymbols(): string[];
//# sourceMappingURL=engine.d.ts.map