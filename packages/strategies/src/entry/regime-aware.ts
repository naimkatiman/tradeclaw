import type { EntryModule, EntrySignal, EntryContext } from '../types';
import type { OHLCV } from '@tradeclaw/core';
import { classifyRegime, REGIME_ALLOCATION_RULES } from '@tradeclaw/signals';
import { classicEntry } from './classic';

/**
 * Regime-aware entry: classic signals gated by the structural HMM regime
 * classifier (trend | volatile | range — Phase 3, plan D1).
 *
 * At each signal bar the trailing window is classified via classifyRegime,
 * then REGIME_ALLOCATION_RULES[regime].allowedDirections decides whether the
 * signal's direction may trade.
 *
 * HONEST CONTRACT (Phase 3): with the structural vocabulary ALL regimes allow
 * both BUY and SELL, so this entry filter is currently a pass-through — it
 * exercises and depends on regime classification but suppresses nothing.
 * Direction-conditional dispatch (trend → momentum, volatile → mean-revert,
 * range → fade) arrives with the Phase 4 router; see
 * docs/plans/2026-06-11-phase3-regime-engine.md, decision D2. Do not add
 * filtering behavior here ahead of that plan.
 *
 * Fail-open contract (unchanged): windows too short to classify, and any
 * classifyRegime throw, allow the signal through.
 *
 * generateSignals is synchronous: model loading is handled inside classifyRegime
 * via loadModel(), which caches the model after the first call per asset class.
 */

/**
 * Minimum bars before attempting classification. The structural feature
 * pipeline warms up over the first 43 bars (ATR period 14 +
 * MIN_ATR_PERCENTILE_SAMPLES 30 − 1) and classifyRegime requires ≥ 8 feature
 * vectors, so 51 bars is the hard floor; 60 adds margin so marginal windows
 * never round-trip through the insufficient-data throw.
 */
export const MIN_REGIME_CLASSIFICATION_BARS = 60;

export const regimeAwareEntry: EntryModule = {
  id: 'regime-aware',

  generateSignals(candles: OHLCV[], ctx: EntryContext): EntrySignal[] {
    const raw = classicEntry.generateSignals(candles, ctx);
    if (raw.length === 0) return [];

    return raw.filter((sig) => {
      // Too few bars to classify → fail open (entry allowed).
      const windowSize = sig.barIndex + 1;
      if (windowSize < MIN_REGIME_CLASSIFICATION_BARS) return true;

      // Candles are full OHLCV bars — structurally a RegimeBar[].
      const window = candles.slice(0, windowSize);

      try {
        const result = classifyRegime(ctx.symbol, window);
        const rules = REGIME_ALLOCATION_RULES[result.regime];
        const allowedDirections = rules?.allowedDirections ?? ['BUY', 'SELL'];
        return allowedDirections.includes(sig.direction);
      } catch {
        // Classification failure → fail open (entry allowed).
        // LIVE-PATH WARNING: this same catch fires on live data. If this
        // module is ever reused outside backtests, replace fail-open with a
        // hard reject or surface the error to the caller.
        return true;
      }
    });
  },
};
