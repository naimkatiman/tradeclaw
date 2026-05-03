/**
 * Telegram Bot API helpers for group access gating.
 *
 * Used by the Stripe webhook to grant/revoke access to private groups
 * when subscriptions are created or cancelled.
 */

import {
  getBotToken as getResolvedBotToken,
  getProGroupId,
  getEliteGroupId,
} from './telegram-channels';

export type TelegramTier = 'pro' | 'elite';

function getBotToken(): string {
  const token = getResolvedBotToken();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  return token;
}

function getChatIdForTier(tier: TelegramTier): string {
  if (tier === 'elite') {
    const id = getEliteGroupId();
    if (!id) throw new Error('TELEGRAM_ELITE_GROUP_ID is not configured');
    return id;
  }
  const id = getProGroupId();
  if (!id) throw new Error('TELEGRAM_PRO_GROUP_ID is not configured');
  return id;
}

async function telegramPost<T>(
  method: string,
  body: Record<string, unknown>
): Promise<T> {
  const token = getBotToken();
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) {
    throw new Error(`Telegram API error (${method}): ${data.description}`);
  }
  return data.result as T;
}

interface InviteLinkResult {
  invite_link: string;
}

/**
 * Generate a single-use, 72-hour invite link for a private group.
 */
export async function generateInviteLink(
  tier: TelegramTier,
  userId: string
): Promise<string> {
  const chatId = getChatIdForTier(tier);
  const expireDate = Math.floor(Date.now() / 1000) + 72 * 60 * 60; // 72 hours

  const result = await telegramPost<InviteLinkResult>('createChatInviteLink', {
    chat_id: chatId,
    name: `user_${userId}`,
    member_limit: 1,
    expire_date: expireDate,
  });

  return result.invite_link;
}

/**
 * Revoke a specific invite link (e.g. when subscription lapses before use).
 */
export async function revokeInviteLink(
  tier: TelegramTier,
  inviteLink: string
): Promise<void> {
  const chatId = getChatIdForTier(tier);
  await telegramPost('revokeChatInviteLink', {
    chat_id: chatId,
    invite_link: inviteLink,
  });
}

/**
 * Remove a user from a private group and immediately unban so they can
 * rejoin via a new invite if they resubscribe.
 */
export async function revokeAccess(
  telegramUserId: string,
  tier: TelegramTier
): Promise<void> {
  const chatId = getChatIdForTier(tier);

  // Ban (kick) from group
  await telegramPost('banChatMember', {
    chat_id: chatId,
    user_id: telegramUserId,
  });

  // Immediately unban so they aren't permanently blacklisted
  await telegramPost('unbanChatMember', {
    chat_id: chatId,
    user_id: telegramUserId,
    only_if_banned: true,
  });
}

/**
 * Send a text message to a specific Telegram chat (user or group).
 */
export async function sendMessage(
  chatId: string,
  text: string
): Promise<void> {
  await telegramPost('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  });
}

/**
 * Probe whether the bot has an open DM with this user. The Bot API only allows
 * sendMessage to users who pressed Start in the bot DM at least once; if the
 * user linked their account but never opened a chat, sendMessage fails with
 * "chat not found" AFTER a single-use invite link has already been minted.
 *
 * Calling getChat first surfaces the same error before any mutation, so the
 * resend-invite path can return a clear "press Start in the bot DM first"
 * message without leaving an orphan invite in the group's link list.
 */
export async function assertUserDmReachable(telegramUserId: string): Promise<void> {
  // Bot API errors include "chat not found" verbatim; the existing
  // NON_RETRYABLE_TELEGRAM_FRAGMENTS classifier picks this up and the
  // resend-invite route maps it to the chat_not_found error code.
  await telegramPost('getChat', { chat_id: telegramUserId });
}

/**
 * Full flow: generate invite link, persist it, and message the user.
 * Requires the user's telegram_user_id to be already stored.
 */
export async function sendInvite(
  userId: string,
  telegramUserId: string,
  tier: TelegramTier
): Promise<string> {
  // Preflight before mutating anything (createChatInviteLink mints a link
  // that lingers in the group's invite list even if the subsequent
  // sendMessage fails). On "chat not found" this throws the same string the
  // retry classifier already treats as non-retryable.
  await assertUserDmReachable(telegramUserId);

  const inviteLink = await generateInviteLink(tier, userId);

  const tierLabel = tier === 'elite' ? 'Elite' : 'Pro';
  const message =
    `Welcome to TradeClaw ${tierLabel}!\n\n` +
    `Join your private signals group:\n${inviteLink}\n\n` +
    `This link is single-use and expires in 72 hours.`;

  await sendMessage(telegramUserId, message);

  // Persist invite in DB
  const { createTelegramInvite } = await import('./db');
  await createTelegramInvite({
    userId,
    tier,
    inviteLink,
    telegramChatId: BigInt(getChatIdForTier(tier)),
    isActive: true,
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
  });

  return inviteLink;
}

/**
 * Telegram error descriptions that mean "give up" — retrying just burns
 * API quota for a request that will never succeed. Anything else (5xx,
 * 429, transient network) goes through the retry loop.
 *
 * Match-by-substring because the Bot API descriptions are not stable
 * structured codes; lowercased to defang trivial variations.
 */
const NON_RETRYABLE_TELEGRAM_FRAGMENTS = [
  'chat not found',
  'user is deactivated',
  'bot was blocked by the user',
  'bot was kicked',
  'forbidden',
  'user_id_invalid',
  'user not found',
];

function isRetryableTelegramError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return !NON_RETRYABLE_TELEGRAM_FRAGMENTS.some((frag) => msg.includes(frag));
}

export interface SendInviteResult {
  ok: boolean;
  inviteLink?: string;
  attempts: number;
  retryable: boolean;
  error?: string;
}

type SendInviteFn = (
  userId: string,
  telegramUserId: string,
  tier: TelegramTier,
) => Promise<string>;

/**
 * Wraps sendInvite with bounded exponential backoff. Recovers from transient
 * Telegram API failures (5xx, rate-limits, network blips) without manual
 * intervention. Permanent failures (chat misconfigured, user blocked the
 * bot) short-circuit with retryable=false so callers can stop trying.
 *
 * The `sender` parameter exists for tests — production callers always rely
 * on the default (the real sendInvite from this module).
 */
export async function sendInviteWithRetry(
  userId: string,
  telegramUserId: string,
  tier: TelegramTier,
  opts: {
    maxAttempts?: number;
    baseDelayMs?: number;
    sender?: SendInviteFn;
  } = {},
): Promise<SendInviteResult> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const sender = opts.sender ?? sendInvite;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const inviteLink = await sender(userId, telegramUserId, tier);
      return { ok: true, inviteLink, attempts: attempt, retryable: true };
    } catch (err) {
      lastError = err;
      const retryable = isRetryableTelegramError(err);
      if (!retryable || attempt === maxAttempts) {
        return {
          ok: false,
          attempts: attempt,
          retryable,
          error: err instanceof Error ? err.message : String(err),
        };
      }
      // Exponential backoff: 500ms → 1000ms → 2000ms…
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)));
    }
  }

  return {
    ok: false,
    attempts: maxAttempts,
    retryable: true,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  };
}
