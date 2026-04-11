/**
 * HMM Regime Classifier — Viterbi & Forward Algorithm
 *
 * Pure TypeScript implementations of:
 *  - Multivariate Gaussian log-PDF
 *  - Forward algorithm (posterior state probabilities)
 *  - Viterbi decoding (most-likely state sequence)
 *
 * Zero external dependencies — all linear algebra is inline.
 */

import type { HMMModelParams } from './types';

// ─── Linear Algebra Helpers ──────────────────────────────────────────────────

/**
 * Compute the determinant of an NxN matrix using LU decomposition.
 * Returns 0 for singular matrices.
 */
function determinant(matrix: number[][]): number {
  const n = matrix.length;
  if (n === 1) return matrix[0][0];
  if (n === 2) return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];

  // LU decomposition (Doolittle) with partial pivoting
  const lu: number[][] = matrix.map(row => [...row]);
  let sign = 1;

  for (let k = 0; k < n; k++) {
    // Partial pivot
    let maxVal = Math.abs(lu[k][k]);
    let maxRow = k;
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(lu[i][k]) > maxVal) {
        maxVal = Math.abs(lu[i][k]);
        maxRow = i;
      }
    }
    if (maxRow !== k) {
      [lu[k], lu[maxRow]] = [lu[maxRow], lu[k]];
      sign *= -1;
    }
    if (Math.abs(lu[k][k]) < 1e-12) return 0;

    for (let i = k + 1; i < n; i++) {
      lu[i][k] /= lu[k][k];
      for (let j = k + 1; j < n; j++) {
        lu[i][j] -= lu[i][k] * lu[k][j];
      }
    }
  }

  let det = sign;
  for (let i = 0; i < n; i++) {
    det *= lu[i][i];
  }
  return det;
}

/**
 * Invert an NxN matrix using Gauss-Jordan elimination.
 * Throws if the matrix is singular.
 */
function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  // Augmented matrix [A | I]
  const aug: number[][] = matrix.map((row, i) => {
    const augRow = new Array(2 * n).fill(0);
    for (let j = 0; j < n; j++) augRow[j] = row[j];
    augRow[n + i] = 1;
    return augRow;
  });

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxVal = Math.abs(aug[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    if (maxVal < 1e-12) {
      throw new Error('Singular matrix — cannot invert');
    }
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    // Scale pivot row
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] /= pivot;
    }

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  return aug.map(row => row.slice(n));
}

// ─── Gaussian PDF ────────────────────────────────────────────────────────────

/**
 * Compute the log-probability of observation `x` under a multivariate
 * Gaussian with the given mean vector and covariance matrix.
 *
 * log N(x | mu, Sigma) = -0.5 * [ d*ln(2pi) + ln|Sigma| + (x-mu)^T Sigma^{-1} (x-mu) ]
 */
export function computeGaussianLogPdf(
  x: number[],
  mean: number[],
  covariance: number[][],
): number {
  const d = x.length;
  const diff = x.map((xi, i) => xi - mean[i]);

  const det = determinant(covariance);
  if (Math.abs(det) < 1e-30) {
    // Near-singular covariance — return a very low log-probability
    return -1e6;
  }

  const covInv = invertMatrix(covariance);

  // Quadratic form: diff^T * covInv * diff
  let quad = 0;
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      quad += diff[i] * covInv[i][j] * diff[j];
    }
  }

  const logDet = Math.log(Math.abs(det));
  const logNorm = -0.5 * (d * Math.log(2 * Math.PI) + logDet + quad);
  return logNorm;
}

// ─── Forward Algorithm ───────────────────────────────────────────────────────

/**
 * Run the forward algorithm on a sequence of observations.
 *
 * Returns an array of length T where each element is a normalized
 * probability distribution over the N hidden states.
 *
 * Uses the log-sum-exp trick internally for numerical stability,
 * then exponentiates and normalizes each time step.
 */
export function forwardAlgorithm(
  observations: number[][],
  params: HMMModelParams,
): number[][] {
  const T = observations.length;
  const N = params.n_states;
  if (T === 0) return [];

  // Uniform initial state distribution
  const logPi = Math.log(1 / N);

  // Pre-compute log transition matrix
  const logA: number[][] = params.transition_matrix.map(row =>
    row.map(p => (p > 0 ? Math.log(p) : -1e10)),
  );

  // alpha[t][i] = log P(o_1..o_t, s_t=i)
  const logAlpha: number[][] = [];

  // t = 0: initialization
  const first: number[] = new Array(N);
  for (let i = 0; i < N; i++) {
    const logEmission = computeGaussianLogPdf(
      observations[0],
      params.emission_means[i],
      params.emission_covariances[i],
    );
    first[i] = logPi + logEmission;
  }
  logAlpha.push(first);

  // t = 1..T-1: recursion
  for (let t = 1; t < T; t++) {
    const prev = logAlpha[t - 1];
    const curr: number[] = new Array(N);
    for (let j = 0; j < N; j++) {
      // log-sum-exp over previous states
      let maxVal = -Infinity;
      for (let i = 0; i < N; i++) {
        const v = prev[i] + logA[i][j];
        if (v > maxVal) maxVal = v;
      }
      let sumExp = 0;
      for (let i = 0; i < N; i++) {
        sumExp += Math.exp(prev[i] + logA[i][j] - maxVal);
      }
      const logSumAlpha = maxVal + Math.log(sumExp);

      const logEmission = computeGaussianLogPdf(
        observations[t],
        params.emission_means[j],
        params.emission_covariances[j],
      );
      curr[j] = logSumAlpha + logEmission;
    }
    logAlpha.push(curr);
  }

  // Convert log-alpha to normalized probabilities at each time step
  const result: number[][] = [];
  for (let t = 0; t < T; t++) {
    const row = logAlpha[t];
    const maxVal = Math.max(...row);
    const exps = row.map(v => Math.exp(v - maxVal));
    const sum = exps.reduce((a, b) => a + b, 0);
    result.push(exps.map(e => (sum > 0 ? e / sum : 1 / N)));
  }

  return result;
}

// ─── Viterbi Decoding ────────────────────────────────────────────────────────

/**
 * Find the most-likely hidden state sequence for the given observations
 * using the Viterbi algorithm.
 *
 * Returns an array of length T with state indices (0..N-1).
 */
export function viterbiDecode(
  observations: number[][],
  params: HMMModelParams,
): number[] {
  const T = observations.length;
  const N = params.n_states;
  if (T === 0) return [];

  const logPi = Math.log(1 / N);

  const logA: number[][] = params.transition_matrix.map(row =>
    row.map(p => (p > 0 ? Math.log(p) : -1e10)),
  );

  // delta[t][i] = max log-prob of any path ending in state i at time t
  const delta: number[][] = [];
  // psi[t][i] = argmax predecessor state for backtracking
  const psi: number[][] = [];

  // t = 0
  const d0: number[] = new Array(N);
  const p0: number[] = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    d0[i] =
      logPi +
      computeGaussianLogPdf(
        observations[0],
        params.emission_means[i],
        params.emission_covariances[i],
      );
  }
  delta.push(d0);
  psi.push(p0);

  // t = 1..T-1
  for (let t = 1; t < T; t++) {
    const dt: number[] = new Array(N);
    const pt: number[] = new Array(N);
    for (let j = 0; j < N; j++) {
      let bestVal = -Infinity;
      let bestIdx = 0;
      for (let i = 0; i < N; i++) {
        const v = delta[t - 1][i] + logA[i][j];
        if (v > bestVal) {
          bestVal = v;
          bestIdx = i;
        }
      }
      const logEmission = computeGaussianLogPdf(
        observations[t],
        params.emission_means[j],
        params.emission_covariances[j],
      );
      dt[j] = bestVal + logEmission;
      pt[j] = bestIdx;
    }
    delta.push(dt);
    psi.push(pt);
  }

  // Backtrack
  const path: number[] = new Array(T);
  let bestFinal = -Infinity;
  let bestFinalIdx = 0;
  for (let i = 0; i < N; i++) {
    if (delta[T - 1][i] > bestFinal) {
      bestFinal = delta[T - 1][i];
      bestFinalIdx = i;
    }
  }
  path[T - 1] = bestFinalIdx;
  for (let t = T - 2; t >= 0; t--) {
    path[t] = psi[t + 1][path[t + 1]];
  }

  return path;
}
