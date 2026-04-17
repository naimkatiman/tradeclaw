import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Broker Integration — TradeClaw',
  description: 'Connect your broker to TradeClaw and route live signals to your trading account.',
};

export default function BrokerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
