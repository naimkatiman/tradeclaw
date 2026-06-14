/**
 * Structural HMM Regime Classifier — Main Entry Point (Phase 3, plan D6)
 *
 * Classifies the current market regime (trend / volatile / range) from full
 * OHLCV history: structural feature extraction (features.ts) → per-model
 * standardization → Viterbi decoding over the trailing T-observation window
 * (T>1 smoothing) → forward-algorithm posterior as confidence.
 *
 * Loads a pre-trained HMM model from disk when available, otherwise falls
 * back to a documented heuristic default.
 */

import { getSymbolCategory } from '../symbols.js';
import { forwardAlgorithm, viterbiDecode } from './viterbi.js';
import {
  computeRegimeFeatureSeries,
  featureVectorToArray,
  REGIME_FEATURE_NAMES,
} from './features.js';
import type { RegimeBar, RegimeFeatureVector } from './features.js';
import type {
  HMMModelParams,
  MarketRegime,
  RegimeClassification,
} from './types.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const VALID_REGIMES = new Set<MarketRegime>(['trend', 'volatile', 'range']);

/**
 * Default trailing observation window for Viterbi smoothing (plan D6).
 * Mirrored in scripts/hmm-regime/train_hmm.py (SEQUENCE_LENGTH) — keep in sync.
 */
const DEFAULT_SEQUENCE_LENGTH = 64;

/** Minimum feature vectors required to classify at all. */
const MIN_SEQUENCE_VECTORS = 8;

// ─── Model Loading ───────────────────────────────────────────────────────────

// Model cache to avoid re-parsing
const modelCache = new Map<string, HMMModelParams>();

/**
 * Load a trained HMM model.
 *
 * In server-side (Node.js) contexts, attempts to read from disk via dynamic
 * require('fs'). In browser bundles (Next.js client), falls back to default
 * model params. Pre-loaded models can be injected via `setModel()`.
 *
 * Fallback policy (plan D6): a model file that exists but fails parsing or
 * validation must NEVER break inference, and must NEVER fail silently either
 * — a silent fallback is exactly how the dead regime layer stayed invisible
 * for months. One deliberate console.warn fires per asset class (the default
 * model is cached, so it cannot repeat per call).
 */
export function loadModel(assetClass: 'crypto' | 'forex' | 'metals'): HMMModelParams {
  const cached = modelCache.get(assetClass);
  if (cached) return cached;

  // Try loading from disk in Node.js environments only.
  // Use indirect require via globalThis to hide from Turbopack/webpack static analysis.
  if (typeof globalThis.process !== 'undefined' && globalThis.process.versions?.node) {
    let fs: typeof import('fs') | undefined;
    let path: typeof import('path') | undefined;
    try {
      const _require = typeof globalThis.require === 'function'
        ? globalThis.require
        : module?.require?.bind(module);
      if (_require) {
        fs = _require('f' + 's') as typeof import('fs');
        path = _require('pat' + 'h') as typeof import('path');
      }
    } catch {
      // fs not available (browser bundle) — fall through to defaults
    }

    if (fs && path) {
      const modelDir = process.env.HMM_MODEL_DIR
        || findModelDir(path, fs);
      const modelPath = path.resolve(modelDir, `${assetClass}_hmm.json`);

      if (fs.existsSync(modelPath)) {
        try {
          const model = JSON.parse(fs.readFileSync(modelPath, 'utf-8')) as HMMModelParams;
          validateModel(model);
          modelCache.set(assetClass, model);
          return model;
        } catch (err: unknown) {
          const reason = err instanceof Error ? err.message : String(err);
          console.warn(
            `[regime] model file invalid for ${assetClass}, using built-in default: ${reason}`,
          );
        }
      }
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

/**
 * Clear the model cache. Exported for white-box tests only — not part of the
 * package public API (not re-exported from src/index.ts).
 *
 * @internal
 */
export function clearModelCache(): void {
  modelCache.clear();
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
 * Validate model dimensions, state labels, and standardization parameters.
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

  // Each canonical regime must appear exactly once (forces n_states === 3)
  for (const regime of VALID_REGIMES) {
    if (!seenLabels.has(regime)) {
      throw new Error(`Missing state label "${regime}" — all of ${[...VALID_REGIMES].join(', ')} must appear exactly once`);
    }
  }

  // transition_matrix must be n_states x n_states and row-stochastic
  if (model.transition_matrix.length !== n) {
    throw new Error(`transition_matrix has ${model.transition_matrix.length} rows, expected ${n}`);
  }
  for (let i = 0; i < n; i++) {
    if (model.transition_matrix[i].length !== n) {
      throw new Error(`transition_matrix row ${i} has ${model.transition_matrix[i].length} cols, expected ${n}`);
    }
    let rowSum = 0;
    for (const p of model.transition_matrix[i]) {
      if (!isFinite(p) || p < 0) {
        throw new Error(`transition_matrix row ${i} has a negative or non-finite entry`);
      }
      rowSum += p;
    }
    if (Math.abs(rowSum - 1) > 1e-4) {
      throw new Error(`transition_matrix row ${i} sums to ${rowSum}, expected 1`);
    }
  }

  // initial_probs, when present, must match n_states and sum to 1 — a bad
  // vector silently corrupts forward-algorithm confidences (NaN log terms)
  if (model.initial_probs !== undefined) {
    if (!Array.isArray(model.initial_probs) || model.initial_probs.length !== n) {
      throw new Error(`initial_probs has ${model.initial_probs?.length ?? 0} entries, expected ${n}`);
    }
    const piSum = model.initial_probs.reduce((a, b) => a + b, 0);
    if (Math.abs(piSum - 1) > 1e-4) {
      throw new Error(`initial_probs sums to ${piSum}, expected 1`);
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

  // Standardization params must cover the feature space (plan D6: the
  // standardization is part of the model — no lookahead at inference)
  if (!Array.isArray(model.feature_names) || model.feature_names.length !== nFeatures) {
    throw new Error(`feature_names must have ${nFeatures} entries`);
  }
  if (!Array.isArray(model.feature_means) || model.feature_means.length !== nFeatures) {
    throw new Error(`feature_means must have ${nFeatures} entries`);
  }
  if (!Array.isArray(model.feature_stds) || model.feature_stds.length !== nFeatures) {
    throw new Error(`feature_stds must have ${nFeatures} entries`);
  }
  for (const s of model.feature_stds) {
    if (!isFinite(s) || s <= 0) {
      throw new Error('feature_stds entries must be positive finite numbers');
    }
  }
}

/**
 * Return a reasonable default model when no trained JSON is available.
 *
 * Hand-tuned heuristic fallback, NOT trained on data. It exists so the
 * system can classify before the trained model JSON ships — commit C9 of
 * the Phase 3 plan lands a crypto model trained on real candles, which
 * supersedes this at runtime via loadModel(). Emission means live in
 * STANDARDIZED feature space; feature order = REGIME_FEATURE_NAMES:
 * [adx14, bbBandwidthPct, atrPercentile, returnAutocorr1].
 */
export function getDefaultModel(assetClass: string): HMMModelParams {
  // Standardization anchors: rough population center/scale of the raw features
  const featureMeans = [22, 4, 0.5, 0];
  const featureStds = [10, 3, 0.28, 0.25];

  // Emission means (standardized)
  const emissionMeans: number[][] = [
    [1.0, 0.2, 0.2, 0.4],    // trend: elevated ADX, persistent returns
    [0.3, 1.2, 1.2, -0.6],   // volatile: wide bands, top ATR rank, mean-flipping
    [-0.8, -0.6, -0.5, 0.0], // range: low ADX, narrow bands, quiet ATR
  ];

  // Diagonal covariances of 0.8 in standardized space, expressed as full
  // matrices (viterbi's Gaussian supports full covariance).
  const emissionCovariances: number[][][] = emissionMeans.map(() =>
    Array.from({ length: 4 }, (_, i) =>
      Array.from({ length: 4 }, (__, j) => (i === j ? 0.8 : 0)),
    ),
  );

  // Sticky regimes: 0.95 self-transition, 0.025 to each other state
  const transitionMatrix: number[][] = [
    [0.95, 0.025, 0.025],
    [0.025, 0.95, 0.025],
    [0.025, 0.025, 0.95],
  ];

  return {
    n_states: 3,
    state_labels: { '0': 'trend', '1': 'volatile', '2': 'range' },
    transition_matrix: transitionMatrix,
    emission_means: emissionMeans,
    emission_covariances: emissionCovariances,
    feature_names: [...REGIME_FEATURE_NAMES],
    feature_means: featureMeans,
    feature_stds: featureStds,
    asset_class: assetClass,
    // Deterministic marker — this model is code, not a training artifact
    trained_at: 'builtin-fallback',
    initial_probs: [1 / 3, 1 / 3, 1 / 3],
  };
}

// ─── Classifier ──────────────────────────────────────────────────────────────

function emptyRegimeRecord(): Record<MarketRegime, number> {
  return { trend: 0, volatile: 0, range: 0 };
}

/**
 * Classify the current market regime for a given symbol from full OHLCV
 * bars (oldest first).
 *
 * Pipeline: structural feature series → trailing up-to-`sequenceLength`
 * non-null vectors → standardize with the model's train-window params →
 * Viterbi decode for the state path (T>1 smoothing) → label from the final
 * Viterbi state → confidence from the forward-algorithm posterior of that
 * state at the final time step.
 *
 * Throws when fewer than 8 feature vectors are available (warmup with
 * default feature options consumes the first 43 bars).
 */
export function classifyRegime(
  symbol: string,
  bars: RegimeBar[],
  options: { sequenceLength?: number } = {},
): RegimeClassification {
  // Clamp up to the minimum: a small sequenceLength with ample data must
  // shrink the smoothing window, not trigger the insufficient-data throw.
  const sequenceLength = Math.max(
    options.sequenceLength ?? DEFAULT_SEQUENCE_LENGTH,
    MIN_SEQUENCE_VECTORS,
  );
  const assetClass = getSymbolCategory(symbol);
  const model = loadModel(assetClass);

  const series = computeRegimeFeatureSeries(bars);
  const vectors: RegimeFeatureVector[] = [];
  for (const v of series) {
    if (v !== null) vectors.push(v);
  }
  const window = vectors.slice(-sequenceLength);
  if (window.length < MIN_SEQUENCE_VECTORS) {
    throw new Error(
      `insufficient data for regime classification: need >= ${MIN_SEQUENCE_VECTORS} feature vectors`,
    );
  }

  // Standardize each observation with the model's stored parameters
  const observations: number[][] = window.map((v) => {
    const raw = featureVectorToArray(v);
    return raw.map((x, i) => (x - model.feature_means[i]) / model.feature_stds[i]);
  });

  // Most-likely state path over the whole window; the final state is the call
  const statePath = viterbiDecode(observations, model);
  const finalState = statePath[statePath.length - 1];

  const regime = model.state_labels[String(finalState)];
  if (!regime || !VALID_REGIMES.has(regime)) {
    throw new Error(`No valid regime label for state index ${finalState}`);
  }

  // Forward-algorithm posterior at the final time step → confidence
  const posteriors = forwardAlgorithm(observations, model);
  const probs = posteriors[posteriors.length - 1];
  const confidence = probs[finalState];

  // Posterior over labels at the final time step
  const allProbabilities = emptyRegimeRecord();
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

  // One-step transition probabilities from the current regime
  const transitionProbs = emptyRegimeRecord();
  const transRow = model.transition_matrix[finalState];
  for (let j = 0; j < model.n_states; j++) {
    const label = model.state_labels[String(j)];
    transitionProbs[label] = transRow[j];
  }

  return {
    regime,
    confidence,
    allProbabilities,
    transitionProbs,
    features: window[window.length - 1],
    timestamp: new Date().toISOString(),
  };
}
