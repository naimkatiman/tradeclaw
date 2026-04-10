import { NextResponse } from 'next/server';
import { getAssetRequests } from '../../../lib/asset-requests';

export async function GET() {
  try {
    const requests = getAssetRequests();
    // Strip subscriber emails from public response (privacy).
    const publicRequests = requests.map((r) => ({
      id: r.id,
      symbol: r.symbol,
      displayName: r.displayName,
      category: r.category,
      votes: r.votes,
      createdAt: r.createdAt,
      subscriberCount: r.notifySubscribers.length,
    }));
    return NextResponse.json(
      { requests: publicRequests },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
