import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db-pool';

export const runtime = 'nodejs';

interface MarketRegimeRow {
  id: number;
  symbol: string;
  regime: string;
  confidence: number | string | null;
  features: Record<string, unknown> | null;
  detected_at: string;
}

interface RegimeResponse {
  symbol: string;
  regime: string;
  confidence: number | null;
  features: {
    rollingVol20d: number | null;
    returns5d: number | null;
    returns20d: number | null;
    volumeZScore: number | null;
  };
  detectedAt: string;
}

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function rowToResponse(row: MarketRegimeRow): RegimeResponse {
  return {
    symbol: row.symbol,
    regime: row.regime,
    confidence: numberOrNull(row.confidence),
    features: {
      rollingVol20d: numberOrNull(row.features?.rollingVol20d),
      returns5d: numberOrNull(row.features?.returns5d),
      returns20d: numberOrNull(row.features?.returns20d),
      volumeZScore: numberOrNull(row.features?.volumeZScore),
    },
    detectedAt: row.detected_at,
  };
}

/**
 * GET /api/v1/regime?symbol=BTCUSD — current regime for a symbol
 * GET /api/v1/regime              — current regime for all symbols (latest per symbol)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();

    if (symbol) {
      // Single symbol query
      const rows = await query<MarketRegimeRow>(
        `SELECT id, symbol, regime, confidence, features, detected_at
         FROM market_regimes
         WHERE symbol = $1
         ORDER BY detected_at DESC
         LIMIT 1`,
        [symbol],
      );

      if (rows.length === 0) {
        return NextResponse.json(
          {
            success: true,
            available: false,
            data: {
              symbol,
              regime: null,
              confidence: null,
              features: { rollingVol20d: null, returns5d: null, returns20d: null, volumeZScore: null },
              detectedAt: null,
            },
            note: 'No observed regime row is available for this symbol.',
          },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
              'Access-Control-Allow-Origin': '*',
            },
          },
        );
      }

      return NextResponse.json(
        { success: true, available: true, data: rowToResponse(rows[0]) },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }

    // All symbols — latest regime per symbol
    const rows = await query<MarketRegimeRow>(
      `SELECT DISTINCT ON (symbol)
         id, symbol, regime, confidence, features, detected_at
       FROM market_regimes
       ORDER BY symbol, detected_at DESC`,
    );

    return NextResponse.json(
      {
        success: true,
        available: rows.length > 0,
        count: rows.length,
        data: rows.map(rowToResponse),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch (error: unknown) {
    // If the table doesn't exist yet (migration not run), return graceful fallback
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('market_regimes') && message.includes('does not exist')) {
      return NextResponse.json(
        {
          success: true,
          available: false,
          count: 0,
          data: [],
          note: 'market_regimes table not yet created — run migration 004_hmm_regime.sql',
        },
        {
          headers: {
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
