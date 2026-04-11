/**
 * HMM Regime Classifier — Public API
 */

// Types
export type {
  MarketRegime,
  RegimeClassification,
  RegimeFeatures,
  HMMModelParams,
} from './types';

// Classifier
export {
  classifyRegime,
  computeFeatures,
  loadModel,
  getDefaultModel,
  setModel,
} from './classifier';
export type { PriceBar } from './classifier';

// Viterbi (exposed for advanced usage / testing)
export {
  computeGaussianLogPdf,
  forwardAlgorithm,
  viterbiDecode,
} from './viterbi';
