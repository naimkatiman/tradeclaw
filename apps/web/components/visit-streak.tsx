'use client';

import { useState } from 'react';
import { recordVisit, type StreakData } from '../lib/visit-streak';
import { useLocale } from '../app/components/locale-provider';
import { formatMessage } from '../lib/product-i18n/format';
import {
  getDashboardEvidenceTranslations,
  type DashboardEvidenceTranslations,
} from '../lib/product-i18n/dashboard-evidence';

type MilestoneKey = keyof DashboardEvidenceTranslations['visitStreak']['milestones'];

const MILESTONES: Array<{ threshold: number; key: MilestoneKey }> = [
  { threshold: 30, key: 'thirty' },
  { threshold: 14, key: 'fourteen' },
  { threshold: 7, key: 'seven' },
  { threshold: 3, key: 'three' },
];

function getMilestoneLabel(
  streak: number,
  milestones: DashboardEvidenceTranslations['visitStreak']['milestones'],
): string | null {
  for (const { threshold, key } of MILESTONES) {
    if (streak >= threshold) return milestones[key];
  }
  return null;
}

export function VisitStreak() {
  const { locale } = useLocale();
  const copy = getDashboardEvidenceTranslations(locale).visitStreak;
  const [streak] = useState<StreakData | null>(() => {
    if (typeof window === 'undefined') return null;
    return recordVisit();
  });
  const [showTooltip, setShowTooltip] = useState(false);

  if (!streak || streak.currentStreak === 0) return null;

  const milestone = getMilestoneLabel(streak.currentStreak, copy.milestones);
  const streakLabel = formatMessage(copy.aria, { count: streak.currentStreak });

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-orange-500/20 bg-orange-500/8 text-orange-400 cursor-default select-none"
        aria-label={streakLabel}
        aria-expanded={showTooltip}
        onClick={() => setShowTooltip((value) => !value)}
      >
        <span aria-hidden="true">&#x1F525;</span>
        <bdi dir="ltr" className="font-mono font-semibold">{streak.currentStreak}</bdi>
      </button>

      {showTooltip && (
        <div role="tooltip" className="absolute end-0 top-full mt-2 z-50 min-w-[220px] rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-xs shadow-xl">
          <p className="font-semibold text-[var(--foreground)]">
            {formatMessage(copy.current, { count: streak.currentStreak })}
          </p>
          <p className="text-[var(--text-secondary)] mt-1">
            {formatMessage(copy.stats, {
              longest: streak.longestStreak,
              total: streak.totalVisits,
            })}
          </p>
          {milestone && (
            <p className="mt-1.5 text-orange-400 font-medium">{milestone}</p>
          )}
        </div>
      )}
    </div>
  );
}
