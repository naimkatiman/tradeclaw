import { NextRequest, NextResponse } from 'next/server';

import { readSessionFromRequest } from '../../../../lib/user-session';
import { getUserById } from '../../../../lib/db';
import { isAdminEmail } from '../../../../lib/admin-emails';
import {
  getAccuracyTrends,
  getSymbolBreakdown,
  getRecommendations,
} from '../../../../lib/signal-metrics';

async function authorize(req: NextRequest): Promise<boolean> {
  const session = readSessionFromRequest(req);
  if (!session?.userId) return false;
  const user = await getUserById(session.userId);
  return !!(user?.email && isAdminEmail(user.email));
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const periodParam = req.nextUrl.searchParams.get('period');
  const period = [7, 14, 30].includes(Number(periodParam)) ? Number(periodParam) : 7;

  const [trends, symbolBreakdown, recommendations] = await Promise.all([
    getAccuracyTrends(period),
    getSymbolBreakdown(period),
    getRecommendations(),
  ]);

  return NextResponse.json({ trends, symbolBreakdown, recommendations });
}
