import { NextRequest, NextResponse } from 'next/server';
import { readSessionFromRequest } from '../../../lib/user-session';
import { addTrade, listTrades, getTradeStats, updateTrade, deleteTrade } from '../../../lib/trade-journal-db';

export async function GET(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const stats = searchParams.get('stats');

    if (stats === '1') {
      const s = await getTradeStats(session.userId);
      return NextResponse.json(s);
    }

    const trades = await listTrades(session.userId, {
      symbol: searchParams.get('symbol') ?? undefined,
      limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined,
      startDate: searchParams.get('start') ?? undefined,
      endDate: searchParams.get('end') ?? undefined,
    });
    return NextResponse.json({ trades });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.symbol || typeof body.symbol !== 'string') {
      return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    }
    if (body.direction !== 'LONG' && body.direction !== 'SHORT') {
      return NextResponse.json({ error: 'direction must be LONG or SHORT' }, { status: 400 });
    }

    const trade = await addTrade(session.userId, body);
    return NextResponse.json({ trade }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { id, ...updates } = body;
    const trade = await updateTrade(id, session.userId, updates);
    if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ trade });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const ok = await deleteTrade(id, session.userId);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
