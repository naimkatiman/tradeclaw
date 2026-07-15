import type { Metadata } from 'next';
import { CalendarClient } from './CalendarClient';

export const metadata: Metadata = {
  title: 'Counted Signal Outcome Calendar | TradeClaw',
  description: 'UTC-day heatmap of persisted 24h signal outcomes resolved from OHLCV data, with unresolved, simulated, and blocked rows excluded.',
  openGraph: {
    title: 'Counted Signal Outcome Calendar',
    description: 'Inspect counted 24h signal outcomes and the methodology used to exclude unresolved, simulated, and blocked rows.',
    url: 'https://tradeclaw.win/calendar',
  },
};

export default function CalendarPage() {
  return <CalendarClient />;
}
