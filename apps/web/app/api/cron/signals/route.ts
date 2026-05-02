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

    const timestamp = Date.now();
    const id = `${sig.symbol}-${sig.timeframe}-${timestamp}`;
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

  try {
    const preset = getActivePreset();
    const newSignals = await recordNewSignals(preset.id);
    const { resolved, pending, errors } = await resolveOldSignals();

    const taggedSignals = newSignals.map((s) => ({ ...s, strategyId: preset.id }));

    // Pro Telegram broadcast — fire on the deterministic 5-min cron cadence
    // so the Pro group receives signals even during free-traffic droughts.
    // Only NEW rows are broadcast (recordNewSignals already deduped against
    // signal_history within the 2h symbol+direction window), so duplicate
    // posts to the group are not possible here. Apply the winning-cells
    // gate so we don't broadcast cells the publish layer would have
    // suppressed for free; Pro response-time bypass lives in
    // tracked-signals.ts and does not apply to the channel broadcast.
    if (newSignals.length > 0) {
      const winningCellsActive = getWinningCellsMode() === 'active';
      const broadcastable = newSignals
        .filter((s) =>
          !winningCellsActive || isWinningCell(s.symbol, s.direction),
        )
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

    return NextResponse.json({
      ok: true,
      recorded: taggedSignals.length,
      newSignals: taggedSignals,
      resolved,
      pending,
      errors: errors.length > 0 ? errors : undefined,
      strategyId: preset.id,
      timestamp: new Date().toISOString(),
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
