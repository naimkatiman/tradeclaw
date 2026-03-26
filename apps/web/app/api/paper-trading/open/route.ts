import { NextRequest, NextResponse } from 'next/server';
import { openPosition, BASE_PRICES } from '../../../../lib/paper-trading';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { symbol, direction, quantity, signalId, stopLoss, takeProfit } =
    body as Record<string, unknown>;

  if (typeof symbol !== 'string' || !BASE_PRICES[symbol]) {
    return NextResponse.json({ error: 'Invalid or unknown symbol' }, { status: 400 });
  }
  if (direction !== 'BUY' && direction !== 'SELL') {
    return NextResponse.json({ error: 'direction must be BUY or SELL' }, { status: 400 });
  }

  const result = openPosition({
    symbol,
    direction,
    quantity: typeof quantity === 'number' ? quantity : undefined,
    signalId: typeof signalId === 'string' ? signalId : undefined,
    stopLoss: typeof stopLoss === 'number' ? stopLoss : undefined,
    takeProfit: typeof takeProfit === 'number' ? takeProfit : undefined,
  });

  return NextResponse.json({ position: result.position, balance: result.portfolio.balance });
}
