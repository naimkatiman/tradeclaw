import type { Metadata } from 'next';
import { PortfolioWidgetClient } from './PortfolioWidgetClient';

export const metadata: Metadata = {
  title: 'Portfolio Widget — Embed Your P&L Anywhere | TradeClaw',
  description:
    'Embeddable portfolio tracker showing live P&L from paper trading. Iframe embed, shields.io badge, dark/light theme, compact mode.',
};

export default function PortfolioWidgetPage() {
  return <PortfolioWidgetClient />;
}
