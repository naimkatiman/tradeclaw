import { NextResponse } from 'next/server';

// Deterministic demo paper-trading portfolio — no persistence, no auth.
const PORTFOLIO = {
  mode: 'demo',
  balance: 10428.55,
  equity: 10731.9,
  positions: [
    {
      id: 'demo-pos-1',
      symbol: 'BTCUSD',
      direction: 'BUY' as const,
      entryPrice: 83210,
      quantity: 250,
      openedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    },
    {
      id: 'demo-pos-2',
      symbol: 'XAUUSD',
      direction: 'BUY' as const,
      entryPrice: 3062.4,
      quantity: 500,
      openedAt: new Date(Date.now() - 1000 * 60 * 118).toISOString(),
    },
    {
      id: 'demo-pos-3',
      symbol: 'USDJPY',
      direction: 'SELL' as const,
      entryPrice: 151.2,
      quantity: 300,
      openedAt: new Date(Date.now() - 1000 * 60 * 205).toISOString(),
    },
  ],
};

export async function GET() {
  return NextResponse.json(PORTFOLIO, {
    headers: { 'Cache-Control': 'public, s-maxage=60' },
  });
}
