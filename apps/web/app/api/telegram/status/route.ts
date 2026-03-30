import { NextResponse } from 'next/server';
import { readSubscribers } from '../../../../lib/telegram-subscribers';

const TELEGRAM_API = 'https://api.telegram.org';

interface TelegramBotInfo {
  id: number;
  username: string;
  first_name: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
}

// GET /api/telegram/status
export async function GET(): Promise<NextResponse> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return NextResponse.json({
      connected: false,
      configured: false,
      error: 'TELEGRAM_BOT_TOKEN not set',
      subscribers: 0,
    });
  }

  try {
    const [meRes, webhookRes] = await Promise.all([
      fetch(`${TELEGRAM_API}/bot${token}/getMe`, { signal: AbortSignal.timeout(5000) }),
      fetch(`${TELEGRAM_API}/bot${token}/getWebhookInfo`, { signal: AbortSignal.timeout(5000) }),
    ]);

    const meData = (await meRes.json()) as { ok: boolean; result?: TelegramBotInfo; description?: string };
    const webhookData = (await webhookRes.json()) as { ok: boolean; result?: TelegramWebhookInfo };

    if (!meData.ok) {
      return NextResponse.json({
        connected: false,
        configured: true,
        error: meData.description ?? 'Invalid bot token',
        subscribers: readSubscribers().length,
      });
    }

    const bot = meData.result!;
    const webhook = webhookData.result;

    return NextResponse.json({
      connected: true,
      configured: true,
      bot: {
        id: bot.id,
        username: bot.username,
        name: bot.first_name,
      },
      webhook: webhook
        ? {
            url: webhook.url || null,
            pendingUpdates: webhook.pending_update_count,
            lastError: webhook.last_error_message ?? null,
            lastErrorDate: webhook.last_error_date
              ? new Date(webhook.last_error_date * 1000).toISOString()
              : null,
          }
        : null,
      subscribers: readSubscribers().length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        connected: false,
        configured: true,
        error: err instanceof Error ? err.message : 'Failed to reach Telegram API',
        subscribers: readSubscribers().length,
      },
      { status: 502 }
    );
  }
}
