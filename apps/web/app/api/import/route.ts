import { NextRequest, NextResponse } from 'next/server';
import { validateImportPayload, importServerData, type ExportPayload } from '../../../lib/data-export';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const errors = validateImportPayload(body);
  if (errors.length > 0) {
    return NextResponse.json({ error: 'Invalid export file', details: errors }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') === 'replace' ? 'replace' : 'merge';

  try {
    const result = await importServerData(body as ExportPayload, mode);
    return NextResponse.json({ success: true, result });
  } catch {
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
