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
  title: 'Weekly Digest — TradeClaw',
  description:
    'Preview a digest built from counted, observed-provenance signal outcomes.',
  openGraph: {
    title: 'Weekly Signal Digest — TradeClaw',
    description:
      'Preview a digest built from counted, observed-provenance signal outcomes. Delivery depends on deployment configuration.',
    type: 'website',
  },
};

export default function DigestPage() {
  return <DigestClient />;
}
