/**
 * Admin session tokens using Web Crypto API (HMAC-SHA256).
 * Works in both Node.js and Edge runtimes.
 */

const ADMIN_SESSION_COOKIE = 'tc_admin';
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

async function sign(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createAdminSession(secret: string): Promise<string> {
  const issuedAt = Date.now();
  const payload = `admin.${issuedAt}`;
  const sig = await sign(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifyAdminSession(
  token: string | null | undefined,
  secret: string
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [prefix, issuedAtStr, sig] = parts;
  if (prefix !== 'admin') return false;

  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return false;

  const ageSec = (Date.now() - issuedAt) / 1000;
  if (ageSec < 0 || ageSec > ADMIN_SESSION_MAX_AGE_SECONDS) return false;

  const expected = await sign(`admin.${issuedAtStr}`, secret);
  if (sig.length !== expected.length) return false;

  // Constant-time comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < sig.length; i++) {
    result |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Constant-time string comparison. Edge-runtime safe (no node:crypto), so it
 * can be used from middleware. Length is compared first; a differing length
 * returns immediately (the length of a server-held secret is not itself a
 * useful oracle), otherwise every char is compared to avoid a timing leak.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export { ADMIN_SESSION_COOKIE };
