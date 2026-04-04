import { describe, it, expect } from 'vitest';
import { toBinanceSymbol, fromBinanceSymbol, normalizeBinanceMiniTicker, normalizeBinanceTrade, isValidSymbol, getBinanceCryptoSymbols, } from '../websocket/normalizer.js';
describe('normalizer', () => {
    describe('toBinanceSymbol', () => {
        it('maps BTCUSD to btcusdt', () => {
            expect(toBinanceSymbol('BTCUSD')).toBe('btcusdt');
        });
        it('is case-insensitive', () => {
            expect(toBinanceSymbol('ethusd')).toBe('ethusdt');
        });
        it('returns undefined for non-crypto symbols', () => {
            expect(toBinanceSymbol('XAUUSD')).toBeUndefined();
            expect(toBinanceSymbol('EURUSD')).toBeUndefined();
        });
    });
    describe('fromBinanceSymbol', () => {
        it('maps btcusdt to BTCUSD', () => {
            expect(fromBinanceSymbol('btcusdt')).toBe('BTCUSD');
        });
        it('returns undefined for unknown symbols', () => {
            expect(fromBinanceSymbol('unknown')).toBeUndefined();
        });
    });
    describe('getBinanceCryptoSymbols', () => {
        it('returns all mapped crypto symbols', () => {
            const symbols = getBinanceCryptoSymbols();
            expect(symbols).toContain('BTCUSD');
            expect(symbols).toContain('ETHUSD');
            expect(symbols.length).toBeGreaterThanOrEqual(6);
        });
    });
    describe('normalizeBinanceMiniTicker', () => {
        it('normalizes a valid mini ticker', () => {
            const raw = {
                e: '24hrMiniTicker',
                s: 'BTCUSDT',
                c: '87000.50',
                o: '86500.00',
                h: '87500.00',
                l: '86000.00',
                E: 1700000000000,
            };
            const tick = normalizeBinanceMiniTicker(raw);
            expect(tick).not.toBeNull();
            expect(tick.symbol).toBe('BTCUSD');
            expect(tick.mid).toBe(87000.5);
            expect(tick.bid).toBeLessThan(tick.mid);
            expect(tick.ask).toBeGreaterThan(tick.mid);
            expect(tick.provider).toBe('binance');
            expect(tick.timestamp).toBe(1700000000000);
        });
        it('returns null for unknown symbols', () => {
            const raw = {
                e: '24hrMiniTicker',
                s: 'UNKNOWNUSDT',
                c: '100',
                o: '100',
                h: '100',
                l: '100',
                E: Date.now(),
            };
            expect(normalizeBinanceMiniTicker(raw)).toBeNull();
        });
        it('returns null for zero price', () => {
            const raw = {
                e: '24hrMiniTicker',
                s: 'BTCUSDT',
                c: '0',
                o: '0',
                h: '0',
                l: '0',
                E: Date.now(),
            };
            expect(normalizeBinanceMiniTicker(raw)).toBeNull();
        });
        it('returns null for NaN price', () => {
            const raw = {
                e: '24hrMiniTicker',
                s: 'BTCUSDT',
                c: 'not-a-number',
                o: '0',
                h: '0',
                l: '0',
                E: Date.now(),
            };
            expect(normalizeBinanceMiniTicker(raw)).toBeNull();
        });
    });
    describe('normalizeBinanceTrade', () => {
        it('normalizes a valid trade', () => {
            const raw = {
                e: 'trade',
                s: 'ETHUSDT',
                p: '2050.75',
                q: '1.5',
                T: 1700000000000,
            };
            const tick = normalizeBinanceTrade(raw);
            expect(tick).not.toBeNull();
            expect(tick.symbol).toBe('ETHUSD');
            expect(tick.mid).toBe(2050.75);
            expect(tick.provider).toBe('binance');
        });
    });
    describe('isValidSymbol', () => {
        it('validates known symbols', () => {
            expect(isValidSymbol('BTCUSD')).toBe(true);
            expect(isValidSymbol('XAUUSD')).toBe(true);
            expect(isValidSymbol('EURUSD')).toBe(true);
        });
        it('rejects unknown symbols', () => {
            expect(isValidSymbol('FAKEUSD')).toBe(false);
        });
        it('is case-insensitive', () => {
            expect(isValidSymbol('btcusd')).toBe(true);
        });
    });
});
//# sourceMappingURL=normalizer.test.js.map