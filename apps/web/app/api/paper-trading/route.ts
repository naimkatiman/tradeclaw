import { NextRequest, NextResponse } from 'next/server';
import { getPortfolio } from '../../../lib/paper-trading';
import { readSessionFromRequest } from '../../../lib/user-session';

export async function GET(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  try {
    const portfolio = await getPortfolio(session.userId);
    return NextResponse.json(portfolio);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
