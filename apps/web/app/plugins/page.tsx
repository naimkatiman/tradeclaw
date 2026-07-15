import type { Metadata } from 'next';
import { PluginsClient } from './PluginsClient';
import { requireAdmin } from '../../lib/admin-gate';

export const metadata: Metadata = {
  title: 'Plugins | TradeClaw',
  description: 'Custom indicator plugins — extend TradeClaw with your own JavaScript modules.',
};

export default async function PluginsPage() {
  await requireAdmin();
  return <PluginsClient />;
}
