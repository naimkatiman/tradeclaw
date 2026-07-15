import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      available: false,
      overallUptime: null,
      uptimeHistory: [],
      services: [],
      incidents: [],
      reason: 'No durable uptime or incident monitor is configured.',
    },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
