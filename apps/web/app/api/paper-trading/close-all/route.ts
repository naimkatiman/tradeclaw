import { NextRequest, NextResponse } from 'next/server';
import { closeAllPositions } from '../../../../lib/paper-trading';
import { readSessionFromRequest } from '../../../../lib/user-session';

export async function POST(request: NextRequest) {
  const session = readSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  try {
    const body = await request.json() as { prices?: Record<string, unknown> };
    const prices = Object.fromEntries(
      Object.entries(body.prices ?? {}).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] > 0,
      ),
    );
    if (Object.keys(prices).length === 0) {
      return NextResponse.json({ error: 'at least one observed exit price required' }, { status: 400 });
    }
    const portfolio = await closeAllPositions(session.userId, prices, 'manual');
    return NextResponse.json({ balance: portfolio.balance, positions: portfolio.positions });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
