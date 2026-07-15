import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const ContributeClient = dynamic(() => import('./ContributeClient').then(m => ({ default: m.ContributeClient })), {
  loading: () => (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: 'Contribute — TradeClaw',
  description:
    'Contribute to TradeClaw through verified GitHub issues, the setup guide, and public contribution-guidance requests.',
  openGraph: {
    title: 'Contribute to TradeClaw',
    description:
      'Verified GitHub issues, a development setup guide, and public guidance requests for TradeClaw contributors.',
    type: 'website',
  },
};

export default function ContributePage() {
  return <ContributeClient />;
}
