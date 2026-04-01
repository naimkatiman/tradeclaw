import type { Metadata } from 'next';
import NewsClient from './NewsClient';

export const metadata: Metadata = {
  title: 'Trending Coins x Live Signals | TradeClaw News',
  description:
    'CoinGecko trending coins matched with real-time TradeClaw trading signals. See which hot coins have BUY or SELL confluences.',
  openGraph: {
    title: 'Trending Coins x Live Signals | TradeClaw',
    description:
      'CoinGecko trending coins matched with real-time TradeClaw trading signals.',
    url: 'https://tradeclaw.win/news',
  },
};

async function getNewsData() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/news`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      return res.json();
    }
  } catch {
    // fall through to fallback
  }
  return {
    trending: [],
    updatedAt: new Date().toISOString(),
    error: true,
  };
}

export default async function NewsPage() {
  const data = await getNewsData();
  return <NewsClient initial={data} />;
}
