import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Lightweight HMAC-signed session cookie for the user auth flow.
 *
 * The cookie value is `${userId}.${issuedAtMs}.${sig}` where sig is
 * hex-encoded HMAC-SHA256 over `${userId}.${issuedAtMs}` using
 * USER_SESSION_SECRET. There is no server-side session store — sessions are
 * self-contained and revoke-on-expiry only.
 */

export const USER_SESSION_COOKIE = 'tc_user_session';
export const USER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const s = process.env.USER_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('USER_SESSION_SECRET must be set and at least 16 chars');
  }
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export function createSessionToken(userId: string): string {
  const issuedAt = Date.now();
  const payload = `${userId}.${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

export interface VerifiedSession {
  userId: string;
  issuedAt: number;
}

export function verifySessionToken(token: string): VerifiedSession | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, issuedAtStr, sig] = parts;
  const issuedAt = Number(issuedAtStr);
  if (!userId || !Number.isFinite(issuedAt)) return null;

  const ageSec = (Date.now() - issuedAt) / 1000;
  if (ageSec < 0 || ageSec > USER_SESSION_MAX_AGE_SECONDS) return null;

  const expected = sign(`${userId}.${issuedAtStr}`);
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { userId, issuedAt };
}

export function readSessionFromRequest(req: Request): VerifiedSession | null {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${USER_SESSION_COOKIE}=`));
  if (!match) return null;
  const token = decodeURIComponent(match.slice(USER_SESSION_COOKIE.length + 1));
  return verifySessionToken(token);
}

export async function readSessionFromCookies(): Promise<VerifiedSession | null> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const token = store.get(USER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export interface SessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
}

export function sessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: USER_SESSION_MAX_AGE_SECONDS,
  };
}
