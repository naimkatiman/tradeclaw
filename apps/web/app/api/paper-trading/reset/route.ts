import { NextRequest, NextResponse } from 'next/server';
import { resetPortfolio } from '../../../../lib/paper-trading';
import { readSessionFromRequest } from '../../../../lib/user-session';

export async function POST(request: NextRequest) {
  const session = readSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  try {
    const portfolio = await resetPortfolio(session.userId);
    return NextResponse.json(portfolio);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
