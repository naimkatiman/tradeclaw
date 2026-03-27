import { NextRequest, NextResponse } from 'next/server';
import { getMetrics } from '@/lib/performance-metrics';

const PERIOD_POINTS: Record<string, number> = {
  '1h': 12,
  '6h': 72,
  '24h': 288,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') ?? '6h';
  const count = PERIOD_POINTS[period] ?? 72;

  const data = getMetrics();

  return NextResponse.json({
    latency: data.latency.slice(-count),
    throughput: data.throughput.slice(-count),
    memory: data.memory.slice(-count),
    period,
    count,
  });
}
