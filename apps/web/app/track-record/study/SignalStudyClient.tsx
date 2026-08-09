'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { EquityCurve } from '@/app/components/equity-curve';
import { TrailingWeekBandCallout } from '@/app/components/trailing-week-band-callout';
import { PageNavBar } from '@/components/PageNavBar';
import { BackgroundDecor } from '@/components/background/BackgroundDecor';
import { ProductHeroBackdrop } from '@/components/product-hero-backdrop';
import { useLocale } from '@/app/components/locale-provider';
import { symbolsForCategory, type CategoryFilter } from '@/app/lib/symbol-config';
import { getHtmlLanguage } from '@/lib/translations';
import { getTrackRecordTranslations } from '@/lib/product-i18n/track-record';
import { getTrackRecordWidgetTranslations } from '@/lib/product-i18n/track-record-widgets';
import { formatMessage } from '@/lib/product-i18n/format';
import {
  EvidenceFilters,
  EvidenceSurfaceNav,
  type EvidencePeriod,
  type EvidenceScope,
} from '../evidence-controls';

type EquityBand = 'all' | 'premium' | 'standard';

interface StudySummary {
  totalReturn: number;
  maxDrawdown: number;
  winRate: number;
  totalSignals: number;
  sizedTrades: number;
  expectancyR: number | null;
  netExpectancyR: number | null;
  breakEvenWinRate: number | null;
  avgCostR: number | null;
}

function parseEquityBand(raw: string | null): EquityBand {
  if (raw === 'premium' || raw === 'standard') return raw;
  return 'all';
}

function signedPercent(language: string, value: number): string {
  return new Intl.NumberFormat(language, {
    style: 'percent',
    signDisplay: 'always',
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function percent(language: string, value: number): string {
  return new Intl.NumberFormat(language, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value / 100);
}

function rMultiple(language: string, value: number): string {
  return `${new Intl.NumberFormat(language, {
    signDisplay: 'always',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}R`;
}

export function SignalStudyClient() {
  const { locale } = useLocale();
  const t = getTrackRecordTranslations(locale);
  const studyT = getTrackRecordWidgetTranslations(locale).equity;
  const language = getHtmlLanguage(locale);
  const numberFormatter = new Intl.NumberFormat(language);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState<EvidencePeriod>('all');
  const [scope, setScope] = useState<EvidenceScope>('pro');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [earliestTimestamp, setEarliestTimestamp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const requestedBand = parseEquityBand(searchParams.get('band'));
  const band = scope === 'pro' ? requestedBand : 'all';

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          period,
          scope,
          band,
          summaryOnly: '1',
        });
        if (category !== 'all') params.set('category', category);
        const response = await fetch(`/api/signals/equity?${params.toString()}`);
        if (!response.ok) {
          if (!cancelled) {
            setSummary(null);
            setEarliestTimestamp(null);
          }
          return;
        }
        const data = await response.json();
        if (cancelled) return;
        setSummary(data.summary ?? null);
        setEarliestTimestamp(
          typeof data.earliestTimestamp === 'number' ? data.earliestTimestamp : null,
        );
      } catch {
        if (!cancelled) {
          setSummary(null);
          setEarliestTimestamp(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [band, category, period, scope]);

  const categoryCaption = useMemo(() => {
    if (category === 'majors') {
      return formatMessage(t.categoryCaption.majors, {
        count: symbolsForCategory('majors').length,
      });
    }
    if (category === 'thematic') {
      return formatMessage(t.categoryCaption.thematic, {
        count: symbolsForCategory('thematic').length,
      });
    }
    if (scope === 'broadcast') return t.categoryCaption.broadcast;
    return t.categoryCaption.eligible;
  }, [category, scope, t]);

  const handleBandChange = useCallback((nextBand: EquityBand) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextBand === 'all') params.delete('band');
    else params.set('band', nextBand);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const expectancy = summary?.netExpectancyR ?? summary?.expectancyR ?? null;
  const hasSizedStudy = Boolean(summary && summary.sizedTrades > 0);
  const sizedTradeNote = summary
    ? formatMessage(
        summary.sizedTrades !== summary.totalSignals
          ? summary.sizedTrades === 1 ? studyT.rStatsExcludedOne : studyT.rStatsExcludedMany
          : summary.sizedTrades === 1 ? studyT.rStatsAllOne : studyT.rStatsAllMany,
        {
          sized: numberFormatter.format(summary.sizedTrades),
          resolved: numberFormatter.format(summary.totalSignals),
        },
      )
    : null;

  return (
    <div className="premium-product-shell relative isolate min-h-[100dvh] overflow-hidden text-[var(--foreground)]">
      <BackgroundDecor variant="track-record" />
      <PageNavBar />

      <main className="mx-auto max-w-5xl px-4 py-8 pb-20 md:pb-8">
        <EvidenceSurfaceNav active="study" />

        <section className="relative isolate mb-6">
          <ProductHeroBackdrop
            src="/brand/hero/tradeclaw-replay-evidence-chamber-v1.webp"
            testId="signal-study-hero-art"
            className="product-hero-backdrop--quiet"
          />
          <div className="relative z-10">
            <div className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {t.surfaces.studyBoundary}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
              {studyT.title}
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-relaxed text-[var(--text-secondary)]">
              {studyT.sequentialHint}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StudyMetric
                label={studyT.sequentialResult}
                value={hasSizedStudy && summary ? signedPercent(language, summary.totalReturn) : '—'}
                tone={hasSizedStudy && summary && summary.totalReturn > 0 ? 'positive' : hasSizedStudy && summary && summary.totalReturn < 0 ? 'negative' : 'neutral'}
                loading={loading}
              />
              <StudyMetric
                label={studyT.simulatedMaxDrawdown}
                value={hasSizedStudy && summary ? `−${percent(language, summary.maxDrawdown)}` : '—'}
                tone={hasSizedStudy && summary && summary.maxDrawdown > 0 ? 'negative' : 'neutral'}
                loading={loading}
              />
              <StudyMetric
                label={studyT.expectancyNet}
                value={expectancy !== null ? rMultiple(language, expectancy) : '—'}
                tone={expectancy !== null && expectancy > 0 ? 'positive' : expectancy !== null && expectancy < 0 ? 'negative' : 'neutral'}
                loading={loading}
              />
              <StudyMetric
                label={studyT.resolvedSignals}
                value={summary ? numberFormatter.format(summary.totalSignals) : '—'}
                tone="neutral"
                loading={loading}
                detail={sizedTradeNote ?? undefined}
              />
            </div>

            <p className="mt-4 rounded-md border border-zinc-600/30 bg-zinc-800/20 px-3 py-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">
              <strong className="font-semibold text-[var(--foreground)]">{t.header.riskLabel}</strong>{' '}
              {t.header.riskBody}
            </p>
          </div>
        </section>

        <EvidenceFilters
          period={period}
          onPeriodChange={setPeriod}
          earliestTimestamp={earliestTimestamp}
          scope={scope}
          onScopeChange={setScope}
          category={category}
          onCategoryChange={setCategory}
          t={t}
        />
        <p className="mb-4 text-xs text-[var(--text-secondary)]">{categoryCaption}</p>

        {scope === 'pro' && <TrailingWeekBandCallout category={category} />}

        <EquityCurve
          period={period}
          scope={scope}
          category={category}
          band={band}
          onBandChange={scope === 'pro' ? handleBandChange : undefined}
        />

        <section className="glass-card mb-8 rounded-2xl border-s-2 border-emerald-500/50 p-5">
          <h2 className="text-sm font-semibold">{t.sections.population}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
            {studyT.sequentialHint}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/track-record"
              className="rounded-lg bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25"
            >
              {t.surfaces.recordLabel}
            </Link>
            <Link
              href="/research"
              className="rounded-lg bg-white/[0.06] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white/[0.1]"
            >
              {t.research.title}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function StudyMetric({
  label,
  value,
  tone,
  loading,
  detail,
}: {
  label: string;
  value: string;
  tone: 'positive' | 'negative' | 'neutral';
  loading: boolean;
  detail?: string;
}) {
  const toneClass = tone === 'positive'
    ? 'text-emerald-400'
    : tone === 'negative'
      ? 'text-red-400'
      : 'text-[var(--foreground)]';

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">{label}</div>
      {loading ? (
        <div className="mt-2 h-7 w-24 animate-pulse rounded bg-white/[0.06]" />
      ) : (
        <div className={`mt-1 text-2xl font-bold tabular-nums ${toneClass}`}>
          <bdi dir="ltr">{value}</bdi>
        </div>
      )}
      {detail && <p className="mt-1 text-[9px] leading-relaxed text-zinc-600">{detail}</p>}
    </div>
  );
}
