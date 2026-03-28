import type { Metadata } from 'next';
import { WidgetsClient } from './WidgetsClient';

export const metadata: Metadata = {
  title: 'Embed Your Live Portfolio Anywhere | TradeClaw Widgets',
  description:
    'Embeddable portfolio widgets for any website. Live P&L iframe card, SVG badge, shields.io endpoint, and JSON API. Dark and light themes.',
};

export default function WidgetsPage() {
  return <WidgetsClient />;
}
