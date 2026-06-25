import type { Metadata } from 'next';
import AutopsyClient from './autopsy-client';

export const metadata: Metadata = {
  title: 'Trade Autopsy — TradeClaw',
  description: 'AI-powered post-trade analysis. Review execution quality, risk management, and psychology.',
};

export default function AutopsyPage() {
  return <AutopsyClient />;
}
