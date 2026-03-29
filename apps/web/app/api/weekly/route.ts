import { NextResponse } from 'next/server';
import { getWeeklyDigest } from '../../../lib/weekly-digest';

export const revalidate = 3600;

export async function GET() {
  try {
    const digest = getWeeklyDigest();
    return NextResponse.json(digest, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
