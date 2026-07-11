import 'server-only';

/**
 * Admin email allowlist.
 *
 * `ADMIN_EMAILS` — comma-separated list of emails that get admin dashboard
 *   access. Defaults to the project owner so a fresh deploy is usable.
 *
 * The PRO_EMAILS / pro_email_grants machinery was removed with the tier
 * system (Phase 2 pass A) — there is no Pro to grant.
 */

const DEFAULT_ADMIN_EMAILS = ['naimkatiman@gmail.com'];

function parseList(raw: string | undefined, fallback: string[]): Set<string> {
  const trimmed = raw?.trim();
  if (!trimmed) {
    // Production never inherits a hardcoded fallback. The previous behavior
    // silently granted admin to a static address on any deploy that forgot
    // to set the env var — including forks, staging clones, and
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

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().has(email.toLowerCase());
}
