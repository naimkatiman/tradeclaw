import type { Metadata } from 'next';
import { DataClient } from './DataClient';

export const metadata: Metadata = {
  title: 'Data Management | TradeClaw',
  description: 'Export and import your TradeClaw data — strategies, alerts, watchlists, paper trading and more.',
  openGraph: {
    title: 'Data Management | TradeClaw',
    description: 'Portable data export/import for TradeClaw. Take your strategies, alerts, and trading history anywhere.',
  },
};

export default function DataPage() {
  return <DataClient />;
}
