import { NextRequest, NextResponse } from 'next/server';
import { checkAlertsAcrossUsers, BASE_PRICES } from '../../../../lib/price-alerts';

// POST /api/alerts/check — internal cross-user trigger sweep.
// Protected by CRON_SECRET so random callers can't flip other people's alerts.
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!expected || expected !== provided) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let currentPrices: Record<string, number> = { ...BASE_PRICES };
  try {
    const body = await req.json();
    if (body && typeof body.prices === 'object') {
      currentPrices = { ...currentPrices, ...body.prices };
    }
  } catch {
    // No body — use base prices
  }

  const result = await checkAlertsAcrossUsers(currentPrices);
  return NextResponse.json(result);
}
