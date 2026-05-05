import { NextRequest, NextResponse } from 'next/server';
import { getOHLCV } from '../../../lib/ohlcv';
import { isMarketOpen } from '../../../lib/market-hours';
import { getSignals } from '../../../lib/signals';
import { getActivePreset } from './preset-dispatch';
import {
  recordSignalAsync,
  getRecentRecordForSymbolAsync,
  getPendingRecordsAsync,
  updateRecordsAsync,
  markTelegramPosted,
  type SignalHistoryRecord,
  type SignalOutcome,
} from '../../../../lib/signal-history';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from '../../../../lib/signal-thresholds';
import { broadcastSignalsToProGroup } from '../../../../lib/telegram-pro-broadcast';
import { isWinningCell, getWinningCellsMode } from '../../../../lib/winning-cells';
import { runRiskPipeline } from '../../../../lib/risk-pipeline';
import { fetchRegimeMap } from '../../../../lib/regime-filter';
import { recordSignalRun } from '../../../../lib/signal-run-log';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// ── Auth guard ────────────────────────────────────────────────

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }
  const header = request.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

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
};

async function recordNewSignals(strategyId: string): Promise<NewlyRecordedSignal[]> {
  const { signals: rawSignals } = await getSignals({ minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE });
  // Mirror the production filter in tracked-signals.ts: real data only, above the
  // publish threshold. live_signals is empty in production, so we pull directly
  // from the TA engine just like getTrackedSignals does.
  const signals = rawSignals.filter(
    (s) => s.dataQuality === 'real' && s.confidence >= PUBLISHED_SIGNAL_MIN_CONFIDENCE,
  );
  const recorded: NewlyRecordedSignal[] = [];

  // Track symbols already recorded in this run to prevent dupes within a batch
  const recordedThisRun = new Set<string>();

  // Pick the best signal per symbol+direction (highest confidence)
  const bestBySymDir = new Map<string, typeof signals[number]>();
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
    if (recordedThisRun.has(dedupKey)) continue;

    const existing = await getRecentRecordForSymbolAsync(sig.symbol, sig.direction, TWO_HOURS_MS);
    if (existing) continue;

    // Use the canonical id from the TA engine (`SIG-{sym}-{tf}-{dir}-{candleTs36}`)
    // so this writer collides on ON CONFLICT(id) with the request-side writer
    // in tracked-signals.ts. Before unification the two writers used different
    // id formats and silently produced two rows per candle, double-counting in
    // the leaderboard. Persist the candle bar timestamp too so resolution
    // windows align with the bar the signal was actually issued for.
    const id = sig.id;
    const parsedCandleTs = Date.parse(sig.timestamp);
    const timestamp = Number.isFinite(parsedCandleTs) ? parsedCandleTs : Date.now();
    await recordSignalAsync(
      sig.symbol,
      sig.timeframe,
      sig.direction,
      sig.confidence,
      sig.entry,
      id,
      sig.takeProfit1,
      sig.stopLoss,
      timestamp,
      strategyId,
    );

    recordedThisRun.add(dedupKey);

    recorded.push({
      id,
      symbol: sig.symbol,
      timeframe: sig.timeframe,
      direction: sig.direction,
      confidence: sig.confidence,
      entry: sig.entry,
      takeProfit1: sig.takeProfit1,
      stopLoss: sig.stopLoss,
      timestamp,
    });
  }

  return recorded;
}

// ── Resolve logic ─────────────────────────────────────────────

function resolveWindow(
  record: SignalHistoryRecord,
  candles: Array<{ high: number; low: number; close?: number }>,
  windowComplete: boolean,
): SignalOutcome | null {
  if (!record.tp1 || !record.sl) return null;

  for (const candle of candles) {
    if (record.direction === 'BUY') {
      if (candle.high >= record.tp1) {
        const pnlPct = +((record.tp1 - record.entryPrice) / record.entryPrice * 100).toFixed(2);
        return { price: record.tp1, pnlPct, hit: true };
      }
      if (candle.low <= record.sl) {
        const pnlPct = +((record.sl - record.entryPrice) / record.entryPrice * 100).toFixed(2);
        return { price: record.sl, pnlPct, hit: false };
      }
    } else {
      if (candle.low <= record.tp1) {
        const pnlPct = +((record.entryPrice - record.tp1) / record.entryPrice * 100).toFixed(2);
        return { price: record.tp1, pnlPct, hit: true };
      }
      if (candle.high >= record.sl) {
        const pnlPct = +((record.entryPrice - record.sl) / record.entryPrice * 100).toFixed(2);
        return { price: record.sl, pnlPct, hit: false };
      }
    }
  }

  // Window elapsed but neither TP nor SL hit — close at last candle's price
  if (windowComplete && candles.length > 0) {
    const lastClose = candles[candles.length - 1].close;
    if (lastClose != null) {
      const pnlPct = record.direction === 'BUY'
        ? +((lastClose - record.entryPrice) / record.entryPrice * 100).toFixed(2)
        : +((record.entryPrice - lastClose) / record.entryPrice * 100).toFixed(2);
      return { price: lastClose, pnlPct, hit: pnlPct > 0 };
    }
  }

  return null;
}

async function resolveOldSignals(): Promise<{ resolved: number; pending: number; errors: string[] }> {
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

    try {
      const result = await getOHLCV(record.pair, 'H1');
      candles = result.candles;
    } catch (err) {
      const msg = `OHLCV fetch failed for ${record.pair}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[cron/signals] ${msg}`);
      errors.push(msg);
    }

    const newOutcomes = { ...record.outcomes };
    let changed = false;

    if (needs4h) {
      const windowEnd = record.timestamp + FOUR_HOURS_MS;
      const window = candles.filter(
        c => c.timestamp > record.timestamp && c.timestamp <= windowEnd,
      );
      const windowComplete = age >= FOUR_HOURS_MS;
      const result = resolveWindow(record, window, windowComplete);
      if (result) {
        newOutcomes['4h'] = result;
        changed = true;
      } else if (age >= FOUR_HOURS_MS * 2) {
        newOutcomes['4h'] = { price: record.entryPrice, pnlPct: 0, hit: false };
        changed = true;
      }
    }

    if (needs24h) {
      const windowEnd = record.timestamp + TWENTY_FOUR_HOURS_MS;
      const window = candles.filter(
        c => c.timestamp > record.timestamp && c.timestamp <= windowEnd,
      );
      const windowComplete = age >= TWENTY_FOUR_HOURS_MS;
      const result = resolveWindow(record, window, windowComplete);
      if (result) {
        newOutcomes['24h'] = result;
        changed = true;
      } else if (age >= TWENTY_FOUR_HOURS_MS * 2) {
        newOutcomes['24h'] = { price: record.entryPrice, pnlPct: 0, hit: false };
        changed = true;
      }
    }

    if (changed) {
      updates.push({ id: record.id, patch: { outcomes: newOutcomes, lastVerified: now } });
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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const runStartedAt = new Date();
  try {
    const preset = getActivePreset();
    const newSignals = await recordNewSignals(preset.id);
    const { resolved, pending, errors } = await resolveOldSignals();

    const taggedSignals = newSignals.map((s) => ({ ...s, strategyId: preset.id }));

    // Pro Telegram broadcast — fire on the deterministic 5-min cron cadence.
    // After the duplicate-spam audit (2026-05-03) this is the SINGLE source
    // of Pro broadcasts: the request-side path in tracked-signals.ts was
    // removed, and the dedup gate inside broadcastSignalsToProGroup catches
    // any retries. Pipeline order:
    //   winning-cells curation → risk pipeline (allocator + circuit breakers
    //   + LLM advisory) → broadcast.
    // Risk pipeline mirrors the free channel's safety filter so Pro buyers
    // are not exposed to signals the system itself flagged as drawdown-risky.
    // Pipeline failure falls back to unfiltered broadcast — Pro's value prop
    // is real-time delivery, so a transient risk-state outage must not
    // silently mute the channel.
    if (newSignals.length > 0) {
      const winningCellsActive = getWinningCellsMode() === 'active';
      const curated = newSignals.filter((s) =>
        !winningCellsActive || isWinningCell(s.symbol, s.direction),
      );

      let approvedIds: Set<string> | null = null;
      try {
        const regimeMap = await fetchRegimeMap();
        const riskResult = await runRiskPipeline(
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
        approvedIds = new Set(riskResult.approved.map((s) => s.id));
        if (riskResult.vetoed.length > 0) {
          console.warn(
            `[cron/signals] Risk pipeline vetoed ${riskResult.vetoed.length} Pro signal(s):`,
            riskResult.vetoed.map((v) => `${v.signal.symbol}:${v.reason}`).join('; '),
          );
        }
      } catch (err) {
        console.warn(
          '[cron/signals] Risk pipeline failed, broadcasting curated signals unfiltered:',
          err instanceof Error ? err.message : String(err),
        );
      }

      const broadcastable = curated
        .filter((s) => approvedIds === null || approvedIds.has(s.id))
        .map((s) => ({
          id: s.id,
          symbol: s.symbol,
          timeframe: s.timeframe,
          direction: s.direction,
          confidence: s.confidence,
          entry: s.entry,
          takeProfit1: s.takeProfit1,
          stopLoss: s.stopLoss,
          gateBlocked: false,
        }));
      if (broadcastable.length > 0) {
        broadcastSignalsToProGroup(broadcastable).catch(() => undefined);
      }
    }

    const auditRowId = await recordSignalRun({
      runStartedAt,
      triggerSource: request.headers.get('user-agent')?.includes('GitHub') ? 'github-actions' : 'cron',
      notes: `recorded=${taggedSignals.length} resolved=${resolved} pending=${pending}`,
    });

    return NextResponse.json({
      ok: true,
      recorded: taggedSignals.length,
      newSignals: taggedSignals,
      resolved,
      pending,
      errors: errors.length > 0 ? errors : undefined,
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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
