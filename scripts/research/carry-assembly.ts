/**
 * Pure carry-math assembly for the Phase 5 Track A funding-rate validation
 * (carry-validation.ts is the thin I/O shell). Spec + frozen gates:
 * docs/plans/2026-06-13-phase5-carry-xsection-research.md (D2).
 *
 * Accounting model (tested in carry-assembly.test.ts):
 *  - total carry notional 1, capital 2 (1 spot + 1 perp margin, unlevered);
 *    equity starts at 2; returns reported on capital = (equity − 2) / 2.
 *  - a short-perp/long-spot position RECEIVES rate × notional per funding
 *    event while open (pays when negative).
 *  - opening one leg-pair costs CARRY_COSTS.legPair × notional; closing the
 *    same; income accrues for events STRICTLY AFTER entry, UP TO AND
 *    INCLUDING exit (no look-ahead).
 *  - annualization is simple: returnOnCapital × 365 / windowDays.
 *  - trailing annualized funding at t = sum of rates in (t − Nd, t] × 365/N.
 *
 * Determinism: every function is a pure function of its inputs. No Date.now().
 */

export interface FundingEvent { ts: number; rate: number }

/** Frozen spec constants — spot 0.10% taker + 0.05% slippage; perp 0.05% + 0.15%. */
export const CARRY_COSTS = {
  spotSide: 0.0015,
  perpSide: 0.0020,
  /** One execution of both legs (entry OR exit). */
  legPair: 0.0035,
  /** Full open + close of both legs. */
  roundTrip: 0.007,
} as const;

const DAY = 86_400_000;
const CAPITAL = 2;

/** Sum of rates in (t − windowDays, t], annualized ×365/windowDays. 0 when empty. */
export function annualizedTrailing(events: FundingEvent[], atTs: number, windowDays: number): number {
  const from = atTs - windowDays * DAY;
  let sum = 0;
  for (const e of events) {
    if (e.ts > from && e.ts <= atTs) sum += e.rate;
  }
  return sum * (365 / windowDays);
}

/** Shared equity bookkeeping: walk income/cost deltas, track peak + drawdown. */
interface EquityTrack {
  equity: number;
  peak: number;
  maxDrawdown: number;
}
function newTrack(): EquityTrack {
  return { equity: CAPITAL, peak: CAPITAL, maxDrawdown: 0 };
}
function apply(track: EquityTrack, delta: number): void {
  track.equity += delta;
  if (track.equity > track.peak) track.peak = track.equity;
  const dd = (track.peak - track.equity) / track.peak;
  if (dd > track.maxDrawdown) track.maxDrawdown = dd;
}

/** Rounded result shape shared by all three simulators (JSON-stable). */
export interface CarryRunResult {
  grossIncome: number;
  totalCosts: number;
  finalEquity: number;
  returnOnCapital: number;
  annualizedReturn: number;
  maxDrawdown: number;
  windowDays: number;
  eventCount: number;
}

function finish(track: EquityTrack, grossIncome: number, totalCosts: number, events: FundingEvent[]): CarryRunResult {
  const windowDays = events.length > 1 ? (events[events.length - 1].ts - events[0].ts) / DAY : 0;
  const rocRounded = +((track.equity - CAPITAL) / CAPITAL).toFixed(10);
  return {
    grossIncome: +grossIncome.toFixed(10),
    totalCosts: +totalCosts.toFixed(10),
    finalEquity: +track.equity.toFixed(10),
    returnOnCapital: rocRounded,
    annualizedReturn: windowDays > 0 ? +(rocRounded * (365 / windowDays)).toFixed(10) : 0,
    maxDrawdown: +track.maxDrawdown.toFixed(10),
    windowDays,
    eventCount: events.length,
  };
}

/** A1 — always-on carry: enter at the first event, collect 2..N, exit at the last. */
export function runAlwaysOn(events: FundingEvent[]): CarryRunResult {
  const track = newTrack();
  let gross = 0;
  let costs = 0;
  if (events.length >= 2) {
    apply(track, -CARRY_COSTS.legPair); // entry at event 0 (collects nothing at entry ts)
    costs += CARRY_COSTS.legPair;
    for (let i = 1; i < events.length; i++) {
      apply(track, events[i].rate);
      gross += events[i].rate;
    }
    apply(track, -CARRY_COSTS.legPair); // exit at the last event (after collecting it)
    costs += CARRY_COSTS.legPair;
  }
  return finish(track, gross, costs, events);
}

export interface ThresholdOptions {
  /** Enter when trailing annualized funding > this (e.g. 0.05 = 5%/yr). */
  enterAbove: number;
  /** Exit when trailing annualized funding < this (e.g. 0). */
  exitBelow: number;
  trailingDays: number;
}

export interface ThresholdResult extends CarryRunResult {
  roundTrips: number;
  /** Entry event timestamps, in order. */
  entries: number[];
  /** Exit event timestamps, in order (last may be a force-close at the final event). */
  exits: number[];
}

/**
 * A2 — threshold-gated carry. The signal at event i uses events ≤ i (no
 * look-ahead); a position entered at event i collects from event i+1; an exit
 * signaled at event j collects event j then closes. A position still open at
 * the final event force-closes there.
 */
export function runThresholdGated(events: FundingEvent[], opts: ThresholdOptions): ThresholdResult {
  const track = newTrack();
  let gross = 0;
  let costs = 0;
  let inPosition = false;
  const entries: number[] = [];
  const exits: number[] = [];

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (inPosition) {
      apply(track, e.rate);
      gross += e.rate;
    }
    const signal = annualizedTrailing(events.slice(0, i + 1), e.ts, opts.trailingDays);
    if (!inPosition && signal > opts.enterAbove && i < events.length - 1) {
      apply(track, -CARRY_COSTS.legPair);
      costs += CARRY_COSTS.legPair;
      inPosition = true;
      entries.push(e.ts);
    } else if (inPosition && signal < opts.exitBelow) {
      apply(track, -CARRY_COSTS.legPair);
      costs += CARRY_COSTS.legPair;
      inPosition = false;
      exits.push(e.ts);
    }
  }
  if (inPosition) {
    apply(track, -CARRY_COSTS.legPair); // force-close at the final event
    costs += CARRY_COSTS.legPair;
    exits.push(events[events.length - 1].ts);
  }
  return { ...finish(track, gross, costs, events), roundTrips: exits.length, entries, exits };
}

export interface RotationOptions {
  topK: number;
  rebalanceDays: number;
  trailingDays: number;
}

export interface RotationRebalance {
  ts: number;
  held: string[];
  /** Symbols opened at this rebalance (each charges one leg-pair on its 1/K notional). */
  opened: string[];
  closed: string[];
}

export interface RotationResult extends CarryRunResult {
  rebalances: RotationRebalance[];
  /** Total positions opened across the run (initial entries count). */
  totalSwaps: number;
}

/**
 * A3 — cross-sectional carry rotation. Every rebalanceDays (grid from the
 * first ts where ≥ topK symbols have ≥ trailingDays of history), rank symbols
 * by trailing annualized funding using events ≤ grid ts, hold the top K at
 * 1/K notional each. Income accrues from each held symbol's events in
 * (gridTs, min(gridTs + rebalanceDays, maxTs)] — the last grid point caps at
 * maxTs, not the next grid ts. Opening/closing one symbol's position costs
 * legPair × (1/K). Everything force-closes at the final grid point.
 * Ties in ranking break by symbol name (deterministic).
 */
export function runCarryRotation(
  perSymbol: Record<string, FundingEvent[]>,
  opts: RotationOptions,
): RotationResult {
  const symbols = Object.keys(perSymbol).sort();
  const allTs = symbols.flatMap((s) => perSymbol[s].map((e) => e.ts));
  if (allTs.length === 0) {
    return { ...finish(newTrack(), 0, 0, []), rebalances: [], totalSwaps: 0 };
  }
  const minTs = Math.min(...allTs);
  const maxTs = Math.max(...allTs);
  const firstGrid = minTs + opts.trailingDays * DAY;

  const track = newTrack();
  let gross = 0;
  let costs = 0;
  let held: string[] = [];
  let totalSwaps = 0;
  const rebalances: RotationRebalance[] = [];
  const perNotional = 1 / opts.topK;

  for (let t = firstGrid; t <= maxTs; t += opts.rebalanceDays * DAY) {
    const ranked = symbols
      .map((s) => ({ s, f: annualizedTrailing(perSymbol[s].filter((e) => e.ts <= t), t, opts.trailingDays) }))
      .sort((a, b) => b.f - a.f || a.s.localeCompare(b.s))
      .slice(0, opts.topK)
      .map((x) => x.s)
      .sort();

    const opened = ranked.filter((s) => !held.includes(s));
    const closed = held.filter((s) => !ranked.includes(s));
    for (const _ of [...opened, ...closed]) {
      apply(track, -CARRY_COSTS.legPair * perNotional);
      costs += CARRY_COSTS.legPair * perNotional;
    }
    totalSwaps += opened.length;
    held = ranked;
    rebalances.push({ ts: t, held, opened, closed });

    // accrue this week's income from held symbols' events in (t, t + rebalanceDays]
    const until = Math.min(t + opts.rebalanceDays * DAY, maxTs);
    for (const s of held) {
      for (const e of perSymbol[s]) {
        if (e.ts > t && e.ts <= until) {
          apply(track, e.rate * perNotional);
          gross += e.rate * perNotional;
        }
      }
    }
  }
  // force-close everything at the end
  for (const _ of held) {
    apply(track, -CARRY_COSTS.legPair * perNotional);
    costs += CARRY_COSTS.legPair * perNotional;
  }

  // window = the events actually spanned (for annualization)
  const spanned: FundingEvent[] = [{ ts: firstGrid, rate: 0 }, { ts: maxTs, rate: 0 }];
  return { ...finish(track, gross, costs, spanned), rebalances, totalSwaps };
}

/** n contiguous time-ordered slices (last takes the remainder). Each fold runs standalone. */
export function splitFolds(events: FundingEvent[], n: number): FundingEvent[][] {
  const size = Math.floor(events.length / n);
  const out: FundingEvent[][] = [];
  for (let f = 0; f < n; f++) {
    out.push(events.slice(f * size, f === n - 1 ? events.length : (f + 1) * size));
  }
  return out;
}

/**
 * Events within the trailing `days` of the series end (the recent-window read).
 * The INCLUSIVE `>= from` left boundary is deliberate (a window of data, not a
 * signal window) and differs from annualizedTrailing's half-open (from, t].
 */
export function recentSlice(events: FundingEvent[], days: number): FundingEvent[] {
  if (events.length === 0) return [];
  const from = events[events.length - 1].ts - days * DAY;
  return events.filter((e) => e.ts >= from);
}

/** The FROZEN Track A gates (spec D2). All must pass. */
export interface CarryGateInput {
  fullAnnualized: number;
  recentAnnualized: number;
  maxDrawdown: number;
  foldsPositive: number;
  foldsTotal: number;
}
export function carryGates(g: CarryGateInput): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!(g.fullAnnualized > 0.08)) reasons.push(`full-window annualized ${(g.fullAnnualized * 100).toFixed(2)}% ≤ 8%`);
  if (!(g.recentAnnualized > 0.05)) reasons.push(`recent-24mo annualized ${(g.recentAnnualized * 100).toFixed(2)}% ≤ 5% (decay test)`);
  if (!(g.maxDrawdown < 0.10)) reasons.push(`max drawdown ${(g.maxDrawdown * 100).toFixed(2)}% ≥ 10%`);
  if (!(g.foldsPositive >= Math.min(3, g.foldsTotal))) reasons.push(`only ${g.foldsPositive}/${g.foldsTotal} folds positive (need ≥${Math.min(3, g.foldsTotal)})`);
  return { pass: reasons.length === 0, reasons };
}
