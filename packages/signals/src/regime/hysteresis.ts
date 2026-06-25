/**
 * Regime hysteresis / min-dwell — Phase 3, plan D6.
 *
 * Pure flap-suppression layer between the raw classifier output and any
 * persisted regime state. A label switch requires the previous label to
 * have been held for at least `minDwellBars` bars, UNLESS the candidate's
 * posterior confidence clears `overrideConfidence` (a decisive read may
 * switch immediately).
 *
 * Callers own the state: they track `barsHeld` (bars the current regime has
 * been held) and feed it back on the next bar.
 */

import type { MarketRegime } from './types.js';

export interface HysteresisState {
  regime: MarketRegime;
  /**
   * Number of bars the current regime label has been held. Caller contract:
   * reset after every accepted switch (the new label starts counting from
   * its first bar); incremented only while the label is unchanged.
   */
  barsHeld: number;
}

export interface HysteresisOptions {
  /** Minimum bars a regime must be held before a low-confidence switch. Default 6. */
  minDwellBars?: number;
  /** Candidate confidence at or above this switches immediately. Default 0.80. */
  overrideConfidence?: number;
}

/**
 * Resolve the regime to hold for the current bar.
 *
 * - `prev === null` → adopt the candidate (no history to defend).
 * - Candidate equals the held regime → hold.
 * - Otherwise switch ONLY if `prev.barsHeld >= minDwellBars` or
 *   `candidateConfidence >= overrideConfidence`; else hold the previous regime.
 */
export function applyHysteresis(
  prev: HysteresisState | null,
  candidate: MarketRegime,
  candidateConfidence: number,
  opts: HysteresisOptions = {},
): MarketRegime {
  if (prev === null) return candidate;
  if (candidate === prev.regime) return prev.regime;

  // Defaults are mirrored in scripts/hmm-regime/train_hmm.py
  // (MIN_DWELL_BARS / OVERRIDE_CONFIDENCE) — keep both sides in sync.
  const minDwellBars = opts.minDwellBars ?? 6;
  const overrideConfidence = opts.overrideConfidence ?? 0.8;

  if (prev.barsHeld >= minDwellBars || candidateConfidence >= overrideConfidence) {
    return candidate;
  }
  return prev.regime;
}
