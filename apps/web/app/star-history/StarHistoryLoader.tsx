'use client';

import dynamic from 'next/dynamic';

const StarHistoryClient = dynamic(() => import('./StarHistoryClient'), { ssr: false });

export default function StarHistoryLoader() {
  return <StarHistoryClient />;
}
