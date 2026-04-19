import { NextResponse } from 'next/server';
import {
  getPortfolio,
  getDemoUserId,
  STARTING_BALANCE,
  BASE_PRICES,
} from '../../../../lib/paper-trading';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = getDemoUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Widget demo user not configured' },
      { status: 410, headers: { 'Access-Control-Allow-Origin': '*' } },
    );
  }

  try {
    const portfolio = await getPortfolio(userId);
    const balance = portfolio.balance;

    const positionsWithPnl = portfolio.positions.map((pos) => {
      const currentPrice = BASE_PRICES[pos.symbol] ?? pos.entryPrice;
      const dirMult = pos.direction === 'BUY' ? 1 : -1;
      const movePct = ((currentPrice - pos.entryPrice) / pos.entryPrice) * dirMult;
      const unrealisedPnl = +(pos.quantity * movePct).toFixed(2);
      return { symbol: pos.symbol, direction: pos.direction, unrealisedPnl };
    });

    const openPnl = positionsWithPnl.reduce((sum, p) => sum + p.unrealisedPnl, 0);
    const equity = +(balance + openPnl).toFixed(2);
    const totalReturn = ((equity - STARTING_BALANCE) / STARTING_BALANCE) * 100;

    const top3 = [...positionsWithPnl]
      .sort((a, b) => Math.abs(b.unrealisedPnl) - Math.abs(a.unrealisedPnl))
      .slice(0, 3);

    const pnl = +(equity - STARTING_BALANCE).toFixed(2);

    return NextResponse.json(
      {
        balance: +balance.toFixed(2),
        equity,
        openPnl: +openPnl.toFixed(2),
        pnl,
        totalReturn: +totalReturn.toFixed(2),
        totalReturnPct: +totalReturn.toFixed(2),
        currency: 'USD',
        winRate: portfolio.stats.winRate,
        openPositions: portfolio.positions.length,
        top3Positions: top3,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
