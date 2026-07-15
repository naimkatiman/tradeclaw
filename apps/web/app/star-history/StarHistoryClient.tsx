'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ExternalLink, Share2, Star, TrendingUp, TriangleAlert } from 'lucide-react';

interface WeekData {
  week: string;
  count: number;
  cumulative: number;
}

interface StarHistoryData {
  available: true;
  source: 'github-stargazers-api';
  repository: string;
  weeks: WeekData[];
  total: number;
  peakWeek: { week: string; count: number } | null;
  recentGrowth: number;
  fetchedAt: string;
}

function isAvailableHistory(value: unknown): value is StarHistoryData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StarHistoryData>;
  return (
    candidate.available === true &&
    candidate.source === 'github-stargazers-api' &&
    typeof candidate.total === 'number' &&
    Number.isSafeInteger(candidate.total) &&
    typeof candidate.recentGrowth === 'number' &&
    Array.isArray(candidate.weeks) &&
    candidate.weeks.length === 52 &&
    candidate.weeks.every(
      (week) =>
        typeof week.week === 'string' &&
        Number.isSafeInteger(week.count) &&
        week.count >= 0 &&
        Number.isSafeInteger(week.cumulative) &&
        week.cumulative >= 0,
    )
  );
}

function formatWeek(week: string): string {
  return new Date(`${week}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function StarHistoryClient() {
  const [data, setData] = useState<StarHistoryData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/star-history')
      .then(async (response) => response.json() as Promise<unknown>)
      .then((response) => {
        if (!cancelled && isAvailableHistory(response)) setData(response);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 pb-24 pt-28 text-[var(--foreground)]">
        <section className="mx-auto max-w-3xl text-center">
          <TriangleAlert className="mx-auto h-9 w-9 text-amber-400" />
          <h1 className="mt-5 text-3xl font-bold">GitHub star history unavailable</h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--text-secondary)]">
            GitHub did not provide a complete timestamp series. TradeClaw does not generate or estimate missing history,
            so no chart is shown.
          </p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
          >
            View current repository data
            <ExternalLink className="h-4 w-4" />
          </a>
        </section>
      </main>
    );
  }

  const maxWeeklyCount = Math.max(...data.weeks.map((week) => week.count), 1);
  const lastTwelveWeeks = data.weeks.slice(-12).reverse();
  const shareText = encodeURIComponent(
    `TradeClaw currently has ${data.total} GitHub stars according to the GitHub API.\n\nhttps://github.com/naimkatiman/tradeclaw`,
  );

  return (
    <main className="min-h-screen bg-[var(--background)] pb-24 text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="flex items-center gap-3">
            <Star className="h-8 w-8 text-amber-400" />
            <div>
              <h1 className="text-3xl font-bold">GitHub star history</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Timestamp data supplied by GitHub</p>
            </div>
          </div>

          <dl className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
            <div className="bg-[var(--background)] p-5">
              <dt className="text-xs uppercase text-[var(--text-secondary)]">Current total</dt>
              <dd className="mt-1 text-2xl font-bold text-amber-400">{data.total}</dd>
            </div>
            <div className="bg-[var(--background)] p-5">
              <dt className="text-xs uppercase text-[var(--text-secondary)]">Last four weeks</dt>
              <dd className="mt-1 text-2xl font-bold text-emerald-400">+{data.recentGrowth}</dd>
            </div>
            <div className="bg-[var(--background)] p-5">
              <dt className="text-xs uppercase text-[var(--text-secondary)]">Peak in this window</dt>
              <dd className="mt-1 text-2xl font-bold text-sky-400">
                {data.peakWeek ? `+${data.peakWeek.count}` : 'None'}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-12 px-6 py-10">
        <section aria-labelledby="weekly-chart-heading">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              <h2 id="weekly-chart-heading" className="text-xl font-semibold">
                Last 52 weeks
              </h2>
            </div>
            <a
              href={`https://twitter.com/intent/tweet?text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 self-start rounded-lg border border-[var(--border)] px-3 py-2 text-xs transition-colors hover:bg-white/5"
            >
              <Share2 className="h-4 w-4" />
              Share sourced count
            </a>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <div
              className="grid h-48 min-w-[760px] items-end gap-1"
              style={{ gridTemplateColumns: 'repeat(52, minmax(8px, 1fr))' }}
            >
              {data.weeks.map((week) => (
                <div
                  key={week.week}
                  className="flex h-full items-end"
                  title={`${formatWeek(week.week)}: +${week.count} stars`}
                >
                  <div
                    className="w-full rounded-t-sm bg-emerald-500"
                    style={{
                      height: week.count === 0 ? '2px' : `${Math.max(8, (week.count / maxWeeklyCount) * 100)}%`,
                    }}
                    aria-label={`Week of ${formatWeek(week.week)}: ${week.count} stars`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex min-w-[760px] justify-between text-xs text-[var(--text-secondary)]">
              <span>{formatWeek(data.weeks[0].week)}</span>
              <span>{formatWeek(data.weeks[data.weeks.length - 1].week)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
            The total includes all GitHub stars. The bars show weekly timestamp counts for the displayed 52-week window.
          </p>
        </section>

        <section aria-labelledby="recent-heading" className="border-t border-[var(--border)] pt-10">
          <div className="mb-5 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-sky-400" />
            <h2 id="recent-heading" className="text-xl font-semibold">
              Recent weekly records
            </h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface)] text-xs uppercase text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Week starting</th>
                  <th className="px-4 py-3 text-right font-medium">New stars</th>
                  <th className="px-4 py-3 text-right font-medium">Cumulative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {lastTwelveWeeks.map((week) => (
                  <tr key={week.week}>
                    <td className="px-4 py-3">{formatWeek(week.week)}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">+{week.count}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{week.cumulative}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-[var(--border)] pt-8 text-xs text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
          <span>Source: GitHub repository and stargazer APIs</span>
          <span>Fetched {new Date(data.fetchedAt).toLocaleString()}</span>
        </footer>
      </div>
    </main>
  );
}
