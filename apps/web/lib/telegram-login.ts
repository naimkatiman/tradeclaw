import { createHash, createHmac } from 'node:crypto';

export interface TelegramLoginData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const AUTH_DATE_MAX_AGE_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Verify Telegram Login Widget auth data per official docs:
 * https://core.telegram.org/widgets/login#checking-authorization
 *
 * 1. Sort all received fields alphabetically (excluding hash).
 * 2. Build data-check-string: key=value pairs joined by newlines.
 * 3. Secret key = SHA256(bot_token).
 * 4. Compare HMAC-SHA256(secret_key, data_check_string) to hash.
 */
export function verifyTelegramLogin(
  data: TelegramLoginData,
  botToken: string,
): boolean {
  const { hash, ...rest } = data;

  const entries = Object.entries(rest)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => [k, String(v)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b));

  const checkString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

  // Secret key = SHA256(bot_token)
  const secret = createHash('sha256').update(botToken).digest();

  // HMAC-SHA256(secret_key, data_check_string)
  const hmac = createHmac('sha256', secret)
    .update(checkString)
    .digest('hex');

  return hmac === hash;
}

/** Reject auth data older than 24 hours to prevent replay attacks. */
export function isTelegramAuthDateFresh(authDate: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const age = now - authDate;
  return age >= 0 && age <= AUTH_DATE_MAX_AGE_SECONDS;
}
