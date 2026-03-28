import { NextRequest, NextResponse } from 'next/server';
import { SYMBOLS } from '../../../../lib/signals';
import { BADGE_SHORT_NAMES, type BadgeDirection } from '../../../../lib/badge';
import { getBadgeCache, setBadgeCache } from '../../../../../lib/badge-cache';
import { getTrackedSignals } from '../../../../../lib/tracked-signals';

export const dynamic = 'force-dynamic';

/**
 * Shields.io compatible endpoint.
 * Example: https://img.shields.io/endpoint?url=https://tradeclaw.win/api/badge/BTCUSD/json
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pair: string }> },
) {
  const { pair: rawPair } = await params;
  const pair = rawPair.toUpperCase();
  const { searchParams } = new URL(request.url);
  const tf = searchParams.get('tf')?.toUpperCase() || 'H1';

  const symbolConfig = SYMBOLS.find(s => s.symbol === pair);
  const shortName = BADGE_SHORT_NAMES[pair] ?? pair.replace('USD', '');

  const cacheKey = `${pair}:${tf}`;
  let cached = getBadgeCache(cacheKey);

  if (!cached && symbolConfig) {
    try {
      const { signals } = await getTrackedSignals({ symbol: pair, timeframe: tf });
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

  const dirIcon = direction === 'BUY' ? '▲' : direction === 'SELL' ? '▼' : '—';
  const message =
    direction === 'NEUTRAL'
      ? `${shortName} —`
      : `${dirIcon} ${direction} ${confidence}%`;

  const color =
    direction === 'BUY'
      ? 'brightgreen'
      : direction === 'SELL'
        ? 'red'
        : 'lightgrey';

  return NextResponse.json(
    {
      schemaVersion: 1,
      label: `TradeClaw ${shortName}`,
      message,
      color,
    },
    {
      headers: {
        'Cache-Control': 'no-cache, max-age=300',
      },
    },
  );
}
