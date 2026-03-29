import { NextRequest, NextResponse } from 'next/server';
import { fetchMempoolData, fetchBlockFeeHistory } from '../../../lib/data-providers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'overview'; // overview | fees

  if (view === 'fees') {
    const feeHistory = await fetchBlockFeeHistory(10);
    return NextResponse.json({ feeHistory, timestamp: new Date().toISOString() });
  }

  const data = await fetchMempoolData();
  if (!data) {
    return NextResponse.json({ error: 'Failed to fetch on-chain data' }, { status: 502 });
  }

  return NextResponse.json({
    ...data,
  });
}
