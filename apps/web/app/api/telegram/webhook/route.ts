import { NextRequest, NextResponse } from 'next/server';
import {
  addSubscriber,
  removeSubscriber,
  getSubscriber,
} from '../../../../lib/telegram-subscribers';
import { getTrackedSignals } from '../../../../lib/tracked-signals';
import {
  approveChatJoinRequest,
  declineChatJoinRequest,
  revokeAccess,
  tierForChatId,
} from '../../../../lib/telegram';
import { getUserByTelegramId } from '../../../../lib/db';
import { getUserTier } from '../../../../lib/tier';

const TELEGRAM_API = 'https://api.telegram.org';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TelegramFrom {
  id: number;
  username?: string;
  first_name?: string;
  is_bot?: boolean;
}

interface TelegramChat {
  id: number;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramFrom;
  chat?: TelegramChat;
  text?: string;
}

interface TelegramChatJoinRequest {
  chat: TelegramChat;
  from: TelegramFrom;
  user_chat_id?: number;
}

type ChatMemberStatus =
  | 'creator'
  | 'administrator'
  | 'member'
  | 'restricted'
  | 'left'
  | 'kicked';

interface TelegramChatMemberInfo {
  user: TelegramFrom;
  status: ChatMemberStatus;
}

interface TelegramChatMemberUpdate {
  chat: TelegramChat;
  from: TelegramFrom;
  old_chat_member: TelegramChatMemberInfo;
  new_chat_member: TelegramChatMemberInfo;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  chat_join_request?: TelegramChatJoinRequest;
  chat_member?: TelegramChatMemberUpdate;
}

// ---------------------------------------------------------------------------
// Telegram API helper
// ---------------------------------------------------------------------------

async function sendMessage(
  chatId: string | number,
  text: string,
  parseMode: 'MarkdownV2' | 'HTML' = 'MarkdownV2'
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(8000),
  });
}

// ---------------------------------------------------------------------------
// MarkdownV2 escape helper
// ---------------------------------------------------------------------------

function e(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

async function handleStart(chatId: number, from?: TelegramFrom): Promise<void> {
  await addSubscriber(String(chatId), {
    username: from?.username,
    firstName: from?.first_name,
  });

  const name = from?.first_name ? e(from.first_name) : 'trader';

  await sendMessage(
    chatId,
    [
      `👋 *Welcome to TradeClaw, ${name}\\!*`,
      '',
      `I'll send you real\\-time trading signal alerts for Forex, Crypto, and Commodities\\.`,
      '',
      '✅ *You are now subscribed to all signals* \\(confidence ≥ 70%\\)',
      '',
      '*Quick start:*',
      '• /signals — Get the latest signals now',
      '• /pairs — Browse available trading pairs',
      '• /settings — View your preferences',
      '• /help — All commands',
      '',
      '_Not financial advice\\. Always DYOR\\._',
    ].join('\n')
  );
}

async function handleSubscribe(chatId: number, from?: TelegramFrom): Promise<void> {
  await addSubscriber(String(chatId), {
    username: from?.username,
    firstName: from?.first_name,
  });

  await sendMessage(
    chatId,
    [
      '✅ *Subscribed to TradeClaw signals\\!*',
      '',
      `You will receive alerts for *all pairs* with confidence ≥ *70%*\\.`,
      '',
      'Use /settings to view or adjust your preferences\\.',
    ].join('\n')
  );
}

async function handleUnsubscribe(chatId: number): Promise<void> {
  const removed = await removeSubscriber(String(chatId));

  if (removed) {
    await sendMessage(
      chatId,
      [
        '👋 *Unsubscribed\\.*',
        '',
        'You will no longer receive signal alerts\\.',
        'Use /subscribe any time to re\\-enable\\.',
      ].join('\n')
    );
  } else {
    await sendMessage(chatId, "You weren't subscribed\\. Use /subscribe to start receiving alerts\\.");
  }
}

async function handleSignals(chatId: number): Promise<void> {
  // Intentionally no license ctx — Telegram broadcasts are public, so only
  // the free classic strategy is emitted.
  const { signals } = await getTrackedSignals({ minConfidence: 70 });
  const top = signals.slice(0, 5);

  if (top.length === 0) {
    await sendMessage(chatId, 'No signals with confidence ≥ 70% right now\\. Check back soon\\!');
    return;
  }

  const lines: string[] = [`📊 *Latest Signals* \\(top ${top.length}\\)`, e('━━━━━━━━━━━━━━━━━'), ''];

  for (const sig of top) {
    const emoji = sig.direction === 'BUY' ? '🟢' : '🔴';
    const price = sig.entry >= 1000
      ? sig.entry.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : sig.entry >= 1
      ? sig.entry.toFixed(4)
      : sig.entry.toFixed(5);

    lines.push(
      `${emoji} *${e(sig.symbol)}* ${e(sig.direction)} — ${e(sig.timeframe)}`,
      `   Entry: \\$${e(price)} • Confidence: ${e(String(sig.confidence))}%`,
      ''
    );
  }

  lines.push('_Use /subscribe to get these alerts automatically\\._');

  await sendMessage(chatId, lines.join('\n'));
}

async function handlePairs(chatId: number): Promise<void> {
  const lines = [
    '*Available Trading Pairs*',
    e('━━━━━━━━━━━━━━━━━'),
    '',
    '*Commodities*',
    '• XAUUSD — Gold',
    '• XAGUSD — Silver',
    '',
    '*Crypto*',
    '• BTCUSD — Bitcoin',
    '• ETHUSD — Ethereum',
    '• XRPUSD — XRP',
    '',
    '*Forex*',
    '• EURUSD — EUR/USD',
    '• GBPUSD — GBP/USD',
    '• USDJPY — USD/JPY',
    '• AUDUSD — AUD/USD',
    '• USDCAD — USD/CAD',
    '• NZDUSD — NZD/USD',
    '• USDCHF — USD/CHF',
    '',
    '_Subscribe with /subscribe to receive alerts for all pairs\\._',
  ];

  await sendMessage(chatId, lines.join('\n'));
}

async function handleSettings(chatId: number): Promise<void> {
  const sub = await getSubscriber(String(chatId));

  if (!sub) {
    await sendMessage(
      chatId,
      "You're not subscribed yet\\. Use /subscribe to start receiving signals\\."
    );
    return;
  }

  const pairsLabel =
    sub.subscribedPairs === 'all'
      ? 'All pairs'
      : (sub.subscribedPairs as string[]).join(', ') || 'None';

  const since = new Date(sub.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  await sendMessage(
    chatId,
    [
      '*Your Subscription Settings*',
      e('━━━━━━━━━━━━━━━━━'),
      '',
      `📌 *Pairs:* ${e(pairsLabel)}`,
      `📊 *Min Confidence:* ${e(String(sub.minConfidence))}%`,
      `📅 *Subscribed since:* ${e(since)}`,
      '',
      '_To unsubscribe, use /unsubscribe_',
    ].join('\n')
  );
}

async function handleHelp(chatId: number): Promise<void> {
  await sendMessage(
    chatId,
    [
      '*TradeClaw Bot Commands*',
      e('━━━━━━━━━━━━━━━━━'),
      '',
      '/start — Welcome message \\+ auto\\-subscribe',
      '/subscribe — Subscribe to signal alerts',
      '/unsubscribe — Stop receiving alerts',
      '/signals — Get latest signals on demand',
      '/pairs — List available trading pairs',
      '/settings — View your subscription settings',
      '/help — Show this help message',
      '',
      '_Powered by TradeClaw open\\-source platform_',
    ].join('\n')
  );
}

// ---------------------------------------------------------------------------
// Pro group access gate
// ---------------------------------------------------------------------------

/**
 * Look up the effective tier for a Telegram user ID, using the same
 * resolver the dashboard uses (Stripe + past_due grace + email grants).
 * Returns 'free' if the Telegram chat is not linked to any TradeClaw
 * account, or if the linked account has no paid access.
 */
async function resolveTierForTelegramUser(
  telegramUserId: number,
): Promise<'free' | 'pro' | 'elite' | 'custom'> {
  const user = await getUserByTelegramId(BigInt(telegramUserId));
  if (!user) return 'free';
  return getUserTier(user.id);
}

async function dmUpgradePrompt(
  telegramUserId: number,
  tier: 'pro' | 'elite',
): Promise<void> {
  const label = tier === 'elite' ? 'Elite' : 'Pro';
  const text = [
    `Access to the TradeClaw ${label} group is for active ${label} subscribers only\\.`,
    '',
    `If you already have a ${label} subscription, link your Telegram first by visiting `,
    `https://tradeclaw\\.win/dashboard and clicking *Connect Telegram*\\.`,
    '',
    `Otherwise upgrade at https://tradeclaw\\.win/pricing — your invite is DMed here `,
    `automatically right after checkout\\.`,
  ].join('');
  try {
    await sendMessage(telegramUserId, text);
  } catch (err) {
    console.error('[telegram-webhook] DM upgrade prompt failed:', err);
  }
}

async function handleChatJoinRequest(req: TelegramChatJoinRequest): Promise<void> {
  const tier = tierForChatId(String(req.chat.id));
  if (!tier) return; // Unrelated group — ignore.

  const telegramUserId = req.from.id;
  const userTier = await resolveTierForTelegramUser(telegramUserId);

  // Pro group accepts pro/elite/custom; elite group accepts elite/custom.
  const allowed =
    tier === 'pro'
      ? userTier === 'pro' || userTier === 'elite' || userTier === 'custom'
      : userTier === 'elite' || userTier === 'custom';

  try {
    if (allowed) {
      await approveChatJoinRequest(tier, String(telegramUserId));
    } else {
      await declineChatJoinRequest(tier, String(telegramUserId));
      await dmUpgradePrompt(telegramUserId, tier);
    }
  } catch (err) {
    console.error('[telegram-webhook] chat_join_request handler failed:', err);
  }
}

async function handleChatMember(upd: TelegramChatMemberUpdate): Promise<void> {
  const tier = tierForChatId(String(upd.chat.id));
  if (!tier) return; // Unrelated group — ignore.

  const oldStatus = upd.old_chat_member.status;
  const newStatus = upd.new_chat_member.status;

  // Only act on transitions INTO the group as a regular member. Admin
  // promotions/demotions and self-leaves are not our concern.
  const wasMember = oldStatus === 'member' || oldStatus === 'restricted';
  const isMember = newStatus === 'member' || newStatus === 'restricted';
  if (wasMember || !isMember) return;

  const targetUser = upd.new_chat_member.user;
  if (targetUser.is_bot) return; // Never auto-kick other bots.

  const userTier = await resolveTierForTelegramUser(targetUser.id);
  const allowed =
    tier === 'pro'
      ? userTier === 'pro' || userTier === 'elite' || userTier === 'custom'
      : userTier === 'elite' || userTier === 'custom';
  if (allowed) return;

  // Defense in depth: a non-Pro user ended up inside the group (added by
  // an admin manually, or the join-request gate was bypassed). Kick now.
  try {
    await revokeAccess(String(targetUser.id), tier);
    await dmUpgradePrompt(targetUser.id, tier);
  } catch (err) {
    console.error('[telegram-webhook] chat_member kick failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as TelegramUpdate;

    // Validate this looks like a Telegram update
    if (typeof body.update_id !== 'number') {
      return NextResponse.json({ error: 'Invalid update' }, { status: 400 });
    }

    // Pro/Elite group access gate. These updates do not carry a `message`,
    // so they must be dispatched before the message-only short-circuit
    // below.
    if (body.chat_join_request) {
      await handleChatJoinRequest(body.chat_join_request);
      return NextResponse.json({ ok: true });
    }
    if (body.chat_member) {
      await handleChatMember(body.chat_member);
      return NextResponse.json({ ok: true });
    }

    const message = body.message;
    if (!message?.text || !message.chat) {
      return NextResponse.json({ ok: true }); // Ignore non-text updates
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const command = text.split(' ')[0].split('@')[0].toLowerCase();

    switch (command) {
      case '/start':
        await handleStart(chatId, message.from);
        break;
      case '/subscribe':
        await handleSubscribe(chatId, message.from);
        break;
      case '/unsubscribe':
        await handleUnsubscribe(chatId);
        break;
      case '/signals':
        await handleSignals(chatId);
        break;
      case '/pairs':
        await handlePairs(chatId);
        break;
      case '/settings':
        await handleSettings(chatId);
        break;
      case '/help':
        await handleHelp(chatId);
        break;
      default:
        await sendMessage(
          chatId,
          `Unknown command\\. Use /help to see available commands\\.`
        );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
