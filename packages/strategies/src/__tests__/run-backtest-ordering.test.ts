import { runBacktest } from '../run-backtest';
import type { Strategy, EntryModule, EntrySignal } from '../types';
import type { OHLCV } from '@tradeclaw/core';

/**
 * Regression for H-01: runBacktest must process signals in chronological
 * (barIndex ascending) order even when the entry module returns them in a
 * different order (the production-default hmm-top3 module sorts by confidence
 * descending). The overlap guard, drawdown slice, and equity-curve fill all
 * depend on chronological order.
 */

// A flat market that drifts up bar by bar so every position closes on a later
// bar with a deterministic, positive P&L. No SL/TP is hit (moves are tiny).
function makeCandles(n: number): OHLCV[] {
  const out: OHLCV[] = [];
  let price = 100;
  for (let i = 0; i < n; i++) {
    const open = price;
    const close = price + 0.001; // +0.001 per bar, far below TP/SL bands
    out.push({
      timestamp: i * 3_600_000,
      open,
      high: Math.max(open, close),
      low: Math.min(open, close),
      close,
      volume: 1_000,
    });
    price = close;
  }
  return out;
}

function strategyWith(signals: EntrySignal[]): Strategy {
  const entry: EntryModule = {
    id: 'hmm-top3',
    generateSignals(): EntrySignal[] {
      return signals;
    },
  };
  return {
    id: 'hmm-top3',
    name: 'ordering-test',
    description: 'fixture',
    entry,
    allocation: { kind: 'flat' },
    risk: { kind: 'none' },
  };
}

describe('runBacktest signal ordering (H-01)', () => {
  it('processes signals chronologically regardless of input order', () => {
    const candles = makeCandles(60);

    const chronological: EntrySignal[] = [
      { barIndex: 0, direction: 'BUY', price: candles[0].close, confidence: 0.1 },
      { barIndex: 20, direction: 'BUY', price: candles[20].close, confidence: 0.5 },
      { barIndex: 40, direction: 'BUY', price: candles[40].close, confidence: 0.9 },
    ];

    // Same signals, but sorted by confidence descending (barIndex out of order)
    // — mirrors what hmm-top3 returns in production.
    const confidenceSorted = [...chronological].sort(
      (a, b) => b.confidence - a.confidence,
    );
    expect(confidenceSorted.map((s) => s.barIndex)).toEqual([40, 20, 0]);

    const fromChronological = runBacktest(candles, strategyWith(chronological));
    const fromConfidence = runBacktest(candles, strategyWith(confidenceSorted));

    // Order of input must not change the outcome.
    expect(fromConfidence.equityCurve).toEqual(fromChronological.equityCurve);
    expect(fromConfidence.trades.map((t) => t.entryBar)).toEqual(
      fromChronological.trades.map((t) => t.entryBar),
    );

    // Equity curve must be filled in bar order: every entry happens at a
    // barIndex strictly greater than the previous trade's exit (overlap gate),
    // so trades are sorted ascending by entryBar.
    const entryBars = fromConfidence.trades.map((t) => t.entryBar);
    const ascending = [...entryBars].sort((a, b) => a - b);
    expect(entryBars).toEqual(ascending);
    expect(entryBars.length).toBeGreaterThan(0);

    // Equity curve is monotonic non-decreasing in this drifting-up market —
    // this only holds if the curve was filled in chronological order.
    for (let i = 1; i < fromConfidence.equityCurve.length; i++) {
      expect(fromConfidence.equityCurve[i]).toBeGreaterThanOrEqual(
        fromConfidence.equityCurve[i - 1],
      );
    }
  });

  it('does not mutate the caller signal array', () => {
    const candles = makeCandles(30);
    const confidenceSorted: EntrySignal[] = [
      { barIndex: 20, direction: 'BUY', price: candles[20].close, confidence: 0.9 },
      { barIndex: 5, direction: 'BUY', price: candles[5].close, confidence: 0.3 },
    ];
    const before = confidenceSorted.map((s) => s.barIndex);
    runBacktest(candles, strategyWith(confidenceSorted));
    expect(confidenceSorted.map((s) => s.barIndex)).toEqual(before);
  });
});
