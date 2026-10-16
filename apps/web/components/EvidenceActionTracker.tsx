'use client';

import { useEffect } from 'react';
import { trackEvent, type AnalyticsEvent } from '../lib/analytics';

const EVIDENCE_EVENTS = new Set<AnalyticsEvent>([
  'artifact_downloaded',
  'record_inspected',
  'methodology_viewed',
]);

export function EvidenceActionTracker() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const action = event.target.closest<HTMLElement>('[data-evidence-event]');
      if (!action) return;

      const eventName = action.dataset.evidenceEvent as AnalyticsEvent | undefined;
      if (!eventName || !EVIDENCE_EVENTS.has(eventName)) return;

      trackEvent(eventName, {
        target: action.dataset.evidenceTarget ?? null,
        href: action instanceof HTMLAnchorElement ? action.href : null,
      });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
}
