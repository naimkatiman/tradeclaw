import { NextRequest, NextResponse } from 'next/server';
import { SYMBOLS } from '../../../../lib/signals';
import { BADGE_SHORT_NAMES } from '../../../../lib/badge';
import { loadBadgeState, unavailableBadgeState } from '../../badge-state';

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

  const state = symbolConfig
    ? await loadBadgeState(request, pair, tf)
    : unavailableBadgeState('unsupported-symbol');
  const dirIcon = state.available && state.direction === 'BUY' ? '▲' : '▼';
  const message = state.available
    ? `${dirIcon} ${state.direction} ${state.confidence}%`
    : 'unavailable';
  const color = state.available
    ? state.direction === 'BUY' ? 'brightgreen' : 'red'
    : 'inactive';

  return NextResponse.json(
    {
      schemaVersion: 1,
      label: `TradeClaw ${shortName}`,
      message,
      color,
      available: state.available,
      recordedAt: state.recordedAt,
      dataQuality: state.dataQuality,
      reason: state.available ? null : state.reason,
      note: state.available
        ? 'Latest eligible recorded real-quality signal; not a broker fill or publication-cadence guarantee.'
        : 'No eligible recorded signal is available; no placeholder direction or confidence was substituted.',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
