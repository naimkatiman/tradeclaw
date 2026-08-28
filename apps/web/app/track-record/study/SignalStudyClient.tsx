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
  DEFAULT_STRATEGY_STUDY_ID,
  EXPERIMENT_SHELF,
  FEATURED_STRATEGY_STUDIES,
  STRATEGY_STUDY_SELECTION_POLICY,
  getStrategyStudy,
  strategyArtifactUrl,
  type StrategyStudyMetric,
  type StrategyStudyRecord,
  type StrategyStudyStatus,
} from '@/lib/strategy-study-catalog';
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

function formatStudyMetric(language: string, metric: StrategyStudyMetric): string {
  if (metric.format === 'text') return String(metric.value);

  const value = Number(metric.value);
  const digits = metric.digits ?? 2;
  let formatted: string;

  switch (metric.format) {
    case 'signed-ratio-percent':
      formatted = new Intl.NumberFormat(language, {
        style: 'percent',
        signDisplay: 'always',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value);
      break;
    case 'ratio-percent':
      formatted = new Intl.NumberFormat(language, {
        style: 'percent',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value);
      break;
    case 'signed-percent-points':
      formatted = new Intl.NumberFormat(language, {
        style: 'percent',
        signDisplay: 'always',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value / 100);
      break;
    case 'percent-points':
      formatted = new Intl.NumberFormat(language, {
        style: 'percent',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value / 100);
      break;
    case 'integer':
      formatted = new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(value);
      break;
    case 'decimal':
    default:
      formatted = new Intl.NumberFormat(language, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value);
      break;
  }

  return `${formatted}${metric.suffix ?? ''}`;
}

function metricToneClass(tone: StrategyStudyMetric['tone']): string {
  if (tone === 'positive') return 'text-emerald-400';
  if (tone === 'negative') return 'text-red-400';
  return 'text-[var(--foreground)]';
}

function statusClasses(status: StrategyStudyStatus, selected = false): string {
  if (status === 'paper-pass') {
    return selected
      ? 'border-emerald-400/55 bg-emerald-500/[0.12] text-emerald-300'
      : 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-400';
  }
  if (status === 'inconclusive') {
    return selected
      ? 'border-amber-400/45 bg-amber-500/[0.1] text-amber-300'
      : 'border-amber-500/20 bg-amber-500/[0.05] text-amber-400';
  }
  return selected
    ? 'border-red-400/45 bg-red-500/[0.09] text-red-300'
    : 'border-white/[0.08] bg-white/[0.025] text-[var(--text-secondary)]';
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
  const selectedStudy = getStrategyStudy(searchParams.get('strategy'));

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

  const replaceQuery = useCallback((mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleBandChange = useCallback((nextBand: EquityBand) => {
    replaceQuery((params) => {
      if (nextBand === 'all') params.delete('band');
      else params.set('band', nextBand);
    });
  }, [replaceQuery]);

  const handleStudyChange = useCallback((study: StrategyStudyRecord) => {
    replaceQuery((params) => {
      if (study.id === DEFAULT_STRATEGY_STUDY_ID) params.delete('strategy');
      else params.set('strategy', study.id);
    });
  }, [replaceQuery]);

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

        <section className="relative isolate mb-7">
          <ProductHeroBackdrop
            src="/brand/hero/tradeclaw-replay-evidence-chamber-v1.webp"
            testId="signal-study-hero-art"
            className="product-hero-backdrop--quiet"
          />
          <div className="relative z-10">
            <div className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Modeled strategy studies / retrospective catalog
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
              Strategy Study Catalog
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-relaxed text-[var(--text-secondary)]">
              Seven fixed, artifact-backed strategy records are shown together. The default is the
              highest-evidence paper-pass, not the highest return found after testing. Failed, thin,
              superseded, and diagnostic runs remain in the experiment shelf below.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <CatalogCount label="Featured records" value={FEATURED_STRATEGY_STUDIES.length} />
              <CatalogCount label="Committed JSON artifacts" value={EXPERIMENT_SHELF.length} />
              <CatalogCount
                label="Frozen-gate paper-passes"
                value={FEATURED_STRATEGY_STUDIES.filter((study) => study.status === 'paper-pass').length}
                tone="positive"
              />
            </div>

            <p className="mt-4 rounded-md border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-100/80">
              <strong className="font-semibold text-amber-200">Selection rule:</strong>{' '}
              {STRATEGY_STUDY_SELECTION_POLICY} This catalog was assembled after the historical
              outcomes were known, so it is explicitly retrospective.
            </p>
          </div>
        </section>

        <StrategyCatalog
          language={language}
          selectedStudy={selectedStudy}
          onSelect={handleStudyChange}
        />

        <ExperimentShelf />

        <section
          id="aggregate-signal-stream"
          className="mt-10 border-t border-white/[0.08] pt-10"
          aria-labelledby="aggregate-study-title"
        >
          <div className="mb-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-red-300/75">
              Adverse result retained
            </p>
            <h2 id="aggregate-study-title" className="mt-2 text-xl font-semibold tracking-tight">
              {studyT.title}
            </h2>
            <p className="mt-2 max-w-4xl text-xs leading-relaxed text-[var(--text-secondary)]">
              This is the existing aggregate eligible-signal simulation, not the selected strategy
              above. It stays on the page so changing the default cannot erase the losing record.
              {` ${studyT.sequentialHint}`}
            </p>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        </section>

        <section className="glass-card mb-8 rounded-2xl border-s-2 border-emerald-500/50 p-5">
          <h2 className="text-sm font-semibold">Evidence boundaries</h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
            Strategy cards are historical modeled studies. The observed record remains the complete,
            source-backed signal population; the research ledger holds full specifications and verdicts.
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
              {t.surfaces.researchLabel}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function CatalogCount({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'positive' | 'neutral';
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3">
      <div className={`font-mono text-2xl font-bold tabular-nums ${tone === 'positive' ? 'text-emerald-400' : 'text-[var(--foreground)]'}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
        {label}
      </div>
    </div>
  );
}

function StrategyCatalog({
  language,
  selectedStudy,
  onSelect,
}: {
  language: string;
  selectedStudy: StrategyStudyRecord;
  onSelect: (study: StrategyStudyRecord) => void;
}) {
  return (
    <section aria-labelledby="featured-strategy-studies">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            Fixed featured set / 7 of 7 visible
          </p>
          <h2 id="featured-strategy-studies" className="mt-1 text-xl font-semibold tracking-tight">
            Compare the study records
          </h2>
        </div>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 font-mono text-[10px] text-[var(--text-secondary)]">
          DEFAULT: EVIDENCE RANK
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURED_STRATEGY_STUDIES.map((study) => {
          const selected = study.id === selectedStudy.id;
          return (
            <button
              key={study.id}
              type="button"
              aria-pressed={selected}
              data-study-id={study.id}
              onClick={() => onSelect(study)}
              className={`min-h-36 rounded-xl border p-4 text-start transition-colors ${statusClasses(study.status, selected)}`}
            >
              <span className="block text-[9px] font-semibold uppercase tracking-wider opacity-80">
                {study.statusLabel}
              </span>
              <span className="mt-2 block text-sm font-semibold text-[var(--foreground)]">
                {study.shortName}
              </span>
              <span className={`mt-3 block font-mono text-xl font-bold tabular-nums ${metricToneClass(study.headline.tone)}`}>
                <bdi dir="ltr">{formatStudyMetric(language, study.headline)}</bdi>
              </span>
              <span className="mt-1 block text-[9px] leading-relaxed text-[var(--text-secondary)]">
                {study.headline.label}
              </span>
            </button>
          );
        })}
      </div>

      <article
        className={`mt-4 rounded-2xl border p-5 sm:p-6 ${statusClasses(selectedStudy.status, true)}`}
        data-testid="selected-strategy-study"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-80">
              {selectedStudy.evidence}
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)]">
              {selectedStudy.name}
            </h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide">
              {selectedStudy.statusLabel}
            </p>
          </div>
          <div className="text-end">
            <div className={`font-mono text-3xl font-bold tabular-nums sm:text-4xl ${metricToneClass(selectedStudy.headline.tone)}`}>
              <bdi dir="ltr">{formatStudyMetric(language, selectedStudy.headline)}</bdi>
            </div>
            <div className="mt-1 text-[10px] text-[var(--text-secondary)]">
              {selectedStudy.headline.label}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {selectedStudy.metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-white/[0.08] bg-black/20 px-3 py-3">
              <div className="text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">
                {metric.label}
              </div>
              <div className={`mt-1 font-mono text-base font-semibold tabular-nums ${metricToneClass(metric.tone)}`}>
                <bdi dir="ltr">{formatStudyMetric(language, metric)}</bdi>
              </div>
            </div>
          ))}
        </div>

        <dl className="mt-5 grid gap-x-6 gap-y-3 text-xs sm:grid-cols-2">
          <StudyDefinition label="Universe" value={selectedStudy.universe} />
          <StudyDefinition label="Window" value={selectedStudy.window} />
          <StudyDefinition label="Rule" value={selectedStudy.rule} />
          <StudyDefinition label="Modeled costs" value={selectedStudy.costs} />
        </dl>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Frozen decision
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--foreground)]">
              {selectedStudy.decision}
            </p>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-4">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-amber-300/80">
              Claim boundary
            </div>
            <p className="mt-2 text-xs leading-relaxed text-amber-50/75">
              {selectedStudy.caveat}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={strategyArtifactUrl(selectedStudy.artifactFile)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-white/[0.07] px-4 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-white/[0.11]"
          >
            Inspect source JSON
          </a>
          <Link
            href="/research"
            className="rounded-lg px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/[0.05] hover:text-[var(--foreground)]"
          >
            Read the full verdict
          </Link>
        </div>
      </article>
    </section>
  );
}

function StudyDefinition({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">
        {label}
      </dt>
      <dd className="mt-1 leading-relaxed text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function ExperimentShelf() {
  return (
    <details
      className="group mt-6 rounded-2xl border border-white/[0.08] bg-black/20"
      data-testid="experiment-shelf"
    >
      <summary className="cursor-pointer list-none px-5 py-4 marker:hidden sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="block text-sm font-semibold text-[var(--foreground)]">
              Experiment shelf - all {EXPERIMENT_SHELF.length} committed JSON artifacts
            </span>
            <span className="mt-1 block text-[10px] leading-relaxed text-[var(--text-secondary)]">
              Failures, diagnostics, duplicate predecessors, and zero-cost references stay one click away.
            </span>
          </div>
          <span aria-hidden="true" className="font-mono text-lg text-[var(--text-secondary)] transition-transform group-open:rotate-45">
            +
          </span>
        </div>
      </summary>

      <div className="border-t border-white/[0.08] px-5 py-2 sm:px-6">
        <ul className="divide-y divide-white/[0.07]">
          {EXPERIMENT_SHELF.map((entry) => (
            <li key={entry.file} className="grid gap-2 py-4 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-start">
              <div className="font-mono text-[10px] text-[var(--text-secondary)]">{entry.runDate}</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--foreground)]">{entry.label}</span>
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider ${entry.disposition === 'featured-source' ? 'border-emerald-500/25 text-emerald-400' : 'border-white/[0.1] text-[var(--text-secondary)]'}`}>
                    {entry.disposition === 'featured-source' ? 'featured source' : 'shelved'}
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-secondary)]">
                  {entry.reason}
                </p>
              </div>
              <a
                href={strategyArtifactUrl(entry.file)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-medium text-emerald-400 underline decoration-emerald-500/30 underline-offset-4 hover:text-emerald-300"
              >
                JSON
              </a>
            </li>
          ))}
        </ul>
        <p className="border-t border-white/[0.07] py-4 text-[10px] leading-relaxed text-[var(--text-secondary)]">
          Shelf order is reverse chronological, not return-ranked. Individual variants that share one
          artifact remain inspectable inside that JSON. The append-only ledger is on the{' '}
          <a
            href="https://github.com/naimkatiman/tradeclaw/blob/main/docs/research/experiments/REGISTRY.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-500/30 underline-offset-4"
          >
            experiment registry
          </a>
          .
        </p>
      </div>
    </details>
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
