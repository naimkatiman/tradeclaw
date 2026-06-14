import 'server-only';

import { query, queryOne, execute } from './db-pool';
import { FREE_SYMBOLS } from './tier';
import { sendDiscordWebhook, type AlertSignal } from './alert-channels';

/**
 * Env-keyed Discord broadcaster for TradeClaw's own generated signals (issue #38).
 *
 * Distinct from:
 *   - apps/web/app/api/tradingview/webhook (forwards INBOUND TradingView alerts)
 *   - lib/alert-channels per-user Discord config (keyed off a stored webhookUrl)
 *
 * This posts the same free-tier signals broadcast to the public Telegram channel,
 * color-coded via formatDiscordEmbed (BUY green / SELL red), deduped via the
 * discord_posted_at column so each (pair, direction) is posted at most once per
 * 2h window — even across serverless cron invocations.
 */

interface PendingRow {
  id: string;
  pair: string;
  direction: string;
  confidence: number;
  entry_price: string;
  tp1: string | null;
  sl: string | null;
  timeframe: string;
}

/** Map a signal_history row to the AlertSignal shape formatDiscordEmbed expects. */
export function rowToAlertSignal(row: PendingRow): AlertSignal {
  return {
    id: row.id,
    symbol: row.pair,
    direction: row.direction === 'SELL' ? 'SELL' : 'BUY',
    confidence: row.confidence,
    timeframe: row.timeframe,
    entry: row.entry_price,
    takeProfit1: row.tp1,
    stopLoss: row.sl,
  };
}

export interface DiscordBroadcastResult {
  posted: number;
  attempted: number;
}

export async function broadcastSignalsToDiscord(webhookUrl: string): Promise<DiscordBroadcastResult> {
  // One row per (pair, direction): same free-symbol / confidence / age filters as
  // the Telegram public push, but gated on discord_posted_at so the two channels
  // keep independent ledgers. The NOT EXISTS guard suppresses a sibling timeframe
  // of the same (pair, direction) already posted inside the 2h window.
  const pending = await query<PendingRow>(
    `
    SELECT DISTINCT ON (pair, direction)
           id, pair, direction, confidence, entry_price, tp1, sl, timeframe
    FROM signal_history sh
    WHERE discord_posted_at IS NULL
      AND is_simulated = false
      AND pair = ANY($1)
      AND confidence >= 80
      AND created_at >= NOW() - INTERVAL '2 hours'
      AND created_at <= NOW() - INTERVAL '30 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM signal_history sib
        WHERE sib.pair = sh.pair
          AND sib.direction = sh.direction
          AND sib.discord_posted_at IS NOT NULL
          AND sib.discord_posted_at >= NOW() - INTERVAL '2 hours'
      )
    ORDER BY pair, direction, confidence DESC, created_at DESC
    LIMIT 10
    `,
    [[...FREE_SYMBOLS]],
  );

  let posted = 0;
  for (const row of pending) {
    // Atomically claim the row before sending. The sync timer double-fires
    // inside the 4h slot (~:00 and ~:05), so two invocations can select the
    // same row; the conditional UPDATE ... WHERE discord_posted_at IS NULL
    // ensures only one wins. Release the claim on send failure so the next
    // run retries it (keeps the file's "at most once per 2h window" contract).
    const claim = await queryOne<{ id: string }>(
      `UPDATE signal_history SET discord_posted_at = NOW()
       WHERE id = $1 AND discord_posted_at IS NULL
       RETURNING id`,
      [row.id],
    );
    if (!claim) continue;

    const ok = await sendDiscordWebhook({ webhookUrl }, rowToAlertSignal(row));
    if (ok) {
      posted++;
    } else {
      await execute(`UPDATE signal_history SET discord_posted_at = NULL WHERE id = $1`, [row.id]);
    }
  }

  return { posted, attempted: pending.length };
}
