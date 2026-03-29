import type { Metadata } from 'next';
import { WidgetClient } from './WidgetClient';

export const metadata: Metadata = {
  title: 'Embed Your Portfolio Anywhere | TradeClaw',
  description:
    'Embeddable portfolio tracker widget showing live P&L from paper trading. Iframe embed, shields.io badge, dark/light theme support.',
};

export default function WidgetPage() {
  return <WidgetClient />;
}
