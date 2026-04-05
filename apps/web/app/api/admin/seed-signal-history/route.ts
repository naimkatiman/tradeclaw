import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '../../../../lib/db-pool';

interface LiveSignalRow {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  timeframe: string;
  entry: number;
  tp1: number;
  sl: number;
  created_at: string;
}

/**
 * One-time seed endpoint: migrates all records from live_signals to signal_history.
 * This bridges the two tables so track record starts populating immediately.
 *
 * POST /api/admin/seed-signal-history?limit=50
 * - limit: max records to seed (default: all)
 *
 * Returns: { seeded: number, total: number, skipped: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '9999');

    // Fetch all active signals from live_signals
    const liveSignals = await query<LiveSignalRow>(
      `
      SELECT id, symbol, direction, confidence, timeframe, entry, tp1, sl, created_at
      FROM live_signals
      WHERE expires_at IS NULL OR expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT $1
      `,
      [limit]
    );

    if (!liveSignals || liveSignals.length === 0) {
      return NextResponse.json(
        { success: true, seeded: 0, total: 0, skipped: 0, message: 'No live signals to seed' },
        { status: 200 }
      );
    }

    let seeded = 0;
    let skipped = 0;

    // Upsert each signal into signal_history
    for (const sig of liveSignals) {
      try {
        await execute(
          `
          INSERT INTO signal_history (
            id, pair, timeframe, direction, confidence, entry_price, tp1, sl, is_simulated, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
          `,
          [
            sig.id,
            sig.symbol,
            sig.timeframe,
            sig.direction,
            sig.confidence,
            sig.entry,
            sig.tp1,
            sig.sl,
            false, // is_simulated = FALSE (real signals)
            sig.created_at,
          ]
        );
        seeded++;
      } catch (err) {
        console.error(`Failed to seed signal ${sig.id}:`, err);
        skipped++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        seeded,
        total: liveSignals.length,
        skipped,
        message: `Seeded ${seeded} signals into signal_history`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Seed endpoint error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Allow checking seed status via GET
  try {
    const count = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM signal_history WHERE is_simulated = FALSE'
    );

    const resolved = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM signal_history
       WHERE is_simulated = FALSE AND outcome_24h IS NOT NULL`
    );

    return NextResponse.json(
      {
        totalRecords: parseInt(count?.[0]?.count || '0'),
        resolvedRecords: parseInt(resolved?.[0]?.count || '0'),
        message: 'Use POST to seed, GET to check status',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Seed status error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
