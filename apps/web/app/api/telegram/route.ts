import { NextRequest, NextResponse } from 'next/server';
import { linkTelegramUser, getUserById } from '../../../lib/db';
import { sendInvite } from '../../../lib/telegram';
import { verifyTelegramLinkToken } from '../../../lib/telegram-link-token';
import { verifyTelegramWebhook } from '../../../lib/telegram-webhook-auth';

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

interface SignalPayload {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
}

function formatSignalMessage(signal: SignalPayload): string {
  const arrow = signal.direction === 'BUY' ? '▲' : '▼';
  const lines = [
    `${arrow} ${signal.symbol} ${signal.direction}`,
    `Confidence: ${signal.confidence}%`,
  ];
  if (signal.entry) lines.push(`Entry: ${signal.entry}`);
  if (signal.stopLoss) lines.push(`SL: ${signal.stopLoss}`);
  if (signal.takeProfit) lines.push(`TP: ${signal.takeProfit}`);
  lines.push(`\nPowered by TradeClaw`);
  return lines.join('\n');
}

async function sendTelegramMessage(
  config: TelegramConfig,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.chatId,
      text,
      parse_mode: 'HTML',
    }),
    signal: AbortSignal.timeout(8000),
  });

  const data = (await res.json()) as { ok: boolean; description?: string };
  if (!data.ok) {
    return { ok: false, error: data.description ?? 'Telegram API error' };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Telegram Bot webhook — receives updates from Telegram servers
// POST /api/telegram/bot (set via setWebhook)
// ---------------------------------------------------------------------------

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      username?: string;
      first_name?: string;
    };
    chat?: { id: number };
    text?: string;
  };
}

/**
 * Handle incoming Telegram bot updates.
 * Supports the /start command to link a Telegram account to a web user.
 *
 * Deep-link format: https://t.me/<BOT_USERNAME>?start=<userId>
 * Telegram sends: /start <userId>
 */
async function handleBotUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message?.text || !message.from || !message.chat) return;

  const text = message.text.trim();
  const telegramUserId = message.from.id;
  const chatId = message.chat.id.toString();
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const config: TelegramConfig = { botToken, chatId };

  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    const tokenOrId = parts[1]?.trim();

    if (!tokenOrId) {
      await sendTelegramMessage(
        config,
        'Welcome to TradeClaw!\n\nTo link your account, visit https://tradeclaw.win/dashboard and click "Connect Telegram".'
      );
      return;
    }

    // The deep-link payload must be an HMAC-signed link token. The legacy
    // flow accepted a raw userId here, which let any caller bind their own
    // chat to a known victim account. Reject anything that does not verify.
    const verified = verifyTelegramLinkToken(tokenOrId);
    if (!verified) {
      await sendTelegramMessage(
        config,
        'This link expired or is invalid. Visit https://tradeclaw.win/dashboard and click "Connect Telegram" again to get a fresh link.'
      );
      return;
    }
    const userId = verified.userId;

    const user = await getUserById(userId);
    if (!user) {
      await sendTelegramMessage(
        config,
        'Account not found. Please sign up at tradeclaw.win first.'
      );
      return;
    }

    // Refuse re-link if a different Telegram chat is already bound. The
    // owner has to unlink first (out-of-band support flow) — this prevents
    // an attacker who briefly grabs a token from silently swapping the
    // bound chat away from the legitimate user.
    if (user.telegramUserId !== null && user.telegramUserId !== BigInt(telegramUserId)) {
      await sendTelegramMessage(
        config,
        'This TradeClaw account is already linked to a different Telegram. Contact support@tradeclaw.win to unlink.'
      );
      return;
    }

    await linkTelegramUser(userId, BigInt(telegramUserId));

    // If the user already has an active paid subscription, send invite immediately
    if (user.tier && user.tier !== 'free') {
      try {
        await sendInvite(userId, chatId, user.tier as 'pro' | 'elite');
      } catch (err) {
        console.error('[telegram-bot] Failed to send invite after /start:', err);
        await sendTelegramMessage(
          config,
          `Your Telegram is now linked to your TradeClaw ${user.tier} account.\n\nYour signal group invite will arrive shortly.`
        );
      }
    } else {
      await sendTelegramMessage(
        config,
        `Your Telegram account is now linked to TradeClaw.\n\n` +
          `For now, follow the free public channel for delayed signals: https://t.me/tradeclawwin\n\n` +
          `Upgrade to Pro at https://tradeclaw.win/pricing to unlock the private Pro group ` +
          `(real-time signals, dedicated chat & admin topics) — your invite is DMed here automatically right after checkout.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// POST /api/telegram — two modes:
//   1. Bot webhook update from Telegram (has update_id)
//   2. Manual signal send (has botToken + chatId)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Mode 1: Telegram bot webhook update — must carry the
    // X-Telegram-Bot-Api-Secret-Token header that Telegram echoes back from
    // setWebhook. Without this check anyone on the public internet can POST
    // a forged update_id and trigger /start link flows or future commands.
    if ('update_id' in body) {
      const denied = verifyTelegramWebhook(request);
      if (denied) return denied;
      await handleBotUpdate(body as unknown as TelegramUpdate);
      return NextResponse.json({ ok: true });
    }

    // Mode 2: Manual signal / test message — used by the self-hosted
    // TelegramSettings UI to relay signals through a user's own bot. Not
    // exposed to hosted Pro callers, so we require an explicit opt-in
    // header to avoid being a free Telegram-API relay for arbitrary
    // third parties.
    if (request.headers.get('x-tradeclaw-self-host') !== '1') {
      return NextResponse.json(
        { error: 'manual-send mode is self-host only' },
        { status: 403 }
      );
    }

    const { botToken, chatId, signal, test } = body as {
      botToken?: string;
      chatId?: string;
      signal?: SignalPayload;
      test?: boolean;
    };

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: 'botToken and chatId are required' },
        { status: 400 }
      );
    }

    const config: TelegramConfig = { botToken, chatId };

    if (test) {
      const result = await sendTelegramMessage(
        config,
        'TradeClaw connected. You will receive trading signals here.'
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, message: 'Test message sent' });
    }

    if (!signal) {
      return NextResponse.json({ error: 'signal payload required' }, { status: 400 });
    }

    const text = formatSignalMessage(signal);
    const result = await sendTelegramMessage(config, text);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
