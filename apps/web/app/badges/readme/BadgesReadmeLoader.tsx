'use client';

import dynamic from 'next/dynamic';

const BadgesReadmeClient = dynamic(() => import('./BadgesReadmeClient'), { ssr: false });

export default function BadgesReadmeLoader() {
  return <BadgesReadmeClient />;
}
