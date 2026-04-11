import type { Metadata } from 'next';
import { RiskClient } from './RiskClient';

export const metadata: Metadata = {
  title: 'Risk Dashboard — Circuit Breakers & Drawdown Monitor | TradeClaw',
  description:
    'Real-time risk management dashboard with circuit breaker status, drawdown tracking, equity curve visualization, and vetoed signal log.',
  openGraph: {
    title: 'Risk Dashboard — Circuit Breakers & Drawdown Monitor',
    description:
      'Monitor circuit breakers, drawdown, equity curves, and vetoed signals in real time.',
  },
};

export default function RiskPage() {
  return <RiskClient />;
}
