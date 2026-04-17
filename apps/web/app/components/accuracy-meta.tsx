'use client';

import { useEffect, useState } from 'react';

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

function formatAge(isoTs: string): string {
  const diff = Date.now() - new Date(isoTs).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return '<1h ago';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AccuracyMeta({ symbol, timeframe }: AccuracyMetaProps) {
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
    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
      <span className={rateColor}>{data.winRate.toFixed(0)}% win</span>
      <span className="text-zinc-700">|</span>
      <span>n={data.sampleSize}</span>
      <span className="text-zinc-700">|</span>
      <span>{data.windowLabel}</span>
      <span className="text-zinc-700">|</span>
      <span>latest {formatAge(data.newestSampleTs)}</span>
    </div>
  );
}
