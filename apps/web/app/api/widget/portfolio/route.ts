import { NextResponse } from 'next/server';
import { getPortfolio, STARTING_BALANCE } from '../../../../lib/paper-trading';

export const dynamic = 'force-dynamic';

export async function GET() {
  const portfolio = getPortfolio();
  const balance = portfolio.balance;
  const equity = balance;
  const openPnl = portfolio.positions.reduce((sum, pos) => {
    const currentPrice = pos.entryPrice;
    const dirMult = pos.direction === 'BUY' ? 1 : -1;
    const movePct = ((currentPrice - pos.entryPrice) / pos.entryPrice) * dirMult;
    return sum + pos.quantity * movePct;
  }, 0);
  const totalReturn = ((balance - STARTING_BALANCE) / STARTING_BALANCE) * 100;

  return NextResponse.json(
    {
      balance: +balance.toFixed(2),
      equity: +(equity + openPnl).toFixed(2),
      openPnl: +openPnl.toFixed(2),
      totalReturn: +totalReturn.toFixed(2),
      winRate: portfolio.stats.winRate,
      openPositions: portfolio.positions.length,
      lastUpdated: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-cache, max-age=30',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
