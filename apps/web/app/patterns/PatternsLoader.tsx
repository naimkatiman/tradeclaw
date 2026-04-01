'use client';
import dynamic from 'next/dynamic';

const PatternsClient = dynamic(() => import('./PatternsClient'), { ssr: false });

export default function PatternsLoader() {
  return <PatternsClient />;
}
