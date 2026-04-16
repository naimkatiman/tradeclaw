import { NextRequest, NextResponse } from 'next/server';
import { broadcastTopSignals } from '../../../../lib/telegram-broadcast';
import { query, execute } from '../../../../lib/db-pool';

// ---------------------------------------------------------------------------
// GET /api/cron/telegram — Vercel Cron handler (every 4 hours)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Auth guard — Vercel cron sends CRON_SECRET as bearer token
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get('authorization');
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    if (!botToken || !channelId) {
      return NextResponse.json(
        { ok: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not configured' },
        { status: 503 },
      );
    }

    const result = await broadcastTopSignals(channelId, botToken);

    // Delayed public channel push — free-tier signals 15+ min old
    const publicChannelId = process.env.TELEGRAM_PUBLIC_CHANNEL_ID;
    let publicPushed = 0;
    if (publicChannelId && botToken) {
      const pending = await query<{
        id: string; pair: string; direction: string; confidence: number;
        entry_price: string; tp1: string | null; sl: string | null; timeframe: string;
      }>(`
        SELECT id, pair, direction, confidence, entry_price, tp1, sl, timeframe
        FROM signal_history
        WHERE telegram_posted_at IS NULL
          AND is_simulated = false
          AND created_at >= NOW() - INTERVAL '2 hours'
          AND created_at <= NOW() - INTERVAL '15 minutes'
        ORDER BY created_at ASC
        LIMIT 10
      `);

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

    return NextResponse.json({
      ok: result.success,
      messageId: result.messageId ?? null,
      publicPushed,
      error: result.error ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
