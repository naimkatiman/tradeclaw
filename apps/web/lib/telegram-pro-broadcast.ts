import 'server-only';

import { getBotToken, getProGroupId, getProSignalsTopicId } from './telegram-channels';
import { getSignalTelegramProMessageId, markTelegramProPosted } from './signal-history';
import { recordBroadcastResult } from './observability';

/**
 * Pro-tier real-time broadcast.
 *
 * Posts each tradable signal to the private Pro Telegram group as it is
 * recorded by `tracked-signals.ts`. Free tier broadcasts run on a separate
 * 4-hour cron (`/api/cron/telegram`) with a 15-minute publish delay; this
 * path is the real-time delivery the pricing page promises Pro buyers.
 *
 * Fire-and-forget. Failures are logged but do not block the calling path —
 * Telegram going down must not break signal recording.
 *
 * Skipped silently when:
 *   - TELEGRAM_BOT_TOKEN or TELEGRAM_PRO_GROUP_ID is not configured
 *   - The signal is gate_blocked (winning-cells filter, full-risk-gate, etc.)
 */

const TELEGRAM_API = 'https://api.telegram.org';

export interface ProBroadcastSignal {
  id: string;
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number | string;
  stopLoss: number | string | null | undefined;
  takeProfit1: number | string | null | undefined;
  takeProfit2?: number | string | null;
  takeProfit3?: number | string | null;
  gateBlocked: boolean;
}

function md(text: string): string {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function formatPrice(p: number | string | null | undefined): string {
  if (p == null) return '—';
  const n = typeof p === 'number' ? p : Number(p);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(5);
}

export function formatProMessage(sig: ProBroadcastSignal): string {
  const dirEmoji = sig.direction === 'BUY' ? '\u{1F4C8}' : '\u{1F4C9}';
  const lines: string[] = [
    `\u{1F4E1} *${md('TradeClaw Pro Signal')}*`,
    '',
    `${dirEmoji} *${md(sig.direction)} ${md(sig.symbol)} \\- ${md(sig.timeframe)}*`,
    `Confidence: ${md(String(sig.confidence))}%`,
    '',
    `\u{1F539}Entry: \\$${md(formatPrice(sig.entry))}`,
    '',
    `\u{1F4B0}TP1 ${md(formatPrice(sig.takeProfit1))}`,
  ];
  if (sig.takeProfit2 != null) lines.push(`\u{1F4B0}TP2 ${md(formatPrice(sig.takeProfit2))}`);
  if (sig.takeProfit3 != null) lines.push(`\u{1F4B0}TP3 ${md(formatPrice(sig.takeProfit3))}`);
  lines.push(`\u{1F6AB}SL ${md(formatPrice(sig.stopLoss))}`);
  lines.push('', `⚠️ _Not financial advice\\. DYOR\\._`);
  return lines.join('\n');
}

export interface ProBroadcastResult {
  attempted: number;
  sent: number;
  failed: number;
  skipped?: number;
  reason?: 'no_bot_token' | 'no_pro_group' | 'no_signals';
}

/**
 * Post each tradable signal to the Pro Telegram group.
 *
 * Returns a per-call summary; never throws. The caller (tracked-signals.ts)
 * runs this fire-and-forget so signal recording is never blocked by a
 * Telegram outage.
 */
export async function broadcastSignalsToProGroup(
  signals: ProBroadcastSignal[],
): Promise<ProBroadcastResult> {
  const tradable = signals.filter((s) => !s.gateBlocked);
  if (tradable.length === 0) {
    const result: ProBroadcastResult = { attempted: 0, sent: 0, failed: 0, reason: 'no_signals' };
    recordBroadcastResult({ source: 'telegram_pro_broadcast', ...result });
    return result;
  }

  const token = getBotToken();
  if (!token) {
    const result: ProBroadcastResult = { attempted: 0, sent: 0, failed: 0, reason: 'no_bot_token' };
    recordBroadcastResult({ source: 'telegram_pro_broadcast', ...result });
    return result;
  }

  const chatId = getProGroupId();
  if (!chatId) {
    const result: ProBroadcastResult = { attempted: 0, sent: 0, failed: 0, reason: 'no_pro_group' };
    recordBroadcastResult({ source: 'telegram_pro_broadcast', ...result });
    return result;
  }

  // Optional forum topic — when the Pro group is a forum supergroup, route
  // signals into the dedicated Signals topic so the General/Admin topics
  // stay readable. Null = post to group root (works for non-forum groups).
  const signalsTopicId = getProSignalsTopicId();

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const sig of tradable) {
    // Dedup gate: if this signal id was already posted to the Pro group,
    // skip. Mirrors the free channel's `telegram_posted_at IS NULL` filter
    // in /api/cron/telegram. Without this, request side-effects (paid hits
    // to /api/signals) and the 5-min cron broadcast the same signal id
    // every time the row is re-processed.
    let alreadyPosted = false;
    try {
      const existing = await getSignalTelegramProMessageId(sig.id);
      alreadyPosted = existing !== undefined;
    } catch {
      alreadyPosted = false;
    }
    if (alreadyPosted) {
      skipped++;
      continue;
    }

    try {
      const body: Record<string, unknown> = {
        chat_id: chatId,
        text: formatProMessage(sig),
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      };
      if (signalsTopicId !== null) body.message_thread_id = signalsTopicId;

      const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
      const data = (await res.json()) as {
        ok: boolean;
        result?: { message_id: number };
        description?: string;
      };
      if (data.ok) {
        sent++;
        // Persist message_id so the position-monitor cron can post TP/SL
        // outcome replies threaded under the original signal in the Pro
        // group. Uses telegram_pro_message_id, separate from the free
        // channel's telegram_message_id field — different chat_ids,
        // different message_id namespaces.
        const msgId = data.result?.message_id;
        if (msgId) {
          markTelegramProPosted(sig.id, msgId).catch(() => undefined);
        }
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  const result: ProBroadcastResult = { attempted: tradable.length, sent, failed, skipped };
  recordBroadcastResult({ source: 'telegram_pro_broadcast', ...result });
  return result;
}
