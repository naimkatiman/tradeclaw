import { NextRequest, NextResponse } from 'next/server';
import { readSessionFromRequest } from '../../../lib/user-session';
import { getTodayPlan, getPlanByDate, upsertPlan, generateBriefing, listPlans } from '../../../lib/game-plans';

export async function GET(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const history = searchParams.get('history');

    if (history === '1') {
      const plans = await listPlans(session.userId, 7);
      return NextResponse.json({ plans });
    }

    const plan = date
      ? await getPlanByDate(session.userId, date)
      : await getTodayPlan(session.userId);

    return NextResponse.json({ plan });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  try {
    const body = await req.json();
    const { date, watchlist, notes } = body;

    if (!date || typeof date !== 'string') {
      return NextResponse.json({ error: 'date is required (YYYY-MM-DD)' }, { status: 400 });
    }
    if (!Array.isArray(watchlist)) {
      return NextResponse.json({ error: 'watchlist must be an array' }, { status: 400 });
    }

    const plan = await upsertPlan(session.userId, { date, watchlist, notes: notes ?? undefined });
    return NextResponse.json({ plan });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  try {
    const body = await req.json();
    if (body.action !== 'generate') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const plan = await generateBriefing(session.userId);
    return NextResponse.json({ plan });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
