import { NextResponse } from 'next/server';
import { getTrackedSignals } from '../../../lib/tracked-signals';

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

const MOCK_TRENDING: TrendingCoin[] = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', marketCapRank: 1, thumb: '', large: '', priceBtc: 1, score: 0, priceUsd: '$67,000', priceChange24h: 2.4, pair: 'BTCUSD', signal: { direction: 'BUY', confidence: 78, timeframe: '1H' } },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', marketCapRank: 2, thumb: '', large: '', priceBtc: 0.05, score: 1, priceUsd: '$3,400', priceChange24h: 1.2, pair: 'ETHUSD', signal: { direction: 'BUY', confidence: 72, timeframe: '1H' } },
  { id: 'solana', name: 'Solana', symbol: 'SOL', marketCapRank: 5, thumb: '', large: '', priceBtc: 0.002, score: 2, priceUsd: '$145', priceChange24h: -0.8, pair: 'SOLUSD', signal: { direction: 'SELL', confidence: 65, timeframe: '4H' } },
  { id: 'ripple', name: 'XRP', symbol: 'XRP', marketCapRank: 6, thumb: '', large: '', priceBtc: 0.000009, score: 3, priceUsd: '$0.62', priceChange24h: 0.5, pair: 'XRPUSD', signal: null },
  { id: 'binancecoin', name: 'BNB', symbol: 'BNB', marketCapRank: 4, thumb: '', large: '', priceBtc: 0.009, score: 4, priceUsd: '$580', priceChange24h: 1.8, pair: 'BNBUSD', signal: { direction: 'BUY', confidence: 81, timeframe: '1H' } },
];

export async function GET() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/search/trending', {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { trending: MOCK_TRENDING, updatedAt: new Date().toISOString(), mock: true },
        { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
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
            const result = await getTrackedSignals({ symbol: pair });
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
      { trending: MOCK_TRENDING, updatedAt: new Date().toISOString(), mock: true },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  }
}
