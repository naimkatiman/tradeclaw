/**
 * HMM Regime Classifier — Type Definitions
 *
 * Canonical structural regime vocabulary (Phase 3, plan D1):
 * trend / volatile / range. Structural, not drift-directional — the
 * classifier reads market SHAPE (ADX, BB bandwidth, ATR percentile,
 * return autocorrelation), never drift direction.
 */

import type { RegimeFeatureVector } from './features.js';

export type MarketRegime = 'trend' | 'volatile' | 'range';

export interface RegimeClassification {
  regime: MarketRegime;
  /** Forward-algorithm posterior probability of the chosen state (0-1). */
  confidence: number;
  /** Posterior probability of each regime at the final time step. */
  allProbabilities: Record<MarketRegime, number>;
  /** One-step-ahead transition probabilities from the current regime. */
  transitionProbs: Record<MarketRegime, number>;
  /** Most recent (raw, unstandardized) feature vector used for classification. */
  features: RegimeFeatureVector;
  timestamp: string;
}

export interface HMMModelParams {
  /** Number of hidden states (always 3). */
  n_states: number;
  /** Map from state index (as string) to regime label. */
  state_labels: Record<string, MarketRegime>;
  /** n_states x n_states row-stochastic transition matrix. */
  transition_matrix: number[][];
  /** n_states x n_features matrix of emission means (standardized feature space). */
  emission_means: number[][];
  /** n_states x n_features x n_features array of emission covariance matrices. */
  emission_covariances: number[][][];
  /** Names of the features in order (must match REGIME_FEATURE_NAMES). */
  feature_names: string[];
  /**
   * Standardization parameters, fitted on the TRAINING window only.
   * Inference standardizes each observation as (x - mean) / std — the
   * standardization is part of the model, so there is no lookahead.
   */
  feature_means: number[];
  feature_stds: number[];
  /** Asset class this model was trained on. */
  asset_class: string;
  /** ISO timestamp of training time. */
  trained_at: string;
  /** Optional initial state probabilities (length n_states). */
  initial_probs?: number[];
}
