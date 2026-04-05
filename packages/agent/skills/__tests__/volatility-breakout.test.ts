/**
 * Volatility Breakout Skill — pure logic tests
 *
 * Tests the confidence-boosting and filtering logic inline,
 * without importing the skill module (which depends on dist/signals/engine.js).
 */

interface ADX {
  value: number;
  plusDI: number;
  minusDI: number;
}

interface BollingerBands {
  bandwidth: number;
  position: 'upper' | 'lower' | 'middle';
}

interface Volume {
  confirmed: boolean;
}

interface Indicators {
  support: number[];
  resistance: number[];
  bollingerBands: BollingerBands;
  adx: ADX | null;
  volume: Volume | null;
}

interface Signal {
  direction: 'BUY' | 'SELL';
  entry: number;
  confidence: number;
  indicators: Indicators;
}

interface OutputSignal extends Signal {
  skill: string;
}

/**
 * Mirrors the filtering + confidence-boosting logic from VolatilityBreakoutSkill.analyze().
 */
function adjustConfidence(signals: Signal[], skillName = 'volatility-breakout'): OutputSignal[] {
  const filtered: OutputSignal[] = [];

  for (const signal of signals) {
    const { support, resistance, bollingerBands, adx, volume } = signal.indicators;

    if (!adx || adx.value < 20) continue;

    const squeezed = bollingerBands.bandwidth < 2;
    const volumeConfirmed = volume ? volume.confirmed : false;

    const nearestResistance = resistance.length > 0 ? Math.min(...resistance) : Infinity;
    const nearestSupport = support.length > 0 ? Math.max(...support) : 0;

    const breakingResistance = signal.entry > nearestResistance;
    const breakingSupport = signal.entry < nearestSupport;

    // Bullish breakout
    if (signal.direction === 'BUY' && (breakingResistance || bollingerBands.position === 'upper')) {
      if (adx.plusDI <= adx.minusDI) continue;

      let boost = 10;
      if (breakingResistance) boost += 8;
      if (squeezed) boost += 5;
      if (volumeConfirmed) boost += 5;

      filtered.push({
        ...signal,
        confidence: Math.min(signal.confidence + boost, 100),
        skill: skillName,
      });
      continue;
    }

    // Bearish breakout
    if (signal.direction === 'SELL' && (breakingSupport || bollingerBands.position === 'lower')) {
      if (adx.minusDI <= adx.plusDI) continue;

      let boost = 10;
      if (breakingSupport) boost += 8;
      if (squeezed) boost += 5;
      if (volumeConfirmed) boost += 5;

      filtered.push({
        ...signal,
        confidence: Math.min(signal.confidence + boost, 100),
        skill: skillName,
      });
      continue;
    }
  }

  return filtered;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeBuySignal(overrides: Partial<Signal> = {}): Signal {
  return {
    direction: 'BUY',
    entry: 1.1050,
    confidence: 60,
    indicators: {
      support: [1.0900],
      resistance: [1.1000], // entry (1.1050) is above → breakingResistance = true
      bollingerBands: { bandwidth: 1.5, position: 'upper' }, // squeezed
      adx: { value: 25, plusDI: 30, minusDI: 15 },
      volume: { confirmed: true },
    },
    ...overrides,
  };
}

function makeSellSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    direction: 'SELL',
    entry: 1.0880,
    confidence: 60,
    indicators: {
      support: [1.0900], // entry (1.0880) is below → breakingSupport = true
      resistance: [1.1100],
      bollingerBands: { bandwidth: 1.5, position: 'lower' }, // squeezed
      adx: { value: 25, plusDI: 15, minusDI: 30 },
      volume: { confirmed: true },
    },
    ...overrides,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('VolatilityBreakout — adjustConfidence logic', () => {
  describe('BUY signals', () => {
    it('boosts +28 on resistance breakout with volume and squeeze', () => {
      const signal = makeBuySignal(); // breakingResistance + squeezed + volumeConfirmed
      const result = adjustConfidence([signal]);

      expect(result).toHaveLength(1);
      // boost = 10 (base) + 8 (resistance) + 5 (squeeze) + 5 (volume) = 28
      expect(result[0].confidence).toBe(60 + 28);
      expect(result[0].skill).toBe('volatility-breakout');
    });

    it('boosts +18 without squeeze and no volume (normal bandwidth)', () => {
      const signal = makeBuySignal({
        indicators: {
          support: [1.0900],
          resistance: [1.1000],
          bollingerBands: { bandwidth: 3.5, position: 'upper' }, // NOT squeezed
          adx: { value: 25, plusDI: 30, minusDI: 15 },
          volume: { confirmed: false },
        },
      });
      const result = adjustConfidence([signal]);

      expect(result).toHaveLength(1);
      // boost = 10 (base) + 8 (resistance) = 18 (no squeeze, no volume)
      expect(result[0].confidence).toBe(60 + 18);
    });

    it('rejects BUY when ADX < 20', () => {
      const signal = makeBuySignal({
        indicators: {
          ...makeBuySignal().indicators,
          adx: { value: 15, plusDI: 30, minusDI: 15 },
        },
      });
      const result = adjustConfidence([signal]);
      expect(result).toHaveLength(0);
    });

    it('rejects BUY when -DI > +DI (bearish directional pressure)', () => {
      const signal = makeBuySignal({
        indicators: {
          ...makeBuySignal().indicators,
          adx: { value: 25, plusDI: 15, minusDI: 30 }, // -DI dominates
        },
      });
      const result = adjustConfidence([signal]);
      expect(result).toHaveLength(0);
    });

    it('caps confidence at 100', () => {
      const signal = makeBuySignal({ confidence: 80 });
      // 80 + 28 = 108 → capped at 100
      const result = adjustConfidence([signal]);
      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe(100);
    });
  });

  describe('SELL signals', () => {
    it('boosts +28 on support break with volume and squeeze', () => {
      const signal = makeSellSignal(); // breakingSupport + squeezed + volumeConfirmed
      const result = adjustConfidence([signal]);

      expect(result).toHaveLength(1);
      // boost = 10 (base) + 8 (support break) + 5 (squeeze) + 5 (volume) = 28
      expect(result[0].confidence).toBe(60 + 28);
      expect(result[0].skill).toBe('volatility-breakout');
    });

    it('rejects SELL when ADX < 20', () => {
      const signal = makeSellSignal({
        indicators: {
          ...makeSellSignal().indicators,
          adx: { value: 10, plusDI: 15, minusDI: 30 },
        },
      });
      const result = adjustConfidence([signal]);
      expect(result).toHaveLength(0);
    });

    it('rejects SELL when +DI > -DI (bullish directional pressure)', () => {
      const signal = makeSellSignal({
        indicators: {
          ...makeSellSignal().indicators,
          adx: { value: 25, plusDI: 30, minusDI: 15 }, // +DI dominates
        },
      });
      const result = adjustConfidence([signal]);
      expect(result).toHaveLength(0);
    });

    it('caps confidence at 100 for SELL', () => {
      const signal = makeSellSignal({ confidence: 85 });
      // 85 + 28 = 113 → capped at 100
      const result = adjustConfidence([signal]);
      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe(100);
    });
  });
});
