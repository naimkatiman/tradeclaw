import 'server-only';
import { randomBytes, createHash } from 'node:crypto';

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export const FREE_STRATEGY = 'classic' as const;

/** Strategies a license key can grant. `classic` is intentionally excluded — it's free for everyone. */
export const ALLOWED_PREMIUM_STRATEGIES: ReadonlySet<string> = new Set([
  'regime-aware',
  'hmm-top3',
  'vwap-ema-bb',
  'full-risk',
]);

export interface LicenseContext {
  licenseId: string | null;
  unlockedStrategies: Set<string>; // always includes FREE_STRATEGY
  expiresAt: Date | null;
  issuedTo: string | null;
}

export interface StrategyLicense {
  id: string;
  keyPrefix: string;
  issuedTo: string | null;
  status: 'active' | 'revoked';
  expiresAt: Date | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  notes: string | null;
}

export interface StrategyLicenseWithGrants extends StrategyLicense {
  strategies: string[];
}

// ──────────────────────────────────────────────────────────────────────────
// Key generation + hashing
// ──────────────────────────────────────────────────────────────────────────

export interface GeneratedKey {
  plaintext: string;
  hash: string;
  prefix: string;
}

export function generateKey(): GeneratedKey {
  const plaintext = 'tck_live_' + randomBytes(16).toString('hex');
  const hash = hashKey(plaintext);
  const prefix = plaintext.slice(0, 12);
  return { plaintext, hash, prefix };
}

export function hashKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

// ──────────────────────────────────────────────────────────────────────────
// Anonymous context helper (used by fall-through cases)
// ──────────────────────────────────────────────────────────────────────────

export function anonymousContext(): LicenseContext {
  return {
    licenseId: null,
    unlockedStrategies: new Set([FREE_STRATEGY]),
    expiresAt: null,
    issuedTo: null,
  };
}

import { query, queryOne, execute } from './db-pool';

// ──────────────────────────────────────────────────────────────────────────
// Row types + mappers
// ──────────────────────────────────────────────────────────────────────────

interface LicenseRow {
  id: string;
  key_prefix: string;
  issued_to: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  last_seen_at: string | null;
  notes: string | null;
}

function toLicense(row: LicenseRow): StrategyLicense {
  return {
    id: row.id,
    keyPrefix: row.key_prefix,
    issuedTo: row.issued_to,
    status: row.status as 'active' | 'revoked',
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    createdAt: new Date(row.created_at),
    lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at) : null,
    notes: row.notes,
  };
}

async function fetchGrants(licenseId: string): Promise<string[]> {
  const rows = await query<{ strategy_id: string }>(
    `SELECT strategy_id FROM strategy_license_grants WHERE license_id = $1
     ORDER BY strategy_id`,
    [licenseId],
  );
  return rows.map((r) => r.strategy_id);
}

// ──────────────────────────────────────────────────────────────────────────
// CRUD
// ──────────────────────────────────────────────────────────────────────────

export async function issueLicense(input: {
  issuedTo?: string;
  strategies: string[];
  expiresAt?: Date | null;
  notes?: string;
}): Promise<{ license: StrategyLicense; plaintextKey: string }> {
  const { plaintext, hash, prefix } = generateKey();

  const row = await queryOne<LicenseRow>(
    `INSERT INTO strategy_licenses
       (key_hash, key_prefix, issued_to, expires_at, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, key_prefix, issued_to, status, expires_at,
               created_at, last_seen_at, notes`,
    [hash, prefix, input.issuedTo ?? null, input.expiresAt ?? null, input.notes ?? null],
  );
  if (!row) {
    throw new Error('issueLicense: insert returned no row');
  }

  if (input.strategies.length > 0) {
    await addGrants(row.id, input.strategies);
  }

  return { license: toLicense(row), plaintextKey: plaintext };
}

export async function addGrants(licenseId: string, strategies: string[]): Promise<void> {
  for (const strategyId of strategies) {
    await execute(
      `INSERT INTO strategy_license_grants (license_id, strategy_id)
       VALUES ($1, $2)
       ON CONFLICT (license_id, strategy_id) DO NOTHING`,
      [licenseId, strategyId],
    );
  }
}

export async function updateExpiry(
  licenseId: string,
  expiresAt: Date | null,
): Promise<void> {
  await execute(
    `UPDATE strategy_licenses SET expires_at = $1 WHERE id = $2`,
    [expiresAt, licenseId],
  );
}

export async function updateIssuedTo(
  licenseId: string,
  issuedTo: string | null,
): Promise<void> {
  await execute(
    `UPDATE strategy_licenses SET issued_to = $1 WHERE id = $2`,
    [issuedTo, licenseId],
  );
}

export async function revokeLicense(licenseId: string): Promise<void> {
  await execute(
    `UPDATE strategy_licenses SET status = 'revoked' WHERE id = $1`,
    [licenseId],
  );
}

export async function getLicenseById(
  id: string,
): Promise<StrategyLicenseWithGrants | null> {
  const row = await queryOne<LicenseRow>(
    `SELECT id, key_prefix, issued_to, status, expires_at,
            created_at, last_seen_at, notes
     FROM strategy_licenses WHERE id = $1`,
    [id],
  );
  if (!row) return null;
  const strategies = await fetchGrants(row.id);
  return { ...toLicense(row), strategies };
}

export async function listLicenses(): Promise<StrategyLicenseWithGrants[]> {
  const rows = await query<LicenseRow>(
    `SELECT id, key_prefix, issued_to, status, expires_at,
            created_at, last_seen_at, notes
     FROM strategy_licenses
     ORDER BY created_at DESC`,
  );
  const out: StrategyLicenseWithGrants[] = [];
  for (const row of rows) {
    const strategies = await fetchGrants(row.id);
    out.push({ ...toLicense(row), strategies });
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────
// Key extraction + resolution
// ──────────────────────────────────────────────────────────────────────────

const LICENSE_HEADER = 'x-license-key';
const LICENSE_COOKIE = 'tc_license_key';
const LICENSE_QUERY = 'key';

function extractKeyFromRequest(req: Request): string | null {
  const headerKey = req.headers.get(LICENSE_HEADER);
  if (headerKey && headerKey.length > 0) return headerKey;

  try {
    const url = new URL(req.url);
    const queryKey = url.searchParams.get(LICENSE_QUERY);
    if (queryKey && queryKey.startsWith('tck_live_')) return queryKey;
  } catch {
    // req.url not parseable — skip
  }

  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${LICENSE_COOKIE}=`));
    if (match) {
      return decodeURIComponent(match.slice(LICENSE_COOKIE.length + 1));
    }
  }

  return null;
}

export async function resolveLicense(req: Request): Promise<LicenseContext> {
  const plaintext = extractKeyFromRequest(req);
  if (!plaintext) return anonymousContext();
  return resolveLicenseByKey(plaintext);
}

export async function resolveLicenseByKey(plaintext: string): Promise<LicenseContext> {
  const hash = hashKey(plaintext);
  const row = await queryOne<LicenseRow>(
    `SELECT id, key_prefix, issued_to, status, expires_at,
            created_at, last_seen_at, notes
     FROM strategy_licenses
     WHERE key_hash = $1
       AND status = 'active'
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [hash],
  );
  if (!row) return anonymousContext();

  const strategies = await fetchGrants(row.id);

  // Fire-and-forget last_seen_at update
  execute(
    `UPDATE strategy_licenses SET last_seen_at = NOW() WHERE id = $1`,
    [row.id],
  ).catch(() => undefined);

  return {
    licenseId: row.id,
    unlockedStrategies: new Set([FREE_STRATEGY, ...strategies]),
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    issuedTo: row.issued_to,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Server-component helper — reads the license cookie via next/headers
// and resolves a LicenseContext. Use this in RSC paths that don't have
// a Request object.
// ──────────────────────────────────────────────────────────────────────────
export async function resolveLicenseFromCookies(): Promise<LicenseContext> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const plaintext = store.get(LICENSE_COOKIE)?.value;
  if (!plaintext) return anonymousContext();
  return resolveLicenseByKey(plaintext);
}
