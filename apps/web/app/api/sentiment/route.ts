import { NextResponse } from 'next/server';

interface FearGreedEntry {
  value: string;
  value_classification: string;
  timestamp: string;
}

interface FearGreedResponse {
  data: FearGreedEntry[];
}

interface CoinGeckoGlobalData {
  data: {
    total_market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    market_cap_percentage: Record<string, number>;
    market_cap_change_percentage_24h_usd: number;
  };
}

interface TrendingCoinItem {
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
  };
}

interface TrendingResponse {
  coins: TrendingCoinItem[];
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

// Mock fallback data
const MOCK_FEAR_GREED = { value: '65', value_classification: 'Greed', timestamp: String(Math.floor(Date.now() / 1000)) };

function generateMockHistory(): { value: string; value_classification: string; timestamp: string }[] {
  const entries = [];
  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < 30; i++) {
    const val = 40 + Math.round(35 * Math.sin(i * 0.3 + 1) * 0.5 + 17.5);
    const clamped = Math.max(20, Math.min(85, val));
    let classification = 'Neutral';
    if (clamped <= 25) classification = 'Extreme Fear';
    else if (clamped <= 45) classification = 'Fear';
    else if (clamped <= 55) classification = 'Neutral';
    else if (clamped <= 75) classification = 'Greed';
    else classification = 'Extreme Greed';
    entries.push({ value: String(clamped), value_classification: classification, timestamp: String(now - i * 86400) });
  }
  return entries;
}

const MOCK_GLOBAL_MARKET = {
  totalMarketCap: 2.4e12,
  totalVolume: 98e9,
  btcDominance: 54.2,
  ethDominance: 17.1,
  altcoinDominance: 28.7,
  marketCapChange24h: 2.3,
};

const MOCK_TRENDING = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', thumb: '', score: 0 },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', thumb: '', score: 1 },
  { id: 'solana', name: 'Solana', symbol: 'SOL', thumb: '', score: 2 },
  { id: 'binancecoin', name: 'BNB', symbol: 'BNB', thumb: '', score: 3 },
  { id: 'ripple', name: 'XRP', symbol: 'XRP', thumb: '', score: 4 },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA', thumb: '', score: 5 },
  { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', thumb: '', score: 6 },
];

const MOCK_TOP_COINS: MarketCoin[] = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', current_price: 67500, market_cap: 1.32e12, total_volume: 28.5e9, price_change_percentage_24h: 1.8, image: '' },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum', current_price: 3450, market_cap: 415e9, total_volume: 14.2e9, price_change_percentage_24h: -0.5, image: '' },
  { id: 'tether', symbol: 'usdt', name: 'Tether', current_price: 1.0, market_cap: 110e9, total_volume: 52e9, price_change_percentage_24h: 0.01, image: '' },
  { id: 'binancecoin', symbol: 'bnb', name: 'BNB', current_price: 595, market_cap: 88e9, total_volume: 1.8e9, price_change_percentage_24h: 2.3, image: '' },
  { id: 'solana', symbol: 'sol', name: 'Solana', current_price: 148, market_cap: 65e9, total_volume: 3.2e9, price_change_percentage_24h: 3.7, image: '' },
  { id: 'ripple', symbol: 'xrp', name: 'XRP', current_price: 0.62, market_cap: 34e9, total_volume: 1.4e9, price_change_percentage_24h: -1.2, image: '' },
  { id: 'usd-coin', symbol: 'usdc', name: 'USD Coin', current_price: 1.0, market_cap: 33e9, total_volume: 5.8e9, price_change_percentage_24h: 0.0, image: '' },
  { id: 'cardano', symbol: 'ada', name: 'Cardano', current_price: 0.45, market_cap: 16e9, total_volume: 420e6, price_change_percentage_24h: -2.8, image: '' },
  { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', current_price: 0.084, market_cap: 12e9, total_volume: 680e6, price_change_percentage_24h: 5.2, image: '' },
  { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche', current_price: 36.5, market_cap: 14e9, total_volume: 520e6, price_change_percentage_24h: -4.1, image: '' },
];

export const revalidate = 300;

export async function GET() {
  const [fngResult, globalResult, trendingResult, marketsResult] = await Promise.allSettled([
    fetch('https://api.alternative.me/fng/?limit=30', { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) }).then(r => r.json()) as Promise<FearGreedResponse>,
    fetch('https://api.coingecko.com/api/v3/global', { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) }).then(r => r.json()) as Promise<CoinGeckoGlobalData>,
    fetch('https://api.coingecko.com/api/v3/search/trending', { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) }).then(r => r.json()) as Promise<TrendingResponse>,
    fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false', { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) }).then(r => r.json()) as Promise<MarketCoin[]>,
  ]);

  // Track which data sources are live vs fallback
  const sources: Record<string, 'live' | 'mock'> = {
    fearGreed: 'mock',
    globalMarket: 'mock',
    trendingCoins: 'mock',
    topCoins: 'mock',
  };

  // Fear & Greed
  let fearGreed = { value: Number(MOCK_FEAR_GREED.value), classification: MOCK_FEAR_GREED.value_classification };
  let fearGreedHistory = generateMockHistory().map(e => ({ value: Number(e.value), classification: e.value_classification, timestamp: Number(e.timestamp) }));
  if (fngResult.status === 'fulfilled' && fngResult.value?.data?.length) {
    const d = fngResult.value.data;
    fearGreed = { value: Number(d[0].value), classification: d[0].value_classification };
    fearGreedHistory = d.map(e => ({ value: Number(e.value), classification: e.value_classification, timestamp: Number(e.timestamp) }));
    sources.fearGreed = 'live';
  }

  // Global market
  let globalMarket = MOCK_GLOBAL_MARKET;
  if (globalResult.status === 'fulfilled' && globalResult.value?.data) {
    const g = globalResult.value.data;
    const btcDom = g.market_cap_percentage?.btc ?? 54.2;
    const ethDom = g.market_cap_percentage?.eth ?? 17.1;
    globalMarket = {
      totalMarketCap: g.total_market_cap?.usd ?? 2.4e12,
      totalVolume: g.total_volume?.usd ?? 98e9,
      btcDominance: btcDom,
      ethDominance: ethDom,
      altcoinDominance: Math.round((100 - btcDom - ethDom) * 10) / 10,
      marketCapChange24h: g.market_cap_change_percentage_24h_usd ?? 2.3,
    };
    sources.globalMarket = 'live';
  }

  // Trending coins
  let trendingCoins = MOCK_TRENDING;
  if (trendingResult.status === 'fulfilled' && trendingResult.value?.coins?.length) {
    trendingCoins = trendingResult.value.coins.slice(0, 7).map(c => ({
      id: c.item.id,
      name: c.item.name,
      symbol: c.item.symbol,
      thumb: c.item.thumb,
      score: c.item.score,
    }));
    sources.trendingCoins = 'live';
  }

  // Top coins
  let topCoins = MOCK_TOP_COINS;
  if (marketsResult.status === 'fulfilled' && Array.isArray(marketsResult.value) && marketsResult.value.length) {
    topCoins = marketsResult.value.slice(0, 10);
    sources.topCoins = 'live';
  }

  const hasMock = Object.values(sources).some(s => s === 'mock');

  return NextResponse.json({ fearGreed, fearGreedHistory, globalMarket, trendingCoins, topCoins, sources, ...(hasMock && { mock: true }) });
}
