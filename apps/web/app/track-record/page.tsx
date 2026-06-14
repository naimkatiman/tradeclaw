import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const TrackRecordClient = dynamic(
  () => import('./TrackRecordClient').then(m => ({ default: m.TrackRecordClient })),
  {
    loading: () => (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  },
);

const ogImage = '/api/og/track-record';

export const metadata: Metadata = {
  title: 'Recorded Signal Track Record — TradeClaw',
  description:
    'Transparent trading signal performance, resolved against Binance/Yahoo OHLCV. Win rates, P&L, equity curves, and per-symbol breakdown across crypto, forex, and commodities.',
  openGraph: {
    title: 'Recorded Signal Track Record — TradeClaw',
    description:
      'Real performance data for TradeClaw AI trading signals, resolved against Binance/Yahoo OHLCV. No cherry-picking, no hiding losses.',
    images: [{ url: ogImage, width: 1200, height: 630, alt: 'TradeClaw Track Record' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recorded Signal Track Record — TradeClaw',
    description: 'Real performance data for TradeClaw AI trading signals, resolved against Binance/Yahoo OHLCV.',
    images: [ogImage],
  },
};

export default function TrackRecordPage() {
  return <TrackRecordClient />;
}
