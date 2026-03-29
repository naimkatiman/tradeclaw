import { NextRequest, NextResponse } from 'next/server';
import { roastStrategy } from '@/lib/strategy-roaster';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { input?: string };
    const { input } = body;

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'input is required' }, { status: 400 });
    }

    if (input.length > 10000) {
      return NextResponse.json({ error: 'input too large (max 10KB)' }, { status: 400 });
    }

    const result = roastStrategy(input);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
