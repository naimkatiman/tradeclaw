import { NextResponse } from 'next/server';
import { getOHLCV } from '../../../lib/ohlcv';
import {
  getPendingRecordsAsync,
  updateRecordsAsync,
  type SignalHistoryRecord,
  type SignalOutcome,
} from '../../../../lib/signal-history';

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Resolve a signal against a window of candles.
 * For BUY: TP1 hit when candle high >= tp1, SL hit when candle low <= sl.
 * For SELL: TP1 hit when candle low <= tp1, SL hit when candle high >= sl.
 * Returns null if neither TP1 nor SL was hit in the window.
 */
function resolveWindow(
  record: SignalHistoryRecord,
  candles: Array<{ high: number; low: number; close?: number; timestamp: number }>,
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

  // Window fully elapsed but neither TP nor SL hit — close at last candle's price
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

/**
 * POST /api/signals/resolve
 *
 * Read all pending signal records that are old enough (>= 4h for 4h window,
 * >= 24h for 24h window), fetch OHLCV candles, and resolve outcomes.
 *
 * If candle data doesn't cover the signal's time window (empty window),
 * force-expire after 2x the window duration to prevent signals from being
 * stuck in "pending" forever.
 */
export async function POST(): Promise<Response> {
  try {
    const pending = await getPendingRecordsAsync();
    const now = Date.now();

    const updates: Array<{ id: string; patch: Partial<SignalHistoryRecord> }> = [];
    const errors: string[] = [];

    // Deduplicate OHLCV fetches by symbol
    const ohlcvCache = new Map<string, { candles: Array<{ timestamp: number; high: number; low: number; close: number; open: number; volume: number }>; failed: boolean }>();

    for (const record of pending) {
      const age = now - record.timestamp;

      // Only resolve windows that are old enough
      const needs4h = record.outcomes['4h'] === null && age >= FOUR_HOURS_MS;
      const needs24h = record.outcomes['24h'] === null && age >= TWENTY_FOUR_HOURS_MS;

      if (!needs4h && !needs24h) continue;
      if (!record.tp1 || !record.sl) continue;

      // Fetch OHLCV once per symbol
      if (!ohlcvCache.has(record.pair)) {
        let candles: Array<{ timestamp: number; high: number; low: number; close: number; open: number; volume: number }> = [];
        let failed = false;
        try {
          const result = await getOHLCV(record.pair, 'H1');
          candles = result.candles;
        } catch (err) {
          const msg = `OHLCV fetch failed for ${record.pair}: ${err instanceof Error ? err.message : String(err)}`;
          console.error(`[signals/resolve] ${msg}`);
          errors.push(msg);
          failed = true;
        }
        ohlcvCache.set(record.pair, { candles, failed });
      }

      const { candles, failed: ohlcvFailed } = ohlcvCache.get(record.pair)!;

      const newOutcomes = { ...record.outcomes };
      let changed = false;

      if (needs4h) {
        const windowEnd = record.timestamp + FOUR_HOURS_MS;
        const window = candles.filter(
          c => c.timestamp > record.timestamp && c.timestamp <= windowEnd,
        );
        const result = resolveWindow(record, window, true);
        if (result) {
          newOutcomes['4h'] = result;
          changed = true;
        } else if (age >= FOUR_HOURS_MS * 2) {
          // Force-expire: either OHLCV failed or candle window is empty
          // (data doesn't cover signal time range). Mark as expired at entry.
          newOutcomes['4h'] = { price: record.entryPrice, pnlPct: 0, hit: false };
          changed = true;
          if (!ohlcvFailed && window.length === 0) {
            console.warn(`[signals/resolve] Empty 4h candle window for ${record.id} (${candles.length} total candles, none in range)`);
          }
        }
      }

      if (needs24h) {
        const windowEnd = record.timestamp + TWENTY_FOUR_HOURS_MS;
        const window = candles.filter(
          c => c.timestamp > record.timestamp && c.timestamp <= windowEnd,
        );
        const result = resolveWindow(record, window, true);
        if (result) {
          newOutcomes['24h'] = result;
          changed = true;
        } else if (age >= TWENTY_FOUR_HOURS_MS * 2) {
          // Force-expire: candle data unavailable or doesn't cover the window.
          newOutcomes['24h'] = { price: record.entryPrice, pnlPct: 0, hit: false };
          changed = true;
          if (!ohlcvFailed && window.length === 0) {
            console.warn(`[signals/resolve] Empty 24h candle window for ${record.id} (${candles.length} total candles, none in range)`);
          }
        }
      }

      if (changed) {
        updates.push({
          id: record.id,
          patch: {
            outcomes: newOutcomes,
            lastVerified: now,
          },
        });
      }
    }

    const resolved = await updateRecordsAsync(updates);
    const stillPending = pending.length - resolved;

    return NextResponse.json({ resolved, stillPending, errors: errors.length > 0 ? errors : undefined });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(): Promise<Response> {
  return POST();
}
