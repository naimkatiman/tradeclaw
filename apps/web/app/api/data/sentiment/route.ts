import { NextRequest, NextResponse } from 'next/server';
import { fetchFearGreedIndex, fetchFearGreedHistory, interpretSentiment } from '../../../lib/data-providers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '1', 10);

    const data = days > 1
      ? await fetchFearGreedHistory(days)
      : await fetchFearGreedIndex(1);

    if (data.length === 0) {
      return NextResponse.json({ error: 'Failed to fetch sentiment data' }, { status: 502 });
    }

    const latest = data[0];
    const interpretation = interpretSentiment(latest.value);

    return NextResponse.json({
      current: {
        ...latest,
        ...interpretation,
      },
      history: days > 1 ? data : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
