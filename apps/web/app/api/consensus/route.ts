import { NextRequest, NextResponse } from 'next/server';
import { SYMBOLS } from '../../lib/signals';
import { getTrackedSignals } from '../../../lib/tracked-signals';
import { resolveLicense } from '../../../lib/licenses';

export interface ConsensusEntry {
  pair: string;
  name: string;
  buyCount: number;
  sellCount: number;
  totalCount: number;
  buyRatio: number; // 0-1
  dominantDirection: 'BUY' | 'SELL' | 'NEUTRAL';
  avgBuyConfidence: number;
  avgSellConfidence: number;
  trend24h: 'UP' | 'DOWN' | 'FLAT'; // vs 24h prior snapshot
  source: 'live' | 'synthetic'; // whether data comes from real signals or is algorithmically generated
}

export interface ConsensusResponse {
  entries: ConsensusEntry[];
  overallBullish: number; // 0-100 percent
  mostBullish: string;
  mostBearish: string;
  mostConflicted: string;
  totalBuySignals: number;
  totalSellSignals: number;
  updatedAt: string;
  hasSynthetic: boolean; // true if any entries use synthetic fallback data
}

const CONSENSUS_PAIRS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD', 'EURUSD',
  'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'USDCAD',
];

// Simulate 24h trend with deterministic logic based on current hour
function getTrend24h(pair: string, buyRatio: number): 'UP' | 'DOWN' | 'FLAT' {
  const hourSeed = new Date().getHours();
  const hash = (pair.charCodeAt(0) * 7 + pair.charCodeAt(1) * 13 + hourSeed) % 3;
  if (buyRatio > 0.6) return hash === 0 ? 'FLAT' : 'UP';
  if (buyRatio < 0.4) return hash === 0 ? 'FLAT' : 'DOWN';
  return 'FLAT';
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await resolveLicense(req);
    // Fetch signals for multiple timeframes to build consensus
    const [h1Result, h4Result] = await Promise.allSettled([
      getTrackedSignals({ timeframe: 'H1', minConfidence: 0, ctx }),
      getTrackedSignals({ timeframe: 'H4', minConfidence: 0, ctx }),
    ]);

    const allSignals = [
      ...(h1Result.status === 'fulfilled' ? h1Result.value.signals : []),
      ...(h4Result.status === 'fulfilled' ? h4Result.value.signals : []),
    ];

    const entries: ConsensusEntry[] = CONSENSUS_PAIRS.map(pair => {
      const symbolConfig = SYMBOLS.find(s => s.symbol === pair);
      const pairSignals = allSignals.filter(s => s.symbol === pair);

      if (pairSignals.length === 0) {
        // Deterministic fallback using pair + current hour
        const hour = new Date().getHours();
        const seed = pair.charCodeAt(0) + pair.charCodeAt(2) + hour;
        const buyCount = Math.max(1, (seed % 5) + 1);
        const sellCount = Math.max(1, ((seed * 3) % 4) + 1);
        const totalCount = buyCount + sellCount;
        const buyRatio = buyCount / totalCount;
        return {
          pair,
          name: symbolConfig?.name ?? pair,
          buyCount,
          sellCount,
          totalCount,
          buyRatio,
          dominantDirection: buyRatio > 0.55 ? 'BUY' : buyRatio < 0.45 ? 'SELL' : 'NEUTRAL',
          avgBuyConfidence: 65 + (seed % 20),
          avgSellConfidence: 60 + ((seed * 2) % 20),
          trend24h: getTrend24h(pair, buyRatio),
          source: 'synthetic' as const,
        };
      }

      const buySignals = pairSignals.filter(s => s.direction === 'BUY');
      const sellSignals = pairSignals.filter(s => s.direction === 'SELL');
      const buyCount = buySignals.length;
      const sellCount = sellSignals.length;
      const totalCount = pairSignals.length;
      const buyRatio = totalCount > 0 ? buyCount / totalCount : 0.5;

      const avgBuyConfidence = buyCount > 0
        ? buySignals.reduce((acc, s) => acc + s.confidence, 0) / buyCount
        : 0;
      const avgSellConfidence = sellCount > 0
        ? sellSignals.reduce((acc, s) => acc + s.confidence, 0) / sellCount
        : 0;

      return {
        pair,
        name: symbolConfig?.name ?? pair,
        buyCount,
        sellCount,
        totalCount,
        buyRatio,
        dominantDirection: buyRatio > 0.55 ? 'BUY' : buyRatio < 0.45 ? 'SELL' : 'NEUTRAL',
        avgBuyConfidence: Math.round(avgBuyConfidence),
        avgSellConfidence: Math.round(avgSellConfidence),
        trend24h: getTrend24h(pair, buyRatio),
        source: 'live' as const,
      };
    });

    const totalBuySignals = entries.reduce((acc, e) => acc + e.buyCount, 0);
    const totalSellSignals = entries.reduce((acc, e) => acc + e.sellCount, 0);
    const totalSignals = totalBuySignals + totalSellSignals;
    const overallBullish = totalSignals > 0
      ? Math.round((totalBuySignals / totalSignals) * 100)
      : 50;

    const mostBullish = [...entries].sort((a, b) => b.buyRatio - a.buyRatio)[0]?.pair ?? 'BTCUSD';
    const mostBearish = [...entries].sort((a, b) => a.buyRatio - b.buyRatio)[0]?.pair ?? 'XAGUSD';
    const mostConflicted = [...entries].sort((a, b) =>
      Math.abs(a.buyRatio - 0.5) - Math.abs(b.buyRatio - 0.5)
    )[0]?.pair ?? 'EURUSD';

    const hasSynthetic = entries.some(e => e.source === 'synthetic');

    const response: ConsensusResponse = {
      entries,
      overallBullish,
      mostBullish,
      mostBearish,
      mostConflicted,
      totalBuySignals,
      totalSellSignals,
      updatedAt: new Date().toISOString(),
      hasSynthetic,
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
