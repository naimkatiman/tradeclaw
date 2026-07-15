import type { Metadata } from 'next';
import { requireAdmin } from '../../lib/admin-gate';
import TVAlertsClient from './TVAlertsClient';

export const metadata: Metadata = {
  title: 'TradingView Alerts | TradeClaw',
  description:
    'Admin-only TradingView webhook audit. Entry forwarding requires an exact approved TradeClaw signal and a ready cost-adjusted evidence gate.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function TradingViewAlertsPage() {
  await requireAdmin();
  return <TVAlertsClient />;
}
