import { NextResponse } from 'next/server';

const REPOSITORY = 'naimkatiman/tradeclaw';
const GITHUB_API = `https://api.github.com/repos/${REPOSITORY}`;
const PAGE_SIZE = 100;
const MAX_HISTORY_PAGES = 10;

interface WeekData {
  week: string;
  count: number;
  cumulative: number;
}

function startOfUtcWeek(date: Date): Date {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  return start;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.star+json',
    'User-Agent': 'TradeClaw-StarHistory/1.0',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

function unavailable(reason: string) {
  return NextResponse.json(
    {
      available: false,
      source: 'github',
      repository: REPOSITORY,
      reason,
      weeks: [],
      total: null,
      peakWeek: null,
      recentGrowth: null,
      fetchedAt: null,
    },
    {
      status: 503,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    },
  );
}

function buildWeeks(starDates: Date[], now: Date): WeekData[] {
  const currentWeek = startOfUtcWeek(now);
  const windowStart = new Date(currentWeek);
  windowStart.setUTCDate(windowStart.getUTCDate() - 51 * 7);

  const counts = new Map<string, number>();
  let cumulative = 0;

  for (const date of starDates) {
    if (date < windowStart) {
      cumulative += 1;
      continue;
    }

    const key = isoDay(startOfUtcWeek(date));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from({ length: 52 }, (_, index) => {
    const weekStart = new Date(windowStart);
    weekStart.setUTCDate(weekStart.getUTCDate() + index * 7);
    const week = isoDay(weekStart);
    const count = counts.get(week) ?? 0;
    cumulative += count;
    return { week, count, cumulative };
  });
}

export async function GET() {
  const requestOptions = {
    headers: githubHeaders(),
    next: { revalidate: 300 },
  };

  try {
    const repositoryResponse = await fetch(GITHUB_API, requestOptions);
    if (!repositoryResponse.ok) return unavailable('github-unavailable');

    const repositoryData = (await repositoryResponse.json()) as { stargazers_count?: unknown };
    const total = repositoryData.stargazers_count;
    if (!Number.isSafeInteger(total) || (total as number) < 0) {
      return unavailable('invalid-github-response');
    }

    const pageCount = Math.ceil((total as number) / PAGE_SIZE);
    if (pageCount > MAX_HISTORY_PAGES) {
      return unavailable('history-exceeds-fetch-limit');
    }

    const starDates: Date[] = [];
    for (let page = 1; page <= pageCount; page += 1) {
      const stargazersResponse = await fetch(
        `${GITHUB_API}/stargazers?per_page=${PAGE_SIZE}&page=${page}`,
        requestOptions,
      );
      if (!stargazersResponse.ok) return unavailable('github-unavailable');

      const stargazers = (await stargazersResponse.json()) as Array<{ starred_at?: unknown }>;
      if (!Array.isArray(stargazers)) return unavailable('invalid-github-response');

      for (const stargazer of stargazers) {
        if (typeof stargazer.starred_at !== 'string') return unavailable('invalid-github-response');
        const starredAt = new Date(stargazer.starred_at);
        if (Number.isNaN(starredAt.getTime())) return unavailable('invalid-github-response');
        starDates.push(starredAt);
      }
    }

    if (starDates.length !== total) return unavailable('github-count-changed');

    starDates.sort((a, b) => a.getTime() - b.getTime());
    const weeks = buildWeeks(starDates, new Date());
    const peakWeek = weeks.reduce<{ week: string; count: number } | null>((peak, week) => {
      if (week.count === 0 || (peak && peak.count >= week.count)) return peak;
      return { week: week.week, count: week.count };
    }, null);
    const recentGrowth = weeks.slice(-4).reduce((sum, week) => sum + week.count, 0);

    return NextResponse.json(
      {
        available: true,
        source: 'github-stargazers-api',
        repository: REPOSITORY,
        weeks,
        total,
        peakWeek,
        recentGrowth,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      },
    );
  } catch {
    return unavailable('github-unavailable');
  }
}
