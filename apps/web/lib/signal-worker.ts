/**
 * Async signal worker — pre-computes signals on a schedule and stores
 * results in Redis so API routes can serve them instantly without
 * running the heavy TA engine synchronously.
 *
 * The worker is idempotent: repeated runs simply overwrite the same
 * Redis key. Callers that need fresh generation pass `skipCache: true`
 * to `getSignals()`.
 */

import type { TradingSignal } from '../app/lib/signals';
import { getSignals } from '../app/lib/signals';
import { safeProfileId } from '../app/lib/signal-generator';
import { getActivePreset } from '../app/api/cron/signals/preset-dispatch';
import { redis, isRedisAvailable, ensureRedis, redisKey } from './redis';
import { observeSignalGenDuration } from './gen-latency';

const CACHE_KEY = redisKey('signals:latest');
const CACHE_TTL_SECONDS = 6 * 60; // 6 minutes (cron runs every 5)

interface CachedSignalsPayload {
  signals: TradingSignal[];
  syntheticSymbols: string[];
  profileId: string;
  generatedAt: number;
}

/** Pre-compute signals for the active profile and store in Redis. */
export async function precomputeSignals(): Promise<void> {
  const preset = getActivePreset();
  const profileId = safeProfileId(preset.id);

  const genStartMs = Date.now();
  try {
    // Generate fresh signals (bypass cache to avoid reading stale data).
    // Pass profileId so the generated payload matches the id it is cached under
    // (readSignalsCache rejects a mismatch); today every preset resolves to
    // 'classic', so this is behaviour-preserving until a second profile exists.
    const { signals, syntheticSymbols } = await getSignals({ profileId }, { skipCache: true });
    observeSignalGenDuration((Date.now() - genStartMs) / 1000);

    const payload: CachedSignalsPayload = {
      signals,
      syntheticSymbols,
      profileId,
      generatedAt: Date.now(),
    };

    await ensureRedis();
    if (isRedisAvailable() && redis) {
      await redis.set(CACHE_KEY, JSON.stringify(payload), 'EX', CACHE_TTL_SECONDS);
    }
  } catch (err) {
    console.warn(
      '[signal-worker] precomputeSignals failed:',
      err instanceof Error ? err.message : String(err),
    );
    // Worker failures are non-fatal — callers fall back to on-demand generation
  }
}

/** Read the latest cached signals from Redis. */
export async function getCachedSignals(): Promise<CachedSignalsPayload | null> {
  try {
    await ensureRedis();
    if (!isRedisAvailable() || !redis) return null;

    const raw = await redis.get(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedSignalsPayload;
    return {
      signals: parsed.signals ?? [],
      syntheticSymbols: parsed.syntheticSymbols ?? [],
      profileId: parsed.profileId ?? 'classic',
      generatedAt: parsed.generatedAt ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Convenience wrapper: returns cached signals if fresh, otherwise
 * falls back to synchronous generation. Applies caller filters.
 */
export async function getSignalsCached(params: {
  symbol?: string;
  timeframe?: string;
  direction?: string;
  minConfidence?: number;
}): Promise<{ signals: TradingSignal[]; syntheticSymbols: string[] }> {
  const cached = await getCachedSignals();
  if (cached) {
    let signals = cached.signals;

    if (params.symbol) {
      const upper = params.symbol.toUpperCase();
      signals = signals.filter((s) => s.symbol === upper);
    }
    if (params.timeframe) {
      const upper = params.timeframe.toUpperCase();
      signals = signals.filter((s) => s.timeframe === upper);
    }
    if (params.direction) {
      const upper = params.direction.toUpperCase();
      signals = signals.filter((s) => s.direction === upper);
    }
    const minConfidence = params.minConfidence;
    if (minConfidence != null && minConfidence > 0) {
      signals = signals.filter((s) => s.confidence >= minConfidence);
    }

    return { signals, syntheticSymbols: cached.syntheticSymbols };
  }

  // Cache miss — fall back to direct generation
  return getSignals(params);
}
