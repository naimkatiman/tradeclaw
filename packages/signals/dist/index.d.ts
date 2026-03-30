export type Direction = 'BUY' | 'SELL';
export type Timeframe = 'M5' | 'M15' | 'H1' | 'H4' | 'D1';
export type SignalStatus = 'active' | 'hit_tp1' | 'hit_tp2' | 'hit_tp3' | 'stopped' | 'expired';
export interface TradingSignal {
    id: string;
    symbol: string;
    direction: Direction;
    confidence: number;
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    takeProfit3: number;
    indicators: IndicatorSummary;
    timeframe: Timeframe;
    timestamp: string;
    status: SignalStatus;
    source?: 'real' | 'fallback';
    dataQuality?: 'real' | 'synthetic';
    skill?: string;
}
export interface IndicatorSummary {
    rsi: {
        value: number;
        signal: 'oversold' | 'neutral' | 'overbought';
    };
    macd: {
        histogram: number;
        signal: 'bullish' | 'bearish' | 'neutral';
    };
    ema: {
        trend: 'up' | 'down' | 'sideways';
        ema20: number;
        ema50: number;
        ema200: number;
    };
    bollingerBands: {
        position: 'upper' | 'middle' | 'lower';
        bandwidth: number;
    };
    stochastic: {
        k: number;
        d: number;
        signal: 'oversold' | 'neutral' | 'overbought';
    };
    support: number[];
    resistance: number[];
    adx?: {
        value: number;
        trending: boolean;
        plusDI: number;
        minusDI: number;
    };
    volume?: {
        current: number;
        average: number;
        ratio: number;
        confirmed: boolean;
    };
}
export interface SymbolConfig {
    symbol: string;
    name: string;
    pip: number;
    basePrice: number;
    volatility: number;
}
export interface GatewayConfig {
    scanInterval: number;
    minConfidence: number;
    symbols: string[];
    timeframes: Timeframe[];
    channels: ChannelConfig[];
    skills: string[];
}
export interface ChannelConfig {
    type: 'telegram' | 'discord' | 'webhook';
    enabled: boolean;
    telegramBotToken?: string;
    telegramChatId?: string;
    discordWebhookUrl?: string;
    webhookUrl?: string;
}
/**
 * Generate a unique signal ID.
 */
export declare function generateSignalId(): string;
/**
 * Clamp a value between min and max.
 */
export declare function clamp(val: number, min: number, max: number): number;
/**
 * Format a number with commas for display.
 */
export declare function formatNumber(value: number, decimals?: number): string;
/**
 * Format the price difference for display.
 */
export declare function formatDiff(entry: number, target: number): string;
/**
 * Get the EMA trend display text.
 */
export declare function emaTrendText(trend: string): string;
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
export declare const SYMBOLS: Record<string, SymbolConfig>;
export declare function getSymbolConfig(symbol: string): SymbolConfig | undefined;
export declare function getAllSymbols(): string[];
/**
 * Update a symbol's base price at runtime (e.g. after fetching live prices).
 */
export declare function updateBasePrice(symbol: string, price: number): void;
//# sourceMappingURL=index.d.ts.map