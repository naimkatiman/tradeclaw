import { calculateRSI, calculateMACD, calculateEMA, calculateBollingerBands, calculateStochastic, findSupportLevels, findResistanceLevels, } from '@tradeclaw/signals';
import { getSymbolConfig, SYMBOLS } from '@tradeclaw/signals';
import { fetchLivePrices } from './prices.js';
/**
 * Seeded PRNG (mulberry32) for deterministic price generation.
 * Same seed -> same sequence every time.
 */
function mulberry32(seed) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/**
 * Generate a hash from a string for seeding.
 */
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash);
}
/**
 * Generate a deterministic price series for a symbol.
 * Uses hourly seed so signals are consistent within an hour.
 * Anchored to the live base price so series reflects real market levels.
 */
function generatePriceSeries(symbol, timeframe, liveBasePrice, count = 100) {
    const now = new Date();
    const hourKey = `${symbol.symbol}-${timeframe}-${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`;
    const seed = hashString(hourKey);
    const rng = mulberry32(seed);
    const open = [];
    const high = [];
    const low = [];
    const close = [];
    let price = liveBasePrice * (1 - symbol.volatility * 2 + rng() * symbol.volatility * 4);
    for (let i = 0; i < count; i++) {
        const change = (rng() - 0.5) * 2 * symbol.volatility * price;
        const isLast = i === count - 1;
        const o = price;
        let c;
        if (isLast) {
            c = liveBasePrice;
        }
        else {
            c = price + change;
        }
        const spread = Math.abs(c - o) * (0.5 + rng());
        const h = Math.max(o, c) + spread * rng();
        const l = Math.min(o, c) - spread * rng();
        open.push(roundPrice(o, symbol));
        high.push(roundPrice(h, symbol));
        low.push(roundPrice(l, symbol));
        close.push(roundPrice(c, symbol));
        price = c;
    }
    return { open, high, low, close };
}
function roundPrice(price, symbol) {
    const decimals = Math.max(0, -Math.floor(Math.log10(symbol.pip)));
    return Number(price.toFixed(decimals));
}
/**
 * Compute full indicator summary from price data.
 */
function computeIndicators(prices, symbol) {
    const { high, low, close } = prices;
    const rsiValue = calculateRSI(close, 14);
    const rsiSignal = rsiValue < 30 ? 'oversold' : rsiValue > 70 ? 'overbought' : 'neutral';
    const macdResult = calculateMACD(close);
    const macdSignal = macdResult.histogram > 0 ? 'bullish' : macdResult.histogram < 0 ? 'bearish' : 'neutral';
    const ema20 = calculateEMA(close, 20);
    const ema50 = calculateEMA(close, 50);
    const ema200 = calculateEMA(close, 200);
    const currentPrice = close[close.length - 1];
    const emaTrend = currentPrice > ema20 && ema20 > ema50 ? 'up' :
        currentPrice < ema20 && ema20 < ema50 ? 'down' : 'sideways';
    const bb = calculateBollingerBands(close, 20);
    const bbPosition = currentPrice > bb.upper ? 'upper' :
        currentPrice < bb.lower ? 'lower' : 'middle';
    const stoch = calculateStochastic(high, low, close, 14, 3);
    const stochSignal = stoch.k < 20 ? 'oversold' : stoch.k > 80 ? 'overbought' : 'neutral';
    const support = findSupportLevels(low, 3).map((p) => roundPrice(p, symbol));
    const resistance = findResistanceLevels(high, 3).map((p) => roundPrice(p, symbol));
    return {
        rsi: { value: Number(rsiValue.toFixed(1)), signal: rsiSignal },
        macd: { histogram: Number(macdResult.histogram.toFixed(4)), signal: macdSignal },
        ema: {
            trend: emaTrend,
            ema20: roundPrice(ema20, symbol),
            ema50: roundPrice(ema50, symbol),
            ema200: roundPrice(ema200, symbol),
        },
        bollingerBands: { position: bbPosition, bandwidth: Number(bb.bandwidth.toFixed(2)) },
        stochastic: {
            k: Number(stoch.k.toFixed(1)),
            d: Number(stoch.d.toFixed(1)),
            signal: stochSignal,
        },
        support,
        resistance,
    };
}
/**
 * Determine signal direction and confidence from indicators.
 */
function evaluateSignal(indicators) {
    let buyScore = 0;
    let sellScore = 0;
    const rsi = indicators.rsi.value;
    if (rsi < 30)
        buyScore += 25;
    else if (rsi < 40)
        buyScore += 15;
    else if (rsi < 50)
        buyScore += 5;
    else if (rsi > 70)
        sellScore += 25;
    else if (rsi > 60)
        sellScore += 15;
    else if (rsi > 50)
        sellScore += 5;
    if (indicators.macd.signal === 'bullish')
        buyScore += 20;
    else if (indicators.macd.signal === 'bearish')
        sellScore += 20;
    if (indicators.ema.trend === 'up')
        buyScore += 20;
    else if (indicators.ema.trend === 'down')
        sellScore += 20;
    else if (indicators.ema.ema20 > indicators.ema.ema50)
        buyScore += 8;
    else
        sellScore += 8;
    if (indicators.bollingerBands.position === 'lower')
        buyScore += 15;
    else if (indicators.bollingerBands.position === 'upper')
        sellScore += 15;
    else if (indicators.bollingerBands.bandwidth > 2) {
        buyScore += 5;
        sellScore += 5;
    }
    const stochK = indicators.stochastic.k;
    if (stochK < 20)
        buyScore += 20;
    else if (stochK < 35)
        buyScore += 12;
    else if (stochK < 50)
        buyScore += 4;
    else if (stochK > 80)
        sellScore += 20;
    else if (stochK > 65)
        sellScore += 12;
    else if (stochK > 50)
        sellScore += 4;
    const maxScore = Math.max(buyScore, sellScore);
    if (maxScore < 20)
        return null;
    const direction = buyScore >= sellScore ? 'BUY' : 'SELL';
    const confidence = Math.min(Math.round(40 + (maxScore - 20) * (58 / 80)), 98);
    return { direction, confidence };
}
/**
 * Generate a unique signal ID.
 */
function generateSignalId(symbol, timeframe) {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 6);
    return `${symbol}-${timeframe}-${ts}-${rand}`.toLowerCase();
}
/**
 * Generate trading signals for a symbol across given timeframes.
 * Uses live prices when available (async version).
 */
export async function generateSignalsAsync(symbolName, timeframes, livePrices, skillName) {
    const symbol = getSymbolConfig(symbolName);
    if (!symbol)
        return [];
    const signals = [];
    const livePrice = livePrices.get(symbolName) ?? symbol.basePrice;
    for (const timeframe of timeframes) {
        const prices = generatePriceSeries(symbol, timeframe, livePrice);
        const indicators = computeIndicators(prices, symbol);
        const evaluation = evaluateSignal(indicators);
        if (!evaluation)
            continue;
        const currentPrice = prices.close[prices.close.length - 1];
        const volatilityPoints = currentPrice * symbol.volatility;
        let stopLoss;
        let tp1;
        let tp2;
        let tp3;
        if (evaluation.direction === 'BUY') {
            stopLoss = roundPrice(currentPrice - volatilityPoints * 1.5, symbol);
            tp1 = roundPrice(currentPrice + volatilityPoints * 1.0, symbol);
            tp2 = roundPrice(currentPrice + volatilityPoints * 2.0, symbol);
            tp3 = roundPrice(currentPrice + volatilityPoints * 3.5, symbol);
        }
        else {
            stopLoss = roundPrice(currentPrice + volatilityPoints * 1.5, symbol);
            tp1 = roundPrice(currentPrice - volatilityPoints * 1.0, symbol);
            tp2 = roundPrice(currentPrice - volatilityPoints * 2.0, symbol);
            tp3 = roundPrice(currentPrice - volatilityPoints * 3.5, symbol);
        }
        signals.push({
            id: generateSignalId(symbolName, timeframe),
            symbol: symbolName,
            direction: evaluation.direction,
            confidence: evaluation.confidence,
            entry: currentPrice,
            stopLoss,
            takeProfit1: tp1,
            takeProfit2: tp2,
            takeProfit3: tp3,
            indicators,
            timeframe,
            timestamp: new Date().toISOString(),
            status: 'active',
            skill: skillName,
        });
    }
    return signals;
}
/**
 * Synchronous version (backwards compatible) — uses fallback/static prices.
 */
export function generateSignals(symbolName, timeframes, skillName) {
    const symbol = getSymbolConfig(symbolName);
    if (!symbol)
        return [];
    const signals = [];
    for (const timeframe of timeframes) {
        const prices = generatePriceSeries(symbol, timeframe, symbol.basePrice);
        const indicators = computeIndicators(prices, symbol);
        const evaluation = evaluateSignal(indicators);
        if (!evaluation)
            continue;
        const currentPrice = prices.close[prices.close.length - 1];
        const volatilityPoints = currentPrice * symbol.volatility;
        let stopLoss;
        let tp1;
        let tp2;
        let tp3;
        if (evaluation.direction === 'BUY') {
            stopLoss = roundPrice(currentPrice - volatilityPoints * 1.5, symbol);
            tp1 = roundPrice(currentPrice + volatilityPoints * 1.0, symbol);
            tp2 = roundPrice(currentPrice + volatilityPoints * 2.0, symbol);
            tp3 = roundPrice(currentPrice + volatilityPoints * 3.5, symbol);
        }
        else {
            stopLoss = roundPrice(currentPrice + volatilityPoints * 1.5, symbol);
            tp1 = roundPrice(currentPrice - volatilityPoints * 1.0, symbol);
            tp2 = roundPrice(currentPrice - volatilityPoints * 2.0, symbol);
            tp3 = roundPrice(currentPrice - volatilityPoints * 3.5, symbol);
        }
        signals.push({
            id: generateSignalId(symbolName, timeframe),
            symbol: symbolName,
            direction: evaluation.direction,
            confidence: evaluation.confidence,
            entry: currentPrice,
            stopLoss,
            takeProfit1: tp1,
            takeProfit2: tp2,
            takeProfit3: tp3,
            indicators,
            timeframe,
            timestamp: new Date().toISOString(),
            status: 'active',
            skill: skillName,
        });
    }
    return signals;
}
/**
 * Run a full scan across all configured symbols and timeframes.
 */
export async function runScanAsync(symbols, timeframes, minConfidence = 70, skillName) {
    const livePrices = await fetchLivePrices();
    const allSignals = [];
    for (const symbol of symbols) {
        const signals = await generateSignalsAsync(symbol, timeframes, livePrices, skillName);
        for (const signal of signals) {
            if (signal.confidence >= minConfidence) {
                allSignals.push(signal);
            }
        }
    }
    allSignals.sort((a, b) => b.confidence - a.confidence);
    return allSignals;
}
/**
 * Synchronous runScan (backwards compatible).
 */
export function runScan(symbols, timeframes, minConfidence = 70, skillName) {
    const allSignals = [];
    for (const symbol of symbols) {
        const signals = generateSignals(symbol, timeframes, skillName);
        for (const signal of signals) {
            if (signal.confidence >= minConfidence) {
                allSignals.push(signal);
            }
        }
    }
    allSignals.sort((a, b) => b.confidence - a.confidence);
    return allSignals;
}
/**
 * Get all available symbol names.
 */
export function getAvailableSymbols() {
    return Object.keys(SYMBOLS);
}
//# sourceMappingURL=engine.js.map