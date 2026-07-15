import { query } from './db-pool';
import {
  NOT_DARK_STRATEGY_SQL,
  isObservedOHLCVOutcomeSource,
  type ObservedOHLCVOutcomeSource,
} from './signal-history';

const WINDOW_DAYS = 90;
const MIN_USABLE_TRADES = 100;
const MIN_ACTIVE_DAYS = 30;
const MIN_COVERAGE = 0.9;
const MAX_EVIDENCE_AGE_DAYS = 7;
const DAILY_LCB_MULTIPLIER = 2.05;

export type EdgeGateReason =
  | 'ready'
  | 'insufficient_sample'
  | 'incomplete_data'
  | 'stale'
  | 'negative'
  | 'inconclusive'
  | 'unavailable';

export interface EdgeEvidenceSummary {
  windowDays: number;
  matureCount: number;
  usableCount: number;
  coverage: number;
  activeDays: number;
  perSignalMeanNetR: number | null;
  equalDayMeanNetR: number | null;
  equalDayStdDevNetR: number | null;
  equalDayLowerBoundNetR: number | null;
  latestUsableAt: number | null;
}

export interface EdgeGateVerdict extends EdgeEvidenceSummary {
  allowed: boolean;
  reason: EdgeGateReason;
  requirements: {
    minUsableTrades: number;
    minActiveDays: number;
    minCoverage: number;
    maxEvidenceAgeDays: number;
    lowerBoundMultiplier: number;
  };
}

interface EdgeEvidenceRow {
  id: string;
  created_at: string | Date;
  entry_price: string | number;
  sl: string | number | null;
  cost_estimate_pct: string | number | null;
  outcome_24h: unknown;
}

interface ParsedOutcome {
  pnlPct: number;
  hit: boolean;
  source: ObservedOHLCVOutcomeSource;
}

const REQUIREMENTS = {
  minUsableTrades: MIN_USABLE_TRADES,
  minActiveDays: MIN_ACTIVE_DAYS,
  minCoverage: MIN_COVERAGE,
  maxEvidenceAgeDays: MAX_EVIDENCE_AGE_DAYS,
  lowerBoundMultiplier: DAILY_LCB_MULTIPLIER,
} as const;

function parseOutcome(raw: unknown): ParsedOutcome | null {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;

  const candidate = value as { pnlPct?: unknown; hit?: unknown; source?: unknown };
  const pnlPct = Number(candidate.pnlPct);
  if (
    !Number.isFinite(pnlPct)
    || typeof candidate.hit !== 'boolean'
    || !isObservedOHLCVOutcomeSource(candidate.source)
  ) return null;
  // Canonical denominator: zero/no-hit is a force-expiry placeholder. Nonzero
  // 24h closes count even when their target field is `expired`.
  if (pnlPct === 0 && candidate.hit === false) return null;
  return { pnlPct, hit: candidate.hit, source: candidate.source };
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStdDev(values: readonly number[], average: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce(
    (sum, value) => sum + (value - average) ** 2,
    0,
  ) / (values.length - 1);
  return Math.sqrt(variance);
}

export function summarizeEdgeEvidence(
  rows: readonly EdgeEvidenceRow[],
): EdgeEvidenceSummary {
  const netRValues: number[] = [];
  const byDay = new Map<string, number[]>();
  let latestUsableAt: number | null = null;

  for (const row of rows) {
    const createdAt = new Date(row.created_at).getTime();
    const entryPrice = Number(row.entry_price);
    const stopLoss = Number(row.sl);
    const costEstimatePct = Number(row.cost_estimate_pct);
    const outcome = parseOutcome(row.outcome_24h);
    if (
      !Number.isFinite(createdAt)
      || !Number.isFinite(entryPrice)
      || entryPrice <= 0
      || row.sl == null
      || !Number.isFinite(stopLoss)
      || !Number.isFinite(costEstimatePct)
      || costEstimatePct <= 0
      || !outcome
    ) {
      continue;
    }

    const riskPct = (Math.abs(entryPrice - stopLoss) / entryPrice) * 100;
    if (!Number.isFinite(riskPct) || riskPct <= 0) continue;
    const netR = (outcome.pnlPct - costEstimatePct) / riskPct;
    if (!Number.isFinite(netR)) continue;

    netRValues.push(netR);
    const day = new Date(createdAt).toISOString().slice(0, 10);
    const bucket = byDay.get(day) ?? [];
    bucket.push(netR);
    byDay.set(day, bucket);
    const evidenceAt = createdAt + 24 * 60 * 60 * 1000;
    latestUsableAt = latestUsableAt === null
      ? evidenceAt
      : Math.max(latestUsableAt, evidenceAt);
  }

  const dailyMeans = [...byDay.values()].map(mean);
  const equalDayMeanNetR = dailyMeans.length > 0 ? mean(dailyMeans) : null;
  const equalDayStdDevNetR = equalDayMeanNetR !== null
    ? sampleStdDev(dailyMeans, equalDayMeanNetR)
    : null;
  const equalDayLowerBoundNetR = equalDayMeanNetR !== null
    && equalDayStdDevNetR !== null
    ? equalDayMeanNetR
      - DAILY_LCB_MULTIPLIER * equalDayStdDevNetR / Math.sqrt(dailyMeans.length)
    : null;

  return {
    windowDays: WINDOW_DAYS,
    matureCount: rows.length,
    usableCount: netRValues.length,
    coverage: rows.length > 0 ? netRValues.length / rows.length : 0,
    activeDays: dailyMeans.length,
    perSignalMeanNetR: netRValues.length > 0 ? mean(netRValues) : null,
    equalDayMeanNetR,
    equalDayStdDevNetR,
    equalDayLowerBoundNetR,
    latestUsableAt,
  };
}

export function decideCostAdjustedEdge(
  summary: EdgeEvidenceSummary,
  now = Date.now(),
): EdgeGateVerdict {
  let reason: EdgeGateReason = 'ready';
  if (summary.matureCount === 0 || summary.usableCount < MIN_USABLE_TRADES) {
    reason = 'insufficient_sample';
  } else if (summary.coverage < MIN_COVERAGE) {
    reason = 'incomplete_data';
  } else if (summary.activeDays < MIN_ACTIVE_DAYS) {
    reason = 'insufficient_sample';
  } else if (
    summary.latestUsableAt === null
    || now - summary.latestUsableAt > MAX_EVIDENCE_AGE_DAYS * 86_400_000
  ) {
    reason = 'stale';
  } else if (
    summary.perSignalMeanNetR === null
    || summary.perSignalMeanNetR <= 0
    || summary.equalDayMeanNetR === null
    || summary.equalDayMeanNetR <= 0
  ) {
    reason = 'negative';
  } else if (
    summary.equalDayLowerBoundNetR === null
    || summary.equalDayLowerBoundNetR <= 0
  ) {
    reason = 'inconclusive';
  }

  return {
    ...summary,
    allowed: reason === 'ready',
    reason,
    requirements: REQUIREMENTS,
  };
}

export async function evaluateCostAdjustedEdge(options: {
  strategyId?: string;
  symbols?: readonly string[];
} = {}): Promise<EdgeGateVerdict> {
  try {
    const params: unknown[] = [];
    const predicates: string[] = [];
    if (options.strategyId) {
      params.push(options.strategyId);
      predicates.push(`AND strategy_id = $${params.length}`);
    }
    if (options.symbols && options.symbols.length > 0) {
      params.push([...options.symbols]);
      predicates.push(`AND pair = ANY($${params.length})`);
    }

    const rows = await query<EdgeEvidenceRow>(
      `SELECT id, created_at, entry_price, sl, cost_estimate_pct, outcome_24h
         FROM signal_history
        WHERE is_simulated = FALSE
          AND ${NOT_DARK_STRATEGY_SQL}
          AND COALESCE(gate_blocked, FALSE) = FALSE
          AND broadcast_blocked = FALSE
          AND created_at >= NOW() - INTERVAL '${WINDOW_DAYS} days'
          AND created_at <= NOW() - INTERVAL '24 hours'
          ${predicates.join('\n          ')}
        ORDER BY created_at ASC`,
      params,
    );
    return decideCostAdjustedEdge(summarizeEdgeEvidence(rows));
  } catch {
    return {
      windowDays: WINDOW_DAYS,
      matureCount: 0,
      usableCount: 0,
      coverage: 0,
      activeDays: 0,
      perSignalMeanNetR: null,
      equalDayMeanNetR: null,
      equalDayStdDevNetR: null,
      equalDayLowerBoundNetR: null,
      latestUsableAt: null,
      allowed: false,
      reason: 'unavailable',
      requirements: REQUIREMENTS,
    };
  }
}

/**
 * Defense-in-depth check for entry-like fan-out. A candidate may be sent only
 * after its persisted per-signal gate decision exists and explicitly approved
 * it. Query failures and legacy NULL decisions return an empty set.
 */
export async function getStrictlyApprovedSignalIds(
  ids: readonly string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  try {
    const rows = await query<{ id: string }>(
      `SELECT id
         FROM signal_history
        WHERE id = ANY($1)
          AND is_simulated = FALSE
          AND ${NOT_DARK_STRATEGY_SQL}
          AND COALESCE(gate_blocked, FALSE) = FALSE
          AND broadcast_blocked = FALSE`,
      [[...ids]],
    );
    return new Set(rows.map((row) => row.id));
  } catch {
    return new Set();
  }
}
