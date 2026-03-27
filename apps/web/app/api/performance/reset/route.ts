import { NextResponse } from 'next/server';
import { resetMetrics } from '@/lib/performance-metrics';

export async function POST() {
  resetMetrics();
  return NextResponse.json({ success: true, message: 'Metrics reset successfully' });
}
