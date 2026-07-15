import { NextResponse } from 'next/server';
import {
  getPortfolio,
  getDemoUserId,
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
    const startingBalance = portfolio.startingBalance;
    if (
      !Number.isFinite(balance)
      || !Number.isFinite(startingBalance)
      || startingBalance <= 0
    ) {
      return NextResponse.json(
        { available: false, mode: 'paper-simulation', error: 'Paper simulation unavailable' },
        {
          status: 503,
          headers: {
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }

    const positionsWithNotional = portfolio.positions.map((pos) => {
      const dirMult = pos.direction === 'BUY' ? 1 : -1;
      const notional = Math.abs(pos.quantity);
      const directionalNotional = notional * dirMult;
      return {
        symbol: pos.symbol,
        direction: pos.direction,
        notional,
        directionalNotional,
      };
    });

    const totalReturn = ((balance - startingBalance) / startingBalance) * 100;
    const grossExposure = positionsWithNotional.reduce((sum, p) => sum + p.notional, 0);
    const netExposure = positionsWithNotional.reduce((sum, p) => sum + p.directionalNotional, 0);
    const pnl = +(balance - startingBalance).toFixed(2);
    const grossExposurePct = balance > 0 ? +(grossExposure / balance * 100).toFixed(2) : 0;
    const netExposurePct = balance > 0 ? +(netExposure / balance * 100).toFixed(2) : 0;
    const recordedAt = portfolio.equityCurve.at(-1)?.timestamp ?? portfolio.history[0]?.closedAt ?? null;

    return NextResponse.json(
      {
        available: true,
        mode: 'paper-simulation',
        balance: +balance.toFixed(2),
        realizedBalance: +balance.toFixed(2),
        equity: null,
        equityAvailable: false,
        openPnl: null,
        openPnlAvailable: false,
        pnl,
        totalReturn: +totalReturn.toFixed(2),
        totalReturnPct: +totalReturn.toFixed(2),
        currency: 'USD',
        winRate: portfolio.stats.winRate,
        openPositions: portfolio.positions.length,
        grossExposurePct,
        netExposurePct,
        notionalBasis: 'stored-dollar-notional',
        valuationBasis: 'realized-paper-balance-only',
        equityIncludesOpenPositions: false,
        recordedAt,
        fetchedAt: new Date().toISOString(),
        note: 'Paper simulation only. Open positions are not marked without observed prices; no broker or customer portfolio return is claimed.',
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
