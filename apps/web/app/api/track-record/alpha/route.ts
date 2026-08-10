import { NextResponse } from 'next/server';
import {
  readD1AlphaReport,
  unavailableD1AlphaReport,
} from '@/lib/d1-alpha-ledger';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const report = await readD1AlphaReport({ recentLimit: 5_000 });
    return NextResponse.json(report, {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch {
    console.error('[track-record/alpha] prospective ledger unavailable; response failed closed');
    return NextResponse.json(unavailableD1AlphaReport(), {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
