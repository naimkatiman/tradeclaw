// NOTE: deliberately no `import 'server-only'` here so this module is
// unit-testable under Jest (the test runner can't pull `server-only`).
// The async `fetchGateState` reads from Postgres via signal-history; the
// caller (`tracked-signals.ts`) carries the `server-only` guard for the
// whole import chain.
import { readHistoryAsync, type SignalHistoryRecord } from './signal-history';

// Mirrors packages/strategies/src/run-backtest.ts riskAllows('full-pipeline').
// Faithful port — keep these constants in sync with the TS backtest if they
// ever change. Streak halts trading after N consecutive losses, drawdown halts
// when cumulative drawdown on a $START_BALANCE notional exceeds the threshold.
export const LOOKBACK_RESOLVED = 20;
export const STREAK_N = 3;
export const DRAWDOWN_THRESHOLD = 0.10;
const START_BALANCE = 10_000;

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
}

/**
 * Pure compute. Takes the prior resolved outcomes (newest first) and returns
 * whether the gate would allow a new signal through. No I/O. Unit-testable.
 *
 * Empty input → fail-open (allow). When we have no historical data, we don't
 * have evidence to suppress signals.
 */
export function computeGateState(resolved: readonly ResolvedOutcome[]): GateState {
  if (resolved.length === 0) {
    return {
      gatesAllow: true,
      reason: null,
      streakLossCount: 0,
      currentDrawdownPct: 0,
      dataPoints: 0,
    };
  }

  // Streak gate: last STREAK_N entries (newest first) all losses → block.
  // Need at least STREAK_N data points before this can fire.
  const lastN = resolved.slice(0, STREAK_N);
  const streakLossCount = lastN.filter((r) => !r.hit).length;
  const streakBlocked = lastN.length === STREAK_N && streakLossCount >= STREAK_N;

  // Drawdown gate: simulate balance over the last LOOKBACK_RESOLVED outcomes
  // walking oldest-first, track running peak, compute current drawdown after
  // the loop (matches packages/strategies/src/run-backtest.ts semantics).
  const window = resolved.slice(0, LOOKBACK_RESOLVED).slice().reverse();
  let balance = START_BALANCE;
  let peak = START_BALANCE;
  for (const r of window) {
    balance *= 1 + (r.pnlPct ?? 0) / 100;
    if (balance > peak) peak = balance;
  }
  const currentDrawdown = peak > 0 ? (peak - balance) / peak : 0;
  const ddBlocked = currentDrawdown > DRAWDOWN_THRESHOLD;

  if (streakBlocked) {
    return {
      gatesAllow: false,
      reason: `streak_blocked: ${streakLossCount}/${STREAK_N} consecutive losses`,
      streakLossCount,
      currentDrawdownPct: +(currentDrawdown * 100).toFixed(2),
      dataPoints: resolved.length,
    };
  }
  if (ddBlocked) {
    return {
      gatesAllow: false,
      reason: `drawdown_blocked: ${(currentDrawdown * 100).toFixed(1)}% > ${(DRAWDOWN_THRESHOLD * 100).toFixed(0)}%`,
      streakLossCount,
      currentDrawdownPct: +(currentDrawdown * 100).toFixed(2),
      dataPoints: resolved.length,
    };
  }
  return {
    gatesAllow: true,
    reason: null,
    streakLossCount,
    currentDrawdownPct: +(currentDrawdown * 100).toFixed(2),
    dataPoints: resolved.length,
  };
}

// In-memory cache so we don't requery signal_history on every /api/signals
// call. With dashboard SSR this can fire ~100x/min, and the gate state only
// changes when a new outcome resolves — a stale-by-up-to-60s view is fine.
const CACHE_TTL_MS = 60_000;
let cachedState: { state: GateState; expiresAt: number } | null = null;

/**
 * Async wrapper. Reads the last LOOKBACK_RESOLVED resolved signals from
 * signal_history and applies computeGateState. Cached for 60s. Fails open
 * (returns gatesAllow=true) on any DB error so we never accidentally
 * suppress signals because of an unrelated infra issue.
 */
export async function fetchGateState(): Promise<GateState> {
  const now = Date.now();
  if (cachedState && now < cachedState.expiresAt) {
    return cachedState.state;
  }

  try {
    // readHistoryAsync returns rows ordered DESC by created_at — newest first.
    // Take the first LOOKBACK_RESOLVED resolved entries.
    const all = await readHistoryAsync();
    const resolved: ResolvedOutcome[] = [];
    for (const r of all) {
      if (r.isSimulated) continue;
      const o = r.outcomes['24h'];
      if (o === null) continue;
      resolved.push({ hit: o.hit, pnlPct: o.pnlPct });
      if (resolved.length >= LOOKBACK_RESOLVED) break;
    }
    const state = computeGateState(resolved);
    cachedState = { state, expiresAt: now + CACHE_TTL_MS };
    return state;
  } catch (err) {
    // Fail open — log to stderr but never block signals on DB hiccups
    console.error('[full-risk-gates] fetchGateState failed:', err);
    return {
      gatesAllow: true,
      reason: null,
      streakLossCount: 0,
      currentDrawdownPct: 0,
      dataPoints: 0,
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
