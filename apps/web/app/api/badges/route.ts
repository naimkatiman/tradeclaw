import { NextRequest, NextResponse } from 'next/server';
import { SYMBOLS } from '../../lib/signals';
import { BADGE_SHORT_NAMES, type BadgeDirection } from '../../lib/badge';
import { getBadgeCache, setBadgeCache } from '../../../lib/badge-cache';
import { getTrackedSignalsForRequest } from '../../../lib/tracked-signals';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from '../../../lib/signal-thresholds';

export const dynamic = 'force-dynamic';

/**
 * Bulk badge data endpoint — returns all pairs' badge info in one call.
 * GET /api/badges?tf=H1
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tf = searchParams.get('tf')?.toUpperCase() || 'H1';

  const results = await Promise.all(
    SYMBOLS.map(async symbolConfig => {
      const pair = symbolConfig.symbol;
      const shortName = BADGE_SHORT_NAMES[pair] ?? pair.replace('USD', '');
      const cacheKey = `${pair}:${tf}`;

      let cached = getBadgeCache(cacheKey);
      if (!cached) {
        try {
          const { signals } = await getTrackedSignalsForRequest(request, {
            symbol: pair,
            timeframe: tf,
            minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE,
          });
          const signal = signals[0];
          if (signal) {
            cached = {
              direction: signal.direction as BadgeDirection,
              confidence: signal.confidence,
              rsi: signal.indicators.rsi.value,
            };
            setBadgeCache(cacheKey, cached);
          }
        } catch {
          // Fall through
        }
      }

      const direction: BadgeDirection = cached?.direction ?? 'NEUTRAL';
      const confidence = cached?.confidence ?? 0;
      const rsi = cached?.rsi ?? 50;

      return {
        pair,
        shortName,
        direction,
        confidence,
        rsi,
        timeframe: tf,
        badgeUrl: `https://tradeclaw.win/api/badge/${pair}`,
        shieldsUrl: `https://img.shields.io/endpoint?url=https%3A%2F%2Ftradeclaw.win%2Fapi%2Fbadge%2F${pair}%2Fjson`,
        color: direction === 'BUY' ? 'brightgreen' : direction === 'SELL' ? 'red' : 'lightgrey',
      };
    }),
  );

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'no-cache, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
