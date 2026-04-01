import { NextRequest, NextResponse } from 'next/server';
import { getEmailDigestData, generateEmailDigest } from '../../../../lib/email-digest';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') === '30d' ? '30d' : '7d';
  const accept = req.headers.get('accept') ?? '';

  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  };

  if (accept.includes('application/json')) {
    const data = getEmailDigestData({ period, topN: 5 });
    return NextResponse.json(data, { headers });
  }

  const html = generateEmailDigest({ period, topN: 5 });
  return new NextResponse(html, {
    headers: {
      ...headers,
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
