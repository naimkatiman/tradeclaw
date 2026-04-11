/**
 * HMM Regime Classifier — Main Entry Point
 *
 * Loads a pre-trained HMM model (or falls back to hardcoded defaults),
 * computes features from raw price/volume history, and classifies the
 * current market regime.
 */

import { getSymbolCategory } from '../symbols';
import { forwardAlgorithm, viterbiDecode } from './viterbi';
import type {
  HMMModelParams,
  MarketRegime,
  RegimeClassification,
  RegimeFeatures,
} from './types';

// ─── Constants ──────────────────────────────────────────────────────────────

const VALID_REGIMES = new Set<string>(['crash', 'bear', 'neutral', 'bull', 'euphoria']);

// ─── Model Loading ───────────────────────────────────────────────────────────

// Model cache to avoid re-parsing
const modelCache = new Map<string, HMMModelParams>();

/**
 * Load a trained HMM model.
 *
 * In server-side (Node.js) contexts, attempts to read from disk via dynamic
 * require('fs'). In browser bundles (Next.js client), falls back to default
 * model params. Pre-loaded models can be injected via `setModel()`.
 */
export function loadModel(assetClass: 'crypto' | 'forex' | 'metals'): HMMModelParams {
  const cached = modelCache.get(assetClass);
  if (cached) return cached;

  // Try loading from disk in Node.js environments only.
  // Use indirect require via globalThis to hide from Turbopack/webpack static analysis.
  if (typeof globalThis.process !== 'undefined' && globalThis.process.versions?.node) {
    try {
      const _require = typeof globalThis.require === 'function'
        ? globalThis.require
        : module?.require?.bind(module);
      if (_require) {
        const fs = _require('f' + 's') as typeof import('fs');
        const path = _require('pat' + 'h') as typeof import('path');

        const modelDir = process.env.HMM_MODEL_DIR
          || findModelDir(path, fs);
        const modelPath = path.resolve(modelDir, `${assetClass}_hmm.json`);

        if (fs.existsSync(modelPath)) {
          const model = JSON.parse(fs.readFileSync(modelPath, 'utf-8')) as HMMModelParams;
          validateModel(model);
          modelCache.set(assetClass, model);
          return model;
        }
      }
    } catch {
      // fs not available (browser bundle) — fall through to defaults
    }
  }

  const model = getDefaultModel(assetClass);
  modelCache.set(assetClass, model);
  return model;
}

/**
 * Inject a pre-loaded model (e.g., from an API response or server-side prop).
 */
export function setModel(assetClass: string, model: HMMModelParams): void {
  modelCache.set(assetClass, model);
}

function findModelDir(path: typeof import('path'), fs: typeof import('fs')): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, 'scripts', 'hmm-regime', 'models');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(process.cwd(), 'scripts', 'hmm-regime', 'models');
}

/**
 * Validate model dimensions and state labels.
 * Throws if any constraint is violated.
 */
function validateModel(model: HMMModelParams): void {
  const n = model.n_states;
  const nFeatures = model.emission_means[0]?.length ?? 0;

  // state_labels must have exactly n_states entries
  const labelKeys = Object.keys(model.state_labels);
  if (labelKeys.length !== n) {
    throw new Error(`state_labels has ${labelKeys.length} entries, expected ${n}`);
  }

  // All state_labels must be valid and unique
  const seenLabels = new Set<string>();
  for (const key of labelKeys) {
    const label = model.state_labels[key];
    if (!VALID_REGIMES.has(label)) {
      throw new Error(`Invalid state label "${label}" for state ${key}. Valid: ${[...VALID_REGIMES].join(', ')}`);
    }
    if (seenLabels.has(label)) {
      throw new Error(`Duplicate state label "${label}" — each state must map to a unique regime`);
    }
    seenLabels.add(label);
  }

  // transition_matrix must be n_states x n_states
  if (model.transition_matrix.length !== n) {
    throw new Error(`transition_matrix has ${model.transition_matrix.length} rows, expected ${n}`);
  }
  for (let i = 0; i < n; i++) {
    if (model.transition_matrix[i].length !== n) {
      throw new Error(`transition_matrix row ${i} has ${model.transition_matrix[i].length} cols, expected ${n}`);
    }
  }

  // emission_means must be n_states x n_features
  if (model.emission_means.length !== n) {
    throw new Error(`emission_means has ${model.emission_means.length} rows, expected ${n}`);
  }
  for (let i = 0; i < n; i++) {
    if (model.emission_means[i].length !== nFeatures) {
      throw new Error(`emission_means row ${i} has ${model.emission_means[i].length} cols, expected ${nFeatures}`);
    }
  }

  // emission_covariances must be n_states x n_features x n_features
  if (model.emission_covariances.length !== n) {
    throw new Error(`emission_covariances has ${model.emission_covariances.length} entries, expected ${n}`);
  }
  for (let i = 0; i < n; i++) {
    if (model.emission_covariances[i].length !== nFeatures) {
      throw new Error(`emission_covariances[${i}] has ${model.emission_covariances[i].length} rows, expected ${nFeatures}`);
    }
    for (let j = 0; j < nFeatures; j++) {
      if (model.emission_covariances[i][j].length !== nFeatures) {
        throw new Error(`emission_covariances[${i}][${j}] has ${model.emission_covariances[i][j].length} cols, expected ${nFeatures}`);
      }
    }
  }
}

/**
 * Return a reasonable default model when no trained JSON is available.
 *
 * The parameters are hand-tuned heuristics, NOT trained on data, but they
 * produce plausible regime labels so the system can run in dev/test without
 * the Python training pipeline.
 *
 * Feature order: [rollingVol20d, returns5d, returns20d, volumeZScore]
 */
export function getDefaultModel(assetClass: string): HMMModelParams {
  const stateLabels: Record<string, MarketRegime> = {
    '0': 'crash',
    '1': 'bear',
    '2': 'neutral',
    '3': 'bull',
    '4': 'euphoria',
  };

  // Volatility scale varies by asset class
  const volScale = assetClass === 'crypto' ? 1.5 : assetClass === 'metals' ? 0.8 : 1.0;

  // Emission means: [vol, ret5d, ret20d, volZScore]
  const emissionMeans: number[][] = [
    [0.06 * volScale, -0.08, -0.15, 2.0],   // crash: high vol, deep negative returns, high volume
    [0.03 * volScale, -0.03, -0.06, 0.5],   // bear: moderate vol, mild negative returns
    [0.015 * volScale, 0.00, 0.00, 0.0],    // neutral: low vol, flat returns
    [0.025 * volScale, 0.03, 0.06, 0.3],    // bull: moderate vol, positive returns
    [0.05 * volScale, 0.07, 0.12, 1.5],     // euphoria: high vol, strong positive returns, high volume
  ];

  // Diagonal covariance matrices (simplified — features assumed independent)
  const baseCovDiag = [
    [0.0004, 0.001, 0.002, 0.5],   // crash
    [0.0002, 0.0005, 0.001, 0.3],  // bear
    [0.0001, 0.0003, 0.0005, 0.2], // neutral
    [0.0002, 0.0005, 0.001, 0.3],  // bull
    [0.0004, 0.001, 0.002, 0.5],   // euphoria
  ];

  const emissionCovariances: number[][][] = baseCovDiag.map(diag => {
    const cov: number[][] = Array.from({ length: 4 }, (_, i) =>
      Array.from({ length: 4 }, (__, j) => (i === j ? diag[i] * volScale * volScale : 0)),
    );
    return cov;
  });

  // Transition matrix: regime persistence on diagonal, gradual transitions off-diagonal
  const transitionMatrix: number[][] = [
    [0.70, 0.20, 0.05, 0.03, 0.02], // crash tends to stay or move to bear
    [0.10, 0.60, 0.20, 0.08, 0.02], // bear
    [0.02, 0.10, 0.70, 0.15, 0.03], // neutral
    [0.02, 0.05, 0.15, 0.65, 0.13], // bull
    [0.03, 0.05, 0.07, 0.20, 0.65], // euphoria
  ];

  return {
    n_states: 5,
    state_labels: stateLabels,
    transition_matrix: transitionMatrix,
    emission_means: emissionMeans,
    emission_covariances: emissionCovariances,
    feature_names: ['rollingVol20d', 'returns5d', 'returns20d', 'volumeZScore'],
    asset_class: assetClass,
    trained_at: new Date().toISOString(),
  };
}

// ─── Feature Computation ─────────────────────────────────────────────────────

export interface PriceBar {
  close: number;
  volume: number;
  timestamp: number;
}

/**
 * Compute the 4 regime features from a price history array.
 * Requires at least 21 bars (20-day rolling window + 1 for returns).
 * The array should be sorted oldest-first.
 */
export function computeFeatures(priceHistory: PriceBar[]): RegimeFeatures {
  const n = priceHistory.length;
  if (n < 21) {
    throw new Error(`Need at least 21 price bars, got ${n}`);
  }

  const closes = priceHistory.map(b => b.close);

  if (closes.some(c => c <= 0 || !isFinite(c))) {
    throw new Error('Price history contains non-positive or non-finite close prices');
  }
  const volumes = priceHistory.map(b => b.volume);

  // Log returns
  const logReturns: number[] = [];
  for (let i = 1; i < n; i++) {
    logReturns.push(Math.log(closes[i] / closes[i - 1]));
  }

  // 20-day rolling volatility (std of log returns over last 20 periods)
  const last20Returns = logReturns.slice(-20);
  const meanRet = last20Returns.reduce((a, b) => a + b, 0) / 20;
  let variance = 0;
  for (const r of last20Returns) {
    variance += (r - meanRet) ** 2;
  }
  variance /= 19; // sample variance
  const rollingVol20d = Math.sqrt(variance);

  // 5-day cumulative return
  const returns5d = closes[n - 1] / closes[n - 6] - 1;

  // 20-day cumulative return
  const returns20d = closes[n - 1] / closes[n - 21] - 1;

  // Volume z-score: (current volume - mean) / std over last 20 bars
  const last20Vol = volumes.slice(-20);
  const meanVol = last20Vol.reduce((a, b) => a + b, 0) / 20;
  let volVar = 0;
  for (const v of last20Vol) {
    volVar += (v - meanVol) ** 2;
  }
  volVar /= 19;
  const stdVol = Math.sqrt(volVar);
  const volumeZScore = stdVol > 0 ? (volumes[n - 1] - meanVol) / stdVol : 0;

  return { rollingVol20d, returns5d, returns20d, volumeZScore };
}

// ─── Classifier ──────────────────────────────────────────────────────────────

/**
 * Classify the current market regime for a given symbol.
 *
 * Accepts at least 21 bars of price history (oldest first).
 * Returns the most probable regime, confidence, full probability
 * distribution, and one-step transition probabilities.
 */
export function classifyRegime(
  symbol: string,
  priceHistory: PriceBar[],
): RegimeClassification {
  const assetClass = getSymbolCategory(symbol);
  const model = loadModel(assetClass);
  const features = computeFeatures(priceHistory);

  // Build observation vector in feature order
  const obs: number[][] = [
    [features.rollingVol20d, features.returns5d, features.returns20d, features.volumeZScore],
  ];

  // Run forward algorithm to get posterior probabilities
  const posteriors = forwardAlgorithm(obs, model);
  const probs = posteriors[posteriors.length - 1];

  // Also run Viterbi for the MAP state (consistent with forward for T=1)
  const viterbiPath = viterbiDecode(obs, model);
  const bestState = viterbiPath[viterbiPath.length - 1];

  const regime = model.state_labels[String(bestState)];
  if (!regime || !VALID_REGIMES.has(regime)) {
    throw new Error(`No valid regime label for state index ${bestState}`);
  }
  const confidence = probs[bestState];

  // Build probability record
  const allProbabilities: Record<MarketRegime, number> = {
    crash: 0,
    bear: 0,
    neutral: 0,
    bull: 0,
    euphoria: 0,
  };
  const seenProbLabels = new Set<string>();
  for (let i = 0; i < model.n_states; i++) {
    const label = model.state_labels[String(i)];
    if (!label) {
      throw new Error(`Missing state label for index ${i}`);
    }
    if (seenProbLabels.has(label)) {
      throw new Error(`Duplicate state label "${label}" at index ${i} — model has conflicting state mappings`);
    }
    seenProbLabels.add(label);
    allProbabilities[label] = probs[i];
  }

  // One-step transition probabilities from current regime
  const transitionProbs: Record<MarketRegime, number> = {
    crash: 0,
    bear: 0,
    neutral: 0,
    bull: 0,
    euphoria: 0,
  };
  const transRow = model.transition_matrix[bestState];
  for (let j = 0; j < model.n_states; j++) {
    const label = model.state_labels[String(j)];
    transitionProbs[label] = transRow[j];
  }

  return {
    regime,
    confidence,
    allProbabilities,
    transitionProbs,
    features,
    timestamp: new Date().toISOString(),
  };
}
