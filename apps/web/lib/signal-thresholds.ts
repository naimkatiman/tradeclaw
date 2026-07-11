export const PUBLISHED_SIGNAL_MIN_CONFIDENCE = 70;
export const WATCHLIST_MIN_CONFIDENCE = 60;
export const HIGH_CONFIDENCE_THRESHOLD = 80;

/**
 * Lower bound of the high-confidence analytics band (confidence >= 85).
 * Formerly the tier gate PRO_PREMIUM_MIN_CONFIDENCE; the tier system is gone
 * but the band remains an honest segmentation axis in equity/track-record
 * analytics.
 */
export const HIGH_CONFIDENCE_BAND_MIN = 85;

export const STRATEGY_MIN_CONFIDENCE: Record<string, number> = {
  classic: 50,
  'regime-aware': 60,
  'hmm-top3': 55,
  'vwap-ema-bb': 60,
  'full-risk': 50,
};

export function minConfidenceFor(strategyId: string): number {
  return STRATEGY_MIN_CONFIDENCE[strategyId] ?? PUBLISHED_SIGNAL_MIN_CONFIDENCE;
}
