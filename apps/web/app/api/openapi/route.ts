import { NextResponse } from 'next/server';
import { buildOpenApiSpec } from '../../../lib/openapi';

export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json(buildOpenApiSpec(), {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'Content-Disposition': 'inline; filename="tradeclaw-openapi.json"',
    },
  });
}
