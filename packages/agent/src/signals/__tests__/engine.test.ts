import { evaluateSignal, computeIndicators } from '../engine.js';
import type { IndicatorSummary, SymbolConfig } from '@tradeclaw/signals';

/**
 * Build a full IndicatorSummary with neutral defaults, overriding only the
 * leaves the vote aggregator reads. Neutral baseline scores below threshold.
 */
function indicators(overrides: {
  rsi?: number;
  macd?: 'bullish' | 'bearish' | 'neutral';
  emaTrend?: 'up' | 'down' | 'sideways';
  ema20?: number;
  ema50?: number;
  bb?: 'upper' | 'middle' | 'lower';
  bandwidth?: number;
  stochK?: number;
} = {}): IndicatorSummary {
  const rsiVal = overrides.rsi ?? 50;
  return {
    rsi: { value: rsiVal, signal: rsiVal < 30 ? 'oversold' : rsiVal > 70 ? 'overbought' : 'neutral' },
    macd: { histogram: 0, signal: overrides.macd ?? 'neutral' },
    ema: { trend: overrides.emaTrend ?? 'sideways', ema20: overrides.ema20 ?? 100, ema50: overrides.ema50 ?? 100, ema200: 100 },
    bollingerBands: { position: overrides.bb ?? 'middle', bandwidth: overrides.bandwidth ?? 1 },
    stochastic: { k: overrides.stochK ?? 50, d: 50, signal: 'neutral' },
    support: [],
    resistance: [],
  };
}

describe('evaluateSignal — vote aggregator', () => {
  it('returns null when the winning score is below the 20-point threshold', () => {
    // All-neutral: only EMA contributes 8 points (sideways, ema20 == ema50).
    expect(evaluateSignal(indicators())).toBeNull();
  });

  it('aggregates all bullish votes into a BUY at max confidence', () => {
    const r = evaluateSignal(indicators({ rsi: 25, macd: 'bullish', emaTrend: 'up', bb: 'lower', stochK: 10 }));
    expect(r).toEqual({ direction: 'BUY', confidence: 98 });
  });

  it('aggregates all bearish votes into a SELL at max confidence', () => {
    const r = evaluateSignal(indicators({ rsi: 80, macd: 'bearish', emaTrend: 'down', bb: 'upper', stochK: 90 }));
    expect(r).toEqual({ direction: 'SELL', confidence: 98 });
  });

  it('resolves to the higher-scoring side when votes conflict', () => {
    // RSI oversold (+25 buy) vs EMA downtrend (+20 sell) -> BUY.
    expect(evaluateSignal(indicators({ rsi: 25, emaTrend: 'down' }))?.direction).toBe('BUY');
    // RSI overbought (+25 sell) vs EMA uptrend (+20 buy) -> SELL.
    expect(evaluateSignal(indicators({ rsi: 75, emaTrend: 'up' }))?.direction).toBe('SELL');
  });

  it('breaks an exact tie toward BUY and floors confidence at 40', () => {
    // MACD bullish (+20 buy) vs EMA downtrend (+20 sell): tie -> BUY, maxScore 20 -> confidence 40.
    const r = evaluateSignal(indicators({ macd: 'bullish', emaTrend: 'down' }));
    expect(r).toEqual({ direction: 'BUY', confidence: 40 });
  });

  it('keeps confidence within the 40–98 band for a partial signal', () => {
    // RSI oversold only (+25 buy) minus EMA sideways (+8 sell): maxScore 25 -> confidence 44.
    const r = evaluateSignal(indicators({ rsi: 25 }));
    expect(r?.direction).toBe('BUY');
    expect(r!.confidence).toBeGreaterThanOrEqual(40);
    expect(r!.confidence).toBeLessThanOrEqual(98);
    expect(r!.confidence).toBe(44);
  });
});

describe('computeIndicators — threshold mapping', () => {
  const cfg: SymbolConfig = { symbol: 'TEST', name: 'Test', pip: 0.01, basePrice: 100, volatility: 0.01 };

  // Deterministic oscillating-with-drift series so indicators have real values.
  const close = Array.from({ length: 250 }, (_, i) => 100 + 10 * Math.sin(i / 5) + i * 0.05);
  const high = close.map(c => c + 1);
  const low = close.map(c => c - 1);
  const open = close.slice();
  const summary = computeIndicators({ open, high, low, close }, cfg);

  it('returns a fully-populated indicator summary', () => {
    expect(typeof summary.rsi.value).toBe('number');
    expect(typeof summary.macd.histogram).toBe('number');
    expect(typeof summary.ema.ema20).toBe('number');
    expect(Array.isArray(summary.support)).toBe(true);
    expect(Array.isArray(summary.resistance)).toBe(true);
  });

  it('maps RSI value to the correct signal band', () => {
    const { value, signal } = summary.rsi;
    if (value < 30) expect(signal).toBe('oversold');
    else if (value > 70) expect(signal).toBe('overbought');
    else expect(signal).toBe('neutral');
  });

  it('maps MACD histogram sign to bias', () => {
    const { histogram, signal } = summary.macd;
    if (histogram > 0) expect(signal).toBe('bullish');
    else if (histogram < 0) expect(signal).toBe('bearish');
    else expect(signal).toBe('neutral');
  });

  it('maps Stochastic %K to the correct signal band', () => {
    const { k, signal } = summary.stochastic;
    if (k < 20) expect(signal).toBe('oversold');
    else if (k > 80) expect(signal).toBe('overbought');
    else expect(signal).toBe('neutral');
  });

  it('keeps the output of computeIndicators acceptable to evaluateSignal', () => {
    // Whatever the series produces, the aggregator must return a valid verdict or null.
    const verdict = evaluateSignal(summary);
    if (verdict !== null) {
      expect(['BUY', 'SELL']).toContain(verdict.direction);
      expect(verdict.confidence).toBeGreaterThanOrEqual(40);
      expect(verdict.confidence).toBeLessThanOrEqual(98);
    }
  });
});
