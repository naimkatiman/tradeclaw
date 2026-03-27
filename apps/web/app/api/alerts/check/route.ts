import { NextRequest, NextResponse } from 'next/server';
import { checkAlerts, BASE_PRICES } from '../../../../lib/price-alerts';

export async function POST(req: NextRequest) {
  let currentPrices: Record<string, number> = { ...BASE_PRICES };

  // Caller can pass in real prices; otherwise use base prices with small jitter
  try {
    const body = await req.json();
    if (body && typeof body.prices === 'object') {
      currentPrices = { ...currentPrices, ...body.prices };
    }
  } catch {
    // No body — use default prices
  }

  const result = checkAlerts(currentPrices);
  return NextResponse.json(result);
}
