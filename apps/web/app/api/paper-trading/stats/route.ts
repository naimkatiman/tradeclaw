import { NextResponse } from 'next/server';
import { getPortfolio } from '../../../../lib/paper-trading';

export async function GET() {
  const portfolio = getPortfolio();
  return NextResponse.json({
    stats: portfolio.stats,
    equityCurve: portfolio.equityCurve,
    balance: portfolio.balance,
    startingBalance: portfolio.startingBalance,
  });
}
