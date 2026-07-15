import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const ProofClient = dynamic(() => import('./ProofClient'), {
  loading: () => (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: 'Recorded Signal Evidence — OHLCV Outcomes | TradeClaw',
  description:
    'Non-synthetic recorded TradeClaw signals with outcomes resolved against provider OHLCV. This is not a broker-fill or customer-account record.',
  openGraph: {
    title: 'Recorded Signal Evidence — TradeClaw',
    description:
      'Recorded non-synthetic signals with OHLCV-resolved outcomes. Seeded demos are excluded; broker fills are not claimed.',
    type: 'website',
  },
};

export default function ProofPage() {
  return <ProofClient />;
}
