'use client';

import dynamic from 'next/dynamic';

const NotificationsClient = dynamic(() => import('./NotificationsClient'), { ssr: false });

export default function NotificationsLoader() {
  return <NotificationsClient />;
}
