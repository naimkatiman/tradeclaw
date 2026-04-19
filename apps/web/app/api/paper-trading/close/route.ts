import { NextRequest, NextResponse } from 'next/server';
import { closePosition } from '../../../../lib/paper-trading';
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

  const { positionId, exitPrice } = body as Record<string, unknown>;

  if (typeof positionId !== 'string') {
    return NextResponse.json({ error: 'positionId required' }, { status: 400 });
  }

  const result = await closePosition(
    { userId: session.userId, positionId },
    typeof exitPrice === 'number' ? exitPrice : undefined,
    'manual',
  );

  if (!result) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 });
  }

  return NextResponse.json({ trade: result.trade, balance: result.portfolio.balance });
}
