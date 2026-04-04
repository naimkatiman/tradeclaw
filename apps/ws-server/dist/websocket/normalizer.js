import { getAllSymbols } from '@tradeclaw/signals';
// Binance symbol mapping: TradeClaw -> Binance
const TC_TO_BINANCE = {
    BTCUSD: 'btcusdt',
    ETHUSD: 'ethusdt',
    SOLUSD: 'solusdt',
    DOGEUSD: 'dogeusdt',
    BNBUSD: 'bnbusdt',
    XRPUSD: 'xrpusdt',
};
const BINANCE_TO_TC = Object.fromEntries(Object.entries(TC_TO_BINANCE).map(([tc, bn]) => [bn, tc]));
const validSymbols = new Set(getAllSymbols());
export function toBinanceSymbol(tcSymbol) {
    return TC_TO_BINANCE[tcSymbol.toUpperCase()];
}
export function fromBinanceSymbol(binanceSymbol) {
    return BINANCE_TO_TC[binanceSymbol.toLowerCase()];
}
export function getBinanceCryptoSymbols() {
    return Object.keys(TC_TO_BINANCE);
}
export function normalizeBinanceMiniTicker(raw) {
    const symbol = fromBinanceSymbol(raw.s.toLowerCase());
    if (!symbol || !validSymbols.has(symbol))
        return null;
    const close = parseFloat(raw.c);
    if (isNaN(close) || close <= 0)
        return null;
    // Estimate spread as 0.01% of price
    const spread = close * 0.0001;
    return {
        symbol,
        bid: close - spread / 2,
        ask: close + spread / 2,
        mid: close,
        timestamp: raw.E || Date.now(),
        provider: 'binance',
    };
}
export function normalizeBinanceTrade(raw) {
    const symbol = fromBinanceSymbol(raw.s.toLowerCase());
    if (!symbol || !validSymbols.has(symbol))
        return null;
    const price = parseFloat(raw.p);
    if (isNaN(price) || price <= 0)
        return null;
    const spread = price * 0.0001;
    return {
        symbol,
        bid: price - spread / 2,
        ask: price + spread / 2,
        mid: price,
        timestamp: raw.T || Date.now(),
        provider: 'binance',
    };
}
export function isValidSymbol(symbol) {
    return validSymbols.has(symbol.toUpperCase());
}
//# sourceMappingURL=normalizer.js.map