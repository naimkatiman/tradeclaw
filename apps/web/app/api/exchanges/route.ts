import { NextResponse } from 'next/server';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
};

export async function GET() {
  return NextResponse.json(
    {
      available: false,
      status: 'not-implemented',
      exchanges: [],
      total: 0,
      nativeExecution: {
        venue: 'Binance USD-M Futures',
        scope: 'hmm-top3 strategy executor',
        configuration: 'environment variables',
        defaultMode: 'disabled',
      },
      message:
        'Generic exchange connections are not implemented. This endpoint does not inspect credentials or verify a live venue connection.',
    },
    { headers },
  );
}

export async function POST() {
  return NextResponse.json(
    {
      available: false,
      success: false,
      code: 'EXCHANGE_CONNECTION_NOT_IMPLEMENTED',
      error: 'Generic exchange connections are not implemented. Credentials were not processed or stored.',
    },
    { status: 501, headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } },
  );
}
