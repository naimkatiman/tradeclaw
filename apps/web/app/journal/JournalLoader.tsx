'use client';

import dynamic from 'next/dynamic';

const JournalClient = dynamic(() => import('./JournalClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function JournalLoader() {
  return <JournalClient />;
}
