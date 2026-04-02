'use client';

import dynamic from 'next/dynamic';

const ProfileWidgetClient = dynamic(() => import('./ProfileWidgetClient'), { ssr: false });

export function ProfileWidgetLoader() {
  return <ProfileWidgetClient />;
}
