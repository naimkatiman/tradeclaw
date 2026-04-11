import type { Metadata } from 'next';
import { ExecutionClient } from './ExecutionClient';

export const metadata: Metadata = {
  title: 'Execution Log — Order History & Pipeline Status | TradeClaw',
  description:
    'Complete order execution history with pipeline visualization, broker connection status, and execution performance metrics.',
  openGraph: {
    title: 'Execution Log — Order History & Pipeline Status',
    description:
      'Track order fills, rejections, execution pipeline stages, and broker connection status.',
  },
};

export default function ExecutionPage() {
  return <ExecutionClient />;
}
