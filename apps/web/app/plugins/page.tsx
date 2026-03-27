import type { Metadata } from 'next';
import { PluginsClient } from './PluginsClient';

export const metadata: Metadata = {
  title: 'Plugins | TradeClaw',
  description: 'Custom indicator plugins — extend TradeClaw with your own JavaScript modules.',
};

export default function PluginsPage() {
  return <PluginsClient />;
}
