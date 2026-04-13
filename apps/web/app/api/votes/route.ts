import { NextRequest, NextResponse } from 'next/server';
import { getVotes, submitVote } from '../../../lib/votes';
import { getTrackedSignalsForRequest } from '../../../lib/tracked-signals';

export async function GET(req: NextRequest) {
  try {
    const votes = getVotes();

    // Get TC signal direction per pair
    const { signals } = await getTrackedSignalsForRequest(req, {});
    const tcSignals: Record<string, string> = {};
    const votePairs = Object.keys(votes.pairs);

    for (const pair of votePairs) {
      const pairSignals = signals.filter(s => s.symbol === pair);
      if (pairSignals.length > 0) {
        // Use highest-confidence signal direction
        tcSignals[pair] = pairSignals[0].direction;
      } else {
        tcSignals[pair] = 'HOLD';
      }
    }

    return NextResponse.json({
      ...votes,
      tcSignals,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pair, direction } = body as { pair?: string; direction?: string };

    if (!pair || !direction) {
      return NextResponse.json({ error: 'Missing pair or direction' }, { status: 400 });
    }

    if (!['BUY', 'SELL', 'HOLD'].includes(direction.toUpperCase())) {
      return NextResponse.json({ error: 'Direction must be BUY, SELL, or HOLD' }, { status: 400 });
    }

    const result = submitVote(pair, direction.toUpperCase() as 'BUY' | 'SELL' | 'HOLD');
    if (!result) {
      return NextResponse.json({ error: 'Invalid pair' }, { status: 400 });
    }

    return NextResponse.json({ pair: pair.toUpperCase(), votes: result });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
