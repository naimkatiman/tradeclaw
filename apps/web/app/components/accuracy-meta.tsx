'use client';

import { useEffect, useState } from 'react';
import { useLocale } from './locale-provider';
import { formatMessage } from '../../lib/product-i18n/format';
import {
  getDashboardEvidenceTranslations,
  type DashboardEvidenceTranslations,
} from '../../lib/product-i18n/dashboard-evidence';

interface AccuracyData {
  winRate: number;
  sampleSize: number;
  windowLabel: string;
  oldestSampleTs: string;
  newestSampleTs: string;
}

interface AccuracyMetaProps {
  symbol: string;
  timeframe: string;
}

function formatAge(
  isoTs: string,
  copy: DashboardEvidenceTranslations['accuracyMeta'],
): string {
  const diff = Date.now() - new Date(isoTs).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return copy.lessThanHourAgo;
  if (hours < 24) return formatMessage(copy.hoursAgo, { count: hours });
  const days = Math.floor(hours / 24);
  return formatMessage(copy.daysAgo, { count: days });
}

export function AccuracyMeta({ symbol, timeframe }: AccuracyMetaProps) {
  const { locale } = useLocale();
  const copy = getDashboardEvidenceTranslations(locale).accuracyMeta;
  const [data, setData] = useState<AccuracyData | null>(null);

  useEffect(() => {
    fetch(`/api/signals/accuracy-context?symbol=${symbol}&timeframe=${timeframe}`)
      .then((r) => r.json())
      .then((d) => setData(d.accuracy))
      .catch(() => {});
  }, [symbol, timeframe]);

  if (!data) return null;

  const rateColor =
    data.winRate >= 60
      ? 'text-emerald-400'
      : data.winRate >= 50
        ? 'text-yellow-400'
        : 'text-red-400';

  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-zinc-500">
      <bdi dir="auto" className={rateColor}>
        {formatMessage(copy.winRate, { rate: data.winRate.toFixed(0) })}
      </bdi>
      <span aria-hidden="true" className="text-zinc-700">|</span>
      <bdi dir="ltr">n={data.sampleSize}</bdi>
      <span aria-hidden="true" className="text-zinc-700">|</span>
      <bdi dir="ltr">{data.windowLabel}</bdi>
      <span aria-hidden="true" className="text-zinc-700">|</span>
      <bdi dir="auto">
        {formatMessage(copy.latest, { age: formatAge(data.newestSampleTs, copy) })}
      </bdi>
    </div>
  );
}
