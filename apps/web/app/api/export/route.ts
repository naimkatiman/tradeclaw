import { NextResponse } from 'next/server';
import { collectServerData, buildExportPayload } from '../../../lib/data-export';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const serverData = collectServerData();
    const payload = buildExportPayload(serverData);
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
