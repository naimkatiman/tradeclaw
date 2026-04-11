/**
 * Unit tests for the HMM regime classifier.
 */

import {
  computeFeatures,
  getDefaultModel,
  classifyRegime,
  setModel,
} from '../classifier';
import type { PriceBar } from '../classifier';
import type { HMMModelParams, MarketRegime } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const REGIMES: MarketRegime[] = ['crash', 'bear', 'neutral', 'bull', 'euphoria'];

/** Generate synthetic price bars with a given drift and volatility. */
function generateBars(
  count: number,
  startPrice: number,
  dailyDrift: number,
  volatility: number,
  baseVolume: number = 1000,
): PriceBar[] {
  const bars: PriceBar[] = [];
  let price = startPrice;
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    // Deterministic "random" walk using sin for reproducibility
    const noise = volatility * Math.sin(i * 0.7 + 1.3) * 0.5;
    price = price * (1 + dailyDrift + noise);
    const volumeNoise = 1 + 0.3 * Math.sin(i * 1.1);
    bars.push({
      close: price,
      volume: baseVolume * volumeNoise,
      timestamp: now - (count - i) * 86400000,
    });
  }
  return bars;
}

// ─── Feature Computation ─────────────────────────────────────────────────────

describe('computeFeatures', () => {
  it('throws when given fewer than 21 bars', () => {
    const bars = generateBars(10, 100, 0, 0.01);
    expect(() => computeFeatures(bars)).toThrow('Need at least 21 price bars');
  });

  it('computes features from exactly 21 bars', () => {
    const bars = generateBars(21, 100, 0, 0.01);
    const features = computeFeatures(bars);

    expect(features.rollingVol20d).toBeGreaterThanOrEqual(0);
    expect(typeof features.returns5d).toBe('number');
    expect(typeof features.returns20d).toBe('number');
    expect(typeof features.volumeZScore).toBe('number');
    expect(isFinite(features.rollingVol20d)).toBe(true);
    expect(isFinite(features.returns5d)).toBe(true);
    expect(isFinite(features.returns20d)).toBe(true);
    expect(isFinite(features.volumeZScore)).toBe(true);
  });

  it('returns positive volatility for trending data', () => {
    const bars = generateBars(50, 100, 0.01, 0.02);
    const features = computeFeatures(bars);
    expect(features.rollingVol20d).toBeGreaterThan(0);
  });

  it('returns positive 20d returns for uptrending data', () => {
    // Strong daily drift of +2% with minimal noise
    const bars = generateBars(50, 100, 0.02, 0.001);
    const features = computeFeatures(bars);
    expect(features.returns20d).toBeGreaterThan(0);
  });

  it('returns negative 20d returns for downtrending data', () => {
    // Strong daily drift of -2% with minimal noise
    const bars = generateBars(50, 100, -0.02, 0.001);
    const features = computeFeatures(bars);
    expect(features.returns20d).toBeLessThan(0);
  });

  it('throws when price history contains a zero price', () => {
    const bars = generateBars(25, 100, 0, 0.01);
    bars[10].close = 0;
    expect(() => computeFeatures(bars)).toThrow('non-positive or non-finite');
  });

  it('throws when price history contains NaN', () => {
    const bars = generateBars(25, 100, 0, 0.01);
    bars[10].close = NaN;
    expect(() => computeFeatures(bars)).toThrow('non-positive or non-finite');
  });
});

// ─── Default Model ───────────────────────────────────────────────────────────

describe('getDefaultModel', () => {
  it('returns a model with 5 states', () => {
    const model = getDefaultModel('crypto');
    expect(model.n_states).toBe(5);
  });

  it('has valid transition matrix (rows sum to 1)', () => {
    for (const asset of ['crypto', 'forex', 'metals'] as const) {
      const model = getDefaultModel(asset);
      for (const row of model.transition_matrix) {
        const sum = row.reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 6);
      }
    }
  });

  it('has correct state labels', () => {
    const model = getDefaultModel('forex');
    const labels = Object.values(model.state_labels);
    expect(labels).toEqual(REGIMES);
  });

  it('has emission means with correct dimensions', () => {
    const model = getDefaultModel('crypto');
    expect(model.emission_means).toHaveLength(5);
    for (const row of model.emission_means) {
      expect(row).toHaveLength(4);
    }
  });

  it('has emission covariances with correct dimensions', () => {
    const model = getDefaultModel('metals');
    expect(model.emission_covariances).toHaveLength(5);
    for (const cov of model.emission_covariances) {
      expect(cov).toHaveLength(4);
      for (const row of cov) {
        expect(row).toHaveLength(4);
      }
    }
  });
});

// ─── Classification ──────────────────────────────────────────────────────────

describe('classifyRegime', () => {
  it('returns a valid regime for crypto symbol', () => {
    const bars = generateBars(50, 87000, 0, 0.01);
    const result = classifyRegime('BTCUSD', bars);

    expect(REGIMES).toContain(result.regime);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.timestamp).toBeTruthy();
  });

  it('returns a valid regime for forex symbol', () => {
    const bars = generateBars(50, 1.079, 0, 0.002);
    const result = classifyRegime('EURUSD', bars);
    expect(REGIMES).toContain(result.regime);
  });

  it('returns a valid regime for metals symbol', () => {
    const bars = generateBars(50, 3020, 0, 0.005);
    const result = classifyRegime('XAUUSD', bars);
    expect(REGIMES).toContain(result.regime);
  });

  it('allProbabilities sum to approximately 1', () => {
    const bars = generateBars(50, 87000, 0.005, 0.02);
    const result = classifyRegime('BTCUSD', bars);

    const sum = Object.values(result.allProbabilities).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 4);
  });

  it('transitionProbs sum to approximately 1', () => {
    const bars = generateBars(50, 87000, 0.005, 0.02);
    const result = classifyRegime('BTCUSD', bars);

    const sum = Object.values(result.transitionProbs).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 4);
  });

  it('allProbabilities contains all 5 regimes', () => {
    const bars = generateBars(50, 87000, 0, 0.01);
    const result = classifyRegime('BTCUSD', bars);

    for (const r of REGIMES) {
      expect(result.allProbabilities).toHaveProperty(r);
      expect(result.allProbabilities[r]).toBeGreaterThanOrEqual(0);
    }
  });

  it('features are included in the result', () => {
    const bars = generateBars(50, 87000, 0, 0.01);
    const result = classifyRegime('BTCUSD', bars);

    expect(result.features).toBeDefined();
    expect(typeof result.features.rollingVol20d).toBe('number');
    expect(typeof result.features.returns5d).toBe('number');
    expect(typeof result.features.returns20d).toBe('number');
    expect(typeof result.features.volumeZScore).toBe('number');
  });

  it('confidence matches the probability of the chosen regime', () => {
    const bars = generateBars(50, 87000, 0, 0.01);
    const result = classifyRegime('BTCUSD', bars);

    expect(result.confidence).toBeCloseTo(
      result.allProbabilities[result.regime],
      6,
    );
  });

  it('throws when model has a missing state label', () => {
    // Build a model with only 3 of 5 state labels populated
    const model = getDefaultModel('crypto');
    const badModel: HMMModelParams = {
      ...model,
      state_labels: { '0': 'crash', '1': 'bear', '2': 'neutral' },
    };
    // Inject the bad model — setModel bypasses validation
    setModel('crypto', badModel);

    const bars = generateBars(50, 87000, 0, 0.01);
    expect(() => classifyRegime('BTCUSD', bars)).toThrow();

    // Restore valid model
    setModel('crypto', model);
  });
});
