import type { Metadata } from 'next';
import { WidgetsClient } from './WidgetsClient';

export const metadata: Metadata = {
  title: 'Embed Paper-Simulation Records | TradeClaw Widgets',
  description:
    'Embeddable views of a configured TradeClaw paper-simulation account. Realized simulated results are not broker or customer portfolio returns.',
};

export default function WidgetsPage() {
  return <WidgetsClient />;
}
