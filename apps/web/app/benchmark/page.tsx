import { Metadata } from 'next';
import BenchmarkLoader from './BenchmarkLoader';

export const metadata: Metadata = {
  title: 'Self-Hosting Cost Benchmark | TradeClaw',
  description: 'TradeClaw on a $4/mo VPS vs $200/mo SaaS. See how much you save self-hosting your trading signal platform vs TradingView, 3Commas, and Cryptohopper.',
  keywords: ['self-hosting', 'cost comparison', 'tradingview alternative', '3commas alternative', 'trading signals free', 'open source trading'],
  openGraph: {
    title: 'TradeClaw vs TradingView vs 3Commas — Real Cost Comparison',
    description: 'Self-host TradeClaw for free vs $200+/mo SaaS. Calculate your annual savings.',
    type: 'website',
  },
};

export default function BenchmarkPage() {
  return <BenchmarkLoader />;
}
