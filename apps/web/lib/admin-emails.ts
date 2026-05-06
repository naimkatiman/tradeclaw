import 'server-only';

/**
 * Email allowlists for role grants outside the Stripe billing path.
 *
 * `ADMIN_EMAILS` — comma-separated list of emails that get admin dashboard
 *   access. Defaults to the project owner so a fresh deploy is usable.
 * `PRO_EMAILS` — comma-separated list of emails that get Pro tier access
 *   even without an active Stripe subscription. Used for owner/team grants
 *   and demo accounts. The Stripe-tier path is still the canonical source
 *   of truth for everyone else.
 */

const DEFAULT_ADMIN_EMAILS = ['naimkatiman@gmail.com'];
const DEFAULT_PRO_EMAILS = ['naimkatiman92@gmail.com'];

function parseList(raw: string | undefined, fallback: string[]): Set<string> {
  const trimmed = raw?.trim();
  if (!trimmed) {
    // Production never inherits a hardcoded fallback. The previous behavior
    // silently granted admin/Pro to a static address on any deploy that
    // forgot to set the env var — including forks, staging clones, and
    // misconfigured production. Fail closed (empty set ⇒ access denied).
    if (process.env.NODE_ENV === 'production') return new Set();
    return new Set(fallback.map((e) => e.toLowerCase()));
  }
  const parsed = trimmed
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (parsed.length > 0) return new Set(parsed);
  if (process.env.NODE_ENV === 'production') return new Set();
  return new Set(fallback.map((e) => e.toLowerCase()));
}

export function getAdminEmails(): Set<string> {
  return parseList(process.env.ADMIN_EMAILS, DEFAULT_ADMIN_EMAILS);
}

export function getProGrantEmails(): Set<string> {
  return parseList(process.env.PRO_EMAILS, DEFAULT_PRO_EMAILS);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().has(email.toLowerCase());
}

/**
 * Synchronous env-only check. Kept for callers that can't await (and as a
 * cheap pre-filter before the async DB lookup). For the full check that
 * also consults the admin-granted DB table, use `isProGrantedEmailDeep`.
 */
export function isProGrantedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getProGrantEmails().has(email.toLowerCase());
}

// ---------------------------------------------------------------------------
// DB-backed grants (admin dashboard) — process-local TTL cache so we don't
// hit Postgres on every getUserTier() call. The admin grant/revoke actions
// must call invalidateProGrantsCache() so changes propagate within the same
// process instance immediately. Other instances pick up the change after the
// TTL expires.
// ---------------------------------------------------------------------------

const PRO_GRANTS_CACHE_TTL_MS = 60_000;
let proGrantsCache: { emails: Set<string>; expiresAt: number } | null = null;

async function loadProGrantedEmailsFromDb(): Promise<Set<string>> {
  if (proGrantsCache && Date.now() < proGrantsCache.expiresAt) {
    return proGrantsCache.emails;
  }
  try {
    const { listActiveProEmailGrants } = await import('./db');
    const rows = await listActiveProEmailGrants();
    const emails = new Set(rows.map((r) => r.email.toLowerCase()));
    proGrantsCache = { emails, expiresAt: Date.now() + PRO_GRANTS_CACHE_TTL_MS };
    return emails;
  } catch {
    // DB unreachable: fall back to env-only. Cache empty briefly so we don't
    // hammer a down DB on every tier check.
    const empty = new Set<string>();
    proGrantsCache = { emails: empty, expiresAt: Date.now() + 5_000 };
    return empty;
  }
}

/**
 * Full grant check: env list OR active DB row. Use this on the tier-
 * resolution path and anywhere else that must honor admin-granted Pro.
 */
export async function isProGrantedEmailDeep(
  email: string | null | undefined,
): Promise<boolean> {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (getProGrantEmails().has(lower)) return true;
  const dbGrants = await loadProGrantedEmailsFromDb();
  return dbGrants.has(lower);
}

/** Drop the in-process cache so the next tier check hits Postgres. */
export function invalidateProGrantsCache(): void {
  proGrantsCache = null;
}
