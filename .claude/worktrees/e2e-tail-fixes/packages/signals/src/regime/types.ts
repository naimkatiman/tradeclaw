/**
 * HMM Regime Classifier — Type Definitions
 *
 * Defines the data structures for a 5-state Hidden Markov Model that
 * classifies market conditions from price/volume features.
 */

export type MarketRegime = 'crash' | 'bear' | 'neutral' | 'bull' | 'euphoria';

export interface RegimeClassification {
  regime: MarketRegime;
  /** Probability of the most-likely state (0-1). */
  confidence: number;
  /** Posterior probability of each regime. */
  allProbabilities: Record<MarketRegime, number>;
  /** One-step-ahead transition probabilities from the current regime. */
  transitionProbs: Record<MarketRegime, number>;
  /** Feature values used for classification. */
  features: RegimeFeatures;
  timestamp: string;
}

export interface RegimeFeatures {
  rollingVol20d: number;
  returns5d: number;
  returns20d: number;
  volumeZScore: number;
}

export interface HMMModelParams {
  /** Number of hidden states (always 5). */
  n_states: number;
  /** Map from state index (as string) to regime label. */
  state_labels: Record<string, MarketRegime>;
  /** 5x5 row-stochastic transition matrix. */
  transition_matrix: number[][];
  /** 5x4 matrix of emission means (one row per state). */
  emission_means: number[][];
  /** 5x4x4 array of emission covariance matrices. */
  emission_covariances: number[][][];
  /** Names of the 4 features in order. */
  feature_names: string[];
  /** Asset class this model was trained on. */
  asset_class: string;
  /** ISO timestamp of training time. */
  trained_at: string;
  /** Optional initial state probabilities (length n_states). */
  initial_probs?: number[];
}
