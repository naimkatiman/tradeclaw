import type { Metadata } from 'next';
import { ExplainClient } from './explain-client';

export const metadata: Metadata = {
  title: 'AI Signal Analysis — TradeClaw',
  description: 'Inspect the deterministic indicator inputs and mechanical rationale behind a TradeClaw signal candidate.',
};

export default function ExplainPage() {
  return <ExplainClient />;
}
