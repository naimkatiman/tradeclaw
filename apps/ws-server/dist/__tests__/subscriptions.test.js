import { describe, it, expect, beforeEach } from 'vitest';
import { SubscriptionManager } from '../websocket/subscriptions.js';
describe('SubscriptionManager', () => {
    let mgr;
    beforeEach(() => {
        mgr = new SubscriptionManager();
    });
    describe('subscribe', () => {
        it('subscribes a client to valid symbols', () => {
            const result = mgr.subscribe('c1', ['BTCUSD', 'ETHUSD']);
            expect(result).toEqual(['BTCUSD', 'ETHUSD']);
        });
        it('filters out invalid symbols', () => {
            const result = mgr.subscribe('c1', ['BTCUSD', 'FAKECOIN']);
            expect(result).toEqual(['BTCUSD']);
        });
        it('is case-insensitive', () => {
            const result = mgr.subscribe('c1', ['btcusd']);
            expect(result).toEqual(['BTCUSD']);
        });
        it('handles duplicate subscriptions idempotently', () => {
            mgr.subscribe('c1', ['BTCUSD']);
            mgr.subscribe('c1', ['BTCUSD']);
            expect(mgr.getSubscribers('BTCUSD').size).toBe(1);
        });
    });
    describe('unsubscribe', () => {
        it('unsubscribes a client from symbols', () => {
            mgr.subscribe('c1', ['BTCUSD', 'ETHUSD']);
            mgr.unsubscribe('c1', ['BTCUSD']);
            expect(mgr.getSubscribers('BTCUSD').size).toBe(0);
            expect(mgr.getSubscribers('ETHUSD').size).toBe(1);
        });
        it('handles unsubscribe from non-subscribed symbol', () => {
            const result = mgr.unsubscribe('c1', ['BTCUSD']);
            expect(result).toEqual(['BTCUSD']);
        });
    });
    describe('removeClient', () => {
        it('removes all subscriptions for a client', () => {
            mgr.subscribe('c1', ['BTCUSD', 'ETHUSD', 'XAUUSD']);
            mgr.removeClient('c1');
            expect(mgr.getSubscribers('BTCUSD').size).toBe(0);
            expect(mgr.getSubscribers('ETHUSD').size).toBe(0);
            expect(mgr.getSubscribers('XAUUSD').size).toBe(0);
            expect(mgr.getClientCount()).toBe(0);
        });
        it('does not affect other clients', () => {
            mgr.subscribe('c1', ['BTCUSD']);
            mgr.subscribe('c2', ['BTCUSD']);
            mgr.removeClient('c1');
            expect(mgr.getSubscribers('BTCUSD').size).toBe(1);
            expect(mgr.getSubscribers('BTCUSD').has('c2')).toBe(true);
        });
    });
    describe('getActiveSymbols', () => {
        it('returns only symbols with active subscribers', () => {
            mgr.subscribe('c1', ['BTCUSD', 'ETHUSD']);
            mgr.subscribe('c2', ['XAUUSD']);
            const active = mgr.getActiveSymbols();
            expect(active).toHaveLength(3);
            expect(active).toContain('BTCUSD');
            expect(active).toContain('ETHUSD');
            expect(active).toContain('XAUUSD');
        });
        it('removes symbol when last subscriber leaves', () => {
            mgr.subscribe('c1', ['BTCUSD']);
            mgr.removeClient('c1');
            expect(mgr.getActiveSymbols()).toHaveLength(0);
        });
    });
    describe('getClientSymbols', () => {
        it('returns symbols for a specific client', () => {
            mgr.subscribe('c1', ['BTCUSD', 'ETHUSD']);
            const syms = mgr.getClientSymbols('c1');
            expect(syms).toContain('BTCUSD');
            expect(syms).toContain('ETHUSD');
        });
        it('returns empty for unknown client', () => {
            expect(mgr.getClientSymbols('unknown')).toEqual([]);
        });
    });
    describe('getStats', () => {
        it('returns accurate statistics', () => {
            mgr.subscribe('c1', ['BTCUSD', 'ETHUSD']);
            mgr.subscribe('c2', ['BTCUSD', 'XAUUSD']);
            const stats = mgr.getStats();
            expect(stats.clients).toBe(2);
            expect(stats.activeSymbols).toBe(3);
            expect(stats.totalSubscriptions).toBe(4);
        });
    });
});
//# sourceMappingURL=subscriptions.test.js.map