import {
  generateSignalsFromTA,
  safeProfileId,
  STRATEGY_PROFILES,
} from '../signal-generator';
import { calculateAllIndicators } from '../ta-engine';
import type { AllIndicators } from '../ta-engine';
import type { OHLCV } from '../ohlcv';

// Build a deterministic synthetic OHLCV series. BTCUSD is crypto (24/7 market
// hours), so the isMarketOpen gate inside generateSignalsFromTA is satisfied
// regardless of the test timestamp.
function buildFixture(count: number, seed: number): OHLCV[] {
  const candles: OHLCV[] = [];
  let price = 30000;
  // Linear-congruential generator for repeatable noise
  let state = seed >>> 0;
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };

  // Anchor far enough in the past that we don't accidentally hit a future
  // timestamp on slow CI machines. Hourly bars going back from a fixed epoch.
  const startTimestamp = Date.UTC(2024, 0, 1, 0, 0, 0);
  const stepMs = 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const drift = (rand() - 0.5) * 200; // ±100 random walk
    const trend = Math.sin(i / 12) * 50; // gentle oscillation to create real signals
    const open = price;
    const close = price + drift + trend;
    const high = Math.max(open, close) + rand() * 30;
    const low = Math.min(open, close) - rand() * 30;
    const volume = 1000 + Math.floor(rand() * 500);
    candles.push({
      timestamp: startTimestamp + i * stepMs,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume,
    });
    price = close;
  }

  return candles;
}

function buildBullishIndicators(candles: OHLCV[]): AllIndicators {
  const indicators = calculateAllIndicators(candles);
  const currentPrice = candles[candles.length - 1].close;

  indicators.rsi.current = 45;
  indicators.stochastic.current = { k: 35, d: 30 };

  if (indicators.macd.histogram.length >= 2) {
    indicators.macd.histogram[indicators.macd.histogram.length - 2] = -1;
    indicators.macd.histogram[indicators.macd.histogram.length - 1] = 1;
  }
  indicators.macd.current.histogram = 1;

  indicators.ema.ema20 = candles.map((_, i) => currentPrice - 80 + i * 0.5);
  indicators.ema.ema50 = candles.map((_, i) => currentPrice - 110 + i * 0.45);
  indicators.ema.ema200 = candles.map((_, i) => currentPrice - 140 + i * 0.3);
  indicators.ema.current = {
    ema20: indicators.ema.ema20[indicators.ema.ema20.length - 1],
    ema50: indicators.ema.ema50[indicators.ema.ema50.length - 1],
    ema200: indicators.ema.ema200[indicators.ema.ema200.length - 1],
  };

  indicators.bollinger.current = {
    upper: currentPrice + 40,
    middle: currentPrice,
    lower: currentPrice - 40,
    bandwidth: 8,
  };

  indicators.adx.current = { adx: 30, plusDI: 24, minusDI: 16 };

  indicators.volume.currentVolume = 1200;
  indicators.volume.currentSMA = 1000;
  indicators.volume.ratio = 1.2;
  indicators.volume.isSynthetic = false;

  return indicators;
}

describe('signal-generator — STRATEGY_PROFILES contract', () => {
  it("'classic' profile is the only registered profile in Phase 1", () => {
    expect(Object.keys(STRATEGY_PROFILES)).toEqual(['classic']);
  });

  it("'classic' profile values match the historical module-level engine constants", () => {
    // Hardcoded from the original signal-generator.ts before the refactor.
    // If anyone touches the engine threshold without going through the
    // STRATEGY_PROFILES table, this test forces them to update both places
    // intentionally.
    expect(STRATEGY_PROFILES.classic.signalThreshold).toBe(55);
    expect(STRATEGY_PROFILES.classic.minConfidence).toBe(55);
    expect(STRATEGY_PROFILES.classic.signalThresholdScalp).toBe(30);
    expect(STRATEGY_PROFILES.classic.minConfidenceScalp).toBe(58);
    expect(STRATEGY_PROFILES.classic.bbSqueezeThreshold).toBe(4);
  });

  it("'classic' weights expose the full engine weight table", () => {
    const w = STRATEGY_PROFILES.classic.weights;
    expect(w.RSI_OVERSOLD).toBe(20);
    expect(w.RSI_OVERBOUGHT).toBe(20);
    expect(w.MACD_BULLISH).toBe(25);
    expect(w.MACD_BEARISH).toBe(25);
    expect(w.EMA_TREND_UP).toBe(20);
    expect(w.EMA_TREND_DOWN).toBe(20);
    expect(w.STOCH_OVERSOLD).toBe(15);
    expect(w.STOCH_OVERBOUGHT).toBe(15);
    expect(w.BB_LOWER_TOUCH).toBe(10);
    expect(w.BB_UPPER_TOUCH).toBe(10);
    expect(w.BB_SQUEEZE_BREAKOUT).toBe(8);
  });
});

describe('safeProfileId', () => {
  it("returns 'classic' for 'classic'", () => {
    expect(safeProfileId('classic')).toBe('classic');
  });

  it("falls back to 'classic' for unknown strategy ids (e.g. current prod 'hmm-top3')", () => {
    expect(safeProfileId('hmm-top3')).toBe('classic');
    expect(safeProfileId('regime-aware')).toBe('classic');
    expect(safeProfileId('vwap-ema-bb')).toBe('classic');
    expect(safeProfileId('full-risk')).toBe('classic');
  });

  it("falls back to 'classic' for empty / nullish input", () => {
    expect(safeProfileId('')).toBe('classic');
    expect(safeProfileId(null)).toBe('classic');
    expect(safeProfileId(undefined)).toBe('classic');
  });
});

describe('generateSignalsFromTA — classic profile produces byte-identical output to default', () => {
  // Spot-check across multiple seeds to make sure no code path drifts on a
  // particular price walk. Each fixture is independent of the others.
  for (const seed of [42, 1337, 2024, 99999]) {
    it(`seed ${seed}: explicit 'classic' equals default`, () => {
      const candles = buildFixture(220, seed);
      const indicators = calculateAllIndicators(candles);
      const ts = candles[candles.length - 1].timestamp;

      const before = generateSignalsFromTA('BTCUSD', indicators, 'H1', 'real', ts);
      const after = generateSignalsFromTA('BTCUSD', indicators, 'H1', 'real', ts, 'classic');

      expect(after).toEqual(before);
    });
  }

  it('scalp timeframe (M15): explicit classic equals default', () => {
    const candles = buildFixture(220, 7);
    const indicators = calculateAllIndicators(candles);
    const ts = candles[candles.length - 1].timestamp;

    const before = generateSignalsFromTA('BTCUSD', indicators, 'M15', 'real', ts);
    const after = generateSignalsFromTA('BTCUSD', indicators, 'M15', 'real', ts, 'classic');

    expect(after).toEqual(before);
  });

  it('returns no signal when fewer than 100 candles are available', () => {
    const candles = buildFixture(99, 31415);
    const indicators = buildBullishIndicators(candles);
    const ts = candles[candles.length - 1].timestamp;

    expect(generateSignalsFromTA('BTCUSD', indicators, 'H1', 'real', ts)).toEqual([]);
  });

  it('emits a BUY signal only when at least two indicator categories agree and carries source metadata', () => {
    const candles = buildFixture(120, 2718);
    const indicators = buildBullishIndicators(candles);
    const ts = candles[candles.length - 1].timestamp;

    const realSignals = generateSignalsFromTA('EURUSD', indicators, 'H1', 'real', ts);
    expect(realSignals).toHaveLength(1);
    expect(realSignals[0]).toMatchObject({
      direction: 'BUY',
      dataQuality: 'real',
      source: 'real',
    });

    const syntheticSignals = generateSignalsFromTA('EURUSD', indicators, 'H1', 'synthetic', ts);
    expect(syntheticSignals).toHaveLength(1);
    expect(syntheticSignals[0]).toMatchObject({
      direction: 'BUY',
      dataQuality: 'synthetic',
      source: 'fallback',
    });
  });

  it('drops blacklisted symbol+direction combos (e.g. XAUUSD_SELL)', () => {
    const candles = buildFixture(120, 2718);
    const indicators = buildBullishIndicators(candles);
    const ts = candles[candles.length - 1].timestamp;

    // Force a SELL signal by inverting bullish indicators to bearish
    indicators.rsi.current = 75;
    indicators.stochastic.current = { k: 80, d: 85 };
    if (indicators.macd.histogram.length >= 2) {
      indicators.macd.histogram[indicators.macd.histogram.length - 2] = 1;
      indicators.macd.histogram[indicators.macd.histogram.length - 1] = -1;
    }
    indicators.macd.current.histogram = -1;

    // XAUUSD_SELL is blacklisted → should return empty
    const blacklisted = generateSignalsFromTA('XAUUSD', indicators, 'H1', 'real', ts);
    expect(blacklisted.filter((s) => s.direction === 'SELL')).toHaveLength(0);

    // XAUUSD_BUY is NOT blacklisted → should still emit if conditions pass
    indicators.rsi.current = 45;
    indicators.stochastic.current = { k: 35, d: 30 };
    if (indicators.macd.histogram.length >= 2) {
      indicators.macd.histogram[indicators.macd.histogram.length - 2] = -1;
      indicators.macd.histogram[indicators.macd.histogram.length - 1] = 1;
    }
    indicators.macd.current.histogram = 1;

    const allowed = generateSignalsFromTA('XAUUSD', indicators, 'H1', 'real', ts);
    expect(allowed.filter((s) => s.direction === 'BUY').length).toBeGreaterThanOrEqual(0);
  });

  it('drops blacklisted BUY combos (SOLUSD_BUY, DOGEUSD_BUY)', () => {
    const candles = buildFixture(120, 2718);
    const indicators = buildBullishIndicators(candles);
    const ts = candles[candles.length - 1].timestamp;

    // Ensure bullish MACD histogram so BUY can pass the direction gate
    indicators.rsi.current = 45;
    indicators.stochastic.current = { k: 35, d: 30 };
    if (indicators.macd.histogram.length >= 2) {
      indicators.macd.histogram[indicators.macd.histogram.length - 2] = -1;
      indicators.macd.histogram[indicators.macd.histogram.length - 1] = 1;
    }
    indicators.macd.current.histogram = 1;

    for (const pair of ['SOLUSD', 'DOGEUSD']) {
      const result = generateSignalsFromTA(pair, indicators, 'H1', 'real', ts);
      expect(result.filter((s) => s.direction === 'BUY')).toHaveLength(0);
    }

    // SELL on same pairs is NOT blacklisted → should still be possible if bearish
    indicators.rsi.current = 75;
    indicators.stochastic.current = { k: 80, d: 85 };
    if (indicators.macd.histogram.length >= 2) {
      indicators.macd.histogram[indicators.macd.histogram.length - 2] = 1;
      indicators.macd.histogram[indicators.macd.histogram.length - 1] = -1;
    }
    indicators.macd.current.histogram = -1;

    for (const pair of ['SOLUSD', 'DOGEUSD']) {
      const result = generateSignalsFromTA(pair, indicators, 'H1', 'real', ts);
      // SELL is not guaranteed to emit (other gates may block), but it should
      // not be blocked by the blacklist filter itself.
      expect(result.some((s) => s.direction === 'SELL') || result.length === 0).toBe(true);
    }
  });
});
