'use client';

import dynamic from 'next/dynamic';

const StartClient = dynamic(() => import('./StartClient'), { ssr: false });

export default function StartLoader() {
  return <StartClient />;
}
