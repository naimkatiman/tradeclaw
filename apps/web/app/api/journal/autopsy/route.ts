import { NextRequest, NextResponse } from 'next/server';
import { readSessionFromRequest } from '../../../../lib/user-session';
import { queryOne } from '../../../../lib/db-pool';
import { generateAutopsy, saveAutopsy, getAutopsy } from '../../../../lib/trade-autopsy';
import type { TradeEntry } from '../../../../lib/trade-journal-db';

interface TradeRow {
  id: string;
  user_id: string;
  symbol: string;
  direction: string;
  entry_price: string | null;
  exit_price: string | null;
  position_size: string | null;
  pnl: string | null;
  pnl_percent: string | null;
  setup_type: string | null;
  notes: string | null;
  tags: string[] | null;
  screenshot_url: string | null;
  trade_date: string;
  created_at: string;
}

function toTrade(row: TradeRow): TradeEntry {
  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    direction: row.direction,
    entryPrice: row.entry_price !== null ? Number(row.entry_price) : null,
    exitPrice: row.exit_price !== null ? Number(row.exit_price) : null,
    positionSize: row.position_size !== null ? Number(row.position_size) : null,
    pnl: row.pnl !== null ? Number(row.pnl) : null,
    pnlPercent: row.pnl_percent !== null ? Number(row.pnl_percent) : null,
    setupType: row.setup_type,
    notes: row.notes,
    tags: row.tags ?? [],
    screenshotUrl: row.screenshot_url,
    tradeDate: typeof row.trade_date === 'string' ? row.trade_date.slice(0, 10) : String(row.trade_date),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tradeId = searchParams.get('tradeId');

  if (!tradeId) {
    return NextResponse.json({ error: 'tradeId is required' }, { status: 400 });
  }

  try {
    const autopsy = await getAutopsy(tradeId);
    if (!autopsy) return NextResponse.json({ autopsy: null });
    return NextResponse.json({ autopsy });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  try {
    const body = await req.json();
    const tradeId = body.tradeId;
    if (!tradeId || typeof tradeId !== 'string') {
      return NextResponse.json({ error: 'tradeId is required' }, { status: 400 });
    }

    // Fetch the trade, ensure it belongs to user
    const row = await queryOne<TradeRow>(
      `SELECT id, user_id, symbol, direction, entry_price, exit_price, position_size,
        pnl, pnl_percent, setup_type, notes, tags, screenshot_url, trade_date, created_at
       FROM trade_journal WHERE id = $1 AND user_id = $2`,
      [tradeId, session.userId],
    );
    if (!row) return NextResponse.json({ error: 'Trade not found' }, { status: 404 });

    const trade = toTrade(row);
    const analysis = generateAutopsy(trade);
    await saveAutopsy(session.userId, tradeId, analysis);

    return NextResponse.json({ autopsy: analysis }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

