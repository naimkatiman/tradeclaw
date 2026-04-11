/**
 * HMM Regime Classifier — Public API
 */

// Types
export type {
  MarketRegime,
  RegimeClassification,
  RegimeFeatures,
  HMMModelParams,
} from './types.js';

// Classifier
export {
  classifyRegime,
  computeFeatures,
  loadModel,
  getDefaultModel,
} from './classifier.js';
export type { PriceBar } from './classifier.js';

// Viterbi (exposed for advanced usage / testing)
export {
  computeGaussianLogPdf,
  forwardAlgorithm,
  viterbiDecode,
} from './viterbi.js';
