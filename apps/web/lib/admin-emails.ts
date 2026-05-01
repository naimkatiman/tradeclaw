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
  if (!raw) return new Set(fallback.map((e) => e.toLowerCase()));
  const parsed = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set(parsed.length > 0 ? parsed : fallback.map((e) => e.toLowerCase()));
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

export function isProGrantedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getProGrantEmails().has(email.toLowerCase());
}
