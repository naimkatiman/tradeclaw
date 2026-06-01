import { NextRequest, NextResponse } from 'next/server';
import { broadcastTopSignals } from '../../../../lib/telegram-broadcast';
import { query, execute } from '../../../../lib/db-pool';
import { FREE_SYMBOLS } from '../../../../lib/tier';
import { getBotToken, getFreeChannelId } from '../../../../lib/telegram-channels';
import { requireCronAuth } from '../../../../lib/cron-auth';
import { broadcastSignalsToDiscord } from '../../../../lib/discord-broadcast';

// ---------------------------------------------------------------------------
// GET /api/cron/telegram — Vercel Cron handler (every 4 hours)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  try {
    // Resolved through lib/telegram-channels so the legacy var names
    // (TELEGRAM_CHANNEL_ID, TELEGRAM_PUBLIC_CHANNEL_ID) still work but
    // TELEGRAM_FREE_CHANNEL_ID is the canonical name going forward.
    const botToken = getBotToken();
    const channelId = getFreeChannelId();
    const discordWebhook = process.env.DISCORD_WEBHOOK_URL || null;
    const telegramConfigured = Boolean(botToken && channelId);

    if (!telegramConfigured && !discordWebhook) {
      return NextResponse.json(
        { ok: false, error: 'No broadcast channel configured (set TELEGRAM_BOT_TOKEN + TELEGRAM_FREE_CHANNEL_ID and/or DISCORD_WEBHOOK_URL)' },
        { status: 503 },
      );
    }

    let telegramOk = false;
    let telegramMessageId: number | null = null;
    let telegramError: string | null = null;
    if (telegramConfigured) {
      const result = await broadcastTopSignals(channelId!, botToken!, { freeOnly: true });
      telegramOk = result.success;
      telegramMessageId = result.messageId ?? null;
      telegramError = result.error ?? null;
    }

    // Delayed public channel push — free-tier symbols only, 30+ min old.
    // Same channel as the broadcast above; resolved through the same path.
    const publicChannelId = channelId;
    let publicPushed = 0;
    if (publicChannelId && botToken) {
      // One post per (pair, direction) per 2h window. Without DISTINCT ON the
      // request-side writer in tracked-signals.ts (which records per-id, so
      // H1 + M15 of the same BTCUSD SELL coexist) caused two messages in the
      // same minute. The NOT EXISTS guard suppresses the duplicate timeframe
      // even on later cron ticks while a sibling sits in the 2h window.
      const pending = await query<{
        id: string; pair: string; direction: string; confidence: number;
        entry_price: string; tp1: string | null; sl: string | null; timeframe: string;
      }>(`
        SELECT DISTINCT ON (pair, direction)
               id, pair, direction, confidence, entry_price, tp1, sl, timeframe
        FROM signal_history sh
        WHERE telegram_posted_at IS NULL
          AND is_simulated = false
          AND pair = ANY($1)
          AND confidence >= 80
          AND created_at >= NOW() - INTERVAL '2 hours'
          AND created_at <= NOW() - INTERVAL '30 minutes'
          AND NOT EXISTS (
            SELECT 1 FROM signal_history sib
            WHERE sib.pair = sh.pair
              AND sib.direction = sh.direction
              AND sib.telegram_posted_at IS NOT NULL
              AND sib.telegram_posted_at >= NOW() - INTERVAL '2 hours'
          )
        ORDER BY pair, direction, confidence DESC, created_at DESC
        LIMIT 10
      `, [[...FREE_SYMBOLS]]);

      for (const sig of pending) {
        const decimals = sig.pair.includes('JPY') ? 3 : 5;
        const emoji = sig.direction === 'BUY' ? '\u{1F7E2}' : '\u{1F534}';
        const text = [
          `${emoji} <b>${sig.pair} ${sig.direction}</b>`,
          `Entry: ${Number(sig.entry_price).toFixed(decimals)}`,
          sig.tp1 ? `TP1: ${Number(sig.tp1).toFixed(decimals)}` : null,
          sig.sl ? `SL: ${Number(sig.sl).toFixed(decimals)}` : null,
          `Confidence: ${sig.confidence}%`,
          `TF: ${sig.timeframe}`,
          '',
          `<a href="https://tradeclaw.win/track-record">Track Record</a> | <a href="https://tradeclaw.win/pricing">Upgrade to Pro</a>`,
        ].filter(Boolean).join('\n');

        try {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: publicChannelId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
          });
          if (res.ok) {
            const data = await res.json() as { result?: { message_id?: number } };
            await execute(
              `UPDATE signal_history SET telegram_posted_at = NOW(), telegram_message_id = $2 WHERE id = $1`,
              [sig.id, data.result?.message_id ?? null],
            );
            publicPushed++;
          }
        } catch (err) {
          console.error(`[telegram-public] Failed to post signal ${sig.id}:`, err);
        }
      }
    }

    // Broadcast the same free-tier signals to Discord (issue #38), if configured.
    // Independent of Telegram and deduped via discord_posted_at.
    let discordPosted = 0;
    if (discordWebhook) {
      const discord = await broadcastSignalsToDiscord(discordWebhook);
      discordPosted = discord.posted;
    }

    return NextResponse.json({
      ok: telegramConfigured ? telegramOk : true,
      messageId: telegramMessageId,
      publicPushed,
      discordPosted,
      error: telegramError,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
