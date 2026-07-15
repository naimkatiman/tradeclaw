import { NextRequest, NextResponse } from 'next/server';
import { SYMBOLS } from '../../lib/signals';
import { BADGE_SHORT_NAMES } from '../../lib/badge';
import { loadBadgeState } from '../badge/badge-state';

export const dynamic = 'force-dynamic';

/**
 * Bulk badge data endpoint — returns all pairs' badge info in one call.
 * GET /api/badges?tf=H1
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tf = searchParams.get('tf')?.toUpperCase() || 'H1';
  const baseUrl = new URL(request.url).origin;

  const results = await Promise.all(
    SYMBOLS.map(async symbolConfig => {
      const pair = symbolConfig.symbol;
      const shortName = BADGE_SHORT_NAMES[pair] ?? pair.replace('USD', '');
      const state = await loadBadgeState(request, pair, tf);
      const badgeUrl = `${baseUrl}/api/badge/${pair}?tf=${encodeURIComponent(tf)}`;
      const jsonUrl = `${baseUrl}/api/badge/${pair}/json?tf=${encodeURIComponent(tf)}`;

      return {
        pair,
        shortName,
        available: state.available,
        direction: state.direction,
        confidence: state.confidence,
        rsi: state.rsi,
        recordedAt: state.recordedAt,
        dataQuality: state.dataQuality,
        reason: state.available ? null : state.reason,
        timeframe: tf,
        badgeUrl,
        shieldsUrl: `https://img.shields.io/endpoint?url=${encodeURIComponent(jsonUrl)}`,
        color: state.available
          ? state.direction === 'BUY' ? 'brightgreen' : 'red'
          : 'inactive',
      };
    }),
  );

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
