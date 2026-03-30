import { NextResponse } from 'next/server';
import { SYMBOLS } from '../../lib/signals';
import { getTrackedSignals } from '../../../lib/tracked-signals';

export interface HeatmapEntry {
  pair: string;
  name: string;
  direction: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  price: number;
  rsi: number;
  macd: number;
}

const HEATMAP_PAIRS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD', 'EURUSD',
  'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'USDCAD',
];

export async function GET() {
  try {
    const { signals } = await getTrackedSignals({
      timeframe: 'H1',
      minConfidence: 0,
    });

    // Build map: highest-confidence signal per symbol
    const signalMap = new Map<string, typeof signals[0]>();
    for (const sig of signals) {
      const existing = signalMap.get(sig.symbol);
      if (!existing || sig.confidence > existing.confidence) {
        signalMap.set(sig.symbol, sig);
      }
    }

    const entries: HeatmapEntry[] = HEATMAP_PAIRS.map(pair => {
      const sig = signalMap.get(pair);
      const symbolConfig = SYMBOLS.find(s => s.symbol === pair);

      if (sig) {
        return {
          pair,
          name: symbolConfig?.name ?? pair,
          direction: sig.direction,
          confidence: sig.confidence,
          price: sig.entry,
          rsi: sig.indicators.rsi.value,
          macd: sig.indicators.macd.histogram,
        };
      }

      // No signal found — return NEUTRAL with base price
      return {
        pair,
        name: symbolConfig?.name ?? pair,
        direction: 'NEUTRAL' as const,
        confidence: 0,
        price: symbolConfig?.basePrice ?? 0,
        rsi: 50,
        macd: 0,
      };
    });

    return NextResponse.json({
      entries,
      updatedAt: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
