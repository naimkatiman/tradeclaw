'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStreak } from '../lib/visit-streak';
import { useLocale } from '../app/components/locale-provider';
import { formatMessage } from '../lib/product-i18n/format';
import { getDashboardEvidenceTranslations } from '../lib/product-i18n/dashboard-evidence';

const DISMISS_KEY = 'tc-reengagement-dismissed';

function computeReEngagement(): { visible: boolean; daysAway: number } {
  if (typeof window === 'undefined') return { visible: false, daysAway: 0 };
  try {
    const raw = localStorage.getItem('tc-visit-streak');
    if (!raw) return { visible: false, daysAway: 0 };
    const data = JSON.parse(raw) as { lastVisit?: string };
    if (!data.lastVisit) return { visible: false, daysAway: 0 };

    const lastDate = new Date(data.lastVisit + 'T00:00:00').getTime();
    const away = Math.floor((Date.now() - lastDate) / 86400000);
    if (away < 3) return { visible: false, daysAway: 0 };

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed === data.lastVisit) return { visible: false, daysAway: 0 };

    return { visible: true, daysAway: away };
  } catch {
    return { visible: false, daysAway: 0 };
  }
}

export function ReEngagementBanner() {
  const { locale } = useLocale();
  const copy = getDashboardEvidenceTranslations(locale).reEngagement;
  const [state, setState] = useState({ visible: false, daysAway: 0 });
  const visible = state.visible;
  const daysAway = state.daysAway;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setState(computeReEngagement()));
    return () => cancelAnimationFrame(frame);
  }, []);

  function handleDismiss() {
    setState((current) => ({ ...current, visible: false }));
    try {
      const streak = getStreak();
      localStorage.setItem(DISMISS_KEY, streak.lastVisit);
    } catch { /* ignore */ }
  }

  if (!visible) return null;

  return (
    <div className="border-b border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-emerald-400 text-sm font-semibold shrink-0">{copy.welcomeBack}</span>
          <span className="text-xs text-[var(--text-secondary)]">
            {formatMessage(copy.resolvedWhileAway, { count: daysAway })}
          </span>
          <Link
            href="/accuracy"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"
          >
            {copy.seeAccuracy}{' '}
            <span aria-hidden="true">{locale === 'ar' ? '←' : '→'}</span>
          </Link>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors shrink-0"
          aria-label={copy.dismiss}
          title={copy.dismiss}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
