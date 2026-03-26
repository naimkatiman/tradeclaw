import type { Metadata } from 'next';
import { ExplainClient } from './explain-client';

export const metadata: Metadata = {
  title: 'AI Signal Analysis — TradeClaw',
  description: 'Get instant AI-powered analysis for any trading signal. Detailed indicator breakdown, confluence scoring, key levels, and trade setup recommendations.',
};

export default function ExplainPage() {
  return <ExplainClient />;
}
