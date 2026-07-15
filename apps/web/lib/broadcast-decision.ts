/**
 * Pro-broadcast gate decision, computed BEFORE persistence (engine-makeover
 * Phase 1). One pipeline run per cron tick decides, per signal: does this row
 * reach the Pro broadcast, and why not if it doesn't. The cron records the
 * decision on the row (migration 048) so the broadcast-filtered subset is
 * measurable — previously the decision was computed after recording and only
 * console-warned.
 *
 * Decision semantics:
 * - risk pipeline (circuit breakers → allocator → veto) blocks with a reason.
 * - pipeline OUTAGE fails closed. Those rows are marked `recordable: false`
 *   because the per-signal gate never actually ran, and they are not eligible
 *   for broadcast or execution.
 */

import { runRiskPipeline } from './risk-pipeline';
import { fetchResolvedRegimeMap } from './regime-resolution';
import { getDominantRegime } from './regime-filter';
import { getStrategyRouterMode } from './strategy-router-shadow';
import { recordRouterShadow } from './router-decisions-log';
import type { BroadcastDecisionFields } from './signal-history';
import type { MarketRegime } from '@tradeclaw/signals';

export interface BroadcastCandidate {
  id: string;
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  takeProfit1: number;
  stopLoss: number;
}

export interface BroadcastDecision extends BroadcastDecisionFields {
  id: string;
  /** True when a real gate decision ran. False means the decision must not be persisted and the candidate remains blocked for this run. */
  recordable: boolean;
}

export async function computeBroadcastDecisions(
  candidates: BroadcastCandidate[],
): Promise<Map<string, BroadcastDecision>> {
  const decisions = new Map<string, BroadcastDecision>();
  if (candidates.length === 0) return decisions;

  let regimeMap = new Map<string, MarketRegime>();
  try {
    const resolved = await fetchResolvedRegimeMap();
    regimeMap = resolved.regimes;
  } catch {
    // Empty map → everything resolves 'range', same as the filter layer.
  }
  const dominant = getDominantRegime(regimeMap);
  const regimeOf = (symbol: string): string =>
    regimeMap.get(symbol.toUpperCase()) ?? dominant;

  try {
    const result = await runRiskPipeline(
      candidates.map((s) => ({
        id: s.id,
        symbol: s.symbol,
        direction: s.direction,
        confidence: s.confidence,
        entry: s.entry,
        stopLoss: s.stopLoss,
        takeProfit1: s.takeProfit1,
        takeProfit2: null,
        takeProfit3: null,
        timeframe: s.timeframe,
      })),
      regimeMap,
    );
    // report.allocations is pushed one entry per input signal IN INPUT ORDER
    // (risk-pipeline.ts signal loop) but keyed only by symbol — a symbol with
    // both BUY and SELL in the same tick would collide in a symbol-keyed map
    // and persist the wrong positionSizePct. Zip by index instead.
    const allocByIndex = result.report.allocations;
    const allocOf = (id: string): number | undefined => {
      const idx = candidates.findIndex((c) => c.id === id);
      return idx >= 0 ? allocByIndex[idx]?.positionSizePct : undefined;
    };
    for (const s of result.approved) {
      decisions.set(s.id, {
        id: s.id,
        regime: regimeOf(s.symbol),
        blocked: false,
        allocationPct: allocOf(s.id),
        recordable: true,
      });
    }
    for (const v of result.vetoed) {
      decisions.set(v.signal.id, {
        id: v.signal.id,
        regime: regimeOf(v.signal.symbol),
        blocked: true,
        blockReason: `${v.vetoedBy}: ${v.reason}`,
        allocationPct: allocOf(v.signal.id),
        recordable: true,
      });
    }
  } catch (err) {
    // A missing risk decision is not an approval. Keep the persisted decision
    // NULL (not recordable) and block the candidate for this run.
    console.warn(
      '[broadcast-decision] Risk pipeline failed; blocking broadcast candidates:',
      err instanceof Error ? err.message : String(err),
    );
    for (const c of candidates) {
      decisions.set(c.id, {
        id: c.id,
        regime: regimeOf(c.symbol),
        blocked: true,
        blockReason: 'risk_pipeline_unavailable',
        recordable: false,
      });
    }
  }

  // Phase 4 D8 — shadow recorder. AFTER the live decision is fully built, record
  // per candidate what the C2 router WOULD select and what confidence the C7
  // calibrator WOULD publish — over the SAME resolved regime map computed above.
  // Side-effect-only and fire-and-forget: it does NOT touch `decisions`, the
  // broadcast set, the recorded signal_history rows, or the published
  // confidence. The calibrated value lives only in the NDJSON shadow log.
  //
  // Population is every candidate presented to the risk pipeline. No
  // post-hoc symbol/direction winner list narrows this forward record.
  //
  // off  → skip entirely. shadow/active → record. `active` is forward-compat
  // ONLY: the walk-forward gate failed on paper, so it records identically to
  // shadow and enforces NOTHING in this branch — live activation is a later
  // operator decision (plan D8 / C9 runbook). Guarded so a recorder failure can
  // never break the broadcast (the .catch below + recordRouterShadow's own
  // try/catch).
  const routerMode = getStrategyRouterMode();
  if (routerMode !== 'off') {
    void recordRouterShadow(
      routerMode,
      candidates.map((c) => ({
        id: c.id,
        symbol: c.symbol,
        direction: c.direction,
        confidence: c.confidence,
      })),
      regimeOf,
    ).catch(() => undefined);
  }

  return decisions;
}
