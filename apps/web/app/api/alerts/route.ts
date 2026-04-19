import { NextRequest, NextResponse } from 'next/server';
import { readAlerts, createAlert, SUPPORTED_SYMBOLS } from '../../../lib/price-alerts';
import { readSessionFromRequest } from '../../../lib/user-session';

export async function GET(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'active' | 'triggered' | 'expired' | null;
    const symbol = searchParams.get('symbol');

    const alerts = await readAlerts(session.userId, {
      status: status ?? undefined,
      symbol: symbol ?? undefined,
    });

    return NextResponse.json({ alerts, count: alerts.length });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { symbol, direction, targetPrice, currentPrice, percentMove, timeWindow, note } = body;

  if (typeof symbol !== 'string' || !SUPPORTED_SYMBOLS.includes(symbol.toUpperCase())) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
  }
  if (direction !== 'above' && direction !== 'below') {
    return NextResponse.json({ error: 'direction must be "above" or "below"' }, { status: 400 });
  }
  if (typeof targetPrice !== 'number' || targetPrice <= 0) {
    return NextResponse.json({ error: 'targetPrice must be a positive number' }, { status: 400 });
  }
  if (typeof currentPrice !== 'number' || currentPrice <= 0) {
    return NextResponse.json({ error: 'currentPrice must be a positive number' }, { status: 400 });
  }

  const alert = await createAlert({
    userId: session.userId,
    symbol: symbol.toUpperCase(),
    direction,
    targetPrice,
    currentPrice,
    percentMove: typeof percentMove === 'number' ? percentMove : undefined,
    timeWindow: typeof timeWindow === 'string' ? timeWindow : undefined,
    note: typeof note === 'string' ? note : undefined,
  });

  return NextResponse.json({ alert }, { status: 201 });
}
