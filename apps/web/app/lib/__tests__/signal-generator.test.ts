import {
  generateSignalsFromTA,
  safeProfileId,
  STRATEGY_PROFILES,
} from '../signal-generator';
import { calculateAllIndicators } from '../ta-engine';
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

describe('signal-generator — STRATEGY_PROFILES contract', () => {
  it("'classic' profile is the only registered profile in Phase 1", () => {
    expect(Object.keys(STRATEGY_PROFILES)).toEqual(['classic']);
  });

  it("'classic' profile values match the historical module-level engine constants", () => {
    // Hardcoded from the original signal-generator.ts before the refactor.
    // If anyone touches the engine threshold without going through the
    // STRATEGY_PROFILES table, this test forces them to update both places
    // intentionally.
    expect(STRATEGY_PROFILES.classic.signalThreshold).toBe(22);
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
});
