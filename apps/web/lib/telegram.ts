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
 * Full flow: generate invite link, persist it, and message the user.
 * Requires the user's telegram_user_id to be already stored.
 */
export async function sendInvite(
  userId: string,
  telegramUserId: string,
  tier: TelegramTier
): Promise<string> {
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
