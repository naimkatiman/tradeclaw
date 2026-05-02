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

export interface ConsumeResult {
  ok: boolean;
  email?: string;
  reason?: 'not_found' | 'expired' | 'consumed';
}

export async function consumeMagicLink(raw: string): Promise<ConsumeResult> {
  const tokenHash = hashToken(raw);
  const rows = await query<{ email: string; expires_at: string; consumed_at: string | null }>(
    `SELECT email, expires_at, consumed_at FROM magic_link_tokens WHERE token_hash = $1`,
    [tokenHash],
  );
  if (rows.length === 0) return { ok: false, reason: 'not_found' };
  const row = rows[0];
  if (row.consumed_at) return { ok: false, reason: 'consumed' };
  if (isExpired(new Date(row.expires_at))) return { ok: false, reason: 'expired' };
  await query(
    `UPDATE magic_link_tokens SET consumed_at = NOW() WHERE token_hash = $1 AND consumed_at IS NULL`,
    [tokenHash],
  );
  return { ok: true, email: row.email };
}
