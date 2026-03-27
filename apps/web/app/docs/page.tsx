import type { Metadata } from 'next';
import { DocsClient } from './DocsClient';

export const metadata: Metadata = {
  title: 'Documentation | TradeClaw',
  description: 'Complete guides for TradeClaw — deployment, configuration, API reference, plugin development, and more.',
  openGraph: {
    title: 'TradeClaw Documentation',
    description: 'Everything you need to deploy, configure, and extend TradeClaw.',
  },
};

export default function DocsPage() {
  return <DocsClient />;
}
