import { NextRequest, NextResponse } from 'next/server';
import { getTrackedSignalsForRequest } from '../../../lib/tracked-signals';

const COIN_TO_PAIR: Record<string, string> = {
  btc: 'BTCUSD',
  eth: 'ETHUSD',
  sol: 'SOLUSD',
  bnb: 'BNBUSD',
  xrp: 'XRPUSD',
};

interface CoinGeckoTrendingItem {
  item: {
    id: string;
    coin_id: number;
    name: string;
    symbol: string;
    market_cap_rank: number;
    thumb: string;
    small: string;
    large: string;
    slug: string;
    price_btc: number;
    score: number;
    data?: {
      price: string;
      price_change_percentage_24h?: Record<string, number>;
      market_cap?: string;
      total_volume?: string;
    };
  };
}

interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  marketCapRank: number;
  thumb: string;
  large: string;
  priceBtc: number;
  score: number;
  priceUsd: string | null;
  priceChange24h: number | null;
  pair: string | null;
  signal: { direction: string; confidence: number; timeframe: string } | null;
}

export async function GET(req: NextRequest) {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/search/trending', {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          available: false,
          trending: [],
          updatedAt: new Date().toISOString(),
          error: 'CoinGecko trending data is unavailable',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const data = await res.json();
    const coins: CoinGeckoTrendingItem[] = data.coins ?? [];

    const trending: TrendingCoin[] = await Promise.all(
      coins.slice(0, 15).map(async ({ item }) => {
        const sym = item.symbol.toLowerCase();
        const pair = COIN_TO_PAIR[sym] ?? null;
        let signal: TrendingCoin['signal'] = null;

        if (pair) {
          try {
            const result = await getTrackedSignalsForRequest(req, { symbol: pair });
            const top = result.signals[0];
            if (top) {
              signal = {
                direction: top.direction,
                confidence: top.confidence,
                timeframe: top.timeframe,
              };
            }
          } catch {
            // signal stays null
          }
        }

        return {
          id: item.id,
          name: item.name,
          symbol: item.symbol.toUpperCase(),
          marketCapRank: item.market_cap_rank,
          thumb: item.thumb,
          large: item.large ?? item.small ?? item.thumb,
          priceBtc: item.price_btc,
          score: item.score,
          priceUsd: item.data?.price ?? null,
          priceChange24h: item.data?.price_change_percentage_24h?.usd ?? null,
          pair,
          signal,
        };
      }),
    );

    return NextResponse.json(
      { trending, updatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch {
    return NextResponse.json(
      {
        available: false,
        trending: [],
        updatedAt: new Date().toISOString(),
        error: 'CoinGecko trending data is unavailable',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
