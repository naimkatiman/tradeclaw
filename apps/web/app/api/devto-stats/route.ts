import { NextResponse } from 'next/server';

const DEVTO_ARTICLE_ID = 3428122;

export async function GET() {
  try {
    const res = await fetch(`https://dev.to/api/articles/${DEVTO_ARTICLE_ID}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch article stats' },
        { status: 502 }
      );
    }

    const data = await res.json();

    return NextResponse.json(
      {
        reactions: data.positive_reactions_count ?? 0,
        comments: data.comments_count ?? 0,
        reads: data.page_views_count ?? 0,
        url: data.url,
        title: data.title,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
