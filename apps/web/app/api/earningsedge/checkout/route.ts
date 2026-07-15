import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    error: 'EarningsEdge checkout is disabled until authenticated entitlement delivery is verified.',
    checkoutEnabled: false,
  }, { status: 503 });
}
