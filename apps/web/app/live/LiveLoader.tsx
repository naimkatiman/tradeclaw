'use client';

import dynamic from 'next/dynamic';

const LiveClient = dynamic(() => import('./LiveClient'), { ssr: false });

export default function LiveLoader() {
  return <LiveClient />;
}
