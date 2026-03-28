import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const PerformanceClient = dynamic(() => import('./PerformanceClient').then(m => ({ default: m.PerformanceClient })), {
  loading: () => (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

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
