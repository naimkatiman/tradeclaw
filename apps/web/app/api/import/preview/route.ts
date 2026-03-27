import { NextRequest, NextResponse } from 'next/server';
import { previewImport } from '../../../../lib/data-export';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const preview = previewImport(body);
  return NextResponse.json(preview);
}
