'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackEvent, trackPageView } from '../lib/analytics';

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    trackPageView(url);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (pathname === '/methodology') {
      trackEvent('methodology_viewed', { source: 'page_view' });
    }
  }, [pathname]);

  return null;
}
