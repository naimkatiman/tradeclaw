import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface GitHubRepo {
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  pushed_at: string;
  updated_at: string;
}

interface CachedData {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  lastUpdated: string;
}

let cache: { data: CachedData; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const now = Date.now();

  if (cache && now - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'TradeClaw/1.0',
      Accept: 'application/vnd.github.v3+json',
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch('https://api.github.com/repos/naimkatiman/tradeclaw', { headers, signal: AbortSignal.timeout(5000) });

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status}`);
    }

    const repo = (await res.json()) as GitHubRepo;

    const data: CachedData = {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.watchers_count,
      openIssues: repo.open_issues_count,
      lastUpdated: repo.pushed_at || repo.updated_at || new Date().toISOString(),
    };

    cache = { data, timestamp: now };
    return NextResponse.json(data);
  } catch {
    if (cache) {
      return NextResponse.json(cache.data);
    }
    return NextResponse.json(
      { stars: 0, forks: 0, watchers: 0, openIssues: 0, lastUpdated: new Date().toISOString() },
      { status: 502 }
    );
  }
}
