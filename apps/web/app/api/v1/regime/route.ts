import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db-pool';

export const runtime = 'nodejs';

interface MarketRegimeRow {
  id: number;
  symbol: string;
  regime: string;
  confidence: number;
  features: Record<string, number>;
  detected_at: string;
}

interface RegimeResponse {
  symbol: string;
  regime: string;
  confidence: number;
  features: {
    rollingVol20d: number;
    returns5d: number;
    returns20d: number;
    volumeZScore: number;
  };
  detectedAt: string;
}

function rowToResponse(row: MarketRegimeRow): RegimeResponse {
  return {
    symbol: row.symbol,
    regime: row.regime,
    confidence: Number(row.confidence),
    features: {
      rollingVol20d: row.features?.rollingVol20d ?? 0,
      returns5d: row.features?.returns5d ?? 0,
      returns20d: row.features?.returns20d ?? 0,
      volumeZScore: row.features?.volumeZScore ?? 0,
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
            data: {
              symbol,
              regime: 'neutral',
              confidence: 0,
              features: { rollingVol20d: 0, returns5d: 0, returns20d: 0, volumeZScore: 0 },
              detectedAt: null,
            },
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
        { success: true, data: rowToResponse(rows[0]) },
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
