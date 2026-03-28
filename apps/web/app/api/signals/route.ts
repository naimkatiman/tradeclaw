import { NextRequest, NextResponse } from 'next/server';
import { SYMBOLS } from '../../lib/signals';
import { getTrackedSignals } from '../../../lib/tracked-signals';

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

  const { signals, syntheticSymbols } = await getTrackedSignals({
    symbol: symbolFilter || undefined,
    timeframe: timeframeFilter || undefined,
    direction: directionFilter || undefined,
    minConfidence,
  });

  return NextResponse.json({
    count: signals.length,
    timestamp: new Date().toISOString(),
    engine: {
      real: signals.filter(s => s.source === 'real').length,
      fallback: 0,
      version: '2.0.0',
    },
    filters: { symbol: symbolFilter, timeframe: timeframeFilter, direction: directionFilter, minConfidence },
    signals,
    syntheticSymbols,
  });
}
