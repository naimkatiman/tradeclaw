import { NextResponse } from 'next/server';
import { getTournamentData } from '../../../lib/tournament-data';

export const revalidate = 3600;

export async function GET() {
  const data = getTournamentData();
  return NextResponse.json(data, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
}
