import { NextRequest, NextResponse } from 'next/server';
import { getSignals } from '../../../lib/signals';
import { getOHLCV } from '../../../lib/ohlcv';
import { isMarketOpen } from '../../../lib/market-hours';
import {
  recordSignal,
  getRecentRecordForSymbol,
  getPendingRecords,
  getOutcomeResolutionTimeframe,
  updateRecords,
  type SignalHistoryRecord,
  type SignalOutcome,
} from '../../../../lib/signal-history';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from '../../../../lib/signal-thresholds';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// ── Auth guard ────────────────────────────────────────────────

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // If CRON_SECRET is not set, allow unauthenticated access (dev mode)
  if (!secret) return true;

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

async function recordNewSignals(): Promise<NewlyRecordedSignal[]> {
  const { signals } = await getSignals({ minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE });
  const recorded: NewlyRecordedSignal[] = [];

  for (const sig of signals) {
    if (sig.dataQuality !== 'real') continue;

    // Skip signals for markets that are currently closed (e.g. forex on weekends)
    if (!isMarketOpen(sig.symbol)) continue;

    const existing = getRecentRecordForSymbol(sig.symbol, sig.direction, TWO_HOURS_MS);
    if (existing) continue;

    const timestamp = Date.now();
    const id = `${sig.symbol}-${sig.timeframe}-${timestamp}`;
    recordSignal(
      sig.symbol,
      sig.timeframe,
      sig.direction,
      sig.confidence,
      sig.entry,
      id,
      sig.takeProfit1,
      sig.stopLoss,
      timestamp,
    );

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
  candles: Array<{ high: number; low: number }>,
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
  return null;
}

async function resolveOldSignals(): Promise<{ resolved: number; pending: number }> {
  const pending = getPendingRecords();
  const now = Date.now();
  const updates: Array<{ id: string; patch: Partial<SignalHistoryRecord> }> = [];

  for (const record of pending) {
    const age = now - record.timestamp;
    const needs4h = record.outcomes['4h'] === null && age >= FOUR_HOURS_MS;
    const needs24h = record.outcomes['24h'] === null && age >= TWENTY_FOUR_HOURS_MS;
    if (!needs4h && !needs24h) continue;
    if (!record.tp1 || !record.sl) continue;

    try {
      const { candles } = await getOHLCV(
        record.pair,
        getOutcomeResolutionTimeframe(record.timeframe),
      );
      const newOutcomes = { ...record.outcomes };
      let changed = false;

      if (needs4h) {
        const windowEnd = record.timestamp + FOUR_HOURS_MS;
        const window = candles.filter(
          c => c.timestamp > record.timestamp && c.timestamp <= windowEnd,
        );
        const result = resolveWindow(record, window);
        if (result) {
          newOutcomes['4h'] = result;
          changed = true;
        }
      }

      if (needs24h) {
        const windowEnd = record.timestamp + TWENTY_FOUR_HOURS_MS;
        const window = candles.filter(
          c => c.timestamp > record.timestamp && c.timestamp <= windowEnd,
        );
        const result = resolveWindow(record, window);
        if (result) {
          newOutcomes['24h'] = result;
          changed = true;
        }
      }

      if (changed) {
        updates.push({
          id: record.id,
          patch: { outcomes: newOutcomes, lastVerified: now },
        });
      }
    } catch {
      // Skip if OHLCV fetch fails for this symbol
    }
  }

  const resolved = updateRecords(updates);
  return { resolved, pending: pending.length - resolved };
}

// ── Route handler ─────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const newSignals = await recordNewSignals();
    const { resolved, pending } = await resolveOldSignals();

    return NextResponse.json({
      ok: true,
      recorded: newSignals.length,
      newSignals,
      resolved,
      pending,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  return GET(request);
}
