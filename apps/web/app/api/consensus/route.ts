import { NextResponse } from 'next/server';
import { SYMBOLS } from '../../lib/signals';
import { getTrackedSignals } from '../../../lib/tracked-signals';

export const dynamic = 'force-dynamic';

export interface ConsensusEntry {
  pair: string;
  name: string;
  buyCount: number;
  sellCount: number;
  totalCount: number;
  buyRatio: number; // 0-1
  dominantDirection: 'BUY' | 'SELL' | 'NEUTRAL';
  avgBuyConfidence: number | null;
  avgSellConfidence: number | null;
  timeframes: string[];
  source: 'observed-ohlcv-derived';
}

export interface ConsensusResponse {
  entries: ConsensusEntry[];
  overallBullish: number | null; // 0-100 percent; null without records
  mostBullish: string | null;
  mostBearish: string | null;
  mostConflicted: string | null;
  totalBuySignals: number;
  totalSellSignals: number;
  updatedAt: string;
  status: 'available' | 'partial' | 'empty' | 'unavailable';
  provenance: {
    source: 'observed-ohlcv-derived-signals';
    requestedTimeframes: string[];
    availableTimeframes: string[];
    unavailableTimeframes: string[];
    syntheticExcluded: true;
  };
}

const CONSENSUS_PAIRS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD', 'EURUSD',
  'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'USDCAD',
];

const REQUESTED_TIMEFRAMES = ['H1', 'H4'] as const;

export async function GET() {
  try {
    // Fetch signals for multiple timeframes to build consensus
    const [h1Result, h4Result] = await Promise.allSettled([
      getTrackedSignals({ timeframe: 'H1', minConfidence: 0 }),
      getTrackedSignals({ timeframe: 'H4', minConfidence: 0 }),
    ]);

    const availableTimeframes = REQUESTED_TIMEFRAMES.filter((_, index) =>
      [h1Result, h4Result][index].status === 'fulfilled',
    );
    const unavailableTimeframes = REQUESTED_TIMEFRAMES.filter(
      (timeframe) => !availableTimeframes.includes(timeframe),
    );

    const provenance: ConsensusResponse['provenance'] = {
      source: 'observed-ohlcv-derived-signals',
      requestedTimeframes: [...REQUESTED_TIMEFRAMES],
      availableTimeframes: [...availableTimeframes],
      unavailableTimeframes: [...unavailableTimeframes],
      syntheticExcluded: true,
    };

    if (availableTimeframes.length === 0) {
      const unavailable: ConsensusResponse & { error: string } = {
        entries: [],
        overallBullish: null,
        mostBullish: null,
        mostBearish: null,
        mostConflicted: null,
        totalBuySignals: 0,
        totalSellSignals: 0,
        updatedAt: new Date().toISOString(),
        status: 'unavailable',
        provenance,
        error: 'H1 and H4 signal sources are unavailable',
      };
      return NextResponse.json(unavailable, { status: 503 });
    }

    const allSignals = [
      ...(h1Result.status === 'fulfilled' ? h1Result.value.signals : []),
      ...(h4Result.status === 'fulfilled' ? h4Result.value.signals : []),
    ].filter((signal) => signal.dataQuality === 'real');

    const entries: ConsensusEntry[] = CONSENSUS_PAIRS.flatMap(pair => {
      const symbolConfig = SYMBOLS.find(s => s.symbol === pair);
      const pairSignals = allSignals.filter(s => s.symbol === pair);

      if (pairSignals.length === 0) {
        return [];
      }

      const buySignals = pairSignals.filter(s => s.direction === 'BUY');
      const sellSignals = pairSignals.filter(s => s.direction === 'SELL');
      const buyCount = buySignals.length;
      const sellCount = sellSignals.length;
      const totalCount = pairSignals.length;
      const buyRatio = buyCount / totalCount;

      const avgBuyConfidence = buyCount > 0
        ? buySignals.reduce((acc, s) => acc + s.confidence, 0) / buyCount
        : null;
      const avgSellConfidence = sellCount > 0
        ? sellSignals.reduce((acc, s) => acc + s.confidence, 0) / sellCount
        : null;

      return [{
        pair,
        name: symbolConfig?.name ?? pair,
        buyCount,
        sellCount,
        totalCount,
        buyRatio,
        dominantDirection: buyRatio > 0.55 ? 'BUY' : buyRatio < 0.45 ? 'SELL' : 'NEUTRAL',
        avgBuyConfidence: avgBuyConfidence === null ? null : Math.round(avgBuyConfidence),
        avgSellConfidence: avgSellConfidence === null ? null : Math.round(avgSellConfidence),
        timeframes: [...new Set(pairSignals.map((signal) => signal.timeframe))].sort(),
        source: 'observed-ohlcv-derived' as const,
      }];
    });

    const totalBuySignals = entries.reduce((acc, e) => acc + e.buyCount, 0);
    const totalSellSignals = entries.reduce((acc, e) => acc + e.sellCount, 0);
    const totalSignals = totalBuySignals + totalSellSignals;
    const overallBullish = totalSignals > 0
      ? Math.round((totalBuySignals / totalSignals) * 100)
      : null;

    const mostBullish = [...entries].sort((a, b) => b.buyRatio - a.buyRatio)[0]?.pair ?? null;
    const mostBearish = [...entries].sort((a, b) => a.buyRatio - b.buyRatio)[0]?.pair ?? null;
    const mostConflicted = [...entries].sort((a, b) =>
      Math.abs(a.buyRatio - 0.5) - Math.abs(b.buyRatio - 0.5)
    )[0]?.pair ?? null;

    const response: ConsensusResponse = {
      entries,
      overallBullish,
      mostBullish,
      mostBearish,
      mostConflicted,
      totalBuySignals,
      totalSellSignals,
      updatedAt: new Date().toISOString(),
      status: entries.length === 0 ? 'empty' : unavailableTimeframes.length > 0 ? 'partial' : 'available',
      provenance,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
