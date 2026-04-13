import { NextRequest, NextResponse } from 'next/server';
import { SYMBOLS } from '../../lib/signals';
import { generateBadgeSvg, BADGE_SHORT_NAMES, type BadgeDirection } from '../../lib/badge';
import { getTrackedSignalsForRequest } from '../../../lib/tracked-signals';
import { PUBLISHED_SIGNAL_MIN_CONFIDENCE } from '../../../lib/signal-thresholds';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pair = searchParams.get('pair')?.toUpperCase() || 'BTCUSD';
  const tf = searchParams.get('tf')?.toUpperCase() || 'H1';

  const symbolConfig = SYMBOLS.find(s => s.symbol === pair);
  const shortName = BADGE_SHORT_NAMES[pair] ?? pair.replace('USD', '');

  let direction: BadgeDirection = 'NEUTRAL';
  let confidence = 0;
  let rsi = 50;

  if (symbolConfig) {
    try {
      const { signals } = await getTrackedSignalsForRequest(request, {
        symbol: pair,
        timeframe: tf,
        minConfidence: PUBLISHED_SIGNAL_MIN_CONFIDENCE,
      });
      const signal = signals[0];
      if (signal) {
        direction = signal.direction as BadgeDirection;
        confidence = signal.confidence;
        rsi = signal.indicators.rsi.value;
      }
    } catch {
      // Fall through — show NEUTRAL badge on error
    }
  }

  const svg = generateBadgeSvg({ symbol: shortName, direction, confidence, rsi, timeframe: tf });

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
