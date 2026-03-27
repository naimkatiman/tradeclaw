import type { Metadata } from 'next';
import { PerformanceClient } from './PerformanceClient';

export const metadata: Metadata = {
  title: 'Performance Dashboard | TradeClaw',
  description: 'System performance metrics — latency, signal throughput, memory, and health monitoring.',
  openGraph: {
    title: 'Performance Dashboard | TradeClaw',
    description: 'Real-time system health: signal generation latency, API response times, cache hit rates.',
  },
};

export default function PerformancePage() {
  return <PerformanceClient />;
}
