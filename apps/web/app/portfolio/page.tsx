import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const PortfolioClient = dynamic(() => import('./PortfolioClient'), {
  loading: () => (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: 'Portfolio Signal Scanner — TradeClaw',
  description:
    'Input your holdings and get real-time TradeClaw signal alignment scores per asset. See portfolio-wide consensus, BUY/SELL/HOLD status, and export your snapshot as JSON.',
  openGraph: {
    title: 'Portfolio Signal Scanner — TradeClaw',
    description: 'See which of your holdings have active BUY or SELL signals right now.',
    type: 'website',
  },
};

export default function PortfolioPage() {
  return <PortfolioClient />;
}
