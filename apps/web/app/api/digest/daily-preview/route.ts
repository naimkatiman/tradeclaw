import { NextResponse } from 'next/server';
import { getDailyDigest, digestToPlainText } from '../../../../lib/daily-digest';

// ---------------------------------------------------------------------------
// GET /api/digest/daily-preview — returns today's digest as JSON for the UI
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  try {
    const digest = await getDailyDigest();
    const plainText = digestToPlainText(digest);

    return NextResponse.json({
      signals: digest.signals,
      date: digest.date,
      count: digest.count,
      plainText,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to generate digest' }, { status: 500 });
  }
}
