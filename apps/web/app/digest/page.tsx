import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const DigestClient = dynamic(
  () => import('./DigestClient').then(m => ({ default: m.DigestClient })),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  },
);

export const metadata: Metadata = {
  title: 'Signal Digest — TradeClaw',
  description:
    'Daily JSON digest of top trading signals. Ready for n8n, Make, Zapier, or any cron job. Free API endpoint with setup guides.',
  openGraph: {
    title: 'Signal Digest API — TradeClaw',
    description:
      'JSON daily digest of top signals, ready for any automation platform. Free, open, no auth needed.',
    type: 'website',
  },
};

export default function DigestPage() {
  return <DigestClient />;
}
