// NOTE: deliberately no `import 'server-only'` here so this module is
// unit-testable under Jest (the test runner can't pull `server-only`).
// The async `fetchGateState` reads from Postgres via signal-history; the
// caller (`tracked-signals.ts`) carries the `server-only` guard for the
// whole import chain.
import { readHistoryAsync, type SignalHistoryRecord } from './signal-history';
import { fetchRegimeMap, getDominantRegime } from './regime-filter';
import type { MarketRegime } from '@tradeclaw/signals';

export interface GateThresholds {
  streakN: number;
  drawdownThreshold: number;
  lookback: number;
}

// Regime-aware thresholds. See docs/plans/2026-04-19-dynamic-risk-gates.md
// for the rationale. neutral preserves the historical defaults so existing
// callers that don't pass a regime keep their behavior.
export const GATE_THRESHOLDS_BY_REGIME: Record<MarketRegime, GateThresholds> = {
  crash:    { streakN: 2, drawdownThreshold: 0.05, lookback: 15 },
  bear:     { streakN: 2, drawdownThreshold: 0.07, lookback: 20 },
  neutral:  { streakN: 3, drawdownThreshold: 0.10, lookback: 20 },
  bull:     { streakN: 4, drawdownThreshold: 0.15, lookback: 30 },
  euphoria: { streakN: 3, drawdownThreshold: 0.08, lookback: 20 },
};

// Baseline expected stddev of resolved pnlPct per regime. Current realized
// stddev divided by this baseline gives the volatility multiplier applied to
// the drawdown threshold. Calibrated against the Apr 13-18 tape — refine
// after 2 weeks of gate-log data lands.
export const REGIME_VOL_BASELINE_PCT: Record<MarketRegime, number> = {
  crash:    2.5,
  bear:     1.8,
  neutral:  1.5,
  bull:     2.0,
  euphoria: 2.5,
};

// Volatility multiplier clamps. Prevents the vol-scaled DD threshold from
// running away in extreme regimes — a 2x loose gate in a vol blowout defeats
// the purpose.
const VOL_MULTIPLIER_MIN = 0.75;
const VOL_MULTIPLIER_MAX = 1.5;

// Backward-compat exports — used by existing tests and any external callers
// that imported the old constants. These are the `neutral` values.
export const LOOKBACK_RESOLVED = GATE_THRESHOLDS_BY_REGIME.neutral.lookback;
export const STREAK_N = GATE_THRESHOLDS_BY_REGIME.neutral.streakN;
export const DRAWDOWN_THRESHOLD = GATE_THRESHOLDS_BY_REGIME.neutral.drawdownThreshold;
const START_BALANCE = 10_000;

export function getGateThresholds(regime: MarketRegime): GateThresholds {
  return GATE_THRESHOLDS_BY_REGIME[regime] ?? GATE_THRESHOLDS_BY_REGIME.neutral;
}

/**
 * Returns true when TRADECLAW_GATE_VOL_SCALING=on. Off by default — prod
 * behavior is unchanged until explicitly enabled.
 */
export function volScalingEnabled(): boolean {
  return (process.env.TRADECLAW_GATE_VOL_SCALING ?? 'off').toLowerCase() === 'on';
}

/**
 * Computes the volatility multiplier for the DD threshold. Takes the stddev
 * of resolved pnlPct values across the lookback window and compares to the
 * regime-expected baseline stddev. Clamped to [VOL_MULTIPLIER_MIN, _MAX] to
 * prevent extreme adjustments.
 *
 * Needs at least 5 samples to produce a meaningful stddev; fewer → 1.0 (no
 * adjustment).
 */
export function computeVolMultiplier(
  resolved: readonly ResolvedOutcome[],
  regime: MarketRegime,
): number {
  if (resolved.length < 5) return 1.0;

  const values = resolved.map((r) => r.pnlPct);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);

  const baseline = REGIME_VOL_BASELINE_PCT[regime] ?? REGIME_VOL_BASELINE_PCT.neutral;
  if (baseline <= 0) return 1.0;

  const raw = stddev / baseline;
  return Math.min(VOL_MULTIPLIER_MAX, Math.max(VOL_MULTIPLIER_MIN, raw));
}

export interface ResolvedOutcome {
  hit: boolean;
  pnlPct: number;
}

export interface GateState {
  gatesAllow: boolean;
  reason: string | null;
  streakLossCount: number;
  currentDrawdownPct: number;
  dataPoints: number;
  regime: MarketRegime;
  thresholds: GateThresholds;
  /** Multiplier applied to thresholds.drawdownThreshold when vol scaling is on. 1.0 when off. */
  volMultiplier: number;
  /** The actual DD threshold used for this evaluation (thresholds.drawdownThreshold * volMultiplier). */
  effectiveDrawdownThreshold: number;
}

/**
 * Pure compute. Takes the prior resolved outcomes (newest first) and returns
 * whether the gate would allow a new signal through. No I/O. Unit-testable.
 *
 * Empty input → fail-open (allow). When we have no historical data, we don't
 * have evidence to suppress signals.
 *
 * `regime` defaults to 'neutral' so tests and callers that haven't been
 * updated continue to use the historical thresholds.
 */
export interface ComputeGateOptions {
  /** When true, scale thresholds.drawdownThreshold by realized outcome stddev / regime baseline. */
  volScaling?: boolean;
}

export function computeGateState(
  resolved: readonly ResolvedOutcome[],
  regime: MarketRegime = 'neutral',
  opts: ComputeGateOptions = {},
): GateState {
  const thresholds = getGateThresholds(regime);
  const volMultiplier = opts.volScaling ? computeVolMultiplier(resolved, regime) : 1.0;
  const effectiveDrawdownThreshold = +(thresholds.drawdownThreshold * volMultiplier).toFixed(4);

  if (resolved.length === 0) {
    return {
      gatesAllow: true,
      reason: null,
      streakLossCount: 0,
      currentDrawdownPct: 0,
      dataPoints: 0,
      regime,
      thresholds,
      volMultiplier,
      effectiveDrawdownThreshold,
    };
  }

  // Streak gate: last streakN entries (newest first) all losses → block.
  // Need at least streakN data points before this can fire.
  const lastN = resolved.slice(0, thresholds.streakN);
  const streakLossCount = lastN.filter((r) => !r.hit).length;
  const streakBlocked =
    lastN.length === thresholds.streakN && streakLossCount >= thresholds.streakN;

  // Drawdown gate: simulate balance over the last `lookback` outcomes
  // walking oldest-first, track running peak, compute current drawdown after
  // the loop (matches packages/strategies/src/run-backtest.ts semantics).
  const window = resolved.slice(0, thresholds.lookback).slice().reverse();
  let balance = START_BALANCE;
  let peak = START_BALANCE;
  for (const r of window) {
    balance *= 1 + (r.pnlPct ?? 0) / 100;
    if (balance > peak) peak = balance;
  }
  const currentDrawdown = peak > 0 ? (peak - balance) / peak : 0;
  const ddBlocked = currentDrawdown > effectiveDrawdownThreshold;

  const scalingNote = opts.volScaling && volMultiplier !== 1.0
    ? ` (vol×${volMultiplier.toFixed(2)})`
    : '';

  if (streakBlocked) {
    return {
      gatesAllow: false,
      reason: `streak_blocked: ${streakLossCount}/${thresholds.streakN} consecutive losses (regime=${regime})`,
      streakLossCount,
      currentDrawdownPct: +(currentDrawdown * 100).toFixed(2),
      dataPoints: resolved.length,
      regime,
      thresholds,
      volMultiplier,
      effectiveDrawdownThreshold,
    };
  }
  if (ddBlocked) {
    return {
      gatesAllow: false,
      reason: `drawdown_blocked: ${(currentDrawdown * 100).toFixed(1)}% > ${(effectiveDrawdownThreshold * 100).toFixed(1)}% (regime=${regime}${scalingNote})`,
      streakLossCount,
      currentDrawdownPct: +(currentDrawdown * 100).toFixed(2),
      dataPoints: resolved.length,
      regime,
      thresholds,
      volMultiplier,
      effectiveDrawdownThreshold,
    };
  }
  return {
    gatesAllow: true,
    reason: null,
    streakLossCount,
    currentDrawdownPct: +(currentDrawdown * 100).toFixed(2),
    dataPoints: resolved.length,
    regime,
    thresholds,
    volMultiplier,
    effectiveDrawdownThreshold,
  };
}

// In-memory cache so we don't requery signal_history on every /api/signals
// call. With dashboard SSR this can fire ~100x/min, and the gate state only
// changes when a new outcome resolves — a stale-by-up-to-60s view is fine.
const CACHE_TTL_MS = 60_000;
let cachedState: { state: GateState; expiresAt: number } | null = null;

/**
 * Async wrapper. Resolves the dominant market regime, reads the last N
 * resolved signals (N depends on regime) from signal_history, and applies
 * computeGateState. Cached for 60s. Fails open (returns gatesAllow=true) on
 * any DB error so we never accidentally suppress signals because of an
 * unrelated infra issue.
 */
export async function fetchGateState(): Promise<GateState> {
  const now = Date.now();
  if (cachedState && now < cachedState.expiresAt) {
    return cachedState.state;
  }

  try {
    const regimeMap = await fetchRegimeMap();
    const regime = getDominantRegime(regimeMap);
    const thresholds = getGateThresholds(regime);

    // readHistoryAsync returns rows ordered DESC by created_at — newest first.
    // Take the first `lookback` resolved entries for this regime. Skip rows
    // the gate itself blocked: otherwise the drawdown/streak lookback would
    // count outcomes from trades we never actually took, creating a feedback
    // loop where blocked-but-right signals re-open the gate on fictional P&L.
    const all = await readHistoryAsync();
    const resolved: ResolvedOutcome[] = [];
    for (const r of all) {
      if (r.isSimulated) continue;
      if (r.gateBlocked) continue;
      const o = r.outcomes['24h'];
      if (o === null) continue;
      resolved.push({ hit: o.hit, pnlPct: o.pnlPct });
      if (resolved.length >= thresholds.lookback) break;
    }
    const state = computeGateState(resolved, regime, { volScaling: volScalingEnabled() });
    cachedState = { state, expiresAt: now + CACHE_TTL_MS };
    return state;
  } catch (err) {
    // Fail open — log to stderr but never block signals on DB hiccups
    console.error('[full-risk-gates] fetchGateState failed:', err);
    const neutralThresholds = getGateThresholds('neutral');
    return {
      gatesAllow: true,
      reason: null,
      streakLossCount: 0,
      currentDrawdownPct: 0,
      dataPoints: 0,
      regime: 'neutral',
      thresholds: neutralThresholds,
      volMultiplier: 1.0,
      effectiveDrawdownThreshold: neutralThresholds.drawdownThreshold,
    };
  }
}

/** Test helper — clears the in-memory cache so unit/integration tests start fresh. */
export function __resetGateCache(): void {
  cachedState = null;
}

/** Coerces TRADECLAW_GATE_MODE into the documented enum. */
export type GateMode = 'shadow' | 'active' | 'off';

export function getGateMode(): GateMode {
  const raw = (process.env.TRADECLAW_GATE_MODE ?? 'shadow').toLowerCase();
  if (raw === 'active' || raw === 'off') return raw;
  return 'shadow';
}

// Re-export for callers that want to assert against signal_history shape
export type { SignalHistoryRecord };
