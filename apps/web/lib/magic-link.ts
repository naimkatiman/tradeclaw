import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import { query } from './db-pool';

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

export function generateRawToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now();
}

export async function issueMagicLink(email: string): Promise<{ raw: string }> {
  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);
  await query(
    `INSERT INTO magic_link_tokens (token_hash, email, expires_at) VALUES ($1, $2, $3)`,
    [tokenHash, email.toLowerCase().trim(), expiresAt],
  );
  return { raw };
}

/**
 * Count rows already issued for `email` within the last `windowSeconds`.
 * Used as the persistent rate-limit gate — the prior in-process Map was
 * useless on serverless cold starts, allowing unbounded enumeration.
 */
export async function countRecentMagicLinkEmails(
  email: string,
  windowSeconds: number,
): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM magic_link_tokens
      WHERE email = $1
        AND created_at > NOW() - MAKE_INTERVAL(secs => $2)`,
    [email.toLowerCase().trim(), windowSeconds],
  );
  return Number(rows[0]?.count ?? 0);
}

export interface ConsumeResult {
  ok: boolean;
  email?: string;
  reason?: 'not_found' | 'expired' | 'consumed';
}

/**
 * Race-safe single-shot consume: the UPDATE only matches when the row is
 * still unconsumed. The previous SELECT-then-UPDATE could let two parallel
 * verifies both observe `consumed_at = NULL` and both return ok:true.
 */
export async function consumeMagicLink(raw: string): Promise<ConsumeResult> {
  const tokenHash = hashToken(raw);
  const rows = await query<{ email: string; expires_at: string }>(
    `UPDATE magic_link_tokens
        SET consumed_at = NOW()
      WHERE token_hash = $1
        AND consumed_at IS NULL
      RETURNING email, expires_at`,
    [tokenHash],
  );
  if (rows.length === 0) {
    // Either no such token or another caller already claimed it. We can't
    // tell which without a second query and the UX outcome is the same;
    // surface as 'consumed' so the verify route returns a generic error.
    return { ok: false, reason: 'consumed' };
  }
  const row = rows[0];
  if (isExpired(new Date(row.expires_at))) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, email: row.email };
}
