import { NextRequest, NextResponse } from 'next/server';
import { autoFollowSignal, BASE_PRICES } from '../../../../lib/paper-trading';
import { readSessionFromRequest } from '../../../../lib/user-session';

export async function POST(request: NextRequest) {
  const session = readSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, symbol, direction, entry, stopLoss, takeProfit, positionSizePct } =
    body as Record<string, unknown>;

  if (typeof symbol !== 'string' || !BASE_PRICES[symbol]) {
    return NextResponse.json({ error: 'Invalid or unknown symbol' }, { status: 400 });
  }
  if (direction !== 'BUY' && direction !== 'SELL') {
    return NextResponse.json({ error: 'direction must be BUY or SELL' }, { status: 400 });
  }
  if (typeof entry !== 'number' || typeof stopLoss !== 'number' || typeof takeProfit !== 'number') {
    return NextResponse.json({ error: 'entry, stopLoss, takeProfit must be numbers' }, { status: 400 });
  }

  const result = await autoFollowSignal({
    userId: session.userId,
    id: typeof id === 'string' ? id : undefined,
    symbol,
    direction,
    entry,
    stopLoss,
    takeProfit,
    positionSizePct: typeof positionSizePct === 'number' ? positionSizePct : undefined,
  });

  return NextResponse.json({ position: result.position, balance: result.portfolio.balance });
}
