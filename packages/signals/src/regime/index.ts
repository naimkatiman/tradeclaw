/**
 * HMM Regime Classifier — Public API
 */

// Types
export type {
  MarketRegime,
  RegimeClassification,
  HMMModelParams,
} from './types.js';

// Classifier
export {
  classifyRegime,
  loadModel,
  getDefaultModel,
  setModel,
} from './classifier.js';

// Hysteresis / min-dwell
export { applyHysteresis } from './hysteresis.js';
export type { HysteresisState, HysteresisOptions } from './hysteresis.js';

// Viterbi (exposed for advanced usage / testing)
export {
  computeGaussianLogPdf,
  forwardAlgorithm,
  viterbiDecode,
} from './viterbi.js';
