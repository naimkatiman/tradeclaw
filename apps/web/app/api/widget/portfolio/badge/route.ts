import { NextResponse } from 'next/server';
import { getPortfolio, STARTING_BALANCE } from '../../../../../lib/paper-trading';

export const dynamic = 'force-dynamic';

export async function GET() {
  const portfolio = getPortfolio();
  const totalReturn = ((portfolio.balance - STARTING_BALANCE) / STARTING_BALANCE) * 100;
  const isPositive = totalReturn >= 0;
  const sign = isPositive ? '+' : '';

  return NextResponse.json(
    {
      schemaVersion: 1,
      label: 'Portfolio',
      message: `${sign}${totalReturn.toFixed(1)}% P&L`,
      color: isPositive ? 'brightgreen' : 'red',
    },
    {
      headers: {
        'Cache-Control': 'no-cache, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
