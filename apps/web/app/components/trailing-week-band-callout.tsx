'use client';

import { useEffect, useState } from 'react';
import { InfoHint } from '@/components/InfoHint';
import { classifyBandComparison } from '@/lib/band-comparison';
import { useLocale } from './locale-provider';
import {
  getTrackRecordWidgetTranslations,
  type TrackRecordWidgetTranslations,
} from '@/lib/product-i18n/track-record-widgets';
import { getHtmlLanguage } from '@/lib/translations';

interface BandSummary {
  totalReturn: number;
  winRate: number;
  totalSignals: number;
  expectancyR: number | null;
  avgRWin: number | null;
  avgRLoss: number | null;
  breakEvenWinRate: number | null;
}

interface BandResponse {
  summary: BandSummary | null;
}

interface BandPair {
  all: BandSummary | null;
  premium: BandSummary | null;
}

interface Loaded {
  sevenDay: BandPair;
  allTime: BandPair | null;
}

function TemplateMessage({
  template,
  values,
  plainKeys = [],
}: {
  template: string;
  values: Record<string, string>;
  plainKeys?: string[];
}) {
  const plain = new Set(plainKeys);
  return (
    <>
      {template.split(/(\{[A-Za-z0-9_]+\})/g).map((part, index) => {
        const match = /^\{([A-Za-z0-9_]+)\}$/.exec(part);
        if (!match || !(match[1] in values)) return part;
        const key = match[1];
        return plain.has(key)
          ? <span key={`${key}-${index}`}>{values[key]}</span>
          : <bdi key={`${key}-${index}`} dir="ltr">{values[key]}</bdi>;
      })}
    </>
  );
}

function percent(language: string, value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat(language, {
    style: 'percent',
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
  }).format(value / 100);
}

function signedPercent(language: string, value: number): string {
  return new Intl.NumberFormat(language, {
    style: 'percent',
    signDisplay: 'always',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function rMultiple(language: string, value: number): string {
  const formatted = new Intl.NumberFormat(language, {
    signDisplay: 'always',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted}R`;
}

/**
 * Trailing-7d callout: premium-band vs full-firehose side-by-side over the last
 * week, with an all-time context line so a single chop week can't stand in for
 * the long run. The filter only "pays its rent" when premium beats all-signals
 * on per-trade quality (win rate AND expectancy), not merely by trading less —
 * see classifyBandComparison.
 *
 * Four parallel summary-only GETs to /api/signals/equity (7d + all-time, each
 * band=all / band=premium). summaryOnly=1 skips the point payload.
 */
export function TrailingWeekBandCallout() {
  const { locale } = useLocale();
  const t = getTrackRecordWidgetTranslations(locale).trailingWeek;
  const language = getHtmlLanguage(locale);
  const [data, setData] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchSummary(period: string, band: string): Promise<BandSummary | null> {
      try {
        const res = await fetch(`/api/signals/equity?period=${period}&scope=pro&band=${band}&summaryOnly=1`);
        if (!res.ok) return null;
        const json = (await res.json()) as BandResponse;
        return json.summary;
      } catch {
        return null;
      }
    }
    async function load(): Promise<void> {
      try {
        const [all7, prem7, allAll, premAll] = await Promise.all([
          fetchSummary('7d', 'all'),
          fetchSummary('7d', 'premium'),
          fetchSummary('all', 'all'),
          fetchSummary('all', 'premium'),
        ]);
        if (cancelled) return;
        setData({
          sevenDay: { all: all7, premium: prem7 },
          allTime: allAll && premAll ? { all: allAll, premium: premAll } : null,
        });
      } finally {
        // Always clear loading (unless unmounted) so an unexpected throw can't
        // leave the callout stuck hidden with no recovery path.
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (!data?.sevenDay.all || !data.sevenDay.premium) return null;

  const a = data.sevenDay.all;
  const p = data.sevenDay.premium;
  if (a.totalSignals === 0 && p.totalSignals === 0) return null;
  const cmp = classifyBandComparison(a, p);
  const badgeTone =
    cmp.tone === 'positive'
      ? 'bg-emerald-500/15 text-emerald-400'
      : cmp.tone === 'neutral'
        ? 'bg-amber-500/15 text-amber-300'
        : 'bg-red-500/15 text-red-400';

  const allTime = data.allTime;
  const allTimeCmp = allTime?.all && allTime.premium
    ? classifyBandComparison(allTime.all, allTime.premium)
    : null;
  const badgeTemplate = cmp.verdict === 'premium_better'
    ? t.badgeBetter
    : cmp.verdict === 'premium_fewer_trades'
      ? t.badgeFewerTrades
      : cmp.returnDelta === 0
        ? t.badgeMatched
        : t.badgeWorse;
  const verdict = allTimeCmp?.verdict === 'premium_better'
    ? t.verdictBetter
    : allTimeCmp?.verdict === 'premium_fewer_trades'
      ? t.verdictFewerTrades
      : t.verdictWorse;

  return (
    <section
      className="glass-card mb-4 rounded-2xl border-s-2 border-emerald-500/50 p-5"
      aria-label={t.aria}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
            {t.title}
            <InfoHint
              text={t.info}
              label={t.infoLabel}
            />
          </h3>
          <p className="mt-0.5 text-[11px] text-zinc-600">
            {t.disclosure}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${badgeTone}`}
        >
          <TemplateMessage
            template={badgeTemplate}
            values={{
              delta: cmp.verdict === 'premium_worse'
                ? percent(language, Math.abs(cmp.returnDelta), 2)
                : signedPercent(language, cmp.returnDelta),
            }}
          />
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BandCard label={t.eligibleLabel} data={a} accent="zinc" t={t} language={language} />
        <BandCard label={t.premiumLabel} data={p} accent="emerald" t={t} language={language} />
      </div>

      {/* All-time context — the 7-day gap is regime-dependent; show the full
         record so a single chop week can't stand in for the long run. */}
      {allTime?.all && allTime.premium && allTimeCmp
        && (allTime.all.totalSignals > 0 || allTime.premium.totalSignals > 0) && (
        <p className="mt-3 text-[11px] font-mono text-zinc-500">
          <span className="uppercase tracking-wider text-zinc-600">{t.currentArchive}</span>{' '}
          <span className={
            allTimeCmp.tone === 'positive' ? 'text-emerald-400'
            : allTimeCmp.tone === 'negative' ? 'text-red-400'
            : 'text-amber-300'
          }>
            <TemplateMessage
              template={t.archiveSummary}
              values={{
                allReturn: signedPercent(language, allTime.all.totalReturn),
                allTrades: new Intl.NumberFormat(language).format(allTime.all.totalSignals),
                premiumReturn: signedPercent(language, allTime.premium.totalReturn),
                premiumTrades: new Intl.NumberFormat(language).format(allTime.premium.totalSignals),
                verdict,
              }}
              plainKeys={['verdict']}
            />
          </span>
        </p>
      )}
    </section>
  );
}

interface BandCardProps {
  label: string;
  data: BandSummary;
  accent: 'zinc' | 'emerald';
  t: TrackRecordWidgetTranslations['trailingWeek'];
  language: string;
}

function BandCard({ label, data, accent, t, language }: BandCardProps) {
  const border = accent === 'emerald' ? 'border-emerald-500/20' : 'border-white/[0.06]';
  const tone =
    data.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400';
  return (
    <div className={`rounded-lg border bg-white/[0.02] p-3 ${border}`}>
      <div className="mb-1 text-[9px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className={`font-mono text-2xl font-bold tabular-nums ${tone}`}>
        <bdi dir="ltr">{signedPercent(language, data.totalReturn)}</bdi>
      </div>
      <div className="text-[9px] font-mono text-zinc-600">{t.sequentialSimulation}</div>
      <div className="mt-1.5 grid grid-cols-3 gap-2 text-[10px] font-mono text-zinc-500">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">{t.win}</div>
          <div
            className={
              data.breakEvenWinRate !== null
                ? data.winRate >= data.breakEvenWinRate
                  ? 'text-emerald-400'
                  : 'text-red-400'
                : 'text-zinc-300'
            }
          >
            <bdi dir="ltr">{percent(language, data.winRate, 1)}</bdi>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">{t.trades}</div>
          <div className="text-zinc-300"><bdi dir="ltr">{new Intl.NumberFormat(language).format(data.totalSignals)}</bdi></div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">{t.expectancy}</div>
          <div className="text-zinc-300">
            {data.expectancyR !== null
              ? <bdi dir="ltr">{rMultiple(language, data.expectancyR)}</bdi>
              : '—'}
          </div>
        </div>
      </div>
      {/* Break-even context: a sub-50% win-rate with asymmetric R:R can still
         be profitable. Show the bar the win-rate is being judged against. */}
      <div className="mt-1.5 text-[9px] font-mono text-zinc-600">
        {data.breakEvenWinRate !== null
          ? (
              <TemplateMessage
                template={t.breakEven}
                values={{ value: percent(language, data.breakEvenWinRate, 1) }}
              />
            )
          : t.breakEvenUnavailable}
      </div>
    </div>
  );
}
