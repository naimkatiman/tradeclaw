import type { Metadata } from 'next';
import { WidgetClient } from './WidgetClient';

export const metadata: Metadata = {
  title: 'Embed a Paper Simulation | TradeClaw',
  description:
    'Embeddable realized paper-simulation summary. Open P&L, broker fills, and customer portfolio returns are not represented.',
};

export default function WidgetPage() {
  return <WidgetClient />;
}
