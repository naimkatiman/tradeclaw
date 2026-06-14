/**
 * Phase 4 D8 — Shadow recorder for the regime→strategy router + calibrated
 * confidence. Mode resolver + the PURE record builder (no I/O — fs append lives
 * in router-decisions-log.ts, mirroring the buildGateLogEntry/logGateDecision
 * split in gate-log.ts).
 *
 * The whole point of this module is to accrue FORWARD evidence WITHOUT changing
 * any live behavior. In shadow mode the cron records, per broadcast candidate,
 * what the C2 router WOULD select (`selectStrategyForRegime`) and what
 * confidence the C7 calibrator WOULD publish (isotonic map applied to raw
 * confidence) — but the live broadcast set, the recorded signal_history rows,
 * and the published confidence are all UNCHANGED. The calibrated value exists
 * only in the NDJSON shadow log; it is never fed back.
 *
 * `active` is forward-compat only. The walk-forward gate FAILED on paper (D6),
 * so live activation is an OPERATOR decision after ≥4wk of shadow evidence
 * clears the pre-registered per-regime cost-adjusted expectancy gate. In THIS
 * branch `active` records exactly like `shadow` and enforces NOTHING — the enum
 * value only stabilizes the env contract. See plan D8 / the C9 operator runbook.
 */

import { selectStrategyForRegime } from '@tradeclaw/strategies';
import type { StrategyId } from '@tradeclaw/strategies';
import type { MarketRegime } from '@tradeclaw/signals';
import { applyIsotonic, normalizeConfidence, type IsotonicMap } from './confidence-calibration';

export type StrategyRouterMode = 'off' | 'shadow' | 'active';

/**
 * Resolve the configured router-shadow mode. Defaults to 'shadow' so a fresh
 * deploy accrues router/calibration decisions without altering any live
 * behavior. Set TRADECLAW_STRATEGY_ROUTER_MODE=active to mark the env for the
 * (operator-gated) activation step — but note that `active` does NOT enforce in
 * this branch; it records like shadow. 'off' disables recording entirely.
 *
 * Mirrors getWinningCellsMode / getGateMode exactly (lowercase, enum guard,
 * unknown → shadow).
 */
export function getStrategyRouterMode(): StrategyRouterMode {
  const raw = (process.env.TRADECLAW_STRATEGY_ROUTER_MODE ?? 'shadow').toLowerCase();
  if (raw === 'off' || raw === 'active' || raw === 'shadow') return raw;
  return 'shadow';
}

/** One candidate the recorder needs: identity + the raw signal fields. */
export interface RouterShadowCandidate {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  /** Raw published confidence as recorded on the row (0-100 scale). */
  confidence: number;
}

/** Per-candidate shadow decision — what the router/calibrator WOULD produce. */
export interface RouterDecisionRecord {
  id: string;
  symbol: string;
  /** Regime the existing decision pipeline resolved for this symbol. */
  regime: string;
  direction: 'BUY' | 'SELL';
  /** Raw published confidence, normalized to [0,1] (same as /api/calibration). */
  rawConfidence: number;
  /** Strategy the C2 router WOULD select for (regime, direction). */
  routedStrategy: StrategyId;
  /**
   * Calibrated probability the C7 isotonic map WOULD publish for rawConfidence.
   * NULL when no map is fitted (population below MIN_CALIBRATION_SAMPLES) —
   * honest "no map yet", never a fabricated number.
   */
  calibratedConfidence: number | null;
}

/** One NDJSON line per tick-batch (mirrors GateBatchLog's batch shape). */
export interface RouterShadowBatch {
  ts: string;
  mode: StrategyRouterMode;
  /** Whether an isotonic calibration map was fitted this tick. */
  calibrated: boolean;
  candidateCount: number;
  candidates: RouterDecisionRecord[];
}

/**
 * Coerce a free-form regime string (the decision pipeline types it as `string`)
 * into the canonical MarketRegime union for the router. Unknown/missing values
 * fall through the router's own runtime fallback to the range route, matching
 * the Phase 3 unknown-label policy.
 */
function asMarketRegime(regime: string): MarketRegime {
  return regime as MarketRegime;
}

/**
 * Build the shadow batch record (PURE — no fs I/O). Given the candidates, a
 * regime lookup, and an optional fitted calibration map, produce the
 * per-candidate would-be decisions:
 *
 * - routedStrategy = selectStrategyForRegime(regime, direction) per candidate.
 * - calibratedConfidence = applyIsotonic(map, normalizedConf) when a map exists,
 *   else null (no map fitted → honest null, never fabricated).
 *
 * Kept separate from the fs append (router-decisions-log.ts) so it is trivially
 * unit-testable, exactly like buildGateLogEntry vs logGateDecision.
 */
export function buildRouterShadowBatch(
  mode: StrategyRouterMode,
  candidates: RouterShadowCandidate[],
  regimeOf: (symbol: string) => string,
  calibrationMap: IsotonicMap | null,
): RouterShadowBatch {
  const records: RouterDecisionRecord[] = candidates.map((c) => {
    const regime = regimeOf(c.symbol);
    const rawConfidence = normalizeConfidence(c.confidence);
    return {
      id: c.id,
      symbol: c.symbol,
      regime,
      direction: c.direction,
      rawConfidence,
      routedStrategy: selectStrategyForRegime(asMarketRegime(regime), c.direction),
      calibratedConfidence: calibrationMap
        ? applyIsotonic(calibrationMap, rawConfidence)
        : null,
    };
  });

  return {
    ts: new Date().toISOString(),
    mode,
    calibrated: calibrationMap !== null,
    candidateCount: records.length,
    candidates: records,
  };
}
