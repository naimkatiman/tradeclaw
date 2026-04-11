/**
 * Drawdown Tracker — Unit Tests
 */

import { DrawdownTracker } from '../drawdown-tracker';
import type { TradeOutcome } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeOutcome(
  outcome: 'win' | 'loss' | 'breakeven',
  pnl = 0,
): TradeOutcome {
  return {
    signalId: 'SIG-TEST-001',
    symbol: 'BTCUSD',
    direction: 'BUY',
    pnl,
    pnlPct: pnl / 100_000 * 100,
    closedAt: new Date().toISOString(),
    outcome,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('DrawdownTracker', () => {
  describe('high water mark', () => {
    it('tracks increasing equity as HWM', () => {
      const tracker = new DrawdownTracker();

      tracker.recordEquity(100_000);
      expect(tracker.getHighWaterMark()).toBe(100_000);

      tracker.recordEquity(105_000);
      expect(tracker.getHighWaterMark()).toBe(105_000);
    });

    it('does not lower HWM when equity drops', () => {
      const tracker = new DrawdownTracker();

      tracker.recordEquity(100_000);
      tracker.recordEquity(105_000);
      tracker.recordEquity(98_000);

      expect(tracker.getHighWaterMark()).toBe(105_000);
    });
  });

  describe('drawdown calculation', () => {
    it('calculates correct drawdown percentage', () => {
      const tracker = new DrawdownTracker();

      tracker.recordEquity(100_000);
      tracker.recordEquity(95_000);

      // Drawdown = (100k - 95k) / 100k = 5%
      expect(tracker.getCurrentDrawdownPct()).toBeCloseTo(5, 2);
    });

    it('returns 0 drawdown at HWM', () => {
      const tracker = new DrawdownTracker();

      tracker.recordEquity(100_000);
      tracker.recordEquity(110_000);

      expect(tracker.getCurrentDrawdownPct()).toBe(0);
    });

    it('calculates drawdown from peak not from initial', () => {
      const tracker = new DrawdownTracker();

      tracker.recordEquity(100_000);
      tracker.recordEquity(120_000);
      tracker.recordEquity(108_000);

      // Drawdown = (120k - 108k) / 120k = 10%
      expect(tracker.getCurrentDrawdownPct()).toBeCloseTo(10, 2);
    });
  });

  describe('consecutive loss counting', () => {
    it('increments on losses', () => {
      const tracker = new DrawdownTracker();

      tracker.recordTradeOutcome(makeOutcome('loss', -500));
      expect(tracker.getConsecutiveLosses()).toBe(1);

      tracker.recordTradeOutcome(makeOutcome('loss', -300));
      expect(tracker.getConsecutiveLosses()).toBe(2);

      tracker.recordTradeOutcome(makeOutcome('loss', -200));
      expect(tracker.getConsecutiveLosses()).toBe(3);
    });

    it('resets on win', () => {
      const tracker = new DrawdownTracker();

      tracker.recordTradeOutcome(makeOutcome('loss', -500));
      tracker.recordTradeOutcome(makeOutcome('loss', -300));
      expect(tracker.getConsecutiveLosses()).toBe(2);

      tracker.recordTradeOutcome(makeOutcome('win', 800));
      expect(tracker.getConsecutiveLosses()).toBe(0);
    });

    it('does not reset on breakeven', () => {
      const tracker = new DrawdownTracker();

      tracker.recordTradeOutcome(makeOutcome('loss', -500));
      tracker.recordTradeOutcome(makeOutcome('loss', -300));
      tracker.recordTradeOutcome(makeOutcome('breakeven', 0));

      expect(tracker.getConsecutiveLosses()).toBe(2);
    });
  });

  describe('zero and negative equity', () => {
    it('records drawdownPct as 100 when equity is 0', () => {
      const tracker = new DrawdownTracker();

      tracker.recordEquity(100_000);
      tracker.recordEquity(0);

      const curve = tracker.getEquityCurve();
      expect(curve[1].drawdownPct).toBe(100);
    });

    it('records drawdownPct as 100 when equity is negative', () => {
      const tracker = new DrawdownTracker();

      tracker.recordEquity(100_000);
      tracker.recordEquity(-500);

      const curve = tracker.getEquityCurve();
      expect(curve[1].drawdownPct).toBe(100);
    });
  });

  describe('equity curve', () => {
    it('returns all recorded points', () => {
      const tracker = new DrawdownTracker();

      tracker.recordEquity(100_000);
      tracker.recordEquity(101_000);
      tracker.recordEquity(99_000);

      const curve = tracker.getEquityCurve();
      expect(curve).toHaveLength(3);
      expect(curve[0].equity).toBe(100_000);
      expect(curve[2].equity).toBe(99_000);
    });

    it('respects limit parameter', () => {
      const tracker = new DrawdownTracker();

      tracker.recordEquity(100_000);
      tracker.recordEquity(101_000);
      tracker.recordEquity(99_000);

      const curve = tracker.getEquityCurve(2);
      expect(curve).toHaveLength(2);
      expect(curve[0].equity).toBe(101_000);
      expect(curve[1].equity).toBe(99_000);
    });

    it('stores drawdown on each point', () => {
      const tracker = new DrawdownTracker();

      tracker.recordEquity(100_000);
      tracker.recordEquity(95_000);

      const curve = tracker.getEquityCurve();
      expect(curve[0].drawdownPct).toBe(0);
      expect(curve[1].drawdownPct).toBeCloseTo(5, 2);
    });

    it('caps stored points at 1000', () => {
      const tracker = new DrawdownTracker();

      for (let i = 0; i < 1100; i++) {
        tracker.recordEquity(100_000 + i);
      }

      expect(tracker.getEquityCurve()).toHaveLength(1000);
    });
  });

  describe('daily / weekly PnL', () => {
    it('returns 0 when no data', () => {
      const tracker = new DrawdownTracker();

      expect(tracker.getDailyPnlPct()).toBe(0);
      expect(tracker.getWeeklyPnlPct()).toBe(0);
    });

    it('calculates PnL from first point of the day', () => {
      const tracker = new DrawdownTracker();

      // Record two points "today"
      tracker.recordEquity(100_000);
      tracker.recordEquity(103_000);

      // Daily PnL should be +3%
      expect(tracker.getDailyPnlPct()).toBeCloseTo(3, 1);
    });

    it('calculates negative PnL correctly', () => {
      const tracker = new DrawdownTracker();

      tracker.recordEquity(100_000);
      tracker.recordEquity(97_000);

      expect(tracker.getDailyPnlPct()).toBeCloseTo(-3, 1);
    });
  });
});
