import 'server-only';
import type { TradingSignal } from '../app/lib/signals';

interface RemoteResponse {
  signals?: TradingSignal[];
}

/**
 * Fetch premium signals from a remote HTTP source when the deploy is
 * configured with PREMIUM_SIGNAL_SOURCE_URL + PREMIUM_SIGNAL_SOURCE_KEY.
 *
 * Returns [] in any degraded state: missing env vars, network error,
 * non-2xx response, malformed body. The contract is "best-effort augment" —
 * the DB-backed premium_signals table remains the primary source.
 *
 * This is the single switch between the public self-hostable build (no
 * envs, no augment) and the hosted tradeclaw.win deploy (envs set, real
 * premium feed).
 */
export async function fetchPremiumFromHttp(): Promise<TradingSignal[]> {
  const url = process.env.PREMIUM_SIGNAL_SOURCE_URL;
  const key = process.env.PREMIUM_SIGNAL_SOURCE_KEY;
  if (!url || !key) return [];

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const body = (await res.json()) as RemoteResponse;
    return Array.isArray(body.signals) ? body.signals : [];
  } catch {
    return [];
  }
}
