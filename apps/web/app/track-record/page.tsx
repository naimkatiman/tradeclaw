import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getTrackRecordTranslations } from '../../lib/product-i18n/track-record';
import { getPreferredLocaleFromCookie } from '../../lib/product-i18n/server-locale';

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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPreferredLocaleFromCookie();
  const title = getTrackRecordTranslations(locale).documentTitle;
  return {
    title,
    description:
      'Source-backed TradeClaw signal outcomes resolved against provider OHLCV, with counted and excluded populations shown separately.',
    openGraph: {
      title,
      description:
        'Observed OHLCV-resolved signal outcomes and exclusions. This is not a broker-fill or customer-portfolio ledger.',
      images: [{ url: ogImage, width: 1200, height: 630, alt: 'TradeClaw Track Record' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: 'Source-backed recorded signals resolved against provider OHLCV. No broker fills or portfolio returns are claimed.',
      images: [ogImage],
    },
  };
}

export default function TrackRecordPage() {
  return <TrackRecordClient />;
}
