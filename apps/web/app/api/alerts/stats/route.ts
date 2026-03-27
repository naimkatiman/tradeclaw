import { NextResponse } from 'next/server';
import { getAlertStats } from '../../../../lib/price-alerts';

export async function GET() {
  const stats = getAlertStats();
  return NextResponse.json(stats);
}
