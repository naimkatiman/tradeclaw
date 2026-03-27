import { NextRequest, NextResponse } from 'next/server';
import { readKeys, createKey } from '@/lib/api-keys';

export const dynamic = 'force-dynamic';

export async function GET() {
  const keys = readKeys();
  // Never return the full key string in list — mask it
  const masked = keys.map((k) => ({
    ...k,
    key: k.key.slice(0, 12) + '••••••••••••••••••••••••••••••••',
  }));
  return NextResponse.json({ keys: masked, count: masked.length });
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }
    const key = createKey(name);
    // Return the full key ONCE on creation
    return NextResponse.json({ key, message: 'Save this key — it will not be shown again' }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create key' }, { status: 500 });
  }
}
