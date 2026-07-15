import { NextResponse } from 'next/server';
import { generateMockSignals, generateMockOHLCV, DEMO_SYMBOL_LIST } from '@tradeclaw/core';

export const dynamic = 'force-dynamic';

/**
 * Demo data endpoint — returns deterministic illustrative signals + per-symbol
 * OHLCV fixtures suitable for UI testing with no API keys
 * configured. Refreshes daily (seeded from the current UTC date) so
 * the demo looks alive without leaking real cached state across
 * unrelated visitors.
 *
 * Usage:
 *   GET /api/demo                 → { signals, symbols }
 *   GET /api/demo?symbol=BTCUSDT  → { ohlcv } for that symbol
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (symbol) {
    if (!DEMO_SYMBOL_LIST.includes(symbol)) {
      return NextResponse.json(
        { error: `Unknown demo symbol: ${symbol}`, available: DEMO_SYMBOL_LIST },
        { status: 400 },
      );
    }
    const ohlcv = generateMockOHLCV(symbol, 200);
    return NextResponse.json({
      symbol,
      ohlcv,
      isDemo: true,
      provenance: { kind: 'synthetic-fixture', marketData: false, measuredPerformance: false },
      resetsAt: nextUtcMidnightIso(),
    });
  }

  return NextResponse.json({
    signals: generateMockSignals().map((signal) => ({
      ...signal,
      source: 'illustrative-fixture',
      dataQuality: 'synthetic',
    })),
    symbols: DEMO_SYMBOL_LIST,
    isDemo: true,
    provenance: { kind: 'synthetic-fixture', marketData: false, measuredPerformance: false },
    resetsAt: nextUtcMidnightIso(),
    note: 'This is deterministic demo data, regenerated daily. Set DEMO_MODE=false and provide real data providers to switch off.',
  });
}

function nextUtcMidnightIso(): string {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0,
  ));
  return next.toISOString();
}
