import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

interface GitHubContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: string;
}

function unavailableResponse() {
  return NextResponse.json(
    {
      available: false,
      source: 'github',
      contributors: [],
      updatedAt: null,
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=60',
      },
    },
  );
}

export async function GET() {
  try {
    const response = await fetch('https://api.github.com/repos/naimkatiman/tradeclaw/contributors?per_page=50', {
      headers: { Accept: 'application/vnd.github.v3+json' },
      next: { revalidate: 300 },
    });

    if (!response.ok) return unavailableResponse();

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) return unavailableResponse();

    const contributors = (data as GitHubContributor[])
      .filter(
        (contributor) =>
          typeof contributor.login === 'string' &&
          typeof contributor.avatar_url === 'string' &&
          typeof contributor.html_url === 'string' &&
          Number.isFinite(contributor.contributions),
      )
      .map((contributor, index) => ({
        login: contributor.login,
        avatarUrl: contributor.avatar_url,
        profileUrl: contributor.html_url,
        contributions: contributor.contributions,
        rank: index + 1,
        isBot: contributor.type === 'Bot' || contributor.login.includes('[bot]'),
      }));

    return NextResponse.json(
      {
        available: true,
        source: 'github',
        contributors,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=300',
        },
      },
    );
  } catch {
    return unavailableResponse();
  }
}
