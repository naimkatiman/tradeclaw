import { NextRequest, NextResponse } from 'next/server';
import { generateEmailDigest, getEmailDigestData } from '../../../lib/email-digest';
import { resolveRealOutcomes } from '../../../lib/signal-history';

export async function GET(request: NextRequest) {
  try {
    await resolveRealOutcomes();

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') ?? 'html';
    const rawPeriod = searchParams.get('period') ?? '7d';
    const period: '7d' | '30d' = rawPeriod === '30d' ? '30d' : '7d';

    if (format === 'json') {
      const data = getEmailDigestData({ period });
      return NextResponse.json(data);
    }

    const html = generateEmailDigest({ period });
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
