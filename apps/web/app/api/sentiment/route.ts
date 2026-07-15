import { NextResponse } from 'next/server';

interface FearGreedEntry {
  value: string;
  value_classification: string;
  timestamp: string;
}

interface CoinGeckoGlobalData {
  data: {
    total_market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    market_cap_percentage: Record<string, number>;
    market_cap_change_percentage_24h_usd: number;
  };
}

interface TrendingResponse {
  coins: Array<{
    item: {
      id: string;
      name: string;
      symbol: string;
      thumb: string;
      score: number;
    };
  }>;
}

interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  image: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  return response.json() as Promise<T>;
}

function finite(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid ${label}`);
  return parsed;
}

export const revalidate = 300;

export async function GET() {
  try {
    const [fearGreedResponse, globalResponse, trendingResponse, marketsResponse] = await Promise.all([
      fetchJson<{ data: FearGreedEntry[] }>('https://api.alternative.me/fng/?limit=30'),
      fetchJson<CoinGeckoGlobalData>('https://api.coingecko.com/api/v3/global'),
      fetchJson<TrendingResponse>('https://api.coingecko.com/api/v3/search/trending'),
      fetchJson<MarketCoin[]>('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false'),
    ]);

    if (!fearGreedResponse.data?.length || !trendingResponse.coins?.length || !marketsResponse.length) {
      throw new Error('Provider payload was incomplete');
    }

    const global = globalResponse.data;
    const btcDominance = finite(global.market_cap_percentage?.btc, 'BTC dominance');
    const ethDominance = finite(global.market_cap_percentage?.eth, 'ETH dominance');

    const fearGreedHistory = fearGreedResponse.data.map((entry) => ({
      value: finite(entry.value, 'fear and greed value'),
      classification: entry.value_classification,
      timestamp: finite(entry.timestamp, 'fear and greed timestamp'),
    }));

    return NextResponse.json({
      fearGreed: {
        value: fearGreedHistory[0].value,
        classification: fearGreedHistory[0].classification,
      },
      fearGreedHistory,
      globalMarket: {
        totalMarketCap: finite(global.total_market_cap?.usd, 'market cap'),
        totalVolume: finite(global.total_volume?.usd, 'market volume'),
        btcDominance,
        ethDominance,
        altcoinDominance: Math.max(0, 100 - btcDominance - ethDominance),
        marketCapChange24h: finite(global.market_cap_change_percentage_24h_usd, 'market cap change'),
      },
      trendingCoins: trendingResponse.coins.slice(0, 7).map(({ item }) => ({
        id: item.id,
        name: item.name,
        symbol: item.symbol,
        thumb: item.thumb,
        score: item.score,
      })),
      topCoins: marketsResponse.slice(0, 10).map((coin) => ({
        ...coin,
        current_price: finite(coin.current_price, `${coin.id} price`),
        market_cap: finite(coin.market_cap, `${coin.id} market cap`),
        total_volume: finite(coin.total_volume, `${coin.id} volume`),
        price_change_percentage_24h: finite(coin.price_change_percentage_24h, `${coin.id} change`),
      })),
      sources: {
        fearGreed: 'alternative.me',
        globalMarket: 'coingecko',
        trendingCoins: 'coingecko',
        topCoins: 'coingecko',
      },
      fetchedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
  } catch (error) {
    console.warn('[sentiment] provider data unavailable:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Sentiment provider data is currently unavailable; no synthetic fallback is used.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
