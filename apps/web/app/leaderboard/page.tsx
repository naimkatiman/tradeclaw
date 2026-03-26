import type { Metadata } from 'next';
import LeaderboardClient from './LeaderboardClient';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tradeclaw.com';

export const metadata: Metadata = {
  title: 'Signal Performance Leaderboard — TradeClaw',
  description: 'Live accuracy tracking for AI trading signals across forex, crypto, and commodities. 4h and 24h hit rates, streaks, and P&L stats.',
  openGraph: {
    title: 'Signal Performance Leaderboard — TradeClaw',
    description: 'AI signal accuracy ranked by hit rate across 10+ pairs. Free & open-source.',
    images: [{ url: `${baseUrl}/api/og/leaderboard`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Signal Performance Leaderboard — TradeClaw',
    description: 'AI signal accuracy ranked by hit rate across 10+ pairs.',
    images: [`${baseUrl}/api/og/leaderboard`],
  },
};

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
