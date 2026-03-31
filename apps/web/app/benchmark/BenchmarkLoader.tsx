'use client';

import dynamic from 'next/dynamic';

const BenchmarkClient = dynamic(() => import('./BenchmarkClient'), { ssr: false });

export default function BenchmarkLoader() {
  return <BenchmarkClient />;
}
