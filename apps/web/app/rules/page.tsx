import type { Metadata } from 'next';
import RulesClient from './rules-client';

export const metadata: Metadata = {
  title: 'Custom Rules — TradeClaw',
  description: 'Build custom entry and exit logic with indicator-based conditions.',
};

export const dynamic = 'force-dynamic';

export default function RulesPage() {
  return <RulesClient />;
}
