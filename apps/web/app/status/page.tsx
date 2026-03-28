import type { Metadata } from 'next';
import { StatusClient } from './StatusClient';

export const metadata: Metadata = {
  title: 'System Status — TradeClaw',
  description:
    'Real-time operational status for all TradeClaw services including Signal Engine, API, Database, and SSE Feed.',
  openGraph: {
    title: 'System Status — TradeClaw',
    description: 'Live operational status and uptime for TradeClaw trading platform.',
    type: 'website',
  },
};

export default function StatusPage() {
  return <StatusClient />;
}
