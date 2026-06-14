/**
 * Unit tests for the structural T>1 HMM regime classifier (Phase 3, plan D6).
 *
 * Covers: the insufficient-data contract, sequence classification over
 * synthetic OHLCV fixtures (trending ramp / huge alternating swings /
 * flat-quiet range) with both an injected deterministic model and the
 * built-in heuristic default, posterior/confidence invariants, and the
 * invalid-model-file fallback policy (warn once, fall back to default).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  classifyRegime,
  clearModelCache,
  getDefaultModel,
  loadModel,
  setModel,
} from '../classifier.js';
import { computeRegimeFeatureSeries, featureVectorToArray } from '../features.js';
import type { RegimeBar } from '../features.js';
import type { HMMModelParams, MarketRegime } from '../types.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const REGIMES: MarketRegime[] = ['trend', 'volatile', 'range'];
const HOUR_MS = 3_600_000;
const T0 = 1_700_000_000_000;

function barsFromCloses(closes: number[], spread: number): RegimeBar[] {
  return closes.map((close, i) => ({
    timestamp: T0 + i * HOUR_MS,
    open: i === 0 ? close : closes[i - 1],
    high: close + spread,
    low: close - spread,
    close,
    volume: 1_000,
  }));
}

/** Monotonic ramp — directional trend: high ADX, persistent returns. */
function trendingBars(count: number): RegimeBar[] {
  const closes = Array.from({ length: count }, (_, i) => 100 + i * 0.5);
  return barsFromCloses(closes, 0.5);
}

/** Huge alternating swings — violent mean-flipping market. */
function volatileBars(count: number): RegimeBar[] {
  const closes = Array.from({ length: count }, (_, i) => (i % 2 === 0 ? 80 : 125));
  return barsFromCloses(closes, 2);
}

/** Flat and quiet — tiny oscillation around a constant level. */
function rangeBars(count: number): RegimeBar[] {
  const closes = Array.from({ length: count }, (_, i) => 100 + 0.2 * Math.sin(i * 1.7));
  return barsFromCloses(closes, 0.1);
}

/** Final (most recent) non-null feature vector of a bar series, as an array. */
function finalFeatureArray(bars: RegimeBar[]): number[] {
  const series = computeRegimeFeatureSeries(bars);
  const last = series[series.length - 1];
  if (!last) throw new Error('fixture did not warm up');
  return featureVectorToArray(last);
}

/**
 * Deterministic 3-state test model in RAW feature space (identity
 * standardization): each state's emission mean is pinned to the final
 * feature vector its fixture actually produces, so classification of each
 * fixture is unambiguous and tests the pipeline wiring end to end.
 */
function makeInjectedModel(): HMMModelParams {
  const FIXTURE_BARS = 320;
  // Per-feature variances scaled to raw feature magnitudes
  // [adx14 (0..100), bbBandwidthPct (~0..100), atrPercentile (0..1), returnAutocorr1 (-1..1)]
  const diag = [100, 25, 0.05, 0.1];
  const cov = (d: number[]): number[][] =>
    d.map((v, i) => d.map((_, j) => (i === j ? v : 0)));
  return {
    n_states: 3,
    state_labels: { '0': 'trend', '1': 'volatile', '2': 'range' },
    transition_matrix: [
      [0.9, 0.05, 0.05],
      [0.05, 0.9, 0.05],
      [0.05, 0.05, 0.9],
    ],
    emission_means: [
      finalFeatureArray(trendingBars(FIXTURE_BARS)),
      finalFeatureArray(volatileBars(FIXTURE_BARS)),
      finalFeatureArray(rangeBars(FIXTURE_BARS)),
    ],
    emission_covariances: [cov(diag), cov(diag), cov(diag)],
    feature_names: ['adx14', 'bbBandwidthPct', 'atrPercentile', 'returnAutocorr1'],
    feature_means: [0, 0, 0, 0],
    feature_stds: [1, 1, 1, 1],
    asset_class: 'crypto',
    trained_at: '2026-06-11T00:00:00Z',
    initial_probs: [1 / 3, 1 / 3, 1 / 3],
  };
}

// ─── Default model structure ─────────────────────────────────────────────────

describe('getDefaultModel', () => {
  it('returns a 3-state model with each canonical label exactly once', () => {
    const model = getDefaultModel('crypto');
    expect(model.n_states).toBe(3);
    const labels = Object.values(model.state_labels);
    expect(labels).toHaveLength(3);
    for (const r of REGIMES) {
      expect(labels.filter((l) => l === r)).toHaveLength(1);
    }
  });

  it('has a row-stochastic transition matrix', () => {
    for (const asset of ['crypto', 'forex', 'metals'] as const) {
      const model = getDefaultModel(asset);
      for (const row of model.transition_matrix) {
        expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1.0, 6);
      }
    }
  });

  it('has standardization params and emissions in 4-feature space', () => {
    const model = getDefaultModel('forex');
    expect(model.feature_names).toEqual([
      'adx14',
      'bbBandwidthPct',
      'atrPercentile',
      'returnAutocorr1',
    ]);
    expect(model.feature_means).toHaveLength(4);
    expect(model.feature_stds).toHaveLength(4);
    expect(model.emission_means).toHaveLength(3);
    for (const row of model.emission_means) expect(row).toHaveLength(4);
    expect(model.emission_covariances).toHaveLength(3);
    for (const covMatrix of model.emission_covariances) {
      expect(covMatrix).toHaveLength(4);
      for (const row of covMatrix) expect(row).toHaveLength(4);
    }
  });

  it('has uniform initial state probabilities', () => {
    const model = getDefaultModel('metals');
    expect(model.initial_probs).toHaveLength(3);
    for (const p of model.initial_probs!) expect(p).toBeCloseTo(1 / 3, 9);
  });
});

// ─── Insufficient data contract ──────────────────────────────────────────────

describe('classifyRegime — insufficient data', () => {
  beforeAll(() => setModel('crypto', makeInjectedModel()));
  afterAll(() => clearModelCache());

  it('throws when fewer than 8 feature vectors are available', () => {
    // With default options the first non-null vector lands at bar index 43,
    // so 50 bars yield exactly 7 vectors — one short.
    expect(() => classifyRegime('BTCUSD', trendingBars(50))).toThrow(
      'insufficient data for regime classification',
    );
    expect(() => classifyRegime('BTCUSD', [])).toThrow(
      'insufficient data for regime classification',
    );
  });

  it('classifies once 8 feature vectors are available', () => {
    // 51 bars → 8 vectors (indices 43..50)
    const result = classifyRegime('BTCUSD', trendingBars(51));
    expect(REGIMES).toContain(result.regime);
  });
});

// ─── Sequence classification (injected deterministic model) ─────────────────

describe('classifyRegime — sequence classification', () => {
  beforeAll(() => setModel('crypto', makeInjectedModel()));
  afterAll(() => clearModelCache());

  it('classifies a monotonic ramp as trend', () => {
    expect(classifyRegime('BTCUSD', trendingBars(320)).regime).toBe('trend');
  });

  it('classifies huge alternating swings as volatile', () => {
    expect(classifyRegime('BTCUSD', volatileBars(320)).regime).toBe('volatile');
  });

  it('classifies a flat quiet series as range', () => {
    expect(classifyRegime('BTCUSD', rangeBars(320)).regime).toBe('range');
  });

  it('follows the trailing window: swings followed by a long ramp reads trend', () => {
    const mixed = [...volatileBars(150), ...trendingBars(150)].map((bar, i) => ({
      ...bar,
      timestamp: T0 + i * HOUR_MS,
    }));
    expect(classifyRegime('BTCUSD', mixed).regime).toBe('trend');
  });

  it('returns posterior invariants: confidence in (0,1], probabilities sum to 1', () => {
    const result = classifyRegime('BTCUSD', trendingBars(320));

    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.confidence).toBeCloseTo(result.allProbabilities[result.regime], 9);

    const probSum = Object.values(result.allProbabilities).reduce((a, b) => a + b, 0);
    expect(probSum).toBeCloseTo(1.0, 4);
    const transSum = Object.values(result.transitionProbs).reduce((a, b) => a + b, 0);
    expect(transSum).toBeCloseTo(1.0, 4);

    for (const r of REGIMES) {
      expect(result.allProbabilities).toHaveProperty(r);
      expect(result.allProbabilities[r]).toBeGreaterThanOrEqual(0);
      expect(result.transitionProbs).toHaveProperty(r);
    }
  });

  it('carries the most recent raw feature vector and a timestamp', () => {
    const bars = trendingBars(320);
    const result = classifyRegime('BTCUSD', bars);
    expect(featureVectorToArray(result.features)).toEqual(finalFeatureArray(bars));
    expect(result.timestamp).toBeTruthy();
  });

  it('honors the sequenceLength option', () => {
    const result = classifyRegime('BTCUSD', trendingBars(320), { sequenceLength: 8 });
    expect(result.regime).toBe('trend');
  });

  it('clamps sequenceLength below the minimum instead of throwing on ample data', () => {
    // 500 bars yield hundreds of feature vectors; sequenceLength: 4 must be
    // clamped up to the 8-vector minimum, not produce an insufficient-data throw.
    const result = classifyRegime('BTCUSD', trendingBars(500), { sequenceLength: 4 });
    expect(result.regime).toBe('trend');
  });

  it('throws when the injected model is missing a state label', () => {
    const model = makeInjectedModel();
    const bad: HMMModelParams = {
      ...model,
      state_labels: { '0': 'trend', '1': 'volatile' } as HMMModelParams['state_labels'],
    };
    setModel('crypto', bad); // setModel bypasses validation
    expect(() => classifyRegime('BTCUSD', trendingBars(320))).toThrow();
    setModel('crypto', makeInjectedModel());
  });
});

// ─── Standardization direction canary ────────────────────────────────────────

describe('classifyRegime — standardization direction', () => {
  afterAll(() => clearModelCache());

  it('standardizes as (x - mean) / std, not the sign-flipped form', () => {
    // Pin the range state's emission mean to the CORRECTLY standardized
    // vector of the flat low-ADX fixture, and the trend state's mean to its
    // exact negation. A sign flip in (x - mean) / std would land the
    // observation on the negated mean and flip the label to trend.
    const featureMeans = [22, 4, 0.5, 0];
    const featureStds = [10, 3, 0.28, 0.25];
    const raw = finalFeatureArray(rangeBars(320));
    const zRange = raw.map((x, i) => (x - featureMeans[i]) / featureStds[i]);
    const zFlipped = zRange.map((z) => -z);
    const identityCov = (): number[][] =>
      Array.from({ length: 4 }, (_, i) =>
        Array.from({ length: 4 }, (__, j) => (i === j ? 1 : 0)),
      );

    setModel('crypto', {
      n_states: 3,
      state_labels: { '0': 'trend', '1': 'volatile', '2': 'range' },
      transition_matrix: [
        [0.9, 0.05, 0.05],
        [0.05, 0.9, 0.05],
        [0.05, 0.05, 0.9],
      ],
      emission_means: [zFlipped, zRange.map((z, i) => z + (i < 2 ? 10 : 0)), zRange],
      emission_covariances: [identityCov(), identityCov(), identityCov()],
      feature_names: ['adx14', 'bbBandwidthPct', 'atrPercentile', 'returnAutocorr1'],
      feature_means: featureMeans,
      feature_stds: featureStds,
      asset_class: 'crypto',
      trained_at: '2026-06-11T00:00:00Z',
      initial_probs: [1 / 3, 1 / 3, 1 / 3],
    });

    expect(classifyRegime('BTCUSD', rangeBars(320)).regime).toBe('range');
  });
});

// ─── Default heuristic model behavior ────────────────────────────────────────

describe('classifyRegime — built-in default model', () => {
  beforeAll(() => {
    clearModelCache();
    // Inject the defaults directly so the test never reads model files from disk.
    setModel('crypto', getDefaultModel('crypto'));
  });
  afterAll(() => clearModelCache());

  it('separates the three synthetic fixtures', () => {
    expect(classifyRegime('BTCUSD', trendingBars(320)).regime).toBe('trend');
    expect(classifyRegime('BTCUSD', volatileBars(320)).regime).toBe('volatile');
    expect(classifyRegime('BTCUSD', rangeBars(320)).regime).toBe('range');
  });
});

// ─── Model loading fallback policy ───────────────────────────────────────────

describe('loadModel — invalid model file fallback policy', () => {
  let tmpDir: string;
  let warnSpy: jest.SpyInstance;
  const savedEnv = process.env.HMM_MODEL_DIR;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hmm-models-'));
    process.env.HMM_MODEL_DIR = tmpDir;
    clearModelCache();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    if (savedEnv === undefined) delete process.env.HMM_MODEL_DIR;
    else process.env.HMM_MODEL_DIR = savedEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    clearModelCache();
  });

  it('falls back to the built-in default with ONE warning when the file fails validation', () => {
    // A stale legacy-vocabulary model file: parses, but labels are invalid now.
    const stale = {
      ...getDefaultModel('crypto'),
      n_states: 5,
      state_labels: { '0': 'a', '1': 'b', '2': 'c', '3': 'd', '4': 'e' },
    };
    fs.writeFileSync(path.join(tmpDir, 'crypto_hmm.json'), JSON.stringify(stale));

    const model = loadModel('crypto');
    expect(model.n_states).toBe(3);
    expect(Object.values(model.state_labels).sort()).toEqual(['range', 'trend', 'volatile']);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain(
      '[regime] model file invalid for crypto, using built-in default',
    );

    // Result is cached: a second load neither re-reads nor re-warns.
    loadModel('crypto');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects a model file with a non-row-stochastic transition matrix', () => {
    const bad = { ...getDefaultModel('crypto') };
    bad.transition_matrix = [
      [0.5, 0.2, 0.2], // sums to 0.9
      [0.025, 0.95, 0.025],
      [0.025, 0.025, 0.95],
    ];
    fs.writeFileSync(path.join(tmpDir, 'crypto_hmm.json'), JSON.stringify(bad));

    const model = loadModel('crypto');
    expect(model.n_states).toBe(3);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const message = String(warnSpy.mock.calls[0][0]);
    expect(message).toContain('row 0');
    expect(message).toContain('sums to');
  });

  it('rejects a model file with negative transition probabilities', () => {
    const bad = { ...getDefaultModel('crypto') };
    bad.transition_matrix = [
      [0.95, 0.025, 0.025],
      [1.5, -0.5, 0], // sums to 1 but has a negative entry
      [0.025, 0.025, 0.95],
    ];
    fs.writeFileSync(path.join(tmpDir, 'crypto_hmm.json'), JSON.stringify(bad));

    const model = loadModel('crypto');
    expect(model.n_states).toBe(3);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('negative');
  });

  it('rejects a model file with wrong-length initial_probs', () => {
    // A wrong-length initial_probs silently corrupts forward-algorithm
    // confidences (NaN log terms contaminate the alpha sums) — it must fail
    // validation and fall back, never load.
    const bad = { ...getDefaultModel('crypto'), initial_probs: [0.5, 0.5] };
    fs.writeFileSync(path.join(tmpDir, 'crypto_hmm.json'), JSON.stringify(bad));

    const model = loadModel('crypto');
    expect(model.n_states).toBe(3);
    expect(model.initial_probs).toHaveLength(3);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('initial_probs');
  });

  it('rejects a model file whose initial_probs do not sum to 1', () => {
    const bad = { ...getDefaultModel('crypto'), initial_probs: [0.5, 0.4, 0.4] };
    fs.writeFileSync(path.join(tmpDir, 'crypto_hmm.json'), JSON.stringify(bad));

    const model = loadModel('crypto');
    expect(model.n_states).toBe(3);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('initial_probs');
  });

  it('falls back with a warning when the file is unparseable', () => {
    fs.writeFileSync(path.join(tmpDir, 'forex_hmm.json'), '{not json');
    const model = loadModel('forex');
    expect(model.n_states).toBe(3);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('[regime] model file invalid for forex');
  });

  it('loads a valid model file from HMM_MODEL_DIR without warning', () => {
    const valid = { ...getDefaultModel('metals'), trained_at: '2030-01-02T03:04:05Z' };
    fs.writeFileSync(path.join(tmpDir, 'metals_hmm.json'), JSON.stringify(valid));
    const model = loadModel('metals');
    expect(model.trained_at).toBe('2030-01-02T03:04:05Z');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('uses the built-in default silently when no model file exists', () => {
    const model = loadModel('crypto');
    expect(model.n_states).toBe(3);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
