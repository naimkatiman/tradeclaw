import type { Metadata } from 'next';
import LeaderboardClient from './LeaderboardClient';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tradeclaw.win';

export const metadata: Metadata = {
  title: 'Signal Outcome Table — TradeClaw',
  description: 'OHLCV-resolved rule-output study across forex, crypto, and commodities. Unsized price moves are not broker fills or portfolio returns.',
  openGraph: {
    title: 'Signal Outcome Table — TradeClaw',
    description: 'Recorded candidates and source-gated OHLCV outcomes, with unavailable evidence left unavailable.',
    images: [{ url: `${baseUrl}/api/og/leaderboard`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Signal Outcome Table — TradeClaw',
    description: 'Recorded candidates and source-gated OHLCV outcomes; not broker fills or portfolio returns.',
    images: [`${baseUrl}/api/og/leaderboard`],
  },
};

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
