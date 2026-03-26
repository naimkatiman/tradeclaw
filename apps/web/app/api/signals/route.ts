import { NextRequest, NextResponse } from 'next/server';
import { getSignals, SYMBOLS } from '../../lib/signals';

// Re-export types for consumers that imported from here
export type { TradingSignal, IndicatorSummary } from '../../lib/signals';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbolFilter = searchParams.get('symbol')?.toUpperCase();
  const timeframeFilter = searchParams.get('timeframe')?.toUpperCase();
  const directionFilter = searchParams.get('direction')?.toUpperCase() as 'BUY' | 'SELL' | null;
  const minConfidence = parseInt(searchParams.get('minConfidence') || '0');

  // Validate symbol if provided
  if (symbolFilter && !SYMBOLS.some(s => s.symbol === symbolFilter)) {
    return NextResponse.json(
      { error: `Unknown symbol: ${symbolFilter}`, available: SYMBOLS.map(s => s.symbol) },
      { status: 400 }
    );
  }

  const signals = await getSignals({
    symbol: symbolFilter || undefined,
    timeframe: timeframeFilter || undefined,
    direction: directionFilter || undefined,
    minConfidence,
  });

  // Count real vs fallback signals
  const realCount = signals.filter(s => s.source === 'real').length;
  const fallbackCount = signals.filter(s => s.source === 'fallback').length;

  return NextResponse.json({
    count: signals.length,
    timestamp: new Date().toISOString(),
    engine: {
      real: realCount,
      fallback: fallbackCount,
      version: '2.0.0', // TC-009: Real TA engine
    },
    filters: { symbol: symbolFilter, timeframe: timeframeFilter, direction: directionFilter, minConfidence },
    signals,
  });
}
