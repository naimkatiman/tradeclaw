import type { EntryModule, EntrySignal, EntryContext } from '../types';
import type { OHLCV } from '@tradeclaw/core';
import { classifyRegime, REGIME_ALLOCATION_RULES } from '@tradeclaw/signals';
import { classicEntry } from './classic';

/**
 * Regime-aware entry: classic signals filtered by HMM regime classifier.
 *
 * Uses the 5-state HMM (crash | bear | neutral | bull | euphoria) to classify
 * the current market regime at each signal bar, then applies REGIME_ALLOCATION_RULES
 * to filter out directions not permitted in that regime.
 *
 * Reproduces the regime-filter logic from commit 95ff3fc4:
 *   - BEAR  → SELL only  (BUY signals suppressed)
 *   - CRASH → SELL only  (BUY signals suppressed)
 *   - NEUTRAL / BULL / EUPHORIA → both BUY and SELL allowed
 *
 * classifyRegime requires at least 21 bars; signal bars with fewer than 21
 * preceding candles are passed through unfiltered (pre-regime fall-through).
 *
 * generateSignals is synchronous: model loading is handled inside classifyRegime
 * via loadModel(), which caches the model after the first call per asset class.
 */
export const regimeAwareEntry: EntryModule = {
  id: 'regime-aware',

  generateSignals(candles: OHLCV[], ctx: EntryContext): EntrySignal[] {
    const raw = classicEntry.generateSignals(candles, ctx);
    if (raw.length === 0) return [];

    return raw.filter((sig) => {
      // Need at least 21 bars to classify; if the window is too short, allow through.
      const windowSize = sig.barIndex + 1;
      if (windowSize < 21) return true;

      const window = candles.slice(0, windowSize);

      try {
        const result = classifyRegime(ctx.symbol, window);
        const rules = REGIME_ALLOCATION_RULES[result.regime];
        const allowedDirections = rules?.allowedDirections ?? ['BUY', 'SELL'];
        return allowedDirections.includes(sig.direction);
      } catch {
        // If classification fails (e.g. invalid data), allow signal through.
        return true;
      }
    });
  },
};
