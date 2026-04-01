'use client';

import dynamic from 'next/dynamic';

const PHClient = dynamic(() => import('./PHClient'), { ssr: false });

export default function PHLoader() {
  return <PHClient />;
}
