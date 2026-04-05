'use client';

import { useState } from 'react';
import { recordVisit, type StreakData } from '../lib/visit-streak';

const MILESTONES: Record<number, string> = {
  3: 'Getting started!',
  7: 'Active Trader',
  14: 'TradeClaw Regular',
  30: 'TradeClaw OG',
};

function getMilestoneLabel(streak: number): string | null {
  const thresholds = [30, 14, 7, 3];
  for (const t of thresholds) {
    if (streak >= t) return MILESTONES[t]!;
  }
  return null;
}

export function VisitStreak() {
  const [streak] = useState<StreakData | null>(() => {
    if (typeof window === 'undefined') return null;
    return recordVisit();
  });
  const [showTooltip, setShowTooltip] = useState(false);

  if (!streak || streak.currentStreak === 0) return null;

  const milestone = getMilestoneLabel(streak.currentStreak);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip((v) => !v)}
    >
      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-orange-500/20 bg-orange-500/8 text-orange-400 cursor-default select-none">
        <span aria-hidden="true">&#x1F525;</span>
        <span className="font-mono font-semibold">{streak.currentStreak}</span>
      </span>

      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 z-50 min-w-[200px] rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-xs shadow-xl">
          <p className="font-semibold text-[var(--foreground)]">
            Day {streak.currentStreak} streak
          </p>
          <p className="text-[var(--text-secondary)] mt-1">
            Longest: {streak.longestStreak} &middot; Total visits: {streak.totalVisits}
          </p>
          {milestone && (
            <p className="mt-1.5 text-orange-400 font-medium">{milestone}</p>
          )}
        </div>
      )}
    </div>
  );
}
