/**
 * Pro-broadcast gate decision, computed BEFORE persistence (engine-makeover
 * Phase 1). One pipeline run per cron tick decides, per signal: does this row
 * reach the Pro broadcast, and why not if it doesn't. The cron records the
 * decision on the row (migration 048) so the broadcast-filtered subset is
 * measurable — previously the decision was computed after recording and only
 * console-warned.
 *
 * Decision semantics:
 * - winning-cells curation (when active) blocks deterministically.
 * - risk pipeline (circuit breakers → allocator → veto) blocks with a reason.
 * - pipeline OUTAGE falls back to unfiltered broadcast (Pro must not silently
 *   mute) — those rows are marked `recordable: false` and their decision is
 *   NOT persisted: the gate never actually ran, so NULL ("decision not
 *   recorded") is the truthful state even though the row was broadcast.
 */

import { isWinningCell, getWinningCellsMode } from './winning-cells';
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
  /** True when a real gate decision ran (winning-cells or risk pipeline). False = pipeline outage fallback: row broadcasts unfiltered and the decision must NOT be persisted. */
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

  const winningCellsActive = getWinningCellsMode() === 'active';
  const curated: BroadcastCandidate[] = [];
  for (const c of candidates) {
    if (winningCellsActive && !isWinningCell(c.symbol, c.direction)) {
      decisions.set(c.id, {
        id: c.id,
        regime: regimeOf(c.symbol),
        blocked: true,
        blockReason: 'winning_cells: not in current winning set',
        recordable: true,
      });
    } else {
      curated.push(c);
    }
  }

  if (curated.length === 0) return decisions;

  try {
    const result = await runRiskPipeline(
      curated.map((s) => ({
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
      const idx = curated.findIndex((c) => c.id === id);
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
    // Mirror the long-standing broadcast fallback: a transient risk-state
    // outage must not mute the Pro channel. These rows broadcast unfiltered;
    // their gate decision never ran, so they are not recordable.
    console.warn(
      '[broadcast-decision] Risk pipeline failed, falling back to unfiltered broadcast:',
      err instanceof Error ? err.message : String(err),
    );
    for (const c of curated) {
      decisions.set(c.id, {
        id: c.id,
        regime: regimeOf(c.symbol),
        blocked: false,
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
  // Population = `curated` (post winning-cells), NOT the full `candidates`:
  // winning-cells-blocked rows never reach the router/risk pipeline and can
  // never be broadcast, so recording them would pollute the forward gate
  // analysis with signals the live system never acts on. `curated` is exactly
  // the set the router would act on (the risk pipeline only narrows it further).
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
      curated.map((c) => ({
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
