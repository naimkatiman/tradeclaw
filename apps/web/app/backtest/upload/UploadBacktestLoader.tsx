'use client';

import dynamic from 'next/dynamic';

const UploadBacktestClient = dynamic(() => import('./UploadBacktestClient'), { ssr: false });

export default function UploadBacktestLoader() {
  return <UploadBacktestClient />;
}
