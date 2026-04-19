import { NextRequest, NextResponse } from 'next/server';
import { closeAllPositions } from '../../../../lib/paper-trading';
import { readSessionFromRequest } from '../../../../lib/user-session';

export async function POST(request: NextRequest) {
  const session = readSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  try {
    const portfolio = await closeAllPositions(session.userId, 'manual');
    return NextResponse.json({ balance: portfolio.balance, positions: portfolio.positions });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
