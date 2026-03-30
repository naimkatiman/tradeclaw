import { NextResponse } from 'next/server';
import { getPortfolio, STARTING_BALANCE } from '../../../../../lib/paper-trading';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const portfolio = getPortfolio();
    const totalReturn = ((portfolio.balance - STARTING_BALANCE) / STARTING_BALANCE) * 100;
    const sign = totalReturn >= 0 ? '+' : '';

    let color: string;
    if (totalReturn > 0.5) {
      color = 'brightgreen';
    } else if (totalReturn < -0.5) {
      color = 'red';
    } else {
      color = 'yellow';
    }

    return NextResponse.json(
      {
        schemaVersion: 1,
        label: 'TradeClaw Portfolio',
        message: `${sign}${totalReturn.toFixed(1)}% P&L`,
        color,
      },
      {
        headers: {
          'Cache-Control': 'no-cache, max-age=300',
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
