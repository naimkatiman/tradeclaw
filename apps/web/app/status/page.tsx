import type { Metadata } from 'next';
import { StatusClient } from './StatusClient';

export const metadata: Metadata = {
  title: 'Point-in-Time Status | TradeClaw',
  description:
    'Point-in-time process and dependency probes. No durable uptime percentage, incident history, or SLA is claimed.',
  robots: { index: false, follow: false },
};

export default function StatusPage() {
  return <StatusClient />;
}
