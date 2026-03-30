'use client';

import dynamic from 'next/dynamic';

const BuilderClient = dynamic(() => import('./BuilderClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-zinc-400 text-sm">Loading builder...</div>
    </div>
  ),
});

export default function IndicatorBuilderLoader() {
  return <BuilderClient />;
}
