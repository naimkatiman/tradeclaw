import type { Metadata } from 'next';
import { BrokersClient } from './BrokersClient';

export const metadata: Metadata = {
  title: 'Broker Routing Reference | TradeClaw',
  description:
    'Review TradeClaw broker execution status and external API starter examples. Binance USDT-perpetual testnet execution is implemented; the other broker snippets are not native integrations.',
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
    title: 'Broker Routing Reference | TradeClaw',
    description:
      'One native Binance USDT-perpetual adapter plus external broker API examples. Execution is disabled by default and examples are not production-ready integrations.',
    type: 'website',
  },
};

export default function BrokersPage() {
  return <BrokersClient />;
}
