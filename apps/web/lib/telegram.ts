/**
 * Telegram Bot API helpers.
 *
 * TradeClaw is fully free — the private Pro/Elite group machinery (invite
 * minting, join-request gating, revocation) is gone. What remains is the
 * generic sendMessage used by the account-link flow and the free public
 * channel broadcast path.
 */

import { getBotToken as getResolvedBotToken } from './telegram-channels';

function getBotToken(): string {
  const token = getResolvedBotToken();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  return token;
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
