export const PUBLISHED_SIGNAL_MIN_CONFIDENCE = 70;
export const WATCHLIST_MIN_CONFIDENCE = 60;

export const STRATEGY_MIN_CONFIDENCE: Record<string, number> = {
  classic: 70,
  'regime-aware': 60,
  'hmm-top3': 55,
  'vwap-ema-bb': 60,
  'full-risk': 50,
};

export function minConfidenceFor(strategyId: string): number {
  return STRATEGY_MIN_CONFIDENCE[strategyId] ?? PUBLISHED_SIGNAL_MIN_CONFIDENCE;
}
