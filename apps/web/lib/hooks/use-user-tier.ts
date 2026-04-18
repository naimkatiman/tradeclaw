'use client';

import { useEffect, useState } from 'react';

export type ClientTier = 'free' | 'pro' | 'elite' | 'custom';

interface SessionResponse {
  success: boolean;
  data: { userId: string; email: string; tier: ClientTier } | null;
}

/**
 * Client hook that resolves the signed-in user's tier from /api/auth/session.
 * Returns null while loading and when the user is not signed in.
 *
 * Treat null as "free" for gating purposes at render time — anonymous
 * visitors share the free tier's UX (locked TPs, 24h history, etc.) since
 * the server has already filtered their signal payload.
 */
export function useUserTier(): ClientTier | null {
  const [tier, setTier] = useState<ClientTier | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
        const json = (await res.json()) as SessionResponse;
        if (cancelled) return;
        setTier(json.data?.tier ?? null);
      } catch {
        if (!cancelled) setTier(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return tier;
}
