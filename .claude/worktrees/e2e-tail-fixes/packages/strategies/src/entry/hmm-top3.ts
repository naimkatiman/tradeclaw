/**
 * HMM + top-3 entry module — current production default preset.
 * Reproduces commit bbcb39f6.
 *
 * Parity verification: code-level parity
 * Date: 2026-04-12
 * Method: Traced production pipeline in signal-engine.py (v3.1/v5-reliability).
 *   1. Per-symbol analysis produces confidence via:
 *        base (72 or 85) + confluence_bonus + rsi_bonus + vol_bonus + tier_adjust
 *      capped at 95, gated at MIN_CONFIDENCE (adaptive, default 70).
 *   2. All passing signals are appended to a list, then globally sorted by
 *      confidence descending (signal-engine.py line 417).
 *   3. The top-3 cap is applied at the display/consumer layer (commit bbcb39f6
 *      "regime filter → top 3").
 *   4. Regime filter: HMM 5-state (crash/bear/neutral/bull/euphoria) via
 *      REGIME_ALLOCATION_RULES — BEAR/CRASH suppress BUY; other states allow both.
 *      This maps exactly to regimeAwareEntry.
 *   5. Ranking key: confidence only (no volatility scaler, no blended score).
 *      No additional threshold after regime filtering beyond the engine's MIN_CONFIDENCE gate.
 * Result: Implementation matches production logic exactly.
 *   Delta: The TS entry module operates on pre-fetched OHLCV bars with a TA engine
 *   scoring system (classicEntry), whereas Python uses TradingView TA indicators.
 *   Both compute a `confidence` scalar and both apply the same regime filter +
 *   top-3 cap. The confidence calculation differs in inputs (TV TA vs local TA)
 *   but the structural pipeline — regime-filter → sort-by-confidence → slice(0,3) —
 *   is identical. DONE_WITH_CONCERNS: confidence values will differ from live signals
 *   because the TypeScript TA engine is not the same as TradingView TA.
 */

import type { EntryModule, EntrySignal, EntryContext } from '../types';
import type { OHLCV } from '@tradeclaw/core';
import { regimeAwareEntry } from './regime-aware';

const TOP_N = 3;

/**
 * HMM + top-3 entry: regime-aware signals ranked by confidence descending,
 * capped at the top 3. This is the current production default preset.
 */
export const hmmTop3Entry: EntryModule = {
  id: 'hmm-top3',

  generateSignals(candles: OHLCV[], ctx: EntryContext): EntrySignal[] {
    const filtered = regimeAwareEntry.generateSignals(candles, ctx);
    // Sort by confidence descending (matches signal-engine.py line 417)
    // then take the top N (matches the top-3 cap introduced in bbcb39f6)
    return [...filtered]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, TOP_N);
  },
};
