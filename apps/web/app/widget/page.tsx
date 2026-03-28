import type { Metadata } from 'next';
import { WidgetClient } from './WidgetClient';

export const metadata: Metadata = {
  title: 'Embeddable Widgets | TradeClaw',
  description:
    'Embed live portfolio badges and cards showing your paper trading P&L on any website or README. Auto-refreshing SVG widgets powered by real trading data.',
};

export default function WidgetPage() {
  return <WidgetClient />;
}
