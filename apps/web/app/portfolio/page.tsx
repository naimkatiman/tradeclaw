import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const PortfolioClient = dynamic(() => import('./PortfolioClient'), {
  loading: () => (
    <div className="premium-product-shell min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: 'Portfolio Signal Scanner — TradeClaw',
  description:
    'Map entered holdings to the latest available TradeClaw rule directions. This is signal alignment, not broker-connected portfolio performance.',
  openGraph: {
    title: 'Portfolio Signal Scanner — TradeClaw',
    description: 'Map holdings to the latest available BUY, SELL, or HOLD rule outputs.',
    type: 'website',
  },
};

export default function PortfolioPage() {
  return <PortfolioClient />;
}
