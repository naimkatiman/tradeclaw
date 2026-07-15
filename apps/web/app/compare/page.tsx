import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const CompareClient = dynamic(() => import('./CompareClient').then(m => ({ default: m.CompareClient })), {
  loading: () => (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: 'TradeClaw vs TradingView vs TA-Lib vs pandas-ta — Open Source Signal Platform Comparison',
  description:
    'Compare TradeClaw against TradingView, TA-Lib, pandas-ta, and 3Commas. See why developers choose TradeClaw: open-source, self-hosted, free REST API, Docker deploy, and AI-powered signals for Forex, Crypto & Commodities.',
  openGraph: {
    title: 'TradeClaw vs TradingView vs TA-Lib vs pandas-ta — Open Source Signal Platform Comparison',
    description:
      'A repository-oriented comparison of TradeClaw with hosted products and indicator libraries. TradeClaw is MIT-licensed and Docker-deployable.',
    type: 'website',
    images: ['/api/og'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TradeClaw vs TradingView vs TA-Lib vs pandas-ta',
    description:
      'MIT-licensed, self-hostable trading signal platform with documented Docker configuration.',
    images: ['/api/og'],
  },
};

export default function ComparePage() {
  return <CompareClient />;
}
