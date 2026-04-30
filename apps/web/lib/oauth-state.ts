import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const OAUTH_STATE_COOKIE = 'tc_oauth_state';
export const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10; // 10 minutes

export interface OAuthStatePayload {
  nonce: string;
  next?: string;
  priceId?: string;
  tier?: string;
  interval?: string;
  issuedAt: number;
}

function getSecret(): string {
  const s = process.env.USER_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('USER_SESSION_SECRET must be set and at least 16 chars');
  }
  return s;
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export function newNonce(): string {
  return randomBytes(16).toString('hex');
}

export function encodeState(payload: Omit<OAuthStatePayload, 'issuedAt'>): string {
  const full: OAuthStatePayload = { ...payload, issuedAt: Date.now() };
  const json = JSON.stringify(full);
  const body = b64urlEncode(Buffer.from(json, 'utf8'));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function decodeState(token: string): OAuthStatePayload | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(body);
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length === 0 || a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let parsed: OAuthStatePayload;
  try {
    parsed = JSON.parse(b64urlDecode(body).toString('utf8')) as OAuthStatePayload;
  } catch {
    return null;
  }

  const ageSec = (Date.now() - parsed.issuedAt) / 1000;
  if (ageSec < 0 || ageSec > OAUTH_STATE_MAX_AGE_SECONDS) return null;
  if (typeof parsed.nonce !== 'string' || parsed.nonce.length < 16) return null;

  return parsed;
}

export function stateCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  };
}
