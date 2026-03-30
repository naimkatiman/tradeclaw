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
  title: 'Signal Proof — Real Performance, No Simulation | TradeClaw',
  description:
    'Transparent, auditable record of every real TradeClaw signal. See live win rates, P&L outcomes, and candle-verified resolutions — no seeded or fake data.',
  openGraph: {
    title: 'Real Signal Performance Proof — TradeClaw',
    description:
      'Every live signal TradeClaw generated, with candle-verified outcomes. Real data only — seeded demos excluded.',
    type: 'website',
  },
};

export default function ProofPage() {
  return <ProofClient />;
}
