import { Metadata } from 'next';
import ExchangesClient from './ExchangesClient';

export const metadata: Metadata = {
  title: '100+ Exchange Integrations | TradeClaw',
  description:
    'Connect TradeClaw to Binance, Coinbase, Kraken, OKX, Bybit and 100+ more exchanges via CCXT. Unified API for spot, futures, and margin trading.',
  openGraph: {
    title: 'TradeClaw × CCXT — 100+ Exchange Integrations',
    description:
      'Connect live AI trading signals to any crypto exchange. One unified API via CCXT.',
  },
};

export default function ExchangesPage() {
  return <ExchangesClient />;
}
