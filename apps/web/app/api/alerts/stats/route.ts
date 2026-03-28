import { NextResponse } from 'next/server';
import { getAlertStats } from '../../../../lib/price-alerts';

export async function GET() {
  try {
    const stats = getAlertStats();
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
