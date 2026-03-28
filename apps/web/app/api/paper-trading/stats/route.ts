import { NextResponse } from 'next/server';
import { getPortfolio } from '../../../../lib/paper-trading';

export async function GET() {
  try {
    const portfolio = getPortfolio();
    return NextResponse.json({
      stats: portfolio.stats,
      equityCurve: portfolio.equityCurve,
      balance: portfolio.balance,
      startingBalance: portfolio.startingBalance,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
