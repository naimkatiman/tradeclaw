import { NextRequest, NextResponse } from 'next/server';
import { parsePineScript } from '../../../lib/pine-parser';

const MAX_SCRIPT_SIZE = 50 * 1024; // 50 KB

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pineScript } = body;

    if (!pineScript || typeof pineScript !== 'string' || !pineScript.trim()) {
      return NextResponse.json({ error: 'pineScript field is required and must be a non-empty string' }, { status: 400 });
    }

    if (pineScript.length > MAX_SCRIPT_SIZE) {
      return NextResponse.json({ error: `Script exceeds maximum size of ${MAX_SCRIPT_SIZE / 1024}KB` }, { status: 400 });
    }

    const result = parsePineScript(pineScript);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
