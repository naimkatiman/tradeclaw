/**
 * Unit tests for the pure-TS Viterbi / Forward / Gaussian PDF implementations.
 */

import {
  computeGaussianLogPdf,
  forwardAlgorithm,
  viterbiDecode,
} from '../viterbi.js';
import type { HMMModelParams } from '../types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal 2-state, 1-feature HMM for deterministic testing. */
function twoStateModel(): HMMModelParams {
  return {
    n_states: 2,
    state_labels: { '0': 'bear', '1': 'bull' },
    transition_matrix: [
      [0.7, 0.3],
      [0.4, 0.6],
    ],
    emission_means: [
      [-1],  // state 0 emits around -1
      [1],   // state 1 emits around +1
    ],
    emission_covariances: [
      [[0.5]],  // state 0 variance
      [[0.5]],  // state 1 variance
    ],
    feature_names: ['x'],
    asset_class: 'test',
    trained_at: '2025-01-01T00:00:00Z',
  } as unknown as HMMModelParams;
}

// ─── Gaussian PDF ────────────────────────────────────────────────────────────

describe('computeGaussianLogPdf', () => {
  it('returns correct log-pdf for a 1-D standard normal at x=0', () => {
    // N(0 | 0, 1) = 1/sqrt(2*pi) ~ 0.3989
    const logP = computeGaussianLogPdf([0], [0], [[1]]);
    const expected = -0.5 * Math.log(2 * Math.PI); // -0.9189...
    expect(logP).toBeCloseTo(expected, 4);
  });

  it('returns correct log-pdf for 1-D normal at x=1, mean=0, var=1', () => {
    // N(1 | 0, 1) = exp(-0.5) / sqrt(2*pi) ~ 0.2420
    const logP = computeGaussianLogPdf([1], [0], [[1]]);
    const expected = -0.5 * (Math.log(2 * Math.PI) + 1);
    expect(logP).toBeCloseTo(expected, 4);
  });

  it('handles 2-D multivariate case with identity covariance', () => {
    // N([0,0] | [0,0], I) = 1/(2*pi) ~ 0.1592
    const logP = computeGaussianLogPdf(
      [0, 0],
      [0, 0],
      [[1, 0], [0, 1]],
    );
    const expected = -Math.log(2 * Math.PI);
    expect(logP).toBeCloseTo(expected, 4);
  });

  it('gives higher probability closer to mean', () => {
    const logPNear = computeGaussianLogPdf([0.1], [0], [[1]]);
    const logPFar = computeGaussianLogPdf([3.0], [0], [[1]]);
    expect(logPNear).toBeGreaterThan(logPFar);
  });

  it('handles 4-D feature space (regime model dimensions)', () => {
    const mean = [0.02, 0.01, 0.03, 0.0];
    const cov = [
      [0.001, 0, 0, 0],
      [0, 0.001, 0, 0],
      [0, 0, 0.002, 0],
      [0, 0, 0, 0.5],
    ];
    const x = [0.02, 0.01, 0.03, 0.0]; // exactly at mean
    const logP = computeGaussianLogPdf(x, mean, cov);
    // At the mean the exponent term is 0, so logP = -0.5*(d*ln2pi + lnDet)
    const det = 0.001 * 0.001 * 0.002 * 0.5;
    const expected = -0.5 * (4 * Math.log(2 * Math.PI) + Math.log(det));
    expect(logP).toBeCloseTo(expected, 3);
  });
});

// ─── Forward Algorithm ───────────────────────────────────────────────────────

describe('forwardAlgorithm', () => {
  it('returns empty array for empty observations', () => {
    const model = twoStateModel();
    expect(forwardAlgorithm([], model)).toEqual([]);
  });

  it('returns normalized probabilities for a single observation', () => {
    const model = twoStateModel();
    const result = forwardAlgorithm([[1.0]], model);
    expect(result).toHaveLength(1);
    const sum = result[0].reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it('assigns higher probability to correct state', () => {
    const model = twoStateModel();
    // Observation near state 1's mean (+1)
    const resultBull = forwardAlgorithm([[1.5]], model);
    expect(resultBull[0][1]).toBeGreaterThan(resultBull[0][0]);

    // Observation near state 0's mean (-1)
    const resultBear = forwardAlgorithm([[-1.5]], model);
    expect(resultBear[0][0]).toBeGreaterThan(resultBear[0][1]);
  });

  it('handles multi-step sequences', () => {
    const model = twoStateModel();
    const obs = [[-1], [-0.5], [0.5], [1.0], [1.2]];
    const result = forwardAlgorithm(obs, model);

    expect(result).toHaveLength(5);
    // Each time step should sum to 1
    for (const probs of result) {
      const sum = probs.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 6);
    }
    // Last observation (+1.2) should favor state 1 (bull)
    expect(result[4][1]).toBeGreaterThan(result[4][0]);
  });
});

// ─── Viterbi Decoding ────────────────────────────────────────────────────────

describe('viterbiDecode', () => {
  it('returns empty array for empty observations', () => {
    const model = twoStateModel();
    expect(viterbiDecode([], model)).toEqual([]);
  });

  it('decodes a single observation to the correct state', () => {
    const model = twoStateModel();
    // Strongly positive observation => state 1
    expect(viterbiDecode([[2.0]], model)).toEqual([1]);
    // Strongly negative observation => state 0
    expect(viterbiDecode([[-2.0]], model)).toEqual([0]);
  });

  it('decodes a sequence with a clear regime switch', () => {
    const model = twoStateModel();
    // Bear regime followed by bull regime
    const obs = [[-1.5], [-1.0], [-1.2], [1.0], [1.5], [1.2]];
    const path = viterbiDecode(obs, model);

    expect(path).toHaveLength(6);
    // First few should be state 0 (bear), last few state 1 (bull)
    expect(path[0]).toBe(0);
    expect(path[1]).toBe(0);
    expect(path[4]).toBe(1);
    expect(path[5]).toBe(1);
  });

  it('maintains path length equal to observation count', () => {
    const model = twoStateModel();
    const obs = Array.from({ length: 50 }, (_, i) => [Math.sin(i / 5)]);
    const path = viterbiDecode(obs, model);
    expect(path).toHaveLength(50);
    // All states should be 0 or 1
    for (const s of path) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(2);
    }
  });
});
