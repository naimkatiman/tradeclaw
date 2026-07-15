import { NextRequest, NextResponse } from 'next/server';
import { SYMBOLS } from '../../lib/signals';
import { generateBadgeSvg, BADGE_SHORT_NAMES } from '../../lib/badge';
import {
  BADGE_RESPONSE_HEADERS,
  generateUnavailableBadgeSvg,
  loadBadgeState,
  unavailableBadgeState,
} from './badge-state';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pair = searchParams.get('pair')?.toUpperCase() || 'BTCUSD';
  const tf = searchParams.get('tf')?.toUpperCase() || 'H1';

  const symbolConfig = SYMBOLS.find(s => s.symbol === pair);
  const shortName = BADGE_SHORT_NAMES[pair] ?? pair.replace('USD', '');

  const state = symbolConfig
    ? await loadBadgeState(request, pair, tf)
    : unavailableBadgeState('unsupported-symbol');
  const svg = state.available
    ? generateBadgeSvg({
        symbol: shortName,
        direction: state.direction,
        confidence: state.confidence,
        rsi: state.rsi,
        timeframe: tf,
      })
    : generateUnavailableBadgeSvg(shortName, state.reason);

  return new NextResponse(svg, {
    headers: {
      ...BADGE_RESPONSE_HEADERS,
      'X-TradeClaw-Data-State': state.available ? 'recorded-real-signal' : 'unavailable',
      ...(state.recordedAt ? { 'X-TradeClaw-Recorded-At': state.recordedAt } : {}),
    },
  });
}
