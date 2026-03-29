import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const BrokerSimClient = dynamic(
  () => import('./BrokerSimClient').then(m => ({ default: m.BrokerSimClient })),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  },
);

export const metadata: Metadata = {
  title: 'Broker Simulator — TradeClaw',
  description:
    'Paper-test broker connections (MetaTrader, IBKR, Alpaca, Binance) with TradeClaw. See the full connection flow, mock API responses, and copy-paste integration code.',
  openGraph: {
    title: 'Broker Simulator — TradeClaw',
    description:
      'Test MetaTrader, IBKR, Alpaca, and Binance connections with mock APIs. See what live broker integration looks like.',
    type: 'website',
  },
};

export default function BrokerSimPage() {
  return <BrokerSimClient />;
}
