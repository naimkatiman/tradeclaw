/**
 * Technical indicator calculations using real mathematical formulas.
 * All functions operate on price arrays where index 0 is the oldest value.
 */
/**
 * Calculate Exponential Moving Average for a price series.
 * Returns the final EMA value.
 */
export declare function calculateEMA(prices: number[], period: number): number;
/**
 * Calculate Relative Strength Index.
 * Standard RSI with Wilder's smoothing method.
 */
export declare function calculateRSI(prices: number[], period?: number): number;
/**
 * Calculate MACD (Moving Average Convergence Divergence).
 * Uses 12-period fast EMA, 26-period slow EMA, 9-period signal line.
 */
export declare function calculateMACD(prices: number[]): {
    macd: number;
    signal: number;
    histogram: number;
};
/**
 * Calculate Bollinger Bands.
 * Middle band = SMA, Upper/Lower = SMA +/- (stddev * multiplier).
 */
export declare function calculateBollingerBands(prices: number[], period?: number, multiplier?: number): {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
};
/**
 * Calculate Stochastic Oscillator (%K and %D).
 * %K = (Close - Lowest Low) / (Highest High - Lowest Low) * 100
 * %D = SMA of %K values
 */
export declare function calculateStochastic(high: number[], low: number[], close: number[], kPeriod?: number, dPeriod?: number): {
    k: number;
    d: number;
};
/**
 * Identify support levels from price data.
 */
export declare function findSupportLevels(low: number[], count?: number): number[];
/**
 * Identify resistance levels from price data.
 */
export declare function findResistanceLevels(high: number[], count?: number): number[];
//# sourceMappingURL=indicators.d.ts.map