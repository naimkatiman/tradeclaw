'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CategoryFilter } from '@/app/lib/symbol-config';
import { useLocale } from '@/app/components/locale-provider';
import {
  getTrackRecordTranslations,
  type TrackRecordTranslations,
} from '@/lib/product-i18n/track-record';
import { formatMessage } from '@/lib/product-i18n/format';

export type EvidencePeriod = '7d' | '30d' | '90d' | '180d' | '1y' | '5y' | 'all';
export type EvidenceScope = 'pro' | 'broadcast';
export type EvidenceSurface = 'record' | 'study' | 'alpha';

const PERIOD_OPTIONS: { value: EvidencePeriod; days: number | null }[] = [
  { value: '7d', days: 7 },
  { value: '30d', days: 30 },
  { value: '90d', days: 90 },
  { value: '180d', days: 180 },
  { value: '1y', days: 365 },
  { value: '5y', days: 1825 },
  { value: 'all', days: null },
];

const PERIOD_CODE_LABELS: Record<Exclude<EvidencePeriod, 'all'>, string> = {
  '7d': '7D',
  '30d': '1M',
  '90d': '3M',
  '180d': '6M',
  '1y': '1Y',
  '5y': '5Y',
};

const CATEGORY_OPTIONS: CategoryFilter[] = ['all', 'majors', 'thematic'];

export function isEvidencePeriodAvailable(
  daysWindow: number | null,
  earliestTimestamp: number | null,
  now: number,
): boolean {
  if (daysWindow === null || earliestTimestamp === null) return true;
  const dataAgeDays = (now - earliestTimestamp) / 86_400_000;
  return daysWindow <= Math.ceil(dataAgeDays);
}

export function EvidenceSurfaceNav({ active }: { active: EvidenceSurface }) {
  const { locale } = useLocale();
  const t = getTrackRecordTranslations(locale).surfaces;
  const items = [
    {
      value: 'record' as const,
      href: '/track-record',
      label: t.recordLabel,
      description: t.recordDescription,
    },
    {
      value: 'study' as const,
      href: '/track-record/study',
      label: t.studyLabel,
      description: t.studyDescription,
    },
    {
      value: 'alpha' as const,
      href: '/track-record/alpha',
      label: 'D1 Alpha Ledger',
      description: 'Prospective frozen-rule evidence; not current',
    },
  ];

  return (
    <nav
      aria-label={t.ariaLabel}
      className="mb-6 grid gap-2 rounded-2xl border border-white/[0.07] bg-black/20 p-2 sm:grid-cols-3"
    >
      {items.map((item) => {
        const selected = item.value === active;
        return (
          <Link
            key={item.value}
            href={item.href}
            aria-current={selected ? 'page' : undefined}
            className={`rounded-xl border px-4 py-3 transition-colors ${
              selected
                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                : 'border-transparent text-[var(--text-secondary)] hover:border-white/10 hover:bg-white/[0.03] hover:text-[var(--foreground)]'
            }`}
          >
            <span className="block text-sm font-semibold">{item.label}</span>
            <span className="mt-0.5 block text-[11px] opacity-75">{item.description}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function EvidenceFilters({
  period,
  onPeriodChange,
  earliestTimestamp,
  scope,
  onScopeChange,
  category,
  onCategoryChange,
  t,
}: {
  period: EvidencePeriod;
  onPeriodChange: (period: EvidencePeriod) => void;
  earliestTimestamp: number | null;
  scope: EvidenceScope;
  onScopeChange: (scope: EvidenceScope) => void;
  category: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
  t: TrackRecordTranslations;
}) {
  const [now] = useState(() => Date.now());
  const dataAgeDays = earliestTimestamp
    ? Math.max(1, Math.floor((now - earliestTimestamp) / 86_400_000))
    : null;

  return (
    <div className="mb-4">
      <div className="mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg bg-white/[0.04] p-1">
        {PERIOD_OPTIONS.map(({ value, days }) => {
          const available = isEvidencePeriodAvailable(days, earliestTimestamp, now);
          const label = value === 'all' ? t.periods.all : PERIOD_CODE_LABELS[value];
          const tooltip = !available && dataAgeDays
            ? formatMessage(t.rolling.historyAvailable, { count: dataAgeDays })
            : undefined;
          return (
            <button
              key={value}
              type="button"
              onClick={() => available && onPeriodChange(value)}
              disabled={!available}
              title={tooltip}
              aria-disabled={!available}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-all ${
                period === value && available
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : !available
                    ? 'cursor-not-allowed text-zinc-700'
                    : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex w-fit items-center gap-1 rounded-lg bg-white/[0.04] p-1">
        {(
          [
            { value: 'pro', label: t.scope.eligibleLabel },
            { value: 'broadcast', label: t.scope.broadcastLabel },
          ] as const
        ).map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => onScopeChange(value)}
            aria-pressed={scope === value}
            className={`rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-all ${
              scope === value
                ? 'bg-white/[0.08] text-[var(--foreground)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {scope === 'broadcast' && (
        <p className="mb-3 max-w-xl text-[11px] text-[var(--text-secondary)]">
          {t.scope.broadcastDetail}
        </p>
      )}

      <div className="mb-2 flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-white/[0.04] p-1">
        {CATEGORY_OPTIONS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onCategoryChange(value)}
            aria-pressed={category === value}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-all ${
              category === value
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
            }`}
          >
            {t.categories[value]}
          </button>
        ))}
      </div>
    </div>
  );
}
