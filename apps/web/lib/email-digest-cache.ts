/**
 * In-memory cache for email digest summaries (7d / 30d).
 *
 * Wraps getEmailDigestData / generateEmailDigest with a short TTL.
 * Also gates resolveRealOutcomes so it only runs on cache miss, not on
 * every request to /api/email-digest — that call is expensive (DB scan
 * + per-symbol OHLCV fetches).
 *
 * TTL: 2 minutes. Matches leaderboard-cache. Invalidate when the
 * underlying signal history changes.
 */

import {
  getEmailDigestData,
  generateEmailDigest,
  type EmailDigestData,
  type EmailDigestOptions,
} from './email-digest';
import { resolveRealOutcomes } from './signal-history';

type Period = '7d' | '30d';

interface CachedData {
  data: EmailDigestData;
  expiresAt: number;
}

interface CachedHtml {
  html: string;
  expiresAt: number;
}

const TTL_MS = 2 * 60 * 1000;
const dataCache = new Map<string, CachedData>();
const htmlCache = new Map<string, CachedHtml>();

let resolveInFlight: Promise<void> | null = null;
let lastResolveAt = 0;
const RESOLVE_INTERVAL_MS = 60 * 1000;

async function maybeResolveOutcomes(): Promise<void> {
  const now = Date.now();
  if (now - lastResolveAt < RESOLVE_INTERVAL_MS) return;

  if (resolveInFlight) {
    await resolveInFlight;
    return;
  }

  resolveInFlight = (async () => {
    try {
      await resolveRealOutcomes();
      lastResolveAt = Date.now();
    } finally {
      resolveInFlight = null;
    }
  })();

  await resolveInFlight;
}

function keyFor(options: EmailDigestOptions): string {
  const period: Period = options.period ?? '7d';
  const topN = options.topN ?? 5;
  return `${period}:${topN}`;
}

export async function getCachedEmailDigestData(
  options: EmailDigestOptions = {},
): Promise<EmailDigestData> {
  const key = keyFor(options);
  const cached = dataCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  await maybeResolveOutcomes();
  const data = await getEmailDigestData(options);
  dataCache.set(key, { data, expiresAt: Date.now() + TTL_MS });
  return data;
}

export async function getCachedEmailDigestHtml(
  options: EmailDigestOptions = {},
): Promise<string> {
  const key = keyFor(options);
  const cached = htmlCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.html;
  }

  await maybeResolveOutcomes();
  const html = await generateEmailDigest(options);
  htmlCache.set(key, { html, expiresAt: Date.now() + TTL_MS });
  return html;
}

export function invalidateEmailDigestCache(): void {
  dataCache.clear();
  htmlCache.clear();
}
