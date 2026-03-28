import { NextResponse } from 'next/server';
import { getPortfolio, STARTING_BALANCE, BASE_PRICES } from '../../../../lib/paper-trading';

export const dynamic = 'force-dynamic';

export async function GET() {
  const portfolio = getPortfolio();
  const balance = portfolio.balance;

  // Calculate unrealised P&L per position using latest base prices
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

  // Top 3 open positions by absolute unrealised P&L
  const top3 = [...positionsWithPnl]
    .sort((a, b) => Math.abs(b.unrealisedPnl) - Math.abs(a.unrealisedPnl))
    .slice(0, 3);

  return NextResponse.json(
    {
      balance: +balance.toFixed(2),
      equity,
      openPnl: +openPnl.toFixed(2),
      totalReturn: +totalReturn.toFixed(2),
      winRate: portfolio.stats.winRate,
      openPositions: portfolio.positions.length,
      top3Positions: top3,
      lastUpdated: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-cache, max-age=30',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    },
  );
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
