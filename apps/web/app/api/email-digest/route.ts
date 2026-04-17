import { NextRequest, NextResponse } from 'next/server';
import {
  getCachedEmailDigestData,
  getCachedEmailDigestHtml,
} from '../../../lib/email-digest-cache';

const CACHE_CONTROL = 'public, s-maxage=120, stale-while-revalidate=60';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') ?? 'html';
    const rawPeriod = searchParams.get('period') ?? '7d';
    const period: '7d' | '30d' = rawPeriod === '30d' ? '30d' : '7d';

    if (format === 'json') {
      const data = await getCachedEmailDigestData({ period });
      return NextResponse.json(data, {
        headers: { 'Cache-Control': CACHE_CONTROL },
      });
    }

    const html = await getCachedEmailDigestHtml({ period });
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': CACHE_CONTROL,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
