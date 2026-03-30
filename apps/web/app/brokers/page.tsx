import type { Metadata } from 'next';
import { BrokersClient } from './BrokersClient';

export const metadata: Metadata = {
  title: 'Broker Integrations | TradeClaw',
  description:
    'Connect TradeClaw signals to Binance, Alpaca, OANDA, Kraken, Bybit, Interactive Brokers, and more. Route AI trading signals directly to your broker via webhooks.',
  keywords: [
    'broker integration',
    'trading API',
    'Binance API',
    'Alpaca API',
    'OANDA API',
    'automated trading',
    'signal routing',
    'TradeClaw',
  ],
  openGraph: {
    title: 'Connect Your Broker | TradeClaw',
    description: 'Route TradeClaw AI signals directly to your broker or exchange via API.',
    type: 'website',
  },
};

export default function BrokersPage() {
  return <BrokersClient />;
}
