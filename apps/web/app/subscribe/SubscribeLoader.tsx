'use client';

import dynamic from 'next/dynamic';

const SubscribeClient = dynamic(() => import('./SubscribeClient'), { ssr: false });

export default function SubscribeLoader() {
  return <SubscribeClient />;
}
