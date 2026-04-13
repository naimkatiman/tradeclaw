import { getPreset, type StrategyId } from '@tradeclaw/strategies';

const VALID_STRATEGY_IDS: StrategyId[] = [
  'classic',
  'regime-aware',
  'hmm-top3',
  'vwap-ema-bb',
  'full-risk',
];

/**
 * Returns the active strategy preset from SIGNAL_ENGINE_PRESET env var.
 * Defaults to 'hmm-top3' (current production) when unset or invalid.
 */
export function getActivePreset() {
  const raw = process.env.SIGNAL_ENGINE_PRESET;
  if (raw && (VALID_STRATEGY_IDS as string[]).includes(raw)) {
    return getPreset(raw as StrategyId);
  }
  return getPreset('hmm-top3');
}
