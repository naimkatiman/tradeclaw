import { NextResponse } from 'next/server';
import { getLandingStats } from '../../../../lib/landing-stats';

export const revalidate = 60;

export async function GET() {
  try {
    const stats = await getLandingStats();
    return NextResponse.json(stats);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
