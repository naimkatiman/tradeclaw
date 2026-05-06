import 'server-only';

/**
 * Default `Secure` flag for auth cookies. Previous code keyed this on
 * `NODE_ENV === 'production'`, which meant any non-production deploy
 * (preview, staging, custom NODE_ENV) sent session cookies over plain
 * HTTP. Default to true; allow opt-out via `INSECURE_COOKIES=1` for
 * local dev over HTTP (and even then only when NODE_ENV !== 'production').
 */
export function secureCookieDefault(): boolean {
  if (process.env.INSECURE_COOKIES === '1' && process.env.NODE_ENV !== 'production') {
    return false;
  }
  return true;
}
