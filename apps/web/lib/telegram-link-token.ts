import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Short-lived HMAC-signed token used to link a Telegram chat to a TradeClaw
 * user account.
 *
 * The legacy flow passed the raw userId as the bot deep-link `start=` param,
 * which let any caller DM the bot `/start <victim-uuid>` to bind their own
 * Telegram chat to the victim's account and inherit the private group invite.
 *
 * The token format is `${userId}.${issuedAtMs}.${sig}` where sig is
 * hex-encoded HMAC-SHA256 over `${userId}.${issuedAtMs}` using a secret
 * derived from USER_SESSION_SECRET via a fixed domain separator. Tokens are
 * accepted by the bot only within the TTL window and only when the user has
 * no Telegram chat linked yet — making them effectively single-use until the
 * user explicitly unlinks.
 */

export const TELEGRAM_LINK_TOKEN_TTL_SECONDS = 10 * 60;

const DOMAIN_SEPARATOR = 'tradeclaw.telegram-link.v1';

function getSecret(): string {
  const s = process.env.USER_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('USER_SESSION_SECRET must be set and at least 16 chars');
  }
  return createHmac('sha256', s).update(DOMAIN_SEPARATOR).digest('hex');
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export function createTelegramLinkToken(userId: string): string {
  const issuedAt = Date.now();
  const payload = `${userId}.${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

export interface VerifiedTelegramLinkToken {
  userId: string;
  issuedAt: number;
}

export function verifyTelegramLinkToken(token: string): VerifiedTelegramLinkToken | null {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, issuedAtStr, sig] = parts;
  const issuedAt = Number(issuedAtStr);
  if (!userId || !Number.isFinite(issuedAt)) return null;

  const ageSec = (Date.now() - issuedAt) / 1000;
  if (ageSec < 0 || ageSec > TELEGRAM_LINK_TOKEN_TTL_SECONDS) return null;

  const expected = sign(`${userId}.${issuedAtStr}`);
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { userId, issuedAt };
}
