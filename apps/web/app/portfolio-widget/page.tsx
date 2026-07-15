import type { Metadata } from 'next';
import { PortfolioWidgetClient } from './PortfolioWidgetClient';

export const metadata: Metadata = {
  title: 'Paper Simulation Widget | TradeClaw',
  description:
    'Embeddable realized paper-simulation results. Open P&L, broker fills, and customer portfolio performance are not represented.',
};

export default function PortfolioWidgetPage() {
  return <PortfolioWidgetClient />;
}
