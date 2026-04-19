import { NextRequest, NextResponse } from 'next/server';
import { getAlertStats } from '../../../../lib/price-alerts';
import { readSessionFromRequest } from '../../../../lib/user-session';

export async function GET(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  try {
    const stats = await getAlertStats(session.userId);
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
