import { NextResponse } from 'next/server';
import { getPortfolio, getDemoUserId } from '../../../../../lib/paper-trading';

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
    if (!Number.isFinite(portfolio.startingBalance) || portfolio.startingBalance <= 0) {
      return NextResponse.json(
        { schemaVersion: 1, label: 'TradeClaw Paper Sim', message: 'unavailable', color: 'lightgrey', available: false },
        { status: 503, headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } },
      );
    }
    const totalReturn = ((portfolio.balance - portfolio.startingBalance) / portfolio.startingBalance) * 100;
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
        label: 'TradeClaw Paper Sim',
        message: `${sign}${totalReturn.toFixed(1)}% realized sim return`,
        color,
        available: true,
        mode: 'paper-simulation',
        note: 'Realized paper-simulation return; not broker or customer portfolio performance.',
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
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
