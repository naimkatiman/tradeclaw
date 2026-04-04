// ─── Utilities ─────────────────────────────────────────
/**
 * Generate a unique signal ID.
 */
export function generateSignalId() {
    return `SIG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}
/**
 * Clamp a value between min and max.
 */
export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}
/**
 * Format a number with commas for display.
 */
export function formatNumber(value, decimals) {
    if (decimals !== undefined) {
        return value.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }
    if (value >= 1000) {
        return value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }
    else if (value >= 1) {
        return value.toLocaleString('en-US', {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
        });
    }
    else {
        return value.toLocaleString('en-US', {
            minimumFractionDigits: 5,
            maximumFractionDigits: 5,
        });
    }
}
/**
 * Format the price difference for display.
 */
export function formatDiff(entry, target) {
    const diff = target - entry;
    const sign = diff >= 0 ? '+' : '-';
    return `${sign}$${formatNumber(Math.abs(diff))}`;
}
/**
 * Get the EMA trend display text.
 */
export function emaTrendText(trend) {
    switch (trend) {
        case 'up': return 'Uptrend';
        case 'down': return 'Downtrend';
        default: return 'Sideways';
    }
}
// ─── Indicators ───────────────────────────────────────
/**
 * Technical indicator calculations using real mathematical formulas.
 * All functions operate on price arrays where index 0 is the oldest value.
 */
/**
 * Calculate Exponential Moving Average for a price series.
 * Returns the final EMA value.
 */
export function calculateEMA(prices, period) {
    if (prices.length === 0)
        return 0;
    if (prices.length < period) {
        const sum = prices.reduce((a, b) => a + b, 0);
        return sum / prices.length;
    }
    const multiplier = 2 / (period + 1);
    // Start with SMA of first `period` values
    let ema = 0;
    for (let i = 0; i < period; i++) {
        ema += prices[i];
    }
    ema /= period;
    // Apply EMA formula for remaining values
    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
    }
    return ema;
}
/**
 * Calculate Relative Strength Index.
 * Standard RSI with Wilder's smoothing method.
 */
export function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1)
        return 50; // neutral default
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
        changes.push(prices[i] - prices[i - 1]);
    }
    // Initial average gain/loss over first `period` changes
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 0; i < period; i++) {
        if (changes[i] >= 0) {
            avgGain += changes[i];
        }
        else {
            avgLoss += Math.abs(changes[i]);
        }
    }
    avgGain /= period;
    avgLoss /= period;
    // Wilder's smoothing for remaining changes
    for (let i = period; i < changes.length; i++) {
        const change = changes[i];
        if (change >= 0) {
            avgGain = (avgGain * (period - 1) + change) / period;
            avgLoss = (avgLoss * (period - 1) + 0) / period;
        }
        else {
            avgGain = (avgGain * (period - 1) + 0) / period;
            avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
        }
    }
    if (avgLoss === 0)
        return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
}
/**
 * Calculate MACD (Moving Average Convergence Divergence).
 * Uses 12-period fast EMA, 26-period slow EMA, 9-period signal line.
 */
export function calculateMACD(prices) {
    if (prices.length < 26) {
        return { macd: 0, signal: 0, histogram: 0 };
    }
    const macdValues = [];
    const fastPeriod = 12;
    const slowPeriod = 26;
    const signalPeriod = 9;
    for (let end = slowPeriod; end <= prices.length; end++) {
        const slice = prices.slice(0, end);
        const fastEma = calculateEMA(slice, fastPeriod);
        const slowEma = calculateEMA(slice, slowPeriod);
        macdValues.push(fastEma - slowEma);
    }
    const macdLine = macdValues[macdValues.length - 1];
    const signalLine = macdValues.length >= signalPeriod
        ? calculateEMA(macdValues, signalPeriod)
        : macdLine;
    const histogram = macdLine - signalLine;
    return { macd: macdLine, signal: signalLine, histogram };
}
/**
 * Calculate Bollinger Bands.
 * Middle band = SMA, Upper/Lower = SMA +/- (stddev * multiplier).
 */
export function calculateBollingerBands(prices, period = 20, multiplier = 2) {
    if (prices.length < period) {
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        return { upper: avg, middle: avg, lower: avg, bandwidth: 0 };
    }
    const slice = prices.slice(-period);
    const middle = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, p) => sum + Math.pow(p - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    const upper = middle + multiplier * stdDev;
    const lower = middle - multiplier * stdDev;
    const bandwidth = middle !== 0 ? ((upper - lower) / middle) * 100 : 0;
    return { upper, middle, lower, bandwidth };
}
/**
 * Calculate Stochastic Oscillator (%K and %D).
 * %K = (Close - Lowest Low) / (Highest High - Lowest Low) * 100
 * %D = SMA of %K values
 */
export function calculateStochastic(high, low, close, kPeriod = 14, dPeriod = 3) {
    if (high.length < kPeriod || low.length < kPeriod || close.length < kPeriod) {
        return { k: 50, d: 50 };
    }
    const kValues = [];
    for (let i = kPeriod - 1; i < close.length; i++) {
        const periodHigh = high.slice(i - kPeriod + 1, i + 1);
        const periodLow = low.slice(i - kPeriod + 1, i + 1);
        const highestHigh = Math.max(...periodHigh);
        const lowestLow = Math.min(...periodLow);
        const range = highestHigh - lowestLow;
        const k = range !== 0 ? ((close[i] - lowestLow) / range) * 100 : 50;
        kValues.push(k);
    }
    const currentK = kValues[kValues.length - 1];
    let currentD;
    if (kValues.length >= dPeriod) {
        const dSlice = kValues.slice(-dPeriod);
        currentD = dSlice.reduce((a, b) => a + b, 0) / dPeriod;
    }
    else {
        currentD = currentK;
    }
    return { k: currentK, d: currentD };
}
/**
 * Identify support levels from price data.
 */
export function findSupportLevels(low, count = 3) {
    if (low.length < 5)
        return [low[low.length - 1]];
    const pivots = [];
    for (let i = 2; i < low.length - 2; i++) {
        if (low[i] < low[i - 1] && low[i] < low[i - 2] && low[i] < low[i + 1] && low[i] < low[i + 2]) {
            pivots.push(low[i]);
        }
    }
    pivots.sort((a, b) => b - a);
    return pivots.slice(0, count);
}
/**
 * Identify resistance levels from price data.
 */
export function findResistanceLevels(high, count = 3) {
    if (high.length < 5)
        return [high[high.length - 1]];
    const pivots = [];
    for (let i = 2; i < high.length - 2; i++) {
        if (high[i] > high[i - 1] && high[i] > high[i - 2] && high[i] > high[i + 1] && high[i] > high[i + 2]) {
            pivots.push(high[i]);
        }
    }
    pivots.sort((a, b) => a - b);
    return pivots.slice(0, count);
}
// ─── Symbols ──────────────────────────────────────────
export const SYMBOLS = {
    XAUUSD: {
        symbol: 'XAUUSD',
        name: 'Gold / US Dollar',
        pip: 0.01,
        basePrice: 3020.00,
        volatility: 0.008,
    },
    XAGUSD: {
        symbol: 'XAGUSD',
        name: 'Silver / US Dollar',
        pip: 0.001,
        basePrice: 33.50,
        volatility: 0.012,
    },
    BTCUSD: {
        symbol: 'BTCUSD',
        name: 'Bitcoin / US Dollar',
        pip: 0.01,
        basePrice: 87000.00,
        volatility: 0.025,
    },
    ETHUSD: {
        symbol: 'ETHUSD',
        name: 'Ethereum / US Dollar',
        pip: 0.01,
        basePrice: 2050.00,
        volatility: 0.030,
    },
    SOLUSD: {
        symbol: 'SOLUSD',
        name: 'Solana / US Dollar',
        pip: 0.01,
        basePrice: 140.00,
        volatility: 0.035,
    },
    DOGEUSD: {
        symbol: 'DOGEUSD',
        name: 'Dogecoin / US Dollar',
        pip: 0.00001,
        basePrice: 0.178,
        volatility: 0.040,
    },
    BNBUSD: {
        symbol: 'BNBUSD',
        name: 'BNB / US Dollar',
        pip: 0.01,
        basePrice: 608.50,
        volatility: 0.025,
    },
    XRPUSD: {
        symbol: 'XRPUSD',
        name: 'Ripple / US Dollar',
        pip: 0.0001,
        basePrice: 2.45,
        volatility: 0.028,
    },
    EURUSD: {
        symbol: 'EURUSD',
        name: 'Euro / US Dollar',
        pip: 0.0001,
        basePrice: 1.0790,
        volatility: 0.004,
    },
    GBPUSD: {
        symbol: 'GBPUSD',
        name: 'British Pound / US Dollar',
        pip: 0.0001,
        basePrice: 1.2920,
        volatility: 0.005,
    },
    USDJPY: {
        symbol: 'USDJPY',
        name: 'US Dollar / Japanese Yen',
        pip: 0.01,
        basePrice: 150.30,
        volatility: 0.004,
    },
    AUDUSD: {
        symbol: 'AUDUSD',
        name: 'Australian Dollar / US Dollar',
        pip: 0.0001,
        basePrice: 0.6290,
        volatility: 0.006,
    },
    USDCAD: {
        symbol: 'USDCAD',
        name: 'US Dollar / Canadian Dollar',
        pip: 0.0001,
        basePrice: 1.3826,
        volatility: 0.005,
    },
    NZDUSD: {
        symbol: 'NZDUSD',
        name: 'New Zealand Dollar / US Dollar',
        pip: 0.0001,
        basePrice: 0.5799,
        volatility: 0.004,
    },
    USDCHF: {
        symbol: 'USDCHF',
        name: 'US Dollar / Swiss Franc',
        pip: 0.0001,
        basePrice: 0.7922,
        volatility: 0.004,
    },
};
export function getSymbolConfig(symbol) {
    return SYMBOLS[symbol.toUpperCase()];
}
export function getAllSymbols() {
    return Object.keys(SYMBOLS);
}
export function getSymbolCategory(symbol) {
    const metals = ['XAUUSD', 'XAGUSD'];
    const crypto = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'DOGEUSD', 'BNBUSD', 'XRPUSD'];
    const s = symbol.toUpperCase();
    if (metals.includes(s))
        return 'metals';
    if (crypto.includes(s))
        return 'crypto';
    return 'forex';
}
/**
 * Update a symbol's base price at runtime (e.g. after fetching live prices).
 */
export function updateBasePrice(symbol, price) {
    const config = SYMBOLS[symbol.toUpperCase()];
    if (config && price > 0) {
        config.basePrice = price;
    }
}
//# sourceMappingURL=index.js.map