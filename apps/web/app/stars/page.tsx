import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const StarsClient = dynamic(() => import('./StarsClient').then(m => ({ default: m.StarsClient })), {
  loading: () => (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export const metadata: Metadata = {
  title: 'TradeClaw Repository Metrics',
  description:
    'Current TradeClaw repository metrics fetched from the GitHub API, with no projected growth or fallback counts.',
  openGraph: {
    title: 'TradeClaw Repository Metrics',
    description:
      'Inspect current stars, forks, watchers, and open issues reported by GitHub.',
    type: 'website',
  },
};

export default function StarsPage() {
  return <StarsClient />;
}
