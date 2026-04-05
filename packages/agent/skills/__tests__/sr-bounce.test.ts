/**
 * S/R Bounce Skill — Pure Logic Tests
 *
 * Tests the confidence adjustment logic inline without importing the skill module.
 * The adjustConfidence() function below mirrors the logic in sr-bounce/index.js.
 */

interface Indicators {
  support: number[];
  resistance: number[];
  rsi: { signal: 'oversold' | 'overbought' | 'neutral' };
  stochastic: { signal: 'oversold' | 'overbought' | 'neutral' };
  adx?: { trending: boolean };
}

interface Signal {
  direction: 'BUY' | 'SELL';
  entry: number;
  confidence: number;
  indicators: Indicators;
}

type AdjustResult = { confidence: number } | null;

/**
 * Mirrors the per-signal confidence adjustment logic from SRBounceSkill.analyze().
 * Returns null when the signal should be skipped (no opinion / ADX trending / mid-range).
 */
function adjustConfidence(signal: Signal): AdjustResult {
  const { support, resistance, rsi, stochastic, adx } = signal.indicators;

  // Self-gate: trending market
  if (adx && adx.trending) return null;

  const nearestSupport = support.length > 0 ? Math.max(...support) : 0;
  const nearestResistance = resistance.length > 0 ? Math.min(...resistance) : Infinity;
  const priceRange = nearestResistance - nearestSupport;

  if (priceRange <= 0) return null;

  const supportProximity = (signal.entry - nearestSupport) / priceRange;
  const resistanceProximity = (nearestResistance - signal.entry) / priceRange;

  // BUY near support
  if (signal.direction === 'BUY' && supportProximity < 0.2) {
    let boost = 15;
    if (rsi.signal === 'oversold') boost += 5;
    if (stochastic.signal === 'oversold') boost += 5;
    return { confidence: Math.min(signal.confidence + boost, 100) };
  }

  // SELL near resistance
  if (signal.direction === 'SELL' && resistanceProximity < 0.2) {
    let boost = 15;
    if (rsi.signal === 'overbought') boost += 5;
    if (stochastic.signal === 'overbought') boost += 5;
    return { confidence: Math.min(signal.confidence + boost, 100) };
  }

  // Counter-S/R penalty: BUY at resistance
  if (signal.direction === 'BUY' && resistanceProximity < 0.2) {
    return { confidence: Math.max(signal.confidence - 20, 25) };
  }

  // Counter-S/R penalty: SELL at support
  if (signal.direction === 'SELL' && supportProximity < 0.2) {
    return { confidence: Math.max(signal.confidence - 20, 25) };
  }

  // Price in middle of range — no opinion
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSignal(
  direction: 'BUY' | 'SELL',
  entry: number,
  confidence: number,
  indicators: Indicators,
): Signal {
  return { direction, entry, confidence, indicators };
}

/** Range 1000–1100, so support=1000, resistance=1100, priceRange=100 */
const BASE_INDICATORS: Indicators = {
  support: [1000],
  resistance: [1100],
  rsi: { signal: 'neutral' },
  stochastic: { signal: 'neutral' },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('S/R Bounce — adjustConfidence()', () => {
  describe('BUY near support', () => {
    it('boosts +15 when near support with neutral oscillators', () => {
      // entry=1010 → supportProximity=(1010-1000)/100 = 0.10 < 0.2 ✓
      const signal = makeSignal('BUY', 1010, 60, { ...BASE_INDICATORS });
      const result = adjustConfidence(signal);
      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(75); // 60 + 15
    });

    it('boosts +25 (15+5+5) when RSI oversold + Stochastic oversold in ranging market', () => {
      const signal = makeSignal('BUY', 1010, 60, {
        ...BASE_INDICATORS,
        rsi: { signal: 'oversold' },
        stochastic: { signal: 'oversold' },
        adx: { trending: false },
      });
      const result = adjustConfidence(signal);
      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(85); // 60 + 25
    });
  });

  describe('SELL near resistance', () => {
    it('boosts +25 (15+5+5) when RSI overbought + Stochastic overbought', () => {
      // entry=1090 → resistanceProximity=(1100-1090)/100 = 0.10 < 0.2 ✓
      const signal = makeSignal('SELL', 1090, 60, {
        ...BASE_INDICATORS,
        rsi: { signal: 'overbought' },
        stochastic: { signal: 'overbought' },
      });
      const result = adjustConfidence(signal);
      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(85); // 60 + 25
    });

    it('boosts +15 when near resistance with neutral oscillators', () => {
      const signal = makeSignal('SELL', 1090, 60, { ...BASE_INDICATORS });
      const result = adjustConfidence(signal);
      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(75); // 60 + 15
    });
  });

  describe('ADX trending gate', () => {
    it('returns null when ADX indicates trending market', () => {
      const signal = makeSignal('BUY', 1010, 70, {
        ...BASE_INDICATORS,
        rsi: { signal: 'oversold' },
        stochastic: { signal: 'oversold' },
        adx: { trending: true },
      });
      const result = adjustConfidence(signal);
      expect(result).toBeNull();
    });

    it('does not gate when ADX is present but not trending', () => {
      const signal = makeSignal('BUY', 1010, 60, {
        ...BASE_INDICATORS,
        adx: { trending: false },
      });
      const result = adjustConfidence(signal);
      expect(result).not.toBeNull();
    });
  });

  describe('Counter-S/R penalty', () => {
    it('penalises BUY near resistance by -20', () => {
      // entry=1090 → resistanceProximity=0.10 < 0.2 ✓, supportProximity=0.90 ≥ 0.2
      const signal = makeSignal('BUY', 1090, 60, { ...BASE_INDICATORS });
      const result = adjustConfidence(signal);
      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(40); // 60 - 20
    });

    it('penalises SELL near support by -20', () => {
      // entry=1010 → supportProximity=0.10 < 0.2 ✓, resistanceProximity=0.90 ≥ 0.2
      const signal = makeSignal('SELL', 1010, 60, { ...BASE_INDICATORS });
      const result = adjustConfidence(signal);
      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(40); // 60 - 20
    });
  });

  describe('Price in middle of range', () => {
    it('returns null when price is in the middle (no opinion)', () => {
      // entry=1050 → supportProximity=0.50, resistanceProximity=0.50 — neither < 0.2
      const signal = makeSignal('BUY', 1050, 60, { ...BASE_INDICATORS });
      const result = adjustConfidence(signal);
      expect(result).toBeNull();
    });

    it('returns null for SELL in mid-range', () => {
      const signal = makeSignal('SELL', 1050, 60, { ...BASE_INDICATORS });
      const result = adjustConfidence(signal);
      expect(result).toBeNull();
    });
  });

  describe('Confidence boundaries', () => {
    it('caps confidence at 100', () => {
      // 90 + 25 = 115 → capped at 100
      const signal = makeSignal('BUY', 1010, 90, {
        ...BASE_INDICATORS,
        rsi: { signal: 'oversold' },
        stochastic: { signal: 'oversold' },
      });
      const result = adjustConfidence(signal);
      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(100);
    });

    it('floors confidence at 25 on penalty', () => {
      // 30 - 20 = 10 → floored at 25
      const signal = makeSignal('BUY', 1090, 30, { ...BASE_INDICATORS });
      const result = adjustConfidence(signal);
      expect(result).not.toBeNull();
      expect(result!.confidence).toBe(25);
    });
  });
});
