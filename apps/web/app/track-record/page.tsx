import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const TrackRecordClient = dynamic(
  () => import('./TrackRecordClient').then(m => ({ default: m.TrackRecordClient })),
  {
    loading: () => (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  },
);

const ogImage = '/api/og/track-record';

export const metadata: Metadata = {
  title: 'Verified Signal Track Record — TradeClaw',
  description:
    'Transparent, verified trading signal performance. Win rates, P&L, equity curves, and per-symbol breakdown across crypto, forex, and commodities.',
  openGraph: {
    title: 'Verified Signal Track Record — TradeClaw',
    description:
      'Real performance data for TradeClaw AI trading signals. No cherry-picking, no hiding losses.',
    images: [{ url: ogImage, width: 1200, height: 630, alt: 'TradeClaw Track Record' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Verified Signal Track Record — TradeClaw',
    description: 'Real performance data for TradeClaw AI trading signals.',
    images: [ogImage],
  },
};

export default function TrackRecordPage() {
  return <TrackRecordClient />;
}
