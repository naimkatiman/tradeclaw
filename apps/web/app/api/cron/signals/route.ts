import { NextRequest, NextResponse } from 'next/server';
import { getOHLCV } from '../../../lib/ohlcv';
import { isMarketOpen } from '../../../lib/market-hours';
import { getSignals } from '../../../lib/signals';
import { safeProfileId } from '../../../lib/signal-generator';
import { getActivePreset } from './preset-dispatch';
import {
  recordSignalAsync,
  getRecentRecordForSymbolAsync,
  getPendingRecordsAsync,
  updateRecordsAsync,
  markTelegramPosted,
  resolveFromCandles,
  getOutcomeResolutionTimeframe,
  isObservedOHLCVOutcomeSource,
  type ObservedOHLCVOutcomeSource,
  type SignalHistoryRecord,
} from '../../../../lib/signal-history';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from '../../../../lib/signal-thresholds';
import { computeBroadcastDecisions } from '../../../../lib/broadcast-decision';
import { recordSignalRun } from '../../../../lib/signal-run-log';
import { requireCronAuth } from '../../../../lib/cron-auth';
import { precomputeSignals } from '../../../../lib/signal-worker';
import { readLiveSignals } from '../../../../lib/signals-live';
import { costModelFor } from '@tradeclaw/strategies';
import {
  resolveD1SlowGateLaneMode,
  runD1SlowGateLane,
  type D1SlowGateLaneResult,
} from '../../../../lib/d1-slow-gate-paper';

/**
 * Modeled round-trip transaction cost for a signal, as a PERCENT of notional
 * (Phase 4 D4, migration 051 cost_estimate_pct). Round-trip = entry + exit, so
 * 2×(feePctPerSide + slippagePctPerSide) from the canonical @tradeclaw/strategies
 * cost model. Funding is intentionally excluded — hold duration is unknown at
 * emission, so funding accrual cannot be estimated here (backtests model it
 * separately). Populated for EVERY recorded cron row.
 */
function estimateRoundTripCostPct(symbol: string): number {
  const c = costModelFor(symbol);
  return 2 * (c.feePctPerSide + c.slippagePctPerSide);
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const MIN_LIVE_SYMBOLS_CHECKED = 8;

function hasCompleteDecisionEvidence(record: SignalHistoryRecord): boolean {
  return record.broadcastBlocked !== undefined
    && typeof record.costEstimatePct === 'number'
    && Number.isFinite(record.costEstimatePct)
    && record.costEstimatePct > 0;
}

/** Keep every unexpected D1 lane failure outside the existing signal path. */
export async function runD1LaneSafely(): Promise<D1SlowGateLaneResult> {
  const mode = resolveD1SlowGateLaneMode();
  try {
    return await runD1SlowGateLane({ mode });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`[cron/signals] D1 ${mode} lane failed closed: ${errorMessage}`);
    return {
      mode,
      processed: 0,
      candidates: 0,
      recorded: 0,
      alphaLedger: null,
      failures: [{
        symbol: 'BTCUSD+ETHUSD',
        stage: 'lane',
        error: errorMessage,
      }],
    };
  }
}

/** @deprecated Use runD1LaneSafely; retained for internal compatibility. */
export const runD1PaperLaneSafely = runD1LaneSafely;

// ── Record logic ──────────────────────────────────────────────

type NewlyRecordedSignal = {
  id: string;
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  takeProfit1: number;
  stopLoss: number;
  timestamp: number;
  // Calibration features (Phase 4 D4). The MTF triple is only present on the
  // TA-fallback path; scanner rows leave it undefined and record NULL.
  preBoostConfidence?: number;
  mtfAgreement?: number;
  confluenceBonus?: number;
};

/**
 * Selects the candidate set to record this tick (best per symbol+direction,
 * market open, no recent duplicate). Does NOT persist — Phase 1 re-sequenced
 * the cron so the broadcast gate decision is computed BEFORE persistence and
 * recorded on the row (docs/plans/2026-06-10-engine-makeover.md).
 *
 * @internal exported for testing — the GET handler is the only caller.
 */
export async function collectNewSignals(strategyId: string): Promise<{
  candidates: NewlyRecordedSignal[];
  effectiveStrategyId: string;
}> {
  let signals: Array<{
    id: string;
    symbol: string;
    timeframe: string;
    direction: 'BUY' | 'SELL';
    confidence: number;
    entry: number;
    takeProfit1: number;
    stopLoss: number;
    timestamp: string;
    // Calibration features (Phase 4 D4) — populated only on the TA-fallback path.
    preBoostConfidence?: number;
    mtfAgreement?: number;
    confluenceBonus?: number;
  }> = [];

  // The strategy actually responsible for the rows below — assigned in each
  // branch so the returned attribution is honest and its origin is explicit
  // (no reassignment of the `strategyId` parameter to track).
  let effectiveStrategyId: string;

  // ── PRIMARY: Prefer Python scanner signals when coverage is adequate ──
  // Mirrors the logic in /api/signals/route.ts so the track record reflects
  // the same high-quality signals users see on the dashboard.
  const liveData = await readLiveSignals();
  const liveCoverageOk =
    liveData && (liveData.stats?.symbols_checked ?? Infinity) >= MIN_LIVE_SYMBOLS_CHECKED;
  if (liveData && !liveData.isStale && liveData.signals.length > 0 && liveCoverageOk) {
    signals = liveData.signals.map((s) => ({
      id: s.id,
      symbol: s.symbol,
      timeframe: s.timeframe,
      direction: s.signal,
      confidence: s.confidence,
      entry: s.entry,
      takeProfit1: s.tp1,
      stopLoss: s.sl,
      timestamp: s.timestamp,
    }));
    effectiveStrategyId = 'scanner'; // tag so track-record breakdown reflects reality
  } else {
    // ── FALLBACK: Next.js TA engine ──
    // Resolve strategyId to the profile that will actually run, so stamp and
    // generation can never diverge (e.g. env preset 'hmm-top3' → 'classic').
    const profileId = safeProfileId(strategyId);
    const { signals: rawSignals } = await getSignals({ minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE, profileId });
    signals = rawSignals
      .filter((s) => s.dataQuality === 'real' && s.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE)
      .map((s) => ({
        id: s.id,
        symbol: s.symbol,
        timeframe: s.timeframe,
        direction: s.direction as 'BUY' | 'SELL',
        confidence: s.confidence,
        entry: s.entry,
        takeProfit1: s.takeProfit1,
        stopLoss: s.stopLoss,
        timestamp: s.timestamp,
        // MTF triple surfaced by the TA engine's re-boost path (signals.ts).
        // Scanner rows do not carry these — only the TA-fallback path does.
        preBoostConfidence: s.preBoostConfidence,
        mtfAgreement: s.mtfAgreement,
        confluenceBonus: s.confluenceBonus,
      }));
    effectiveStrategyId = profileId; // honest: stamp what actually generated the rows
  }

  const candidates: NewlyRecordedSignal[] = [];

  // Track symbols already selected in this run to prevent dupes within a batch
  const selectedThisRun = new Set<string>();

  // Pick the best signal per symbol+direction (highest confidence)
  const bestBySymDir = new Map<string, (typeof signals)[number]>();
  for (const sig of signals) {
    const key = `${sig.symbol}:${sig.direction}`;
    const existing = bestBySymDir.get(key);
    if (!existing || sig.confidence > existing.confidence) {
      bestBySymDir.set(key, sig);
    }
  }

  for (const sig of bestBySymDir.values()) {
    if (!isMarketOpen(sig.symbol)) continue;

    const dedupKey = `${sig.symbol}:${sig.direction}`;
    if (selectedThisRun.has(dedupKey)) continue;

    const existing = await getRecentRecordForSymbolAsync(sig.symbol, sig.direction, TWO_HOURS_MS);
    // Request-path tracking can create the deterministic row before this cron
    // has computed its broadcast decision and modeled cost. Only suppress the
    // candidate once those evidence fields are present; otherwise the Tier-0
    // upsert below gets a chance to backfill the same row.
    if (existing && hasCompleteDecisionEvidence(existing)) continue;

    const parsedCandleTs = Date.parse(sig.timestamp);
    const timestamp = Number.isFinite(parsedCandleTs) ? parsedCandleTs : Date.now();

    selectedThisRun.add(dedupKey);

    candidates.push({
      id: sig.id,
      symbol: sig.symbol,
      timeframe: sig.timeframe,
      direction: sig.direction,
      confidence: sig.confidence,
      entry: sig.entry,
      takeProfit1: sig.takeProfit1,
      stopLoss: sig.stopLoss,
      timestamp,
      preBoostConfidence: sig.preBoostConfidence,
      mtfAgreement: sig.mtfAgreement,
      confluenceBonus: sig.confluenceBonus,
    });
  }

  return { candidates, effectiveStrategyId };
}

// ── Resolve logic ─────────────────────────────────────────────
// Outcome math lives in lib/signal-history.ts → resolveFromCandles. The cron
// stamps resolution provenance (resolvedAt + OHLCV source) onto each outcome
// and persists MAE alongside — re-resolution against a different provider is
// detectable instead of silently rewriting history.

/** @internal Exported for provenance-gate regression tests. */
export async function resolveOldSignals(): Promise<{ resolved: number; pending: number; errors: string[] }> {
  const pending = await getPendingRecordsAsync();
  const now = Date.now();
  const updates: Array<{ id: string; patch: Partial<SignalHistoryRecord> }> = [];
  const errors: string[] = [];

  for (const record of pending) {
    const age = now - record.timestamp;
    const needs4h = record.outcomes['4h'] === null;
    const needs24h = record.outcomes['24h'] === null;
    if (!needs4h && !needs24h) continue;
    if (!record.tp1 || !record.sl) continue;

    let candles: Array<{ timestamp: number; high: number; low: number; close: number; open: number; volume: number }> = [];
    let candleSource: ObservedOHLCVOutcomeSource | null = null;

    try {
      const result = await getOHLCV(record.pair, getOutcomeResolutionTimeframe(record));
      if (isObservedOHLCVOutcomeSource(result.source)) {
        candles = result.candles;
        candleSource = result.source;
      } else {
        const msg = `Refusing unobserved OHLCV source ${result.source} for ${record.pair}`;
        console.warn(`[cron/signals] ${msg}`);
        errors.push(msg);
      }
    } catch (err) {
      const msg = `OHLCV fetch failed for ${record.pair}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[cron/signals] ${msg}`);
      errors.push(msg);
    }

    const resolvedAt = new Date(now).toISOString();
    const newOutcomes = { ...record.outcomes };
    let changed = false;
    let mae24h: number | null = null;

    if (needs4h) {
      const windowEnd = record.timestamp + FOUR_HOURS_MS;
      const window = candles.filter(
        c => c.timestamp > record.timestamp && c.timestamp <= windowEnd,
      );
      const windowComplete = age >= FOUR_HOURS_MS;
      const result = candleSource ? resolveFromCandles(record, window, windowComplete) : null;
      if (result && candleSource) {
        newOutcomes['4h'] = { ...result.outcome, resolvedAt, source: candleSource };
        changed = true;
      } else if (age >= FOUR_HOURS_MS * 2) {
        newOutcomes['4h'] = { price: record.entryPrice, pnlPct: 0, hit: false, target: 'expired', resolvedAt, source: 'force-expired' };
        changed = true;
      }
    }

    if (needs24h) {
      const windowEnd = record.timestamp + TWENTY_FOUR_HOURS_MS;
      const window = candles.filter(
        c => c.timestamp > record.timestamp && c.timestamp <= windowEnd,
      );
      const windowComplete = age >= TWENTY_FOUR_HOURS_MS;
      const result = candleSource ? resolveFromCandles(record, window, windowComplete) : null;
      if (result && candleSource) {
        newOutcomes['24h'] = { ...result.outcome, resolvedAt, source: candleSource };
        mae24h = result.maxAdverseExcursion;
        changed = true;
      } else if (age >= TWENTY_FOUR_HOURS_MS * 2) {
        newOutcomes['24h'] = { price: record.entryPrice, pnlPct: 0, hit: false, target: 'expired', resolvedAt, source: 'force-expired' };
        changed = true;
      }
    }

    if (changed) {
      updates.push({
        id: record.id,
        patch: {
          outcomes: newOutcomes,
          lastVerified: now,
          ...(mae24h !== null ? { maxAdverseExcursion: mae24h } : {}),
        },
      });
    }
  }

  const resolved = await updateRecordsAsync(updates);
  return { resolved, pending: pending.length - resolved, errors };
}

// ── Telegram posted callback ──────────────────────────────────

async function handleTelegramCallback(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json() as { signalId?: string; messageId?: number };
    if (body.signalId && body.messageId) {
      await markTelegramPosted(body.signalId, body.messageId);
      return NextResponse.json({ ok: true, marked: body.signalId });
    }
    return NextResponse.json({ error: 'Missing signalId or messageId' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}

// ── Route handler ─────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  const runStartedAt = new Date();

  // Warm the signal cache so the request path can serve from Redis
  // instead of running the TA engine synchronously.
  await precomputeSignals();

  try {
    const preset = getActivePreset();
    const { candidates, effectiveStrategyId } = await collectNewSignals(preset.id);

    // The Pro-broadcast catch-up query (telegram_pro_message_id IS NULL) is
    // gone with the tier system — the gate decision now covers only the
    // fresh candidates recorded this tick.

    // Phase 1 re-sequence: ONE gate decision per tick, computed BEFORE
    // persistence. The decision (risk pipeline: circuit breakers + allocator
    // + veto + LLM advisory) is recorded on
    // each row so the scope=broadcast subset is measurable. Pipeline
    // failure falls back to "no decision computed": those rows record
    // NULL because the gate never actually ran, and remain blocked this tick.
    const broadcastInputs: NewlyRecordedSignal[] = [...candidates];
    // computeBroadcastDecisions guards its internals (regime fetch + pipeline),
    // but an unexpected throw here must not skip recording/resolution — fall
    // back to "no decision computed": rows record NULL and fail closed.
    let decisions: Awaited<ReturnType<typeof computeBroadcastDecisions>>;
    try {
      decisions = await computeBroadcastDecisions(broadcastInputs);
    } catch (err) {
      console.warn(
        '[cron/signals] Broadcast decision computation failed entirely — recording without decisions and blocking broadcast:',
        err instanceof Error ? err.message : String(err),
      );
      decisions = new Map(
        broadcastInputs.map((s) => [s.id, {
          id: s.id,
          blocked: true,
          blockReason: 'broadcast_decision_unavailable',
          recordable: false,
        }]),
      );
    }
    const outageCount = [...decisions.values()].filter((d) => !d.recordable).length;
    if (outageCount > 0) {
      console.warn(`[cron/signals] ${outageCount} signal(s) blocked by decision outage this tick — no gate decision recorded (rows stay NULL and are excluded from scope=broadcast)`);
    }

    // Record new candidates with their decision inline.
    const newSignals: NewlyRecordedSignal[] = [];
    for (const sig of candidates) {
      const d = decisions.get(sig.id);
      // Calibration features (Phase 4 D4). cost_estimate_pct is universal — every
      // recorded cron row gets it. The MTF triple is only present on TA-fallback
      // rows; scanner rows carry undefined and record NULL (honest, expected).
      await recordSignalAsync(
        sig.symbol,
        sig.timeframe,
        sig.direction,
        sig.confidence,
        sig.entry,
        sig.id,
        sig.takeProfit1,
        sig.stopLoss,
        sig.timestamp,
        effectiveStrategyId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        d && d.recordable
          ? { regime: d.regime, blocked: d.blocked, blockReason: d.blockReason, allocationPct: d.allocationPct }
          : undefined,
        {
          preBoostConfidence: sig.preBoostConfidence,
          mtfAgreement: sig.mtfAgreement,
          confluenceBonus: sig.confluenceBonus,
          costEstimatePct: estimateRoundTripCostPct(sig.symbol),
        },
      );
      newSignals.push(sig);
    }

    // Separately registered, operator-gated, and never allowed to abort the
    // existing live-signal recording or resolution path.
    const d1SlowGate = await runD1LaneSafely();

    const { resolved, pending, errors } = await resolveOldSignals();

    const taggedSignals = newSignals.map((s) => ({ ...s, strategyId: preset.id }));

    // The Pro Telegram broadcast is gone (everything is free — the public
    // channel broadcast lives in /api/cron/telegram). The gate decision is
    // still computed and recorded per row so scope=broadcast analytics stay
    // measurable.
    const vetoedCount = [...decisions.values()].filter((d) => d.blocked).length;
    if (vetoedCount > 0) {
      console.warn(`[cron/signals] Risk pipeline vetoed ${vetoedCount} signal(s) — decisions recorded on rows`);
    }
    const evaluatedCount = decisions.size;
    const broadcastableCount = broadcastInputs
      .filter((s) => decisions.get(s.id)?.blocked === false)
      .length;

    const auditRowId = await recordSignalRun({
      runStartedAt,
      triggerSource: request.headers.get('user-agent')?.includes('GitHub') ? 'github-actions' : 'cron',
      notes: `recorded=${taggedSignals.length} resolved=${resolved} pending=${pending} d1SlowGateMode=${d1SlowGate.mode} d1SlowGateRecorded=${d1SlowGate.recorded} d1SlowGateFailures=${d1SlowGate.failures.length}`,
    });

    return NextResponse.json({
      ok: true,
      recorded: taggedSignals.length,
      newSignals: taggedSignals,
      resolved,
      pending,
      errors: errors.length > 0 ? errors : undefined,
      d1Paper: d1SlowGate,
      d1SlowGate,
      // Gate-decision observability — how many of this tick's candidates
      // were evaluated and how many the risk pipeline approved.
      gate: {
        evaluatedCount,
        broadcastableCount,
      },
      strategyId: preset.id,
      timestamp: new Date().toISOString(),
      auditRowId: auditRowId !== null ? auditRowId.toString() : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  // If body has signalId + messageId, it's a telegram posted callback
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const cloned = request.clone();
    try {
      const body = await cloned.json() as Record<string, unknown>;
      if (body.signalId && body.messageId) {
        return handleTelegramCallback(request);
      }
    } catch { /* not JSON or no signalId — fall through to normal cron */ }
  }

  return GET(request);
}
