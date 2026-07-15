import { NextResponse } from 'next/server';

const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/naimkatiman';

export async function GET() {
  return NextResponse.json(
    {
      available: false,
      source: null,
      sponsors: [],
      totalSponsors: null,
      monthlyRevenueUsd: null,
      githubUrl: GITHUB_SPONSORS_URL,
      message:
        'Sponsor records and revenue data are not connected to a verified source. No estimated or placeholder records are returned.',
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    },
  );
}
