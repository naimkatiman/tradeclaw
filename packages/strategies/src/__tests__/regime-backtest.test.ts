/**
 * Tests for the Phase 4 D5 regime-conditioned backtest harness.
 *
 * Classifier strategy:
 *   - HAPPY PATHS use the REAL classifyRegime over deterministic synthetic
 *     series whose regime is known (probed: a strong monotone rise → 'trend',
 *     a tiny oscillation → 'range', a large alternating swing → 'volatile'
 *     under the pinned default crypto model). The thing under test (the
 *     wrapper's keep/drop conditioning) runs for real against the real
 *     classifier — nothing is mocked away.
 *   - The classifier-ERROR path and the per-regime metric MATH use the
 *     injectable `classify` seam to force a thrown error / a known bar→regime
 *     map. The classifier is a DEPENDENCY here, not the unit under test; the
 *     wrapper's conditioning and the metric arithmetic still execute for real.
 */

import {
  conditionEntryOnRegime,
  perRegimeMetrics,
  REGIME_CONDITION_WINDOW,
  type ClassifyFn,
} from '../regime-backtest';
import type { EntryModule, EntrySignal, EntryContext } from '../types';
import type { OHLCV } from '@tradeclaw/core';
import { ZERO_COSTS, CRYPTO_PERP_COSTS } from '../backtest-options';
import {
  setModel,
  getDefaultModel,
  type MarketRegime,
  type RegimeClassification,
} from '@tradeclaw/signals';

// ── Deterministic candle builders (mirroring router.test.ts conventions) ─────
const BASE_TS = 1_700_000_000_000;
const HOUR_MS = 3_600_000;

/** Strong monotone rise → real classifier returns 'trend'. */
function risingCandles(n: number, startPrice = 100, step = 1): OHLCV[] {
  return Array.from({ length: n }, (_, i) => {
    const close = startPrice + i * step;
    return { timestamp: BASE_TS + i * HOUR_MS, open: close - 1, high: close + 1, low: close - 2, close, volume: 100 };
  });
}

/** Tiny oscillation around a base → real classifier returns 'range'. */
function choppyCandles(n: number, base = 100): OHLCV[] {
  return Array.from({ length: n }, (_, i) => {
    const close = base + (i % 2 === 0 ? 0.05 : -0.05);
    return { timestamp: BASE_TS + i * HOUR_MS, open: close, high: close + 0.02, low: close - 0.02, close, volume: 100 };
  });
}

/** Large alternating swing → real classifier returns 'volatile'. */
function volatileCandles(n: number, base = 100): OHLCV[] {
  return Array.from({ length: n }, (_, i) => {
    const close = base + (i % 2 === 0 ? 8 : -8) + i * 0.001;
    return { timestamp: BASE_TS + i * HOUR_MS, open: close, high: close + 6, low: close - 6, close, volume: 100 };
  });
}

/**
 * A stub entry module that fires a fixed list of signals (one per supplied
 * barIndex). Lets a test control EXACTLY which bars produce signals so the
 * keep/drop decisions are unambiguous.
 */
function fixedEntry(signals: EntrySignal[]): EntryModule {
  return {
    id: 'classic', // a valid StrategyId so the BacktestResult type is satisfied
    generateSignals(_candles: OHLCV[], _ctx: EntryContext): EntrySignal[] {
      return signals.map((s) => ({ ...s }));
    },
  };
}

const CTX: EntryContext = { symbol: 'BTCUSD', timeframe: 'H1' };

beforeAll(() => {
  // Pin the built-in default crypto model so the real classifier is
  // deterministic and loadModel never walks the disk.
  setModel('crypto', getDefaultModel('crypto'));
});

// ===========================================================================
// conditionEntryOnRegime
// ===========================================================================

describe('conditionEntryOnRegime — real classifier (exclusive keep)', () => {
  it('keeps signals whose entry-bar regime === target, drops the rest', () => {
    // Strong rising series → every late bar classifies 'trend'.
    const candles = risingCandles(200);
    // Signals on three late bars (windows are full → classification is real).
    const sigs: EntrySignal[] = [180, 185, 190].map((b) => ({
      barIndex: b,
      direction: 'BUY' as const,
      price: candles[b].close,
      confidence: 0.7,
    }));
    const base = fixedEntry(sigs);

    const trendKept = conditionEntryOnRegime(base, 'trend').generateSignals(candles, CTX);
    expect(trendKept.map((s) => s.barIndex)).toEqual([180, 185, 190]); // all 'trend' bars kept

    const rangeKept = conditionEntryOnRegime(base, 'range').generateSignals(candles, CTX);
    expect(rangeKept).toEqual([]); // none of these bars are 'range'

    const volatileKept = conditionEntryOnRegime(base, 'volatile').generateSignals(candles, CTX);
    expect(volatileKept).toEqual([]);
  });

  it('routes a volatile series only into the volatile bucket', () => {
    const candles = volatileCandles(200);
    const sigs: EntrySignal[] = [180, 190].map((b) => ({
      barIndex: b,
      direction: 'BUY' as const,
      price: candles[b].close,
      confidence: 0.7,
    }));
    const base = fixedEntry(sigs);

    expect(conditionEntryOnRegime(base, 'volatile').generateSignals(candles, CTX).map((s) => s.barIndex)).toEqual([180, 190]);
    expect(conditionEntryOnRegime(base, 'trend').generateSignals(candles, CTX)).toEqual([]);
    expect(conditionEntryOnRegime(base, 'range').generateSignals(candles, CTX)).toEqual([]);
  });

  it('routes a choppy series only into the range bucket', () => {
    const candles = choppyCandles(200);
    const sigs: EntrySignal[] = [180, 190].map((b) => ({
      barIndex: b,
      direction: 'BUY' as const,
      price: candles[b].close,
      confidence: 0.7,
    }));
    const base = fixedEntry(sigs);

    expect(conditionEntryOnRegime(base, 'range').generateSignals(candles, CTX).map((s) => s.barIndex)).toEqual([180, 190]);
    expect(conditionEntryOnRegime(base, 'trend').generateSignals(candles, CTX)).toEqual([]);
  });
});

describe('conditionEntryOnRegime — trend filter (applyTrendFilter)', () => {
  it('drops a signal whose direction disagrees with the EMA-50 slope', () => {
    // Rising series classifies 'trend'. A BUY on a rising series passes the
    // trend filter (slope up agrees with BUY); a SELL fails it (slope up
    // disagrees with SELL) and must be dropped even though the regime matches.
    const candles = risingCandles(200);
    const buy: EntrySignal = { barIndex: 190, direction: 'BUY', price: candles[190].close, confidence: 0.7 };
    const sell: EntrySignal = { barIndex: 190, direction: 'SELL', price: candles[190].close, confidence: 0.7 };

    const keptBuy = conditionEntryOnRegime(fixedEntry([buy]), 'trend', { applyTrendFilter: true }).generateSignals(candles, CTX);
    expect(keptBuy.map((s) => s.barIndex)).toEqual([190]);

    const keptSell = conditionEntryOnRegime(fixedEntry([sell]), 'trend', { applyTrendFilter: true }).generateSignals(candles, CTX);
    expect(keptSell).toEqual([]); // regime matches but trend filter drops it

    // Without the trend filter the SELL survives the regime match (proves the
    // drop above came from the filter, not the regime test).
    const noFilter = conditionEntryOnRegime(fixedEntry([sell]), 'trend').generateSignals(candles, CTX);
    expect(noFilter.map((s) => s.barIndex)).toEqual([190]);
  });
});

describe('conditionEntryOnRegime — exclusive drop on classification failure', () => {
  it('drops the signal when the classifier throws (conservative, NOT fail-open)', () => {
    const candles = risingCandles(200);
    const sigs: EntrySignal[] = [180, 190].map((b) => ({
      barIndex: b,
      direction: 'BUY' as const,
      price: candles[b].close,
      confidence: 0.7,
    }));
    const throwingClassify: ClassifyFn = () => {
      throw new Error('forced classification failure');
    };
    const kept = conditionEntryOnRegime(fixedEntry(sigs), 'trend', { classify: throwingClassify }).generateSignals(candles, CTX);
    expect(kept).toEqual([]); // every signal dropped — the divergence from regime-aware fail-open
  });

  it('drops signals on bars too short to classify (window below the floor)', () => {
    // A signal on bar 5 has a trailing window of only 6 bars — far below the
    // classifier's warmup — so the REAL classifier throws and the signal is
    // dropped (exclusive), unlike regime-aware which would pass it through.
    const candles = risingCandles(200);
    const early: EntrySignal = { barIndex: 5, direction: 'BUY', price: candles[5].close, confidence: 0.7 };
    const kept = conditionEntryOnRegime(fixedEntry([early]), 'trend').generateSignals(candles, CTX);
    expect(kept).toEqual([]);
  });
});

describe('conditionEntryOnRegime — bounded trailing window (no O(n^2))', () => {
  it('hands the classifier at most REGIME_CONDITION_WINDOW bars, ending at the signal bar', () => {
    const candles = risingCandles(500);
    const seen: number[] = [];
    const spyClassify: ClassifyFn = (_symbol, window): RegimeClassification => {
      seen.push(window.length);
      // last bar of the window must be the signal bar (no lookahead)
      expect(window[window.length - 1]).toBe(candles[400]);
      return { regime: 'trend', confidence: 1, allProbabilities: { trend: 1, volatile: 0, range: 0 }, transitionProbs: { trend: 1, volatile: 0, range: 0 }, features: null as never, timestamp: '' };
    };
    const sig: EntrySignal = { barIndex: 400, direction: 'BUY', price: candles[400].close, confidence: 0.7 };
    conditionEntryOnRegime(fixedEntry([sig]), 'trend', { classify: spyClassify }).generateSignals(candles, CTX);
    expect(seen).toEqual([REGIME_CONDITION_WINDOW]); // exactly 329 bars, NOT 401
  });
});

// ===========================================================================
// perRegimeMetrics
// ===========================================================================

/**
 * Deterministic bar→regime classifier: resolves the signal bar from the window's
 * final timestamp and looks up the regime from a bar→regime map. The CLASSIFIER
 * is a dependency here; the metric arithmetic (counts, win rate, expectancy
 * after costs, profit factor, DD) is the unit under test and runs for real.
 */
function byBarClassify(candles: OHLCV[], regimeForBar: (bar: number) => MarketRegime): ClassifyFn {
  const tsToBar = new Map<number, number>();
  candles.forEach((c, i) => tsToBar.set(c.timestamp, i));
  return (_symbol, window): RegimeClassification => {
    const bar = tsToBar.get(window[window.length - 1].timestamp);
    if (bar === undefined) throw new Error('window end not found');
    const regime = regimeForBar(bar);
    return {
      regime,
      confidence: 1,
      allProbabilities: { trend: regime === 'trend' ? 1 : 0, volatile: regime === 'volatile' ? 1 : 0, range: regime === 'range' ? 1 : 0 },
      transitionProbs: { trend: 0, volatile: 0, range: 0 },
      features: null as never,
      timestamp: '',
    };
  };
}

describe('perRegimeMetrics — bucketing + metric math', () => {
  // A 300-bar rising series so every signal bar (all > warmup) is tradable
  // under fixed legacy geometry (TP hit on the next bars). Each signal is a
  // BUY at the bar close; the rising series guarantees the fixed 2% TP fills.
  const candles = risingCandles(300, 100, 1);

  // Six signals spread across the series; we assign three to 'trend', two to
  // 'volatile', one to 'range' via the bar→regime map.
  const signalBars = [120, 140, 160, 180, 200, 220];
  const regimeOf = (bar: number): MarketRegime => {
    if ([120, 140, 160].includes(bar)) return 'trend';
    if ([180, 200].includes(bar)) return 'volatile';
    return 'range'; // 220
  };
  const sigs: EntrySignal[] = signalBars.map((b) => ({
    barIndex: b,
    direction: 'BUY' as const,
    price: candles[b].close,
    confidence: 0.7,
  }));
  const base = fixedEntry(sigs);
  const classify = byBarClassify(candles, regimeOf);

  it('buckets trades into the correct per-regime counts', () => {
    // Trend route applies the trend filter; a strong rising BUY passes it, so
    // all three trend signals survive.
    const { byRegime } = perRegimeMetrics(candles, base, { classify });
    expect(byRegime.trend.trades).toBe(3);
    expect(byRegime.volatile.trades).toBe(2);
    expect(byRegime.range.trades).toBe(1);
  });

  it('win rate / profit factor are well-formed per regime', () => {
    const { byRegime } = perRegimeMetrics(candles, base, { classify });
    for (const r of ['trend', 'volatile', 'range'] as MarketRegime[]) {
      expect(byRegime[r].winRate).toBeGreaterThanOrEqual(0);
      expect(byRegime[r].winRate).toBeLessThanOrEqual(1);
      // All three buckets have ≥1 trade in this fixture, so profitFactor is a
      // number (null is reserved for zero-trade buckets — asserted separately).
      expect(byRegime[r].trades).toBeGreaterThan(0);
      expect(byRegime[r].profitFactor).not.toBeNull();
      expect(byRegime[r].profitFactor as number).toBeGreaterThanOrEqual(0);
      expect(byRegime[r].withinRegimeDrawdown).toBeGreaterThanOrEqual(0);
    }
  });

  it('expectancy is computed AFTER costs (cost drag strictly lowers it)', () => {
    const zero = perRegimeMetrics(candles, base, { classify, backtest: { costs: ZERO_COSTS } });
    const costed = perRegimeMetrics(candles, base, { classify, backtest: { costs: CRYPTO_PERP_COSTS } });

    for (const r of ['trend', 'volatile', 'range'] as MarketRegime[]) {
      // Same trade entries either way (costs do not change which bars trade
      // under fixed geometry), so trade counts match...
      expect(costed.byRegime[r].trades).toBe(zero.byRegime[r].trades);
      // ...but the costed expectancy must be strictly lower (the modeled
      // round-trip friction is subtracted from each trade's pnlPct).
      if (zero.byRegime[r].trades > 0) {
        expect(costed.byRegime[r].expectancy).toBeLessThan(zero.byRegime[r].expectancy);
      }
    }
  });

  it('is deterministic — identical inputs yield identical metrics', () => {
    const a = perRegimeMetrics(candles, base, { classify, backtest: { costs: CRYPTO_PERP_COSTS } });
    const b = perRegimeMetrics(candles, base, { classify, backtest: { costs: CRYPTO_PERP_COSTS } });
    expect(a.byRegime).toEqual(b.byRegime);
  });

  it('a regime with no signals yields a zeroed bucket (profitFactor null), not an error', () => {
    const onlyTrend = byBarClassify(candles, () => 'trend');
    const { byRegime } = perRegimeMetrics(candles, base, { classify: onlyTrend });
    // profitFactor is null (not 0) so a zero-trade bucket is distinguishable
    // from an all-losers bucket; trades: 0 also disambiguates.
    expect(byRegime.volatile).toEqual({ regime: 'volatile', trades: 0, winRate: 0, expectancy: 0, profitFactor: null, withinRegimeDrawdown: 0 });
    expect(byRegime.range).toEqual({ regime: 'range', trades: 0, winRate: 0, expectancy: 0, profitFactor: null, withinRegimeDrawdown: 0 });
  });
});
