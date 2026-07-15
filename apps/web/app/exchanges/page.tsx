import type { Metadata } from 'next';
import ExchangesClient from './ExchangesClient';

export const metadata: Metadata = {
  title: 'Exchange Execution Status | TradeClaw',
  description:
    'Current TradeClaw exchange execution status, including the server-side Binance futures path and unavailable generic connectors.',
  openGraph: {
    title: 'TradeClaw Exchange Execution Status',
    description: 'See which exchange execution paths exist and which connectors are not implemented.',
  },
};

export default function ExchangesPage() {
  return <ExchangesClient />;
}
